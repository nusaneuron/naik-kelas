package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type Participant struct {
	ID       int       `json:"id"`
	Name     string    `json:"name"`
	Phone    string    `json:"phone"`
	JoinedAt time.Time `json:"joinedAt"`
	Source   string    `json:"source"`
}

type createParticipantRequest struct {
	Name   string `json:"name"`
	Phone  string `json:"phone"`
	Source string `json:"source"`
}

type app struct {
	db *sql.DB
}

func main() {
	ctx := context.Background()
	databaseURL := getenv("DATABASE_URL", "")

	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("ping database: %v", err)
	}

	a := &app{db: db}
	if err := a.initDB(ctx); err != nil {
		log.Fatalf("init database: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", a.handleHealth)
	mux.HandleFunc("/participants", a.handleParticipants)

	port := getenv("PORT", "8080")
	addr := ":" + port

	handler := withCORS(mux)
	log.Printf("Naik Kelas backend listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, handler))
}

func (a *app) initDB(ctx context.Context) error {
	_, err := a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS participants (
			id SERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			phone TEXT NOT NULL,
			source TEXT NOT NULL DEFAULT 'bot-naik-kelas',
			joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	var total int
	if err := a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM participants`).Scan(&total); err != nil {
		return err
	}

	if total == 0 {
		_, err = a.db.ExecContext(ctx, `
			INSERT INTO participants (name, phone, source) VALUES
			('Aldi', '0812xxxx1111', 'bot-naik-kelas'),
			('Rina', '0813xxxx2222', 'bot-naik-kelas'),
			('Bimo', '0821xxxx3333', 'bot-naik-kelas')
		`)
		if err != nil {
			return err
		}
	}

	return nil
}

func (a *app) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	if err := a.db.PingContext(ctx); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status":  "degraded",
			"service": "naik-kelas-backend",
			"db":      "down",
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"service": "naik-kelas-backend",
		"db":      "up",
	})
}

func (a *app) handleParticipants(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.listParticipants(w, r)
	case http.MethodPost:
		a.createParticipant(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func (a *app) listParticipants(w http.ResponseWriter, r *http.Request) {
	rows, err := a.db.QueryContext(r.Context(), `
		SELECT id, name, phone, source, joined_at
		FROM participants
		ORDER BY joined_at DESC, id DESC
	`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to query participants"})
		return
	}
	defer rows.Close()

	items := make([]Participant, 0)
	for rows.Next() {
		var p Participant
		if err := rows.Scan(&p.ID, &p.Name, &p.Phone, &p.Source, &p.JoinedAt); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to scan participant"})
			return
		}
		items = append(items, p)
	}

	if err := rows.Err(); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to read rows"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
}

func (a *app) createParticipant(w http.ResponseWriter, r *http.Request) {
	var req createParticipantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json body"})
		return
	}

	if req.Name == "" || req.Phone == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name and phone are required"})
		return
	}

	if req.Source == "" {
		req.Source = "bot-naik-kelas"
	}

	var p Participant
	err := a.db.QueryRowContext(r.Context(), `
		INSERT INTO participants (name, phone, source)
		VALUES ($1, $2, $3)
		RETURNING id, name, phone, source, joined_at
	`, req.Name, req.Phone, req.Source).Scan(&p.ID, &p.Name, &p.Phone, &p.Source, &p.JoinedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create participant"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create participant"})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"item": p})
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
