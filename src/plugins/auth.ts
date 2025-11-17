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
        throw status(errorResponse, "Unauthorized");
      }

      const { username, password } = credentials!;

      validateAdminUser(db, username, password).then((errorCode) => {
        switch (errorCode) {
          case 401:
            throw status(errorCode, "Unauthorized");
          case 500:
            throw status(errorCode, "Internal Server Error");
        }
      });

      role = "admin" as Role;
    } else if (request.headers.has("x-api-key")) {
      // This branch checks for a valid API key
      const apiKeyHeader = request.headers.get("x-api-key")!;

      db.select({ id: api_keys.username })
        .from(api_keys)
        .where(eq(api_keys.keyString, apiKeyHeader))
        .limit(1)
        .then((result) => {
          if (result.length < 1) {
            throw status(401, "Unauthorized");
          }
        });

      role = "user" as Role;
    } else {
      throw status(401, "Unauthorized");
    }

    return {
      role: role,
    };
  });
