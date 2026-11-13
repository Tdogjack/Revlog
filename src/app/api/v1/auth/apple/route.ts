import type { Tokens } from "@/lib/api-types";
import { fail, ok, readBody } from "@/lib/api";
import { PROVIDER_FAILED, signInWithAppleToken } from "@/lib/provider-sign-in";

export async function POST(request: Request) {
  const body = await readBody(request);
  const tokens = await signInWithAppleToken(String(body.idToken ?? ""), String(body.nonce ?? ""));
  if (!tokens) return fail(PROVIDER_FAILED, 401);
  return ok<Tokens>(tokens);
}
