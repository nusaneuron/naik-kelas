# Naik Kelas

Aplikasi sederhana untuk menampilkan **list peserta** yang bergabung dari pendaftaran di bot Naik Kelas.

## Stack
- Frontend: Next.js 14 (App Router)
- Backend: Go (net/http)
- Database: PostgreSQL

## Struktur
- `frontend` — UI daftar peserta
- `backend` — API peserta (`/health`, `/participants`)
- `deploy` — konfigurasi nginx + supervisor

## Environment Variables

### Backend
- `DATABASE_URL` (wajib)
  - Contoh EasyPanel:
    `postgres://admin:admin123@website_db-naik-kelas:5432/db-naik-kelas?sslmode=disable`
- `PORT` (opsional, default `8080`)
- `TELEGRAM_BOT_TOKEN` (opsional, untuk webhook Telegram)
- `TELEGRAM_WEBHOOK_SECRET` (opsional tapi direkomendasikan)
- `ADMIN_BOOTSTRAP_TOKEN` (opsional, untuk bootstrap akun admin via API)

### Frontend
- `NEXT_PUBLIC_API_BASE_URL` (opsional)
  - default: `/api`

## Endpoint API
- `GET /health`
- `GET /participants`
- `GET /participants/check?phone=0812xxxx`
- `POST /participants`
- `POST /bot/message` (flow chat Nala: /start, /daftar, /cek, /quiz, /tryout, /leaderbot, /batal)
  - `/quiz`: hanya untuk user yang sudah daftar; pilih kategori dulu, lalu jawab semua soal; cek hasil di akhir ronde
    - tersimpan: kategori, jumlah salah, status lulus, dan percobaan ke-berapa per kategori
  - `/tryout`: hanya untuk user yang sudah daftar; soal acak dari bank quiz, dinilai di akhir; hasil disimpan untuk leaderboard
    - tersimpan: durasi (detik) dan kecepatan (`speed_qpm`)
  - `/leaderbot`: ranking peserta dengan skor sempurna tercepat
- `POST /telegram/webhook` (endpoint webhook Telegram)
  - otomatis sinkron Telegram user ke akun web participant berdasarkan nomor HP pendaftaran
- `POST /admin/bootstrap` (bootstrap/promote akun admin; butuh header `X-Admin-Bootstrap-Token`)
  - body JSON:
    ```json
    {
      "name": "Nama Admin",
      "phone": "0812xxxx",
      "password": "opsional-default-dibuatkan"
    }
    ```
- `POST /auth/login` (login no HP + password)
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`
- `GET /participant/me` (role participant/admin)
- `GET /participant/history` (role participant/admin)
- `GET /participant/leaderboard` (role participant/admin)
- `GET /admin/ping` (role admin)
- `GET /admin/participants` (role admin)
- `POST /admin/participants/reset-password` (role admin)
- `POST /admin/participants/toggle-active` (role admin)
- `GET|POST /admin/categories` (role admin; action create/update/delete)
- `GET|POST /admin/questions` (role admin; action create/update/delete)

Security hardening (phase 5):
- Login rate limit: lock sementara 3 menit setelah 5 gagal login beruntun per no HP.
- Admin audit log tercatat di tabel `admin_audit_logs` untuk aksi admin utama.

## Jalankan lokal

### 1) Backend
```bash
cd backend
export DATABASE_URL='postgres://admin:admin123@localhost:5432/db-naik-kelas?sslmode=disable'
go run .
```

Catatan default password peserta migrasi:
- format: `NK-<4 digit akhir no HP>!`
- user diminta ganti password saat first login (`must_change_password=true`).

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```

## Deploy ke EasyPanel
Repo sudah menyediakan:
- `Dockerfile`
- `dockerfile`

Set environment variable di service:
- `DATABASE_URL=postgres://admin:admin123@website_db-naik-kelas:5432/db-naik-kelas?sslmode=disable`
- `TELEGRAM_BOT_TOKEN=<token-bot-telegram>`
- `TELEGRAM_WEBHOOK_SECRET=<secret-random>`

### Set webhook Telegram (setelah deploy)
Gunakan terminal lokal Anda:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<domain-aplikasi>/api/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message"]
  }'
```
