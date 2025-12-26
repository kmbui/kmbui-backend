import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { t } from "elysia";

const timestamps = {
  updatedAt: integer("updated_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
};

export const magazines = sqliteTable("magazines", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  description: text().notNull(),
  thumbnailUri: text("thumbnail_uri").notNull(),
  resourceUri: text("resource_uri").notNull(),
  status: text({ enum: ["draft", "published", "archived"] })
    .default("draft")
    .notNull(),
  ...timestamps,
});

export type InsertMagazine = typeof magazines.$inferInsert;
export type Magazine = typeof magazines.$inferSelect;

export const MagazineSchema = t.Object({
  id: t.Number(),
  title: t.String(),
  description: t.String(),
  thumbnailUri: t.String(),
  resourceUri: t.String(),
  status: t.String(),
  updatedAt: t.Nullable(t.Date()),
  createdAt: t.Date(),
  deletedAt: t.Nullable(t.Date()),
});

export const FinalMagazineSchema = t.Object({
  metadata: MagazineSchema,
  fileUrl: t.String(),
});

export type TypeboxMagazine = typeof MagazineSchema.static;
export type MagazineWithURL = typeof FinalMagazineSchema.static;
