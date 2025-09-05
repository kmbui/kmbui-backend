import { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { admin_users, key_requests } from "../database/schema";

export function keyRequestHandler(db: BunSQLiteDatabase) {
  return new Elysia().state("db", db).group("/key-requests", (app) =>
    app
      .post(
        "/",
        async ({
          body: { requesterName, requestDescription, password },
          store: { db },
          set,
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

          set.status = 201;
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
      )
      .get(
        "/",
        async ({ headers: { authorization }, store: { db } }) => {
          if (!authorization) {
            return new Response(null, { status: 401 });
          }

          const authToken = authorization.split(" ")[1];

          const [username, password] = atob(authToken).split(":");

          const result = await db
            .select()
            .from(admin_users)
            .where(eq(admin_users.username, username));

          if (result.length === 0) {
            return new Response(null, { status: 401 });
          } else if (result.length > 1) {
            return new Response(null, { status: 500 });
          }

          const isValidAdmin = await Bun.password.verify(
            password,
            result[0].hashedPassword,
          );

          if (!isValidAdmin) {
            return new Response(null, { status: 401 });
          }

          const keyRequests = await db
            .select({
              id: key_requests.id,
              requesterName: key_requests.requesterName,
              requestDescription: key_requests.requestDescription,
              receipt: key_requests.receipt,
              createdAt: key_requests.created_at,
            })
            .from(key_requests)
            .where(eq(key_requests.approved, false));

          return keyRequests;
        },
        {
          response: {
            200: t.Array(
              t.Object({
                id: t.Integer(),
                requesterName: t.String(),
                requestDescription: t.String(),
                receipt: t.String(),
                createdAt: t.Date(),
              }),
            ),
            401: t.Any(),
            500: t.Any(),
          },
        },
      ),
  );
}
