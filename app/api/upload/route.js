import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabaseServer';
import { createAdminClient } from '../../../lib/supabaseAdmin';

export async function POST(request) {
  // 1. Controleer server-side dat de aanvrager echt is ingelogd EN beheerder is.
  //    (nooit vertrouwen op wat de browser zegt)
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes((user.email || '').toLowerCase())) {
    return NextResponse.json({ error: 'Geen beheerderstoegang.' }, { status: 403 });
  }

  // 2. Lees de geüploade rijen.
  const { items } = await request.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Geen artikelen ontvangen.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // 3. Bepaal welke codes al in de vaste lijst bestaan - alleen die mogen worden bijgewerkt.
  const { data: existing, error: fetchError } = await admin.from('products').select('code');
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  const existingCodes = new Set(existing.map((r) => r.code));

  const toUpdate = items.filter((it) => existingCodes.has(it.code));
  const ignoredCount = items.length - toUpdate.length;

  // 4. Werk per artikel alleen vrije_voorraad en inkomend bij.
  let updatedCount = 0;
  for (const it of toUpdate) {
    const { error } = await admin
      .from('products')
      .update({
        vrije_voorraad: it.vrije_voorraad,
        inkomend: it.inkomend,
        updated_at: new Date().toISOString(),
      })
      .eq('code', it.code);
    if (!error) updatedCount += 1;
  }

  return NextResponse.json({
    updatedCount,
    ignoredCount,
    totalCodes: existingCodes.size,
  });
}
