import type { Tokens } from "@/lib/api-types";
import { fail, ok, readBody } from "@/lib/api";
import { registerAccount } from "@/lib/account";
import { siteUrl } from "@/lib/site";
import { createAuthClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await readBody(request);
  const result = await registerAccount(
    createAuthClient(),
    {
      email: String(body.email ?? "").trim(),
      password: String(body.password ?? ""),
      username: String(body.username ?? ""),
      agreed: body.agree === true,
    },
    siteUrl(),
  );
  if ("error" in result) return fail(result.error ?? "Sign up failed.");
  // With email confirmation on there's no session until the link is opened.
  if (!result.session) return ok<{ tokens: Tokens | null }>({ tokens: null }, 201);
  const { access_token, refresh_token, expires_at } = result.session;
  return ok<{ tokens: Tokens | null }>(
    {
      tokens: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expires_at ?? null,
      },
    },
    201,
  );
}
