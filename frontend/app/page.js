'use client';

import React, { useEffect, useState, useRef } from 'react';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'NalaNaikKelas_bot';

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
  const [showPassword, setShowPassword] = useState(false);
  // Ubah password peserta
  const [changePassForm, setChangePassForm] = useState({ old: '', new1: '', new2: '' });
  const [showChangePass, setShowChangePass] = useState(false);
  const [showPassOld, setShowPassOld] = useState(false);
  const [showPassNew, setShowPassNew] = useState(false);
  // Reset password admin
  const [resetPassUserId, setResetPassUserId] = useState(0);
  const [resetPassVal, setResetPassVal] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);

  const [history, setHistory] = useState({ quiz: [], tryout: [] });
  const [leaderboard, setLeaderboard] = useState([]);
  const [profile, setProfile] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState('');
  const [editNameLoading, setEditNameLoading] = useState(false);
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
  const [reminderMsg, setReminderMsg] = useState('');
  const [reminderLoading, setReminderLoading] = useState(false);
  // Render Markdown → HTML untuk web display
  function renderMD(md) {
    if (!md) return '';
    const lines = md.split('\n');
    let html = '';
    let inCode = false, codeLines = [];
    for (let line of lines) {
      if (line.startsWith('```')) {
        if (inCode) { html += `<pre style="background:#0a1628;border-radius:6px;padding:10px;overflow-x:auto;font-size:12px;color:#a5f3fc;margin:6px 0">${line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`; inCode = false; codeLines = []; }
        else inCode = true;
        continue;
      }
      if (inCode) { codeLines.push(line); html += `<pre style="background:#0a1628;border-radius:6px;padding:10px;overflow-x:auto;font-size:12px;color:#a5f3fc;margin:6px 0">${codeLines.join('\n').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`; continue; }
      if (line.trim() === '---' || line.trim() === '***') { html += '<hr style="border:none;border-top:1px solid #1e2d45;margin:10px 0"/>'; continue; }
      if (line.startsWith('# ')) { html += `<p style="font-weight:800;font-size:16px;color:#f1f5f9;margin:10px 0 4px">📌 ${inlineMD(line.slice(2))}</p>`; continue; }
      if (line.startsWith('## ')) { html += `<p style="font-weight:700;font-size:15px;color:#e2e8f0;margin:8px 0 4px">${inlineMD(line.slice(3))}</p>`; continue; }
      if (line.startsWith('### ')) { html += `<p style="font-weight:700;font-size:14px;color:#cbd5e1;margin:6px 0 2px">${inlineMD(line.slice(4))}</p>`; continue; }
      if (line.startsWith('> ')) { html += `<div style="border-left:3px solid #7c3aed;padding:4px 10px;margin:4px 0;color:#94a3b8;font-style:italic;font-size:13px">${inlineMD(line.slice(2))}</div>`; continue; }
      if (line.startsWith('- ') || line.startsWith('* ')) { html += `<div style="display:flex;gap:6px;margin:2px 0;font-size:13px"><span style="color:#7c3aed;flex-shrink:0">•</span><span>${inlineMD(line.slice(2))}</span></div>`; continue; }
      const numMatch = line.match(/^(\d+)\. (.+)/);
      if (numMatch) { html += `<div style="display:flex;gap:6px;margin:2px 0;font-size:13px"><span style="color:#7c3aed;flex-shrink:0;font-weight:700">${numMatch[1]}.</span><span>${inlineMD(numMatch[2])}</span></div>`; continue; }
      if (line.trim() === '') { html += '<div style="height:6px"></div>'; continue; }
      html += `<p style="margin:3px 0;font-size:13px;line-height:1.7;color:#94a3b8">${inlineMD(line)}</p>`;
    }
    return html;
  }
  function inlineMD(s) {
    s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    // [[Backlink]] → bold berwarna, klik via event delegation (data-backlink)
    s = s.replace(/\[\[(.+?)\]\]/g, '<span class="nk-backlink" data-backlink="$1" style="color:#60a5fa;font-weight:700;cursor:pointer;border-bottom:1px solid rgba(96,165,250,0.4);padding-bottom:1px">$1</span>');
    // #tag → berwarna ungu
    s = s.replace(/(^|\s)#([\w\u00C0-\u024F]+)/g, '$1<span style="color:#a78bfa;font-weight:600">#$2</span>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>');
    s = s.replace(/__(.+?)__/g, '<strong style="color:#e2e8f0">$1</strong>');
    s = s.replace(/~~(.+?)~~/g, '<s>$1</s>');
    s = s.replace(/_(.+?)_/g, '<em>$1</em>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    s = s.replace(/`(.+?)`/g, '<code style="background:#1e2d45;padding:1px 5px;border-radius:4px;font-size:12px;color:#a5f3fc">$1</code>');
    return s;
  }

  const [openCats, setOpenCats] = useState({});
  const [openMateri, setOpenMateri] = useState({});
  const [myBadges, setMyBadges] = useState([]);
  const [adminBadges, setAdminBadges] = useState([]);
  const [adminBadgeAwards, setAdminBadgeAwards] = useState([]);
  const [badgeForm, setBadgeForm] = useState({ id: 0, name: '', description: '', icon_url: '', badge_type: 'manual', trigger_key: '', is_active: true });
  const [badgeAwardForm, setBadgeAwardForm] = useState({ user_id: 0, badge_id: 0, note: '' });
  const [adminFeedbackStats, setAdminFeedbackStats] = useState(null);
  const [adminFeedbackList, setAdminFeedbackList] = useState([]);
  const [adminFeedbackSchedule, setAdminFeedbackSchedule] = useState({ send_time: '09:00', is_active: false });
  const [fbScheduleTime, setFbScheduleTime] = useState('09:00');
  const [fbScheduleDate, setFbScheduleDate] = useState('');
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
  const [materiBubbles, setMateriBubbles] = useState(['']);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGroupDesc, setAiGroupDesc] = useState('');
  const [aiShowDesc, setAiShowDesc] = useState(false);
  const [qAiGenerating, setQAiGenerating] = useState(false);
  const [qAiCatId, setQAiCatId] = useState('');
  const [qAiMateriId, setQAiMateriId] = useState('');
  const [qAiCategoryMateri, setQAiCategoryMateri] = useState([]);
  const [qAiGenerated, setQAiGenerated] = useState([]);
  const [qAiChecked, setQAiChecked] = useState([]);
  const [qAiSaving, setQAiSaving] = useState(false);

  // Notes
  const [notes, setNotes] = useState([]);
  const [notesAllTags, setNotesAllTags] = useState([]);
  const [notesTagFilter, setNotesTagFilter] = useState('');
  const [notesSearch, setNotesSearch] = useState('');
  const [activeNote, setActiveNote] = useState(null); // {id,title,content,tags,backlinks}
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState({ title: '', content: '' });
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteView, setNoteView] = useState('list'); // 'list' | 'editor' | 'graph'
  const [noteAutocomplete, setNoteAutocomplete] = useState([]); // [[title suggestions
  const [graphData, setGraphData] = useState(null);
  const [tryoutConfigs, setTryoutConfigs] = useState([]);
  const [tryoutNewName, setTryoutNewName] = useState('');
  const [tryoutExpandedId, setTryoutExpandedId] = useState(null);
  const [tryoutAddCatId, setTryoutAddCatId] = useState('');
  const [tryoutAddQCount, setTryoutAddQCount] = useState('10');
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

  // ── CRITICAL: hanya data yang diperlukan saat halaman buka ──────────────────
  async function loadParticipant() {
    const [mRes, pRes, matRes] = await Promise.all([
      fetch(`${apiBase}/participant/me`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/points`, { credentials: 'include' }),
      fetch(`${apiBase}/participant/materials`, { credentials: 'include' }),
    ]);
    if (mRes.ok) { const pd = await mRes.json(); setProfile(pd); if (pd.reflection_reminder_time) setReflectionReminderTime(pd.reflection_reminder_time); }
    if (pRes.ok) setMyPoints((await pRes.json()).balance || 0);
    if (matRes.ok) setMyMaterials((await matRes.json()).items || []);
  }

  // ── LAZY: load data per section saat dikunjungi ──────────────────────────────
  const [loadedSections, setLoadedSections] = useState({});

  async function loadSection(section) {
    if (loadedSections[section]) return;
    setLoadedSections(prev => ({...prev, [section]: true}));
    if (section === 'profil') {
      const [rRes, bdgRes] = await Promise.all([
        fetch(`${apiBase}/participant/reminder`, { credentials: 'include' }),
        fetch(`${apiBase}/participant/badges`, { credentials: 'include' }),
      ]);
      if (rRes.ok) setMyReminder(await rRes.json());
      if (bdgRes.ok) setMyBadges((await bdgRes.json()).items || []);
    } else if (section === 'badges') {
      const bdgRes2 = await fetch(`${apiBase}/participant/badges`, { credentials: 'include' });
      if (bdgRes2.ok) setMyBadges((await bdgRes2.json()).items || []);
    } else if (section === 'quiz') {
      const hRes = await fetch(`${apiBase}/participant/history`, { credentials: 'include' });
      if (hRes.ok) setHistory(await hRes.json());
    } else if (section === 'redeem') {
      const [riRes, rcRes] = await Promise.all([
        fetch(`${apiBase}/participant/redeem/items`, { credentials: 'include' }),
        fetch(`${apiBase}/participant/redeem/claims`, { credentials: 'include' }),
      ]);
      if (riRes.ok) setRedeemItems((await riRes.json()).items || []);
      if (rcRes.ok) setRedeemClaims((await rcRes.json()).items || []);
    } else if (section === 'poin') {
      const phRes = await fetch(`${apiBase}/participant/points/history`, { credentials: 'include' });
      if (phRes.ok) setMyPointHistory((await phRes.json()).items || []);
    } else if (section === 'refleksi') {
      const refRes = await fetch(`${apiBase}/participant/reflections`, { credentials: 'include' });
      if (refRes.ok) setMyReflections((await refRes.json()).items || []);
    } else if (section === 'leaderboard') {
      const lRes = await fetch(`${apiBase}/participant/leaderboard`, { credentials: 'include' });
      if (lRes.ok) setLeaderboard((await lRes.json()).items || []);
    } else if (section === 'catatan') {
      await refreshNotes();
    }
  }

  async function refreshNotes(tag = notesTagFilter, q = notesSearch) {
    let url = `${apiBase}/participant/notes`;
    const params = [];
    if (tag) params.push(`tag=${encodeURIComponent(tag)}`);
    if (q) params.push(`q=${encodeURIComponent(q)}`);
    if (params.length) url += '?' + params.join('&');
    const res = await fetch(url, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setNotes(data.notes || []);
      setNotesAllTags(data.all_tags || []);
    }
  }

  async function loadNoteDetail(id) {
    const res = await fetch(`${apiBase}/participant/notes?id=${id}`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setActiveNote(data);
      setNoteDraft({ title: data.title, content: data.content });
      setNoteEditing(false);
      setNoteView('editor');
    }
  }

  async function saveNote() {
    setNoteSaving(true);
    const isNew = !activeNote?.id;
    const isFleeting = activeNote?.note_type === 'fleeting';
    // Fleeting yang di-edit → promote ke permanent
    const action = isNew ? 'create' : (isFleeting ? 'promote' : 'update');
    const body = { action, title: noteDraft.title, content: noteDraft.content };
    if (!isNew) body.id = activeNote.id;
    const res = await fetch(`${apiBase}/participant/notes`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    setNoteSaving(false);
    if (data.ok) {
      const noteId = isNew ? data.id : activeNote.id;
      await refreshNotes();
      await loadNoteDetail(noteId);
    }
  }

  async function deleteNote(id) {
    if (!confirm('Hapus catatan ini?')) return;
    await fetch(`${apiBase}/participant/notes`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    });
    setActiveNote(null); setNoteView('list');
    await refreshNotes();
  }

  async function loadGraph() {
    const res = await fetch(`${apiBase}/participant/notes/graph`, { credentials: 'include' });
    if (res.ok) { setGraphData(await res.json()); setNoteView('graph'); }
  }

  async function loadAdmin() {
    // Critical admin data — participants, categories, questions
    const [pRes, cRes, qRes] = await Promise.all([
      fetch(`${apiBase}/admin/participants`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/categories`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/questions`, { credentials: 'include' }),
    ]);
    if (pRes.ok) setParticipants((await pRes.json()).items || []);
    if (cRes.ok) { const cd = await cRes.json(); setCategories(cd.categories || cd.items || []); setAdminCategories(cd.categories || cd.items || []); }
    if (qRes.ok) setQuestions((await qRes.json()).items || []);
    // Load materi & groups (dipakai di banyak section)
    const [amRes, grpRes] = await Promise.all([
      fetch(`${apiBase}/admin/materials`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/groups`, { credentials: 'include' }),
    ]);
    if (amRes.ok) setAdminMaterials((await amRes.json()).items || []);
    if (grpRes.ok) setAdminGroups((await grpRes.json()).items || []);
  }

  const [loadedAdminSections, setLoadedAdminSections] = useState({});

  async function loadAdminSection(section) {
    if (loadedAdminSections[section]) return;
    setLoadedAdminSections(prev => ({...prev, [section]: true}));
    if (section === 'poin') {
      const [phRes2, pbRes] = await Promise.all([
        fetch(`${apiBase}/admin/points/history`, { credentials: 'include' }),
        fetch(`${apiBase}/admin/points/balances`, { credentials: 'include' }),
      ]);
      if (phRes2.ok) setAdminPointHistory((await phRes2.json()).items || []);
      if (pbRes.ok) setAdminPointBalances((await pbRes.json()).items || []);
    } else if (section === 'exp') {
      const [erRes, ehRes, esRes, ersRes] = await Promise.all([
        fetch(`${apiBase}/admin/exp/rules`, { credentials: 'include' }),
        fetch(`${apiBase}/admin/exp/history`, { credentials: 'include' }),
        fetch(`${apiBase}/admin/exp/status`, { credentials: 'include' }),
        fetch(`${apiBase}/admin/exp/report-setting`, { credentials: 'include' }),
      ]);
      if (erRes.ok) setAdminExpRules((await erRes.json()).items || []);
      if (ehRes.ok) setAdminExpHistory((await ehRes.json()).items || []);
      if (esRes.ok) setAdminExpStatus((await esRes.json()).items || []);
      if (ersRes.ok) setExpReportSetting(await ersRes.json());
    } else if (section === 'redeem') {
      const [ariRes, arcRes] = await Promise.all([
        fetch(`${apiBase}/admin/redeem/items`, { credentials: 'include' }),
        fetch(`${apiBase}/admin/redeem/claims`, { credentials: 'include' }),
      ]);
      if (ariRes.ok) setAdminRedeemItems((await ariRes.json()).items || []);
      if (arcRes.ok) setAdminRedeemClaims((await arcRes.json()).items || []);
    } else if (section === 'refleksi') {
      const refStatsRes = await fetch(`${apiBase}/admin/reflections/stats`, { credentials: 'include' });
      if (refStatsRes.ok) setAdminReflectionStats(await refStatsRes.json());
    } else if (section === 'badges') {
      const badgesRes = await fetch(`${apiBase}/admin/badges`, { credentials: 'include' });
      if (badgesRes.ok) { const bd = await badgesRes.json(); setAdminBadges(bd.items||[]); setAdminBadgeAwards(bd.awards||[]); }
    } else if (section === 'feedback') {
      const [fbStatsRes, fbListRes, fbSchedRes] = await Promise.all([
        fetch(`${apiBase}/admin/feedback/stats`, { credentials: 'include' }),
        fetch(`${apiBase}/admin/feedback/list`, { credentials: 'include' }),
        fetch(`${apiBase}/admin/feedback/schedule`, { credentials: 'include' }),
      ]);
      if (fbStatsRes.ok) setAdminFeedbackStats(await fbStatsRes.json());
      if (fbListRes.ok) setAdminFeedbackList((await fbListRes.json()).items || []);
      if (fbSchedRes.ok) {
        const sc = await fbSchedRes.json();
        setAdminFeedbackSchedule(sc); setFbScheduleTime(sc.send_time||'09:00');
        setFbScheduleDate(sc.send_date||''); setFbScheduleActive(sc.is_active||false);
      }
    } else if (section === 'jadwal') {
      const [remRes, lsRes] = await Promise.all([
        fetch(`${apiBase}/admin/reminders`, { credentials: 'include' }),
        fetch(`${apiBase}/admin/learning-summary`, { credentials: 'include' }),
      ]);
      if (remRes.ok) setAdminReminders((await remRes.json()).items || []);
      if (lsRes.ok) setAdminLearningSummary(await lsRes.json());
    } else if (section === 'tryout') {
      const res = await fetch(`${apiBase}/admin/tryout-configs`, { credentials: 'include' });
      if (res.ok) setTryoutConfigs((await res.json()).configs || []);
    }
  }

  async function refreshTryoutConfigs() {
    const res = await fetch(`${apiBase}/admin/tryout-configs`, { credentials: 'include' });
    if (res.ok) setTryoutConfigs((await res.json()).configs || []);
  }

  async function loadPortal(role) {
    await loadParticipant();
    if (role === 'admin' || role === 'super_admin') await refreshAdmin();
    await loadSection('profil');
  }

  async function refreshAdmin() {
    setLoadedAdminSections({});
    await loadAdmin();
    await loadAdminSection(adminSection);
  }
  async function refreshParticipant() {
    setLoadedSections({});
    await loadParticipant();
    await loadSection(participantSection);
  }

  useEffect(() => {
    (async () => {
      try {
        const u = await fetchMe();
        setMe(u);
        if (u) await loadPortal(u.role);
      } catch(e) {
        console.error('Portal load error:', e);
      } finally {
        setLoading(false);
      }
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

  function showMsg(msg, type = 'success') {
    setActionType(type);
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 5000);
  }

  async function resetPassword(userId) {
    setBusy(true); setActionMsg('');
    await fetch(`${apiBase}/admin/participants/reset-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ user_id: userId })
    });
    await refreshAdmin();
    setActionType('success'); setActionMsg('Password peserta berhasil direset.'); setBusy(false);
  }

  async function toggleRole(p) {
    setBusy(true); setActionMsg('');
    const nextRole = p.role === 'admin' ? 'participant' : 'admin';
    await fetch(`${apiBase}/admin/participants/set-role`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ user_id: p.id, role: nextRole })
    });
    await refreshAdmin();
    setActionType('success'); setActionMsg(`Role ${p.phone} diubah ke ${nextRole}.`); setBusy(false);
  }

  async function toggleActive(p) {
    setBusy(true); setActionMsg('');
    await fetch(`${apiBase}/admin/participants/toggle-active`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ user_id: p.id, is_active: !p.is_active })
    });
    await refreshAdmin();
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
    await refreshAdmin();
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
    await refreshAdmin();
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
    await refreshAdmin();
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
    await refreshAdmin();
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
    await refreshAdmin();
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
    await refreshAdmin(); await refreshParticipant();
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
    await refreshAdmin(); await refreshParticipant();
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
    await refreshAdmin(); await refreshParticipant();
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
    await refreshAdmin();
    setActionType('success'); setActionMsg('Setting laporan EXP berhasil disimpan.'); setBusy(false);
  }

  async function updateExpRule(ruleKey, ruleValue) {
    setBusy(true); setActionMsg('');
    const res = await fetch(`${apiBase}/admin/exp/rules`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ rule_key: ruleKey, rule_value: Number(ruleValue), point_bonus: Number(document.getElementById(`rule-pb-${ruleKey}`)?.value || 0) })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal update rule EXP.'); setBusy(false); return; }
    await refreshAdmin();
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
    await refreshParticipant();
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
    await refreshAdmin();
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
    await refreshAdmin();
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
    await refreshAdmin();
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
      type: materiType,
      content: materiType === 'text'
        ? (materiBubbles.filter(b => b.trim()).length > 1
            ? JSON.stringify(materiBubbles.filter(b => b.trim()))
            : (materiBubbles[0] || ''))
        : materiContent,
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
    await refreshAdmin();
    setActionType('success'); setActionMsg(isEdit ? 'Materi diperbarui!' : 'Materi ditambahkan!'); setBusy(false);
  }

  function resetMateriForm() {
    setEditingMateriId(''); setMateriCatId(''); setMateriTitle('');
    setMateriType('text'); setMateriContent(''); setMateriExp('10');
    setMateriOrder('0'); setMateriActive(true); setMateriBubbles(['']);
  }

  function startEditMateri(m) {
    setEditingMateriId(String(m.id)); setMateriCatId(String(m.category_id));
    setMateriTitle(m.title); setMateriType(m.type);
    // Parse bubbles jika JSON array
    if (m.type === 'text' && m.content?.startsWith('[')) {
      try { setMateriBubbles(JSON.parse(m.content)); } catch { setMateriBubbles([m.content]); }
    } else { setMateriBubbles([m.content || '']); }
    setMateriContent(m.content);
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
    if (res.ok) { await refreshAdmin(); setActionType('success'); setActionMsg('Materi dihapus.'); }
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
              <div style={{ position: 'relative' }}>
                <input
                  className="nk-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: 42 }}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 18, lineHeight: 1, padding: 0 }}
                  title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
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
              Belum punya akun? Daftar via bot Telegram{' '}
              <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener noreferrer"
                style={{ color: '#fff', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
                Nala
              </a>
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
          <div className="nk-portal-layout">

            {/* Sidebar Peserta */}
            <aside className="nk-sidebar">
              <p className="nk-sidebar-label" style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 12px 8px' }}>Menu</p>
              {[
                ['profil',    '👤', 'Profil'],
                ['catatan',   '📝', 'Catatan'],
                ['materi',    '📚', 'Materi'],
                ['quiz',      '🧠', 'Quiz & Tryout'],
                ['redeem',    '🎁', 'Redeem'],
                ['poin',      '💰', 'Poin'],
                ['refleksi',  '📔', 'Refleksi'],
                ['badges',    '🎖️', 'Badges'],
                ['leaderboard','🏆','Leaderboard'],
              ].map(([key, icon, label]) => (
                <button key={key} onClick={() => { setParticipantSection(key); loadSection(key); }} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                  border: participantSection === key ? '1px solid rgba(190,148,245,0.3)' : '1px solid transparent',
                  background: participantSection === key ? 'rgba(190,148,245,0.12)' : 'transparent',
                  color: participantSection === key ? '#be94f5' : '#94a3b8',
                  fontWeight: participantSection === key ? 700 : 500,
                  fontSize: 13, textAlign: 'left', transition: 'all 160ms ease', width: '100%'
                }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <span className="nav-label"> {label}</span>
                </button>
              ))}
            </aside>

            {/* Content Peserta */}
            <div className="nk-main-content">

            {/* ── Profil ── */}
            {participantSection === 'profil' && (<>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 14 }}>

              <div className="nk-stat-card purple">
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>👤 Profil</div>
                {editingName ? (
                  <div style={{ marginBottom: 8 }}>
                    <input autoFocus value={editNameVal} onChange={e => setEditNameVal(e.target.value)}
                      onKeyDown={async e => {
                        if (e.key === 'Enter') e.target.blur();
                        if (e.key === 'Escape') setEditingName(false);
                      }}
                      style={{ width: '100%', padding: '6px 10px', background: '#0a1628', border: '1px solid #3b82f6', borderRadius: 8, color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 6 }} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button disabled={editNameLoading || !editNameVal.trim()} onClick={async () => {
                        if (!editNameVal.trim()) return;
                        setEditNameLoading(true);
                        const res = await fetch(`${apiBase}/participant/me`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editNameVal.trim() }) });
                        const data = await res.json();
                        setEditNameLoading(false);
                        if (data.ok) { setProfile(p => ({ ...p, name: data.name })); setEditingName(false); }
                        else alert(data.error || 'Gagal update nama');
                      }} style={{ flex: 1, padding: '5px 0', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        {editNameLoading ? 'Menyimpan...' : '💾 Simpan'}
                      </button>
                      <button onClick={() => setEditingName(false)} style={{ flex: 1, padding: '5px 0', background: 'transparent', color: '#94a3b8', border: '1px solid #1e2d45', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>Batal</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{profile?.name || '-'}</span>
                    <button onClick={() => { setEditNameVal(profile?.name || ''); setEditingName(true); }}
                      style={{ background: 'none', border: '1px solid #1e3a5f', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: 11, color: '#64748b' }}>✏️ Edit</button>
                  </div>
                )}
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

              {/* Link ke Bot Nala */}
              <a href={`https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME || 'NalaNaikKelas_bot'}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg, rgba(0,136,204,0.15), rgba(0,136,204,0.05))', border: '1px solid rgba(0,136,204,0.25)', borderRadius: 14, padding: '14px 18px', textDecoration: 'none', cursor: 'pointer' }}>
                <span style={{ fontSize: 26 }}>✈️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#38bdf8' }}>Buka Bot Nala di Telegram</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Quiz, tryout, catatan sementara & pengingat belajar</div>
                </div>
                <span style={{ marginLeft: 'auto', color: '#38bdf8', fontSize: 18 }}>→</span>
              </a>

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

            {/* Ubah Password */}
            {participantSection === 'profil' && (
              <Section title="🔒 Keamanan Akun">
                {!showChangePass ? (
                  <button onClick={() => setShowChangePass(true)}
                    style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#818cf8', padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                    🔑 Ubah Password
                  </button>
                ) : (
                  <div style={{ maxWidth: 400 }}>
                    {/* Password lama */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Password Lama</div>
                      <div style={{ position: 'relative' }}>
                        <input type={showPassOld ? 'text' : 'password'} className="nk-input-sm" style={{ width: '100%', paddingRight: 40 }}
                          value={changePassForm.old} onChange={e => setChangePassForm(f=>({...f, old: e.target.value}))} placeholder="Masukkan password lama" />
                        <button type="button" onClick={() => setShowPassOld(p=>!p)}
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 16 }}>
                          {showPassOld ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>
                    {/* Password baru */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Password Baru <span style={{ color: '#475569' }}>(min. 6 karakter)</span></div>
                      <div style={{ position: 'relative' }}>
                        <input type={showPassNew ? 'text' : 'password'} className="nk-input-sm" style={{ width: '100%', paddingRight: 40 }}
                          value={changePassForm.new1} onChange={e => setChangePassForm(f=>({...f, new1: e.target.value}))} placeholder="Password baru" />
                        <button type="button" onClick={() => setShowPassNew(p=>!p)}
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 16 }}>
                          {showPassNew ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>
                    {/* Konfirmasi */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Konfirmasi Password Baru</div>
                      <input type="password" className="nk-input-sm" style={{ width: '100%' }}
                        value={changePassForm.new2} onChange={e => setChangePassForm(f=>({...f, new2: e.target.value}))} placeholder="Ulangi password baru" />
                      {changePassForm.new2 && changePassForm.new1 !== changePassForm.new2 && (
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#f87171' }}>⚠️ Password tidak cocok</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <BtnSm color="purple" disabled={busy || changePassForm.new1 !== changePassForm.new2 || changePassForm.new1.length < 6}
                        onClick={async () => {
                          setBusy(true);
                          const res = await fetch(`${apiBase}/participant/change-password`, {
                            method: 'POST', credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ old_password: changePassForm.old, new_password: changePassForm.new1 })
                          });
                          const d = await res.json().catch(()=>({}));
                          setBusy(false);
                          if (res.ok) { showMsg('Password berhasil diubah ✅', 'success'); setShowChangePass(false); setChangePassForm({old:'',new1:'',new2:''}); }
                          else showMsg(d.error || 'Gagal ubah password', 'error');
                        }}>💾 Simpan Password</BtnSm>
                      <BtnSm onClick={() => { setShowChangePass(false); setChangePassForm({old:'',new1:'',new2:''}); }}>Batal</BtnSm>
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* ── Poin ── */}
            {/* Badges di profil — preview 3 terbaru */}
            {participantSection === 'profil' && myBadges.length > 0 && (
              <Section title="🎖️ Badges Saya">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: myBadges.length > 3 ? 12 : 0 }}>
                  {myBadges.slice(0, 6).map((b, i) => (
                    <div key={i} title={`${b.name}${b.description ? ` — ${b.description}` : ''}${b.note ? `\n📝 ${b.note}` : ''}\n📅 ${b.awarded_at}`}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: '12px 14px', width: 90, textAlign: 'center', cursor: 'default', transition: 'border-color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor='#7c3aed'}
                      onMouseLeave={e => e.currentTarget.style.borderColor='#1e2d45'}>
                      {b.icon_url ? <img src={b.icon_url} alt={b.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} /> : <span style={{ fontSize: 32 }}>🎖️</span>}
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.3 }}>{b.name}</span>
                      <span style={{ fontSize: 10, color: '#475569' }}>{b.awarded_at}</span>
                    </div>
                  ))}
                </div>
                {myBadges.length > 6 && <button onClick={() => { setParticipantSection('badges'); loadSection('badges'); }} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: 13, cursor: 'pointer', padding: 0 }}>Lihat semua {myBadges.length} badges →</button>}
              </Section>
            )}

            {/* ── Badges ── */}
            {participantSection === 'badges' && (
              <Section title="🎖️ Koleksi Badges">
                {myBadges.length > 0 ? (
                  <>
                    <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>Kamu punya <b style={{ color: '#a78bfa' }}>{myBadges.length} badge</b> 🎉</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 14 }}>
                      {myBadges.map((b, i) => (
                        <div key={i} style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 14, padding: 16, textAlign: 'center', transition: 'all 0.2s', cursor: 'default' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor='#7c3aed'; e.currentTarget.style.transform='translateY(-2px)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor='#1e2d45'; e.currentTarget.style.transform='none'; }}>
                          {b.icon_url
                            ? <img src={b.icon_url} alt={b.name} style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', marginBottom: 10 }} onError={e => { e.target.style.display='none'; e.target.insertAdjacentHTML('afterend','<span style="font-size:48px;display:block;margin-bottom:10px">🎖️</span>'); }} />
                            : <span style={{ fontSize: 48, display: 'block', marginBottom: 10 }}>🎖️</span>}
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0', marginBottom: 4 }}>{b.name}</div>
                          {b.description && <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, lineHeight: 1.4 }}>{b.description}</div>}
                          {b.note && <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginBottom: 6 }}>📝 {b.note}</div>}
                          <span className={`nk-badge ${b.badge_type === 'auto' ? 'nk-badge-blue' : 'nk-badge-purple'}`} style={{ fontSize: 10 }}>
                            {b.badge_type === 'auto' ? '⚡ Otomatis' : '🏅 Manual'}
                          </span>
                          <div style={{ fontSize: 10, color: '#334155', marginTop: 8 }}>📅 {b.awarded_at}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>🎖️</div>
                    <p style={{ color: '#475569', fontSize: 14, fontWeight: 600 }}>Belum ada badge</p>
                    <p style={{ color: '#334155', fontSize: 13 }}>Selesaikan materi, quiz, tryout, dan refleksi untuk mendapat badge otomatis!</p>
                  </div>
                )}
              </Section>
            )}

            {participantSection === 'poin' && (<>
            <Section title="💰 Riwayat Poin">
              {myPointHistory.length ? (
                <div className="nk-table-wrap" style={{ maxHeight: 280, overflowX: 'scroll', overflowY: 'auto', display: 'block', width: '100%', WebkitOverflowScrolling: 'touch' }}>
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
                <div className="nk-table-wrap" style={{ maxHeight: 280, overflowX: 'scroll', overflowY: 'auto', display: 'block', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                  <table className="nk-table" >
                    <thead><tr><th>#</th><th>Nama</th><th>Badges</th><th>Telegram</th><th>Waktu Terbaik</th><th>Perfect</th></tr></thead>
                    <tbody>{leaderboard.map((it) => (
                      <tr key={it.rank}>
                        <td>
                          <span style={{ fontWeight: 700, color: it.rank === 1 ? '#fccc42' : it.rank === 2 ? '#94a3b8' : it.rank === 3 ? '#cd7c3c' : '#e5e7eb' }}>
                            {it.rank === 1 ? '🥇' : it.rank === 2 ? '🥈' : it.rank === 3 ? '🥉' : `#${it.rank}`}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{it.name}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {(it.badges || []).map((b, bi) => (
                              b.icon_url
                                ? <img key={bi} src={b.icon_url} alt={b.name} title={b.name} style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} onError={e => { e.target.style.display='none'; }} />
                                : <span key={bi} title={b.name} style={{ fontSize: 18 }}>🎖️</span>
                            ))}
                            {(!it.badges || it.badges.length === 0) && <span style={{ color: '#334155', fontSize: 12 }}>—</span>}
                          </div>
                        </td>
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

            {/* ── Catatan Pribadi ── */}
            {participantSection === 'catatan' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Toolbar */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={() => { setActiveNote(null); setNoteDraft({ title: '', content: '' }); setNoteEditing(true); setNoteView('editor'); }}
                    style={{ padding: '7px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                    ✏️ Catatan Baru
                  </button>
                  <button onClick={() => setNoteView('list')}
                    style={{ padding: '7px 12px', background: noteView === 'list' ? '#1e3a5f' : 'transparent', color: noteView === 'list' ? '#93c5fd' : '#64748b', border: '1px solid #1e2d45', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                    📋 Daftar
                  </button>
                  <button onClick={loadGraph}
                    style={{ padding: '7px 12px', background: noteView === 'graph' ? '#1e3a5f' : 'transparent', color: noteView === 'graph' ? '#93c5fd' : '#64748b', border: '1px solid #1e2d45', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                    🕸️ Graph
                  </button>
                  <input value={notesSearch} onChange={e => { setNotesSearch(e.target.value); refreshNotes(notesTagFilter, e.target.value); }}
                    placeholder="🔍 Cari catatan..." className="nk-input-sm" style={{ flex: 1, minWidth: 140 }} />
                </div>

                {/* Tag filter */}
                {notesAllTags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    <button onClick={() => { setNotesTagFilter(''); refreshNotes(''); }}
                      style={{ padding: '3px 10px', borderRadius: 20, border: '1px solid', borderColor: !notesTagFilter ? '#3b82f6' : '#1e2d45', background: !notesTagFilter ? '#1e3a5f' : 'transparent', color: !notesTagFilter ? '#93c5fd' : '#64748b', fontSize: 12, cursor: 'pointer' }}>
                      Semua
                    </button>
                    {notesAllTags.map(t => (
                      <button key={t} onClick={() => { setNotesTagFilter(t); refreshNotes(t); }}
                        style={{ padding: '3px 10px', borderRadius: 20, border: '1px solid', borderColor: notesTagFilter === t ? '#a78bfa' : '#1e2d45', background: notesTagFilter === t ? 'rgba(167,139,250,0.15)' : 'transparent', color: notesTagFilter === t ? '#a78bfa' : '#64748b', fontSize: 12, cursor: 'pointer' }}>
                        #{t}
                      </button>
                    ))}
                  </div>
                )}

                {/* LIST VIEW */}
                {noteView === 'list' && (() => {
                  const permanent = notes.filter(n => n.note_type !== 'fleeting');
                  const fleeting = notes.filter(n => n.note_type === 'fleeting');
                  return (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {notes.length === 0 && <div className="nk-empty">📝 Belum ada catatan. Buat yang pertama atau kirim /catatan di bot Nala!</div>}

                      {/* Catatan Permanen */}
                      {permanent.length > 0 && (
                        <div>
                          <p style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' }}>📌 Catatan Permanen ({permanent.length})</p>
                          <div style={{ display: 'grid', gap: 6 }}>
                            {permanent.map(n => (
                              <div key={n.id} onClick={() => loadNoteDetail(n.id)}
                                style={{ background: '#0f172a', border: `1px solid ${activeNote?.id === n.id ? '#3b82f6' : '#1e2d45'}`, borderRadius: 10, padding: '11px 14px', cursor: 'pointer' }}>
                                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{n.title}</div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                  {n.tags.map(t => <span key={t} style={{ fontSize: 11, color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '1px 7px', borderRadius: 10 }}>#{t}</span>)}
                                  <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>{new Date(n.updated_at).toLocaleDateString('id-ID')}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Catatan Sementara */}
                      {fleeting.length > 0 && (
                        <div>
                          <p style={{ fontSize: 11, color: '#78716c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' }}>⚡ Catatan Sementara dari Bot ({fleeting.length})</p>
                          <div style={{ display: 'grid', gap: 6 }}>
                            {fleeting.map(n => (
                              <div key={n.id}
                                style={{ background: '#13110e', border: '1px solid #2c2520', borderRadius: 10, padding: '11px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, color: '#a8a29e', marginBottom: 4, lineHeight: 1.5 }}>{n.title}</div>
                                    <span style={{ fontSize: 11, color: '#57534e' }}>{new Date(n.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                    <button onClick={e => { e.stopPropagation(); loadNoteDetail(n.id); }}
                                      style={{ padding: '4px 10px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                                      📌 Jadikan Permanen
                                    </button>
                                    <button onClick={async e => { e.stopPropagation(); if (!confirm('Hapus catatan sementara ini?')) return; await deleteNote(n.id); }}
                                      style={{ padding: '4px 8px', background: 'transparent', color: '#78716c', border: '1px solid #2c2520', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>
                                      🗑
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* EDITOR VIEW */}
                {noteView === 'editor' && (
                  <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, overflow: 'hidden' }}>
                    {/* Header editor */}
                    <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderBottom: '1px solid #1e2d45', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button onClick={() => setNoteView('list')} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 0 }}>←</button>
                      <input value={noteDraft.title} onChange={e => { setNoteDraft(d => ({ ...d, title: e.target.value })); setNoteEditing(true); }}
                        placeholder="Judul catatan..." style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontWeight: 700, fontSize: 16, outline: 'none', minWidth: 100 }} />
                      {noteEditing && (
                        <button onClick={saveNote} disabled={noteSaving}
                          style={{ padding: '5px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                          {noteSaving ? 'Menyimpan...' : '💾 Simpan'}
                        </button>
                      )}
                      {activeNote?.id && !noteEditing && (
                        <>
                          <button onClick={() => setNoteEditing(true)}
                            style={{ padding: '5px 12px', background: 'transparent', color: '#94a3b8', border: '1px solid #1e2d45', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>✏️ Edit</button>
                          <button onClick={() => deleteNote(activeNote.id)}
                            style={{ padding: '5px 12px', background: 'transparent', color: '#ef4444', border: '1px solid #3f1f1f', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>🗑</button>
                        </>
                      )}
                    </div>

                    {/* Konten editor / preview */}
                    {noteEditing ? (
                      <div style={{ position: 'relative' }}>
                        <textarea value={noteDraft.content}
                          onChange={e => {
                            const val = e.target.value;
                            setNoteDraft(d => ({ ...d, content: val }));
                            // Autocomplete [[
                            const cur = e.target.selectionStart;
                            const before = val.slice(0, cur);
                            const m = before.match(/\[\[([^\]]{0,40})$/);
                            if (m) {
                              const q2 = m[1].toLowerCase();
                              setNoteAutocomplete(notes.filter(n2 => n2.id !== activeNote?.id && n2.title.toLowerCase().includes(q2)).slice(0, 5));
                            } else {
                              setNoteAutocomplete([]);
                            }
                          }}
                          placeholder={'Tulis catatan dalam Markdown...\n\nBacklink: [[Judul Catatan Lain]]\nTag: #topik #belajar'}
                          style={{ width: '100%', minHeight: 320, padding: '14px 16px', background: '#080d18', border: 'none', color: '#e2e8f0', fontSize: 14, fontFamily: 'monospace', resize: 'vertical', outline: 'none', lineHeight: 1.7, boxSizing: 'border-box' }} />
                        {/* Autocomplete dropdown */}
                        {noteAutocomplete.length > 0 && (
                          <div style={{ position: 'absolute', bottom: '100%', left: 16, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, overflow: 'hidden', zIndex: 100, minWidth: 200 }}>
                            {noteAutocomplete.map(sug => (
                              <div key={sug.id} onClick={() => {
                                const idx = noteDraft.content.lastIndexOf('[[');
                                if (idx < 0) { setNoteAutocomplete([]); return; }
                                const before = noteDraft.content.slice(0, idx);
                                const after = noteDraft.content.slice(idx + 2).replace(/^[^\]]*/, '').replace(/^\]\]/, '');
                                setNoteDraft(d => ({ ...d, content: before + '[[' + sug.title + ']] ' + after }));
                                setNoteAutocomplete([]);
                              }}
                                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: '#e2e8f0', borderBottom: '1px solid #1e2d45' }}
                                onMouseEnter={e => e.target.style.background = '#2d3f5a'}
                                onMouseLeave={e => e.target.style.background = 'transparent'}>
                                📝 {sug.title}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '14px 16px', minHeight: 200 }}>
                        <div style={{ lineHeight: 1.8, fontSize: 14, color: '#e2e8f0' }}
                          onClick={async e => {
                            const bl = e.target.closest('[data-backlink]');
                            if (!bl) return;
                            const title = bl.getAttribute('data-backlink');
                            const res = await fetch(`${apiBase}/participant/notes`, { credentials: 'include' });
                            if (!res.ok) return;
                            const data = await res.json();
                            const found = (data.notes || []).find(n => n.title === title);
                            if (found) loadNoteDetail(found.id);
                          }}
                          dangerouslySetInnerHTML={{ __html: renderMD(activeNote?.content || '') }} />
                        {/* Backlinks */}
                        {activeNote?.backlinks?.length > 0 && (
                          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #1e2d45' }}>
                            <p style={{ fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>🔗 Ditautkan dari:</p>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {activeNote.backlinks.map(bl => (
                                <span key={bl.id} onClick={() => loadNoteDetail(bl.id)}
                                  style={{ fontSize: 12, color: '#60a5fa', background: 'rgba(96,165,250,0.1)', padding: '3px 10px', borderRadius: 10, cursor: 'pointer', border: '1px solid rgba(96,165,250,0.2)' }}>
                                  📝 {bl.title}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Tags */}
                        {activeNote?.tags?.length > 0 && (
                          <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {activeNote.tags.map(t => (
                              <span key={t} style={{ fontSize: 12, color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '2px 9px', borderRadius: 10 }}>#{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* GRAPH VIEW */}
                {noteView === 'graph' && graphData && (
                  <NoteGraph nodes={graphData.nodes} edges={graphData.edges} onNodeClick={loadNoteDetail} />
                )}
                {noteView === 'graph' && !graphData && (
                  <div className="nk-empty">Memuat graph...</div>
                )}
                {noteView === 'graph' && graphData?.nodes?.length === 0 && (
                  <div className="nk-empty">🕸️ Belum ada catatan untuk ditampilkan di graph.</div>
                )}
              </div>
            )}

            {/* ── Quiz & Tryout ── */}
            {participantSection === 'quiz' && (<>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 14 }}>
              <Section title="🧠 Riwayat Quiz">
                {(history.quiz || []).length ? (
                  <div className="nk-table-wrap" style={{ maxHeight: 280, overflowX: 'scroll', overflowY: 'auto', display: 'block', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                    <table className="nk-table" >
                      <thead><tr style={{ whiteSpace: 'nowrap' }}><th>Kategori</th><th>Attempt</th><th>Salah</th><th>Total</th><th>Status</th></tr></thead>
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
                  <div className="nk-table-wrap" style={{ maxHeight: 280, overflowX: 'scroll', overflowY: 'auto', display: 'block', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                    <table className="nk-table" >
                      <thead><tr style={{ whiteSpace: 'nowrap' }}><th>Benar</th><th>Total</th><th>Durasi</th><th>Kecepatan</th><th>Status</th></tr></thead>
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
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>📚 Materi Belajar</h2>
                {/* Ringkasan total progress */}
                {(() => {
                  const total = (myMaterials||[]).length;
                  const done = (myMaterials||[]).filter(m=>m.is_completed).length;
                  const pct = total ? Math.round(done/total*100) : 0;
                  return total > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 100, height: 6, background: '#1e2d45', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct===100?'#22c55e':'#be94f5', borderRadius: 99, transition: 'width 0.4s' }} />
                      </div>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{done}/{total} selesai ({pct}%)</span>
                    </div>
                  ) : null;
                })()}
              </div>

              {(() => {
                const catMap = {};
                (myMaterials||[]).forEach(m => {
                  if (!catMap[m.category_name]) catMap[m.category_name] = [];
                  catMap[m.category_name].push(m);
                });
                const cats = Object.entries(catMap);
                if (cats.length === 0) return <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: 40 }}>Belum ada materi tersedia.</p>;
                const typeIcon = { text: '📖', video: '🎬', audio: '🎵' };

                return cats.map(([catName, items], ci) => {
                  const done = items.filter(m => m.is_completed).length;
                  const pct = Math.round(done/items.length*100);
                  const isOpen = openCats[catName] !== false; // default buka kategori pertama, tutup sisanya
                  const catIsOpen = ci === 0 ? (openCats[catName] !== false) : !!openCats[catName];

                  return (
                    <div key={catName} style={{ background: '#0f172a', border: `1px solid ${pct===100?'rgba(34,197,94,0.3)':'#1e2d45'}`, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
                      {/* Header kategori — klik untuk buka/tutup */}
                      <button onClick={() => setOpenCats(prev => ({...prev, [catName]: !catIsOpen}))}
                        style={{ width: '100%', background: 'none', border: 'none', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                        {/* Icon status */}
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{pct===100 ? '✅' : '📂'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: pct===100?'#4ade80':'#f1f5f9', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth: '60%' }}>{catName}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              <span className={`nk-badge ${pct===100?'nk-badge-green':done>0?'nk-badge-purple':'nk-badge-red'}`} style={{ fontSize: 11 }}>{done}/{items.length} selesai</span>
                              <span style={{ color: '#475569', fontSize: 14 }}>{catIsOpen ? '▲' : '▼'}</span>
                            </div>
                          </div>
                          {/* Mini progress bar */}
                          <div style={{ height: 4, background: '#1e2d45', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct===100?'#22c55e':'#be94f5', borderRadius: 99, transition: 'width 0.4s' }} />
                          </div>
                        </div>
                      </button>

                      {/* List materi — hanya tampil saat buka */}
                      {catIsOpen && (
                        <div style={{ padding: '0 16px 14px' }}>
                          {items.map((m, mi) => {
                            const mKey = `${catName}-${m.id}`;
                            const mOpen = !!openMateri[mKey];
                            return (
                              <div key={m.id} style={{ borderTop: '1px solid #1e2d45', paddingTop: 10, marginTop: 10 }}>
                                {/* Baris materi — klik untuk buka konten */}
                                <button onClick={() => setOpenMateri(prev => ({...prev, [mKey]: !mOpen}))}
                                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: 0 }}>
                                  <span style={{ fontSize: 18, flexShrink: 0 }}>{m.is_completed ? '✅' : typeIcon[m.type] || '📄'}</span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: m.is_completed?'#64748b':'#f1f5f9', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.title}</div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                                      <span style={{ fontSize: 11, color: '#475569' }}>+{m.exp_reward} EXP</span>
                                      {m.is_completed && <span style={{ fontSize: 11, color: '#22c55e' }}>Sudah selesai</span>}
                                    </div>
                                  </div>
                                  <span style={{ color: '#334155', fontSize: 12, flexShrink: 0 }}>{mOpen ? '▲ Tutup' : '▼ Baca'}</span>
                                </button>

                                {/* Konten materi — hanya tampil saat diklik */}
                                {mOpen && (
                                  <div style={{ marginTop: 12 }}>
                                    {m.type === 'text' && (() => {
                                      let bubbles = [m.content];
                                      if (m.content?.startsWith('[')) { try { bubbles = JSON.parse(m.content); } catch {} }
                                      return bubbles.map((bubble, bi) => (
                                        <div key={bi} style={{ background: '#0a1628', border: '1px solid #1e2d45', borderRadius: 10, padding: '12px 14px', marginBottom: bi < bubbles.length-1 ? 8 : 0 }}
                                          dangerouslySetInnerHTML={{ __html: renderMD(bubble) }} />
                                      ));
                                    })()}
                                    {(m.type === 'video' || m.type === 'audio') && (
                                      <a href={m.content} target="_blank" rel="noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, padding: '10px 16px', fontSize: 14, color: '#be94f5', textDecoration: 'none' }}>
                                        {m.type === 'video' ? '🎬 Tonton Video' : '🎵 Dengarkan Audio'}
                                      </a>
                                    )}
                                    {!m.is_completed && (
                                      <button onClick={() => completeMaterial(m.id)} disabled={busy}
                                        style={{ marginTop: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, color: '#4ade80', padding: '8px 16px', fontSize: 13, cursor: 'pointer', width: '100%', fontWeight: 600 }}>
                                        ✅ Tandai Selesai
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
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
                <div className="nk-table-wrap" style={{ maxHeight: 280, overflowX: 'scroll', overflowY: 'auto', display: 'block', width: '100%', WebkitOverflowScrolling: 'touch' }}>
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
          <div className="nk-admin-layout">
            {/* Sidebar */}
            <aside className="nk-admin-sidebar">
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
                  ...(me?.is_super_admin ? [['kelompok', '🏢', 'Kelompok']] : []),
                  ['peserta', '👥', 'Peserta'],
                  ['bank', '📚', 'Bank Soal'],
                  ['tryout', '🎯', 'Tryout'],
                  ['materi', '📖', 'Materi'],
                  ['redeem', '🎁', 'Redeem'],
                  ['refleksi', '📔', 'Refleksi'],
                  ['badges', '🎖️', 'Badges'],
                  ['feedback', '💬', 'Feedback'],
                  ['jadwal', '📅', 'Jadwal Belajar'],
                  ['poin', '💰', 'Poin'],
                  ['exp', '⭐', 'EXP'],
                ].map(([key, icon, label]) => (
                  <button
                    key={key}
                    onClick={() => { setAdminSection(key); loadAdminSection(key); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                      border: adminSection === key ? '1px solid rgba(190,148,245,0.3)' : '1px solid transparent',
                      background: adminSection === key ? 'rgba(190,148,245,0.12)' : 'transparent',
                      color: adminSection === key ? '#be94f5' : '#94a3b8',
                      fontWeight: adminSection === key ? 700 : 500,
                      fontSize: 14, textAlign: 'left', transition: 'all 160ms ease', width: '100%'
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <span className="nav-label">{label}</span>
                  </button>
                ))}
              </nav>
            </aside>

            {/* Content */}
            <div className="nk-admin-content">

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
                          await refreshAdmin();
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
                              if (res.ok) { showMsg('Kelompok dihapus', 'success'); await refreshAdmin(); }
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
                    <div className="nk-table-wrap" style={{ maxHeight: 520, overflowX: 'scroll', overflowY: 'auto', display: 'block', width: '100%', WebkitOverflowScrolling: 'touch' }}>
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
                                <BtnSm disabled={busy} onClick={() => { setResetPassUserId(p.id); setResetPassVal(''); setShowResetPass(true); }}>🔑 Reset Pass</BtnSm>
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

              {/* Modal Reset Password — di luar AdminSection */}
              {showResetPass && adminSection === 'peserta' && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                  <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 16, padding: 24, width: '100%', maxWidth: 380 }}>
                    <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: 16 }}>🔑 Reset Password Peserta</p>
                    <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b' }}>
                      Peserta: <b style={{ color: '#f1f5f9' }}>{participants.find(p=>p.id===resetPassUserId)?.name || `#${resetPassUserId}`}</b>
                    </p>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Password Baru <span style={{ color: '#475569' }}>(min. 6 karakter)</span></div>
                      <div style={{ position: 'relative' }}>
                        <input type={showResetPass === 'show' ? 'text' : 'password'} className="nk-input-sm" style={{ width: '100%', paddingRight: 40 }}
                          value={resetPassVal} onChange={e => setResetPassVal(e.target.value)} placeholder="Ketik password baru..." autoFocus />
                        <button type="button" onClick={() => setShowResetPass(p => p === 'show' ? true : 'show')}
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 16 }}>
                          {showResetPass === 'show' ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <BtnSm color="purple" disabled={busy || resetPassVal.length < 6}
                        onClick={async () => {
                          setBusy(true);
                          const res = await fetch(`${apiBase}/admin/participants/reset-password`, {
                            method: 'POST', credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ user_id: resetPassUserId, new_password: resetPassVal })
                          });
                          const d = await res.json().catch(()=>({}));
                          setBusy(false);
                          if (res.ok) { showMsg('Password berhasil direset ✅', 'success'); setShowResetPass(false); }
                          else showMsg(d.error || 'Gagal reset password', 'error');
                        }}>💾 Reset Password</BtnSm>
                      <BtnSm onClick={() => setShowResetPass(false)}>Batal</BtnSm>
                    </div>
                  </div>
                </div>
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
                    <div className="nk-grid-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
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
                    {/* AI Generate Soal */}
                    <div style={{ background: '#0a1e3a', border: '1px dashed #2563eb', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                      <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#93c5fd' }}>✨ Generate Soal dengan AI</p>
                      <div className="nk-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <div>
                          <label style={fieldLbl}>Kategori Soal</label>
                          <select className="nk-input-sm" style={{ width: '100%' }} value={qAiCatId}
                            onChange={async e => {
                              const catId = e.target.value;
                              setQAiCatId(catId);
                              setQAiMateriId('');
                              setQAiCategoryMateri([]);
                              setQAiGenerated([]);
                              setQAiChecked([]);
                              if (!catId) return;
                              const res = await fetch(`${apiBase}/admin/materials?category_id=${catId}`, { credentials: 'include' });
                              const data = await res.json();
                              setQAiCategoryMateri(data.items || []);
                            }}>
                            <option value="">-- Pilih Kategori --</option>
                            {categories.filter(c => isSuperAdmin || c.group_id > 0).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={fieldLbl}>Materi Sumber <span style={{ color: '#64748b' }}>(opsional)</span></label>
                          <select className="nk-input-sm" style={{ width: '100%' }} value={qAiMateriId} onChange={e => { setQAiMateriId(e.target.value); setQAiGenerated([]); setQAiChecked([]); }}>
                            <option value="">-- Semua Materi Kategori --</option>
                            {qAiCategoryMateri.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: qAiGenerated.length ? 12 : 0 }}>
                        {[5, 10, 15].map(n => (
                          <button key={n} type="button" disabled={qAiGenerating || !qAiCatId}
                            onClick={async () => {
                              if (!qAiCatId) { alert('Pilih kategori dulu!'); return; }
                              setQAiGenerating(true); setQAiGenerated([]); setQAiChecked([]);
                              try {
                                const res = await fetch(`${apiBase}/admin/questions/generate`, {
                                  method: 'POST', credentials: 'include',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ category_id: Number(qAiCatId), materi_id: Number(qAiMateriId) || 0, question_count: n })
                                });
                                const data = await res.json();
                                if (data.questions?.length > 0) {
                                  setQAiGenerated(data.questions);
                                  setQAiChecked(data.questions.map((_, i) => i));
                                } else alert('Gagal generate: ' + (data.error || 'Unknown'));
                              } catch(e) { alert('Error: ' + e.message); }
                              setQAiGenerating(false);
                            }}
                            style={{ flex: '1 1 80px', minWidth: 80, padding: '7px 0', background: qAiGenerating || !qAiCatId ? '#1e3a5f' : '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: qAiGenerating || !qAiCatId ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, opacity: !qAiCatId ? 0.5 : 1 }}>
                            {qAiGenerating ? '⏳ Generating...' : `✨ ${n} Soal`}
                          </button>
                        ))}
                      </div>
                      {!qAiCatId && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>Pilih kategori dulu sebelum generate soal.</p>}
                      {/* Preview hasil generate */}
                      {qAiGenerated.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                              {qAiGenerated.length} soal dihasilkan — <span style={{ color: '#4ade80' }}>{qAiChecked.length} dipilih</span>
                            </p>
                            <button type="button" onClick={() => setQAiChecked(qAiChecked.length === qAiGenerated.length ? [] : qAiGenerated.map((_,i) => i))}
                              style={{ fontSize: 11, color: '#93c5fd', background: 'none', border: '1px solid #1e3a5f', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}>
                              {qAiChecked.length === qAiGenerated.length ? 'Batal Semua' : 'Pilih Semua'}
                            </button>
                          </div>
                          {qAiGenerated.map((q, i) => (
                            <div key={i} onClick={() => setQAiChecked(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                              style={{ background: qAiChecked.includes(i) ? '#0d2744' : '#0f172a', border: `1px solid ${qAiChecked.includes(i) ? '#2563eb' : '#1e3a5f'}`, borderRadius: 8, padding: '10px 12px', marginBottom: 8, cursor: 'pointer', transition: 'all 0.15s' }}>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <span style={{ fontSize: 16, marginTop: 1 }}>{qAiChecked.includes(i) ? '✅' : '⬜'}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{i+1}. {q.question_text}</span>
                              </div>
                              <div style={{ marginTop: 6, paddingLeft: 26, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                                {['a','b','c','d'].map(opt => (
                                  <div key={opt} style={{ fontSize: 12, color: q.correct_option?.toLowerCase() === opt ? '#4ade80' : '#94a3b8', display: 'flex', gap: 4 }}>
                                    <span style={{ fontWeight: 700, minWidth: 14 }}>{opt.toUpperCase()}.</span>
                                    <span>{q[`option_${opt}`]}</span>
                                    {q.correct_option?.toLowerCase() === opt && <span>✓</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          <button type="button" disabled={qAiSaving || qAiChecked.length === 0}
                            onClick={async () => {
                              const selected = qAiGenerated.filter((_, i) => qAiChecked.includes(i));
                              if (!selected.length) { alert('Pilih minimal 1 soal!'); return; }
                              setQAiSaving(true);
                              let saved = 0;
                              for (const q of selected) {
                                const res = await fetch(`${apiBase}/admin/questions`, {
                                  method: 'POST', credentials: 'include',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'create', category_id: Number(qAiCatId), question_text: q.question_text, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_option: q.correct_option?.toUpperCase(), is_active: true })
                                });
                                if (res.ok) saved++;
                              }
                              setQAiSaving(false);
                              setQAiGenerated([]); setQAiChecked([]);
                              alert(`✅ ${saved} soal berhasil disimpan ke bank soal!`);
                              const r2 = await fetch(`${apiBase}/admin/questions`, { credentials: 'include' });
                              const d2 = await r2.json();
                              setQuestions(d2.items || []);
                            }}
                            style={{ width: '100%', padding: '9px 0', background: qAiChecked.length === 0 ? '#1e3a5f' : '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: qAiChecked.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, opacity: qAiChecked.length === 0 ? 0.5 : 1 }}>
                            {qAiSaving ? '💾 Menyimpan...' : `💾 Simpan ${qAiChecked.length} Soal Terpilih ke Bank Soal`}
                          </button>
                        </div>
                      )}
                    </div>

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

              {/* Admin — Tryout Config */}
              {adminSection === 'tryout' && (
                <AdminSection title="🎯 Manajemen Tryout">
                  <p style={{ margin: '0 0 14px', fontSize: 13, color: '#94a3b8' }}>
                    Atur soal yang akan digunakan dalam tryout bot per kelompok. Admin hanya bisa mengelola config kelompoknya sendiri.
                  </p>
                  {/* Buat Config Baru */}
                  <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                    <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600 }}>➕ Buat Config Tryout Baru</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="nk-input-sm" style={{ flex: 1 }} placeholder="Nama config (misal: Tryout Bulan Maret)" value={tryoutNewName} onChange={e => setTryoutNewName(e.target.value)} />
                      <BtnSm disabled={busy || !tryoutNewName.trim()} onClick={async () => {
                        setBusy(true);
                        const res = await fetch(`${apiBase}/admin/tryout-configs`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', name: tryoutNewName }) });
                        setBusy(false);
                        if (res.ok) { setTryoutNewName(''); await refreshTryoutConfigs(); }
                        else alert('Gagal membuat config');
                      }}>+ Buat</BtnSm>
                    </div>
                  </div>

                  {/* List Config */}
                  {tryoutConfigs.length === 0 && <div className="nk-empty">Belum ada config tryout.</div>}
                  {tryoutConfigs.map(cfg => (
                    <div key={cfg.id} style={{ background: '#0f172a', border: `1px solid ${cfg.is_active ? '#1d4ed8' : '#1e2d45'}`, borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
                      {/* Header */}
                      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setTryoutExpandedId(tryoutExpandedId === cfg.id ? null : cfg.id)}>
                        <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{cfg.name}</span>
                        {cfg.group_name && <span className="nk-badge nk-badge-purple" style={{ fontSize: 11 }}>🏢 {cfg.group_name}</span>}
                        <span className={`nk-badge ${cfg.is_active ? 'nk-badge-green' : ''}`} style={{ fontSize: 11, background: cfg.is_active ? '' : '#1e293b', color: cfg.is_active ? '' : '#64748b' }}>{cfg.is_active ? '✅ Aktif' : '⏸ Nonaktif'}</span>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>{cfg.items.length} kategori · {cfg.items.reduce((s,i) => s+i.question_count, 0)} soal total</span>
                        <span style={{ color: '#64748b' }}>{tryoutExpandedId === cfg.id ? '▲' : '▼'}</span>
                      </div>
                      {/* Detail */}
                      {tryoutExpandedId === cfg.id && (
                        <div style={{ borderTop: '1px solid #1e2d45', padding: '12px 14px' }}>
                          {/* Aksi config */}
                          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                            <BtnSm onClick={async () => {
                              const active = !cfg.is_active;
                              await fetch(`${apiBase}/admin/tryout-configs`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', id: cfg.id, is_active: active }) });
                              await refreshTryoutConfigs();
                            }}>{cfg.is_active ? '⏸ Nonaktifkan' : '✅ Aktifkan'}</BtnSm>
                            <BtnSm danger onClick={async () => {
                              if (!confirm('Hapus config ini?')) return;
                              await fetch(`${apiBase}/admin/tryout-configs`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: cfg.id }) });
                              await refreshTryoutConfigs(); setTryoutExpandedId(null);
                            }}>🗑 Hapus Config</BtnSm>
                          </div>

                          {/* Daftar kategori soal */}
                          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Kategori Soal dalam Tryout ini:</p>
                          {cfg.items.length === 0 && <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Belum ada kategori. Tambahkan di bawah.</p>}
                          {cfg.items.map(item => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #1a2535' }}>
                              <span style={{ flex: 1, fontSize: 13 }}>📚 {item.category_name}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input type="number" min="1" defaultValue={item.question_count} style={{ width: 52, padding: '3px 6px', background: '#0a1628', border: '1px solid #1e2d45', borderRadius: 6, color: '#fff', fontSize: 12 }}
                                  onBlur={async e => {
                                    const n = parseInt(e.target.value);
                                    if (!n || n === item.question_count) return;
                                    await fetch(`${apiBase}/admin/tryout-configs`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_item', item_id: item.id, question_count: n }) });
                                    await refreshTryoutConfigs();
                                  }} />
                                <span style={{ fontSize: 11, color: '#64748b' }}>soal</span>
                                <BtnSm danger onClick={async () => {
                                  await fetch(`${apiBase}/admin/tryout-configs`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove_item', item_id: item.id }) });
                                  await refreshTryoutConfigs();
                                }}>✕</BtnSm>
                              </div>
                            </div>
                          ))}

                          {/* Tambah kategori */}
                          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            <select className="nk-input-sm" style={{ flex: 1, minWidth: 150 }} value={tryoutAddCatId} onChange={e => setTryoutAddCatId(e.target.value)}>
                              <option value="">-- Pilih Kategori --</option>
                              {categories.filter(c => !cfg.items.find(i => i.category_id === c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <input type="number" min="1" placeholder="Jml soal" value={tryoutAddQCount} onChange={e => setTryoutAddQCount(e.target.value)}
                              className="nk-input-sm" style={{ width: 80 }} />
                            <BtnSm disabled={!tryoutAddCatId} onClick={async () => {
                              if (!tryoutAddCatId) return;
                              const res = await fetch(`${apiBase}/admin/tryout-configs`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add_item', config_id: cfg.id, category_id: Number(tryoutAddCatId), question_count: Number(tryoutAddQCount) || 10 }) });
                              const data = await res.json();
                              if (data.ok) { setTryoutAddCatId(''); setTryoutAddQCount('10'); await refreshTryoutConfigs(); }
                              else alert(data.error || 'Gagal menambah kategori');
                            }}>+ Tambah</BtnSm>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </AdminSection>
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
                        <div className="nk-table-wrap" style={{ maxHeight: 380, overflowX: 'scroll', overflowY: 'auto', display: 'block', width: '100%', WebkitOverflowScrolling: 'touch' }}>
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
                        <div className="nk-table-wrap" style={{ maxHeight: 240, overflowX: 'scroll', overflowY: 'auto', display: 'block', width: '100%', WebkitOverflowScrolling: 'touch' }}>
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
                      <table className="nk-table" >
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
                    <div className="nk-table-wrap" style={{ maxHeight: 380, overflowX: 'scroll', overflowY: 'auto', display: 'block', width: '100%', WebkitOverflowScrolling: 'touch' }}>
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

              {/* Admin — Badges */}
              {adminSection === 'badges' && (
                <AdminSection title="🎖️ Manajemen Badges">

                  {/* Form buat/edit badge */}
                  <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                    <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14 }}>{badgeForm.id ? '✏️ Edit Badge' : '➕ Buat Badge Baru'}</p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                      <div style={{ flex: '1 1 200px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Nama Badge *</div>
                        <input className="nk-input-sm" style={{ width: '100%' }} value={badgeForm.name} onChange={e => setBadgeForm(f=>({...f, name: e.target.value}))} placeholder="cth: Juara Quiz" />
                      </div>
                      <div style={{ flex: '1 1 200px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Deskripsi</div>
                        <input className="nk-input-sm" style={{ width: '100%' }} value={badgeForm.description} onChange={e => setBadgeForm(f=>({...f, description: e.target.value}))} placeholder="cth: Meraih nilai sempurna 5x" />
                      </div>
                      <div style={{ flex: '1 1 220px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Link Gambar (URL)</div>
                        <input className="nk-input-sm" style={{ width: '100%' }} value={badgeForm.icon_url} onChange={e => setBadgeForm(f=>({...f, icon_url: e.target.value}))} placeholder="https://i.imgur.com/..." />
                      </div>
                      <div style={{ flex: '0 0 140px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Tipe</div>
                        <select className="nk-input-sm" style={{ width: '100%' }} value={badgeForm.badge_type} onChange={e => setBadgeForm(f=>({...f, badge_type: e.target.value}))}>
                          <option value="manual">Manual</option>
                          <option value="auto">Otomatis</option>
                        </select>
                      </div>
                      {badgeForm.badge_type === 'auto' && (
                        <div style={{ flex: '1 1 180px' }}>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Trigger Key</div>
                          <select className="nk-input-sm" style={{ width: '100%' }} value={badgeForm.trigger_key} onChange={e => setBadgeForm(f=>({...f, trigger_key: e.target.value}))}>
                            <option value="">-- Pilih --</option>
                            <option value="materi_all_done">Selesai semua materi</option>
                            <option value="quiz_perfect_5">Quiz sempurna 5x</option>
                            <option value="tryout_perfect_3">Tryout sempurna 3x</option>
                            <option value="reflection_streak_7">Refleksi 7 hari berturut</option>
                            <option value="leaderboard_top3">Top 3 Leaderboard</option>
                            <option value="feedback_submit">Kirim feedback</option>
                          </select>
                        </div>
                      )}
                    </div>
                    {/* Preview gambar */}
                    {badgeForm.icon_url && (
                      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src={badgeForm.icon_url} alt="preview" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', border: '2px solid #1e2d45' }} onError={e => e.target.style.display='none'} />
                        <span style={{ fontSize: 12, color: '#64748b' }}>Preview gambar</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <BtnSm color="purple" disabled={busy} onClick={async () => {
                        if (!badgeForm.name.trim()) return showMsg('Nama badge wajib diisi', 'error');
                        setBusy(true);
                        const res = await fetch(`${apiBase}/admin/badges`, {
                          method: 'POST', credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(badgeForm)
                        });
                        setBusy(false);
                        if (res.ok) { showMsg(badgeForm.id ? 'Badge diupdate ✅' : 'Badge dibuat ✅', 'success'); setBadgeForm({ id: 0, name: '', description: '', icon_url: '', badge_type: 'manual', trigger_key: '', is_active: true }); await refreshAdmin(); }
                        else showMsg('Gagal simpan badge', 'error');
                      }}>{badgeForm.id ? '💾 Update Badge' : '➕ Buat Badge'}</BtnSm>
                      {badgeForm.id > 0 && <BtnSm onClick={() => setBadgeForm({ id: 0, name: '', description: '', icon_url: '', badge_type: 'manual', trigger_key: '', is_active: true })}>Batal</BtnSm>}
                    </div>
                  </div>

                  {/* Daftar badge */}
                  <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                    <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14 }}>📋 Daftar Badge ({adminBadges.length})</p>
                    {adminBadges.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {adminBadges.map(b => (
                          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0d1b2e', borderRadius: 10, padding: '10px 14px', border: '1px solid #1e2d45' }}>
                            {b.icon_url ? <img src={b.icon_url} alt={b.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} /> : <div style={{ width: 44, height: 44, borderRadius: 8, background: '#1e2d45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎖️</div>}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{b.name}</div>
                              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{b.description}</div>
                              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                <span className={`nk-badge ${b.badge_type === 'auto' ? 'nk-badge-blue' : 'nk-badge-purple'}`}>{b.badge_type === 'auto' ? '⚡ Otomatis' : '👤 Manual'}</span>
                                {b.trigger_key && <span className="nk-badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{b.trigger_key}</span>}
                                <span className="nk-badge" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>🏅 {b.awarded_count} penerima</span>
                                <span className={`nk-badge ${b.is_active ? 'nk-badge-green' : 'nk-badge-red'}`}>{b.is_active ? '● Aktif' : '○ Nonaktif'}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <BtnSm onClick={() => setBadgeForm({ id: b.id, name: b.name, description: b.description, icon_url: b.icon_url, badge_type: b.badge_type, trigger_key: b.trigger_key, is_active: b.is_active })}>✏️</BtnSm>
                              <BtnSm color="red" disabled={busy} onClick={async () => {
                                if (!confirm(`Hapus badge "${b.name}"?`)) return;
                                setBusy(true);
                                await fetch(`${apiBase}/admin/badges`, { method: 'DELETE', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: b.id }) });
                                setBusy(false); await refreshAdmin();
                              }}>🗑️</BtnSm>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p style={{ color: '#475569', fontSize: 13 }}>Belum ada badge. Buat yang pertama! 🎖️</p>}
                  </div>

                  {/* Form kasih badge ke peserta */}
                  <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                    <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14 }}>🏅 Berikan Badge ke Peserta</p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div style={{ flex: '1 1 180px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Peserta</div>
                        <select className="nk-input-sm" style={{ width: '100%' }} value={badgeAwardForm.user_id} onChange={e => setBadgeAwardForm(f=>({...f, user_id: Number(e.target.value)}))}>
                          <option value={0}>-- Pilih Peserta --</option>
                          {(participants || []).map(p => <option key={p.id} value={p.id}>{p.name} {p.group_name ? `(${p.group_name})` : ''}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: '1 1 180px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Badge</div>
                        <select className="nk-input-sm" style={{ width: '100%' }} value={badgeAwardForm.badge_id} onChange={e => setBadgeAwardForm(f=>({...f, badge_id: Number(e.target.value)}))}>
                          <option value={0}>-- Pilih Badge --</option>
                          {adminBadges.filter(b=>b.is_active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: '1 1 200px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Catatan (opsional)</div>
                        <input className="nk-input-sm" style={{ width: '100%' }} value={badgeAwardForm.note} onChange={e => setBadgeAwardForm(f=>({...f, note: e.target.value}))} placeholder="cth: Juara 1 Lomba Quiz Maret 2026" />
                      </div>
                      <BtnSm color="purple" disabled={busy} onClick={async () => {
                        if (!badgeAwardForm.user_id || !badgeAwardForm.badge_id) return showMsg('Pilih peserta dan badge dulu', 'error');
                        setBusy(true);
                        const res = await fetch(`${apiBase}/admin/badges/award`, {
                          method: 'POST', credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(badgeAwardForm)
                        });
                        setBusy(false);
                        if (res.ok) { showMsg('Badge berhasil diberikan ✅ Notif bot dikirim!', 'success'); setBadgeAwardForm({ user_id: 0, badge_id: 0, note: '' }); await refreshAdmin(); }
                        else showMsg('Gagal memberikan badge', 'error');
                      }}>🏅 Berikan Badge</BtnSm>
                    </div>
                  </div>

                  {/* Riwayat pemberian badge */}
                  <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 16 }}>
                    <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14 }}>📜 Riwayat Pemberian Badge</p>
                    {adminBadgeAwards.length > 0 ? (
                      <div className="nk-table-wrap" style={{ maxHeight: 360, overflowX: 'scroll', overflowY: 'auto', display: 'block', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                        <table className="nk-table">
                          <thead><tr><th>Peserta</th><th>Kelompok</th><th>Badge</th><th>Catatan</th><th>Diberikan</th><th></th></tr></thead>
                          <tbody>{adminBadgeAwards.map((aw, i) => {
                            const badge = adminBadges.find(b => b.id === aw.badge_id);
                            return (
                              <tr key={i}>
                                <td style={{ fontWeight: 600 }}>{aw.name}</td>
                                <td>{aw.group_name !== '-' ? <span className="nk-badge nk-badge-purple">🏢 {aw.group_name}</span> : <span style={{ color: '#475569' }}>—</span>}</td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {badge?.icon_url && <img src={badge.icon_url} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} />}
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{badge?.name || `#${aw.badge_id}`}</span>
                                  </div>
                                </td>
                                <td style={{ color: '#94a3b8', fontSize: 12 }}>{aw.note || '—'}</td>
                                <td style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>{aw.awarded_at}</td>
                                <td><BtnSm color="red" disabled={busy} onClick={async () => {
                                  if (!confirm('Cabut badge ini?')) return;
                                  setBusy(true);
                                  await fetch(`${apiBase}/admin/badges/revoke`, { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ award_id: aw.award_id }) });
                                  setBusy(false); await refreshAdmin();
                                }}>Cabut</BtnSm></td>
                              </tr>
                            );
                          })}</tbody>
                        </table>
                      </div>
                    ) : <p style={{ color: '#475569', fontSize: 13 }}>Belum ada badge yang diberikan.</p>}
                  </div>
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
                        <div>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Tanggal</div>
                          <input type="date" value={fbScheduleDate} onChange={e => setFbScheduleDate(e.target.value)}
                            style={{ background: '#0d1b2e', border: '1px solid #1e2d45', borderRadius: 8, color: '#f1f5f9', padding: '7px 12px', fontSize: 14 }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Jam (WIB)</div>
                          <input type="time" value={fbScheduleTime} onChange={e => setFbScheduleTime(e.target.value)}
                            style={{ background: '#0d1b2e', border: '1px solid #1e2d45', borderRadius: 8, color: '#f1f5f9', padding: '7px 12px', fontSize: 14 }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
                            <input type="checkbox" checked={fbScheduleActive} onChange={e => setFbScheduleActive(e.target.checked)} />
                            Aktifkan pengiriman otomatis
                          </label>
                          <BtnSm color="purple" onClick={async () => {
                            setBusy(true);
                            const res = await fetch(`${apiBase}/admin/feedback/schedule`, {
                              method: 'POST', credentials: 'include',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ send_time: fbScheduleTime, send_date: fbScheduleDate, is_active: fbScheduleActive })
                            });
                            setBusy(false);
                            if (res.ok) { showMsg('Jadwal feedback disimpan ✅', 'success'); await refreshAdmin(); }
                            else showMsg('Gagal simpan jadwal', 'error');
                          }}>💾 Simpan Jadwal</BtnSm>
                        </div>
                      </div>
                      <div style={{ marginTop: 10, fontSize: 12, color: '#475569', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {adminFeedbackSchedule.send_date && <span>📅 Jadwal kirim: <b style={{ color: '#a78bfa' }}>{adminFeedbackSchedule.send_date}</b> jam <b style={{ color: '#a78bfa' }}>{adminFeedbackSchedule.send_time}</b></span>}
                        {adminFeedbackSchedule.last_sent_date && <span>✅ Terakhir dikirim: <b>{adminFeedbackSchedule.last_sent_date}</b></span>}
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#334155', fontStyle: 'italic' }}>
                        {fbScheduleDate ? `Nala akan broadcast pada tanggal ${fbScheduleDate} jam ${fbScheduleTime} WIB.` : 'Jika tanggal dikosongkan, broadcast dikirim setiap hari pada jam tersebut.'}
                      </p>
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
                      <div className="nk-table-wrap" style={{ maxHeight: 400, overflowX: 'scroll', overflowY: 'auto', display: 'block', width: '100%', WebkitOverflowScrolling: 'touch' }}>
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
                          <div className="nk-table-wrap" style={{ maxHeight: 340, overflowX: 'scroll', overflowY: 'auto', display: 'block', width: '100%', WebkitOverflowScrolling: 'touch' }}>
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
                      <div style={{ marginTop: 16, padding: 16, background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12 }}>
                        <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 14 }}>📣 Kirim Reminder Refleksi</p>
                        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#94a3b8' }}>Kirim pengingat refleksi sekarang ke semua peserta yang belum refleksi hari ini (tanpa menunggu jadwal).</p>
                        <button
                          disabled={reminderLoading}
                          onClick={async () => {
                            setReminderLoading(true);
                            setReminderMsg('⏳ Mengirim...');
                            try {
                              const res = await fetch(`${apiBase}/admin/reflection/send-now`, { method: 'POST', credentials: 'include' });
                              const d = await res.json().catch(() => ({}));
                              setReminderMsg(d.message || (res.ok ? '✅ Reminder dikirim!' : '❌ Gagal kirim reminder.'));
                            } catch(e) {
                              setReminderMsg('❌ Error: ' + e.message);
                            } finally {
                              setReminderLoading(false);
                            }
                          }}
                          style={{ background: reminderLoading ? '#334155' : 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: reminderLoading ? 'not-allowed' : 'pointer' }}
                        >
                          {reminderLoading ? '⏳ Mengirim...' : '📣 Kirim Reminder Sekarang'}
                        </button>
                        {reminderMsg && (
                          <p style={{ margin: '12px 0 0', fontSize: 13, color: reminderMsg.startsWith('✅') ? '#34d399' : reminderMsg.startsWith('⏳') ? '#fbbf24' : '#f87171', fontWeight: 600 }}>{reminderMsg}</p>
                        )}
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
                        <thead><tr><th>Rule</th><th>EXP</th><th>Bonus Poin</th><th>Aksi</th></tr></thead>
                        <tbody>{adminExpRules.map((r) => (
                          <tr key={r.rule_key}>
                            <td style={{ fontWeight: 600 }}>{r.rule_key}</td>
                            <td><input className="nk-input-sm" type="number" min="1" style={{ width: 80 }} defaultValue={r.rule_value} id={`rule-${r.rule_key}`} /></td>
                            <td><input className="nk-input-sm" type="number" min="0" style={{ width: 80 }} defaultValue={r.point_bonus ?? 0} id={`rule-pb-${r.rule_key}`} placeholder="0" /></td>
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
                    <div className="nk-table-wrap" style={{ maxHeight: 320, overflowX: 'scroll', overflowY: 'auto', display: 'block', width: '100%', WebkitOverflowScrolling: 'touch' }}>
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
                      {/* AI Generate Button */}
                      {materiType === 'text' && (
                        <div style={{ marginBottom: 12, background: '#0a1e3a', border: '1px dashed #2563eb', borderRadius: 10, padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 13, color: '#93c5fd', fontWeight: 600 }}>✨ Generate dengan AI</span>
                            <button type="button" onClick={() => setAiShowDesc(v => !v)}
                              style={{ fontSize: 11, color: '#64748b', background: 'none', border: '1px solid #1e3a5f', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}>
                              {aiShowDesc ? '▲ Sembunyikan Konteks' : '▼ + Konteks Kelompok'}
                            </button>
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <label style={{ ...fieldLbl, fontSize: 11 }}>Deskripsi Materi <span style={{ color: '#64748b' }}>(poin-poin yang ingin dibahas)</span></label>
                            <textarea id="aiMateriDesc"
                              placeholder="Contoh: bahas definisi K3, kenapa penting, contoh kecelakaan kerja, dan langkah pencegahannya..."
                              className="nk-input-sm" rows={2}
                              style={{ width: '100%', fontSize: 12, resize: 'vertical' }} />
                          </div>
                          {aiShowDesc && (
                            <div style={{ marginBottom: 8 }}>
                              <label style={{ ...fieldLbl, fontSize: 11 }}>Konteks Kelompok/Perusahaan <span style={{ color: '#64748b' }}>(opsional)</span></label>
                              <textarea value={aiGroupDesc} onChange={e => setAiGroupDesc(e.target.value)}
                                placeholder="Misal: perusahaan manufaktur baja, fokus K3 dan SOP produksi, peserta adalah operator lantai pabrik..."
                                className="nk-input-sm" rows={2}
                                style={{ width: '100%', fontSize: 12, resize: 'vertical' }} />
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {[3,4,5].map(n => (
                              <button key={n} type="button" disabled={aiGenerating || !materiTitle.trim()}
                                onClick={async () => {
                                  if (!materiTitle.trim()) return;
                                  setAiGenerating(true);
                                  try {
                                    const res = await fetch(`${apiBase}/admin/materials/generate`, {
                                      method: 'POST', credentials: 'include',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ topic: materiTitle, materi_description: document.getElementById('aiMateriDesc')?.value || '', group_description: aiGroupDesc, bubble_count: n })
                                    });
                                    const data = await res.json();
                                    if (data.bubbles?.length > 0) {
                                      setMateriBubbles(data.bubbles);
                                    } else {
                                      alert('AI gagal generate: ' + (data.error || 'Unknown error'));
                                    }
                                  } catch(e) { alert('Error: ' + e.message); }
                                  setAiGenerating(false);
                                }}
                                style={{ flex: '1 1 80px', minWidth: 80, padding: '6px 0', background: aiGenerating ? '#1e3a5f' : '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: aiGenerating || !materiTitle.trim() ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, opacity: !materiTitle.trim() ? 0.5 : 1 }}>
                                {aiGenerating ? '⏳ Generating...' : `✨ ${n} Bubble`}
                              </button>
                            ))}
                          </div>
                          {!materiTitle.trim() && <p style={{ margin: '6px 0 0', fontSize: 11, color: '#64748b' }}>Isi judul materi dulu sebelum generate.</p>}
                        </div>
                      )}
                      <div style={{ marginBottom: 10 }}>
                        <label style={fieldLbl}>{materiType === 'text' ? 'Isi Materi (Markdown)' : 'URL ' + (materiType === 'video' ? 'Video (YouTube/GDrive)' : 'Audio (MP3)')}</label>
                        {materiType === 'text' ? (<>
                          {/* Multi-bubble editor */}
                          {materiBubbles.map((bubble, bi) => {
                            const editorId = `materi-bubble-${bi}`;
                            const toolbarBtns = [
                              { label: 'B', title: 'Bold', wrap: ['**','**'], style: { fontWeight: 800 } },
                              { label: 'I', title: 'Italic', wrap: ['_','_'], style: { fontStyle: 'italic' } },
                              { label: 'S', title: 'Strikethrough', wrap: ['~~','~~'], style: { textDecoration: 'line-through' } },
                              { label: '`', title: 'Kode', wrap: ['`','`'], style: { fontFamily: 'monospace' } },
                              { label: 'H1', title: 'Heading 1', prefix: '# ', style: {} },
                              { label: 'H2', title: 'Heading 2', prefix: '## ', style: {} },
                              { label: 'H3', title: 'Heading 3', prefix: '### ', style: {} },
                              { label: '• List', title: 'Bullet', prefix: '- ', style: {} },
                              { label: '1. List', title: 'Numbered', prefix: '1. ', style: {} },
                              { label: '❝', title: 'Quote', prefix: '> ', style: {} },
                              { label: '───', title: 'Separator', insert: '---\n', style: {} },
                            ];
                            return (
                              <div key={bi} style={{ marginBottom: 12, background: '#0a1628', border: '1px solid #1e2d45', borderRadius: 10, padding: 10 }}>
                                {/* Header bubble */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                  <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                                    💬 Pesan {bi + 1} {materiBubbles.length > 1 ? `/ ${materiBubbles.length}` : ''}
                                  </span>
                                  {materiBubbles.length > 1 && (
                                    <button type="button" onClick={() => setMateriBubbles(prev => prev.filter((_,i2) => i2 !== bi))}
                                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, color: '#f87171', padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>
                                      🗑️ Hapus
                                    </button>
                                  )}
                                </div>
                                {/* Toolbar */}
                                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6 }}>
                                  {toolbarBtns.map((btn, ti) => (
                                    <button key={ti} type="button" title={btn.title}
                                      style={{ background: '#1e2d45', border: '1px solid #2d3f5c', borderRadius: 4, color: '#cbd5e1', padding: '2px 7px', fontSize: 11, cursor: 'pointer', ...btn.style }}
                                      onClick={() => {
                                        const el = document.getElementById(editorId);
                                        if (!el) return;
                                        const start = el.selectionStart, end = el.selectionEnd;
                                        const sel = bubble.slice(start, end);
                                        let newVal = bubble, newCursor = end;
                                        if (btn.wrap) { newVal = bubble.slice(0,start)+btn.wrap[0]+sel+btn.wrap[1]+bubble.slice(end); newCursor = start+btn.wrap[0].length+sel.length+btn.wrap[1].length; }
                                        else if (btn.prefix) { const ls = bubble.lastIndexOf('\n', start-1)+1; newVal = bubble.slice(0,ls)+btn.prefix+bubble.slice(ls); newCursor = start+btn.prefix.length; }
                                        else if (btn.insert) { newVal = bubble.slice(0,start)+btn.insert+bubble.slice(end); newCursor = start+btn.insert.length; }
                                        setMateriBubbles(prev => prev.map((b,i2) => i2===bi ? newVal : b));
                                        setTimeout(() => { el.focus(); el.setSelectionRange(newCursor, newCursor); }, 0);
                                      }}>{btn.label}</button>
                                  ))}
                                </div>
                                {/* Textarea */}
                                <textarea id={editorId} value={bubble}
                                  onChange={e => setMateriBubbles(prev => prev.map((b,i2) => i2===bi ? e.target.value : b))}
                                  rows={4} placeholder={`Tulis isi pesan ${bi+1}...`}
                                  style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: 12, background: '#0d1b2e', border: '1px solid #1e2d45', borderRadius: 6, color: '#f1f5f9', padding: '8px 10px' }} />
                              </div>
                            );
                          })}
                          {/* Tombol tambah bubble + counter */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <button type="button"
                              disabled={materiBubbles.length >= 20}
                              onClick={() => setMateriBubbles(prev => [...prev, ''])}
                              style={{ flex: 1, background: materiBubbles.length >= 20 ? 'rgba(51,65,85,0.3)' : 'rgba(99,102,241,0.1)', border: `1px dashed ${materiBubbles.length >= 20 ? '#334155' : 'rgba(99,102,241,0.4)'}`, borderRadius: 8, color: materiBubbles.length >= 20 ? '#475569' : '#818cf8', padding: '8px 16px', fontSize: 13, cursor: materiBubbles.length >= 20 ? 'not-allowed' : 'pointer' }}>
                              {materiBubbles.length >= 20 ? '🚫 Batas maksimal tercapai' : '+ Tambah Pesan'}
                            </button>
                            <span style={{ fontSize: 12, color: materiBubbles.length >= 18 ? '#f87171' : '#475569', whiteSpace: 'nowrap', fontWeight: 600 }}>
                              {materiBubbles.length} / 20
                            </span>
                          </div>

                          {/* Panduan Markdown */}
                          <details style={{ marginTop: 8 }}>
                            <summary style={{ fontSize: 12, color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>📖 Panduan format Markdown (klik untuk buka)</summary>
                            <div style={{ background: '#0a1628', border: '1px solid #1e2d45', borderRadius: 8, padding: 14, marginTop: 8, fontSize: 12, lineHeight: 1.8 }}>
                              <p style={{ fontWeight: 700, color: '#94a3b8', margin: '0 0 8px' }}>✍️ Cara penulisan teks di Telegram:</p>
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ color: '#475569', borderBottom: '1px solid #1e2d45' }}><th style={{ textAlign: 'left', padding: '4px 8px' }}>Yang kamu tulis</th><th style={{ textAlign: 'left', padding: '4px 8px' }}>Tampil di Telegram</th></tr></thead>
                                <tbody>{[
                                  ['**teks**', '𝐭𝐞𝐤𝐬 (tebal/bold)'],
                                  ['_teks_', '𝑡𝑒𝑘𝑠 (miring/italic)'],
                                  ['~~teks~~', 'teks (dicoret)'],
                                  ['`kode`', 'kode (monospace)'],
                                  ['# Judul Besar', '📌 Judul Besar (heading 1)'],
                                  ['## Subjudul', 'Subjudul (heading 2)'],
                                  ['### Poin', 'Poin (heading 3)'],
                                  ['- item', '• item (bullet list)'],
                                  ['1. item', '1. item (numbered list)'],
                                  ['> kutipan', '│ kutipan (blockquote)'],
                                  ['---', '────── (garis pemisah)'],
                                  ['```\\nkode\\n```', 'blok kode (preformatted)'],
                                ].map(([src, res], ri) => (
                                  <tr key={ri} style={{ borderBottom: '1px solid #0f172a' }}>
                                    <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: '#fbbf24' }}>{src}</td>
                                    <td style={{ padding: '4px 8px', color: '#94a3b8' }}>{res}</td>
                                  </tr>
                                ))}</tbody>
                              </table>
                              <p style={{ margin: '10px 0 4px', color: '#475569' }}>💡 <b style={{ color: '#94a3b8' }}>Tips:</b> Blok di baris kosong = paragraf baru. Kamu bisa pakai tombol toolbar di atas untuk format otomatis.</p>
                            </div>
                          </details>
                        </>) : <input value={materiContent} onChange={e => setMateriContent(e.target.value)} placeholder="https://..." className="nk-input-sm" style={{ width: "100%" }} />
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
                      <div className="nk-table-wrap" style={{ maxHeight: 480, overflowX: 'scroll', overflowY: 'auto', display: 'block', width: '100%', WebkitOverflowScrolling: 'touch' }}>
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

function NoteGraph({ nodes, edges, onNodeClick }) {
  const svgRef = useRef(null);
  const [d3Ready, setD3Ready] = useState(false);

  useEffect(() => {
    if (window.d3) { setD3Ready(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js';
    s.onload = () => setD3Ready(true);
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!d3Ready || !nodes?.length || !svgRef.current) return;
    const d3 = window.d3;
    const el = svgRef.current;
    d3.select(el).selectAll('*').remove();

    const W = el.parentElement?.clientWidth || 500;
    const H = 420;
    el.setAttribute('width', W);
    el.setAttribute('height', H);

    // Konversi edges: {from,to} → {source,to} agar d3 forceLink bisa resolve
    const edgesCopy = edges.map(e => ({ source: String(e.from), target: String(e.to) }));
    const nodesCopy = nodes.map(n => ({ ...n, id: String(n.id) }));

    const tagColors = ['#3b82f6','#a78bfa','#34d399','#fb923c','#f472b6','#facc15'];
    const tagMap = {};
    nodesCopy.forEach(n => {
      if (n.tags?.[0] && !tagMap[n.tags[0]])
        tagMap[n.tags[0]] = tagColors[Object.keys(tagMap).length % tagColors.length];
    });
    const nodeColor = n => tagMap[n.tags?.[0]] || '#3b82f6';

    const svg = d3.select(el);
    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.3, 3]).on('zoom', e => g.attr('transform', e.transform)));

    const sim = d3.forceSimulation(nodesCopy)
      .force('link', d3.forceLink(edgesCopy).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(36));

    // Garis tipis ala Obsidian
    const link = g.append('g').selectAll('line').data(edgesCopy).join('line')
      .attr('stroke', '#4a4a5a').attr('stroke-width', 1).attr('stroke-opacity', 0.6);

    const node = g.append('g').selectAll('g').data(nodesCopy).join('g')
      .style('cursor', 'pointer')
      .on('click', (_, d) => onNodeClick(Number(d.id)))
      .on('mouseover', function() { d3.select(this).select('circle').attr('r', 8); })
      .on('mouseout', function() { d3.select(this).select('circle').attr('r', 5); })
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

    // Titik kecil ala Obsidian
    node.append('circle')
      .attr('r', 5)
      .attr('fill', d => nodeColor(d))
      .attr('stroke', 'none');

    // Label di luar titik
    node.append('text')
      .text(d => d.title)
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.9em')
      .attr('fill', '#9a9ab0')
      .attr('font-size', 11)
      .attr('font-family', 'sans-serif')
      .attr('pointer-events', 'none');

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  }, [d3Ready, nodes, edges]);

  return (
    <div style={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '8px 14px', borderBottom: '1px solid #2a2a3e', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: '#16162a' }}>
        <span style={{ fontWeight: 600, fontSize: 12, color: '#7c7c9a' }}>🕸️ Graph View</span>
        <span style={{ fontSize: 11, color: '#4a4a6a' }}>{nodes.length} catatan · {edges.length} koneksi</span>
        {!d3Ready && <span style={{ fontSize: 11, color: '#f59e0b' }}>⏳ Memuat...</span>}
        <span style={{ fontSize: 10, color: '#3a3a5a', marginLeft: 'auto' }}>Klik · Drag · Scroll</span>
      </div>
      <svg ref={svgRef} style={{ display: 'block', width: '100%', minHeight: 460, background: '#1a1a2e' }} />
    </div>
  );
}

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
