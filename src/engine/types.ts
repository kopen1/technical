export type Diagnostic = {
  id: string;
  input: string;
  result?: string;
  createdAt: string;
};

export type Session = {
  id: string;
  startedAt: string;
  diagnostics: Diagnostic[];
};

export type Result = {
  success: boolean;
  output?: string;
  errors?: string[];
};
