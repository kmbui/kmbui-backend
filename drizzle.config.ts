import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Default to using .env.local file to store environment variables
dotenv.config({ path: ".env.local" });

export default defineConfig({
  dialect: "turso",
  schema: "./src/**/models.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
