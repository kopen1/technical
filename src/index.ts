import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { routes } from "./api/routes";
import { seo } from "./seo/seo";
import diagnosisHtml from "./pages/diagnosis";

const app = new Hono<{Bindings:Env}>();
app.use("*", cors());
routes(app);
seo(app);

app.get("/diagnosis/:slug", c => c.html(diagnosisHtml));

export default app;