'use client';

import { useEffect, useState } from 'react';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export default function Page() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [actionType, setActionType] = useState('success');
  const [busy, setBusy] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState('participant');
  const [adminSection, setAdminSection] = useState('peserta');

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [history, setHistory] = useState({ quiz: [], tryout: [] });
  const [leaderboard, setLeaderboard] = useState([]);
  const [profile, setProfile] = useState(null);
  const [myReminder, setMyReminder] = useState(null);
  const [myPoints, setMyPoints] = useState(0);
  const [myPointHistory, setMyPointHistory] = useState([]);

  const [participants, setParticipants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [adminReminders, setAdminReminders] = useState([]);
  const [adminPointHistory, setAdminPointHistory] = useState([]);
  const [pointPhone, setPointPhone] = useState('');
  const [pointDelta, setPointDelta] = useState('');
  const [pointReason, setPointReason] = useState('');

  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState('');

  const [qCategoryId, setQCategoryId] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState('');
  const [questionFilterCategoryId, setQuestionFilterCategoryId] = useState('');
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
    const [mRes, hRes, lRes, rRes, pRes, phRes] = await Promise.all([
      fetch(`${apiBase}/participant/me`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/history`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/leaderboard`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/reminder`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/points`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/points/history`, { credentials: 'include' })
    ]);
    if (mRes.ok) setProfile(await mRes.json());
    if (hRes.ok) setHistory(await hRes.json());
    if (lRes.ok) {
      const d = await lRes.json();
      setLeaderboard(d.items || []);
    }
    if (rRes.ok) setMyReminder(await rRes.json());
    if (pRes.ok) setMyPoints((await pRes.json()).balance || 0);
    if (phRes.ok) setMyPointHistory((await phRes.json()).items || []);
  }

  async function loadAdmin() {
    const [pRes, cRes, qRes, rRes, phRes] = await Promise.all([
      fetch(`${apiBase}/admin/participants`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/categories`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/questions`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/reminders`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/points/history`, { credentials: 'include' })
    ]);
    if (pRes.ok) setParticipants((await pRes.json()).items || []);
    if (cRes.ok) setCategories((await cRes.json()).items || []);
    if (qRes.ok) setQuestions((await qRes.json()).items || []);
    if (rRes.ok) setAdminReminders((await rRes.json()).items || []);
    if (phRes.ok) setAdminPointHistory((await phRes.json()).items || []);
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
    setBusy(true); setActionMsg('');
    await fetch(`${apiBase}/admin/participants/reset-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ user_id: userId })
    });
    await loadAdmin();
    setActionType('success'); setActionMsg('Password peserta berhasil direset.');
    setBusy(false);
  }

  async function toggleRole(p) {
    setBusy(true); setActionMsg('');
    const nextRole = p.role === 'admin' ? 'participant' : 'admin';
    await fetch(`${apiBase}/admin/participants/set-role`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ user_id: p.id, role: nextRole })
    });
    await loadAdmin();
    setActionType('success'); setActionMsg(`Role ${p.phone} diubah ke ${nextRole}.`);
    setBusy(false);
  }

  async function toggleActive(p) {
    setBusy(true); setActionMsg('');
    await fetch(`${apiBase}/admin/participants/toggle-active`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ user_id: p.id, is_active: !p.is_active })
    });
    await loadAdmin();
    setActionType('success'); setActionMsg(`Status ${p.phone} berhasil diperbarui.`);
    setBusy(false);
  }

  async function deleteParticipant(userId) {
    if (!confirm('Yakin hapus peserta ini?')) return;
    setBusy(true); setActionMsg('');
    const res = await fetch(`${apiBase}/admin/participants/delete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ user_id: userId })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionType('error'); setActionMsg(d.error || 'Gagal menghapus peserta.');
      setBusy(false);
      return;
    }
    await loadAdmin();
    setActionType('success'); setActionMsg('Peserta berhasil dihapus.');
    setBusy(false);
  }

  async function addCategory() {
    setBusy(true); setActionMsg('');
    const isEdit = !!editingCategoryId;
    await fetch(`${apiBase}/admin/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify(isEdit
        ? { action: 'update', id: Number(editingCategoryId), code: newCategoryCode, name: newCategoryName, is_active: true }
        : { action: 'create', code: newCategoryCode, name: newCategoryName })
    });
    setNewCategoryCode(''); setNewCategoryName(''); setEditingCategoryId('');
    await loadAdmin();
    setActionType('success'); setActionMsg(isEdit ? 'Kategori berhasil diupdate.' : 'Kategori berhasil ditambahkan.');
    setBusy(false);
  }

  function startEditCategory(cat) {
    setEditingCategoryId(String(cat.id));
    setNewCategoryCode(cat.code || '');
    setNewCategoryName(cat.name || '');
  }

  async function deleteCategory(catId) {
    setBusy(true); setActionMsg('');
    await fetch(`${apiBase}/admin/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ action: 'delete', id: Number(catId) })
    });
    if (String(editingCategoryId) === String(catId)) {
      setEditingCategoryId(''); setNewCategoryCode(''); setNewCategoryName('');
    }
    await loadAdmin();
    setActionType('success'); setActionMsg('Kategori berhasil dihapus.');
    setBusy(false);
  }

  function startEditQuestion(q) {
    setEditingQuestionId(String(q.id));
    setQCategoryId(String(q.category_id));
    setQText(q.question_text || '');
    setQA(q.option_a || '');
    setQB(q.option_b || '');
    setQC(q.option_c || '');
    setQD(q.option_d || '');
    setQCorrect((q.correct_option || 'A').toUpperCase());
  }

  async function deleteQuestion(qId) {
    setBusy(true); setActionMsg('');
    await fetch(`${apiBase}/admin/questions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ action: 'delete', id: Number(qId) })
    });
    if (String(editingQuestionId) === String(qId)) {
      setEditingQuestionId(''); setQCategoryId(''); setQText(''); setQA(''); setQB(''); setQC(''); setQD(''); setQCorrect('A');
    }
    await loadAdmin();
    setActionType('success'); setActionMsg('Soal berhasil dihapus.');
    setBusy(false);
  }

  async function addQuestion() {
    setBusy(true); setActionMsg('');
    const isEdit = !!editingQuestionId;
    await fetch(`${apiBase}/admin/questions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify(isEdit
        ? { action: 'update', id: Number(editingQuestionId), category_id: Number(qCategoryId), question_text: qText, option_a: qA, option_b: qB, option_c: qC, option_d: qD, correct_option: qCorrect, is_active: true }
        : { action: 'create', category_id: Number(qCategoryId), question_text: qText, option_a: qA, option_b: qB, option_c: qC, option_d: qD, correct_option: qCorrect })
    });
    setQText(''); setQA(''); setQB(''); setQC(''); setQD(''); setQCorrect('A'); setQCategoryId(''); setEditingQuestionId('');
    await loadAdmin();
    setActionType('success'); setActionMsg(isEdit ? 'Soal berhasil diupdate.' : 'Soal berhasil ditambahkan.');
    setBusy(false);
  }

  async function adjustPoints() {
    const normalized = (pointPhone || '').replace(/[^0-9]/g, '');
    const target = participants.find((p) => (p.phone || '').replace(/[^0-9]/g, '') === normalized);
    if (!target) {
      setErr('Nomor telepon peserta tidak ditemukan.');
      setActionType('error'); setActionMsg('Gagal: nomor telepon tidak ditemukan.');
      return;
    }
    setBusy(true); setActionMsg('');
    const res = await fetch(`${apiBase}/admin/points/adjust`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ user_id: Number(target.id), delta: Number(pointDelta), reason: pointReason })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionType('error'); setActionMsg(d.error || 'Gagal update poin.');
      setBusy(false);
      return;
    }
    setPointPhone(''); setPointDelta(''); setPointReason('');
    await loadAdmin();
    await loadParticipant();
    setActionType('success'); setActionMsg('Poin peserta berhasil diperbarui.');
    setBusy(false);
  }

  const matchedParticipant = participants.find((p) => ((p.phone || '').replace(/[^0-9]/g, '') === (pointPhone || '').replace(/[^0-9]/g, '')));
  const filteredQuestions = questionFilterCategoryId
    ? questions.filter((q) => String(q.category_id) === String(questionFilterCategoryId))
    : questions;
  const isAdmin = me?.role === 'admin';
  const showParticipantView = !isAdmin || adminViewMode === 'participant';
  const showAdminView = isAdmin && adminViewMode === 'admin';

  if (loading) return <main style={wrap}><div style={{...card, textAlign:'center'}}><h2 style={{marginTop:0}}>Menyiapkan Portal Naik Kelas...</h2><p className='nk-muted'>Memuat profil, leaderboard, dan riwayat belajar.</p></div></main>;

  if (!me) {
    return <main style={wrap}><form onSubmit={login} style={card}><h1>Naik Kelas Login</h1><p style={{ color: '#94a3b8' }}>Nomor HP + password</p><input style={input} placeholder='No HP' value={phone} onChange={(e)=>setPhone(e.target.value)} /><input style={{...input, marginTop:8}} type='password' placeholder='Password' value={password} onChange={(e)=>setPassword(e.target.value)} />{err?<p style={{color:'#fca5a5'}}>{err}</p>:null}<button style={btn}>Login</button></form></main>;
  }

  return (
    <main style={{ ...wrap, alignItems: 'start' }}>
      <div style={{ maxWidth: 1080, width: '100%', margin: '20px auto', padding: 16 }}>
        <div style={{ ...hero, marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 34, color: 'var(--nk-ink)' }}>Naik Kelas Portal</h1>
            <p style={{ margin: '6px 0 0', color: 'rgba(21,19,19,0.8)' }}>{profile?.name || me.phone} · role: {me.role}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {isAdmin ? (
              <>
                <button onClick={() => setAdminViewMode('participant')} style={{ ...btnMini, background: adminViewMode === 'participant' ? '#111827' : '#374151' }}>Tampilan Peserta</button>
                <button onClick={() => setAdminViewMode('admin')} style={{ ...btnMini, background: adminViewMode === 'admin' ? '#111827' : '#374151' }}>Tampilan Admin</button>
              </>
            ) : null}
            <button onClick={logout} style={btn}>Logout</button>
          </div>
        </div>

        {me.must_change_password ? <p style={{ color: '#facc15' }}>⚠️ Password default terdeteksi. Ganti via /auth/change-password.</p> : null}
        {actionMsg ? <div className={`nk-banner ${actionType}`}>{actionMsg}</div> : null}

        {showParticipantView ? (
          <>
            <div style={summaryGrid}>
              <section style={card2}><h2>Profil</h2><p><b>Nama:</b> {profile?.name || '-'}</p><p><b>Email:</b> {profile?.email || '-'}</p><p><b>Sumber:</b> {profile?.source || '-'}</p></section>
              <section style={card2}><h2>Jadwal Belajar</h2>{myReminder?.active ? <p>Aktif tiap hari jam <b>{myReminder.time_of_day}</b> ({myReminder.timezone})</p> : <p>Belum aktif. Atur lewat bot Nala: <b>/jadwal_belajar</b></p>}</section>
              <section style={card2}><h2>Saldo Poin</h2><p style={{fontSize:30, margin:'8px 0'}}><b>{myPoints}</b> poin 🌟</p><p className='nk-muted'>Total poin yang bisa digunakan saat ini.</p></section>
            </div>

            <section style={card2}><h2>Riwayat Poin</h2><ul>{myPointHistory.slice(0,10).map((p,i)=><li key={i}>{p.delta > 0 ? `+${p.delta}` : p.delta} · {p.reason} · {p.type}</li>)}{!myPointHistory.length?<li>Belum ada transaksi poin.</li>:null}</ul></section>
            <section style={card2}><h2>Leaderbot Tryout</h2><ol>{leaderboard.map((it)=><li key={it.rank}>{it.name} ({it.telegram}) — {it.best_seconds}s (perfect: {it.perfect_count}x)</li>)}{!leaderboard.length?<li>Belum ada data.</li>:null}</ol></section>
            <div style={summaryGrid}>
              <section style={card2}><h2>Riwayat Quiz</h2><ul>{(history.quiz||[]).map((q,i)=><li key={i}>{q.category} · attempt #{q.attempt_no} · wrong {q.wrong_count}/{q.total_questions} · {q.all_correct?'LULUS':'BELUM'}</li>)}{!history.quiz?.length?<li>Belum ada riwayat quiz.</li>:null}</ul></section>
              <section style={card2}><h2>Riwayat Tryout</h2><ul>{(history.tryout||[]).map((t,i)=><li key={i}>{t.correct_count}/{t.total_questions} · {t.duration_seconds}s · speed {Number(t.speed_qpm||0).toFixed(2)} qpm · {t.all_correct?'PERFECT':'BELUM'}</li>)}{!history.tryout?.length?<li>Belum ada riwayat tryout.</li>:null}</ul></section>
            </div>
          </>
        ) : null}

        {showAdminView ? (
          <section style={{ ...card2, padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: 520 }}>
              <aside style={{ background: '#0b0f1a', borderRight: '1px solid #273244', padding: 14 }}>
                <h3 style={{ marginTop: 4, marginBottom: 14 }}>Admin Menu</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  {[
                    ['peserta', 'Peserta'],
                    ['bank', 'Bank Soal'],
                    ['jadwal', 'Jadwal Belajar'],
                    ['poin', 'Poin']
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setAdminSection(key)}
                      style={{
                        ...btnMini,
                        textAlign: 'left',
                        background: adminSection === key ? 'var(--nk-bg-main)' : '#1f2937',
                        color: adminSection === key ? 'var(--nk-ink)' : 'white',
                        fontWeight: 700
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </aside>

              <div style={{ padding: 16 }}>
                {adminSection === 'peserta' ? (
                  <section style={card2}>
                    <h2>Admin · Peserta</h2>
                    {participants.length ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
                          <thead>
                            <tr>
                              <th style={thAdmin}>Nama</th>
                              <th style={thAdmin}>No. HP</th>
                              <th style={thAdmin}>Role</th>
                              <th style={thAdmin}>Status</th>
                              <th style={thAdmin}>Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {participants.map((p) => (
                              <tr key={p.id}>
                                <td style={tdAdmin}>{p.name || '-'}</td>
                                <td style={tdAdmin}>{p.phone}</td>
                                <td style={tdAdmin}><b>{p.role}</b></td>
                                <td style={tdAdmin}>{p.is_active ? 'active' : 'non-active'}</td>
                                <td style={tdAdmin}>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <button style={btnMini} disabled={busy} onClick={() => resetPassword(p.id)}>Reset Pass</button>
                                    <button style={btnMini} disabled={busy} onClick={() => toggleRole(p)}>{p.role === 'admin' ? 'Jadi Participant' : 'Jadi Admin'}</button>
                                    <button style={btnMini} disabled={busy} onClick={() => toggleActive(p)}>{p.is_active ? 'Non Aktifkan' : 'Aktifkan'}</button>
                                    <button style={{ ...btnMini, background: '#7f1d1d', borderColor: '#b91c1c' }} disabled={busy} onClick={() => deleteParticipant(p.id)}>Hapus</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <div className='nk-empty'>Belum ada peserta.</div>}
                  </section>
                ) : null}

                {adminSection === 'bank' ? (
                  <>
                    <section style={card2}><h2>Admin · Kategori Soal</h2><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><input style={inputSmall} placeholder='code' value={newCategoryCode} onChange={(e)=>setNewCategoryCode(e.target.value)} /><input style={inputSmall} placeholder='name' value={newCategoryName} onChange={(e)=>setNewCategoryName(e.target.value)} /><button style={btnMini} disabled={busy} onClick={addCategory}>{busy?'Proses...':(editingCategoryId ? 'Update' : 'Tambah')}</button>{editingCategoryId ? <button style={btnMini} disabled={busy} onClick={() => { setEditingCategoryId(''); setNewCategoryCode(''); setNewCategoryName(''); }}>Batal</button> : null}</div><div style={{display:'grid',gap:10,gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',marginTop:12}}>{categories.map((c)=><div key={c.id} style={{border:'1px solid #334155',borderRadius:'var(--nk-radius-md)',padding:12,background:'#111827'}}><div style={{fontWeight:700}}>{c.name}</div><div className='nk-muted' style={{marginBottom:8}}>{c.code}</div><div style={{display:'flex',gap:8}}><button style={btnMini} disabled={busy} onClick={()=>startEditCategory(c)}>Edit</button><button style={{...btnMini, background:'#7f1d1d', borderColor:'#b91c1c'}} disabled={busy} onClick={()=>deleteCategory(c.id)}>Delete</button></div></div>)}{!categories.length?<div className='nk-empty'>Belum ada kategori.</div>:null}</div></section>
                    <section style={card2}><h2>Admin · Bank Soal</h2><div style={{display:'grid',gap:8}}><label style={fieldLabel}>Kategori Soal</label><select style={input} value={qCategoryId} onChange={(e)=>setQCategoryId(e.target.value)}><option value=''>Pilih kategori</option>{categories.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select><label style={fieldLabel}>Pertanyaan</label><input style={input} placeholder='Masukkan pertanyaan' value={qText} onChange={(e)=>setQText(e.target.value)} /><label style={fieldLabel}>Jawaban A</label><input style={input} placeholder='Isi opsi A' value={qA} onChange={(e)=>setQA(e.target.value)} /><label style={fieldLabel}>Jawaban B</label><input style={input} placeholder='Isi opsi B' value={qB} onChange={(e)=>setQB(e.target.value)} /><label style={fieldLabel}>Jawaban C</label><input style={input} placeholder='Isi opsi C' value={qC} onChange={(e)=>setQC(e.target.value)} /><label style={fieldLabel}>Jawaban D</label><input style={input} placeholder='Isi opsi D' value={qD} onChange={(e)=>setQD(e.target.value)} /><label style={fieldLabel}>Jawaban Benar</label><select style={input} value={qCorrect} onChange={(e)=>setQCorrect(e.target.value)}><option>A</option><option>B</option><option>C</option><option>D</option></select><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button style={btnMini} disabled={busy} onClick={addQuestion}>{busy?'Proses...':(editingQuestionId ? 'Update Soal' : 'Tambah Soal')}</button>{editingQuestionId ? <button style={btnMini} disabled={busy} onClick={() => { setEditingQuestionId(''); setQCategoryId(''); setQText(''); setQA(''); setQB(''); setQC(''); setQD(''); setQCorrect('A'); }}>Batal</button> : null}</div></div><p className='nk-muted'>Total soal: {questions.length}</p><div style={{marginTop:12}}><label style={{display:'block',marginBottom:6}}>Filter daftar soal berdasarkan kategori</label><select style={input} value={questionFilterCategoryId} onChange={(e)=>setQuestionFilterCategoryId(e.target.value)}><option value=''>Semua kategori</option>{categories.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div style={{display:'grid',gap:10,gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',marginTop:10}}>{filteredQuestions.map((q)=><div key={q.id} style={{border:'1px solid #334155',borderRadius:'var(--nk-radius-md)',padding:12,background:'#111827'}}><div style={{fontWeight:700,marginBottom:4}}>{q.category_name}</div><div style={{marginBottom:8}}>{q.question_text}</div><div className='nk-muted' style={{fontSize:13,marginBottom:8}}>A. {q.option_a} | B. {q.option_b} | C. {q.option_c} | D. {q.option_d} | Jawaban: {q.correct_option}</div><div style={{display:'flex',gap:8}}><button style={btnMini} disabled={busy} onClick={()=>startEditQuestion(q)}>Edit</button><button style={{...btnMini, background:'#7f1d1d', borderColor:'#b91c1c'}} disabled={busy} onClick={()=>deleteQuestion(q.id)}>Delete</button></div></div>)}{!filteredQuestions.length?<div className='nk-empty'>Tidak ada soal untuk kategori ini.</div>:null}</div></section>
                  </>
                ) : null}

                {adminSection === 'jadwal' ? (
                  <section style={card2}><h2>Admin · Jadwal Belajar Peserta</h2><ul>{adminReminders.map((r, i)=><li key={i}>{r.name || '-'} ({r.phone || '-'}) · {r.time_of_day} ({r.timezone}) · {r.is_active ? 'aktif' : 'nonaktif'}</li>)}{!adminReminders.length ? <li className='nk-empty'>Belum ada jadwal belajar yang diset.</li> : null}</ul></section>
                ) : null}

                {adminSection === 'poin' ? (
                  <section style={card2}><h2>Admin · Poin Peserta</h2><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><input style={inputSmall} placeholder='nomor telepon peserta' value={pointPhone} onChange={(e)=>setPointPhone(e.target.value)} /><input style={inputSmall} placeholder='delta (+/-)' value={pointDelta} onChange={(e)=>setPointDelta(e.target.value)} /><input style={inputSmall} placeholder='reason' value={pointReason} onChange={(e)=>setPointReason(e.target.value)} /><button style={btnMini} disabled={busy} onClick={adjustPoints}>{busy?'Proses...':'Submit Poin'}</button></div><p className='nk-muted' style={{ marginTop:8 }}>Nama terdeteksi: <b>{matchedParticipant?.name || '-'}</b>{matchedParticipant?.phone ? ` (${matchedParticipant.phone})` : ''}</p><ul>{adminPointHistory.slice(0,20).map((p,i)=><li key={i}>{p.name || '-'} ({p.phone || '-'}) · {p.delta>0?`+${p.delta}`:p.delta} · {p.reason} · {p.type}</li>)}{!adminPointHistory.length?<li className='nk-empty'>Belum ada transaksi poin.</li>:null}</ul></section>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

const wrap = { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 };
const card = { width: '100%', maxWidth: 420, border: '1px solid #334155', borderRadius: 'var(--nk-radius-lg)', padding: 20, background: 'var(--nk-bg-surface)', boxShadow: 'var(--nk-shadow-sm)' };
const card2 = { border: '1px solid #334155', borderRadius: 'var(--nk-radius-lg)', padding: 16, background: 'var(--nk-bg-surface)', marginTop: 16, boxShadow: 'var(--nk-shadow-sm)' };
const hero = { background: 'var(--nk-bg-main)', borderRadius: 'var(--nk-radius-xl)', padding: 20, boxShadow: 'var(--nk-shadow-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 };
const summaryGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 };
const input = { width: '100%', padding: 10, borderRadius: 'var(--nk-radius-sm)', border: '1px solid #334155', background: 'var(--nk-bg-elevated)', color: 'white' };
const inputSmall = { padding: 10, borderRadius: 'var(--nk-radius-sm)', border: '1px solid #334155', background: 'var(--nk-bg-elevated)', color: 'white' };
const fieldLabel = { display: 'block', fontSize: 13, color: 'var(--nk-muted)', marginTop: 2 };
const btn = { border: 0, background: 'var(--nk-cta)', color: 'white', borderRadius: 'var(--nk-radius-md)', padding: '8px 14px', cursor: 'pointer', fontWeight: 600 };
const btnMini = { border: '1px solid #374151', background: '#1f2937', color: 'white', borderRadius: 'var(--nk-radius-sm)', padding: '6px 10px', cursor: 'pointer' };
const thAdmin = { textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #334155', color: '#cbd5e1', fontSize: 13 };
const tdAdmin = { padding: '10px 8px', borderBottom: '1px solid #1f2937', fontSize: 14, verticalAlign: 'top' };
