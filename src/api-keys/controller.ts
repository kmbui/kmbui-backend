import { LibSQLDatabase } from "drizzle-orm/libsql";
import { count, eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { key_requests, api_keys } from "./models";
import {
  getCredsFromHeader,
  validateAdminUser,
  generateSecureRandomString,
} from "./utils";

export function apiKeyController(db: LibSQLDatabase) {
  return new Elysia()
    .state("db", db)
    .group("/key-requests", { detail: { tags: ["API keys"] } }, (app) =>
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

            const response = await db
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

            const { errorResponse, credentials } =
              getCredsFromHeader(authorization);
            if (errorResponse !== null) {
              return errorResponse;
            }

            const { username, password } = credentials!;

            const adminValidationResult = await validateAdminUser(
              db,
              username,
              password,
            );

            if (adminValidationResult !== null) {
              return adminValidationResult;
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
              .where(eq(key_requests.status, "pending"));

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
        )
        .patch(
          "/:id",
          async ({ params: { id }, headers: { authorization }, body }) => {
            if (!authorization) {
              return new Response(null, { status: 401 });
            }

            const { errorResponse, credentials } =
              getCredsFromHeader(authorization);
            if (errorResponse !== null) {
              return errorResponse;
            }

            const { username, password } = credentials!;

            const adminValidationResult = await validateAdminUser(
              db,
              username,
              password,
            );

            if (adminValidationResult !== null) {
              return adminValidationResult;
            }

            const matchingKeyRequestCount = await db
              .select({ count: count() })
              .from(key_requests)
              .where(eq(key_requests.id, id))
              .get();

            if (matchingKeyRequestCount!.count === 0) {
              return new Response(`Key request with ID ${id} doesn't exist`, {
                status: 404,
              });
            } else if (matchingKeyRequestCount!.count > 1) {
              return new Response(null, { status: 500 });
            }

            if (body.approved) {
              const keyString = generateSecureRandomString(64);

              await db.transaction(async (tx) => {
                await tx
                  .update(key_requests)
                  .set({ status: "approved" })
                  .where(eq(key_requests.id, id))
                  .returning();

                await tx.insert(api_keys).values({
                  username: body.username,
                  keyString,
                  requestId: id,
                });
              });

              return new Response(
                `API key request with ID ${id} has been approved`,
              );
            } else {
              await db
                .update(key_requests)
                .set({ status: "denied" })
                .where(eq(key_requests.id, id))
                .returning();

              return new Response(
                `API key request with ID ${id} has been denied`,
              );
            }
          },
          {
            body: t.Object({
              username: t.Optional(t.String()),
              approved: t.Boolean(),
            }),
            params: t.Object({ id: t.Integer() }),
          },
        ),
    )
    .group("/key-claims", { detail: { tags: ["API keys"] } }, (app) =>
      app.post(
        "/",
        async ({ body: { receipt, password } }) => {
          const result = await db
            .select()
            .from(key_requests)
            .where(eq(key_requests.receipt, receipt));

          if (result.length > 1) {
            return new Response(null, { status: 500 });
          } else if (result.length == 0) {
            return new Response("The requested API key request doesn't exist", {
              status: 404,
            });
          }

          const targetKeyRequest = result[0];

          const isAuthenticated = await Bun.password.verify(
            password,
            targetKeyRequest.hashedPassword,
          );

          if (!isAuthenticated) {
            return new Response(null, { status: 401 });
          }

          const apiRequestResult = await db
            .select()
            .from(api_keys)
            .where(eq(api_keys.requestId, targetKeyRequest.id));

          if (apiRequestResult.length > 1) {
            return new Response(null, { status: 500 });
          } else if (apiRequestResult.length == 0) {
            return new Response("Your API key request has been denied", {
              status: 200,
            });
          }

          return { key: apiRequestResult[0].keyString };
        },
        {
          body: t.Object({ receipt: t.String(), password: t.String() }),
          response: {
            200: t.Union([t.Object({ key: t.String() }), t.String()]),
            401: t.Any(),
            404: t.Any(),
            500: t.Any(),
          },
        },
      ),
    );
}
