'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabaseClient';

function stockFlag(v) {
  if (v === 0) return <span className="flag flag-zero">0</span>;
  if (v > 0 && v <= 3) return <span className="flag flag-low">{v}</span>;
  if (v > 0) return <span className="flag flag-ok">{v}</span>;
  return <span className="flag flag-zero">{v}</span>;
}

function uniqSorted(arr) {
  return [...new Set(arr.filter((v) => v !== null && v !== undefined && v !== ''))].sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { numeric: true })
  );
}

export default function VoorraadApp({ initialProducts, loadError, userEmail, isAdmin }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [fBouw, setFBouw] = useState('');
  const [fPolen, setFPolen] = useState('');
  const [fBvorm, setFBvorm] = useState('');
  const [onlyStock, setOnlyStock] = useState(false);

  const products = initialProducts;

  const bouwOptions = useMemo(() => uniqSorted(products.map((p) => p.bouwgrootte)), [products]);
  const polenOptions = useMemo(() => uniqSorted(products.map((p) => p.polen)), [products]);
  const bvormOptions = useMemo(() => uniqSorted(products.map((p) => p.bouwvorm)), [products]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return products.filter((p) => {
      if (s && !((p.code || '').toLowerCase().includes(s) || (p.omschrijving || '').toLowerCase().includes(s))) return false;
      if (fBouw && p.bouwgrootte !== fBouw) return false;
      if (fPolen && p.polen !== fPolen) return false;
      if (fBvorm && p.bouwvorm !== fBvorm) return false;
      if (onlyStock && !(p.vrije_voorraad > 0)) return false;
      return true;
    });
  }, [products, search, fBouw, fPolen, fBvorm, onlyStock]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="wrap">
      <header>
        <div className="brand">
          <div className="title">Electramo<span>portaal</span></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--steel)' }}>{userEmail}</span>
          {isAdmin && (
            <a href="/admin" className="btn">Beheerder</a>
          )}
          <button className="btn" onClick={handleLogout}>Uitloggen</button>
        </div>
      </header>

      {loadError && (
        <div className="panel error">Kon de voorraad niet laden: {loadError}</div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox" id="onlyStock" checked={onlyStock}
              onChange={(e) => setOnlyStock(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            <label htmlFor="onlyStock" style={{ textTransform: 'none', fontWeight: 600 }}>Alleen op voorraad</label>
          </div>
          <button className="btn" onClick={() => { setSearch(''); setFBouw(''); setFPolen(''); setFBvorm(''); setOnlyStock(false); }}>
            Wis filters
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 10, fontSize: 13, color: 'var(--steel)' }}>
        <b style={{ color: 'var(--ink)' }}>{filtered.length}</b> artikelen gevonden
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'auto', maxHeight: '70vh' }}>
        <table>
          <thead>
            <tr>
              <th>Artikelcode</th>
              <th>Omschrijving</th>
              <th>Bouwgrootte</th>
              <th>Vermogen</th>
              <th>Polen</th>
              <th>Bouwvorm</th>
              <th>Volt</th>
              <th style={{ textAlign: 'right' }}>Vrije voorraad</th>
              <th style={{ textAlign: 'right' }}>Inkomend</th>
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
                <td style={{ textAlign: 'right' }}>{stockFlag(p.vrije_voorraad)}</td>
                <td style={{ textAlign: 'right' }}>{p.inkomend}</td>
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
