import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, so load .env.local ourselves.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// Migrations use the direct (session) connection, not the pooled app connection.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
  entities: {
    roles: { provider: "supabase" },
  },
});
