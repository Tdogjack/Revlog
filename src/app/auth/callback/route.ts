import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { markEmailVerified } from "@/lib/email-verification";
import { RESET_COOKIE } from "@/lib/reset-cookie";
import { createClient } from "@/lib/supabase/server";

// Supabase's confirmation and password-reset emails land here with a one-time code.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const resetting = cookieStore.has(RESET_COOKIE);

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user) await markEmailVerified(data.user.id);
      if (resetting) {
        cookieStore.delete(RESET_COOKIE);
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      return NextResponse.redirect(`${origin}/garage`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=${resetting ? "reset" : "confirm"}`);
}
