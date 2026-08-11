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

export default function VoorraadApp({ initialProducts, loadError, odooNotice, userEmail, isAdmin, toontPrijzen }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [fBouw, setFBouw] = useState('');
  const [fPolen, setFPolen] = useState('');
  const [fBvorm, setFBvorm] = useState('');
  const [fVermogen, setFVermogen] = useState('');
  const [fVolt, setFVolt] = useState('');
  const [fIe, setFIe] = useState('');
  const [fMateriaal, setFMateriaal] = useState('');
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
      if (except !== 'bouwgrootte' && fBouw && p.bouwgrootte !== fBouw) return false;
      if (except !== 'polen' && fPolen && p.polen !== fPolen) return false;
      if (except !== 'bouwvorm' && fBvorm && p.bouwvorm !== fBvorm) return false;
      if (except !== 'vermogen' && fVermogen && p.vermogen !== fVermogen) return false;
      if (except !== 'volt' && fVolt && p.volt !== fVolt) return false;
      if (except !== 'ie_klasse' && fIe && p.ie_klasse !== fIe) return false;
      if (except !== 'materiaal' && fMateriaal && p.materiaal !== fMateriaal) return false;
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
    setSearch(''); setFBouw(''); setFPolen(''); setFBvorm('');
    setFVermogen(''); setFVolt(''); setFIe(''); setFMateriaal('');
    setOnlyStock(false); setOnlyFlens(false);
  }

  const actieveFilters = [
    search && { label: `Zoeken: "${search}"`, clear: () => setSearch('') },
    fBouw && { label: `Bouwgrootte: ${fBouw}`, clear: () => setFBouw('') },
    fVermogen && { label: `Vermogen: ${fVermogen} kW`, clear: () => setFVermogen('') },
    fPolen && { label: `Polen: ${fPolen}-polig`, clear: () => setFPolen('') },
    fBvorm && { label: `Bouwvorm: ${fBvorm}`, clear: () => setFBvorm('') },
    fVolt && { label: `Volt: ${fVolt}`, clear: () => setFVolt('') },
    fIe && { label: `IE klasse: ${fIe}`, clear: () => setFIe('') },
    fMateriaal && { label: `Materiaal: ${fMateriaal}`, clear: () => setFMateriaal('') },
    onlyStock && { label: 'Alleen op voorraad', clear: () => setOnlyStock(false) },
    onlyFlens && { label: 'Alleen flenzen', clear: () => setOnlyFlens(false) },
  ].filter(Boolean);

  return (
    <div className="wrap wrap-breed">
      <header>
        <div className="brand">
          <img src={LOGO_DATA_URI} alt="Electramo" style={{ height: 44, width: 'auto', display: 'block' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--steel)' }}>{userEmail}</span>
          {isAdmin && (
            <a href="/admin" className="btn">Beheerder</a>
          )}
          <button className="btn" onClick={handleLogout}>Uitloggen</button>
        </div>
      </header>

      <div className="panel" style={{ background: '#fffbe6', border: '2px solid #f0c36d', fontSize: 13, fontFamily: 'monospace' }}>
        <b>TIJDELIJK DIAGNOSEPANEEL (mag je straks weer verwijderen)</b><br/>
        Totaal producten (products.length): {products.length}<br/>
        Aantal met categorie === 'flenzen': {products.filter((p) => p.categorie === 'flenzen').length}<br/>
        MSB14B-100 gevonden in products: {products.some((p) => p.code === 'MSB14B-100') ? 'ja' : 'nee'}<br/>
        MSB14B-100 categorie-waarde: "{JSON.stringify(products.find((p) => p.code === 'MSB14B-100')?.categorie)}"<br/>
        onlyFlens staat op: {String(onlyFlens)}<br/>
        Aantal na alle filters (filtered.length): {filtered.length}
      </div>

      {loadError && (
        <div className="panel error">Kon de voorraad niet laden: {loadError}</div>
      )}
      {odooNotice && (
        <div className="panel" style={{ borderColor: '#f0c36d', background: '#fbf3de', color: '#8a6d1f', fontSize: 13 }}>
          {odooNotice}
        </div>
      )}

      <div className="panel">
        <input
          type="text"
          placeholder="Zoek op artikelcode of omschrijving..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 14 }}
        />
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label>Bouwgrootte</label>
            <select value={fBouw} onChange={(e) => setFBouw(e.target.value)}>
              <option value="">Alle</option>
              {bouwOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label>Vermogen</label>
            <select value={fVermogen} onChange={(e) => setFVermogen(e.target.value)}>
              <option value="">Alle</option>
              {vermogenOptions.map((o) => <option key={o} value={o}>{o} kW</option>)}
            </select>
          </div>
          <div>
            <label>Polen</label>
            <select value={fPolen} onChange={(e) => setFPolen(e.target.value)}>
              <option value="">Alle</option>
              {polenOptions.map((o) => <option key={o} value={o}>{o}-polig</option>)}
            </select>
          </div>
          <div>
            <label>Bouwvorm</label>
            <select value={fBvorm} onChange={(e) => setFBvorm(e.target.value)}>
              <option value="">Alle</option>
              {bvormOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label>Volt</label>
            <select value={fVolt} onChange={(e) => setFVolt(e.target.value)}>
              <option value="">Alle</option>
              {voltOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label>IE klasse</label>
            <select value={fIe} onChange={(e) => setFIe(e.target.value)}>
              <option value="">Alle</option>
              {ieOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label>Materiaal</label>
            <select value={fMateriaal} onChange={(e) => setFMateriaal(e.target.value)}>
              <option value="">Alle</option>
              {materiaalOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox" id="onlyStock" checked={onlyStock}
              onChange={(e) => setOnlyStock(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            <label htmlFor="onlyStock" style={{ textTransform: 'none', fontWeight: 600 }}>Alleen op voorraad</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox" id="onlyFlens" checked={onlyFlens}
              onChange={(e) => setOnlyFlens(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            <label htmlFor="onlyFlens" style={{ textTransform: 'none', fontWeight: 600 }}>Alleen flenzen</label>
          </div>
          <button className="btn" onClick={resetFilters}>
            Wis filters
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
            Alles wissen
          </button>
        </div>
      )}

      <div style={{ marginBottom: 10, fontSize: 13, color: 'var(--steel)' }}>
        <b style={{ color: 'var(--ink)' }}>{filtered.length}</b> artikelen gevonden
      </div>

      <div className="panel tablewrap">
        <table>
          <colgroup>
            <col style={{ width: toontPrijzen ? '11%' : '12%' }} />
            <col style={{ width: toontPrijzen ? '13%' : '18%' }} />
            <col style={{ width: toontPrijzen ? '7%' : '8%' }} />
            <col style={{ width: toontPrijzen ? '7%' : '8%' }} />
            <col style={{ width: toontPrijzen ? '6%' : '7%' }} />
            <col style={{ width: toontPrijzen ? '7%' : '8%' }} />
            <col style={{ width: toontPrijzen ? '7%' : '8%' }} />
            <col style={{ width: toontPrijzen ? '6%' : '7%' }} />
            <col style={{ width: toontPrijzen ? '7%' : '8%' }} />
            <col style={{ width: toontPrijzen ? '7%' : '9%' }} />
            <col style={{ width: toontPrijzen ? '6%' : '7%' }} />
            {toontPrijzen && <col style={{ width: '8%' }} />}
            {toontPrijzen && <col style={{ width: '8%' }} />}
          </colgroup>
          <thead>
            <tr>
              <th>Artikelcode</th>
              <th>Omschrijving</th>
              <th>Bouwgrootte</th>
              <th>Vermogen</th>
              <th>Polen</th>
              <th>Bouwvorm</th>
              <th>Volt</th>
              <th>IE klasse</th>
              <th>Materiaal</th>
              <th style={{ textAlign: 'right' }}>Vrije voorraad</th>
              <th style={{ textAlign: 'right' }}>Inkomend</th>
              {toontPrijzen && <th style={{ textAlign: 'right' }}>Bruto</th>}
              {toontPrijzen && <th style={{ textAlign: 'right' }}>Netto</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.code}>
                <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{p.code}</td>
                <td>{p.omschrijving || '—'}</td>
                <td>{p.bouwgrootte || '—'}</td>
                <td>{p.vermogen ? `${p.vermogen} kW` : '—'}</td>
                <td>{p.polen ? `${p.polen}-polig` : '—'}</td>
                <td>{p.bouwvorm || '—'}</td>
                <td>{p.volt || '—'}</td>
                <td>{p.ie_klasse || '—'}</td>
                <td>{p.materiaal || '—'}</td>
                <td style={{ textAlign: 'right' }}>{stockFlag(p.vrije_voorraad)}</td>
                <td style={{ textAlign: 'right' }}>{p.inkomend}</td>
                {toontPrijzen && <td style={{ textAlign: 'right' }}>{fmtPrijs(p.prijs_bruto)}</td>}
                {toontPrijzen && <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtPrijs(p.prijs_netto)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--steel-light)' }}>
            Geen artikelen gevonden met deze filters.
          </div>
        )}
      </div>
    </div>
  );
}
