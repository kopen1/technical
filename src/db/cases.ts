import type { Env } from "../env";
import { SEED_CASES, type CaseSource, type CaseStatus, type DiagnosticCase } from "../data/seed";

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
  created_at: string;
  updated_at: string;
};

const PUBLISHED: CaseStatus[] = ["published"];

function rowToCase(r: CaseRow): DiagnosticCase {
  let steps: DiagnosticCase["steps"] = [];
  try {
    steps = JSON.parse(r.steps);
  } catch {
    steps = [];
  }
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
    steps
  };
}

async function ensureCases(env: Env) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM diagnostic_cases").first<{total:number}>();
  if (Number(row?.total ?? 0) > 0) return;
  const stmt = env.DB.prepare(`
    INSERT OR IGNORE INTO diagnostic_cases
      (id,slug,brand,model,symptom,fault_group,title,summary,steps,source,status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `);
  for (const c of SEED_CASES) {
    await stmt.bind(
      c.id, c.slug, c.brand, c.model, c.symptom, c.faultGroup,
      c.title, c.summary, JSON.stringify(c.steps), c.source ?? "community",
      c.status ?? "published"
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
      (id,slug,brand,model,symptom,fault_group,title,summary,steps,source,status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      slug=excluded.slug, brand=excluded.brand, model=excluded.model,
      symptom=excluded.symptom, fault_group=excluded.fault_group,
      title=excluded.title, summary=excluded.summary,
      steps=excluded.steps, source=excluded.source, status=excluded.status,
      updated_at=CURRENT_TIMESTAMP
  `).bind(
    c.id, c.slug, c.brand, c.model, c.symptom, c.faultGroup,
    c.title, c.summary, JSON.stringify(c.steps), c.source ?? "community",
    c.status ?? "published"
  ).run();
}

export async function updateCase(env: Env, id: string, c: DiagnosticCase) {
  const res = await env.DB.prepare(`
    UPDATE diagnostic_cases SET
      slug=?, brand=?, model=?, symptom=?, fault_group=?,
      title=?, summary=?, steps=?, source=?, status=?, updated_at=CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    c.slug, c.brand, c.model, c.symptom, c.faultGroup,
    c.title, c.summary, JSON.stringify(c.steps), c.source ?? "community",
    c.status ?? "published", id
  ).run();
  return res.meta.changes > 0;
}

export async function deleteCase(env: Env, id: string) {
  const res = await env.DB.prepare("DELETE FROM diagnostic_cases WHERE id = ?").bind(id).run();
  return res.meta.changes > 0;
}
