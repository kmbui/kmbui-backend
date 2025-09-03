import { beforeEach, describe, expect, it } from "bun:test";
import { apiMetadata, createApp } from "../src";
import Database from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import z from "zod";
import { key_requests } from "../src/database/schema";

const BASE_URL: string = "http://localhost:3000";

const db = drizzle(new Database(":memory:"));
migrate(db, {
  migrationsFolder: "./drizzle",
});

const app = createApp(db).listen(3000);

describe("Call home route", () => {
  it("returns metadata about the API", async () => {
    const response = await app
      .handle(new Request(BASE_URL))
      .then((res) => res.json());

    expect(response).toEqual(apiMetadata);
  });
});

describe("Create a valid API key request", () => {
  let response: Response;
  let body: { receipt: string };

  beforeEach(async () => {
    response = await app.handle(
      new Request(`${BASE_URL}/auth/key-request`, {
        method: "POST",
        body: JSON.stringify({
          requesterName: "tober",
          requestDescription: "I need this API key for testing purposes",
          password: "abc123",
        }),
      }),
    );
  });

  it("returns a valid receipt", async () => {
    body = z
      .object({
        receipt: z.string(),
      })
      .parse(response);

    expect(body).not.toThrowError();
  });

  it("creates an entry in the database", async () => {
    db.select()
      .from(key_requests)
      .where(eq(key_requests.receipt, body.receipt));
  });
});
