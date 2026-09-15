// Minimalistische Odoo JSON-RPC-client (geen externe library nodig — Odoo
// praat JSON-RPC 2.0 op /jsonrpc, zowel voor Odoo Online als zelf-gehost).
//
// Benodigde environment variables:
//   ODOO_URL      bv. https://electramo.odoo.com
//   ODOO_DB       databasenaam (bij Odoo Online meestal de subdomeinnaam)
//   ODOO_USERNAME het e-mailadres/login van de Odoo-gebruiker bij de API-key
//   ODOO_API_KEY  aangemaakt in Odoo via Instellingen > Gebruikers > API Keys

async function odooCall(url, service, method, args) {
  const res = await fetch(`${url.replace(/\/$/, '')}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { service, method, args },
      id: Math.floor(Math.random() * 1e9),
    }),
  });
  if (!res.ok) {
    throw new Error(`Odoo antwoordde met HTTP ${res.status}.`);
  }
  const json = await res.json();
  if (json.error) {
    const msg = json.error.data?.message || json.error.message || 'Onbekende Odoo-fout.';
    throw new Error(msg);
  }
  return json.result;
}

async function authenticate({ url, db, username, apiKey }) {
  const uid = await odooCall(url, 'common', 'authenticate', [db, username, apiKey, {}]);
  if (!uid) {
    throw new Error('Inloggen bij Odoo is mislukt — controleer databasenaam, gebruikersnaam en API-key.');
  }
  return uid;
}

function getConfig() {
  const url = process.env.ODOO_URL;
  const db = process.env.ODOO_DB;
  const username = process.env.ODOO_USERNAME;
  const apiKey = process.env.ODOO_API_KEY;

  if (!url || !db || !username || !apiKey) {
    throw new Error(
      'Odoo-koppeling is niet volledig geconfigureerd (ODOO_URL, ODOO_DB, ODOO_USERNAME en/of ODOO_API_KEY ontbreken).'
    );
  }
  return { url, db, username, apiKey };
}

// De artikelcode staat bij Electramo in het "Productnaam"-veld (name) zelf
// (bv. "2E160.00D4K4."), niet in het aparte "Interne referentie"-veld
// (default_code) — dat laatste is bij hen bijna nergens ingevuld.
//
// "Vrije voorraad" in het Odoo-voorraadrapport (Voorraad > Rapportages >
// Voorraad) is Beschikbaar (qty_available) min Uitgaand (outgoing_qty) —
// niet gewoon qty_available zelf. Zie bv. rij EMS631-2: Beschikbaar 33,
// Uitgaand 1, Vrije voorraad 32.
//
// Het rapport is gefilterd op magazijn "Electramo NV" (naast Electramo NL,
// Afroeporders en een Fictief Magazijn) — we scopen de voorraadvelden op
// datzelfde magazijn via de "warehouse"-context, anders tellen we voorraad
// uit alle magazijnen samen op.
export async function fetchOdooStock() {
  const { url, db, username, apiKey } = getConfig();
  const uid = await authenticate({ url, db, username, apiKey });

  const warehouses = await odooCall(url, 'object', 'execute_kw', [
    db, uid, apiKey,
    'stock.warehouse', 'search_read',
    [[['name', '=', 'Electramo NV']]],
    { fields: ['id'], limit: 1 },
  ]);
  const warehouseId = warehouses?.[0]?.id;
  if (!warehouseId) {
    throw new Error('Magazijn "Electramo NV" niet gevonden in Odoo.');
  }

  const records = await odooCall(url, 'object', 'execute_kw', [
    db, uid, apiKey,
    'product.product', 'search_read',
    [[]],
    {
      fields: ['default_code', 'name', 'qty_available', 'outgoing_qty', 'incoming_qty'],
      context: { warehouse: warehouseId },
      limit: 0,
    },
  ]);

  return (records || [])
    .map((r) => ({
      code: (r.name || '').trim(),
      omschrijving: r.default_code || '',
      vrije_voorraad: Math.round((Number(r.qty_available) || 0) - (Number(r.outgoing_qty) || 0)),
      inkomend: Math.round(Number(r.incoming_qty) || 0),
    }))
    .filter((r) => r.code);
}
