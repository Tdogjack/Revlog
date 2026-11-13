import type { NextRequest } from "next/server";
import type { Tokens } from "@/lib/api-types";
import { fail, ok, readBody } from "@/lib/api";
import { oauthStartUrl, PROVIDER_FAILED, redeemOAuthCode } from "@/lib/provider-sign-in";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const url = oauthStartUrl(
    params.get("provider") ?? "",
    params.get("redirectTo") ?? "",
    params.get("codeChallenge") ?? "",
  );
  if (!url) return fail("That sign-in option isn't available.");
  return ok({ url });
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const tokens = await redeemOAuthCode(String(body.code ?? ""), String(body.codeVerifier ?? ""));
  if (!tokens) return fail(PROVIDER_FAILED, 401);
  return ok<Tokens>(tokens);
}
