package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
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
	State             string
	Name              string
	Phone             string
	QuizCategory      string
	QuizIndex         int
	QuizCount         int
	QuizAnswers       []string
	TryoutQuestions   []quizQuestion
	TryoutAnswers     []string
	TryoutStartedAt   time.Time
	DisplayName       string
	UpdatedAt         time.Time
	RedeemItemID      int64
	RedeemItemName    string
	RedeemItemCost    int
	Email string
	// Feedback
	FeedbackRating int
	// Materi multi-bubble
	MateriBubbles   []string
	MateriBubbleIdx int
	// Materi
	MateriCategoryID   int
	MateriCategoryName string
	MateriList         []botMateriItem
	MateriViewingID    int
	MateriViewingExp   int
}

type botMateriItem struct {
	ID          int
	Title       string
	Type        string
	Content     string
	ExpReward   int
	OrderNo     int
	IsCompleted bool
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

	if err := a.syncTelegramBotCommands(ctx); err != nil {
		log.Printf("telegram setMyCommands warning: %v", err)
	}

	go a.startReminderScheduler(context.Background())
	go a.startReflectionReminder(context.Background())
	go a.startFeedbackScheduler(context.Background())

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
	mux.HandleFunc("/participant/change-password", a.handleParticipantChangePassword)
	mux.HandleFunc("/participant/history", a.handleParticipantHistory)
	mux.HandleFunc("/participant/leaderboard", a.handleParticipantLeaderboard)
	mux.HandleFunc("/participant/reminder", a.handleParticipantReminder)
	mux.HandleFunc("/participant/notes", a.handleParticipantNotes)
	mux.HandleFunc("/participant/notes/graph", a.handleParticipantNotesGraph)
	mux.HandleFunc("/participant/notes/canvas", a.handleParticipantCanvas)
	mux.HandleFunc("/participant/points", a.handleParticipantPoints)
	mux.HandleFunc("/participant/points/history", a.handleParticipantPointsHistory)
	mux.HandleFunc("/admin/ping", a.handleAdminPing)
	mux.HandleFunc("/admin/participants", a.handleAdminParticipants)
	mux.HandleFunc("/admin/reminders", a.handleAdminReminders)
	mux.HandleFunc("/admin/learning-summary", a.handleAdminLearningSummary)
	mux.HandleFunc("/admin/points/adjust", a.handleAdminPointsAdjust)
	mux.HandleFunc("/admin/points/history", a.handleAdminPointsHistory)
	mux.HandleFunc("/admin/points/update", a.handleAdminPointsUpdate)
	mux.HandleFunc("/admin/points/delete", a.handleAdminPointsDelete)
	mux.HandleFunc("/admin/points/recalculate", a.handleAdminPointsRecalculate)
	mux.HandleFunc("/admin/points/balances", a.handleAdminPointBalances)
	mux.HandleFunc("/admin/exp/rules", a.handleAdminExpRules)
	mux.HandleFunc("/admin/exp/history", a.handleAdminExpHistory)
	mux.HandleFunc("/admin/exp/status", a.handleAdminExpStatus)
	mux.HandleFunc("/admin/exp/report-setting", a.handleAdminExpReportSetting)
	mux.HandleFunc("/admin/exp/report-send", a.handleAdminExpReportSend)
	mux.HandleFunc("/admin/participants/reset-password", a.handleAdminResetPassword)
	mux.HandleFunc("/admin/participants/toggle-active", a.handleAdminToggleActive)
	mux.HandleFunc("/admin/participants/set-role", a.handleAdminSetRole)
	mux.HandleFunc("/admin/set-super-admin", a.handleAdminSetSuperAdmin)
	mux.HandleFunc("/admin/participants/delete", a.handleAdminDeleteParticipant)
	mux.HandleFunc("/admin/categories", a.handleAdminCategories)
	mux.HandleFunc("/admin/questions", a.handleAdminQuestions)
	mux.HandleFunc("/admin/questions/generate", a.handleAdminGenerateQuestions)
	mux.HandleFunc("/participant/redeem/items", a.handleParticipantRedeemItems)
	mux.HandleFunc("/participant/redeem/claim", a.handleParticipantRedeemClaim)
	mux.HandleFunc("/participant/redeem/claims", a.handleParticipantRedeemClaims)
	mux.HandleFunc("/admin/redeem/items", a.handleAdminRedeemItems)
	mux.HandleFunc("/admin/redeem/claims", a.handleAdminRedeemClaims)
	mux.HandleFunc("/admin/redeem/claims/action", a.handleAdminRedeemClaimAction)

	// Groups
	mux.HandleFunc("/admin/groups", a.handleAdminGroups)

	// Learning Materials
	mux.HandleFunc("/admin/materials", a.handleAdminMaterials)
	mux.HandleFunc("/admin/materials/generate", a.handleAdminGenerateMaterial)
	mux.HandleFunc("/admin/roadmap/positions", a.handleAdminRoadmapPositions)
	mux.HandleFunc("/admin/roadmap/competencies", a.handleAdminRoadmapCompetencies)
	mux.HandleFunc("/admin/roadmap/materials", a.handleAdminRoadmapMaterials)
	mux.HandleFunc("/admin/roadmap/materials-graph", a.handleAdminRoadmapMaterialsGraph)
	mux.HandleFunc("/admin/tryout-configs", a.handleAdminTryoutConfigs)
	mux.HandleFunc("/participant/materials", a.handleParticipantMaterials)
	mux.HandleFunc("/participant/materials/complete", a.handleParticipantMaterialComplete)

	// Material Contributions
	mux.HandleFunc("/participant/categories", a.handleParticipantCategories)
	mux.HandleFunc("/participant/contributions", a.handleParticipantContributions)
	mux.HandleFunc("/participant/contributions/submit", a.handleParticipantSubmitContribution)
	mux.HandleFunc("/admin/contributions", a.handleAdminContributions)
	mux.HandleFunc("/admin/contributions/review", a.handleAdminReviewContribution)
	mux.HandleFunc("/admin/ai-settings", a.handleAdminAISettings)
	mux.HandleFunc("/admin/ai-profiles", a.handleAdminAIProfiles)
	mux.HandleFunc("/participant/reflections", a.handleParticipantReflections)
	mux.HandleFunc("/participant/reflection-reminder", a.handleParticipantReflectionReminder)
	mux.HandleFunc("/participant/badges", a.handleParticipantBadges)
	mux.HandleFunc("/admin/badges", a.handleAdminBadges)
	mux.HandleFunc("/admin/badges/award", a.handleAdminBadgeAward)
	mux.HandleFunc("/admin/badges/revoke", a.handleAdminBadgeRevoke)
	mux.HandleFunc("/admin/feedback/schedule", a.handleAdminFeedbackSchedule)
	mux.HandleFunc("/admin/reflection/send-now", a.handleAdminSendReflectionNow)
	mux.HandleFunc("/admin/feedback/list", a.handleAdminFeedbackList)
	mux.HandleFunc("/admin/feedback/stats", a.handleAdminFeedbackStats)
	mux.HandleFunc("/admin/reflections/stats", a.handleAdminReflectionStats)

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
		CREATE TABLE IF NOT EXISTS bot_session_states (
			telegram_user_id TEXT PRIMARY KEY,
			state TEXT NOT NULL DEFAULT 'idle',
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}
	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS notes (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			title TEXT NOT NULL DEFAULT 'Untitled',
			content TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS note_links (
			from_note_id BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
			to_note_id   BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
			PRIMARY KEY (from_note_id, to_note_id)
		);
		CREATE TABLE IF NOT EXISTS note_tags (
			note_id BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
			tag     TEXT NOT NULL,
			PRIMARY KEY (note_id, tag)
		);
		-- Canvas: infinite whiteboard
		CREATE TABLE IF NOT EXISTS note_canvases (
			id         BIGSERIAL PRIMARY KEY,
			user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name       TEXT NOT NULL DEFAULT 'Canvas',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE(user_id, name)
		);
		CREATE TABLE IF NOT EXISTS note_canvas_items (
			id         BIGSERIAL PRIMARY KEY,
			canvas_id  BIGINT NOT NULL REFERENCES note_canvases(id) ON DELETE CASCADE,
			item_type  TEXT NOT NULL DEFAULT 'note',  -- 'note' | 'text' | 'image' (future)
			note_id    BIGINT REFERENCES notes(id) ON DELETE SET NULL,
			data       JSONB NOT NULL DEFAULT '{}',   -- {text, url, ...} untuk type lain
			x          FLOAT NOT NULL DEFAULT 0,
			y          FLOAT NOT NULL DEFAULT 0,
			width      FLOAT NOT NULL DEFAULT 260,
			height     FLOAT NOT NULL DEFAULT 140,
			z_index    INT NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		-- Edges: koneksi antar item (siap untuk fase 2)
		CREATE TABLE IF NOT EXISTS note_canvas_edges (
			id         BIGSERIAL PRIMARY KEY,
			canvas_id  BIGINT NOT NULL REFERENCES note_canvases(id) ON DELETE CASCADE,
			from_item  BIGINT NOT NULL REFERENCES note_canvas_items(id) ON DELETE CASCADE,
			to_item    BIGINT NOT NULL REFERENCES note_canvas_items(id) ON DELETE CASCADE,
			label      TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`)
	if err != nil {
		return err
	}
	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS tryout_configs (
			id BIGSERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			group_id BIGINT REFERENCES groups(id) ON DELETE SET NULL,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS tryout_config_items (
			id BIGSERIAL PRIMARY KEY,
			config_id BIGINT NOT NULL REFERENCES tryout_configs(id) ON DELETE CASCADE,
			category_id BIGINT NOT NULL REFERENCES question_categories(id) ON DELETE CASCADE,
			question_count INT NOT NULL DEFAULT 10
		);
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

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS point_wallets (
			user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			balance BIGINT NOT NULL DEFAULT 0,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS point_ledger (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			delta BIGINT NOT NULL,
			type TEXT NOT NULL,
			reason TEXT NOT NULL,
			created_by_admin BIGINT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS exp_wallets (
			user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			total_exp BIGINT NOT NULL DEFAULT 0,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS exp_ledger (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			delta BIGINT NOT NULL,
			type TEXT NOT NULL,
			reason TEXT NOT NULL,
			source_ref TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS exp_rules (
			rule_key TEXT PRIMARY KEY,
			rule_value BIGINT NOT NULL,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}
	_, _ = a.db.ExecContext(ctx, `INSERT INTO exp_rules (rule_key, rule_value) VALUES
		('quiz_complete', 5),
		('quiz_perfect', 15),
		('tryout_complete', 8),
		('tryout_perfect', 20),
		('level_step', 100),
		('reflection_daily', 15),
		('material_complete', 10),
		('feedback_submit', 5),
		('contribution_submit', 5),
		('contribution_approved', 50),
		('contribution_rejected', 5)
	ON CONFLICT (rule_key) DO NOTHING`)
	_, _ = a.db.ExecContext(ctx, `ALTER TABLE exp_rules ADD COLUMN IF NOT EXISTS point_bonus INT NOT NULL DEFAULT 0`)

	// AI Provider Settings (super_admin only)
	_, _ = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS ai_provider_settings (
			id INT PRIMARY KEY,
			provider TEXT NOT NULL DEFAULT 'sumopod',
			base_url TEXT NOT NULL DEFAULT 'https://ai.sumopod.com/v1/chat/completions',
			api_key TEXT NOT NULL DEFAULT '',
			model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
			temperature DOUBLE PRECISION NOT NULL DEFAULT 0.7,
			max_tokens INT NOT NULL DEFAULT 2000,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			updated_by BIGINT REFERENCES users(id),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	_, _ = a.db.ExecContext(ctx, `
		INSERT INTO ai_provider_settings (id, provider, base_url, api_key, model, temperature, max_tokens, is_active)
		VALUES (1, 'sumopod', 'https://ai.sumopod.com/v1/chat/completions', $1, 'gpt-4o-mini', 0.7, 2000, TRUE)
		ON CONFLICT (id) DO NOTHING
	`, os.Getenv("SUMOPOD_API_KEY"))
	_, _ = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS ai_provider_profiles (
			id BIGSERIAL PRIMARY KEY,
			name TEXT NOT NULL UNIQUE,
			provider TEXT NOT NULL DEFAULT 'sumopod',
			base_url TEXT NOT NULL,
			api_key TEXT NOT NULL DEFAULT '',
			model TEXT NOT NULL,
			temperature DOUBLE PRECISION NOT NULL DEFAULT 0.7,
			max_tokens INT NOT NULL DEFAULT 2000,
			is_active BOOLEAN NOT NULL DEFAULT FALSE,
			updated_by BIGINT REFERENCES users(id),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	_, _ = a.db.ExecContext(ctx, `
		INSERT INTO ai_provider_profiles (name, provider, base_url, api_key, model, temperature, max_tokens, is_active)
		SELECT 'default-sumopod', provider, base_url, api_key, model, temperature, max_tokens, TRUE
		FROM ai_provider_settings
		WHERE id=1
		  AND NOT EXISTS (SELECT 1 FROM ai_provider_profiles)
	`)

	// Badges
	_, _ = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS badge_definitions (
			id          BIGSERIAL PRIMARY KEY,
			name        TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			icon_url    TEXT NOT NULL DEFAULT '',
			badge_type  TEXT NOT NULL DEFAULT 'manual',
			trigger_key TEXT NOT NULL DEFAULT '',
			is_active   BOOLEAN NOT NULL DEFAULT TRUE,
			created_by  BIGINT REFERENCES users(id),
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	_, _ = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS participant_badges (
			id          BIGSERIAL PRIMARY KEY,
			user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			badge_id    BIGINT NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
			note        TEXT NOT NULL DEFAULT '',
			awarded_by  BIGINT REFERENCES users(id),
			awarded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS exp_report_settings (
			id INT PRIMARY KEY,
			time_of_day TEXT NOT NULL DEFAULT '10:00',
			timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			last_sent_at TIMESTAMPTZ,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}
	_, _ = a.db.ExecContext(ctx, `
		INSERT INTO exp_report_settings (id, time_of_day, timezone, is_active, updated_at)
		VALUES (1, '10:00', 'Asia/Jakarta', TRUE, NOW())
		ON CONFLICT (id) DO NOTHING
	`)

	if err := a.seedQuestionBankIfEmpty(ctx); err != nil {
		return err
	}

	if err := a.migrateParticipantsToUsers(ctx); err != nil {
		return err
	}

	// Redeem tables
	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS redeem_items (
			id SERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			point_cost INT NOT NULL,
			stock INT NOT NULL DEFAULT -1,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			image_url TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS redeem_claims (
			id SERIAL PRIMARY KEY,
			user_id BIGINT NOT NULL,
			item_id INT NOT NULL,
			item_name TEXT NOT NULL,
			point_cost INT NOT NULL,
			status TEXT NOT NULL DEFAULT 'pending',
			note TEXT NOT NULL DEFAULT '',
			claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS learning_materials (
			id          SERIAL PRIMARY KEY,
			category_id INT NOT NULL REFERENCES question_categories(id) ON DELETE CASCADE,
			title       TEXT NOT NULL,
			type        TEXT NOT NULL DEFAULT 'text',
			content     TEXT NOT NULL DEFAULT '',
			exp_reward  INT NOT NULL DEFAULT 10,
			order_no    INT NOT NULL DEFAULT 0,
			is_active   BOOLEAN NOT NULL DEFAULT TRUE,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS material_progress (
			id           BIGSERIAL PRIMARY KEY,
			user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			material_id  INT NOT NULL REFERENCES learning_materials(id) ON DELETE CASCADE,
			completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE(user_id, material_id)
		)
	`)
	if err != nil {
		return err
	}

	// ── Material Contributions ──────────────────────────────────────────────
	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS material_contributions (
			id             BIGSERIAL PRIMARY KEY,
			contributor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			category_id    INT NOT NULL REFERENCES question_categories(id) ON DELETE CASCADE,
			title          TEXT NOT NULL,
			type           TEXT NOT NULL DEFAULT 'text',
			content        TEXT NOT NULL,
			status         TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
			admin_feedback TEXT,
			reviewed_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
			reviewed_at    TIMESTAMPTZ,
			exp_awarded    INT DEFAULT 0,
			created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	// ── Groups (Multi-Tenant) ────────────────────────────────
	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS groups (
			id          SERIAL PRIMARY KEY,
			name        TEXT NOT NULL,
			code        TEXT NOT NULL UNIQUE,
			description TEXT NOT NULL DEFAULT '',
			is_active   BOOLEAN NOT NULL DEFAULT TRUE,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	// Tambah group_id ke participant_profiles (nullable = belum punya kelompok)
	_, _ = a.db.ExecContext(ctx, `ALTER TABLE participant_profiles ADD COLUMN IF NOT EXISTS group_id INT REFERENCES groups(id) ON DELETE SET NULL`)
	// Tambah jadwal pengingat refleksi personal per peserta (format HH:MM, nullable = pakai default 20:00)
	_, _ = a.db.ExecContext(ctx, `ALTER TABLE participant_profiles ADD COLUMN IF NOT EXISTS reflection_reminder_time TEXT`)

	// Tambah group_id ke question_categories (nullable = global/semua kelompok)
	_, _ = a.db.ExecContext(ctx, `ALTER TABLE question_categories ADD COLUMN IF NOT EXISTS group_id INT REFERENCES groups(id) ON DELETE SET NULL`)

	// Tambah group_id ke redeem_items (nullable = global/semua kelompok)
	_, _ = a.db.ExecContext(ctx, `ALTER TABLE redeem_items ADD COLUMN IF NOT EXISTS group_id INT REFERENCES groups(id) ON DELETE SET NULL`)

	// Promote designated super admin (Aldythya Nugraha)
	_, _ = a.db.ExecContext(ctx, `UPDATE users SET role='super_admin' WHERE phone='081284047501' AND role='admin'`)

	// Tabel feedback peserta
	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS feedbacks (
			id         BIGSERIAL PRIMARY KEY,
			user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			rating     INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
			message    TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	// Jadwal pengiriman feedback
	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS feedback_schedule (
			id             INT PRIMARY KEY DEFAULT 1,
			send_time      TEXT NOT NULL DEFAULT '09:00',
			is_active      BOOLEAN NOT NULL DEFAULT FALSE,
			last_sent_date DATE
		)
	`)
	if err != nil {
		return err
	}
	_, _ = a.db.ExecContext(ctx, `INSERT INTO feedback_schedule (id, send_time, is_active) VALUES (1, '09:00', FALSE) ON CONFLICT DO NOTHING`)
	_, _ = a.db.ExecContext(ctx, `ALTER TABLE feedback_schedule ADD COLUMN IF NOT EXISTS send_date DATE`)
	_, _ = a.db.ExecContext(ctx, `ALTER TABLE notes ADD COLUMN IF NOT EXISTS note_type TEXT NOT NULL DEFAULT 'permanent'`)
	_, _ = a.db.ExecContext(ctx, `ALTER TABLE notes ADD COLUMN IF NOT EXISTS source_bot TEXT`)

	// Tabel refleksi harian peserta
	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS reflections (
			id           BIGSERIAL PRIMARY KEY,
			user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			content      TEXT NOT NULL,
			reflected_date DATE NOT NULL DEFAULT CURRENT_DATE,
			created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE(user_id, reflected_date)
		)
	`)
	if err != nil {
		return err
	}

	// Roadmap Jabatan (v1 restart): only positions CRUD for now
	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS roadmap_positions (
			id          BIGSERIAL PRIMARY KEY,
			code        TEXT NOT NULL UNIQUE,
			name        TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			group_id    INT REFERENCES groups(id) ON DELETE SET NULL,
			is_active   BOOLEAN NOT NULL DEFAULT TRUE,
			created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
			updated_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil { return err }
	_, _ = a.db.ExecContext(ctx, `ALTER TABLE roadmap_positions ADD COLUMN IF NOT EXISTS code TEXT`)
	_, _ = a.db.ExecContext(ctx, `UPDATE roadmap_positions SET code = CONCAT('POS-', id) WHERE COALESCE(TRIM(code), '') = ''`)
	_, _ = a.db.ExecContext(ctx, `ALTER TABLE roadmap_positions ALTER COLUMN code SET NOT NULL`)
	_, _ = a.db.ExecContext(ctx, `CREATE UNIQUE INDEX IF NOT EXISTS roadmap_positions_code_uniq ON roadmap_positions(code)`)
	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS roadmap_competencies (
			id            BIGSERIAL PRIMARY KEY,
			position_id   BIGINT NOT NULL REFERENCES roadmap_positions(id) ON DELETE CASCADE,
			code          TEXT NOT NULL,
			name          TEXT NOT NULL,
			description   TEXT NOT NULL DEFAULT '',
			is_active     BOOLEAN NOT NULL DEFAULT TRUE,
			created_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
			updated_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
			created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE(position_id, code)
		)
	`)
	if err != nil { return err }
	_, _ = a.db.ExecContext(ctx, `CREATE INDEX IF NOT EXISTS roadmap_competencies_position_idx ON roadmap_competencies(position_id)`)
	_, err = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS roadmap_materials (
			id             BIGSERIAL PRIMARY KEY,
			competency_id  BIGINT NOT NULL REFERENCES roadmap_competencies(id) ON DELETE CASCADE,
			title          TEXT NOT NULL,
			content        TEXT NOT NULL DEFAULT '',
			is_active      BOOLEAN NOT NULL DEFAULT TRUE,
			created_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
			updated_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
			created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE(competency_id, title)
		)
	`)
	if err != nil { return err }
	_, _ = a.db.ExecContext(ctx, `CREATE INDEX IF NOT EXISTS roadmap_materials_competency_idx ON roadmap_materials(competency_id)`)
	// Roadmap extensions from previous iterations are disabled for now
	_, _ = a.db.ExecContext(ctx, `DROP TABLE IF EXISTS roadmap_notes CASCADE`)
	_, _ = a.db.ExecContext(ctx, `DROP TABLE IF EXISTS roadmap_categories CASCADE`)
	_, _ = a.db.ExecContext(ctx, `DROP TABLE IF EXISTS category_roadmaps CASCADE`)

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
	// Ambil nama dari participant_profiles jika ada
	var name string
	_ = a.db.QueryRowContext(r.Context(), `SELECT COALESCE(name,'') FROM participant_profiles WHERE user_id=$1`, u.ID).Scan(&name)
	writeJSON(w, http.StatusOK, map[string]any{
		"id":                   u.ID,
		"phone":                u.Phone,
		"role":                 u.Role,
		"must_change_password": u.MustChangePassword,
		"name":                 name,
		"is_admin":             isAdmin(u),
		"is_super_admin":       isSuperAdmin(u),
	})
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
	// POST → update nama
	if r.Method == http.MethodPost {
		var req struct {
			Name string `json:"name"`
		}
		if json.NewDecoder(r.Body).Decode(&req) != nil || strings.TrimSpace(req.Name) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "nama tidak boleh kosong"})
			return
		}
		name := strings.TrimSpace(req.Name)
		if len([]rune(name)) > 60 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "nama maksimal 60 karakter"})
			return
		}
		_, err := a.db.ExecContext(r.Context(), `
			UPDATE participant_profiles SET name=$1, updated_at=NOW() WHERE user_id=$2`, name, u.ID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal update nama"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "name": name})
		return
	}
	var name, email, source, reflectionReminderTime string
	var groupID int64
	_ = a.db.QueryRowContext(r.Context(), `
		SELECT COALESCE(name,''), COALESCE(email,''), COALESCE(source,''), COALESCE(group_id,0), COALESCE(reflection_reminder_time,'20:00')
		FROM participant_profiles WHERE user_id=$1`, u.ID).Scan(&name, &email, &source, &groupID, &reflectionReminderTime)
	var groupName string
	if groupID > 0 {
		_ = a.db.QueryRowContext(r.Context(), `SELECT name FROM groups WHERE id=$1`, groupID).Scan(&groupName)
	}
	totalExp, _ := a.getExpTotal(r.Context(), u.ID)
	levelStep := a.getExpRuleValue(r.Context(), "level_step", 100)
	level, progress := calcLevel(totalExp, levelStep)
	writeJSON(w, http.StatusOK, map[string]any{
		"id": u.ID, "phone": u.Phone, "role": u.Role, "must_change_password": u.MustChangePassword,
		"name": name, "email": email, "source": source,
		"exp": totalExp, "level": level, "level_progress": progress, "level_step": levelStep,
		"group_id": groupID, "group_name": groupName,
		"reflection_reminder_time": reflectionReminderTime,
	})
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
	u, err := a.requireRole(r.Context(), r, "participant", "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	// Ambil group_id user yang sedang login
	var myGroupID int64
	_ = a.db.QueryRowContext(r.Context(), `SELECT COALESCE(group_id, 0) FROM participant_profiles WHERE user_id=$1`, u.ID).Scan(&myGroupID)

	// Query leaderboard: tampilkan semua peserta yang pernah tryout
	// Coba filter per kelompok dulu, jika kosong fallback ke global
	runLeader := func(gid int64) ([]map[string]any, error) {
		q := `SELECT tr.user_id,
			COALESCE(NULLIF(bp.registered_name,''), NULLIF(tr.display_name,''), tr.user_id) as name,
			COALESCE(NULLIF(bp.telegram_display,''), tr.user_id) as tg,
			MIN(tr.duration_seconds) as best_seconds,
			COUNT(*) FILTER (WHERE tr.all_correct) as perfect_count
		FROM tryout_results tr
		LEFT JOIN bot_profiles bp ON bp.user_id = tr.user_id`
		var args []any
		if gid > 0 {
			q += ` JOIN telegram_links tl ON tl.telegram_user_id = tr.user_id
			JOIN participant_profiles pp ON pp.user_id = tl.user_id AND pp.group_id = $1`
			args = append(args, gid)
		}
		q += ` GROUP BY tr.user_id, name, tg ORDER BY perfect_count DESC, best_seconds ASC, name ASC LIMIT 20`
		r2, err2 := a.db.QueryContext(r.Context(), q, args...)
		if err2 != nil {
			return nil, err2
		}
		defer r2.Close()
		var result []map[string]any
		rank := 1
		for r2.Next() {
			var uid, name, tg string
			var best, perfect int
			if r2.Scan(&uid, &name, &tg, &best, &perfect) == nil {
				result = append(result, map[string]any{
					"rank": rank, "name": name, "_uid": uid,
					"telegram": cleanTelegramHandle(tg),
					"best_seconds": best, "perfect_count": perfect,
					"badges": []any{},
				})
				rank++
			}
		}
		return result, nil
	}

	leaderItems, _ := runLeader(myGroupID)
	if len(leaderItems) == 0 && myGroupID > 0 {
		// Fallback global
		leaderItems, _ = runLeader(0)
	}

	// Fetch badges per item
	for i, it := range leaderItems {
		uid, _ := it["_uid"].(string)
		delete(leaderItems[i], "_uid")
		if uid == "" {
			continue
		}
		var webUID int64
		_ = a.db.QueryRowContext(r.Context(), `SELECT user_id FROM telegram_links WHERE telegram_user_id=$1`, uid).Scan(&webUID)
		if webUID == 0 {
			continue
		}
		type badgeMini struct{ Name, IconURL string }
		var badges []map[string]any
		bRows, _ := a.db.QueryContext(r.Context(), `
			SELECT bd.name, bd.icon_url FROM participant_badges pb
			JOIN badge_definitions bd ON bd.id = pb.badge_id
			WHERE pb.user_id=$1 ORDER BY pb.awarded_at DESC LIMIT 5`, webUID)
		if bRows != nil {
			for bRows.Next() {
				var bn, bi string
				if bRows.Scan(&bn, &bi) == nil {
					badges = append(badges, map[string]any{"name": bn, "icon_url": bi})
				}
			}
			bRows.Close()
		}
		if badges != nil {
			leaderItems[i]["badges"] = badges
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": leaderItems})
}

func (a *app) handleParticipantReminder(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant", "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var tgID string
	err = a.db.QueryRowContext(r.Context(), `SELECT telegram_user_id FROM telegram_links WHERE user_id = $1 LIMIT 1`, u.ID).Scan(&tgID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusOK, map[string]any{"active": false})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed load reminder"})
		return
	}
	rm, err := a.getStudyReminder(r.Context(), tgID)
	if err != nil || strings.TrimSpace(rm.TelegramUserID) == "" {
		writeJSON(w, http.StatusOK, map[string]any{"active": false})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"active": rm.Active, "time_of_day": rm.TimeOfDay, "timezone": rm.Timezone, "last_sent_at": rm.LastSentAt})
}

func (a *app) handleAdminReminders(w http.ResponseWriter, r *http.Request) {
	_, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	rows, err := a.db.QueryContext(r.Context(), `
		SELECT r.telegram_user_id, r.user_id, r.time_of_day, r.timezone, r.is_active, r.last_sent_at,
		       COALESCE(p.name, ''), COALESCE(u.phone, '')
		FROM study_reminders r
		LEFT JOIN users u ON u.id = r.user_id
		LEFT JOIN participant_profiles p ON p.user_id = r.user_id
		ORDER BY r.updated_at DESC
		LIMIT 300
	`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed load reminders"})
		return
	}
	defer rows.Close()
	items := []map[string]any{}
	for rows.Next() {
		var tgID string
		var userID int64
		var tod, tz, name, phone string
		var active bool
		var last sql.NullTime
		if rows.Scan(&tgID, &userID, &tod, &tz, &active, &last, &name, &phone) == nil {
			it := map[string]any{"telegram_user_id": tgID, "user_id": userID, "time_of_day": tod, "timezone": tz, "is_active": active, "name": name, "phone": phone}
			if last.Valid {
				it["last_sent_at"] = last.Time
			}
			items = append(items, it)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (a *app) handleParticipantPoints(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant", "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	bal, err := a.getPointBalance(r.Context(), u.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load points"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"balance": bal})
}

func (a *app) handleParticipantPointsHistory(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant", "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	rows, err := a.db.QueryContext(r.Context(), `
		SELECT delta, type, reason, created_at FROM point_ledger
		WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100
	`, u.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load point history"})
		return
	}
	defer rows.Close()
	items := []map[string]any{}
	for rows.Next() {
		var delta int64
		var typ, reason string
		var created time.Time
		if rows.Scan(&delta, &typ, &reason, &created) == nil {
			items = append(items, map[string]any{"delta": delta, "type": typ, "reason": reason, "created_at": created})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (a *app) handleAdminPointsAdjust(w http.ResponseWriter, r *http.Request) {
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
		Delta  int64  `json:"delta"`
		Reason string `json:"reason"`
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil || req.UserID == 0 || req.Delta == 0 || strings.TrimSpace(req.Reason) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "user_id, delta, reason wajib"})
		return
	}
	newBal, err := a.adjustPoints(r.Context(), req.UserID, req.Delta, "admin_adjust", req.Reason, &admin.ID)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	_ = a.logAdminAction(r.Context(), admin.ID, "points.adjust", fmt.Sprint(req.UserID), req)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "new_balance": newBal})
}

func (a *app) handleAdminPointsHistory(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	adminGID := a.getAdminGroupIDFromUser(r.Context(), admin)
	var rows *sql.Rows
	if adminGID > 0 {
		rows, err = a.db.QueryContext(r.Context(), `
			SELECT l.id, l.user_id, COALESCE(p.name,''), COALESCE(u.phone,''), l.delta, l.type, l.reason, l.created_by_admin, l.created_at
			FROM point_ledger l
			LEFT JOIN users u ON u.id = l.user_id
			LEFT JOIN participant_profiles p ON p.user_id = l.user_id
			WHERE p.group_id = $1
			ORDER BY l.created_at DESC LIMIT 300
		`, adminGID)
	} else {
		rows, err = a.db.QueryContext(r.Context(), `
			SELECT l.id, l.user_id, COALESCE(p.name,''), COALESCE(u.phone,''), l.delta, l.type, l.reason, l.created_by_admin, l.created_at
			FROM point_ledger l
			LEFT JOIN users u ON u.id = l.user_id
			LEFT JOIN participant_profiles p ON p.user_id = l.user_id
			ORDER BY l.created_at DESC LIMIT 300
		`)
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed point history"})
		return
	}
	defer rows.Close()
	items := []map[string]any{}
	for rows.Next() {
		var id, uid int64
		var name, phone, typ, reason string
		var delta int64
		var adminID sql.NullInt64
		var created time.Time
		if rows.Scan(&id, &uid, &name, &phone, &delta, &typ, &reason, &adminID, &created) == nil {
			it := map[string]any{"id": id, "user_id": uid, "name": name, "phone": phone, "delta": delta, "type": typ, "reason": reason, "created_at": created}
			if adminID.Valid {
				it["created_by_admin"] = adminID.Int64
			}
			items = append(items, it)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (a *app) handleAdminPointsUpdate(w http.ResponseWriter, r *http.Request) {
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
		ID     int64  `json:"id"`
		Delta  int64  `json:"delta"`
		Reason string `json:"reason"`
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil || req.ID == 0 || req.Delta == 0 || strings.TrimSpace(req.Reason) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id, delta, reason wajib"})
		return
	}
	var userID int64
	if err := a.db.QueryRowContext(r.Context(), `SELECT user_id FROM point_ledger WHERE id=$1`, req.ID).Scan(&userID); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "point entry tidak ditemukan"})
		return
	}
	_, err = a.db.ExecContext(r.Context(), `UPDATE point_ledger SET delta=$1, reason=$2 WHERE id=$3`, req.Delta, strings.TrimSpace(req.Reason), req.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed update point entry"})
		return
	}
	newBal, err := a.recalculateWalletByUserID(r.Context(), userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed recalculate wallet"})
		return
	}
	_ = a.logAdminAction(r.Context(), admin.ID, "points.update", fmt.Sprint(req.ID), req)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "new_balance": newBal})
}

func (a *app) handleAdminPointsDelete(w http.ResponseWriter, r *http.Request) {
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
		ID int64 `json:"id"`
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil || req.ID == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id wajib"})
		return
	}
	var userID int64
	if err := a.db.QueryRowContext(r.Context(), `SELECT user_id FROM point_ledger WHERE id=$1`, req.ID).Scan(&userID); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "point entry tidak ditemukan"})
		return
	}
	_, err = a.db.ExecContext(r.Context(), `DELETE FROM point_ledger WHERE id=$1`, req.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed delete point entry"})
		return
	}
	newBal, err := a.recalculateWalletByUserID(r.Context(), userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed recalculate wallet"})
		return
	}
	_ = a.logAdminAction(r.Context(), admin.ID, "points.delete", fmt.Sprint(req.ID), req)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "new_balance": newBal})
}

