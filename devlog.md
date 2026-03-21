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

## 2026-03-21 — Roadmap Restart (Bertahap, v1 Jabatan)
### Scope implementasi tahap awal
- Mengaktifkan ulang roadmap dengan fokus **Roadmap Jabatan** dulu (tanpa kategori/catatan).
- Menambahkan API CRUD admin untuk jabatan roadmap:
  - `GET /admin/roadmap/positions`
  - `POST /admin/roadmap/positions` (create/update/delete via `action: delete`)
- Menambahkan field jabatan sesuai kebutuhan:
  - `code` (kode jabatan, unik)
  - `name` (nama jabatan)
  - `description` (deskripsi jabatan)

### Perubahan teknis
- Backend:
  - Registrasi route `/admin/roadmap/positions` di router.
  - Migrasi startup membuat tabel `roadmap_positions` dengan kolom `code` (UNIQUE).
  - Handler posisi diperbarui agar membaca/menyimpan `code` dan validasi duplikasi kode.
  - Tabel roadmap lama (`roadmap_categories`, `roadmap_notes`, `category_roadmaps`) tetap di-drop (belum dipakai tahap ini).
- Frontend:
  - Menu admin `Roadmap Jabatan` diaktifkan lagi.
  - Section roadmap admin disederhanakan jadi form + list CRUD jabatan saja.
  - Form input: kode jabatan, nama jabatan, deskripsi jabatan.
  - Tabel list menampilkan: kode, nama, deskripsi, update, aksi edit/hapus.

## 2026-03-21 — Roadmap Restart (Tahap Kompetensi Teknis)
### Scope
- Menambahkan CRUD **Kompetensi Teknis** yang terhubung ke Jabatan roadmap.

### Perubahan
- Backend:
  - Tambah tabel `roadmap_competencies` (`position_id`, `code`, `name`, `description`) dengan unique `(position_id, code)`.
  - Tambah endpoint admin: `GET/POST /admin/roadmap/competencies`.
  - Validasi akses tetap mengikuti scope jabatan/kelompok admin.
- Frontend:
  - Di section Roadmap Jabatan ditambahkan blok "Kompetensi Teknis per Jabatan".
  - Form input: pilih jabatan, kode kompetensi, nama kompetensi, deskripsi kompetensi.
  - Tabel kompetensi per jabatan + aksi edit/hapus.
