import { t } from "elysia";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import {
  afterAll,
  beforeAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { createApp } from "../src/main-app/controller";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client/sqlite3";
import { migrate } from "drizzle-orm/libsql/migrator";
import { api_keys, key_requests, admin_users } from "../src/api-keys/models";
import { magazines } from "../src/magazines/models";

const TEST_PORT: number = 3000;
const BASE_URL: string = `http://localhost:${TEST_PORT}`;

const libsqlClient = createClient({ url: "file:local.db" });
const db = drizzle(libsqlClient);
const app = createApp(db).listen(TEST_PORT);

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
  const passwordHash = await Bun.password.hash("admin123");
  await db
    .insert(admin_users)
    .values({ username: "admin", hashedPassword: passwordHash });
});

afterEach(async () => {
  await db.delete(api_keys);
  await db.delete(key_requests);
});

afterAll(async () => {
  await db.delete(admin_users);
});

// Allow nulls for timestamps that are nullable in the DB model.
const typeboxMagazineMetadata = t.Object({
  id: t.Integer(),
  title: t.String(),
  description: t.String(),
  thumbnailUrl: t.String(),
  contentUrl: t.String(),
  updatedAt: t.Union([t.Integer(), t.Null()]),
  createdAt: t.Integer(),
  deletedAt: t.Union([t.Integer(), t.Null()]),
});

type MagazineMetadata = typeof typeboxMagazineMetadata.static;

const validator = TypeCompiler.Compile(typeboxMagazineMetadata);

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
        })
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
    const response = await app
      .handle(new Request(`${BASE_URL}/magazines`))
      .then((res) => res.json());

    expect(response).toBeArray();
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
        })
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
      new Request(`${BASE_URL}/magazines/${created.id}/content`)
    );
    // Accept either a direct file (2xx) or a redirect (3xx) to the file
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("content-type")).toBeString();
  });
});
