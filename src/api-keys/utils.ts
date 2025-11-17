import { eq } from "drizzle-orm";
import { admin_users } from "./models";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import { ElysiaCustomStatusResponse, status } from "elysia";

export function generateSecureRandomString(length: number) {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const randomInts = new Uint8Array(length);
  crypto.getRandomValues(randomInts);

  let keyString = "";
  for (let i = 0; i < randomInts.length; i++) {
    keyString += alphabet[randomInts[i] >> 3];
  }

  return keyString;
}

export function getCredsFromHeader(authHeader: string): {
  errorResponse: number | null;
  credentials: { username: string; password: string } | null;
} {
  let errorResponse = null;
  let credentials = null;
  try {
    const authToken = authHeader.split(" ")[1];
    const [username, password] = atob(authToken).split(":");
    credentials = { username, password };
  } catch {
    errorResponse = 401;
  }

  return { errorResponse, credentials };
}

export async function validateAdminUser(
  db: LibSQLDatabase,
  username: string,
  password: string,
) {
  const result = await db
    .select()
    .from(admin_users)
    .where(eq(admin_users.username, username));

  if (result.length === 0) {
    return 401;
  } else if (result.length > 1) {
    return 500;
  }

  const isValidAdmin = await Bun.password.verify(
    password,
    result[0].hashedPassword,
  );

  if (!isValidAdmin) {
    return 401;
  }

  return null;
}
