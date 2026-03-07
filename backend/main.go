package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/mail"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type Participant struct {
	ID       int       `json:"id"`
	Name     string    `json:"name"`
	Phone    string    `json:"phone"`
	Email    string    `json:"email"`
	JoinedAt time.Time `json:"joinedAt"`
	Source   string    `json:"source"`
}

type createParticipantRequest struct {
	Name   string `json:"name"`
	Phone  string `json:"phone"`
	Email  string `json:"email"`
	Source string `json:"source"`
}

type botMessageRequest struct {
	UserID string `json:"userId"`
	Text   string `json:"text"`
}

type botMessageResponse struct {
	Reply string `json:"reply"`
	State string `json:"state"`
}

type botSession struct {
	State     string
	Name      string
	Phone     string
	UpdatedAt time.Time
}

type telegramUpdate struct {
	UpdateID int `json:"update_id"`
	Message  struct {
		MessageID int `json:"message_id"`
		From      struct {
			ID int64 `json:"id"`
		} `json:"from"`
		Chat struct {
			ID int64 `json:"id"`
		} `json:"chat"`
		Text string `json:"text"`
	} `json:"message"`
}

type app struct {
	db                  *sql.DB
	botSessions         map[string]*botSession
	mu                  sync.Mutex
	telegramBotToken    string
	telegramSecretToken string
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

	a := &app{
		db:                  db,
		botSessions:         map[string]*botSession{},
		telegramBotToken:    strings.TrimSpace(getenv("TELEGRAM_BOT_TOKEN", "")),
		telegramSecretToken: strings.TrimSpace(getenv("TELEGRAM_WEBHOOK_SECRET", "")),
	}

	if err := a.initDB(ctx); err != nil {
		log.Fatalf("init database: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", a.handleHealth)
	mux.HandleFunc("/participants", a.handleParticipants)
	mux.HandleFunc("/participants/check", a.checkParticipantByPhone)
	mux.HandleFunc("/bot/message", a.handleBotMessage)
	mux.HandleFunc("/telegram/webhook", a.handleTelegramWebhook)

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
			email TEXT,
			source TEXT NOT NULL DEFAULT 'bot-naik-kelas',
			joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, _ = a.db.ExecContext(ctx, `ALTER TABLE participants ADD COLUMN IF NOT EXISTS email TEXT`)

	var total int
	if err := a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM participants`).Scan(&total); err != nil {
		return err
	}

	if total == 0 {
		_, err = a.db.ExecContext(ctx, `
			INSERT INTO participants (name, phone, email, source) VALUES
			('Aldi', '0812xxxx1111', 'aldi@example.com', 'bot-naik-kelas'),
			('Rina', '0813xxxx2222', 'rina@example.com', 'bot-naik-kelas'),
			('Bimo', '0821xxxx3333', 'bimo@example.com', 'bot-naik-kelas')
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
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"status": "degraded", "service": "naik-kelas-backend", "db": "down"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "service": "naik-kelas-backend", "db": "up"})
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
		SELECT id, name, phone, email, source, joined_at
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
		if err := rows.Scan(&p.ID, &p.Name, &p.Phone, &p.Email, &p.Source, &p.JoinedAt); err != nil {
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

func (a *app) checkParticipantByPhone(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	phone := normalizePhone(r.URL.Query().Get("phone"))
	if phone == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "phone query is required"})
		return
	}

	p, found, err := a.findParticipantByPhone(r.Context(), phone)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to check participant"})
		return
	}
	if !found {
		writeJSON(w, http.StatusOK, map[string]any{"exists": false})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"exists": true, "item": p})
}

func (a *app) createParticipant(w http.ResponseWriter, r *http.Request) {
	var req createParticipantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json body"})
		return
	}

	p, err := a.createParticipantRecord(r.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, errBadRequest):
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		case errors.Is(err, errConflict):
			writeJSON(w, http.StatusConflict, map[string]any{"error": "phone already registered", "message": "Nomor HP sudah pernah terdaftar"})
		default:
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create participant"})
		}
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"item": p})
}

func (a *app) handleBotMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var req botMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json body"})
		return
	}
	uid := strings.TrimSpace(req.UserID)
	text := strings.TrimSpace(req.Text)
	if uid == "" || text == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "userId and text are required"})
		return
	}

	reply, state := a.processBotText(r.Context(), uid, text)
	writeJSON(w, http.StatusOK, botMessageResponse{Reply: reply, State: state})
}

