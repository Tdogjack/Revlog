// Accepts Revlog's own variable names and the ones the Supabase–Vercel
// integration sets (which may include only the server-side SUPABASE_URL and
// SUPABASE_ANON_KEY). All Supabase calls run on the server, so the
// server-side names are enough.

export const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)!;

export const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY)!;
