import { t } from "elysia";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { beforeEach, describe, expect, it } from "bun:test";
import { magazines } from "../src/magazines/models";
import { BASE_URL, setupApp } from "./common";
import { MagazineSchema } from "../src/magazines/controller";

const [db, app] = setupApp();

type MagazineMetadata = typeof MagazineSchema.static;

const validator = TypeCompiler.Compile(MagazineSchema);

describe("Create a valid magazine", () => {
  let body: any;

  beforeEach(async () => {
    body = await app
      .handle(
        new Request(`${BASE_URL}/magazines`, {
          method: "POST",
          body: JSON.stringify({
            title: "Test Title 1",
            description: "Test Description 1",
            thumbnailUrl: "https://test.thumbnail1.url",
            contentUrl: "https://test.content1.url",
          } as MagazineMetadata),
        }),
      )
      .then((res) => res.json());
  });

  it("returns the magazine's metadata", () => {
    const isValid = validator.Check(body);

    expect(isValid).toBe(true);
  });

  it("creates an entry in the database", async () => {
    const record = await db.select().from(magazines).limit(1);

    expect(record[0]).not.toBeNull();
  });
});

describe("Fetch all magazines", () => {
  it("returns a list of magazine metadata", async () => {
    const response = await app.handle(new Request(`${BASE_URL}/magazines`));

    expect(await response.json()).toBeArray();
  });
});

describe("Fetch data on one magazine", () => {
  let body: any;
  let created: any;

  beforeEach(async () => {
    // Create a fresh magazine and then fetch it by id to test the single-item endpoint.
    created = await app
      .handle(
        new Request(`${BASE_URL}/magazines`, {
          method: "POST",
          body: JSON.stringify({
            title: "Test Title 2",
            description: "Test Description 2",
            thumbnailUrl: "https://test.thumbnail2.url",
            contentUrl: "https://test.content2.url",
          }),
        }),
      )
      .then((res) => res.json());

    body = await app
      .handle(new Request(`${BASE_URL}/magazines/${created.id}`))
      .then((res) => res.json());
  });

  it("returns the correct type", () => {
    const isValid = validator.Check(body);

    expect(isValid).toBe(true);
  });

  it("returns the magazine's metadata", () => {
    // Verify the fetched metadata matches what we created
    expect(body).toMatchObject({
      id: created.id,
      title: "Test Title 2",
      description: "Test Description 2",
      thumbnailUrl: "https://test.thumbnail2.url",
      contentUrl: "https://test.content2.url",
    });
    // Ensure required timestamps are present with expected nullability
    expect(body.createdAt).toBeNumber();
    expect([null, expect.any(Number)]).toContain(body.updatedAt);
    expect([null, expect.any(Number)]).toContain(body.deletedAt);
  });

  it("returns the magazine's content as a file", async () => {
    const res = await app.handle(
      new Request(`${BASE_URL}/magazines/${created.id}/content`),
    );
    // Accept either a direct file (2xx) or a redirect (3xx) to the file
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("content-type")).toBeString();
  });
});
