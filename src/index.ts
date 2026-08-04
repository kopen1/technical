import { Hono } from 'hono'
type Env={DB:D1Database,ASSETS:Fetcher}
const app=new Hono<{Bindings:Env}>()

app.get('/api/health',(c)=>c.json({ok:true,service:'technikit-diagnostic-engine',version:'0.1.0'}))

app.get('/api/devices',async c=>{
 const r=await c.env.DB.prepare('SELECT id,brand,model,variant,platform FROM devices ORDER BY brand,model').all()
 return c.json(r.results)
})

app.get('/api/diagnose',async c=>{
 const symptom=c.req.query('symptom')||''
 const observation=c.req.query('observation')||''
 const deviceId=c.req.query('device_id')||''
 if(!symptom)return c.json({error:'symptom is required'},400)

 const rules=await c.env.DB.prepare(
  `SELECT id,name,symptom,condition_key,condition_value,fault_group,next_step,rationale,priority,trust_level
   FROM rules WHERE status='ACTIVE' AND lower(symptom)=lower(?) ORDER BY priority ASC`
 ).bind(symptom).all()

 let cases
 if(deviceId){
  cases=await c.env.DB.prepare(
   `SELECT rc.id,d.brand,d.model,d.variant,rc.symptom,rc.observation,rc.diagnosis,rc.action,rc.result,rc.verification,rc.trust_level
    FROM repair_cases rc JOIN devices d ON d.id=rc.device_id
    WHERE rc.status='PUBLISHED' AND rc.device_id=? AND lower(rc.symptom)=lower(?) ORDER BY rc.id DESC`
  ).bind(deviceId,symptom).all()
 }else{
  cases=await c.env.DB.prepare(
   `SELECT rc.id,d.brand,d.model,d.variant,rc.symptom,rc.observation,rc.diagnosis,rc.action,rc.result,rc.verification,rc.trust_level
    FROM repair_cases rc JOIN devices d ON d.id=rc.device_id
    WHERE rc.status='PUBLISHED' AND lower(rc.symptom)=lower(?) ORDER BY rc.id DESC LIMIT 20`
  ).bind(symptom).all()
 }

 return c.json({
  engine:'rule + evidence',
  input:{symptom,observation,device_id:deviceId||null},
  status:rules.results.length?'PATH_FOUND':'NO_EXACT_RULE',
  initial_steps:[
   'Catat kondisi awal perangkat sebelum tindakan.',
   'Tentukan apakah perangkat merespons charger/PSU.',
   'Catat arus/current yang terlihat.',
   'Periksa panas abnormal jika ada indikasi.',
   'Masukkan hasil pengukuran sebelum mengambil kesimpulan fault.'
  ],
  matched_rules:rules.results,
  related_published_cases:cases.results,
  note:'Kasus adalah evidence; satu kasus tidak otomatis berlaku universal untuk semua model/board.'
 })
})

app.get('/api/cases',async c=>{
 const r=await c.env.DB.prepare(
  `SELECT rc.id,d.brand,d.model,d.variant,rc.symptom,rc.observation,rc.diagnosis,rc.action,rc.result,rc.verification,rc.trust_level
   FROM repair_cases rc JOIN devices d ON d.id=rc.device_id
   WHERE rc.status='PUBLISHED' ORDER BY rc.id DESC`
 ).all()
 return c.json(r.results)
})

app.get('*',c=>c.env.ASSETS.fetch(c.req.raw))
export default app
