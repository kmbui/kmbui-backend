import { afterAll, afterEach, beforeAll } from "bun:test";
import { createClient } from "@libsql/client/sqlite3";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createApp } from "../src/main-app/controller";
import { admin_users, api_keys, key_requests } from "../src/api-keys/models";

export const TEST_PORT: number = 3000;
export const BASE_URL: string = `http://localhost:${TEST_PORT}`;

export type KMBUIBackendApp = ReturnType<typeof createApp>;

export function setupApp(): [LibSQLDatabase, KMBUIBackendApp] {
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

  return [db, app];
}

export namespace CommonMockData {
  export const validAdminAuthHeader = "Basic YWRtaW46YWRtaW4xMjM=";
  export const invalidAdminAuthHeader = "Basic YWRtaW46aW52YWxpZDEyMw==";
  export const validApiKey = "abc123";
}

export namespace APIKeyMockData {}

export namespace MagazineMockData {
  const magazineThumbnail = Bun.file("test/files/parmit-26-thumbnail.jpg");
  const magazineFile = Bun.file("test/files/parmit-26.pdf");

  export const validMagazineFormData = new FormData();
  validMagazineFormData.append("title", "Paramita 26");
  validMagazineFormData.append(
    "description",
    "This edition includes brainrot avoidance advice. Read at your own risk",
  );
  validMagazineFormData.append(
    "thumbnail",
    magazineThumbnail,
    "parmit-26-thumbnail.png",
  );
  validMagazineFormData.append("file", magazineFile, "parmit-26.pdf");
  validMagazineFormData.append("saveFileAs", "parmit-26.pdf");
}
