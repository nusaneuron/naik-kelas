# 📚 Naik Kelas — Rencana Development: Fitur Materi Belajar

> Dibuat: 10 Maret 2026  
> Status: **Perencanaan**  
> Author: Nusas (AI Assistant)

---

## 🎯 Tujuan Fitur

Memberikan akses materi belajar terstruktur kepada peserta — berupa **teks, video, dan audio** — yang diorganisir per **kategori quiz** yang sudah ada. Peserta bisa belajar dulu sebelum mengerjakan quiz, membuat alur belajar menjadi lebih natural dan terarah.

---

## 🏗️ Arsitektur Fitur

### Relasi Data
```
question_categories (sudah ada)
    └── learning_materials (baru)
            └── material_progress (baru)
```

### Tipe Materi
| Tipe | Ikon | Cara Penyajian |
|------|------|----------------|
| `text` | 📖 | Teks dikirim langsung via Telegram / ditampilkan di web |
| `video` | 🎬 | URL YouTube/GDrive — Telegram auto-embed |
| `audio` | 🎵 | URL MP3 / file Telegram |

---

## 🗄️ Skema Database

### Tabel `learning_materials`
```sql
CREATE TABLE learning_materials (
    id          SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES question_categories(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'text',  -- text | video | audio
    content     TEXT NOT NULL DEFAULT '',      -- isi teks / URL video / URL audio
    order_no    INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tabel `material_progress`
```sql
CREATE TABLE material_progress (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    material_id INT NOT NULL REFERENCES learning_materials(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, material_id)
);
```

---

## 📋 Rencana Development Bertahap

---

### Phase 1 — Backend Foundation (Prioritas Tinggi)
**Target:** API endpoint siap, database terbentuk

#### 1.1 Database Migration
- [ ] Tambah tabel `learning_materials` di `initDB`
- [ ] Tambah tabel `material_progress` di `initDB`
- [ ] Index pada `category_id` dan `user_id`

#### 1.2 Admin Endpoints
```
GET  /admin/materials           → list semua materi (+ filter by category)
POST /admin/materials           → action: create | update | delete
```

Request body create/update:
```json
{
  "action": "create",
  "category_id": 1,
  "title": "Pengenalan Bilangan",
  "type": "text",
  "content": "Bilangan adalah...",
  "order_no": 1
}
```

#### 1.3 Participant Endpoints
```
GET /participant/materials                    → list materi per kategori (+ progress)
GET /participant/materials?category_id=1     → filter per kategori
POST /participant/materials/complete          → tandai materi selesai → trigger EXP
```

Response contoh:
```json
{
  "items": [
    {
      "id": 1,
      "category_id": 1,
      "category_name": "Matematika Dasar",
      "title": "Pengenalan Bilangan",
      "type": "text",
      "content": "...",
      "order_no": 1,
      "is_completed": true,
      "completed_at": "2026-03-10T10:00:00Z"
    }
  ]
}
```

---

### Phase 2 — Bot Integration (Prioritas Tinggi)
**Target:** Peserta bisa akses & tandai selesai materi via bot Nala

#### 2.1 Command `/materi`
Flow lengkap:
```
Peserta: /materi
Nala: Pilih kategori yang ingin kamu pelajari 📚
      [Matematika Dasar] [Pengetahuan Umum]
      ...

Peserta: Matematika Dasar
Nala: 📂 Materi Matematika Dasar (3 materi)
      
      1. 📖 Pengenalan Bilangan ✅
      2. 🎬 Video Tutorial Penjumlahan
      3. 🎵 Podcast Pengayaan
      
      Ketik nomor untuk membuka materi.

Peserta: 2
Nala: 🎬 Video Tutorial Penjumlahan
      [link video]
      
      Ketik "selesai" jika sudah menonton ✅

Peserta: selesai
Nala: ✅ Materi ditandai selesai!
      +10 EXP kamu dapatkan 🌟
      
      Lanjut ke materi berikutnya?
      3. 🎵 Podcast Pengayaan
