# Naik Kelas

Aplikasi sederhana untuk menampilkan **list peserta** yang bergabung dari pendaftaran di bot Naik Kelas.

## Stack
- Frontend: Next.js 14 (App Router)
- Backend: Go (net/http)

## Struktur
- `frontend` — UI daftar peserta
- `backend` — API peserta (`/health`, `/participants`)

## Jalankan lokal

### 1) Backend
```bash
cd backend
go run .
```
Backend berjalan di `http://localhost:8080`.

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend berjalan di `http://localhost:3000`.

Secara default frontend memanggil API ke `http://localhost:8080`.

## Endpoint API
- `GET /health`
- `GET /participants`
