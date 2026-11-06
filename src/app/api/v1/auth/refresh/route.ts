import type { Tokens } from "@/lib/api-types";
import { fail, ok, readBody } from "@/lib/api";
import { createAuthClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await readBody(request);
  const refreshToken = String(body.refreshToken ?? "");
  if (!refreshToken) return fail("Your session ended. Sign in again.", 401);
  const { data, error } = await createAuthClient().auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error || !data.session) return fail("Your session ended. Sign in again.", 401);
  const { access_token, refresh_token, expires_at } = data.session;
  return ok<Tokens>({
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: expires_at ?? null,
  });
}
