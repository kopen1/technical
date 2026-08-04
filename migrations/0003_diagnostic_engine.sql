CREATE TABLE IF NOT EXISTS diagnostic_flows (
 id TEXT PRIMARY KEY, device TEXT NOT NULL, symptom TEXT NOT NULL, title TEXT NOT NULL,
 description TEXT, status TEXT NOT NULL DEFAULT 'draft',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diagnostic_steps (
 id TEXT PRIMARY KEY, flow_id TEXT NOT NULL, step_order INTEGER NOT NULL,
 title TEXT NOT NULL, instruction TEXT NOT NULL, why TEXT, input_type TEXT NOT NULL,
 unit TEXT, test_point TEXT, expected_min REAL, expected_max REAL,
 options_json TEXT, next_step_id TEXT, pass_next_step_id TEXT,
 fail_next_step_id TEXT, unknown_next_step_id TEXT,
 FOREIGN KEY(flow_id) REFERENCES diagnostic_flows(id)
);

CREATE TABLE IF NOT EXISTS diagnostic_sessions (
 id TEXT PRIMARY KEY, flow_id TEXT NOT NULL, device TEXT NOT NULL, symptom TEXT NOT NULL,
 current_step_id TEXT, status TEXT NOT NULL DEFAULT 'ACTIVE',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diagnostic_answers (
 id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, step_id TEXT NOT NULL,
 value TEXT, status TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(session_id) REFERENCES diagnostic_sessions(id)
);

CREATE TABLE IF NOT EXISTS diagnostic_evidence (
 id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, step_id TEXT NOT NULL,
 label TEXT NOT NULL, value TEXT, status TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(session_id) REFERENCES diagnostic_sessions(id)
);

CREATE TABLE IF NOT EXISTS diagnostic_results (
 id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, fault_group TEXT,
 confidence TEXT, verification_status TEXT, notes TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(session_id) REFERENCES diagnostic_sessions(id)
);