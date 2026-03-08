package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/rand"
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
	State           string
	Name            string
	Phone           string
	QuizCategory    string
	QuizIndex       int
	QuizAnswers     []string
	TryoutQuestions []quizQuestion
	TryoutAnswers   []string
	TryoutStartedAt time.Time
	DisplayName     string
	UpdatedAt       time.Time
}

type quizQuestion struct {
	Question string
	Options  []string
	Answer   string
}

type quizCategory struct {
	Code  string
	Name  string
	Items []quizQuestion
}

var quizCategories = []quizCategory{
	{
		Code: "umum",
		Name: "Pengetahuan Umum",
		Items: []quizQuestion{
			{Question: "1) Ibu kota Indonesia adalah...", Options: []string{"A. Bandung", "B. Jakarta", "C. Surabaya", "D. Medan"}, Answer: "B"},
			{Question: "2) Planet yang kita tinggali adalah...", Options: []string{"A. Mars", "B. Venus", "C. Saturnus", "D. Bumi"}, Answer: "D"},
			{Question: "3) Bahasa resmi negara Indonesia adalah...", Options: []string{"A. Melayu", "B. Indonesia", "C. Jawa", "D. Inggris"}, Answer: "B"},
		},
	},
	{
		Code: "matematika",
		Name: "Matematika Dasar",
		Items: []quizQuestion{
			{Question: "1) 5 + 7 = ...", Options: []string{"A. 10", "B. 11", "C. 12", "D. 13"}, Answer: "C"},
			{Question: "2) 9 x 3 = ...", Options: []string{"A. 27", "B. 21", "C. 18", "D. 24"}, Answer: "A"},
			{Question: "3) 20 - 8 = ...", Options: []string{"A. 10", "B. 11", "C. 12", "D. 13"}, Answer: "C"},
		},
	},
}