func (a *app) handleAdminPointsRecalculate(w http.ResponseWriter, r *http.Request) {
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
		UserID int64 `json:"user_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	if req.UserID > 0 {
		bal, err := a.recalculateWalletByUserID(r.Context(), req.UserID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed recalculate user"})
			return
		}
		_ = a.logAdminAction(r.Context(), admin.ID, "points.recalculate_user", fmt.Sprint(req.UserID), req)
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "user_id": req.UserID, "balance": bal})
		return
	}
	count, err := a.recalculateAllWallets(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed recalculate all"})
		return
	}
	_ = a.logAdminAction(r.Context(), admin.ID, "points.recalculate_all", "all", map[string]any{"count": count})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "recalculated_users": count})
}

func (a *app) handleAdminExpRules(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if r.Method == http.MethodGet {
		rows, err := a.db.QueryContext(r.Context(), `SELECT rule_key, rule_value, COALESCE(point_bonus,0), updated_at FROM exp_rules ORDER BY rule_key ASC`)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed load exp rules"})
			return
		}
		defer rows.Close()
		items := []map[string]any{}
		for rows.Next() {
			var k string
			var v, pb int64
			var at time.Time
			if rows.Scan(&k, &v, &pb, &at) == nil {
				items = append(items, map[string]any{"rule_key": k, "rule_value": v, "point_bonus": pb, "updated_at": at})
			}
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	var req struct {
		RuleKey    string `json:"rule_key"`
		RuleValue  int64  `json:"rule_value"`
		PointBonus int64  `json:"point_bonus"`
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil || strings.TrimSpace(req.RuleKey) == "" || req.RuleValue <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "rule_key dan rule_value wajib"})
		return
	}
	if req.PointBonus < 0 {
		req.PointBonus = 0
	}
	_, err = a.db.ExecContext(r.Context(), `
		INSERT INTO exp_rules (rule_key, rule_value, point_bonus, updated_at)
		VALUES ($1,$2,$3,NOW())
		ON CONFLICT (rule_key) DO UPDATE SET rule_value=EXCLUDED.rule_value, point_bonus=EXCLUDED.point_bonus, updated_at=NOW()
	`, strings.TrimSpace(req.RuleKey), req.RuleValue, req.PointBonus)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed update exp rule"})
		return
	}
	_ = a.logAdminAction(r.Context(), admin.ID, "exp.rule.update", req.RuleKey, req)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) handleAdminExpHistory(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	adminGID := a.getAdminGroupIDFromUser(r.Context(), admin)
	var rows *sql.Rows
	if adminGID > 0 {
		rows, err = a.db.QueryContext(r.Context(), `
			SELECT e.id, e.user_id, COALESCE(p.name,''), COALESCE(u.phone,''), e.delta, e.type, e.reason, e.source_ref, e.created_at
			FROM exp_ledger e
			LEFT JOIN users u ON u.id = e.user_id
			LEFT JOIN participant_profiles p ON p.user_id = e.user_id
			WHERE p.group_id = $1
			ORDER BY e.created_at DESC LIMIT 300
		`, adminGID)
	} else {
		rows, err = a.db.QueryContext(r.Context(), `
			SELECT e.id, e.user_id, COALESCE(p.name,''), COALESCE(u.phone,''), e.delta, e.type, e.reason, e.source_ref, e.created_at
			FROM exp_ledger e
			LEFT JOIN users u ON u.id = e.user_id
			LEFT JOIN participant_profiles p ON p.user_id = e.user_id
			ORDER BY e.created_at DESC LIMIT 300
		`)
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed load exp history"})
		return
	}
	defer rows.Close()
	items := []map[string]any{}
	for rows.Next() {
		var id, uid, delta int64
		var name, phone, typ, reason string
		var src sql.NullString
		var created time.Time
		if rows.Scan(&id, &uid, &name, &phone, &delta, &typ, &reason, &src, &created) == nil {
			it := map[string]any{"id": id, "user_id": uid, "name": name, "phone": phone, "delta": delta, "type": typ, "reason": reason, "created_at": created}
			if src.Valid {
				it["source_ref"] = src.String
			}
			items = append(items, it)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (a *app) handleAdminExpStatus(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	adminGID := a.getAdminGroupIDFromUser(r.Context(), admin)
	levelStep := a.getExpRuleValue(r.Context(), "level_step", 100)
	var rows *sql.Rows
	if adminGID > 0 {
		rows, err = a.db.QueryContext(r.Context(), `
			SELECT u.id, COALESCE(p.name,''), COALESCE(u.phone,''), COALESCE(w.total_exp,0)
			FROM users u
			LEFT JOIN participant_profiles p ON p.user_id = u.id
			LEFT JOIN exp_wallets w ON w.user_id = u.id
			WHERE p.group_id = $1
			ORDER BY COALESCE(w.total_exp,0) DESC, u.created_at ASC
			LIMIT 500
		`, adminGID)
	} else {
		rows, err = a.db.QueryContext(r.Context(), `
			SELECT u.id, COALESCE(p.name,''), COALESCE(u.phone,''), COALESCE(w.total_exp,0)
			FROM users u
			LEFT JOIN participant_profiles p ON p.user_id = u.id
			LEFT JOIN exp_wallets w ON w.user_id = u.id
			ORDER BY COALESCE(w.total_exp,0) DESC, u.created_at ASC
			LIMIT 500
		`)
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed load exp status"})
		return
	}
	defer rows.Close()
	items := []map[string]any{}
	for rows.Next() {
		var id, exp int64
		var name, phone string
		if rows.Scan(&id, &name, &phone, &exp) == nil {
			level, progress := calcLevel(exp, levelStep)
			items = append(items, map[string]any{"user_id": id, "name": name, "phone": phone, "exp": exp, "level": level, "progress": progress, "level_step": levelStep})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "level_step": levelStep})
}

func (a *app) handleAdminExpReportSetting(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if r.Method == http.MethodGet {
		var tm, tz string
		var active bool
		var last sql.NullTime
		err := a.db.QueryRowContext(r.Context(), `SELECT time_of_day, timezone, is_active, last_sent_at FROM exp_report_settings WHERE id=1`).Scan(&tm, &tz, &active, &last)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed load exp report setting"})
			return
		}
		resp := map[string]any{"time_of_day": tm, "timezone": tz, "is_active": active}
		if last.Valid {
			resp["last_sent_at"] = last.Time
		}
		writeJSON(w, http.StatusOK, resp)
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	var req struct {
		TimeOfDay string `json:"time_of_day"`
		Timezone  string `json:"timezone"`
		IsActive  *bool  `json:"is_active"`
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	tm, ok := normalizeTimeHHMM(req.TimeOfDay)
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "time_of_day wajib format HH:MM"})
		return
	}
	tz := strings.TrimSpace(req.Timezone)
	if tz == "" {
		tz = "Asia/Jakarta"
	}
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	_, err = a.db.ExecContext(r.Context(), `UPDATE exp_report_settings SET time_of_day=$1, timezone=$2, is_active=$3, updated_at=NOW() WHERE id=1`, tm, tz, active)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed update exp report setting"})
		return
	}
	_ = a.logAdminAction(r.Context(), admin.ID, "exp.report_setting.update", "exp_report_settings", map[string]any{"time_of_day": tm, "timezone": tz, "is_active": active})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) handleAdminExpReportSend(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	recipients, err := a.sendExpReportBroadcast(r.Context(), false)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed send exp report"})
		return
	}
	_ = a.logAdminAction(r.Context(), admin.ID, "exp.report.send_now", "participants", map[string]any{"recipients": recipients})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "recipients": recipients})
}

func (a *app) handleAdminPointBalances(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	adminGID := a.getAdminGroupIDFromUser(r.Context(), admin)
	var rows *sql.Rows
	if adminGID > 0 {
		rows, err = a.db.QueryContext(r.Context(), `
			SELECT u.id, COALESCE(p.name,''), COALESCE(u.phone,''), COALESCE(w.balance,0)
			FROM users u
			LEFT JOIN participant_profiles p ON p.user_id = u.id
			LEFT JOIN point_wallets w ON w.user_id = u.id
			WHERE p.group_id = $1
			ORDER BY COALESCE(w.balance,0) DESC, u.created_at ASC
			LIMIT 500
		`, adminGID)
	} else {
		rows, err = a.db.QueryContext(r.Context(), `
			SELECT u.id, COALESCE(p.name,''), COALESCE(u.phone,''), COALESCE(w.balance,0)
			FROM users u
			LEFT JOIN participant_profiles p ON p.user_id = u.id
			LEFT JOIN point_wallets w ON w.user_id = u.id
			ORDER BY COALESCE(w.balance,0) DESC, u.created_at ASC
			LIMIT 500
		`)
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed load balances"})
		return
	}
	defer rows.Close()
	items := []map[string]any{}
	for rows.Next() {
		var id int64
		var name, phone string
		var balance int64
		if rows.Scan(&id, &name, &phone, &balance) == nil {
			items = append(items, map[string]any{"user_id": id, "name": name, "phone": phone, "balance": balance})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (a *app) getPointBalance(ctx context.Context, userID int64) (int64, error) {
	_, err := a.db.ExecContext(ctx, `INSERT INTO point_wallets (user_id, balance, updated_at) VALUES ($1,0,NOW()) ON CONFLICT (user_id) DO NOTHING`, userID)
	if err != nil {
		return 0, err
	}
	var bal int64
	err = a.db.QueryRowContext(ctx, `SELECT balance FROM point_wallets WHERE user_id = $1`, userID).Scan(&bal)
	return bal, err
}

func (a *app) adjustPoints(ctx context.Context, userID, delta int64, typ, reason string, adminID *int64) (int64, error) {
	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `INSERT INTO point_wallets (user_id, balance, updated_at) VALUES ($1,0,NOW()) ON CONFLICT (user_id) DO NOTHING`, userID); err != nil {
		return 0, err
	}
	var bal int64
	if err := tx.QueryRowContext(ctx, `SELECT balance FROM point_wallets WHERE user_id=$1 FOR UPDATE`, userID).Scan(&bal); err != nil {
		return 0, err
	}
	newBal := bal + delta
	if newBal < 0 {
		return 0, errors.New("insufficient points")
	}
	if _, err := tx.ExecContext(ctx, `UPDATE point_wallets SET balance=$1, updated_at=NOW() WHERE user_id=$2`, newBal, userID); err != nil {
		return 0, err
	}
	var adminVal any = nil
	if adminID != nil {
		adminVal = *adminID
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO point_ledger (user_id, delta, type, reason, created_by_admin) VALUES ($1,$2,$3,$4,$5)`, userID, delta, typ, reason, adminVal); err != nil {
		return 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return newBal, nil
}

func (a *app) recalculateWalletByUserID(ctx context.Context, userID int64) (int64, error) {
	var sum sql.NullInt64
	if err := a.db.QueryRowContext(ctx, `SELECT COALESCE(SUM(delta),0) FROM point_ledger WHERE user_id=$1`, userID).Scan(&sum); err != nil {
		return 0, err
	}
	bal := int64(0)
	if sum.Valid {
		bal = sum.Int64
	}
	if _, err := a.db.ExecContext(ctx, `
		INSERT INTO point_wallets (user_id, balance, updated_at)
		VALUES ($1,$2,NOW())
		ON CONFLICT (user_id) DO UPDATE SET balance=EXCLUDED.balance, updated_at=NOW()
	`, userID, bal); err != nil {
		return 0, err
	}
	return bal, nil
}

func (a *app) recalculateAllWallets(ctx context.Context) (int, error) {
	rows, err := a.db.QueryContext(ctx, `SELECT DISTINCT user_id FROM point_ledger`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	count := 0
	for rows.Next() {
		var uid int64
		if rows.Scan(&uid) == nil {
			if _, err := a.recalculateWalletByUserID(ctx, uid); err == nil {
				count++
			}
		}
	}
	return count, rows.Err()
}

func (a *app) resolveWebUserIDByExternal(ctx context.Context, externalUserID string) (int64, error) {
	externalUserID = strings.TrimSpace(externalUserID)
	if externalUserID == "" {
		return 0, sql.ErrNoRows
	}
	if id, err := strconv.ParseInt(externalUserID, 10, 64); err == nil {
		var exists int64
		err = a.db.QueryRowContext(ctx, `SELECT id FROM users WHERE id=$1`, id).Scan(&exists)
		if err == nil {
			return exists, nil
		}
	}
	var userID int64
	err := a.db.QueryRowContext(ctx, `SELECT user_id FROM telegram_links WHERE telegram_user_id=$1`, externalUserID).Scan(&userID)
	return userID, err
}

func (a *app) getPointBonusRule(ctx context.Context, key string) int64 {
	var v int64
	_ = a.db.QueryRowContext(ctx, `SELECT COALESCE(point_bonus,0) FROM exp_rules WHERE rule_key=$1`, key).Scan(&v)
	return v
}

func (a *app) getExpRuleValue(ctx context.Context, key string, fallback int64) int64 {
	var v int64
	if err := a.db.QueryRowContext(ctx, `SELECT rule_value FROM exp_rules WHERE rule_key=$1`, key).Scan(&v); err == nil && v > 0 {
		return v
	}
	return fallback
}

func calcLevel(totalExp, levelStep int64) (int64, int64) {
	if levelStep <= 0 {
		levelStep = 100
	}
	level := (totalExp / levelStep) + 1
	progress := totalExp % levelStep
	return level, progress
}

func (a *app) getExpTotal(ctx context.Context, userID int64) (int64, error) {
	_, err := a.db.ExecContext(ctx, `INSERT INTO exp_wallets (user_id, total_exp, updated_at) VALUES ($1,0,NOW()) ON CONFLICT (user_id) DO NOTHING`, userID)
	if err != nil {
		return 0, err
	}
	var total int64
	err = a.db.QueryRowContext(ctx, `SELECT total_exp FROM exp_wallets WHERE user_id=$1`, userID).Scan(&total)
	return total, err
}

func (a *app) addExpByExternalUser(ctx context.Context, externalUserID string, delta int64, typ, reason, sourceRef string) (int64, error) {
	if delta <= 0 {
		return 0, nil
	}
	webUserID, err := a.resolveWebUserIDByExternal(ctx, externalUserID)
	if err != nil {
		return 0, err
	}
	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `INSERT INTO exp_wallets (user_id, total_exp, updated_at) VALUES ($1,0,NOW()) ON CONFLICT (user_id) DO NOTHING`, webUserID); err != nil {
		return 0, err
	}
	var total int64
	if err := tx.QueryRowContext(ctx, `SELECT total_exp FROM exp_wallets WHERE user_id=$1 FOR UPDATE`, webUserID).Scan(&total); err != nil {
		return 0, err
	}
	next := total + delta
	if _, err := tx.ExecContext(ctx, `UPDATE exp_wallets SET total_exp=$1, updated_at=NOW() WHERE user_id=$2`, next, webUserID); err != nil {
		return 0, err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO exp_ledger (user_id, delta, type, reason, source_ref) VALUES ($1,$2,$3,$4,$5)`, webUserID, delta, typ, reason, sourceRef); err != nil {
		return 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return next, nil
}

// applyRuleByExternalUser: apply EXP rule untuk external user (bot), termasuk point_bonus jika ada.
func (a *app) applyRuleByExternalUser(ctx context.Context, externalUserID, ruleKey, expTyp, reason, sourceRef string) {
	var expVal, pointBonus int64
	if err := a.db.QueryRowContext(ctx, `SELECT rule_value, COALESCE(point_bonus,0) FROM exp_rules WHERE rule_key=$1`, ruleKey).Scan(&expVal, &pointBonus); err != nil {
		return
	}
	if expVal > 0 {
		_, _ = a.addExpByExternalUser(ctx, externalUserID, expVal, expTyp, reason, sourceRef)
	}
	if pointBonus > 0 {
		if webUID, err := a.resolveWebUserIDByExternal(ctx, externalUserID); err == nil {
			_, _ = a.adjustPoints(ctx, webUID, pointBonus, "exp_rule_bonus", fmt.Sprintf("Bonus poin: %s", ruleKey), nil)
		}
	}
}

// applyExpRule memberi EXP sesuai rule_key, dan jika ada point_bonus > 0 juga memberi poin.
func (a *app) applyExpRule(ctx context.Context, userID int64, ruleKey, reason string) {
	var expVal, pointBonus int64
	if err := a.db.QueryRowContext(ctx, `SELECT rule_value, COALESCE(point_bonus,0) FROM exp_rules WHERE rule_key=$1`, ruleKey).Scan(&expVal, &pointBonus); err != nil {
		return
	}
	if expVal > 0 {
		_, _ = a.adjustExp(ctx, userID, expVal, reason)
	}
	if pointBonus > 0 {
		_, _ = a.adjustPoints(ctx, userID, pointBonus, "exp_rule_bonus", fmt.Sprintf("Bonus poin: %s", ruleKey), nil)
	}
}

func (a *app) adjustExp(ctx context.Context, userID int64, delta int64, reason string) (int64, error) {
	if delta <= 0 {
		return 0, nil
	}
	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `INSERT INTO exp_wallets (user_id, total_exp, updated_at) VALUES ($1,0,NOW()) ON CONFLICT (user_id) DO NOTHING`, userID); err != nil {
		return 0, err
	}
	var total int64
	if err := tx.QueryRowContext(ctx, `SELECT total_exp FROM exp_wallets WHERE user_id=$1 FOR UPDATE`, userID).Scan(&total); err != nil {
		return 0, err
	}
	next := total + delta
	if _, err := tx.ExecContext(ctx, `UPDATE exp_wallets SET total_exp=$1, updated_at=NOW() WHERE user_id=$2`, next, userID); err != nil {
		return 0, err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO exp_ledger (user_id, delta, type, reason, source_ref) VALUES ($1,$2,'materi',$3,'material_complete')`, userID, delta, reason); err != nil {
		return 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return next, nil
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
	admin, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	// Filter group: super_admin bisa pilih group_id dari query param, admin biasa wajib pakai group sendiri
	adminGroupID := a.getAdminGroupIDFromUser(r.Context(), admin)
	groupFilter := r.URL.Query().Get("group_id")
	effectiveGroupID := adminGroupID
	if isSuperAdmin(admin) && groupFilter != "" {
		effectiveGroupID, _ = strconv.ParseInt(groupFilter, 10, 64)
	}

	query := `
		SELECT u.id, u.phone, u.role, u.is_active, u.must_change_password,
		       COALESCE(p.name,''), COALESCE(p.email,''),
		       COALESCE(p.group_id, 0), COALESCE(g.name,'')
		FROM users u
		LEFT JOIN participant_profiles p ON p.user_id = u.id
		LEFT JOIN groups g ON g.id = p.group_id`
	args := []any{}
	if effectiveGroupID > 0 {
		query += ` WHERE p.group_id = $1`
		args = append(args, effectiveGroupID)
	}
	query += ` ORDER BY u.created_at DESC LIMIT 500`

	rows, err := a.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load participants"})
		return
	}
	defer rows.Close()
	items := []map[string]any{}
	for rows.Next() {
		var id, groupID int64
		var phone, role, name, email, groupName string
		var isActive, mustChange bool
		if rows.Scan(&id, &phone, &role, &isActive, &mustChange, &name, &email, &groupID, &groupName) == nil {
			items = append(items, map[string]any{
				"id": id, "phone": phone, "role": role,
				"is_active": isActive, "must_change_password": mustChange,
				"name": name, "email": email,
				"group_id": groupID, "group_name": groupName,
			})
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

func (a *app) handleAdminSetRole(w http.ResponseWriter, r *http.Request) {
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
		Role   string `json:"role"`
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil || req.UserID == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	role := strings.TrimSpace(strings.ToLower(req.Role))
	if role != "participant" && role != "admin" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "role must be participant/admin"})
		return
	}
	_, err = a.db.ExecContext(r.Context(), `UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2`, role, req.UserID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed set role"})
		return
	}
	_ = a.logAdminAction(r.Context(), admin.ID, "participants.set_role", fmt.Sprint(req.UserID), map[string]any{"user_id": req.UserID, "role": role})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) handleAdminSetSuperAdmin(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "super_admin")
	if err != nil {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "hanya super_admin yang bisa menggunakan endpoint ini"})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	var req struct {
		UserID int64  `json:"user_id"`
		Action string `json:"action"` // "promote" | "demote"
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil || req.UserID == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	// Tidak boleh demote diri sendiri
	if req.Action == "demote" && req.UserID == u.ID {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "tidak bisa demote diri sendiri"})
		return
	}
	newRole := "admin"
	if req.Action == "promote" {
		newRole = "super_admin"
	}
	_, err = a.db.ExecContext(r.Context(), `UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2`, newRole, req.UserID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal update role"})
		return
	}
	_ = a.logAdminAction(r.Context(), u.ID, "super_admin.set_role", fmt.Sprint(req.UserID), map[string]any{"user_id": req.UserID, "new_role": newRole})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "user_id": req.UserID, "new_role": newRole})
}

