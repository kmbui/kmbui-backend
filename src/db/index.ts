import { Config } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as dotenv from "dotenv";

// INFO: Loads from .env by default. Usage of other .env.* files
// should be configured here with the 'path' option
dotenv.config({ path: ".env" });

export const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  } as Config,
});
