'use client';

import { useEffect, useState } from 'react';
import { CATEGORIEEN } from '../lib/categorieen';

const LEEG_FORM = {
  id: null,
  email: '',
  naam: '',
  prijslijst: '2025',
  kortingen: {},
  naamplaatActief: false,
  naamplaatPrijs: '',
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
      naamplaatActief: !!klant.naamplaat_actief,
      naamplaatPrijs: klant.naamplaat_prijs ?? '',
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
          naamplaat_actief: form.naamplaatActief,
          naamplaat_prijs: form.naamplaatActief ? form.naamplaatPrijs : null,
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

          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6 }}>
                <input
                  type="checkbox"
                  checked={form.naamplaatActief}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((f) => ({
                      ...f,
                      naamplaatActief: checked,
                      naamplaatPrijs: checked ? f.naamplaatPrijs : '',
                    }));
                  }}
                  style={{ marginRight: 6 }}
                />
                Naamplaat
