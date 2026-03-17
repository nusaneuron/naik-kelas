'use client';
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

// ── CustomNode: kartu catatan di canvas ──────────────────────────────────────
const CustomNode = memo(({ data, selected }) => {
  const { title, content, onOpen, onDelete } = data;

  return (
    <div style={{
      background: selected
        ? 'linear-gradient(135deg, #0f1f3d, #131c35)'
        : 'linear-gradient(135deg, #0b1628, #0f172a)',
      border: `2px solid ${selected ? '#3b82f6' : '#1e3a5f'}`,
      borderRadius: 14,
      minWidth: 220,
      maxWidth: 320,
      boxShadow: selected
        ? '0 0 0 3px rgba(59,130,246,0.25), 0 8px 32px rgba(0,0,0,0.6)'
        : '0 4px 24px rgba(0,0,0,0.5)',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      cursor: 'grab',
      userSelect: 'none',
      overflow: 'hidden',
    }}>
      {/* Connection handles — siap untuk fase 2 edges */}
      <Handle type="target" position={Position.Top} style={{ background: '#3b82f6', border: '2px solid #1e3a5f', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#3b82f6', border: '2px solid #1e3a5f', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#a78bfa', border: '2px solid #1e3a5f', width: 10, height: 10 }} />
      <Handle type="target" position={Position.Left} style={{ background: '#a78bfa', border: '2px solid #1e3a5f', width: 10, height: 10 }} />

      {/* Header */}
      <div style={{
        padding: '9px 12px',
        background: 'rgba(0,0,0,0.3)',
        borderBottom: '1px solid #1e2d45',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          📝 {title || 'Untitled'}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onOpen?.(); }}
          style={{ padding: '2px 8px', background: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: 'none', borderRadius: 5, fontSize: 10, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
        >Buka</button>
        <button
          onClick={e => { e.stopPropagation(); onDelete?.(); }}
          style={{ padding: '2px 6px', background: 'transparent', color: '#475569', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}
        >✕</button>
      </div>

      {/* Content preview */}
      <div style={{ padding: '9px 12px', fontSize: 11, color: '#64748b', lineHeight: 1.6, minHeight: 52, maxHeight: 120, overflow: 'hidden' }}>
        {(content || '').slice(0, 200).replace(/[#*`\[\]]/g, '').trim()
          || <span style={{ color: '#334155', fontStyle: 'italic' }}>Kosong...</span>}
      </div>
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
export default CustomNode;
