// useCanvasStore.js — state management untuk multi-canvas
// Sumber kebenaran: backend DB, localStorage sebagai cache UI state

const STORAGE_KEY = 'nk_current_canvas_id';

// Simpan canvas aktif ke localStorage
export const saveCurrentCanvasId = (id) => {
  try { localStorage.setItem(STORAGE_KEY, String(id)); } catch {}
};

// Ambil canvas aktif dari localStorage
export const loadCurrentCanvasId = () => {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
};

// Reset cache canvas tertentu (saat di-switch)
export const clearCanvasCache = (id) => {
  try { localStorage.removeItem(`nk_canvas_${id}`); } catch {}
};
