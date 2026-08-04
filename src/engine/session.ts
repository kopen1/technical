import { Session, Diagnostic } from './types';

export class SessionManager {
  private sessions = new Map<string, Session>();

  createSession(id: string): Session {
    const session: Session = { id, startedAt: new Date().toISOString(), diagnostics: [] };
    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  addDiagnostic(sessionId: string, diag: Diagnostic): Session | undefined {
    const s = this.sessions.get(sessionId);
    if (!s) return undefined;
    s.diagnostics.push(diag);
    return s;
  }

  closeSession(id: string): boolean {
    return this.sessions.delete(id);
  }
}
