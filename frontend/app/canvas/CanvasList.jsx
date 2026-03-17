'use client';
import { useState } from 'react';

// ── CanvasList: dropdown/panel daftar canvas ─────────────────────────────────
export default function CanvasList({ canvases, activeId, onSelect, onCreate, onDelete, onRename }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState('');

  const active = canvases.find(c => c.id === activeId);

  return (
    <div style={{ position: 'relative', zIndex: 50 }}>
      {/* Tombol aktif canvas */}
      <button
        onClick={() => setOpen(s => !s)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', background: '#0f172a',
          border: '1px solid #1e3a5f', borderRadius: 8,
          color: '#93c5fd', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', minWidth: 130,
        }}
      >
        <span>🖼️</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {active?.name || 'Canvas'}
        </span>
        <span style={{ color: '#334155' }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 38, left: 0, minWidth: 240,
          background: '#0f172a', border: '1px solid #1e2d45',
          borderRadius: 12, padding: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)', zIndex: 100,
        }}>
          <p style={{ fontSize: 10, color: '#475569', margin: '0 0 6px 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Daftar Canvas
          </p>

          {/* List canvas */}
          {canvases.map(c => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 8px', borderRadius: 8,
              background: c.id === activeId ? 'rgba(59,130,246,0.15)' : 'transparent',
              border: c.id === activeId ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
              marginBottom: 3,
            }}>
              {/* Rename inline */}
              {renamingId === c.id ? (
                <input
                  autoFocus
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { onRename(c.id, renameVal); setRenamingId(null); }
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onBlur={() => { if (renameVal) onRename(c.id, renameVal); setRenamingId(null); }}
                  style={{ flex: 1, background: '#1e293b', border: '1px solid #3b82f6', borderRadius: 5, color: '#e2e8f0', padding: '3px 7px', fontSize: 12, outline: 'none' }}
                />
              ) : (
                <span
                  onClick={() => { onSelect(c.id); setOpen(false); }}
                  style={{ flex: 1, fontSize: 12, color: c.id === activeId ? '#93c5fd' : '#94a3b8', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {c.id === activeId ? '▸ ' : ''}{c.name}
                </span>
              )}

              {/* Rename button */}
              <button
                onClick={() => { setRenamingId(c.id); setRenameVal(c.name); }}
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 11, padding: '1px 4px' }}
                title="Rename"
              >✏️</button>

              {/* Delete button */}
              {canvases.length > 1 && (
                <button
                  onClick={() => { if (confirm(`Hapus canvas "${c.name}"?`)) { onDelete(c.id); setOpen(false); } }}
                  style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 11, padding: '1px 4px' }}
                  title="Hapus"
                >🗑</button>
              )}
            </div>
          ))}

          {/* Tambah canvas baru */}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #1e2d45', display: 'flex', gap: 6 }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { onCreate(newName.trim()); setNewName(''); setOpen(false); } }}
              placeholder="Nama canvas baru..."
              style={{ flex: 1, background: '#1e293b', border: '1px solid #1e2d45', borderRadius: 6, color: '#e2e8f0', padding: '5px 8px', fontSize: 11, outline: 'none' }}
            />
            <button
              onClick={() => { if (newName.trim()) { onCreate(newName.trim()); setNewName(''); setOpen(false); } }}
              style={{ padding: '5px 10px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
            >+ Buat</button>
          </div>
        </div>
      )}
    </div>
  );
}
