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
  const [participantSection, setParticipantSection] = useState('profil');
  const [confirmAction, setConfirmAction] = useState(null);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [history, setHistory] = useState({ quiz: [], tryout: [] });
  const [leaderboard, setLeaderboard] = useState([]);
  const [profile, setProfile] = useState(null);
  const [myReminder, setMyReminder] = useState(null);
  const [myPoints, setMyPoints] = useState(0);
  const [myPointHistory, setMyPointHistory] = useState([]);

  const [redeemItems, setRedeemItems] = useState([]);
  const [redeemClaims, setRedeemClaims] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [adminReminders, setAdminReminders] = useState([]);
  const [adminPointHistory, setAdminPointHistory] = useState([]);
  const [adminPointBalances, setAdminPointBalances] = useState([]);
  const [adminRedeemItems, setAdminRedeemItems] = useState([]);
  const [adminRedeemClaims, setAdminRedeemClaims] = useState([]);
  const [editingRedeemId, setEditingRedeemId] = useState('');
  const [redeemName, setRedeemName] = useState('');
  const [redeemDesc, setRedeemDesc] = useState('');
  const [redeemCost, setRedeemCost] = useState('');
  const [redeemStock, setRedeemStock] = useState('-1');
  const [redeemGroupId, setRedeemGroupId] = useState('');
  const [redeemClaimNote, setRedeemClaimNote] = useState('');
  // Materi
  const [myMaterials, setMyMaterials] = useState([]);
  const [myReflections, setMyReflections] = useState([]);
  const [adminReflectionStats, setAdminReflectionStats] = useState(null);
  const [adminLearningSummary, setAdminLearningSummary] = useState(null);
  const [adminFeedbackStats, setAdminFeedbackStats] = useState(null);
  const [adminFeedbackList, setAdminFeedbackList] = useState([]);
  const [adminFeedbackSchedule, setAdminFeedbackSchedule] = useState({ send_time: '09:00', is_active: false });
  const [fbScheduleTime, setFbScheduleTime] = useState('09:00');
  const [fbScheduleActive, setFbScheduleActive] = useState(false);
  const [adminMaterials, setAdminMaterials] = useState([]);
  const [adminCategories, setAdminCategories] = useState([]);
  const [materiFilterCat, setMateriFilterCat] = useState('');
  const [materiFilterGroup, setMateriFilterGroup] = useState('');
  const [editingMateriId, setEditingMateriId] = useState('');
  const [materiCatId, setMateriCatId] = useState('');
  const [materiTitle, setMateriTitle] = useState('');
  const [materiType, setMateriType] = useState('text');
  const [materiContent, setMateriContent] = useState('');
  const [materiExp, setMateriExp] = useState('10');
  const [materiOrder, setMateriOrder] = useState('0');
  const [materiActive, setMateriActive] = useState(true);
  const [adminExpRules, setAdminExpRules] = useState([]);
  const [adminExpHistory, setAdminExpHistory] = useState([]);
  const [adminExpStatus, setAdminExpStatus] = useState([]);
  const [expReportSetting, setExpReportSetting] = useState({ time_of_day: '10:00', timezone: 'Asia/Jakarta', is_active: true });
  const [pointPhone, setPointPhone] = useState('');
  const [pointDelta, setPointDelta] = useState('');
  const [pointReason, setPointReason] = useState('');
  const [editingPointEntryId, setEditingPointEntryId] = useState('');

  // Refleksi reminder
  const [reflectionReminderTime, setReflectionReminderTime] = useState('20:00');

  // Kelompok
  const [adminGroups, setAdminGroups] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupActive, setGroupActive] = useState(true);
  const [editingGroupId, setEditingGroupId] = useState('');

  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryGroupId, setNewCategoryGroupId] = useState('');
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
    const [mRes, hRes, lRes, rRes, pRes, phRes, riRes, rcRes, matRes] = await Promise.all([
      fetch(`${apiBase}/participant/me`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/history`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/leaderboard`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/reminder`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/points`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/points/history`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/redeem/items`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/redeem/claims`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/materials`, { credentials: 'include' }),
    ]);
    if (mRes.ok) { const pd = await mRes.json(); setProfile(pd); if (pd.reflection_reminder_time) setReflectionReminderTime(pd.reflection_reminder_time); }
    if (hRes.ok) setHistory(await hRes.json());
    if (lRes.ok) { const d = await lRes.json(); setLeaderboard(d.items || []); }
    if (rRes.ok) setMyReminder(await rRes.json());
    if (pRes.ok) setMyPoints((await pRes.json()).balance || 0);
    if (phRes.ok) setMyPointHistory((await phRes.json()).items || []);
    if (riRes.ok) setRedeemItems((await riRes.json()).items || []);
    if (rcRes.ok) setRedeemClaims((await rcRes.json()).items || []);
    if (matRes.ok) setMyMaterials((await matRes.json()).items || []);
    const refRes = await fetch(`${apiBase}/participant/reflections`, { credentials: 'include' });
    if (refRes.ok) setMyReflections((await refRes.json()).items || []);
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
    if (cRes.ok) { const cd = await cRes.json(); setCategories(cd.categories || cd.items || []); }
    if (qRes.ok) setQuestions((await qRes.json()).items || []);
    if (rRes.ok) setAdminReminders((await rRes.json()).items || []);
    if (phRes.ok) setAdminPointHistory((await phRes.json()).items || []);
    if (pbRes.ok) setAdminPointBalances((await pbRes.json()).items || []);
    if (erRes.ok) setAdminExpRules((await erRes.json()).items || []);
    if (ehRes.ok) setAdminExpHistory((await ehRes.json()).items || []);
    if (esRes.ok) setAdminExpStatus((await esRes.json()).items || []);
    if (ersRes.ok) setExpReportSetting(await ersRes.json());
    const [ariRes, arcRes, amRes, catRes] = await Promise.all([
      fetch(`${apiBase}/admin/redeem/items`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/redeem/claims`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/materials`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/categories`, { credentials: 'include' }),
    ]);
    if (ariRes.ok) setAdminRedeemItems((await ariRes.json()).items || []);
    if (arcRes.ok) setAdminRedeemClaims((await arcRes.json()).items || []);
    if (amRes.ok) setAdminMaterials((await amRes.json()).items || []);
    if (catRes.ok) setAdminCategories((await catRes.json()).categories || []);
    const grpRes = await fetch(`${apiBase}/admin/groups`, { credentials: 'include' });
    if (grpRes.ok) setAdminGroups((await grpRes.json()).items || []);
    const refStatsRes = await fetch(`${apiBase}/admin/reflections/stats`, { credentials: 'include' });
    if (refStatsRes.ok) setAdminReflectionStats(await refStatsRes.json());
    const learnRes = await fetch(`${apiBase}/admin/learning-summary`, { credentials: 'include' });
    if (learnRes.ok) setAdminLearningSummary(await learnRes.json());
    const [fbStatsRes, fbListRes, fbSchedRes] = await Promise.all([
      fetch(`${apiBase}/admin/feedback/stats`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/feedback/list`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/feedback/schedule`, { credentials: 'include' }),
    ]);
    if (fbStatsRes.ok) setAdminFeedbackStats(await fbStatsRes.json());
    if (fbListRes.ok) setAdminFeedbackList((await fbListRes.json()).items || []);
    if (fbSchedRes.ok) {
      const sc = await fbSchedRes.json();
      setAdminFeedbackSchedule(sc);
      setFbScheduleTime(sc.send_time || '09:00');
      setFbScheduleActive(sc.is_active || false);
    }
  }

  async function loadPortal(role) {
    await loadParticipant();
    if (role === 'admin' || role === 'super_admin') await loadAdmin();
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
        ? { action: 'update', id: Number(editingCategoryId), code: newCategoryCode, name: newCategoryName, is_active: true, group_id: newCategoryGroupId ? parseInt(newCategoryGroupId) : null }
        : { action: 'create', code: newCategoryCode, name: newCategoryName, group_id: newCategoryGroupId ? parseInt(newCategoryGroupId) : null })
    });
    setNewCategoryCode(''); setNewCategoryName(''); setEditingCategoryId('');
    await loadAdmin();
    setActionType('success'); setActionMsg(isEdit ? 'Kategori berhasil diupdate.' : 'Kategori berhasil ditambahkan.'); setBusy(false);
  }

  function startEditCategory(cat) {
    setEditingCategoryId(String(cat.id));
    setNewCategoryCode(cat.code || '');
    setNewCategoryName(cat.name || '');
    setNewCategoryGroupId(cat.group_id ? String(cat.group_id) : '');
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

  async function claimRedeem(itemId) {
    setBusy(true); setActionMsg('');
    const res = await fetch(`${apiBase}/participant/redeem/claim`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ item_id: itemId })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal klaim.'); setBusy(false); return; }
    await loadParticipant();
    setActionType('success'); setActionMsg('Klaim berhasil! Menunggu konfirmasi admin 🎁'); setBusy(false);
  }

  async function saveRedeemItem() {
    setBusy(true); setActionMsg('');
    const isEdit = !!editingRedeemId;
    const payload = isEdit
      ? { action: 'update', id: Number(editingRedeemId), name: redeemName, description: redeemDesc, point_cost: Number(redeemCost), stock: Number(redeemStock), is_active: true, image_url: '', group_id: redeemGroupId ? parseInt(redeemGroupId) : null }
      : { action: 'create', name: redeemName, description: redeemDesc, point_cost: Number(redeemCost), stock: Number(redeemStock), image_url: '', group_id: redeemGroupId ? parseInt(redeemGroupId) : null };
    await fetch(`${apiBase}/admin/redeem/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify(payload)
    });
    setRedeemName(''); setRedeemDesc(''); setRedeemCost(''); setRedeemStock('-1'); setEditingRedeemId('');
    await loadAdmin();
    setActionType('success'); setActionMsg(isEdit ? 'Hadiah diupdate.' : 'Hadiah ditambahkan.'); setBusy(false);
  }

  function startEditRedeem(it) {
    setEditingRedeemId(String(it.id));
    setRedeemName(it.name); setRedeemDesc(it.description);
    setRedeemCost(String(it.point_cost)); setRedeemStock(String(it.stock));
    setRedeemGroupId(it.group_id ? String(it.group_id) : '');
  }

  async function deleteRedeemItem(id) {
    setBusy(true); setActionMsg('');
    await fetch(`${apiBase}/admin/redeem/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ action: 'delete', id })
    });
    await loadAdmin();
    setActionType('success'); setActionMsg('Hadiah dihapus.'); setBusy(false);
  }

  async function redeemClaimAction(claimId, action, note) {
    setBusy(true); setActionMsg('');
    const res = await fetch(`${apiBase}/admin/redeem/claims/action`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ claim_id: claimId, action, note: note || '' })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal.'); setBusy(false); return; }
    await loadAdmin();
    setActionType('success'); setActionMsg(`Klaim ${action === 'approve' ? 'disetujui' : 'ditolak'}.`); setBusy(false);
  }

  // ── Materi functions ─────────────────────────────────────
  async function saveMateri() {
    setBusy(true); setActionMsg('');
    const isEdit = !!editingMateriId;
    const body = {
      action: isEdit ? 'update' : 'create',
      ...(isEdit && { id: Number(editingMateriId) }),
      category_id: Number(materiCatId), title: materiTitle,
      type: materiType, content: materiContent,
      exp_reward: Number(materiExp) || 10, order_no: Number(materiOrder) || 0,
      is_active: materiActive,
    };
    const res = await fetch(`${apiBase}/admin/materials`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal simpan.'); setBusy(false); return; }
    resetMateriForm();
    await loadAdmin();
    setActionType('success'); setActionMsg(isEdit ? 'Materi diperbarui!' : 'Materi ditambahkan!'); setBusy(false);
  }

  function resetMateriForm() {
    setEditingMateriId(''); setMateriCatId(''); setMateriTitle('');
    setMateriType('text'); setMateriContent(''); setMateriExp('10');
    setMateriOrder('0'); setMateriActive(true);
  }

  function startEditMateri(m) {
    setEditingMateriId(String(m.id)); setMateriCatId(String(m.category_id));
    setMateriTitle(m.title); setMateriType(m.type); setMateriContent(m.content);
    setMateriExp(String(m.exp_reward)); setMateriOrder(String(m.order_no));
    setMateriActive(m.is_active);
    setAdminSection('materi');
  }

  async function deleteMateri(id) {
    if (!confirm('Hapus materi ini?')) return;
    setBusy(true);
    const res = await fetch(`${apiBase}/admin/materials`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ action: 'delete', id }),
    });
    if (res.ok) { await loadAdmin(); setActionType('success'); setActionMsg('Materi dihapus.'); }
    setBusy(false);
  }

  async function completeMaterial(materialId) {
    setBusy(true);
    const res = await fetch(`${apiBase}/participant/materials/complete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ material_id: materialId }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal.'); setBusy(false); return; }
    if (d.already_completed) { setActionType('error'); setActionMsg('Materi ini sudah kamu selesaikan sebelumnya ✅'); }
    else { setActionType('success'); setActionMsg(`Materi selesai! +${d.exp_gained} EXP 🌟`); }
    const matRes = await fetch(`${apiBase}/participant/materials`, { credentials: 'include' });
    if (matRes.ok) setMyMaterials((await matRes.json()).items || []);
    setBusy(false);
  }

  const matchedParticipant = participants.find((p) => ((p.phone || '').replace(/[^0-9]/g, '') === (pointPhone || '').replace(/[^0-9]/g, '')));
  const filteredQuestions = questionFilterCategoryId ? questions.filter((q) => String(q.category_id) === String(questionFilterCategoryId)) : questions;
  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin';
  const isSuperAdmin = me?.role === 'super_admin';
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

          <button onClick={logout} style={{
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.1)', color: 'white',
            borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600
          }}>
            Keluar
          </button>
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
          <div style={{ display: 'flex', gap: 0, minHeight: 600 }}>

            {/* Sidebar Peserta */}
            <aside style={{ width: 200, flexShrink: 0, background: '#0a1628', borderRight: '1px solid #1e2d45', padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 12px 8px' }}>Menu</p>
              {[
                ['profil',    '👤', 'Profil'],
                ['materi',    '📚', 'Materi'],
                ['quiz',      '🧠', 'Quiz & Tryout'],
                ['redeem',    '🎁', 'Redeem'],
                ['poin',      '💰', 'Poin'],
                ['refleksi',  '📔', 'Refleksi'],
                ['leaderboard','🏆','Leaderboard'],
              ].map(([key, icon, label]) => (
                <button key={key} onClick={() => setParticipantSection(key)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                  border: participantSection === key ? '1px solid rgba(190,148,245,0.3)' : '1px solid transparent',
                  background: participantSection === key ? 'rgba(190,148,245,0.12)' : 'transparent',
                  color: participantSection === key ? '#be94f5' : '#94a3b8',
                  fontWeight: participantSection === key ? 700 : 500,
                  fontSize: 13, textAlign: 'left', transition: 'all 160ms ease', width: '100%'
                }}>
                  <span style={{ fontSize: 16 }}>{icon}</span> {label}
                </button>
              ))}
            </aside>

            {/* Content Peserta */}
            <div style={{ flex: 1, padding: 20, overflowX: 'auto' }}>

            {/* ── Profil ── */}
            {participantSection === 'profil' && (<>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 14 }}>

              <div className="nk-stat-card purple">
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>👤 Profil</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{profile?.name || '-'}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 2 }}>{profile?.email || '-'}</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="nk-badge nk-badge-purple">Lv. {profile?.level || 1}</span>
                  <span className="nk-badge nk-badge-yellow">⭐ {profile?.exp || 0} EXP</span>
                  {isSuperAdmin && <span className="nk-badge" style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', fontWeight: 800 }}>👑 Super Admin</span>}
                  {isAdmin && !isSuperAdmin && <span className="nk-badge nk-badge-orange">⚙️ Admin</span>}
                </div>
                {profile?.group_name && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Kelompok:</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(251,191,36,0.2)' }}>🏢 {profile.group_name}</span>
                  </div>
                )}
                {!profile?.group_name && !isAdmin && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#475569' }}>Belum tergabung dalam kelompok</div>
                )}

                {isAdmin && (
                  <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setAdminViewMode('participant')}
                      style={{
                        flex: 1, border: '1px solid',
                        borderColor: adminViewMode === 'participant' ? 'rgba(190,148,245,0.5)' : '#2d3f5a',
                        background: adminViewMode === 'participant' ? 'rgba(190,148,245,0.15)' : 'transparent',
                        color: adminViewMode === 'participant' ? '#be94f5' : '#94a3b8',
                        borderRadius: 8, padding: '6px 0', cursor: 'pointer',
                        fontSize: 12, fontWeight: 700, transition: 'all 160ms ease'
                      }}
                    >👤 Peserta</button>
                    <button
                      onClick={() => setAdminViewMode('admin')}
                      style={{
                        flex: 1, border: '1px solid',
                        borderColor: adminViewMode === 'admin' ? 'rgba(255,87,52,0.5)' : '#2d3f5a',
                        background: adminViewMode === 'admin' ? 'rgba(255,87,52,0.15)' : 'transparent',
                        color: adminViewMode === 'admin' ? '#ff7a5c' : '#94a3b8',
                        borderRadius: 8, padding: '6px 0', cursor: 'pointer',
                        fontSize: 12, fontWeight: 700, transition: 'all 160ms ease'
                      }}
                    >⚙️ Admin</button>
                  </div>
                )}
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

              <div className="nk-stat-card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.3)' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>📔 Jadwal Refleksi</div>
                {reflectionReminderTime ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#a78bfa' }}>Jam {reflectionReminderTime}</div>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>WIB</div>
                    <span className="nk-badge" style={{ marginTop: 10, background: 'rgba(99,102,241,0.2)', color: '#a78bfa' }}>● Aktif</span>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>Belum diatur</div>
                  </>
                )}
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>Atur via bot: <b style={{ color: '#a78bfa' }}>/jadwal_refleksi</b></div>
              </div>
            </div>

            </>)}

            {/* ── Poin ── */}
            {participantSection === 'poin' && (<>
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
            </>)}

            {/* ── Leaderboard ── */}
            {participantSection === 'leaderboard' && (<>
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

            </>)}

            {/* ── Quiz & Tryout ── */}
            {participantSection === 'quiz' && (<>
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
            </>)}

            {/* ── Materi ── */}
            {participantSection === 'materi' && (<>
            <Section title="📚 Materi Belajar">
              {(() => {
                // Kelompokkan per kategori
                const catMap = {};
                (myMaterials || []).forEach(m => {
                  if (!catMap[m.category_name]) catMap[m.category_name] = [];
                  catMap[m.category_name].push(m);
                });
                const cats = Object.entries(catMap);
                if (cats.length === 0) return <p style={{ fontSize: 13, color: '#64748b' }}>Belum ada materi tersedia.</p>;
                return cats.map(([catName, items]) => {
                  const done = items.filter(m => m.is_completed).length;
                  const pct = Math.round((done / items.length) * 100);
                  const typeIcon = { text: '📖', video: '🎬', audio: '🎵' };
                  return (
                    <div key={catName} style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 16, marginBottom: 14 }}>
                      {/* Header kategori + progress */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{catName}</span>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>{done}/{items.length} selesai</span>
                      </div>
                      {/* Progress bar */}
                      <div style={{ height: 6, background: '#1e2d45', borderRadius: 99, marginBottom: 12, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#be94f5', borderRadius: 99, transition: 'width 0.4s' }} />
                      </div>
                      {/* List materi */}
                      {items.map(m => (
                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderTop: '1px solid #1e2d45' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: 16 }}>{typeIcon[m.type] || '📄'}</span>
                              <span style={{ fontSize: 14, fontWeight: m.is_completed ? 400 : 600, color: m.is_completed ? '#64748b' : '#f1f5f9' }}>{m.title}</span>
                              {m.is_completed && <span style={{ fontSize: 12, color: '#22c55e' }}>✅</span>}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', paddingLeft: 24 }}>+{m.exp_reward} EXP</div>
                            {/* Konten materi */}
                            {m.type === 'text' && (
                              <div style={{ marginTop: 8, fontSize: 13, color: '#94a3b8', background: '#0a1628', borderRadius: 8, padding: '10px 12px', whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto', paddingLeft: 24 }}>
                                {m.content}
                              </div>
                            )}
                            {(m.type === 'video' || m.type === 'audio') && (
                              <a href={m.content} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13, color: '#be94f5', textDecoration: 'none', paddingLeft: 24 }}>
                                🔗 Buka {m.type === 'video' ? 'Video' : 'Audio'}
                              </a>
                            )}
                          </div>
                          {!m.is_completed && (
                            <BtnSm onClick={() => completeMaterial(m.id)} disabled={busy} style={{ flexShrink: 0, marginTop: 4 }}>
                              ✅ Selesai
                            </BtnSm>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                });
              })()}
            </Section>

            </>)}

            {/* ── Redeem ── */}
            {participantSection === 'redeem' && (<>
            <Section title="🎁 Redeem Poin">
              {redeemItems.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12 }}>
                  {redeemItems.map((it) => {
                    const canClaim = myPoints >= it.point_cost && it.stock !== 0;
                    return (
                      <div key={it.id} style={{
                        border: `1px solid ${canClaim ? 'rgba(255,87,52,0.25)' : '#1e2d45'}`,
                        borderRadius: 14, padding: 16, background: '#0f172a',
                        display: 'flex', flexDirection: 'column', gap: 8
                      }}>
                        <div style={{ fontSize: 28 }}>🎁</div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{it.name}</div>
                        {it.description && <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{it.description}</div>}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          <span className="nk-badge nk-badge-orange">💰 {it.point_cost} poin</span>
                          <span className={`nk-badge ${it.stock === -1 ? 'nk-badge-green' : it.stock > 0 ? 'nk-badge-yellow' : 'nk-badge-red'}`}>
                            Stok: {it.stock === -1 ? '∞' : it.stock}
                          </span>
                        </div>
                        <button
                          disabled={busy || !canClaim}
                          onClick={() => claimRedeem(it.id)}
                          style={{
                            marginTop: 8, border: 0, borderRadius: 10, padding: '9px 0',
                            background: canClaim ? 'linear-gradient(135deg,#ff5734,#e8431f)' : '#1e2d45',
                            color: canClaim ? 'white' : '#475569',
                            fontWeight: 700, fontSize: 13, cursor: canClaim ? 'pointer' : 'not-allowed',
                            boxShadow: canClaim ? '0 4px 12px rgba(255,87,52,0.3)' : 'none',
                            transition: 'all 180ms ease'
                          }}
                        >
                          {it.stock === 0 ? '✗ Stok Habis' : !canClaim ? `Kurang ${it.point_cost - myPoints} poin` : 'Tukar Sekarang 🎁'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="nk-empty">🎁 Belum ada hadiah tersedia. Terus kumpulkan poin ya!</div>}
            </Section>

            {/* Riwayat Klaim */}
            <Section title="📋 Riwayat Klaim Redeem">
              {redeemClaims.length ? (
                <div className="nk-table-wrap" style={{ maxHeight: 280 }}>
                  <table className="nk-table" style={{ minWidth: 600 }}>
                    <thead><tr><th>Hadiah</th><th>Poin</th><th>Status</th><th>Catatan Admin</th><th>Waktu</th></tr></thead>
                    <tbody>{redeemClaims.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.item_name}</td>
                        <td><span className="nk-badge nk-badge-red">-{c.point_cost}</span></td>
                        <td>
                          <span className={`nk-badge ${c.status === 'approved' ? 'nk-badge-green' : c.status === 'rejected' ? 'nk-badge-red' : 'nk-badge-yellow'}`}>
                            {c.status === 'approved' ? '✓ Disetujui' : c.status === 'rejected' ? '✗ Ditolak' : '⏳ Pending'}
                          </span>
                        </td>
                        <td style={{ color: '#94a3b8', fontSize: 13 }}>{c.note || '-'}</td>
                        <td style={{ color: '#94a3b8', fontSize: 13 }}>{new Date(c.claimed_at).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <div className="nk-empty">📋 Belum ada riwayat klaim.</div>}
            </Section>

            {/* Refleksi Harian */}
            </>)}

            {/* ── Refleksi ── */}
            {participantSection === 'refleksi' && (<>
            <Section title="📔 Refleksi Harianku">
              <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
                Refleksi harianmu bersifat <strong>privat</strong> — hanya kamu yang bisa membacanya 🔒<br/>
                Tulis lewat bot Nala dengan perintah <code style={{ color: '#be94f5' }}>/refleksi</code> dan dapatkan <strong>+15 EXP</strong> setiap hari!
              </p>
              {myReflections.length > 0 ? (
                <div style={{ display: 'grid', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
                  {myReflections.map(r => (
                    <div key={r.id} style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#be94f5' }}>
                          📅 {new Date(r.reflected_date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{r.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📔</div>
                  <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>Belum ada refleksi.</p>
                  <p style={{ color: '#334155', fontSize: 13, margin: '8px 0 0' }}>Mulai hari ini dengan ketik <strong>/refleksi</strong> di bot Nala!</p>
                </div>
              )}
            </Section>
            </>)}

            </div>
          </div>
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
              <button
                onClick={() => setAdminViewMode('participant')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '9px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 16,
                  border: '1px solid rgba(190,148,245,0.3)',
                  background: 'rgba(190,148,245,0.12)',
                  color: '#be94f5', fontWeight: 700, fontSize: 13
                }}
              >
                ← Tampilan Peserta
              </button>
              <p style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 12px 8px' }}>
                Menu Admin
              </p>
              <nav style={{ display: 'grid', gap: 4 }}>
                {[
                  ['kelompok', '🏢', 'Kelompok'],
                  ['peserta', '👥', 'Peserta'],
                  ['bank', '📚', 'Bank Soal'],
                  ['materi', '📖', 'Materi'],
                  ['redeem', '🎁', 'Redeem'],
                  ['refleksi', '📔', 'Refleksi'],
                  ['feedback', '💬', 'Feedback'],
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

              {/* Admin — Kelompok */}
              {adminSection === 'kelompok' && (
                <AdminSection title="🏢 Manajemen Kelompok">
                  {/* Form tambah/edit */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Nama Kelompok</div>
                      <input className="nk-input-sm" placeholder="PT ABC" value={groupName} onChange={e => setGroupName(e.target.value)} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Kode (unik, kapital)</div>
                      <input className="nk-input-sm" placeholder="PTABC" value={groupCode} onChange={e => setGroupCode(e.target.value.toUpperCase())} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Deskripsi</div>
                      <input className="nk-input-sm" placeholder="Keterangan kelompok..." value={groupDesc} onChange={e => setGroupDesc(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
                        <input type="checkbox" checked={groupActive} onChange={e => setGroupActive(e.target.checked)} /> Aktif
                      </label>
                      <BtnSm color="purple" onClick={async () => {
                        if (!groupName.trim() || !groupCode.trim()) return showMsg('Nama & kode wajib diisi', 'error');
                        setBusy(true);
                        const action = editingGroupId ? 'update' : 'create';
                        const body = { action, name: groupName, code: groupCode, description: groupDesc, is_active: groupActive };
                        if (editingGroupId) body.id = parseInt(editingGroupId);
                        const res = await fetch(`${apiBase}/admin/groups`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                        setBusy(false);
                        if (res.ok) {
                          showMsg(editingGroupId ? 'Kelompok diperbarui' : 'Kelompok ditambahkan', 'success');
                          setGroupName(''); setGroupCode(''); setGroupDesc(''); setGroupActive(true); setEditingGroupId('');
                          await loadAdmin();
                        } else showMsg('Gagal simpan kelompok', 'error');
                      }}>{editingGroupId ? '💾 Update' : '➕ Tambah'}</BtnSm>
                      {editingGroupId && <BtnSm color="gray" onClick={() => { setEditingGroupId(''); setGroupName(''); setGroupCode(''); setGroupDesc(''); setGroupActive(true); }}>Batal</BtnSm>}
                    </div>
                  </div>
                  {/* Tabel kelompok */}
                  <div className="nk-table-wrap">
                    <table className="nk-table">
                      <thead><tr><th>Nama</th><th>Kode</th><th>Deskripsi</th><th>Anggota</th><th>Status</th><th>Aksi</th></tr></thead>
                      <tbody>{adminGroups.map(g => (
                        <tr key={g.id}>
                          <td style={{ fontWeight: 600 }}>{g.name}</td>
                          <td><code style={{ background: 'rgba(190,148,245,0.12)', color: '#be94f5', padding: '2px 7px', borderRadius: 5, fontSize: 12 }}>{g.code}</code></td>
                          <td style={{ color: '#94a3b8', fontSize: 13 }}>{g.description || '-'}</td>
                          <td><span className="nk-badge nk-badge-purple">{g.member_count} peserta</span></td>
                          <td><span className={`nk-badge ${g.is_active ? 'nk-badge-green' : 'nk-badge-orange'}`}>{g.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                          <td style={{ display: 'flex', gap: 6 }}>
                            <BtnSm color="purple" onClick={() => { setEditingGroupId(String(g.id)); setGroupName(g.name); setGroupCode(g.code); setGroupDesc(g.description || ''); setGroupActive(g.is_active); }}>✏️ Edit</BtnSm>
                            <BtnSm color="red" onClick={async () => {
                              if (!confirm(`Hapus kelompok "${g.name}"?`)) return;
                              const res = await fetch(`${apiBase}/admin/groups`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: g.id }) });
                              if (res.ok) { showMsg('Kelompok dihapus', 'success'); await loadAdmin(); }
                              else showMsg('Gagal hapus', 'error');
                            }}>🗑️</BtnSm>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  {adminGroups.length === 0 && <div style={{ textAlign: 'center', color: '#475569', padding: 24 }}>Belum ada kelompok. Tambahkan di atas.</div>}
                </AdminSection>
              )}

              {/* Admin — Peserta */}
              {adminSection === 'peserta' && (
                <AdminSection title="👥 Peserta">
                  {participants.length ? (
                    <div className="nk-table-wrap" style={{ maxHeight: 520 }}>
                      <table className="nk-table" style={{ minWidth: 1100 }}>
                        <thead><tr><th>Nama</th><th>No. HP</th><th>Kelompok</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead>
                        <tbody>{participants.map((p) => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 600 }}>{p.name || '-'}</td>
                            <td style={{ color: '#94a3b8' }}>{p.phone}</td>
                            <td>{p.group_name ? <span className="nk-badge nk-badge-purple">🏢 {p.group_name}</span> : <span style={{ color: '#475569', fontSize: 12 }}>—</span>}</td>
                            <td><span className={`nk-badge ${p.role === 'super_admin' ? '' : p.role === 'admin' ? 'nk-badge-orange' : 'nk-badge-purple'}`} style={p.role === 'super_admin' ? {background:'linear-gradient(135deg,#f59e0b,#ef4444)',color:'#fff',fontWeight:800} : {}}>{p.role === 'super_admin' ? '👑 Super Admin' : p.role}</span></td>
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
                      <input className="nk-input-sm" placeholder="Kode" style={{ width: 100 }} value={newCategoryCode} onChange={(e) => setNewCategoryCode(e.target.value)} />
                      <input className="nk-input-sm" placeholder="Nama kategori" style={{ width: 180 }} value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                      <select className="nk-input-sm" style={{ width: 160 }} value={newCategoryGroupId} onChange={e => setNewCategoryGroupId(e.target.value)}>
                        {isSuperAdmin && <option value="">🌐 Global (Super Admin)</option>}
                        {adminGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                      <BtnSm disabled={busy} onClick={addCategory}>{busy ? '...' : (editingCategoryId ? 'Update' : '+ Tambah')}</BtnSm>
                      {editingCategoryId && <BtnSm disabled={busy} onClick={() => { setEditingCategoryId(''); setNewCategoryCode(''); setNewCategoryName(''); setNewCategoryGroupId(''); }}>Batal</BtnSm>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                      {categories.map((c) => (
                        <div key={c.id} style={{
                          border: '1px solid #1e2d45', borderRadius: 12,
                          padding: '14px 16px', background: '#0f172a'
                        }}>
                          <div style={{ fontWeight: 700, marginBottom: 2 }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{c.code}</div>
                          <div style={{ fontSize: 11, marginBottom: 10 }}>{c.group_name ? <span className="nk-badge nk-badge-purple">🏢 {c.group_name}</span> : <span className="nk-badge" style={{ background: '#1e293b', color: '#64748b' }}>🌐 Global</span>}</div>
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
                            {categories
                              .filter(c => isSuperAdmin || c.group_id > 0)
                              .map((c) => <option key={c.id} value={c.id}>{c.name}{c.group_name && !isSuperAdmin ? '' : c.group_name ? ` (${c.group_name})` : ' 🌐'}</option>)}
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
                <AdminSection title="📅 Resume Aktivitas Belajar">
                  {adminLearningSummary ? (<>
                    {/* Stat cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
                      <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#be94f5' }}>{adminLearningSummary.total_participants}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Total Peserta</div>
                      </div>
                      <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#34d399' }}>{adminLearningSummary.active_today}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Aktif Hari Ini</div>
                      </div>
                      <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#38bdf8' }}>{adminLearningSummary.active_week}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Aktif 7 Hari</div>
                      </div>
                    </div>

                    {/* Tabel per peserta */}
                    <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                      <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14 }}>📊 Detail Per Peserta</p>
                      {adminLearningSummary.participants?.length > 0 ? (
                        <div className="nk-table-wrap" style={{ maxHeight: 380 }}>
                          <table className="nk-table">
                            <thead><tr><th>Nama</th><th>Kelompok</th><th>📚 Materi</th><th>🧠 Quiz</th><th>🚀 Tryout</th><th>Terakhir Aktif</th></tr></thead>
                            <tbody>{adminLearningSummary.participants.map((p, i) => (
                              <tr key={i}>
                                <td style={{ fontWeight: 600 }}>{p.name}</td>
                                <td>{p.group_name !== '-' ? <span className="nk-badge nk-badge-purple">🏢 {p.group_name}</span> : <span style={{ color: '#475569', fontSize: 12 }}>—</span>}</td>
                                <td><span className="nk-badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#a78bfa' }}>{p.materi_count}x</span></td>
                                <td><span className="nk-badge" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>{p.quiz_count}x</span></td>
                                <td><span className="nk-badge" style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c' }}>{p.tryout_count}x</span></td>
                                <td>
                                  {p.last_active
                                    ? <span className={`nk-badge ${p.days_ago === 0 ? 'nk-badge-green' : p.days_ago <= 3 ? 'nk-badge-yellow' : 'nk-badge-red'}`}>{p.last_active}</span>
                                    : <span style={{ color: '#475569', fontSize: 12 }}>Belum aktif</span>}
                                </td>
                              </tr>
                            ))}</tbody>
                          </table>
                        </div>
                      ) : <p style={{ color: '#475569', fontSize: 13 }}>Belum ada data aktivitas.</p>}
                    </div>

                    {/* Jadwal belajar terpasang */}
                    <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 16 }}>
                      <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14 }}>⏰ Jadwal Pengingat Belajar</p>
                      {adminReminders.length ? (
                        <div className="nk-table-wrap" style={{ maxHeight: 240 }}>
                          <table className="nk-table">
                            <thead><tr><th>Nama</th><th>Jam</th><th>Timezone</th><th>Status</th></tr></thead>
                            <tbody>{adminReminders.map((r, i) => (
                              <tr key={i}>
                                <td style={{ fontWeight: 600 }}>{r.name || '-'}</td>
                                <td><span className="nk-badge nk-badge-yellow">🕐 {r.time_of_day}</span></td>
                                <td style={{ color: '#94a3b8', fontSize: 12 }}>{r.timezone}</td>
                                <td><span className={`nk-badge ${r.is_active ? 'nk-badge-green' : 'nk-badge-red'}`}>{r.is_active ? '● Aktif' : '○ Nonaktif'}</span></td>
                              </tr>
                            ))}</tbody>
                          </table>
                        </div>
                      ) : <p style={{ color: '#475569', fontSize: 13 }}>Belum ada jadwal yang diset.</p>}
                    </div>
                  </>) : <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>Memuat data...</div>}
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

              {/* Admin — Feedback */}
              {adminSection === 'feedback' && (
                <AdminSection title="💬 Feedback Peserta">
                  {/* Setting jadwal — hanya super admin */}
                  {isSuperAdmin && (
                    <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                      <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14 }}>⏰ Jadwal Broadcast Feedback</p>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input type="time" value={fbScheduleTime} onChange={e => setFbScheduleTime(e.target.value)}
                          style={{ background: '#0d1b2e', border: '1px solid #1e2d45', borderRadius: 8, color: '#f1f5f9', padding: '7px 12px', fontSize: 14 }} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
                          <input type="checkbox" checked={fbScheduleActive} onChange={e => setFbScheduleActive(e.target.checked)} />
                          Aktifkan pengiriman otomatis
                        </label>
                        <BtnSm color="purple" onClick={async () => {
                          setBusy(true);
                          const res = await fetch(`${apiBase}/admin/feedback/schedule`, {
                            method: 'POST', credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ send_time: fbScheduleTime, is_active: fbScheduleActive })
                          });
                          setBusy(false);
                          if (res.ok) { showMsg('Jadwal feedback disimpan ✅', 'success'); await loadAdmin(); }
                          else showMsg('Gagal simpan jadwal', 'error');
                        }}>💾 Simpan</BtnSm>
                      </div>
                      {adminFeedbackSchedule.last_sent_date && (
                        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#475569' }}>Terakhir dikirim: {adminFeedbackSchedule.last_sent_date}</p>
                      )}
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#334155', fontStyle: 'italic' }}>Nala akan broadcast permintaan feedback ke semua peserta pada jam tersebut (WIB).</p>
                    </div>
                  )}

                  {/* Stats */}
                  {adminFeedbackStats && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginBottom: 20 }}>
                      <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#fbbf24' }}>{adminFeedbackStats.avg_rating}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Rata-rata Rating</div>
                        <div style={{ fontSize: 20, marginTop: 4 }}>{'⭐'.repeat(Math.round(adminFeedbackStats.avg_rating || 0))}</div>
                      </div>
                      <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#be94f5' }}>{adminFeedbackStats.total}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Total Feedback</div>
                      </div>
                      {/* Distribusi bintang */}
                      {[5,4,3,2,1].map(star => (
                        <div key={star} style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 13, color: '#fbbf24', minWidth: 28 }}>{'⭐'.repeat(star)}</span>
                          <div style={{ flex: 1, background: '#1e293b', borderRadius: 4, height: 8 }}>
                            <div style={{ height: 8, borderRadius: 4, background: star >= 4 ? '#34d399' : star === 3 ? '#fbbf24' : '#f87171', width: `${adminFeedbackStats.total ? Math.round((adminFeedbackStats.dist?.[star]||0)/adminFeedbackStats.total*100) : 0}%` }}></div>
                          </div>
                          <span style={{ fontSize: 12, color: '#64748b', minWidth: 24 }}>{adminFeedbackStats.dist?.[star] || 0}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tabel rekapan */}
                  <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 16 }}>
                    <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14 }}>📋 Rekapan Feedback{!isSuperAdmin ? ' (Kelompokmu)' : ''}</p>
                    {adminFeedbackList.length > 0 ? (
                      <div className="nk-table-wrap" style={{ maxHeight: 400 }}>
                        <table className="nk-table">
                          <thead><tr><th>Nama</th>{isSuperAdmin && <th>Kelompok</th>}<th>Rating</th><th>Pesan</th><th>Waktu</th></tr></thead>
                          <tbody>{adminFeedbackList.map((f, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{f.name}</td>
                              {isSuperAdmin && <td>{f.group_name !== '-' ? <span className="nk-badge nk-badge-purple">🏢 {f.group_name}</span> : <span style={{ color: '#475569', fontSize: 12 }}>—</span>}</td>}
                              <td><span style={{ color: '#fbbf24' }}>{'⭐'.repeat(f.rating)}</span></td>
                              <td style={{ color: '#94a3b8', fontSize: 13, maxWidth: 260 }}>{f.message || <span style={{ color: '#334155', fontStyle: 'italic' }}>—</span>}</td>
                              <td style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>{f.created_at}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    ) : <p style={{ color: '#475569', fontSize: 13 }}>Belum ada feedback masuk.</p>}
                  </div>
                </AdminSection>
              )}

              {/* Admin — Refleksi Stats */}
              {adminSection === 'refleksi' && (
                <AdminSection title="📔 Statistik Refleksi Harian">
                  {adminReflectionStats ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                        <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
                          <div style={{ fontSize: 28, fontWeight: 800, color: '#be94f5' }}>{adminReflectionStats.today}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Refleksi Hari Ini</div>
                        </div>
                        <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
                          <div style={{ fontSize: 28, fontWeight: 800, color: '#38bdf8' }}>{adminReflectionStats.week}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>7 Hari Terakhir</div>
                        </div>
                        <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
                          <div style={{ fontSize: 28, fontWeight: 800, color: '#34d399' }}>{adminReflectionStats.unique_users}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Peserta Aktif</div>
                        </div>
                      </div>
                      {adminReflectionStats.top_users?.length > 0 && (
                        <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                          <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14 }}>🏆 Peserta Paling Konsisten (30 hari)</p>
                          {adminReflectionStats.top_users.map((u, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < adminReflectionStats.top_users.length - 1 ? '1px solid #1e2d45' : 'none' }}>
                              <span style={{ fontSize: 13 }}>{['🥇','🥈','🥉','4.','5.'][i]} {u.name}</span>
                              <span className="nk-badge nk-badge-purple">{u.count}x refleksi</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {adminReflectionStats.trend?.length > 0 && (
                        <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 16 }}>
                          <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14 }}>📈 Tren 7 Hari Terakhir</p>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
                            {adminReflectionStats.trend.map((d, i) => {
                              const max = Math.max(...adminReflectionStats.trend.map(x => x.count), 1);
                              const h = Math.round((d.count / max) * 60) + 8;
                              return (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                  <div style={{ fontSize: 10, color: '#64748b' }}>{d.count}</div>
                                  <div style={{ width: '100%', height: h, background: 'rgba(190,148,245,0.5)', borderRadius: 4 }}></div>
                                  <div style={{ fontSize: 9, color: '#475569' }}>{d.date.slice(5)}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {/* Tabel peserta */}
                      <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 16, marginTop: 16 }}>
                        <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14 }}>👥 Status Refleksi Peserta</p>
                        {adminReflectionStats.participants?.length > 0 ? (
                          <div className="nk-table-wrap" style={{ maxHeight: 340 }}>
                            <table className="nk-table">
                              <thead><tr><th>Nama</th><th>Kelompok</th><th>Jadwal Refleksi</th><th>Hari Ini</th><th>30 Hari</th></tr></thead>
                              <tbody>{adminReflectionStats.participants.map((p, i) => (
                                <tr key={i}>
                                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                                  <td>{p.group_name !== '-' ? <span className="nk-badge nk-badge-purple">🏢 {p.group_name}</span> : <span style={{ color: '#475569', fontSize: 12 }}>—</span>}</td>
                                  <td><span className="nk-badge" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>⏰ {p.reminder_time}</span></td>
                                  <td>{p.reflected_today
                                    ? <span className="nk-badge nk-badge-green">✅ Sudah</span>
                                    : <span className="nk-badge" style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>❌ Belum</span>}
                                  </td>
                                  <td><span className="nk-badge nk-badge-purple">{p.month_count}x</span></td>
                                </tr>
                              ))}</tbody>
                            </table>
                          </div>
                        ) : <p style={{ color: '#475569', fontSize: 13 }}>Belum ada peserta terdaftar.</p>}
                      </div>
                      <p style={{ fontSize: 12, color: '#475569', marginTop: 12, fontStyle: 'italic' }}>
                        💡 Isi refleksi bersifat privat — hanya peserta yang bisa membaca tulisannya sendiri.
                      </p>
                    </>
                  ) : <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>Memuat statistik...</div>}
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

              {/* Admin — Materi */}
              {adminSection === 'materi' && (
                <>
                  <AdminSection title="📚 Manajemen Materi Belajar">
                    {/* Form tambah/edit */}
                    <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                      <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>
                        {editingMateriId ? '✏️ Edit Materi' : '➕ Tambah Materi Baru'}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={fieldLbl}>Kategori</label>
                          <select value={materiCatId} onChange={e => setMateriCatId(e.target.value)} className="nk-input-sm" style={{ width: "100%" }}>
                            <option value="">-- Pilih Kategori --</option>
                            {adminCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={fieldLbl}>Tipe</label>
                          <select value={materiType} onChange={e => setMateriType(e.target.value)} className="nk-input-sm" style={{ width: "100%" }}>
                            <option value="text">📖 Bacaan (Teks)</option>
                            <option value="video">🎬 Video (URL)</option>
                            <option value="audio">🎵 Audio (URL)</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={fieldLbl}>Judul Materi</label>
                        <input value={materiTitle} onChange={e => setMateriTitle(e.target.value)} placeholder="Judul materi..." className="nk-input-sm" style={{ width: "100%" }} />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={fieldLbl}>{materiType === 'text' ? 'Isi Materi' : 'URL ' + (materiType === 'video' ? 'Video (YouTube/GDrive)' : 'Audio (MP3)')}</label>
                        {materiType === 'text'
                          ? <textarea value={materiContent} onChange={e => setMateriContent(e.target.value)} rows={5} placeholder="Tulis isi materi di sini..." style={{ width: "100%", resize: 'vertical' }} />
                          : <input value={materiContent} onChange={e => setMateriContent(e.target.value)} placeholder="https://..." className="nk-input-sm" style={{ width: "100%" }} />
                        }
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                        <div>
                          <label style={fieldLbl}>EXP Reward</label>
                          <input type="number" value={materiExp} onChange={e => setMateriExp(e.target.value)} className="nk-input-sm" style={{ width: "100%" }} />
                        </div>
                        <div>
                          <label style={fieldLbl}>Urutan</label>
                          <input type="number" value={materiOrder} onChange={e => setMateriOrder(e.target.value)} className="nk-input-sm" style={{ width: "100%" }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                          <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 14 }}>
                            <input type="checkbox" checked={materiActive} onChange={e => setMateriActive(e.target.checked)} />
                            Aktif
                          </label>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <BtnSm onClick={saveMateri} disabled={busy || !materiTitle || !materiCatId}>
                          {editingMateriId ? 'Simpan Perubahan' : 'Tambah Materi'}
                        </BtnSm>
                        {editingMateriId && <BtnSm onClick={resetMateriForm} style={{ background: '#334155' }}>Batal Edit</BtnSm>}
                      </div>
                    </div>

                    {/* Filter kategori + kelompok */}
                    <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <label style={{ fontSize: 13, color: '#94a3b8' }}>Filter:</label>
                      <select className="nk-input-sm" value={materiFilterGroup} onChange={e => { setMateriFilterGroup(e.target.value); setMateriFilterCat(''); }}>
                        {isSuperAdmin && <option value="">🌐 Global (Super Admin)</option>}
                        {adminGroups.map(g => <option key={g.id} value={String(g.id)}>🏢 {g.name}</option>)}
                      </select>
                      <select className="nk-input-sm" value={materiFilterCat} onChange={e => setMateriFilterCat(e.target.value)}>
                        <option value="">Semua Kategori</option>
                        {adminCategories
                          .filter(c => !materiFilterGroup || String(c.group_id) === materiFilterGroup || c.group_id === 0)
                          .map(c => <option key={c.id} value={String(c.id)}>{c.name}{c.group_name ? ` (${c.group_name})` : ''}</option>)}
                      </select>
                    </div>

                    {/* List materi */}
                    {adminMaterials
                      .filter(m => {
                        if (materiFilterCat && String(m.category_id) !== materiFilterCat) return false;
                        if (materiFilterGroup && String(m.group_id) !== materiFilterGroup) return false;
                        return true;
                      })
                      .map(m => {
                        const typeIcon = { text: '📖', video: '🎬', audio: '🎵' }[m.type] || '📄';
                        return (
                          <div key={m.id} style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 10, padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                                <span>{typeIcon}</span>
                                <span style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</span>
                                <span className="nk-badge nk-badge-purple">{m.category_name}</span>
                                {m.group_name ? <span className="nk-badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontSize: 11 }}>🏢 {m.group_name}</span> : <span className="nk-badge" style={{ background: '#1e293b', color: '#64748b', fontSize: 11 }}>🌐 Global</span>}
                                {!m.is_active && <span className="nk-badge" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: 11 }}>Nonaktif</span>}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 12 }}>
                                <span>+{m.exp_reward} EXP</span>
                                <span>Urutan: {m.order_no}</span>
                                <span>Selesai oleh: {m.completed_count} peserta</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <BtnSm onClick={() => startEditMateri(m)} style={{ background: '#1e40af', fontSize: 12 }}>Edit</BtnSm>
                              <BtnSm onClick={() => deleteMateri(m.id)} style={{ background: '#7f1d1d', fontSize: 12 }}>Hapus</BtnSm>
                            </div>
                          </div>
                        );
                      })
                    }
                    {adminMaterials.filter(m => {
                      if (materiFilterCat && String(m.category_id) !== materiFilterCat) return false;
                      if (materiFilterGroup && String(m.group_id) !== materiFilterGroup) return false;
                      return true;
                    }).length === 0 && (
                      <p style={{ fontSize: 13, color: '#64748b' }}>Belum ada materi. Tambahkan di atas!</p>
                    )}
                  </AdminSection>
                </>
              )}

              {/* Admin — Redeem */}
              {adminSection === 'redeem' && (
                <>
                  <AdminSection title="🎁 Manajemen Hadiah Redeem">
                    {/* Form tambah/edit */}
                    <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                      <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>
                        {editingRedeemId ? '✏️ Edit Hadiah' : '➕ Tambah Hadiah Baru'}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={fieldLbl}>Nama Hadiah</label>
                          <input className="nk-input" placeholder="Contoh: Voucher Gopay 50rb" value={redeemName} onChange={(e) => setRedeemName(e.target.value)} />
                        </div>
                        <div>
                          <label style={fieldLbl}>Harga Poin</label>
                          <input className="nk-input" type="number" min="1" placeholder="contoh: 500" value={redeemCost} onChange={(e) => setRedeemCost(e.target.value)} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={fieldLbl}>Deskripsi</label>
                        <input className="nk-input" placeholder="Keterangan singkat hadiah" value={redeemDesc} onChange={(e) => setRedeemDesc(e.target.value)} />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={fieldLbl}>Stok (-1 = unlimited)</label>
                        <input className="nk-input" type="number" min="-1" placeholder="-1" value={redeemStock} onChange={(e) => setRedeemStock(e.target.value)} />
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={fieldLbl}>Kelompok (kosong = semua)</label>
                        <select className="nk-input" value={redeemGroupId} onChange={e => setRedeemGroupId(e.target.value)}>
                          {isSuperAdmin && <option value="">🌐 Global (Super Admin)</option>}
                          {adminGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <BtnSm disabled={busy} onClick={saveRedeemItem}>{busy ? '...' : (editingRedeemId ? 'Update Hadiah' : '+ Tambah')}</BtnSm>
                        {editingRedeemId && <BtnSm disabled={busy} onClick={() => { setEditingRedeemId(''); setRedeemName(''); setRedeemDesc(''); setRedeemCost(''); setRedeemStock('-1'); setRedeemGroupId(''); }}>Batal</BtnSm>}
                      </div>
                    </div>

                    {/* Daftar hadiah */}
                    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
                      {adminRedeemItems.map((it) => (
                        <div key={it.id} style={{ border: '1px solid #1e2d45', borderRadius: 12, padding: 14, background: '#0b1220' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div style={{ fontWeight: 700 }}>{it.name}</div>
                            <span className={`nk-badge ${it.is_active ? 'nk-badge-green' : 'nk-badge-red'}`}>{it.is_active ? 'Aktif' : 'Nonaktif'}</span>
                          </div>
                          {it.description && <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>{it.description}</div>}
                          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                            <span className="nk-badge nk-badge-orange">💰 {it.point_cost} poin</span>
                            <span className={`nk-badge ${it.stock === -1 ? 'nk-badge-purple' : it.stock > 0 ? 'nk-badge-yellow' : 'nk-badge-red'}`}>
                              Stok: {it.stock === -1 ? '∞' : it.stock}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <BtnSm disabled={busy} onClick={() => startEditRedeem(it)}>Edit</BtnSm>
                            <BtnSm disabled={busy} onClick={() => deleteRedeemItem(it.id)} danger>Hapus</BtnSm>
                          </div>
                        </div>
                      ))}
                      {!adminRedeemItems.length && <div className="nk-empty">Belum ada hadiah. Tambahkan di atas!</div>}
                    </div>
                  </AdminSection>

                  <AdminSection title="📋 Klaim Masuk" style={{ marginTop: 14 }}>
                    {adminRedeemClaims.length ? (
                      <div className="nk-table-wrap" style={{ maxHeight: 480 }}>
                        <table className="nk-table" style={{ minWidth: 900 }}>
                          <thead><tr><th>Peserta</th><th>No. HP</th><th>Hadiah</th><th>Poin</th><th>Status</th><th>Catatan</th><th>Waktu</th><th>Aksi</th></tr></thead>
                          <tbody>{adminRedeemClaims.map((c) => (
                            <tr key={c.id}>
                              <td style={{ fontWeight: 600 }}>{c.user_name || '-'}</td>
                              <td style={{ color: '#94a3b8' }}>{c.user_phone || '-'}</td>
                              <td style={{ fontWeight: 600 }}>{c.item_name}</td>
                              <td><span className="nk-badge nk-badge-orange">{c.point_cost}</span></td>
                              <td>
                                <span className={`nk-badge ${c.status === 'approved' ? 'nk-badge-green' : c.status === 'rejected' ? 'nk-badge-red' : 'nk-badge-yellow'}`}>
                                  {c.status === 'approved' ? '✓ Disetujui' : c.status === 'rejected' ? '✗ Ditolak' : '⏳ Pending'}
                                </span>
                              </td>
                              <td style={{ color: '#94a3b8', fontSize: 13, maxWidth: 160 }}>{c.note || '-'}</td>
                              <td style={{ color: '#94a3b8', fontSize: 13 }}>{new Date(c.claimed_at).toLocaleString('id-ID')}</td>
                              <td>
                                {c.status === 'pending' ? (
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <BtnSm disabled={busy} onClick={() => { const note = prompt('Catatan (opsional):') || ''; redeemClaimAction(c.id, 'approve', note); }}>✓ Approve</BtnSm>
                                    <BtnSm disabled={busy} onClick={() => { const note = prompt('Alasan penolakan:') || ''; redeemClaimAction(c.id, 'reject', note); }} danger>✗ Tolak</BtnSm>
                                  </div>
                                ) : <span style={{ fontSize: 12, color: '#475569' }}>Selesai</span>}
                              </td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    ) : <div className="nk-empty">📋 Belum ada klaim masuk.</div>}
                  </AdminSection>
                </>
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
