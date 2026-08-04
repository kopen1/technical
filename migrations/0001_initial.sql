CREATE TABLE IF NOT EXISTS diagnostic_sessions (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diagnostic_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  value TEXT,
  method TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  referrer TEXT,
  country TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_pages (
  page_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  nav_visible INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO admin_pages VALUES
('dashboard','Dashboard',1,1,1),
('cases','Cases',1,1,2),
('engine','Diagnostic Engine',1,1,3),
('visual','Visual Reference',1,1,4),
('analytics','Analytics',1,1,5),
('seo','SEO',1,1,6),
('settings','Settings',1,1,7);

CREATE INDEX IF NOT EXISTS idx_session_case ON diagnostic_sessions(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_session ON diagnostic_evidence(session_id);
CREATE INDEX IF NOT EXISTS idx_visit_country ON analytics_visits(country);