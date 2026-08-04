import type { DiagnosticSession, StepAnswer, DiagnosticEvidence } from "./types";

export function createSession(flowId: string, device: string, symptom: string, firstStepId: string): DiagnosticSession {
  return {
    id: crypto.randomUUID(), flowId, device, symptom, currentStepId: firstStepId,
    answers: [], evidence: [], status: "ACTIVE"
  };
}

export function addAnswer(session: DiagnosticSession, answer: StepAnswer, evidence?: DiagnosticEvidence) {
  session.answers.push(answer);
  if (evidence) session.evidence.push(evidence);
}