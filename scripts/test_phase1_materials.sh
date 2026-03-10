#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# Test Script — Phase 1: Learning Materials Backend
# Naik Kelas Project
# ─────────────────────────────────────────────────────────────────

BASE="https://website-naik-kelas.jbtuwc.easypanel.host/api"
COOKIE="/tmp/nk_cookie_test.txt"
PASS=0
FAIL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check() {
  local label="$1"
  local result="$2"
  local expect="$3"
  if echo "$result" | grep -q "$expect"; then
    echo -e "${GREEN}✅ PASS${NC} — $label"
    PASS=$((PASS+1))
  else
    echo -e "${RED}❌ FAIL${NC} — $label"
    echo "   Expected: $expect"
    echo "   Got: $result"
    FAIL=$((FAIL+1))
  fi
}

echo -e "\n${YELLOW}══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Phase 1 — Learning Materials Backend Test${NC}"
echo -e "${YELLOW}══════════════════════════════════════════${NC}\n"

# ── 0. Health ─────────────────────────────────────────────────────
echo "── [0] Health Check ──"
R=$(curl -s "$BASE/health")
check "Health: DB up" "$R" '"db":"up"'
check "Health: Service ok" "$R" '"status":"ok"'
echo ""

# ── 1. Login Admin ────────────────────────────────────────────────
echo "── [1] Login Admin ──"
R=$(curl -s -c $COOKIE -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"081284047501","password":"NK-7501!"}')
check "Login admin berhasil" "$R" '"ok":true'
echo ""

# ── 2. Akses tanpa login → harus unauthorized ─────────────────────
echo "── [2] Auth Guard ──"
R=$(curl -s "$BASE/participant/materials")
check "Tanpa login → unauthorized" "$R" '"error"'
R=$(curl -s "$BASE/admin/materials")
check "Admin tanpa login → unauthorized" "$R" '"error"'
echo ""

# ── 3. Admin: Tambah materi teks ─────────────────────────────────
echo "── [3] Admin: Create Materi Teks ──"
R=$(curl -s -b $COOKIE -X POST "$BASE/admin/materials" \
  -H "Content-Type: application/json" \
  -d '{"action":"create","category_id":1,"title":"Pengenalan Bilangan","type":"text","content":"Bilangan adalah simbol untuk menghitung dan mengukur. Ada bilangan bulat, pecahan, dan negatif.","exp_reward":10,"order_no":1}')
