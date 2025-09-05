import { Elysia } from "elysia";
import { keyRequestController } from "./key-requests/controller";
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
    .get("/", () => apiMetadata)
    .use(keyRequestController(db))
    .use(openapi({ path: "/openapi" }));

  return app;
}

export const app = createApp(db).listen({ idleTimeout: 10, port: 3000 });

console.log(
  `KMBUI backend is running at http://${app.server?.hostname}:${app.server?.port}`,
);