func (a *app) handleAdminDeleteParticipant(w http.ResponseWriter, r *http.Request) {
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
		UserID int64 `json:"user_id"`
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil || req.UserID == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	if req.UserID == admin.ID {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "cannot delete current admin account"})
		return
	}
	// Ambil phone dulu sebelum delete (untuk hapus dari tabel participants juga)
	var deletedPhone string
	_ = a.db.QueryRowContext(r.Context(), `SELECT phone FROM users WHERE id=$1`, req.UserID).Scan(&deletedPhone)

	_, err = a.db.ExecContext(r.Context(), `DELETE FROM users WHERE id=$1`, req.UserID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed delete user"})
		return
	}

	// Hapus juga dari tabel participants (legacy) agar migration tidak re-create user ini
	if deletedPhone != "" {
		_, _ = a.db.ExecContext(r.Context(), `DELETE FROM participants WHERE phone=$1`, deletedPhone)
	}

	_ = a.logAdminAction(r.Context(), admin.ID, "participants.delete", fmt.Sprint(req.UserID), map[string]any{"user_id": req.UserID})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) handleAdminCategories(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	adminGID := a.getAdminGroupIDFromUser(r.Context(), admin)
	switch r.Method {
	case http.MethodGet:
		var catQuery string
		var catArgs []any
		if adminGID > 0 {
			catQuery = `SELECT qc.id, qc.code, qc.name, qc.is_active, COALESCE(qc.group_id,0), COALESCE(g.name,'')
				FROM question_categories qc LEFT JOIN groups g ON g.id = qc.group_id
				WHERE qc.group_id = $1 ORDER BY qc.id DESC`
			catArgs = []any{adminGID}
		} else {
			catQuery = `SELECT qc.id, qc.code, qc.name, qc.is_active, COALESCE(qc.group_id,0), COALESCE(g.name,'')
				FROM question_categories qc LEFT JOIN groups g ON g.id = qc.group_id ORDER BY qc.id DESC`
		}
		rows, err := a.db.QueryContext(r.Context(), catQuery, catArgs...)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed categories"})
			return
		}
		defer rows.Close()
		items := []map[string]any{}
		for rows.Next() {
			var id, groupID int64
			var code, name, groupName string
			var active bool
			if rows.Scan(&id, &code, &name, &active, &groupID, &groupName) == nil {
				items = append(items, map[string]any{"id": id, "code": code, "name": name, "is_active": active, "group_id": groupID, "group_name": groupName})
			}
		}
		writeJSON(w, http.StatusOK, map[string]any{"categories": items})
	case http.MethodPost:
		var req struct {
			Action   string `json:"action"`
			ID       int64  `json:"id"`
			Code     string `json:"code"`
			Name     string `json:"name"`
			IsActive *bool  `json:"is_active"`
			GroupID  *int64 `json:"group_id"`
		}
		if json.NewDecoder(r.Body).Decode(&req) != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
			return
		}
		var groupIDVal any = nil
		if req.GroupID != nil && *req.GroupID > 0 {
			groupIDVal = *req.GroupID
		}
		// Admin biasa: default otomatis ke group admin jika frontend tidak kirim group_id
		if !isSuperAdmin(admin) && groupIDVal == nil && adminGID > 0 {
			groupIDVal = int64(adminGID)
		}
		if !isSuperAdmin(admin) && adminGID == 0 && (req.Action == "create" || req.Action == "update") {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "akun admin ini belum terhubung ke kelompok. minta super_admin set group dulu."})
			return
		}
		// Validasi: admin biasa tidak boleh konten global
		if req.Action == "create" || req.Action == "update" {
			if gErr := guardGlobalContent(admin, groupIDVal); gErr != nil {
				writeJSON(w, http.StatusForbidden, map[string]string{"error": gErr.Error()})
				return
			}
		}
		switch req.Action {
		case "create":
			_, err = a.db.ExecContext(r.Context(), `INSERT INTO question_categories(code,name,is_active,group_id) VALUES($1,$2,TRUE,$3)`, strings.ToLower(strings.TrimSpace(req.Code)), strings.TrimSpace(req.Name), groupIDVal)
		case "update":
			active := true
			if req.IsActive != nil {
				active = *req.IsActive
			}
			_, err = a.db.ExecContext(r.Context(), `UPDATE question_categories SET code=$1,name=$2,is_active=$3,group_id=$4,updated_at=NOW() WHERE id=$5`, strings.ToLower(strings.TrimSpace(req.Code)), strings.TrimSpace(req.Name), active, groupIDVal, req.ID)
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
	adminGIDQ := a.getAdminGroupIDFromUser(r.Context(), admin)
	switch r.Method {
	case http.MethodGet:
		var qRows *sql.Rows
		if adminGIDQ > 0 {
			qRows, err = a.db.QueryContext(r.Context(), `
				SELECT q.id,q.category_id,COALESCE(c.name,''),q.question_text,q.option_a,q.option_b,q.option_c,q.option_d,q.correct_option,q.is_active
				FROM questions q LEFT JOIN question_categories c ON c.id=q.category_id
				WHERE c.group_id = $1 ORDER BY q.id DESC LIMIT 300
			`, adminGIDQ)
		} else {
			qRows, err = a.db.QueryContext(r.Context(), `
				SELECT q.id,q.category_id,COALESCE(c.name,''),q.question_text,q.option_a,q.option_b,q.option_c,q.option_d,q.correct_option,q.is_active
				FROM questions q LEFT JOIN question_categories c ON c.id=q.category_id ORDER BY q.id DESC LIMIT 300
			`)
		}
		rows := qRows
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
		// Validasi: admin biasa tidak boleh tambah soal ke kategori global
		if (req.Action == "create" || req.Action == "update") && req.CategoryID > 0 && !isSuperAdmin(admin) {
			var catGroupID *int64
			_ = a.db.QueryRowContext(r.Context(), `SELECT group_id FROM question_categories WHERE id=$1`, req.CategoryID).Scan(&catGroupID)
			if catGroupID == nil {
				writeJSON(w, http.StatusForbidden, map[string]string{"error": "admin hanya bisa mengelola soal di kategori yang terikat kelompok"})
				return
			}
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
	// super_admin punya akses ke semua role
	if u.Role == "super_admin" {
		return u, nil
	}
	for _, role := range roles {
		if u.Role == role {
			return u, nil
		}
	}
	return authUser{}, errors.New("forbidden")
}

// isAdmin — true untuk admin & super_admin
func isAdmin(u authUser) bool {
	return u.Role == "admin" || u.Role == "super_admin"
}

// isSuperAdmin — true hanya untuk super_admin
func isSuperAdmin(u authUser) bool {
	return u.Role == "super_admin"
}

// getAdminGroupID — kembalikan group_id admin (0 = super_admin/semua kelompok)
// Admin biasa hanya bisa lihat data kelompoknya sendiri
func (a *app) getAdminGroupIDFromUser(ctx context.Context, u authUser) int64 {
	if isSuperAdmin(u) {
		return 0 // super_admin lihat semua
	}
	var gid int64
	_ = a.db.QueryRowContext(ctx, `SELECT COALESCE(group_id,0) FROM participant_profiles WHERE user_id=$1`, u.ID).Scan(&gid)
	return gid
}

// guardGlobalContent — admin biasa WAJIB set group_id; hanya super_admin boleh global (group_id=nil)
// Mengembalikan error jika admin biasa coba buat/update konten global
func guardGlobalContent(u authUser, groupIDVal any) error {
	if isSuperAdmin(u) {
		return nil // super_admin bebas
	}
	// admin biasa: groupIDVal harus tidak nil/0
	if groupIDVal == nil {
		return errors.New("admin hanya bisa mengelola konten per kelompok — pilih kelompok terlebih dahulu")
	}
	if gid, ok := groupIDVal.(int64); ok && gid == 0 {
		return errors.New("admin hanya bisa mengelola konten per kelompok — pilih kelompok terlebih dahulu")
	}
	return nil
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
	// version tag: v20260311-redeem-fix
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

	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "service": "naik-kelas-backend", "db": "up", "version": "v20260312-change-password"})
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
		// Keyboard rating feedback
		if state == "feedback_rating" {
			kb := [][]string{{"1 ⭐", "2 ⭐⭐", "3 ⭐⭐⭐"}, {"4 ⭐⭐⭐⭐", "5 ⭐⭐⭐⭐⭐"}}
			if err := a.sendTelegramMessageWithKeyboard(r.Context(), upd.Message.Chat.ID, reply, kb); err != nil {
				log.Printf("telegram send keyboard error: %v", err)
			}
			writeJSON(w, http.StatusOK, map[string]any{"ok": true})
			return
		}

		// Untuk state yang membutuhkan keyboard kategori
		if state == "quiz_choose_category" || state == "materi_choose_category" {
			webUIDKb, _ := a.resolveWebUserIDByExternal(r.Context(), uid)
			groupIDKb := a.getUserGroupID(r.Context(), webUIDKb)
			cats, _ := a.getActiveCategoryNamesByGroup(r.Context(), groupIDKb)
			if len(cats) > 0 {
				// Bagi keyboard jadi baris 2 kolom
				var rows [][]string
				for i := 0; i < len(cats); i += 2 {
					row := []string{cats[i]}
					if i+1 < len(cats) {
						row = append(row, cats[i+1])
					}
					rows = append(rows, row)
				}
				if err := a.sendTelegramMessageWithKeyboard(r.Context(), upd.Message.Chat.ID, reply, rows); err != nil {
					log.Printf("telegram send keyboard error: %v", err)
				}
			} else {
				if err := a.sendTelegramMessage(r.Context(), upd.Message.Chat.ID, reply, state); err != nil {
					log.Printf("telegram send error: %v", err)
				}
			}
		} else if strings.HasPrefix(reply, "§HTML§") && strings.Contains(reply, "§BUBBLES§") {
			// Multi-bubble: kirim header + semua bubble sebagai pesan terpisah
			parts := strings.SplitN(reply, "§BUBBLES§", 2)
			header := strings.TrimPrefix(parts[0], "§HTML§")
			chatID := upd.Message.Chat.ID
			// Kirim header
			_ = a.sendTelegramHTMLMessage(r.Context(), chatID, header)
			// Ambil bubbles dari session
			sess := a.botSessions[uid]
			if sess != nil && len(sess.MateriBubbles) > 0 {
				for i, bubble := range sess.MateriBubbles {
					time.Sleep(300 * time.Millisecond)
					htmlBubble := markdownToTelegramHTML(bubble)
					isLast := i == len(sess.MateriBubbles)-1
					if isLast {
						footer := "\n\n──────────────\nKetik <b>selesai</b> jika sudah baca ✅\nKetik <b>kembali</b> untuk list materi\nKetik /batal untuk keluar"
						htmlBubble += footer
					}
					_ = a.sendTelegramHTMLMessage(r.Context(), chatID, htmlBubble)
				}
			}
		} else if strings.HasPrefix(reply, "§HTML§") {
			htmlMsg := strings.TrimPrefix(reply, "§HTML§")
			if err := a.sendTelegramHTMLMessage(r.Context(), upd.Message.Chat.ID, htmlMsg); err != nil {
				log.Printf("telegram html send error: %v", err)
			}
		} else {
			if err := a.sendTelegramMessage(r.Context(), upd.Message.Chat.ID, reply, state); err != nil {
				log.Printf("telegram send error: %v", err)
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *app) syncTelegramBotCommands(ctx context.Context) error {
	if strings.TrimSpace(a.telegramBotToken) == "" {
		return nil
	}
	commands := []map[string]string{
		{"command": "start", "description": "🏠 Tampilkan menu utama Nala"},
		{"command": "daftar", "description": "📝 Daftar sebagai peserta baru"},
		{"command": "cek", "description": "🔍 Cek status pendaftaranmu"},
		{"command": "materi", "description": "📚 Belajar materi per kategori"},
		{"command": "quiz", "description": "🧠 Latihan soal per kategori"},
		{"command": "tryout", "description": "🚀 Simulasi tryout soal acak"},
		{"command": "leaderbot", "description": "🏆 Papan ranking tryout tercepat"},
		{"command": "status", "description": "📊 Lihat level, EXP & poin kamu"},
		{"command": "exp", "description": "⭐ Detail EXP dan progress level"},
		{"command": "poin", "description": "💰 Saldo & riwayat transaksi poin"},
		{"command": "redeem", "description": "🎁 Tukar poin dengan hadiah"},
		{"command": "catatan", "description": "📝 Simpan catatan sementara"},
		{"command": "refleksi", "description": "📔 Tulis refleksi & jurnal harianmu"},
		{"command": "jadwal_belajar", "description": "⏰ Atur pengingat belajar harian"},
		{"command": "jadwal_refleksi", "description": "⏰ Atur pengingat refleksi harian"},
		{"command": "feedback", "description": "💬 Beri masukan untuk aplikasi Naik Kelas"},
		{"command": "batal", "description": "❌ Batalkan proses yang sedang berjalan"},
	}
	payload := map[string]any{"commands": commands}
	b, _ := json.Marshal(payload)
	url := fmt.Sprintf("https://api.telegram.org/bot%s/setMyCommands", a.telegramBotToken)
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
		return fmt.Errorf("setMyCommands status %d", resp.StatusCode)
	}
	return nil
}

// markdownToTelegramHTML mengkonversi Markdown sederhana ke HTML yang didukung Telegram.
// Mendukung: **bold**, *bold*, _italic_, __italic__, ~~strikethrough~~,
//            # Heading, ## Heading, ### Heading,
//            - item / * item (bullet), 1. item (numbered),
//            `code`, ```code block```, > quote, --- (separator)
func markdownToTelegramHTML(md string) string {
	lines := strings.Split(md, "\n")
	var out []string
	inCodeBlock := false
	var codeBlockLines []string

	for _, line := range lines {
		// Code block
		if strings.HasPrefix(line, "```") {
			if inCodeBlock {
				inCodeBlock = false
				code := strings.Join(codeBlockLines, "\n")
				out = append(out, "<pre>"+htmlEscape(code)+"</pre>")
				codeBlockLines = nil
			} else {
				inCodeBlock = true
			}
			continue
		}
		if inCodeBlock {
			codeBlockLines = append(codeBlockLines, line)
			continue
		}

		// Separator
		if strings.TrimSpace(line) == "---" || strings.TrimSpace(line) == "***" {
			out = append(out, "──────────────")
			continue
		}

		// Heading
		if strings.HasPrefix(line, "### ") {
			out = append(out, "<b>"+inlineFormat(strings.TrimPrefix(line, "### "))+"</b>")
			continue
		}
		if strings.HasPrefix(line, "## ") {
			out = append(out, "\n<b>"+inlineFormat(strings.TrimPrefix(line, "## "))+"</b>")
			continue
		}
		if strings.HasPrefix(line, "# ") {
			out = append(out, "\n<b>📌 "+inlineFormat(strings.TrimPrefix(line, "# "))+"</b>")
			continue
		}

		// Blockquote
		if strings.HasPrefix(line, "> ") {
			out = append(out, "│ <i>"+inlineFormat(strings.TrimPrefix(line, "> "))+"</i>")
			continue
		}

		// Bullet list
		if strings.HasPrefix(line, "- ") || strings.HasPrefix(line, "* ") {
			content := line[2:]
			out = append(out, "• "+inlineFormat(content))
			continue
		}

		// Numbered list (1. 2. dst)
		if len(line) >= 3 {
			dotIdx := strings.Index(line, ". ")
			if dotIdx > 0 && dotIdx <= 3 {
				num := line[:dotIdx]
				allDigit := true
				for _, c := range num {
					if c < '0' || c > '9' {
						allDigit = false
						break
					}
				}
				if allDigit {
					out = append(out, num+". "+inlineFormat(line[dotIdx+2:]))
					continue
				}
			}
		}

		// Baris biasa
		out = append(out, inlineFormat(line))
	}

	return strings.Join(out, "\n")
}

// inlineFormat memproses formatting inline: bold, italic, code, strikethrough
func inlineFormat(s string) string {
	// Escape HTML dulu pada bagian non-format
	// Proses dalam urutan: ```inline code``` → bold → italic → strikethrough
	var result strings.Builder
	i := 0
	runes := []rune(s)
	n := len(runes)

	for i < n {
		// Inline code `...`
		if runes[i] == '`' {
			end := -1
			for j := i + 1; j < n; j++ {
				if runes[j] == '`' {
					end = j
					break
				}
			}
			if end > i {
				result.WriteString("<code>" + htmlEscape(string(runes[i+1:end])) + "</code>")
				i = end + 1
				continue
			}
		}
		// Bold **text** atau __text__
		if i+1 < n && ((runes[i] == '*' && runes[i+1] == '*') || (runes[i] == '_' && runes[i+1] == '_')) {
			marker := string(runes[i : i+2])
			end := strings.Index(string(runes[i+2:]), marker)
			if end >= 0 {
				inner := string(runes[i+2 : i+2+end])
				result.WriteString("<b>" + htmlEscape(inner) + "</b>")
				i = i + 2 + end + 2
				continue
			}
		}
		// Italic *text* atau _text_
		if runes[i] == '*' || runes[i] == '_' {
			marker := string(runes[i])
			end := strings.Index(string(runes[i+1:]), marker)
			if end >= 0 {
				inner := string(runes[i+1 : i+1+end])
				result.WriteString("<i>" + htmlEscape(inner) + "</i>")
				i = i + 1 + end + 1
				continue
			}
		}
		// Strikethrough ~~text~~
		if i+1 < n && runes[i] == '~' && runes[i+1] == '~' {
			end := strings.Index(string(runes[i+2:]), "~~")
			if end >= 0 {
				inner := string(runes[i+2 : i+2+end])
				result.WriteString("<s>" + htmlEscape(inner) + "</s>")
				i = i + 2 + end + 2
				continue
			}
		}
		// Karakter biasa — escape HTML
		ch := string(runes[i])
		result.WriteString(htmlEscape(ch))
		i++
	}
	return result.String()
}

func htmlEscape(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	return s
}

func (a *app) sendTelegramHTMLMessage(ctx context.Context, chatID int64, html string) error {
	if a.telegramBotToken == "" {
		return nil
	}
	body, _ := json.Marshal(map[string]any{
		"chat_id":    chatID,
		"text":       html,
		"parse_mode": "HTML",
	})
	resp, err := http.Post(
		fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", a.telegramBotToken),
		"application/json", bytes.NewReader(body),
	)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

func (a *app) sendTelegramMessage(ctx context.Context, chatID int64, text, state string) error {
	payload := map[string]any{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "Markdown",
	}

	switch state {
	case "quiz_answering", "tryout_answering":
		payload["reply_markup"] = map[string]any{
			"keyboard":          [][]string{{"A", "B", "C", "D"}},
			"resize_keyboard":   true,
			"one_time_keyboard": false,
		}
	case "jadwal_menu":
		payload["reply_markup"] = map[string]any{
			"keyboard":          [][]string{{"ingatkan", "ingatkanku"}, {"ubahingat", "hapusingat"}},
			"resize_keyboard":   true,
			"one_time_keyboard": true,
		}
	case "poin_menu":
		payload["reply_markup"] = map[string]any{
			"keyboard":          [][]string{{"saldo saya", "transaksi saya"}},
			"resize_keyboard":   true,
			"one_time_keyboard": true,
		}
	case "redeem_confirm":
		payload["reply_markup"] = map[string]any{
			"keyboard":          [][]string{{"ya", "tidak"}},
			"resize_keyboard":   true,
			"one_time_keyboard": true,
		}
	case "quiz_choose_category":
		// keyboard diisi dinamis di handleTelegramWebhook via sendTelegramMessageWithKeyboard
		payload["reply_markup"] = map[string]any{
			"remove_keyboard": true,
		}
	default:
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

func (a *app) sendTelegramMessageWithKeyboard(ctx context.Context, chatID int64, text string, keyboard [][]string) error {
	payload := map[string]any{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "Markdown",
		"reply_markup": map[string]any{
			"keyboard":          keyboard,
			"resize_keyboard":   true,
			"one_time_keyboard": true,
		},
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

func (a *app) saveBotSessionState(ctx context.Context, uid, state string) {
	_, _ = a.db.ExecContext(ctx, `
		INSERT INTO bot_session_states (telegram_user_id, state, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (telegram_user_id) DO UPDATE SET state=EXCLUDED.state, updated_at=NOW()
	`, uid, state)
}

func (a *app) loadBotSessionState(ctx context.Context, uid string) string {
	var state string
	if err := a.db.QueryRowContext(ctx, `SELECT state FROM bot_session_states WHERE telegram_user_id=$1 AND updated_at > NOW() - INTERVAL '30 minutes'`, uid).Scan(&state); err != nil {
		return "idle"
	}
	return state
}

func (a *app) processBotText(ctx context.Context, uid, displayName, text string) (reply, state string) {
	a.mu.Lock()
	s := a.botSessions[uid]
	if s == nil {
		// Coba restore state dari DB (untuk kasus server restart)
		dbState := a.loadBotSessionState(ctx, uid)
		s = &botSession{State: dbState, UpdatedAt: time.Now()}
		a.botSessions[uid] = s
	}
	sessionExpired := false
	if time.Since(s.UpdatedAt) > 15*time.Minute && s.State != "idle" {
		sessionExpired = true
		s.State, s.Name, s.Phone, s.QuizCategory, s.QuizIndex, s.QuizAnswers, s.TryoutQuestions, s.TryoutAnswers = "idle", "", "", "", 0, nil, nil, nil
		s.TryoutStartedAt = time.Time{}
	}
	a.mu.Unlock()

	if sessionExpired {
		lower2 := strings.ToLower(strings.TrimSpace(text))
		// Kalau user kirim command baru, lanjutkan normal — jangan potong di sini
		if !strings.HasPrefix(lower2, "/") {
			return "Sesi kamu sudah habis karena tidak ada aktivitas selama 15 menit 😴\nKetik /start untuk mulai lagi ya!", "idle"
		}
	}

	lower := strings.ToLower(strings.TrimSpace(text))

	// ── Catatan Sementara via Bot ─────────────────────────────────────
	if strings.HasPrefix(lower, "/catatan") || strings.HasPrefix(lower, "catat :") || strings.HasPrefix(lower, "catat:") {
		var noteText string
		switch {
		case strings.HasPrefix(lower, "/catatan"):
			noteText = strings.TrimSpace(text[len("/catatan"):])
		case strings.HasPrefix(lower, "catat :"):
			noteText = strings.TrimSpace(text[len("catat :"):])
		default:
			noteText = strings.TrimSpace(text[len("catat:"):])
		}
		if noteText == "" {
			return "📝 Kirim catatan sementaramu\\!\n\nContoh:\n`Catat : abis belajar banyak hal tentang K3 hari ini`\n\nCatatan akan tersimpan di menu *Catatan* di portal web\\.", "idle"
		}
		// Resolve web user_id
		var webUID int64
		_ = a.db.QueryRowContext(ctx, `SELECT user_id FROM telegram_links WHERE telegram_user_id=$1 LIMIT 1`, uid).Scan(&webUID)
		if webUID == 0 {
			return "Kamu belum terdaftar\\. Ketik /daftar dulu ya\\!", "idle"
		}
		// Buat judul otomatis dari 5 kata pertama
		words := strings.Fields(noteText)
		titleWords := words
		if len(titleWords) > 6 { titleWords = titleWords[:6] }
		autoTitle := strings.Join(titleWords, " ")
		if len(words) > 6 { autoTitle += "…" }
		// Simpan sebagai fleeting note
		var noteID int64
		saveErr := a.db.QueryRowContext(ctx, `
			INSERT INTO notes(user_id, title, content, note_type, source_bot)
			VALUES($1,$2,$3,'fleeting','telegram') RETURNING id`,
			webUID, autoTitle, noteText).Scan(&noteID)
		if saveErr != nil {
			return "Maaf, gagal simpan catatan 🙏 Coba lagi ya\\.", "idle"
		}
		return fmt.Sprintf("📝 Catatan sementara tersimpan\\!\n\n_%s_\n\nBuka portal web untuk lihat & ubah jadi catatan permanen\\.", escapeMD(noteText)), "idle"
	}

	// ── Refleksi Harian ──────────────────────────────────────────────
	if lower == "/refleksi" {
		registered, err := a.isRegisteredBotUser(ctx, uid)
		if err != nil {
			return "Maaf, Nala lagi kesulitan cek akunmu 🙏", "idle"
		}
		if !registered {
			return "Kamu belum terdaftar. Ketik /daftar dulu ya ✨", "idle"
		}
		// Cek apakah sudah refleksi hari ini
		webUID, err := a.resolveWebUserIDByExternal(ctx, uid)
		if err == nil {
			var existingID int64
			if a.db.QueryRowContext(ctx, `SELECT id FROM reflections WHERE user_id=$1 AND reflected_date=CURRENT_DATE`, webUID).Scan(&existingID) == nil {
				return "Kamu sudah menulis refleksi hari ini 📔✅\n\nSampai jumpa besok\\! Tetap semangat belajar\\! 💪", "idle"
			}
		}
		a.mu.Lock()
		s.State = "wait_reflection"
		s.UpdatedAt = time.Now()
		a.mu.Unlock()
		a.saveBotSessionState(ctx, uid, "wait_reflection")
		return "📔 *Yuk, Ceritakan Harimu\\!*\n\n_Tulis bebas, tidak ada jawaban yang salah_ 🤍\n\n• Apa yang kamu pelajari hari ini?\n• Apa yang kamu rasakan?\n• Adakah hal yang ingin kamu syukuri atau perbaiki?\n\n_Ketik /batal untuk membatalkan_", "wait_reflection"
	}

	// ── Jadwal Refleksi ──────────────────────────────────────────────
	if lower == "/jadwal_refleksi" {
		registered, err := a.isRegisteredBotUser(ctx, uid)
		if err != nil {
			return "Maaf, Nala lagi kesulitan cek akunmu 🙏", "idle"
		}
		if !registered {
			return "Kamu belum terdaftar. Ketik /daftar dulu ya ✨", "idle"
		}
		// Tampil jadwal saat ini
		webUID, _ := a.resolveWebUserIDByExternal(ctx, uid)
		var currentTime string
		_ = a.db.QueryRowContext(ctx, `SELECT COALESCE(reflection_reminder_time, '20:00') FROM participant_profiles WHERE user_id=$1`, webUID).Scan(&currentTime)
		return fmt.Sprintf("⏰ *Jadwal Pengingat Refleksi*\n\nJadwal aktifmu saat ini: *%s WIB*\n\nKirimkan jam baru untuk mengubahnya\\.\nFormat: *HH:MM* \\(contoh: 20:00 atau 19:30\\)\n\n_Ketik /batal untuk membatalkan_", currentTime), "refleksi_set_time"
	}

	if s.State == "refleksi_set_time" {
		timeInput := strings.TrimSpace(text)
		valid := len(timeInput) == 5 && timeInput[2] == ':'
		if valid {
			parts := strings.Split(timeInput, ":")
			h, e1 := strconv.Atoi(parts[0])
			m, e2 := strconv.Atoi(parts[1])
			valid = e1 == nil && e2 == nil && h >= 0 && h <= 23 && m >= 0 && m <= 59
		}
		if !valid {
			return "Format tidak valid\\. Kirim dalam format *HH:MM* ya\\, contoh: *20:00*", "refleksi_set_time"
		}
		webUID3, err3 := a.resolveWebUserIDByExternal(ctx, uid)
		if err3 != nil {
			return "Maaf, Nala kesulitan menyimpan data 🙏", "refleksi_set_time"
		}
		_, _ = a.db.ExecContext(ctx, `UPDATE participant_profiles SET reflection_reminder_time=$1 WHERE user_id=$2`, timeInput, webUID3)
		a.resetSession(uid)
		return fmt.Sprintf("✅ Jadwal pengingat refleksi diset ke *%s WIB*\\!\n\nNala akan mengingatkanmu setiap hari pada jam tersebut 🌙", timeInput), "idle"
	}

	if s.State == "wait_reflection" {
		// Jika user kirim command, batalkan mode refleksi dulu
		if strings.HasPrefix(lower, "/") {
			a.resetSession(uid)
			a.saveBotSessionState(ctx, uid, "idle")
			// Lanjutkan proses command seperti biasa (jangan return di sini)
			goto handleCommands
		}
		if len(strings.TrimSpace(text)) < 10 {
			return "Hmm, ceritakan sedikit lebih banyak ya 🙏\nNala ingin tahu lebih banyak tentang harimu hari ini 😊", "wait_reflection"
		}
		webUID, err := a.resolveWebUserIDByExternal(ctx, uid)
		if err != nil {
			return "Maaf, Nala kesulitan menyimpan refleksimu saat ini 🙏\nCoba lagi ya.", "wait_reflection"
		}
		// Simpan ke DB
		_, dbErr := a.db.ExecContext(ctx, `
			INSERT INTO reflections (user_id, content, reflected_date)
			VALUES ($1, $2, CURRENT_DATE)
			ON CONFLICT (user_id, reflected_date) DO UPDATE SET content=EXCLUDED.content, created_at=NOW()
		`, webUID, strings.TrimSpace(text))
		if dbErr != nil {
			return "Maaf, terjadi kesalahan saat menyimpan 🙏", "wait_reflection"
		}
		// Beri EXP + poin bonus
		expVal := a.getExpRuleValue(ctx, "reflection_daily", 15)
		a.applyExpRule(ctx, webUID, "reflection_daily", "Refleksi harian")
		// Auto-badge check
		go a.checkAndAwardAutoBadges(context.Background(), webUID, "reflection_streak_7")
		// Pilih response motivasi
		responses := []string{
			"Terima kasih sudah berbagi, *%s*\\! 🤍\n\nMenuliskan apa yang kamu rasakan adalah langkah kecil yang luar biasa\\. Nala bangga kamu meluangkan waktu untuk ini\\.\n\n✨ *\\+%d EXP* sudah kamu dapatkan\\!\nSampai besok\\! 🌙",
			"Wah, harimu penuh cerita ya, *%s*\\! 📔\n\nIngat, setiap hari adalah kesempatan baru untuk bertumbuh\\. Kamu sudah melakukan hal yang tepat hari ini\\!\n\n✨ *\\+%d EXP* untukmu\\!\nIstirahat yang cukup ya 💙",
			"Nala senang kamu mau berbagi, *%s*\\! 🌸\n\nRefleksi seperti ini membantu kita jadi lebih sadar diri dan berkembang\\. Teruskan kebiasaan baik ini ya\\!\n\n✨ *\\+%d EXP* sudah ditambahkan\\!\nSemangat untuk esok hari\\! 🌅",
			"Bagus sekali, *%s*\\! Konsistensi adalah kunci 🗝️\n\nJangan lupa bahwa setiap tulisanmu hari ini adalah bukti kamu peduli pada dirimu sendiri\\.\n\n✨ *\\+%d EXP* berhasil kamu raih\\!\nNala selalu ada besok ya 🤍",
		}
		// Pilih response berdasarkan hash uid
		idx := 0
		for _, c := range uid {
			idx += int(c)
		}
		// Get nama peserta
		name := "kamu"
		var pName string
		if err2 := a.db.QueryRowContext(ctx, `SELECT COALESCE(name,'') FROM participant_profiles WHERE user_id=$1`, webUID).Scan(&pName); err2 == nil && pName != "" {
			name = strings.Split(pName, " ")[0] // Nama depan
		}
		msg := fmt.Sprintf(responses[idx%len(responses)], name, expVal)
		a.resetSession(uid)
		a.saveBotSessionState(ctx, uid, "idle")
		return msg, "idle"
	}

	// ── Feedback ──────────────────────────────────────────────────────
	if lower == "/feedback" {
		return "💬 *Feedback untuk Naik Kelas*\n\nHai\\! Nala ingin tahu pendapatmu tentang aplikasi ini 🙏\n\nBerikan penilaianmu dari skala *1 sampai 5*:\n\n⭐ 1 \\— Sangat kurang\n⭐⭐ 2 \\— Kurang\n⭐⭐⭐ 3 \\— Cukup\n⭐⭐⭐⭐ 4 \\— Bagus\n⭐⭐⭐⭐⭐ 5 \\— Sangat bagus\n\nKetik angka *1\\-5* sekarang\\!", "feedback_rating"
	}

	if s.State == "feedback_rating" {
		// Support input "1 ⭐" dari keyboard atau "1" langsung
		ratingStr := strings.TrimSpace(strings.Split(text, " ")[0])
		rating, convErr := strconv.Atoi(ratingStr)
		if convErr != nil || rating < 1 || rating > 5 {
			return "Ketik angka *1 sampai 5* ya 😊", "feedback_rating"
		}
		s.FeedbackRating = rating
		a.botSessions[uid] = s
		stars := strings.Repeat("⭐", rating)
		return fmt.Sprintf("Kamu memberi nilai *%s* \\(%d/5\\)\\!\n\nAda pesan atau saran tambahan untuk Naik Kelas? 💬\n_\\(Boleh dilewati, ketik *skip* jika tidak ada\\)_", stars, rating), "feedback_message"
	}

	if s.State == "feedback_message" {
		msg := strings.TrimSpace(text)
		if strings.ToLower(msg) == "skip" {
			msg = ""
		}
		// Simpan feedback — ambil user_id jika terdaftar, else simpan dengan tg_uid
		var fbUserID int64
		if webUID, err2 := a.resolveWebUserIDByExternal(ctx, uid); err2 == nil {
			fbUserID = webUID
		}
		if fbUserID > 0 {
			_, _ = a.db.ExecContext(ctx, `INSERT INTO feedbacks (user_id, rating, message) VALUES ($1,$2,$3)`, fbUserID, s.FeedbackRating, msg)
			// EXP + bonus poin dari rule feedback_submit
			a.applyExpRule(ctx, fbUserID, "feedback_submit", "Mengirim feedback aplikasi")
			// Auto-badge check
			go a.checkAndAwardAutoBadges(context.Background(), fbUserID, "feedback_submit")
		}
		stars := strings.Repeat("⭐", s.FeedbackRating)
		a.resetSession(uid)
		thankMsg := []string{
			"Terima kasih atas masukannya\\! 🙏\nFeedbackmu sangat berarti untuk pengembangan Naik Kelas ke depannya\\. 💙",
			"Makasih ya sudah meluangkan waktu untuk kasih feedback\\! 🤍\nNala dan tim akan terus berusaha memberikan yang terbaik\\!",
			"Wah, terima kasih banyak\\! 🌸\nSetiap masukan dari kamu membantu Naik Kelas jadi lebih baik\\!",
		}
		hashIdx := 0
		for _, c := range uid {
			hashIdx += int(c)
		}
		return fmt.Sprintf("✅ *Feedback diterima\\!*\n\nPenilaian: %s\n\n%s", stars, thankMsg[hashIdx%len(thankMsg)]), "idle"
	}

handleCommands:
	if lower == "/batal" {
		a.resetSession(uid)
		a.saveBotSessionState(ctx, uid, "idle")
		return "Oke, proses dibatalkan dulu ya 🙂\nKapan pun siap, ketik /daftar, /quiz, atau /tryout untuk mulai lagi.", "idle"
	}
	if lower == "/start" {
		a.resetSession(uid)
		return "Halo\\! Perkenalkan, saya *Nala* ✨\nAsisten belajar pintarmu di *Naik Kelas* 🎓\n\n🌐 *Portal Web:* [naikkelas\\.web\\.id](https://naikkelas.web.id)\nAkses materi, catatan, & profil lengkapmu di sana\\!\n\n━━━━━━━━━━━━━━━\n📚 *Belajar*\n/materi \\— Belajar materi per kategori\n/quiz \\— Latihan soal pilihan ganda\n/tryout \\— Simulasi tryout soal acak\n/leaderbot \\— Papan ranking tryout 🏆\n\n━━━━━━━━━━━━━━━\n👤 *Akun & Progress*\n/daftar \\— Daftar sebagai peserta baru\n/cek \\— Cek status pendaftaran\n/status \\— Level, EXP & saldo poin\n/exp \\— Detail progress levelmu ⭐\n/poin \\— Riwayat transaksi poin 💰\n\n━━━━━━━━━━━━━━━\n🎁 *Reward*\n/redeem \\— Tukar poin dengan hadiah\n\n━━━━━━━━━━━━━━━\n📝 *Catatan Sementara*\n`Catat : isi catatan` \\— Simpan catatan cepat\n\n━━━━━━━━━━━━━━━\n📔 *Refleksi Diri*\n/refleksi \\— Tulis jurnal & refleksi harianmu\n\n━━━━━━━━━━━━━━━\n⏰ *Pengingat*\n/jadwal\\_belajar \\— Atur pengingat belajar harian\n/jadwal\\_refleksi \\— Atur pengingat refleksi harian\n\n💬 /feedback \\— Beri masukan untuk aplikasi ini\n\n❌ /batal \\— Batalkan proses yang sedang berjalan\n━━━━━━━━━━━━━━━\n\nAda yang bisa Nala bantu? Yuk mulai belajar\\! 💪", "idle"
	}
	if lower == "/daftar" {
		a.mu.Lock()
		a.botSessions[uid] = &botSession{State: "wait_name", UpdatedAt: time.Now()}
		a.mu.Unlock()
		return "Siap! Kita mulai ya 😊\nSilakan kirim nama lengkap kamu dulu.", "wait_name"
	}
	if lower == "/cek" {
		// Coba auto-sync dulu dari telegram_links
		var autoPhone string
		_ = a.db.QueryRowContext(ctx, `
			SELECT pp.phone FROM telegram_links tl
			JOIN participant_profiles pp ON pp.user_id = tl.user_id
			WHERE tl.telegram_user_id = $1 LIMIT 1
		`, uid).Scan(&autoPhone)
		if autoPhone != "" {
			p, found, err := a.findParticipantByPhone(ctx, autoPhone)
			if err == nil && found {
				return fmt.Sprintf("Status pendaftaran kamu ✅\n\n*Nama:* %s\n*No HP:* %s\n*Email:* %s\n\nAkun Telegram sudah tersinkron 🔗", p.Name, p.Phone, p.Email), "idle"
			}
		}
		a.mu.Lock()
		a.botSessions[uid] = &botSession{State: "check_phone", UpdatedAt: time.Now()}
		a.mu.Unlock()
		return "Siap, Nala bantu cek ✅\nKirim nomor HP yang ingin dicek ya.", "check_phone"
	}
	if lower == "/materi" {
		registered, err := a.isRegisteredBotUser(ctx, uid)
		if err != nil {
			return "Maaf, Nala lagi kesulitan cek data pendaftaran 🙏\nCoba lagi sebentar ya.", "idle"
		}
		if !registered {
			return "Sebelum akses materi, kamu perlu daftar dulu ya ✨\nKetik /daftar untuk registrasi.", "idle"
		}
		webUID2, _ := a.resolveWebUserIDByExternal(ctx, uid)
		groupID2 := a.getUserGroupID(ctx, webUID2)
		cats, err := a.getActiveCategoryNamesByGroup(ctx, groupID2)
		if err != nil || len(cats) == 0 {
			return "Maaf, belum ada materi tersedia saat ini 🙏", "idle"
		}
		catsText := ""
		for i, c := range cats {
			catsText += fmt.Sprintf("%d. %s\n", i+1, c)
		}
		a.botSessions[uid] = &botSession{State: "materi_choose_category", UpdatedAt: time.Now()}
		return fmt.Sprintf("📚 *Materi Belajar Naik Kelas*\n\nPilih kategori yang ingin kamu pelajari:\n\n%s\nKetik nomor kategorinya ya!", catsText), "materi_choose_category"
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
		return "Siap, kita mulai Quiz Naik Kelas! 🧠\nPilih kategori yang ingin kamu latih:\n\n" + catsText, "quiz_choose_category"
	}
	if lower == "/tryout" {
		registered, err := a.isRegisteredBotUser(ctx, uid)
		if err != nil {
			return "Maaf, Nala lagi kesulitan cek data pendaftaran 🙏\nCoba lagi sebentar ya.", "idle"
		}
		if !registered {
			return "Sebelum ikut tryout, kamu perlu daftar dulu ya ✨\nKetik /daftar untuk registrasi dulu.", "idle"
		}
		// Coba pakai config tryout dari admin kelompok
		var webUIDForConfig int64
		_ = a.db.QueryRowContext(ctx, `SELECT user_id FROM telegram_links WHERE telegram_user_id=$1 LIMIT 1`, uid).Scan(&webUIDForConfig)
		var groupIDForConfig int64
		if webUIDForConfig > 0 {
			_ = a.db.QueryRowContext(ctx, `SELECT COALESCE(group_id,0) FROM participant_profiles WHERE user_id=$1`, webUIDForConfig).Scan(&groupIDForConfig)
		}
		var qs []quizQuestion
		if groupIDForConfig > 0 {
			qs, err = a.shuffledTryoutQuestionsFromConfig(ctx, groupIDForConfig)
		}
		if err != nil || len(qs) == 0 {
			qs, err = a.shuffledTryoutQuestionsDB(ctx)
		}
		if err != nil || len(qs) == 0 {
			qs = shuffledTryoutQuestions()
		}
		a.mu.Lock()
		a.botSessions[uid] = &botSession{State: "tryout_answering", TryoutQuestions: qs, TryoutAnswers: []string{}, TryoutStartedAt: time.Now(), DisplayName: displayName, UpdatedAt: time.Now()}
		a.mu.Unlock()
		return fmt.Sprintf("🚀 *Tryout dimulai!*\n%d soal acak menunggumu.\nTimer berjalan sekarang ⏱\n\n%s", len(qs), formatTryoutQuestion(qs, 0)), "tryout_answering"
	}
	if lower == "/leaderbot" || lower == "/leaderboard" {
		// Ambil group_id user via telegram link
		var myGroupID int64
		if webUID, err2 := a.resolveWebUserIDByExternal(ctx, uid); err2 == nil {
			_ = a.db.QueryRowContext(ctx, `SELECT COALESCE(group_id,0) FROM participant_profiles WHERE user_id=$1`, webUID).Scan(&myGroupID)
		}
		board, err := a.getTryoutLeaderboardByGroup(ctx, 10, myGroupID)
		if err != nil {
			return "Maaf, Nala belum bisa ambil leaderboard saat ini 🙏", "idle"
		}
		if board == "" {
			return "Leaderboard masih kosong. Yuk mulai dulu dengan /tryout 🔥", "idle"
		}
		return board, "idle"
	}
	if lower == "/exp" {
		registered, err := a.isRegisteredBotUser(ctx, uid)
		if err != nil {
			return "Maaf, Nala lagi kesulitan cek akunmu 🙏", "idle"
		}
		if !registered {
			return "Kamu belum terdaftar. Ketik /daftar dulu ya ✨", "idle"
		}
		webUserID, err := a.resolveWebUserIDByExternal(ctx, uid)
		if err != nil {
			return "Akunmu belum tersinkron. Coba /daftar ulang ya 🙏", "idle"
		}
		totalExp, err := a.getExpTotal(ctx, webUserID)
		if err != nil {
			return "Maaf, belum bisa ambil data EXP sekarang 🙏", "idle"
		}
		levelStep := a.getExpRuleValue(ctx, "level_step", 100)
		level, progress := calcLevel(totalExp, levelStep)
		return fmt.Sprintf("EXP kamu saat ini: %d ✨\nLevel: %d\nProgress ke level berikutnya: %d/%d", totalExp, level, progress, levelStep), "idle"
	}

	if lower == "/status" {
		registered, err := a.isRegisteredBotUser(ctx, uid)
		if err != nil {
			return "Maaf, Nala lagi kesulitan cek akunmu 🙏", "idle"
		}
		if !registered {
			return "Kamu belum terdaftar. Ketik /daftar dulu ya ✨", "idle"
		}
		webUserID, err := a.resolveWebUserIDByExternal(ctx, uid)
		if err != nil {
			return "Akunmu belum tersinkron. Coba /daftar ulang ya 🙏", "idle"
		}
		totalExp, err := a.getExpTotal(ctx, webUserID)
		if err != nil {
			return "Maaf, belum bisa ambil data status sekarang 🙏", "idle"
		}
		bal, err := a.getPointBalance(ctx, webUserID)
		if err != nil {
			return "Maaf, belum bisa ambil data status sekarang 🙏", "idle"
		}
		levelStep := a.getExpRuleValue(ctx, "level_step", 100)
		level, progress := calcLevel(totalExp, levelStep)
		return fmt.Sprintf("Status Belajar Kamu 👤\n- Level: %d\n- EXP: %d ✨\n- Progress: %d/%d\n- Poin: %d 🌟", level, totalExp, progress, levelStep, bal), "idle"
	}

	if lower == "/poin" {
		registered, err := a.isRegisteredBotUser(ctx, uid)
		if err != nil {
			return "Maaf, Nala lagi kesulitan cek akunmu 🙏", "idle"
		}
		if !registered {
			return "Kamu belum terdaftar. Ketik /daftar dulu ya ✨", "idle"
		}
		a.mu.Lock()
		s.State = "poin_menu"
		s.UpdatedAt = time.Now()
		a.mu.Unlock()
		return "Menu Poin 🌟\nPilih salah satu:\n- saldo saya\n- transaksi saya", "poin_menu"
	}

	if lower == "/redeem" {
		registered, err := a.isRegisteredBotUser(ctx, uid)
		if err != nil {
			return "Maaf, Nala lagi kesulitan cek akunmu 🙏", "idle"
		}
		if !registered {
			return "Sebelum redeem, kamu perlu daftar dulu ya ✨\nKetik /daftar untuk registrasi.", "idle"
		}
		webUserID, err := a.resolveWebUserIDByExternal(ctx, uid)
		if err != nil {
			return "Akunmu belum tersinkron. Coba /daftar ulang ya 🙏", "idle"
		}
		bal, err := a.getPointBalance(ctx, webUserID)
		if err != nil {
			return "Maaf, belum bisa ambil saldo poin sekarang 🙏", "idle"
		}
		items, err := a.getActiveRedeemItems(ctx)
		if err != nil || len(items) == 0 {
			return "Belum ada hadiah yang tersedia untuk ditukar saat ini 😕\nCek lagi nanti ya!", "idle"
		}
		var lines []string
		lines = append(lines, fmt.Sprintf("🎁 *Menu Redeem Poin*\nSaldo kamu: *%d poin* 🌟\n", bal))
		for i, it := range items {
			stock := "∞"
			if it.Stock >= 0 {
				stock = fmt.Sprintf("%d", it.Stock)
			}
			lines = append(lines, fmt.Sprintf("%d. *%s*\n   💰 %d poin | Stok: %s\n   _%s_", i+1, it.Name, it.PointCost, stock, it.Description))
		}
		lines = append(lines, "\nKirim *nomor hadiah* yang ingin kamu tukar (contoh: 1)")
		a.mu.Lock()
		s.State = "redeem_choose"
		s.UpdatedAt = time.Now()
		a.mu.Unlock()
		return strings.Join(lines, "\n"), "redeem_choose"
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
		s.Email = email
		s.State = "wait_group"
		s.UpdatedAt = time.Now()
		a.mu.Unlock()
		// Ambil daftar kelompok aktif
		groups, _ := a.getActiveGroups(ctx)
		if len(groups) == 0 {
			// Tidak ada kelompok → langsung selesai tanpa kelompok
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
			return fmt.Sprintf("🎉 *Yeay! Pendaftaran berhasil!*\n\nHai *%s*, selamat bergabung di Naik Kelas! 🎓\nMulai belajar sekarang:\n/materi — Belajar materi 📚\n/quiz — Latihan soal 🧠\n/tryout — Simulasi soal 🚀", name), "idle"
		}
		groupList := ""
		for _, g := range groups {
			groupList += fmt.Sprintf("• *%s* — kode: `%s`\n", g.Name, g.Code)
		}
		return fmt.Sprintf("Hampir selesai! 🎯\nSekarang ketik *kode kelompok* kamu:\n\n%s\nContoh: ketik `PTIAS` untuk bergabung di PT IAS.", groupList), "wait_group"

	case "wait_group":
		code := strings.ToUpper(strings.TrimSpace(text))
		var groupID int
		var groupName string
		err := a.db.QueryRowContext(ctx, `SELECT id, name FROM groups WHERE code=$1 AND is_active=TRUE`, code).Scan(&groupID, &groupName)
		if err != nil {
			// Tampilkan daftar kelompok lagi
			groups, _ := a.getActiveGroups(ctx)
			groupList := ""
			for _, g := range groups {
				groupList += fmt.Sprintf("• *%s* — kode: `%s`\n", g.Name, g.Code)
			}
			return fmt.Sprintf("Kode kelompok tidak ditemukan 😕\nCoba ketik ulang kode yang benar ya:\n\n%s", groupList), "wait_group"
		}
		a.mu.Lock()
		name := s.Name
		phone := s.Phone
		email := s.Email
		a.mu.Unlock()
		var createErr error
		_, createErr = a.createParticipantRecord(ctx, createParticipantRequest{Name: name, Phone: phone, Email: email, Source: "bot-naik-kelas"})
		if createErr != nil {
			if errors.Is(createErr, errConflict) {
				a.resetSession(uid)
				return "Nomor HP ini sudah pernah terdaftar ✅", "idle"
			}
			return "Maaf, Nala lagi kesulitan menyimpan data 🙏\nCoba lagi sebentar ya.", "wait_group"
		}
		_ = a.saveBotProfile(ctx, uid, name, displayName)
		_ = a.linkTelegramToParticipant(ctx, uid, displayName, name, phone, email, "bot-naik-kelas")
		// Assign ke kelompok — ambil user_id dari users.phone (ID yang benar)
		_, _ = a.db.ExecContext(ctx, `
			UPDATE participant_profiles SET group_id=$1
			WHERE user_id = (SELECT id FROM users WHERE phone=$2)
		`, groupID, phone)
		a.resetSession(uid)
		return fmt.Sprintf("🎉 *Yeay! Pendaftaran berhasil!*\n\nHai *%s*, selamat bergabung di *%s*! 🎓\nAkun Telegram kamu sudah Nala daftarkan.\n\nMulai belajar sekarang:\n/materi — Belajar materi 📚\n/quiz — Latihan soal 🧠\n/tryout — Simulasi soal 🚀\n/jadwal\\_belajar — Atur pengingat ⏰", name, groupName), "idle"

	case "check_phone":
		phone := normalizePhone(text)
		if len(phone) < 9 {
			return "Nomor HP belum valid. Coba kirim lagi ya (contoh: 0812xxxxxxx).", "check_phone"
		}
		p, found, err := a.findParticipantByPhone(ctx, phone)
		if err != nil {
			return "Maaf, Nala lagi kesulitan terhubung ke server 🙏\nCoba lagi sebentar ya.", "check_phone"
		}
		a.resetSession(uid)
		if found {
			// Auto-sync Telegram ke akun
			_ = a.saveBotProfile(ctx, uid, p.Name, displayName)
			_ = a.linkTelegramToParticipant(ctx, uid, displayName, p.Name, p.Phone, p.Email, p.Source)
			return fmt.Sprintf("Nomor ini sudah terdaftar ✅\n\n*Nama:* %s\n*No HP:* %s\n*Email:* %s\n\nAkun Telegram kamu sudah Nala sinkronkan 🔗", p.Name, p.Phone, p.Email), "idle"
		}
		return "Nomor ini belum terdaftar ya 😕\nYuk daftar sekarang dengan ketik /daftar ✨", "idle"

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
		totalSoal := len(cat.Items)
		if totalSoal < 5 {
			// Langsung mulai tanpa tanya jumlah kalau soal < 5
			a.mu.Lock()
			s.QuizCategory = cat.Code
			s.QuizCount = totalSoal
			s.State = "quiz_answering"
			s.QuizIndex = 0
			s.QuizAnswers = []string{}
			s.UpdatedAt = time.Now()
			a.mu.Unlock()
			return "Kategori: *" + escapeMD(cat.Name) + "* ✅\nJawab semua " + fmt.Sprint(totalSoal) + " soal ya. Nanti Nala cek di akhir\\.\n\n" + formatQuizQuestion(cat, 0), "quiz_answering"
		}
		a.mu.Lock()
		s.QuizCategory = cat.Code
		s.QuizCount = 0
		s.State = "quiz_choose_count"
		s.UpdatedAt = time.Now()
		a.mu.Unlock()
		return fmt.Sprintf("Kategori: *%s* ✅\n\nBerapa soal yang ingin kamu kerjakan\\?\n\n📝 Minimal *5 soal*, maksimal *%d soal* \\(semua soal tersedia\\)\\.\n\nKetik angkanya:", escapeMD(cat.Name), totalSoal), "quiz_choose_count"

	case "quiz_choose_count":
		cat, ok, err := a.findQuizCategoryDB(ctx, s.QuizCategory)
		if err != nil || !ok {
			a.resetSession(uid)
			return "Kategori tidak ditemukan\\. Ketik /quiz untuk mulai lagi\\.", "idle"
		}
		totalSoal := len(cat.Items)
		n, parseErr := strconv.Atoi(strings.TrimSpace(text))
		if parseErr != nil || n < 5 {
			return fmt.Sprintf("Masukkan angka yang valid\\. Minimal *5 soal* ya\\! \\(tersedia %d soal\\)", totalSoal), "quiz_choose_count"
		}
		if n > totalSoal {
			return fmt.Sprintf("Maksimal *%d soal* \\(sesuai jumlah soal di kategori ini\\)\\. Coba lagi:", totalSoal), "quiz_choose_count"
		}
		// Acak soal dan ambil n soal, simpan ke session
		shuffled := make([]quizQuestion, len(cat.Items))
		copy(shuffled, cat.Items)
		randSrc := rand.New(rand.NewSource(time.Now().UnixNano()))
		randSrc.Shuffle(len(shuffled), func(i, j int) { shuffled[i], shuffled[j] = shuffled[j], shuffled[i] })
		selectedItems := shuffled[:n]
		// Simpan ke TryoutQuestions (reuse slot) sebagai soal quiz terpilih
		savedQ := make([]quizQuestion, n)
		copy(savedQ, selectedItems)
		cat.Items = selectedItems
		a.mu.Lock()
		s.QuizCount = n
		s.TryoutQuestions = savedQ // simpan soal terpilih
		s.State = "quiz_answering"
		s.QuizIndex = 0
		s.QuizAnswers = []string{}
		s.UpdatedAt = time.Now()
		a.mu.Unlock()
		return fmt.Sprintf("Oke\\! Quiz *%s* dengan *%d soal* dimulai\\! 🎯\nJawab semua soal ya\\. Nanti Nala cek di akhir\\.\n\n", escapeMD(cat.Name), n) + formatQuizQuestion(cat, 0), "quiz_answering"

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
		// Jika user memilih jumlah soal custom, pakai soal yang disimpan di session
		a.mu.Lock()
		if s.QuizCount > 0 && len(s.TryoutQuestions) == s.QuizCount {
			cat.Items = append([]quizQuestion(nil), s.TryoutQuestions...)
		}
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
		// Buat recap jawaban
		var recap strings.Builder
		for i, q := range cat.Items {
			userAns := "-"
			if i < len(answers) {
				userAns = answers[i]
			}
			status := "✅"
			if userAns != q.Answer {
				status = "❌"
			}
			recap.WriteString(fmt.Sprintf("%s Soal %d: jawaban kamu *%s* (benar: *%s*)\n", status, i+1, userAns, q.Answer))
		}

		if wrong == 0 {
			attemptNo, _ := a.saveQuizAttempt(ctx, uid, displayName, cat, len(cat.Items), wrong, true)
			a.resetSession(uid)
			return fmt.Sprintf("🎉 *Luar biasa! Semua jawaban benar!*\nKategori: *%s*\nPercobaan ke-%d ✅\n\n%s\nKetik /quiz untuk latihan kategori lain, atau /tryout untuk tantangan lebih besar! 🚀", cat.Name, attemptNo, recap.String()), "idle"
		}

		attemptNo, _ := a.saveQuizAttempt(ctx, uid, displayName, cat, len(cat.Items), wrong, false)
		// Cek apakah ada materi untuk kategori ini → sarankan belajar dulu
		materiSuggest := ""
		var catIDForSuggest int
		if err2 := a.db.QueryRowContext(ctx, `SELECT id FROM question_categories WHERE name=$1`, cat.Name).Scan(&catIDForSuggest); err2 == nil {
			var materiCount int
			_ = a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM learning_materials WHERE category_id=$1 AND is_active=TRUE`, catIDForSuggest).Scan(&materiCount)
			if materiCount > 0 {
				materiSuggest = fmt.Sprintf("\n\n💡 *Tips:* Ada *%d materi* yang bisa kamu pelajari dulu untuk kategori ini!\nKetik /materi untuk buka materi belajar 📚", materiCount)
			}
		}
		a.mu.Lock()
		s.State = "quiz_answering"
		s.QuizIndex = 0
		s.QuizAnswers = []string{}
		s.UpdatedAt = time.Now()
		a.mu.Unlock()
		return fmt.Sprintf("💪 Hampir! Masih ada *%d* jawaban yang belum tepat.\nKategori: *%s* | Percobaan ke-%d\n\n%s%sYuk coba lagi dari soal pertama 🔁\n\n%s", wrong, cat.Name, attemptNo, recap.String(), materiSuggest, formatQuizQuestion(cat, 0)), "quiz_answering"

	case "poin_menu":
		if lower != "saldo saya" && lower != "transaksi saya" {
			return "Pilih salah satu ya:\n- saldo saya\n- transaksi saya", "poin_menu"
		}
		var webUserID int64
		if err := a.db.QueryRowContext(ctx, `SELECT user_id FROM telegram_links WHERE telegram_user_id = $1`, uid).Scan(&webUserID); err != nil {
			a.resetSession(uid)
			return "Akunmu belum tersinkron. Coba /daftar ulang ya 🙏", "idle"
		}
		if lower == "saldo saya" {
			bal, err := a.getPointBalance(ctx, webUserID)
			if err != nil {
				return "Maaf, belum bisa ambil saldo poin sekarang 🙏", "poin_menu"
			}
			return fmt.Sprintf("Saldo poin kamu saat ini: %d poin 🌟", bal), "poin_menu"
		}
		rows, err := a.db.QueryContext(ctx, `
			SELECT delta, type, reason, created_at
			FROM point_ledger
			WHERE user_id = $1
			ORDER BY created_at DESC
			LIMIT 10
		`, webUserID)
		if err != nil {
			return "Maaf, belum bisa ambil riwayat transaksi sekarang 🙏", "poin_menu"
		}
		defer rows.Close()
		lines := []string{"Transaksi poin kamu (10 terbaru):"}
		i := 0
		for rows.Next() {
			var delta int64
			var typ, reason string
			var created time.Time
			if rows.Scan(&delta, &typ, &reason, &created) == nil {
				i++
				sign := fmt.Sprintf("%d", delta)
				if delta > 0 {
					sign = fmt.Sprintf("+%d", delta)
				}
				lines = append(lines, fmt.Sprintf("%d) %s poin • %s • %s", i, sign, strings.TrimSpace(reason), created.In(time.FixedZone("WIB", 7*3600)).Format("02 Jan 2006 15:04 WIB")))
			}
		}
		if i == 0 {
			return "Belum ada transaksi poin untuk akunmu ya.", "poin_menu"
		}
		return strings.Join(lines, "\n"), "poin_menu"

	case "materi_choose_category":
		num, err2 := strconv.Atoi(strings.TrimSpace(text))
		webUID3, _ := a.resolveWebUserIDByExternal(ctx, uid)
		groupID3 := a.getUserGroupID(ctx, webUID3)
		cats, err3 := a.getActiveCategoryNamesByGroup(ctx, groupID3)
		if err2 != nil || err3 != nil || num < 1 || num > len(cats) {
			catsText := ""
			if err3 == nil {
				for i, c := range cats {
					catsText += fmt.Sprintf("%d. %s\n", i+1, c)
				}
			}
			return fmt.Sprintf("Ketik nomor kategori yang valid ya 😊\n\n%s", catsText), "materi_choose_category"
		}
		chosenCat := cats[num-1]
		// Ambil category_id
		var catID int
		if err4 := a.db.QueryRowContext(ctx, `SELECT id FROM question_categories WHERE name=$1 AND is_active=TRUE`, chosenCat).Scan(&catID); err4 != nil {
			return "Maaf, kategori tidak ditemukan 🙏", "idle"
		}
		// Ambil materi + progress peserta
		webUserID, _ := a.resolveWebUserIDByExternal(ctx, uid)
		rows, err5 := a.db.QueryContext(ctx, `
			SELECT lm.id, lm.title, lm.type, lm.content, lm.exp_reward, lm.order_no,
			       CASE WHEN mp.material_id IS NOT NULL THEN TRUE ELSE FALSE END
			FROM learning_materials lm
			LEFT JOIN material_progress mp ON mp.material_id = lm.id AND mp.user_id = $1
			WHERE lm.category_id = $2 AND lm.is_active = TRUE
			ORDER BY lm.order_no, lm.id
		`, webUserID, catID)
		if err5 != nil {
			return "Maaf, Nala lagi kesulitan ambil materi 🙏", "idle"
		}
		defer rows.Close()
		var items []botMateriItem
		for rows.Next() {
			var it botMateriItem
			if rows.Scan(&it.ID, &it.Title, &it.Type, &it.Content, &it.ExpReward, &it.OrderNo, &it.IsCompleted) == nil {
				items = append(items, it)
			}
		}
		if len(items) == 0 {
			return fmt.Sprintf("Belum ada materi untuk kategori *%s* saat ini 🙏\nCoba cek lagi nanti ya!", chosenCat), "idle"
		}
		s.MateriCategoryID = catID
		s.MateriCategoryName = chosenCat
		s.MateriList = items
		s.State = "materi_list"
		// Build list
		typeIcon := map[string]string{"text": "📖", "video": "🎬", "audio": "🎵"}
		lines := []string{fmt.Sprintf("📂 *Materi: %s* (%d materi)\n", chosenCat, len(items))}
		total, done := len(items), 0
		for _, it := range items {
			icon := typeIcon[it.Type]
			if icon == "" {
				icon = "📄"
			}
			status := "○"
			if it.IsCompleted {
				status = "✅"
				done++
			}
			lines = append(lines, fmt.Sprintf("%d. %s %s %s", items[0].OrderNo+len(lines)-1, icon, it.Title, status))
		}
		lines = append(lines, fmt.Sprintf("\nProgress: %d/%d selesai", done, total))
		lines = append(lines, "\nKetik *nomor* untuk membuka materi.")
		return strings.Join(lines, "\n"), "materi_list"

	case "materi_list":
		num, err2 := strconv.Atoi(strings.TrimSpace(text))
		if err2 != nil || num < 1 || num > len(s.MateriList) {
			return fmt.Sprintf("Ketik nomor materi yang valid (1–%d) ya 😊", len(s.MateriList)), "materi_list"
		}
		chosen := s.MateriList[num-1]
		s.MateriViewingID = chosen.ID
		s.MateriViewingExp = chosen.ExpReward
		s.State = "materi_viewing"
		typeLabel := map[string]string{"text": "📖 Bacaan", "video": "🎬 Video", "audio": "🎵 Audio"}
		label := typeLabel[chosen.Type]
		if label == "" {
			label = "📄 Materi"
		}
		var msg string
		// Parse content — bisa JSON array (multi-bubble) atau teks biasa
		var bubbles []string
		if strings.HasPrefix(strings.TrimSpace(chosen.Content), "[") {
			if err2 := json.Unmarshal([]byte(chosen.Content), &bubbles); err2 != nil {
				bubbles = []string{chosen.Content}
			}
		} else {
			bubbles = []string{chosen.Content}
		}

		switch chosen.Type {
		case "text":
			alreadyDone := ""
			if chosen.IsCompleted {
				alreadyDone = "\n\n<i>Kamu sudah menyelesaikan materi ini sebelumnya ✅</i>"
			}
			footer := alreadyDone + "\n\n──────────────\nKetik <b>selesai</b> jika sudah baca/tonton ✅\nKetik <b>kembali</b> untuk list materi\nKetik /batal untuk keluar"

			if len(bubbles) == 1 {
				// Single bubble — kirim langsung lewat return
				htmlContent := markdownToTelegramHTML(bubbles[0])
				header := fmt.Sprintf("%s <b>%s</b>\n\n", label, htmlEscape(chosen.Title))
				full := header + htmlContent
				if len(full) > 3800 {
					full = full[:3800] + "\n\n<i>(konten terpotong)</i>"
				}
				msg = "§HTML§" + full + footer
			} else {
				// Multi-bubble — simpan ke session untuk dikirim bertahap
				s.State = "materi_viewing"
				s.MateriBubbles = bubbles
				s.MateriBubbleIdx = 0
				a.botSessions[uid] = s
				// Kirim header dulu, lalu bubble pertama
				msg = fmt.Sprintf("§HTML§%s <b>%s</b>", label, htmlEscape(chosen.Title))
				// Tandai untuk kirim bubble pertama juga
				msg += "§BUBBLES§"
			}
		case "video":
			msg = fmt.Sprintf("§HTML§%s <b>%s</b>\n\n🔗 %s\n\n<i>Tonton videonya dulu ya! Klik link di atas</i>", label, htmlEscape(chosen.Title), htmlEscape(chosen.Content))
			alreadyDone := ""
			if chosen.IsCompleted {
				alreadyDone = "\n\n<i>Kamu sudah menyelesaikan materi ini sebelumnya ✅</i>"
			}
			msg += alreadyDone + "\n\n──────────────\nKetik <b>selesai</b> jika sudah baca/tonton ✅\nKetik <b>kembali</b> untuk list materi\nKetik /batal untuk keluar"
		case "audio":
			msg = fmt.Sprintf("§HTML§%s <b>%s</b>\n\n🔗 %s\n\n<i>Dengarkan audionya dulu ya! Klik link di atas</i>", label, htmlEscape(chosen.Title), htmlEscape(chosen.Content))
			alreadyDone := ""
			if chosen.IsCompleted {
				alreadyDone = "\n\n<i>Kamu sudah menyelesaikan materi ini sebelumnya ✅</i>"
			}
			msg += alreadyDone + "\n\n──────────────\nKetik <b>selesai</b> jika sudah baca/tonton ✅\nKetik <b>kembali</b> untuk list materi\nKetik /batal untuk keluar"
		default:
			msg = fmt.Sprintf("§HTML§<b>%s</b>\n\n%s", htmlEscape(chosen.Title), markdownToTelegramHTML(chosen.Content))
		}
		return msg, "materi_viewing"

	case "materi_viewing":
		lower2 := strings.ToLower(strings.TrimSpace(text))
		if lower2 == "kembali" {
			// Kembali ke list
			s.State = "materi_list"
			typeIcon := map[string]string{"text": "📖", "video": "🎬", "audio": "🎵"}
			lines := []string{fmt.Sprintf("📂 *Materi: %s* (%d materi)\n", s.MateriCategoryName, len(s.MateriList))}
			done := 0
			for i, it := range s.MateriList {
				icon := typeIcon[it.Type]
				if icon == "" { icon = "📄" }
				status := "○"
				if it.IsCompleted { status = "✅"; done++ }
				lines = append(lines, fmt.Sprintf("%d. %s %s %s", i+1, icon, it.Title, status))
			}
			lines = append(lines, fmt.Sprintf("\nProgress: %d/%d selesai", done, len(s.MateriList)))
			lines = append(lines, "\nKetik *nomor* untuk membuka materi.")
			return strings.Join(lines, "\n"), "materi_list"
		}
		if lower2 != "selesai" {
			return "Ketik *selesai* jika sudah selesai, atau *kembali* untuk list materi 😊", "materi_viewing"
		}
		// Tandai selesai
		webUserID, _ := a.resolveWebUserIDByExternal(ctx, uid)
		var alreadyInserted bool
		err2 := a.db.QueryRowContext(ctx, `
			INSERT INTO material_progress (user_id, material_id)
			VALUES ($1, $2) ON CONFLICT (user_id, material_id) DO NOTHING RETURNING TRUE
		`, webUserID, s.MateriViewingID).Scan(&alreadyInserted)
		if err2 != nil || !alreadyInserted {
			// Sudah selesai sebelumnya
			s.State = "materi_list"
			return "Materi ini sudah kamu selesaikan sebelumnya ✅\nTidak ada EXP tambahan ya.\n\nKetik nomor materi lain untuk lanjut belajar!", "materi_list"
		}
		// Beri EXP + poin bonus
		expGained := s.MateriViewingExp
		if expGained > 0 && webUserID > 0 {
			var matTitle string
			for _, it := range s.MateriList {
				if it.ID == s.MateriViewingID {
					matTitle = it.Title
					break
				}
			}
			_, _ = a.adjustExp(ctx, webUserID, int64(expGained), fmt.Sprintf("Selesai materi: %s", matTitle))
			// Bonus poin dari rule material_complete
			if pb := a.getPointBonusRule(ctx, "material_complete"); pb > 0 {
				_, _ = a.adjustPoints(ctx, webUserID, pb, "exp_rule_bonus", "Bonus poin: material_complete", nil)
			}
			// Auto-badge check
			go a.checkAndAwardAutoBadges(context.Background(), webUserID, "materi_all_done")
			go a.checkAndAwardAutoBadges(context.Background(), webUserID, "leaderboard_top3")
		}
		// Update status lokal di sesi
		for i := range s.MateriList {
			if s.MateriList[i].ID == s.MateriViewingID {
				s.MateriList[i].IsCompleted = true
				break
			}
		}
		// Cek apakah semua materi kategori selesai
		allDone := true
		for _, it := range s.MateriList {
			if !it.IsCompleted {
				allDone = false
				break
			}
		}
		s.State = "materi_list"
		expMsg := ""
		if expGained > 0 {
			expMsg = fmt.Sprintf("\n+*%d EXP* kamu dapatkan 🌟", expGained)
		}
		bonusMsg := ""
		if allDone {
			bonusMsg = fmt.Sprintf("\n\n🎉 *Selamat!* Kamu sudah menyelesaikan semua materi *%s*!\nSekarang kamu siap untuk /quiz %s 🧠", s.MateriCategoryName, s.MateriCategoryName)
		}
		return fmt.Sprintf("✅ Materi selesai!%s%s\n\nKetik nomor materi lain untuk lanjut, atau /quiz untuk latihan soal 💪", expMsg, bonusMsg), "materi_list"

	case "redeem_choose":
		num, err2 := strconv.Atoi(strings.TrimSpace(text))
		if err2 != nil || num < 1 {
			return "Kirim nomor hadiah yang valid ya (contoh: 1) 😊", "redeem_choose"
		}
		items, err2 := a.getActiveRedeemItems(ctx)
		if err2 != nil || len(items) == 0 {
			a.resetSession(uid)
			return "Maaf, daftar hadiah belum bisa dimuat 🙏", "idle"
		}
		if num > len(items) {
			return fmt.Sprintf("Nomor tidak valid. Pilih antara 1 sampai %d ya.", len(items)), "redeem_choose"
		}
		selected := items[num-1]
		webUserID, err2 := a.resolveWebUserIDByExternal(ctx, uid)
		if err2 != nil {
			a.resetSession(uid)
			return "Akunmu belum tersinkron. Coba /daftar ulang ya 🙏", "idle"
		}
		bal, err2 := a.getPointBalance(ctx, webUserID)
		if err2 != nil {
			return "Maaf, belum bisa cek saldo poin sekarang 🙏", "redeem_choose"
		}
		if bal < int64(selected.PointCost) {
			return fmt.Sprintf("Poin kamu tidak cukup 😕\nSaldo: *%d poin* | Dibutuhkan: *%d poin*\n\nTerus semangat belajar untuk kumpulkan poin ya! 💪", bal, selected.PointCost), "redeem_choose"
		}
		a.mu.Lock()
		s.RedeemItemID = int64(selected.ID)
		s.RedeemItemName = selected.Name
		s.RedeemItemCost = selected.PointCost
		s.State = "redeem_confirm"
		s.UpdatedAt = time.Now()
		a.mu.Unlock()
		return fmt.Sprintf("Konfirmasi penukaran 🎁\n\n*%s*\n_%s_\n\nHarga: *%d poin*\nSaldo kamu: *%d poin*\nSisa setelah redeem: *%d poin*\n\nKetik *ya* untuk konfirmasi, atau *tidak* untuk batal.", selected.Name, selected.Description, selected.PointCost, bal, bal-int64(selected.PointCost)), "redeem_confirm"

	case "redeem_confirm":
		if lower == "tidak" || lower == "batal" {
			a.resetSession(uid)
			return "Penukaran dibatalkan. Poin kamu aman 😊\nKetik /redeem untuk lihat hadiah lain.", "idle"
		}
		if lower != "ya" {
			return "Ketik *ya* untuk konfirmasi atau *tidak* untuk batal.", "redeem_confirm"
		}
		webUserID, err2 := a.resolveWebUserIDByExternal(ctx, uid)
		if err2 != nil {
			a.resetSession(uid)
			return "Akunmu belum tersinkron. Coba /daftar ulang ya 🙏", "idle"
		}
		a.mu.Lock()
		itemID := s.RedeemItemID
		itemName := s.RedeemItemName
		itemCost := s.RedeemItemCost
		a.mu.Unlock()

		// Cek stok & saldo lagi (double-check)
		var stock int
		var isActive bool
		err2 = a.db.QueryRowContext(ctx, `SELECT stock, is_active FROM redeem_items WHERE id = $1`, itemID).Scan(&stock, &isActive)
		if err2 != nil || !isActive {
			a.resetSession(uid)
			return "Maaf, hadiah ini sudah tidak tersedia 😕", "idle"
		}
		if stock == 0 {
			a.resetSession(uid)
			return "Maaf, stok hadiah ini sudah habis 😕\nKetik /redeem untuk lihat hadiah lain.", "idle"
		}
		bal, err2 := a.getPointBalance(ctx, webUserID)
		if err2 != nil || bal < int64(itemCost) {
			a.resetSession(uid)
			return fmt.Sprintf("Poin tidak cukup untuk redeem ini 😕\nSaldo: *%d* | Dibutuhkan: *%d*", bal, itemCost), "idle"
		}
		// Kurangi stok jika bukan unlimited
		if stock > 0 {
			_, _ = a.db.ExecContext(ctx, `UPDATE redeem_items SET stock = stock - 1 WHERE id = $1 AND stock > 0`, itemID)
		}
		// Catat klaim
		_, err2 = a.db.ExecContext(ctx, `
			INSERT INTO redeem_claims (user_id, item_id, item_name, point_cost, status)
			VALUES ($1, $2, $3, $4, 'pending')
		`, webUserID, itemID, itemName, itemCost)
		if err2 != nil {
			a.resetSession(uid)
			return "Maaf, gagal memproses redeem sekarang 🙏\nCoba lagi sebentar ya.", "idle"
		}
		// Potong poin via adjustPoints
		if _, err2 := a.adjustPoints(ctx, webUserID, int64(-itemCost), "redeem", fmt.Sprintf("Redeem: %s", itemName), nil); err2 != nil {
			_, _ = a.db.ExecContext(ctx, `DELETE FROM redeem_claims WHERE user_id=$1 AND item_id=$2 AND status='pending' ORDER BY claimed_at DESC LIMIT 1`, webUserID, itemID)
			if itemCost > 0 {
				_, _ = a.db.ExecContext(ctx, `UPDATE redeem_items SET stock = stock + 1 WHERE id = $1 AND stock >= 0`, itemID)
			}
			a.resetSession(uid)
			return "Maaf, gagal memproses poin 🙏 Coba lagi sebentar ya.", "idle"
		}
		a.resetSession(uid)
		return fmt.Sprintf("🎉 *Redeem berhasil!*\n\nHadiah: *%s*\nPoin dipotong: *%d*\n\nKlaim kamu sedang diproses admin ya 📋\nNala akan kabari kamu setelah dikonfirmasi!", itemName, itemCost), "idle"

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

		// Recap tryout
		var tryoutRecap strings.Builder
		for i, q := range questions {
			userAns := "-"
			if i < len(answers) {
				userAns = answers[i]
			}
			status := "✅"
			if userAns != q.Answer {
				status = "❌"
			}
			tryoutRecap.WriteString(fmt.Sprintf("%s Soal %d: kamu *%s* (benar: *%s*)\n", status, i+1, userAns, q.Answer))
		}

		if allCorrect {
			a.resetSession(uid)
			speed := float64(len(questions)) / (float64(dur) / 60.0)
			return fmt.Sprintf("🏁 *Tryout Selesai — PERFECT!* 🎉\n\n📊 Skor: *%d/%d*\n⏱ Waktu: *%d detik*\n⚡ Kecepatan: *%.1f qpm*\n\n%s\nCek rankingmu dengan /leaderbot 🏆", correct, len(questions), dur, speed, tryoutRecap.String()), "idle"
		}

		a.resetSession(uid)
		speed := float64(correct) / float64(len(questions)) * 100
		return fmt.Sprintf("🏁 *Tryout Selesai!*\n\n📊 Skor: *%d/%d* (%.0f%%)\n⏱ Waktu: *%d detik*\n\n%s\nBelum sempurna, yuk coba lagi! /tryout 🔁", correct, len(questions), speed, dur, tryoutRecap.String()), "idle"

	default:
		// Fallback cerdas berdasarkan konteks
		registered, _ := a.isRegisteredBotUser(ctx, uid)
		if !registered {
			return "Halo! Saya *Nala* ✨\nSeperti nya kamu belum terdaftar.\nKetik /daftar untuk registrasi, atau /start untuk melihat semua menu 📚", "idle"
		}
		return "Halo! 😊 Nala tidak mengerti pesan itu.\nKetik /start untuk lihat semua menu yang tersedia ya.", "idle"
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
	if err != nil {
		return err
	}
	ruleKey := "tryout_complete"
	reason := "Selesai tryout"
	if allCorrect {
		ruleKey = "tryout_perfect"
		reason = "Selesai tryout dengan hasil perfect"
	}
	a.applyRuleByExternalUser(ctx, userID, ruleKey, "tryout", reason, "tryout_results")
	// Auto-badge check
	if webUID, err2 := a.resolveWebUserIDByExternal(ctx, userID); err2 == nil {
		go a.checkAndAwardAutoBadges(context.Background(), webUID, "tryout_perfect_3")
		go a.checkAndAwardAutoBadges(context.Background(), webUID, "leaderboard_top3")
	}
	return nil
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
	ruleKeyQ := "quiz_complete"
	reasonQ := "Selesai latihan quiz"
	if allCorrect {
		ruleKeyQ = "quiz_perfect"
		reasonQ = "Selesai latihan quiz dengan nilai sempurna"
	}
	a.applyRuleByExternalUser(ctx, userID, ruleKeyQ, "quiz", reasonQ, cat.Code)
	// Auto-badge check
	if webUID, err2 := a.resolveWebUserIDByExternal(ctx, userID); err2 == nil {
		go a.checkAndAwardAutoBadges(context.Background(), webUID, "quiz_perfect_5")
		go a.checkAndAwardAutoBadges(context.Background(), webUID, "leaderboard_top3")
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

func (a *app) sendExpReportBroadcast(ctx context.Context, updateLastSent bool) (int, error) {
	levelStep := a.getExpRuleValue(ctx, "level_step", 100)
	nowLocal := time.Now().In(time.FixedZone("WIB", 7*3600))
	rows, err := a.db.QueryContext(ctx, `
		SELECT COALESCE(p.name,''), COALESCE(w.total_exp,0), COALESCE(pw.balance,0)
		FROM users u
		LEFT JOIN participant_profiles p ON p.user_id=u.id
		LEFT JOIN exp_wallets w ON w.user_id=u.id
		LEFT JOIN point_wallets pw ON pw.user_id=u.id
		WHERE u.role='participant'
		ORDER BY COALESCE(w.total_exp,0) DESC, u.created_at ASC
		LIMIT 50
	`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	lines := []string{"📊 Laporan EXP Peserta", fmt.Sprintf("Waktu: %s (Asia/Jakarta)", nowLocal.Format("02 Jan 2006 15:04")), ""}
	i := 0
	for rows.Next() {
		var name string
		var exp, points int64
		if rows.Scan(&name, &exp, &points) == nil {
			i++
			lv, prog := calcLevel(exp, levelStep)
			if strings.TrimSpace(name) == "" {
				name = "Peserta"
			}
			lines = append(lines, fmt.Sprintf("%d. %s — Lv %d | EXP %d (%d/%d) | Poin %d", i, name, lv, exp, prog, levelStep, points))
		}
	}
	if i == 0 {
		lines = append(lines, "Belum ada data peserta.")
	}
	msg := strings.Join(lines, "\n")
	participantRows, err := a.db.QueryContext(ctx, `
		SELECT tl.telegram_user_id
		FROM users u
		JOIN telegram_links tl ON tl.user_id=u.id
		WHERE u.role='participant' AND u.is_active=TRUE
	`)
	if err != nil {
		return 0, err
	}
	defer participantRows.Close()
	recipients := 0
	for participantRows.Next() {
		var tg string
		if participantRows.Scan(&tg) == nil {
			chatID, err := strconv.ParseInt(strings.TrimSpace(tg), 10, 64)
			if err == nil {
				_ = a.sendTelegramMessage(ctx, chatID, msg, "idle")
				recipients++
			}
		}
	}
	if updateLastSent {
		_, _ = a.db.ExecContext(ctx, `UPDATE exp_report_settings SET last_sent_at=NOW(), updated_at=NOW() WHERE id=1`)
	}
	return recipients, nil
}

func (a *app) runExpReportTick(ctx context.Context) {
	var tm, tz string
	var active bool
	var last sql.NullTime
	if err := a.db.QueryRowContext(ctx, `SELECT time_of_day, timezone, is_active, last_sent_at FROM exp_report_settings WHERE id=1`).Scan(&tm, &tz, &active, &last); err != nil {
		return
	}
	if !active {
		return
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.FixedZone("WIB", 7*3600)
	}
	nowUTC := time.Now().UTC()
	nowLocal := nowUTC.In(loc)
	if nowLocal.Format("15:04") != tm {
		return
	}
	if last.Valid {
		lastLocal := last.Time.In(loc)
		if lastLocal.Year() == nowLocal.Year() && lastLocal.YearDay() == nowLocal.YearDay() {
			return
		}
	}
	_, _ = a.sendExpReportBroadcast(ctx, true)
}

func (a *app) runReminderTick(ctx context.Context) {
	a.runExpReportTick(ctx)
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

func (a *app) getTryoutLeaderboardByGroup(ctx context.Context, limit int, groupID int64) (string, error) {
	var q string
	var args []any
	if groupID > 0 {
		q = `
			SELECT tr.user_id,
			       COALESCE(NULLIF(bp.registered_name,''), NULLIF(tr.display_name,''), tr.user_id) as name,
			       COALESCE(NULLIF(bp.telegram_display,''), tr.user_id) as tg,
			       MIN(tr.duration_seconds) as best_seconds,
			       COUNT(*) FILTER (WHERE tr.all_correct) as perfect_count
			FROM tryout_results tr
			LEFT JOIN bot_profiles bp ON bp.user_id = tr.user_id
			JOIN telegram_links tl ON tl.telegram_user_id = tr.user_id
			JOIN participant_profiles pp ON pp.user_id = tl.user_id AND pp.group_id = $2
			GROUP BY tr.user_id, name, tg
			ORDER BY perfect_count DESC, best_seconds ASC, name ASC
			LIMIT $1`
		args = []any{limit, groupID}
	} else {
		q = `
			SELECT tr.user_id,
			       COALESCE(NULLIF(bp.registered_name,''), NULLIF(tr.display_name,''), tr.user_id) as name,
			       COALESCE(NULLIF(bp.telegram_display,''), tr.user_id) as tg,
			       MIN(tr.duration_seconds) as best_seconds,
			       COUNT(*) FILTER (WHERE tr.all_correct) as perfect_count
			FROM tryout_results tr
			LEFT JOIN bot_profiles bp ON bp.user_id = tr.user_id
			GROUP BY tr.user_id, name, tg
			ORDER BY perfect_count DESC, best_seconds ASC, name ASC
			LIMIT $1`
		args = []any{limit}
	}
	rows, err := a.db.QueryContext(ctx, q, args...)
	if err != nil {
		return "", err
	}
	defer rows.Close()
	medals := []string{"🥇", "🥈", "🥉"}
	groupLabel := ""
	if groupID > 0 {
		var gName string
		_ = a.db.QueryRowContext(ctx, `SELECT name FROM groups WHERE id=$1`, groupID).Scan(&gName)
		if gName != "" {
			groupLabel = " — " + gName
		}
	}
	lines := []string{fmt.Sprintf("🏆 *Leaderbot Tryout%s*", groupLabel), ""}
	rank := 1
	for rows.Next() {
		var userID, name, tg string
		var bestSec, perfectCount int
		if err := rows.Scan(&userID, &name, &tg, &bestSec, &perfectCount); err != nil {
			return "", err
		}
		tg = cleanTelegramHandle(tg)
		medal := fmt.Sprintf("%d.", rank)
		if rank-1 < len(medals) {
			medal = medals[rank-1]
		}
		lines = append(lines, fmt.Sprintf("%s *%s* (%s)\n    ⏱ %ds • 🎯 %dx perfect", medal, escapeMD(name), escapeMD(tg), bestSec, perfectCount))
		rank++
	}
	if rank == 1 {
		return "", nil
	}
	return strings.Join(lines, "\n"), nil
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
		GROUP BY tr.user_id, name, tg
		ORDER BY perfect_count DESC, best_seconds ASC, name ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	medals := []string{"🥇", "🥈", "🥉"}
	lines := []string{"🏆 *Leaderbot Tryout*", ""}
	rank := 1
	for rows.Next() {
		var userID, name, tg string
		var bestSec, perfectCount int
		if err := rows.Scan(&userID, &name, &tg, &bestSec, &perfectCount); err != nil {
			return "", err
		}
		tg = cleanTelegramHandle(tg)
		medal := fmt.Sprintf("%d.", rank)
		if rank-1 < len(medals) {
			medal = medals[rank-1]
		}
		lines = append(lines, fmt.Sprintf("%s *%s* (%s)\n    ⏱ %ds • 🎯 %dx perfect", medal, escapeMD(name), escapeMD(tg), bestSec, perfectCount))
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

func (a *app) getActiveCategoryNamesByGroup(ctx context.Context, groupID int64) ([]string, error) {
	var rows *sql.Rows
	var err error
	if groupID > 0 {
		rows, err = a.db.QueryContext(ctx, `SELECT name FROM question_categories WHERE is_active=TRUE AND (group_id=$1 OR group_id IS NULL) ORDER BY id ASC`, groupID)
	} else {
		rows, err = a.db.QueryContext(ctx, `SELECT name FROM question_categories WHERE is_active=TRUE ORDER BY id ASC`)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var names []string
	for rows.Next() {
		var name string
		if rows.Scan(&name) == nil {
			names = append(names, name)
		}
	}
	return names, nil
}

func (a *app) getActiveCategoryNames(ctx context.Context) ([]string, error) {
	rows, err := a.db.QueryContext(ctx, `SELECT name FROM question_categories WHERE is_active = TRUE ORDER BY id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var names []string
	for rows.Next() {
		var name string
		if rows.Scan(&name) == nil {
			names = append(names, name)
		}
	}
	return names, nil
}

type activeGroup struct {
	ID   int
	Name string
	Code string
}

// getUserGroupID — ambil group_id user dari participant_profiles (0 = tidak ada kelompok)
func (a *app) getUserGroupID(ctx context.Context, userID int64) int64 {
	var gid int64
	_ = a.db.QueryRowContext(ctx, `SELECT COALESCE(group_id,0) FROM participant_profiles WHERE user_id=$1`, userID).Scan(&gid)
	return gid
}

func (a *app) getActiveGroups(ctx context.Context) ([]activeGroup, error) {
	rows, err := a.db.QueryContext(ctx, `SELECT id, name, code FROM groups WHERE is_active=TRUE ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var groups []activeGroup
	for rows.Next() {
		var g activeGroup
		if rows.Scan(&g.ID, &g.Name, &g.Code) == nil {
			groups = append(groups, g)
		}
	}
	return groups, nil
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
	return fmt.Sprintf("🚀 *Tryout* — Soal *%d/%d*\n\n%s\n\n%s", index+1, len(items), q.Question, strings.Join(q.Options, "\n"))
}

func formatQuizQuestion(cat quizCategory, index int) string {
	if index < 0 || index >= len(cat.Items) {
		return "Soal tidak ditemukan."
	}
	q := cat.Items[index]
	return fmt.Sprintf("🧠 *%s* — Soal *%d/%d*\n\n%s\n\n%s", cat.Name, index+1, len(cat.Items), q.Question, strings.Join(q.Options, "\n"))
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

// escapeMD escapes special characters for Telegram Markdown v1
func escapeMD(s string) string {
	replacer := strings.NewReplacer(
		"_", "\\_",
		"*", "\\*",
		"`", "\\`",
		"[", "\\[",
	)
	return replacer.Replace(s)
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

// ─── Redeem structs ───────────────────────────────────────────────────────────

type redeemItem struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	PointCost   int    `json:"point_cost"`
	Stock       int    `json:"stock"`
	IsActive    bool   `json:"is_active"`
	ImageURL    string `json:"image_url"`
	CreatedAt   string `json:"created_at"`
}

type redeemClaim struct {
	ID        int64  `json:"id"`
	UserID    int64  `json:"user_id"`
	ItemID    int    `json:"item_id"`
	ItemName  string `json:"item_name"`
	PointCost int    `json:"point_cost"`
	Status    string `json:"status"`
	Note      string `json:"note"`
	ClaimedAt string `json:"claimed_at"`
	UpdatedAt string `json:"updated_at"`
	// joined
	UserName  string `json:"user_name"`
	UserPhone string `json:"user_phone"`
}

// ─── Redeem helpers ───────────────────────────────────────────────────────────

func (a *app) getActiveRedeemItemsByGroup(ctx context.Context, groupID int64) ([]redeemItem, error) {
	var rows *sql.Rows
	var err error
	if groupID > 0 {
		rows, err = a.db.QueryContext(ctx, `
			SELECT id, name, description, point_cost, stock, is_active, image_url, created_at
			FROM redeem_items WHERE is_active=TRUE AND (group_id=$1 OR group_id IS NULL) ORDER BY id ASC
		`, groupID)
	} else {
		rows, err = a.db.QueryContext(ctx, `
			SELECT id, name, description, point_cost, stock, is_active, image_url, created_at
			FROM redeem_items WHERE is_active=TRUE ORDER BY id ASC
		`)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []redeemItem
	for rows.Next() {
		var it redeemItem
		var ca time.Time
		if err := rows.Scan(&it.ID, &it.Name, &it.Description, &it.PointCost, &it.Stock, &it.IsActive, &it.ImageURL, &ca); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, nil
}

func (a *app) getActiveRedeemItems(ctx context.Context) ([]redeemItem, error) {
	rows, err := a.db.QueryContext(ctx, `
		SELECT id, name, description, point_cost, stock, is_active, image_url, created_at
		FROM redeem_items WHERE is_active = TRUE ORDER BY id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []redeemItem
	for rows.Next() {
		var it redeemItem
		var ca time.Time
		if err := rows.Scan(&it.ID, &it.Name, &it.Description, &it.PointCost, &it.Stock, &it.IsActive, &it.ImageURL, &ca); err != nil {
			return nil, err
		}
		it.CreatedAt = ca.Format(time.RFC3339)
		items = append(items, it)
	}
	return items, nil
}

func (a *app) notifyTelegramUser(ctx context.Context, webUserID int64, msg string) {
	var telegramUserID string
	err := a.db.QueryRowContext(ctx, `SELECT telegram_user_id FROM telegram_links WHERE user_id = $1 LIMIT 1`, webUserID).Scan(&telegramUserID)
	if err != nil || telegramUserID == "" || a.telegramBotToken == "" {
		return
	}
	chatID, err := strconv.ParseInt(telegramUserID, 10, 64)
	if err != nil {
		return
	}
	_ = a.sendTelegramMessage(ctx, chatID, msg, "idle")
}

// ─── Participant redeem handlers ──────────────────────────────────────────────

func (a *app) handleParticipantRedeemItems(w http.ResponseWriter, r *http.Request) {
	u, err := a.currentUser(r.Context(), r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	groupID := a.getUserGroupID(r.Context(), u.ID)
	items, err := a.getActiveRedeemItemsByGroup(r.Context(), groupID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}
	if items == nil {
		items = []redeemItem{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (a *app) handleParticipantRedeemClaim(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	u, err := a.currentUser(r.Context(), r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	userID := u.ID
	var req struct {
		ItemID int `json:"item_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ItemID == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "item_id required"})
		return
	}
	ctx := r.Context()

	// Load item
	var it redeemItem
	var ca time.Time
	err = a.db.QueryRowContext(ctx, `
		SELECT id, name, description, point_cost, stock, is_active, image_url, created_at
		FROM redeem_items WHERE id = $1
	`, req.ItemID).Scan(&it.ID, &it.Name, &it.Description, &it.PointCost, &it.Stock, &it.IsActive, &it.ImageURL, &ca)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "item not found"})
		return
	}
	if !it.IsActive {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "item not available"})
		return
	}
	if it.Stock == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "stok habis"})
		return
	}

	// Cek saldo
	bal, err := a.getPointBalance(ctx, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}
	if bal < int64(it.PointCost) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "poin tidak cukup"})
		return
	}

	// Kurangi stok
	if it.Stock > 0 {
		_, _ = a.db.ExecContext(ctx, `UPDATE redeem_items SET stock = stock - 1 WHERE id = $1 AND stock > 0`, it.ID)
	}

	// Buat klaim
	var claimID int64
	err = a.db.QueryRowContext(ctx, `
		INSERT INTO redeem_claims (user_id, item_id, item_name, point_cost, status)
		VALUES ($1, $2, $3, $4, 'pending') RETURNING id
	`, userID, it.ID, it.Name, it.PointCost).Scan(&claimID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal buat klaim"})
		return
	}

	// Potong poin via adjustPoints (update point_wallets + ledger)
	if _, err := a.adjustPoints(ctx, userID, int64(-it.PointCost), "redeem", fmt.Sprintf("Redeem: %s", it.Name), nil); err != nil {
		// Rollback: hapus klaim & kembalikan stok
		_, _ = a.db.ExecContext(ctx, `DELETE FROM redeem_claims WHERE id = $1`, claimID)
		if it.Stock > 0 {
			_, _ = a.db.ExecContext(ctx, `UPDATE redeem_items SET stock = stock + 1 WHERE id = $1`, it.ID)
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal potong poin"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "claim_id": claimID, "message": "Klaim berhasil! Menunggu konfirmasi admin."})
}

func (a *app) handleParticipantRedeemClaims(w http.ResponseWriter, r *http.Request) {
	u, err := a.currentUser(r.Context(), r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	userID := u.ID
	rows, err := a.db.QueryContext(r.Context(), `
		SELECT id, item_id, item_name, point_cost, status, note, claimed_at, updated_at
		FROM redeem_claims WHERE user_id = $1 ORDER BY claimed_at DESC LIMIT 50
	`, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}
	defer rows.Close()
	var claims []redeemClaim
	for rows.Next() {
		var c redeemClaim
		var claimedAt, updatedAt time.Time
		if err := rows.Scan(&c.ID, &c.ItemID, &c.ItemName, &c.PointCost, &c.Status, &c.Note, &claimedAt, &updatedAt); err != nil {
			continue
		}
		c.ClaimedAt = claimedAt.Format(time.RFC3339)
		c.UpdatedAt = updatedAt.Format(time.RFC3339)
		claims = append(claims, c)
	}
	if claims == nil {
		claims = []redeemClaim{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": claims})
}

// ─── Admin redeem handlers ────────────────────────────────────────────────────

func (a *app) handleAdminRedeemItems(w http.ResponseWriter, r *http.Request) {
	adminUser, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	ctx := r.Context()
	if r.Method == http.MethodGet {
		groupFilter := r.URL.Query().Get("group_id")
		q := `SELECT ri.id, ri.name, ri.description, ri.point_cost, ri.stock, ri.is_active, ri.image_url, ri.created_at, COALESCE(ri.group_id,0), COALESCE(g.name,'')
			FROM redeem_items ri LEFT JOIN groups g ON g.id = ri.group_id`
		var qArgs []any
		if groupFilter != "" {
			q += ` WHERE ri.group_id=$1`
			qArgs = append(qArgs, groupFilter)
		}
		q += ` ORDER BY ri.id DESC`
		rows, err := a.db.QueryContext(ctx, q, qArgs...)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
			return
		}
		defer rows.Close()
		type redeemItemAdmin struct {
			redeemItem
			GroupID   int64  `json:"group_id"`
			GroupName string `json:"group_name"`
		}
		items := []redeemItemAdmin{}
		for rows.Next() {
			var it redeemItemAdmin
			var ca time.Time
			if err := rows.Scan(&it.ID, &it.Name, &it.Description, &it.PointCost, &it.Stock, &it.IsActive, &it.ImageURL, &ca, &it.GroupID, &it.GroupName); err != nil {
				continue
			}
			it.CreatedAt = ca.Format(time.RFC3339)
			items = append(items, it)
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
		return
	}
	if r.Method == http.MethodPost {
		var req struct {
			Action      string `json:"action"`
			ID          int    `json:"id"`
			Name        string `json:"name"`
			Description string `json:"description"`
			PointCost   int    `json:"point_cost"`
			Stock       int    `json:"stock"`
			IsActive    bool   `json:"is_active"`
			ImageURL    string `json:"image_url"`
			GroupID     *int64 `json:"group_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
			return
		}
		var gidVal any = nil
		if req.GroupID != nil && *req.GroupID > 0 {
			gidVal = *req.GroupID
		}
		// Validasi: admin biasa tidak boleh konten global
		if req.Action == "create" || req.Action == "update" {
			if gErr := guardGlobalContent(adminUser, gidVal); gErr != nil {
				writeJSON(w, http.StatusForbidden, map[string]string{"error": gErr.Error()})
				return
			}
		}
		switch req.Action {
		case "create":
			_, err := a.db.ExecContext(ctx, `
				INSERT INTO redeem_items (name, description, point_cost, stock, is_active, image_url, group_id)
				VALUES ($1, $2, $3, $4, TRUE, $5, $6)
			`, req.Name, req.Description, req.PointCost, req.Stock, req.ImageURL, gidVal)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal tambah hadiah"})
				return
			}
		case "update":
			_, err := a.db.ExecContext(ctx, `
				UPDATE redeem_items SET name=$1, description=$2, point_cost=$3, stock=$4, is_active=$5, image_url=$6, group_id=$7
				WHERE id=$8
			`, req.Name, req.Description, req.PointCost, req.Stock, req.IsActive, req.ImageURL, gidVal, req.ID)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal update hadiah"})
				return
			}
		case "delete":
			_, err := a.db.ExecContext(ctx, `DELETE FROM redeem_items WHERE id = $1`, req.ID)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal hapus hadiah"})
				return
			}
		default:
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "action tidak dikenal"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}
	writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
}

func (a *app) handleAdminRedeemClaims(w http.ResponseWriter, r *http.Request) {
	u, err := a.currentUser(r.Context(), r)
	if err != nil || u.Role != "admin" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	rows, err := a.db.QueryContext(r.Context(), `
		SELECT rc.id, rc.user_id, rc.item_id, rc.item_name, rc.point_cost, rc.status, rc.note, rc.claimed_at, rc.updated_at,
		       COALESCE(pp.name, ''), COALESCE(u.phone, '')
		FROM redeem_claims rc
		LEFT JOIN participant_profiles pp ON pp.user_id = rc.user_id
		LEFT JOIN users u ON u.id = rc.user_id
		ORDER BY rc.claimed_at DESC
		LIMIT 200
	`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}
	defer rows.Close()
	var claims []redeemClaim
	for rows.Next() {
		var c redeemClaim
		var claimedAt, updatedAt time.Time
		if err := rows.Scan(&c.ID, &c.UserID, &c.ItemID, &c.ItemName, &c.PointCost, &c.Status, &c.Note, &claimedAt, &updatedAt, &c.UserName, &c.UserPhone); err != nil {
			continue
		}
		c.ClaimedAt = claimedAt.Format(time.RFC3339)
		c.UpdatedAt = updatedAt.Format(time.RFC3339)
		claims = append(claims, c)
	}
	if claims == nil {
		claims = []redeemClaim{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": claims})
}

func (a *app) handleAdminRedeemClaimAction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	u, err := a.currentUser(r.Context(), r)
	if err != nil || u.Role != "admin" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	var req struct {
		ClaimID int64  `json:"claim_id"`
		Action  string `json:"action"` // approve | reject
		Note    string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	if req.Action != "approve" && req.Action != "reject" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "action harus approve atau reject"})
		return
	}
	ctx := r.Context()

	// Load klaim
	var c redeemClaim
	var claimedAt, updatedAt time.Time
	err = a.db.QueryRowContext(ctx, `
		SELECT id, user_id, item_id, item_name, point_cost, status, note, claimed_at, updated_at
		FROM redeem_claims WHERE id = $1
	`, req.ClaimID).Scan(&c.ID, &c.UserID, &c.ItemID, &c.ItemName, &c.PointCost, &c.Status, &c.Note, &claimedAt, &updatedAt)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "klaim tidak ditemukan"})
		return
	}
	if c.Status != "pending" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "klaim sudah diproses sebelumnya"})
		return
	}

	newStatus := req.Action
	if req.Action == "approve" {
		newStatus = "approved"
	} else {
		newStatus = "rejected"
	}

	_, err = a.db.ExecContext(ctx, `
		UPDATE redeem_claims SET status=$1, note=$2, updated_at=NOW() WHERE id=$3
	`, newStatus, req.Note, req.ClaimID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal update klaim"})
		return
	}

	if req.Action == "reject" {
		// Kembalikan poin via adjustPoints
		_, _ = a.adjustPoints(ctx, c.UserID, int64(c.PointCost), "redeem_refund", fmt.Sprintf("Refund redeem: %s", c.ItemName), nil)
		// Kembalikan stok
		_, _ = a.db.ExecContext(ctx, `UPDATE redeem_items SET stock = stock + 1 WHERE id = $1 AND stock >= 0`, c.ItemID)
		// Notif user
		note := req.Note
		if note == "" {
			note = "Tidak ada keterangan"
		}
		a.notifyTelegramUser(ctx, c.UserID, fmt.Sprintf("😕 Klaim *%s* kamu ditolak.\nAlasan: _%s_\n\nPoin *%d* sudah dikembalikan ke saldo kamu.", c.ItemName, note, c.PointCost))
	} else {
		// Notif user approved
		note := req.Note
		if note == "" {
			note = "Hubungi admin untuk pengambilan hadiah."
		}
		a.notifyTelegramUser(ctx, c.UserID, fmt.Sprintf("🎉 Klaim *%s* kamu disetujui!\n_%s_\n\nSelamat Tuanku! Terima kasih sudah semangat belajar 🎓", c.ItemName, note))
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "status": newStatus})
}

// ─── Learning Materials ────────────────────────────────────────────────────

type learningMaterial struct {
	ID         int    `json:"id"`
	CategoryID int    `json:"category_id"`
	Title      string `json:"title"`
	Type       string `json:"type"`
	Content    string `json:"content"`
	ExpReward  int    `json:"exp_reward"`
	OrderNo    int    `json:"order_no"`
	IsActive   bool   `json:"is_active"`
}

type materialWithProgress struct {
	learningMaterial
	CategoryName string  `json:"category_name"`
	IsCompleted  bool    `json:"is_completed"`
	CompletedAt  *string `json:"completed_at,omitempty"`
}

// GET  /admin/materials?category_id=X  → list
// POST /admin/materials                → create | update | delete
// ─── Notes Helpers ──────────────────────────────────────────────────────────

// parseBacklinks extracts [[Title]] references from content
func parseBacklinks(content string) []string {
	var links []string
	seen := map[string]bool{}
	i := 0
	for i < len(content)-3 {
		if content[i] == '[' && content[i+1] == '[' {
			end := strings.Index(content[i+2:], "]]")
			if end >= 0 {
				title := strings.TrimSpace(content[i+2 : i+2+end])
				if title != "" && !seen[title] {
					links = append(links, title)
					seen[title] = true
				}
				i = i + 2 + end + 2
				continue
			}
		}
		i++
	}
	return links
}

// parseTags extracts #tag references from content
func parseTags(content string) []string {
	var tags []string
	seen := map[string]bool{}
	words := strings.FieldsFunc(content, func(r rune) bool {
		return r == ' ' || r == '\n' || r == '\t' || r == '\r'
	})
	for _, w := range words {
		if strings.HasPrefix(w, "#") {
			tag := strings.ToLower(strings.Trim(w[1:], ".,!?;:()[]{}\"'"))
			if len(tag) >= 2 && !seen[tag] {
				tags = append(tags, tag)
				seen[tag] = true
			}
		}
	}
	return tags
}

// syncNoteLinks rebuilds note_links and note_tags for a given note
func (a *app) syncNoteLinks(ctx context.Context, noteID, userID int64, content string) {
	// Clear old links & tags
	_, _ = a.db.ExecContext(ctx, `DELETE FROM note_links WHERE from_note_id=$1`, noteID)
	_, _ = a.db.ExecContext(ctx, `DELETE FROM note_tags WHERE note_id=$1`, noteID)

	// Re-insert tags
	for _, tag := range parseTags(content) {
		_, _ = a.db.ExecContext(ctx, `INSERT INTO note_tags(note_id, tag) VALUES($1,$2) ON CONFLICT DO NOTHING`, noteID, tag)
	}

	// Re-insert backlinks (resolve title → note_id)
	for _, title := range parseBacklinks(content) {
		var toID int64
		_ = a.db.QueryRowContext(ctx, `SELECT id FROM notes WHERE user_id=$1 AND title=$2 LIMIT 1`, userID, title).Scan(&toID)
		if toID > 0 && toID != noteID {
			_, _ = a.db.ExecContext(ctx, `INSERT INTO note_links(from_note_id, to_note_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, noteID, toID)
		}
	}
}

// ─── Notes Handlers ──────────────────────────────────────────────────────────

// GET  /participant/notes          → list semua notes user (+ tags)
// GET  /participant/notes?id=X     → single note dengan content
// POST /participant/notes          → create | update | delete
func (a *app) generateContributionMaterial(ctx context.Context, title, source string, bubbleCount int) (string, error) {
	if bubbleCount <= 0 || bubbleCount > 8 {
		bubbleCount = 3
	}
	systemPrompt := `Kamu adalah asisten editor materi pembelajaran.
Ubah catatan mentah menjadi materi belajar yang lebih rapi, terstruktur, dan mudah dipahami.
Format output HARUS berupa JSON array of strings, setiap item adalah satu bubble materi.
Gunakan Bahasa Indonesia, ringkas, jelas, boleh pakai markdown (**bold**, bullet, heading).`
	userPrompt := fmt.Sprintf("Judul materi: %s\n\nCatatan sumber:\n%s\n\nBuat %d bubble.", title, source, bubbleCount)

	content, err := a.aiChat(ctx, systemPrompt, userPrompt, 2000, 0.7)
	if err != nil { return "", err }

	var bubbles []string
	start := strings.Index(content, "[")
	end := strings.LastIndex(content, "]")
	if start >= 0 && end > start {
		_ = json.Unmarshal([]byte(content[start:end+1]), &bubbles)
	}
	if len(bubbles) == 0 { bubbles = []string{content} }
	b, _ := json.Marshal(bubbles)
	return string(b), nil
}

func (a *app) handleParticipantNotes(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant", "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	ctx := r.Context()

	switch r.Method {
	case http.MethodGet:
		noteID := r.URL.Query().Get("id")
		tag := r.URL.Query().Get("tag")
		search := r.URL.Query().Get("q")

		if noteID != "" {
			// Single note
			var id int64; var title, content, createdAt, updatedAt, noteType string
			err := a.db.QueryRowContext(ctx, `
				SELECT id, title, content, created_at, updated_at, COALESCE(note_type,'permanent')
				FROM notes WHERE id=$1 AND user_id=$2`, noteID, u.ID).Scan(&id, &title, &content, &createdAt, &updatedAt, &noteType)
			if err != nil {
				writeJSON(w, http.StatusNotFound, map[string]string{"error": "note not found"})
				return
			}
			// Load tags
			tRows, _ := a.db.QueryContext(ctx, `SELECT tag FROM note_tags WHERE note_id=$1 ORDER BY tag`, id)
			var tags []string
			if tRows != nil { for tRows.Next() { var t string; if tRows.Scan(&t) == nil { tags = append(tags, t) } }; tRows.Close() }
			// Load backlinks (notes that link TO this note)
			blRows, _ := a.db.QueryContext(ctx, `
				SELECT n.id, n.title FROM note_links nl
				JOIN notes n ON n.id = nl.from_note_id
				WHERE nl.to_note_id=$1`, id)
			type noteMini struct{ ID int64 `json:"id"`; Title string `json:"title"` }
			var backlinks []noteMini
			if blRows != nil { for blRows.Next() { var nm noteMini; if blRows.Scan(&nm.ID, &nm.Title) == nil { backlinks = append(backlinks, nm) } }; blRows.Close() }
			if tags == nil { tags = []string{} }
			if backlinks == nil { backlinks = []noteMini{} }
			writeJSON(w, http.StatusOK, map[string]any{
				"id": id, "title": title, "content": content,
				"created_at": createdAt, "updated_at": updatedAt,
				"note_type": noteType,
				"tags": tags, "backlinks": backlinks,
			})
			return
		}

		// List notes
		q := `SELECT n.id, n.title, n.updated_at, n.note_type,
			COALESCE(array_agg(DISTINCT nt.tag) FILTER (WHERE nt.tag IS NOT NULL), ARRAY[]::TEXT[]) as tags
			FROM notes n
			LEFT JOIN note_tags nt ON nt.note_id = n.id
			WHERE n.user_id=$1`
		args := []any{u.ID}
		if tag != "" {
			q += ` AND EXISTS (SELECT 1 FROM note_tags nt2 WHERE nt2.note_id=n.id AND nt2.tag=$2)`
			args = append(args, tag)
		}
		if search != "" {
			args = append(args, "%"+strings.ToLower(search)+"%")
			q += fmt.Sprintf(` AND (LOWER(n.title) LIKE $%d OR LOWER(n.content) LIKE $%d)`, len(args), len(args))
		}
		q += ` GROUP BY n.id ORDER BY n.updated_at DESC`
		rows, err := a.db.QueryContext(ctx, q, args...)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		defer rows.Close()
		type noteItem struct {
			ID        int64    `json:"id"`
			Title     string   `json:"title"`
			UpdatedAt string   `json:"updated_at"`
			NoteType  string   `json:"note_type"`
			Tags      []string `json:"tags"`
		}
		items := []noteItem{}
		for rows.Next() {
			var it noteItem
			var tagsArr []byte
			scanErr := rows.Scan(&it.ID, &it.Title, &it.UpdatedAt, &it.NoteType, &tagsArr)
			if scanErr != nil {
				log.Printf("notes scan error: %v", scanErr)
				continue
			}
			// Parse postgres array
			tagStr := strings.Trim(string(tagsArr), "{}")
			if tagStr != "" {
				it.Tags = strings.Split(tagStr, ",")
			} else {
				it.Tags = []string{}
			}
			if it.NoteType == "" { it.NoteType = "permanent" }
			items = append(items, it)
		}
		if rowsErr := rows.Err(); rowsErr != nil {
			log.Printf("notes rows error: %v", rowsErr)
		}
		// Ambil semua tag unik user
		allTagRows, _ := a.db.QueryContext(ctx, `
			SELECT DISTINCT nt.tag FROM note_tags nt
			JOIN notes n ON n.id=nt.note_id WHERE n.user_id=$1 ORDER BY nt.tag`, u.ID)
		var allTags []string
		if allTagRows != nil { for allTagRows.Next() { var t string; if allTagRows.Scan(&t) == nil { allTags = append(allTags, t) } }; allTagRows.Close() }
		if allTags == nil { allTags = []string{} }
		writeJSON(w, http.StatusOK, map[string]any{"notes": items, "all_tags": allTags})

	case http.MethodPost:
		var req struct {
			Action   string `json:"action"`
			ID       int64  `json:"id"`
			Title    string `json:"title"`
			Content  string `json:"content"`
			NoteType string `json:"note_type"`
		}
		if json.NewDecoder(r.Body).Decode(&req) != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
			return
		}
		switch req.Action {
		case "create":
			title := strings.TrimSpace(req.Title)
			if title == "" { title = "Untitled" }
			noteType := req.NoteType
			if noteType != "fleeting" { noteType = "permanent" }
			var id int64
			err := a.db.QueryRowContext(ctx, `
				INSERT INTO notes(user_id, title, content, note_type) VALUES($1,$2,$3,$4) RETURNING id`,
				u.ID, title, req.Content, noteType).Scan(&id)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			if noteType == "permanent" { a.syncNoteLinks(ctx, id, u.ID, req.Content) }
			writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": id})

		case "update":
			if req.ID == 0 { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id required"}); return }
			title := strings.TrimSpace(req.Title)
			if title == "" { title = "Untitled" }
			_, err := a.db.ExecContext(ctx, `
				UPDATE notes SET title=$1, content=$2, updated_at=NOW() WHERE id=$3 AND user_id=$4`,
				title, req.Content, req.ID, u.ID)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			a.syncNoteLinks(ctx, req.ID, u.ID, req.Content)
			writeJSON(w, http.StatusOK, map[string]any{"ok": true})

		case "delete":
			if req.ID == 0 { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id required"}); return }
			_, _ = a.db.ExecContext(ctx, `DELETE FROM notes WHERE id=$1 AND user_id=$2`, req.ID, u.ID)
			writeJSON(w, http.StatusOK, map[string]any{"ok": true})

		case "promote":
			// Ubah fleeting → permanent
			if req.ID == 0 { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id required"}); return }
			title := strings.TrimSpace(req.Title)
			if title == "" { title = "Untitled" }
			_, err := a.db.ExecContext(ctx, `
				UPDATE notes SET note_type='permanent', title=$1, content=$2, updated_at=NOW() WHERE id=$3 AND user_id=$4`,
				title, req.Content, req.ID, u.ID)
			if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
			a.syncNoteLinks(ctx, req.ID, u.ID, req.Content)
			writeJSON(w, http.StatusOK, map[string]any{"ok": true})

		default:
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unknown action"})
		}

	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

// ── Canvas Handler ────────────────────────────────────────────────────────────
// GET  /participant/notes/canvas          → load canvas + items + edges
// POST /participant/notes/canvas {action} → add_item | update_item | delete_item | add_edge | delete_edge
func (a *app) handleParticipantCanvas(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant", "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	ctx := r.Context()

	// Jika request list semua canvas
	if r.Method == http.MethodGet && r.URL.Query().Get("list") == "1" {
		rows, err := a.db.QueryContext(ctx, `SELECT id, name, updated_at FROM note_canvases WHERE user_id=$1 ORDER BY updated_at DESC`, u.ID)
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		defer rows.Close()
		type cv struct {
			ID   int64  `json:"id"`
			Name string `json:"name"`
			UpdatedAt string `json:"updated_at"`
		}
		list := []cv{}
		for rows.Next() {
			var c cv
			if rows.Scan(&c.ID, &c.Name, &c.UpdatedAt) == nil { list = append(list, c) }
		}
		writeJSON(w, 200, map[string]any{"canvases": list})
		return
	}

	// Resolve canvas ID — dari query param atau default
	canvasIDStr := r.URL.Query().Get("canvas_id")
	var canvasID int64
	if canvasIDStr != "" {
		fmt.Sscan(canvasIDStr, &canvasID)
		// Validasi ownership
		var ownerID int64
		if err := a.db.QueryRowContext(ctx, `SELECT user_id FROM note_canvases WHERE id=$1`, canvasID).Scan(&ownerID); err != nil || ownerID != u.ID {
			writeJSON(w, 404, map[string]string{"error": "canvas not found"}); return
		}
	} else {
		// Upsert default canvas
		err = a.db.QueryRowContext(ctx, `
			INSERT INTO note_canvases(user_id, name) VALUES($1,'Canvas')
			ON CONFLICT(user_id, name) DO UPDATE SET updated_at=NOW()
			RETURNING id`, u.ID).Scan(&canvasID)
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
	}

	switch r.Method {
	case http.MethodGet:
		// Load items
		rows, err := a.db.QueryContext(ctx, `
			SELECT i.id, i.item_type, i.note_id, i.data, i.x, i.y, i.width, i.height, i.z_index,
			       COALESCE(n.title,'') as note_title, COALESCE(n.content,'') as note_content
			FROM note_canvas_items i
			LEFT JOIN notes n ON n.id = i.note_id
			WHERE i.canvas_id=$1
			ORDER BY i.z_index ASC, i.id ASC`, canvasID)
		if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
		defer rows.Close()

		type canvasItem struct {
			ID          int64   `json:"id"`
			Type        string  `json:"type"`
			NoteID      *int64  `json:"note_id,omitempty"`
			Data        string  `json:"data"`
			X           float64 `json:"x"`
			Y           float64 `json:"y"`
			Width       float64 `json:"width"`
			Height      float64 `json:"height"`
			ZIndex      int     `json:"z_index"`
			NoteTitle   string  `json:"note_title,omitempty"`
			NoteContent string  `json:"note_content,omitempty"`
		}
		items := []canvasItem{}
		for rows.Next() {
			var it canvasItem
			var noteID *int64
			if rows.Scan(&it.ID, &it.Type, &noteID, &it.Data, &it.X, &it.Y, &it.Width, &it.Height, &it.ZIndex, &it.NoteTitle, &it.NoteContent) == nil {
				it.NoteID = noteID
				items = append(items, it)
			}
		}

		// Load edges (siap untuk fase 2)
		erows, _ := a.db.QueryContext(ctx, `
			SELECT id, from_item, to_item, label FROM note_canvas_edges WHERE canvas_id=$1`, canvasID)
		type canvasEdge struct {
			ID       int64  `json:"id"`
			FromItem int64  `json:"from_item"`
			ToItem   int64  `json:"to_item"`
			Label    string `json:"label"`
		}
		edges := []canvasEdge{}
		if erows != nil {
			defer erows.Close()
			for erows.Next() {
				var e canvasEdge
				if erows.Scan(&e.ID, &e.FromItem, &e.ToItem, &e.Label) == nil {
					edges = append(edges, e)
				}
			}
		}
		writeJSON(w, 200, map[string]any{"canvas_id": canvasID, "items": items, "edges": edges})

	case http.MethodPost:
		var req struct {
			Action  string  `json:"action"`
			ID      int64   `json:"id"`
			Name    string  `json:"name"`
			Type    string  `json:"type"`
			NoteID  *int64  `json:"note_id"`
			Data    string  `json:"data"`
			X       float64 `json:"x"`
			Y       float64 `json:"y"`
			Width   float64 `json:"width"`
			Height  float64 `json:"height"`
			ZIndex  int     `json:"z_index"`
			FromItem int64  `json:"from_item"`
			ToItem   int64  `json:"to_item"`
			Label    string `json:"label"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid json"}); return
		}
		switch req.Action {
		case "add_item":
			itemType := req.Type; if itemType == "" { itemType = "note" }
			w2 := req.Width; if w2 == 0 { w2 = 260 }
			h2 := req.Height; if h2 == 0 { h2 = 140 }
			var id int64
			err := a.db.QueryRowContext(ctx, `
				INSERT INTO note_canvas_items(canvas_id,item_type,note_id,data,x,y,width,height,z_index)
				VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
				canvasID, itemType, req.NoteID, func() string { if req.Data == "" { return "{}" }; return req.Data }(),
				req.X, req.Y, w2, h2, req.ZIndex).Scan(&id)
			if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
			writeJSON(w, 200, map[string]any{"ok": true, "id": id})

		case "update_item":
			if req.ID == 0 { writeJSON(w, 400, map[string]string{"error": "id required"}); return }
			_, err := a.db.ExecContext(ctx, `
				UPDATE note_canvas_items SET x=$1,y=$2,width=$3,height=$4,z_index=$5,updated_at=NOW()
				WHERE id=$6 AND canvas_id=$7`,
				req.X, req.Y, req.Width, req.Height, req.ZIndex, req.ID, canvasID)
			if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
			writeJSON(w, 200, map[string]any{"ok": true})

		case "delete_item":
			if req.ID == 0 { writeJSON(w, 400, map[string]string{"error": "id required"}); return }
			_, _ = a.db.ExecContext(ctx, `DELETE FROM note_canvas_items WHERE id=$1 AND canvas_id=$2`, req.ID, canvasID)
			writeJSON(w, 200, map[string]any{"ok": true})

		case "add_edge":
			// Fase 2: koneksi antar kartu
			var id int64
			err := a.db.QueryRowContext(ctx, `
				INSERT INTO note_canvas_edges(canvas_id,from_item,to_item,label)
				VALUES($1,$2,$3,$4) RETURNING id`,
				canvasID, req.FromItem, req.ToItem, req.Label).Scan(&id)
			if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
			writeJSON(w, 200, map[string]any{"ok": true, "id": id})

		case "delete_edge":
			_, _ = a.db.ExecContext(ctx, `DELETE FROM note_canvas_edges WHERE id=$1 AND canvas_id=$2`, req.ID, canvasID)
			writeJSON(w, 200, map[string]any{"ok": true})

		case "create_canvas":
			name := strings.TrimSpace(req.Name)
			if name == "" { name = "Canvas Baru" }
			var newID int64
			err := a.db.QueryRowContext(ctx, `INSERT INTO note_canvases(user_id, name) VALUES($1,$2) RETURNING id`, u.ID, name).Scan(&newID)
			if err != nil { writeJSON(w, 500, map[string]string{"error": err.Error()}); return }
			writeJSON(w, 200, map[string]any{"ok": true, "id": newID, "name": name})

		case "rename_canvas":
			name := strings.TrimSpace(req.Name)
			if name == "" { writeJSON(w, 400, map[string]string{"error": "name required"}); return }
			_, _ = a.db.ExecContext(ctx, `UPDATE note_canvases SET name=$1, updated_at=NOW() WHERE id=$2 AND user_id=$3`, name, canvasID, u.ID)
			writeJSON(w, 200, map[string]any{"ok": true})

		case "delete_canvas":
			// Jangan hapus kalau hanya 1 canvas
			var count int
			_ = a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM note_canvases WHERE user_id=$1`, u.ID).Scan(&count)
			if count <= 1 { writeJSON(w, 400, map[string]string{"error": "minimal 1 canvas"}); return }
			_, _ = a.db.ExecContext(ctx, `DELETE FROM note_canvases WHERE id=$1 AND user_id=$2`, canvasID, u.ID)
			writeJSON(w, 200, map[string]any{"ok": true})

		default:
			writeJSON(w, 400, map[string]string{"error": "unknown action"})
		}
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

// GET /participant/notes/graph → nodes & edges untuk network graph
func (a *app) handleParticipantNotesGraph(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant", "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	ctx := r.Context()

	// Nodes: hanya catatan permanen
	rows, err := a.db.QueryContext(ctx, `
		SELECT n.id, n.title,
			COALESCE(array_agg(DISTINCT nt.tag) FILTER (WHERE nt.tag IS NOT NULL), ARRAY[]::TEXT[]) as tags
		FROM notes n
		LEFT JOIN note_tags nt ON nt.note_id = n.id
		WHERE n.user_id=$1 AND n.note_type='permanent'
		GROUP BY n.id ORDER BY n.updated_at DESC`, u.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()
	type graphNode struct {
		ID    int64    `json:"id"`
		Title string   `json:"title"`
		Tags  []string `json:"tags"`
	}
	nodes := []graphNode{}
	for rows.Next() {
		var n graphNode
		var tagsArr []byte
		if rows.Scan(&n.ID, &n.Title, &tagsArr) == nil {
			tagStr := strings.Trim(string(tagsArr), "{}")
			if tagStr != "" { n.Tags = strings.Split(tagStr, ",") } else { n.Tags = []string{} }
			nodes = append(nodes, n)
		}
	}
	rows.Close()

	// Edges: semua links antar notes milik user ini
	eRows, err := a.db.QueryContext(ctx, `
		SELECT nl.from_note_id, nl.to_note_id
		FROM note_links nl
		JOIN notes n1 ON n1.id = nl.from_note_id AND n1.user_id=$1
		JOIN notes n2 ON n2.id = nl.to_note_id AND n2.user_id=$1`, u.ID)
	type graphEdge struct {
		From int64 `json:"from"`
		To   int64 `json:"to"`
	}
	edges := []graphEdge{}
	if err == nil && eRows != nil {
		for eRows.Next() {
			var e graphEdge
			if eRows.Scan(&e.From, &e.To) == nil { edges = append(edges, e) }
		}
		eRows.Close()
	}

	writeJSON(w, http.StatusOK, map[string]any{"nodes": nodes, "edges": edges})
}

func (a *app) handleAdminGenerateQuestions(w http.ResponseWriter, r *http.Request) {
	_, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	var req struct {
		CategoryID  int64  `json:"category_id"`
		MateriID    int64  `json:"materi_id"`
		QuestionCount int  `json:"question_count"`
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil || req.CategoryID == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "category_id wajib diisi"})
		return
	}
	if req.QuestionCount <= 0 || req.QuestionCount > 20 {
		req.QuestionCount = 5
	}

	ctx := r.Context()

	// Ambil konten materi sebagai konteks
	var materiContext string
	if req.MateriID > 0 {
		var title, content string
		_ = a.db.QueryRowContext(ctx, `SELECT title, content FROM learning_materials WHERE id=$1`, req.MateriID).Scan(&title, &content)
		if title != "" {
			// Jika content adalah JSON array (multi-bubble), gabungkan
			var bubbles []string
			if json.Unmarshal([]byte(content), &bubbles) == nil {
				content = strings.Join(bubbles, "\n\n")
			}
			materiContext = fmt.Sprintf("Judul Materi: %s\n\nIsi Materi:\n%s", title, content)
		}
	} else {
		// Ambil semua materi dari kategori ini
		rows, _ := a.db.QueryContext(ctx, `SELECT title, content FROM learning_materials WHERE category_id=$1 AND is_active=TRUE ORDER BY order_no, id LIMIT 5`, req.CategoryID)
		if rows != nil {
			var parts []string
			for rows.Next() {
				var title, content string
				if rows.Scan(&title, &content) == nil {
					var bubbles []string
					if json.Unmarshal([]byte(content), &bubbles) == nil {
						content = strings.Join(bubbles, "\n\n")
					}
					parts = append(parts, fmt.Sprintf("## %s\n%s", title, content))
				}
			}
			rows.Close()
			materiContext = strings.Join(parts, "\n\n---\n\n")
		}
	}

	if materiContext == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "tidak ada materi ditemukan untuk kategori/materi ini"})
		return
	}

	// Ambil nama kategori
	var catName string
	_ = a.db.QueryRowContext(ctx, `SELECT name FROM question_categories WHERE id=$1`, req.CategoryID).Scan(&catName)

	systemPrompt := `Kamu adalah pembuat soal ujian profesional untuk program pelatihan karyawan.
Buat soal pilihan ganda (multiple choice) dalam Bahasa Indonesia berdasarkan materi yang diberikan.
Format output HARUS berupa JSON array. Setiap soal memiliki format:
{
  "question_text": "Pertanyaan di sini?",
  "option_a": "Pilihan A",
  "option_b": "Pilihan B",
  "option_c": "Pilihan C",
  "option_d": "Pilihan D",
  "correct_option": "a"
}
Aturan:
- correct_option harus huruf kecil: "a", "b", "c", atau "d"
- Soal harus berdasarkan isi materi yang diberikan
- Variasikan jawaban benar (jangan selalu "a")
- Pilihan jawaban harus masuk akal dan tidak terlalu mudah ditebak
- Jangan tambahkan teks di luar JSON array
Output langsung JSON array saja.`

	userPrompt := fmt.Sprintf("Buat %d soal pilihan ganda berdasarkan materi berikut:\n\n%s", req.QuestionCount, materiContext)
	if catName != "" {
		userPrompt = fmt.Sprintf("Kategori: %s\n\n", catName) + userPrompt
	}

	content, err2 := a.aiChat(ctx, systemPrompt, userPrompt, 3000, 0.6)
	if err2 != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "gagal hubungi AI: " + err2.Error()})
		return
	}
	start := strings.Index(content, "[")
	end := strings.LastIndex(content, "]")
	if start < 0 || end <= start {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "AI tidak menghasilkan format JSON yang valid"})
		return
	}

	type generatedQ struct {
		QuestionText  string `json:"question_text"`
		OptionA       string `json:"option_a"`
		OptionB       string `json:"option_b"`
		OptionC       string `json:"option_c"`
		OptionD       string `json:"option_d"`
		CorrectOption string `json:"correct_option"`
	}
	var questions []generatedQ
	if err3 := json.Unmarshal([]byte(content[start:end+1]), &questions); err3 != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal parse soal dari AI: " + err3.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"questions": questions, "count": len(questions)})
}

