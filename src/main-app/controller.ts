import openapi from "@elysiajs/openapi";
import { apiKeyController } from "../api-keys/controller";
import { errorHandler } from "../plugins/error";
import Elysia from "elysia";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import { articleController } from "../article/controller";

export const apiMetadata = {
  name: "REST API to KMBUI's backend",
  apiVersion: "v1",
};

export function createApp(db: LibSQLDatabase) {
  const app = new Elysia()
    .use(errorHandler)
    .get("/", () => apiMetadata, { detail: { tags: ["General"] } })
    .use(apiKeyController(db))
    .use(articleController(db))
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
