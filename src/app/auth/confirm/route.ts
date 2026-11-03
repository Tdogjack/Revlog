import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { markEmailVerified } from "@/lib/email-verification";
import { RESET_COOKIE } from "@/lib/reset-cookie";
import { createClient } from "@/lib/supabase/server";

const EMAIL_TYPES: EmailOtpType[] = ["email", "signup", "recovery", "email_change"];

// Links in Supabase's auth emails land here with a token hash. Unlike the
// /auth/callback code flow, this works when the link is opened on a different
// device or browser, and it keeps the link on our own domain so mail filters
// don't see a mismatch between the sender and the link.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const resetting = type === "recovery";

  if (tokenHash && type && EMAIL_TYPES.includes(type)) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      // Opening any of these links proves the user reads that inbox.
      if (data.user) await markEmailVerified(data.user.id);
      if (resetting) {
        (await cookies()).delete(RESET_COOKIE);
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      return NextResponse.redirect(`${origin}/garage`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=${resetting ? "reset" : "confirm"}`);
}
