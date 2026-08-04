import type { DiagnosticStep } from "./types";
import { evaluateMeasurement, nextStepFor } from "./evaluator";
import { addAnswer } from "./session";

export function processStep(session: any, step: DiagnosticStep, rawValue: string | number | boolean) {
  const status = evaluateMeasurement(step, rawValue);
  addAnswer(session, {
    stepId: step.id, value: rawValue, status, createdAt: new Date().toISOString()
  }, {
    stepId: step.id, label: step.title, value: String(rawValue), status
  });
  const nextStepId = nextStepFor(step, status);
  if (!nextStepId) session.status = "COMPLETED";
  else session.currentStepId = nextStepId;
  return { status, nextStepId, completed: session.status === "COMPLETED", session };
}