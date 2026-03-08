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
  - body JSON:
    ```json
    {
      "name": "Nama Lengkap",
      "phone": "0812xxxx",
      "email": "email@contoh.com",
      "source": "bot-naik-kelas"
    }
    ```
  - validasi:
    - wajib `name`, `phone`, `email`
    - cek format email
    - cek duplikasi `phone` (kalau sudah ada → 409 Conflict)

## Jalankan lokal

### 1) Backend
```bash
cd backend
export DATABASE_URL='postgres://admin:admin123@localhost:5432/db-naik-kelas?sslmode=disable'
go run .
```

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
