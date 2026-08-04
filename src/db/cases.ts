import type { Env } from "../env";
import { SEED_CASES, type CaseSource, type DiagnosticCase } from "../data/seed";

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
  created_at: string;
  updated_at: string;
};

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
    steps
  };
}

async function ensureCases(env: Env) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM diagnostic_cases").first<{total:number}>();
  if (Number(row?.total ?? 0) > 0) return;
  const stmt = env.DB.prepare(`
    INSERT OR IGNORE INTO diagnostic_cases
      (id,slug,brand,model,symptom,fault_group,title,summary,steps,source)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `);
  for (const c of SEED_CASES) {
    await stmt.bind(
      c.id, c.slug, c.brand, c.model, c.symptom, c.faultGroup,
      c.title, c.summary, JSON.stringify(c.steps), c.source ?? "community"
    ).run();
  }
}

export async function listCases(env: Env): Promise<DiagnosticCase[]> {
  await ensureCases(env);
  const rows = await env.DB.prepare(
    "SELECT * FROM diagnostic_cases ORDER BY brand, model"
  ).all<CaseRow>();
  return rows.results.map(rowToCase);
}

export async function getCaseBySlug(env: Env, slug: string): Promise<DiagnosticCase | null> {
  await ensureCases(env);
  const row = await env.DB.prepare(
    "SELECT * FROM diagnostic_cases WHERE slug = ?"
  ).bind(slug).first<CaseRow>();
  return row ? rowToCase(row) : null;
}

export async function createCase(env: Env, c: DiagnosticCase) {
  await env.DB.prepare(`
    INSERT INTO diagnostic_cases
      (id,slug,brand,model,symptom,fault_group,title,summary,steps,source)
    VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      slug=excluded.slug, brand=excluded.brand, model=excluded.model,
      symptom=excluded.symptom, fault_group=excluded.fault_group,
      title=excluded.title, summary=excluded.summary,
      steps=excluded.steps, source=excluded.source,
      updated_at=CURRENT_TIMESTAMP
  `).bind(
    c.id, c.slug, c.brand, c.model, c.symptom, c.faultGroup,
    c.title, c.summary, JSON.stringify(c.steps), c.source ?? "community"
  ).run();
}

export async function updateCase(env: Env, id: string, c: DiagnosticCase) {
  const res = await env.DB.prepare(`
    UPDATE diagnostic_cases SET
      slug=?, brand=?, model=?, symptom=?, fault_group=?,
      title=?, summary=?, steps=?, source=?, updated_at=CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    c.slug, c.brand, c.model, c.symptom, c.faultGroup,
    c.title, c.summary, JSON.stringify(c.steps), c.source ?? "community", id
  ).run();
  return res.meta.changes > 0;
}

export async function deleteCase(env: Env, id: string) {
  const res = await env.DB.prepare("DELETE FROM diagnostic_cases WHERE id = ?").bind(id).run();
  return res.meta.changes > 0;
}
