import Database from "bun:sqlite";
import { BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { Elysia } from "elysia";

export const apiMetadata = {
  name: "REST API to KMBUI's backend",
  apiVersion: "v1",
};

export function createApp(db: BunSQLiteDatabase) {
  const app = new Elysia()
    .decorate("db", db)
    .get("/", () => apiMetadata)
    .group("/auth", (app) => app.post("/key-requests", "Key requests"));

  return app;
}

const db = drizzle(new Database("./local.db"));

export const app = createApp(db).listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
