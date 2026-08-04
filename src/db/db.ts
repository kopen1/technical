import type { Env } from "../env";
import type { DiagnosisSession, Evidence } from "../engine/engine";

export async function saveSession(env: Env, s: DiagnosisSession) {
  await env.DB.prepare(`
    INSERT INTO diagnostic_sessions
      (id,case_id,current_step,status)
    VALUES (?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      current_step=excluded.current_step,
      status=excluded.status,
      updated_at=CURRENT_TIMESTAMP
  `).bind(s.id, s.caseId, s.currentStep, s.status).run();
}

export async function saveEvidence(env: Env, sessionId: string, e: Evidence) {
  await env.DB.prepare(`
    INSERT INTO diagnostic_evidence
      (session_id,step_id,value,method,created_at)
    VALUES (?,?,?,?,?)
  `).bind(sessionId, e.stepId, e.value, e.method, e.createdAt).run();
}

export async function loadSession(env: Env, id: string) {
  const row = await env.DB.prepare(
    "SELECT id,case_id,current_step,status FROM diagnostic_sessions WHERE id = ?"
  ).bind(id).first<{id:string;case_id:string;current_step:number;status:string}>();
  if (!row) return null;
  const ev = await env.DB.prepare(
    "SELECT step_id,value,method,created_at FROM diagnostic_evidence WHERE session_id = ? ORDER BY created_at"
  ).bind(id).all<{step_id:string;value:string;method:string;created_at:string}>();
  return {
    id: row.id,
    caseId: row.case_id,
    currentStep: row.current_step,
    status: row.status as "ACTIVE" | "DONE",
    evidence: ev.results.map(r => ({
      stepId: r.step_id,
      value: r.value,
      method: r.method,
      createdAt: r.created_at
    }))
  };
}