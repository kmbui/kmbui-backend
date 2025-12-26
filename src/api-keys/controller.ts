import { LibSQLDatabase } from "drizzle-orm/libsql";
import { DrizzleQueryError, eq } from "drizzle-orm";
import Elysia, { status, t } from "elysia";
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

            return status(201, { receipt: response.receipt });
          },
          {
            body: t.Object({
              requesterName: t.String(),
              requestDescription: t.String(),
              password: t.String(),
            }),
            response: {
              201: t.Object({
                receipt: t.String(),
              }),
            },
          },
        )
        .get(
          "/",
          async ({ headers: { authorization }, store: { db } }) => {
            const { errorResponse, credentials } =
              getCredsFromHeader(authorization);

            if (errorResponse !== null) {
              return status(errorResponse.status, errorResponse.message);
            }

            const { username, password } = credentials!;

            const adminValidationResult = await validateAdminUser(
              db,
              username,
              password,
            );

            if (adminValidationResult !== null) {
              return status(
                adminValidationResult.status,
                adminValidationResult.message,
              );
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
            headers: t.Object({
              authorization: t.String(),
            }),
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
          async ({ params: { id }, headers: { authorization }, body, set }) => {
            if (!authorization) {
              return status(401, null);
            }

            const { errorResponse, credentials } =
              getCredsFromHeader(authorization);
            if (errorResponse !== null) {
              return status(errorResponse.status, errorResponse.message);
            }

            const { username, password } = credentials!;

            const adminValidationResult = await validateAdminUser(
              db,
              username,
              password,
            );

            if (adminValidationResult !== null) {
              return status(
                adminValidationResult.status,
                adminValidationResult.message,
              );
            }

            const matchingKeyRequestCount = await db.$count(
              key_requests,
              eq(key_requests.id, id),
            );

            if (matchingKeyRequestCount === 0) {
              return status(404, `Key request with ID ${id} doesn't exist`);
            }

            const matchingApiKeyCount = await db.$count(
              api_keys,
              eq(api_keys.requestId, id),
            );

            if (matchingApiKeyCount > 0) {
              return status(409, "A key with the provided ID already exists");
            }

            if (body.approved == true) {
              const keyString = generateSecureRandomString(64);

              try {
                await db.transaction(async (tx) => {
                  await tx
                    .update(key_requests)
                    .set({ status: "approved" })
                    .where(eq(key_requests.id, id))
                    .returning();

                  await tx.insert(api_keys).values({
                    username: body.assignedUsername,
                    keyString,
                    requestId: id,
                  });
                });
              } catch (error) {
                if (error instanceof DrizzleQueryError) {
                  return status(500, error.message);
                } else {
                  return status(500, "An unknown error occurred");
                }
              }

              return `API key with ID ${id} has been approved`;
            } else {
              try {
                await db
                  .update(key_requests)
                  .set({ status: "denied" })
                  .where(eq(key_requests.id, id))
                  .returning();
              } catch (error) {
                if (error instanceof DrizzleQueryError) {
                  return status(500, error.message);
                } else {
                  return status(500, "An unknown error occurred");
                }
              }

              return `API key request with ID ${id} has been denied`;
            }
          },
          {
            body: t.Object({
              assignedUsername: t.Optional(t.String()),
              approved: t.Boolean(),
            }),
            params: t.Object({ id: t.Integer() }),
            response: {
              204: t.String(),
              401: t.Null(),
              404: t.Null(),
              409: t.String(),
              500: t.Union([t.Null(), t.String()]),
            },
          },
        ),
    )
    .group("/key-claims", { detail: { tags: ["API keys"] } }, (app) =>
      app.post(
        "/",
        async ({ body: { receipt, password } }) => {
          // Fetch all key requests corresponding to the receipt
          const result = await db
            .select()
            .from(key_requests)
            .where(eq(key_requests.receipt, receipt));

          if (result.length == 0) {
            return status(
              404,
              "key request with the provided receipt doesn't exist",
            );
          }

          // If there is only one key request, keep it
          const targetKeyRequest = result[0];

          // If the key request has been denied, inform the user
          if (targetKeyRequest.status == "denied") {
            return status(200, "your API key request has been denied");
          }

          // Verify that the user provided password is equal to the one provided during request creation
          const isAuthenticated = await Bun.password.verify(
            password,
            targetKeyRequest.hashedPassword,
          );

          if (!isAuthenticated) {
            return status(401, "the user provided password is invalid");
          }

          // Fetch API key corresponding to the proper key request
          const apiKeyRequestResult = await db
            .select()
            .from(api_keys)
            .where(eq(api_keys.requestId, targetKeyRequest.id));

          if (apiKeyRequestResult.length == 0) {
            return status(
              404,
              "no API key with the provided request ID was found",
            );
          }

          return { key: apiKeyRequestResult[0].keyString };
        },
        {
          body: t.Object({ receipt: t.String(), password: t.String() }),
          response: {
            200: t.Union([
              t.Object({ key: t.String() }),
              t.Literal("your API key request has been denied"),
            ]),
            401: t.Literal("the user provided password is invalid"),
            404: t.Union([
              t.Literal("no API key with the provided request ID was found"),
              t.Literal("key request with the provided receipt doesn't exist"),
            ]),
          },
        },
      ),
    );
}
