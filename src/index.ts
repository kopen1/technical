import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { routes } from "./api/routes";
import { seo } from "./seo/seo";
import diagnosisHtml from "./pages/diagnosis";

const app = new Hono<{Bindings:Env}>();
app.use("*", cors());
app.onError((err, c) => {
  return c.json({ error: "INTERNAL", message: err instanceof Error ? err.message : String(err) }, 500);
});
routes(app);
seo(app);

app.get("/diagnosis/:slug", c => c.html(diagnosisHtml));

export default app;