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

export type RuleCondition = {
  stepId: string;
  op: "contains" | "equals" | "gte" | "lte";
  value: string;
};

export type RuleAction =
  | { type: "message"; message: string }
  | { type: "goto_step"; stepId: string }
  | { type: "done"; message: string };

export type Rule = { id: string; condition: RuleCondition; action: RuleAction };

const sessions = new Map<string, DiagnosisSession>();

function tokens(s: string) {
  return s.toLowerCase().split(/[\s\-,_./:]+/).filter(Boolean);
}

export function scoreCase(c: DiagnosticCase, model: string, symptom: string) {
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
  const scored = cases
    .map(c => ({ case: c, score: scoreCase(c, model, symptom) }))
    .filter(x => x.score > 0 || (!model && !symptom))
    .sort((a, b) => b.score - a.score || a.case.model.localeCompare(b.case.model));
  return {
    results: scored.map(x => x.case),
    total: scored.length,
    best: scored[0]?.score ?? 0,
    fallback: scored.length === 0
  };
}

export function relatedCases(cases: DiagnosticCase[], base: DiagnosticCase, limit = 3) {
  return cases
    .filter(c => c.id !== base.id)
    .map(c => {
      let score = 0;
      if (c.faultGroup === base.faultGroup) score += 6;
      if (c.brand.toLowerCase() === base.brand.toLowerCase()) score += 3;
      for (const t of tokens(base.model)) if (tokens(c.model).includes(t)) score += 2;
      for (const t of tokens(base.symptom)) if (tokens(c.symptom).includes(t)) score += 2;
      return { case: c, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.case);
}

function checkRule(c: DiagnosticCase, rule: Rule, value: string): boolean {
  const v = String(value ?? "").toLowerCase();
  const rv = String(rule.condition.value ?? "").toLowerCase();
  const num = parseFloat(v);
  const rnum = parseFloat(rv);
  switch (rule.condition.op) {
    case "contains": return v.includes(rv);
    case "equals": return v.trim() === rv;
    case "gte": return !isNaN(num) && !isNaN(rnum) && num >= rnum;
    case "lte": return !isNaN(num) && !isNaN(rnum) && num <= rnum;
    default: return false;
  }
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
  if (!step) return { session: s, case: c, step: null, done: true, total: c.steps.length, notice: null };

  s.evidence.push({
    stepId: step.id,
    value,
    method: step.method,
    createdAt: new Date().toISOString()
  });

  let notice: string | null = null;
  let jumped = false;
  for (const rule of c.rules ?? []) {
    if (!rule?.condition || rule.condition.stepId !== step.id) continue;
    if (!checkRule(c, rule, value)) continue;
    const a = rule.action;
    if (a.type === "message") notice = a.message;
    else if (a.type === "done") {
      s.status = "DONE";
      s.currentStep = c.steps.length;
      notice = a.message;
      return {
        session: s, case: c,
        step: null, done: true, total: c.steps.length, notice
      };
    } else if (a.type === "goto_step") {
      const idx = c.steps.findIndex(x => x.id === a.stepId);
      if (idx >= 0 && idx !== s.currentStep) {
        s.currentStep = idx;
        jumped = true;
      }
      break;
    }
  }

  if (!jumped) s.currentStep++;
  if (s.currentStep >= c.steps.length) s.status = "DONE";

  return {
    session: s,
    case: c,
    step: c.steps[s.currentStep] ?? null,
    done: s.status === "DONE",
    total: c.steps.length,
    notice
  };
}

export function getSession(id: string) {
  return sessions.get(id);
}

export function restoreSession(s: DiagnosisSession) {
  sessions.set(s.id, s);
}
