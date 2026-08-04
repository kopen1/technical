import { SessionManager } from './session';
import { runDiagnostic } from './evaluator';
import { Diagnostic } from './types';

export class Engine {
  private sessions = new SessionManager();

  createSession(id: string) {
    return this.sessions.createSession(id);
  }

  async evaluateDiagnostic(sessionId: string, diag: Diagnostic) {
    const updated = await runDiagnostic(diag);
    this.sessions.addDiagnostic(sessionId, updated);
    return updated;
  }

  getSession(sessionId: string) {
    return this.sessions.getSession(sessionId);
  }
}
