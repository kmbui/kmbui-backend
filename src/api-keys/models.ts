import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  updated_at: integer({ mode: "timestamp" }),
  created_at: integer({ mode: "timestamp" }).default(new Date()).notNull(),
  deleted_at: integer({ mode: "timestamp" }),
};

export const key_requests = sqliteTable("key_requests", {
  id: integer().primaryKey({ autoIncrement: true }),
  requesterName: text("requester_name").notNull(),
  requestDescription: text("request_description").notNull(),
  receipt: text().notNull(),
  hashedPassword: text("hashed_password").notNull(),
  status: text({ enum: ["pending", "denied", "approved", "expired"] })
    .default("pending")
    .notNull(),
  ...timestamps,
});

export const api_keys = sqliteTable("api_keys", {
  username: text().primaryKey(),
  keyString: text("key_string").notNull().unique(),
  requestId: integer("request_id")
    .references(() => key_requests.id)
    .notNull(),
  ...timestamps,
});

export const admin_users = sqliteTable("admin_users", {
  username: text().primaryKey(),
  hashedPassword: text("hashed_password").notNull(),
  ...timestamps,
});

export const keyUsageLogs = sqliteTable(
  "key_usage_logs",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    timestamp: integer({ mode: "timestamp" }).default(new Date()).notNull(),
    apiUserId: text("api_user_id").references(() => api_keys.username),
    adminUserId: text("admin_user_id").references(() => admin_users.username),
    endpoint: text().notNull(),
    status: integer().notNull(),
  },
  (table) => [
    check(
      "id_check",
      sql`(${table.adminUserId} IS NOT NULL) + (${table.apiUserId} IS NOT NULL) = 1`,
    ),
  ],
);

export type KeyRequest = typeof key_requests.$inferSelect;