func (a *app) handleAdminTryoutConfigs(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	ctx := r.Context()
	adminGID := a.getAdminGroupIDFromUser(ctx, admin)

	switch r.Method {
	case http.MethodGet:
		q := `SELECT tc.id, tc.name, COALESCE(tc.group_id,0), COALESCE(g.name,''), tc.is_active
			FROM tryout_configs tc LEFT JOIN groups g ON g.id = tc.group_id`
		var args []any
		if adminGID > 0 {
			q += ` WHERE tc.group_id = $1`
			args = append(args, adminGID)
		}
		q += ` ORDER BY tc.id DESC`
		rows, err := a.db.QueryContext(ctx, q, args...)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		defer rows.Close()
		type configOut struct {
			ID        int64  `json:"id"`
			Name      string `json:"name"`
			GroupID   int64  `json:"group_id"`
			GroupName string `json:"group_name"`
			IsActive  bool   `json:"is_active"`
			Items     []map[string]any `json:"items"`
		}
		configs := []configOut{}
		for rows.Next() {
			var c configOut
			if rows.Scan(&c.ID, &c.Name, &c.GroupID, &c.GroupName, &c.IsActive) == nil {
				configs = append(configs, c)
			}
		}
		rows.Close()
		// Load items per config
		for i, c := range configs {
			iRows, _ := a.db.QueryContext(ctx, `
				SELECT tci.id, tci.category_id, qc.name, tci.question_count
				FROM tryout_config_items tci
				JOIN question_categories qc ON qc.id = tci.category_id
				WHERE tci.config_id = $1 ORDER BY tci.id`, c.ID)
			if iRows != nil {
				for iRows.Next() {
					var iid, catID int64; var catName string; var qCount int
					if iRows.Scan(&iid, &catID, &catName, &qCount) == nil {
						configs[i].Items = append(configs[i].Items, map[string]any{"id": iid, "category_id": catID, "category_name": catName, "question_count": qCount})
					}
				}
				iRows.Close()
			}
			if configs[i].Items == nil {
				configs[i].Items = []map[string]any{}
			}
		}
		writeJSON(w, http.StatusOK, map[string]any{"configs": configs})

	case http.MethodPost:
		var req struct {
			Action        string `json:"action"`
			ID            int64  `json:"id"`
			Name          string `json:"name"`
			GroupID       *int64 `json:"group_id"`
			IsActive      *bool  `json:"is_active"`
			// Untuk add/remove item
			ConfigID      int64  `json:"config_id"`
			CategoryID    int64  `json:"category_id"`
			QuestionCount int    `json:"question_count"`
			ItemID        int64  `json:"item_id"`
		}
		if json.NewDecoder(r.Body).Decode(&req) != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
			return
		}
		switch req.Action {
		case "create":
			if req.Name == "" {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "nama wajib diisi"})
				return
			}
			gid := req.GroupID
			if adminGID > 0 {
				gid = &adminGID
			}
			var id int64
			err := a.db.QueryRowContext(ctx, `INSERT INTO tryout_configs(name, group_id, is_active) VALUES($1,$2,TRUE) RETURNING id`, req.Name, gid).Scan(&id)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": id})
		case "update":
			if req.ID == 0 { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id required"}); return }
			if req.IsActive != nil {
				_, err = a.db.ExecContext(ctx, `UPDATE tryout_configs SET is_active=$1 WHERE id=$2`, *req.IsActive, req.ID)
			} else {
				_, err = a.db.ExecContext(ctx, `UPDATE tryout_configs SET name=$1 WHERE id=$2`, req.Name, req.ID)
			}
			if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
			writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		case "delete":
			if req.ID == 0 { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id required"}); return }
			_, _ = a.db.ExecContext(ctx, `DELETE FROM tryout_configs WHERE id=$1`, req.ID)
			writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		case "add_item":
			if req.ConfigID == 0 || req.CategoryID == 0 { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "config_id & category_id required"}); return }
			if req.QuestionCount <= 0 { req.QuestionCount = 10 }
			// Cek jumlah soal tersedia di kategori
			var available int
			_ = a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM questions WHERE category_id=$1 AND is_active=TRUE`, req.CategoryID).Scan(&available)
			if req.QuestionCount > available { req.QuestionCount = available }
			var iid int64
			err := a.db.QueryRowContext(ctx, `INSERT INTO tryout_config_items(config_id, category_id, question_count) VALUES($1,$2,$3) RETURNING id`, req.ConfigID, req.CategoryID, req.QuestionCount).Scan(&iid)
			if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
			writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": iid, "available": available})
		case "update_item":
			if req.ItemID == 0 { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "item_id required"}); return }
			if req.QuestionCount <= 0 { req.QuestionCount = 10 }
			_, err = a.db.ExecContext(ctx, `UPDATE tryout_config_items SET question_count=$1 WHERE id=$2`, req.QuestionCount, req.ItemID)
			if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
			writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		case "remove_item":
			if req.ItemID == 0 { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "item_id required"}); return }
			_, _ = a.db.ExecContext(ctx, `DELETE FROM tryout_config_items WHERE id=$1`, req.ItemID)
			writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		default:
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unknown action"})
		}
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

// Helper: load soal tryout dari config aktif untuk group_id tertentu
func (a *app) shuffledTryoutQuestionsFromConfig(ctx context.Context, groupID int64) ([]quizQuestion, error) {
	// Cari config aktif untuk group ini
	var configID int64
	err := a.db.QueryRowContext(ctx, `SELECT id FROM tryout_configs WHERE group_id=$1 AND is_active=TRUE ORDER BY id DESC LIMIT 1`, groupID).Scan(&configID)
	if err != nil || configID == 0 {
		return nil, nil // tidak ada config → fallback ke default
	}
	// Load items
	iRows, err := a.db.QueryContext(ctx, `SELECT category_id, question_count FROM tryout_config_items WHERE config_id=$1`, configID)
	if err != nil { return nil, err }
	defer iRows.Close()
	type item struct{ catID int64; count int }
	var items []item
	for iRows.Next() {
		var it item
		if iRows.Scan(&it.catID, &it.count) == nil { items = append(items, it) }
	}
	iRows.Close()
	if len(items) == 0 { return nil, nil }

	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	var all []quizQuestion
	n := 1
	for _, it := range items {
		qRows, err := a.db.QueryContext(ctx, `
			SELECT question_text, option_a, option_b, option_c, option_d, correct_option
			FROM questions WHERE category_id=$1 AND is_active=TRUE ORDER BY RANDOM() LIMIT $2`, it.catID, it.count)
		if err != nil { continue }
		var catQs []quizQuestion
		for qRows.Next() {
			var qt, a1, b1, c1, d1, ans string
			if qRows.Scan(&qt, &a1, &b1, &c1, &d1, &ans) == nil {
				catQs = append(catQs, quizQuestion{Question: qt, Options: []string{"A. " + a1, "B. " + b1, "C. " + c1, "D. " + d1}, Answer: strings.ToUpper(strings.TrimSpace(ans))})
			}
		}
		qRows.Close()
		all = append(all, catQs...)
	}
	// Acak urutan soal gabungan + nomor ulang
	r.Shuffle(len(all), func(i, j int) { all[i], all[j] = all[j], all[i] })
	for i := range all { all[i].Question = fmt.Sprintf("%d) %s", n, all[i].Question); n++ }
	return all, nil
}

type aiProviderSetting struct {
	Provider    string
	BaseURL     string
	APIKey      string
	Model       string
	Temperature float64
	MaxTokens   int
	IsActive    bool
}

func (a *app) getActiveAISetting(ctx context.Context) (aiProviderSetting, error) {
	cfg := aiProviderSetting{
		Provider:    "sumopod",
		BaseURL:     "https://ai.sumopod.com/v1/chat/completions",
		APIKey:      os.Getenv("SUMOPOD_API_KEY"),
		Model:       "gpt-4o-mini",
		Temperature: 0.7,
		MaxTokens:   2000,
		IsActive:    true,
	}
	// Prioritas: profile aktif
	err := a.db.QueryRowContext(ctx, `
		SELECT provider, base_url, api_key, model, temperature, max_tokens, is_active
		FROM ai_provider_profiles WHERE is_active=TRUE
		ORDER BY updated_at DESC LIMIT 1
	`).Scan(&cfg.Provider, &cfg.BaseURL, &cfg.APIKey, &cfg.Model, &cfg.Temperature, &cfg.MaxTokens, &cfg.IsActive)
	if err != nil {
		_ = a.db.QueryRowContext(ctx, `
			SELECT provider, base_url, api_key, model, temperature, max_tokens, is_active
			FROM ai_provider_settings WHERE id=1
		`).Scan(&cfg.Provider, &cfg.BaseURL, &cfg.APIKey, &cfg.Model, &cfg.Temperature, &cfg.MaxTokens, &cfg.IsActive)
	}
	if strings.TrimSpace(cfg.APIKey) == "" {
		cfg.APIKey = os.Getenv("SUMOPOD_API_KEY")
	}
	if !cfg.IsActive {
		return cfg, errors.New("AI provider nonaktif")
	}
	if strings.TrimSpace(cfg.APIKey) == "" {
		return cfg, errors.New("API key AI belum di-set")
	}
	return cfg, nil
}

func (a *app) aiChat(ctx context.Context, systemPrompt, userPrompt string, maxTokens int, temperature float64) (string, error) {
	cfg, err := a.getActiveAISetting(ctx)
	if err != nil {
		return "", err
	}
	if maxTokens <= 0 { maxTokens = cfg.MaxTokens }
	if temperature <= 0 { temperature = cfg.Temperature }

	type aiMsg struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}
	type aiReq struct {
		Model       string  `json:"model"`
		Messages    []aiMsg `json:"messages"`
		MaxTokens   int     `json:"max_tokens"`
		Temperature float64 `json:"temperature"`
	}
	payload, _ := json.Marshal(aiReq{
		Model: cfg.Model,
		Messages: []aiMsg{{Role: "system", Content: systemPrompt}, {Role: "user", Content: userPrompt}},
		MaxTokens: maxTokens, Temperature: temperature,
	})
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.BaseURL, bytes.NewReader(payload))
	if err != nil { return "", err }
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+cfg.APIKey)
	resp, err := (&http.Client{Timeout: 60 * time.Second}).Do(httpReq)
	if err != nil { return "", err }
	defer resp.Body.Close()

	var aiResp struct {
		Choices []struct{ Message struct{ Content string `json:"content"` } `json:"message"` } `json:"choices"`
		Error   *struct{ Message string `json:"message"` } `json:"error"`
	}
	if json.NewDecoder(resp.Body).Decode(&aiResp) != nil { return "", errors.New("gagal parse respons AI") }
	if aiResp.Error != nil { return "", errors.New(aiResp.Error.Message) }
	if len(aiResp.Choices) == 0 { return "", errors.New("AI tidak menghasilkan konten") }
	return strings.TrimSpace(aiResp.Choices[0].Message.Content), nil
}

func (a *app) handleAdminAISettings(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "admin", "super_admin")
	if err != nil { writeJSON(w, http.StatusUnauthorized, map[string]string{"error":"unauthorized"}); return }
	if !isSuperAdmin(u) { writeJSON(w, http.StatusForbidden, map[string]string{"error":"hanya super_admin"}); return }

	switch r.Method {
	case http.MethodGet:
		cfg := aiProviderSetting{Provider: "sumopod", BaseURL: "https://ai.sumopod.com/v1/chat/completions", Model: "gpt-4o-mini", Temperature: 0.7, MaxTokens: 2000, IsActive: true}
		_ = a.db.QueryRowContext(r.Context(), `SELECT provider, base_url, api_key, model, temperature, max_tokens, is_active FROM ai_provider_settings WHERE id=1`).
			Scan(&cfg.Provider, &cfg.BaseURL, &cfg.APIKey, &cfg.Model, &cfg.Temperature, &cfg.MaxTokens, &cfg.IsActive)
		if strings.TrimSpace(cfg.APIKey) == "" { cfg.APIKey = os.Getenv("SUMOPOD_API_KEY") }
		masked := ""
		if len(cfg.APIKey) > 8 { masked = cfg.APIKey[:4] + "****" + cfg.APIKey[len(cfg.APIKey)-4:] }
		writeJSON(w, http.StatusOK, map[string]any{
			"provider": cfg.Provider, "base_url": cfg.BaseURL, "model": cfg.Model,
			"temperature": cfg.Temperature, "max_tokens": cfg.MaxTokens, "is_active": cfg.IsActive,
			"api_key_masked": masked,
		})
	case http.MethodPost:
		var req struct {
			Provider string `json:"provider"`; BaseURL string `json:"base_url"`; APIKey string `json:"api_key"`; Model string `json:"model"`
			Temperature float64 `json:"temperature"`; MaxTokens int `json:"max_tokens"`; IsActive *bool `json:"is_active"`; Action string `json:"action"`
		}
		if json.NewDecoder(r.Body).Decode(&req) != nil { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"invalid json"}); return }
		if req.Action=="test" {
			content, err := a.aiChat(r.Context(), "Balas singkat.", "Tes koneksi AI", 50, 0.3)
			if err != nil { writeJSON(w, http.StatusBadGateway, map[string]string{"error": err.Error()}); return }
			writeJSON(w, http.StatusOK, map[string]any{"ok": true, "result": content}); return
		}
		isActive := true
		if req.IsActive != nil { isActive = *req.IsActive }
		_, err := a.db.ExecContext(r.Context(), `
			INSERT INTO ai_provider_settings (id, provider, base_url, api_key, model, temperature, max_tokens, is_active, updated_by, updated_at)
			VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,NOW())
			ON CONFLICT (id) DO UPDATE SET
			provider=EXCLUDED.provider, base_url=EXCLUDED.base_url,
			api_key=CASE WHEN EXCLUDED.api_key='' THEN ai_provider_settings.api_key ELSE EXCLUDED.api_key END,
			model=EXCLUDED.model, temperature=EXCLUDED.temperature, max_tokens=EXCLUDED.max_tokens,
			is_active=EXCLUDED.is_active, updated_by=EXCLUDED.updated_by, updated_at=NOW()
		`, strings.TrimSpace(req.Provider), strings.TrimSpace(req.BaseURL), strings.TrimSpace(req.APIKey), strings.TrimSpace(req.Model), req.Temperature, req.MaxTokens, isActive, u.ID)
		if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"gagal simpan ai settings"}); return }
		_ = a.logAdminAction(r.Context(), u.ID, "ai_settings.update", "ai_provider_settings:1", req)
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error":"method not allowed"})
	}
}

func (a *app) handleAdminAIProfiles(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "admin", "super_admin")
	if err != nil { writeJSON(w, http.StatusUnauthorized, map[string]string{"error":"unauthorized"}); return }
	if !isSuperAdmin(u) { writeJSON(w, http.StatusForbidden, map[string]string{"error":"hanya super_admin"}); return }

	switch r.Method {
	case http.MethodGet:
		rows, err := a.db.QueryContext(r.Context(), `SELECT id,name,provider,base_url,model,temperature,max_tokens,is_active,updated_at FROM ai_provider_profiles ORDER BY updated_at DESC`)
		if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"db error"}); return }
		defer rows.Close()
		items := []map[string]any{}
		for rows.Next() {
			var id int64; var name, provider, baseURL, model string; var temp float64; var maxTokens int; var active bool; var updated time.Time
			if rows.Scan(&id,&name,&provider,&baseURL,&model,&temp,&maxTokens,&active,&updated)==nil {
				items = append(items, map[string]any{"id":id,"name":name,"provider":provider,"base_url":baseURL,"model":model,"temperature":temp,"max_tokens":maxTokens,"is_active":active,"updated_at":updated})
			}
		}
		writeJSON(w,http.StatusOK,map[string]any{"items":items})
	case http.MethodPost:
		var req struct {
			Action string `json:"action"`; ID int64 `json:"id"`; Name string `json:"name"`
			Provider string `json:"provider"`; BaseURL string `json:"base_url"`; APIKey string `json:"api_key"`; Model string `json:"model"`
			Temperature float64 `json:"temperature"`; MaxTokens int `json:"max_tokens"`; IsActive *bool `json:"is_active"`
		}
		if json.NewDecoder(r.Body).Decode(&req)!=nil { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"invalid json"}); return }
		switch req.Action {
		case "create", "update":
			if strings.TrimSpace(req.Name)=="" || strings.TrimSpace(req.BaseURL)=="" || strings.TrimSpace(req.Model)=="" {
				writeJSON(w,http.StatusBadRequest,map[string]string{"error":"name/base_url/model wajib"}); return
			}
			if req.MaxTokens<=0 { req.MaxTokens = 2000 }
			if req.Temperature<=0 { req.Temperature = 0.7 }
			if req.Action=="create" {
				_, err = a.db.ExecContext(r.Context(), `INSERT INTO ai_provider_profiles (name,provider,base_url,api_key,model,temperature,max_tokens,is_active,updated_by,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE,$8,NOW())`, strings.TrimSpace(req.Name), strings.TrimSpace(req.Provider), strings.TrimSpace(req.BaseURL), strings.TrimSpace(req.APIKey), strings.TrimSpace(req.Model), req.Temperature, req.MaxTokens, u.ID)
			} else {
				_, err = a.db.ExecContext(r.Context(), `UPDATE ai_provider_profiles SET name=$1,provider=$2,base_url=$3,api_key=CASE WHEN $4='' THEN api_key ELSE $4 END,model=$5,temperature=$6,max_tokens=$7,updated_by=$8,updated_at=NOW() WHERE id=$9`, strings.TrimSpace(req.Name), strings.TrimSpace(req.Provider), strings.TrimSpace(req.BaseURL), strings.TrimSpace(req.APIKey), strings.TrimSpace(req.Model), req.Temperature, req.MaxTokens, u.ID, req.ID)
			}
			if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"gagal simpan profile"}); return }
			writeJSON(w,http.StatusOK,map[string]any{"ok":true})
		case "activate":
			_, _ = a.db.ExecContext(r.Context(), `UPDATE ai_provider_profiles SET is_active=FALSE`)
			_, err = a.db.ExecContext(r.Context(), `UPDATE ai_provider_profiles SET is_active=TRUE, updated_by=$1, updated_at=NOW() WHERE id=$2`, u.ID, req.ID)
			if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"gagal aktifkan profile"}); return }
			writeJSON(w,http.StatusOK,map[string]any{"ok":true})
		case "delete":
			_, err = a.db.ExecContext(r.Context(), `DELETE FROM ai_provider_profiles WHERE id=$1`, req.ID)
			if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"gagal hapus profile"}); return }
			writeJSON(w,http.StatusOK,map[string]any{"ok":true})
		default:
			writeJSON(w,http.StatusBadRequest,map[string]string{"error":"unknown action"})
		}
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error":"method not allowed"})
	}
}

func (a *app) handleAdminGenerateMaterial(w http.ResponseWriter, r *http.Request) {
	_, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	var req struct {
		Topic              string `json:"topic"`
		MateriDescription  string `json:"materi_description"`
		GroupDescription   string `json:"group_description"`
		BubbleCount        int    `json:"bubble_count"`
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil || strings.TrimSpace(req.Topic) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "topic wajib diisi"})
		return
	}
	if req.BubbleCount <= 0 || req.BubbleCount > 8 {
		req.BubbleCount = 3
	}

	// Bangun system prompt
	systemPrompt := `Kamu adalah asisten pembuat materi pembelajaran untuk program pelatihan karyawan.
