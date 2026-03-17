'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CustomNode from './CustomNode';

// ── Node types registry ──────────────────────────────────────────────────────
const nodeTypes = { noteCard: CustomNode };

// ── NoteCanvas: infinite canvas ala Obsidian ────────────────────────────────
export default function NoteCanvas({ data, notes, apiBase, onUpdate, onOpenNote }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);
  const canvasId = data?.canvas_id;

  // ── Load items dari backend ke React Flow nodes ──
  useEffect(() => {
    if (!data?.items) return;
    const rfNodes = data.items.map(item => ({
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
        onOpen: () => onOpenNote?.(item.note_id),
        onDelete: () => deleteItem(item.id),
      },
    }));
    // Load edges
    const rfEdges = (data.edges || []).map(e => ({
      id: String(e.id),
      source: String(e.from_item),
      target: String(e.to_item),
      label: e.label,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      animated: false,
    }));
    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [data]);

  // ── Simpan posisi & ukuran ke backend ──
  const saveNode = useCallback(async (node) => {
    await fetch(`${apiBase}/participant/notes/canvas`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_item',
        id: Number(node.id),
        x: node.position.x,
        y: node.position.y,
        width: node.width || node.measured?.width || 260,
        height: node.height || node.measured?.height || 140,
        z_index: 0,
      }),
    });
  }, [apiBase]);

  // Auto-save saat drag selesai
  const onNodeDragStop = useCallback((_, node) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNode(node), 500);
  }, [saveNode]);

  // Auto-save saat resize selesai
  const onNodeResizeEnd = useCallback((_, node) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNode(node), 500);
  }, [saveNode]);

  // ── Tambah koneksi antar node (fase 2) ──
  const onConnect = useCallback(async (params) => {
    setEdges(eds => addEdge({ ...params, style: { stroke: '#3b82f6', strokeWidth: 2 } }, eds));
    await fetch(`${apiBase}/participant/notes/canvas`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_edge', from_item: Number(params.source), to_item: Number(params.target), label: '' }),
    });
  }, [apiBase]);

  // ── Tambah kartu baru ──
  const addNoteCard = async (note) => {
    if (!canvasId) return;
    setSaving(true);
    const res = await fetch(`${apiBase}/participant/notes/canvas`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_item', type: 'note', note_id: note.id, x: Math.random() * 300 + 50, y: Math.random() * 200 + 50, width: 260, height: 140 }),
    });
    setSaving(false);
    setShowAddMenu(false);
    if ((await res.json()).ok) onUpdate?.();
  };

  // ── Hapus kartu ──
  const deleteItem = async (itemId) => {
    await fetch(`${apiBase}/participant/notes/canvas`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_item', id: itemId }),
    });
    setNodes(ns => ns.filter(n => n.id !== String(itemId)));
  };

  // ── Update delete handler di nodes (karena closure) ──
  useEffect(() => {
    setNodes(ns => ns.map(n => ({
      ...n,
      data: { ...n.data, onDelete: () => deleteItem(n.data.itemId) },
    })));
  }, [canvasId]);

  return (
    <div style={{ width: '100%', height: 540, borderRadius: 12, overflow: 'hidden', border: '1px solid #1e2d45', background: '#070c17' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeResizeEnd={onNodeResizeEnd}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        style={{ background: '#070c17' }}
      >
        {/* Dot grid ala Obsidian */}
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e2d45" />

        {/* Minimap */}
        <MiniMap
          nodeColor={() => '#1d4ed8'}
          maskColor="rgba(7,12,23,0.8)"
          style={{ background: '#0b1628', border: '1px solid #1e2d45', borderRadius: 8 }}
        />

        {/* Zoom controls */}
        <Controls
          style={{ background: '#0b1628', border: '1px solid #1e2d45', borderRadius: 8 }}
          showInteractive={false}
        />

        {/* Custom toolbar */}
        <Panel position="top-left">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowAddMenu(s => !s)}
              style={{ padding: '7px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, boxShadow: '0 2px 8px rgba(29,78,216,0.4)' }}
            >+ Tambah Kartu</button>
            {saving && <span style={{ fontSize: 11, color: '#64748b' }}>💾 Menyimpan...</span>}

            {/* Add menu */}
            {showAddMenu && (
              <div style={{ position: 'absolute', top: 38, left: 0, background: '#0f172a', border: '1px solid #1e2d45', borderRadius: 10, padding: 8, minWidth: 230, maxHeight: 300, overflowY: 'auto', zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                <p style={{ fontSize: 11, color: '#475569', margin: '0 0 6px 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Pilih catatan:</p>
                {notes.filter(n => n.note_type !== 'fleeting').length === 0
                  ? <p style={{ fontSize: 12, color: '#475569', padding: '6px 8px' }}>Belum ada catatan permanen.</p>
                  : notes.filter(n => n.note_type !== 'fleeting').map(n => (
                    <div key={n.id} onClick={() => addNoteCard(n)}
                      style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: 7, fontSize: 13, color: '#e2e8f0', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      📝 {n.title}
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
