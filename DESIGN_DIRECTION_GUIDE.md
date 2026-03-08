# Naik Kelas — Design Direction Guide

## 1) Design Vision

Naik Kelas menggunakan gaya **modern playful edtech**:
- ramah untuk peserta
- terasa energik dan optimis
- tetap rapi untuk kebutuhan admin

Karakter utama:
1. **Playful but clean**
2. **Bold typography + simple hierarchy**
3. **Rounded UI, soft cards, friendly spacing**
4. **High contrast CTA**

---

## 2) Visual Keywords

- Cheerful
- Energetic
- Youthful
- Friendly
- Confident
- Structured

---

## 3) Color System

### Primary Palette
- `--nk-bg-main`: `#BE94F5` (purple surface)
- `--nk-cta`: `#FF5734` (orange CTA)
- `--nk-accent`: `#FCCC42` (yellow accent)
- `--nk-ink`: `#151313` (main text)
- `--nk-paper`: `#F7F7F5` (white/off-white)

### Support Palette
- `--nk-success`: `#16A34A`
- `--nk-warning`: `#F59E0B`
- `--nk-danger`: `#DC2626`
- `--nk-muted`: `#6B7280`

### Usage Rule
- CTA utama selalu orange (`--nk-cta`).
- Teks utama selalu high-contrast terhadap background.
- Maksimal 1 warna accent dominan per section.

---

## 4) Typography

### Heading
- Bold, besar, ringkas
- Disarankan: `Inter`, `Poppins`, atau `Nunito`

### Scale (desktop)
- H1: 48–64
- H2: 32–40
- H3: 24–28
- Body: 16–18
- Caption: 12–14

### Rule
- Hindari paragraf panjang
- Maksimal 2 tingkat heading dalam satu viewport

---

## 5) Shape & Components

- Border radius utama: `16px`
- Radius card besar: `24px`
- Pill/chip: `999px`
- Button primary: rounded + shadow ringan
- Card elevation: soft shadow (tidak terlalu berat)

### Component set prioritas
1. Hero section
2. Summary cards (poin, progres, jadwal)
3. Filter chips kategori
4. Quiz/Tryout cards
5. Leaderboard list card

---

## 6) Layout & Spacing

### Grid
- Desktop: max width 1200 px
- Tablet/mobile: fluid single-column

### Spacing scale
- 4 / 8 / 12 / 16 / 24 / 32 / 48

### Rule
- 1 section = 1 tujuan
- Gunakan whitespace untuk pemisah konteks

---

## 7) Illustration & Icon Style

- Flat 2D illustration
- Outline tebal, ekspresif
- Ikon simple dan konsisten (rounded)
- Gunakan emoji seperlunya untuk bot/chat surface

---

## 8) Motion & Interaction

- Hover: subtle lift + color shift
- Active: quick press feedback
- Transition: 150–220ms ease-out
- Hindari animasi berlebihan di panel admin

---

## 9) Participant vs Admin UI Tone

### Participant
- Lebih playful, visual-rich
- Fokus motivasi: progress, poin, jadwal

### Admin
- Lebih rapi dan data-first
- Tetap bawa identitas warna Naik Kelas
- Prioritas keterbacaan tabel/form

---

## 10) Accessibility Baseline

- Kontras minimal WCAG AA
- Font body minimal 16px
- Fokus keyboard terlihat jelas
- Tombol min-height 40px
- Jangan hanya mengandalkan warna untuk status

---

## 11) Immediate UI Refactor Plan (bertahap)

### Phase A — Foundation Tokens
- Buat file design tokens (CSS variables)
- Terapkan warna, radius, shadow global

### Phase B — Participant Portal Refresh
- Hero profile + point card + reminder card
- Leaderboard dan history jadi card modular

### Phase C — Admin Visual Upgrade
- Form admin lebih konsisten
- Filtering dan list lebih readable

### Phase D — Polishing
- Empty states, loading states, error states
- Small motion + icon consistency

---

## 12) Do / Don’t

### Do
- Gunakan CTA kontras tinggi
- Prioritaskan clarity sebelum dekorasi
- Konsisten radius/spacing

### Don’t
- Jangan campur terlalu banyak gaya visual
- Jangan overuse warna neon
- Jangan pakai tabel padat tanpa hierarchy

---

## 13) Implementation Note

Guide ini menjadi acuan utama redesign web Naik Kelas agar:
- bot + web terasa satu brand
- pengalaman belajar terasa menyenangkan
- admin tetap efisien untuk operasional
