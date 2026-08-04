import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { routes } from "./api/routes";
import { seo } from "./seo/seo";

const app = new Hono<{Bindings:Env}>();
app.use("*", cors());
routes(app);
seo(app);

app.get("*", c => c.env.ASSETS.fetch(c.req.raw));

export default app;