import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { routes } from "./api/routes";
import { seo } from "./seo/seo";

const app = new Hono<{Bindings:Env}>();
app.use("*", cors());
routes(app);
seo(app);

app.get("/diagnosis/:slug", async c => {
  const url = new URL("/diagnosis/index.html", c.req.url);
  const res = await c.env.ASSETS.fetch(url);
  if (res.ok) {
    return new Response(res.body, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=UTF-8" }
    });
  }
  return res;
});

app.get("*", c => c.env.ASSETS.fetch(c.req.raw));

export default app;