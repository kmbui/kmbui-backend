import { LibSQLDatabase } from "drizzle-orm/libsql";
import Elysia, { status, t } from "elysia";
import { magazines, Magazine } from "./models";
import { eq, and } from "drizzle-orm";
import { authPlugin } from "../plugins/auth";

const Magazine = t.Object({
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
            response: t.Array(Magazine),
          },
        )
        .get(
          "/:id",
          async ({ params: { id }, store: { db }, role }) => {
            // Same thing as the fetch-all endpoint
            const fetchedMagazines = await db
              .select()
              .from(magazines)
              .where(eq(magazines.id, id));

            if (fetchedMagazines.length == 0) {
              return status(404, "Not Found");
            } else if (fetchedMagazines.length > 1) {
              return status(500, "Internal Server Error");
            }

            const targetMagazine = fetchedMagazines[0];

            if (targetMagazine.status !== "published" && role !== "admin") {
              return status(403, "Forbidden");
            }

            return targetMagazine;
          },
          {
            params: t.Object({ id: t.Number() }),
            response: { 200: Magazine, 404: t.Any(), 500: t.Any() },
          },
        )
        .post(
          "/",
          ({ store: { db }, body: { title, description, thumbnailUrl } }) => {
            db.insert(magazines).values({ title, description, thumbnailUrl });
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
