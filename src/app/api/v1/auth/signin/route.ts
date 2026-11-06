import type { Tokens } from "@/lib/api-types";
import { fail, ok, readBody } from "@/lib/api";
import { signInWithPassword } from "@/lib/account";
import { createAuthClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await readBody(request);
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const result = await signInWithPassword(createAuthClient(), email, password);
  if ("error" in result) return fail(result.error ?? "Sign in failed.", 401);
  const { access_token, refresh_token, expires_at } = result.session;
  return ok<Tokens>({
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: expires_at ?? null,
  });
}