func (a *app) handleTelegramWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if a.telegramBotToken == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "TELEGRAM_BOT_TOKEN not configured"})
		return
	}
	if a.telegramSecretToken != "" {
		if r.Header.Get("X-Telegram-Bot-Api-Secret-Token") != a.telegramSecretToken {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid secret token"})
			return
		}
	}

	var upd telegramUpdate
	if err := json.NewDecoder(r.Body).Decode(&upd); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid update payload"})
		return
	}

	text := strings.TrimSpace(upd.Message.Text)
	if text == "" || upd.Message.Chat.ID == 0 || upd.Message.From.ID == 0 {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "ignored": true})
		return
	}

	uid := strconv.FormatInt(upd.Message.From.ID, 10)
	reply, _ := a.processBotText(r.Context(), uid, text)
	if strings.TrimSpace(reply) != "" {
		if err := a.sendTelegramMessage(r.Context(), upd.Message.Chat.ID, reply); err != nil {
			log.Printf("telegram send error: %v", err)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) sendTelegramMessage(ctx context.Context, chatID int64, text string) error {
	payload := map[string]any{"chat_id": chatID, "text": text}
	b, _ := json.Marshal(payload)
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", a.telegramBotToken)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("telegram send status %d", resp.StatusCode)
	}
	return nil
}

func (a *app) processBotText(ctx context.Context, uid, text string) (reply, state string) {
	a.mu.Lock()
	s := a.botSessions[uid]
	if s == nil {
		s = &botSession{State: "idle"}
		a.botSessions[uid] = s
	}
	if time.Since(s.UpdatedAt) > 15*time.Minute {
		s.State, s.Name, s.Phone = "idle", "", ""
	}
	a.mu.Unlock()

	lower := strings.ToLower(strings.TrimSpace(text))
	if lower == "/batal" {
		a.resetSession(uid)
		return "Oke, proses pendaftaran dibatalkan dulu ya 🙂\nKapan pun siap, ketik /daftar untuk mulai lagi.", "idle"
	}
	if lower == "/start" {
		a.resetSession(uid)
		return "Selamat datang di Naik Kelas, perkenalkan saya Nala ✨\nAku siap bantu kamu daftar belajar dengan cepat.\n\nKetik /daftar untuk registrasi peserta baru 📚\nKetik /cek untuk cek apakah nomor HP sudah terdaftar ✅", "idle"
	}
	if lower == "/daftar" {
		a.mu.Lock()
		a.botSessions[uid] = &botSession{State: "wait_name", UpdatedAt: time.Now()}
		a.mu.Unlock()
		return "Siap! Kita mulai ya 😊\nSilakan kirim nama lengkap kamu dulu.", "wait_name"
	}
	if lower == "/cek" {
		a.mu.Lock()
		a.botSessions[uid] = &botSession{State: "check_phone", UpdatedAt: time.Now()}
		a.mu.Unlock()
		return "Siap, aku bantu cek ✅\nKirim nomor HP yang ingin dicek ya.", "check_phone"
	}

	a.mu.Lock()
	s = a.botSessions[uid]
	curState := s.State
	a.mu.Unlock()

	switch curState {
	case "wait_name":
		if len([]rune(strings.TrimSpace(text))) < 3 {
			return "Nama lengkapnya minimal 3 karakter ya. Coba kirim lagi 😊", "wait_name"
		}
		a.mu.Lock()
		s.Name = strings.TrimSpace(text)
		s.State = "wait_phone"
		s.UpdatedAt = time.Now()
		a.mu.Unlock()
		return "Terima kasih ✨\nSekarang kirim nomor HP aktif kamu ya (contoh: 0812xxxxxxx).", "wait_phone"

	case "wait_phone":
		phone := normalizePhone(text)
		if len(phone) < 9 {
			return "Nomor HP belum valid nih. Coba kirim lagi ya (contoh: 0812xxxxxxx).", "wait_phone"
		}
		p, found, err := a.findParticipantByPhone(ctx, phone)
		if err != nil {
			return "Maaf, Nala lagi kesulitan terhubung ke server 🙏\nCoba lagi sebentar ya.", "wait_phone"
		}
		if found {
			a.resetSession(uid)
			return "Nomor HP ini sudah pernah terdaftar ✅\nNama: " + p.Name + "\nEmail: " + p.Email + "\n\nKalau mau cek lagi, ketik /cek ya.", "idle"
		}
		a.mu.Lock()
		s.Phone = phone
		s.State = "wait_email"
		s.UpdatedAt = time.Now()
		a.mu.Unlock()
		return "Oke, lanjut ya 📚\nSekarang kirim email aktif kamu.", "wait_email"

	case "wait_email":
		email := strings.TrimSpace(strings.ToLower(text))
		if _, err := mail.ParseAddress(email); err != nil {
			return "Emailnya belum valid nih 🙏\nCoba kirim lagi dengan format benar ya. Contoh: nama@email.com", "wait_email"
		}
		a.mu.Lock()
		name := s.Name
		phone := s.Phone
		a.mu.Unlock()
		_, err := a.createParticipantRecord(ctx, createParticipantRequest{Name: name, Phone: phone, Email: email, Source: "bot-naik-kelas"})
		if err != nil {
			if errors.Is(err, errConflict) {
				a.resetSession(uid)
				return "Nomor HP ini sudah pernah terdaftar ✅", "idle"
			}
			return "Maaf, Nala lagi kesulitan menyimpan data 🙏\nCoba lagi sebentar ya.", "wait_email"
		}
		a.resetSession(uid)
		return "Yeay! 🎉 Pendaftaran kamu berhasil.\nSemangat belajar bareng Naik Kelas ya ✨📚", "idle"

	case "check_phone":
		phone := normalizePhone(text)
		if len(phone) < 9 {
			return "Nomor HP belum valid. Coba kirim lagi ya.", "check_phone"
		}
		p, found, err := a.findParticipantByPhone(ctx, phone)
		if err != nil {
			return "Maaf, Nala lagi kesulitan terhubung ke server 🙏\nCoba lagi sebentar ya.", "check_phone"
		}
		a.resetSession(uid)
		if found {
			return "Nomor ini sudah terdaftar ✅\nNama: " + p.Name + "\nEmail: " + p.Email, "idle"
		}
		return "Nomor ini belum terdaftar ya.\nYuk lanjut daftar dengan ketik /daftar ✨", "idle"

	default:
		return "Halo! Saya Nala ✨\nKetik /start untuk mulai, /daftar untuk registrasi, atau /cek untuk cek pendaftaran.", "idle"
	}
}

