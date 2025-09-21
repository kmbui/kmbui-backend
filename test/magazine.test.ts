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
