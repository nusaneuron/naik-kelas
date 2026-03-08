'use client';

import { useEffect, useState } from 'react';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export default function Page() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [history, setHistory] = useState({ quiz: [], tryout: [] });
  const [leaderboard, setLeaderboard] = useState([]);

  async function fetchMe() {
    const res = await fetch(`${apiBase}/auth/me`, { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  }

  async function loadPortal() {
    const [hRes, lRes] = await Promise.all([
      fetch(`${apiBase}/participant/history`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/leaderboard`, { credentials: 'include' })
    ]);

    if (hRes.ok) setHistory(await hRes.json());
    if (lRes.ok) {
      const d = await lRes.json();
      setLeaderboard(d.items || []);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const u = await fetchMe();
        setMe(u);
        if (u) await loadPortal();
      } catch {
        setErr('Gagal memuat data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(e) {
    e.preventDefault();
    setErr('');
    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone, password })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(d.error || 'Login gagal');
      return;
    }
    const u = await fetchMe();
    setMe(u);
    await loadPortal();
  }

  async function logout() {
    await fetch(`${apiBase}/auth/logout`, { method: 'POST', credentials: 'include' });
    setMe(null);
    setHistory({ quiz: [], tryout: [] });
    setLeaderboard([]);
  }

  if (loading) return <main style={wrap}><p>Loading...</p></main>;

  if (!me) {
    return (
      <main style={wrap}>
        <form onSubmit={login} style={card}>
          <h1 style={{ marginTop: 0 }}>Naik Kelas Login</h1>
          <p style={{ color: '#94a3b8' }}>Masuk dengan nomor telepon</p>
          <label>No. HP</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} style={input} placeholder="0812xxxx" />
          <label style={{ marginTop: 10 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} />
          {err ? <p style={{ color: '#fca5a5' }}>{err}</p> : null}
          <button style={btn} type="submit">Login</button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ ...wrap, alignItems: 'start' }}>
      <div style={{ maxWidth: 980, width: '100%', margin: '24px auto', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0 }}>Participant Portal</h1>
            <p style={{ color: '#94a3b8' }}>{me.phone} · role: {me.role}</p>
          </div>
          <button onClick={logout} style={btn}>Logout</button>
        </div>

        {me.must_change_password ? (
          <p style={{ color: '#facc15' }}>⚠️ Kamu masih menggunakan password default. Segera ganti via endpoint /auth/change-password.</p>
        ) : null}

        <section style={card2}>
          <h2>Profil</h2>
          <p><b>Nama:</b> {me.name || '-'}</p>
          <p><b>Email:</b> {me.email || '-'}</p>
          <p><b>Sumber:</b> {me.source || '-'}</p>
        </section>

        <section style={card2}>
          <h2>Leaderbot Tryout</h2>
          <ol>
            {leaderboard.map((it) => (
              <li key={`${it.rank}-${it.name}`}>{it.name} ({it.telegram}) — {it.best_seconds}s (perfect: {it.perfect_count}x)</li>
            ))}
            {!leaderboard.length ? <li>Belum ada data.</li> : null}
          </ol>
        </section>

        <section style={card2}>
          <h2>Riwayat Quiz</h2>
          <ul>
            {(history.quiz || []).map((q, i) => (
              <li key={i}>{q.category} · attempt #{q.attempt_no} · wrong {q.wrong_count}/{q.total_questions} · {q.all_correct ? 'LULUS' : 'BELUM'} </li>
            ))}
            {!history.quiz?.length ? <li>Belum ada riwayat quiz.</li> : null}
          </ul>
        </section>

        <section style={card2}>
          <h2>Riwayat Tryout</h2>
          <ul>
            {(history.tryout || []).map((t, i) => (
              <li key={i}>{t.correct_count}/{t.total_questions} · {t.duration_seconds}s · speed {Number(t.speed_qpm || 0).toFixed(2)} qpm · {t.all_correct ? 'PERFECT' : 'BELUM'}</li>
            ))}
            {!history.tryout?.length ? <li>Belum ada riwayat tryout.</li> : null}
          </ul>
        </section>
      </div>
    </main>
  );
}

const wrap = { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 };
const card = { width: '100%', maxWidth: 420, border: '1px solid #334155', borderRadius: 12, padding: 20, background: '#0f172a' };
const card2 = { border: '1px solid #334155', borderRadius: 12, padding: 16, background: '#0f172a', marginTop: 16 };
const input = { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#111827', color: 'white' };
const btn = { border: '1px solid #374151', background: '#111827', color: 'white', borderRadius: 10, padding: '8px 14px', cursor: 'pointer' };
