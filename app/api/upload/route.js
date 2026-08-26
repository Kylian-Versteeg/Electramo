import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabaseServer';
import { createAdminClient } from '../../../lib/supabaseAdmin';

async function requireAdmin() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { errorResponse: NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 }) };
  }
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!adminEmails.includes((user.email || '').toLowerCase())) {
    return { errorResponse: NextResponse.json({ error: 'Geen beheerderstoegang.' }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('upload_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ geschiedenis: data });
}

export async function POST(request) {
  const { errorResponse, user } = await requireAdmin();
  if (errorResponse) return errorResponse;

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

  const toUpdate = items
    .filter((it) => existingCodes.has(it.code))
    .map((it) => ({
      code: it.code,
      vrije_voorraad: it.vrije_voorraad,
      inkomend: it.inkomend,
      updated_at: new Date().toISOString(),
    }));
  const ignoredCodes = items
    .filter((it) => !existingCodes.has(it.code))
    .map((it) => it.code);
  const ignoredCount = ignoredCodes.length;

  // 4. Werk alle artikelen in EEN keer bij (bulk upsert i.p.v. losse calls).
  //    Alleen de kolommen code/vrije_voorraad/inkomend/updated_at worden aangeraakt;
  //    alle andere gegevens (omschrijving, motorgegevens, etc.) blijven ongewijzigd.
  let updatedCount = 0;
  if (toUpdate.length > 0) {
    const { error: upsertError, count } = await admin
      .from('products')
      .upsert(toUpdate, { onConflict: 'code', count: 'exact' });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
    updatedCount = count ?? toUpdate.length;
  }

  // 5. Bewaar dit uploadmoment in de geschiedenis, zodat je later kan terugzien wanneer je hebt geüpload.
  await admin.from('upload_log').insert({
    user_email: user.email,
    updated_count: updatedCount,
    ignored_count: ignoredCount,
    total_items: items.length,
    total_codes: existingCodes.size,
  });

  return NextResponse.json({
    updatedCount,
    ignoredCount,
    ignoredCodes,
    totalCodes: existingCodes.size,
  });
}
