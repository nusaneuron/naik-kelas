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
	"golang.org/x/crypto/bcrypt"
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
	adminBootstrapToken string
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
		adminBootstrapToken: strings.TrimSpace(getenv("ADMIN_BOOTSTRAP_TOKEN", "")),
	}

	if err := a.initDB(ctx); err != nil {
		log.Fatalf("init database: %v", err)
	}

	go a.startReminderScheduler(context.Background())

	mux := http.NewServeMux()
	mux.HandleFunc("/health", a.handleHealth)
	mux.HandleFunc("/participants", a.handleParticipants)
	mux.HandleFunc("/participants/check", a.checkParticipantByPhone)
	mux.HandleFunc("/bot/message", a.handleBotMessage)
	mux.HandleFunc("/telegram/webhook", a.handleTelegramWebhook)
	mux.HandleFunc("/admin/bootstrap", a.handleAdminBootstrap)
	mux.HandleFunc("/auth/login", a.handleAuthLogin)
	mux.HandleFunc("/auth/logout", a.handleAuthLogout)
	mux.HandleFunc("/auth/me", a.handleAuthMe)
	mux.HandleFunc("/auth/change-password", a.handleAuthChangePassword)
	mux.HandleFunc("/participant/me", a.handleParticipantMe)
	mux.HandleFunc("/participant/history", a.handleParticipantHistory)
	mux.HandleFunc("/participant/leaderboard", a.handleParticipantLeaderboard)
	mux.HandleFunc("/admin/ping", a.handleAdminPing)
	mux.HandleFunc("/admin/participants", a.handleAdminParticipants)
	mux.HandleFunc("/admin/participants/reset-password", a.handleAdminResetPassword)
	mux.HandleFunc("/admin/participants/toggle-active", a.handleAdminToggleActive)
	mux.HandleFunc("/admin/categories", a.handleAdminCategories)
	mux.HandleFunc("/admin/questions", a.handleAdminQuestions)

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
			speed_qpm NUMERIC(10,2) NOT NULL DEFAULT 0,
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

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS quiz_attempts (
			id SERIAL PRIMARY KEY,
			user_id TEXT NOT NULL,
			display_name TEXT NOT NULL DEFAULT '',
			category_code TEXT NOT NULL,
			category_name TEXT NOT NULL,
			attempt_no INT NOT NULL,
			total_questions INT NOT NULL,
			wrong_count INT NOT NULL,
			all_correct BOOLEAN NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, _ = a.db.ExecContext(ctx, `ALTER TABLE tryout_results ADD COLUMN IF NOT EXISTS speed_qpm NUMERIC(10,2) NOT NULL DEFAULT 0`)

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS users (
			id BIGSERIAL PRIMARY KEY,
			phone TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'participant',
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS participant_profiles (
			user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			email TEXT,
			source TEXT NOT NULL DEFAULT 'bot-naik-kelas',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS user_sessions (
			token TEXT PRIMARY KEY,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			expires_at TIMESTAMPTZ NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS telegram_links (
			telegram_user_id TEXT PRIMARY KEY,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			telegram_display TEXT NOT NULL DEFAULT '',
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS study_reminders (
			telegram_user_id TEXT PRIMARY KEY,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			time_of_day TEXT NOT NULL,
			timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			last_sent_at TIMESTAMPTZ,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS auth_login_attempts (
			phone TEXT PRIMARY KEY,
			failed_count INT NOT NULL DEFAULT 0,
			locked_until TIMESTAMPTZ,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS admin_audit_logs (
			id BIGSERIAL PRIMARY KEY,
			admin_user_id BIGINT NOT NULL,
			action TEXT NOT NULL,
			target TEXT NOT NULL DEFAULT '',
			detail JSONB,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS question_categories (
			id BIGSERIAL PRIMARY KEY,
			code TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS questions (
			id BIGSERIAL PRIMARY KEY,
			category_id BIGINT NOT NULL REFERENCES question_categories(id) ON DELETE CASCADE,
			question_text TEXT NOT NULL,
			option_a TEXT NOT NULL,
			option_b TEXT NOT NULL,
			option_c TEXT NOT NULL,
			option_d TEXT NOT NULL,
			correct_option TEXT NOT NULL,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	if err := a.seedQuestionBankIfEmpty(ctx); err != nil {
		return err
	}

	if err := a.migrateParticipantsToUsers(ctx); err != nil {
		return err
	}

	return nil
}

func (a *app) seedQuestionBankIfEmpty(ctx context.Context) error {
	var total int
	if err := a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM question_categories`).Scan(&total); err != nil {
		return err
	}
	if total > 0 {
		return nil
	}
	for _, c := range quizCategories {
		var cid int64
		if err := a.db.QueryRowContext(ctx, `INSERT INTO question_categories(code,name,is_active) VALUES($1,$2,TRUE) RETURNING id`, strings.ToLower(strings.TrimSpace(c.Code)), c.Name).Scan(&cid); err != nil {
			return err
		}
		for _, q := range c.Items {
			if len(q.Options) < 4 {
				continue
			}
			oA := strings.TrimPrefix(q.Options[0], "A. ")
			oB := strings.TrimPrefix(q.Options[1], "B. ")
			oC := strings.TrimPrefix(q.Options[2], "C. ")
			oD := strings.TrimPrefix(q.Options[3], "D. ")
			questionText := strings.TrimSpace(q.Question)
			if idx := strings.Index(questionText, ") "); idx > 0 {
				questionText = questionText[idx+2:]
			}
			_, err := a.db.ExecContext(ctx, `
				INSERT INTO questions(category_id,question_text,option_a,option_b,option_c,option_d,correct_option,is_active)
				VALUES($1,$2,$3,$4,$5,$6,$7,TRUE)
			`, cid, questionText, oA, oB, oC, oD, strings.ToUpper(strings.TrimSpace(q.Answer)))
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func (a *app) migrateParticipantsToUsers(ctx context.Context) error {
	rows, err := a.db.QueryContext(ctx, `SELECT id, name, phone, COALESCE(email,''), source FROM participants`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var pid int64
		var name, phone, email, source string
		if err := rows.Scan(&pid, &name, &phone, &email, &source); err != nil {
			return err
		}
		phone = normalizePhone(phone)
		if phone == "" {
			continue
		}

		var userID int64
		err := a.db.QueryRowContext(ctx, `SELECT id FROM users WHERE phone = $1`, phone).Scan(&userID)
		if err != nil {
			if !errors.Is(err, sql.ErrNoRows) {
				return err
			}
			defaultPass := defaultPasswordForPhone(phone)
			hash, hErr := bcrypt.GenerateFromPassword([]byte(defaultPass), bcrypt.DefaultCost)
			if hErr != nil {
				return hErr
			}
			err = a.db.QueryRowContext(ctx, `
				INSERT INTO users (phone, password_hash, role, must_change_password)
				VALUES ($1, $2, 'participant', TRUE)
				RETURNING id
			`, phone, string(hash)).Scan(&userID)
			if err != nil {
				return err
			}
		}

		_, err = a.db.ExecContext(ctx, `
			INSERT INTO participant_profiles (user_id, name, email, source, updated_at)
			VALUES ($1, $2, NULLIF($3,''), $4, NOW())
			ON CONFLICT (user_id)
			DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, source = EXCLUDED.source, updated_at = NOW()
		`, userID, strings.TrimSpace(name), strings.TrimSpace(email), strings.TrimSpace(source))
		if err != nil {
			return err
		}
	}
	return rows.Err()
}

func defaultPasswordForPhone(phone string) string {
	p := normalizePhone(phone)
	if len(p) >= 4 {
		p = p[len(p)-4:]
	}
	return "NK-" + p + "!"
}

func (a *app) handleAdminBootstrap(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if a.adminBootstrapToken == "" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "ADMIN_BOOTSTRAP_TOKEN not configured"})
		return
	}
	if r.Header.Get("X-Admin-Bootstrap-Token") != a.adminBootstrapToken {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid bootstrap token"})
		return
	}

	var req struct {
		Phone    string `json:"phone"`
		Name     string `json:"name"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	phone := normalizePhone(req.Phone)
	if phone == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "phone is required"})
		return
	}
	if req.Password == "" {
		req.Password = defaultPasswordForPhone(phone)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to hash password"})
		return
	}
	var userID int64
	err = a.db.QueryRowContext(r.Context(), `
		INSERT INTO users (phone, password_hash, role, must_change_password)
		VALUES ($1, $2, 'admin', FALSE)
		ON CONFLICT (phone)
		DO UPDATE SET role='admin', password_hash=EXCLUDED.password_hash, must_change_password=FALSE, updated_at=NOW()
		RETURNING id
	`, phone, string(hash)).Scan(&userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to upsert admin"})
		return
	}
	if strings.TrimSpace(req.Name) != "" {
		_, _ = a.db.ExecContext(r.Context(), `
			INSERT INTO participant_profiles (user_id, name, source)
			VALUES ($1, $2, 'admin')
			ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
		`, userID, strings.TrimSpace(req.Name))
	}
	_ = a.logAdminAction(r.Context(), 0, "admin.bootstrap", phone, map[string]any{"user_id": userID, "phone": phone})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "user_id": userID, "phone": phone, "role": "admin", "default_password": req.Password})
}

func (a *app) handleAuthLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	var req struct {
		Phone    string `json:"phone"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	phone := normalizePhone(req.Phone)
	if phone == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "phone and password are required"})
		return
	}

	if locked, until, err := a.isLoginLocked(r.Context(), phone); err == nil && locked {
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "too many failed attempts", "retry_after": until.Format(time.RFC3339)})
		return
	}

	var userID int64
	var hash, role string
	var mustChange, isActive bool
	err := a.db.QueryRowContext(r.Context(), `SELECT id, password_hash, role, must_change_password, is_active FROM users WHERE phone=$1`, phone).Scan(&userID, &hash, &role, &mustChange, &isActive)
	if err != nil {
		_ = a.recordFailedLogin(r.Context(), phone)
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}
	if !isActive {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "account disabled"})
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)) != nil {
		_ = a.recordFailedLogin(r.Context(), phone)
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}
	_ = a.resetFailedLogin(r.Context(), phone)

	tok := randomToken(32)
	expires := time.Now().Add(7 * 24 * time.Hour)
	_, err = a.db.ExecContext(r.Context(), `INSERT INTO user_sessions (token, user_id, expires_at) VALUES ($1,$2,$3)`, tok, userID, expires)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create session"})
		return
	}

	isSecure := r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
	http.SetCookie(w, &http.Cookie{Name: "nk_session", Value: tok, Path: "/", HttpOnly: true, SameSite: http.SameSiteLaxMode, Secure: isSecure, Expires: expires})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "role": role, "must_change_password": mustChange})
}

func (a *app) isLoginLocked(ctx context.Context, phone string) (bool, time.Time, error) {
	var failed int
	var lockedUntil sql.NullTime
	err := a.db.QueryRowContext(ctx, `SELECT failed_count, locked_until FROM auth_login_attempts WHERE phone=$1`, phone).Scan(&failed, &lockedUntil)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, time.Time{}, nil
		}
		return false, time.Time{}, err
	}
	if lockedUntil.Valid && time.Now().Before(lockedUntil.Time) {
		return true, lockedUntil.Time, nil
	}
	return false, time.Time{}, nil
}

func (a *app) recordFailedLogin(ctx context.Context, phone string) error {
	var failed int
	var lockedUntil sql.NullTime
	err := a.db.QueryRowContext(ctx, `SELECT failed_count, locked_until FROM auth_login_attempts WHERE phone=$1`, phone).Scan(&failed, &lockedUntil)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			_, err = a.db.ExecContext(ctx, `INSERT INTO auth_login_attempts (phone, failed_count, updated_at) VALUES ($1, 1, NOW())`, phone)
			return err
		}
		return err
	}
	failed++
	if failed >= 5 {
		_, err = a.db.ExecContext(ctx, `UPDATE auth_login_attempts SET failed_count=$1, locked_until=NOW() + interval '3 minutes', updated_at=NOW() WHERE phone=$2`, failed, phone)
		return err
	}
	_, err = a.db.ExecContext(ctx, `UPDATE auth_login_attempts SET failed_count=$1, updated_at=NOW() WHERE phone=$2`, failed, phone)
	return err
}

func (a *app) resetFailedLogin(ctx context.Context, phone string) error {
	_, err := a.db.ExecContext(ctx, `DELETE FROM auth_login_attempts WHERE phone=$1`, phone)
	return err
}

func (a *app) handleAuthLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if c, err := r.Cookie("nk_session"); err == nil {
		_, _ = a.db.ExecContext(r.Context(), `DELETE FROM user_sessions WHERE token=$1`, c.Value)
	}
	isSecure := r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
	http.SetCookie(w, &http.Cookie{Name: "nk_session", Value: "", Path: "/", HttpOnly: true, Secure: isSecure, MaxAge: -1, Expires: time.Unix(0, 0)})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) handleAuthMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	u, err := a.currentUser(r.Context(), r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	writeJSON(w, http.StatusOK, u)
}

func (a *app) handleAuthChangePassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	u, err := a.currentUser(r.Context(), r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var req struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	if len(req.NewPassword) < 6 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "new password minimal 6 karakter"})
		return
	}
	var hash string
	if err := a.db.QueryRowContext(r.Context(), `SELECT password_hash FROM users WHERE id=$1`, u.ID).Scan(&hash); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load user"})
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.OldPassword)) != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "old password salah"})
		return
	}
	newHash, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	_, err = a.db.ExecContext(r.Context(), `UPDATE users SET password_hash=$1, must_change_password=FALSE, updated_at=NOW() WHERE id=$2`, string(newHash), u.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update password"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) handleParticipantMe(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant", "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var name, email, source string
	_ = a.db.QueryRowContext(r.Context(), `SELECT COALESCE(name,''), COALESCE(email,''), COALESCE(source,'') FROM participant_profiles WHERE user_id=$1`, u.ID).Scan(&name, &email, &source)
	writeJSON(w, http.StatusOK, map[string]any{"id": u.ID, "phone": u.Phone, "role": u.Role, "must_change_password": u.MustChangePassword, "name": name, "email": email, "source": source})
}

func (a *app) handleParticipantHistory(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant", "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	uid := strconv.FormatInt(u.ID, 10)

	quizRows, err := a.db.QueryContext(r.Context(), `
		SELECT category_name, attempt_no, total_questions, wrong_count, all_correct, created_at
		FROM quiz_attempts
		WHERE user_id = $1
		   OR user_id IN (SELECT telegram_user_id FROM telegram_links WHERE user_id = $2)
		ORDER BY created_at DESC
		LIMIT 30
	`, uid, u.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed quiz history"})
		return
	}
	defer quizRows.Close()
	quizHistory := make([]map[string]any, 0)
	for quizRows.Next() {
		var category string
		var attemptNo, totalQ, wrong int
		var allCorrect bool
		var created time.Time
		if err := quizRows.Scan(&category, &attemptNo, &totalQ, &wrong, &allCorrect, &created); err == nil {
			quizHistory = append(quizHistory, map[string]any{"category": category, "attempt_no": attemptNo, "total_questions": totalQ, "wrong_count": wrong, "all_correct": allCorrect, "created_at": created})
		}
	}

	tryRows, err := a.db.QueryContext(r.Context(), `
		SELECT total_questions, correct_count, all_correct, duration_seconds, speed_qpm, created_at
		FROM tryout_results
		WHERE user_id = $1
		   OR user_id IN (SELECT telegram_user_id FROM telegram_links WHERE user_id = $2)
		ORDER BY created_at DESC
		LIMIT 30
	`, uid, u.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed tryout history"})
		return
	}
	defer tryRows.Close()
	tryHistory := make([]map[string]any, 0)
	for tryRows.Next() {
		var totalQ, correct, dur int
		var allCorrect bool
		var speed float64
		var created time.Time
		if err := tryRows.Scan(&totalQ, &correct, &allCorrect, &dur, &speed, &created); err == nil {
			tryHistory = append(tryHistory, map[string]any{"total_questions": totalQ, "correct_count": correct, "all_correct": allCorrect, "duration_seconds": dur, "speed_qpm": speed, "created_at": created})
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"quiz": quizHistory, "tryout": tryHistory})
}

func (a *app) handleParticipantLeaderboard(w http.ResponseWriter, r *http.Request) {
	_, err := a.requireRole(r.Context(), r, "participant", "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	rows, err := a.db.QueryContext(r.Context(), `
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
		LIMIT 20
	`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed leaderboard"})
		return
	}
	defer rows.Close()
	items := make([]map[string]any, 0)
	rank := 1
	for rows.Next() {
		var userID, name, tg string
		var bestSec, perfectCount int
		if err := rows.Scan(&userID, &name, &tg, &bestSec, &perfectCount); err == nil {
			items = append(items, map[string]any{"rank": rank, "name": name, "telegram": cleanTelegramHandle(tg), "best_seconds": bestSec, "perfect_count": perfectCount})
			rank++
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (a *app) handleAdminPing(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "admin_id": u.ID})
}

func (a *app) handleAdminParticipants(w http.ResponseWriter, r *http.Request) {
	_, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	rows, err := a.db.QueryContext(r.Context(), `
		SELECT u.id, u.phone, u.role, u.is_active, u.must_change_password,
		       COALESCE(p.name,''), COALESCE(p.email,'')
		FROM users u
		LEFT JOIN participant_profiles p ON p.user_id = u.id
		ORDER BY u.created_at DESC
		LIMIT 200
	`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load participants"})
		return
	}
	defer rows.Close()
	items := []map[string]any{}
	for rows.Next() {
		var id int64
		var phone, role, name, email string
		var isActive, mustChange bool
		if rows.Scan(&id, &phone, &role, &isActive, &mustChange, &name, &email) == nil {
			items = append(items, map[string]any{"id": id, "phone": phone, "role": role, "is_active": isActive, "must_change_password": mustChange, "name": name, "email": email})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (a *app) handleAdminResetPassword(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	var req struct {
		UserID int64  `json:"user_id"`
		Phone  string `json:"phone"`
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	var phone string
	if req.UserID > 0 {
		_ = a.db.QueryRowContext(r.Context(), `SELECT phone FROM users WHERE id=$1`, req.UserID).Scan(&phone)
	} else {
		phone = normalizePhone(req.Phone)
	}
	if phone == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "user_id or phone required"})
		return
	}
	pass := defaultPasswordForPhone(phone)
	hash, _ := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
	_, err = a.db.ExecContext(r.Context(), `UPDATE users SET password_hash=$1, must_change_password=TRUE, updated_at=NOW() WHERE phone=$2`, string(hash), phone)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed reset password"})
		return
	}
	_ = a.logAdminAction(r.Context(), admin.ID, "participants.reset_password", phone, map[string]any{"phone": phone})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "phone": phone, "new_default_password": pass})
}

func (a *app) handleAdminToggleActive(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	var req struct {
		UserID   int64 `json:"user_id"`
		IsActive bool  `json:"is_active"`
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil || req.UserID == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	_, err = a.db.ExecContext(r.Context(), `UPDATE users SET is_active=$1, updated_at=NOW() WHERE id=$2`, req.IsActive, req.UserID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed update status"})
		return
	}
	_ = a.logAdminAction(r.Context(), admin.ID, "participants.toggle_active", fmt.Sprint(req.UserID), map[string]any{"user_id": req.UserID, "is_active": req.IsActive})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) handleAdminCategories(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		rows, err := a.db.QueryContext(r.Context(), `SELECT id, code, name, is_active FROM question_categories ORDER BY id DESC`)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed categories"})
			return
		}
		defer rows.Close()
		items := []map[string]any{}
		for rows.Next() {
			var id int64
			var code, name string
			var active bool
			if rows.Scan(&id, &code, &name, &active) == nil {
				items = append(items, map[string]any{"id": id, "code": code, "name": name, "is_active": active})
			}
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
	case http.MethodPost:
		var req struct {
			Action   string `json:"action"`
			ID       int64  `json:"id"`
			Code     string `json:"code"`
			Name     string `json:"name"`
			IsActive *bool  `json:"is_active"`
		}
		if json.NewDecoder(r.Body).Decode(&req) != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
			return
		}
		switch req.Action {
		case "create":
			_, err = a.db.ExecContext(r.Context(), `INSERT INTO question_categories(code,name,is_active) VALUES($1,$2,TRUE)`, strings.ToLower(strings.TrimSpace(req.Code)), strings.TrimSpace(req.Name))
		case "update":
			active := true
			if req.IsActive != nil {
				active = *req.IsActive
			}
			_, err = a.db.ExecContext(r.Context(), `UPDATE question_categories SET code=$1,name=$2,is_active=$3,updated_at=NOW() WHERE id=$4`, strings.ToLower(strings.TrimSpace(req.Code)), strings.TrimSpace(req.Name), active, req.ID)
		case "delete":
			_, err = a.db.ExecContext(r.Context(), `DELETE FROM question_categories WHERE id=$1`, req.ID)
		default:
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unknown action"})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed action"})
			return
		}
		_ = a.logAdminAction(r.Context(), admin.ID, "categories."+req.Action, fmt.Sprint(req.ID), req)
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func (a *app) handleAdminQuestions(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		rows, err := a.db.QueryContext(r.Context(), `
			SELECT q.id,q.category_id,COALESCE(c.name,''),q.question_text,q.option_a,q.option_b,q.option_c,q.option_d,q.correct_option,q.is_active
			FROM questions q LEFT JOIN question_categories c ON c.id=q.category_id ORDER BY q.id DESC LIMIT 300
		`)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed questions"})
			return
		}
		defer rows.Close()
		items := []map[string]any{}
		for rows.Next() {
			var id, cid int64
			var cname, qt, a1, b1, c1, d1, co string
			var active bool
			if rows.Scan(&id, &cid, &cname, &qt, &a1, &b1, &c1, &d1, &co, &active) == nil {
				items = append(items, map[string]any{"id": id, "category_id": cid, "category_name": cname, "question_text": qt, "option_a": a1, "option_b": b1, "option_c": c1, "option_d": d1, "correct_option": co, "is_active": active})
			}
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
	case http.MethodPost:
		var req struct {
			Action        string `json:"action"`
			ID            int64  `json:"id"`
			CategoryID    int64  `json:"category_id"`
			QuestionText  string `json:"question_text"`
			OptionA       string `json:"option_a"`
			OptionB       string `json:"option_b"`
			OptionC       string `json:"option_c"`
			OptionD       string `json:"option_d"`
			CorrectOption string `json:"correct_option"`
			IsActive      *bool  `json:"is_active"`
		}
		if json.NewDecoder(r.Body).Decode(&req) != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
			return
		}
		switch req.Action {
		case "create":
			_, err = a.db.ExecContext(r.Context(), `INSERT INTO questions(category_id,question_text,option_a,option_b,option_c,option_d,correct_option,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,TRUE)`, req.CategoryID, strings.TrimSpace(req.QuestionText), req.OptionA, req.OptionB, req.OptionC, req.OptionD, strings.ToUpper(strings.TrimSpace(req.CorrectOption)))
		case "update":
			active := true
			if req.IsActive != nil {
				active = *req.IsActive
			}
			_, err = a.db.ExecContext(r.Context(), `UPDATE questions SET category_id=$1,question_text=$2,option_a=$3,option_b=$4,option_c=$5,option_d=$6,correct_option=$7,is_active=$8,updated_at=NOW() WHERE id=$9`, req.CategoryID, strings.TrimSpace(req.QuestionText), req.OptionA, req.OptionB, req.OptionC, req.OptionD, strings.ToUpper(strings.TrimSpace(req.CorrectOption)), active, req.ID)
		case "delete":
			_, err = a.db.ExecContext(r.Context(), `DELETE FROM questions WHERE id=$1`, req.ID)
		default:
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unknown action"})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed action"})
			return
		}
		_ = a.logAdminAction(r.Context(), admin.ID, "questions."+req.Action, fmt.Sprint(req.ID), req)
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

type authUser struct {
	ID                 int64  `json:"id"`
	Phone              string `json:"phone"`
	Role               string `json:"role"`
	MustChangePassword bool   `json:"must_change_password"`
}

func (a *app) currentUser(ctx context.Context, r *http.Request) (authUser, error) {
	c, err := r.Cookie("nk_session")
	if err != nil || strings.TrimSpace(c.Value) == "" {
		return authUser{}, errors.New("no session")
	}
	var u authUser
	var expires time.Time
	err = a.db.QueryRowContext(ctx, `
		SELECT u.id, u.phone, u.role, u.must_change_password, s.expires_at
		FROM user_sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.token = $1
	`, c.Value).Scan(&u.ID, &u.Phone, &u.Role, &u.MustChangePassword, &expires)
	if err != nil {
		return authUser{}, err
	}
	if time.Now().After(expires) {
		_, _ = a.db.ExecContext(ctx, `DELETE FROM user_sessions WHERE token=$1`, c.Value)
		return authUser{}, errors.New("session expired")
	}
	return u, nil
}

func (a *app) requireRole(ctx context.Context, r *http.Request, roles ...string) (authUser, error) {
	u, err := a.currentUser(ctx, r)
	if err != nil {
		return authUser{}, err
	}
	for _, role := range roles {
		if u.Role == role {
			return u, nil
		}
	}
	return authUser{}, errors.New("forbidden")
}

func (a *app) logAdminAction(ctx context.Context, adminUserID int64, action, target string, detail any) error {
	if strings.TrimSpace(action) == "" {
		return nil
	}
	b, _ := json.Marshal(detail)
	_, err := a.db.ExecContext(ctx, `
		INSERT INTO admin_audit_logs (admin_user_id, action, target, detail)
		VALUES ($1,$2,$3,$4::jsonb)
	`, adminUserID, action, target, string(b))
	return err
}

func randomToken(n int) string {
	letters := []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	b := make([]rune, n)
	for i := range b {
		b[i] = letters[r.Intn(len(letters))]
	}
	return string(b)
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
	username := strings.TrimSpace(upd.Message.From.Username)
	displayName := uid
	if username != "" {
		displayName = "@" + username
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
	} else if state == "jadwal_menu" {
		payload["reply_markup"] = map[string]any{
			"keyboard":          [][]string{{"ingatkan", "ingatkanku"}, {"ubahingat", "hapusingat"}},
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
		return "Selamat datang di Naik Kelas, perkenalkan saya Nala ✨\nAku siap bantu kamu daftar belajar dengan cepat.\n\nKetik /daftar untuk registrasi peserta baru 📚\nKetik /cek untuk cek apakah nomor HP sudah terdaftar ✅\nKetik /quiz untuk latihan per kategori 🧠\nKetik /tryout untuk simulasi soal acak 🚀\nKetik /leaderbot untuk lihat ranking tryout 🏆\nKetik /jadwal_belajar untuk atur pengingat belajar ⏰", "idle"
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
		catsText, err := a.formatQuizCategoriesDB(ctx)
		if err != nil || strings.TrimSpace(catsText) == "" {
			catsText = formatQuizCategories()
		}
		a.mu.Lock()
		a.botSessions[uid] = &botSession{State: "quiz_choose_category", QuizIndex: 0, QuizAnswers: []string{}, UpdatedAt: time.Now()}
		a.mu.Unlock()
		return "Siap, kita mulai quiz Naik Kelas! 🔥\nPilih dulu kategori quiz yang kamu mau:\n\n" + catsText, "quiz_choose_category"
	}
	if lower == "/tryout" {
		registered, err := a.isRegisteredBotUser(ctx, uid)
		if err != nil {
			return "Maaf, Nala lagi kesulitan cek data pendaftaran 🙏\nCoba lagi sebentar ya.", "idle"
		}
		if !registered {
			return "Sebelum ikut tryout, kamu perlu daftar dulu ya ✨\nKetik /daftar untuk registrasi dulu.", "idle"
		}
		qs, err := a.shuffledTryoutQuestionsDB(ctx)
		if err != nil || len(qs) == 0 {
			qs = shuffledTryoutQuestions()
		}
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

	if lower == "/jadwal_belajar" {
		registered, err := a.isRegisteredBotUser(ctx, uid)
		if err != nil {
			return "Maaf, Nala lagi kesulitan cek data pendaftaran 🙏\nCoba lagi sebentar ya.", "idle"
		}
		if !registered {
			return "Sebelum atur pengingat belajar, kamu perlu daftar dulu ya ✨\nKetik /daftar untuk registrasi dulu.", "idle"
		}
		a.mu.Lock()
		s.State = "jadwal_menu"
		s.UpdatedAt = time.Now()
		a.mu.Unlock()
		return "Menu Jadwal Belajar ⏰\nPilih salah satu:\n- ingatkan\n- ingatkanku\n- ubahingat\n- hapusingat", "jadwal_menu"
	}
	if lower == "ingatkanku" {
		r, err := a.getStudyReminder(ctx, uid)
		if err != nil {
			return "Maaf, belum bisa ambil jadwalmu sekarang 🙏", "idle"
		}
		if !r.Active {
			return "Kamu belum punya jadwal belajar aktif. Ketik /jadwal_belajar lalu pilih *ingatkan* ya ✨", "idle"
		}
		return fmt.Sprintf("Jadwal belajar kamu aktif setiap hari jam %s (%s) ✅", r.TimeOfDay, r.Timezone), "idle"
	}
	if lower == "ingatkan" {
		a.mu.Lock()
		s.State = "reminder_set_time"
		s.UpdatedAt = time.Now()
		a.mu.Unlock()
		return "Siap! Kirim jam belajarmu dengan format HH:MM (contoh 19:00).", "reminder_set_time"
	}
	if lower == "ubahingat" {
		r, err := a.getStudyReminder(ctx, uid)
		if err != nil {
			return "Maaf, belum bisa cek jadwalmu sekarang 🙏", "idle"
		}
		if !r.Active {
			return "Belum ada jadwal aktif untuk diubah. Pilih *ingatkan* dulu ya ✨", "idle"
		}
		a.mu.Lock()
		s.State = "reminder_update_time"
		s.UpdatedAt = time.Now()
		a.mu.Unlock()
		return fmt.Sprintf("Jadwal saat ini %s. Kirim jam baru dengan format HH:MM.", r.TimeOfDay), "reminder_update_time"
	}
	if lower == "hapusingat" {
		if err := a.disableStudyReminder(ctx, uid); err != nil {
			return "Maaf, gagal hapus jadwal sekarang 🙏", "idle"
		}
		return "Oke, jadwal pengingat belajarmu sudah dinonaktifkan ✅", "idle"
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
			_ = a.linkTelegramToParticipant(ctx, uid, displayName, p.Name, p.Phone, p.Email, p.Source)
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
		_ = a.linkTelegramToParticipant(ctx, uid, displayName, name, phone, email, "bot-naik-kelas")
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
		cat, ok, err := a.findQuizCategoryDB(ctx, text)
		if err != nil {
			return "Maaf, kategori quiz belum bisa dimuat 🙏 Coba lagi sebentar ya.", "quiz_choose_category"
		}
		if !ok {
			catsText, _ := a.formatQuizCategoriesDB(ctx)
			if strings.TrimSpace(catsText) == "" {
				catsText = formatQuizCategories()
			}
			return "Kategori belum dikenali 🙏\nSilakan pilih salah satu kategori berikut:\n\n" + catsText, "quiz_choose_category"
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
		cat, ok, err := a.findQuizCategoryDB(ctx, s.QuizCategory)
		if err != nil {
			a.resetSession(uid)
			return "Kategori quiz tidak ditemukan. Ketik /quiz untuk mulai lagi ya.", "idle"
		}
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
			attemptNo, _ := a.saveQuizAttempt(ctx, uid, displayName, cat, len(cat.Items), wrong, true)
			a.resetSession(uid)
			return fmt.Sprintf("Luar biasa! 🎉 Semua jawaban kamu benar!\nKamu berhasil menuntaskan quiz kategori %s.\nPercobaan ke-%d ✅", cat.Name, attemptNo), "idle"
		}

		attemptNo, _ := a.saveQuizAttempt(ctx, uid, displayName, cat, len(cat.Items), wrong, false)
		a.mu.Lock()
		s.State = "quiz_answering"
		s.QuizIndex = 0
		s.QuizAnswers = []string{}
		s.UpdatedAt = time.Now()
		a.mu.Unlock()
		return fmt.Sprintf("Semangat! Kamu masih punya %d jawaban yang belum tepat di kategori %s.\nIni percobaan ke-%d, kita ulang dari awal ya 🔁\n\n%s", wrong, cat.Name, attemptNo, formatQuizQuestion(cat, 0)), "quiz_answering"

	case "reminder_set_time", "reminder_update_time":
		tm, ok := normalizeTimeHHMM(text)
		if !ok {
			return "Format jam belum valid. Gunakan HH:MM ya (contoh 19:00).", curState
		}
		if err := a.upsertStudyReminder(ctx, uid, tm, "Asia/Jakarta"); err != nil {
			return "Maaf, belum bisa simpan jadwal sekarang 🙏", curState
		}
		a.mu.Lock()
		s.State = "idle"
		s.UpdatedAt = time.Now()
		a.mu.Unlock()
		return fmt.Sprintf("Siap! Mulai sekarang Nala akan mengingatkan kamu belajar setiap hari jam %s WIB ⏰", tm), "idle"

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
	speedQPM := 0.0
	if durationSec > 0 {
		speedQPM = float64(correct) * 60.0 / float64(durationSec)
	}
	_, err := a.db.ExecContext(ctx, `
		INSERT INTO tryout_results (user_id, display_name, total_questions, correct_count, all_correct, duration_seconds, speed_qpm)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, userID, displayName, total, correct, allCorrect, durationSec, speedQPM)
	return err
}

func (a *app) saveQuizAttempt(ctx context.Context, userID, displayName string, cat quizCategory, totalQuestions, wrongCount int, allCorrect bool) (int, error) {
	if strings.TrimSpace(displayName) == "" {
		displayName = userID
	}
	var attemptNo int
	err := a.db.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(attempt_no), 0) + 1
		FROM quiz_attempts
		WHERE user_id = $1 AND category_code = $2
	`, userID, cat.Code).Scan(&attemptNo)
	if err != nil {
		return 0, err
	}
	_, err = a.db.ExecContext(ctx, `
		INSERT INTO quiz_attempts (user_id, display_name, category_code, category_name, attempt_no, total_questions, wrong_count, all_correct)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, userID, displayName, cat.Code, cat.Name, attemptNo, totalQuestions, wrongCount, allCorrect)
	if err != nil {
		return 0, err
	}
	return attemptNo, nil
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

func (a *app) linkTelegramToParticipant(ctx context.Context, telegramUserID, telegramDisplay, name, phone, email, source string) error {
	phone = normalizePhone(phone)
	if phone == "" || strings.TrimSpace(telegramUserID) == "" {
		return nil
	}

	var userID int64
	err := a.db.QueryRowContext(ctx, `SELECT id FROM users WHERE phone=$1`, phone).Scan(&userID)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		pass := defaultPasswordForPhone(phone)
		hash, hErr := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
		if hErr != nil {
			return hErr
		}
		err = a.db.QueryRowContext(ctx, `
			INSERT INTO users (phone, password_hash, role, must_change_password)
			VALUES ($1,$2,'participant',TRUE)
			RETURNING id
		`, phone, string(hash)).Scan(&userID)
		if err != nil {
			return err
		}
	}

	_, err = a.db.ExecContext(ctx, `
		INSERT INTO participant_profiles (user_id, name, email, source, updated_at)
		VALUES ($1, $2, NULLIF($3,''), $4, NOW())
		ON CONFLICT (user_id)
		DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, source=EXCLUDED.source, updated_at=NOW()
	`, userID, strings.TrimSpace(name), strings.TrimSpace(email), strings.TrimSpace(source))
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		INSERT INTO telegram_links (telegram_user_id, user_id, telegram_display, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (telegram_user_id)
		DO UPDATE SET user_id = EXCLUDED.user_id, telegram_display = EXCLUDED.telegram_display, updated_at = NOW()
	`, strings.TrimSpace(telegramUserID), userID, strings.TrimSpace(telegramDisplay))
	return err
}

func (a *app) isRegisteredBotUser(ctx context.Context, userID string) (bool, error) {
	var exists bool
	err := a.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM telegram_links WHERE telegram_user_id = $1)`, userID).Scan(&exists)
	return exists, err
}

type studyReminder struct {
	TelegramUserID string
	UserID         int64
	TimeOfDay      string
	Timezone       string
	Active         bool
	LastSentAt     *time.Time
}

func (a *app) getStudyReminder(ctx context.Context, telegramUserID string) (studyReminder, error) {
	var r studyReminder
	var last sql.NullTime
	err := a.db.QueryRowContext(ctx, `
		SELECT telegram_user_id, user_id, time_of_day, timezone, is_active, last_sent_at
		FROM study_reminders
		WHERE telegram_user_id = $1
	`, telegramUserID).Scan(&r.TelegramUserID, &r.UserID, &r.TimeOfDay, &r.Timezone, &r.Active, &last)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return studyReminder{}, nil
		}
		return studyReminder{}, err
	}
	if last.Valid {
		t := last.Time
		r.LastSentAt = &t
	}
	return r, nil
}

