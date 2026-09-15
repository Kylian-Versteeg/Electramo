'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabaseClient';
import { LOGO_DATA_URI } from '../lib/logo';

// Standaard-sortering: deze prefixen bovenaan, in deze volgorde. De rest erachteraan
// (in de volgorde waarin ze uit de database komen).
const PREFIX_VOLGORDE = ['3M', '3E', '4E', '3XE'];
function prefixPrioriteit(code) {
  for (let i = 0; i < PREFIX_VOLGORDE.length; i++) {
    if ((code || '').startsWith(PREFIX_VOLGORDE[i])) return i;
  }
  return PREFIX_VOLGORDE.length;
}
const IE_ORDER = ['IE1', 'IE2', 'IE3', 'IE4'];

function isFlens(p) {
  return p.categorie === 'flenzen';
}

function fmtPrijs(v) {
  if (v === null || v === undefined) return 'R.F.Q.';
  return '€ ' + v.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtKorting(v) {
  if (v === null || v === undefined) return '—';
  return v.toLocaleString('nl-NL', { maximumFractionDigits: 1 }) + '%';
}

// Materiaal komt als vaste Nederlandse waarde uit de database (Aluminium/Gietijzer)
// — in andere talen vertalen we alleen de weergave, de onderliggende filterwaarde
// blijft de originele DB-waarde.
const MATERIAAL_VERTALINGEN = {
  en: { Gietijzer: 'Cast Iron' },
  fr: { Gietijzer: 'Fonte' },
};
function fmtMateriaal(v, lang) {
  if (!v) return v;
  return MATERIAAL_VERTALINGEN[lang]?.[v] || v;
}

function stockFlag(v) {
  if (v === 0) return <span className="flag flag-zero">0</span>;
  if (v > 0 && v <= 3) return <span className="flag flag-low">{v}</span>;
  if (v > 0) return <span className="flag flag-ok">{v}</span>;
  return <span className="flag flag-zero">{v}</span>;
}

function poleSortValue(p) {
  if (!p) return -1;
  if (p.includes('/')) {
    const [a, b] = p.split('/').map(Number);
    return 1000 + a * 100 + b;
  }
  return parseInt(p, 10) || 0;
}

function ieSortValue(v) {
  const idx = IE_ORDER.indexOf(v);
  return idx === -1 ? [1, v] : [0, idx];
}

function sortValues(field, arr) {
  const unique = [...new Set(arr.filter((v) => v !== null && v !== undefined && v !== ''))];
  if (field === 'polen') {
    return unique.sort((a, b) => poleSortValue(a) - poleSortValue(b));
  }
  if (field === 'ie_klasse') {
    return unique.sort((a, b) => {
      const [ga, ia] = ieSortValue(a);
      const [gb, ib] = ieSortValue(b);
      if (ga !== gb) return ga - gb;
      return ga === 0 ? ia - ib : String(ia).localeCompare(String(ib), undefined, { numeric: true });
    });
  }
  return unique.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}

// Wisselt één waarde in een multi-select filter aan/uit.
function toggleWaarde(arr, waarde) {
  return arr.includes(waarde) ? arr.filter((x) => x !== waarde) : [...arr, waarde];
}

// Herbruikbare multi-select filter: knop met aantal geselecteerd, eronder een
// uitklapbaar paneel met checkboxes per optie. Zo blijft een eerder gekozen
// waarde (bv. 2,2 kW) staan als je daarna nog een waarde (bv. 3 kW) aanvinkt.
function FilterMultiSelect({ label, options, selected, onToggle, formatOption, allLabel, selectedLabel }) {
  return (
    <div>
      <label>{label}</label>
      <details className="multiselect">
        <summary>{selected.length > 0 ? `${selected.length} ${selectedLabel}` : allLabel}</summary>
        <div className="multiselect-panel">
          {options.length === 0 && (
            <span className="multiselect-empty">{allLabel}</span>
          )}
          {options.map((o) => (
            <label key={o} className="multiselect-option">
              <input
                type="checkbox"
                checked={selected.includes(o)}
                onChange={() => onToggle(o)}
              />
              {formatOption(o)}
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}

// Vertalingen voor de taalswitch (NL/EN) — alleen UI-teksten, de data zelf
// (artikelcodes, omschrijvingen uit de database) wordt niet vertaald.
const TRANSLATIONS = {
  nl: {
    langNaam: 'Nederlands',
    taalLabel: 'Taal',
    klanten: 'Klanten',
    upload: 'Upload',
    hoofdportaal: '← Hoofdportaal',
    uitloggen: 'Uitloggen',
    testBanner: 'Je bevindt je in de testomgeving — wijzigingen hier staan pas op de hoofdpagina zodra ze zijn overgezet',
    konNietLaden: 'Kon de voorraad niet laden: ',
    zoekPlaceholder: 'Zoek op artikelcode of omschrijving...',
    filterVermogen: 'Vermogen',
    filterBouwgrootte: 'Bouwgrootte',
    filterPolen: 'Polen',
    filterBouwvorm: 'Bouwvorm',
    filterVolt: 'Volt',
    filterIeKlasse: 'IE klasse',
    filterMateriaal: 'Materiaal',
    alle: 'Alle',
    geselecteerd: 'geselecteerd',
    alleenOpVoorraad: 'Alleen op voorraad',
    alleenFlenzen: 'Alleen flenzen',
    wisFilters: 'Wis filters',
    allesWissen: 'Alles wissen',
    artikelenGevonden: 'artikelen gevonden',
    naamplaatInfo: (prijs) => `Motorprijs is inclusief naamplaat ${prijs}`,
    geenArtikelen: 'Geen artikelen gevonden met deze filters.',
    kolomArtikelcode: 'Artikelcode',
    kolomOmschrijving: 'Omschrijving',
    kolomVrijeVoorraad: 'Voorraad',
    kolomInkomend: 'Inkomend',
    kolomBruto: 'Bruto',
    kolomKorting: 'Korting',
    kolomNetto: 'Netto',
    zoekenChip: (s) => `Zoeken: "${s}"`,
    kwLabel: (v) => `${v} kW`,
    poligLabel: (v) => `${v}-polig`,
  },
  en: {
    langNaam: 'English',
    taalLabel: 'Language',
    klanten: 'Customers',
    upload: 'Upload',
    hoofdportaal: '← Main portal',
    uitloggen: 'Log out',
    testBanner: 'You are in the test environment — changes here will only appear on the main page once they are moved over',
    konNietLaden: 'Could not load stock: ',
    zoekPlaceholder: 'Search by article code or description...',
    filterVermogen: 'Power',
    filterBouwgrootte: 'Frame size',
    filterPolen: 'Poles',
    filterBouwvorm: 'Mounting',
    filterVolt: 'Voltage',
    filterIeKlasse: 'IE class',
    filterMateriaal: 'Material',
    alle: 'All',
    geselecteerd: 'selected',
    alleenOpVoorraad: 'In stock only',
    alleenFlenzen: 'Flanges only',
    wisFilters: 'Clear filters',
    allesWissen: 'Clear all',
    artikelenGevonden: 'items found',
    naamplaatInfo: (prijs) => `Motor price includes nameplate ${prijs}`,
    geenArtikelen: 'No items found with these filters.',
    kolomArtikelcode: 'Article code',
    kolomOmschrijving: 'Description',
    kolomVrijeVoorraad: 'Stock',
    kolomInkomend: 'Incoming',
    kolomBruto: 'Gross',
    kolomKorting: 'Discount',
    kolomNetto: 'Net',
    zoekenChip: (s) => `Search: "${s}"`,
    kwLabel: (v) => `${v} kW`,
    poligLabel: (v) => `${v} poles`,
  },
  fr: {
    langNaam: 'Français',
    taalLabel: 'Langue',
    klanten: 'Clients',
    upload: 'Upload',
    hoofdportaal: '← Portail principal',
    uitloggen: 'Déconnexion',
    testBanner: "Vous êtes dans l'environnement de test — les modifications ici n'apparaîtront sur la page principale qu'une fois transférées",
    konNietLaden: 'Impossible de charger le stock : ',
    zoekPlaceholder: 'Rechercher par code article ou description...',
    filterVermogen: 'Puissance',
    filterBouwgrootte: 'Taille de carcasse',
    filterPolen: 'Pôles',
    filterBouwvorm: 'Montage',
    filterVolt: 'Tension',
    filterIeKlasse: 'Classe IE',
    filterMateriaal: 'Matériau',
    alle: 'Tous',
    geselecteerd: 'sélectionné(s)',
    alleenOpVoorraad: 'En stock uniquement',
    alleenFlenzen: 'Brides uniquement',
    wisFilters: 'Effacer les filtres',
    allesWissen: 'Tout effacer',
    artikelenGevonden: 'articles trouvés',
    naamplaatInfo: (prijs) => `Le prix du moteur inclut la plaque signalétique ${prijs}`,
    geenArtikelen: 'Aucun article trouvé avec ces filtres.',
    kolomArtikelcode: 'Code article',
    kolomOmschrijving: 'Description',
    kolomVrijeVoorraad: 'Stock',
    kolomInkomend: 'Entrant',
    kolomBruto: 'Brut',
    kolomKorting: 'Remise',
    kolomNetto: 'Net',
    zoekenChip: (s) => `Recherche : "${s}"`,
    kwLabel: (v) => `${v} kW`,
    poligLabel: (v) => `${v} pôles`,
  },
};

export default function VoorraadAppTest({ initialProducts, loadError, odooNotice, userEmail, isAdmin, toontPrijzen, naamplaatActief, naamplaatPrijs }) {
  const router = useRouter();
  const [lang, setLang] = useState('nl');
  const t = TRANSLATIONS[lang];
  const [search, setSearch] = useState('');
  const [fBouw, setFBouw] = useState([]);
  const [fPolen, setFPolen] = useState([]);
  const [fBvorm, setFBvorm] = useState([]);
  const [fVermogen, setFVermogen] = useState([]);
  const [fVolt, setFVolt] = useState([]);
  const [fIe, setFIe] = useState([]);
  const [fMateriaal, setFMateriaal] = useState([]);
  const [onlyStock, setOnlyStock] = useState(false);
  const [onlyFlens, setOnlyFlens] = useState(false);

  const products = useMemo(
    () => [...initialProducts].sort((a, b) => prefixPrioriteit(a.code) - prefixPrioriteit(b.code)),
    [initialProducts]
  );

  function matchingExcept(except) {
    return products.filter((p) => {
      if (except !== 'search' && search) {
        const s = search.trim().toLowerCase();
        if (s && !((p.code || '').toLowerCase().includes(s) || (p.omschrijving || '').toLowerCase().includes(s))) return false;
      }
      if (except !== 'bouwgrootte' && fBouw.length > 0 && !fBouw.includes(p.bouwgrootte)) return false;
      if (except !== 'polen' && fPolen.length > 0 && !fPolen.includes(p.polen)) return false;
      if (except !== 'bouwvorm' && fBvorm.length > 0 && !fBvorm.includes(p.bouwvorm)) return false;
      if (except !== 'vermogen' && fVermogen.length > 0 && !fVermogen.includes(p.vermogen)) return false;
      if (except !== 'volt' && fVolt.length > 0 && !fVolt.includes(p.volt)) return false;
      if (except !== 'ie_klasse' && fIe.length > 0 && !fIe.includes(p.ie_klasse)) return false;
      if (except !== 'materiaal' && fMateriaal.length > 0 && !fMateriaal.includes(p.materiaal)) return false;
      if (onlyStock && !(p.vrije_voorraad > 0)) return false;
      if (onlyFlens && !isFlens(p)) return false;
      return true;
    });
  }

  const bouwOptions = useMemo(() => sortValues('bouwgrootte', matchingExcept('bouwgrootte').map((p) => p.bouwgrootte)),
    [products, search, fPolen, fBvorm, fVermogen, fVolt, fIe, fMateriaal, onlyStock, onlyFlens]);
  const polenOptions = useMemo(() => sortValues('polen', matchingExcept('polen').map((p) => p.polen)),
    [products, search, fBouw, fBvorm, fVermogen, fVolt, fIe, fMateriaal, onlyStock, onlyFlens]);
  const bvormOptions = useMemo(() => sortValues('bouwvorm', matchingExcept('bouwvorm').map((p) => p.bouwvorm)),
    [products, search, fBouw, fPolen, fVermogen, fVolt, fIe, fMateriaal, onlyStock, onlyFlens]);
  const vermogenOptions = useMemo(() => sortValues('vermogen', matchingExcept('vermogen').map((p) => p.vermogen)),
    [products, search, fBouw, fPolen, fBvorm, fVolt, fIe, fMateriaal, onlyStock, onlyFlens]);
  const voltOptions = useMemo(() => sortValues('volt', matchingExcept('volt').map((p) => p.volt)),
    [products, search, fBouw, fPolen, fBvorm, fVermogen, fIe, fMateriaal, onlyStock, onlyFlens]);
  const ieOptions = useMemo(() => sortValues('ie_klasse', matchingExcept('ie_klasse').map((p) => p.ie_klasse)),
    [products, search, fBouw, fPolen, fBvorm, fVermogen, fVolt, fMateriaal, onlyStock, onlyFlens]);
  const materiaalOptions = useMemo(() => sortValues('materiaal', matchingExcept('materiaal').map((p) => p.materiaal)),
    [products, search, fBouw, fPolen, fBvorm, fVermogen, fVolt, fIe, onlyStock, onlyFlens]);

  const filtered = useMemo(() => matchingExcept(null),
    [products, search, fBouw, fPolen, fBvorm, fVermogen, fVolt, fIe, fMateriaal, onlyStock, onlyFlens]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function resetFilters() {
    setSearch(''); setFBouw([]); setFPolen([]); setFBvorm([]);
    setFVermogen([]); setFVolt([]); setFIe([]); setFMateriaal([]);
    setOnlyStock(false); setOnlyFlens(false);
  }

  function chipsFor(values, setter, formatValue, filterLabel) {
    return values.map((v) => ({
      label: `${filterLabel}: ${formatValue(v)}`,
      clear: () => setter((arr) => arr.filter((x) => x !== v)),
    }));
  }

  const actieveFilters = [
    ...(search ? [{ label: t.zoekenChip(search), clear: () => setSearch('') }] : []),
    ...chipsFor(fVermogen, setFVermogen, t.kwLabel, t.filterVermogen),
    ...chipsFor(fBouw, setFBouw, (v) => v, t.filterBouwgrootte),
    ...chipsFor(fPolen, setFPolen, t.poligLabel, t.filterPolen),
    ...chipsFor(fBvorm, setFBvorm, (v) => v, t.filterBouwvorm),
    ...chipsFor(fVolt, setFVolt, (v) => v, t.filterVolt),
    ...chipsFor(fIe, setFIe, (v) => v, t.filterIeKlasse),
    ...chipsFor(fMateriaal, setFMateriaal, (v) => fmtMateriaal(v, lang), t.filterMateriaal),
    ...(onlyStock ? [{ label: t.alleenOpVoorraad, clear: () => setOnlyStock(false) }] : []),
    ...(onlyFlens ? [{ label: t.alleenFlenzen, clear: () => setOnlyFlens(false) }] : []),
  ];

  return (
    <div className="wrap wrap-breed">
      <header>
        <div className="brand">
          <img src={LOGO_DATA_URI} alt="Electramo" style={{ height: 44, width: 'auto', display: 'block' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="lang-switch" role="group" aria-label={t.taalLabel}>
            {['nl', 'en', 'fr'].map((code) => (
              <button
                key={code}
                type="button"
                className={code === lang ? 'active' : ''}
                onClick={() => setLang(code)}
                aria-pressed={code === lang}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: 'var(--steel)' }}>{userEmail}</span>
          {isAdmin && (
            <>
              <a href="/test/admin/klanten" className="btn">{t.klanten}</a>
              <a href="/test/admin" className="btn">{t.upload}</a>
              <a href="/" className="btn">{t.hoofdportaal}</a>
            </>
          )}
          <button className="btn" onClick={handleLogout}>{t.uitloggen}</button>
        </div>
      </header>

      <div className="test-banner">
        {t.testBanner}
      </div>

      {loadError && (
        <div className="panel error">{t.konNietLaden}{loadError}</div>
      )}
      {odooNotice && (
        <div className="panel" style={{ borderColor: '#f0c36d', background: '#fbf3de', color: '#8a6d1f', fontSize: 13 }}>
          {odooNotice}
        </div>
      )}

      <div className="panel">
        <input
          type="text"
          placeholder={t.zoekPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 14 }}
        />
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <FilterMultiSelect
            label={t.filterVermogen}
            options={vermogenOptions}
            selected={fVermogen}
            onToggle={(o) => setFVermogen((arr) => toggleWaarde(arr, o))}
            formatOption={t.kwLabel}
            allLabel={t.alle}
            selectedLabel={t.geselecteerd}
          />
          <FilterMultiSelect
            label={t.filterBouwgrootte}
            options={bouwOptions}
            selected={fBouw}
            onToggle={(o) => setFBouw((arr) => toggleWaarde(arr, o))}
            formatOption={(o) => o}
            allLabel={t.alle}
            selectedLabel={t.geselecteerd}
          />
          <FilterMultiSelect
            label={t.filterPolen}
            options={polenOptions}
            selected={fPolen}
            onToggle={(o) => setFPolen((arr) => toggleWaarde(arr, o))}
            formatOption={t.poligLabel}
            allLabel={t.alle}
            selectedLabel={t.geselecteerd}
          />
          <FilterMultiSelect
            label={t.filterBouwvorm}
            options={bvormOptions}
            selected={fBvorm}
            onToggle={(o) => setFBvorm((arr) => toggleWaarde(arr, o))}
            formatOption={(o) => o}
            allLabel={t.alle}
            selectedLabel={t.geselecteerd}
          />
          <FilterMultiSelect
            label={t.filterVolt}
            options={voltOptions}
            selected={fVolt}
            onToggle={(o) => setFVolt((arr) => toggleWaarde(arr, o))}
            formatOption={(o) => o}
            allLabel={t.alle}
            selectedLabel={t.geselecteerd}
          />
          <FilterMultiSelect
            label={t.filterIeKlasse}
            options={ieOptions}
            selected={fIe}
            onToggle={(o) => setFIe((arr) => toggleWaarde(arr, o))}
            formatOption={(o) => o}
            allLabel={t.alle}
            selectedLabel={t.geselecteerd}
          />
          <FilterMultiSelect
            label={t.filterMateriaal}
            options={materiaalOptions}
            selected={fMateriaal}
            onToggle={(o) => setFMateriaal((arr) => toggleWaarde(arr, o))}
            formatOption={(o) => fmtMateriaal(o, lang)}
            allLabel={t.alle}
            selectedLabel={t.geselecteerd}
          />
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox" id="onlyStock" checked={onlyStock}
              onChange={(e) => setOnlyStock(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            <label htmlFor="onlyStock" style={{ textTransform: 'none', fontWeight: 600 }}>{t.alleenOpVoorraad}</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox" id="onlyFlens" checked={onlyFlens}
              onChange={(e) => setOnlyFlens(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            <label htmlFor="onlyFlens" style={{ textTransform: 'none', fontWeight: 600 }}>{t.alleenFlenzen}</label>
          </div>
          <button className="btn" onClick={resetFilters}>
            {t.wisFilters}
          </button>
        </div>
      </div>

      {actieveFilters.length > 0 && (
        <div className="chips">
          {actieveFilters.map((f, i) => (
            <button key={i} type="button" className="chip" onClick={f.clear}>
              {f.label} <span className="chip-x">&times;</span>
            </button>
          ))}
          <button type="button" className="chip chip-clear-all" onClick={resetFilters}>
            {t.allesWissen}
          </button>
        </div>
      )}

      <div style={{ marginBottom: 10, fontSize: 13, color: 'var(--steel)' }}>
        <b style={{ color: 'var(--ink)' }}>{filtered.length}</b> {t.artikelenGevonden}
      </div>
      {toontPrijzen && naamplaatActief && naamplaatPrijs !== null && naamplaatPrijs !== undefined && (
        <div style={{ marginBottom: 10, fontSize: 13, color: 'var(--steel)' }}>
          {t.naamplaatInfo(fmtPrijs(naamplaatPrijs))}
        </div>
      )}

      <div className="panel tablewrap">
        <table>
          <colgroup>
            <col style={{ width: toontPrijzen ? '11%' : '12%' }} />
            <col style={{ width: toontPrijzen ? '10%' : '18%' }} />
            <col style={{ width: toontPrijzen ? '7%' : '8%' }} />
            <col style={{ width: toontPrijzen ? '7%' : '8%' }} />
            <col style={{ width: toontPrijzen ? '6%' : '7%' }} />
            <col style={{ width: toontPrijzen ? '7%' : '8%' }} />
            <col style={{ width: toontPrijzen ? '7%' : '8%' }} />
            <col style={{ width: toontPrijzen ? '6%' : '7%' }} />
            <col style={{ width: toontPrijzen ? '7%' : '8%' }} />
            <col style={{ width: toontPrijzen ? '6%' : '9%' }} />
            <col style={{ width: toontPrijzen ? '6%' : '7%' }} />
            {toontPrijzen && <col style={{ width: '7%' }} />}
            {toontPrijzen && <col style={{ width: '6%' }} />}
            {toontPrijzen && <col style={{ width: '7%' }} />}
          </colgroup>
          <thead>
            <tr>
              <th>{t.kolomArtikelcode}</th>
              <th>{t.kolomOmschrijving}</th>
              <th>{t.filterVermogen}</th>
              <th>{t.filterBouwgrootte}</th>
              <th>{t.filterPolen}</th>
              <th>{t.filterBouwvorm}</th>
              <th>{t.filterVolt}</th>
              <th>{t.filterIeKlasse}</th>
              <th>{t.filterMateriaal}</th>
              <th style={{ textAlign: 'right' }}>{t.kolomVrijeVoorraad}</th>
              <th style={{ textAlign: 'right' }}>{t.kolomInkomend}</th>
              {toontPrijzen && <th style={{ textAlign: 'right' }}>{t.kolomBruto}</th>}
              {toontPrijzen && <th style={{ textAlign: 'right' }}>{t.kolomKorting}</th>}
              {toontPrijzen && <th style={{ textAlign: 'right' }}>{t.kolomNetto}</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.code}>
                <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{p.code}</td>
                <td>{p.omschrijving || '—'}</td>
                <td>{p.vermogen ? t.kwLabel(p.vermogen) : '—'}</td>
                <td>{p.bouwgrootte || '—'}</td>
                <td>{p.polen ? t.poligLabel(p.polen) : '—'}</td>
                <td>{p.bouwvorm || '—'}</td>
                <td>{p.volt || '—'}</td>
                <td>{p.ie_klasse || '—'}</td>
                <td>{fmtMateriaal(p.materiaal, lang) || '—'}</td>
                <td style={{ textAlign: 'right' }}>{stockFlag(p.vrije_voorraad)}</td>
                <td style={{ textAlign: 'right' }}>{p.inkomend}</td>
                {toontPrijzen && <td style={{ textAlign: 'right' }}>{fmtPrijs(p.prijs_bruto)}</td>}
                {toontPrijzen && <td style={{ textAlign: 'right', color: 'var(--steel)' }}>{fmtKorting(p.korting_percentage)}</td>}
                {toontPrijzen && <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtPrijs(p.prijs_netto)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--steel-light)' }}>
            {t.geenArtikelen}
          </div>
        )}
      </div>
    </div>
  );
}
