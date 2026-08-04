import type { Context, Next } from "hono";
import type { Env } from "../env";

function token(user: string, secret: string) {
  return btoa(`${user}:${secret}`);
}

export async function requireAdmin(c: Context<{Bindings: Env}>, next: Next) {
  const user = c.env.ADMIN_USERNAME;
  const secret = c.env.SESSION_SECRET;
  const auth = c.req.header("Authorization");
  if (!user || !secret || auth !== `Bearer ${token(user, secret)}`) {
    return c.json({ error: "UNAUTHORIZED" }, 401);
  }
  await next();
}