// Accepts both Revlog's own variable names and the ones the Supabase–Vercel
// integration sets, so either way of configuring a deployment works.
// NEXT_PUBLIC_ values must be read as literal process.env.X so Next can
// inline them into browser code.

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
