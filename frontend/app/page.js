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
  const [profile, setProfile] = useState(null);

  const [participants, setParticipants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const [qCategoryId, setQCategoryId] = useState('');
  const [qText, setQText] = useState('');
  const [qA, setQA] = useState('');
  const [qB, setQB] = useState('');
  const [qC, setQC] = useState('');
  const [qD, setQD] = useState('');
  const [qCorrect, setQCorrect] = useState('A');

  async function fetchMe() {
    const res = await fetch(`${apiBase}/auth/me`, { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  }

  async function loadParticipant() {
    const [mRes, hRes, lRes] = await Promise.all([
      fetch(`${apiBase}/participant/me`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/history`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/leaderboard`, { credentials: 'include' })
    ]);
    if (mRes.ok) setProfile(await mRes.json());
    if (hRes.ok) setHistory(await hRes.json());
    if (lRes.ok) {
      const d = await lRes.json();
      setLeaderboard(d.items || []);
    }
  }

  async function loadAdmin() {
    const [pRes, cRes, qRes] = await Promise.all([
      fetch(`${apiBase}/admin/participants`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/categories`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/questions`, { credentials: 'include' })
    ]);
    if (pRes.ok) setParticipants((await pRes.json()).items || []);
    if (cRes.ok) setCategories((await cRes.json()).items || []);
    if (qRes.ok) setQuestions((await qRes.json()).items || []);
  }

  async function loadPortal(role) {
    await loadParticipant();
    if (role === 'admin') await loadAdmin();
  }

  useEffect(() => {
    (async () => {
      const u = await fetchMe();
      setMe(u);
      if (u) await loadPortal(u.role);
      setLoading(false);
    })();
  }, []);

  async function login(e) {
    e.preventDefault();
    setErr('');
    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ phone, password })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(d.error || 'Login gagal');
    const u = await fetchMe();
    setMe(u);
    await loadPortal(u.role);
  }

  async function logout() {
    await fetch(`${apiBase}/auth/logout`, { method: 'POST', credentials: 'include' });
    setMe(null);
    setProfile(null);
  }

  async function resetPassword(userId) {
    await fetch(`${apiBase}/admin/participants/reset-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ user_id: userId })
    });
    await loadAdmin();
  }

  async function addCategory() {
    await fetch(`${apiBase}/admin/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ action: 'create', code: newCategoryCode, name: newCategoryName })
    });
    setNewCategoryCode(''); setNewCategoryName('');
    await loadAdmin();
  }

  async function addQuestion() {
    await fetch(`${apiBase}/admin/questions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ action: 'create', category_id: Number(qCategoryId), question_text: qText, option_a: qA, option_b: qB, option_c: qC, option_d: qD, correct_option: qCorrect })
    });
    setQText(''); setQA(''); setQB(''); setQC(''); setQD(''); setQCorrect('A');
    await loadAdmin();
  }

  if (loading) return <main style={wrap}><p>Loading...</p></main>;

  if (!me) {
    return <main style={wrap}><form onSubmit={login} style={card}><h1>Naik Kelas Login</h1><p style={{ color: '#94a3b8' }}>Nomor HP + password</p><input style={input} placeholder='No HP' value={phone} onChange={(e)=>setPhone(e.target.value)} /><input style={{...input, marginTop:8}} type='password' placeholder='Password' value={password} onChange={(e)=>setPassword(e.target.value)} />{err?<p style={{color:'#fca5a5'}}>{err}</p>:null}<button style={btn}>Login</button></form></main>;
  }

  return (
    <main style={{ ...wrap, alignItems: 'start' }}>
      <div style={{ maxWidth: 1080, width: '100%', margin: '20px auto', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h1 style={{ margin: 0 }}>Naik Kelas Portal</h1><p style={{ color: '#94a3b8' }}>{me.phone} · role: {me.role}</p></div>
          <button onClick={logout} style={btn}>Logout</button>
        </div>

        {me.must_change_password ? <p style={{ color: '#facc15' }}>⚠️ Password default terdeteksi. Ganti via /auth/change-password.</p> : null}

        <section style={card2}><h2>Profil</h2><p><b>Nama:</b> {profile?.name || '-'}</p><p><b>Email:</b> {profile?.email || '-'}</p><p><b>Sumber:</b> {profile?.source || '-'}</p></section>
        <section style={card2}><h2>Leaderbot Tryout</h2><ol>{leaderboard.map((it)=><li key={it.rank}>{it.name} ({it.telegram}) — {it.best_seconds}s (perfect: {it.perfect_count}x)</li>)}{!leaderboard.length?<li>Belum ada data.</li>:null}</ol></section>
        <section style={card2}><h2>Riwayat Quiz</h2><ul>{(history.quiz||[]).map((q,i)=><li key={i}>{q.category} · attempt #{q.attempt_no} · wrong {q.wrong_count}/{q.total_questions} · {q.all_correct?'LULUS':'BELUM'}</li>)}{!history.quiz?.length?<li>Belum ada riwayat quiz.</li>:null}</ul></section>
        <section style={card2}><h2>Riwayat Tryout</h2><ul>{(history.tryout||[]).map((t,i)=><li key={i}>{t.correct_count}/{t.total_questions} · {t.duration_seconds}s · speed {Number(t.speed_qpm||0).toFixed(2)} qpm · {t.all_correct?'PERFECT':'BELUM'}</li>)}{!history.tryout?.length?<li>Belum ada riwayat tryout.</li>:null}</ul></section>

        {me.role === 'admin' ? (
          <>
            <section style={card2}><h2>Admin · Peserta</h2><ul>{participants.map((p)=><li key={p.id}>{p.name || '-'} · {p.phone} · {p.role} · {p.is_active?'active':'disabled'} <button style={btnMini} onClick={()=>resetPassword(p.id)}>Reset Pass</button></li>)}</ul></section>
            <section style={card2}><h2>Admin · Kategori Soal</h2><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><input style={inputSmall} placeholder='code' value={newCategoryCode} onChange={(e)=>setNewCategoryCode(e.target.value)} /><input style={inputSmall} placeholder='name' value={newCategoryName} onChange={(e)=>setNewCategoryName(e.target.value)} /><button style={btnMini} onClick={addCategory}>Tambah</button></div><ul>{categories.map((c)=><li key={c.id}>{c.code} · {c.name}</li>)}</ul></section>
            <section style={card2}><h2>Admin · Bank Soal</h2><div style={{display:'grid',gap:8}}><select style={input} value={qCategoryId} onChange={(e)=>setQCategoryId(e.target.value)}><option value=''>Pilih kategori</option>{categories.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input style={input} placeholder='Pertanyaan' value={qText} onChange={(e)=>setQText(e.target.value)} /><input style={input} placeholder='Opsi A' value={qA} onChange={(e)=>setQA(e.target.value)} /><input style={input} placeholder='Opsi B' value={qB} onChange={(e)=>setQB(e.target.value)} /><input style={input} placeholder='Opsi C' value={qC} onChange={(e)=>setQC(e.target.value)} /><input style={input} placeholder='Opsi D' value={qD} onChange={(e)=>setQD(e.target.value)} /><select style={input} value={qCorrect} onChange={(e)=>setQCorrect(e.target.value)}><option>A</option><option>B</option><option>C</option><option>D</option></select><button style={btnMini} onClick={addQuestion}>Tambah Soal</button></div><p style={{color:'#94a3b8'}}>Total soal: {questions.length}</p></section>
          </>
        ) : null}
      </div>
    </main>
  );
}

const wrap = { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 };
const card = { width: '100%', maxWidth: 420, border: '1px solid #334155', borderRadius: 12, padding: 20, background: '#0f172a' };
const card2 = { border: '1px solid #334155', borderRadius: 12, padding: 16, background: '#0f172a', marginTop: 16 };
const input = { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#111827', color: 'white' };
const inputSmall = { padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#111827', color: 'white' };
const btn = { border: '1px solid #374151', background: '#111827', color: 'white', borderRadius: 10, padding: '8px 14px', cursor: 'pointer' };
const btnMini = { border: '1px solid #374151', background: '#1f2937', color: 'white', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' };
