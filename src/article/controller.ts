import { eq, or, sql } from "drizzle-orm";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import { Elysia, status, t } from "elysia";
import { basename, extname } from "node:path";
import { s3Client } from "../db";
import { authPlugin } from "../plugins/auth";
import {
  articles,
  ArticleSchema,
  ArticleWithURL,
  FinalArticleSchema,
  InsertArticle,
  SelectArticle,
  TypeboxArticle,
} from "./models";
import { S3Client } from "bun";

export async function articleController(db: LibSQLDatabase) {
  return new Elysia().group(
    "/articles",
    { detail: { tags: ["Articles"] } },
    (app) =>
      app
        .use(authPlugin(db))
        .get("", async ({ store: { db }, role }) => {
          // Users can fetch published articles only, but admins can fetch drafts and archived articles
          const condition =
            role === "user"
              ? eq(articles.status, "published")
              : or(
                  eq(articles.status, "published"),
                  eq(articles.status, "draft"),
                  eq(articles.status, "archived"),
                );

          let fetchedArticles: TypeboxArticle[];
          try {
            fetchedArticles = await db.select().from(articles).where(condition);
          } catch {
            return status(
              500,
              "an unknown error occurred when fetching articles",
            );
          }

          return fetchedArticles;
        })
        .get(
          "/:id",
          async ({ params: { id }, role }) => {
            const fetchedArticles = await db
              .select()
              .from(articles)
              .where(eq(articles.id, id));

            if (fetchedArticles.length == 0) {
              return status(404, "article with provided ID doesn't exist");
            }

            const targetArticle = fetchedArticles[0];

            // Same thing as the fetch-all endpoint
            if (targetArticle.status !== "published" && role !== "admin") {
              return status(
                403,
                "only admin users can access unpublished articles",
              );
            }

            const presignedUrl = s3Client.presign(targetArticle.contentUri, {
              region: "garage",
              expiresIn: 30,
            });

            const decodedUrl = presignedUrl.replace(/%2F/g, "/");

            const articleWithPresignedUrl: ArticleWithURL = {
              metadata: targetArticle,
              fileUrl: decodedUrl,
            };

            return articleWithPresignedUrl;
          },
          {
            params: t.Object({ id: t.Integer() }),
            response: {
              200: FinalArticleSchema,
              403: t.Literal(
                "only admin users can access unpublished articles",
              ),
              404: t.Union([
                t.Literal("article with provided ID doesn't exist"),
              ]),
            },
          },
        )
        .post(
          "",
          async ({
            body: {
              title,
              subtitle,
              theme,
              writer,
              content,
              thumbnail,
              saveFileAs,
            },
          }) => {
            const contentUri = `articles/${saveFileAs}`;
            await s3Client.write(contentUri, content, { region: "garage" });

            const rawFileName = basename(saveFileAs);
            const fileExtension = extname(saveFileAs);
            const thumbnailUri = `articles/thumbnails/${rawFileName.concat("-thumbnail", fileExtension)}`;
            await s3Client.write(thumbnailUri, thumbnail, { region: "garage" });

            const insertValues: InsertArticle = {
              title,
              subtitle,
              theme,
              writer,
              thumbnailUri,
              contentUri,
            };

            let insertedOrErrMsg: TypeboxArticle | string;
            try {
              insertedOrErrMsg = await db.transaction(async (tx) => {
                const insertResult = await tx
                  .insert(articles)
                  .values(insertValues)
                  .returning();

                // If article insertion is invalid, roll back transaction
                if (insertResult.length > 1 || insertResult.length == 0) {
                  tx.rollback();
                  return "invalid article insertion result; database left unchanged";
                } else {
                  return insertResult[0];
                }
              });
            } catch {
              return status(500, "failed to insert article into database");
            }

            if (typeof insertedOrErrMsg === "string") {
              return status(500, insertedOrErrMsg);
            } else {
              return status(201, {
                id: insertedOrErrMsg.id,
                title: insertedOrErrMsg.title,
                subtitle: insertedOrErrMsg.subtitle,
                theme: insertedOrErrMsg.theme,
                writer: insertedOrErrMsg.writer,
                thumbnailUri: insertedOrErrMsg.thumbnailUri,
                contentUri: insertedOrErrMsg.contentUri,
                status: insertedOrErrMsg.status,
              });
            }
          },
          {
            parse: ["multipart/form-data"],
            body: t.Object({
              title: t.String(),
              subtitle: t.String(),
              theme: t.String(),
              writer: t.String(),
              thumbnail: t.File(),
              content: t.File(),
              saveFileAs: t.String(),
            }),
            response: {
              201: t.Object({
                id: t.Integer(),
                title: t.String(),
                subtitle: t.String(),
                theme: t.String(),
                writer: t.String(),
                thumbnailUri: t.String(),
                contentUri: t.String(),
                status: t.String(),
              }),
              500: t.Union([
                t.Literal(
                  "invalid article insertion result; database left unchanged",
                ),
                t.Literal("failed to insert article into database"),
              ]),
            },
          },
        )
        .put(
          "/:id/publish",
          async ({ params: { id }, role }) => {
            if (role !== "admin") {
              return status(403, "only admins can publish articles");
            }

            try {
              await db
                .update(articles)
                .set({ status: "published" })
                .where(eq(articles.id, id));

              return status(204, null);
            } catch {
              return status(500, "failed to update article status");
            }
          },
          {
            response: {
              204: t.Any(),
              403: t.Literal("only admins can publish articles"),
              500: t.Literal("failed to update article status"),
            },
            params: t.Object({ id: t.Integer() }),
          },
        )
        .put(
          "/:id",
          async ({ params: { id }, body }) => {
            const updates: any = {};
            if (body.title) updates.title = body.title;
            if (body.subtitle) updates.subtitle = body.subtitle;
            if (body.theme) updates.theme = body.theme;
            if (body.writer) updates.writer = body.writer;

            if (body.content || body.thumbnail) {
              if (!body.saveFileAs) {
                return status(
                  400,
                  "when updating content or thumbnail, please provide a value for saveFileAs",
                );
              }

              // Delete the old content to prevent dangling objects
              const queryResult = await db
                .select({
                  cUri: articles.contentUri,
                  tUri: articles.thumbnailUri,
                })
                .from(articles)
                .where(eq(articles.id, id));

              if (queryResult.length === 0) {
                return status(404, "article not found");
              }

              const oldArticle = queryResult[0];

              // Update article content or sync with name
              const contentUri = `articles/${body.saveFileAs}`;
              updates.contentUri = contentUri;

              if (body.content) {
                await s3Client.write(contentUri, body.content);
              } else {
                // Rewrite old file with new name
                const contentFile = s3Client.file(oldArticle.tUri);
                await s3Client.delete(oldArticle.tUri);
                await s3Client.write(contentUri, contentFile);
              }

              // Update article thumbnail or sync with name
              const rawFileName = basename(body.saveFileAs);
              const fileExtension = extname(body.saveFileAs);
              const thumbnailUri = `articles/thumbnails/${rawFileName.concat("-thumbnail", fileExtension)}`;
              updates.thumbnailUri = thumbnailUri;

              if (body.thumbnail) {
                await s3Client.write(thumbnailUri, body.thumbnail);
              } else {
                // Rewrite old file with new name
                const thumbnailFile = s3Client.file(oldArticle.tUri);
                await s3Client.delete(oldArticle.tUri);
                await s3Client.write(thumbnailUri, thumbnailFile);
              }
            }

            updates.updated_at = sql`(unixepoch())`;

            let updateResult: SelectArticle[];
            try {
              updateResult = await db
                .update(articles)
                .set(updates)
                .where(eq(articles.id, id))
                .returning();
            } catch {
              return status(
                500,
                "an error occurred while updating the specified article; if error persists, contact administrator",
              );
            }

            if (updateResult.length === 0) {
              return status(404, "article not found");
            }

            return status(200, updateResult[0]);
          },
          {
            parse: ["multipart/form-data"],
            params: t.Object({ id: t.Integer() }),
            body: t.Partial(
              t.Object({
                title: t.String(),
                subtitle: t.String(),
                theme: t.String(),
                writer: t.String(),
                thumbnail: t.File(),
                content: t.File(),
                saveFileAs: t.String(),
              }),
            ),
            response: {
              200: ArticleSchema,
              400: t.Literal(
                "when updating content or thumbnail, please provide a value for saveFileAs",
              ),
              404: t.Literal("article not found"),
              500: t.Literal(
                "an error occurred while updating the specified article; if error persists, contact administrator",
              ),
            },
          },
        )
        .delete(
          "/:id",
          async ({ params: { id }, role }) => {
            if (role !== "admin") {
              return status(403, "only admins are allowed to delete articles");
            }

            let deleted: TypeboxArticle[];
            try {
              deleted = await db
                .delete(articles)
                .where(eq(articles.id, id))
                .returning();
            } catch {
              return status(
                500,
                "an error occurred when deleting the target article",
              );
            }

            if (deleted.length == 0) {
              return status(404, "article with the provided ID not found");
            }

            return status(204);
          },
          {
            params: t.Object({ id: t.Integer() }),
            response: {
              204: t.Any(),
              403: t.Literal("only admins are allowed to delete articles"),
              404: t.Literal("article with the provided ID not found"),
              500: t.Literal(
                "an error occurred when deleting the target article",
              ),
            },
          },
        ),
  );
}