Tugas kamu adalah membuat konten materi edukasi dalam Bahasa Indonesia yang informatif, ringkas, dan mudah dipahami.
Format output HARUS berupa JSON array of strings, dimana setiap string adalah satu "bubble" pesan (seperti pesan chat).
Setiap bubble maksimal 300 kata. Gunakan Markdown: **bold**, _italic_, bullet list (- item), heading (## Judul).
Jangan tambahkan penjelasan di luar JSON. Langsung output JSON saja.
Contoh format: ["bubble 1 content", "bubble 2 content", "bubble 3 content"]`

	userPrompt := fmt.Sprintf(`Buat materi pembelajaran tentang: "%s"`, req.Topic)
	if req.MateriDescription != "" {
		userPrompt += fmt.Sprintf("\n\nPoin-poin yang harus dibahas:\n%s", req.MateriDescription)
	}
	if req.GroupDescription != "" {
		userPrompt += fmt.Sprintf("\n\nKonteks kelompok/perusahaan: %s", req.GroupDescription)
	}
	userPrompt += fmt.Sprintf("\n\nBagi menjadi %d bubble pesan yang mengalir secara natural.", req.BubbleCount)

	content, errAI := a.aiChat(r.Context(), systemPrompt, userPrompt, 2000, 0.7)
	if errAI != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "gagal hubungi AI: " + errAI.Error()})
		return
	}
	// Coba parse sebagai JSON array
	var bubbles []string
	// Cari JSON array dalam respons (kadang AI tambah teks di sekitar JSON)
	start := strings.Index(content, "[")
	end := strings.LastIndex(content, "]")
	if start >= 0 && end > start {
		jsonPart := content[start : end+1]
		if json.Unmarshal([]byte(jsonPart), &bubbles) != nil {
			// Fallback: jadikan 1 bubble
			bubbles = []string{content}
		}
	} else {
		bubbles = []string{content}
	}

	writeJSON(w, http.StatusOK, map[string]any{"bubbles": bubbles, "topic": req.Topic})
}

func (a *app) handleAdminMaterials(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	adminUserM, err := a.requireRole(ctx, r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	adminGIDM := a.getAdminGroupIDFromUser(ctx, adminUserM)

	if r.Method == http.MethodGet {
		catID := r.URL.Query().Get("category_id")
		groupFilter := r.URL.Query().Get("group_id")
		// Admin biasa: paksa filter ke group sendiri
		if adminGIDM > 0 {
			groupFilter = fmt.Sprintf("%d", adminGIDM)
		}
		query := `
			SELECT lm.id, lm.category_id, lm.title, lm.type, lm.content, lm.exp_reward, lm.order_no, lm.is_active,
			       qc.name, COALESCE(qc.group_id, 0), COALESCE(g.name, '')
			FROM learning_materials lm
			JOIN question_categories qc ON qc.id = lm.category_id
			LEFT JOIN groups g ON g.id = qc.group_id`
		args := []any{}
		conds := []string{}
		if catID != "" {
			conds = append(conds, fmt.Sprintf(`lm.category_id = $%d`, len(args)+1))
			args = append(args, catID)
		}
		if groupFilter != "" {
			conds = append(conds, fmt.Sprintf(`qc.group_id = $%d`, len(args)+1))
			args = append(args, groupFilter)
		}
		if len(conds) > 0 {
			query += ` WHERE ` + strings.Join(conds, ` AND `)
		}
		query += ` ORDER BY lm.category_id, lm.order_no, lm.id`

		rows, err := a.db.QueryContext(ctx, query, args...)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
			return
		}
		defer rows.Close()

		type adminItem struct {
			learningMaterial
			CategoryName   string `json:"category_name"`
			CompletedCount int    `json:"completed_count"`
			GroupID        int64  `json:"group_id"`
			GroupName      string `json:"group_name"`
		}
		items := []adminItem{}
		for rows.Next() {
			var it adminItem
			if err := rows.Scan(&it.ID, &it.CategoryID, &it.Title, &it.Type, &it.Content,
				&it.ExpReward, &it.OrderNo, &it.IsActive, &it.CategoryName, &it.GroupID, &it.GroupName); err != nil {
				continue
			}
			// hitung jumlah peserta yang sudah selesai
			_ = a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM material_progress WHERE material_id=$1`, it.ID).Scan(&it.CompletedCount)
			items = append(items, it)
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
		return
	}

	if r.Method == http.MethodPost {
		var req struct {
			Action     string `json:"action"`
			ID         int    `json:"id"`
			CategoryID int    `json:"category_id"`
			Title      string `json:"title"`
			Type       string `json:"type"`
			Content    string `json:"content"`
			ExpReward  int    `json:"exp_reward"`
			OrderNo    int    `json:"order_no"`
			IsActive   *bool  `json:"is_active"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
			return
		}

		// Validasi: admin biasa tidak boleh tambah materi ke kategori global
		if (req.Action == "create" || req.Action == "update") && req.CategoryID > 0 && !isSuperAdmin(adminUserM) {
			var catGroupID *int64
			_ = a.db.QueryRowContext(ctx, `SELECT group_id FROM question_categories WHERE id=$1`, req.CategoryID).Scan(&catGroupID)
			if catGroupID == nil {
				writeJSON(w, http.StatusForbidden, map[string]string{"error": "admin hanya bisa mengelola materi di kategori yang terikat kelompok — pilih kategori per kelompok"})
				return
			}
		}

		switch req.Action {
		case "create":
			if req.Title == "" || req.CategoryID == 0 {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "title dan category_id wajib diisi"})
				return
			}
			typ := req.Type
			if typ == "" {
				typ = "text"
			}
			expR := req.ExpReward
			if expR <= 0 {
				expR = 10
			}
			isActive := true
			if req.IsActive != nil {
				isActive = *req.IsActive
			}
			var newID int
			err := a.db.QueryRowContext(ctx, `
				INSERT INTO learning_materials (category_id, title, type, content, exp_reward, order_no, is_active)
				VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
			`, req.CategoryID, req.Title, typ, req.Content, expR, req.OrderNo, isActive).Scan(&newID)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal tambah materi"})
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": newID})

		case "update":
			if req.ID == 0 {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id wajib diisi"})
				return
			}
			isActive := true
			if req.IsActive != nil {
				isActive = *req.IsActive
			}
			expR := req.ExpReward
			if expR <= 0 {
				expR = 10
			}
			_, err := a.db.ExecContext(ctx, `
				UPDATE learning_materials
				SET category_id=$1, title=$2, type=$3, content=$4, exp_reward=$5, order_no=$6, is_active=$7, updated_at=NOW()
				WHERE id=$8
			`, req.CategoryID, req.Title, req.Type, req.Content, expR, req.OrderNo, isActive, req.ID)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal update materi"})
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"ok": true})

		case "delete":
			if req.ID == 0 {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id wajib diisi"})
				return
			}
			_, err := a.db.ExecContext(ctx, `DELETE FROM learning_materials WHERE id=$1`, req.ID)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal hapus materi"})
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"ok": true})

		default:
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "action tidak valid"})
		}
		return
	}

	writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
}

// GET /participant/materials?category_id=X
func (a *app) handleParticipantMaterials(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	u, err := a.currentUser(ctx, r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	catID := r.URL.Query().Get("category_id")
	groupID := a.getUserGroupID(ctx, u.ID)

	query := `
		SELECT lm.id, lm.category_id, lm.title, lm.type, lm.content, lm.exp_reward, lm.order_no, lm.is_active,
		       qc.name,
		       CASE WHEN mp.material_id IS NOT NULL THEN TRUE ELSE FALSE END as is_completed,
		       mp.completed_at
		FROM learning_materials lm
		JOIN question_categories qc ON qc.id = lm.category_id
		LEFT JOIN material_progress mp ON mp.material_id = lm.id AND mp.user_id = $1
		WHERE lm.is_active = TRUE`
	args := []any{u.ID}
	// Filter kategori per kelompok
	if groupID > 0 {
		query += ` AND (qc.group_id = $2 OR qc.group_id IS NULL)`
		args = append(args, groupID)
		if catID != "" {
			query += fmt.Sprintf(` AND lm.category_id = $%d`, len(args)+1)
			args = append(args, catID)
		}
	} else if catID != "" {
		query += ` AND lm.category_id = $2`
		args = append(args, catID)
	}
	query += ` ORDER BY lm.category_id, lm.order_no, lm.id`

	rows, err := a.db.QueryContext(ctx, query, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}
	defer rows.Close()

	items := []materialWithProgress{}
	for rows.Next() {
		var it materialWithProgress
		var completedAt *string
		if err := rows.Scan(&it.ID, &it.CategoryID, &it.Title, &it.Type, &it.Content,
			&it.ExpReward, &it.OrderNo, &it.IsActive, &it.CategoryName,
			&it.IsCompleted, &completedAt); err != nil {
			continue
		}
		it.CompletedAt = completedAt
		items = append(items, it)
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// POST /participant/materials/complete
func (a *app) handleParticipantMaterialComplete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	ctx := r.Context()
	u, err := a.currentUser(ctx, r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req struct {
		MaterialID int `json:"material_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.MaterialID == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "material_id wajib diisi"})
		return
	}

	// Ambil data materi (exp_reward + judul)
	var expReward int
	var title string
	err = a.db.QueryRowContext(ctx, `SELECT exp_reward, title FROM learning_materials WHERE id=$1 AND is_active=TRUE`, req.MaterialID).Scan(&expReward, &title)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "materi tidak ditemukan"})
		return
	}

	// Insert progress (IGNORE jika sudah ada — no double EXP)
	var inserted bool
	err = a.db.QueryRowContext(ctx, `
		INSERT INTO material_progress (user_id, material_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, material_id) DO NOTHING
		RETURNING TRUE
	`, u.ID, req.MaterialID).Scan(&inserted)

	if err != nil || !inserted {
		// Sudah selesai sebelumnya
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "exp_gained": 0, "already_completed": true})
		return
	}

	// Berikan EXP
	if expReward > 0 {
		_, _ = a.adjustExp(ctx, u.ID, int64(expReward), fmt.Sprintf("Selesai materi: %s", title))
	}
	// Bonus poin rule material_complete
	if pb := a.getPointBonusRule(ctx, "material_complete"); pb > 0 {
		_, _ = a.adjustPoints(ctx, u.ID, pb, "exp_rule_bonus", "Bonus poin: material_complete", nil)
	}
	// Auto-badge check
	go a.checkAndAwardAutoBadges(context.Background(), u.ID, "materi_all_done")
	go a.checkAndAwardAutoBadges(context.Background(), u.ID, "leaderboard_top3")

	// Cek apakah semua materi kategori sudah selesai → notif Telegram
	go func() {
		bgCtx := context.Background()
		var catID int
		var catName string
		if err := a.db.QueryRowContext(bgCtx, `SELECT category_id FROM learning_materials WHERE id=$1`, req.MaterialID).Scan(&catID); err == nil {
			_ = a.db.QueryRowContext(bgCtx, `SELECT name FROM question_categories WHERE id=$1`, catID).Scan(&catName)
			// Hitung total vs selesai
			var total, done int
			_ = a.db.QueryRowContext(bgCtx, `SELECT COUNT(*) FROM learning_materials WHERE category_id=$1 AND is_active=TRUE`, catID).Scan(&total)
			_ = a.db.QueryRowContext(bgCtx, `
				SELECT COUNT(*) FROM material_progress mp
				JOIN learning_materials lm ON lm.id = mp.material_id
				WHERE lm.category_id=$1 AND lm.is_active=TRUE AND mp.user_id=$2
			`, catID, u.ID).Scan(&done)
			if total > 0 && done >= total {
				a.notifyTelegramUser(bgCtx, u.ID, fmt.Sprintf(
					"🎉 *Selamat!* Kamu sudah menyelesaikan semua materi *%s*!\n\nSekarang kamu siap untuk latihan soal 🧠\nCoba /quiz sekarang ya!",
					catName,
				))
			}
		}
	}()

	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "exp_gained": expReward, "already_completed": false})
}

