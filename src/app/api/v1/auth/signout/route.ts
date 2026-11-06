import { ok } from "@/lib/api";
import { bearerToken, createAuthClient } from "@/lib/supabase/server";

// Ends this device's session. The app clears its tokens whatever happens here.
export async function POST() {
  const token = await bearerToken();
  if (token) await createAuthClient().auth.admin.signOut(token, "local");
  return ok({});
}
