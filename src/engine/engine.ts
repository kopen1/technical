import type { DiagnosticCase } from "../data/seed";

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

function tokens(s: string) {
  return s.toLowerCase().split(/[\s\-,_./:]+/).filter(Boolean);
}

function scoreCase(c: DiagnosticCase, model: string, symptom: string) {
  const mt = tokens(model);
  const st = tokens(symptom);
  const cm = tokens(c.model);
  const cb = tokens(c.brand);
  const cs = tokens(c.symptom);
  const lm = c.model.toLowerCase();
  const ls = c.symptom.toLowerCase();
  let score = 0;

  if (lm === model.toLowerCase()) score += 10;
  else if (lm.includes(model.toLowerCase()) && model) score += 6;
  for (const t of mt) {
    if (cm.includes(t)) score += 4;
    if (cb.includes(t)) score += 2;
  }

  if (ls === symptom.toLowerCase()) score += 8;
  else if (ls.includes(symptom.toLowerCase()) && symptom) score += 5;
  for (const t of st) {
    if (cs.includes(t)) score += 3;
    else if (cs.some(x => x.startsWith(t))) score += 1;
  }

  return score;
}

export function searchCases(cases: DiagnosticCase[], model = "", symptom = "") {
  return [...cases]
    .map(c => ({ case: c, score: scoreCase(c, model, symptom) }))
    .filter(x => x.score > 0 || (!model && !symptom))
    .sort((a, b) => b.score - a.score || a.case.model.localeCompare(b.case.model))
    .map(x => x.case);
}

export function start(cases: DiagnosticCase[], caseId: string) {
  const c = cases.find(x => x.id === caseId);
  if (!c) return null;
  const s: DiagnosisSession = {
    id: crypto.randomUUID(),
    caseId,
    currentStep: 0,
    evidence: [],
    status: "ACTIVE"
  };
  sessions.set(s.id, s);
  return { session: s, case: c, step: c.steps[0], total: c.steps.length };
}

export function answer(cases: DiagnosticCase[], sessionId: string, value: string) {
  const s = sessions.get(sessionId);
  if (!s) return null;
  const c = cases.find(x => x.id === s.caseId);
  if (!c) return null;

  const step = c.steps[s.currentStep];
  if (!step) return { session: s, case: c, step: null, done: true, total: c.steps.length };

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
    done: s.status === "DONE",
    total: c.steps.length
  };
}

export function getSession(id: string) {
  return sessions.get(id);
}

export function restoreSession(s: DiagnosisSession) {
  sessions.set(s.id, s);
}
