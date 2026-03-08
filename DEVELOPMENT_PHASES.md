# Naik Kelas — Development Phases

## Keputusan Produk (Disetujui)

1. Login web menggunakan **nomor telepon** (bukan email).
2. Verifikasi identitas utama mengikuti alur bot (berbasis no HP).
3. Password dibuat **default terlebih dahulu** saat akun dibuat.
4. Role pengguna dipisah:
   - `participant`
   - `admin`
5. Peserta bisa melihat profil + leaderboard.
6. Admin bisa mengelola peserta + bank soal.

> Catatan keamanan: password default sebaiknya unik per pengguna (generated), bukan satu password global.

---

## Target Arsitektur

### Modul utama
- **Auth Service** (phone + password, session/JWT)
- **Participant Portal** (profil, riwayat, leaderboard)
- **Admin Portal** (manajemen peserta, kategori, soal)
- **Bot Integration Layer** (sinkron pendaftaran bot ↔ akun web)

### Entitas data inti
- `users` (id, phone, password_hash, role, is_active, must_change_password)
- `participant_profiles` (user_id, name, email, source)
- `telegram_links` (telegram_user_id, user_id)
- `question_categories`
- `questions`
- `question_options`
- `quiz_attempts` (existing)
- `tryout_results` (existing)

---

## Phase 0 — Foundation Cleanup (1-2 hari)

### Tujuan
Menyiapkan fondasi auth + data model agar fase berikutnya stabil.

### Scope
1. Tambah tabel `users` + `participant_profiles`.
2. Migrasi peserta lama ke akun participant berbasis `phone`.
3. Tambah kolom relasi `user_id` ke data attempt/hasil.
4. Utility generate default password unik.
5. Endpoint admin seed akun admin pertama.

### Deliverable
- SQL migration v1 auth
- script migrasi peserta->users
- akun admin bootstrap

---

## Phase 1 — Auth & Role Guard (MVP) (2-3 hari)

### Tujuan
User bisa login web via no HP, role-based access berjalan.

### Scope
1. Endpoint auth:
   - `POST /auth/login` (phone + password)
   - `POST /auth/logout`
   - `GET /auth/me`
   - `POST /auth/change-password`
2. Session auth (HTTP-only cookie).
3. Middleware role guard:
   - participant routes
   - admin routes
4. Wajib ganti password saat first login (`must_change_password=true`).

### Deliverable
- halaman login phone/password
- guard halaman participant/admin
- forced change password screen

---

## Phase 2 — Participant Portal (2-3 hari)

### Tujuan
Peserta punya dashboard pribadi.

### Scope
1. Halaman profil peserta (nama, phone, email).
2. Riwayat quiz per kategori:
   - percobaan ke-
   - status lulus/gagal
3. Riwayat tryout:
   - skor
   - durasi
   - speed_qpm
4. Leaderboard publik untuk participant.

### Deliverable
- `/participant/dashboard`
- `/participant/history`
- `/participant/leaderboard`

---

## Phase 3 — Admin Portal (3-5 hari)

### Tujuan
Admin bisa operasional penuh.

### Scope
1. Manajemen peserta (list/search/disable/reset password).
2. Manajemen kategori soal (CRUD).
3. Manajemen bank soal (CRUD + opsi jawaban + kunci).
4. Publish/unpublish soal.
5. Statistik ringkas:
   - peserta aktif
   - tingkat kelulusan
   - top 10 tercepat tryout

### Deliverable
- `/admin/participants`
- `/admin/categories`
- `/admin/questions`
- `/admin/analytics`

---

## Phase 4 — Bot ↔ Web Account Sync (2 hari)

### Tujuan
Identitas bot dan web 1 akun.

### Scope
1. Saat daftar bot sukses, cek/buat user by phone.
2. Simpan link Telegram ke user (`telegram_links`).
3. Jika phone sudah ada akun web, langsung link.
4. Notifikasi user untuk login web (dengan password default).

### Deliverable
- sinkronisasi otomatis akun
- fallback/manual relink admin

---

## Phase 5 — Hardening & QA (2-3 hari)

### Tujuan
Siap produksi aman.

### Scope
1. Rate limit login + lockout sementara.
2. Audit log admin actions.
3. Input validation & sanitization audit.
4. Backup strategy untuk DB.
5. UAT checklist + smoke test deployment.

### Deliverable
- production checklist
- QA pass report

---

## Eksekusi Sprint Disarankan

### Sprint A (minggu ini)
- Phase 0 + Phase 1

### Sprint B
- Phase 2

### Sprint C
- Phase 3

### Sprint D
- Phase 4 + Phase 5

---

## Next Step (langsung dikerjakan)
1. Implement **Phase 0** migration + schema.
2. Lanjut endpoint login no HP + default password flow (Phase 1).
3. Deploy staging dan uji login participant/admin.
