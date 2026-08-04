import { Diagnostic, Result } from './types';

export async function evaluate(input: string): Promise<Result> {
  // Placeholder evaluator: replace with real logic.
  try {
    const output = `Evaluated: ${input}`;
    return { success: true, output };
  } catch (err: any) {
    return { success: false, errors: [err?.message ?? String(err)] };
  }
}

export async function runDiagnostic(diag: Diagnostic): Promise<Diagnostic> {
  const res = await evaluate(diag.input);
  return { ...diag, result: res.output };
}
