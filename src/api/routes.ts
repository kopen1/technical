import type { Hono } from "hono";
import type { Env } from "../env";
import type { CaseSource, DiagnosticCase } from "../data/seed";
import { answer, getSession, restoreSession, searchCases, start } from "../engine/engine";
import { loadSession, saveEvidence, saveSession } from "../db/db";
import { createCase, deleteCase, getCaseBySlug, listCases, updateCase } from "../db/cases";
import { requireAdmin } from "../auth/admin";

const METHODS = ["observation", "voltage", "resistance", "diode", "continuity", "current", "thermal"];
const SOURCES: CaseSource[] = ["verified", "community", "external", "unknown"];

function validateCase(b: any): { ok: true; data: DiagnosticCase } | { ok: false; error: string } {
  if (!b || typeof b !== "object") return { ok: false, error: "BODY_INVALID" };
  const { slug, brand, model, symptom, faultGroup, title, summary, source, steps } = b;
  if (![brand, model, symptom, faultGroup, title, summary].every(x => typeof x === "string" && x.trim()))
    return { ok: false, error: "FIELD_REQUIRED" };
  if (!Array.isArray(steps) || steps.length === 0)
    return { ok: false, error: "STEPS_REQUIRED" };
  const cleanSteps: DiagnosticCase["steps"] = steps.map((s: any, i: number) => {
    const method = METHODS.includes(s?.method) ? s.method : "observation";
    return {
      id: s?.id || `s${i + 1}`,
      title: String(s?.title ?? "").trim(),
      instruction: String(s?.instruction ?? "").trim(),
      method,
      testPoint: s?.testPoint ? String(s.testPoint) : undefined
    };
  });
  if (cleanSteps.some(s => !s.title || !s.instruction))
    return { ok: false, error: "STEPS_INCOMPLETE" };
  return {
    ok: true,
    data: {
      id: typeof b.id === "string" && b.id ? b.id : slug,
      slug: String(slug).trim().toLowerCase().replace(/\s+/g, "-"),
      brand: String(brand).trim(),
      model: String(model).trim(),
      symptom: String(symptom).trim(),
      faultGroup: String(faultGroup).trim(),
      title: String(title).trim(),
      summary: String(summary).trim(),
      source: SOURCES.includes(source) ? source : "community",
      steps: cleanSteps
    }
  };
}

