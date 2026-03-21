# Dev Log — Roadmap Belajar per Jabatan (Naik Kelas)

## 2026-03-21 — Nusas
### Diskusi & Keputusan
- Fitur roadmap didesain ulang dari nol (fitur roadmap sebelumnya sudah dihapus).
- Struktur final yang disepakati:
  - Roadmap berbasis **jabatan**.
  - Satu jabatan memiliki beberapa **kategori**.
  - Setiap kategori memiliki **catatan roadmap** sendiri.
  - Graph kategori dibentuk dari backlink antar catatan kategori.
  - Graph jabatan dibentuk dari kategori-kategori yang dipilih.
- Catatan permanen peserta tetap terpisah, tidak diubah.

### Output sesi ini
- Menyusun phase pengembangan bertahap dalam `devplan.md`.
- Menetapkan scope V1 dan non-goals.

### Next Step
- Mulai implementasi Phase 1: desain tabel + CRUD admin jabatan/kategori/catatan.
