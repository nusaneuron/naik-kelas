'use client';

import { useEffect, useState } from 'react';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export default function Page() {
  const [status, setStatus] = useState('Checking backend...');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${apiBase}/health`)
      .then((r) => r.json())
      .then((d) => setStatus(`Backend: ${d.status}`))
      .catch(() => setStatus('Backend: unreachable'));

    fetch(`${apiBase}/participants`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setError('Gagal memuat data peserta'));
  }, []);

  return (
    <main style={{ maxWidth: 920, margin: '40px auto', padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Naik Kelas</h1>
      <p style={{ marginTop: 0, color: '#93a4c2' }}>List peserta dari bot pendaftaran Naik Kelas.</p>
      <p><b>{status}</b></p>

      {error ? <p style={{ color: '#fca5a5' }}>{error}</p> : null}

      <div style={{ overflowX: 'auto', background: '#101a2f', border: '1px solid #22304d', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
          <thead>
            <tr style={{ background: '#16233d' }}>
              <th style={th}>ID</th>
              <th style={th}>Nama</th>
              <th style={th}>No. HP</th>
              <th style={th}>Sumber</th>
              <th style={th}>Tanggal Daftar</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td style={td}>{p.id}</td>
                <td style={td}>{p.name}</td>
                <td style={td}>{p.phone}</td>
                <td style={td}>{p.source}</td>
                <td style={td}>{new Date(p.joinedAt).toLocaleString('id-ID')}</td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td style={td} colSpan={5}>Belum ada peserta.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const th = { textAlign: 'left', padding: '12px 14px', fontSize: 14, borderBottom: '1px solid #22304d' };
const td = { padding: '12px 14px', fontSize: 14, borderBottom: '1px solid #1a2742', color: '#d7e1f2' };
