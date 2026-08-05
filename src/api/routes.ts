import type { Hono } from "hono";
import type { Env } from "../env";
import type { CaseSource, CaseStatus, DiagnosticCase } from "../data/seed";
import { answer, getSession, relatedCases, restoreSession, searchCases, start } from "../engine/engine";
import { loadSession, saveEvidence, saveSession } from "../db/db";
import { createCase, deleteCase, getCaseById, getCaseBySlug, listCases, listRevisions, updateCase } from "../db/cases";
import {
  createVisual, deleteVisual, getImage, listVisualsByCase,
  saveImage, updateVisual, type VisualReference, type VisualType
} from "../db/visuals";
import {
  createSubmission, deleteSubmissionImage, listSubmissions,
  setSubmissionStatus, type Submission
} from "../db/submissions";
import {
  addPart, createCustomer, createRepair, deleteCustomer, deletePart, deleteRepair,
  listCustomers, listRepairs, report, updateCustomer, updatePart, updateRepair
} from "../db/workshop";
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
    const res = searchCases(cases, model, symptom);
    await c.env.DB.prepare(
      "INSERT INTO analytics_searches (model,symptom,hits,country) VALUES (?,?,?,?)"
    ).bind(model, symptom, res.total, c.req.header("CF-IPCountry") ?? "").run();
    return c.json(res.results);
  });

  app.get("/api/cases/:slug", async c => {
    const item = await getCaseBySlug(c.env, c.req.param("slug"), true);
    if (!item) return c.json({error:"NOT_FOUND"},404);
    const [visuals, allCases] = await Promise.all([
      listVisualsByCase(c.env, item.id),
      listCases(c.env, { publishedOnly: true })
    ]);
    const related = relatedCases(allCases, item);
    return c.json({ ...item, visuals, related });
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
    const searches = await c.env.DB.prepare(
      "SELECT model,symptom,hits,COUNT(*) AS total FROM analytics_searches GROUP BY model,symptom ORDER BY total DESC LIMIT 30"
    ).all<{model:string;symptom:string;hits:number;total:number}>();
    const topModels = searches.results.filter(x => x.model).reduce<Record<string,number>>((m,x)=>{m[x.model]=(m[x.model]||0)+x.total;return m}, {});
    const topSymptoms = searches.results.filter(x => x.symptom).reduce<Record<string,number>>((m,x)=>{m[x.symptom]=(m[x.symptom]||0)+x.total;return m}, {});
    const unresolved = await c.env.DB.prepare(
      "SELECT COUNT(*) AS total FROM diagnostic_sessions WHERE status='ACTIVE' AND created_at < datetime('now','-1 hour')"
    ).first<{total:number}>();
    const useful = await c.env.DB.prepare(`
      SELECT case_id,COUNT(*) AS total FROM diagnostic_sessions WHERE status='DONE'
      GROUP BY case_id ORDER BY total DESC LIMIT 10
    `).all<{case_id:string;total:number}>();
    const failed = await c.env.DB.prepare(`
      SELECT COUNT(*) AS total FROM diagnostic_sessions WHERE status='ACTIVE' AND created_at < datetime('now','-1 hour')
    `).first<{total:number}>();
    const testPoints = await c.env.DB.prepare(`
      SELECT s.case_id, COUNT(*) AS total FROM diagnostic_sessions s
      WHERE s.status='DONE' GROUP BY s.case_id ORDER BY total DESC LIMIT 10
    `).all<{case_id:string;total:number}>();
    const caseNames = await listCases(c.env);
    const nameOf = (id:string) => caseNames.find(x => x.id === id)?.title ?? id;
    return c.json({
      countries: countries.results,
      paths: paths.results,
      topModels: Object.entries(topModels).sort((a,b)=>b[1]-a[1]).slice(0,10),
      topSymptoms: Object.entries(topSymptoms).sort((a,b)=>b[1]-a[1]).slice(0,10),
      unresolvedSessions: Number(unresolved?.total ?? 0),
      usefulCases: useful.results.map(x => ({ title: nameOf(x.case_id), total: x.total })),
      failedDiagnosis: Number(failed?.total ?? 0),
      topTestPoints: testPoints.results.map(x => ({ title: nameOf(x.case_id), total: x.total }))
    });
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

  app.get("/api/admin/cases/:id/revisions", requireAdmin, async c => {
    return c.json(await listRevisions(c.env, c.req.param("id")!));
  });

  app.post("/api/submissions/case", async c => {
    const body = await c.req.json<any>();
    const v = validateCase(body);
    if (!v.ok) return c.json({error:v.error},400);
    v.data.source = "community";
    v.data.status = "review";
    const sub = await createSubmission(c.env, "case", v.data);
    return c.json({ok:true, submission: sub});
  });

  app.post("/api/submissions/visual", async c => {
    const fd = await c.req.formData();
    const file = fd.get("file");
    if (!file || !(file instanceof File)) return c.json({error:"FILE_REQUIRED"},400);
    const imageId = await saveImage(c.env, file.type, await file.arrayBuffer());
    const payload = {
      caseId: String(fd.get("caseId") ?? "") || null,
      caption: String(fd.get("caption") ?? ""),
      imageType: VISUAL_TYPES.includes(String(fd.get("imageType")) as VisualType)
        ? String(fd.get("imageType")) : "board",
      notes: String(fd.get("notes") ?? "")
    };
    const sub = await createSubmission(c.env, "visual", payload, imageId);
    return c.json({ok:true, submission: sub});
  });

  app.post("/api/submissions/reference", async c => {
    const body = await c.req.json<any>();
    if (!body?.title && !body?.url) return c.json({error:"FIELD_REQUIRED"},400);
    const sub = await createSubmission(c.env, "reference", {
      title: String(body.title ?? ""),
      url: String(body.url ?? ""),
      notes: String(body.notes ?? "")
    });
    return c.json({ok:true, submission: sub});
  });

  app.get("/api/admin/submissions", requireAdmin, async c => {
    const status = c.req.query("status") ?? undefined;
    return c.json(await listSubmissions(c.env, status));
  });

  app.get("/api/admin/submissions/:id", requireAdmin, async c => {
    const sub = await listSubmissions(c.env).then(l => l.find(s => s.id === c.req.param("id")));
    return sub ? c.json(sub) : c.json({error:"NOT_FOUND"},404);
  });

  app.post("/api/admin/submissions/:id/approve", requireAdmin, async c => {
    const subs = await listSubmissions(c.env);
    const sub = subs.find(s => s.id === c.req.param("id"));
    if (!sub) return c.json({error:"NOT_FOUND"},404);
    if (sub.kind === "case" && sub.status !== "approved") {
      await createCase(c.env, { ...sub.payload, status: "published", source: "community" });
    }
    if (sub.kind === "visual" && sub.status !== "approved") {
      const payload = sub.payload || {};
      const imageId = sub.imageId;
      if (imageId && payload.caseId) {
        await createVisual(c.env, {
          caseId: payload.caseId,
          imageType: payload.imageType || "board",
          caption: payload.caption || "",
          source: "community-submission",
          verificationStatus: "community",
          annotations: [],
          sortOrder: 0
        }, imageId);
      }
    }
    const updated = await setSubmissionStatus(c.env, sub.id, "approved");
    return c.json({ok:true, submission: updated});
  });

  app.post("/api/admin/submissions/:id/reject", requireAdmin, async c => {
    const body = await c.req.json<any>();
    const subs = await listSubmissions(c.env);
    const sub = subs.find(s => s.id === c.req.param("id"));
    if (!sub) return c.json({error:"NOT_FOUND"},404);
    if (sub.imageId && sub.status !== "rejected") await deleteSubmissionImage(c.env, sub.imageId);
    const updated = await setSubmissionStatus(c.env, sub.id, "rejected", String(body?.notes ?? ""));
    return c.json({ok:true, submission: updated});
  });

  app.get("/api/admin/customers", requireAdmin, async c => {
    return c.json(await listCustomers(c.env));
  });

  app.post("/api/admin/customers", requireAdmin, async c => {
    const body = await c.req.json<any>();
    if (!body?.name) return c.json({error:"FIELD_REQUIRED"},400);
    const cust = await createCustomer(c.env, body);
    return c.json({ok:true, customer: cust});
  });

  app.put("/api/admin/customers/:id", requireAdmin, async c => {
    const body = await c.req.json<any>();
    await updateCustomer(c.env, c.req.param("id")!, body);
    return c.json({ok:true});
  });

  app.delete("/api/admin/customers/:id", requireAdmin, async c => {
    await deleteCustomer(c.env, c.req.param("id")!);
    return c.json({ok:true});
  });

  app.get("/api/admin/repairs", requireAdmin, async c => {
    return c.json(await listRepairs(c.env));
  });

  app.post("/api/admin/repairs", requireAdmin, async c => {
    const body = await c.req.json<any>();
    if (!body?.customerId) return c.json({error:"FIELD_REQUIRED"},400);
    const repair = await createRepair(c.env, body);
    return c.json({ok:true, repair});
  });

  app.put("/api/admin/repairs/:id", requireAdmin, async c => {
    const body = await c.req.json<any>();
    await updateRepair(c.env, c.req.param("id")!, body);
    return c.json({ok:true});
  });

  app.delete("/api/admin/repairs/:id", requireAdmin, async c => {
    await deleteRepair(c.env, c.req.param("id")!);
    return c.json({ok:true});
  });

  app.post("/api/admin/repairs/:id/parts", requireAdmin, async c => {
    const body = await c.req.json<any>();
    if (!body?.name) return c.json({error:"FIELD_REQUIRED"},400);
    const part = await addPart(c.env, c.req.param("id")!, body);
    return c.json({ok:true, part});
  });

  app.put("/api/admin/parts/:id", requireAdmin, async c => {
    const body = await c.req.json<any>();
    await updatePart(c.env, c.req.param("id")!, body);
    return c.json({ok:true});
  });

  app.delete("/api/admin/parts/:id", requireAdmin, async c => {
    await deletePart(c.env, c.req.param("id")!);
    return c.json({ok:true});
  });

  app.get("/api/admin/workshop/report", requireAdmin, async c => {
    return c.json(await report(c.env));
  });
}
