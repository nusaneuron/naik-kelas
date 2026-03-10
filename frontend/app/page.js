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
  const [confirmAction, setConfirmAction] = useState(null);

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
  const [adminPointBalances, setAdminPointBalances] = useState([]);
  const [adminExpRules, setAdminExpRules] = useState([]);
  const [adminExpHistory, setAdminExpHistory] = useState([]);
  const [adminExpStatus, setAdminExpStatus] = useState([]);
  const [expReportSetting, setExpReportSetting] = useState({ time_of_day: '10:00', timezone: 'Asia/Jakarta', is_active: true });
  const [pointPhone, setPointPhone] = useState('');
  const [pointDelta, setPointDelta] = useState('');
  const [pointReason, setPointReason] = useState('');
  const [editingPointEntryId, setEditingPointEntryId] = useState('');

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
    if (lRes.ok) { const d = await lRes.json(); setLeaderboard(d.items || []); }
    if (rRes.ok) setMyReminder(await rRes.json());
    if (pRes.ok) setMyPoints((await pRes.json()).balance || 0);
    if (phRes.ok) setMyPointHistory((await phRes.json()).items || []);
  }

  async function loadAdmin() {
    const [pRes, cRes, qRes, rRes, phRes, pbRes, erRes, ehRes, esRes, ersRes] = await Promise.all([
      fetch(`${apiBase}/admin/participants`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/categories`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/questions`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/reminders`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/points/history`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/points/balances`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/exp/rules`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/exp/history`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/exp/status`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/exp/report-setting`, { credentials: 'include' })
    ]);
    if (pRes.ok) setParticipants((await pRes.json()).items || []);
    if (cRes.ok) setCategories((await cRes.json()).items || []);
    if (qRes.ok) setQuestions((await qRes.json()).items || []);
    if (rRes.ok) setAdminReminders((await rRes.json()).items || []);
    if (phRes.ok) setAdminPointHistory((await phRes.json()).items || []);
    if (pbRes.ok) setAdminPointBalances((await pbRes.json()).items || []);
    if (erRes.ok) setAdminExpRules((await erRes.json()).items || []);
    if (ehRes.ok) setAdminExpHistory((await ehRes.json()).items || []);
    if (esRes.ok) setAdminExpStatus((await esRes.json()).items || []);
    if (ersRes.ok) setExpReportSetting(await ersRes.json());
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
    setMe(null); setProfile(null);
  }

  function openConfirm(type, participant) {
    const actionMap = {
      role: `Ubah role ${participant.phone} dari ${participant.role}?`,
      active: `${participant.is_active ? 'Nonaktifkan' : 'Aktifkan'} akun ${participant.phone}?`,
      delete: `Hapus permanen peserta ${participant.phone}?`
    };
    setConfirmAction({ type, participant, message: actionMap[type] || 'Lanjutkan aksi?' });
  }

  async function executeConfirmAction() {
    if (!confirmAction) return;
    const { type, participant } = confirmAction;
    setConfirmAction(null);
    if (type === 'role') return toggleRole(participant);
    if (type === 'active') return toggleActive(participant);
    if (type === 'delete') return deleteParticipant(participant.id);
  }

  async function resetPassword(userId) {
    setBusy(true); setActionMsg('');
    await fetch(`${apiBase}/admin/participants/reset-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ user_id: userId })
    });
    await loadAdmin();
    setActionType('success'); setActionMsg('Password peserta berhasil direset.'); setBusy(false);
  }

  async function toggleRole(p) {
    setBusy(true); setActionMsg('');
    const nextRole = p.role === 'admin' ? 'participant' : 'admin';
    await fetch(`${apiBase}/admin/participants/set-role`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ user_id: p.id, role: nextRole })
    });
    await loadAdmin();
    setActionType('success'); setActionMsg(`Role ${p.phone} diubah ke ${nextRole}.`); setBusy(false);
  }

  async function toggleActive(p) {
    setBusy(true); setActionMsg('');
    await fetch(`${apiBase}/admin/participants/toggle-active`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ user_id: p.id, is_active: !p.is_active })
    });
    await loadAdmin();
    setActionType('success'); setActionMsg(`Status ${p.phone} berhasil diperbarui.`); setBusy(false);
  }

  async function deleteParticipant(userId) {
    setBusy(true); setActionMsg('');
    const res = await fetch(`${apiBase}/admin/participants/delete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ user_id: userId })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal menghapus peserta.'); setBusy(false); return; }
    await loadAdmin();
    setActionType('success'); setActionMsg('Peserta berhasil dihapus.'); setBusy(false);
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
    setActionType('success'); setActionMsg(isEdit ? 'Kategori berhasil diupdate.' : 'Kategori berhasil ditambahkan.'); setBusy(false);
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
    if (String(editingCategoryId) === String(catId)) { setEditingCategoryId(''); setNewCategoryCode(''); setNewCategoryName(''); }
    await loadAdmin();
    setActionType('success'); setActionMsg('Kategori berhasil dihapus.'); setBusy(false);
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
    if (String(editingQuestionId) === String(qId)) { setEditingQuestionId(''); setQCategoryId(''); setQText(''); setQA(''); setQB(''); setQC(''); setQD(''); setQCorrect('A'); }
    await loadAdmin();
    setActionType('success'); setActionMsg('Soal berhasil dihapus.'); setBusy(false);
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
    setActionType('success'); setActionMsg(isEdit ? 'Soal berhasil diupdate.' : 'Soal berhasil ditambahkan.'); setBusy(false);
  }

  async function adjustPoints() {
    const normalized = (pointPhone || '').replace(/[^0-9]/g, '');
    const target = participants.find((p) => (p.phone || '').replace(/[^0-9]/g, '') === normalized);
    if (!target) { setActionType('error'); setActionMsg('Gagal: nomor telepon tidak ditemukan.'); return; }
    setBusy(true); setActionMsg('');
    const endpoint = editingPointEntryId ? '/admin/points/update' : '/admin/points/adjust';
    const payload = editingPointEntryId
      ? { id: Number(editingPointEntryId), delta: Number(pointDelta), reason: pointReason }
      : { user_id: Number(target.id), delta: Number(pointDelta), reason: pointReason };
    const res = await fetch(`${apiBase}${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify(payload)
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal update poin.'); setBusy(false); return; }
    setPointPhone(''); setPointDelta(''); setPointReason(''); setEditingPointEntryId('');
    await loadAdmin(); await loadParticipant();
    setActionType('success'); setActionMsg(editingPointEntryId ? 'Entry poin berhasil diupdate.' : 'Poin peserta berhasil diperbarui.'); setBusy(false);
  }

  function startEditPointEntry(entry) {
    setEditingPointEntryId(String(entry.id));
    setPointPhone(entry.phone || '');
    setPointDelta(String(entry.delta ?? ''));
    setPointReason(entry.reason || '');
  }

  async function deletePointEntry(entryId) {
    setBusy(true); setActionMsg('');
    const res = await fetch(`${apiBase}/admin/points/delete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ id: Number(entryId) })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal menghapus entry poin.'); setBusy(false); return; }
    await loadAdmin(); await loadParticipant();
    setActionType('success'); setActionMsg('Entry poin berhasil dihapus.'); setBusy(false);
  }

  async function recalculatePoints() {
    setBusy(true); setActionMsg('');
    const res = await fetch(`${apiBase}/admin/points/recalculate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({})
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal hitung ulang poin.'); setBusy(false); return; }
    await loadAdmin(); await loadParticipant();
    setActionType('success'); setActionMsg(`Recalculate selesai. User dihitung ulang: ${d.recalculated_users ?? '-'}`); setBusy(false);
  }

  async function saveExpReportSetting() {
    setBusy(true); setActionMsg('');
    const res = await fetch(`${apiBase}/admin/exp/report-setting`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ time_of_day: expReportSetting.time_of_day, timezone: expReportSetting.timezone, is_active: !!expReportSetting.is_active })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal simpan setting laporan EXP.'); setBusy(false); return; }
    await loadAdmin();
    setActionType('success'); setActionMsg('Setting laporan EXP berhasil disimpan.'); setBusy(false);
  }

  async function updateExpRule(ruleKey, ruleValue) {
    setBusy(true); setActionMsg('');
    const res = await fetch(`${apiBase}/admin/exp/rules`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ rule_key: ruleKey, rule_value: Number(ruleValue) })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal update rule EXP.'); setBusy(false); return; }
    await loadAdmin();
    setActionType('success'); setActionMsg(`Rule EXP ${ruleKey} berhasil diperbarui.`); setBusy(false);
  }

  const matchedParticipant = participants.find((p) => ((p.phone || '').replace(/[^0-9]/g, '') === (pointPhone || '').replace(/[^0-9]/g, '')));
  const filteredQuestions = questionFilterCategoryId ? questions.filter((q) => String(q.category_id) === String(questionFilterCategoryId)) : questions;
  const isAdmin = me?.role === 'admin';
  const showParticipantView = !isAdmin || adminViewMode === 'participant';
  const showAdminView = isAdmin && adminViewMode === 'admin';

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #be94f5 0%, #ff5734 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: 28, boxShadow: '0 8px 24px rgba(190,148,245,0.35)'
          }}>🎓</div>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', margin: '0 0 8px', fontSize: 22, color: '#e5e7eb' }}>
            Naik Kelas
          </h2>
          <p style={{ color: '#94a3b8', margin: '0 0 24px', fontSize: 14 }}>Memuat portal belajarmu...</p>
          <div className="nk-spinner" />
        </div>
      </main>
    );
  }

  // ── Login ──────────────────────────────────────────────
  if (!me) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'linear-gradient(135deg, #be94f5 0%, #9b6de0 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 32,
              boxShadow: '0 8px 24px rgba(190,148,245,0.4)'
            }}>🎓</div>
            <h1 style={{ fontFamily: 'Poppins, sans-serif', margin: '0 0 6px', fontSize: 28, color: '#fff' }}>
              Naik Kelas
            </h1>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: 14 }}>Portal Belajar Peserta</p>
          </div>

          {/* Card */}
          <form onSubmit={login} style={{
            border: '1px solid #1e2d45',
            borderRadius: 20,
            padding: '28px 24px',
            background: 'rgba(15,23,42,0.85)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.4)'
          }}>
            <p style={{ color: '#cbd5e1', margin: '0 0 20px', fontSize: 14, fontWeight: 500 }}>
              Masuk dengan nomor HP &amp; password
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                Nomor HP
              </label>
              <input
                className="nk-input"
                placeholder="Contoh: 08123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                Password
              </label>
              <input
                className="nk-input"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {err && (
              <div style={{
                background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                color: '#fca5a5', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8
              }}>
                <span>⚠️</span> {err}
              </div>
            )}

            <button type="submit" style={{
              width: '100%', border: 0, borderRadius: 12, padding: '12px 0',
              background: 'linear-gradient(135deg, #ff5734 0%, #e8431f 100%)',
              color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(255,87,52,0.4)',
              transition: 'all 180ms ease'
            }}>
              Masuk →
            </button>

            <p style={{ color: '#475569', fontSize: 12, textAlign: 'center', margin: '16px 0 0' }}>
              Belum punya akun? Daftar via bot Telegram <b style={{ color: '#94a3b8' }}>Nala</b>
            </p>
          </form>
        </div>
      </main>
    );
  }

  // ── Portal ──────────────────────────────────────────────
  return (
    <main style={{ minHeight: '100vh', padding: '16px' }}>
      <div style={{ maxWidth: 1100, width: '100%', margin: '16px auto' }}>

        {/* ── Hero Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #be94f5 0%, #9b6de0 60%, #7c5cbf 100%)',
          borderRadius: 20, padding: '20px 24px', marginBottom: 20,
          boxShadow: '0 8px 28px rgba(190,148,245,0.3)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255,255,255,0.2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 22,
              backdropFilter: 'blur(4px)'
            }}>🎓</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontFamily: 'Poppins, sans-serif', color: '#fff', fontWeight: 800 }}>
                Naik Kelas Portal
              </h1>
              <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
                {profile?.name || me.phone}
                <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
                <span style={{
                  background: 'rgba(255,255,255,0.2)', borderRadius: 99,
                  padding: '2px 10px', fontSize: 12, fontWeight: 600
                }}>{me.role}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {isAdmin && (
              <>
                <button
                  onClick={() => setAdminViewMode('participant')}
                  style={{
                    ...btnOutline,
                    background: adminViewMode === 'participant' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                    borderColor: 'rgba(255,255,255,0.3)'
                  }}
                >
                  👤 Peserta
                </button>
                <button
                  onClick={() => setAdminViewMode('admin')}
                  style={{
                    ...btnOutline,
                    background: adminViewMode === 'admin' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                    borderColor: 'rgba(255,255,255,0.3)'
                  }}
                >
                  ⚙️ Admin
                </button>
              </>
            )}
            <button onClick={logout} style={{
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)', color: 'white',
              borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600
            }}>
              Keluar
            </button>
          </div>
        </div>

        {/* Warning & Banner */}
        {me.must_change_password && (
          <div style={{
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 12,
            color: '#fcd34d', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8
          }}>
            ⚠️ Password default terdeteksi. Harap ganti password via <code>/auth/change-password</code>.
          </div>
        )}

        {actionMsg && (
          <div className={`nk-banner ${actionType}`} style={{ marginBottom: 12 }}>
            {actionType === 'success' ? '✅' : '❌'} {actionMsg}
          </div>
        )}

        {/* ── Participant View ── */}
        {showParticipantView && (
          <>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 14 }}>

              <div className="nk-stat-card purple">
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>👤 Profil</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{profile?.name || '-'}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 2 }}>{profile?.email || '-'}</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <span className="nk-badge nk-badge-purple">Lv. {profile?.level || 1}</span>
                  <span className="nk-badge nk-badge-yellow">⭐ {profile?.exp || 0} EXP</span>
                </div>
              </div>

              <div className="nk-stat-card orange">
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>🌟 Saldo Poin</div>
                <div style={{ fontSize: 38, fontWeight: 800, fontFamily: 'Poppins, sans-serif', color: '#ff7a5c', lineHeight: 1 }}>{myPoints}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>poin tersedia</div>
              </div>

              <div className="nk-stat-card yellow">
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>📅 Jadwal Belajar</div>
                {myReminder?.active ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Jam {myReminder.time_of_day}</div>
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>{myReminder.timezone}</div>
                    <span className="nk-badge nk-badge-green" style={{ marginTop: 10 }}>● Aktif</span>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>Belum diatur</div>
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>Atur via bot: <b style={{ color: '#fccc42' }}>/jadwal_belajar</b></div>
                  </>
                )}
              </div>
            </div>

            {/* Riwayat Poin */}
            <Section title="💰 Riwayat Poin">
              {myPointHistory.length ? (
                <div className="nk-table-wrap" style={{ maxHeight: 280 }}>
                  <table className="nk-table" style={{ minWidth: 700 }}>
                    <thead><tr><th>Delta</th><th>Keterangan</th><th>Tipe</th><th>Waktu</th></tr></thead>
                    <tbody>{myPointHistory.slice(0, 50).map((p, i) => (
                      <tr key={i}>
                        <td><span className={`nk-badge ${p.delta > 0 ? 'nk-badge-green' : 'nk-badge-red'}`}>{p.delta > 0 ? `+${p.delta}` : p.delta}</span></td>
                        <td style={{ color: '#cbd5e1' }}>{p.reason}</td>
                        <td><span className="nk-badge nk-badge-purple">{p.type}</span></td>
                        <td style={{ color: '#94a3b8', fontSize: 13 }}>{new Date(p.created_at).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <div className="nk-empty">📭 Belum ada transaksi poin.</div>}
            </Section>

            {/* Leaderboard */}
            <Section title="🏆 Leaderbot Tryout">
              {leaderboard.length ? (
                <div className="nk-table-wrap" style={{ maxHeight: 280 }}>
                  <table className="nk-table" style={{ minWidth: 500 }}>
                    <thead><tr><th>#</th><th>Nama</th><th>Telegram</th><th>Waktu Terbaik</th><th>Perfect</th></tr></thead>
                    <tbody>{leaderboard.map((it) => (
                      <tr key={it.rank}>
                        <td>
                          <span style={{ fontWeight: 700, color: it.rank === 1 ? '#fccc42' : it.rank === 2 ? '#94a3b8' : it.rank === 3 ? '#cd7c3c' : '#e5e7eb' }}>
                            {it.rank === 1 ? '🥇' : it.rank === 2 ? '🥈' : it.rank === 3 ? '🥉' : `#${it.rank}`}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{it.name}</td>
                        <td style={{ color: '#94a3b8' }}>@{it.telegram}</td>
                        <td><span className="nk-badge nk-badge-orange">⚡ {it.best_seconds}s</span></td>
                        <td><span className="nk-badge nk-badge-purple">{it.perfect_count}x</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <div className="nk-empty">🏆 Belum ada data leaderboard.</div>}
            </Section>

            {/* Riwayat */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 14 }}>
              <Section title="🧠 Riwayat Quiz">
                {(history.quiz || []).length ? (
                  <div className="nk-table-wrap" style={{ maxHeight: 280 }}>
                    <table className="nk-table" style={{ minWidth: 500 }}>
                      <thead><tr><th>Kategori</th><th>Attempt</th><th>Salah</th><th>Total</th><th>Status</th></tr></thead>
                      <tbody>{(history.quiz || []).map((q, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{q.category}</td>
                          <td style={{ color: '#94a3b8' }}>#{q.attempt_no}</td>
                          <td style={{ color: q.wrong_count > 0 ? '#f87171' : '#4ade80' }}>{q.wrong_count}</td>
                          <td>{q.total_questions}</td>
                          <td><span className={`nk-badge ${q.all_correct ? 'nk-badge-green' : 'nk-badge-yellow'}`}>{q.all_correct ? '✓ LULUS' : '○ BELUM'}</span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <div className="nk-empty">📚 Belum ada riwayat quiz.</div>}
              </Section>

              <Section title="🚀 Riwayat Tryout">
                {(history.tryout || []).length ? (
                  <div className="nk-table-wrap" style={{ maxHeight: 280 }}>
                    <table className="nk-table" style={{ minWidth: 520 }}>
                      <thead><tr><th>Benar</th><th>Total</th><th>Durasi</th><th>Kecepatan</th><th>Status</th></tr></thead>
                      <tbody>{(history.tryout || []).map((t, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{t.correct_count}</td>
                          <td>{t.total_questions}</td>
                          <td style={{ color: '#94a3b8' }}>{t.duration_seconds}s</td>
                          <td><span className="nk-badge nk-badge-orange">{Number(t.speed_qpm || 0).toFixed(2)} qpm</span></td>
                          <td><span className={`nk-badge ${t.all_correct ? 'nk-badge-green' : 'nk-badge-yellow'}`}>{t.all_correct ? '⭐ PERFECT' : '○ BELUM'}</span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <div className="nk-empty">🚀 Belum ada riwayat tryout.</div>}
              </Section>
            </div>
          </>
        )}

        {/* ── Admin View ── */}
        {showAdminView && (
          <div style={{
            border: '1px solid #1e2d45', borderRadius: 16,
            background: '#0b1220', overflow: 'hidden',
            display: 'grid', gridTemplateColumns: '210px minmax(0,1fr)', minHeight: 560
          }}>
            {/* Sidebar */}
            <aside style={{ background: '#080d18', borderRight: '1px solid #1e2d45', padding: '20px 12px' }}>
              <p style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 12px 8px' }}>
                Menu Admin
              </p>
              <nav style={{ display: 'grid', gap: 4 }}>
                {[
                  ['peserta', '👥', 'Peserta'],
                  ['bank', '📚', 'Bank Soal'],
                  ['jadwal', '📅', 'Jadwal Belajar'],
                  ['poin', '💰', 'Poin'],
                  ['exp', '⭐', 'EXP'],
                ].map(([key, icon, label]) => (
                  <button
                    key={key}
                    onClick={() => setAdminSection(key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                      border: adminSection === key ? '1px solid rgba(190,148,245,0.3)' : '1px solid transparent',
                      background: adminSection === key ? 'rgba(190,148,245,0.12)' : 'transparent',
                      color: adminSection === key ? '#be94f5' : '#94a3b8',
                      fontWeight: adminSection === key ? 700 : 500,
                      fontSize: 14, textAlign: 'left', transition: 'all 160ms ease'
                    }}
                  >
                    <span>{icon}</span> {label}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Content */}
            <div style={{ padding: 20, overflowX: 'auto' }}>

              {/* Admin — Peserta */}
              {adminSection === 'peserta' && (
                <AdminSection title="👥 Peserta">
                  {participants.length ? (
                    <div className="nk-table-wrap" style={{ maxHeight: 520 }}>
                      <table className="nk-table" style={{ minWidth: 1100 }}>
                        <thead><tr><th>Nama</th><th>No. HP</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead>
                        <tbody>{participants.map((p) => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 600 }}>{p.name || '-'}</td>
                            <td style={{ color: '#94a3b8' }}>{p.phone}</td>
                            <td><span className={`nk-badge ${p.role === 'admin' ? 'nk-badge-orange' : 'nk-badge-purple'}`}>{p.role}</span></td>
                            <td><span className={`nk-badge ${p.is_active ? 'nk-badge-green' : 'nk-badge-red'}`}>{p.is_active ? '● Aktif' : '○ Nonaktif'}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                                <BtnSm disabled={busy} onClick={() => resetPassword(p.id)}>Reset Pass</BtnSm>
                                <BtnSm disabled={busy} onClick={() => openConfirm('role', p)}>{p.role === 'admin' ? '↓ Peserta' : '↑ Admin'}</BtnSm>
                                <BtnSm disabled={busy} onClick={() => openConfirm('active', p)}>{p.is_active ? 'Nonaktifkan' : 'Aktifkan'}</BtnSm>
                                <BtnSm disabled={busy} onClick={() => openConfirm('delete', p)} danger>Hapus</BtnSm>
                              </div>
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  ) : <div className="nk-empty">👥 Belum ada peserta.</div>}
                </AdminSection>
              )}

              {/* Admin — Bank Soal */}
              {adminSection === 'bank' && (
                <>
                  <AdminSection title="📂 Kategori Soal">
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                      <input className="nk-input-sm" placeholder="Kode" style={{ width: 120 }} value={newCategoryCode} onChange={(e) => setNewCategoryCode(e.target.value)} />
                      <input className="nk-input-sm" placeholder="Nama kategori" style={{ width: 200 }} value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                      <BtnSm disabled={busy} onClick={addCategory}>{busy ? '...' : (editingCategoryId ? 'Update' : '+ Tambah')}</BtnSm>
                      {editingCategoryId && <BtnSm disabled={busy} onClick={() => { setEditingCategoryId(''); setNewCategoryCode(''); setNewCategoryName(''); }}>Batal</BtnSm>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                      {categories.map((c) => (
                        <div key={c.id} style={{
                          border: '1px solid #1e2d45', borderRadius: 12,
                          padding: '14px 16px', background: '#0f172a'
                        }}>
                          <div style={{ fontWeight: 700, marginBottom: 2 }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>{c.code}</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <BtnSm disabled={busy} onClick={() => startEditCategory(c)}>Edit</BtnSm>
                            <BtnSm disabled={busy} onClick={() => deleteCategory(c.id)} danger>Hapus</BtnSm>
                          </div>
                        </div>
                      ))}
                      {!categories.length && <div className="nk-empty">Belum ada kategori.</div>}
                    </div>
                  </AdminSection>

                  <AdminSection title="📝 Bank Soal" style={{ marginTop: 14 }}>
                    <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <label style={fieldLbl}>Kategori</label>
                          <select className="nk-input" value={qCategoryId} onChange={(e) => setQCategoryId(e.target.value)}>
                            <option value="">Pilih kategori</option>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={fieldLbl}>Jawaban Benar</label>
                          <select className="nk-input" value={qCorrect} onChange={(e) => setQCorrect(e.target.value)}>
                            <option>A</option><option>B</option><option>C</option><option>D</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={fieldLbl}>Pertanyaan</label>
                        <input className="nk-input" placeholder="Teks pertanyaan" value={qText} onChange={(e) => setQText(e.target.value)} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[['A', qA, setQA], ['B', qB, setQB], ['C', qC, setQC], ['D', qD, setQD]].map(([lbl, val, setter]) => (
                          <div key={lbl}>
                            <label style={fieldLbl}>Opsi {lbl}</label>
                            <input className="nk-input" placeholder={`Jawaban ${lbl}`} value={val} onChange={(e) => setter(e.target.value)} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <BtnSm disabled={busy} onClick={addQuestion}>{busy ? '...' : (editingQuestionId ? 'Update Soal' : '+ Tambah Soal')}</BtnSm>
                        {editingQuestionId && <BtnSm disabled={busy} onClick={() => { setEditingQuestionId(''); setQCategoryId(''); setQText(''); setQA(''); setQB(''); setQC(''); setQD(''); setQCorrect('A'); }}>Batal</BtnSm>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>Filter:</span>
                      <select className="nk-input-sm" value={questionFilterCategoryId} onChange={(e) => setQuestionFilterCategoryId(e.target.value)}>
                        <option value="">Semua kategori</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <span className="nk-badge nk-badge-purple">{filteredQuestions.length} soal</span>
                    </div>

                    <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                      {filteredQuestions.map((q) => (
                        <div key={q.id} style={{ border: '1px solid #1e2d45', borderRadius: 12, padding: 14, background: '#0f172a' }}>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}><span className="nk-badge nk-badge-purple">{q.category_name}</span></div>
                          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{q.question_text}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.6 }}>
                            A. {q.option_a} &nbsp;·&nbsp; B. {q.option_b}<br />
                            C. {q.option_c} &nbsp;·&nbsp; D. {q.option_d}<br />
                            <span style={{ color: '#4ade80', fontWeight: 600 }}>✓ Jawaban: {q.correct_option}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <BtnSm disabled={busy} onClick={() => startEditQuestion(q)}>Edit</BtnSm>
                            <BtnSm disabled={busy} onClick={() => deleteQuestion(q.id)} danger>Hapus</BtnSm>
                          </div>
                        </div>
                      ))}
                      {!filteredQuestions.length && <div className="nk-empty">Tidak ada soal untuk kategori ini.</div>}
                    </div>
                  </AdminSection>
                </>
              )}

              {/* Admin — Jadwal */}
              {adminSection === 'jadwal' && (
                <AdminSection title="📅 Jadwal Belajar Peserta">
                  {adminReminders.length ? (
                    <div className="nk-table-wrap" style={{ maxHeight: 420 }}>
                      <table className="nk-table" style={{ minWidth: 700 }}>
                        <thead><tr><th>Nama</th><th>No. HP</th><th>Jam</th><th>Timezone</th><th>Status</th></tr></thead>
                        <tbody>{adminReminders.map((r, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{r.name || '-'}</td>
                            <td style={{ color: '#94a3b8' }}>{r.phone || '-'}</td>
                            <td><span className="nk-badge nk-badge-yellow">🕐 {r.time_of_day}</span></td>
                            <td style={{ color: '#94a3b8' }}>{r.timezone}</td>
                            <td><span className={`nk-badge ${r.is_active ? 'nk-badge-green' : 'nk-badge-red'}`}>{r.is_active ? '● Aktif' : '○ Nonaktif'}</span></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  ) : <div className="nk-empty">📅 Belum ada jadwal belajar yang diset.</div>}
                </AdminSection>
              )}

              {/* Admin — Poin */}
              {adminSection === 'poin' && (
                <AdminSection title="💰 Poin Peserta">
                  <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
                    <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#cbd5e1' }}>
                      {editingPointEntryId ? '✏️ Edit Entry Poin' : '➕ Tambah / Kurangi Poin'}
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div>
                        <label style={fieldLbl}>No. HP Peserta</label>
                        <input className="nk-input-sm" placeholder="08xxxxxxxxxx" value={pointPhone} onChange={(e) => setPointPhone(e.target.value)} />
                      </div>
                      <div>
                        <label style={fieldLbl}>Delta (+/-)</label>
                        <input className="nk-input-sm" placeholder="contoh: 100 atau -50" style={{ width: 140 }} value={pointDelta} onChange={(e) => setPointDelta(e.target.value)} />
                      </div>
                      <div>
                        <label style={fieldLbl}>Keterangan</label>
                        <input className="nk-input-sm" placeholder="Alasan perubahan poin" style={{ width: 200 }} value={pointReason} onChange={(e) => setPointReason(e.target.value)} />
                      </div>
                      <BtnSm disabled={busy} onClick={adjustPoints}>{busy ? '...' : (editingPointEntryId ? 'Update' : 'Submit')}</BtnSm>
                      {editingPointEntryId && <BtnSm disabled={busy} onClick={() => { setEditingPointEntryId(''); setPointPhone(''); setPointDelta(''); setPointReason(''); }}>Batal</BtnSm>}
                      <BtnSm disabled={busy} onClick={recalculatePoints}>{busy ? '...' : '🔄 Recalculate'}</BtnSm>
                    </div>
                    {matchedParticipant && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#4ade80' }}>✓ Ditemukan: <b>{matchedParticipant.name}</b> ({matchedParticipant.phone})</p>}
                  </div>

                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', color: '#e5e7eb' }}>Saldo Per Peserta</h3>
                  {adminPointBalances.length ? (
                    <div className="nk-table-wrap" style={{ maxHeight: 240, marginBottom: 16 }}>
                      <table className="nk-table" style={{ minWidth: 500 }}>
                        <thead><tr><th>Nama</th><th>No. HP</th><th>Saldo</th></tr></thead>
                        <tbody>{adminPointBalances.map((b) => (
                          <tr key={b.user_id}>
                            <td style={{ fontWeight: 600 }}>{b.name || '-'}</td>
                            <td style={{ color: '#94a3b8' }}>{b.phone || '-'}</td>
                            <td><span className="nk-badge nk-badge-orange">🌟 {b.balance} poin</span></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  ) : <div className="nk-empty" style={{ marginBottom: 16 }}>Belum ada saldo poin peserta.</div>}

                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', color: '#e5e7eb' }}>Riwayat Transaksi</h3>
                  {adminPointHistory.length ? (
                    <div className="nk-table-wrap" style={{ maxHeight: 380 }}>
                      <table className="nk-table" style={{ minWidth: 900 }}>
                        <thead><tr><th>Nama</th><th>No. HP</th><th>Delta</th><th>Keterangan</th><th>Tipe</th><th>Waktu</th><th>Aksi</th></tr></thead>
                        <tbody>{adminPointHistory.slice(0, 100).map((p) => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 600 }}>{p.name || '-'}</td>
                            <td style={{ color: '#94a3b8' }}>{p.phone || '-'}</td>
                            <td><span className={`nk-badge ${p.delta > 0 ? 'nk-badge-green' : 'nk-badge-red'}`}>{p.delta > 0 ? `+${p.delta}` : p.delta}</span></td>
                            <td style={{ color: '#cbd5e1' }}>{p.reason}</td>
                            <td><span className="nk-badge nk-badge-purple">{p.type}</span></td>
                            <td style={{ color: '#94a3b8', fontSize: 13 }}>{new Date(p.created_at).toLocaleString('id-ID')}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <BtnSm disabled={busy} onClick={() => startEditPointEntry(p)}>Edit</BtnSm>
                                <BtnSm disabled={busy} onClick={() => deletePointEntry(p.id)} danger>Hapus</BtnSm>
                              </div>
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  ) : <div className="nk-empty">Belum ada transaksi poin.</div>}
                </AdminSection>
              )}

              {/* Admin — EXP */}
              {adminSection === 'exp' && (
                <AdminSection title="⭐ EXP Peserta">
                  <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                    <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>⏰ Setting Laporan EXP Harian</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <input className="nk-input-sm" type="time" value={expReportSetting.time_of_day || '10:00'} onChange={(e) => setExpReportSetting((s) => ({ ...s, time_of_day: e.target.value }))} />
                      <input className="nk-input-sm" placeholder="Timezone" style={{ width: 180 }} value={expReportSetting.timezone || 'Asia/Jakarta'} onChange={(e) => setExpReportSetting((s) => ({ ...s, timezone: e.target.value }))} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#cbd5e1' }}>
                        <input type="checkbox" checked={!!expReportSetting.is_active} onChange={(e) => setExpReportSetting((s) => ({ ...s, is_active: e.target.checked }))} />
                        Aktif
                      </label>
                      <BtnSm disabled={busy} onClick={saveExpReportSetting}>{busy ? '...' : 'Simpan'}</BtnSm>
                    </div>
                    <p style={{ margin: '10px 0 0', fontSize: 13, color: '#94a3b8' }}>
                      Laporan level + EXP dikirim ke semua peserta Telegram setiap hari sesuai jam di atas.
                    </p>
                  </div>

                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px' }}>Rules EXP</h3>
                  {adminExpRules.length ? (
                    <div className="nk-table-wrap" style={{ marginBottom: 16 }}>
                      <table className="nk-table" style={{ width: '100%', minWidth: 600 }}>
                        <thead><tr><th>Rule</th><th>Nilai</th><th>Aksi</th></tr></thead>
                        <tbody>{adminExpRules.map((r) => (
                          <tr key={r.rule_key}>
                            <td style={{ fontWeight: 600 }}>{r.rule_key}</td>
                            <td><input className="nk-input-sm" type="number" min="1" style={{ width: 120 }} defaultValue={r.rule_value} id={`rule-${r.rule_key}`} /></td>
                            <td><BtnSm disabled={busy} onClick={() => { const el = document.getElementById(`rule-${r.rule_key}`); updateExpRule(r.rule_key, el?.value || r.rule_value); }}>Simpan</BtnSm></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  ) : <div className="nk-empty" style={{ marginBottom: 16 }}>Rule EXP belum tersedia.</div>}

                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px' }}>Status Level & EXP Peserta</h3>
                  {adminExpStatus.length ? (
                    <div className="nk-table-wrap" style={{ maxHeight: 280, marginBottom: 16 }}>
                      <table className="nk-table" style={{ minWidth: 700 }}>
                        <thead><tr><th>Nama</th><th>No. HP</th><th>Level</th><th>EXP</th><th>Progress</th></tr></thead>
                        <tbody>{adminExpStatus.map((s) => (
                          <tr key={s.user_id}>
                            <td style={{ fontWeight: 600 }}>{s.name || '-'}</td>
                            <td style={{ color: '#94a3b8' }}>{s.phone || '-'}</td>
                            <td><span className="nk-badge nk-badge-purple">Lv. {s.level}</span></td>
                            <td><span className="nk-badge nk-badge-yellow">⭐ {s.exp}</span></td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, height: 6, background: '#1e2d45', borderRadius: 99, overflow: 'hidden', minWidth: 80 }}>
                                  <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #be94f5, #9b6de0)', width: `${Math.min(100, Math.round((s.progress / (s.level_step || 1)) * 100))}%` }} />
                                </div>
                                <span style={{ fontSize: 12, color: '#94a3b8' }}>{s.progress}/{s.level_step}</span>
                              </div>
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  ) : <div className="nk-empty" style={{ marginBottom: 16 }}>Belum ada data EXP peserta.</div>}

                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px' }}>History EXP</h3>
                  {adminExpHistory.length ? (
                    <div className="nk-table-wrap" style={{ maxHeight: 320 }}>
                      <table className="nk-table" style={{ minWidth: 860 }}>
                        <thead><tr><th>Nama</th><th>No. HP</th><th>Delta EXP</th><th>Tipe</th><th>Keterangan</th><th>Waktu</th></tr></thead>
                        <tbody>{adminExpHistory.map((h) => (
                          <tr key={h.id}>
                            <td style={{ fontWeight: 600 }}>{h.name || '-'}</td>
                            <td style={{ color: '#94a3b8' }}>{h.phone || '-'}</td>
                            <td><span className={`nk-badge ${h.delta > 0 ? 'nk-badge-green' : 'nk-badge-red'}`}>{h.delta > 0 ? `+${h.delta}` : h.delta}</span></td>
                            <td><span className="nk-badge nk-badge-purple">{h.type}</span></td>
                            <td style={{ color: '#cbd5e1' }}>{h.reason}</td>
                            <td style={{ color: '#94a3b8', fontSize: 13 }}>{new Date(h.created_at).toLocaleString('id-ID')}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  ) : <div className="nk-empty">Belum ada history EXP.</div>}
                </AdminSection>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 32 }}>
          Naik Kelas © 2025 · Ditenagai oleh semangat belajar 🎓
        </p>
      </div>

      {/* Confirm Modal */}
      {confirmAction && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'grid', placeItems: 'center', zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            width: 'min(440px,92vw)', border: '1px solid #1e2d45', borderRadius: 18,
            padding: '24px', background: '#0f172a',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
          }}>
            <h3 style={{ margin: '0 0 12px', fontFamily: 'Poppins, sans-serif', fontSize: 18 }}>⚠️ Konfirmasi Aksi</h3>
            <p style={{ margin: '0 0 20px', color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>{confirmAction.message}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmAction(null)} style={btnOutlineNeutral}>Batal</button>
              <button onClick={executeConfirmAction} style={btnDanger}>Ya, Lanjutkan</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Reusable Components ──────────────────────────────────────

function Section({ title, children }) {
  return (
    <section style={{
      border: '1px solid #1e2d45', borderRadius: 16,
      padding: 18, background: '#0b1220', marginBottom: 14
    }}>
      <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 16, fontWeight: 700, margin: '0 0 14px', color: '#e5e7eb' }}>{title}</h2>
      {children}
    </section>
  );
}

function AdminSection({ title, children, style }) {
  return (
    <section style={style}>
      <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 17, fontWeight: 700, margin: '0 0 16px', color: '#e5e7eb' }}>{title}</h2>
      {children}
    </section>
  );
}

function BtnSm({ children, onClick, disabled, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        border: danger ? '1px solid rgba(220,38,38,0.5)' : '1px solid #2d3f5a',
        background: danger ? 'rgba(127,29,29,0.6)' : '#1a2640',
        color: danger ? '#fca5a5' : '#cbd5e1',
        borderRadius: 8, padding: '6px 12px', cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12, fontWeight: 600, opacity: disabled ? 0.6 : 1,
        transition: 'all 160ms ease'
      }}
    >
      {children}
    </button>
  );
}

// ── Styles ──────────────────────────────────────────────────

const fieldLbl = {
  display: 'block', fontSize: 11, color: '#64748b',
  marginBottom: 5, fontWeight: 600,
  letterSpacing: '0.4px', textTransform: 'uppercase'
};

const btnOutline = {
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.1)', color: 'white',
  borderRadius: 10, padding: '7px 14px', cursor: 'pointer',
  fontSize: 13, fontWeight: 600
};

const btnOutlineNeutral = {
  border: '1px solid #2d3f5a', background: '#1a2640',
  color: '#94a3b8', borderRadius: 10, padding: '9px 18px',
  cursor: 'pointer', fontSize: 14, fontWeight: 600
};

const btnDanger = {
  border: '1px solid rgba(220,38,38,0.5)',
  background: 'rgba(220,38,38,0.8)', color: 'white',
  borderRadius: 10, padding: '9px 18px', cursor: 'pointer',
  fontSize: 14, fontWeight: 700,
  boxShadow: '0 4px 12px rgba(220,38,38,0.3)'
};
