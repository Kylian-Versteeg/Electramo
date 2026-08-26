'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function AdminUpload() {
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    setStatus('Bezig met inlezen...');
    setStatusType('');

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      const items = rows
        .map((r) => ({
          code: String(r['Schermnaam'] ?? '').trim(),
          vrije_voorraad: Number(r['Vrije voorraad']) || 0,
          inkomend: Number(r['Inkomend']) || 0,
        }))
        .filter((r) => r.code);

      if (items.length === 0) {
        throw new Error('Geen geldige rijen gevonden. Controleer de kolomkoppen (Schermnaam, Vrije voorraad, Inkomend).');
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Upload mislukt.');
      }

      setStatusType(result.ignoredCount > 0 ? 'err' : 'ok');
      setStatus(
        `Bijgewerkt: ${result.updatedCount} van de ${result.totalCodes} artikelen.` +
        (result.ignoredCount > 0
          ? ` ${result.ignoredCount} rij(en) genegeerd (code niet in de vaste lijst): ${result.ignoredCodes.join(', ')}.`
          : '')
      );
    } catch (err) {
      setStatusType('err');
      setStatus(err.message || 'Er is iets misgegaan.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <div className="panel">
      <label htmlFor="fileUpload" className="btn accent" style={{ display: 'inline-block', cursor: 'pointer' }}>
        &#8593; Voorraadbestand uploaden
      </label>
      <input
        id="fileUpload" type="file" accept=".xlsx,.xls" onChange={handleFile}
        disabled={busy} style={{ display: 'none' }}
      />
      {status && (
        <div className={statusType === 'err' ? 'error' : 'ok-msg'} style={{ marginTop: 10 }}>
          {status}
        </div>
      )}
      <p style={{ fontSize: 12.5, color: 'var(--steel-light)', marginTop: 14 }}>
        Upload het dagelijkse voorraadbestand (.xlsx met kolommen Schermnaam, Vrije voorraad, Inkomend).
        Alleen deze twee kolommen worden bijgewerkt voor artikelen die al in de vaste lijst staan —
        er worden nooit nieuwe artikelen toegevoegd.
      </p>
    </div>
  );
}
