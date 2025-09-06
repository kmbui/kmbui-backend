import { Elysia } from "elysia";
import { apiKeyController } from "./api-keys/controller";
import { db } from "./database";
import { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { errorHandler } from "./handlers/error";
import { openapi } from "@elysiajs/openapi";

export const apiMetadata = {
  name: "REST API to KMBUI's backend",
  apiVersion: "v1",
};

export function createApp(db: BunSQLiteDatabase) {
  const app = new Elysia()
    .use(errorHandler)
    .get("/", () => apiMetadata, { detail: { tags: ["General"] } })
    .use(apiKeyController(db))
    .use(
      openapi({
        path: "/openapi",
        documentation: {
          tags: [
            {
              name: "General",
              description: "General information about the API",
            },
            {
              name: "API keys",
              description:
                "Endpoints to handle API key creation and moderation",
            },
          ],
        },
      }),
    );

  return app;
}

export const app = createApp(db).listen({ idleTimeout: 10, port: 3000 });

console.log(
  `KMBUI backend is running at http://${app.server?.hostname}:${app.server?.port}`,
);