func (a *app) upsertStudyReminder(ctx context.Context, telegramUserID, timeOfDay, timezone string) error {
	if strings.TrimSpace(timezone) == "" {
		timezone = "Asia/Jakarta"
	}
	var userID int64
	if err := a.db.QueryRowContext(ctx, `SELECT user_id FROM telegram_links WHERE telegram_user_id = $1`, telegramUserID).Scan(&userID); err != nil {
		return err
	}
	_, err := a.db.ExecContext(ctx, `
		INSERT INTO study_reminders (telegram_user_id, user_id, time_of_day, timezone, is_active, updated_at)
		VALUES ($1,$2,$3,$4,TRUE,NOW())
		ON CONFLICT (telegram_user_id)
		DO UPDATE SET user_id=EXCLUDED.user_id, time_of_day=EXCLUDED.time_of_day, timezone=EXCLUDED.timezone, is_active=TRUE, updated_at=NOW()
	`, telegramUserID, userID, timeOfDay, timezone)
	return err
}

func (a *app) disableStudyReminder(ctx context.Context, telegramUserID string) error {
	_, err := a.db.ExecContext(ctx, `UPDATE study_reminders SET is_active=FALSE, updated_at=NOW() WHERE telegram_user_id = $1`, telegramUserID)
	return err
}

