import { Elysia } from "elysia";
import { keyRequestHandler } from "./handlers/key-requests";
import { db } from "./database";
import { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { errorHandler } from "./handlers/error";

export const apiMetadata = {
  name: "REST API to KMBUI's backend",
  apiVersion: "v1",
};

export function createApp(db: BunSQLiteDatabase) {
  const app = new Elysia()
    .use(errorHandler)
    .get("/", () => apiMetadata)
    .use(keyRequestHandler(db));

  return app;
}

export const app = createApp(db).listen({ idleTimeout: 10, port: 3000 });

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