// ─── Groups (Multi-Tenant) ──────────────────────────────────────

type group struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Code        string `json:"code"`
	Description string `json:"description"`
	IsActive    bool   `json:"is_active"`
	MemberCount int    `json:"member_count"`
}

// GET  /admin/groups        → list semua kelompok
// POST /admin/groups        → create | update | delete
func (a *app) handleAdminGroups(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	u, err := a.requireRole(ctx, r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	if r.Method == http.MethodGet {
		// Admin biasa: kembalikan hanya group miliknya (agar dropdown tetap terisi)
		if !isSuperAdmin(u) {
			rows, err := a.db.QueryContext(ctx, `
				SELECT g.id, g.name, g.code, g.description, g.is_active,
				       COUNT(pp2.user_id) as member_count
				FROM participant_profiles pp
				JOIN groups g ON g.id = pp.group_id
				LEFT JOIN participant_profiles pp2 ON pp2.group_id = g.id
				WHERE pp.user_id = $1
				GROUP BY g.id
				ORDER BY g.created_at DESC
			`, u.ID)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
				return
			}
			defer rows.Close()
			items := []group{}
			for rows.Next() {
				var g group
				if err := rows.Scan(&g.ID, &g.Name, &g.Code, &g.Description, &g.IsActive, &g.MemberCount); err != nil {
					continue
				}
				items = append(items, g)
			}
			writeJSON(w, http.StatusOK, map[string]any{"items": items})
			return
		}

		// Super admin: lihat semua group
		rows, err := a.db.QueryContext(ctx, `
			SELECT g.id, g.name, g.code, g.description, g.is_active,
			       COUNT(pp.user_id) as member_count
			FROM groups g
			LEFT JOIN participant_profiles pp ON pp.group_id = g.id
			GROUP BY g.id ORDER BY g.created_at DESC
		`)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
			return
		}
		defer rows.Close()
		items := []group{}
		for rows.Next() {
			var g group
			if err := rows.Scan(&g.ID, &g.Name, &g.Code, &g.Description, &g.IsActive, &g.MemberCount); err != nil {
				continue
			}
			items = append(items, g)
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
		return
	}

	if r.Method == http.MethodPost {
		if !isSuperAdmin(u) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "hanya super_admin yang bisa mengelola kelompok"})
			return
		}
		var req struct {
			Action      string `json:"action"`
			ID          int    `json:"id"`
			Name        string `json:"name"`
			Code        string `json:"code"`
			Description string `json:"description"`
			IsActive    *bool  `json:"is_active"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
			return
		}

		switch req.Action {
		case "create":
			if req.Name == "" || req.Code == "" {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name dan code wajib diisi"})
				return
			}
			code := strings.ToUpper(strings.TrimSpace(req.Code))
			var newID int
			err := a.db.QueryRowContext(ctx, `
				INSERT INTO groups (name, code, description)
				VALUES ($1, $2, $3) RETURNING id
			`, req.Name, code, req.Description).Scan(&newID)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal buat kelompok (kode mungkin sudah dipakai)"})
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": newID})

		case "update":
			if req.ID == 0 {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id wajib diisi"})
				return
			}
			isActive := true
			if req.IsActive != nil {
				isActive = *req.IsActive
			}
			code := strings.ToUpper(strings.TrimSpace(req.Code))
			_, err := a.db.ExecContext(ctx, `
				UPDATE groups SET name=$1, code=$2, description=$3, is_active=$4, updated_at=NOW()
				WHERE id=$5
			`, req.Name, code, req.Description, isActive, req.ID)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal update kelompok"})
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"ok": true})

		case "delete":
			if req.ID == 0 {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id wajib diisi"})
				return
			}
			// Set group_id = NULL untuk peserta yang ada
			_, _ = a.db.ExecContext(ctx, `UPDATE participant_profiles SET group_id=NULL WHERE group_id=$1`, req.ID)
			_, err := a.db.ExecContext(ctx, `DELETE FROM groups WHERE id=$1`, req.ID)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal hapus kelompok"})
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"ok": true})

		default:
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "action tidak valid"})
		}
		return
	}

	writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
}

// ── Refleksi: Set Jadwal Reminder Peserta ───────────────────────────────────

func (a *app) handleParticipantReflectionReminder(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant", "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	var req struct {
		Time string `json:"time"` // format HH:MM
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	// Validasi format HH:MM
	t := strings.TrimSpace(req.Time)
	if len(t) != 5 || t[2] != ':' {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "format waktu harus HH:MM"})
		return
	}
	_, err = a.db.ExecContext(r.Context(), `
		UPDATE participant_profiles SET reflection_reminder_time=$1 WHERE user_id=$2
	`, t, u.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal simpan jadwal"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "time": t})
}

// ── Refleksi: Endpoint Peserta ──────────────────────────────────────────────

func (a *app) handleParticipantReflections(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant", "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if r.Method == http.MethodGet {
		rows, err := a.db.QueryContext(r.Context(), `
			SELECT id, content, reflected_date, created_at
			FROM reflections
			WHERE user_id=$1
			ORDER BY reflected_date DESC
			LIMIT 90
		`, u.ID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
			return
		}
		defer rows.Close()
		type refItem struct {
			ID            int64  `json:"id"`
			Content       string `json:"content"`
			ReflectedDate string `json:"reflected_date"`
			CreatedAt     string `json:"created_at"`
		}
		items := []refItem{}
		for rows.Next() {
			var it refItem
			var rDate time.Time
			var cAt time.Time
			if err := rows.Scan(&it.ID, &it.Content, &rDate, &cAt); err == nil {
				it.ReflectedDate = rDate.Format("2006-01-02")
				it.CreatedAt = cAt.Format(time.RFC3339)
				items = append(items, it)
			}
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
		return
	}
	if r.Method == http.MethodPost {
		var req struct { Content string `json:"content"` }
		if json.NewDecoder(r.Body).Decode(&req) != nil || strings.TrimSpace(req.Content) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "isi refleksi tidak boleh kosong"})
			return
		}
		content := strings.TrimSpace(req.Content)
		if len(content) > 5000 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "refleksi terlalu panjang (maks 5000 karakter)"})
			return
		}
		var existed bool
		_ = a.db.QueryRowContext(r.Context(), `SELECT EXISTS(SELECT 1 FROM reflections WHERE user_id=$1 AND reflected_date=CURRENT_DATE)`, u.ID).Scan(&existed)
		_, err = a.db.ExecContext(r.Context(), `
			INSERT INTO reflections (user_id, content, reflected_date, created_at)
			VALUES ($1,$2,CURRENT_DATE,NOW())
			ON CONFLICT (user_id, reflected_date)
			DO UPDATE SET content=EXCLUDED.content, created_at=NOW()
		`, u.ID, content)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal simpan refleksi"})
			return
		}
		if !existed {
			a.applyExpRule(r.Context(), u.ID, "reflection_daily", "Refleksi harian via web")
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "awarded_exp": !existed})
		return
	}
	if r.Method == http.MethodDelete {
		idStr := strings.TrimSpace(r.URL.Query().Get("id"))
		if idStr == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id refleksi wajib diisi"})
			return
		}
		id, convErr := strconv.ParseInt(idStr, 10, 64)
		if convErr != nil || id <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id refleksi tidak valid"})
			return
		}
		res, err := a.db.ExecContext(r.Context(), `DELETE FROM reflections WHERE id=$1 AND user_id=$2`, id, u.ID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal hapus refleksi"})
			return
		}
		affected, _ := res.RowsAffected()
		if affected == 0 {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "refleksi tidak ditemukan"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}
	writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
}

// ── Roadmap per Jabatan (Phase 1) ──────────────────────────────────────────

func (a *app) canAccessRoadmapPosition(ctx context.Context, admin authUser, positionID int64) bool {
	if admin.Role == "super_admin" {
		return true
	}
	var adminGroup, posGroup sql.NullInt64
	_ = a.db.QueryRowContext(ctx, `SELECT group_id FROM participant_profiles WHERE user_id=$1`, admin.ID).Scan(&adminGroup)
	_ = a.db.QueryRowContext(ctx, `SELECT group_id FROM roadmap_positions WHERE id=$1`, positionID).Scan(&posGroup)
	if !adminGroup.Valid && !posGroup.Valid {
		return true
	}
	return adminGroup.Valid && posGroup.Valid && adminGroup.Int64 == posGroup.Int64
}

func (a *app) handleAdminRoadmapPositions(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin", "super_admin")
	if err != nil { writeJSON(w, http.StatusUnauthorized, map[string]string{"error":"unauthorized"}); return }
	if r.Method == http.MethodGet {
		rows, err := a.db.QueryContext(r.Context(), `SELECT id,code,name,description,COALESCE(group_id,0),is_active,updated_at FROM roadmap_positions ORDER BY updated_at DESC`)
		if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error":"db error"}); return }
		defer rows.Close()
		type item struct {
			ID          int64  `json:"id"`
			Code        string `json:"code"`
			Name        string `json:"name"`
			Description string `json:"description"`
			GroupID     int64  `json:"group_id"`
			IsActive    bool   `json:"is_active"`
			UpdatedAt   string `json:"updated_at"`
		}
		items := []item{}
		for rows.Next() {
			var it item; var t time.Time
			if rows.Scan(&it.ID,&it.Code,&it.Name,&it.Description,&it.GroupID,&it.IsActive,&t)==nil {
				if admin.Role != "super_admin" && !a.canAccessRoadmapPosition(r.Context(), admin, it.ID) { continue }
				it.UpdatedAt = t.Format(time.RFC3339); items = append(items,it)
			}
		}
		writeJSON(w, http.StatusOK, map[string]any{"items":items}); return
	}
	if r.Method == http.MethodPost {
		var req struct {
			ID          int64  `json:"id"`
			Code        string `json:"code"`
			Name        string `json:"name"`
			Description string `json:"description"`
			GroupID     int64  `json:"group_id"`
			IsActive    *bool  `json:"is_active"`
			Action      string `json:"action"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w,http.StatusBadRequest,map[string]string{"error":"payload tidak valid: " + err.Error()}); return
		}
		if req.Action == "delete" {
			if req.ID <= 0 { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"id wajib"}); return }
			if !a.canAccessRoadmapPosition(r.Context(), admin, req.ID) { writeJSON(w,http.StatusForbidden,map[string]string{"error":"posisi di luar kelompok admin"}); return }
			res, err := a.db.ExecContext(r.Context(), `DELETE FROM roadmap_positions WHERE id=$1`, req.ID)
			if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"gagal hapus posisi roadmap"}); return }
			af, _ := res.RowsAffected(); if af == 0 { writeJSON(w,http.StatusNotFound,map[string]string{"error":"posisi roadmap tidak ditemukan"}); return }
			writeJSON(w,http.StatusOK,map[string]any{"ok":true}); return
		}
		req.Code = strings.ToUpper(strings.TrimSpace(strings.ReplaceAll(req.Code, "\u00a0", " ")))
		req.Name = strings.TrimSpace(strings.ReplaceAll(req.Name, "\u00a0", " "))
		if req.Code == "" { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"kode jabatan wajib diisi"}); return }
		if req.Name == "" { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"nama jabatan wajib diisi"}); return }
		active := true; if req.IsActive != nil { active = *req.IsActive }
		if admin.Role != "super_admin" {
			req.GroupID = a.getAdminGroupIDFromUser(r.Context(), admin)
		}
		if req.ID > 0 {
			if !a.canAccessRoadmapPosition(r.Context(), admin, req.ID) { writeJSON(w,http.StatusForbidden,map[string]string{"error":"posisi di luar kelompok admin"}); return }
			_, err = a.db.ExecContext(r.Context(), `UPDATE roadmap_positions SET code=$1,name=$2,description=$3,group_id=NULLIF($4,0),is_active=$5,updated_by=$6,updated_at=NOW() WHERE id=$7`, req.Code, req.Name, strings.TrimSpace(req.Description), req.GroupID, active, admin.ID, req.ID)
		} else {
			_, err = a.db.ExecContext(r.Context(), `INSERT INTO roadmap_positions(code,name,description,group_id,is_active,created_by,updated_by) VALUES($1,$2,$3,NULLIF($4,0),$5,$6,$6)`, req.Code, req.Name, strings.TrimSpace(req.Description), req.GroupID, active, admin.ID)
		}
		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "unique") || strings.Contains(strings.ToLower(err.Error()), "duplicate") {
				writeJSON(w,http.StatusBadRequest,map[string]string{"error":"kode jabatan sudah digunakan"}); return
			}
			writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"gagal simpan posisi"}); return
		}
		writeJSON(w,http.StatusOK,map[string]any{"ok":true}); return
	}
	writeJSON(w,http.StatusMethodNotAllowed,map[string]string{"error":"method not allowed"})
}

func (a *app) handleAdminRoadmapCompetencies(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin", "super_admin")
	if err != nil { writeJSON(w,http.StatusUnauthorized,map[string]string{"error":"unauthorized"}); return }
	if r.Method == http.MethodGet {
		positionID, _ := strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get("position_id")), 10, 64)
		q := `SELECT id,position_id,code,name,description,is_active,updated_at FROM roadmap_competencies`
		args := []any{}
		if positionID > 0 { q += ` WHERE position_id=$1`; args = append(args, positionID) }
		q += ` ORDER BY updated_at DESC`
		rows, err := a.db.QueryContext(r.Context(), q, args...)
		if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"db error"}); return }
		defer rows.Close()
		type item struct {
			ID          int64  `json:"id"`
			PositionID  int64  `json:"position_id"`
			Code        string `json:"code"`
			Name        string `json:"name"`
			Description string `json:"description"`
			IsActive    bool   `json:"is_active"`
			UpdatedAt   string `json:"updated_at"`
		}
		items := []item{}
		for rows.Next() {
			var it item; var t time.Time
			if rows.Scan(&it.ID,&it.PositionID,&it.Code,&it.Name,&it.Description,&it.IsActive,&t)==nil {
				if admin.Role != "super_admin" && !a.canAccessRoadmapPosition(r.Context(), admin, it.PositionID) { continue }
				it.UpdatedAt = t.Format(time.RFC3339)
				items = append(items, it)
			}
		}
		writeJSON(w,http.StatusOK,map[string]any{"items":items}); return
	}
	if r.Method == http.MethodPost {
		var req struct {
			ID          int64  `json:"id"`
			PositionID  int64  `json:"position_id"`
			Code        string `json:"code"`
			Name        string `json:"name"`
			Description string `json:"description"`
			IsActive    *bool  `json:"is_active"`
			Action      string `json:"action"`
		}
		if json.NewDecoder(r.Body).Decode(&req)!=nil { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"payload tidak valid"}); return }
		if req.Action == "delete" {
			if req.ID <= 0 { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"id wajib"}); return }
			_ = a.db.QueryRowContext(r.Context(), `SELECT position_id FROM roadmap_competencies WHERE id=$1`, req.ID).Scan(&req.PositionID)
			if req.PositionID <= 0 { writeJSON(w,http.StatusNotFound,map[string]string{"error":"kompetensi tidak ditemukan"}); return }
			if admin.Role != "super_admin" && !a.canAccessRoadmapPosition(r.Context(), admin, req.PositionID) { writeJSON(w,http.StatusForbidden,map[string]string{"error":"kompetensi di luar kelompok admin"}); return }
			res, err := a.db.ExecContext(r.Context(), `DELETE FROM roadmap_competencies WHERE id=$1`, req.ID)
			if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"gagal hapus kompetensi"}); return }
			af,_:=res.RowsAffected(); if af==0 { writeJSON(w,http.StatusNotFound,map[string]string{"error":"kompetensi tidak ditemukan"}); return }
			writeJSON(w,http.StatusOK,map[string]any{"ok":true}); return
		}
		req.Code = strings.ToUpper(strings.TrimSpace(strings.ReplaceAll(req.Code, "\u00a0", " ")))
		req.Name = strings.TrimSpace(strings.ReplaceAll(req.Name, "\u00a0", " "))
		if req.PositionID<=0 { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"jabatan wajib dipilih"}); return }
		if req.Code=="" { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"kode kompetensi wajib diisi"}); return }
		if req.Name=="" { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"nama kompetensi wajib diisi"}); return }
		if admin.Role != "super_admin" && !a.canAccessRoadmapPosition(r.Context(), admin, req.PositionID) { writeJSON(w,http.StatusForbidden,map[string]string{"error":"jabatan di luar kelompok admin"}); return }
		active := true; if req.IsActive != nil { active = *req.IsActive }
		if req.ID > 0 {
			_, err = a.db.ExecContext(r.Context(), `UPDATE roadmap_competencies SET position_id=$1,code=$2,name=$3,description=$4,is_active=$5,updated_by=$6,updated_at=NOW() WHERE id=$7`, req.PositionID, req.Code, req.Name, strings.TrimSpace(req.Description), active, admin.ID, req.ID)
		} else {
			_, err = a.db.ExecContext(r.Context(), `INSERT INTO roadmap_competencies(position_id,code,name,description,is_active,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$6)`, req.PositionID, req.Code, req.Name, strings.TrimSpace(req.Description), active, admin.ID)
		}
		if err != nil {
			errText := strings.ToLower(err.Error())
			if strings.Contains(errText, "unique") || strings.Contains(errText, "duplicate") {
				writeJSON(w,http.StatusBadRequest,map[string]string{"error":"kode kompetensi sudah digunakan pada jabatan ini"}); return
			}
			writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"gagal simpan kompetensi"}); return
		}
		writeJSON(w,http.StatusOK,map[string]any{"ok":true}); return
	}
	writeJSON(w,http.StatusMethodNotAllowed,map[string]string{"error":"method not allowed"})
}

func buildGraphFromRoadmapMaterials(materials []struct{ ID int64; Title, Content string }) (string, []string) {
	type node struct { ID int64 `json:"id"`; Title string `json:"title"` }
	type edge struct { From int64 `json:"from"`; To int64 `json:"to"` }
	nodes := []node{}
	edges := []edge{}
	titleToID := map[string]int64{}
	for _, m := range materials {
		nodes = append(nodes, node{ID: m.ID, Title: m.Title})
		titleToID[strings.ToLower(strings.TrimSpace(m.Title))] = m.ID
	}
	unknownSet := map[string]struct{}{}
	edgeSet := map[string]struct{}{}
	for _, m := range materials {
		for _, target := range extractBacklinks(m.Content) {
			k := strings.ToLower(strings.TrimSpace(target))
			toID, ok := titleToID[k]
			if !ok {
				if strings.TrimSpace(target) != "" { unknownSet[strings.TrimSpace(target)] = struct{}{} }
				continue
			}
			es := fmt.Sprintf("%d->%d", m.ID, toID)
			if _, exists := edgeSet[es]; exists { continue }
			edgeSet[es] = struct{}{}
			edges = append(edges, edge{From: m.ID, To: toID})
		}
	}
	unknown := make([]string, 0, len(unknownSet))
	for u := range unknownSet { unknown = append(unknown, u) }
	b, _ := json.Marshal(map[string]any{"nodes": nodes, "edges": edges})
	return string(b), unknown
}

func (a *app) handleAdminRoadmapMaterialsGraph(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin", "super_admin")
	if err != nil { writeJSON(w,http.StatusUnauthorized,map[string]string{"error":"unauthorized"}); return }
	if r.Method != http.MethodGet { writeJSON(w,http.StatusMethodNotAllowed,map[string]string{"error":"method not allowed"}); return }
	positionID, _ := strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get("position_id")), 10, 64)
	q := `
		SELECT rm.id, rm.title, rm.content, rc.position_id
		FROM roadmap_materials rm
		JOIN roadmap_competencies rc ON rc.id=rm.competency_id
	`
	args := []any{}
	if positionID > 0 {
		q += ` WHERE rc.position_id=$1`
		args = append(args, positionID)
	}
	q += ` ORDER BY rm.id ASC`
	rows, err := a.db.QueryContext(r.Context(), q, args...)
	if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"db error"}); return }
	defer rows.Close()
	materials := []struct{ ID int64; Title, Content string }{}
	for rows.Next() {
		var id, posID int64; var title, content string
		if rows.Scan(&id, &title, &content, &posID) == nil {
			if admin.Role != "super_admin" && !a.canAccessRoadmapPosition(r.Context(), admin, posID) { continue }
			materials = append(materials, struct{ ID int64; Title, Content string }{ID: id, Title: title, Content: content})
		}
	}
	graphJSON, unknown := buildGraphFromRoadmapMaterials(materials)
	writeJSON(w,http.StatusOK,map[string]any{"graph_json": graphJSON, "unknown_backlinks": unknown, "count": len(materials)})
}

