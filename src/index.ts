import Database from "bun:sqlite";
import { BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { Elysia, t } from "elysia";
import { key_requests } from "./database/schema";

export const apiMetadata = {
  name: "REST API to KMBUI's backend",
  apiVersion: "v1",
};

export function createApp(db: BunSQLiteDatabase) {
  const app = new Elysia()
    .decorate("db", db)
    .onError(({ code, set, error }) => {
      if (code === "VALIDATION") {
        set.headers["content-type"] = "application/json";
        const errorObject = JSON.parse(error.message);

        const errorObjectSummaries: Record<string, string> =
          errorObject.errors.reduce(
            (
              acc: Record<string, string>,
              curr: { summary: string; path: string },
            ) => {
              acc[curr.path.slice(1)] = curr.summary;
              return acc;
            },
            {},
          );

        return {
          message: "a validation error occurred",
          errors: errorObjectSummaries,
        };
      }
    })
    .get("/", () => apiMetadata)
    .group("/auth", (app) =>
      app.post(
        "/key-requests",
        async ({
          body: { requesterName, requestDescription, password },
          db,
        }) => {
          const receipt = crypto.randomUUID();
          const hashedPassword = await Bun.password.hash(password);

          const response = db
            .insert(key_requests)
            .values({
              requesterName,
              requestDescription,
              receipt,
              hashedPassword,
            })
            .returning()
            .get();

          return { receipt: response.receipt };
        },
        {
          body: t.Object({
            requesterName: t.String(),
            requestDescription: t.String(),
            password: t.String(),
          }),
          response: t.Object({
            receipt: t.String(),
          }),
        },
      ),
    );

  return app;
}

const db = drizzle(new Database("./local.db"));

export const app = createApp(db).listen({ idleTimeout: 10, port: 3000 });

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