func normalizeTimeHHMM(v string) (string, bool) {
	v = strings.TrimSpace(v)
	if len(v) != 5 || v[2] != ':' {
		return "", false
	}
	hh, err1 := strconv.Atoi(v[:2])
	mm, err2 := strconv.Atoi(v[3:])
	if err1 != nil || err2 != nil || hh < 0 || hh > 23 || mm < 0 || mm > 59 {
		return "", false
	}
	return fmt.Sprintf("%02d:%02d", hh, mm), true
}

func (a *app) startReminderScheduler(ctx context.Context) {
	if strings.TrimSpace(a.telegramBotToken) == "" {
		return
	}
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		a.runReminderTick(ctx)
		<-ticker.C
	}
}

func (a *app) runReminderTick(ctx context.Context) {
	rows, err := a.db.QueryContext(ctx, `
		SELECT telegram_user_id, user_id, time_of_day, timezone, is_active, last_sent_at
		FROM study_reminders
		WHERE is_active = TRUE
	`)
	if err != nil {
		return
	}
	defer rows.Close()
	nowUTC := time.Now().UTC()
	for rows.Next() {
		var r studyReminder
		var last sql.NullTime
		if rows.Scan(&r.TelegramUserID, &r.UserID, &r.TimeOfDay, &r.Timezone, &r.Active, &last) != nil {
			continue
		}
		if last.Valid {
			t := last.Time
			r.LastSentAt = &t
		}
		loc, err := time.LoadLocation(r.Timezone)
		if err != nil {
			loc = time.FixedZone("WIB", 7*3600)
		}
		nowLocal := nowUTC.In(loc)
		if nowLocal.Format("15:04") != r.TimeOfDay {
			continue
		}
		if r.LastSentAt != nil {
			lastLocal := r.LastSentAt.In(loc)
			if lastLocal.Year() == nowLocal.Year() && lastLocal.YearDay() == nowLocal.YearDay() {
				continue
			}
		}
		chatID, err := strconv.ParseInt(strings.TrimSpace(r.TelegramUserID), 10, 64)
		if err != nil {
			continue
		}
		_ = a.sendTelegramMessage(ctx, chatID, "📚 Waktunya belajar, semangat ya! Nala percaya kamu bisa konsisten hari ini ✨", "idle")
		_, _ = a.db.ExecContext(ctx, `UPDATE study_reminders SET last_sent_at=NOW(), updated_at=NOW() WHERE telegram_user_id=$1`, r.TelegramUserID)
	}
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
		tg = cleanTelegramHandle(tg)
		lines = append(lines, fmt.Sprintf("%d. %s (%s) — %ds (perfect: %dx)", rank, name, tg, bestSec, perfectCount))
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

func (a *app) formatQuizCategoriesDB(ctx context.Context) (string, error) {
	rows, err := a.db.QueryContext(ctx, `SELECT code, name FROM question_categories WHERE is_active = TRUE ORDER BY id ASC`)
	if err != nil {
		return "", err
	}
	defer rows.Close()
	lines := []string{}
	for rows.Next() {
		var code, name string
		if rows.Scan(&code, &name) == nil {
			lines = append(lines, "- "+name+" ("+code+")")
		}
	}
	if len(lines) == 0 {
		return "", nil
	}
	return strings.Join(lines, "\n") + "\n\nKirim nama kategori atau kode dalam kurung.", nil
}

func (a *app) findQuizCategoryDB(ctx context.Context, input string) (quizCategory, bool, error) {
	s := strings.ToLower(strings.TrimSpace(input))
	if s == "" {
		return quizCategory{}, false, nil
	}
	var id int64
	var code, name string
	err := a.db.QueryRowContext(ctx, `
		SELECT id, code, name FROM question_categories
		WHERE is_active = TRUE AND (LOWER(code) = $1 OR LOWER(name) = $1)
		LIMIT 1
	`, s).Scan(&id, &code, &name)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return quizCategory{}, false, nil
		}
		return quizCategory{}, false, err
	}
	qs, err := a.getQuestionsByCategoryID(ctx, id)
	if err != nil {
		return quizCategory{}, false, err
	}
	if len(qs) == 0 {
		return quizCategory{}, false, nil
	}
	return quizCategory{Code: code, Name: name, Items: qs}, true, nil
}

