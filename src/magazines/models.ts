import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  updatedAt: integer("updated_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(new Date())
    .notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
};

export const magazines = sqliteTable("magazines", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  description: text().notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  contentUrl: text("content_url").notNull(),
  ...timestamps,
});
