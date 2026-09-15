import { createServerSupabase } from '../lib/supabaseServer';
import { createAdminClient } from '../lib/supabaseAdmin';
import { checkIsAdmin } from '../lib/isAdmin';
import VoorraadApp from '../components/VoorraadApp';

export const dynamic = 'force-dynamic'; // altijd verse data, geen caching

// Alleen de kolommen die de UI en de prijsberekening daadwerkelijk gebruiken —
// scheelt onnodige data t.o.v. select('*') (dat ook ongebruikte technische
// specs als bearing_de, weight, hs_code etc. zou meesturen).
const PRODUCT_COLUMNS = 'code, omschrijving, bouwgrootte, vermogen, polen, bouwvorm, volt, ie_klasse, materiaal, vrije_voorraad, inkomend, categorie, prijs_bruto_2023, prijs_bruto_2025, prijs_bruto_2025_b5';

export default async function HomePage({ searchParams }) {
  const supabase = createServerSupabase();

  // Gebruiker ophalen en producten ophalen zijn onafhankelijk van elkaar —
  // gelijktijdig uitvoeren scheelt een round-trip t.o.v. na elkaar wachten.
  const [{ data: { user } }, { data: products, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('products').select(PRODUCT_COLUMNS).order('code', { ascending: true }),
  ]);

  const isAdmin = await checkIsAdmin(supabase, user);

  let liveProducts = products || [];
  let klant = null;
  let kortingenMap = {};
  let klantenLijst = [];
  let bekekenAlsEmail = '';

  if (isAdmin) {
    // --- "Bekijk als klant"-modus (alleen beheerders) ---
    // Beheerders mogen hier de prijslijst van een gekozen klantaccount bekijken
    // (?as=email), om te zien wat die klant te zien krijgt. Omdat dit alleen
    // voor beheerders geldt, gebruiken we hiervoor de admin-client (bypast
    // RLS) i.p.v. de ingelogde-gebruiker-client, die anders alleen de eigen
    // (niet-bestaande) klantrij van de beheerder zou teruggeven. Niet-
    // beheerders komen deze tak nooit binnen — hun ?as= wordt genegeerd.
    const admin = createAdminClient();
    const { data: klantenLijstRows } = await admin
      .from('klanten')
      .select('email, naam, bedrijf')
      .order('email', { ascending: true });
    klantenLijst = klantenLijstRows || [];

    bekekenAlsEmail = (searchParams?.as || '').toString().trim().toLowerCase();
    const prijsVoorEmail = bekekenAlsEmail || (user.email || '').toLowerCase();

    if (prijsVoorEmail) {
      const { data: klantRow } = await admin
        .from('klanten')
        .select('*')
        .eq('email', prijsVoorEmail)
        .maybeSingle();

      if (klantRow) {
        klant = klantRow;
        const { data: kortingenRows } = await admin
          .from('kortingen')
          .select('categorie, korting_percentage')
          .eq('klant_id', klantRow.id);
        (kortingenRows || []).forEach((k) => {
          kortingenMap[k.categorie] = k.korting_percentage;
        });
      }
    }
  } else if (user?.email) {
    // --- Prijzen: bruto/netto per product o.b.v. het eigen klantaccount ---
    // De klanten/kortingen-tabellen hebben Row Level Security aan: met de
    // ingelogde-gebruiker-client (hierboven, "supabase") krijgt iedere klant
    // hier automatisch alléén zijn eigen rij terug, nooit die van een ander.
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
    const prijsVeld =
      klant.prijslijst === '2023' ? 'prijs_bruto_2023' :
      klant.prijslijst === '2025_b5' ? 'prijs_bruto_2025_b5' :
      'prijs_bruto_2025';
    const naamplaatActief = !!klant.naamplaat_actief;
    const naamplaatPrijs = naamplaatActief ? Number(klant.naamplaat_prijs) || 0 : 0;
    liveProducts = liveProducts.map((p) => {
      const bruto = p[prijsVeld];
      const korting = p.categorie ? kortingenMap[p.categorie] : undefined;
      let netto = (bruto !== null && bruto !== undefined && korting !== undefined)
        ? Math.round(bruto * (1 - korting / 100) * 100) / 100
        : null;
      // Naamplaat-toeslag: bovenop de nettoprijs van elk artikel, na de kortingsberekening.
      // Geldt voor alle categorieën, behalve flenzen (die hebben geen naamplaatje).
      if (netto !== null && naamplaatActief && p.categorie !== 'flenzen') {
        netto = Math.round((netto + naamplaatPrijs) * 100) / 100;
      }
      return { ...p, prijs_bruto: bruto ?? null, prijs_netto: netto, korting_percentage: korting ?? null };
    });
  }

  return (
    <VoorraadApp
      initialProducts={liveProducts}
      loadError={error ? error.message : null}
      odooNotice={null}
      userEmail={user?.email || ''}
      isAdmin={isAdmin}
      toontPrijzen={!!klant}
      naamplaatActief={!!klant?.naamplaat_actief}
      naamplaatPrijs={klant?.naamplaat_actief ? Number(klant.naamplaat_prijs) : null}
      klantenLijst={klantenLijst}
      bekekenAlsEmail={bekekenAlsEmail}
      weergaveNaam={klant?.bedrijf || null}
    />
  );
}
