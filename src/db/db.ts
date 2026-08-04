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