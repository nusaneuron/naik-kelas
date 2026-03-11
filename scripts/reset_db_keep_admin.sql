-- ═══════════════════════════════════════════════════════════════
-- Reset Database Naik Kelas
-- Sisakan: akun admin Aldythya Nugraha (user_id = 4)
-- Hapus: semua data peserta, soal, poin, EXP, materi, redeem, dll
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- 1. Hapus semua progress materi
DELETE FROM material_progress;

-- 2. Hapus semua materi belajar
DELETE FROM learning_materials;

-- 3. Hapus semua klaim redeem
DELETE FROM redeem_claims;

-- 4. Hapus semua item redeem
DELETE FROM redeem_items;

-- 5. Hapus semua poin ledger
DELETE FROM point_ledger;

-- 6. Hapus semua wallet poin
DELETE FROM point_wallets;

-- 7. Hapus semua EXP ledger
DELETE FROM exp_ledger;

-- 8. Hapus semua EXP wallet
DELETE FROM exp_wallets;

-- 9. Hapus semua quiz attempt
DELETE FROM quiz_attempts;

-- 10. Hapus semua tryout result
DELETE FROM tryout_results;

-- 11. Hapus semua soal
DELETE FROM questions;

-- 12. Hapus semua kategori soal
DELETE FROM question_categories;

-- 13. Hapus semua pengingat belajar
DELETE FROM reminders;

-- 14. Hapus semua telegram link
DELETE FROM telegram_links;

-- 15. Hapus semua profil peserta (kecuali admin)
DELETE FROM participant_profiles WHERE user_id != 4;

-- 16. Hapus semua user kecuali admin Aldythya (user_id = 4)
DELETE FROM users WHERE id != 4;

-- 17. Reset semua sequence (auto-increment) agar mulai dari 1
ALTER SEQUENCE IF EXISTS questions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS question_categories_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS quiz_attempts_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS tryout_results_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS redeem_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS redeem_claims_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS learning_materials_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS material_progress_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS point_ledger_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS exp_ledger_id_seq RESTART WITH 1;

COMMIT;

-- Verifikasi
SELECT 'users' as tabel, COUNT(*) as sisa FROM users
UNION ALL SELECT 'participant_profiles', COUNT(*) FROM participant_profiles
UNION ALL SELECT 'question_categories', COUNT(*) FROM question_categories
UNION ALL SELECT 'questions', COUNT(*) FROM questions
UNION ALL SELECT 'redeem_items', COUNT(*) FROM redeem_items
UNION ALL SELECT 'redeem_claims', COUNT(*) FROM redeem_claims
UNION ALL SELECT 'learning_materials', COUNT(*) FROM learning_materials
UNION ALL SELECT 'point_wallets', COUNT(*) FROM point_wallets
UNION ALL SELECT 'exp_wallets', COUNT(*) FROM exp_wallets;
