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

## 2026-03-21 — Stabilization Patch Lanjutan
### Masalah
- Simpan catatan roadmap tetap gagal di beberapa environment walau patch kompatibilitas legacy sudah ditambahkan.
- Dugaan kuat bentrok skema lama (`roadmap_id` + tabel legacy) dengan model baru (`category_id`).

### Perubahan
- Membersihkan skema legacy saat startup migrasi:
  - `DROP TABLE IF EXISTS category_roadmaps CASCADE`
  - `ALTER TABLE roadmap_notes DROP COLUMN IF EXISTS roadmap_id`
- Menyederhanakan jalur simpan catatan agar hanya memakai skema baru:
  - `INSERT/UPDATE roadmap_notes` berbasis `category_id`
  - Menghapus fallback insert/update berbasis `roadmap_id` pada handler save.

### Catatan Deploy
- Wajib redeploy backend agar cleanup migrasi dijalankan di database target.
- Setelah deploy, uji ulang create/update catatan roadmap pada kategori yang sama.

## 2026-03-21 — Roadmap Feature Removal (by request)
### Perubahan
- Menonaktifkan route API roadmap di router backend (admin + participant).
- Menambahkan cleanup migrasi startup untuk menghapus tabel roadmap terkait:
  - `roadmap_notes`
  - `roadmap_categories`
  - `roadmap_positions`
  - `category_roadmaps` (legacy)
- Menyembunyikan menu dan panel Roadmap di frontend (admin + participant).

### Dampak
- Fitur roadmap tidak lagi bisa diakses dari UI maupun endpoint publik aplikasi.
- Data roadmap existing di database akan terhapus saat backend start setelah deploy.
