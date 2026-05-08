import { createClient } from "@supabase/supabase-js";

// Anon key is safe here because RLS policies restrict writes to server API routes.
// Leads table has no SELECT policy — emails are never readable from the browser.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// For server-side inserts (service role bypasses RLS):
export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
