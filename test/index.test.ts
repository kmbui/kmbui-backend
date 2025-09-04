import { t } from "elysia";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { beforeAll, describe, expect, it } from "bun:test";
import { apiMetadata, createApp } from "../src";
import Database from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
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
  const typeboxResponseBody = t.Object({
    receipt: t.String(),
  });

  const validator = TypeCompiler.Compile(typeboxResponseBody);

  type ResponseBody = typeof typeboxResponseBody.static;

  let body: ResponseBody;

  beforeAll(async () => {
    const response = await app.handle(
      new Request(`${BASE_URL}/key-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requesterName: "tober",
          requestDescription: "I need this API key for testing purposes",
          password: "abc123",
        }),
      }),
    );

    body = await response.json();
  });

  it("returns a valid receipt", async () => {
    const isValid = validator.Check(body);

    expect(body.receipt).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(isValid).toBe(true);
  });

  it("creates an entry in the database", async () => {
    const entry = db
      .select()
      .from(key_requests)
      .where(eq(key_requests.receipt, body.receipt))
      .get();

    expect(entry).toBeDefined();
  });
});

describe("Create an invalid API key request", () => {
  let response: Response;
  let body: any;
  beforeAll(async () => {
    response = await app.handle(
      new Request(`${BASE_URL}/key-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requesterName: "tober",
          requestDescription: "I need this API key for testing purposes",
        }),
      }),
    );

    body = await response.json();
  });

  it("returns a 422 Unprocessable Entity response", () => {
    expect(response?.status).toBe(422);
  });

  it("returns a proper error message", () => {
    expect(body?.errors.password).toBe(
      "Expected property 'password' to be string but found: undefined",
    );
  });
});
