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
import { apiMetadata, createApp } from "../src/main-app/controller";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client/sqlite3";
import { eq, count } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import {
  api_keys,
  key_requests,
  admin_users,
  KeyRequest,
} from "../src/api-keys/models";

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

  beforeEach(async () => {
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
    const entry = await db
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

  beforeEach(async () => {
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

describe("Fetch all API key requests with valid admin credentials", () => {
  let response: Response;

  beforeEach(async () => {
    response = await app.handle(
      new Request(`${BASE_URL}/key-requests`, {
        method: "GET",
        headers: { Authorization: "Basic YWRtaW46YWRtaW4xMjM=" },
      }),
    );
  });

  it("returns a 200 OK response", () => {
    expect(response.status).toBe(200);
  });

  it("returns an array of API key requests", async () => {
    const body = await response.json();
    expect(body).toBeArray();
  });
});

describe("Fetch all API key requests with broken authorization header", () => {
  let response: Response;

  beforeEach(async () => {
    response = await app.handle(
      new Request(`${BASE_URL}/key-requests`, {
        method: "GET",
        headers: { Authorization: "Basic InvalidAdminCreds" },
      }),
    );
  });

  it("returns a 401 Unauthorized response", () => {
    expect(response.status).toBe(401);
  });

  it("returns an empty response body", async () => {
    const body = await response.text();
    expect(body.length).toBe(0);
  });
});

describe("Fetch all API key requests with invalid admin username", () => {
  let response: Response;

  beforeEach(async () => {
    response = await app.handle(
      new Request(`${BASE_URL}/key-requests`, {
        method: "GET",
        headers: { Authorization: "Basic bWluYWg6YWRtaW4xMjM=" },
      }),
    );
  });

  it("returns a 401 Unauthorized response", () => {
    expect(response.status).toBe(401);
  });

  it("returns an empty response body", async () => {
    const body = await response.text();
    expect(body.length).toBe(0);
  });
});

describe("Fetch all API key requests with invalid admin password", () => {
  let response: Response;

  beforeEach(async () => {
    response = await app.handle(
      new Request(`${BASE_URL}/key-requests`, {
        method: "GET",
        headers: { Authorization: "Basic YWRtaW46YWRtaW4zMjE=" },
      }),
    );
  });

  it("returns a 401 Unauthorized response", () => {
    expect(response.status).toBe(401);
  });

  it("returns an empty response body", async () => {
    const body = await response.text();
    expect(body.length).toBe(0);
  });
});

describe("Fetch all API key requests without authorization header", () => {
  let response: Response;

  beforeEach(async () => {
    response = await app.handle(
      new Request(`${BASE_URL}/key-requests`, { method: "GET" }),
    );
  });

  it("returns a 401 Unauthorized response", () => {
    expect(response.status).toBe(401);
  });

  it("returns nothing in the response body", async () => {
    expect(await response.text()).toHaveLength(0);
  });
});

describe("Approve a valid API key request as admin", async () => {
  let response: Response;
  let keyRequest: KeyRequest;

  beforeEach(async () => {
    await app.handle(
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

    keyRequest = (await db.select().from(key_requests))[0];

    response = await app.handle(
      new Request(`${BASE_URL}/key-requests/${keyRequest!.id}`, {
        method: "PATCH",
        headers: {
          Authorization: "Basic YWRtaW46YWRtaW4xMjM=",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "tober from testing",
          approved: true,
        }),
      }),
    );
  });

  it("succeeds with a 200 response", () => {
    expect(response?.status).toBe(200);
  });

  it("creates an API key corresponding to the approved request's ID", async () => {
    const targetAPIKey = await db
      .select()
      .from(api_keys)
      .where(eq(api_keys.requestId, keyRequest!.id))
      .get();

    expect(targetAPIKey).not.toBeUndefined();
  });

  it("sets the key request's status to 'approved'", async () => {
    const targetKeyRequest = await db
      .select()
      .from(key_requests)
      .where(eq(key_requests.id, keyRequest!.id))
      .get();

    expect(targetKeyRequest?.status).toBe("approved");
  });
});

describe("Deny a valid API key request as admin", async () => {
  let response: Response;
  let keyRequest: KeyRequest;

  beforeEach(async () => {
    await app.handle(
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

    keyRequest = (await db.select().from(key_requests))[0];

    response = await app.handle(
      new Request(`${BASE_URL}/key-requests/${keyRequest!.id}`, {
        method: "PATCH",
        headers: {
          Authorization: "Basic YWRtaW46YWRtaW4xMjM=",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approved: false,
        }),
      }),
    );
  });

  it("succeeds with a 200 response", () => {
    expect(response?.status).toBe(200);
  });

  it("doesn't create an API key corresponding to the key request ID", async () => {
    const targetAPIKey = await db
      .select()
      .from(api_keys)
      .where(eq(api_keys.requestId, keyRequest!.id))
      .get();

    expect(targetAPIKey).toBeUndefined();
  });

  it("sets the key request's status to 'denied'", async () => {
    const targetKeyRequest = await db
      .select()
      .from(key_requests)
      .where(eq(key_requests.id, keyRequest!.id))
      .get();

    expect(targetKeyRequest?.status).toBe("denied");
  });
});

describe("Attempt to approve a nonexistent API key request as admin", async () => {
  let response: Response;

  beforeEach(async () => {
    response = await app.handle(
      new Request(`${BASE_URL}/key-requests/1`, {
        method: "PATCH",
        headers: {
          Authorization: "Basic YWRtaW46YWRtaW4xMjM=",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "tober from testing",
          approved: true,
        }),
      }),
    );
  });

  it("fails with a 404 response", () => {
    expect(response?.status).toBe(404);
  });

  it("creates nothing in the database", async () => {
    const targetAPIKey = await db.select().from(api_keys);

    expect(targetAPIKey.length).toBe(0);
  });
});

describe("Attempt to approve an API key request without authorization header", () => {
  let response: Response;

  beforeEach(async () => {
    response = await app.handle(
      new Request(`${BASE_URL}/key-requests/1`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "tober from testing",
          approved: true,
        }),
      }),
    );
  });

  it("returns a 401 Unauthorized response", () => {
    expect(response.status).toBe(401);
  });

  it("returns nothing in the response body", async () => {
    expect(await response.text()).toHaveLength(0);
  });
});

