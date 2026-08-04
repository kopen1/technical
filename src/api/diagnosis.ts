import type {Hono} from "hono";import {flows} from "../data/cases";import {newSession} from "../engine/session";import {runStep} from "../engine/engine";import type {Env} from "../env";
const sessions=new Map<string,ReturnType<typeof newSession>>();
export function registerDiagnosisRoutes(app:Hono<{Bindings:Env}>){
app.get("/api/diagnosis/flows",c=>c.json(flows.map(f=>({id:f.id,device:f.device,symptom:f.symptom,title:f.title,reference:f.reference,faultGroups:f.faultGroups}))));
app.get("/api/diagnosis/flows/:id",c=>{const f=flows.find(x=>x.id===c.req.param("id"));return f?c.json(f):c.json({error:"FLOW_NOT_FOUND"},404)});
app.post("/api/diagnosis/session",async c=>{const b=await c.req.json<{flowId:string}>();const f=flows.find(x=>x.id===b.flowId);if(!f)return c.json({error:"FLOW_NOT_FOUND"},404);const s=newSession(f.id,f.device,f.symptom,f.steps[0].id);sessions.set(s.id,s);return c.json({session:s,step:f.steps[0]})});
app.post("/api/diagnosis/step",async c=>{const b=await c.req.json<{sessionId:string,value:string}>();const s=sessions.get(b.sessionId);if(!s)return c.json({error:"SESSION_NOT_FOUND"},404);const f=flows.find(x=>x.id===s.flowId);if(!f)return c.json({error:"FLOW_NOT_FOUND"},404);const r=runStep(f,s,String(b.value??""));if("error"in r)return c.json(r,400);sessions.set(s.id,s);return c.json(r)});
app.get("/api/diagnosis/session/:id",c=>{const s=sessions.get(c.req.param("id"));return s?c.json(s):c.json({error:"SESSION_NOT_FOUND"},404)});
}