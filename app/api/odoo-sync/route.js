import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';
import { createAdminClient } from '../../../lib/supabaseAdmin';
import { fetchOdooStock } from '../../../lib/odooClient';
import { syncStockUpdates } from '../../../lib/productSync';

export async function POST() {
  const { errorResponse, user } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    // Vraag Odoo alleen om de artikelcodes die al in de vaste lijst staan —
    // veel sneller en betrouwbaarder dan alle ~7000 Odoo-producten ophalen
    // (inclusief lege/dubbele testvarianten), en werkt voor elk codeformaat
    // (motoren mét punt op het eind én flenzen zonder punt).
    const admin = createAdminClient();
    const { data: existing, error: fetchError } = await admin.from('products').select('code');
    if (fetchError) throw new Error(fetchError.message);
    const codes = existing.map((r) => r.code);

    const items = await fetchOdooStock(codes);
    if (items.length === 0) {
      return NextResponse.json({ error: 'Geen artikelen met een artikelcode gevonden in Odoo.' }, { status: 400 });
    }

    const result = await syncStockUpdates(items, user.email);
    return NextResponse.json({ ...result, totalFromOdoo: items.length, items });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Odoo-sync mislukt.' }, { status: 500 });
  }
}
