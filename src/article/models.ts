import { time } from "drizzle-orm/mysql-core";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { timestamps } from "../common-utils/model-utils";
import { t } from "elysia";

export const articles = sqliteTable("articles", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  subtitle: text().notNull(),
  theme: text().notNull(),
  writer: text().notNull(),
  thumbnailUri: text("thumbnail_uri").notNull(),
  contentUri: text("content_uri").notNull(),
  status: text({ enum: ["draft", "published", "archived"] })
    .default("draft")
    .notNull(),
  ...timestamps,
});

export type InsertArticle = typeof articles.$inferInsert;
export type SelectArticle = typeof articles.$inferSelect;

export const ArticleSchema = t.Object({
  id: t.Integer(),
  title: t.String(),
  subtitle: t.String(),
  theme: t.String(),
  writer: t.String(),
  thumbnailUri: t.String(),
  contentUri: t.String(),
  status: t.String(),
  updatedAt: t.Nullable(t.Date()),
  createdAt: t.Date(),
  deletedAt: t.Nullable(t.Date()),
});

export const FinalArticleSchema = t.Object({
  metadata: ArticleSchema,
  fileUrl: t.String(),
});

export type TypeboxArticle = typeof ArticleSchema.static;
export type ArticleWithURL = typeof FinalArticleSchema.static;
