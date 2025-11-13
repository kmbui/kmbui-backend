import { afterAll, afterEach, beforeAll } from "bun:test";
import { admin_users, api_keys, key_requests } from "../src/api-keys/models";
import { createClient } from "@libsql/client/sqlite3";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createApp } from "../src/main-app/controller";

export const TEST_PORT: number = 3000;
export const BASE_URL: string = `http://localhost:${TEST_PORT}`;

const libsqlClient = createClient({ url: "file:local.db" });
const db = drizzle(libsqlClient);
const app = createApp(db).listen(TEST_PORT);

export type KMBUIBackendApp = typeof app;

export function setupApp(): [LibSQLDatabase, KMBUIBackendApp] {
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

  return [db, app];
}
