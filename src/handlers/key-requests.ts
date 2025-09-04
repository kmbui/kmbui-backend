import { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import Elysia, { t } from "elysia";
import { key_requests } from "../database/schema";

export function keyRequestHandler(db: BunSQLiteDatabase) {
  return new Elysia().state("db", db).group("/key-requests", (app) =>
    app.post(
      "/",
      async ({
        body: { requesterName, requestDescription, password },
        store: { db },
      }) => {
        const receipt = crypto.randomUUID();
        const hashedPassword = await Bun.password.hash(password);

        const response = db
          .insert(key_requests)
          .values({
            requesterName,
            requestDescription,
            receipt,
            hashedPassword,
          })
          .returning()
          .get();

        return { receipt: response.receipt };
      },
      {
        body: t.Object({
          requesterName: t.String(),
          requestDescription: t.String(),
          password: t.String(),
        }),
        response: t.Object({
          receipt: t.String(),
        }),
      },
    ),
  );
}
