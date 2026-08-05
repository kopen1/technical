import type { Env } from "../env";
import { SEED_CASES, type CaseRule, type CaseSource, type CaseStatus, type DiagnosticCase } from "../data/seed";

type CaseRow = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  symptom: string;
  fault_group: string;
  title: string;
  summary: string;
  steps: string;
  source: string;
  status: string;
  rules: string;
  created_at: string;
  updated_at: string;
};

const PUBLISHED: CaseStatus[] = ["published"];

function rowToCase(r: CaseRow): DiagnosticCase {
  let steps: DiagnosticCase["steps"] = [];
  try { steps = JSON.parse(r.steps); } catch { steps = []; }
  let rules: CaseRule[] = [];
  try { rules = JSON.parse(r.rules || "[]"); } catch { rules = []; }
  return {
    id: r.id,
    slug: r.slug,
    brand: r.brand,
    model: r.model,
    symptom: r.symptom,
    faultGroup: r.fault_group,
    title: r.title,
    summary: r.summary,
    source: (r.source || "community") as CaseSource,
    status: (r.status || "published") as CaseStatus,
    rules,
    steps
  };
}

export async function saveRevision(env: Env, c: DiagnosticCase) {
  const ver = await env.DB.prepare(
    "SELECT COALESCE(MAX(version),0) AS v FROM case_revisions WHERE case_id = ?"
  ).bind(c.id).first<{v:number}>();
  const next = Number(ver?.v ?? 0) + 1;
  await env.DB.prepare(
    "INSERT INTO case_revisions (case_id,version,data) VALUES (?,?,?)"
  ).bind(c.id, next, JSON.stringify(c)).run();
}

export async function listRevisions(env: Env, caseId: string) {
  const rows = await env.DB.prepare(
    "SELECT id,case_id,version,created_at,data FROM case_revisions WHERE case_id = ? ORDER BY version DESC"
  ).bind(caseId).all<{id:number;case_id:string;version:number;created_at:string;data:string}>();
  return rows.results.map(r => ({ id: r.id, caseId: r.case_id, version: r.version, createdAt: r.created_at, data: JSON.parse(r.data) }));
}

async function ensureCases(env: Env) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM diagnostic_cases").first<{total:number}>();
  if (Number(row?.total ?? 0) > 0) return;
  const stmt = env.DB.prepare(`
    INSERT OR IGNORE INTO diagnostic_cases
      (id,slug,brand,model,symptom,fault_group,title,summary,steps,source,status,rules)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  for (const c of SEED_CASES) {
    await stmt.bind(
      c.id, c.slug, c.brand, c.model, c.symptom, c.faultGroup,
      c.title, c.summary, JSON.stringify(c.steps), c.source ?? "community",
      c.status ?? "published", JSON.stringify(c.rules ?? [])
    ).run();
  }
}

export async function listCases(env: Env, opts: { publishedOnly?: boolean } = {}): Promise<DiagnosticCase[]> {
  await ensureCases(env);
  const sql = opts.publishedOnly
    ? "SELECT * FROM diagnostic_cases WHERE status IN ('published') ORDER BY brand, model"
    : "SELECT * FROM diagnostic_cases ORDER BY brand, model";
  const rows = await env.DB.prepare(sql).all<CaseRow>();
  return rows.results.map(rowToCase);
}

export async function getCaseBySlug(env: Env, slug: string, publishedOnly = false): Promise<DiagnosticCase | null> {
  await ensureCases(env);
  const sql = publishedOnly
    ? "SELECT * FROM diagnostic_cases WHERE slug = ? AND status IN ('published')"
    : "SELECT * FROM diagnostic_cases WHERE slug = ?";
  const row = await env.DB.prepare(sql).bind(slug).first<CaseRow>();
  return row ? rowToCase(row) : null;
}

export async function getCaseById(env: Env, id: string): Promise<DiagnosticCase | null> {
  await ensureCases(env);
  const row = await env.DB.prepare("SELECT * FROM diagnostic_cases WHERE id = ?").bind(id).first<CaseRow>();
  return row ? rowToCase(row) : null;
}

export async function createCase(env: Env, c: DiagnosticCase) {
  await env.DB.prepare(`
    INSERT INTO diagnostic_cases
      (id,slug,brand,model,symptom,fault_group,title,summary,steps,source,status,rules)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      slug=excluded.slug, brand=excluded.brand, model=excluded.model,
      symptom=excluded.symptom, fault_group=excluded.fault_group,
      title=excluded.title, summary=excluded.summary,
      steps=excluded.steps, source=excluded.source, status=excluded.status,
      rules=excluded.rules, updated_at=CURRENT_TIMESTAMP
  `).bind(
    c.id, c.slug, c.brand, c.model, c.symptom, c.faultGroup,
    c.title, c.summary, JSON.stringify(c.steps), c.source ?? "community",
    c.status ?? "published", JSON.stringify(c.rules ?? [])
  ).run();
}

export async function updateCase(env: Env, id: string, c: DiagnosticCase) {
  const prev = await getCaseById(env, id);
  if (prev) await saveRevision(env, prev);
  const res = await env.DB.prepare(`
    UPDATE diagnostic_cases SET
      slug=?, brand=?, model=?, symptom=?, fault_group=?,
      title=?, summary=?, steps=?, source=?, status=?, rules=?, updated_at=CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    c.slug, c.brand, c.model, c.symptom, c.faultGroup,
    c.title, c.summary, JSON.stringify(c.steps), c.source ?? "community",
    c.status ?? "published", JSON.stringify(c.rules ?? []), id
  ).run();
  return res.meta.changes > 0;
}

export async function deleteCase(env: Env, id: string) {
  const res = await env.DB.prepare("DELETE FROM diagnostic_cases WHERE id = ?").bind(id).run();
  return res.meta.changes > 0;
}