func (a *app) getQuestionsByCategoryID(ctx context.Context, categoryID int64) ([]quizQuestion, error) {
	rows, err := a.db.QueryContext(ctx, `
		SELECT question_text, option_a, option_b, option_c, option_d, correct_option
		FROM questions
		WHERE category_id = $1 AND is_active = TRUE
		ORDER BY id ASC
	`, categoryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []quizQuestion{}
	n := 1
	for rows.Next() {
		var q, a1, b1, c1, d1, ans string
		if rows.Scan(&q, &a1, &b1, &c1, &d1, &ans) == nil {
			out = append(out, quizQuestion{Question: fmt.Sprintf("%d) %s", n, q), Options: []string{"A. " + a1, "B. " + b1, "C. " + c1, "D. " + d1}, Answer: strings.ToUpper(strings.TrimSpace(ans))})
			n++
		}
	}
	return out, rows.Err()
}

func (a *app) shuffledTryoutQuestionsDB(ctx context.Context) ([]quizQuestion, error) {
	rows, err := a.db.QueryContext(ctx, `
		SELECT q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option
		FROM questions q
		JOIN question_categories c ON c.id = q.category_id
		WHERE q.is_active = TRUE AND c.is_active = TRUE
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []quizQuestion{}
	n := 1
	for rows.Next() {
		var q, a1, b1, c1, d1, ans string
		if rows.Scan(&q, &a1, &b1, &c1, &d1, &ans) == nil {
			items = append(items, quizQuestion{Question: fmt.Sprintf("%d) %s", n, q), Options: []string{"A. " + a1, "B. " + b1, "C. " + c1, "D. " + d1}, Answer: strings.ToUpper(strings.TrimSpace(ans))})
			n++
		}
	}
	if len(items) == 0 {
		return nil, nil
	}
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	r.Shuffle(len(items), func(i, j int) { items[i], items[j] = items[j], items[i] })
	return items, nil
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

func cleanTelegramHandle(v string) string {
	v = strings.TrimSpace(v)
	if v == "" {
		return "-"
	}
	at := strings.Index(v, "@")
	if at < 0 {
		return v
	}
	tail := v[at:]
	end := len(tail)
	for i, r := range tail {
		if i == 0 {
			continue
		}
		ok := (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_'
		if !ok {
			end = i
			break
		}
	}
	if end <= 1 {
		return v
	}
	return tail[:end]
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
