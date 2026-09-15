import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabaseAdmin';
import { requireAdmin } from '../../../lib/requireAdmin';
import { syncStockUpdates } from '../../../lib/productSync';

export async function GET() {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('upload_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(25);

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

  // 3-5. Matchen op code, bijwerken en loggen — gedeeld met de Odoo-sync.
  try {
    const result = await syncStockUpdates(items, user.email);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
