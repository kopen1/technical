import type { Hono } from "hono";
import type { Env } from "../env";
import { SEED_CASES } from "../data/seed";
import { answer, getSession, searchCases, start } from "../engine/engine";
import { saveEvidence, saveSession } from "../db/db";
import { requireAdmin } from "../auth/admin";

export function routes(app: Hono<{Bindings: Env}>) {
  app.get("/api/health", c => c.json({
    ok: true,
    project: "TechniKit",
    version: "3.0.0",
    engine: "rule-based"
  }));

  app.get("/api/cases", c => c.json(SEED_CASES));

  app.get("/api/search", c => {
    const model = c.req.query("model") ?? "";
    const symptom = c.req.query("symptom") ?? "";
    return c.json(searchCases(model, symptom));
  });

  app.get("/api/cases/:slug", c => {
    const item = SEED_CASES.find(x => x.slug === c.req.param("slug"));
    return item ? c.json(item) : c.json({error:"NOT_FOUND"},404);
  });

  app.post("/api/diagnosis/start", async c => {
    const body = await c.req.json<{caseId:string}>();
    const result = start(body.caseId);
    if (!result) return c.json({error:"CASE_NOT_FOUND"},404);
    await saveSession(c.env, result.session);
    return c.json(result);
  });

  app.post("/api/diagnosis/answer", async c => {
    const body = await c.req.json<{sessionId:string,value:string}>();
    const before = getSession(body.sessionId);
    const result = answer(body.sessionId, String(body.value ?? ""));
    if (!result) return c.json({error:"SESSION_NOT_FOUND"},404);

    const newEvidence = before && result.session.evidence.length > before.evidence.length
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
    return c.json({
      cases: SEED_CASES.length,
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
}