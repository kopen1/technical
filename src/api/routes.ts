import type { Hono } from "hono";
import type { Env } from "../env";
import type { CaseSource, CaseStatus, DiagnosticCase } from "../data/seed";
import { answer, getSession, restoreSession, searchCases, start } from "../engine/engine";
import { loadSession, saveEvidence, saveSession } from "../db/db";
import { createCase, deleteCase, getCaseBySlug, listCases, updateCase } from "../db/cases";
import {
  createVisual, deleteVisual, getImage, listVisualsByCase,
  saveImage, updateVisual, type VisualReference, type VisualType
} from "../db/visuals";
import { requireAdmin } from "../auth/admin";

const METHODS = ["observation", "voltage", "resistance", "diode", "continuity", "current", "thermal"];
const SOURCES: CaseSource[] = ["verified", "community", "external", "unknown"];
const STATUSES: CaseStatus[] = ["draft", "review", "published", "archived"];
const VISUAL_TYPES: VisualType[] = ["board", "connector", "component", "schematic", "test_point", "thermal", "other"];
const VERIFY: string[] = ["verified", "community", "external", "unverified"];

function validateCase(b: any): { ok: true; data: DiagnosticCase } | { ok: false; error: string } {
  if (!b || typeof b !== "object") return { ok: false, error: "BODY_INVALID" };
  const { slug, brand, model, symptom, faultGroup, title, summary, source, steps, status } = b;
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
      status: STATUSES.includes(status) ? status : "published",
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
    const cases = await listCases(c.env, { publishedOnly: true });
    return c.json(cases);
  });

  app.get("/api/search", async c => {
    const model = c.req.query("model") ?? "";
    const symptom = c.req.query("symptom") ?? "";
    const cases = await listCases(c.env, { publishedOnly: true });
    return c.json(searchCases(cases, model, symptom));
  });

  app.get("/api/cases/:slug", async c => {
    const item = await getCaseBySlug(c.env, c.req.param("slug"), true);
    if (!item) return c.json({error:"NOT_FOUND"},404);
    const visuals = await listVisualsByCase(c.env, item.id);
    return c.json({ ...item, visuals });
  });

  app.get("/api/images/:id", async c => {
    const img = await getImage(c.env, c.req.param("id")!);
    if (!img) return c.json({error:"NOT_FOUND"},404);
    return new Response(img.data, {
      headers: {
        "Content-Type": img.mime,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  });

  app.post("/api/diagnosis/start", async c => {
    const body = await c.req.json<{caseId:string}>();
    const cases = await listCases(c.env, { publishedOnly: true });
    const result = start(cases, body.caseId);
    if (!result) return c.json({error:"CASE_NOT_FOUND"},404);
    await saveSession(c.env, result.session);
    return c.json(result);
  });

  app.post("/api/diagnosis/answer", async c => {
    const body = await c.req.json<{sessionId:string,value:string}>();
    let before = await loadSession(c.env, body.sessionId);
    if (!before) {
      const mem = getSession(body.sessionId);
      if (!mem) return c.json({error:"SESSION_NOT_FOUND"},404);
      before = mem;
    }
    restoreSession(before);
    const beforeCount = before.evidence.length;
    const cases = await listCases(c.env, { publishedOnly: true });
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

  app.get("/api/admin/visuals", requireAdmin, async c => {
    const caseId = c.req.query("caseId");
    const visuals: VisualReference[] = caseId
      ? await listVisualsByCase(c.env, caseId)
      : await (await Promise.all(
          (await listCases(c.env)).map(x => listVisualsByCase(c.env, x.id))
        )).flat();
    return c.json(visuals);
  });

  app.post("/api/admin/visuals/upload", requireAdmin, async c => {
    const fd = await c.req.formData();
    const caseId = String(fd.get("caseId") ?? "");
    const file = fd.get("file");
    if (!caseId || !file || !(file instanceof File)) return c.json({error:"FILE_REQUIRED"},400);
    const imageId = await saveImage(c.env, file.type, await file.arrayBuffer());
    const annotationsRaw = String(fd.get("annotations") ?? "[]");
    let annotations = [];
    try { annotations = JSON.parse(annotationsRaw); } catch { annotations = []; }
    const v = await createVisual(c.env, {
      caseId,
      imageType: VISUAL_TYPES.includes(String(fd.get("imageType")) as VisualType)
        ? String(fd.get("imageType")) as VisualType : "other",
      caption: String(fd.get("caption") ?? ""),
      source: String(fd.get("source") ?? ""),
      verificationStatus: VERIFY.includes(String(fd.get("verificationStatus")))
        ? String(fd.get("verificationStatus")) as VisualReference["verificationStatus"] : "unverified",
      annotations,
      sortOrder: Number(fd.get("sortOrder") ?? 0) || 0
    }, imageId);
    return c.json({ok:true, visual: v});
  });

  app.put("/api/admin/visuals/:id", requireAdmin, async c => {
    const body = await c.req.json<any>();
    const v = await updateVisual(c.env, c.req.param("id")!, {
      imageType: VISUAL_TYPES.includes(body?.imageType) ? body.imageType : undefined,
      caption: body?.caption === undefined ? undefined : String(body.caption),
      source: body?.source === undefined ? undefined : String(body.source),
      verificationStatus: VERIFY.includes(body?.verificationStatus) ? body.verificationStatus : undefined,
      annotations: Array.isArray(body?.annotations) ? body.annotations : undefined,
      sortOrder: body?.sortOrder === undefined ? undefined : Number(body.sortOrder) || 0
    });
    return v ? c.json({ok:true, visual: v}) : c.json({error:"NOT_FOUND"},404);
  });

  app.delete("/api/admin/visuals/:id", requireAdmin, async c => {
    const ok = await deleteVisual(c.env, c.req.param("id")!);
    return ok ? c.json({ok:true}) : c.json({error:"NOT_FOUND"},404);
  });
}
