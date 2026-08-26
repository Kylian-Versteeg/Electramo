'use client';

import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

export default function AdminUpload() {
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [busy, setBusy] = useState(false);
  const [geschiedenis, setGeschiedenis] = useState([]);
  const [loadingGeschiedenis, setLoadingGeschiedenis] = useState(true);

  async function laadGeschiedenis() {
    setLoadingGeschiedenis(true);
    try {
      const res = await fetch('/api/upload');
      const data = await res.json();
      if (res.ok) setGeschiedenis(data.geschiedenis || []);
    } catch {
      // geschiedenis ophalen mag stil falen, is niet kritiek voor de upload zelf
    } finally {
      setLoadingGeschiedenis(false);
    }
  }

  useEffect(() => { laadGeschiedenis(); }, []);

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

      setStatusType('ok');
      setStatus(
        `Bijgewerkt: ${result.updatedCount} van de ${result.totalCodes} artikelen.` +
        (result.ignoredCount > 0 ? ` ${result.ignoredCount} rij(en) genegeerd (code niet in de vaste lijst).` : '')
      );
      await laadGeschiedenis();
    } catch (err) {
      setStatusType('err');
      setStatus(err.message || 'Er is iets misgegaan.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  function fmtDatum(iso) {
    return new Date(iso).toLocaleString('nl-NL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
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

      <h2 style={{ marginTop: 28 }}>Uploadgeschiedenis</h2>
      {loadingGeschiedenis ? (
        <p>Laden...</p>
      ) : geschiedenis.length === 0 ? (
        <p style={{ color: 'var(--steel-light)' }}>Nog geen uploads geregistreerd.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Datum &amp; tijd</th>
              <th>Door</th>
              <th>Bijgewerkt</th>
              <th>Genegeerd</th>
            </tr>
          </thead>
          <tbody>
            {geschiedenis.map((g) => (
              <tr key={g.id}>
                <td>{fmtDatum(g.created_at)}</td>
                <td>{g.user_email}</td>
                <td>{g.updated_count} / {g.total_codes}</td>
                <td>{g.ignored_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
