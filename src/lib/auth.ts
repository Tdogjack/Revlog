import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { bearerToken, createClient } from "@/lib/supabase/server";

export async function getUser() {
  // Supabase reads the clock to check session expiry; mark this as request-time work.
  await connection();
  const supabase = await createClient();
  // A token client has no stored session, so the token is passed in directly.
  const token = await bearerToken();
  const {
    data: { user },
  } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
