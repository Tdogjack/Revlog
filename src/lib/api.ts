import "server-only";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { isUuid } from "@/lib/vehicles";

export const ok = <T>(data: T, status = 200) => NextResponse.json(data, { status });

export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Bad JSON reads as an empty body, which then fails validation with a clear message.
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body;
  } catch {}
  return {};
}

type Handler<P> = (context: {
  user: User;
  request: NextRequest;
  params: P;
}) => Promise<Response>;

// Every signed-in route goes through here: a JSON 401 instead of the website's
// redirect to /login, and path ids checked before they reach a query.
export function authed<P extends Record<string, string> = Record<string, never>>(
  handler: Handler<P>,
) {
  return async (request: NextRequest, context: { params: Promise<P> }) => {
    try {
      const user = await getUser();
      if (!user) return fail("Your session ended. Sign in again.", 401);
      // Routes with no ids in the path get no params at all.
      const params = (await context.params) ?? ({} as P);
      if (!Object.values(params).every(isUuid)) return fail("That wasn't found.", 404);
      return await handler({ user, request, params });
    } catch (err) {
      console.error("API request failed", err);
      return fail("Something went wrong. Try again.", 500);
    }
  };
}
