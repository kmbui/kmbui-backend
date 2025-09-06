import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/**/models.ts",
  dbCredentials: {
    url: "local.db",
  },
});
