import { TypeCompiler } from "@sinclair/typebox/compiler";
import { beforeEach, describe, expect, it } from "bun:test";
import { t } from "elysia";
import { articles, FinalArticleSchema } from "../src/article/models";
import { BASE_URL, CommonMockData, ArticleMockData, setupApp } from "./common";
import { eq } from "drizzle-orm";
import { api_keys, key_requests } from "../src/api-keys/models";

const [db, app] = setupApp();

const ReturnedArticleSchema = t.Object({
  id: t.Number(),
  title: t.String(),
  subtitle: t.String(),
  theme: t.String(),
  writer: t.String(),
  thumbnailUri: t.String(),
  contentUri: t.String(),
  status: t.String(),
});

const validator = TypeCompiler.Compile(ReturnedArticleSchema);

// INFO: Happy paths
describe("Create a valid article", () => {
  let body: any;

  beforeEach(async () => {
    const response: Response = await app.handle(
      new Request(`${BASE_URL}/articles`, {
        method: "POST",
        headers: {
          Authorization: CommonMockData.validAdminAuthHeader,
        },
        body: ArticleMockData.validArticleFormData,
      }),
    );

    body = await response.json();
  });

  it("returns the article's metadata", () => {
    const isValid = validator.Check(body);

    expect(isValid).toBe(true);
  });

  it("creates an entry in the database", async () => {
    const record = await db.select().from(articles).limit(1);

    expect(record[0]).not.toBeNull();
  });
});

describe("Fetch all articles", () => {
  let body: any;
  beforeEach(async () => {
    const response = await app.handle(
      new Request(`${BASE_URL}/articles`, {
        headers: { Authorization: CommonMockData.validAdminAuthHeader },
      }),
    );

    body = await response.json();
  });

  it("returns a list of article metadata", async () => {
    expect(body).toBeArray();
  });

  it("works using a valid API key too", async () => {
    const passwordHash = await Bun.password.hash("admin123");
    const keyRequest = await db
      .insert(key_requests)
      .values({
        requesterName: "user",
        requestDescription: "need it for something",
        hashedPassword: passwordHash,
        receipt: crypto.randomUUID(),
      })
      .returning({ requestld: key_requests.id });

    await db.insert(api_keys).values({
      username: "user",
      keyString: "abc123",
      requestId: keyRequest[0].requestld,
    });

    const response = await app.handle(
      new Request(`${BASE_URL}/articles`, {
        headers: { "X-Api-key": CommonMockData.validApiKey },
      }),
    );

    expect(response.status).toBe(200);
  });
});

describe("Fetch data on one article", () => {
  let body: any;
  let created: any;

  beforeEach(async () => {
    created = await app
      .handle(
        new Request(`${BASE_URL}/articles`, {
          method: "POST",
          headers: { Authorization: CommonMockData.validAdminAuthHeader },
          body: ArticleMockData.validArticleFormData,
        }),
      )
      .then((res) => res.json());

    body = await app
      .handle(
        new Request(`${BASE_URL}/articles/${created.id}`, {
          headers: { Authorization: CommonMockData.validAdminAuthHeader },
        }),
      )
      .then((res) => res.json());
  });

  it("returns the correct type", () => {
    const validator = TypeCompiler.Compile(FinalArticleSchema);
    const isValid = validator.Check(body);

    expect(isValid).toBe(true);
  });

  it("returns the article's metadata", () => {
    // Verify the fetched metadata matches what we created
    expect(body.metadata.id).toEqual(created.id);
    expect(body.metadata.title).toEqual(created.title);
    expect(body.metadata.description).toEqual(created.description);
  });

  it("returns a usable presigned content URL", async () => {
    const content: Response = await fetch(body.fileUrl);

    expect(content.status).toEqual(200);
  });

  it("works using a valid API key too", async () => {
    const passwordHash = await Bun.password.hash("admin123");
    const keyRequest = await db
      .insert(key_requests)
      .values({
        requesterName: "user",
        requestDescription: "need it for something",
        hashedPassword: passwordHash,
        receipt: crypto.randomUUID(),
      })
      .returning({ requestld: key_requests.id });

    await db.insert(api_keys).values({
      username: "user",
      keyString: "abc123",
      requestId: keyRequest[0].requestld,
    });

    // Set article status to 'published' before fetching
    await db
      .update(articles)
      .set({ status: "published" })
      .where(eq(articles.id, created.id));

    const response = await app.handle(
      new Request(`${BASE_URL}/articles/${created.id}`, {
        headers: { "X-Api-key": CommonMockData.validApiKey },
      }),
    );

    expect(response.status).toBe(200);
  });
});