export function routes(app: Hono<{Bindings: Env}>) {
  app.get("/api/health", c => c.json({
    ok: true,
    project: "TechniKit",
    version: "3.1.0",
    engine: "rule-based"
  }));

  app.get("/api/cases", async c => {
    const cases = await listCases(c.env);
    return c.json(cases);
  });

  app.get("/api/search", async c => {
    const model = c.req.query("model") ?? "";
    const symptom = c.req.query("symptom") ?? "";
    const cases = await listCases(c.env);
    return c.json(searchCases(cases, model, symptom));
  });

  app.get("/api/cases/:slug", async c => {
    const item = await getCaseBySlug(c.env, c.req.param("slug"));
    return item ? c.json(item) : c.json({error:"NOT_FOUND"},404);
  });

  app.post("/api/diagnosis/start", async c => {
    const body = await c.req.json<{caseId:string}>();
    const cases = await listCases(c.env);
    const result = start(cases, body.caseId);
    if (!result) return c.json({error:"CASE_NOT_FOUND"},404);
    await saveSession(c.env, result.session);
    return c.json(result);
  });

  app.post("/api/diagnosis/answer", async c => {
    const body = await c.req.json<{sessionId:string,value:string}>();
    let before = getSession(body.sessionId);
    if (!before) {
      const loaded = await loadSession(c.env, body.sessionId);
      if (loaded) {
        restoreSession(loaded);
        before = loaded;
      }
    }
    const beforeCount = before?.evidence.length ?? 0;
    const cases = await listCases(c.env);
    const result = answer(cases, body.sessionId, String(body.value ?? ""));
    if (!result) return c.json({error:"SESSION_NOT_FOUND"},404);

    const newEvidence = result.session.evidence.length > beforeCount
      ? result.session.evidence.at(-1) : undefined;

    if (newEvidence) await saveEvidence(c.env, result.session.id, newEvidence);
    await saveSession(c.env, result.session);
    return c.json(result);
  });

  app.post("/api/analytics/visit", async c => {
    const body = await c.req.json<{path?:string,referrer?:string}>();
    await c.env.DB.prepare(`
      INSERT INTO analytics_visits(path,referrer,country,user_agent)
      VALUES(?,?,?,?)
    `).bind(
      body.path ?? "/",
      body.referrer ?? "",
      c.req.header("CF-IPCountry") ?? "UNKNOWN",
      c.req.header("User-Agent") ?? ""
    ).run();
    return c.json({ok:true});
  });

  app.get("/api/admin/overview", requireAdmin, async c => {
    const count = async (table:string) => {
      const row = await c.env.DB.prepare(`SELECT COUNT(*) AS total FROM ${table}`).first<{total:number}>();
      return Number(row?.total ?? 0);
    };
    const cases = await listCases(c.env);
    return c.json({
      cases: cases.length,
      sessions: await count("diagnostic_sessions"),
      evidence: await count("diagnostic_evidence"),
      visits: await count("analytics_visits")
    });
  });

  app.get("/api/admin/analytics", requireAdmin, async c => {
    const countries = await c.env.DB.prepare(
      "SELECT country,COUNT(*) AS total FROM analytics_visits GROUP BY country ORDER BY total DESC LIMIT 30"
    ).all();
    const paths = await c.env.DB.prepare(
      "SELECT path,COUNT(*) AS total FROM analytics_visits GROUP BY path ORDER BY total DESC LIMIT 30"
    ).all();
    return c.json({countries:countries.results,paths:paths.results});
  });

  app.get("/api/admin/sessions", requireAdmin, async c => {
    const rows = await c.env.DB.prepare(
      "SELECT * FROM diagnostic_sessions ORDER BY created_at DESC LIMIT 100"
    ).all();
    return c.json(rows.results);
  });

  app.get("/api/admin/pages", requireAdmin, async c => {
    const rows = await c.env.DB.prepare(
      "SELECT * FROM admin_pages ORDER BY sort_order"
    ).all();
    return c.json(rows.results);
  });

  app.put("/api/admin/pages/:key", requireAdmin, async c => {
    const body = await c.req.json<{label?:string,navVisible?:boolean,enabled?:boolean}>();
    await c.env.DB.prepare(`
      INSERT INTO admin_pages(page_key,label,nav_visible,enabled,sort_order)
      VALUES(?,?,?,?,0)
      ON CONFLICT(page_key) DO UPDATE SET
        label=COALESCE(?,label),
        nav_visible=COALESCE(?,nav_visible),
        enabled=COALESCE(?,enabled)
    `).bind(
      c.req.param("key"),
      body.label ?? c.req.param("key"),
      body.navVisible === undefined ? 1 : body.navVisible ? 1 : 0,
      body.enabled === undefined ? 1 : body.enabled ? 1 : 0,
      body.label ?? null,
      body.navVisible === undefined ? null : body.navVisible ? 1 : 0,
      body.enabled === undefined ? null : body.enabled ? 1 : 0
    ).run();
    return c.json({ok:true});
  });

  app.get("/api/admin/cases", requireAdmin, async c => {
    return c.json(await listCases(c.env));
  });

  app.post("/api/admin/cases", requireAdmin, async c => {
    const body = await c.req.json<any>();
    const v = validateCase(body);
    if (!v.ok) return c.json({error:v.error},400);
    await createCase(c.env, v.data);
    return c.json({ok:true, id: v.data.id});
  });

  app.put("/api/admin/cases/:id", requireAdmin, async c => {
    const body = await c.req.json<any>();
    const v = validateCase(body);
    if (!v.ok) return c.json({error:v.error},400);
    const ok = await updateCase(c.env, c.req.param("id")!, v.data);
    return ok ? c.json({ok:true}) : c.json({error:"NOT_FOUND"},404);
  });

  app.delete("/api/admin/cases/:id", requireAdmin, async c => {
    const ok = await deleteCase(c.env, c.req.param("id")!);
    return ok ? c.json({ok:true}) : c.json({error:"NOT_FOUND"},404);
  });
}
