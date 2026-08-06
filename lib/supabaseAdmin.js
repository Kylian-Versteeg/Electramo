import { createClient } from '@supabase/supabase-js';

// LET OP: gebruikt de service_role sleutel en mag ALLEEN op de server
// (in API routes) gebruikt worden, nooit in browser-code.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
