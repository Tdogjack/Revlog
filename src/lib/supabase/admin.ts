import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase/env";

// Server-only access past storage rules, for moderators removing someone
// else's photos. Null until the secret key is set.
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
