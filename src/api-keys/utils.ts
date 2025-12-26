import { eq } from "drizzle-orm";
import { admin_users } from "./models";
import { LibSQLDatabase } from "drizzle-orm/libsql";

export type ErrorResponse = {
  status: number;
  message: string;
} | null;

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
  errorResponse: ErrorResponse;
  credentials: { username: string; password: string } | null;
} {
  let errorResponse: ErrorResponse = null;
  let credentials = null;

  try {
    const encodedAuthToken = authHeader.split(" ")[1];
    const authToken = Buffer.from(encodedAuthToken, "base64");
    const [username, password] = authToken.toString().split(":");
    credentials = { username, password };
  } catch {
    errorResponse = {
      status: 400,
      message: "The provided credentials are malformed",
    } as ErrorResponse;
  }

  return { errorResponse, credentials };
}

export async function validateAdminUser(
  db: LibSQLDatabase,
  username: string,
  password: string,
): Promise<ErrorResponse> {
  const result = await db
    .select()
    .from(admin_users)
    .where(eq(admin_users.username, username));

  if (result.length === 0) {
    return {
      status: 401,
      message: "Provided admin credentials are invalid",
    } as ErrorResponse;
  }

  const isValidAdmin = await Bun.password.verify(
    password,
    result[0].hashedPassword,
  );

  if (!isValidAdmin) {
    return {
      status: 401,
      message: "Provided admin credentials are invalid",
    } as ErrorResponse;
  }

  return null;
}
