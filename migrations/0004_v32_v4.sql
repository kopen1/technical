ALTER TABLE diagnostic_cases ADD COLUMN rules TEXT NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS case_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES diagnostic_cases(id)
);
CREATE INDEX IF NOT EXISTS idx_revisions_case ON case_revisions(case_id);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload TEXT NOT NULL,
  reviewer_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

CREATE TABLE IF NOT EXISTS analytics_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model TEXT NOT NULL DEFAULT '',
  symptom TEXT NOT NULL DEFAULT '',
  hits INTEGER NOT NULL DEFAULT 0,
  country TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_searches_symptom ON analytics_searches(symptom);
CREATE INDEX IF NOT EXISTS idx_searches_model ON analytics_searches(model);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repairs (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  device_brand TEXT NOT NULL DEFAULT '',
  device_model TEXT NOT NULL DEFAULT '',
  symptom TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received',
  diagnosis TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL DEFAULT '',
  service_fee REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
CREATE INDEX IF NOT EXISTS idx_repairs_customer ON repairs(customer_id);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(status);

CREATE TABLE IF NOT EXISTS parts (
  id TEXT PRIMARY KEY,
  repair_id TEXT NOT NULL,
  name TEXT NOT NULL,
  cost REAL NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  qty INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (repair_id) REFERENCES repairs(id)
);
CREATE INDEX IF NOT EXISTS idx_parts_repair ON parts(repair_id);

CREATE TABLE IF NOT EXISTS submissions_visuals (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  image_id TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES submissions(id)
);

INSERT OR IGNORE INTO admin_pages VALUES
('sessions','Sessions',1,1,8),
('submissions','Submissions',1,1,9),
('workshop','Workshop',1,1,10);