describe("Attempt to process a valid API key request wihout admin credentials", async () => {
  let response: Response;
  let keyRequest: KeyRequest;

  beforeEach(async () => {
    await app.handle(
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

    keyRequest = (await db.select().from(key_requests))[0];

    response = await app.handle(
      new Request(`${BASE_URL}/key-requests/${keyRequest!.id}`, {
        method: "PATCH",
        headers: {
          Authorization: "Basic YWRtaW46dGVzdDEyMyAtbgo=",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approved: false,
        }),
      }),
    );
  });

  it("fails with a 401 response", () => {
    expect(response?.status).toBe(401);
  });

  it("doesn't create an API key corresponding to the key request ID", async () => {
    const targetAPIKey = await db
      .select()
      .from(api_keys)
      .where(eq(api_keys.requestId, keyRequest!.id))
      .get();

    expect(targetAPIKey).toBeUndefined();
  });

  it("maintains the key request's status of 'pending'", async () => {
    const targetKeyRequest = await db
      .select()
      .from(key_requests)
      .where(eq(key_requests.id, keyRequest!.id))
      .get();

    expect(targetKeyRequest?.status).toBe("pending");
  });
});

describe("Attempt to claim approved API key request", () => {
  const typeboxKeyRequestResponseBody = t.Object({ receipt: t.String() });

  type KeyRequestResponseBody = typeof typeboxKeyRequestResponseBody.static;

  let response: Response;
  let keyRequestBody: KeyRequestResponseBody;

  beforeEach(async () => {
    const keyRequestResponse = await app.handle(
      new Request(`${BASE_URL}/key-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterName: "tober",
          requestDescription: "I need this API key for testing purposes",
          password: "abc123",
        }),
      }),
    );

    keyRequestBody = await keyRequestResponse.json();

    const keyRequest = await db
      .select()
      .from(key_requests)
      .where(eq(key_requests.receipt, keyRequestBody.receipt))
      .get();

    await app.handle(
      new Request(`${BASE_URL}/key-requests/${keyRequest!.id}`, {
        method: "PATCH",
        headers: {
          Authorization: "Basic YWRtaW46YWRtaW4xMjM=",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "tober from testing",
          approved: true,
        }),
      }),
    );

    response = await app.handle(
      new Request(`${BASE_URL}/key-claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipt: keyRequestBody.receipt,
          password: "abc123",
        }),
      }),
    );
  });

  it("returns a 200 OK response", () => {
    expect(response.status).toBe(200);
  });

  it("returns a string", async () => {
    const body = (await response.json()) as { key: string };
    expect(body.key).toBeString();
  });

  it("returns an existing API key", async () => {
    const body = (await response.json()) as { key: string };

    const result = await db
      .select({ count: count() })
      .from(api_keys)
      .where(eq(api_keys.keyString, body.key))
      .get();

    expect(result?.count).toBe(1);
  });
});

describe("Attempt to claim denied API key request", () => {
  const typeboxKeyRequestResponseBody = t.Object({ receipt: t.String() });

  type KeyRequestResponseBody = typeof typeboxKeyRequestResponseBody.static;

  let response: Response;
  let keyRequestBody: KeyRequestResponseBody;

  beforeEach(async () => {
    const keyRequestResponse = await app.handle(
      new Request(`${BASE_URL}/key-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterName: "tober",
          requestDescription: "I need this API key for testing purposes",
          password: "abc123",
        }),
      }),
    );

    keyRequestBody = await keyRequestResponse.json();

    const keyRequest = await db
      .select()
      .from(key_requests)
      .where(eq(key_requests.receipt, keyRequestBody.receipt))
      .get();

    await app.handle(
      new Request(`${BASE_URL}/key-requests/${keyRequest!.id}`, {
        method: "PATCH",
        headers: {
          Authorization: "Basic YWRtaW46YWRtaW4xMjM=",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approved: false,
        }),
      }),
    );

    response = await app.handle(
      new Request(`${BASE_URL}/key-claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipt: keyRequestBody.receipt,
          password: "abc123",
        }),
      }),
    );
  });

  it("returns a 200 OK response", () => {
    expect(response.status).toBe(200);
  });

  it("returns a message stating that key request has been denied", async () => {
    const body = await response.text();
    expect(body).toBe("Your API key request has been denied");
  });
});

describe("Attempt to claim nonexistent API key request", () => {
  let response: Response;

  beforeEach(async () => {
    response = await app.handle(
      new Request(`${BASE_URL}/key-claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipt: "nonexistent-receipt",
          password: "abc123",
        }),
      }),
    );
  });

  it("returns a 404 Not Found response", () => {
    expect(response.status).toBe(404);
  });

  it("returns message stating that the key request doesn't exist", async () => {
    const body = await response.text();
    expect(body).toBe("The requested API key request doesn't exist");
  });
});
