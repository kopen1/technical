import type { DiagnosticStep, EvaluationStatus } from "./types";

export function evaluateMeasurement(
  step: DiagnosticStep, rawValue: string | number | boolean
): EvaluationStatus {
  if (rawValue === "" || rawValue === null || rawValue === undefined) return "UNKNOWN";
  if (typeof rawValue === "boolean") return rawValue ? "PASS" : "FAIL";
  const value = Number(rawValue);
  if (Number.isNaN(value)) return "UNKNOWN";
  if (typeof step.expectedMin === "number" && typeof step.expectedMax === "number") {
    return value >= step.expectedMin && value <= step.expectedMax ? "PASS" : "FAIL";
  }
  return "UNKNOWN";
}

export function nextStepFor(step: DiagnosticStep, status: EvaluationStatus): string | null {
  if (status === "PASS") return step.passNextStepId ?? step.nextStepId ?? null;
  if (status === "FAIL") return step.failNextStepId ?? null;
  if (status === "UNKNOWN") return step.unknownNextStepId ?? null;
  return step.nextStepId ?? null;
}