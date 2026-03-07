package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

type Participant struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone"`
	JoinedAt  time.Time `json:"joinedAt"`
	Source    string    `json:"source"`
}

func main() {
	participants := []Participant{
		{ID: 1, Name: "Aldi", Phone: "0812xxxx1111", JoinedAt: time.Now().Add(-48 * time.Hour), Source: "bot-naik-kelas"},
		{ID: 2, Name: "Rina", Phone: "0813xxxx2222", JoinedAt: time.Now().Add(-24 * time.Hour), Source: "bot-naik-kelas"},
		{ID: 3, Name: "Bimo", Phone: "0821xxxx3333", JoinedAt: time.Now().Add(-2 * time.Hour), Source: "bot-naik-kelas"},
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "naik-kelas-backend"})
	})

	mux.HandleFunc("/participants", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": participants, "total": len(participants)})
	})

	port := getenv("PORT", "8080")
	addr := ":" + port

	handler := withCORS(mux)
	log.Printf("Naik Kelas backend listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, handler))
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