describe("Publishing a article as an admin", async () => {
  it("changes the article's status from draft to published", async () => {
    const created = await app
      .handle(
        new Request(`${BASE_URL}/articles`, {
          method: "POST",
          headers: { Authorization: CommonMockData.validAdminAuthHeader },
          body: ArticleMockData.validArticleFormData,
        }),
      )
      .then((res) => res.json());

    const response = await app.handle(
      new Request(`${BASE_URL}/articles/${created.id}/publish`, {
        method: "PUT",
        headers: { Authorization: CommonMockData.validAdminAuthHeader },
      }),
    );

    const publishedarticle = await db
      .select({ status: articles.status })
      .from(articles)
      .where(eq(articles.id, created.id))
      .limit(1);

    expect(response.status).toBe(204);
    expect(publishedarticle[0].status).toBe("published");
  });
});

// INFO: Sad paths :(
describe("Accessing a protected endpoint without credentials", async () => {
  const response = await app.handle(new Request(`${BASE_URL}/articles`));
  it("Throws a 401 Unauthorized error", () => {
    expect(response.status).toBe(401);
  });
});

describe("Accessing GET /articles endpoint with invalid credentials", async () => {
  it("rejects requests without either admin credentials or an API key", async () => {
    const response = await app.handle(new Request(`${BASE_URL}/articles`));
    expect(response.status).toBe(401);
  });

  it("rejects requests with an invalid API key", async () => {
    const response = await app.handle(
      new Request(`${BASE_URL}/articles`, {
        headers: { "X-Api-key": "invalid-api-key" },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects requests with invalid admin credentials", async () => {
    const response = await app.handle(
      new Request(`${BASE_URL}/articles`, {
        headers: { Authorization: CommonMockData.invalidAdminAuthHeader },
      }),
    );
    expect(response.status).toBe(401);
  });
});

describe("Fetching a article draft as a user", async () => {
  it("returns a 403 Forbidden response", async () => {
    // Create an API key to use
    const passwordHash = await Bun.password.hash("admin123");
    const keyRequest = await db
      .insert(key_requests)
      .values({
        requesterName: "user",
        requestDescription: "need it for something",
        hashedPassword: passwordHash,
        receipt: crypto.randomUUID(),
      })
      .returning({ requestld: key_requests.id });

    await db.insert(api_keys).values({
      username: "user",
      keyString: "abc123",
      requestId: keyRequest[0].requestld,
    });

    const creationResponse = await app.handle(
      new Request(`${BASE_URL}/articles`, {
        method: "POST",
        headers: { Authorization: CommonMockData.validAdminAuthHeader },
        body: ArticleMockData.validArticleFormData,
      }),
    );

    type Returnedarticle = typeof ReturnedArticleSchema.static;

    const created: Returnedarticle = await creationResponse.json();

    const response = await app.handle(
      new Request(`${BASE_URL}/articles/${created.id}`, {
        headers: { "X-Api-key": CommonMockData.validApiKey },
      }),
    );

    console.log(await response.text());

    expect(response.status).toBe(403);
  });
});

describe("Fetching a article that doesn't exist", async () => {
  it("returns a 404 response", async () => {
    const INVALID_ID: number = -1;
    const response = await app.handle(
      new Request(`${BASE_URL}/articles/${INVALID_ID}`, {
        headers: { Authorization: CommonMockData.validAdminAuthHeader },
      }),
    );

    expect(response.status).toBe(404);
  });
});

describe("Attempt to publish a article as user", async () => {
  it("fails with a 403 response code", async () => {
    const passwordHash = await Bun.password.hash("admin123");
    const keyRequest = await db
      .insert(key_requests)
      .values({
        requesterName: "user",
        requestDescription: "need it for something",
        hashedPassword: passwordHash,
        receipt: crypto.randomUUID(),
      })
      .returning({ requestld: key_requests.id });

    await db.insert(api_keys).values({
      username: "user",
      keyString: "abc123",
      requestId: keyRequest[0].requestld,
    });

    const created = await app
      .handle(
        new Request(`${BASE_URL}/articles`, {
          method: "POST",
          headers: { Authorization: CommonMockData.validAdminAuthHeader },
          body: ArticleMockData.validArticleFormData,
        }),
      )
      .then((res) => res.json());

    const response = await app.handle(
      new Request(`${BASE_URL}/articles/${created.id}/publish`, {
        method: "PUT",
        headers: { "X-Api-key": CommonMockData.validApiKey },
      }),
    );

    const publishedarticle = await db
      .select({ status: articles.status })
      .from(articles)
      .where(eq(articles.id, created.id))
      .limit(1);

    expect(response.status).toBe(403);
    expect(publishedarticle[0].status).toBe("draft");
  });
});
