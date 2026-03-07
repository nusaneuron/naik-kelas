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

### Frontend
- `NEXT_PUBLIC_API_BASE_URL` (opsional)
  - default: `/api`

## Endpoint API
- `GET /health`
- `GET /participants`
- `POST /participants`
  - body JSON:
    ```json
    {
      "name": "Nama Peserta",
      "phone": "0812xxxx",
      "source": "bot-naik-kelas"
    }
    ```

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
