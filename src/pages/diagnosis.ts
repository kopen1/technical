const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kasus TechniKit</title><meta name="description" content="Dokumentasi diagnosis perangkat, langkah pemeriksaan dan test point TechniKit."><style>
body{font-family:Inter,system-ui,sans-serif;margin:0;background:#f7f8fa;color:#101828}main{max-width:850px;margin:auto;padding:30px 20px}
.card{background:white;border:1px solid #eaecf0;border-radius:18px;padding:24px;margin-top:18px}
.badge{display:inline-block;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;margin-bottom:8px}
.b-verified{background:#d1fadf;color:#067647}.b-community{background:#eff8ff;color:#175cd3}.b-external{background:#fef0c7;color:#b54708}.b-unknown{background:#f2f4f7;color:#475467}
.bar{height:8px;background:#e4e7ec;border-radius:999px;overflow:hidden}.bar>i{display:block;height:100%;background:#101828;transition:width .3s}
.btn{display:inline-block;border:0;border-radius:10px;padding:12px 16px;background:#101828;color:#fff;font-weight:700;cursor:pointer;margin-top:8px}
input{padding:11px;border:1px solid #d0d5dd;border-radius:10px;width:100%;margin:6px 0;font:inherit}
.log{background:#f8fafc;border:1px solid #eaecf0;border-radius:12px;padding:12px 16px;margin-top:12px;font-size:14px}
.notice{background:#fef0c7;border:1px solid #fdb022;color:#93370d;border-radius:10px;padding:10px 14px;margin-top:10px;font-size:14px}
.vref{border:1px solid #eaecf0;border-radius:14px;padding:14px;margin:14px 0}
.viewer{overflow:hidden;border:1px solid #e4e7ec;border-radius:10px;background:#f8fafc;touch-action:none;position:relative;cursor:grab}
.viewer .layer{transform-origin:0 0;will-change:transform;position:relative;width:max-content}
.viewer .layer img{display:block;max-width:none;user-select:none}
.marker{position:absolute;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:#b42318;border:2px solid #fff;box-shadow:0 0 0 1px #101828;cursor:help}
.marker.tp{background:#175cd3}.marker .tip{display:none;position:absolute;left:50%;bottom:120%;transform:translateX(-50%);background:#101828;color:#fff;padding:4px 8px;border-radius:6px;white-space:nowrap;font-size:11px;line-height:1.2;z-index:3}.marker:hover .tip{display:block}
.rel{display:flex;flex-direction:column;gap:8px}.rel a{text-decoration:none;border:1px solid #eaecf0;border-radius:10px;padding:10px 12px;background:#fff;color:#101828}
a{color:#175cd3}.muted{color:#667085}
</style></head><body><main><a href="/">← TechniKit</a><div id="app" class="card">Memuat kasus...</div></main><script>
const slug=location.pathname.split("/").filter(Boolean).pop(),esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const SRC_LABEL={verified:"Verified",community:"Community",external:"External",unknown:"Unknown"};
const VT_LABEL={board:"Board",connector:"Connector",component:"Component",schematic:"Schematic",test_point:"Test Point",thermal:"Thermal",other:"Other"};
let session=null,step=null,total=0,notice=null;
function srcBadge(s){return \`<span class="badge b-\${esc(s||"unknown")}">\${esc(SRC_LABEL[s]||"Unknown")}</span>\`}
function attachViewer(el){
 const box=el.querySelector(".viewer"),layer=el.querySelector(".layer");if(!box||!layer)return;
 let scale=1,tx=0,ty=0,dragging=false,sx=0,sy=0;
 const apply=()=>layer.style.transform=\`scale(\${scale}) translate(\${tx}px,\${ty}px)\`;
 box.addEventListener("wheel",e=>{e.preventDefault();const f=e.deltaY<0?1.18:0.85;scale=Math.min(10,Math.max(1,scale*f));apply()},{passive:false});
 box.addEventListener("mousedown",e=>{dragging=true;sx=e.clientX-tx;sy=e.clientY-ty;box.style.cursor="grabbing"});
 window.addEventListener("mousemove",e=>{if(!dragging)return;tx=e.clientX-sx;ty=e.clientY-sy;apply()});
 window.addEventListener("mouseup",()=>{dragging=false;box.style.cursor="grab"});
}
function renderVisuals(visuals){
 if(!visuals||!visuals.length)return "";
 return \`<h2>Visual Reference</h2>\`+visuals.map((v,i)=>{
  const markers=v.annotations.map(a=>\`<span class="marker \${esc(a.type==="test_point"?"tp":"")}" style="left:\${a.x*100}%;top:\${a.y*100}%"><span class="tip">\${esc(a.label)}</span></span>\`).join("");
  return \`<div class="vref"><p><b>\${esc(v.caption||"")}</b> \${srcBadge(v.verificationStatus)} <span class="badge b-community">\${esc(VT_LABEL[v.imageType]||v.imageType)}</span></p>
  <div class="viewer" id="vw-\${i}"><div class="layer"><img src="\${esc(v.url||"")}" alt="\${esc(v.caption||"")}">\${markers}</div></div>
  \${v.source?\`<p class="muted">Sumber: \${esc(v.source)}</p>\`:""}<p class="muted">Scroll untuk zoom · drag untuk pan</p></div>\`;
 }).join("");
}
function renderRelated(related){
 if(!related||!related.length)return "";
 return \`<h2>Kasus terkait</h2><div class="rel">\${related.map(r=>\`<a href="/diagnosis/\${esc(r.slug)}"><b>\${esc(r.brand)} \${esc(r.model)}</b> — \${esc(r.symptom)}</a>\`).join("")}</div>\`;
}
(async()=>{
 let r=await fetch("/api/cases/"+encodeURIComponent(slug));
 if(!r.ok){app.innerHTML="<h1>Kasus tidak ditemukan</h1>";return}
 let x=await r.json();
 document.title=x.title+" — TechniKit";
 app.innerHTML=\`\${srcBadge(x.source)}<small>\${esc(x.brand)} · \${esc(x.model)} · \${esc(x.faultGroup||"")}</small><h1 style="margin:6px 0">\${esc(x.title)}</h1><p>\${esc(x.summary)}</p>
 <h2>Jalankan diagnosis</h2><div class="bar"><i id="prog" style="width:0%"></i></div><p class="muted" id="progLabel"></p><div id="run"><button class="btn" onclick="begin()">Mulai pemeriksaan</button></div><div id="evlog"></div>
 \${renderVisuals(x.visuals)}
 <h2>Langkah pemeriksaan</h2>\${x.steps.map((s,i)=>\`<div><h3>\${i+1}. \${esc(s.title)}</h3><p>\${esc(s.instruction)}</p><p class="muted"><b>Metode:</b> \${esc(s.method)}\${s.testPoint?\` · <b>Test Point:</b> \${esc(s.testPoint)}\`:""}</p></div>\`).join("")}
 \${renderRelated(x.related)}\`;
 document.querySelectorAll(".viewer").forEach(el=>attachViewer(el));
})()
async function begin(){
 const r=await fetch("/api/diagnosis/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({caseId:(await (await fetch("/api/cases/"+encodeURIComponent(slug))).json()).id})});
 const d=await r.json();session=d.session;step=d.step;total=d.total||0;notice=null;render();
}
function render(){
 prog.style.width=(total?((session.evidence.length||0)/total*100):0)+"%";
 progLabel.textContent=\`Langkah \${(session.evidence.length||0)+1} dari \${total}\`;
 if(!step){run.innerHTML=\`<div class="card"><h3>Diagnosis selesai ✓</h3><p class="muted">Semua evidence tercatat.</p><button class="btn" onclick="location.reload()">Ulangi</button></div>\`}
 else{run.innerHTML=\`<h3>\${esc(step.title)}</h3><p>\${esc(step.instruction)}</p><p class="muted"><b>Metode:</b> \${esc(step.method)}\${step.testPoint?\` · <b>Test Point:</b> \${esc(step.testPoint)}\`:""}</p>\${notice?\`<div class="notice">\${esc(notice)}</div>\`:""}<input id="measurement" placeholder="Masukkan hasil pemeriksaan"><button class="btn" onclick="nextStep()">Lanjut</button>\`}
 evlog.innerHTML=session.evidence.length?\`<h3>Evidence log</h3>\`+session.evidence.map(e=>\`<div class="log"><b>\${esc(e.stepId)}</b> · \${esc(e.value)}</div>\`).join(""):"";
}
async function nextStep(){
 const value=measurement.value.trim();if(!value)return;
 const r=await fetch("/api/diagnosis/answer",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:session.id,value})});
 const d=await r.json();session=d.session;step=d.step;notice=d.notice||null;render();
}
fetch("/api/analytics/visit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:location.pathname,referrer:document.referrer})}).catch(()=>{});
</script></body></html>
`;
export default html;
