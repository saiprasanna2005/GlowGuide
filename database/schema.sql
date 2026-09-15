-- ============================================================================
-- GlowGuide — database/schema.sql
-- Normalized MySQL schema mapped directly from the existing frontend's
-- LocalStorage data shapes (see js/storage.js in the frontend project).
-- Run with:  mysql -u root -p < schema.sql
-- ============================================================================

CREATE DATABASE IF NOT EXISTS glowguide
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE glowguide;

-- ----------------------------------------------------------------------------
-- users — one row per account. Passwords are bcrypt hashes, never plaintext.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(255)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- profiles — 1:1 with users. Maps directly to the profile.html wizard.
-- goals/categories are JSON arrays of strings (frontend already treats
-- them as string arrays; no separate lookup table needed for this scale).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  goals          JSON         NULL,
  routine_length VARCHAR(40)  NULL,
  categories     JSON         NULL,
  time_pref      VARCHAR(40)  NULL,
  makeup_style   VARCHAR(40)  NULL,
  hair_pref      VARCHAR(60)  NULL,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_profiles_user (user_id),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- routines — exactly two rows per user (morning / evening), matching the
-- current UI. `type` is fixed to those two values by the CHECK constraint.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS routines (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  type       ENUM('morning','evening') NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_routines_user_type (user_id, type),
  CONSTRAINT fk_routines_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- routine_steps — individual steps within a routine (the checklist items).
-- sort_order supports the existing drag-to-reorder UI.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS routine_steps (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  routine_id INT UNSIGNED NOT NULL,
  text       VARCHAR(200) NOT NULL,
  minutes    SMALLINT UNSIGNED NOT NULL DEFAULT 5,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_routine_steps_routine (routine_id),
  CONSTRAINT fk_steps_routine FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- routine_completions — append-only log of "this step was completed on this
-- date". Replaces the frontend's derived gg_history blob: streaks, weekly
-- completion %, and the Glow Score are all computed FROM this table on read,
-- rather than from a pre-aggregated snapshot.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS routine_completions (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  step_id       INT UNSIGNED NOT NULL,
  user_id       INT UNSIGNED NOT NULL,
  completed_on  DATE         NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_completion_step_day (step_id, completed_on),
  KEY idx_completions_user_day (user_id, completed_on),
  CONSTRAINT fk_completions_step FOREIGN KEY (step_id) REFERENCES routine_steps(id) ON DELETE CASCADE,
  CONSTRAINT fk_completions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- beauty_products — the Beauty Vault.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS beauty_products (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  name           VARCHAR(150) NOT NULL,
  category       ENUM('Skincare','Makeup','Haircare','Fragrance','Tools','Other') NOT NULL,
  brand          VARCHAR(120) NULL,
  rating         TINYINT UNSIGNED NULL,               -- 0-5, enforced in app layer
  favorite       BOOLEAN      NOT NULL DEFAULT FALSE,
  purchase_date  DATE         NULL,
  notes          TEXT         NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_products_user (user_id),
  KEY idx_products_user_category (user_id, category),
  CONSTRAINT fk_products_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- journal_entries — Beauty Journal. `image` holds the same base64 data URL
-- the frontend already produces via FileReader (MEDIUMTEXT: up to ~16MB,
-- comfortably covers the existing 1.5MB client-side upload limit).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entries (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id            INT UNSIGNED NOT NULL,
  entry_date         DATE         NOT NULL,
  mood               VARCHAR(60)  NULL,
  look               VARCHAR(150) NOT NULL,
  routine_completed  BOOLEAN      NOT NULL DEFAULT FALSE,
  products           TEXT         NULL,   -- comma-separated, matches existing UI input
  notes              TEXT         NULL,
  image              MEDIUMTEXT   NULL,
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_journal_user_date (user_id, entry_date),
  CONSTRAINT fk_journal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- beauty_events — Glam Planner events.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS beauty_events (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  name        VARCHAR(150) NOT NULL,
  event_date  DATE         NOT NULL,
  event_time  TIME         NULL,
  style       VARCHAR(60)  NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_events_user_date (user_id, event_date),
  CONSTRAINT fk_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- event_tasks — the 5-stage prep checklist (7 days / 3 days / 1 day / 3 hrs /
-- 30 min before) per event. Rows are created from the existing fixed
-- template at event-creation time, so per-task completion can be tracked
-- individually — matching the current ev.prep[stageKey][itemLabel] shape.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_tasks (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id    INT UNSIGNED NOT NULL,
  stage_key   VARCHAR(10)  NOT NULL,   -- 'd7' | 'd3' | 'd1' | 'h3' | 'm30'
  stage_label VARCHAR(40)  NOT NULL,   -- '7 Days Before', etc.
  item_label  VARCHAR(120) NOT NULL,   -- 'Plan outfit', etc.
  is_done     BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order  INT UNSIGNED NOT NULL DEFAULT 0,
  KEY idx_event_tasks_event (event_id),
  CONSTRAINT fk_tasks_event FOREIGN KEY (event_id) REFERENCES beauty_events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- look_plans — Look Planner saved plans. `steps` stores the generated
-- Base/Eyes/Brows/Blush/Lips/Hair/Final-Touch text as a JSON snapshot,
-- exactly as the frontend already saves it today.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS look_plans (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  occasion      VARCHAR(40)  NOT NULL,
  style         VARCHAR(40)  NOT NULL,
  time_minutes  SMALLINT UNSIGNED NOT NULL,
  steps         JSON         NULL,
  saved_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_looks_user (user_id),
  CONSTRAINT fk_looks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- user_settings — 1:1 with users. Theme is intentionally NOT stored here;
-- it stays a frontend-only LocalStorage preference (see README) to avoid
-- a flash-of-wrong-theme before any API call resolves.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_settings (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  notifications BOOLEAN      NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_settings_user (user_id),
  CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- feedback — Contact/feedback submissions. user_id is nullable since a
-- feedback form could reasonably be reachable while logged out.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NULL,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_feedback_user (user_id),
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
