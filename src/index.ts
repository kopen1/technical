import { Hono } from "hono";
import { cors } from "hono/cors";
import { processStep } from "./engine/engine";
import { createSession } from "./engine/session";
import type { DiagnosticStep } from "./engine/types";

type Env = { Bindings: { DB: D1Database; ASSETS?: Fetcher } };
const app = new Hono<Env>();
app.use("*", cors());

const demoSteps: Record<string, DiagnosticStep> = {
  s1: {
    id:"s1", flowId:"demo-charging", stepOrder:1,
    title:"Periksa tanda charging",
    instruction:"Colok charger lalu amati tanda charging.",
    why:"Menentukan kondisi awal sebelum pengukuran.",
    inputType:"choice", options:["Ada tanda charging","Tidak ada tanda charging"],
    passNextStepId:"s2", failNextStepId:"s2", unknownNextStepId:"s1"
  },
  s2: {
    id:"s2", flowId:"demo-charging", stepOrder:2,
    title:"Ukur VBUS",
    instruction:"Ukur VBUS pada test point sesuai schematic board.",
    why:"Memastikan tegangan input mencapai board.",
    inputType:"voltage", unit:"V", testPoint:"VBUS",
    expectedMin:4.5, expectedMax:5.5,
    passNextStepId:"s3", failNextStepId:"s4", unknownNextStepId:"s2"
  },
  s3: {
    id:"s3", flowId:"demo-charging", stepOrder:3,
    title:"Periksa tegangan setelah OVP",
    instruction:"Ukur tegangan setelah jalur OVP sesuai hardware reference.",
    why:"Membandingkan input dan output jalur proteksi.",
    inputType:"voltage", unit:"V", testPoint:"AFTER_OVP",
    expectedMin:4.5, expectedMax:5.5,
    passNextStepId:"s5", failNextStepId:"s5", unknownNextStepId:"s3"
  },
  s4: {
    id:"s4", flowId:"demo-charging", stepOrder:4,
    title:"Periksa input path",
    instruction:"Telusuri connector, VBUS dan input path sesuai schematic.",
    why:"Jika VBUS tidak ada, fokus ke input path.",
    inputType:"observation", options:["Normal","Ada masalah"], nextStepId:"s5"
  },
  s5: {
    id:"s5", flowId:"demo-charging", stepOrder:5,
    title:"Verification",
    instruction:"Pastikan charging dan fungsi terkait normal setelah tindakan.",
    why:"Diagnosis belum selesai sebelum hasil diverifikasi.",
    inputType:"choice", options:["Berhasil","Belum berhasil"],
    passNextStepId:"", failNextStepId:"s2", unknownNextStepId:"s5"
  }
};

app.get("/api/health", c => c.json({ok:true, version:"0.2.0"}));

app.get("/api/diagnosis/demo", c => c.json({
  flowId:"demo-charging", device:"Samsung A52 A525F",
  symptom:"Tidak bisa charging", firstStep:demoSteps.s1
}));

app.post("/api/diagnosis/session", async c => {
  const b = await c.req.json();
  return c.json(createSession(b.flowId ?? "demo-charging", b.device ?? "Unknown",
    b.symptom ?? "Unknown", "s1"));
});

app.post("/api/diagnosis/step", async c => {
  const b = await c.req.json();
  const step = demoSteps[b.stepId];
  if (!step) return c.json({error:"STEP_NOT_FOUND"},404);
  const result = processStep(b.session, step, b.value);
  return c.json({
    status:result.status, completed:result.completed,
    nextStep:result.nextStepId ? demoSteps[result.nextStepId] ?? null : null,
    session:result.session
  });
});

app.get("*", async c => c.env.ASSETS ? c.env.ASSETS.fetch(c.req.raw) : c.text("TechniKit V0.2"));
export default app;