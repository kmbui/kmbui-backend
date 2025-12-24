import { LibSQLDatabase } from "drizzle-orm/libsql";
import Elysia, { status, t } from "elysia";
import { magazines, Magazine } from "./models";
import { eq, and } from "drizzle-orm";
import { authPlugin } from "../plugins/auth";

export const MagazineSchema = t.Object({
  id: t.Number(),
  title: t.String(),
  description: t.String(),
  thumbnailUrl: t.String(),
  contentUrl: t.String(),
  status: t.String(),
  updatedAt: t.Nullable(t.Date()),
  createdAt: t.Date(),
  deletedAt: t.Nullable(t.Date()),
});

export async function magazineController(db: LibSQLDatabase) {
  return new Elysia().group(
    "/magazines",
    { detail: { tags: ["Magazines"] } },
    (app) =>
      app
        .use(authPlugin(db))
        .get(
          "/",
          async ({ store: { db }, role }) => {
            // Users can fetch published magazines only, but admins can fetch drafts and archived magazines
            const condition =
              role === "user"
                ? eq(magazines.status, "published")
                : and(
                    eq(magazines.status, "published"),
                    eq(magazines.status, "draft"),
                    eq(magazines.status, "archived"),
                  );

            const fetchedMagazines = await db
              .select()
              .from(magazines)
              .where(condition);

            return fetchedMagazines;
          },
          {
            response: t.Array(MagazineSchema),
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
              return status(404, null);
            } else if (fetchedMagazines.length > 1) {
              return status(500, null);
            }

            const targetMagazine = fetchedMagazines[0];

            // Same thing as the fetch-all endpoint
            if (targetMagazine.status !== "published" && role !== "admin") {
              return status(403, null);
            }

            return targetMagazine;
          },
          {
            params: t.Object({ id: t.Number() }),
            response: {
              200: MagazineSchema,
              403: t.Null(),
              404: t.Null(),
              500: t.Null(),
            },
          },
        )
        .post(
          "/",
          ({ store: { db }, body: { title, description, thumbnailUrl } }) => {
            db.insert(magazines).values({
              title,
              description,
              thumbnailUrl,
            } as Magazine);
          },
          {
            body: t.Object({
              title: t.String(),
              description: t.String(),
              thumbnailUrl: t.String(),
              // TODO: Add file field
            }),
          },
        ),
  );
}
