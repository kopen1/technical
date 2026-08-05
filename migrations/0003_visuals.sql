ALTER TABLE diagnostic_cases ADD COLUMN status TEXT NOT NULL DEFAULT 'published';

CREATE TABLE IF NOT EXISTS visual_images (
  id TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  data BLOB NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visual_references (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  image_id TEXT,
  image_type TEXT NOT NULL DEFAULT 'other',
  caption TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  annotations TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES diagnostic_cases(id)
);

CREATE INDEX IF NOT EXISTS idx_visuals_case ON visual_references(case_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON diagnostic_cases(status);
