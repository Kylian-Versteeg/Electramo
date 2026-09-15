import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';
import { syncFromOdoo } from '../../../lib/productSync';

export async function POST() {
  const { errorResponse, user } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const result = await syncFromOdoo(user.email);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Odoo-sync mislukt.' }, { status: 500 });
  }
}
