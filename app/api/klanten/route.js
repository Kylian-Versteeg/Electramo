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
  const { data: klanten, error: kErr } = await admin.from('klanten').select('*').order('email');
  if (kErr) return NextResponse.json({ error: kErr.message }, { status: 500 });

  const { data: kortingen, error: dErr } = await admin.from('kortingen').select('*');
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

  const result = klanten.map((k) => {
    const eigenKortingen = {};
    kortingen.filter((d) => d.klant_id === k.id).forEach((d) => {
      eigenKortingen[d.categorie] = d.korting_percentage;
    });
    return { ...k, kortingen: eigenKortingen };
  });

  return NextResponse.json({ klanten: result });
}

export async function POST(request) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { email, naam, prijslijst, kortingen, naamplaat_actief, naamplaat_prijs } = body;

  if (!email || !prijslijst) {
    return NextResponse.json({ error: 'E-mailadres en prijslijst zijn verplicht.' }, { status: 400 });
  }
  if (!['2023', '2025'].includes(String(prijslijst))) {
    return NextResponse.json({ error: 'Prijslijst moet 2023 of 2025 zijn.' }, { status: 400 });
  }
  if (naamplaat_actief && (naamplaat_prijs === null || naamplaat_prijs === undefined || naamplaat_prijs === '' || isNaN(Number(naamplaat_prijs)))) {
    return NextResponse.json({ error: 'Vul een geldige naamplaat-prijs in.' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: klant, error: upsertErr } = await admin
    .from('klanten')
    .upsert(
      {
        email: email.trim().toLowerCase(),
        naam: naam || null,
        prijslijst: String(prijslijst),
        naamplaat_actief: !!naamplaat_actief,
        naamplaat_prijs: naamplaat_actief ? Number(naamplaat_prijs) : null,
      },
      { onConflict: 'email' }
    )
    .select()
    .single();
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  // Vervang de kortingen van deze klant volledig door de nieuw ingevulde set.
  const { error: delErr } = await admin.from('kortingen').delete().eq('klant_id', klant.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const rows = Object.entries(kortingen || {})
    .filter(([, pct]) => pct !== null && pct !== undefined && pct !== '')
    .map(([categorie, pct]) => ({ klant_id: klant.id, categorie, korting_percentage: Number(pct) }));

  if (rows.length > 0) {
    const { error: insErr } = await admin.from('kortingen').insert(rows);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, klant });
}

export async function DELETE(request) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'Geen klant-ID opgegeven.' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('klanten').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
