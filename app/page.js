import { createServerSupabase } from '../lib/supabaseServer';
import VoorraadApp from '../components/VoorraadApp';

export const dynamic = 'force-dynamic'; // altijd verse data, geen caching

export default async function HomePage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('code', { ascending: true });

  let liveProducts = products || [];

  // --- Prijzen: bruto/netto per product o.b.v. het klantaccount ---
  // De klanten/kortingen-tabellen hebben Row Level Security aan: met de
  // ingelogde-gebruiker-client (hierboven, "supabase") krijgt iedere klant
  // hier automatisch alléén zijn eigen rij terug, nooit die van een ander.
  let klant = null;
  let kortingenMap = {};
  if (user?.email) {
    const { data: klantRow } = await supabase
      .from('klanten')
      .select('*')
      .eq('email', user.email.toLowerCase())
      .maybeSingle();

    if (klantRow) {
      klant = klantRow;
      const { data: kortingenRows } = await supabase
        .from('kortingen')
        .select('categorie, korting_percentage')
        .eq('klant_id', klantRow.id);
      (kortingenRows || []).forEach((k) => {
        kortingenMap[k.categorie] = k.korting_percentage;
      });
    }
  }

  if (klant) {
    const prijsVeld = klant.prijslijst === '2023' ? 'prijs_bruto_2023' : 'prijs_bruto_2025';
    liveProducts = liveProducts.map((p) => {
      const bruto = p[prijsVeld];
      const korting = p.categorie ? kortingenMap[p.categorie] : undefined;
      const netto = (bruto !== null && bruto !== undefined && korting !== undefined)
        ? Math.round(bruto * (1 - korting / 100) * 100) / 100
        : null;
      return { ...p, prijs_bruto: bruto ?? null, prijs_netto: netto, korting_percentage: korting ?? null };
    });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = !!user && adminEmails.includes((user.email || '').toLowerCase());

  return (
    <VoorraadApp
      initialProducts={liveProducts}
      loadError={error ? error.message : null}
      odooNotice={null}
      userEmail={user?.email || ''}
      isAdmin={isAdmin}
      toontPrijzen={!!klant}
    />
  );
}
