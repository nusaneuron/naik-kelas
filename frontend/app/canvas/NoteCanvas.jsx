'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  BackgroundVariant, Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CustomNode from './CustomNode';
import CanvasList from './CanvasList';
import { saveCurrentCanvasId, loadCurrentCanvasId } from './useCanvasStore';

const nodeTypes = { noteCard: CustomNode };

// ── NoteCanvas: infinite multi-canvas ────────────────────────────────────────
export default function NoteCanvas({ notes, apiBase, onOpenNote }) {
  const [canvases, setCanvases] = useState([]);       // daftar semua canvas
  const [activeId, setActiveId] = useState(null);     // canvas aktif
  const [canvasData, setCanvasData] = useState(null); // data canvas aktif
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  // ── Load daftar canvas saat pertama buka ──
  useEffect(() => {
    loadCanvasList();
  }, []);

  const loadCanvasList = async () => {
    const res = await fetch(`${apiBase}/participant/notes/canvas?list=1`, { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const list = data.canvases || [];
    setCanvases(list);

    // Tentukan canvas aktif: dari localStorage atau yang pertama
    const savedId = loadCurrentCanvasId();
    const target = list.find(c => String(c.id) === savedId) || list[0];
    if (target) switchCanvas(target.id, list);
  };

  // ── Switch ke canvas tertentu ──
  const switchCanvas = async (id, list = canvases) => {
    setActiveId(id);
    saveCurrentCanvasId(id);
    setNodes([]); setEdges([]);

    const res = await fetch(`${apiBase}/participant/notes/canvas?canvas_id=${id}`, { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    setCanvasData(data);

    // Konversi ke React Flow format
    const rfNodes = (data.items || []).map(item => ({
      id: String(item.id),
      type: 'noteCard',
      position: { x: item.x, y: item.y },
      width: item.width || 260,
      height: item.height || 140,
      style: { width: item.width || 260, height: item.height || 140 },
      data: {
        title: item.note_title,
        content: item.note_content,
        itemId: item.id,
        noteId: item.note_id,
        onOpen: () => onOpenNote?.(item.note_id),
        onDelete: () => deleteItem(id, item.id),
      },
    }));
    const rfEdges = (data.edges || []).map(e => ({
      id: String(e.id),
      source: String(e.from_item),
      target: String(e.to_item),
      label: e.label,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
    }));
    setNodes(rfNodes);
    setEdges(rfEdges);
  };

  // ── Simpan node ke backend ──
  const saveNode = useCallback(async (node) => {
    if (!activeId) return;
    setSaving(true);
    await fetch(`${apiBase}/participant/notes/canvas?canvas_id=${activeId}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_item', id: Number(node.id),
        x: node.position.x, y: node.position.y,
        width: node.width || 260, height: node.height || 140, z_index: 0,
      }),
    });
    setSaving(false);
  }, [activeId, apiBase]);

  const onNodeDragStop = useCallback((_, node) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNode(node), 400);
  }, [saveNode]);

  const onNodeResizeEnd = useCallback((_, node) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNode(node), 400);
  }, [saveNode]);

  // ── Koneksi antar node ──
  const onConnect = useCallback(async (params) => {
    setEdges(eds => addEdge({ ...params, style: { stroke: '#3b82f6', strokeWidth: 2 } }, eds));
    if (!activeId) return;
    await fetch(`${apiBase}/participant/notes/canvas?canvas_id=${activeId}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_edge', from_item: Number(params.source), to_item: Number(params.target), label: '' }),
    });
  }, [activeId, apiBase]);

  // ── Tambah kartu ke canvas aktif ──
  const addNoteCard = async (note) => {
    if (!activeId) return;
    setSaving(true);
    const res = await fetch(`${apiBase}/participant/notes/canvas?canvas_id=${activeId}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_item', type: 'note', note_id: note.id, x: Math.random() * 300 + 100, y: Math.random() * 200 + 100, width: 260, height: 140 }),
    });
    const d = await res.json();
    setSaving(false);
    setShowAddMenu(false);
    if (d.ok) switchCanvas(activeId);
  };

  // ── Hapus kartu ──
  const deleteItem = async (canvasId, itemId) => {
    await fetch(`${apiBase}/participant/notes/canvas?canvas_id=${canvasId}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_item', id: itemId }),
    });
    setNodes(ns => ns.filter(n => n.id !== String(itemId)));
  };

  // ── Buat canvas baru ──
  const createCanvas = async (name) => {
    const res = await fetch(`${apiBase}/participant/notes/canvas`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_canvas', name }),
    });
    const d = await res.json();
    if (d.ok) {
      const newCanvas = { id: d.id, name: d.name };
      setCanvases(cs => [newCanvas, ...cs]);
      switchCanvas(d.id, [newCanvas, ...canvases]);
    }
  };

  // ── Hapus canvas ──
  const deleteCanvas = async (id) => {
    const res = await fetch(`${apiBase}/participant/notes/canvas?canvas_id=${id}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_canvas' }),
    });
    const d = await res.json();
    if (d.ok) {
      const remaining = canvases.filter(c => c.id !== id);
      setCanvases(remaining);
      if (activeId === id && remaining.length > 0) switchCanvas(remaining[0].id, remaining);
    }
  };

  // ── Rename canvas ──
  const renameCanvas = async (id, name) => {
    await fetch(`${apiBase}/participant/notes/canvas?canvas_id=${id}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rename_canvas', name }),
    });
    setCanvases(cs => cs.map(c => c.id === id ? { ...c, name } : c));
  };

  return (
    <div style={{ width: '100%', height: 560, borderRadius: 12, overflow: 'hidden', border: '1px solid #1e2d45', background: '#070c17' }}>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeResizeEnd={onNodeResizeEnd}
        nodeTypes={nodeTypes}
        fitView fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1} maxZoom={3}
        proOptions={{ hideAttribution: true }}
        style={{ background: '#070c17' }}
        onClick={() => setShowAddMenu(false)}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e2d45" />
        <MiniMap nodeColor={() => '#1d4ed8'} maskColor="rgba(7,12,23,0.8)"
          style={{ background: '#0b1628', border: '1px solid #1e2d45', borderRadius: 8 }} />
        <Controls style={{ background: '#0b1628', border: '1px solid #1e2d45', borderRadius: 8 }} showInteractive={false} />

        {/* Top toolbar */}
        <Panel position="top-left">
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', position: 'relative' }}>
            {/* Canvas switcher */}
            <CanvasList
              canvases={canvases}
              activeId={activeId}
              onSelect={switchCanvas}
              onCreate={createCanvas}
              onDelete={deleteCanvas}
              onRename={renameCanvas}
            />

            {/* Tambah kartu */}
            <div style={{ position: 'relative' }}>
              <button onClick={e => { e.stopPropagation(); setShowAddMenu(s => !s); }}
                style={{ padding: '6px 12px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                + Kartu
              </button>
              {showAddMenu && (
                <div style={{ position: 'absolute', top: 34, left: 0, background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 10, padding: 8, minWidth: 230, maxHeight: 280, overflowY: 'auto', zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                  <p style={{ fontSize: 10, color: '#475569', margin: '0 0 6px 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Pilih catatan:</p>
                  {notes.filter(n => n.note_type !== 'fleeting').length === 0
                    ? <p style={{ fontSize: 12, color: '#475569', padding: '6px 8px' }}>Belum ada catatan permanen.</p>
                    : notes.filter(n => n.note_type !== 'fleeting').map(n => (
                      <div key={n.id} onClick={() => addNoteCard(n)}
                        style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: 7, fontSize: 13, color: '#e2e8f0' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        📝 {n.title}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            {saving && <span style={{ fontSize: 11, color: '#64748b', paddingTop: 8 }}>💾</span>}
          </div>
        </Panel>

        {/* Empty state */}
        {nodes.length === 0 && (
          <Panel position="top-center">
            <div style={{ marginTop: 60, textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🖼️</div>
              <p style={{ color: '#334155', fontSize: 13 }}>Canvas kosong — tap "+ Kartu" untuk mulai</p>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