check "Create materi teks" "$R" '"ok":true'
MAT_ID=$(echo "$R" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "   Material ID: $MAT_ID"
echo ""

# ── 4. Admin: Tambah materi video ─────────────────────────────────
echo "── [4] Admin: Create Materi Video ──"
R=$(curl -s -b $COOKIE -X POST "$BASE/admin/materials" \
  -H "Content-Type: application/json" \
  -d '{"action":"create","category_id":1,"title":"Video Tutorial Penjumlahan","type":"video","content":"https://www.youtube.com/watch?v=example","exp_reward":15,"order_no":2}')
check "Create materi video" "$R" '"ok":true'
MAT_ID2=$(echo "$R" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo ""

# ── 5. Admin: List materi ─────────────────────────────────────────
echo "── [5] Admin: List Materi ──"
R=$(curl -s -b $COOKIE "$BASE/admin/materials?category_id=1")
check "List materi ada items" "$R" '"items"'
check "Materi teks muncul" "$R" 'Pengenalan Bilangan'
check "Materi video muncul" "$R" 'Video Tutorial'
check "Ada completed_count" "$R" '"completed_count"'
echo ""

# ── 6. Admin: Update materi ──────────────────────────────────────
echo "── [6] Admin: Update Materi ──"
R=$(curl -s -b $COOKIE -X POST "$BASE/admin/materials" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"update\",\"id\":$MAT_ID,\"category_id\":1,\"title\":\"Pengenalan Bilangan (Update)\",\"type\":\"text\",\"content\":\"Konten diperbarui.\",\"exp_reward\":12,\"order_no\":1,\"is_active\":true}")
check "Update materi berhasil" "$R" '"ok":true'
echo ""

# ── 7. Peserta: List materi (is_completed harus false) ──────────
echo "── [7] Peserta: List Materi ──"
R=$(curl -s -b $COOKIE "$BASE/participant/materials?category_id=1")
check "Peserta: list materi OK" "$R" '"items"'
check "Peserta: judul materi muncul" "$R" 'Bilangan'
check "Peserta: is_completed ada" "$R" '"is_completed"'
echo ""

# ── 8. Peserta: Tandai selesai ───────────────────────────────────
echo "── [8] Peserta: Tandai Materi Selesai ──"
R=$(curl -s -b $COOKIE -X POST "$BASE/participant/materials/complete" \
  -H "Content-Type: application/json" \
  -d "{\"material_id\":$MAT_ID}")
check "Tandai selesai berhasil" "$R" '"ok":true'
check "EXP diberikan (exp_gained > 0)" "$R" '"exp_gained":1'
check "Bukan already_completed" "$R" '"already_completed":false'
echo ""

# ── 9. Peserta: Coba tandai selesai lagi (no double EXP) ─────────
echo "── [9] Peserta: No Double EXP ──"
R=$(curl -s -b $COOKIE -X POST "$BASE/participant/materials/complete" \
  -H "Content-Type: application/json" \
  -d "{\"material_id\":$MAT_ID}")
check "Already completed terdeteksi" "$R" '"already_completed":true'
check "EXP = 0 (tidak double)" "$R" '"exp_gained":0'
echo ""

# ── 10. Peserta: Cek progress sudah update ───────────────────────
echo "── [10] Peserta: Cek Progress (is_completed = true) ──"
R=$(curl -s -b $COOKIE "$BASE/participant/materials?category_id=1")
check "is_completed true setelah selesai" "$R" '"is_completed":true'
echo ""

# ── 11. Admin: completed_count bertambah ─────────────────────────
echo "── [11] Admin: completed_count Bertambah ──"
R=$(curl -s -b $COOKIE "$BASE/admin/materials?category_id=1")
check "completed_count >= 1" "$R" '"completed_count":1'
echo ""

# ── 12. Admin: Hapus materi video ────────────────────────────────
echo "── [12] Admin: Delete Materi ──"
R=$(curl -s -b $COOKIE -X POST "$BASE/admin/materials" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"delete\",\"id\":$MAT_ID2}")
check "Hapus materi berhasil" "$R" '"ok":true'
echo ""

# ── 13. Validasi: action tidak valid ────────────────────────────
echo "── [13] Validasi: Action Tidak Valid ──"
R=$(curl -s -b $COOKIE -X POST "$BASE/admin/materials" \
  -H "Content-Type: application/json" \
  -d '{"action":"invalid"}')
check "Action invalid → error" "$R" '"error"'
echo ""

# ── 14. Validasi: create tanpa title ───────────────────────────
echo "── [14] Validasi: Create Tanpa Title ──"
R=$(curl -s -b $COOKIE -X POST "$BASE/admin/materials" \
  -H "Content-Type: application/json" \
  -d '{"action":"create","category_id":1}')
check "Create tanpa title → error" "$R" '"error"'
echo ""

# ─────────────────────────────────────────────────────────────────
echo -e "\n${YELLOW}══════════════════════════════════════════${NC}"
echo -e "  Hasil: ${GREEN}${PASS} PASS${NC} / ${RED}${FAIL} FAIL${NC}"
echo -e "${YELLOW}══════════════════════════════════════════${NC}\n"

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}🎉 Phase 1 semua test LULUS! Siap lanjut Phase 2.${NC}\n"
else
  echo -e "${RED}⚠️  Ada $FAIL test gagal. Cek output di atas.${NC}\n"
fi
