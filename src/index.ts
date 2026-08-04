import {Hono} from "hono";import {cors} from "hono/cors";import {registerDiagnosisRoutes} from "./api/diagnosis";import type {Env} from "./env";
const app=new Hono<{Bindings:Env}>();app.use("*",cors());registerDiagnosisRoutes(app);
app.get("/api/health",c=>c.json({ok:true,project:"TechniKit",version:"1.0.0",engine:"rule-based"}));
app.get("*",async c=>c.env.ASSETS?c.env.ASSETS.fetch(c.req.raw):c.text("TechniKit V1"));export default app;