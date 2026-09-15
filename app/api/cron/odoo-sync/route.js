import { NextResponse } from 'next/server';
import { syncFromOdoo } from '../../../../lib/productSync';

// Wordt elk uur aangeroepen door Vercel Cron (zie vercel.json), maar
// synchroniseert alleen daadwerkelijk tussen 09:00 en 18:00 (Nederlandse
// tijd) — buiten dat venster doet deze route niets. Vercel Cron zelf kent
// geen tijdzones en rekent alles in UTC, dus het tijdvenster wordt hier
// in de code gecontroleerd (werkt daardoor ook automatisch goed door
// zomer-/wintertijd heen).
function isWithinSyncWindow() {
  const hour = Number(
    new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', hour: 'numeric', hour12: false }).format(
      new Date()
    )
  );
  return hour >= 9 && hour <= 18;
}

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!isWithinSyncWindow()) {
    return NextResponse.json({ skipped: true, reason: 'Buiten het syncvenster (09:00-18:00).' });
  }

  try {
    const result = await syncFromOdoo('Automatische Odoo-sync (cron)');
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Odoo-sync mislukt.' }, { status: 500 });
  }
}
