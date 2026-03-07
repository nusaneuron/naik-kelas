# ---------- Build Next.js ----------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---------- Build Go API ----------
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod ./
COPY backend/main.go ./
RUN go build -o /out/backend-app .

# ---------- Runtime (single container) ----------
FROM node:20-alpine
RUN apk add --no-cache nginx supervisor

WORKDIR /app

# Next standalone output
COPY --from=frontend-builder /app/frontend/.next/standalone /app/frontend/
COPY --from=frontend-builder /app/frontend/.next/static /app/frontend/.next/static

# Go binary
COPY --from=backend-builder /out/backend-app /app/backend-app

# Nginx + Supervisor config
COPY deploy/nginx.conf /etc/nginx/http.d/default.conf
COPY deploy/supervisord.conf /etc/supervisord.conf

EXPOSE 80
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
