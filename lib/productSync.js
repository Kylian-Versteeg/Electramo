import { createAdminClient } from './supabaseAdmin';
import { fetchOdooStock } from './odooClient';

// Werkt vrije_voorraad/inkomend bij voor bestaande artikelen, gematcht op
// code. Gedeeld tussen de handmatige Excel-upload en de Odoo-sync, zodat
// beide dezelfde matching-logica gebruiken en in dezelfde uploadgeschiedenis
// (upload_log) terechtkomen. Er worden nooit nieuwe artikelen toegevoegd —
// alleen bestaande codes in de vaste lijst worden bijgewerkt.
export async function syncStockUpdates(items, userEmail) {
  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin.from('products').select('code');
  if (fetchError) throw new Error(fetchError.message);
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

  let updatedCount = 0;
  if (toUpdate.length > 0) {
    const { error: upsertError, count } = await admin
      .from('products')
      .upsert(toUpdate, { onConflict: 'code', count: 'exact' });
    if (upsertError) throw new Error(upsertError.message);
    updatedCount = count ?? toUpdate.length;
  }

  await admin.from('upload_log').insert({
    user_email: userEmail,
    updated_count: updatedCount,
    ignored_count: ignoredCount,
    total_items: items.length,
    total_codes: existingCodes.size,
  });

  return { updatedCount, ignoredCount, ignoredCodes, totalCodes: existingCodes.size };
}

// Haalt de bestaande artikelcodes op, vraagt Odoo naar precies die codes en
// werkt de voorraad bij — gedeeld tussen de handmatige "Synchroniseer met
// Odoo"-knop en de uur-cron (app/api/cron/odoo-sync).
export async function syncFromOdoo(userEmail) {
  const admin = createAdminClient();
  const { data: existing, error: fetchError } = await admin.from('products').select('code');
  if (fetchError) throw new Error(fetchError.message);
  const codes = existing.map((r) => r.code);

  const items = await fetchOdooStock(codes);
  if (items.length === 0) {
    throw new Error('Geen artikelen met een artikelcode gevonden in Odoo.');
  }

  const result = await syncStockUpdates(items, userEmail);
  return { ...result, totalFromOdoo: items.length, items };
}