func (a *app) handleAdminRoadmapMaterials(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin", "super_admin")
	if err != nil { writeJSON(w,http.StatusUnauthorized,map[string]string{"error":"unauthorized"}); return }
	if r.Method == http.MethodGet {
		competencyID, _ := strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get("competency_id")), 10, 64)
		q := `
			SELECT rm.id,rm.competency_id,rc.position_id,rm.title,rm.content,rm.is_active,rm.updated_at
			FROM roadmap_materials rm
			JOIN roadmap_competencies rc ON rc.id=rm.competency_id
		`
		args := []any{}
		if competencyID > 0 {
			q += ` WHERE rm.competency_id=$1`
			args = append(args, competencyID)
		}
		q += ` ORDER BY rm.updated_at DESC`
		rows, err := a.db.QueryContext(r.Context(), q, args...)
		if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"db error"}); return }
		defer rows.Close()
		type item struct {
			ID           int64  `json:"id"`
			CompetencyID int64  `json:"competency_id"`
			PositionID   int64  `json:"position_id"`
			Title        string `json:"title"`
			Content      string `json:"content"`
			IsActive     bool   `json:"is_active"`
			UpdatedAt    string `json:"updated_at"`
		}
		items := []item{}
		for rows.Next() {
			var it item; var t time.Time
			if rows.Scan(&it.ID,&it.CompetencyID,&it.PositionID,&it.Title,&it.Content,&it.IsActive,&t)==nil {
				if admin.Role != "super_admin" && !a.canAccessRoadmapPosition(r.Context(), admin, it.PositionID) { continue }
				it.UpdatedAt = t.Format(time.RFC3339)
				items = append(items, it)
			}
		}
		writeJSON(w,http.StatusOK,map[string]any{"items":items}); return
	}
	if r.Method == http.MethodPost {
		var req struct {
			ID           int64  `json:"id"`
			CompetencyID int64  `json:"competency_id"`
			Title        string `json:"title"`
			Content      string `json:"content"`
			IsActive     *bool  `json:"is_active"`
			Action       string `json:"action"`
		}
		if json.NewDecoder(r.Body).Decode(&req)!=nil { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"payload tidak valid"}); return }
		if req.Action == "delete" {
			if req.ID <= 0 { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"id wajib"}); return }
			var positionID int64
			_ = a.db.QueryRowContext(r.Context(), `SELECT rc.position_id FROM roadmap_materials rm JOIN roadmap_competencies rc ON rc.id=rm.competency_id WHERE rm.id=$1`, req.ID).Scan(&positionID)
			if positionID <= 0 { writeJSON(w,http.StatusNotFound,map[string]string{"error":"materi tidak ditemukan"}); return }
			if admin.Role != "super_admin" && !a.canAccessRoadmapPosition(r.Context(), admin, positionID) { writeJSON(w,http.StatusForbidden,map[string]string{"error":"materi di luar kelompok admin"}); return }
			res, err := a.db.ExecContext(r.Context(), `DELETE FROM roadmap_materials WHERE id=$1`, req.ID)
			if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"gagal hapus materi"}); return }
			af,_ := res.RowsAffected(); if af==0 { writeJSON(w,http.StatusNotFound,map[string]string{"error":"materi tidak ditemukan"}); return }
			writeJSON(w,http.StatusOK,map[string]any{"ok":true}); return
		}
		req.Title = strings.TrimSpace(strings.ReplaceAll(req.Title, "\u00a0", " "))
		if req.CompetencyID<=0 { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"kompetensi teknis wajib dipilih"}); return }
		if req.Title=="" { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"judul materi wajib diisi"}); return }
		var positionID int64
		if err := a.db.QueryRowContext(r.Context(), `SELECT position_id FROM roadmap_competencies WHERE id=$1`, req.CompetencyID).Scan(&positionID); err != nil {
			writeJSON(w,http.StatusBadRequest,map[string]string{"error":"kompetensi teknis tidak ditemukan"}); return
		}
		if admin.Role != "super_admin" && !a.canAccessRoadmapPosition(r.Context(), admin, positionID) { writeJSON(w,http.StatusForbidden,map[string]string{"error":"kompetensi di luar kelompok admin"}); return }
		active := true; if req.IsActive != nil { active = *req.IsActive }
		if req.ID > 0 {
			_, err = a.db.ExecContext(r.Context(), `UPDATE roadmap_materials SET competency_id=$1,title=$2,content=$3,is_active=$4,updated_by=$5,updated_at=NOW() WHERE id=$6`, req.CompetencyID, req.Title, req.Content, active, admin.ID, req.ID)
		} else {
			_, err = a.db.ExecContext(r.Context(), `INSERT INTO roadmap_materials(competency_id,title,content,is_active,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$5)`, req.CompetencyID, req.Title, req.Content, active, admin.ID)
		}
		if err != nil {
			errText := strings.ToLower(err.Error())
			if strings.Contains(errText, "unique") || strings.Contains(errText, "duplicate") {
				writeJSON(w,http.StatusBadRequest,map[string]string{"error":"judul materi sudah digunakan pada kompetensi ini"}); return
			}
			writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"gagal simpan materi"}); return
		}
		writeJSON(w,http.StatusOK,map[string]any{"ok":true}); return
	}
	writeJSON(w,http.StatusMethodNotAllowed,map[string]string{"error":"method not allowed"})
}

func (a *app) handleAdminRoadmapCategories(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin", "super_admin")
	if err != nil { writeJSON(w,http.StatusUnauthorized,map[string]string{"error":"unauthorized"}); return }
	if r.Method == http.MethodGet {
		positionID, _ := strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get("position_id")), 10, 64)
		q := `SELECT rc.id,rc.position_id,rp.name,rc.name,rc.description,rc.order_no,rc.is_active,rc.updated_at FROM roadmap_categories rc JOIN roadmap_positions rp ON rp.id=rc.position_id`
		args := []any{}
		if positionID > 0 { q += ` WHERE rc.position_id=$1`; args = append(args, positionID) }
		q += ` ORDER BY rc.order_no ASC, rc.updated_at DESC`
		rows, err := a.db.QueryContext(r.Context(), q, args...)
		if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"db error"}); return }
		defer rows.Close()
		type item struct {
			ID           int64  `json:"id"`
			PositionID   int64  `json:"position_id"`
			PositionName string `json:"position_name"`
			Name         string `json:"name"`
			Description  string `json:"description"`
			OrderNo      int    `json:"order_no"`
			IsActive     bool   `json:"is_active"`
			UpdatedAt    string `json:"updated_at"`
		}
		items := []item{}
		for rows.Next() { var it item; var t time.Time; if rows.Scan(&it.ID,&it.PositionID,&it.PositionName,&it.Name,&it.Description,&it.OrderNo,&it.IsActive,&t)==nil {
			if admin.Role != "super_admin" && !a.canAccessRoadmapPosition(r.Context(), admin, it.PositionID) { continue }
			it.UpdatedAt=t.Format(time.RFC3339); items = append(items,it)
		}}
		writeJSON(w,http.StatusOK,map[string]any{"items":items}); return
	}
	if r.Method == http.MethodPost {
		var req struct {
			ID          int64  `json:"id"`
			PositionID  int64  `json:"position_id"`
			Name        string `json:"name"`
			Description string `json:"description"`
			OrderNo     int    `json:"order_no"`
			IsActive    *bool  `json:"is_active"`
			Action      string `json:"action"`
		}
		if json.NewDecoder(r.Body).Decode(&req)!=nil { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"payload tidak valid"}); return }
		if req.Action == "delete" {
			if req.ID <= 0 { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"id wajib"}); return }
			_ = a.db.QueryRowContext(r.Context(), `SELECT position_id FROM roadmap_categories WHERE id=$1`, req.ID).Scan(&req.PositionID)
			if req.PositionID <= 0 { writeJSON(w,http.StatusNotFound,map[string]string{"error":"kategori roadmap tidak ditemukan"}); return }
			if admin.Role != "super_admin" && !a.canAccessRoadmapPosition(r.Context(), admin, req.PositionID) { writeJSON(w,http.StatusForbidden,map[string]string{"error":"kategori di luar kelompok admin"}); return }
			res, err := a.db.ExecContext(r.Context(), `DELETE FROM roadmap_categories WHERE id=$1`, req.ID)
			if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"gagal hapus kategori roadmap"}); return }
			af, _ := res.RowsAffected(); if af == 0 { writeJSON(w,http.StatusNotFound,map[string]string{"error":"kategori roadmap tidak ditemukan"}); return }
			writeJSON(w,http.StatusOK,map[string]any{"ok":true}); return
		}
		if req.PositionID<=0 || strings.TrimSpace(req.Name)=="" { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"position_id dan name wajib"}); return }
		if admin.Role != "super_admin" && !a.canAccessRoadmapPosition(r.Context(), admin, req.PositionID) { writeJSON(w,http.StatusForbidden,map[string]string{"error":"posisi di luar kelompok admin"}); return }
		active := true; if req.IsActive!=nil { active = *req.IsActive }
		if req.ID > 0 {
			_, err = a.db.ExecContext(r.Context(), `UPDATE roadmap_categories SET position_id=$1,name=$2,description=$3,order_no=$4,is_active=$5,updated_by=$6,updated_at=NOW() WHERE id=$7`, req.PositionID, strings.TrimSpace(req.Name), strings.TrimSpace(req.Description), req.OrderNo, active, admin.ID, req.ID)
		} else {
			_, err = a.db.ExecContext(r.Context(), `INSERT INTO roadmap_categories(position_id,name,description,order_no,is_active,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$6)`, req.PositionID, strings.TrimSpace(req.Name), strings.TrimSpace(req.Description), req.OrderNo, active, admin.ID)
		}
		if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"gagal simpan kategori"}); return }
		writeJSON(w,http.StatusOK,map[string]any{"ok":true}); return
	}
	writeJSON(w,http.StatusMethodNotAllowed,map[string]string{"error":"method not allowed"})
}

func extractBacklinks(s string) []string {
	out := []string{}
	seen := map[string]bool{}
	for {
		i := strings.Index(s, "[[")
		if i < 0 {
			break
		}
		s = s[i+2:]
		j := strings.Index(s, "]]")
		if j < 0 {
			break
		}
		t := strings.TrimSpace(s[:j])
		s = s[j+2:]
		if t == "" {
			continue
		}
		k := strings.ToLower(t)
		if !seen[k] {
			seen[k] = true
			out = append(out, t)
		}
	}
	return out
}

func (a *app) hasRoadmapNotesRoadmapIDColumn(ctx context.Context) bool {
	var exists bool
	_ = a.db.QueryRowContext(ctx, `SELECT EXISTS(
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='roadmap_notes' AND column_name='roadmap_id'
	)`).Scan(&exists)
	return exists
}

func (a *app) ensureLegacyRoadmapID(ctx context.Context, categoryID int64, adminID int64) (int64, error) {
	_, _ = a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS category_roadmaps (
			id            BIGSERIAL PRIMARY KEY,
			category_id   INT NOT NULL,
			title         TEXT NOT NULL,
			description   TEXT NOT NULL DEFAULT '',
			graph_json    TEXT NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
			is_published  BOOLEAN NOT NULL DEFAULT FALSE,
			created_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
			updated_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
			created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	var id int64
	err := a.db.QueryRowContext(ctx, `SELECT id FROM category_roadmaps WHERE category_id=$1 ORDER BY id DESC LIMIT 1`, categoryID).Scan(&id)
	if err == nil && id > 0 {
		return id, nil
	}
	err = a.db.QueryRowContext(ctx, `
		INSERT INTO category_roadmaps(category_id, title, description, graph_json, is_published, created_by, updated_by)
		VALUES($1,$2,'','{"nodes":[],"edges":[]}',FALSE,$3,$3)
		RETURNING id
	`, categoryID, fmt.Sprintf("Roadmap Kategori %d", categoryID), adminID).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (a *app) handleAdminRoadmapNotes(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin", "super_admin")
	if err != nil { writeJSON(w,http.StatusUnauthorized,map[string]string{"error":"unauthorized"}); return }
	if r.Method == http.MethodGet {
		categoryID, _ := strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get("category_id")), 10, 64)
		if categoryID <= 0 { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"category_id wajib"}); return }
		var positionID int64
		_ = a.db.QueryRowContext(r.Context(), `SELECT position_id FROM roadmap_categories WHERE id=$1`, categoryID).Scan(&positionID)
		if admin.Role != "super_admin" && !a.canAccessRoadmapPosition(r.Context(), admin, positionID) { writeJSON(w,http.StatusForbidden,map[string]string{"error":"kategori di luar kelompok admin"}); return }
		rows, err := a.db.QueryContext(r.Context(), `SELECT id,title,content,updated_at FROM roadmap_notes WHERE category_id=$1 ORDER BY updated_at DESC`, categoryID)
		if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"db error"}); return }
		defer rows.Close()
		type item struct {
			ID        int64  `json:"id"`
			Title     string `json:"title"`
			Content   string `json:"content"`
			UpdatedAt string `json:"updated_at"`
		}
		items := []item{}
		for rows.Next() { var it item; var t time.Time; if rows.Scan(&it.ID,&it.Title,&it.Content,&t)==nil { it.UpdatedAt=t.Format(time.RFC3339); items=append(items,it) }}
		writeJSON(w,http.StatusOK,map[string]any{"items":items}); return
	}
	if r.Method == http.MethodPost {
		var req struct {
			ID         int64  `json:"id"`
			CategoryID int64  `json:"category_id"`
			Title      string `json:"title"`
			Content    string `json:"content"`
			Action     string `json:"action"`
		}
		if json.NewDecoder(r.Body).Decode(&req)!=nil { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"payload tidak valid"}); return }
		if req.Action == "delete" {
			if req.ID <= 0 { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"id wajib"}); return }
			_ = a.db.QueryRowContext(r.Context(), `SELECT category_id FROM roadmap_notes WHERE id=$1`, req.ID).Scan(&req.CategoryID)
			if req.CategoryID <= 0 { writeJSON(w,http.StatusNotFound,map[string]string{"error":"catatan roadmap tidak ditemukan"}); return }
			var positionID int64
			_ = a.db.QueryRowContext(r.Context(), `SELECT position_id FROM roadmap_categories WHERE id=$1`, req.CategoryID).Scan(&positionID)
			if admin.Role != "super_admin" && !a.canAccessRoadmapPosition(r.Context(), admin, positionID) { writeJSON(w,http.StatusForbidden,map[string]string{"error":"catatan di luar kelompok admin"}); return }
			res, err := a.db.ExecContext(r.Context(), `DELETE FROM roadmap_notes WHERE id=$1`, req.ID)
			if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"gagal hapus catatan roadmap"}); return }
			af,_:=res.RowsAffected(); if af==0 { writeJSON(w,http.StatusNotFound,map[string]string{"error":"catatan roadmap tidak ditemukan"}); return }
			writeJSON(w,http.StatusOK,map[string]any{"ok":true}); return
		}
		if req.CategoryID<=0 || strings.TrimSpace(req.Title)=="" { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"category_id dan title wajib"}); return }
		var positionID int64
		if err := a.db.QueryRowContext(r.Context(), `SELECT position_id FROM roadmap_categories WHERE id=$1`, req.CategoryID).Scan(&positionID); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeJSON(w,http.StatusBadRequest,map[string]string{"error":"kategori roadmap tidak ditemukan; silakan pilih ulang kategori"}); return
			}
			writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"gagal validasi kategori roadmap"}); return
		}
		if admin.Role != "super_admin" && !a.canAccessRoadmapPosition(r.Context(), admin, positionID) { writeJSON(w,http.StatusForbidden,map[string]string{"error":"kategori di luar kelompok admin"}); return }
		title := strings.TrimSpace(req.Title)
		var savedID int64
		var savedTitle, savedContent string
		var savedAt time.Time
		if req.ID > 0 {
			err = a.db.QueryRowContext(r.Context(), `
				UPDATE roadmap_notes SET category_id=$1,title=$2,content=$3,updated_by=$4,updated_at=NOW()
				WHERE id=$5
				RETURNING id,title,content,updated_at
			`, req.CategoryID, title, req.Content, admin.ID, req.ID).Scan(&savedID, &savedTitle, &savedContent, &savedAt)
		} else {
			err = a.db.QueryRowContext(r.Context(), `
				INSERT INTO roadmap_notes(category_id,title,content,created_by,updated_by)
				VALUES($1,$2,$3,$4,$4)
				RETURNING id,title,content,updated_at
			`, req.CategoryID, title, req.Content, admin.ID).Scan(&savedID, &savedTitle, &savedContent, &savedAt)
		}
		if err != nil {
			msg := "gagal simpan catatan"
			errText := strings.ToLower(err.Error())
			if strings.Contains(errText, "duplicate") || strings.Contains(errText, "unique") {
				msg = "judul catatan sudah ada di kategori ini"
			}
			writeJSON(w,http.StatusInternalServerError,map[string]string{"error": msg, "detail": err.Error()}); return
		}
		writeJSON(w,http.StatusOK,map[string]any{"ok":true, "item": map[string]any{"id": savedID, "title": savedTitle, "content": savedContent, "updated_at": savedAt.Format(time.RFC3339)}}); return
	}
	writeJSON(w,http.StatusMethodNotAllowed,map[string]string{"error":"method not allowed"})
}

func buildGraphFromRoadmapNotes(notes []struct{ ID int64; Title, Content string }, idPrefix string) (string, int, int, []string) {
	titleToID := map[string]string{}
	for _, x := range notes {
		titleToID[strings.ToLower(strings.TrimSpace(x.Title))] = fmt.Sprintf("%s%d", idPrefix, x.ID)
	}
	nodes := []map[string]any{}
	edges := []map[string]any{}
	seen := map[string]bool{}
	unknownSet := map[string]bool{}
	for _, x := range notes {
		sid := fmt.Sprintf("%s%d", idPrefix, x.ID)
		nodes = append(nodes, map[string]any{"id": sid, "label": x.Title})
		for _, bk := range extractBacklinks(x.Content) {
			kTitle := strings.ToLower(strings.TrimSpace(bk))
			if tid, ok := titleToID[kTitle]; ok && tid != sid {
				k := sid + "->" + tid
				if !seen[k] {
					seen[k] = true
					edges = append(edges, map[string]any{"source": sid, "target": tid})
				}
			} else if !ok {
				unknownSet[strings.TrimSpace(bk)] = true
			}
		}
	}
	unknown := []string{}
	for x := range unknownSet {
		unknown = append(unknown, x)
	}
	buf, _ := json.Marshal(map[string]any{"nodes": nodes, "edges": edges})
	return string(buf), len(nodes), len(edges), unknown
}

func (a *app) handleAdminRoadmapGraph(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin", "super_admin")
	if err != nil { writeJSON(w,http.StatusUnauthorized,map[string]string{"error":"unauthorized"}); return }
	if r.Method != http.MethodGet {
		writeJSON(w,http.StatusMethodNotAllowed,map[string]string{"error":"method not allowed"}); return
	}
	categoryID, _ := strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get("category_id")), 10, 64)
	if categoryID <= 0 { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"category_id wajib"}); return }
	var positionID int64
	_ = a.db.QueryRowContext(r.Context(), `SELECT position_id FROM roadmap_categories WHERE id=$1`, categoryID).Scan(&positionID)
	if admin.Role != "super_admin" && !a.canAccessRoadmapPosition(r.Context(), admin, positionID) { writeJSON(w,http.StatusForbidden,map[string]string{"error":"kategori di luar kelompok admin"}); return }

	rows, err := a.db.QueryContext(r.Context(), `SELECT id,title,content FROM roadmap_notes WHERE category_id=$1 ORDER BY id ASC`, categoryID)
	if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"db error"}); return }
	defer rows.Close()
	notes := []struct{ ID int64; Title, Content string }{}
	for rows.Next() {
		var x struct{ ID int64; Title, Content string }
		if rows.Scan(&x.ID,&x.Title,&x.Content)==nil { notes = append(notes,x) }
	}
	graph, nCount, eCount, unknown := buildGraphFromRoadmapNotes(notes, "n")
	writeJSON(w,http.StatusOK,map[string]any{"ok": true, "graph_json": graph, "nodes": nCount, "edges": eCount, "unknown_backlinks": unknown})
}

func (a *app) handleAdminRoadmapPositionGraph(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin", "super_admin")
	if err != nil { writeJSON(w,http.StatusUnauthorized,map[string]string{"error":"unauthorized"}); return }
	if r.Method != http.MethodGet {
		writeJSON(w,http.StatusMethodNotAllowed,map[string]string{"error":"method not allowed"}); return
	}
	positionID, _ := strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get("position_id")), 10, 64)
	if positionID <= 0 { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"position_id wajib"}); return }
	if admin.Role != "super_admin" && !a.canAccessRoadmapPosition(r.Context(), admin, positionID) { writeJSON(w,http.StatusForbidden,map[string]string{"error":"posisi di luar kelompok admin"}); return }

	catIDsRaw := strings.TrimSpace(r.URL.Query().Get("category_ids"))
	catIDs := []int64{}
	if catIDsRaw != "" {
		for _, s := range strings.Split(catIDsRaw, ",") {
			v, _ := strconv.ParseInt(strings.TrimSpace(s), 10, 64)
			if v > 0 { catIDs = append(catIDs, v) }
		}
	}

	q := `SELECT rn.id,rn.title,rn.content FROM roadmap_notes rn JOIN roadmap_categories rc ON rc.id=rn.category_id WHERE rc.position_id=$1`
	args := []any{positionID}
	if len(catIDs) > 0 {
		ph := []string{}
		for i, id := range catIDs {
			args = append(args, id)
			ph = append(ph, fmt.Sprintf("$%d", i+2))
		}
		q += ` AND rn.category_id IN (` + strings.Join(ph, ",") + `)`
	}
	q += ` ORDER BY rn.id ASC`
	rows, err := a.db.QueryContext(r.Context(), q, args...)
	if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"db error"}); return }
	defer rows.Close()
	notes := []struct{ ID int64; Title, Content string }{}
	for rows.Next() {
		var x struct{ ID int64; Title, Content string }
		if rows.Scan(&x.ID,&x.Title,&x.Content)==nil { notes = append(notes,x) }
	}
	graph, nCount, eCount, unknown := buildGraphFromRoadmapNotes(notes, "p")
	writeJSON(w,http.StatusOK,map[string]any{"ok": true, "graph_json": graph, "nodes": nCount, "edges": eCount, "unknown_backlinks": unknown})
}

func (a *app) participantRoadmapGroupID(ctx context.Context, u authUser) int64 {
	if u.Role == "super_admin" { return 0 }
	var gid sql.NullInt64
	_ = a.db.QueryRowContext(ctx, `SELECT group_id FROM participant_profiles WHERE user_id=$1`, u.ID).Scan(&gid)
	if gid.Valid { return gid.Int64 }
	return -1
}

func (a *app) handleParticipantRoadmapPositions(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant", "admin", "super_admin")
	if err != nil { writeJSON(w,http.StatusUnauthorized,map[string]string{"error":"unauthorized"}); return }
	if r.Method != http.MethodGet { writeJSON(w,http.StatusMethodNotAllowed,map[string]string{"error":"method not allowed"}); return }
	gid := a.participantRoadmapGroupID(r.Context(), u)
	q := `SELECT id,name,description FROM roadmap_positions WHERE is_active=TRUE`
	args := []any{}
	if gid > 0 { q += ` AND COALESCE(group_id,0) IN (0,$1)`; args = append(args, gid) }
	q += ` ORDER BY name ASC`
	rows, err := a.db.QueryContext(r.Context(), q, args...)
	if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"db error"}); return }
	defer rows.Close()
	items := []map[string]any{}
	for rows.Next() { var id int64; var n,d string; if rows.Scan(&id,&n,&d)==nil { items=append(items,map[string]any{"id":id,"name":n,"description":d}) }}
	writeJSON(w,http.StatusOK,map[string]any{"items":items})
}

func (a *app) handleParticipantRoadmapCategories(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant", "admin", "super_admin")
	if err != nil { writeJSON(w,http.StatusUnauthorized,map[string]string{"error":"unauthorized"}); return }
	if r.Method != http.MethodGet { writeJSON(w,http.StatusMethodNotAllowed,map[string]string{"error":"method not allowed"}); return }
	positionID, _ := strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get("position_id")),10,64)
	if positionID <= 0 { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"position_id wajib"}); return }
	if u.Role != "super_admin" {
		adminLike := authUser{ID:u.ID, Role:u.Role}
		if !a.canAccessRoadmapPosition(r.Context(), adminLike, positionID) { writeJSON(w,http.StatusForbidden,map[string]string{"error":"posisi tidak dapat diakses"}); return }
	}
	rows, err := a.db.QueryContext(r.Context(), `SELECT id,name,description,order_no FROM roadmap_categories WHERE position_id=$1 AND is_active=TRUE ORDER BY order_no ASC,name ASC`, positionID)
	if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"db error"}); return }
	defer rows.Close()
	items := []map[string]any{}
	for rows.Next() { var id int64; var n,d string; var o int; if rows.Scan(&id,&n,&d,&o)==nil { items=append(items,map[string]any{"id":id,"name":n,"description":d,"order_no":o}) }}
	writeJSON(w,http.StatusOK,map[string]any{"items":items})
}

func (a *app) handleParticipantRoadmapGraph(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant", "admin", "super_admin")
	if err != nil { writeJSON(w,http.StatusUnauthorized,map[string]string{"error":"unauthorized"}); return }
	if r.Method != http.MethodGet { writeJSON(w,http.StatusMethodNotAllowed,map[string]string{"error":"method not allowed"}); return }
	categoryID, _ := strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get("category_id")),10,64)
	if categoryID <= 0 { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"category_id wajib"}); return }
	var positionID int64
	_ = a.db.QueryRowContext(r.Context(), `SELECT position_id FROM roadmap_categories WHERE id=$1`, categoryID).Scan(&positionID)
	if u.Role != "super_admin" {
		adminLike := authUser{ID:u.ID, Role:u.Role}
		if !a.canAccessRoadmapPosition(r.Context(), adminLike, positionID) { writeJSON(w,http.StatusForbidden,map[string]string{"error":"kategori tidak dapat diakses"}); return }
	}
	rows, err := a.db.QueryContext(r.Context(), `SELECT id,title,content FROM roadmap_notes WHERE category_id=$1 ORDER BY id ASC`, categoryID)
	if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"db error"}); return }
	defer rows.Close()
	notes := []struct{ ID int64; Title, Content string }{}
	for rows.Next() { var x struct{ ID int64; Title, Content string }; if rows.Scan(&x.ID,&x.Title,&x.Content)==nil { notes=append(notes,x) } }
	graph, nCount, eCount, unknown := buildGraphFromRoadmapNotes(notes, "n")
	writeJSON(w,http.StatusOK,map[string]any{"ok":true,"graph_json":graph,"nodes":nCount,"edges":eCount,"unknown_backlinks":unknown})
}

func (a *app) handleParticipantRoadmapPositionGraph(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant", "admin", "super_admin")
	if err != nil { writeJSON(w,http.StatusUnauthorized,map[string]string{"error":"unauthorized"}); return }
	if r.Method != http.MethodGet { writeJSON(w,http.StatusMethodNotAllowed,map[string]string{"error":"method not allowed"}); return }
	positionID, _ := strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get("position_id")),10,64)
	if positionID <= 0 { writeJSON(w,http.StatusBadRequest,map[string]string{"error":"position_id wajib"}); return }
	if u.Role != "super_admin" {
		adminLike := authUser{ID:u.ID, Role:u.Role}
		if !a.canAccessRoadmapPosition(r.Context(), adminLike, positionID) { writeJSON(w,http.StatusForbidden,map[string]string{"error":"posisi tidak dapat diakses"}); return }
	}
	catIDsRaw := strings.TrimSpace(r.URL.Query().Get("category_ids"))
	catIDs := []int64{}
	if catIDsRaw != "" { for _, s := range strings.Split(catIDsRaw, ",") { v,_ := strconv.ParseInt(strings.TrimSpace(s),10,64); if v>0 { catIDs=append(catIDs,v) } } }
	q := `SELECT rn.id,rn.title,rn.content FROM roadmap_notes rn JOIN roadmap_categories rc ON rc.id=rn.category_id WHERE rc.position_id=$1 AND rc.is_active=TRUE`
	args := []any{positionID}
	if len(catIDs)>0 {
		ph:=[]string{}
		for i,id := range catIDs { args=append(args,id); ph=append(ph, fmt.Sprintf("$%d", i+2)) }
		q += ` AND rn.category_id IN (` + strings.Join(ph, ",") + `)`
	}
	q += ` ORDER BY rn.id ASC`
	rows, err := a.db.QueryContext(r.Context(), q, args...)
	if err != nil { writeJSON(w,http.StatusInternalServerError,map[string]string{"error":"db error"}); return }
	defer rows.Close()
	notes := []struct{ ID int64; Title, Content string }{}
	for rows.Next() { var x struct{ ID int64; Title, Content string }; if rows.Scan(&x.ID,&x.Title,&x.Content)==nil { notes=append(notes,x) } }
	graph, nCount, eCount, unknown := buildGraphFromRoadmapNotes(notes, "p")
	writeJSON(w,http.StatusOK,map[string]any{"ok":true,"graph_json":graph,"nodes":nCount,"edges":eCount,"unknown_backlinks":unknown})
}

// ── Refleksi: Agregat Admin ─────────────────────────────────────────────────

func (a *app) handleAdminReflectionStats(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	ctx := r.Context()
	adminGID := a.getAdminGroupIDFromUser(ctx, admin)

	// Build group filter suffix for reflection queries
	groupJoin := ""
	groupWhere := ""
	groupArgs := []any{}
	if adminGID > 0 {
		groupJoin = " JOIN participant_profiles pp ON pp.user_id = reflections.user_id"
		groupWhere = " AND pp.group_id = $1"
		groupArgs = []any{adminGID}
	}

	// Total refleksi hari ini
	var todayCount int
	_ = a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM reflections`+groupJoin+` WHERE reflected_date=CURRENT_DATE`+groupWhere, groupArgs...).Scan(&todayCount)

	// Total refleksi 7 hari terakhir
	var weekCount int
	_ = a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM reflections`+groupJoin+` WHERE reflected_date >= CURRENT_DATE - INTERVAL '7 days'`+groupWhere, groupArgs...).Scan(&weekCount)

	// Jumlah peserta unik yang pernah refleksi
	var uniqueUsers int
	_ = a.db.QueryRowContext(ctx, `SELECT COUNT(DISTINCT reflections.user_id) FROM reflections`+groupJoin+` WHERE 1=1`+groupWhere, groupArgs...).Scan(&uniqueUsers)

	// Tren 7 hari (per tanggal)
	rows, err := a.db.QueryContext(ctx, `
		SELECT reflected_date::text, COUNT(*) as cnt
		FROM reflections`+groupJoin+`
		WHERE reflected_date >= CURRENT_DATE - INTERVAL '6 days'`+groupWhere+`
		GROUP BY reflected_date
		ORDER BY reflected_date ASC
	`, groupArgs...)
	trend := []map[string]any{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var d string
			var cnt int
			if rows.Scan(&d, &cnt) == nil {
				trend = append(trend, map[string]any{"date": d, "count": cnt})
			}
		}
	}

	// Top 5 peserta paling aktif (hanya jumlah, bukan isi)
	topRows, _ := a.db.QueryContext(ctx, `
		SELECT pp.name, COUNT(*) as cnt
		FROM reflections r
		JOIN participant_profiles pp ON pp.user_id = r.user_id
		WHERE r.reflected_date >= CURRENT_DATE - INTERVAL '30 days'`+groupWhere+`
		GROUP BY pp.name
		ORDER BY cnt DESC
		LIMIT 5
	`, groupArgs...)
	topUsers := []map[string]any{}
	if topRows != nil {
		defer topRows.Close()
		for topRows.Next() {
			var name string
			var cnt int
			if topRows.Scan(&name, &cnt) == nil {
				topUsers = append(topUsers, map[string]any{"name": name, "count": cnt})
			}
		}
	}

	// Tabel semua peserta: status refleksi hari ini + jadwal reminder
	pRowQuery := `
		SELECT
			pp.name,
			COALESCE(g.name, '-') as group_name,
			COALESCE(pp.reflection_reminder_time, '20:00') as reminder_time,
			CASE WHEN r.id IS NOT NULL THEN TRUE ELSE FALSE END as reflected_today,
			COALESCE(COUNT(r2.id) FILTER (WHERE r2.reflected_date >= CURRENT_DATE - INTERVAL '30 days'), 0) as month_count
		FROM participant_profiles pp
		JOIN users u ON u.id = pp.user_id AND u.role = 'participant' AND u.is_active = TRUE
		LEFT JOIN groups g ON g.id = pp.group_id
		LEFT JOIN reflections r ON r.user_id = pp.user_id AND r.reflected_date = CURRENT_DATE
		LEFT JOIN reflections r2 ON r2.user_id = pp.user_id`
	pRowArgs := []any{}
	if adminGID > 0 {
		pRowQuery += ` WHERE pp.group_id = $1`
		pRowArgs = []any{adminGID}
	}
	pRowQuery += ` GROUP BY pp.name, g.name, pp.reflection_reminder_time, r.id ORDER BY reflected_today DESC, month_count DESC, pp.name ASC`
	participantRows, _ := a.db.QueryContext(ctx, pRowQuery, pRowArgs...)
	participants := []map[string]any{}
	if participantRows != nil {
		defer participantRows.Close()
		for participantRows.Next() {
			var name, groupName, reminderTime string
			var reflectedToday bool
			var monthCount int
			if participantRows.Scan(&name, &groupName, &reminderTime, &reflectedToday, &monthCount) == nil {
				participants = append(participants, map[string]any{
					"name": name, "group_name": groupName,
					"reminder_time": reminderTime, "reflected_today": reflectedToday,
					"month_count": monthCount,
				})
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"today":        todayCount,
		"week":         weekCount,
		"unique_users": uniqueUsers,
		"trend":        trend,
		"top_users":    topUsers,
		"participants": participants,
	})
}

// ── Refleksi: Daily Reminder Goroutine ─────────────────────────────────────

func (a *app) startReflectionReminder(ctx context.Context) {
	go func() {
		wib := time.FixedZone("WIB", 7*3600)
		for {
			select {
			case <-ctx.Done():
				return
			case <-time.After(1 * time.Minute):
			}
			now := time.Now().In(wib)
			currentHHMM := fmt.Sprintf("%02d:%02d", now.Hour(), now.Minute())
			// Kirim reminder ke peserta yang jadwal remindernya = menit ini & belum refleksi hari ini
			a.sendReflectionRemindersByTime(ctx, currentHHMM)
		}
	}()
}

func (a *app) sendReflectionRemindersByTime(ctx context.Context, hhMM string) {
	if a.telegramBotToken == "" {
		return
	}
	// Kirim ke peserta yang jadwal remindernya = hhMM dan belum refleksi hari ini
	rows, err := a.db.QueryContext(ctx, `
		SELECT tl.telegram_user_id, COALESCE(pp.name, '')
		FROM telegram_links tl
		JOIN users u ON u.id = tl.user_id AND u.is_active = TRUE AND u.role = 'participant'
		JOIN participant_profiles pp ON pp.user_id = tl.user_id
		WHERE COALESCE(pp.reflection_reminder_time, '20:00') = $1
		AND NOT EXISTS (
			SELECT 1 FROM reflections r WHERE r.user_id = tl.user_id AND r.reflected_date = CURRENT_DATE
		)
	`, hhMM)
	if err != nil {
		return
	}
	defer rows.Close()
	a.sendReflectionReminderRows(ctx, rows)
}

func (a *app) sendReflectionReminders(ctx context.Context) {
	if a.telegramBotToken == "" {
		return
	}
	// Ambil semua telegram_user_id peserta aktif yang belum refleksi hari ini
	rows, err := a.db.QueryContext(ctx, `
		SELECT tl.telegram_user_id, COALESCE(pp.name, '')
		FROM telegram_links tl
		JOIN users u ON u.id = tl.user_id AND u.is_active = TRUE AND u.role = 'participant'
		JOIN participant_profiles pp ON pp.user_id = tl.user_id
		WHERE NOT EXISTS (
			SELECT 1 FROM reflections r WHERE r.user_id = tl.user_id AND r.reflected_date = CURRENT_DATE
		)
	`)
	if err != nil {
		return
	}
	defer rows.Close()

	a.sendReflectionReminderRows(ctx, rows)
}

func (a *app) sendReflectionReminderRows(ctx context.Context, rows *sql.Rows) {
	reminderMsgs := []string{
		"Hai *%s*! 🌙\n\nSaatnya luangkan sejenak untuk diri sendiri.\n\nYuk tulis refleksimu sekarang dengan /refleksi 📔\n_Hanya butuh 2 menit!_",
		"Hei *%s*! 📔\n\nIni pengingat refleksi harianmu.\n\nApa yang berkesan dari harimu hari ini? Ceritakan ke Nala lewat /refleksi 🌸",
		"*%s*, waktunya refleksi! 🌙\n\nMenulis perasaan dan pikiranmu bisa membantumu tumbuh lebih baik.\n\nKetik /refleksi dan ceritakan harimu ke Nala 💙",
	}
	idx := 0
	for rows.Next() {
		var tgUID, name string
		if rows.Scan(&tgUID, &name) != nil {
			continue
		}
		firstName := strings.Split(strings.TrimSpace(name), " ")[0]
		if firstName == "" {
			firstName = "kamu"
		}
		// Escape Markdown chars in name agar tidak break formatting
		safeName := escapeMD(firstName)
		msg := fmt.Sprintf(reminderMsgs[idx%len(reminderMsgs)], safeName)
		idx++
		chatID, err := strconv.ParseInt(strings.TrimSpace(tgUID), 10, 64)
		if err != nil || chatID == 0 {
			continue
		}
		go func(cid int64, m string) {
			_ = a.sendTelegramMessage(context.Background(), cid, m, "idle")
		}(chatID, msg)
		time.Sleep(100 * time.Millisecond)
	}
}

// ── Admin: Learning Summary per Peserta ────────────────────────────────────

