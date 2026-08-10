'use client';

import { useEffect, useState } from 'react';
import { CATEGORIEEN } from '../lib/categorieen';

const LEEG_FORM = {
  id: null,
  email: '',
  naam: '',
  prijslijst: '2025',
  kortingen: {},
};

export default function KlantenBeheer() {
  const [klanten, setKlanten] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(LEEG_FORM);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [busy, setBusy] = useState(false);

  async function laadKlanten() {
    setLoading(true);
    try {
      const res = await fetch('/api/klanten');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kon klanten niet laden.');
      setKlanten(data.klanten);
    } catch (err) {
      setStatusType('err');
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { laadKlanten(); }, []);

  function bewerkKlant(klant) {
    setForm({
      id: klant.id,
      email: klant.email,
      naam: klant.naam || '',
      prijslijst: klant.prijslijst,
      kortingen: { ...klant.kortingen },
    });
    setStatus('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function nieuweKlant() {
    setForm(LEEG_FORM);
    setStatus('');
  }

  async function verwijderKlant(klant) {
    if (!confirm(`Weet je zeker dat je ${klant.email} wilt verwijderen?`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/klanten', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: klant.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verwijderen mislukt.');
      await laadKlanten();
      if (form.id === klant.id) nieuweKlant();
    } catch (err) {
      setStatusType('err');
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  function updateKorting(categorie, waarde) {
    setForm((f) => ({
      ...f,
      kortingen: { ...f.kortingen, [categorie]: waarde },
    }));
  }

  async function opslaan(e) {
    e.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const res = await fetch('/api/klanten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          naam: form.naam,
          prijslijst: form.prijslijst,
          kortingen: form.kortingen,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Opslaan mislukt.');
      setStatusType('ok');
      setStatus(`Klant ${form.email} is opgeslagen.`);
      nieuweKlant();
      await laadKlanten();
    } catch (err) {
      setStatusType('err');
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{form.id ? `Klant bewerken: ${form.email}` : 'Nieuwe klant toevoegen'}</h2>
        <form onSubmit={opslaan}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ flex: '1 1 260px' }}>
              <label>E-mailadres (inlog)</label>
              <input
                type="email" required value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={!!form.id}
                placeholder="klant@bedrijf.nl"
              />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label>Naam (optioneel)</label>
              <input
                type="text" value={form.naam}
                onChange={(e) => setForm((f) => ({ ...f, naam: e.target.value }))}
                placeholder="Klant BV"
              />
            </div>
            <div style={{ flex: '0 0 140px' }}>
              <label>Prijslijst</label>
              <select
                value={form.prijslijst}
                onChange={(e) => setForm((f) => ({ ...f, prijslijst: e.target.value }))}
              >
                <option value="2023">2023</option>
                <option value="2025">2025</option>
              </select>
            </div>
          </div>

          <label style={{ display: 'block', marginBottom: 10 }}>Korting per categorie (%)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
            {CATEGORIEEN.map((c) => (
              <div key={c.key}>
                <label style={{ fontWeight: 400, textTransform: 'none', fontSize: 12.5 }}>{c.label}</label>
                <input
                  type="number" min="0" max="100" step="0.1"
                  value={form.kortingen[c.key] ?? ''}
                  onChange={(e) => updateKorting(c.key, e.target.value)}
                  placeholder="leeg = geen prijs"
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="submit" className="btn accent" disabled={busy}>
              {busy ? 'Bezig...' : (form.id ? 'Wijzigingen opslaan' : 'Klant toevoegen')}
            </button>
            {form.id && (
              <button type="button" className="btn" onClick={nieuweKlant} disabled={busy}>
                Annuleren
              </button>
            )}
          </div>
          {status && (
            <div className={statusType === 'err' ? 'error' : 'ok-msg'} style={{ marginTop: 10 }}>
              {status}
            </div>
          )}
        </form>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Bestaande klanten ({klanten.length})</h2>
        {loading ? (
          <p>Laden...</p>
        ) : klanten.length === 0 ? (
          <p style={{ color: 'var(--steel-light)' }}>Nog geen klanten toegevoegd.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>E-mailadres</th>
                <th>Naam</th>
                <th>Prijslijst</th>
                <th>Categorieën met korting</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {klanten.map((k) => (
                <tr key={k.id}>
                  <td>{k.email}</td>
                  <td>{k.naam || '—'}</td>
                  <td>{k.prijslijst}</td>
                  <td>{Object.keys(k.kortingen).length} / {CATEGORIEEN.length}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="btn" onClick={() => bewerkKlant(k)} style={{ marginRight: 6 }}>
                      Bewerken
                    </button>
                    <button type="button" className="btn" onClick={() => verwijderKlant(k)} style={{ background: '#b3401f' }}>
                      Verwijderen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
