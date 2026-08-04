import { SEED_CASES, type DiagnosticCase } from "../data/seed";

export type Evidence = {
  stepId: string;
  value: string;
  method: string;
  createdAt: string;
};

export type DiagnosisSession = {
  id: string;
  caseId: string;
  currentStep: number;
  evidence: Evidence[];
  status: "ACTIVE" | "DONE";
};

const sessions = new Map<string, DiagnosisSession>();

function scoreCase(c: DiagnosticCase, model: string, symptom: string) {
  const a = `${model} ${symptom}`.toLowerCase();
  let score = 0;
  if (a.includes(c.model.toLowerCase())) score += 4;
  if (a.includes(c.symptom.toLowerCase())) score += 3;
  if (a.includes(c.brand.toLowerCase())) score += 1;
  return score;
}

export function searchCases(model = "", symptom = "") {
  return [...SEED_CASES]
    .map(c => ({ case: c, score: scoreCase(c, model, symptom) }))
    .sort((a,b) => b.score - a.score)
    .map(x => x.case);
}

export function start(caseId: string) {
  const c = SEED_CASES.find(x => x.id === caseId);
  if (!c) return null;
  const s: DiagnosisSession = {
    id: crypto.randomUUID(),
    caseId,
    currentStep: 0,
    evidence: [],
    status: "ACTIVE"
  };
  sessions.set(s.id, s);
  return { session: s, case: c, step: c.steps[0] };
}

export function answer(sessionId: string, value: string) {
  const s = sessions.get(sessionId);
  if (!s) return null;
  const c = SEED_CASES.find(x => x.id === s.caseId);
  if (!c) return null;

  const step = c.steps[s.currentStep];
  if (!step) return { session: s, case: c, step: null, done: true };

  s.evidence.push({
    stepId: step.id,
    value,
    method: step.method,
    createdAt: new Date().toISOString()
  });

  s.currentStep++;
  if (s.currentStep >= c.steps.length) s.status = "DONE";

  return {
    session: s,
    case: c,
    step: c.steps[s.currentStep] ?? null,
    done: s.status === "DONE"
  };
}

export function getSession(id: string) {
  return sessions.get(id);
}

export function restoreSession(s: DiagnosisSession) {
  sessions.set(s.id, s);
}