```

#### 2.2 State Machine Bot
State baru yang ditambahkan:
- `materi_choose_category` — pilih kategori
- `materi_list` — list materi dalam kategori
- `materi_viewing` — sedang membuka materi (tunggu "selesai")

#### 2.3 Pengiriman Konten per Tipe
| Tipe | Aksi Bot |
|------|----------|
| `text` | `sendMessage` — pecah per 4000 karakter jika panjang |
| `video` | `sendMessage` + URL (Telegram auto-preview YouTube) |
| `audio` | `sendMessage` + URL (atau `sendAudio` jika file Telegram) |

#### 2.4 Update `/start`
Tambahkan `/materi` ke menu utama:
```
📚 Belajar
/materi  — Akses materi belajar per kategori
/quiz    — Latihan soal per kategori
/tryout  — Simulasi soal acak
```

#### 2.5 Sync Bot Commands
Tambahkan ke `syncTelegramBotCommands`:
```go
{"command": "materi", "description": "Akses materi belajar 📚"}
```

---

### Phase 3 — Web Portal (Prioritas Menengah)
**Target:** Peserta & admin bisa kelola materi via web

#### 3.1 Participant View — Tab Materi
Tampilan di portal peserta:
- **Summary card:** Total materi selesai / total materi
- **Per kategori:** Progress bar + list materi
- **Tiap materi:**
  - Ikon tipe (📖/🎬/🎵)
  - Judul + status ✅/○
  - Untuk video: embed YouTube thumbnail
  - Untuk audio: audio player HTML5
  - Untuk teks: render teks dengan scroll
  - Tombol "Tandai Selesai" (kalau belum)

#### 3.2 Admin View — Sidebar Menu "Materi"
- **Dropdown filter** kategori
- **Form tambah/edit materi:**
  - Pilih kategori
  - Pilih tipe (text/video/audio)
  - Input judul
  - Input konten (textarea untuk teks, URL untuk video/audio)
  - Urutan tampil (order_no)
  - Toggle aktif/nonaktif
- **List materi** dengan card UI (edit, hapus, drag urutan)
- **Statistik:** Berapa peserta yang sudah selesai per materi

---

### Phase 4 — Gamifikasi & Polish (Prioritas Rendah)
**Target:** Pengalaman belajar lebih engaging

#### 4.1 EXP per Materi
- Setiap materi selesai → dapat EXP (default: 10 EXP/materi)
- Admin bisa atur EXP reward per materi di form
- Tambah kolom `exp_reward INT DEFAULT 10` di `learning_materials`

#### 4.2 Progress Tracking
- Progress bar per kategori di profil peserta
- Notifikasi saat seluruh materi kategori selesai:
  ```
  🎉 Selamat! Kamu sudah menyelesaikan semua materi Matematika Dasar!
  Sekarang kamu siap untuk /quiz Matematika Dasar 🧠
  ```

#### 4.3 Rekomendasi Pintar
- Setelah quiz gagal → bot sarankan materi yang relevan
  ```
  💡 Kamu masih kesulitan di Matematika Dasar.
  Coba pelajari dulu materinya: /materi
  ```

#### 4.4 Admin Analytics
- Dashboard: materi paling banyak diselesaikan
- Materi yang sering di-skip peserta
- Korelasi selesai materi vs kelulusan quiz

---

## 📅 Estimasi Timeline

| Phase | Scope | Estimasi |
|-------|-------|----------|
| Phase 1 — Backend | DB migration + 3 endpoint | 1 hari |
| Phase 2 — Bot | Command /materi + state machine | 1 hari |
| Phase 3 — Web Portal | UI peserta + admin panel | 2 hari |
| Phase 4 — Gamifikasi | EXP, progress, analytics | 1-2 hari |
| **Total** | | **5-6 hari** |

---

## 🔗 Keterkaitan dengan Fitur yang Ada

| Fitur | Relasi |
|-------|--------|
| `question_categories` | Foreign key kategori materi |
| Sistem EXP | Trigger EXP saat materi selesai |
| Bot `/quiz` | Rekomendasi belajar materi dulu sebelum quiz |
| Bot `/jadwal_belajar` | Pengingat harian bisa mention materi baru |
| Web participant portal | Tab baru "Materi" di samping Quiz & Tryout |

---

## ✅ Definition of Done

Fitur dianggap selesai jika:
- [ ] Peserta bisa akses materi via bot (`/materi`)
- [ ] Peserta bisa tandai selesai via bot & dapat EXP
- [ ] Admin bisa CRUD materi di web portal
- [ ] Materi tampil di web portal peserta dengan progress
- [ ] Semua tipe (text/video/audio) berfungsi di bot & web
- [ ] Deploy berhasil & tidak ada error di health endpoint
- [ ] Riwayat progress tersimpan per peserta

---

## 📝 Catatan Teknis

- **Teks panjang di bot:** Pecah otomatis per 3800 karakter (margin 300 dari limit 4096)
- **Video:** Prioritaskan YouTube — lebih reliable, Telegram auto-preview
- **Audio:** Jika URL public MP3 < 50MB, gunakan `sendAudio`. Jika lebih besar, kirim sebagai link
- **Order materi:** Gunakan `order_no` integer — admin bisa atur urutan via form
- **Cache kategori:** Reuse fungsi `getActiveCategoryNames` yang sudah ada untuk keyboard bot

---

*Dokumen ini adalah panduan pengembangan. Update seiring progress implementasi.*
