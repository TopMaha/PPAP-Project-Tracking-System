-- ============================================================
-- PPAP Tracking System — Cloudflare D1 schema
-- Apply:  wrangler d1 execute ppap-db --file=worker/schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,           -- bcrypt / PBKDF2 hash (never plaintext)
  name          TEXT,
  role          TEXT NOT NULL DEFAULT 'viewer',   -- admin | engineer | viewer
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id           TEXT PRIMARY KEY,
  part_no      TEXT NOT NULL,
  part_name    TEXT,
  customer     TEXT,
  model        TEXT,
  drawing_rev  TEXT,
  ppap_level   INTEGER DEFAULT 3,
  target_date  TEXT,
  engineer_id  TEXT REFERENCES users(id),
  status       TEXT DEFAULT 'planning',  -- planning|trial|documentation|submission|approved|rejected
  confidential INTEGER DEFAULT 0,
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trials (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  trial_no          INTEGER,
  trial_date        TEXT,
  qty               INTEGER,
  dim_result        TEXT,   -- pass|fail
  appearance_result TEXT,
  functional_result TEXT,
  issues            TEXT,
  corrective_action TEXT,
  overall_result    TEXT,   -- pass|conditional|fail
  next_action       TEXT,
  next_trial_date   TEXT,
  created_by        TEXT,
  created_at        TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trial_photos (
  id          TEXT PRIMARY KEY,
  trial_id    TEXT NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  photo_url   TEXT,        -- R2 object URL
  caption     TEXT,
  uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ppap_elements (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  element_no      INTEGER,
  element_name    TEXT,
  status          TEXT DEFAULT 'not_started', -- not_started|in_progress|completed|waived|rejected
  responsible     TEXT,
  due_date        TEXT,
  completion_date TEXT,
  file_url        TEXT,
  notes           TEXT
);

CREATE TABLE IF NOT EXISTS psw_records (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  revision   INTEGER,
  data_json  TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS form_templates (
  id                 TEXT PRIMARY KEY,
  name               TEXT,
  base_image_url     TEXT,
  field_mapping_json TEXT,
  created_by         TEXT,
  created_at         TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,
  username     TEXT,
  action       TEXT,
  target_table TEXT,
  target_id    TEXT,
  timestamp    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT,
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trials_project   ON trials(project_id);
CREATE INDEX IF NOT EXISTS idx_elements_project ON ppap_elements(project_id);
CREATE INDEX IF NOT EXISTS idx_psw_project      ON psw_records(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_user       ON audit_logs(user_id);
