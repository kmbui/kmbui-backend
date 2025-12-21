import Elysia, { status, t } from "elysia";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import { getCredsFromHeader, validateAdminUser } from "../api-keys/utils";
import { api_keys } from "../api-keys/models";
import { eq } from "drizzle-orm";

export type Role = "admin" | "user";

export const authPlugin = (db: LibSQLDatabase) =>
  new Elysia().state("db", db).derive({ as: "scoped" }, ({ request }) => {
    let role: Role;

    if (request.headers.has("authorization")) {
      // This branch checks for user credentials
      const authHeader = request.headers.get("authorization")!;

      const { errorResponse, credentials } = getCredsFromHeader(authHeader);
      if (errorResponse !== null) {
        throw status(errorResponse.status, errorResponse.message);
      }

      const { username, password } = credentials!;

      validateAdminUser(db, username, password).then(
        (adminValidationResponse) => {
          if (adminValidationResponse !== null) {
            return status(
              adminValidationResponse.status,
              adminValidationResponse.message,
            );
          }
        },
      );

      role = "admin" as Role;
    } else if (request.headers.has("x-api-key")) {
      // This branch checks for a valid API key
      const apiKeyHeader = request.headers.get("x-api-key")!;

      db.select({ id: api_keys.username, revoked: api_keys.revoked })
        .from(api_keys)
        .where(eq(api_keys.keyString, apiKeyHeader))
        .limit(1)
        .then((result) => {
          if (result.length < 1) {
            throw status(401, "The provided API key is invalid");
          }

          if (result[0].revoked) {
            throw status(401, "This API key has been revoked");
          }
        });

      role = "user" as Role;
    } else {
      throw status(401, null);
    }

    return {
      role: role,
    };
  });
