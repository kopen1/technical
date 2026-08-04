export type StepInputType =
  | "choice" | "boolean" | "voltage" | "current"
  | "resistance" | "diode" | "observation" | "text";

export type EvaluationStatus = "PASS" | "FAIL" | "ABNORMAL" | "UNKNOWN";

export interface DiagnosticStep {
  id: string; flowId: string; stepOrder: number; title: string;
  instruction: string; why?: string; inputType: StepInputType;
  unit?: string; testPoint?: string; expectedMin?: number;
  expectedMax?: number; options?: string[]; nextStepId?: string;
  passNextStepId?: string; failNextStepId?: string; unknownNextStepId?: string;
}

export interface StepAnswer {
  stepId: string; value: string | number | boolean;
  status?: EvaluationStatus; createdAt: string;
}

export interface DiagnosticEvidence {
  stepId: string; label: string; value: string; status: EvaluationStatus;
}

export interface DiagnosticSession {
  id: string; flowId: string; device: string; symptom: string;
  currentStepId: string; answers: StepAnswer[];
  evidence: DiagnosticEvidence[];
  status: "ACTIVE" | "COMPLETED" | "ABORTED";
}