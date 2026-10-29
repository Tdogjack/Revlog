import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// DATABASE_URL is Revlog's name; POSTGRES_URL is what the Supabase–Vercel
// integration sets. Both point at Supabase's pooled connection.
function connectionString() {
  const raw = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!raw) {
    throw new Error("Set DATABASE_URL (or POSTGRES_URL) to the Supabase connection string.");
  }
  // The integration adds a "supa" hint that Postgres itself would reject.
  if (!/[?&]supa=/.test(raw)) return raw;
  const url = new URL(raw);
  url.searchParams.delete("supa");
  return url.toString();
}

function createDb() {
  // Supabase's transaction pooler doesn't support prepared statements.
  const client = postgres(connectionString(), { prepare: false });
  return drizzle(client, { schema });
}

type Db = ReturnType<typeof createDb>;
let instance: Db | undefined;

// Connects on first use rather than at import, so builds (which import every
// route to read its config) don't need database settings.
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    instance ??= createDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
