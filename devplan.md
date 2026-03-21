# Dev Plan — Roadmap Belajar per Jabatan (Naik Kelas)

## Objective
Membangun fitur roadmap belajar berbasis **jabatan** dengan struktur:
- Satu jabatan memiliki beberapa kategori.
- Setiap kategori memiliki catatan sendiri.
- Graph kategori dibentuk dari backlink antar catatan kategori.
- Jabatan memiliki graph gabungan dari kategori yang dipilih.

## Data Model (V1)
- `roadmap_positions` (master jabatan roadmap)
- `roadmap_categories` (kategori per jabatan)
- `roadmap_notes` (catatan per kategori)
- `roadmap_graph_cache` (opsional cache graph per kategori/per jabatan)

## Phase

### Phase 1 — Foundation Data & Admin Basic ⏳
- [ ] Tambah tabel roadmap jabatan/kategori/catatan.
- [ ] CRUD admin untuk jabatan.
- [ ] CRUD admin untuk kategori per jabatan.
- [ ] CRUD admin untuk catatan per kategori.
- [ ] Validasi judul catatan unik per kategori.

### Phase 2 — Graph Kategori dari Backlink ⏳
- [ ] Parser backlink `[[Judul Catatan]]` untuk catatan kategori.
- [ ] Generate graph kategori otomatis dari catatan kategori.
- [ ] Endpoint preview graph kategori.
- [ ] UI admin: tombol generate & preview graph kategori.

### Phase 3 — Graph Jabatan (Gabungan Kategori) ⏳
- [ ] Endpoint generate graph jabatan dari kumpulan kategori.
- [ ] Pilihan kategori yang diikutkan (filter/select).
- [ ] UI admin: pilih kategori + preview graph jabatan.

### Phase 4 — Participant Read-Only Experience ⏳
- [ ] Halaman peserta untuk lihat roadmap per jabatan.
- [ ] Toggle lihat graph per kategori vs graph gabungan jabatan.
- [ ] Scope akses sesuai group/role existing.

### Phase 5 — Hardening & UX ⏳
- [ ] Mobile polish untuk editor catatan roadmap.
- [ ] Optimasi performa graph (cache JSON).
- [ ] Error handling parsing backlink (unknown target, duplicate title, dll).
- [ ] QA + regression check agar fitur Catatan Permanen peserta tidak terpengaruh.

## Non-Goals (V1)
- Tidak mengubah fitur Catatan Permanen peserta yang sudah ada.
- Tidak menggabungkan data roadmap dengan catatan personal peserta.

## Success Criteria
- Admin dapat kelola jabatan → kategori → catatan.
- Graph kategori terbentuk dari backlink catatan kategori.
- Graph jabatan terbentuk dari kategori terpilih.
- Peserta dapat melihat roadmap tanpa mengganggu fitur catatan personal.
