import { Config } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as dotenv from "dotenv";
import { S3Client } from "bun";

// INFO: Loads from .env by default. Usage of other .env.* files
// should be configured here with the 'path' option
dotenv.config({ path: ".env" });

export const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  } as Config,
});

export const s3Client = new S3Client({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  bucket: process.env.BUCKET_NAME,
  endpoint: process.env.S3_ENDPOINT,
});
