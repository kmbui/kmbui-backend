import { LibSQLDatabase } from "drizzle-orm/libsql";
import Elysia, { status, t } from "elysia";
import {
  magazines,
  InsertMagazine,
  MagazinePreviewSchema,
  MagazineWithURL,
  FinalMagazineSchema,
  TypeboxMagazine,
  Magazine,
  MagazineWithThumbnailURL,
} from "./models";
import { eq, or } from "drizzle-orm";
import { authPlugin } from "../plugins/auth";
import { s3Client } from "../db";
import { basename, extname } from "node:path";

export async function magazineController(db: LibSQLDatabase) {
  return new Elysia().group(
    "/magazines",
    { detail: { tags: ["Magazines"] } },
    (app) =>
      app
        .use(authPlugin(db))
        .get(
          "",
          async ({ store: { db }, role }) => {
            // Users can fetch published magazines only, but admins can fetch drafts and archived magazines
            const condition =
              role === "user"
                ? eq(magazines.status, "published")
                : or(
                    eq(magazines.status, "published"),
                    eq(magazines.status, "draft"),
                    eq(magazines.status, "archived"),
                  );

            let fetchedMagazines: Magazine[];
            try {
              fetchedMagazines = await db
                .select()
                .from(magazines)
                .where(condition);
            } catch {
              return status(
                500,
                "an unknown error occurred when fetching magazines",
              );
            }

            let fetchedMagazinesWithThumbnails: MagazineWithThumbnailURL[] = [];
            fetchedMagazines.forEach((magazine: Magazine) => {
              const thumbnailUrl = s3Client.presign(magazine.thumbnailUri, {
                expiresIn: 30,
              });

              fetchedMagazinesWithThumbnails.push({
                metadata: magazine,
                thumbnailUrl,
              } as MagazineWithThumbnailURL);
            });

            return fetchedMagazinesWithThumbnails;
          },
          {
            response: {
              200: t.Array(MagazinePreviewSchema),
              500: t.Literal(
                "an unknown error occurred when fetching magazines",
              ),
            },
          },
        )
        .get(
          "/:id",
          async ({ params: { id }, store: { db }, role }) => {
            const fetchedMagazines = await db
              .select()
              .from(magazines)
              .where(eq(magazines.id, id));

            if (fetchedMagazines.length == 0) {
              return status(404, "magazine with provided ID doesn't exist");
            }

            const targetMagazine = fetchedMagazines[0];

            // Same thing as the fetch-all endpoint
            if (targetMagazine.status !== "published" && role !== "admin") {
              return status(
                403,
                "only admin users can access unpublished magazines",
              );
            }

            const presignedUrl = s3Client.presign(targetMagazine.resourceUri, {
              expiresIn: 30,
            });

            const decodedUrl = presignedUrl.replace(/%2F/g, "/");

            const presignedThumbnail = s3Client.presign(
              targetMagazine.thumbnailUri,
              { expiresIn: 30 },
            );

            const decodedThumbnailUrl = presignedThumbnail.replace(/%2F/g, "/");

            const magazineWithPresignedUrl: MagazineWithURL = {
              metadata: targetMagazine,
              thumbnailUrl: decodedThumbnailUrl,
              fileUrl: decodedUrl,
            };

            return magazineWithPresignedUrl;
          },
          {
            params: t.Object({ id: t.Number() }),
            response: {
              200: FinalMagazineSchema,
              403: t.Literal(
                "only admin users can access unpublished magazines",
              ),
              404: t.Union([
                t.Literal("magazine with provided ID doesn't exist"),
              ]),
            },
          },
        )
        .post(
          "",
          async ({
            store: { db },
            body: { title, description, thumbnail, saveFileAs, file },
          }) => {
            const resourceUri = `magazines/${saveFileAs}`;
            await s3Client.write(resourceUri, file);

            const fileExtension = extname(saveFileAs);
            const rawFileName = basename(saveFileAs, fileExtension);
            const thumbnailUri = `magazines/thumbnails/${rawFileName.concat("-thumbnail", fileExtension)}`;
            await s3Client.write(thumbnailUri, thumbnail);

            const insertValues: InsertMagazine = {
              title,
              description,
              thumbnailUri,
              resourceUri,
            };

            let insertedOrErrMsg: TypeboxMagazine | string;
            try {
              insertedOrErrMsg = await db.transaction(async (tx) => {
                const insertResult = await tx
                  .insert(magazines)
                  .values(insertValues)
                  .returning();

                // If magazine insertion is invalid, roll back transaction
                if (insertResult.length > 1 || insertResult.length == 0) {
                  tx.rollback();
                  return "invalid magazine insertion result; database left unchanged";
                } else {
                  return insertResult[0];
                }
              });
            } catch {
              return status(500, "failed to insert magazine into database");
            }

            if (typeof insertedOrErrMsg === "string") {
              return status(500, insertedOrErrMsg);
            } else {
              return status(201, {
                id: insertedOrErrMsg.id,
                title: insertedOrErrMsg.title,
                description: insertedOrErrMsg.description,
                thumbnailUri: insertedOrErrMsg.thumbnailUri,
                resourceUri: insertedOrErrMsg.resourceUri,
                status: insertedOrErrMsg.status,
              });
            }
          },
          {
            parse: ["multipart/form-data"],
            body: t.Object({
              title: t.String(),
              description: t.String(),
              thumbnail: t.File(),
              saveFileAs: t.String(),
              file: t.File(),
            }),
            response: {
              201: t.Object({
                id: t.Integer(),
                title: t.String(),
                description: t.String(),
                thumbnailUri: t.String(),
                resourceUri: t.String(),
                status: t.String(),
              }),
              500: t.Union([
                t.Literal(
                  "invalid magazine insertion result; database left unchanged",
                ),
                t.Literal("failed to insert magazine into database"),
              ]),
            },
          },
        )
        .put(
          "/:id/publish",
          async ({ params: { id }, role }) => {
            if (role !== "admin") {
              return status(403, "only admins can publish magazines");
            }

            try {
              await db
                .update(magazines)
                .set({ status: "published" })
                .where(eq(magazines.id, id));

              return status(204, null);
            } catch {
              return status(500, "failed to update magazine status");
            }
          },
          {
            response: {
              204: t.Any(),
              403: t.Literal("only admins can publish magazines"),
              500: t.Literal("failed to update magazine status"),
            },
            params: t.Object({ id: t.Integer() }),
          },
        ),
  );
}
