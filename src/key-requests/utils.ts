import { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { eq } from "drizzle-orm";
import { admin_users } from "../database/schema";

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

export function getCredsFromHeader(authHeader: string) {
  const authToken = authHeader.split(" ")[1];

  const [username, password] = atob(authToken).split(":");

  return { username, password };
}

export async function validateAdminUser(
  db: BunSQLiteDatabase,
  username: string,
  password: string,
) {
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

  return null;
}
