'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
const NoteCanvasRF = dynamic(() => import('./canvas/NoteCanvas'), { ssr: false });

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
  const [entryMode, setEntryMode] = useState(''); // '' | 'notes' | 'portal'
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
  const [participantRoadmapPositions, setParticipantRoadmapPositions] = useState([]);
  const [participantRoadmapFilter, setParticipantRoadmapFilter] = useState({ position_id: '', mode: 'material' });
  const [participantRoadmapGraph, setParticipantRoadmapGraph] = useState('{"nodes":[],"edges":[]}');
  const [participantUnknownBacklinks, setParticipantUnknownBacklinks] = useState([]);
  const [participantRoadmapMaterialDetail, setParticipantRoadmapMaterialDetail] = useState(null);
  const [myReflections, setMyReflections] = useState([]);
  const [reflectionDraft, setReflectionDraft] = useState('');
  const [reflectionSaving, setReflectionSaving] = useState(false);
  const [reflectionDeletingId, setReflectionDeletingId] = useState(null);
  const [showReflectionEditor, setShowReflectionEditor] = useState(false);
  const [adminReflectionStats, setAdminReflectionStats] = useState(null);
  const [adminLearningSummary, setAdminLearningSummary] = useState(null);
  const [reminderMsg, setReminderMsg] = useState('');
  const [reminderLoading, setReminderLoading] = useState(false);
  
  // Kontribusi
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contributeNote, setContributeNote] = useState(null); // catatan yang diajukan
  const [contributeCategoryId, setContributeCategoryId] = useState('');
  const [contributeCategories, setContributeCategories] = useState([]);
  const [contributeLoading, setContributeLoading] = useState(false);
  
  // Admin Kontribusi
  const [adminContributions, setAdminContributions] = useState([]);
  const [adminContribFilter, setAdminContribFilter] = useState('pending');
  const [roadmapPositions, setRoadmapPositions] = useState([]);
  const [roadmapCategories, setRoadmapCategories] = useState([]);
  const [roadmapNotes, setRoadmapNotes] = useState([]);
  const [roadmapGraph, setRoadmapGraph] = useState('{"nodes":[],"edges":[]}');
  const [roadmapUnknownBacklinks, setRoadmapUnknownBacklinks] = useState([]);
  const [positionGraph, setPositionGraph] = useState('{"nodes":[],"edges":[]}');
  const [positionUnknownBacklinks, setPositionUnknownBacklinks] = useState([]);
  const [positionGraphFilter, setPositionGraphFilter] = useState({ position_id: '', category_ids: [] });
  const [positionForm, setPositionForm] = useState({ id: 0, code: '', name: '', description: '', group_id: '', is_active: true });
  const [categoryForm, setCategoryForm] = useState({ id: 0, position_id: '', name: '', description: '', order_no: 0, is_active: true });
  const [noteForm, setNoteForm] = useState({ id: 0, category_id: '', title: '', content: '' });
  const [competencyForm, setCompetencyForm] = useState({ id: 0, position_id: '', code: '', name: '', description: '', is_active: true });
  const [roadmapCompetencies, setRoadmapCompetencies] = useState([]);
  const [roadmapCoreCompetencies, setRoadmapCoreCompetencies] = useState([]);
  const [coreCompetencyForm, setCoreCompetencyForm] = useState({ id: 0, position_id: '', code: '', name: '', description: '', is_active: true });
  const [roadmapLeadershipCompetencies, setRoadmapLeadershipCompetencies] = useState([]);
  const [leadershipCompetencyForm, setLeadershipCompetencyForm] = useState({ id: 0, position_id: '', code: '', name: '', description: '', is_active: true });
  const [roadmapMaterials, setRoadmapMaterials] = useState([]);
  const [materialForm, setMaterialForm] = useState({ id: 0, competency_id: '', title: '', content: '', brief: '', bloom_level: 'C2', learning_objectives: '', style: 'ringkas', is_active: true });
  const [materialLinkSuggestions, setMaterialLinkSuggestions] = useState([]);
  const [materialLinkQuery, setMaterialLinkQuery] = useState('');
  const [materialSuggestionIndex, setMaterialSuggestionIndex] = useState(0);
  const [materialStrictMode, setMaterialStrictMode] = useState(true);
  const [materialGraph, setMaterialGraph] = useState('{"nodes":[],"edges":[]}');
  const [materialUnknownBacklinks, setMaterialUnknownBacklinks] = useState([]);
  const [materialGraphFilter, setMaterialGraphFilter] = useState({ position_id: '', mode: 'material' });
  const [refreshingGraphData, setRefreshingGraphData] = useState(false);
  const [generatingRoadmapMaterial, setGeneratingRoadmapMaterial] = useState(false);
  const materialEditorRef = useRef(null);
  const materialTitleInputRef = useRef(null);
  const [pendingFocusMaterial, setPendingFocusMaterial] = useState(false);
  const [roadmapMenu, setRoadmapMenu] = useState('positions');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingContrib, setReviewingContrib] = useState(null);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewApproveMode, setReviewApproveMode] = useState('direct');
  const [reviewBubbleCount, setReviewBubbleCount] = useState(3);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  
  // Render Markdown → HTML untuk web display
  function renderMD(md) {
    if (!md) return '';
    const lines = md.split('\n');
    let html = '';
    let inCode = false, codeLines = [];
    for (let line of lines) {
      line = String(line || '').replace(/\r/g, '');
      const lead = line.trimStart();
      if (lead.startsWith('```')) {
        if (inCode) { html += `<pre style="background:#0a1628;border-radius:6px;padding:10px;overflow-x:auto;font-size:12px;color:#a5f3fc;margin:6px 0">${lead.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`; inCode = false; codeLines = []; }
        else inCode = true;
        continue;
      }
      if (inCode) { codeLines.push(line); html += `<pre style="background:#0a1628;border-radius:6px;padding:10px;overflow-x:auto;font-size:12px;color:#a5f3fc;margin:6px 0">${codeLines.join('\n').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`; continue; }
      if (lead.trim() === '---' || lead.trim() === '***') { html += '<hr style="border:none;border-top:1px solid #1e2d45;margin:10px 0"/>'; continue; }
      if (lead.startsWith('### ')) { html += `<p style="font-weight:700;font-size:14px;color:#cbd5e1;margin:6px 0 2px">${inlineMD(lead.slice(4))}</p>`; continue; }
      if (lead.startsWith('## ')) { html += `<p style="font-weight:700;font-size:15px;color:#e2e8f0;margin:8px 0 4px">${inlineMD(lead.slice(3))}</p>`; continue; }
      if (lead.startsWith('# ')) { html += `<p style="font-weight:800;font-size:16px;color:#f1f5f9;margin:10px 0 4px">📌 ${inlineMD(lead.slice(2))}</p>`; continue; }
      if (lead.startsWith('> ')) { html += `<div style="border-left:3px solid #7c3aed;padding:4px 10px;margin:4px 0;color:#94a3b8;font-style:italic;font-size:13px">${inlineMD(lead.slice(2))}</div>`; continue; }
      if (lead.startsWith('- ') || lead.startsWith('* ')) { html += `<div style="display:flex;gap:6px;margin:2px 0;font-size:13px"><span style="color:#7c3aed;flex-shrink:0">•</span><span>${inlineMD(lead.slice(2))}</span></div>`; continue; }
      const numMatch = lead.match(/^(\d+)\. (.+)/);
      if (numMatch) { html += `<div style="display:flex;gap:6px;margin:2px 0;font-size:13px"><span style="color:#7c3aed;flex-shrink:0;font-weight:700">${numMatch[1]}.</span><span>${inlineMD(numMatch[2])}</span></div>`; continue; }
      if (line.trim() === '') { html += '<div style="height:6px"></div>'; continue; }
      html += `<p style="margin:3px 0;font-size:13px;line-height:1.7;color:#94a3b8">${inlineMD(lead)}</p>`;
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
  const [qAiGenerating, setQAiGenerating] = useState(false);
  const [qAiRoadmapCompId, setQAiRoadmapCompId] = useState('');
  const [qAiMateriId, setQAiMateriId] = useState('');
  const [qAiCategoryMateri, setQAiCategoryMateri] = useState([]);
  const [qAiGenerated, setQAiGenerated] = useState([]);
  const [qAiChecked, setQAiChecked] = useState([]);
  const [qAiSaving, setQAiSaving] = useState(false);
  const [chatRoadmapCompId, setChatRoadmapCompId] = useState('');
  const [chatRoadmapMaterialId, setChatRoadmapMaterialId] = useState('');
  const [chatPublishPreview, setChatPublishPreview] = useState(null);

  // Notes
  const [notes, setNotes] = useState([]);
  const [notesAllTags, setNotesAllTags] = useState([]);
  const [notesTagFilter, setNotesTagFilter] = useState('');
  const [notesSearch, setNotesSearch] = useState('');
  const [activeNote, setActiveNote] = useState(null); // {id,title,content,tags,backlinks}
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState({ title: '', content: '' });
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteView, setNoteView] = useState('list'); // 'list' | 'editor' | 'graph' | 'canvas'
  const [noteListMode, setNoteListMode] = useState('all'); // all | permanent | quick | reflection
  const [canvasData, setCanvasData] = useState(null); // { canvas_id, items, edges }
  const [canvasList, setCanvasList] = useState([]);      // daftar semua canvas
  const [canvasOpenId, setCanvasOpenId] = useState(null); // canvas yang sedang dibuka
  const [canvasRenamingId, setCanvasRenamingId] = useState(null);
  const [canvasRenameVal, setCanvasRenameVal] = useState('');
  const [noteAutocomplete, setNoteAutocomplete] = useState([]); // [[title suggestions
  const [graphData, setGraphData] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null); // PWA install
  const [showInstallBanner, setShowInstallBanner] = useState(false);
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
  const [aiSettings, setAiSettings] = useState({
    provider: 'sumopod', base_url: 'https://ai.sumopod.com/v1/chat/completions', api_key: '',
    api_key_masked: '', model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 2000, is_active: true,
  });
  const [aiProfiles, setAiProfiles] = useState([]);
  const [aiProfileForm, setAiProfileForm] = useState({ id: 0, name: '', provider: 'sumopod', base_url: 'https://ai.sumopod.com/v1/chat/completions', api_key: '', model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 2000 });
  const aiProviderPresets = {
    sumopod: { base_url: 'https://ai.sumopod.com/v1/chat/completions', model: 'gpt-4o-mini' },
    openrouter: { base_url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-4o-mini' },
    openai: { base_url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
    custom: { base_url: '', model: '' },
  };
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

  async function loadParticipantRoadmapPositions() {
    const res = await fetch(`${apiBase}/participant/roadmap/positions`, { credentials: 'include' });
    if (res.ok) setParticipantRoadmapPositions((await res.json()).items || []);
  }

  async function loadParticipantRoadmapGraph(positionId='', mode='material') {
    const p = new URLSearchParams();
    if (positionId) p.set('position_id', positionId);
    if (mode) p.set('mode', mode);
    const qs = p.toString() ? `?${p.toString()}` : '';
    const res = await fetch(`${apiBase}/participant/roadmap/materials-graph${qs}`, { credentials: 'include' });
    if (res.ok) {
      const d = await res.json();
      setParticipantRoadmapGraph(d.graph_json || '{"nodes":[],"edges":[]}');
      setParticipantUnknownBacklinks(d.unknown_backlinks || []);
    }
  }

  async function openParticipantRoadmapMaterial(nodeId) {
    if (String(nodeId).startsWith('c-')) return;
    const res = await fetch(`${apiBase}/participant/roadmap/material?id=${nodeId}`, { credentials: 'include' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return showMsg(d.error || 'Gagal buka materi roadmap', 'error');
    setParticipantRoadmapMaterialDetail(d);
  }

  useEffect(() => {
    if (!pendingFocusMaterial || roadmapMenu !== 'materials') return;
    const t = setTimeout(() => {
      try {
        materialEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        materialTitleInputRef.current?.focus();
      } catch {}
      setPendingFocusMaterial(false);
    }, 120);
    return () => clearTimeout(t);
  }, [pendingFocusMaterial, roadmapMenu]);

  async function loadSection(section) {
    if (loadedSections[section]) return;
    setLoadedSections(prev => ({...prev, [section]: true}));
    if (section === 'profil') {
      const [rRes, bdgRes, lRes] = await Promise.all([
        fetch(`${apiBase}/participant/reminder`, { credentials: 'include' }),
        fetch(`${apiBase}/participant/badges`, { credentials: 'include' }),
        fetch(`${apiBase}/participant/leaderboard`, { credentials: 'include' }),
      ]);
      if (rRes.ok) setMyReminder(await rRes.json());
      if (bdgRes.ok) setMyBadges((await bdgRes.json()).items || []);
      if (lRes.ok) setLeaderboard((await lRes.json()).items || []);
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
      const [_, refRes] = await Promise.all([
        refreshNotes(),
        fetch(`${apiBase}/participant/reflections`, { credentials: 'include' }),
      ]);
      if (refRes.ok) setMyReflections((await refRes.json()).items || []);
    } else if (section === 'roadmap') {
      await loadParticipantRoadmapPositions();
      await loadParticipantRoadmapGraph(participantRoadmapFilter.position_id || '', participantRoadmapFilter.mode || 'material');
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
      // Catatan sementara langsung buka dalam mode edit
      setNoteEditing(data.note_type === 'fleeting');
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

  async function loadCanvas() {
    setNoteView('canvas');
    setCanvasOpenId(null); // tampilkan daftar dulu
    const res = await fetch(`${apiBase}/participant/notes/canvas?list=1`, { credentials: 'include' });
    if (!res.ok) return;
    const d = await res.json();
    setCanvasList(d.canvases || []);
  }

  async function createCanvasFromList(name) {
    const res = await fetch(`${apiBase}/participant/notes/canvas`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_canvas', name }),
    });
    const d = await res.json();
    if (d.ok) {
      await loadCanvas();
      setCanvasOpenId(d.id);
    }
  }

  async function renameCanvasFromList(cid, name) {
    if (!name?.trim()) return;
    await fetch(`${apiBase}/participant/notes/canvas?canvas_id=${cid}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rename_canvas', name: name.trim() }),
    });
    setCanvasList(cs => cs.map(c => c.id === cid ? { ...c, name: name.trim() } : c));
    setCanvasRenamingId(null);
  }

  async function deleteCanvasFromList(cid) {
    if (!confirm('Hapus canvas ini?')) return;
    await fetch(`${apiBase}/participant/notes/canvas?canvas_id=${cid}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_canvas' }),
    });
    if (canvasOpenId === cid) setCanvasOpenId(null);
    await loadCanvas();
  }

  async function loadGraph() {
    const res = await fetch(`${apiBase}/participant/notes/graph`, { credentials: 'include' });
    if (res.ok) { setGraphData(await res.json()); setNoteView('graph'); }
  }

  // ── Kontribusi Functions ──────────────────────────────────────────────────
  async function openContributeModal(note) {
    setContributeNote(note);
    setContributeCategoryId('');
    setShowContributeModal(true);
    // Load kategori dari participant endpoint
    const res = await fetch(`${apiBase}/participant/categories`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setContributeCategories(data.items || []);
    }
  }

  async function submitContribution() {
    if (!contributeCategoryId || !contributeNote) {
      showMsg('Pilih kategori dulu ya!', 'error');
      return;
    }
    setContributeLoading(true);
    try {
      const res = await fetch(`${apiBase}/participant/contributions/submit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: parseInt(contributeCategoryId),
          title: contributeNote.title,
          type: 'text',
          content: contributeNote.content,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showMsg('✅ Catatan berhasil diajukan! Tunggu review admin ya.', 'success');
        setShowContributeModal(false);
        setContributeNote(null);
        setContributeCategoryId('');
      } else {
        showMsg(data.error || 'Gagal mengajukan kontribusi', 'error');
      }
    } catch (err) {
      showMsg('Error: ' + err.message, 'error');
    } finally {
      setContributeLoading(false);
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  }

  function getStatusText(status) {
    switch (status) {
      case 'pending': return 'Menunggu Review';
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      default: return status;
    }
  }

  // ── Admin Contribution Functions ──────────────────────────────────────────
  async function refreshAdminContributions(status = adminContribFilter) {
    const res = await fetch(`${apiBase}/admin/contributions?status=${status}`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setAdminContributions(data.items || []);
    }
  }

  function openReviewModal(contrib, action) {
    setReviewingContrib(contrib);
    setReviewAction(action);
    setReviewApproveMode('direct');
    setReviewBubbleCount(3);
    setReviewFeedback('');
    setShowReviewModal(true);
  }

  async function submitReview() {
    if (!reviewingContrib || !reviewAction) return;
    
    setReviewLoading(true);
    try {
      const res = await fetch(`${apiBase}/admin/contributions/review`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contribution_id: reviewingContrib.id,
          action: reviewAction,
          approve_mode: reviewApproveMode,
          bubble_count: reviewBubbleCount,
          admin_feedback: reviewFeedback.trim(),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        showMsg(data.message || 'Review berhasil!', 'success');
        setShowReviewModal(false);
        await refreshAdminContributions();
      } else {
        showMsg(data.error || 'Gagal melakukan review', 'error');
      }
    } catch (err) {
      showMsg('Error: ' + err.message, 'error');
    } finally {
      setReviewLoading(false);
    }
  }

  async function deleteRoadmapPosition(id) {
    if (!confirm('Hapus jabatan roadmap ini? Seluruh kategori dan catatan terkait juga terhapus.')) return;
    const res = await fetch(`${apiBase}/admin/roadmap/positions`, {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'delete', id })
    });
    const d = await res.json().catch(()=>({}));
    if (!res.ok) return showMsg(d.error || 'Gagal hapus jabatan roadmap', 'error');
    showMsg('Jabatan roadmap dihapus ✅', 'success');
    await loadAdminSection('roadmap');
  }

  async function saveRoadmapPosition() {
    const normalizedCode = (positionForm.code || '').replace(/\u00A0/g, ' ').trim().toUpperCase();
    const normalizedName = (positionForm.name || '').replace(/\u00A0/g, ' ').trim();
    if (!normalizedCode) return showMsg('Kode jabatan wajib diisi', 'error');
    if (!normalizedName) return showMsg('Nama jabatan wajib diisi', 'error');
    const res = await fetch(`${apiBase}/admin/roadmap/positions`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: Number(positionForm.id) || 0,
        code: normalizedCode,
        name: normalizedName,
        description: positionForm.description || '',
        group_id: Number(positionForm.group_id || 0),
        is_active: !!positionForm.is_active,
      })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return showMsg(d.error || 'Gagal simpan jabatan roadmap', 'error');
    showMsg('Jabatan roadmap tersimpan ✅', 'success');
    setPositionForm({ id: 0, code: '', name: '', description: '', group_id: '', is_active: true });
    const pRes = await fetch(`${apiBase}/admin/roadmap/positions`, { credentials: 'include' });
    if (pRes.ok) setRoadmapPositions((await pRes.json()).items || []);
  }

  async function loadRoadmapCompetencies(positionId) {
    const qs = positionId ? `?position_id=${positionId}` : '';
    const res = await fetch(`${apiBase}/admin/roadmap/competencies${qs}`, { credentials: 'include' });
    if (res.ok) setRoadmapCompetencies((await res.json()).items || []);
  }

  async function loadRoadmapCoreCompetencies(positionId) {
    const qs = positionId ? `?position_id=${positionId}` : '';
    const res = await fetch(`${apiBase}/admin/roadmap/core-competencies${qs}`, { credentials: 'include' });
    if (res.ok) setRoadmapCoreCompetencies((await res.json()).items || []);
  }

  async function saveRoadmapCoreCompetency() {
    if (!coreCompetencyForm.position_id) return showMsg('Jabatan wajib dipilih', 'error');
    if (!(coreCompetencyForm.code || '').trim()) return showMsg('Kode kompetensi inti wajib diisi', 'error');
    if (!(coreCompetencyForm.name || '').trim()) return showMsg('Nama kompetensi inti wajib diisi', 'error');
    const res = await fetch(`${apiBase}/admin/roadmap/core-competencies`, {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        id: Number(coreCompetencyForm.id) || 0,
        position_id: Number(coreCompetencyForm.position_id),
        code: (coreCompetencyForm.code || '').trim().toUpperCase(),
        name: (coreCompetencyForm.name || '').trim(),
        description: coreCompetencyForm.description || '',
        is_active: !!coreCompetencyForm.is_active,
      })
    });
    const d = await res.json().catch(()=>({}));
    if (!res.ok) return showMsg(d.error || 'Gagal simpan kompetensi inti', 'error');
    showMsg('Kompetensi inti tersimpan ✅', 'success');
    const keepPosition = coreCompetencyForm.position_id;
    setCoreCompetencyForm({ id: 0, position_id: keepPosition, code: '', name: '', description: '', is_active: true });
    await loadRoadmapCoreCompetencies(Number(keepPosition));
  }

  async function deleteRoadmapCoreCompetency(id) {
    if (!confirm('Hapus kompetensi inti ini?')) return;
    const res = await fetch(`${apiBase}/admin/roadmap/core-competencies`, {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'delete', id })
    });
    const d = await res.json().catch(()=>({}));
    if (!res.ok) return showMsg(d.error || 'Gagal hapus kompetensi inti', 'error');
    showMsg('Kompetensi inti dihapus ✅', 'success');
    if (coreCompetencyForm.position_id) await loadRoadmapCoreCompetencies(Number(coreCompetencyForm.position_id));
  }

  async function loadRoadmapLeadershipCompetencies(positionId) {
    const qs = positionId ? `?position_id=${positionId}` : '';
    const res = await fetch(`${apiBase}/admin/roadmap/leadership-competencies${qs}`, { credentials: 'include' });
    if (res.ok) setRoadmapLeadershipCompetencies((await res.json()).items || []);
  }

  async function saveRoadmapLeadershipCompetency() {
    if (!leadershipCompetencyForm.position_id) return showMsg('Jabatan wajib dipilih', 'error');
    if (!(leadershipCompetencyForm.code || '').trim()) return showMsg('Kode kompetensi kepemimpinan wajib diisi', 'error');
    if (!(leadershipCompetencyForm.name || '').trim()) return showMsg('Nama kompetensi kepemimpinan wajib diisi', 'error');
    const res = await fetch(`${apiBase}/admin/roadmap/leadership-competencies`, {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        id: Number(leadershipCompetencyForm.id) || 0,
        position_id: Number(leadershipCompetencyForm.position_id),
        code: (leadershipCompetencyForm.code || '').trim().toUpperCase(),
        name: (leadershipCompetencyForm.name || '').trim(),
        description: leadershipCompetencyForm.description || '',
        is_active: !!leadershipCompetencyForm.is_active,
      })
    });
    const d = await res.json().catch(()=>({}));
    if (!res.ok) return showMsg(d.error || 'Gagal simpan kompetensi kepemimpinan', 'error');
    showMsg('Kompetensi kepemimpinan tersimpan ✅', 'success');
    const keepPosition = leadershipCompetencyForm.position_id;
    setLeadershipCompetencyForm({ id: 0, position_id: keepPosition, code: '', name: '', description: '', is_active: true });
    await loadRoadmapLeadershipCompetencies(Number(keepPosition));
  }

  async function deleteRoadmapLeadershipCompetency(id) {
    if (!confirm('Hapus kompetensi kepemimpinan ini?')) return;
    const res = await fetch(`${apiBase}/admin/roadmap/leadership-competencies`, {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'delete', id })
    });
    const d = await res.json().catch(()=>({}));
    if (!res.ok) return showMsg(d.error || 'Gagal hapus kompetensi kepemimpinan', 'error');
    showMsg('Kompetensi kepemimpinan dihapus ✅', 'success');
    if (leadershipCompetencyForm.position_id) await loadRoadmapLeadershipCompetencies(Number(leadershipCompetencyForm.position_id));
  }

  async function saveRoadmapCompetency() {
    if (!competencyForm.position_id) return showMsg('Jabatan wajib dipilih', 'error');
    if (!(competencyForm.code || '').trim()) return showMsg('Kode kompetensi wajib diisi', 'error');
    if (!(competencyForm.name || '').trim()) return showMsg('Nama kompetensi wajib diisi', 'error');
    const res = await fetch(`${apiBase}/admin/roadmap/competencies`, {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        id: Number(competencyForm.id) || 0,
        position_id: Number(competencyForm.position_id),
        code: (competencyForm.code || '').trim().toUpperCase(),
        name: (competencyForm.name || '').trim(),
        description: competencyForm.description || '',
        is_active: !!competencyForm.is_active,
      })
    });
    const d = await res.json().catch(()=>({}));
    if (!res.ok) return showMsg(d.error || 'Gagal simpan kompetensi teknis', 'error');
    showMsg('Kompetensi teknis tersimpan ✅', 'success');
    const keepPosition = competencyForm.position_id;
    setCompetencyForm({ id: 0, position_id: keepPosition, code: '', name: '', description: '', is_active: true });
    await loadRoadmapCompetencies(Number(keepPosition));
  }

  async function deleteRoadmapCompetency(id) {
    if (!confirm('Hapus kompetensi teknis ini?')) return;
    const res = await fetch(`${apiBase}/admin/roadmap/competencies`, {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'delete', id })
    });
    const d = await res.json().catch(()=>({}));
    if (!res.ok) return showMsg(d.error || 'Gagal hapus kompetensi teknis', 'error');
    showMsg('Kompetensi teknis dihapus ✅', 'success');
    if (competencyForm.position_id) await loadRoadmapCompetencies(Number(competencyForm.position_id));
  }

  async function loadRoadmapMaterials(competencyId) {
    const qs = competencyId ? `?competency_id=${competencyId}` : '';
    const res = await fetch(`${apiBase}/admin/roadmap/materials${qs}`, { credentials: 'include' });
    if (res.ok) setRoadmapMaterials((await res.json()).items || []);
  }

  async function generateRoadmapMaterialDraft() {
    if (!(materialForm.title || '').trim()) return showMsg('Judul materi wajib diisi dulu', 'error');
    setGeneratingRoadmapMaterial(true);
    try {
      const res = await fetch(`${apiBase}/admin/roadmap/materials/generate`, {
        method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          competency_id: Number(materialForm.competency_id || 0),
          title: (materialForm.title || '').trim(),
          brief: materialForm.brief || '',
          bloom_level: materialForm.bloom_level || 'C2',
          learning_objectives: materialForm.learning_objectives || '',
          style: materialForm.style || 'ringkas',
        })
      });
      const d = await res.json().catch(()=>({}));
      if (!res.ok) return showMsg(d.error || 'Gagal generate materi AI', 'error');
      setMaterialForm(f => ({ ...f, content: d.draft_content || f.content }));
      showMsg('Draft materi AI siap ✅', 'success');
    } finally {
      setGeneratingRoadmapMaterial(false);
    }
  }

  async function saveRoadmapMaterial() {
    if (!materialForm.competency_id) return showMsg('Kompetensi teknis wajib dipilih', 'error');
    if (!(materialForm.title || '').trim()) return showMsg('Judul materi wajib diisi', 'error');
    const unknown = findUnknownBacklinks(materialForm.content || '');
    if (materialStrictMode && unknown.length > 0) {
      return showMsg(`Strict mode aktif. Backlink belum ada: ${unknown.slice(0,4).join(', ')}${unknown.length>4?` (+${unknown.length-4})`:''}`, 'error');
    }
    const res = await fetch(`${apiBase}/admin/roadmap/materials`, {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        id: Number(materialForm.id) || 0,
        competency_id: Number(materialForm.competency_id),
        title: (materialForm.title || '').trim(),
        content: materialForm.content || '',
        bloom_level: materialForm.bloom_level || 'C2',
        is_active: !!materialForm.is_active,
      })
    });
    const d = await res.json().catch(()=>({}));
    if (!res.ok) return showMsg(d.error || 'Gagal simpan materi roadmap', 'error');
    showMsg('Materi roadmap tersimpan ✅', 'success');
    const keepComp = materialForm.competency_id;
    setMaterialForm({ id: 0, competency_id: keepComp, title: '', content: '', brief: '', bloom_level: 'C2', learning_objectives: '', style: 'ringkas', is_active: true });
    setMaterialLinkSuggestions([]); setMaterialLinkQuery('');
    await loadRoadmapMaterials(Number(keepComp));
  }

  async function deleteRoadmapMaterial(id) {
    if (!confirm('Hapus materi ini?')) return;
    const res = await fetch(`${apiBase}/admin/roadmap/materials`, {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'delete', id })
    });
    const d = await res.json().catch(()=>({}));
    if (!res.ok) return showMsg(d.error || 'Gagal hapus materi roadmap', 'error');
    showMsg('Materi roadmap dihapus ✅', 'success');
    if (materialForm.competency_id) await loadRoadmapMaterials(Number(materialForm.competency_id));
  }

  function updateMaterialContentWithSuggestions(text) {
    setMaterialForm(f => ({ ...f, content: text }));
    const m = text.match(/\[\[([^\]]*)$/);
    if (!m) { setMaterialLinkSuggestions([]); setMaterialLinkQuery(''); setMaterialSuggestionIndex(0); return; }
    const q = (m[1] || '').trim().toLowerCase();
    setMaterialLinkQuery(m[1] || '');

    const localPool = roadmapMaterials
      .filter(x => String(x.competency_id) === String(materialForm.competency_id || ''))
      .map(x => x.title)
      .filter(Boolean);
    const globalPool = roadmapMaterials.map(x => x.title).filter(Boolean);

    const localUniq = [...new Set(localPool)].filter(t => !q || t.toLowerCase().includes(q));
    const globalUniq = [...new Set(globalPool)].filter(t => !q || t.toLowerCase().includes(q) && !localUniq.includes(t));

    const merged = [...localUniq.map(t => ({ title: t, scope: 'local' })), ...globalUniq.map(t => ({ title: t, scope: 'global' }))].slice(0, 8);
    setMaterialLinkSuggestions(merged);
    setMaterialSuggestionIndex(0);
  }

  function insertMaterialBacklink(title) {
    const current = materialForm.content || '';
    const next = current.replace(/\[\[[^\]]*$/, `[[${title}]]`);
    setMaterialForm(f => ({ ...f, content: next }));
    setMaterialLinkSuggestions([]);
    setMaterialLinkQuery('');
    setMaterialSuggestionIndex(0);
  }

  function renderBacklinkBold(text) {
    const raw = String(text || '');
    const parts = raw.split(/(\[\[[^\]]+\]\])/g);
    return parts.map((p, i) => {
      const mm = p.match(/^\[\[([^\]]+)\]\]$/);
      if (mm) return <b key={i}>{mm[1]}</b>;
      return <span key={i}>{p}</span>;
    });
  }

  function findUnknownBacklinks(content) {
    const text = String(content || '');
    const matches = [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => (m[1] || '').trim()).filter(Boolean);
    const known = new Set(roadmapMaterials.map(x => (x.title || '').trim().toLowerCase()).filter(Boolean));
    const unknown = [];
    for (const t of matches) {
      if (!known.has(t.toLowerCase()) && !unknown.includes(t)) unknown.push(t);
    }
    return unknown;
  }

  function handleMaterialSuggestionKeyDown(e) {
    if (!materialLinkSuggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMaterialSuggestionIndex(i => Math.min(i + 1, materialLinkSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMaterialSuggestionIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const picked = materialLinkSuggestions[materialSuggestionIndex];
      if (picked?.title) insertMaterialBacklink(picked.title);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setMaterialLinkSuggestions([]);
      setMaterialSuggestionIndex(0);
    }
  }

  function extractBacklinksClient(content) {
    const text = String(content || '');
    return [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => (m[1] || '').trim()).filter(Boolean);
  }

  function buildMaterialGraphClient(positionId='', mode='material', matsSrc=null, compSrc=null) {
    const comps = compSrc || roadmapCompetencies;
    const matsAll = matsSrc || roadmapMaterials;
    const allowedCompetency = positionId
      ? new Set(comps.filter(c => String(c.position_id) === String(positionId)).map(c => String(c.id)))
      : null;
    const mats = matsAll.filter(m => !allowedCompetency || allowedCompetency.has(String(m.competency_id)));

    if (mode === 'competency') {
      const compMap = new Map();
      const titleToMat = new Map();
      for (const m of mats) {
        const c = comps.find(x => String(x.id) === String(m.competency_id));
        if (c) compMap.set(String(c.id), c.name || c.code || `Kompetensi ${c.id}`);
        titleToMat.set((m.title || '').trim().toLowerCase(), m);
      }
      const edgeSet = new Set();
      const unknownSet = new Set();
      for (const m of mats) {
        const from = String(m.competency_id);
        for (const t of extractBacklinksClient(m.content)) {
          const target = titleToMat.get(t.toLowerCase());
          if (!target) { unknownSet.add(t); continue; }
          const to = String(target.competency_id);
          edgeSet.add(`${from}->${to}`);
        }
      }
      const nodes = [...compMap.entries()].map(([id, title]) => ({ id: `c-${id}`, title }));
      const edges = [...edgeSet].map(x => { const [from,to]=x.split('->'); return { from:`c-${from}`, to:`c-${to}` }; });
      return { graph: JSON.stringify({ nodes, edges }), unknown: [...unknownSet] };
    }

    const titleToId = new Map();
    for (const m of mats) titleToId.set((m.title || '').trim().toLowerCase(), String(m.id));
    const edgeSet = new Set();
    const unknownSet = new Set();
    for (const m of mats) {
      const from = String(m.id);
      for (const t of extractBacklinksClient(m.content)) {
        const to = titleToId.get(t.toLowerCase());
        if (!to) { unknownSet.add(t); continue; }
        edgeSet.add(`${from}->${to}`);
      }
    }
    const nodes = mats.map(m => ({ id: String(m.id), title: m.title || `Materi ${m.id}` }));
    const edges = [...edgeSet].map(x => { const [from,to]=x.split('->'); return { from, to }; });
    return { graph: JSON.stringify({ nodes, edges }), unknown: [...unknownSet] };
  }

  async function loadRoadmapMaterialGraph(positionId='', mode='material') {
    const local = buildMaterialGraphClient(positionId, mode);
    setMaterialGraph(local.graph || '{"nodes":[],"edges":[]}');
    setMaterialUnknownBacklinks(local.unknown || []);
  }

  async function refreshRoadmapGraphData() {
    setRefreshingGraphData(true);
    try {
      const [pRes, kRes, mRes] = await Promise.all([
        fetch(`${apiBase}/admin/roadmap/positions`, { credentials: 'include' }),
        fetch(`${apiBase}/admin/roadmap/competencies`, { credentials: 'include' }),
        fetch(`${apiBase}/admin/roadmap/materials`, { credentials: 'include' }),
      ]);
      const pItems = pRes.ok ? ((await pRes.json()).items || []) : roadmapPositions;
      const kItems = kRes.ok ? ((await kRes.json()).items || []) : roadmapCompetencies;
      const mItems = mRes.ok ? ((await mRes.json()).items || []) : roadmapMaterials;
      if (pRes.ok) setRoadmapPositions(pItems);
      if (kRes.ok) setRoadmapCompetencies(kItems);
      if (mRes.ok) setRoadmapMaterials(mItems);
      const g = buildMaterialGraphClient(materialGraphFilter.position_id || '', materialGraphFilter.mode || 'material', mItems, kItems);
      setMaterialGraph(g.graph || '{"nodes":[],"edges":[]}');
      setMaterialUnknownBacklinks(g.unknown || []);
      showMsg('Graph roadmap direfresh ✅', 'success');
    } catch {
      showMsg('Gagal refresh data graph', 'error');
    } finally {
      setRefreshingGraphData(false);
    }
  }

  async function openMaterialFromGraph(nodeId) {
    const found = roadmapMaterials.find(m => String(m.id) === String(nodeId));
    if (!found) return showMsg('Materi dari node ini tidak ditemukan', 'error');
    setRoadmapMenu('materials');
    setMaterialForm({ id: found.id, competency_id: String(found.competency_id || ''), title: found.title || '', content: found.content || '', brief: '', bloom_level: found.bloom_level || 'C2', learning_objectives: '', style: 'ringkas', is_active: !!found.is_active });
    setPendingFocusMaterial(true);
    if (found.competency_id) await loadRoadmapMaterials(Number(found.competency_id));
    showMsg(`Membuka materi: ${found.title}`, 'success');
  }

  async function deleteRoadmapCategory(id) {
    if (!confirm('Hapus kategori roadmap ini? Catatan kategori ini juga terhapus.')) return;
    const res = await fetch(`${apiBase}/admin/roadmap/categories`, {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'delete', id })
    });
    const d = await res.json().catch(()=>({}));
    if (!res.ok) return showMsg(d.error || 'Gagal hapus kategori roadmap', 'error');
    showMsg('Kategori roadmap dihapus ✅', 'success');
    const cRes = await fetch(`${apiBase}/admin/roadmap/categories`, { credentials:'include' });
    if (cRes.ok) setRoadmapCategories((await cRes.json()).items || []);
    if (String(noteForm.category_id) === String(id)) { setNoteForm({ id:0, category_id:'', title:'', content:'' }); setRoadmapNotes([]); }
  }

  async function saveRoadmapCategory() {
    if (!categoryForm.position_id || !categoryForm.name.trim()) return showMsg('Posisi & nama kategori wajib diisi', 'error');
    const res = await fetch(`${apiBase}/admin/roadmap/categories`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...categoryForm, position_id: Number(categoryForm.position_id), order_no: Number(categoryForm.order_no || 0) })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return showMsg(d.error || 'Gagal simpan kategori roadmap', 'error');
    showMsg('Kategori roadmap tersimpan ✅', 'success');
    setCategoryForm({ id: 0, position_id: categoryForm.position_id, name: '', description: '', order_no: 0, is_active: true });
    const cRes = await fetch(`${apiBase}/admin/roadmap/categories`, { credentials: 'include' });
    if (cRes.ok) setRoadmapCategories((await cRes.json()).items || []);
  }

  async function loadRoadmapNotes(categoryId) {
    if (!categoryId) { setRoadmapNotes([]); setRoadmapGraph('{"nodes":[],"edges":[]}'); return; }
    const [res, gRes] = await Promise.all([
      fetch(`${apiBase}/admin/roadmap/notes?category_id=${categoryId}`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/roadmap/graph?category_id=${categoryId}`, { credentials: 'include' }),
    ]);
    if (res.ok) setRoadmapNotes((await res.json()).items || []);
    if (gRes.ok) {
      const gd = await gRes.json();
      setRoadmapGraph(gd.graph_json || '{"nodes":[],"edges":[]}');
      setRoadmapUnknownBacklinks(gd.unknown_backlinks || []);
    }
  }

  async function deleteRoadmapNote(id) {
    if (!confirm('Hapus catatan roadmap ini?')) return;
    const res = await fetch(`${apiBase}/admin/roadmap/notes`, {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'delete', id })
    });
    const d = await res.json().catch(()=>({}));
    if (!res.ok) return showMsg(d.error || 'Gagal hapus catatan roadmap', 'error');
    showMsg('Catatan roadmap dihapus ✅', 'success');
    setRoadmapNotes(prev => prev.filter(x => x.id !== id));
    if (noteForm.id === id) setNoteForm(f => ({ ...f, id:0, title:'', content:'' }));
    if (noteForm.category_id) await loadRoadmapNotes(Number(noteForm.category_id));
  }

  async function saveRoadmapNote() {
    if (!noteForm.category_id || !noteForm.title.trim()) return showMsg('Kategori & judul catatan wajib diisi', 'error');
    const res = await fetch(`${apiBase}/admin/roadmap/notes`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...noteForm, category_id: Number(noteForm.category_id) })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (d.error || 'Gagal simpan catatan roadmap') + (d.detail ? `\n${d.detail}` : '');
      if ((d.error || '').toLowerCase().includes('kategori roadmap tidak ditemukan')) {
        setNoteForm(f => ({ ...f, category_id: '', id: 0 }));
        const cRes = await fetch(`${apiBase}/admin/roadmap/categories`, { credentials: 'include' });
        if (cRes.ok) setRoadmapCategories((await cRes.json()).items || []);
      }
      return showMsg(msg, 'error');
    }
    showMsg('Catatan roadmap tersimpan ✅', 'success');
    if (d.item) {
      setRoadmapNotes(prev => {
        const rest = prev.filter(x => x.id !== d.item.id);
        return [d.item, ...rest];
      });
    }
    setNoteForm(f => ({ ...f, id: 0, title: '', content: '' }));
    await loadRoadmapNotes(Number(noteForm.category_id));
  }

  function parseRoadmapGraph(raw) {
    try {
      const x = JSON.parse(raw || '{"nodes":[],"edges":[]}');
      const nodes = (x.nodes || []).map((n, idx) => ({ id: String(n.id ?? idx + 1), title: n.title || n.label || `Node ${idx + 1}` }));
      const edges = (x.edges || []).map(e => ({ from: String(e.from ?? e.source ?? ''), to: String(e.to ?? e.target ?? '') })).filter(e => e.from && e.to);
      return { nodes, edges, error: '' };
    } catch {
      return { nodes: [], edges: [], error: 'Graph JSON tidak valid.' };
    }
  }

  async function loadPositionGraph(positionId, categoryIds = []) {
    if (!positionId) return setPositionGraph('{"nodes":[],"edges":[]}');
    const qs = new URLSearchParams({ position_id: String(positionId) });
    if (categoryIds.length) qs.set('category_ids', categoryIds.join(','));
    const res = await fetch(`${apiBase}/admin/roadmap/position-graph?${qs.toString()}`, { credentials: 'include' });
    if (res.ok) {
      const d = await res.json();
      setPositionGraph(d.graph_json || '{"nodes":[],"edges":[]}');
      setPositionUnknownBacklinks(d.unknown_backlinks || []);
    }
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
    const [amRes, grpRes, rCompRes, rMatRes] = await Promise.all([
      fetch(`${apiBase}/admin/materials`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/groups`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/roadmap/competencies`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/roadmap/materials`, { credentials: 'include' }),
    ]);
    if (amRes.ok) setAdminMaterials((await amRes.json()).items || []);
    if (grpRes.ok) setAdminGroups((await grpRes.json()).items || []);
    if (rCompRes.ok) setRoadmapCompetencies((await rCompRes.json()).items || []);
    if (rMatRes.ok) setRoadmapMaterials((await rMatRes.json()).items || []);
  }

  const [loadedAdminSections, setLoadedAdminSections] = useState({});

  async function loadAdminSection(section) {
    // Kontribusi harus selalu fresh (agar item baru langsung terlihat setelah submit)
    const alwaysRefresh = section === 'kontribusi';
    if (!alwaysRefresh && loadedAdminSections[section]) return;
    if (!alwaysRefresh) setLoadedAdminSections(prev => ({...prev, [section]: true}));
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
    } else if (section === 'kontribusi') {
      await refreshAdminContributions();
    } else if (section === 'roadmap') {
      const [pRes, kRes, ckRes, lkRes, mRes] = await Promise.all([
        fetch(`${apiBase}/admin/roadmap/positions`, { credentials: 'include' }),
        fetch(`${apiBase}/admin/roadmap/competencies`, { credentials: 'include' }),
        fetch(`${apiBase}/admin/roadmap/core-competencies`, { credentials: 'include' }),
        fetch(`${apiBase}/admin/roadmap/leadership-competencies`, { credentials: 'include' }),
        fetch(`${apiBase}/admin/roadmap/materials`, { credentials: 'include' }),
      ]);
      const pItems = pRes.ok ? ((await pRes.json()).items || []) : [];
      const kItems = kRes.ok ? ((await kRes.json()).items || []) : [];
      const ckItems = ckRes.ok ? ((await ckRes.json()).items || []) : [];
      const lkItems = lkRes.ok ? ((await lkRes.json()).items || []) : [];
      const mItems = mRes.ok ? ((await mRes.json()).items || []) : [];
      setRoadmapPositions(pItems);
      setRoadmapCompetencies(kItems);
      setRoadmapCoreCompetencies(ckItems);
      setRoadmapLeadershipCompetencies(lkItems);
      setRoadmapMaterials(mItems);
      const localGraph = buildMaterialGraphClient(materialGraphFilter.position_id || '', materialGraphFilter.mode || 'material', mItems, kItems);
      setMaterialGraph(localGraph.graph || '{"nodes":[],"edges":[]}');
      setMaterialUnknownBacklinks(localGraph.unknown || []);
    } else if (section === 'ai') {
      const [res, pRes] = await Promise.all([
        fetch(`${apiBase}/admin/ai-settings`, { credentials: 'include' }),
        fetch(`${apiBase}/admin/ai-profiles`, { credentials: 'include' }),
      ]);
      if (res.ok) setAiSettings(await res.json());
      else showMsg('Gagal load AI settings', 'error');
      if (pRes.ok) setAiProfiles((await pRes.json()).items || []);
      else showMsg('Gagal load AI profiles (cek role super_admin)', 'error');
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

  async function submitReflectionWeb() {
    if (!reflectionDraft.trim()) { showMsg('Isi refleksi dulu ya', 'error'); return false; }
    setReflectionSaving(true);
    const res = await fetch(`${apiBase}/participant/reflections`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: reflectionDraft.trim() })
    });
    const d = await res.json().catch(() => ({}));
    setReflectionSaving(false);
    if (!res.ok) { showMsg(d.error || 'Gagal simpan refleksi', 'error'); return false; }
    showMsg(d.awarded_exp ? 'Refleksi tersimpan (+EXP) ✅' : 'Refleksi hari ini diperbarui ✅', 'success');
    setReflectionDraft('');
    const refRes = await fetch(`${apiBase}/participant/reflections`, { credentials: 'include' });
    if (refRes.ok) setMyReflections((await refRes.json()).items || []);
    return true;
  }

  async function deleteReflection(id) {
    if (!id) return;
    if (!confirm('Hapus refleksi ini?')) return;
    setReflectionDeletingId(id);
    const res = await fetch(`${apiBase}/participant/reflections?id=${id}`, { method: 'DELETE', credentials: 'include' });
    const d = await res.json().catch(() => ({}));
    setReflectionDeletingId(null);
    if (!res.ok) return showMsg(d.error || 'Gagal hapus refleksi', 'error');
    setMyReflections(prev => prev.filter(r => r.id !== id));
    showMsg('Refleksi berhasil dihapus ✅', 'success');
  }

  useEffect(() => {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('[PWA] SW registered', reg.scope))
        .catch(err => console.log('[PWA] SW error', err));
    }

    // 2. Cek apakah sudah di-install (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    if (isStandalone) return; // sudah diinstall, skip banner

    // 3. Cek dismiss (cooldown 24 jam)
    const dismissUntil = Number(localStorage.getItem('pwa-dismissed-until') || 0);
    if (dismissUntil > Date.now()) return;

    // 4. Android/Chrome: tangkap beforeinstallprompt
    const handler = (e) => {
      e.preventDefault(); // cegah mini-bar Chrome, kita pakai custom banner
      setInstallPrompt(e);
      setShowInstallBanner(true); // tampilkan banner kita
    };
    window.addEventListener('beforeinstallprompt', handler);

    // 5. iOS Safari: tampilkan instruksi manual
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setTimeout(() => setShowInstallBanner(true), 3000);
    }

    // 6. Sembunyikan banner saat berhasil diinstall
    window.addEventListener('appinstalled', () => {
      setShowInstallBanner(false);
      setInstallPrompt(null);
      localStorage.setItem('pwa-dismissed-until', String(Date.now() + 24*60*60*1000));
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const u = await fetchMe();
        setMe(u);
        if (u) {
          const savedMode = localStorage.getItem('nk_entry_mode') || '';
          if (savedMode === 'notes' || savedMode === 'portal') {
            setEntryMode(savedMode);
            if (savedMode === 'notes') setParticipantSection('catatan');
          }
          await loadPortal(u.role);
          if (savedMode === 'notes') await loadSection('catatan');
        }
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
    setEntryMode(''); // paksa pilih mode setiap login
    localStorage.removeItem('nk_entry_mode');
    await loadPortal(u.role);
  }

  async function logout() {
    await fetch(`${apiBase}/auth/logout`, { method: 'POST', credentials: 'include' });
    setMe(null); setProfile(null); setEntryMode('');
    localStorage.removeItem('nk_entry_mode');
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
    const cat = categories.find(c => String(c.id) === String(q.category_id));
    const m = String(cat?.code || '').match(/^rmc-(\d+)$/);
    setQCategoryId(m ? m[1] : '');
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
        ? { action: 'update', id: Number(editingQuestionId), roadmap_competency_id: Number(qCategoryId), question_text: qText, option_a: qA, option_b: qB, option_c: qC, option_d: qD, correct_option: qCorrect, is_active: true }
        : { action: 'create', roadmap_competency_id: Number(qCategoryId), question_text: qText, option_a: qA, option_b: qB, option_c: qC, option_d: qD, correct_option: qCorrect })
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

  async function saveAISettings() {
    setBusy(true); setActionMsg('');
    const res = await fetch(`${apiBase}/admin/ai-settings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({
        provider: aiSettings.provider,
        base_url: aiSettings.base_url,
        api_key: aiSettings.api_key || '',
        model: aiSettings.model,
        temperature: Number(aiSettings.temperature || 0.7),
        max_tokens: Number(aiSettings.max_tokens || 2000),
        is_active: !!aiSettings.is_active,
      })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal simpan AI settings.'); setBusy(false); return; }
    const rr = await fetch(`${apiBase}/admin/ai-settings`, { credentials: 'include' });
    if (rr.ok) setAiSettings(await rr.json());
    setActionType('success'); setActionMsg('AI Settings berhasil disimpan.'); setBusy(false);
  }

  async function testAISettings() {
    setBusy(true); setActionMsg('');
    const res = await fetch(`${apiBase}/admin/ai-settings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ action: 'test' })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Tes AI gagal.'); setBusy(false); return; }
    setActionType('success'); setActionMsg(`Tes AI OK: ${d.result || 'berhasil'}`); setBusy(false);
  }

  async function saveAIProfile() {
    setBusy(true); setActionMsg('');
    const action = aiProfileForm.id ? 'update' : 'create';
    const res = await fetch(`${apiBase}/admin/ai-profiles`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ action, ...aiProfileForm })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal simpan profile AI.'); showMsg(d.error || 'Gagal simpan profile AI.', 'error'); setBusy(false); return; }
    const pRes = await fetch(`${apiBase}/admin/ai-profiles`, { credentials: 'include' });
    if (pRes.ok) setAiProfiles((await pRes.json()).items || []);
    setAiProfileForm({ id: 0, name: '', provider: 'sumopod', base_url: 'https://ai.sumopod.com/v1/chat/completions', api_key: '', model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 2000 });
    setActionType('success'); setActionMsg('Profile AI disimpan.'); showMsg('Profile AI disimpan ✅', 'success'); setBusy(false);
  }

  async function activateAIProfile(id) {
    setBusy(true); setActionMsg('');
    const res = await fetch(`${apiBase}/admin/ai-profiles`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ action: 'activate', id })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal aktifkan profile.'); setBusy(false); return; }
    const [sRes, pRes] = await Promise.all([
      fetch(`${apiBase}/admin/ai-settings`, { credentials: 'include' }),
      fetch(`${apiBase}/admin/ai-profiles`, { credentials: 'include' }),
    ]);
    if (sRes.ok) setAiSettings(await sRes.json());
    if (pRes.ok) setAiProfiles((await pRes.json()).items || []);
    setActionType('success'); setActionMsg('Profile AI diaktifkan.'); setBusy(false);
  }

  async function deleteAIProfile(id) {
    setBusy(true); setActionMsg('');
    const res = await fetch(`${apiBase}/admin/ai-profiles`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ action: 'delete', id })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal hapus profile.'); setBusy(false); return; }
    const pRes = await fetch(`${apiBase}/admin/ai-profiles`, { credentials: 'include' });
    if (pRes.ok) setAiProfiles((await pRes.json()).items || []);
    setActionType('success'); setActionMsg('Profile AI dihapus.'); setBusy(false);
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

  function splitRoadmapMaterialToBubbles(content, maxLen = 700) {
    const text = String(content || '').replace(/\r/g, '').trim();
    if (!text) return [''];
    const paras = text.split(/\n\n+/).map(x => x.trim()).filter(Boolean);
    const out = [];
    let cur = '';
    for (const p of paras) {
      if (!cur) { cur = p; continue; }
      if ((cur + '\n\n' + p).length <= maxLen) cur += '\n\n' + p;
      else { out.push(cur); cur = p; }
    }
    if (cur) out.push(cur);
    return out.slice(0, 20);
  }

  function importRoadmapMaterialToChat() {
    const m = roadmapMaterials.find(x => String(x.id) === String(chatRoadmapMaterialId || ''));
    if (!m) return showMsg('Pilih materi roadmap dulu', 'error');
    setMateriType('text');
    setMateriTitle(m.title || '');
    setMateriBubbles(splitRoadmapMaterialToBubbles(m.content || ''));
    showMsg('Materi roadmap berhasil dimuat ke Chat ✅', 'success');
  }

  // ── Materi functions ─────────────────────────────────────
  async function saveMateri() {
    setBusy(true); setActionMsg('');
    const isEdit = !!editingMateriId;
    const body = {
      action: isEdit ? 'update' : 'create',
      ...(isEdit && { id: Number(editingMateriId) }),
      category_id: Number(materiCatId) || 0,
      roadmap_competency_id: Number(chatRoadmapCompId) || 0,
      title: materiTitle,
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
    setChatRoadmapCompId(''); setChatRoadmapMaterialId('');
    setMateriType('text'); setMateriContent(''); setMateriExp('10');
    setMateriOrder('0'); setMateriActive(true); setMateriBubbles(['']);
  }

  function startEditMateri(m) {
    setEditingMateriId(String(m.id)); setMateriCatId(String(m.category_id));
    const cat = categories.find(c => String(c.id) === String(m.category_id));
    const mm = String(cat?.code || '').match(/^lrmc-(\d+)$/);
    setChatRoadmapCompId(mm ? mm[1] : '');
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

  async function sendMateriTestTelegram(id) {
    setBusy(true);
    const res = await fetch(`${apiBase}/admin/materials`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ action: 'send_test', id }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal kirim test chat Telegram.'); setBusy(false); return; }
    setActionType('success'); setActionMsg(`Test chat Telegram terkirim (${d.sent || 1} pesan).`); setBusy(false);
  }

  async function previewPublishMateriTelegram(id) {
    setBusy(true);
    const res = await fetch(`${apiBase}/admin/materials`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ action: 'preview_publish', id }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal preview publish.'); setBusy(false); return; }
    setChatPublishPreview({ id, ...d });
    setActionType('success'); setActionMsg(`Preview siap: ${d.recipient_count || 0} peserta, ${d.bubble_count || 0} bubble.`); setBusy(false);
  }

  async function publishMateriTelegram(id) {
    if (!confirm('Kirim chat ini ke peserta sesuai group jabatan roadmap?')) return;
    setBusy(true);
    const res = await fetch(`${apiBase}/admin/materials`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ action: 'send_publish', id }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setActionType('error'); setActionMsg(d.error || 'Gagal publish chat Telegram.'); setBusy(false); return; }
    setChatPublishPreview(null);
    setActionType('success'); setActionMsg(`Publish berhasil. Peserta terkirim: ${d.sent_users || 0}, total pesan: ${d.sent_messages || 0}.`); setBusy(false);
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
  const notesOnlyMode = entryMode === 'notes';
  const participantMenu = notesOnlyMode
    ? [['catatan', '📝', 'Catatan']]
    : [
        ['profil', '👤', 'Profil'],
        ['catatan', '📝', 'Catatan'],
        ['roadmap', '🕸️', 'Roadmap'],
        ['quiz', '🧠', 'Quiz & Tryout'],
        ['redeem', '🎁', 'Redeem'],
        ['poin', '💰', 'Poin'],
      ];

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

  // ── Pilih Mode Masuk ─────────────────────────────────────
  if (!entryMode) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 680, border: '1px solid #1e2d45', borderRadius: 20, padding: 24, background: 'rgba(15,23,42,0.85)' }}>
          <h2 style={{ margin: '0 0 8px', color: '#fff' }}>Pilih Mode Masuk</h2>
          <p style={{ margin: '0 0 18px', color: '#94a3b8', fontSize: 13 }}>Kamu bisa masuk cepat ke Catatan atau ke Portal Lengkap. Data catatan tetap sinkron di keduanya.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button onClick={async () => { setEntryMode('notes'); localStorage.setItem('nk_entry_mode', 'notes'); setParticipantSection('catatan'); await loadSection('catatan'); }}
              style={{ border: '1px solid #334155', borderRadius: 14, padding: 16, background: '#0b1220', color: '#e2e8f0', textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>📝 Mode Catatan</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Hanya fitur catatan (cepat, fokus).</div>
            </button>
            <button onClick={() => { setEntryMode('portal'); localStorage.setItem('nk_entry_mode', 'portal'); }}
              style={{ border: '1px solid #334155', borderRadius: 14, padding: 16, background: '#0b1220', color: '#e2e8f0', textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>🎓 Portal Lengkap</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Semua fitur Naik Kelas.</div>
            </button>
          </div>
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

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {adminViewMode === 'admin' && (
              <button onClick={() => setAdminViewMode('participant')} style={{
                border: '1px solid rgba(0,0,0,0.25)',
                background: 'rgba(0,0,0,0.2)', color: 'white',
                borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600
              }}>
                👤 Peserta
              </button>
            )}
            {adminViewMode === 'participant' && (
              <button onClick={() => setAdminViewMode('admin')} style={{
                border: '1px solid rgba(0,0,0,0.25)',
                background: 'rgba(0,0,0,0.2)', color: 'white',
                borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600
              }}>
                ⚙️ Admin
              </button>
            )}
            {showParticipantView && (
              <button onClick={async () => {
                const next = notesOnlyMode ? 'portal' : 'notes';
                setEntryMode(next);
                localStorage.setItem('nk_entry_mode', next);
                if (next === 'notes') { setParticipantSection('catatan'); await loadSection('catatan'); }
              }} style={{
                border: '1px solid rgba(0,0,0,0.25)',
                background: 'rgba(0,0,0,0.2)', color: 'white',
                borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600
              }}>
                {notesOnlyMode ? '🎓 Portal Lengkap' : '📝 Mode Catatan'}
              </button>
            )}
            <button onClick={logout} style={{
              border: '1px solid rgba(0,0,0,0.25)',
              background: 'rgba(0,0,0,0.2)', color: 'white',
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
          <div className="nk-portal-layout">

            {/* Sidebar Peserta */}
            <aside className="nk-sidebar">
              <p className="nk-sidebar-label" style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 12px 8px' }}>Menu</p>
              {participantMenu.map(([key, icon, label]) => (
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

              <div className="nk-stat-card purple">
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>📔 Jadwal Refleksi</div>
                {reflectionReminderTime ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Jam {reflectionReminderTime}</div>
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>WIB</div>
                    <span className="nk-badge nk-badge-green" style={{ marginTop: 10 }}>● Aktif</span>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>Belum diatur</div>
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>Atur via bot: <b style={{ color: '#a78bfa' }}>/jadwal_refleksi</b></div>
                  </>
                )}
              </div>
            </div>

            </>)}

            {/* Link ke Bot */}
            {participantSection === 'profil' && (
              <a href={`https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME || 'NalaNaikKelas_bot'}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg, rgba(0,136,204,0.15), rgba(0,136,204,0.05))', border: '1px solid rgba(0,136,204,0.25)', borderRadius: 14, padding: '14px 18px', marginBottom: 12, textDecoration: 'none', cursor: 'pointer' }}>
                <span style={{ fontSize: 28 }}>✈️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#38bdf8' }}>Buka Bot Nala di Telegram</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Quiz, tryout, catatan sementara & pengingat belajar</div>
                </div>
                <span style={{ marginLeft: 'auto', color: '#38bdf8', fontSize: 18 }}>→</span>
              </a>
            )}

            {/* Keamanan Akun dipindah ke bawah profil */}

            {/* ── Poin ── */}
            {/* ── Badges (dipindah ke Profil) ── */}
            {participantSection === 'profil' && (
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

            {/* ── Leaderboard (dipindah ke Profil) ── */}
            {participantSection === 'profil' && (<>
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

            {/* Ubah Password (dipindah ke paling bawah Profil) */}
            <Section title="🔒 Keamanan Akun" style={{ marginTop: 12 }}>
              {!showChangePass ? (
                <button onClick={() => setShowChangePass(true)}
                  style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#818cf8', padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                  🔑 Ubah Password
                </button>
              ) : (
                <div style={{ maxWidth: 400 }}>
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
                        if (res.ok) {
                          showMsg('Password berhasil diubah ✅', 'success');
                          setShowChangePass(false);
                          setChangePassForm({old:'',new1:'',new2:''});
                          const latestMe = await fetchMe();
                          if (latestMe) setMe(latestMe);
                          else setMe(m => ({ ...m, must_change_password: false }));
                        } else showMsg(d.error || 'Gagal ubah password', 'error');
                      }}>💾 Simpan Password</BtnSm>
                    <BtnSm onClick={() => { setShowChangePass(false); setChangePassForm({old:'',new1:'',new2:''}); }}>Batal</BtnSm>
                  </div>
                </div>
              )}
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
                  <button onClick={() => { setShowReflectionEditor(true); }}
                    style={{ padding: '7px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                    📔 Refleksi Baru
                  </button>
                  <button onClick={() => { setNoteView('list'); setNoteListMode('all'); }}
                    style={{ padding: '7px 12px', background: noteView === 'list' ? '#1e3a5f' : 'transparent', color: noteView === 'list' ? '#93c5fd' : '#64748b', border: '1px solid #1e2d45', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                    📋 Daftar
                  </button>
                  <button onClick={loadGraph}
                    style={{ padding: '7px 12px', background: noteView === 'graph' ? '#1e3a5f' : 'transparent', color: noteView === 'graph' ? '#93c5fd' : '#64748b', border: '1px solid #1e2d45', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                    🕸️ Graph
                  </button>
                  <button onClick={loadCanvas}
                    style={{ padding: '7px 12px', background: noteView === 'canvas' ? '#1e3a5f' : 'transparent', color: noteView === 'canvas' ? '#93c5fd' : '#64748b', border: '1px solid #1e2d45', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                    🖼️ Canvas
                  </button>
                  {noteView === 'list' && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        ['permanent', '📌 Permanen'],
                        ['quick', '⚡ Cepat'],
                        ['reflection', '📔 Refleksi Diri'],
                      ].map(([k, label]) => (
                        <button key={k} onClick={() => setNoteListMode(k)}
                          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid', borderColor: noteListMode === k ? '#7c3aed' : '#1e2d45', background: noteListMode === k ? 'rgba(124,58,237,0.18)' : 'transparent', color: noteListMode === k ? '#c4b5fd' : '#64748b', cursor: 'pointer', fontSize: 12 }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
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

                {/* Refleksi Harian (di Catatan) */}
                {noteView === 'list' && (noteListMode === 'all' || noteListMode === 'reflection') && (
                <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8, gap: 8, flexWrap:'wrap' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#cbd5e1' }}>📔 Refleksi Harian</div>
                    <button onClick={() => setShowReflectionEditor(true)}
                      style={{ padding:'6px 12px', borderRadius:8, border:'none', background:'#7c3aed', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      ➕ Buat Refleksi
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Privat • tersimpan di akunmu • submit pertama harian dapat EXP</div>
                  {myReflections.length ? (
                    <div style={{ display: 'grid', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                      {myReflections.slice(0, 5).map(r => (
                        <div key={r.id} style={{ background:'#080d18', border:'1px solid #1e2d45', borderRadius:8, padding:'8px 10px' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:4 }}>
                            <div style={{ fontSize:11, color:'#94a3b8' }}>📅 {new Date(r.reflected_date + 'T00:00:00').toLocaleDateString('id-ID')}</div>
                            <button onClick={() => deleteReflection(r.id)} disabled={reflectionDeletingId === r.id}
                              style={{ background:'transparent', border:'1px solid #7f1d1d', color:'#fca5a5', borderRadius:6, fontSize:11, padding:'2px 7px', cursor:'pointer' }}>
                              {reflectionDeletingId === r.id ? '⏳' : '🗑 Hapus'}
                            </button>
                          </div>
                          <div style={{ fontSize:12, color:'#cbd5e1', lineHeight:1.5, whiteSpace:'pre-wrap' }}>{(r.content || '').slice(0, 140)}{(r.content || '').length > 140 ? '...' : ''}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="nk-empty" style={{ margin: 0 }}>Belum ada refleksi.</div>
                  )}
                </div>
                )}

                {/* LIST VIEW */}
                {noteView === 'list' && (() => {
                  const permanent = notes.filter(n => n.note_type !== 'fleeting');
                  const fleeting = notes.filter(n => n.note_type === 'fleeting');
                  return (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {noteListMode !== 'reflection' && notes.length === 0 && <div className="nk-empty">📝 Belum ada catatan. Buat yang pertama atau kirim /catatan di bot Nala!</div>}
                      {noteListMode === 'reflection' && myReflections.length === 0 && <div className="nk-empty">📔 Belum ada refleksi diri.</div>}

                      {/* Catatan Permanen */}
                      {(noteListMode === 'all' || noteListMode === 'permanent') && permanent.length > 0 && (
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
                      {(noteListMode === 'all' || noteListMode === 'quick') && fleeting.length > 0 && (
                        <div>
                          <p style={{ fontSize: 11, color: '#78716c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' }}>⚡ Catatan Sementara dari Bot ({fleeting.length})</p>
                          <div style={{ display: 'grid', gap: 6 }}>
                            {fleeting.map(n => (
                              <div key={n.id}
                                style={{ background: '#13110e', border: '1px solid #2c2520', borderRadius: 10, padding: '11px 14px', cursor: 'pointer' }}
                                onClick={() => loadNoteDetail(n.id)}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, color: '#a8a29e', marginBottom: 4, lineHeight: 1.5 }}>{n.title}</div>
                                    <span style={{ fontSize: 11, color: '#57534e' }}>{new Date(n.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                    {/* Tombol Edit — buka editor langsung */}
                                    <button onClick={e => { e.stopPropagation(); loadNoteDetail(n.id); }}
                                      style={{ padding: '4px 9px', background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                                      ✏️ Edit
                                    </button>
                                    {/* Tombol Jadikan Permanen */}
                                    <button onClick={e => { e.stopPropagation(); loadNoteDetail(n.id); }}
                                      style={{ padding: '4px 9px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                                      📌
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
                          {activeNote?.note_type !== 'fleeting' && (
                            <button onClick={() => openContributeModal(activeNote)}
                              style={{ padding: '5px 12px', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                              💡 Ajukan ke Materi
                            </button>
                          )}
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

                {/* CANVAS VIEW */}
                {noteView === 'canvas' && (() => {
                  // ── Tampilan Canvas editor (saat canvas dipilih) ──
                  if (canvasOpenId) return (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <button onClick={() => setCanvasOpenId(null)}
                          style={{ padding: '5px 12px', background: 'transparent', color: '#64748b', border: '1px solid #1e2d45', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>
                          ← Daftar Canvas
                        </button>
                        <span style={{ fontSize: 13, color: '#93c5fd', fontWeight: 700 }}>
                          🖼️ {canvasList.find(c => c.id === canvasOpenId)?.name || 'Canvas'}
                        </span>
                      </div>
                      <NoteCanvasRF
                        notes={notes}
                        apiBase={apiBase}
                        initialCanvasId={canvasOpenId}
                        onOpenNote={(id) => { loadNoteDetail(id); setNoteView('editor'); }}
                      />
                    </div>
                  );

                  // ── Daftar Canvas ──
                  return (
                    <div>
                      {/* Header + tombol buat canvas baru */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>🖼️ Canvas ({canvasList.length})</span>
                        <button
                          onClick={() => {
                            const name = prompt('Nama canvas baru:');
                            if (name?.trim()) createCanvasFromList(name.trim());
                          }}
                          style={{ padding: '6px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                          + Canvas Baru
                        </button>
                      </div>

                      {/* Grid daftar canvas */}
                      {canvasList.length === 0
                        ? (
                          <div style={{ textAlign: 'center', padding: '48px 0', color: '#334155' }}>
                            <div style={{ fontSize: 40, marginBottom: 10 }}>🖼️</div>
                            <p style={{ fontSize: 14 }}>Belum ada canvas. Buat yang pertama!</p>
                          </div>
                        )
                        : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                            {canvasList.map(c => (
                              <div key={c.id}
                                onClick={() => canvasRenamingId !== c.id && setCanvasOpenId(c.id)}
                                style={{
                                  background: 'linear-gradient(135deg, #0b1628, #0f172a)',
                                  border: '1px solid #1e3a5f', borderRadius: 12,
                                  padding: '18px 16px', cursor: canvasRenamingId === c.id ? 'default' : 'pointer',
                                  transition: 'border-color 0.15s, box-shadow 0.15s',
                                  position: 'relative',
                                }}
                                onMouseEnter={e => { if (canvasRenamingId !== c.id) { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.2)'; }}}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e3a5f'; e.currentTarget.style.boxShadow = 'none'; }}>
                                <div style={{ fontSize: 28, marginBottom: 8 }}>🖼️</div>

                                {/* Nama canvas — klik ✏️ untuk rename inline */}
                                {canvasRenamingId === c.id ? (
                                  <input
                                    autoFocus
                                    value={canvasRenameVal}
                                    onChange={e => setCanvasRenameVal(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') renameCanvasFromList(c.id, canvasRenameVal);
                                      if (e.key === 'Escape') setCanvasRenamingId(null);
                                    }}
                                    onBlur={() => renameCanvasFromList(c.id, canvasRenameVal)}
                                    style={{ width: '100%', background: '#1e293b', border: '1px solid #3b82f6', borderRadius: 6, color: '#e2e8f0', padding: '4px 8px', fontSize: 13, fontWeight: 700, outline: 'none', marginBottom: 4 }}
                                  />
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                      {c.name}
                                    </span>
                                    {/* Tombol rename */}
                                    <button
                                      onClick={e => { e.stopPropagation(); setCanvasRenamingId(c.id); setCanvasRenameVal(c.name); }}
                                      style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13, padding: '0 2px', flexShrink: 0 }}
                                      title="Ganti nama">
                                      ✏️
                                    </button>
                                  </div>
                                )}

                                <div style={{ fontSize: 11, color: '#475569' }}>
                                  {new Date(c.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>

                                {/* Tombol hapus */}
                                {canvasList.length > 1 && (
                                  <button
                                    onClick={e => { e.stopPropagation(); deleteCanvasFromList(c.id); }}
                                    style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', color: '#334155', cursor: 'pointer', fontSize: 14 }}>
                                    🗑
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      }
                    </div>
                  );
                })()}

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

            {/* ── Roadmap (Participant) ── */}
            {participantSection === 'roadmap' && (
              <>
                <Section title="🕸️ Roadmap Materi">
                  <div style={{ display:'grid', gap:10 }}>
                    <div style={{ display:'grid', gap:8, gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))' }}>
                      <select className="nk-input-sm" value={participantRoadmapFilter.position_id} onChange={async e => {
                        const v = e.target.value;
                        setParticipantRoadmapMaterialDetail(null);
                        setParticipantRoadmapFilter(f => ({ ...f, position_id: v }));
                        await loadParticipantRoadmapGraph(v, participantRoadmapFilter.mode || 'material');
                      }}>
                        <option value="">Semua jabatan</option>
                        {participantRoadmapPositions.map(p => <option key={p.id} value={p.id}>{p.code} • {p.name}</option>)}
                      </select>
                      <select className="nk-input-sm" value={participantRoadmapFilter.mode || 'material'} onChange={async e => {
                        const mode = e.target.value;
                        setParticipantRoadmapMaterialDetail(null);
                        setParticipantRoadmapFilter(f => ({ ...f, mode }));
                        await loadParticipantRoadmapGraph(participantRoadmapFilter.position_id || '', mode);
                      }}>
                        <option value="material">Mode: Materi</option>
                        <option value="competency">Mode: Kompetensi</option>
                      </select>
                      <button className="nk-input-sm" onClick={() => loadParticipantRoadmapGraph(participantRoadmapFilter.position_id || '', participantRoadmapFilter.mode || 'material')}>🔄 Refresh Graph</button>
                    </div>

                    <div style={{ border:'1px solid #1e2d45', borderRadius: 10, padding: 10 }}>
                      <div style={{ fontWeight:700, marginBottom:8 }}>Graph Materi (Backlink)</div>
                      {(() => { const g = parseRoadmapGraph(participantRoadmapGraph); return g.error ? <div className="nk-empty" style={{ margin:0 }}>{g.error}</div> : <NoteGraph nodes={g.nodes} edges={g.edges} onNodeClick={openParticipantRoadmapMaterial} />; })()}
                      {participantUnknownBacklinks.length > 0 && (
                        <div className="nk-empty" style={{ marginTop:8, color:'#fbbf24' }}>⚠️ Referensi belum ditemukan: {participantUnknownBacklinks.slice(0,8).join(', ')}{participantUnknownBacklinks.length > 8 ? ` (+${participantUnknownBacklinks.length - 8})` : ''}</div>
                      )}
                    </div>

                    {participantRoadmapMaterialDetail && (
                      <div style={{ border:'1px solid #1e2d45', borderRadius: 10, padding: 12 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'center', marginBottom:8 }}>
                          <div style={{ fontWeight:700 }}>📘 Baca Materi</div>
                          <span className="nk-badge">{participantRoadmapMaterialDetail.bloom_level || 'C2'}</span>
                        </div>
                        <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>{participantRoadmapMaterialDetail.title}</div>
                        <div style={{ color:'#cbd5e1', lineHeight:1.7 }} dangerouslySetInnerHTML={{ __html: renderMD(participantRoadmapMaterialDetail.content || '-') }} />
                      </div>
                    )}
                  </div>
                </Section>
              </>
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

            

            </div>
          </div>
        )}

        {/* ── Modal Ajukan Catatan ke Materi ── */}
        {showContributeModal && contributeNote && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>
                💡 Ajukan Catatan ke Materi
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
                Catatan ini akan direview admin sebelum jadi materi resmi.
              </p>

              {/* Preview catatan */}
              <div style={{ background: '#080d18', border: '1px solid #1e2d45', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd', marginBottom: 6 }}>
                  📝 {contributeNote.title}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, maxHeight: 80, overflow: 'hidden' }}>
                  {contributeNote.content?.slice(0, 200)}{contributeNote.content?.length > 200 ? '...' : ''}
                </div>
              </div>

              {/* Pilih Kategori */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>
                  📚 Pilih Kategori Materi
                </label>
                {contributeCategories.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#64748b', padding: '10px 0' }}>⏳ Memuat kategori...</div>
                ) : (
                  <select
                    value={contributeCategoryId}
                    onChange={e => setContributeCategoryId(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      border: '1px solid #1e2d45', background: '#080d18',
                      color: '#e2e8f0', fontSize: 14
                    }}
                  >
                    <option value="">Pilih kategori yang sesuai...</option>
                    {contributeCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setShowContributeModal(false); setContributeNote(null); }}
                  disabled={contributeLoading}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #374151', background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                >
                  Batal
                </button>
                <button
                  onClick={submitContribution}
                  disabled={contributeLoading || !contributeCategoryId}
                  style={{
                    flex: 2, padding: '10px', borderRadius: 8, border: 'none',
                    background: contributeLoading || !contributeCategoryId ? '#374151' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    color: 'white', fontSize: 13, fontWeight: 700,
                    cursor: contributeLoading || !contributeCategoryId ? 'not-allowed' : 'pointer',
                    opacity: contributeLoading || !contributeCategoryId ? 0.6 : 1
                  }}
                >
                  {contributeLoading ? '⏳ Mengajukan...' : '🚀 Ajukan ke Materi'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal Refleksi Harian ── */}
        {showReflectionEditor && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 16, padding: 20, width: '100%', maxWidth: 560 }}>
              <h3 style={{ margin: '0 0 8px', color: '#e2e8f0' }}>📔 Buat Refleksi Harian</h3>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b' }}>Refleksi bersifat privat. Submit pertama hari ini dapat EXP.</p>
              <textarea
                value={reflectionDraft}
                onChange={e => setReflectionDraft(e.target.value)}
                placeholder="Tulis refleksi harianmu di sini..."
                style={{ width:'100%', minHeight: 140, background:'#080d18', border:'1px solid #1e2d45', borderRadius: 8, color:'#e2e8f0', padding:'10px 12px', fontSize:13, resize:'vertical' }}
              />
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop: 10 }}>
                <button onClick={() => setShowReflectionEditor(false)}
                  style={{ padding:'8px 12px', borderRadius:8, border:'1px solid #334155', background:'transparent', color:'#94a3b8', fontSize:12, cursor:'pointer' }}>
                  Batal
                </button>
                <button
                  onClick={async () => { const ok = await submitReflectionWeb(); if (ok) setShowReflectionEditor(false); }}
                  disabled={reflectionSaving || !reflectionDraft.trim()}
                  style={{ padding:'8px 12px', borderRadius:8, border:'none', background: reflectionSaving || !reflectionDraft.trim() ? '#334155' : '#7c3aed', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  {reflectionSaving ? '⏳ Menyimpan...' : '💾 Simpan Refleksi'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Admin View ── */}
        {showAdminView && (
          <div className="nk-admin-layout">
            {/* Sidebar */}
            <aside className="nk-admin-sidebar">
              <p style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 12px 8px' }}>
                Menu Admin
              </p>
              <nav style={{ display: 'grid', gap: 4 }}>
                {[
                  ...(me?.is_super_admin ? [['kelompok', '🏢', 'Kelompok']] : []),
                  ['peserta', '👥', 'Peserta'],
                  ['bank', '📚', 'Bank Soal'],
                  ['tryout', '🎯', 'Tryout'],
                  ['materi', '💬', 'Chat'],
                  ['roadmap', '🧭', 'Roadmap Jabatan'],
                  ['kontribusi', '💡', 'Kontribusi'],
                  ['redeem', '🎁', 'Redeem'],
                  ['refleksi', '📔', 'Refleksi'],
                  ['badges', '🎖️', 'Badges'],
                  ['feedback', '💬', 'Feedback'],
                  ['jadwal', '📅', 'Jadwal Belajar'],
                  ['poin', '💰', 'Poin'],
                  ['exp', '⭐', 'EXP'],
                  ...(isSuperAdmin ? [['ai', '🤖', 'AI Settings']] : []),
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
                  <AdminSection title="📝 Bank Soal">
                    {/* AI Generate Soal */}
                    <div style={{ background: '#0a1e3a', border: '1px dashed #2563eb', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                      <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#93c5fd' }}>✨ Generate Soal dengan AI</p>
                      <div className="nk-grid-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 8 }}>
                        <div>
                          <label style={fieldLbl}>Kompetensi (Roadmap)</label>
                          <select className="nk-input-sm" style={{ width: '100%' }} value={qAiRoadmapCompId}
                            onChange={async e => {
                              const compId = e.target.value;
                              setQAiRoadmapCompId(compId);
                              setQAiMateriId('');
                              setQAiCategoryMateri([]);
                              setQAiGenerated([]);
                              setQAiChecked([]);
                              if (!compId) return;
                              const items = roadmapMaterials.filter(m => String(m.competency_id) === String(compId));
                              setQAiCategoryMateri(items || []);
                            }}>
                            <option value="">-- Pilih Kompetensi --</option>
                            {roadmapCompetencies.map(c => <option key={c.id} value={c.id}>{c.code} • {c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={fieldLbl}>Materi Sumber (Roadmap) <span style={{ color: '#64748b' }}>(opsional)</span></label>
                          <select className="nk-input-sm" style={{ width: '100%' }} value={qAiMateriId} onChange={e => { setQAiMateriId(e.target.value); setQAiGenerated([]); setQAiChecked([]); }}>
                            <option value="">-- Semua Materi Kompetensi --</option>
                            {qAiCategoryMateri.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: qAiGenerated.length ? 12 : 0 }}>
                        {[5, 10, 15].map(n => (
                          <button key={n} type="button" disabled={qAiGenerating || !qAiRoadmapCompId}
                            onClick={async () => {
                              if (!qAiRoadmapCompId) { alert('Pilih kompetensi dulu!'); return; }
                              setQAiGenerating(true); setQAiGenerated([]); setQAiChecked([]);
                              try {
                                const res = await fetch(`${apiBase}/admin/questions/generate`, {
                                  method: 'POST', credentials: 'include',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ roadmap_competency_id: Number(qAiRoadmapCompId), roadmap_material_id: Number(qAiMateriId) || 0, question_count: n })
                                });
                                const data = await res.json();
                                if (data.questions?.length > 0) {
                                  setQAiGenerated(data.questions);
                                  setQAiChecked(data.questions.map((_, i) => i));
                                } else alert('Gagal generate: ' + (data.error || 'Unknown'));
                              } catch(e) { alert('Error: ' + e.message); }
                              setQAiGenerating(false);
                            }}
                            style={{ flex: '1 1 80px', minWidth: 80, padding: '7px 0', background: qAiGenerating || !qAiRoadmapCompId ? '#1e3a5f' : '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: qAiGenerating || !qAiRoadmapCompId ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, opacity: !qAiRoadmapCompId ? 0.5 : 1 }}>
                            {qAiGenerating ? '⏳ Generating...' : `✨ ${n} Soal`}
                          </button>
                        ))}
                      </div>
                      {!qAiRoadmapCompId && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>Pilih kompetensi roadmap dulu sebelum generate soal.</p>}
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
                                  body: JSON.stringify({ action: 'create', roadmap_competency_id: Number(qAiRoadmapCompId), question_text: q.question_text, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_option: q.correct_option?.toUpperCase(), is_active: true })
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                        <div>
                          <label style={fieldLbl}>Kompetensi (Roadmap)</label>
                          <select className="nk-input" value={qCategoryId} onChange={(e) => setQCategoryId(e.target.value)}>
                            <option value="">Pilih kompetensi roadmap</option>
                            {roadmapCompetencies.map((c) => <option key={c.id} value={c.id}>{c.code} • {c.name}</option>)}
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
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

              {/* Admin — AI Settings (super_admin only) */}
              {adminSection === 'ai' && isSuperAdmin && (
                <AdminSection title="🤖 AI Settings & Profiles (Super Admin)">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                    <div style={{ border: '1px solid #1e2d45', borderRadius: 12, padding: 12, background: '#0f172a' }}>
                      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>Profile Form</p>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <input className="nk-input-sm" placeholder="Profile name" value={aiProfileForm.name} onChange={e=>setAiProfileForm(s=>({...s,name:e.target.value}))} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <select className="nk-input-sm" value={aiProfileForm.provider}
                            onChange={e => {
                              const pv = e.target.value;
                              const preset = aiProviderPresets[pv] || aiProviderPresets.custom;
                              setAiProfileForm(s => ({
                                ...s,
                                provider: pv,
                                base_url: preset.base_url || s.base_url,
                                model: preset.model || s.model,
                              }));
                            }}>
                            <option value="sumopod">sumopod</option>
                            <option value="openrouter">openrouter</option>
                            <option value="openai">openai</option>
                            <option value="custom">custom</option>
                          </select>
                          <input className="nk-input-sm" placeholder="Model" value={aiProfileForm.model} onChange={e=>setAiProfileForm(s=>({...s,model:e.target.value}))} />
                        </div>
                        <input className="nk-input-sm" placeholder="Base URL" value={aiProfileForm.base_url} onChange={e=>setAiProfileForm(s=>({...s,base_url:e.target.value}))} />
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {['sumopod','openrouter','openai'].map(p => (
                            <button key={p} type="button"
                              onClick={() => {
                                const preset = aiProviderPresets[p];
                                setAiProfileForm(s => ({ ...s, provider: p, base_url: preset.base_url, model: preset.model || s.model }));
                              }}
                              style={{ border:'1px solid #334155', background:'transparent', color:'#94a3b8', borderRadius:8, padding:'4px 8px', fontSize:11, cursor:'pointer' }}>
                              preset: {p}
                            </button>
                          ))}
                        </div>
                        <input className="nk-input-sm" type="password" placeholder="API Key (kosongkan saat update untuk keep)" value={aiProfileForm.api_key} onChange={e=>setAiProfileForm(s=>({...s,api_key:e.target.value}))} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <input className="nk-input-sm" type="number" step="0.1" min="0" max="2" value={aiProfileForm.temperature} onChange={e=>setAiProfileForm(s=>({...s,temperature:e.target.value}))} />
                          <input className="nk-input-sm" type="number" min="1" value={aiProfileForm.max_tokens} onChange={e=>setAiProfileForm(s=>({...s,max_tokens:e.target.value}))} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <BtnSm disabled={busy} onClick={saveAIProfile}>{aiProfileForm.id ? '💾 Update Profile' : '+ Simpan Profile'}</BtnSm>
                          <BtnSm disabled={busy} onClick={testAISettings}>🧪 Test Profile Aktif</BtnSm>
                          <BtnSm disabled={busy} onClick={()=>setAiProfileForm({ id: 0, name: '', provider: 'sumopod', base_url: 'https://ai.sumopod.com/v1/chat/completions', api_key: '', model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 2000 })}>Reset</BtnSm>
                        </div>
                      </div>
                    </div>

                    <div style={{ border: '1px solid #1e2d45', borderRadius: 12, padding: 12, background: '#0f172a' }}>
                      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>Profiles</p>
                      <div style={{ display: 'grid', gap: 8, maxHeight: 300, overflow: 'auto' }}>
                        {aiProfiles.map(p => (
                          <div key={p.id} style={{ border: '1px solid #26364d', borderRadius: 10, padding: 10, background: p.is_active ? 'rgba(34,197,94,0.08)' : '#0b1220' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name} {p.is_active ? '✅' : ''}</div>
                                <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.provider} • {p.model}</div>
                              </div>
                              <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
                                <BtnSm disabled={busy} onClick={()=>setAiProfileForm({ id:p.id, name:p.name, provider:p.provider, base_url:p.base_url, api_key:'', model:p.model, temperature:p.temperature, max_tokens:p.max_tokens })}>Edit</BtnSm>
                                <BtnSm disabled={busy} onClick={()=>activateAIProfile(p.id)}>Aktifkan</BtnSm>
                                <BtnSm disabled={busy} onClick={()=>deleteAIProfile(p.id)} danger>Hapus</BtnSm>
                              </div>
                            </div>
                          </div>
                        ))}
                        {!aiProfiles.length && <div className="nk-empty">Belum ada profile AI.</div>}
                      </div>
                      <div style={{ marginTop: 10, display:'flex', gap:8 }}>
                        <BtnSm disabled={busy} onClick={testAISettings}>🧪 Test Profile Aktif</BtnSm>
                        <span style={{ fontSize: 12, color: '#94a3b8', alignSelf:'center' }}>Aktif: {aiSettings.provider} / {aiSettings.model}</span>
                      </div>
                    </div>
                  </div>
                </AdminSection>
              )}

              {/* Admin — Materi */}
              {adminSection === 'materi' && (
                <>
                  <AdminSection title="📂 Materi Kompetensi">
                    <div style={{ display: 'none', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                      <input className="nk-input-sm" placeholder="Kode" style={{ flex: '1 1 80px', maxWidth: 120 }} value={newCategoryCode} onChange={(e) => setNewCategoryCode(e.target.value)} />
                      <input className="nk-input-sm" placeholder="Nama kategori materi" style={{ flex: '2 1 140px' }} value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                      <select className="nk-input-sm" style={{ flex: '1 1 120px' }} value={newCategoryGroupId} onChange={e => setNewCategoryGroupId(e.target.value)}>
                        {isSuperAdmin && <option value="">🌐 Global (Super Admin)</option>}
                        {adminGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                      <BtnSm disabled={busy} onClick={addCategory}>{busy ? '...' : (editingCategoryId ? 'Update' : '+ Tambah')}</BtnSm>
                      {editingCategoryId && <BtnSm disabled={busy} onClick={() => { setEditingCategoryId(''); setNewCategoryCode(''); setNewCategoryName(''); setNewCategoryGroupId(''); }}>Batal</BtnSm>}
                    </div>
                    <div className="nk-grid-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                      {categories.filter(c => /^lrmc-|^rmc-/.test(String(c.code || ''))).map((c) => (
                        <div key={c.id} style={{
                          border: '1px solid #1e2d45', borderRadius: 12,
                          padding: '14px 16px', background: '#0f172a'
                        }}>
                          <div style={{ fontWeight: 700, marginBottom: 2 }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{c.code}</div>
                          <div style={{ fontSize: 11, marginBottom: 10 }}>{c.group_name ? <span className="nk-badge nk-badge-purple">🏢 {c.group_name}</span> : <span className="nk-badge" style={{ background: '#1e293b', color: '#64748b' }}>🌐 Global</span>}</div>
                          <div style={{ fontSize:11, color:'#64748b' }}>Sumber: Roadmap (otomatis) • Ubah kelompok utama dari menu Roadmap Jabatan.</div>
                        </div>
                      ))}
                      {categories.filter(c => /^lrmc-|^rmc-/.test(String(c.code || ''))).length === 0 && <div className="nk-empty">Belum ada materi kompetensi dari roadmap.</div>}
                    </div>
                  </AdminSection>

                  <AdminSection title="📚 Manajemen Materi Belajar" style={{ marginTop: 14 }}>
                    {/* Form tambah/edit */}
                    <div style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                      <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>
                        {editingMateriId ? '✏️ Edit Materi' : '➕ Tambah Materi Baru'}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={fieldLbl}>Materi Kompetensi (otomatis dari roadmap)</label>
                          <select value={materiCatId} onChange={e => setMateriCatId(e.target.value)} className="nk-input-sm" style={{ width: "100%" }}>
                            <option value="">-- Pilih Materi Kompetensi --</option>
                            {adminCategories.filter(c => /^lrmc-|^rmc-/.test(String(c.code || ''))).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                      <div style={{ border:'1px dashed #334155', borderRadius:10, padding:10, marginBottom: 10 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'#93c5fd', marginBottom:8 }}>Bridge Roadmap → Chat Telegram</div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                          <select value={chatRoadmapCompId} onChange={e => { const v=e.target.value; setChatRoadmapCompId(v); setChatRoadmapMaterialId(''); }} className="nk-input-sm" style={{ width:'100%' }}>
                            <option value="">Pilih kompetensi roadmap</option>
                            {roadmapCompetencies.map(c => <option key={c.id} value={c.id}>{c.code} • {c.name}</option>)}
                          </select>
                          <select value={chatRoadmapMaterialId} onChange={e => setChatRoadmapMaterialId(e.target.value)} className="nk-input-sm" style={{ width:'100%' }}>
                            <option value="">Pilih materi roadmap</option>
                            {roadmapMaterials.filter(m => !chatRoadmapCompId || String(m.competency_id) === String(chatRoadmapCompId)).map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                          </select>
                        </div>
                        <div style={{ marginTop:8, display:'flex', justifyContent:'flex-end' }}>
                          <BtnSm onClick={importRoadmapMaterialToChat} disabled={!chatRoadmapMaterialId}>↘ Muat & Pecah Jadi Chat</BtnSm>
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={fieldLbl}>Judul Materi / Judul Chat</label>
                        <input value={materiTitle} onChange={e => setMateriTitle(e.target.value)} placeholder="Judul materi/chat..." className="nk-input-sm" style={{ width: "100%" }} />
                      </div>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap:'wrap' }}>
                            <button type="button"
                              disabled={materiBubbles.length >= 20}
                              onClick={() => setMateriBubbles(prev => [...prev, ''])}
                              style={{ flex: '1 1 220px', minWidth: 0, background: materiBubbles.length >= 20 ? 'rgba(51,65,85,0.3)' : 'rgba(99,102,241,0.1)', border: `1px dashed ${materiBubbles.length >= 20 ? '#334155' : 'rgba(99,102,241,0.4)'}`, borderRadius: 8, color: materiBubbles.length >= 20 ? '#475569' : '#818cf8', padding: '8px 16px', fontSize: 13, cursor: materiBubbles.length >= 20 ? 'not-allowed' : 'pointer' }}>
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
                              <div style={{ width:'100%', overflowX:'auto' }}>
                              <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse' }}>
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
                              </div>
                              <p style={{ margin: '10px 0 4px', color: '#475569' }}>💡 <b style={{ color: '#94a3b8' }}>Tips:</b> Blok di baris kosong = paragraf baru. Kamu bisa pakai tombol toolbar di atas untuk format otomatis.</p>
                            </div>
                          </details>
                        </>) : <input value={materiContent} onChange={e => setMateriContent(e.target.value)} placeholder="https://..." className="nk-input-sm" style={{ width: "100%" }} />
                        }
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: 12 }}>
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
                        <BtnSm onClick={saveMateri} disabled={busy || !materiTitle || (!materiCatId && !chatRoadmapCompId)}>
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
                          <div key={m.id} style={{ background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 10, padding: '12px 14px', marginBottom: 8, display: 'flex', flexDirection:'column', gap: 10, overflow:'hidden' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                                <span>{typeIcon}</span>
                                <span style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</span>
                                <span className="nk-badge nk-badge-purple">{m.category_name}</span>
                                {m.group_name ? <span className="nk-badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontSize: 11 }}>🏢 {m.group_name}</span> : <span className="nk-badge" style={{ background: '#1e293b', color: '#64748b', fontSize: 11 }}>🌐 Global</span>}
                                {!m.is_active && <span className="nk-badge" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: 11 }}>Nonaktif</span>}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 12, flexWrap:'wrap' }}>
                                <span>+{m.exp_reward} EXP</span>
                                <span>Urutan: {m.order_no}</span>
                                <span>Selesai oleh: {m.completed_count} peserta</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap:'wrap', width:'100%' }}>
                              <BtnSm onClick={() => startEditMateri(m)} style={{ background: '#1e40af', fontSize: 12 }}>Edit</BtnSm>
                              <BtnSm onClick={() => sendMateriTestTelegram(m.id)} style={{ background: '#0f766e', fontSize: 12 }}>Test Telegram</BtnSm>
                              <BtnSm onClick={() => previewPublishMateriTelegram(m.id)} style={{ background: '#334155', fontSize: 12 }}>Preview Recipient</BtnSm>
                              <BtnSm onClick={() => publishMateriTelegram(m.id)} style={{ background: '#9333ea', fontSize: 12 }}>Publish Peserta</BtnSm>
                              <BtnSm onClick={() => deleteMateri(m.id)} style={{ background: '#7f1d1d', fontSize: 12 }}>Hapus</BtnSm>
                              {chatPublishPreview && chatPublishPreview.id === m.id && (
                                <div style={{ width:'100%', fontSize:11, color:'#cbd5e1', marginTop:4 }}>
                                  👥 {chatPublishPreview.recipient_count || 0} peserta • 💬 {chatPublishPreview.bubble_count || 0} bubble • 📤 estimasi {chatPublishPreview.estimated_messages || 0} pesan
                                </div>
                              )}
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

              {/* Admin — Roadmap Jabatan */}
              {adminSection === 'roadmap' && (
                <>
                  <AdminSection title="🧭 Roadmap Jabatan">
                    <div style={{ display:'flex', gap:8, marginBottom: 12, flexWrap:'wrap' }}>
                      <button onClick={() => setRoadmapMenu('positions')} style={{ padding:'8px 12px', borderRadius:8, border: roadmapMenu === 'positions' ? '1px solid #8b5cf6' : '1px solid #334155', background: roadmapMenu === 'positions' ? 'rgba(139,92,246,0.18)' : 'transparent', color: roadmapMenu === 'positions' ? '#c4b5fd' : '#94a3b8', fontSize:12, fontWeight:700, cursor:'pointer' }}>👔 Jabatan</button>
                      <button onClick={async () => { setRoadmapMenu('competencies'); await loadRoadmapCompetencies(competencyForm.position_id || ''); }} style={{ padding:'8px 12px', borderRadius:8, border: roadmapMenu === 'competencies' ? '1px solid #8b5cf6' : '1px solid #334155', background: roadmapMenu === 'competencies' ? 'rgba(139,92,246,0.18)' : 'transparent', color: roadmapMenu === 'competencies' ? '#c4b5fd' : '#94a3b8', fontSize:12, fontWeight:700, cursor:'pointer' }}>🛠️ Kompetensi Teknis</button>
                      <button onClick={async () => { setRoadmapMenu('core-competencies'); await loadRoadmapCoreCompetencies(coreCompetencyForm.position_id || ''); }} style={{ padding:'8px 12px', borderRadius:8, border: roadmapMenu === 'core-competencies' ? '1px solid #8b5cf6' : '1px solid #334155', background: roadmapMenu === 'core-competencies' ? 'rgba(139,92,246,0.18)' : 'transparent', color: roadmapMenu === 'core-competencies' ? '#c4b5fd' : '#94a3b8', fontSize:12, fontWeight:700, cursor:'pointer' }}>🧠 Kompetensi Inti</button>
                      <button onClick={async () => { setRoadmapMenu('leadership-competencies'); await loadRoadmapLeadershipCompetencies(leadershipCompetencyForm.position_id || ''); }} style={{ padding:'8px 12px', borderRadius:8, border: roadmapMenu === 'leadership-competencies' ? '1px solid #8b5cf6' : '1px solid #334155', background: roadmapMenu === 'leadership-competencies' ? 'rgba(139,92,246,0.18)' : 'transparent', color: roadmapMenu === 'leadership-competencies' ? '#c4b5fd' : '#94a3b8', fontSize:12, fontWeight:700, cursor:'pointer' }}>👑 Kompetensi Kepemimpinan</button>
                      <button onClick={async () => { setRoadmapMenu('materials'); await loadRoadmapMaterials(materialForm.competency_id || ''); }} style={{ padding:'8px 12px', borderRadius:8, border: roadmapMenu === 'materials' ? '1px solid #8b5cf6' : '1px solid #334155', background: roadmapMenu === 'materials' ? 'rgba(139,92,246,0.18)' : 'transparent', color: roadmapMenu === 'materials' ? '#c4b5fd' : '#94a3b8', fontSize:12, fontWeight:700, cursor:'pointer' }}>📘 Materi</button>
                      <button onClick={async () => { setRoadmapMenu('graph'); await loadRoadmapMaterialGraph(materialGraphFilter.position_id || '', materialGraphFilter.mode || 'material'); }} style={{ padding:'8px 12px', borderRadius:8, border: roadmapMenu === 'graph' ? '1px solid #8b5cf6' : '1px solid #334155', background: roadmapMenu === 'graph' ? 'rgba(139,92,246,0.18)' : 'transparent', color: roadmapMenu === 'graph' ? '#c4b5fd' : '#94a3b8', fontSize:12, fontWeight:700, cursor:'pointer' }}>🕸️ Graph</button>
                    </div>

                    {roadmapMenu === 'positions' && <>
                    <div style={{ border:'1px solid #1e2d45', borderRadius: 10, padding: 12 }}>
                      <div style={{ display:'grid', gap:8, gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))' }}>
                        <input className="nk-input-sm" placeholder="Kode jabatan (contoh: CS-01)" value={positionForm.code || ''} onChange={e => setPositionForm(f => ({ ...f, code: e.target.value }))} />
                        <input className="nk-input-sm" placeholder="Nama jabatan" value={positionForm.name} onChange={e => setPositionForm(f => ({ ...f, name: e.target.value }))} />
                        {isSuperAdmin ? (
                          <select className="nk-input-sm" value={positionForm.group_id || ''} onChange={e => setPositionForm(f => ({ ...f, group_id: e.target.value }))}>
                            <option value="">Global / semua kelompok</option>
                            {adminGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                        ) : (
                          <div className="nk-input-sm" style={{ display:'flex', alignItems:'center', color:'#94a3b8' }}>
                            Kelompok aktif: <b style={{ marginLeft:6, color:'#e2e8f0' }}>{adminGroups.find(g => String(g.id) === String(positionForm.group_id || me?.group_id || ''))?.name || 'Kelompok Admin'}</b>
                          </div>
                        )}
                        <textarea className="nk-input-sm" placeholder="Deskripsi jabatan" value={positionForm.description} onChange={e => setPositionForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight: 70, gridColumn:'1 / -1' }} />
                        <div style={{ gridColumn:'1 / -1', display:'flex', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                          <BtnSm onClick={() => setPositionForm({ id:0, code:'', name:'', description:'', group_id:'', is_active:true })}>Reset</BtnSm>
                          <BtnSm color="purple" onClick={saveRoadmapPosition}>💾 Simpan Jabatan</BtnSm>
                        </div>
                      </div>
                    </div>

                    <div className="nk-table-wrap" style={{ marginTop: 12 }}>
                      <table className="nk-table">
                        <thead><tr><th>Kelompok</th><th>Kode</th><th>Nama</th><th>Deskripsi</th><th>Update</th><th>Aksi</th></tr></thead>
                        <tbody>
                          {roadmapPositions.map(p => (
                            <tr key={p.id}>
                              <td>{p.group_id ? (adminGroups.find(g => String(g.id) === String(p.group_id))?.name || `#${p.group_id}`) : 'Global'}</td>
                              <td style={{ fontWeight:700 }}>{p.code}</td>
                              <td>{p.name}</td>
                              <td style={{ maxWidth: 320, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{p.description || '-'}</td>
                              <td style={{ fontSize:12, color:'#94a3b8' }}>{p.updated_at ? new Date(p.updated_at).toLocaleString('id-ID') : '-'}</td>
                              <td style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                <BtnSm onClick={async () => { setPositionForm({ id: p.id, code: p.code || '', name: p.name || '', description: p.description || '', group_id: String(p.group_id || ''), is_active: !!p.is_active }); setCompetencyForm(f => ({ ...f, position_id: String(p.id) })); await loadRoadmapCompetencies(p.id); }}>Edit</BtnSm>
                                <BtnSm danger onClick={() => deleteRoadmapPosition(p.id)}>Hapus</BtnSm>
                              </td>
                            </tr>
                          ))}
                          {roadmapPositions.length === 0 && <tr><td colSpan={6} className="nk-empty">Belum ada jabatan roadmap.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                    </>}

                    {roadmapMenu === 'competencies' && <div style={{ border:'1px solid #1e2d45', borderRadius: 10, padding: 12, marginTop: 2 }}>
                      <div style={{ fontWeight:700, marginBottom:8 }}>Kompetensi Teknis per Jabatan</div>
                      <div style={{ display:'grid', gap:8, gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))' }}>
                        <select className="nk-input-sm" value={competencyForm.position_id} onChange={async e => { const v=e.target.value; setCompetencyForm(f => ({ ...f, position_id: v })); await loadRoadmapCompetencies(v); }}>
                          <option value="">Pilih jabatan</option>
                          {roadmapPositions.map(p => <option key={p.id} value={p.id}>{p.code} • {p.name}</option>)}
                        </select>
                        <input className="nk-input-sm" placeholder="Kode kompetensi" value={competencyForm.code} onChange={e => setCompetencyForm(f => ({ ...f, code: e.target.value }))} />
                        <input className="nk-input-sm" placeholder="Nama kompetensi" value={competencyForm.name} onChange={e => setCompetencyForm(f => ({ ...f, name: e.target.value }))} />
                        <textarea className="nk-input-sm" placeholder="Deskripsi kompetensi" value={competencyForm.description} onChange={e => setCompetencyForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight: 70, gridColumn:'1 / -1' }} />
                        <div style={{ gridColumn:'1 / -1', display:'flex', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                          <BtnSm onClick={() => setCompetencyForm(f => ({ ...f, id:0, code:'', name:'', description:'' }))}>Reset</BtnSm>
                          <BtnSm color="purple" onClick={saveRoadmapCompetency}>💾 Simpan Kompetensi</BtnSm>
                        </div>
                      </div>

                      <div className="nk-table-wrap" style={{ marginTop: 12 }}>
                        <table className="nk-table">
                          <thead><tr><th>Jabatan</th><th>Kode</th><th>Nama</th><th>Deskripsi</th><th>Update</th><th>Aksi</th></tr></thead>
                          <tbody>
                            {roadmapCompetencies.map(c => (
                              <tr key={c.id}>
                                <td>{roadmapPositions.find(p => String(p.id) === String(c.position_id))?.name || `#${c.position_id}`}</td>
                                <td style={{ fontWeight:700 }}>{c.code}</td>
                                <td>{c.name}</td>
                                <td style={{ maxWidth: 320, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{c.description || '-'}</td>
                                <td style={{ fontSize:12, color:'#94a3b8' }}>{c.updated_at ? new Date(c.updated_at).toLocaleString('id-ID') : '-'}</td>
                                <td style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                  <BtnSm onClick={() => setCompetencyForm({ id:c.id, position_id:String(c.position_id), code:c.code || '', name:c.name || '', description:c.description || '', is_active: !!c.is_active })}>Edit</BtnSm>
                                  <BtnSm danger onClick={() => deleteRoadmapCompetency(c.id)}>Hapus</BtnSm>
                                </td>
                              </tr>
                            ))}
                            {roadmapCompetencies.length === 0 && <tr><td colSpan={6} className="nk-empty">Belum ada kompetensi teknis.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>}

                    {roadmapMenu === 'core-competencies' && <div style={{ border:'1px solid #1e2d45', borderRadius: 10, padding: 12, marginTop: 2 }}>
                      <div style={{ fontWeight:700, marginBottom:8 }}>Kompetensi Inti per Jabatan</div>
                      <div style={{ display:'grid', gap:8, gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))' }}>
                        <select className="nk-input-sm" value={coreCompetencyForm.position_id} onChange={async e => { const v=e.target.value; setCoreCompetencyForm(f => ({ ...f, position_id: v })); await loadRoadmapCoreCompetencies(v); }}>
                          <option value="">Pilih jabatan</option>
                          {roadmapPositions.map(p => <option key={p.id} value={p.id}>{p.code} • {p.name}</option>)}
                        </select>
                        <input className="nk-input-sm" placeholder="Kode kompetensi inti" value={coreCompetencyForm.code} onChange={e => setCoreCompetencyForm(f => ({ ...f, code: e.target.value }))} />
                        <input className="nk-input-sm" placeholder="Nama kompetensi inti" value={coreCompetencyForm.name} onChange={e => setCoreCompetencyForm(f => ({ ...f, name: e.target.value }))} />
                        <textarea className="nk-input-sm" placeholder="Deskripsi kompetensi inti" value={coreCompetencyForm.description} onChange={e => setCoreCompetencyForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight: 70, gridColumn:'1 / -1' }} />
                        <div style={{ gridColumn:'1 / -1', display:'flex', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                          <BtnSm onClick={() => setCoreCompetencyForm(f => ({ ...f, id:0, code:'', name:'', description:'' }))}>Reset</BtnSm>
                          <BtnSm color="purple" onClick={saveRoadmapCoreCompetency}>💾 Simpan Kompetensi Inti</BtnSm>
                        </div>
                      </div>
                      <div className="nk-table-wrap" style={{ marginTop: 12 }}>
                        <table className="nk-table">
                          <thead><tr><th>Jabatan</th><th>Kode</th><th>Nama</th><th>Deskripsi</th><th>Update</th><th>Aksi</th></tr></thead>
                          <tbody>
                            {roadmapCoreCompetencies.map(c => (
                              <tr key={c.id}>
                                <td>{roadmapPositions.find(p => String(p.id) === String(c.position_id))?.name || `#${c.position_id}`}</td>
                                <td style={{ fontWeight:700 }}>{c.code}</td>
                                <td>{c.name}</td>
                                <td style={{ maxWidth: 320, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{c.description || '-'}</td>
                                <td style={{ fontSize:12, color:'#94a3b8' }}>{c.updated_at ? new Date(c.updated_at).toLocaleString('id-ID') : '-'}</td>
                                <td style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                  <BtnSm onClick={() => setCoreCompetencyForm({ id:c.id, position_id:String(c.position_id), code:c.code || '', name:c.name || '', description:c.description || '', is_active: !!c.is_active })}>Edit</BtnSm>
                                  <BtnSm danger onClick={() => deleteRoadmapCoreCompetency(c.id)}>Hapus</BtnSm>
                                </td>
                              </tr>
                            ))}
                            {roadmapCoreCompetencies.length === 0 && <tr><td colSpan={6} className="nk-empty">Belum ada kompetensi inti.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>}

                    {roadmapMenu === 'leadership-competencies' && <div style={{ border:'1px solid #1e2d45', borderRadius: 10, padding: 12, marginTop: 2 }}>
                      <div style={{ fontWeight:700, marginBottom:8 }}>Kompetensi Kepemimpinan per Jabatan</div>
                      <div style={{ display:'grid', gap:8, gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))' }}>
                        <select className="nk-input-sm" value={leadershipCompetencyForm.position_id} onChange={async e => { const v=e.target.value; setLeadershipCompetencyForm(f => ({ ...f, position_id: v })); await loadRoadmapLeadershipCompetencies(v); }}>
                          <option value="">Pilih jabatan</option>
                          {roadmapPositions.map(p => <option key={p.id} value={p.id}>{p.code} • {p.name}</option>)}
                        </select>
                        <input className="nk-input-sm" placeholder="Kode kompetensi kepemimpinan" value={leadershipCompetencyForm.code} onChange={e => setLeadershipCompetencyForm(f => ({ ...f, code: e.target.value }))} />
                        <input className="nk-input-sm" placeholder="Nama kompetensi kepemimpinan" value={leadershipCompetencyForm.name} onChange={e => setLeadershipCompetencyForm(f => ({ ...f, name: e.target.value }))} />
                        <textarea className="nk-input-sm" placeholder="Deskripsi kompetensi kepemimpinan" value={leadershipCompetencyForm.description} onChange={e => setLeadershipCompetencyForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight: 70, gridColumn:'1 / -1' }} />
                        <div style={{ gridColumn:'1 / -1', display:'flex', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                          <BtnSm onClick={() => setLeadershipCompetencyForm(f => ({ ...f, id:0, code:'', name:'', description:'' }))}>Reset</BtnSm>
                          <BtnSm color="purple" onClick={saveRoadmapLeadershipCompetency}>💾 Simpan Kompetensi Kepemimpinan</BtnSm>
                        </div>
                      </div>
                      <div className="nk-table-wrap" style={{ marginTop: 12 }}>
                        <table className="nk-table">
                          <thead><tr><th>Jabatan</th><th>Kode</th><th>Nama</th><th>Deskripsi</th><th>Update</th><th>Aksi</th></tr></thead>
                          <tbody>
                            {roadmapLeadershipCompetencies.map(c => (
                              <tr key={c.id}>
                                <td>{roadmapPositions.find(p => String(p.id) === String(c.position_id))?.name || `#${c.position_id}`}</td>
                                <td style={{ fontWeight:700 }}>{c.code}</td>
                                <td>{c.name}</td>
                                <td style={{ maxWidth: 320, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{c.description || '-'}</td>
                                <td style={{ fontSize:12, color:'#94a3b8' }}>{c.updated_at ? new Date(c.updated_at).toLocaleString('id-ID') : '-'}</td>
                                <td style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                  <BtnSm onClick={() => setLeadershipCompetencyForm({ id:c.id, position_id:String(c.position_id), code:c.code || '', name:c.name || '', description:c.description || '', is_active: !!c.is_active })}>Edit</BtnSm>
                                  <BtnSm danger onClick={() => deleteRoadmapLeadershipCompetency(c.id)}>Hapus</BtnSm>
                                </td>
                              </tr>
                            ))}
                            {roadmapLeadershipCompetencies.length === 0 && <tr><td colSpan={6} className="nk-empty">Belum ada kompetensi kepemimpinan.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>}

                    {roadmapMenu === 'materials' && <div style={{ border:'1px solid #1e2d45', borderRadius: 10, padding: 12, marginTop: 2 }}>
                      <div style={{ fontWeight:700, marginBottom:8 }}>Materi per Kompetensi Teknis</div>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
                        <label style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'#cbd5e1' }}>
                          <input type="checkbox" checked={materialStrictMode} onChange={e => setMaterialStrictMode(e.target.checked)} />
                          Strict mode backlink (hanya judul yang sudah ada)
                        </label>
                      </div>
                      <div ref={materialEditorRef} style={{ display:'grid', gap:8 }}>
                        <select className="nk-input-sm" value={materialForm.competency_id} onChange={async e => { const v=e.target.value; setMaterialForm(f => ({ ...f, competency_id: v })); await loadRoadmapMaterials(v); }}>
                          <option value="">Pilih kompetensi teknis</option>
                          {roadmapCompetencies.map(c => {
                            const pos = roadmapPositions.find(p => String(p.id) === String(c.position_id));
                            return <option key={c.id} value={c.id}>{pos?.code || '-'} • {c.code} • {c.name}</option>;
                          })}
                        </select>
                        <input className="nk-input-sm" readOnly value={(() => {
                          const comp = roadmapCompetencies.find(c => String(c.id) === String(materialForm.competency_id || ''));
                          if (!comp) return '';
                          const pos = roadmapPositions.find(p => String(p.id) === String(comp.position_id));
                          return pos ? `${pos.code || '-'} • ${pos.name || ''}` : '';
                        })()} placeholder="Nama jabatan (otomatis)" style={{ color:'#cbd5e1', background:'#0a1220' }} />
                        <input ref={materialTitleInputRef} className="nk-input-sm" placeholder="Judul materi" value={materialForm.title} onChange={e => setMaterialForm(f => ({ ...f, title: e.target.value }))} />
                        <textarea className="nk-input-sm" placeholder="Deskripsi singkat materi (untuk AI generate draft)" value={materialForm.brief || ''} onChange={e => setMaterialForm(f => ({ ...f, brief: e.target.value }))} style={{ minHeight: 72 }} />
                        <div style={{ display:'grid', gap:8, gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))' }}>
                          <select className="nk-input-sm" value={materialForm.bloom_level || 'C2'} onChange={e => setMaterialForm(f => ({ ...f, bloom_level: e.target.value }))}>
                            <option value="C1">Bloom: C1 Mengingat</option>
                            <option value="C2">Bloom: C2 Memahami</option>
                            <option value="C3">Bloom: C3 Menerapkan</option>
                            <option value="C4">Bloom: C4 Menganalisis</option>
                            <option value="C5">Bloom: C5 Mengevaluasi</option>
                            <option value="C6">Bloom: C6 Mencipta</option>
                          </select>
                          <select className="nk-input-sm" value={materialForm.style || 'ringkas'} onChange={e => setMaterialForm(f => ({ ...f, style: e.target.value }))}>
                            <option value="ringkas">Gaya: Ringkas</option>
                            <option value="step-by-step">Gaya: Step-by-step</option>
                            <option value="studi kasus">Gaya: Studi kasus</option>
                          </select>
                        </div>
                        <textarea className="nk-input-sm" placeholder="Tujuan pembelajaran (learning objectives)" value={materialForm.learning_objectives || ''} onChange={e => setMaterialForm(f => ({ ...f, learning_objectives: e.target.value }))} style={{ minHeight: 64 }} />
                        <div style={{ display:'flex', justifyContent:'flex-end' }}>
                          <button onClick={generateRoadmapMaterialDraft} disabled={generatingRoadmapMaterial || !(materialForm.title || '').trim()} style={{ border:'1px solid #334155', background: generatingRoadmapMaterial ? '#1e293b' : 'rgba(139,92,246,0.15)', color:'#ddd6fe', borderRadius:8, padding:'8px 12px', fontSize:12, fontWeight:700, cursor: generatingRoadmapMaterial ? 'not-allowed' : 'pointer' }}>
                            {generatingRoadmapMaterial ? '⏳ Generating...' : '🤖 Generate Draft dengan AI'}
                          </button>
                        </div>
                        <textarea className="nk-input-sm" placeholder="Isi materi... ketik [[ untuk saran judul materi" value={materialForm.content} onChange={e => updateMaterialContentWithSuggestions(e.target.value)} onKeyDown={handleMaterialSuggestionKeyDown} style={{ minHeight: 120 }} />
                        {findUnknownBacklinks(materialForm.content || '').length > 0 && (
                          <div style={{ fontSize:11, color: materialStrictMode ? '#fca5a5' : '#fbbf24' }}>
                            Backlink belum ada: {findUnknownBacklinks(materialForm.content || '').slice(0,6).join(', ')}{findUnknownBacklinks(materialForm.content || '').length>6?` (+${findUnknownBacklinks(materialForm.content || '').length-6})`:''}
                          </div>
                        )}
                        {materialLinkSuggestions.length > 0 && (
                          <div style={{ border:'1px solid #334155', borderRadius:8, padding:8, background:'#0b1220' }}>
                            <div style={{ fontSize:11, color:'#94a3b8', marginBottom:6 }}>Saran backlink untuk [[{materialLinkQuery}]] (↑ ↓ Enter/Tab):</div>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                              {materialLinkSuggestions.map((it, i) => (
                                <button key={i} onClick={() => insertMaterialBacklink(it.title)} style={{ border: i === materialSuggestionIndex ? '1px solid #a78bfa' : '1px solid #475569', background: i === materialSuggestionIndex ? 'rgba(167,139,250,0.14)' : 'transparent', color:'#cbd5e1', borderRadius:999, padding:'4px 10px', fontSize:11, cursor:'pointer' }}>
                                  [[{it.title}]] {it.scope === 'local' ? '• kompetensi ini' : '• global'}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ display:'flex', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                          <BtnSm onClick={() => setMaterialForm(f => ({ ...f, id:0, title:'', content:'' }))}>Reset</BtnSm>
                          <BtnSm color="purple" onClick={saveRoadmapMaterial}>💾 Simpan Materi</BtnSm>
                        </div>
                      </div>

                      <div className="nk-table-wrap" style={{ marginTop: 12 }}>
                        <table className="nk-table">
                          <thead><tr><th>Kompetensi</th><th>Bloom</th><th>Judul Materi</th><th>Isi</th><th>Update</th><th>Aksi</th></tr></thead>
                          <tbody>
                            {roadmapMaterials.map(m => {
                              const comp = roadmapCompetencies.find(c => String(c.id) === String(m.competency_id));
                              return (
                                <tr key={m.id}>
                                  <td>{comp ? `${comp.code} • ${comp.name}` : `#${m.competency_id}`}</td>
                                  <td><span className="nk-badge">{m.bloom_level || 'C2'}</span></td>
                                  <td style={{ fontWeight:700 }}>{m.title}</td>
                                  <td style={{ maxWidth: 380, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{renderBacklinkBold((m.content || '').slice(0,180))}{(m.content||'').length>180?'...':''}</td>
                                  <td style={{ fontSize:12, color:'#94a3b8' }}>{m.updated_at ? new Date(m.updated_at).toLocaleString('id-ID') : '-'}</td>
                                  <td style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                    <BtnSm onClick={() => setMaterialForm({ id:m.id, competency_id:String(m.competency_id), title:m.title || '', content:m.content || '', brief:'', bloom_level:m.bloom_level || 'C2', learning_objectives:'', style:'ringkas', is_active: !!m.is_active })}>Edit</BtnSm>
                                    <BtnSm danger onClick={() => deleteRoadmapMaterial(m.id)}>Hapus</BtnSm>
                                  </td>
                                </tr>
                              );
                            })}
                            {roadmapMaterials.length === 0 && <tr><td colSpan={6} className="nk-empty">Belum ada materi roadmap.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>}

                    {roadmapMenu === 'graph' && <div style={{ border:'1px solid #1e2d45', borderRadius: 10, padding: 12, marginTop: 2 }}>
                      <div style={{ fontWeight:700, marginBottom:8 }}>Graph Materi (Backlink)</div>
                      <div style={{ display:'grid', gap:8, gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))', marginBottom: 10 }}>
                        <select className="nk-input-sm" value={materialGraphFilter.position_id} onChange={async e => { const v=e.target.value; setMaterialGraphFilter(f => ({ ...f, position_id: v })); await loadRoadmapMaterialGraph(v, materialGraphFilter.mode || 'material'); }}>
                          <option value="">Semua jabatan</option>
                          {roadmapPositions.map(p => <option key={p.id} value={p.id}>{p.code} • {p.name}</option>)}
                        </select>
                        <select className="nk-input-sm" value={materialGraphFilter.mode} onChange={async e => { const mode=e.target.value; setMaterialGraphFilter(f => ({ ...f, mode })); await loadRoadmapMaterialGraph(materialGraphFilter.position_id || '', mode); }}>
                          <option value="material">Mode: Materi</option>
                          <option value="competency">Mode: Kompetensi</option>
                        </select>
                        <button onClick={refreshRoadmapGraphData} disabled={refreshingGraphData}
                          style={{ border:'1px solid #334155', background: refreshingGraphData ? '#1e293b' : '#0b1220', color:'#cbd5e1', borderRadius:8, padding:'8px 10px', fontSize:12, fontWeight:700, cursor: refreshingGraphData ? 'not-allowed' : 'pointer' }}>
                          {refreshingGraphData ? '⏳ Refreshing...' : '🔄 Refresh Data Graph'}
                        </button>
                      </div>
                      {(() => {
                        const g = parseRoadmapGraph(materialGraph);
                        return g.error ? <div className="nk-empty" style={{ margin:0, color:'#fca5a5' }}>{g.error}</div> : <NoteGraph nodes={g.nodes} edges={g.edges} onNodeClick={openMaterialFromGraph} />;
                      })()}
                      {materialUnknownBacklinks.length > 0 && (
                        <div className="nk-empty" style={{ marginTop:8, color:'#fbbf24' }}>⚠️ Backlink belum ketemu: {materialUnknownBacklinks.slice(0,8).join(', ')}{materialUnknownBacklinks.length > 8 ? ` (+${materialUnknownBacklinks.length - 8})` : ''}</div>
                      )}
                    </div>}
                  </AdminSection>
                </>
              )}

              {/* Admin — Kontribusi */}
              {adminSection === 'kontribusi' && (
                <>
                  <AdminSection title="💡 Review Kontribusi Materi">
                    {/* Filter Status */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      {['pending', 'approved', 'rejected', 'all'].map(status => (
                        <button
                          key={status}
                          onClick={() => {
                            setAdminContribFilter(status);
                            refreshAdminContributions(status);
                          }}
                          style={{
                            padding: '6px 12px', borderRadius: 8,
                            border: adminContribFilter === status ? '1px solid #8b5cf6' : '1px solid #374151',
                            background: adminContribFilter === status ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                            color: adminContribFilter === status ? '#a78bfa' : '#94a3b8',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          {status === 'pending' ? '⏳ Pending' :
                           status === 'approved' ? '✅ Disetujui' :
                           status === 'rejected' ? '❌ Ditolak' : '📋 Semua'}
                        </button>
                      ))}
                    </div>

                    {/* Contributions List */}
                    {adminContributions.length > 0 ? (
                      <div style={{ display: 'grid', gap: 16 }}>
                        {adminContributions.map((contrib) => (
                          <div key={contrib.id} style={{
                            border: `1px solid ${getStatusColor(contrib.status)}40`,
                            borderRadius: 12, padding: 20,
                            background: `${getStatusColor(contrib.status)}08`
                          }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                              <div style={{ flex: 1 }}>
                                <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
                                  {contrib.title}
                                </h4>
                                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                                  👤 <span style={{ color: '#cbd5e1' }}>{contrib.contributor_name}</span> • 
                                  📚 <span style={{ color: '#cbd5e1' }}>{contrib.category_name}</span> • 
                                  📅 {contrib.created_at}
                                  {contrib.exp_awarded > 0 && (
                                    <span style={{ color: '#10b981', marginLeft: 8 }}>
                                      ⭐ +{contrib.exp_awarded} EXP
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{
                                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  background: getStatusColor(contrib.status),
                                  color: 'white'
                                }}>
                                  {getStatusText(contrib.status)}
                                </span>
                                
                                {contrib.status === 'pending' && (
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                      onClick={() => openReviewModal(contrib, 'approve')}
                                      style={{
                                        padding: '6px 12px', borderRadius: 6, border: 'none',
                                        background: '#10b981', color: 'white',
                                        fontSize: 11, fontWeight: 600, cursor: 'pointer'
                                      }}
                                    >
                                      ✅ Setujui
                                    </button>
                                    <button
                                      onClick={() => openReviewModal(contrib, 'reject')}
                                      style={{
                                        padding: '6px 12px', borderRadius: 6, border: 'none',
                                        background: '#ef4444', color: 'white',
                                        fontSize: 11, fontWeight: 600, cursor: 'pointer'
                                      }}
                                    >
                                      ❌ Tolak
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Content */}
                            <div style={{
                              background: 'rgba(15, 23, 42, 0.8)',
                              border: '1px solid #1e2d45',
                              borderRadius: 8, padding: 16, marginBottom: 12,
                              fontSize: 14, color: '#cbd5e1', lineHeight: 1.6,
                              maxHeight: 200, overflowY: 'auto'
                            }}>
                              {contrib.content.split('\n').map((line, i) => (
                                <p key={i} style={{ margin: '0 0 8px 0' }}>
                                  {line || '\u00A0'}
                                </p>
                              ))}
                            </div>

                            {/* Admin Feedback */}
                            {contrib.admin_feedback && (
                              <div style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                borderRadius: 8, padding: 12
                              }}>
                                <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600, marginBottom: 6 }}>
                                  💬 Feedback Admin:
                                </div>
                                <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>
                                  {contrib.admin_feedback}
                                </div>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                  Review oleh {contrib.reviewed_by_name} • {contrib.reviewed_at}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="nk-empty">
                        {adminContribFilter === 'pending' ? '📝 Tidak ada kontribusi pending' :
                         adminContribFilter === 'approved' ? '✅ Tidak ada kontribusi yang disetujui' :
                         adminContribFilter === 'rejected' ? '❌ Tidak ada kontribusi yang ditolak' :
                         '📋 Belum ada kontribusi'}
                      </div>
                    )}
                  </AdminSection>

                  {/* Review Modal */}
                  {showReviewModal && reviewingContrib && (
                    <div style={{
                      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                      zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                    }}>
                      <div style={{
                        background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 16,
                        padding: 24, width: '100%', maxWidth: 600
                      }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
                          {reviewAction === 'approve' ? '✅ Setujui Kontribusi' : '❌ Tolak Kontribusi'}
                        </h3>
                        
                        <div style={{ marginBottom: 16, padding: 16, background: 'rgba(15, 23, 42, 0.5)', borderRadius: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>
                            {reviewingContrib.title}
                          </div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>
                            Oleh: {reviewingContrib.contributor_name} • Kategori: {reviewingContrib.category_name}
                          </div>
                        </div>

                        {reviewAction === 'approve' && (
                          <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>
                              ⚙️ Mode Persetujuan Roadmap
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => setReviewApproveMode('direct')}
                                style={{
                                  padding: '6px 10px', borderRadius: 8,
                                  border: reviewApproveMode === 'direct' ? '1px solid #22c55e' : '1px solid #374151',
                                  background: reviewApproveMode === 'direct' ? 'rgba(34,197,94,0.12)' : 'transparent',
                                  color: reviewApproveMode === 'direct' ? '#4ade80' : '#94a3b8',
                                  fontSize: 12, cursor: 'pointer'
                                }}
                              >
                                ✅ Langsung jadi chat roadmap
                              </button>
                              <button
                                onClick={() => setReviewApproveMode('ai')}
                                style={{
                                  padding: '6px 10px', borderRadius: 8,
                                  border: reviewApproveMode === 'ai' ? '1px solid #8b5cf6' : '1px solid #374151',
                                  background: reviewApproveMode === 'ai' ? 'rgba(139,92,246,0.12)' : 'transparent',
                                  color: reviewApproveMode === 'ai' ? '#c4b5fd' : '#94a3b8',
                                  fontSize: 12, cursor: 'pointer'
                                }}
                              >
                                🤖 Generate AI sesuai roadmap
                              </button>
                            </div>
                            {reviewApproveMode === 'ai' && (
                              <div style={{ marginTop: 10 }}>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#94a3b8' }}>
                                  Jumlah bubble pesan
                                </label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  {[3,4,5].map(n => (
                                    <button
                                      key={n}
                                      onClick={() => setReviewBubbleCount(n)}
                                      style={{
                                        padding: '5px 10px', borderRadius: 8,
                                        border: reviewBubbleCount === n ? '1px solid #8b5cf6' : '1px solid #374151',
                                        background: reviewBubbleCount === n ? 'rgba(139,92,246,0.18)' : 'transparent',
                                        color: reviewBubbleCount === n ? '#c4b5fd' : '#94a3b8',
                                        fontSize: 12, cursor: 'pointer'
                                      }}
                                    >
                                      {n} Bubble
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ marginBottom: 20 }}>
                          <label style={{
                            display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#cbd5e1'
                          }}>
                            💬 Feedback untuk Kontributor
                            <span style={{ color: '#6b7280', fontWeight: 400 }}> (opsional)</span>
                          </label>
                          <textarea
                            value={reviewFeedback}
                            onChange={e => setReviewFeedback(e.target.value)}
                            placeholder={
                              reviewAction === 'approve' 
                                ? "Berikan apresiasi dan komentar positif..."
                                : "Jelaskan alasan penolakan dan saran perbaikan..."
                            }
                            rows={4}
                            style={{
                              width: '100%', padding: '12px', borderRadius: 8,
                              border: '1px solid #1e2d45', background: '#0a1628',
                              color: '#e2e8f0', fontSize: 14, lineHeight: 1.5,
                              resize: 'vertical'
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setShowReviewModal(false)}
                            disabled={reviewLoading}
                            style={{
                              padding: '10px 20px', borderRadius: 8, border: '1px solid #374151',
                              background: 'transparent', color: '#94a3b8', fontSize: 13,
                              cursor: reviewLoading ? 'not-allowed' : 'pointer', fontWeight: 600
                            }}
                          >
                            Batal
                          </button>
                          <button
                            onClick={submitReview}
                            disabled={reviewLoading}
                            style={{
                              padding: '10px 24px', borderRadius: 8, border: 'none',
                              background: reviewLoading ? '#374151' : 
                                (reviewAction === 'approve' ? '#10b981' : '#ef4444'),
                              color: 'white', fontSize: 13, fontWeight: 700,
                              cursor: reviewLoading ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {reviewLoading ? '⏳ Memproses...' : 
                             (reviewAction === 'approve'
                               ? (reviewApproveMode === 'ai' ? '🤖 Setujui + Generate Roadmap' : '✅ Setujui Langsung')
                               : '❌ Tolak')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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
      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div id="installBtn" style={{
          position: 'fixed', bottom: 76, left: 10, right: 10, zIndex: 1000,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)',
          border: '1px solid rgba(139,92,246,0.5)',
          borderRadius: 18, padding: '12px 14px',
          boxShadow: '0 -4px 40px rgba(124,58,237,0.3), 0 8px 32px rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {/* Icon */}
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
            🎓
          </div>
          {/* Teks */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9' }}>Install Naik Kelas</div>
            <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 1 }}>
              {installPrompt ? 'Tambahkan ke Home Screen' : 'Tap Share ↑ → Add to Home Screen'}
            </div>
          </div>
          {/* Tombol */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {installPrompt && (
              <button onClick={async () => {
                try {
                  installPrompt.prompt();
                  const { outcome } = await installPrompt.userChoice;
                  if (outcome === 'accepted') {
                    setShowInstallBanner(false);
                    localStorage.setItem('pwa-dismissed-until', String(Date.now() + 24*60*60*1000));
                  }
                } catch(e) {}
              }} style={{
                background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '8px 16px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(124,58,237,0.5)'
              }}>Install</button>
            )}
            <button onClick={() => { setShowInstallBanner(false); localStorage.setItem('pwa-dismissed-until', String(Date.now() + 24*60*60*1000)); }}
              style={{ background: 'rgba(255,255,255,0.07)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        </div>
      )}

    </main>
  );
}

// ── Reusable Components ──────────────────────────────────────

// ── NoteCanvas Component ──────────────────────────────────────────────────────
// Fondasi infinite canvas: pan, zoom, drag kartu, add/delete
// Fase 2: koneksi antar kartu (edges sudah siap di backend)
function NoteCanvas({ data, notes, apiBase, onUpdate, onOpenNote }) {
  const containerRef = useRef(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [items, setItems] = useState([]);
  const [edges] = useState([]); // fase 2
  const [dragging, setDragging] = useState(null); // {itemId, startX, startY, origX, origY}
  const [resizing, setResizing] = useState(null); // {itemId, startX, startY, origW, origH}
  const [panning, setPanning] = useState(null);   // {startX, startY, origVX, origVY}
  const [selectedId, setSelectedId] = useState(null); // kartu yang sedang dipilih
  const dragRef = useRef(null);   // ref untuk dragging (avoid stale closure)
  const resizeRef = useRef(null); // ref untuk resizing
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (data?.items) setItems(data.items);
  }, [data]);

  // ── Viewport helpers ──
  const screenToCanvas = (sx, sy) => ({
    x: (sx - viewport.x) / viewport.scale,
    y: (sy - viewport.y) / viewport.scale,
  });

  const clampScale = s => Math.min(3, Math.max(0.2, s));

  // ── Zoom dengan wheel ──
  const onWheel = (e) => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    const ns = clampScale(viewport.scale * delta);
    setViewport(v => ({
      scale: ns,
      x: mx - (mx - v.x) * (ns / v.scale),
      y: my - (my - v.y) * (ns / v.scale),
    }));
  };

  // ── Pan canvas ──
  const onBgMouseDown = (e) => {
    if (e.target.closest('.canvas-card')) return;
    setSelectedId(null);
    const startX = e.clientX, startY = e.clientY;
    const origX = viewport.x, origY = viewport.y;
    const onMove = (ev) => setViewport(v => ({ ...v, x: origX + ev.clientX - startX, y: origY + ev.clientY - startY }));
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Drag kartu ──
  const startDrag = (e, item) => {
    e.stopPropagation();
    setSelectedId(item.id);
    setDragging(item.id);
    setItems(its => its.map(it => ({ ...it, z_index: it.id === item.id ? 99 : it.z_index })));
    const startX = e.clientX, startY = e.clientY;
    const origX = item.x, origY = item.y;
    const scale = viewport.scale;
    const onMove = (ev) => {
      setItems(its => its.map(it => it.id === item.id
        ? { ...it, x: origX + (ev.clientX - startX) / scale, y: origY + (ev.clientY - startY) / scale }
        : it));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setDragging(null);
      // simpan posisi akhir
      setItems(its => { const found = its.find(it => it.id === item.id); if (found) debounceSave(found); return its; });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Resize kartu ──
  const startResize = (e, item) => {
    e.stopPropagation();
    setResizing(item.id);
    const startX = e.clientX, startY = e.clientY;
    const origW = item.width, origH = item.height;
    const scale = viewport.scale;
    const onMove = (ev) => {
      setItems(its => its.map(it => it.id === item.id
        ? { ...it, width: Math.max(160, origW + (ev.clientX - startX) / scale), height: Math.max(100, origH + (ev.clientY - startY) / scale) }
        : it));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setResizing(null);
      setItems(its => { const found = its.find(it => it.id === item.id); if (found) debounceSave(found); return its; });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onMouseMove = () => {};
  const onMouseUp = () => {};

  // ── Touch support (pan + pinch zoom) ──
  const touchRef = useRef({});
  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchRef.current = { mode: 'pan', startX: t.clientX, startY: t.clientY, origVX: viewport.x, origVY: viewport.y };
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = containerRef.current?.getBoundingClientRect();
      touchRef.current = {
        mode: 'pinch', initDist: dist,
        origScale: viewport.scale,
        origVX: viewport.x, origVY: viewport.y,
        midX: midX - (rect?.left || 0),
        midY: midY - (rect?.top || 0),
      };
    }
  };
  const onTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && touchRef.current.mode === 'pan') {
      const t = e.touches[0];
      setViewport(v => ({
        ...v,
        x: touchRef.current.origVX + t.clientX - touchRef.current.startX,
        y: touchRef.current.origVY + t.clientY - touchRef.current.startY,
      }));
    } else if (e.touches.length === 2 && touchRef.current.mode === 'pinch') {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / touchRef.current.initDist;
      const ns = clampScale(touchRef.current.origScale * ratio);
      const { midX, midY, origVX, origVY, origScale } = touchRef.current;
      setViewport({
        scale: ns,
        x: midX - (midX - origVX) * (ns / origScale),
        y: midY - (midY - origVY) * (ns / origScale),
      });
    }
  };

  // ── Save item position (debounced) ──
  const debounceSave = (item) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch(`${apiBase}/participant/notes/canvas`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_item', id: item.id, x: item.x, y: item.y, width: item.width, height: item.height, z_index: item.z_index })
      });
    }, 600);
  };

  // ── Tambah kartu note ──
  const addNoteCard = async (noteId) => {
    if (!data?.canvas_id) return;
    setSaving(true);
    const center = screenToCanvas(
      (containerRef.current?.clientWidth || 400) / 2,
      (containerRef.current?.clientHeight || 300) / 2
    );
    const res = await fetch(`${apiBase}/participant/notes/canvas`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_item', type: 'note', note_id: noteId, x: center.x - 130, y: center.y - 70, width: 260, height: 140 })
    });
    setSaving(false);
    setShowAddMenu(false);
    if ((await res.json()).ok) onUpdate();
  };

  // ── Hapus kartu ──
  const deleteItem = async (itemId) => {
    await fetch(`${apiBase}/participant/notes/canvas`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_item', id: itemId })
    });
    setItems(its => its.filter(it => it.id !== itemId));
  };

  // ── Render ──
  return (
    <div style={{ position: 'relative', width: '100%', height: 520, border: '1px solid #1e2d45', borderRadius: 12, overflow: 'hidden', background: '#070c17' }}>
      {/* Toolbar */}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 20, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setShowAddMenu(s => !s)}
          style={{ padding: '6px 12px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
          + Kartu
        </button>
        {/* Zoom controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(15,23,42,0.9)', border: '1px solid #1e2d45', borderRadius: 8, overflow: 'hidden' }}>
          <button onClick={() => setViewport(v => {
            const ns = clampScale(v.scale * 0.8);
            const cx = (containerRef.current?.clientWidth || 400) / 2;
            const cy = (containerRef.current?.clientHeight || 300) / 2;
            return { scale: ns, x: cx - (cx - v.x) * (ns / v.scale), y: cy - (cy - v.y) * (ns / v.scale) };
          })} style={{ padding: '6px 10px', background: 'none', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>−</button>
          <span style={{ fontSize: 11, color: '#64748b', minWidth: 38, textAlign: 'center', userSelect: 'none' }}>{Math.round(viewport.scale * 100)}%</span>
          <button onClick={() => setViewport(v => {
            const ns = clampScale(v.scale * 1.25);
            const cx = (containerRef.current?.clientWidth || 400) / 2;
            const cy = (containerRef.current?.clientHeight || 300) / 2;
            return { scale: ns, x: cx - (cx - v.x) * (ns / v.scale), y: cy - (cy - v.y) * (ns / v.scale) };
          })} style={{ padding: '6px 10px', background: 'none', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>+</button>
        </div>
        <button onClick={() => setViewport({ x: 0, y: 0, scale: 1 })}
          style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.07)', color: '#94a3b8', border: '1px solid #1e2d45', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
          ⌂
        </button>
        {saving && <span style={{ fontSize: 11, color: '#64748b' }}>💾...</span>}
      </div>

      {/* Add menu dropdown */}
      {showAddMenu && (
        <div style={{ position: 'absolute', top: 46, left: 10, zIndex: 30, background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 10, padding: 8, minWidth: 220, maxHeight: 280, overflowY: 'auto' }}>
          <p style={{ fontSize: 11, color: '#475569', margin: '0 0 6px 4px', fontWeight: 600, textTransform: 'uppercase' }}>Pilih catatan:</p>
          {notes.filter(n => n.note_type !== 'fleeting').map(n => (
            <div key={n.id} onClick={() => addNoteCard(n.id)}
              style={{ padding: '7px 10px', cursor: 'pointer', borderRadius: 7, fontSize: 13, color: '#e2e8f0' }}
              onMouseEnter={e => e.target.style.background = '#1e293b'}
              onMouseLeave={e => e.target.style.background = 'transparent'}>
              📝 {n.title}
            </div>
          ))}
          {notes.filter(n => n.note_type !== 'fleeting').length === 0 && (
            <p style={{ fontSize: 12, color: '#475569', padding: '6px 8px' }}>Belum ada catatan permanen.</p>
          )}
        </div>
      )}

      {/* Dot grid background */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <pattern id="dotgrid" x={viewport.x % (20 * viewport.scale)} y={viewport.y % (20 * viewport.scale)}
            width={20 * viewport.scale} height={20 * viewport.scale} patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={0.8} fill="#1e2d45" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotgrid)" />
      </svg>

      {/* Canvas area */}
      <div ref={containerRef}
        style={{ position: 'absolute', inset: 0, cursor: panning ? 'grabbing' : 'grab', userSelect: 'none' }}
        onMouseDown={onBgMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => { touchRef.current = {}; }}
        ref={el => {
          if (el) {
            el.addEventListener('touchmove', onTouchMove, { passive: false });
          }
        }}
        onClick={() => setShowAddMenu(false)}>

        {/* Transform group */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, transform: `translate(${viewport.x}px,${viewport.y}px) scale(${viewport.scale})`, transformOrigin: '0 0' }}>
          {/* Fase 2: render edges di sini (SVG arrows) */}

          {/* Render items */}
          {items.map(item => (
            <div key={item.id} className="canvas-card"
              style={{
                position: 'absolute',
                left: item.x, top: item.y,
                width: item.width, height: item.height,
                background: '#0f172a',
                border: `2px solid ${selectedId === item.id ? '#3b82f6' : '#1e3a5f'}`,
                borderRadius: 12,
                boxShadow: selectedId === item.id ? '0 0 0 3px rgba(59,130,246,0.25), 0 4px 24px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.4)',
                cursor: dragging === item.id ? 'grabbing' : 'grab',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                transition: dragging?.itemId === item.id ? 'none' : 'box-shadow 0.15s',
              }}
              onMouseDown={e => { if (!e.target.closest('[data-resize]')) startDrag(e, item); }}>

              {/* Card header */}
              <div style={{ padding: '8px 10px 6px', borderBottom: '1px solid #1e2d45', display: 'flex', alignItems: 'center', gap: 6, background: '#080d18' }}>
                <span style={{ fontSize: 11, flex: 1, fontWeight: 700, color: '#93c5fd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.note_title || 'Untitled'}
                </span>
                <button onClick={e => { e.stopPropagation(); onOpenNote(item.note_id); }}
                  style={{ padding: '1px 6px', background: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: 'none', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>
                  Buka
                </button>
                <button onClick={e => { e.stopPropagation(); deleteItem(item.id); }}
                  style={{ padding: '1px 6px', background: 'transparent', color: '#475569', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>
                  ✕
                </button>
              </div>

              {/* Card body — preview konten */}
              <div style={{ flex: 1, padding: '8px 10px', fontSize: 11, color: '#64748b', lineHeight: 1.5, overflow: 'hidden' }}>
                {(item.note_content || '').slice(0, 180).replace(/[#*`\[\]]/g, '') || <span style={{ color: '#334155', fontStyle: 'italic' }}>kosong</span>}
              </div>

              {/* Resize handle — sudut kanan bawah */}
              <div
                data-resize="1"
                onMouseDown={e => startResize(e, item)}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 18, height: 18, cursor: 'nwse-resize',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
                  padding: '3px',
                }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M9 1L1 9M9 5L5 9M9 9" stroke="#334155" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      {items.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: 40, marginBottom: 10 }}>🖼️</span>
          <p style={{ color: '#334155', fontSize: 13 }}>Canvas kosong — tap "+ Tambah Kartu" untuk mulai</p>
        </div>
      )}
    </div>
  );
}

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
      padding: 18, background: '#0b1220', marginBottom: 14,
      minWidth: 0, maxWidth: '100%', boxSizing: 'border-box'
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
