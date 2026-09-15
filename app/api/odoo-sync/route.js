import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';
import { fetchOdooStock } from '../../../lib/odooClient';
import { syncStockUpdates } from '../../../lib/productSync';

export async function POST() {
  const { errorResponse, user } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const items = await fetchOdooStock();
    if (items.length === 0) {
      return NextResponse.json({ error: 'Geen artikelen met een artikelcode gevonden in Odoo.' }, { status: 400 });
    }

    const result = await syncStockUpdates(items, user.email);
    return NextResponse.json({ ...result, totalFromOdoo: items.length, items });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Odoo-sync mislukt.' }, { status: 500 });
  }
}