var (
	errBadRequest = errors.New("bad request")
	errConflict   = errors.New("conflict")
)

func (a *app) createParticipantRecord(ctx context.Context, req createParticipantRequest) (Participant, error) {
	req.Name = strings.TrimSpace(req.Name)
	req.Phone = normalizePhone(req.Phone)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Source == "" {
		req.Source = "bot-naik-kelas"
	}

	if req.Name == "" || req.Phone == "" || req.Email == "" {
		return Participant{}, errors.Join(errBadRequest, errors.New("name, phone, and email are required"))
	}
	if _, err := mail.ParseAddress(req.Email); err != nil {
		return Participant{}, errors.Join(errBadRequest, errors.New("invalid email"))
	}

	_, found, err := a.findParticipantByPhone(ctx, req.Phone)
	if err != nil {
		return Participant{}, err
	}
	if found {
		return Participant{}, errConflict
	}

	var p Participant
	err = a.db.QueryRowContext(ctx, `
		INSERT INTO participants (name, phone, email, source)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, phone, email, source, joined_at
	`, req.Name, req.Phone, req.Email, req.Source).Scan(&p.ID, &p.Name, &p.Phone, &p.Email, &p.Source, &p.JoinedAt)
	if err != nil {
		return Participant{}, err
	}
	return p, nil
}

func (a *app) findParticipantByPhone(ctx context.Context, phone string) (Participant, bool, error) {
	var p Participant
	err := a.db.QueryRowContext(ctx, `
		SELECT id, name, phone, email, source, joined_at
		FROM participants
		WHERE phone = $1
		LIMIT 1
	`, phone).Scan(&p.ID, &p.Name, &p.Phone, &p.Email, &p.Source, &p.JoinedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Participant{}, false, nil
		}
		return Participant{}, false, err
	}
	return p, true, nil
}

func (a *app) resetSession(uid string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.botSessions[uid] = &botSession{State: "idle", UpdatedAt: time.Now()}
}

func normalizePhone(v string) string {
	v = strings.TrimSpace(v)
	replacer := strings.NewReplacer(" ", "", "-", "", "(", "", ")", "")
	return replacer.Replace(v)
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
