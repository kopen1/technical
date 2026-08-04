CREATE TABLE IF NOT EXISTS diagnostic_cases (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  symptom TEXT NOT NULL,
  fault_group TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  steps TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'community',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cases_fault_group ON diagnostic_cases(fault_group);
CREATE INDEX IF NOT EXISTS idx_cases_model ON diagnostic_cases(model);
CREATE INDEX IF NOT EXISTS idx_cases_brand ON diagnostic_cases(brand);
