import { Engine } from '../engine/engine';

const engine = new Engine();

// Simple fetch handler suitable for Cloudflare Workers or other runtimes
export async function handleRequest(request: Request): Promise<Response> {
  try {
    if (request.method === 'POST') {
      const body = await request.json();
      const { sessionId, diagnostic } = body;
      if (!sessionId || !diagnostic) {
        return new Response(JSON.stringify({ error: 'sessionId and diagnostic required' }), { status: 400 });
      }

      // ensure session exists
      engine.createSession(sessionId);
      const result = await engine.evaluateDiagnostic(sessionId, diagnostic);
      return new Response(JSON.stringify({ result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('OK', { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), { status: 500 });
  }
}
