import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  approved: integer({ mode: "boolean" }).default(false).notNull(),
  ...timestamps,
});

export const api_keys = sqliteTable("api_keys", {
  userId: text("user_id").primaryKey(),
  keyString: text("key_string").notNull().unique(),
  requestId: integer("request_id")
    .references(() => key_requests.id)
    .notNull(),
  ...timestamps,
});

export type KeyRequest = typeof key_requests.$inferSelect;
export type APIKey = typeof api_keys.$inferSelect;