type telegramUpdate struct {
	UpdateID int `json:"update_id"`
	Message  struct {
		MessageID int `json:"message_id"`
		From      struct {
			ID        int64  `json:"id"`
			FirstName string `json:"first_name"`
			Username  string `json:"username"`
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

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS tryout_results (
			id SERIAL PRIMARY KEY,
			user_id TEXT NOT NULL,
			display_name TEXT NOT NULL DEFAULT '',
			total_questions INT NOT NULL,
			correct_count INT NOT NULL,
			all_correct BOOLEAN NOT NULL,
			duration_seconds INT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS bot_profiles (
			user_id TEXT PRIMARY KEY,
			registered_name TEXT NOT NULL,
			telegram_display TEXT NOT NULL DEFAULT '',
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
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

	reply, state := a.processBotText(r.Context(), uid, uid, text)
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
	firstName := strings.TrimSpace(upd.Message.From.FirstName)
	username := strings.TrimSpace(upd.Message.From.Username)
	displayName := ""
	if firstName != "" && username != "" {
		displayName = firstName + " (@" + username + ")"
	} else if username != "" {
		displayName = "@" + username
	} else if firstName != "" {
		displayName = firstName
	} else {
		displayName = uid
	}
	reply, state := a.processBotText(r.Context(), uid, displayName, text)
	if strings.TrimSpace(reply) != "" {
		if err := a.sendTelegramMessage(r.Context(), upd.Message.Chat.ID, reply, state); err != nil {
			log.Printf("telegram send error: %v", err)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) sendTelegramMessage(ctx context.Context, chatID int64, text, state string) error {
	payload := map[string]any{"chat_id": chatID, "text": text}

	if state == "quiz_answering" || state == "tryout_answering" {
		payload["reply_markup"] = map[string]any{
			"keyboard":          [][]string{{"A", "B", "C", "D"}},
			"resize_keyboard":   true,
			"one_time_keyboard": false,
		}
	} else if state == "quiz_choose_category" {
		rows := make([][]string, 0, len(quizCategories))
		for _, c := range quizCategories {
			rows = append(rows, []string{c.Name})
		}
		payload["reply_markup"] = map[string]any{
			"keyboard":          rows,
			"resize_keyboard":   true,
			"one_time_keyboard": false,
		}
	} else {
		payload["reply_markup"] = map[string]any{
			"remove_keyboard": true,
		}
	}

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

func (a *app) processBotText(ctx context.Context, uid, displayName, text string) (reply, state string) {
	a.mu.Lock()
	s := a.botSessions[uid]
	if s == nil {
		s = &botSession{State: "idle"}
		a.botSessions[uid] = s
	}
	if time.Since(s.UpdatedAt) > 15*time.Minute {
		s.State, s.Name, s.Phone, s.QuizCategory, s.QuizIndex, s.QuizAnswers, s.TryoutQuestions, s.TryoutAnswers = "idle", "", "", "", 0, nil, nil, nil
		s.TryoutStartedAt = time.Time{}
	}
	a.mu.Unlock()

	lower := strings.ToLower(strings.TrimSpace(text))
	if lower == "/batal" {
		a.resetSession(uid)
		return "Oke, proses dibatalkan dulu ya 🙂\nKapan pun siap, ketik /daftar, /quiz, atau /tryout untuk mulai lagi.", "idle"
	}
	if lower == "/start" {
		a.resetSession(uid)
		return "Selamat datang di Naik Kelas, perkenalkan saya Nala ✨\nAku siap bantu kamu daftar belajar dengan cepat.\n\nKetik /daftar untuk registrasi peserta baru 📚\nKetik /cek untuk cek apakah nomor HP sudah terdaftar ✅\nKetik /quiz untuk latihan per kategori 🧠\nKetik /tryout untuk simulasi soal acak 🚀\nKetik /leaderbot untuk lihat ranking tryout 🏆", "idle"
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
	if lower == "/quiz" {
		registered, err := a.isRegisteredBotUser(ctx, uid)
		if err != nil {
			return "Maaf, Nala lagi kesulitan cek data pendaftaran 🙏\nCoba lagi sebentar ya.", "idle"
		}
		if !registered {
			return "Sebelum ikut quiz, kamu perlu daftar dulu ya ✨\nKetik /daftar untuk registrasi dulu.", "idle"
		}
		a.mu.Lock()
		a.botSessions[uid] = &botSession{State: "quiz_choose_category", QuizIndex: 0, QuizAnswers: []string{}, UpdatedAt: time.Now()}
		a.mu.Unlock()
		return "Siap, kita mulai quiz Naik Kelas! 🔥\nPilih dulu kategori quiz yang kamu mau:\n\n" + formatQuizCategories(), "quiz_choose_category"
	}
	if lower == "/tryout" {
		registered, err := a.isRegisteredBotUser(ctx, uid)
		if err != nil {
			return "Maaf, Nala lagi kesulitan cek data pendaftaran 🙏\nCoba lagi sebentar ya.", "idle"
		}
		if !registered {
			return "Sebelum ikut tryout, kamu perlu daftar dulu ya ✨\nKetik /daftar untuk registrasi dulu.", "idle"
		}
		qs := shuffledTryoutQuestions()
		a.mu.Lock()
		a.botSessions[uid] = &botSession{State: "tryout_answering", TryoutQuestions: qs, TryoutAnswers: []string{}, TryoutStartedAt: time.Now(), DisplayName: displayName, UpdatedAt: time.Now()}
		a.mu.Unlock()
		return "Mode TRYOUT dimulai! 🚀\nJawab semua soal dulu, nanti Nala cek di akhir.\nKalau ada salah, kamu bisa coba lagi dari awal.\n\n" + formatTryoutQuestion(qs, 0), "tryout_answering"
	}
	if lower == "/leaderbot" || lower == "/leaderboard" {
		board, err := a.getTryoutLeaderboard(ctx, 10)
		if err != nil {
			return "Maaf, Nala belum bisa ambil leaderboard saat ini 🙏", "idle"
		}
		if board == "" {
			return "Leaderboard masih kosong. Yuk mulai dulu dengan /tryout 🔥", "idle"
		}
		return board, "idle"
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
			_ = a.saveBotProfile(ctx, uid, p.Name, displayName)
			a.resetSession(uid)
			return "Nomor HP ini sudah pernah terdaftar ✅\nNama: " + p.Name + "\nEmail: " + p.Email + "\n\nAkun Telegram kamu sudah saya sinkronkan ke data pendaftaran. Kalau mau cek lagi, ketik /cek ya.", "idle"
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
		_ = a.saveBotProfile(ctx, uid, name, displayName)
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

	case "quiz_choose_category":
		cat, ok := findQuizCategory(text)
		if !ok {
			return "Kategori belum dikenali 🙏\nSilakan pilih salah satu kategori berikut:\n\n" + formatQuizCategories(), "quiz_choose_category"
		}
		a.mu.Lock()
		s.QuizCategory = cat.Code
		s.State = "quiz_answering"
		s.QuizIndex = 0
		s.QuizAnswers = []string{}
		s.UpdatedAt = time.Now()
		a.mu.Unlock()
		return "Kategori dipilih: " + cat.Name + " ✅\nJawab semua soal dulu ya. Nanti Nala cek di akhir.\n\n" + formatQuizQuestion(cat, 0), "quiz_answering"

	case "quiz_answering":
		ans := normalizeQuizAnswer(text)
		if ans == "" {
			return "Jawab dengan A, B, C, atau D ya ✍️", "quiz_answering"
		}
		cat, ok := findQuizCategory(s.QuizCategory)
		if !ok {
			a.resetSession(uid)
			return "Kategori quiz tidak ditemukan. Ketik /quiz untuk mulai lagi ya.", "idle"
		}
		a.mu.Lock()
		s.QuizAnswers = append(s.QuizAnswers, ans)
		s.QuizIndex++
		s.UpdatedAt = time.Now()
		next := s.QuizIndex
		answers := append([]string(nil), s.QuizAnswers...)
		a.mu.Unlock()

		if next < len(cat.Items) {
			return formatQuizQuestion(cat, next), "quiz_answering"
		}

		wrong := 0
		for i, q := range cat.Items {
			if i >= len(answers) || answers[i] != q.Answer {
				wrong++
			}
		}
		if wrong == 0 {
			a.resetSession(uid)
			return "Luar biasa! 🎉 Semua jawaban kamu benar!\nKamu berhasil menuntaskan quiz kategori " + cat.Name + ".", "idle"
		}

		a.mu.Lock()
		s.State = "quiz_answering"
		s.QuizIndex = 0
		s.QuizAnswers = []string{}
		s.UpdatedAt = time.Now()
		a.mu.Unlock()
		return fmt.Sprintf("Semangat! Kamu masih punya %d jawaban yang belum tepat di kategori %s. Kita ulang dari awal ya 🔁\n\n%s", wrong, cat.Name, formatQuizQuestion(cat, 0)), "quiz_answering"

	case "tryout_answering":
		ans := normalizeQuizAnswer(text)
		if ans == "" {
			return "Jawab dengan A, B, C, atau D ya ✍️", "tryout_answering"
		}
		if len(s.TryoutQuestions) == 0 {
			a.resetSession(uid)
			return "Soal tryout belum tersedia. Coba /tryout lagi ya.", "idle"
		}

		a.mu.Lock()
		s.TryoutAnswers = append(s.TryoutAnswers, ans)
		s.QuizIndex++
		s.UpdatedAt = time.Now()
		next := s.QuizIndex
		answers := append([]string(nil), s.TryoutAnswers...)
		questions := append([]quizQuestion(nil), s.TryoutQuestions...)
		startedAt := s.TryoutStartedAt
		dname := s.DisplayName
		a.mu.Unlock()

		if next < len(questions) {
			return formatTryoutQuestion(questions, next), "tryout_answering"
		}

		correct := 0
		for i, q := range questions {
			if i < len(answers) && answers[i] == q.Answer {
				correct++
			}
		}
		dur := int(time.Since(startedAt).Seconds())
		if dur < 1 {
			dur = 1
		}
		allCorrect := correct == len(questions)
		_ = a.saveTryoutResult(ctx, uid, dname, len(questions), correct, allCorrect, dur)

		if allCorrect {
			a.resetSession(uid)
			return fmt.Sprintf("Tryout selesai! 🏁\nSkor: %d/%d (sempurna)\nWaktu: %d detik\n\nCek ranking dengan /leaderbot 🏆", correct, len(questions), dur), "idle"
		}

		a.resetSession(uid)
		return fmt.Sprintf("Tryout selesai!\nSkor kamu: %d/%d\nWaktu: %d detik\nBelum sempurna, yuk coba lagi dengan /tryout 🔁", correct, len(questions), dur), "idle"

	default:
		return "Halo! Saya Nala ✨\nKetik /start untuk mulai, /daftar untuk registrasi, /cek untuk cek pendaftaran, /quiz untuk latihan kategori, atau /tryout untuk simulasi acak.", "idle"
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

func (a *app) saveTryoutResult(ctx context.Context, userID, displayName string, total, correct int, allCorrect bool, durationSec int) error {
	if strings.TrimSpace(displayName) == "" {
		displayName = userID
	}
	_, err := a.db.ExecContext(ctx, `
		INSERT INTO tryout_results (user_id, display_name, total_questions, correct_count, all_correct, duration_seconds)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, userID, displayName, total, correct, allCorrect, durationSec)
	return err
}

func (a *app) saveBotProfile(ctx context.Context, userID, registeredName, telegramDisplay string) error {
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(registeredName) == "" {
		return nil
	}
	_, err := a.db.ExecContext(ctx, `
		INSERT INTO bot_profiles (user_id, registered_name, telegram_display, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (user_id)
		DO UPDATE SET
			registered_name = EXCLUDED.registered_name,
			telegram_display = EXCLUDED.telegram_display,
			updated_at = NOW()
	`, userID, registeredName, telegramDisplay)
	return err
}

func (a *app) isRegisteredBotUser(ctx context.Context, userID string) (bool, error) {
	var exists bool
	err := a.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM bot_profiles WHERE user_id = $1)`, userID).Scan(&exists)
	return exists, err
}

func (a *app) getTryoutLeaderboard(ctx context.Context, limit int) (string, error) {
	rows, err := a.db.QueryContext(ctx, `
		SELECT tr.user_id,
		       COALESCE(NULLIF(bp.registered_name, ''), NULLIF(tr.display_name, ''), tr.user_id) as name,
		       COALESCE(NULLIF(bp.telegram_display, ''), tr.user_id) as tg,
		       MIN(tr.duration_seconds) as best_seconds,
		       COUNT(*) FILTER (WHERE tr.all_correct) as perfect_count
		FROM tryout_results tr
		LEFT JOIN bot_profiles bp ON bp.user_id = tr.user_id
		WHERE tr.all_correct = TRUE
		GROUP BY tr.user_id, name, tg
		ORDER BY best_seconds ASC, perfect_count DESC, name ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	lines := []string{"🏆 Leaderbot Tryout (Perfect Score)", ""}
	rank := 1
	for rows.Next() {
		var userID, name, tg string
		var bestSec, perfectCount int
		if err := rows.Scan(&userID, &name, &tg, &bestSec, &perfectCount); err != nil {
			return "", err
		}
		_ = tg
		lines = append(lines, fmt.Sprintf("%d. %s — %ds (perfect: %dx)", rank, name, bestSec, perfectCount))
		rank++
	}
	if err := rows.Err(); err != nil {
		return "", err
	}
	if rank == 1 {
		return "", nil
	}
	return strings.Join(lines, "\n"), nil
}

func (a *app) resetSession(uid string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.botSessions[uid] = &botSession{State: "idle", UpdatedAt: time.Now()}
}

func shuffledTryoutQuestions() []quizQuestion {
	all := make([]quizQuestion, 0)
	for _, c := range quizCategories {
		all = append(all, c.Items...)
	}
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	r.Shuffle(len(all), func(i, j int) { all[i], all[j] = all[j], all[i] })
	return all
}

func formatTryoutQuestion(items []quizQuestion, index int) string {
	if index < 0 || index >= len(items) {
		return "Soal tryout tidak ditemukan."
	}
	q := items[index]
	return fmt.Sprintf("[Tryout] Soal %d/%d\n%s\n%s\n\nBalas dengan: A / B / C / D", index+1, len(items), q.Question, strings.Join(q.Options, "\n"))
}

func formatQuizQuestion(cat quizCategory, index int) string {
	if index < 0 || index >= len(cat.Items) {
		return "Soal tidak ditemukan."
	}
	q := cat.Items[index]
	return "[" + cat.Name + "]\n" + q.Question + "\n" + strings.Join(q.Options, "\n") + "\n\nBalas dengan: A / B / C / D"
}

func formatQuizCategories() string {
	lines := make([]string, 0, len(quizCategories))
	for _, c := range quizCategories {
		lines = append(lines, "- "+c.Name+" ("+c.Code+")")
	}
	return strings.Join(lines, "\n") + "\n\nKirim nama kategori atau kode dalam kurung."
}

func findQuizCategory(input string) (quizCategory, bool) {
	s := strings.ToLower(strings.TrimSpace(input))
	for _, c := range quizCategories {
		if s == strings.ToLower(c.Code) || s == strings.ToLower(c.Name) {
			return c, true
		}
	}
	return quizCategory{}, false
}

func normalizeQuizAnswer(v string) string {
	v = strings.ToUpper(strings.TrimSpace(v))
	if len(v) == 0 {
		return ""
	}
	if len(v) > 1 {
		v = string([]rune(v)[0])
	}
	switch v {
	case "A", "B", "C", "D":
		return v
	default:
		return ""
	}
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