func (a *app) handleAdminLearningSummary(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	ctx := r.Context()
	adminGID := a.getAdminGroupIDFromUser(ctx, admin)
	groupCond := ""
	groupArgs := []any{}
	if adminGID > 0 {
		groupCond = " AND p.group_id = $1"
		groupArgs = []any{adminGID}
	}

	// Statistik agregat
	var totalParticipants, activeToday, activeWeek int
	_ = a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users u LEFT JOIN participant_profiles p ON p.user_id = u.id WHERE u.role='participant' AND u.is_active=TRUE`+groupCond, groupArgs...).Scan(&totalParticipants)
	_ = a.db.QueryRowContext(ctx, `
		SELECT COUNT(DISTINCT web_uid) FROM (
			SELECT tl.user_id as web_uid FROM quiz_attempts qa
			JOIN telegram_links tl ON tl.telegram_user_id = qa.user_id
			WHERE qa.created_at >= CURRENT_DATE
			UNION SELECT tl.user_id FROM tryout_results tr
			JOIN telegram_links tl ON tl.telegram_user_id = tr.user_id
			WHERE tr.created_at >= CURRENT_DATE
			UNION SELECT user_id FROM material_progress WHERE completed_at >= CURRENT_DATE
		) x
	`).Scan(&activeToday)
	_ = a.db.QueryRowContext(ctx, `
		SELECT COUNT(DISTINCT web_uid) FROM (
			SELECT tl.user_id as web_uid FROM quiz_attempts qa
			JOIN telegram_links tl ON tl.telegram_user_id = qa.user_id
			WHERE qa.created_at >= CURRENT_DATE - INTERVAL '7 days'
			UNION SELECT tl.user_id FROM tryout_results tr
			JOIN telegram_links tl ON tl.telegram_user_id = tr.user_id
			WHERE tr.created_at >= CURRENT_DATE - INTERVAL '7 days'
			UNION SELECT user_id FROM material_progress WHERE completed_at >= CURRENT_DATE - INTERVAL '7 days'
		) x
	`).Scan(&activeWeek)

	// Per peserta: nama, kelompok, materi selesai, quiz attempt, tryout attempt, last active
	rows, err := a.db.QueryContext(ctx, `
		SELECT
			pp.name,
			COALESCE(g.name, '-') as group_name,
			COALESCE(mat.cnt, 0) as materi_count,
			COALESCE(qz.cnt, 0) as quiz_count,
			COALESCE(to2.cnt, 0) as tryout_count,
			GREATEST(
				COALESCE(mat.last_at, '2000-01-01'),
				COALESCE(qz.last_at, '2000-01-01'),
				COALESCE(to2.last_at, '2000-01-01')
			) as last_active
		FROM participant_profiles pp
		JOIN users u ON u.id = pp.user_id AND u.role='participant' AND u.is_active=TRUE
		LEFT JOIN groups g ON g.id = pp.group_id
		LEFT JOIN (
			SELECT user_id, COUNT(*) as cnt, MAX(completed_at) as last_at
			FROM material_progress GROUP BY user_id
		) mat ON mat.user_id = pp.user_id
		LEFT JOIN (
			SELECT tl.user_id as web_uid, COUNT(*) as cnt, MAX(qa.created_at) as last_at
			FROM quiz_attempts qa
			JOIN telegram_links tl ON tl.telegram_user_id = qa.user_id
			GROUP BY tl.user_id
		) qz ON qz.web_uid = pp.user_id
		LEFT JOIN (
			SELECT tl.user_id as web_uid, COUNT(*) as cnt, MAX(tr.created_at) as last_at
			FROM tryout_results tr
			JOIN telegram_links tl ON tl.telegram_user_id = tr.user_id
			GROUP BY tl.user_id
		) to2 ON to2.web_uid = pp.user_id
		WHERE 1=1`+groupCond+`
		ORDER BY last_active DESC, pp.name ASC
	`, groupArgs...)
	participants := []map[string]any{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var name, groupName string
			var materiCnt, quizCnt, tryoutCnt int
			var lastActive time.Time
			if rows.Scan(&name, &groupName, &materiCnt, &quizCnt, &tryoutCnt, &lastActive) == nil {
				daysAgo := int(time.Since(lastActive).Hours() / 24)
				lastStr := ""
				if lastActive.Year() > 2001 {
					if daysAgo == 0 {
						lastStr = "Hari ini"
					} else if daysAgo == 1 {
						lastStr = "Kemarin"
					} else {
						lastStr = fmt.Sprintf("%d hari lalu", daysAgo)
					}
				}
				participants = append(participants, map[string]any{
					"name": name, "group_name": groupName,
					"materi_count": materiCnt, "quiz_count": quizCnt, "tryout_count": tryoutCnt,
					"last_active": lastStr, "days_ago": daysAgo,
				})
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"total_participants": totalParticipants,
		"active_today":       activeToday,
		"active_week":        activeWeek,
		"participants":       participants,
	})
}

// ── Feedback: Scheduler ─────────────────────────────────────────────────────

func (a *app) startFeedbackScheduler(ctx context.Context) {
	go func() {
		wib := time.FixedZone("WIB", 7*3600)
		for {
			select {
			case <-ctx.Done():
				return
			case <-time.After(1 * time.Minute):
			}
			now := time.Now().In(wib)
			currentHHMM := fmt.Sprintf("%02d:%02d", now.Hour(), now.Minute())
			todayStr := now.Format("2006-01-02")

			var sendTime string
			var isActive bool
			var lastSentDate, sendDate *string
			err := a.db.QueryRowContext(ctx, `SELECT send_time, is_active, last_sent_date::text, send_date::text FROM feedback_schedule WHERE id=1`).Scan(&sendTime, &isActive, &lastSentDate, &sendDate)
			if err != nil || !isActive || sendTime != currentHHMM {
				continue
			}
			// Jika send_date diisi, hanya kirim pada tanggal tersebut
			if sendDate != nil && *sendDate != "" && *sendDate != todayStr {
				continue
			}
			// Hanya kirim sekali per hari
			if lastSentDate != nil && *lastSentDate == todayStr {
				continue
			}
			// Update last_sent_date
			_, _ = a.db.ExecContext(ctx, `UPDATE feedback_schedule SET last_sent_date=$1 WHERE id=1`, todayStr)
			go a.broadcastFeedbackRequest(ctx)
		}
	}()
}

func (a *app) broadcastFeedbackRequest(ctx context.Context) {
	if a.telegramBotToken == "" {
		return
	}
	rows, err := a.db.QueryContext(ctx, `
		SELECT tl.telegram_user_id, COALESCE(pp.name, '')
		FROM telegram_links tl
		JOIN users u ON u.id = tl.user_id AND u.is_active = TRUE AND u.role = 'participant'
		JOIN participant_profiles pp ON pp.user_id = tl.user_id
	`)
	if err != nil {
		return
	}
	defer rows.Close()
	msg := "💬 *Hai\\! Nala butuh pendapatmu\\!*\n\nBagaimana pengalamanmu menggunakan *Naik Kelas* akhir\\-akhir ini?\n\nYuk luangkan 1 menit untuk kasih feedback lewat /feedback 🙏\nMasukanmu sangat membantu pengembangan aplikasi ini\\!"
	idx := 0
	for rows.Next() {
		var tgUID, name string
		if rows.Scan(&tgUID, &name) != nil {
			continue
		}
		chatID, _ := strconv.ParseInt(tgUID, 10, 64)
		go func(cid int64, m string) {
			_ = a.sendTelegramMessage(context.Background(), cid, m, "idle")
		}(chatID, msg)
		idx++
		time.Sleep(120 * time.Millisecond)
	}
}

// ── Feedback: Admin Handlers ─────────────────────────────────────────────────

func (a *app) handleAdminSendReflectionNow(w http.ResponseWriter, r *http.Request) {
	_, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	ctx := r.Context()

	// Hitung dulu berapa peserta yang bisa dikirim (punya telegram_links)
	rows, err := a.db.QueryContext(ctx, `
		SELECT tl.telegram_user_id, COALESCE(pp.name, '')
		FROM telegram_links tl
		JOIN users u ON u.id = tl.user_id AND u.is_active = TRUE AND u.role = 'participant'
		JOIN participant_profiles pp ON pp.user_id = tl.user_id
		WHERE NOT EXISTS (
			SELECT 1 FROM reflections r WHERE r.user_id = tl.user_id AND r.reflected_date = CURRENT_DATE
		)
	`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal query peserta"})
		return
	}
	defer rows.Close()

	reminderMsgs := []string{
		"Hai *%s*! 🌙\n\nSaatnya luangkan sejenak untuk diri sendiri.\n\nYuk tulis refleksimu sekarang dengan /refleksi 📔\n_Hanya butuh 2 menit!_",
		"Hei *%s*! 📔\n\nIni pengingat refleksi harianmu.\n\nApa yang berkesan dari harimu hari ini? Ceritakan ke Nala lewat /refleksi 🌸",
		"*%s*, waktunya refleksi! 🌙\n\nMenulis perasaan dan pikiranmu bisa membantumu tumbuh lebih baik.\n\nKetik /refleksi dan ceritakan harimu ke Nala 💙",
	}
	sent, failed, idx := 0, 0, 0
	for rows.Next() {
		var tgUID, name string
		if rows.Scan(&tgUID, &name) != nil {
			continue
		}
		firstName := strings.Split(strings.TrimSpace(name), " ")[0]
		if firstName == "" {
			firstName = "kamu"
		}
		msg := fmt.Sprintf(reminderMsgs[idx%len(reminderMsgs)], escapeMD(firstName))
		idx++
		chatID, parseErr := strconv.ParseInt(strings.TrimSpace(tgUID), 10, 64)
		if parseErr != nil || chatID == 0 {
			failed++
			continue
		}
		if sendErr := a.sendTelegramMessage(ctx, chatID, msg, "idle"); sendErr != nil {
			failed++
		} else {
			sent++
		}
		time.Sleep(100 * time.Millisecond)
	}

	var msg string
	if sent == 0 && failed == 0 {
		msg = "Semua peserta sudah refleksi hari ini, atau belum ada yang terhubung ke Telegram bot. 🎉"
	} else if sent > 0 {
		msg = fmt.Sprintf("✅ Reminder berhasil dikirim ke %d peserta.", sent)
		if failed > 0 {
			msg += fmt.Sprintf(" (%d gagal)", failed)
		}
	} else {
		msg = fmt.Sprintf("❌ Gagal kirim ke %d peserta. Pastikan peserta sudah terhubung ke bot Telegram.", failed)
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "sent": sent, "failed": failed, "message": msg})
}

func (a *app) handleAdminFeedbackSchedule(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	// Hanya super_admin yang bisa ubah jadwal
	ctx := r.Context()
	if r.Method == http.MethodGet {
		var sendTime string
		var isActive bool
		var lastSent, sendDate *string
		_ = a.db.QueryRowContext(ctx, `SELECT send_time, is_active, last_sent_date::text, send_date::text FROM feedback_schedule WHERE id=1`).Scan(&sendTime, &isActive, &lastSent, &sendDate)
		ls, sd := "", ""
		if lastSent != nil { ls = *lastSent }
		if sendDate != nil { sd = *sendDate }
		writeJSON(w, http.StatusOK, map[string]any{"send_time": sendTime, "is_active": isActive, "last_sent_date": ls, "send_date": sd})
		return
	}
	if r.Method == http.MethodPost {
		if !isSuperAdmin(u) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "hanya super_admin yang bisa mengubah jadwal feedback"})
			return
		}
		var req struct {
			SendTime string `json:"send_time"`
			SendDate string `json:"send_date"`
			IsActive bool   `json:"is_active"`
		}
		if json.NewDecoder(r.Body).Decode(&req) != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
			return
		}
		t := strings.TrimSpace(req.SendTime)
		if len(t) != 5 || t[2] != ':' {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "format waktu harus HH:MM"})
			return
		}
		d := strings.TrimSpace(req.SendDate) // YYYY-MM-DD atau kosong
		var sendDateVal any
		if d != "" {
			sendDateVal = d
		}
		// Reset last_sent_date jika tanggal berubah supaya bisa kirim ulang
		_, err = a.db.ExecContext(ctx, `UPDATE feedback_schedule SET send_time=$1, is_active=$2, send_date=$3, last_sent_date=NULL WHERE id=1`, t, req.IsActive, sendDateVal)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal update jadwal"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "send_time": t, "send_date": d, "is_active": req.IsActive})
		return
	}
	writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
}

func (a *app) handleAdminFeedbackStats(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	ctx := r.Context()

	groupFilter := ""
	if !isSuperAdmin(u) {
		gid := a.getUserGroupID(ctx, u.ID)
		if gid > 0 {
			groupFilter = fmt.Sprintf("%d", gid)
		}
	}

	baseJoin := `FROM feedbacks f JOIN participant_profiles pp ON pp.user_id = f.user_id`
	whereClause := ""
	var args []any
	if groupFilter != "" {
		whereClause = ` WHERE pp.group_id = $1`
		args = append(args, groupFilter)
	}

	var totalFeedback int
	var avgRating float64
	_ = a.db.QueryRowContext(ctx, `SELECT COUNT(*), COALESCE(AVG(rating),0) `+baseJoin+whereClause, args...).Scan(&totalFeedback, &avgRating)

	// Distribusi rating
	distRows, _ := a.db.QueryContext(ctx, `SELECT rating, COUNT(*) `+baseJoin+whereClause+` GROUP BY rating ORDER BY rating`, args...)
	dist := map[int]int{1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
	if distRows != nil {
		defer distRows.Close()
		for distRows.Next() {
			var r2, cnt int
			if distRows.Scan(&r2, &cnt) == nil {
				dist[r2] = cnt
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"total":      totalFeedback,
		"avg_rating": math.Round(avgRating*10) / 10,
		"dist":       dist,
	})
}

func (a *app) handleAdminFeedbackList(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	ctx := r.Context()

	query := `
		SELECT pp.name, COALESCE(g.name,'-'), f.rating, f.message, f.created_at
		FROM feedbacks f
		JOIN participant_profiles pp ON pp.user_id = f.user_id
		LEFT JOIN groups g ON g.id = pp.group_id`
	var args []any
	if !isSuperAdmin(u) {
		gid := a.getUserGroupID(ctx, u.ID)
		if gid > 0 {
			query += ` WHERE pp.group_id = $1`
			args = append(args, gid)
		}
	}
	query += ` ORDER BY f.created_at DESC LIMIT 200`

	rows, err := a.db.QueryContext(ctx, query, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}
	defer rows.Close()
	type fbItem struct {
		Name      string `json:"name"`
		GroupName string `json:"group_name"`
		Rating    int    `json:"rating"`
		Message   string `json:"message"`
		CreatedAt string `json:"created_at"`
	}
	items := []fbItem{}
	for rows.Next() {
		var it fbItem
		var ca time.Time
		if rows.Scan(&it.Name, &it.GroupName, &it.Rating, &it.Message, &ca) == nil {
			it.CreatedAt = ca.Format("2006-01-02 15:04")
			items = append(items, it)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// ── Badges: Admin CRUD ───────────────────────────────────────────────────────

func (a *app) handleAdminBadges(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	ctx := r.Context()

	switch r.Method {
	case http.MethodGet:
		// Ambil semua badge + jumlah penerima
		rows, err := a.db.QueryContext(ctx, `
			SELECT bd.id, bd.name, bd.description, bd.icon_url, bd.badge_type, bd.trigger_key, bd.is_active, bd.created_at,
				COUNT(pb.id) as awarded_count
			FROM badge_definitions bd
			LEFT JOIN participant_badges pb ON pb.badge_id = bd.id
			GROUP BY bd.id ORDER BY bd.created_at DESC
		`)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
			return
		}
		defer rows.Close()
		type badgeItem struct {
			ID           int64  `json:"id"`
			Name         string `json:"name"`
			Description  string `json:"description"`
			IconURL      string `json:"icon_url"`
			BadgeType    string `json:"badge_type"`
			TriggerKey   string `json:"trigger_key"`
			IsActive     bool   `json:"is_active"`
			CreatedAt    string `json:"created_at"`
			AwardedCount int    `json:"awarded_count"`
		}
		items := []badgeItem{}
		for rows.Next() {
			var b badgeItem
			var ca time.Time
			if rows.Scan(&b.ID, &b.Name, &b.Description, &b.IconURL, &b.BadgeType, &b.TriggerKey, &b.IsActive, &ca, &b.AwardedCount) == nil {
				b.CreatedAt = ca.Format("2006-01-02")
				items = append(items, b)
			}
		}

		// Ambil juga daftar penerima per badge (badge_id → list nama+kelompok)
		awardRows, _ := a.db.QueryContext(ctx, `
			SELECT pb.badge_id, pb.id, pp.name, COALESCE(g.name,'-'), pb.note, pb.awarded_at
			FROM participant_badges pb
			JOIN participant_profiles pp ON pp.user_id = pb.user_id
			LEFT JOIN groups g ON g.id = pp.group_id
			ORDER BY pb.awarded_at DESC
		`)
		type awardItem struct {
			AwardID   int64  `json:"award_id"`
			BadgeID   int64  `json:"badge_id"`
			Name      string `json:"name"`
			GroupName string `json:"group_name"`
			Note      string `json:"note"`
			AwardedAt string `json:"awarded_at"`
		}
		awards := []awardItem{}
		if awardRows != nil {
			defer awardRows.Close()
			for awardRows.Next() {
				var a2 awardItem
				var at time.Time
				if awardRows.Scan(&a2.BadgeID, &a2.AwardID, &a2.Name, &a2.GroupName, &a2.Note, &at) == nil {
					a2.AwardedAt = at.Format("2006-01-02 15:04")
					awards = append(awards, a2)
				}
			}
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items, "awards": awards})

	case http.MethodPost:
		// Create atau Update badge definition
		var req struct {
			ID          int64  `json:"id"`
			Name        string `json:"name"`
			Description string `json:"description"`
			IconURL     string `json:"icon_url"`
			BadgeType   string `json:"badge_type"`
			TriggerKey  string `json:"trigger_key"`
			IsActive    *bool  `json:"is_active"`
		}
		if json.NewDecoder(r.Body).Decode(&req) != nil || strings.TrimSpace(req.Name) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name wajib diisi"})
			return
		}
		if req.BadgeType == "" {
			req.BadgeType = "manual"
		}
		isActive := true
		if req.IsActive != nil {
			isActive = *req.IsActive
		}
		if req.ID > 0 {
			_, err = a.db.ExecContext(ctx, `
				UPDATE badge_definitions SET name=$1, description=$2, icon_url=$3, badge_type=$4, trigger_key=$5, is_active=$6
				WHERE id=$7
			`, req.Name, req.Description, req.IconURL, req.BadgeType, req.TriggerKey, isActive, req.ID)
		} else {
			err = a.db.QueryRowContext(ctx, `
				INSERT INTO badge_definitions (name, description, icon_url, badge_type, trigger_key, is_active, created_by)
				VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
			`, req.Name, req.Description, req.IconURL, req.BadgeType, req.TriggerKey, isActive, admin.ID).Scan(&req.ID)
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal simpan badge"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": req.ID})

	case http.MethodDelete:
		var req struct {
			ID int64 `json:"id"`
		}
		if json.NewDecoder(r.Body).Decode(&req) != nil || req.ID == 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id wajib"})
			return
		}
		_, _ = a.db.ExecContext(ctx, `DELETE FROM badge_definitions WHERE id=$1`, req.ID)
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})

	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func (a *app) handleAdminBadgeAward(w http.ResponseWriter, r *http.Request) {
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
		UserID  int64  `json:"user_id"`
		BadgeID int64  `json:"badge_id"`
		Note    string `json:"note"`
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil || req.UserID == 0 || req.BadgeID == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "user_id dan badge_id wajib"})
		return
	}
	ctx := r.Context()
	var awardID int64
	err = a.db.QueryRowContext(ctx, `
		INSERT INTO participant_badges (user_id, badge_id, note, awarded_by)
		VALUES ($1,$2,$3,$4) RETURNING id
	`, req.UserID, req.BadgeID, req.Note, admin.ID).Scan(&awardID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal memberikan badge"})
		return
	}
	// Kirim notif bot ke peserta
	go a.sendBadgeNotification(context.Background(), req.UserID, req.BadgeID, req.Note)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "award_id": awardID})
}

func (a *app) handleAdminBadgeRevoke(w http.ResponseWriter, r *http.Request) {
	_, err := a.requireRole(r.Context(), r, "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	var req struct {
		AwardID int64 `json:"award_id"`
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil || req.AwardID == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "award_id wajib"})
		return
	}
	_, _ = a.db.ExecContext(r.Context(), `DELETE FROM participant_badges WHERE id=$1`, req.AwardID)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// checkAndAwardAutoBadges: cek trigger lalu beri badge otomatis jika kondisi terpenuhi.
// Untuk badge auto, satu user hanya bisa dapat badge yang sama sekali (tidak duplikat).
func (a *app) checkAndAwardAutoBadges(ctx context.Context, userID int64, triggerKey string) {
	// Ambil semua badge aktif dengan trigger_key ini
	rows, err := a.db.QueryContext(ctx, `
		SELECT id FROM badge_definitions WHERE badge_type='auto' AND trigger_key=$1 AND is_active=TRUE
	`, triggerKey)
	if err != nil {
		return
	}
	defer rows.Close()

	var badgeIDs []int64
	for rows.Next() {
		var bid int64
		if rows.Scan(&bid) == nil {
			badgeIDs = append(badgeIDs, bid)
		}
	}
	if len(badgeIDs) == 0 {
		return
	}

	// Cek kondisi terpenuhi sesuai trigger
	if !a.checkBadgeTriggerCondition(ctx, userID, triggerKey) {
		return
	}

	for _, badgeID := range badgeIDs {
		// Cek apakah sudah punya badge ini (auto badge tidak duplikat)
		var exists int
		_ = a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM participant_badges WHERE user_id=$1 AND badge_id=$2`, userID, badgeID).Scan(&exists)
		if exists > 0 {
			continue
		}
		// Berikan badge
		var awardID int64
		if err2 := a.db.QueryRowContext(ctx, `
			INSERT INTO participant_badges (user_id, badge_id, note, awarded_by)
			VALUES ($1,$2,'Diberikan otomatis oleh sistem',NULL) RETURNING id
		`, userID, badgeID).Scan(&awardID); err2 == nil && awardID > 0 {
			go a.sendBadgeNotification(context.Background(), userID, badgeID, "")
		}
	}
}

func (a *app) checkBadgeTriggerCondition(ctx context.Context, userID int64, triggerKey string) bool {
	switch triggerKey {
	case "materi_all_done":
		// Selesaikan minimal 1 kategori penuh (semua materi aktif dalam 1 kategori)
		var count int
		_ = a.db.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM question_categories qc
			WHERE qc.is_active = TRUE
			AND (SELECT COUNT(*) FROM learning_materials lm WHERE lm.category_id=qc.id AND lm.is_active=TRUE) > 0
			AND (SELECT COUNT(*) FROM learning_materials lm WHERE lm.category_id=qc.id AND lm.is_active=TRUE)
			  = (SELECT COUNT(*) FROM material_progress mp
			     JOIN learning_materials lm2 ON lm2.id=mp.material_id AND lm2.category_id=qc.id AND lm2.is_active=TRUE
			     WHERE mp.user_id=$1)
		`, userID).Scan(&count)
		return count > 0

	case "quiz_perfect_5":
		var count int
		_ = a.db.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM quiz_attempts
			WHERE CAST(user_id AS BIGINT)=$1 AND wrong_count=0
		`, userID).Scan(&count)
		return count >= 5

	case "tryout_perfect_3":
		var count int
		_ = a.db.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM tryout_results
			WHERE CAST(user_id AS BIGINT)=$1 AND wrong_count=0
		`, userID).Scan(&count)
		return count >= 3

	case "reflection_streak_7":
		// Cek 7 hari berturut-turut (mundur dari hari ini)
		var streak int
		_ = a.db.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM (
				SELECT generate_series(0,6) AS offset_day
			) gs
			WHERE EXISTS (
				SELECT 1 FROM reflections
				WHERE user_id=$1 AND reflected_date = CURRENT_DATE - gs.offset_day
			)
		`, userID).Scan(&streak)
		return streak >= 7

	case "leaderboard_top3":
		var rank int
		_ = a.db.QueryRowContext(ctx, `
			SELECT pos FROM (
				SELECT user_id, RANK() OVER (ORDER BY total_exp DESC) as pos
				FROM exp_wallets
			) ranked WHERE user_id=$1
		`, userID).Scan(&rank)
		return rank > 0 && rank <= 3

	case "feedback_submit":
		// Cukup sudah kirim 1 feedback
		var count int
		_ = a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM feedbacks WHERE user_id=$1`, userID).Scan(&count)
		return count >= 1

	default:
		return false
	}
}

func (a *app) sendBadgeNotification(ctx context.Context, userID, badgeID int64, note string) {
	if a.telegramBotToken == "" {
		return
	}
	var badgeName, badgeDesc, iconURL string
	if err := a.db.QueryRowContext(ctx, `SELECT name, description, icon_url FROM badge_definitions WHERE id=$1`, badgeID).Scan(&badgeName, &badgeDesc, &iconURL); err != nil {
		return
	}
	var tgUID string
	if err := a.db.QueryRowContext(ctx, `SELECT telegram_user_id FROM telegram_links WHERE user_id=$1 AND is_active=TRUE`, userID).Scan(&tgUID); err != nil {
		return
	}
	chatID, _ := strconv.ParseInt(tgUID, 10, 64)
	if chatID == 0 {
		return
	}
	escMD := func(s string) string {
		for _, c := range []string{"_", "*", "[", "]", "(", ")", "~", "`", ">", "#", "+", "-", "=", "|", "{", "}", ".", "!"} {
			s = strings.ReplaceAll(s, c, "\\"+c)
		}
		return s
	}
	msg := fmt.Sprintf("🎖️ *Selamat\\! Kamu mendapat Badge Baru\\!*\n\n*%s*\n_%s_", escMD(badgeName), escMD(badgeDesc))
	if note != "" {
		msg += fmt.Sprintf("\n\n📝 Catatan: %s", escMD(note))
	}
	msg += "\n\nTeruskan semangatmu\\! 💪🔥"
	_ = a.sendTelegramMessage(ctx, chatID, msg, "idle")
}

// ── Participant: My Badges ────────────────────────────────────────────────────

func (a *app) handleParticipantBadges(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	rows, err := a.db.QueryContext(r.Context(), `
		SELECT bd.id, bd.name, bd.description, bd.icon_url, bd.badge_type, pb.note, pb.awarded_at
		FROM participant_badges pb
		JOIN badge_definitions bd ON bd.id = pb.badge_id
		WHERE pb.user_id = $1
		ORDER BY pb.awarded_at DESC
	`, u.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}
	defer rows.Close()
	type badgeItem struct {
		ID        int64  `json:"id"`
		Name      string `json:"name"`
		Desc      string `json:"description"`
		IconURL   string `json:"icon_url"`
		BadgeType string `json:"badge_type"`
		Note      string `json:"note"`
		AwardedAt string `json:"awarded_at"`
	}
	items := []badgeItem{}
	for rows.Next() {
		var b badgeItem
		var at time.Time
		if rows.Scan(&b.ID, &b.Name, &b.Desc, &b.IconURL, &b.BadgeType, &b.Note, &at) == nil {
			b.AwardedAt = at.Format("2006-01-02")
			items = append(items, b)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// ── Participant: Ubah Password ────────────────────────────────────────────────

func (a *app) handleParticipantChangePassword(w http.ResponseWriter, r *http.Request) {
	// Admin & participant sama-sama bisa ganti password sendiri
	u, err := a.requireRole(r.Context(), r, "participant", "admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	var req struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	if len(strings.TrimSpace(req.NewPassword)) < 6 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Password baru minimal 6 karakter"})
		return
	}

	// Ambil hash password saat ini
	var currentHash string
	if err := a.db.QueryRowContext(r.Context(), `SELECT password_hash FROM users WHERE id=$1`, u.ID).Scan(&currentHash); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal ambil data"})
		return
	}

	// Verifikasi password lama
	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(req.OldPassword)); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Password lama tidak sesuai"})
		return
	}

	// Hash password baru
	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal proses password"})
		return
	}

	_, err = a.db.ExecContext(r.Context(), `UPDATE users SET password_hash=$1, must_change_password=FALSE, updated_at=NOW() WHERE id=$2`, string(newHash), u.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal simpan password baru"})
		return
	}

	_ = a.logAdminAction(r.Context(), u.ID, "participant.change_password", fmt.Sprintf("user:%d", u.ID), nil)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "message": "Password berhasil diubah"})
}

// ── Material Contributions ──────────────────────────────────────────────────

// handleParticipantCategories — kembalikan daftar kategori aktif untuk participant
func (a *app) handleParticipantCategories(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant", "admin", "super_admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	// Ambil group_id user (jika ada)
	var groupID int
	_ = a.db.QueryRowContext(r.Context(), `SELECT COALESCE(group_id, 0) FROM participant_profiles WHERE user_id=$1`, u.ID).Scan(&groupID)

	var rows *sql.Rows
	if groupID > 0 {
		rows, err = a.db.QueryContext(r.Context(), `
			SELECT id, name FROM question_categories 
			WHERE is_active=TRUE AND (group_id=$1 OR group_id IS NULL)
			ORDER BY name ASC
		`, groupID)
	} else {
		rows, err = a.db.QueryContext(r.Context(), `
			SELECT id, name FROM question_categories 
			WHERE is_active=TRUE ORDER BY name ASC
		`)
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}
	defer rows.Close()

	items := []map[string]any{}
	for rows.Next() {
		var id int
		var name string
		if rows.Scan(&id, &name) == nil {
			items = append(items, map[string]any{"id": id, "name": name})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// Helper functions for contribution exp handling
func (a *app) awardExp(ctx context.Context, userID int64, ruleKey, sourceRef string) {
	a.applyExpRule(ctx, userID, ruleKey, fmt.Sprintf("Kontribusi materi (%s)", ruleKey))
}

func (a *app) awardExpTx(ctx context.Context, tx *sql.Tx, userID int64, ruleKey, sourceRef string) {
	var expVal, pointBonus int64
	if err := tx.QueryRowContext(ctx, `SELECT rule_value, COALESCE(point_bonus,0) FROM exp_rules WHERE rule_key=$1`, ruleKey).Scan(&expVal, &pointBonus); err != nil {
		return
	}
	if expVal > 0 {
		// Insert exp wallet if not exists
		_, _ = tx.ExecContext(ctx, `INSERT INTO exp_wallets (user_id, total_exp, updated_at) VALUES ($1,0,NOW()) ON CONFLICT (user_id) DO NOTHING`, userID)
		
		// Get current total
		var total int64
		if err := tx.QueryRowContext(ctx, `SELECT total_exp FROM exp_wallets WHERE user_id=$1 FOR UPDATE`, userID).Scan(&total); err != nil {
			return
		}
		
		// Update wallet
		next := total + expVal
		_, _ = tx.ExecContext(ctx, `UPDATE exp_wallets SET total_exp=$1, updated_at=NOW() WHERE user_id=$2`, next, userID)
		
		// Insert ledger entry
		_, _ = tx.ExecContext(ctx, `INSERT INTO exp_ledger (user_id, delta, type, reason, source_ref) VALUES ($1,$2,$3,$4,$5)`, 
			userID, expVal, "contribution", fmt.Sprintf("Kontribusi materi (%s)", ruleKey), sourceRef)
	}
}

type contributionItem struct {
	ID             int64  `json:"id"`
	Title          string `json:"title"`
	Type           string `json:"type"`
	Content        string `json:"content"`
	Status         string `json:"status"`
	AdminFeedback  string `json:"admin_feedback"`
	ContributorID  int64  `json:"contributor_id"`
	ContributorName string `json:"contributor_name"`
	CategoryID     int    `json:"category_id"`
	CategoryName   string `json:"category_name"`
	ExpAwarded     int    `json:"exp_awarded"`
	CreatedAt      string `json:"created_at"`
	UpdatedAt      string `json:"updated_at"`
	ReviewedAt     string `json:"reviewed_at"`
	ReviewedBy     int64  `json:"reviewed_by"`
	ReviewedByName string `json:"reviewed_by_name"`
}

func (a *app) handleParticipantContributions(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant", "admin", "super_admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	rows, err := a.db.QueryContext(r.Context(), `
		SELECT 
			mc.id, mc.title, mc.type, mc.content, mc.status, 
			COALESCE(mc.admin_feedback, ''), mc.exp_awarded, 
			mc.created_at, mc.updated_at,
			qc.name as category_name,
			COALESCE(mc.reviewed_at, '1970-01-01'::timestamptz) as reviewed_at,
			COALESCE(rp.name, reviewer.phone, '') as reviewed_by_name
		FROM material_contributions mc
		JOIN question_categories qc ON qc.id = mc.category_id  
		LEFT JOIN users reviewer ON reviewer.id = mc.reviewed_by
		LEFT JOIN participant_profiles rp ON rp.user_id = reviewer.id
		WHERE mc.contributor_id = $1
		ORDER BY mc.created_at DESC
	`, u.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "database error"})
		return
	}
	defer rows.Close()

	items := []contributionItem{}
	for rows.Next() {
		var c contributionItem
		var createdAt, updatedAt, reviewedAt time.Time
		if err := rows.Scan(&c.ID, &c.Title, &c.Type, &c.Content, &c.Status, 
			&c.AdminFeedback, &c.ExpAwarded, &createdAt, &updatedAt, 
			&c.CategoryName, &reviewedAt, &c.ReviewedByName); err != nil {
			continue
		}
		c.CreatedAt = createdAt.Format("2006-01-02 15:04")
		c.UpdatedAt = updatedAt.Format("2006-01-02 15:04")
		if reviewedAt.Year() > 1970 {
			c.ReviewedAt = reviewedAt.Format("2006-01-02 15:04")
		}
		items = append(items, c)
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (a *app) handleParticipantSubmitContribution(w http.ResponseWriter, r *http.Request) {
	u, err := a.requireRole(r.Context(), r, "participant", "admin", "super_admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var req struct {
		CategoryID int    `json:"category_id"`
		Title      string `json:"title"`
		Type       string `json:"type"`
		Content    string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Content = strings.TrimSpace(req.Content)
	if req.Title == "" || req.Content == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "title dan content tidak boleh kosong"})
		return
	}
	if req.Type == "" {
		req.Type = "text"
	}

	// Cek apakah category_id valid
	var categoryName string
	if err := a.db.QueryRowContext(r.Context(), `SELECT name FROM question_categories WHERE id=$1`, req.CategoryID).Scan(&categoryName); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "kategori tidak ditemukan"})
		return
	}

	// Insert contribution
	var contributionID int64
	err = a.db.QueryRowContext(r.Context(), `
		INSERT INTO material_contributions (contributor_id, category_id, title, type, content, status) 
		VALUES ($1, $2, $3, $4, $5, 'pending') 
		RETURNING id
	`, u.ID, req.CategoryID, req.Title, req.Type, req.Content).Scan(&contributionID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal simpan kontribusi"})
		return
	}

	// Award exp untuk submit
	a.awardExp(r.Context(), u.ID, "contribution_submit", fmt.Sprintf("contribution:%d", contributionID))

	_ = a.logAdminAction(r.Context(), u.ID, "contribution.submit", fmt.Sprintf("contribution:%d", contributionID), req)
	writeJSON(w, http.StatusOK, map[string]any{
		"ok": true, 
		"message": "Kontribusi berhasil dikirim dan sedang direview admin",
		"contribution_id": contributionID,
	})
}

func (a *app) handleAdminContributions(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin", "super_admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	status := r.URL.Query().Get("status")
	if status == "" {
		status = "pending"
	}

	adminGID := a.getAdminGroupIDFromUser(r.Context(), admin)
	var rows *sql.Rows
	if isSuperAdmin(admin) || adminGID == 0 {
		rows, err = a.db.QueryContext(r.Context(), `
			SELECT 
				mc.id, mc.title, mc.type, mc.content, mc.status,
				COALESCE(mc.admin_feedback, ''), mc.exp_awarded,
				mc.created_at, mc.updated_at,
				COALESCE(cp.name, contributor.phone) as contributor_name,
				qc.name as category_name,
				COALESCE(mc.reviewed_at, '1970-01-01'::timestamptz) as reviewed_at,
				COALESCE(rp.name, reviewer.phone, '') as reviewed_by_name
			FROM material_contributions mc
			JOIN users contributor ON contributor.id = mc.contributor_id
			LEFT JOIN participant_profiles cp ON cp.user_id = contributor.id
			JOIN question_categories qc ON qc.id = mc.category_id
			LEFT JOIN users reviewer ON reviewer.id = mc.reviewed_by
			LEFT JOIN participant_profiles rp ON rp.user_id = reviewer.id
			WHERE mc.status = $1 OR $1 = 'all'
			ORDER BY mc.created_at DESC
		`, status)
	} else {
		rows, err = a.db.QueryContext(r.Context(), `
			SELECT 
				mc.id, mc.title, mc.type, mc.content, mc.status,
				COALESCE(mc.admin_feedback, ''), mc.exp_awarded,
				mc.created_at, mc.updated_at,
				COALESCE(cp.name, contributor.phone) as contributor_name,
				qc.name as category_name,
				COALESCE(mc.reviewed_at, '1970-01-01'::timestamptz) as reviewed_at,
				COALESCE(rp.name, reviewer.phone, '') as reviewed_by_name
			FROM material_contributions mc
			JOIN users contributor ON contributor.id = mc.contributor_id
			LEFT JOIN participant_profiles cp ON cp.user_id = contributor.id
			JOIN question_categories qc ON qc.id = mc.category_id
			LEFT JOIN users reviewer ON reviewer.id = mc.reviewed_by
			LEFT JOIN participant_profiles rp ON rp.user_id = reviewer.id
			WHERE (mc.status = $1 OR $1 = 'all')
			  AND cp.group_id = $2
			ORDER BY mc.created_at DESC
		`, status, adminGID)
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "database error"})
		return
	}
	defer rows.Close()

	items := []contributionItem{}
	for rows.Next() {
		var c contributionItem
		var createdAt, updatedAt, reviewedAt time.Time
		if err := rows.Scan(&c.ID, &c.Title, &c.Type, &c.Content, &c.Status,
			&c.AdminFeedback, &c.ExpAwarded, &createdAt, &updatedAt,
			&c.ContributorName, &c.CategoryName, &reviewedAt, &c.ReviewedByName); err != nil {
			continue
		}
		c.CreatedAt = createdAt.Format("2006-01-02 15:04")
		c.UpdatedAt = updatedAt.Format("2006-01-02 15:04")
		if reviewedAt.Year() > 1970 {
			c.ReviewedAt = reviewedAt.Format("2006-01-02 15:04")
		}
		items = append(items, c)
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (a *app) handleAdminReviewContribution(w http.ResponseWriter, r *http.Request) {
	admin, err := a.requireRole(r.Context(), r, "admin", "super_admin")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var req struct {
		ContributionID int64  `json:"contribution_id"`
		Action         string `json:"action"`        // approve, reject
		AdminFeedback  string `json:"admin_feedback"`
		ApproveMode    string `json:"approve_mode"`  // direct, ai
		BubbleCount    int    `json:"bubble_count"`  // optional for ai mode
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}

	if req.Action != "approve" && req.Action != "reject" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "action harus 'approve' atau 'reject'"})
		return
	}
	if strings.TrimSpace(req.ApproveMode) == "" {
		req.ApproveMode = "direct"
	}
	if req.BubbleCount <= 0 || req.BubbleCount > 8 {
		req.BubbleCount = 3
	}

	// Get contribution info
	var contributorID int64
	var categoryID int
	var title, content, currentStatus string
	err = a.db.QueryRowContext(r.Context(), `
		SELECT contributor_id, category_id, title, content, status 
		FROM material_contributions 
		WHERE id = $1
	`, req.ContributionID).Scan(&contributorID, &categoryID, &title, &content, &currentStatus)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "kontribusi tidak ditemukan"})
		return
	}

	if currentStatus != "pending" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "kontribusi sudah di-review sebelumnya"})
		return
	}

	materialTitle := title + " (Kontribusi)"
	materialContent := content
	if req.Action == "approve" && req.ApproveMode == "ai" {
		generated, gErr := a.generateContributionMaterial(r.Context(), title, content, req.BubbleCount)
		if gErr != nil {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": "gagal generate AI: " + gErr.Error()})
			return
		}
		materialTitle = title + " (AI)"
		materialContent = generated
	}

	tx, err := a.db.BeginTx(r.Context(), nil)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "transaction error"})
		return
	}
	defer tx.Rollback()

	// Update contribution status
	newStatus := "approved"
	if req.Action == "reject" {
		newStatus = "rejected"
	}
	_, err = tx.ExecContext(r.Context(), `
		UPDATE material_contributions 
		SET status = $1, admin_feedback = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
		WHERE id = $4
	`, newStatus, req.AdminFeedback, admin.ID, req.ContributionID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal update status"})
		return
	}

	// Award exp based on action
	expRule := "contribution_approved"
	expAwarded := 50
	if req.Action == "reject" {
		expRule = "contribution_rejected"
		expAwarded = 5
	}

	// Update exp_awarded di contribution record
	_, _ = tx.ExecContext(r.Context(), `
		UPDATE material_contributions SET exp_awarded = $1 WHERE id = $2
	`, expAwarded, req.ContributionID)

	// Award exp to contributor
	a.awardExpTx(r.Context(), tx, contributorID, expRule, fmt.Sprintf("contribution:%d", req.ContributionID))

	// If approved, add to learning_materials
	if req.Action == "approve" {
		// Get max order_no for this category
		var maxOrder int
		_ = tx.QueryRowContext(r.Context(), `SELECT COALESCE(MAX(order_no), 0) FROM learning_materials WHERE category_id = $1`, categoryID).Scan(&maxOrder)
		
		_, err = tx.ExecContext(r.Context(), `
			INSERT INTO learning_materials (category_id, title, type, content, exp_reward, order_no, is_active) 
			VALUES ($1, $2, $3, $4, 10, $5, TRUE)
		`, categoryID, materialTitle, "text", materialContent, maxOrder+1)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "gagal tambah ke materi"})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "transaction commit failed"})
		return
	}

	action := fmt.Sprintf("contribution.%s", req.Action)
	_ = a.logAdminAction(r.Context(), admin.ID, action, fmt.Sprintf("contribution:%d", req.ContributionID), req)
	
	var message string
	if req.Action == "approve" {
		message = "Kontribusi berhasil disetujui"
	} else {
		message = "Kontribusi berhasil ditolak"
	}
	
	writeJSON(w, http.StatusOK, map[string]any{
		"ok": true, 
		"message": message,
		"exp_awarded": expAwarded,
	})
}

// ── Admin: Reset Password Peserta ────────────────────────────────────────────

