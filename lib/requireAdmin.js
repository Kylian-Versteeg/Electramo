import { NextResponse } from 'next/server';
import { createServerSupabase } from './supabaseServer';

// Beheerder ben je via ADMIN_EMAILS (env var), of via klanten.is_admin — een
// klant kan individueel als beheerder aangevinkt worden (bv. voor het testen
// van beheerderstoegang zonder een e-mailadres aan ADMIN_EMAILS toe te voegen).
export async function requireAdmin() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { errorResponse: NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 }) };
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const email = (user.email || '').toLowerCase();
  let isAdmin = adminEmails.includes(email);

  if (!isAdmin) {
    const { data: eigenKlant } = await supabase
      .from('klanten')
      .select('is_admin')
      .eq('email', email)
      .maybeSingle();
    isAdmin = !!eigenKlant?.is_admin;
  }

  if (!isAdmin) {
    return { errorResponse: NextResponse.json({ error: 'Geen beheerderstoegang.' }, { status: 403 }) };
  }
  return { user };
}
