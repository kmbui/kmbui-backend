import { time } from "drizzle-orm/mysql-core";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const timestamps = {
  updated_at: integer("updated_at", { mode: "timestamp" })
    .default(sql`(strftime('%s','now'))`)
    .notNull(),

  created_at: integer("created_at", { mode: "timestamp" })
    .default(sql`(strftime('%s','now'))`)
    .notNull(),

  deleted_at: integer("deleted_at", { mode: "timestamp" }),
};
export const articles = sqliteTable("articles", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull(),
    theme: text("theme").notNull(),
    writer: text("writer").notNull(),
    content: text("content").notNull(),
    ...timestamps
})
