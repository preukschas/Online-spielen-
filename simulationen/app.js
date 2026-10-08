import {VERSION,CONFIG,FIELDS,initialParams,makeSim,stepSim,measure,trainOneGeneration,trainedToArena,arenaBatch} from "./engine.js";
import {drawScene} from "./render-v2.js";
import {safeEntityList,findEntity,toBiomechanics,toArena} from "./entity-model.js";
const $=id=>document.getElementById(id),canvas=$("scene"),sceneCtx=canvas.getContext("2d"),chartCtx=$("chart").getContext("2d");
const KEY="dmp_simlab_scenarios_v1",BIOKEY="dmp_simlab_best_walker_v1";
let mode="physics",preset="fall",params=initialParams(preset),seed=42,sim=makeSim(mode,preset,params,seed),playing=false,accum=0,lastFrame=0,dialog=$("helpDialog"),renderTick=0;
function formatValue(v,f){return String(Number(v.toFixed(3))).replace(".",",")+(f[5]?" "+f[5]:"")}
function note(message,error=false){const n=$("notice");n.textContent=message;n.style.color=error?"#ff9e9e":"#55dbb4";}
function safeGet(key,defaultValue){try{return JSON.parse(localStorage.getItem(key))??defaultValue}catch{return defaultValue}}
function safeSet(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{note("Browser-Speicher nicht verfügbar. Bitte JSON exportieren.",true);return false}}

function addEntityPicker(container,slot=null){
 const block=document.createElement("div");block.className="entity-picker";
 const title=document.createElement("label");title.className="field-label";title.textContent=slot?"Entität "+slot+" aus dem Editor":"Gespeicherten Körper laden";
 const select=document.createElement("select");select.className="full";select.setAttribute("aria-label",title.textContent);
 const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent="– Entität auswählen –";select.append(placeholder);
 const items=safeEntityList(localStorage);
 for(const entity of items){const o=document.createElement("option");o.value=entity.id;o.textContent=entity.name+" · "+(entity.kind==="biped"?"2 Beine":"4 Beine");select.append(o);}
 const active=slot?params["entity"+slot]:params.entityId;
 if(active&&items.some(e=>e.id===active))select.value=active;
 const btn=document.createElement("button");btn.type="button";btn.className="extra-button";btn.textContent=slot?"Entität "+slot+" übernehmen":"Körperwerte übernehmen";
 btn.disabled=items.length===0;
 btn.addEventListener("click",()=>{const e=findEntity(localStorage,select.value);if(!e){note("Bitte eine gespeicherte Entität auswählen.",true);return;}applyEntityToLab(e,slot?"arena":"bio",slot||"A");});
 const editor=document.createElement("a");editor.href="./editor.html";editor.textContent="✎ Entität im Editor gestalten ↗";editor.className="entity-editor-link";
 title.append();block.append(title,select,btn,editor);container.append(block);
}
function applyEntityToLab(entity,target,slot="A"){
 if(target==="bio"){
  const converted=toBiomechanics(entity);if(!converted){note("Entität kann nicht übernommen werden.",true);return;}
  mode="bio";preset=converted.preset;params={...initialParams(preset),...converted.params,entityId:entity.id};
 } else if(target==="arena"){
  const converted=toArena(entity);if(!converted){note("Entität kann nicht übernommen werden.",true);return;}
  if(mode!=="arena"){mode="arena";preset="race";params=initialParams(preset);}
  const side=slot==="B"?"B":"A";
  params["speed"+side]=converted.speed;params["stamina"+side]=converted.stamina;
  params["name"+side]=converted.name;params["color"+side]=converted.color;
  params["kind"+side]=converted.kind;params["entity"+side]=entity.id;
 }else return;
 document.querySelectorAll(".module").forEach(b=>{const active=b.dataset.mode===mode;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));});
 controls();resetSim();
 $("scenarioName").value=entity.name+(mode==="bio"?" · Gangversuch":" · Arena");
 note("Entität „"+entity.name+"“ als "+(mode==="bio"?"Biomechanik-Körper":"Arena "+(slot==="B"?"B":"A"))+" übernommen. Vereinfachtes Lehrmodell.");
}
function controls(){
 $("sceneTitle").textContent=CONFIG[mode].title;
 $("sceneSubtitle").textContent=CONFIG[mode].presets.find(x=>x[0]===preset)?.[1]||"";
 $("sceneTag").textContent=mode==="bio"?"2D · LERNMODELL":"2D · MODELL";
 $("modelLimit").textContent="Modellgrenze: "+CONFIG[mode].limit;
 const p=$("preset");p.innerHTML="";
 CONFIG[mode].presets.forEach(([value,label])=>{const o=document.createElement("option");o.value=value;o.textContent=label;p.append(o)});p.value=preset;
 const box=$("parameters");box.innerHTML="";
 for(const f of FIELDS[preset]||[]){
  const [key,label,min,max,step]=f;
  const wrap=document.createElement("div");wrap.className="parameter";
  const head=document.createElement("div");head.className="param-line";
  const title=document.createElement("label");title.htmlFor="param-"+key;title.textContent=label;
  const out=document.createElement("output");out.textContent=formatValue(params[key],f);
  head.append(title,out);wrap.append(head);
  const range=document.createElement("input");range.type="range";range.id="param-"+key;range.min=min;range.max=max;range.step=step;range.value=params[key];range.setAttribute("aria-label",label);
  range.addEventListener("input",()=>{params[key]=Number(range.value);out.textContent=formatValue(params[key],f);resetSim();});
  wrap.append(range);
  const ext=document.createElement("div");ext.className="range-ends";ext.innerHTML="<span>"+formatValue(min,f)+"</span><span>"+formatValue(max,f)+"</span>";wrap.append(ext);box.append(wrap);
 }
 const ex=$("extraActions");ex.innerHTML="";
 if(mode==="bio"){
  const btn=document.createElement("button");btn.className="extra-button";btn.type="button";btn.id="trainButton";btn.textContent="🧠 25 Generationen trainieren";
  btn.addEventListener("click",startTraining);ex.append(btn);
  const s=document.createElement("p");s.id="trainStatus";s.className="train-status";s.textContent="Der Regler wird durch Evolution mit getrenntem Testlauf optimiert.";ex.append(s);
  addEntityPicker(ex,null);
 }
 if(mode==="mechanics"){
  const link=document.createElement("a");link.className="extra-button";link.href="./builder.html";link.textContent="🧩 Freien Maschinenbaukasten öffnen ↗";
  link.style.textAlign="center";link.style.textDecoration="none";link.style.display="block";ex.append(link);
  const hint=document.createElement("p");hint.className="micro";hint.textContent="Beliebige Stangen und Räder konstruieren, mit Drehgelenken verbinden und Motoren hinzufügen.";ex.append(hint);
 }
 if(mode==="arena"){
  addEntityPicker(ex,"A");addEntityPicker(ex,"B");
  for(const [key,label,fallback] of [["nameA","Entität A benennen","Entität A"],["nameB","Entität B benennen","Entität B"]]){
   const title=document.createElement("label");title.className="field-label";title.textContent=label;title.htmlFor=key;
   const field=document.createElement("input");field.id=key;field.className="full";field.maxLength=24;field.value=String(params[key]||fallback);field.setAttribute("aria-label",label);
   field.addEventListener("change",()=>{params[key]=field.value.trim().slice(0,24)||fallback;resetSim();});
   ex.append(title,field);
  }
  const imp=document.createElement("button");imp.type="button";imp.className="extra-button";imp.textContent="🦿 Besten Läufer als Entität A laden";
  imp.addEventListener("click",()=>{
   const best=safeGet(BIOKEY,null);if(!best){note("Noch kein trainierter Zweibeiner oder Vierbeiner gespeichert.",true);return;}
   params.speedA=trainedToArena(best.genome);resetSim();controls();note("Trainierter Läufer für Entität A importiert: "+params.speedA.toFixed(2)+" m/s (modellbasierte Umrechnung).");
  });ex.append(imp);
  const bat=document.createElement("button");bat.type="button";bat.className="extra-button";bat.style.background="#334d71";bat.textContent="🏁 10 Durchläufe vergleichen";
  bat.addEventListener("click",()=>{const w=arenaBatch(params,seed,10,preset);note("10 Läufe · "+(preset==="sprint"?"Sprint":"Hindernisse")+" · A "+w[0]+" Siege · B "+w[1]+" Siege · "+w[2]+" Gleichstand.")});ex.append(bat);
  const tournament=document.createElement("button");tournament.type="button";tournament.className="extra-button";tournament.style.background="#334d71";tournament.textContent="🏆 50 Duelle auswerten";
  tournament.addEventListener("click",()=>{const w=arenaBatch(params,seed,50,preset);note("50 Duelle · A "+w[0]+" Siege · B "+w[1]+" Siege · "+w[2]+" Gleichstand; Zuordnung abwechselnd.")});ex.append(tournament);
 }
 if(mode==="crash"){
  const cmp=document.createElement("button");cmp.type="button";cmp.className="extra-button";cmp.textContent="📊 Knautschzone A/B vergleichen";
  cmp.addEventListener("click",()=>{
   function run(k){const s=makeSim("crash","barrier",{...params,stiffness:k},seed);for(let i=0;i<1800&&!s.finished;i++)stepSim(s);return{g:s.body.maxG,c:s.body.maxCompression};}
   const a=run(params.stiffness*.7),b=run(params.stiffness*1.3);note("A (weicher): "+a.g.toFixed(1)+" g, "+(100*a.c).toFixed(0)+" cm · B (härter): "+b.g.toFixed(1)+" g, "+(100*b.c).toFixed(0)+" cm. Nur Lehrmodell.");
  });ex.append(cmp);
 }
 $("configTag").textContent=mode.toUpperCase();
}
function resetSim(){playing=false;accum=0;sim=makeSim(mode,preset,params,seed);$("play").textContent="▶ Start";$("overlay").textContent="Drücke Start, um die Simulation auszuführen.";$("overlay").classList.remove("hidden");refresh();}
function switchMode(next){if(!CONFIG[next])return;mode=next;preset=CONFIG[next].presets[0][0];params=initialParams(preset);document.querySelectorAll(".module").forEach(b=>{const active=b.dataset.mode===next;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));});controls();resetSim();note("");}
function togglePlay(){if(sim.finished){resetSim()}playing=!playing;$("play").textContent=playing?"❚❚ Pause":"▶ Fortsetzen";if(playing)$("overlay").classList.add("hidden");refresh();}
function doStep(){playing=false;$("play").textContent="▶ Fortsetzen";if(!sim.finished)stepSim(sim,1/120);$("overlay").classList.add("hidden");refresh();}
function startTraining(){
 if(mode!=="bio")return;
 if(sim.training.generation>=25){const prev=sim.training;resetSim();sim.training=prev;sim.training.generation=0;sim.training.best=null;sim.training.score=-Infinity;sim.training.history=[];}
 sim.training.running=!sim.training.running;
 const btn=$("trainButton");if(btn)btn.textContent=sim.training.running?"⏸ Training pausieren":"🧠 Training fortsetzen";
 $("overlay").classList.add("hidden");
}
function refresh(){
 const m=measure(sim);$("heroTime").textContent=sim.time.toFixed(1).replace(".",",");$("chartLabel").textContent=m.chart;
 const out=$("readouts");out.replaceChildren();
 for(const [label,val] of m.read){const d=document.createElement("div");d.className="readout";const a=document.createElement("small"),b=document.createElement("strong");a.textContent=label;b.textContent=val;d.append(a,b);out.append(d);}
 if(mode==="bio"&&$("trainStatus")){
  const tr=sim.training;
  $("trainStatus").textContent=tr.generation?tr.generation+"/25 Gen. · Training "+tr.score.toFixed(2)+" · unabhängiger Test "+tr.validation.score.toFixed(2):"Evolution optimiert Schrittweite, Frequenz und Balance-Regler.";
 }
 drawChart();
}
function drawChart(){
 const c=chartCtx,w=c.canvas.width,h=c.canvas.height;c.clearRect(0,0,w,h);c.fillStyle="#0e1b2b";c.fillRect(0,0,w,h);
 const left=55,right=w-14,top=15,bottom=h-27;
 c.strokeStyle="#345064";c.lineWidth=1;for(let i=0;i<=4;i++){const y=top+(bottom-top)*i/4;c.beginPath();c.moveTo(left,y);c.lineTo(right,y);c.stroke();}
 let hst=sim.history.slice(-240);
 if(mode==="bio"&&sim.training.generation>0){
  const tr=sim.training.history;hst=tr.map(d=>({t:d.generation,v:d.validation}));$("chartLabel").textContent="Testbewertung über Generationen (Modellpunkte)";
 }
 const ys=hst.map(x=>x.v).filter(Number.isFinite);
 let min=Math.min(0,...ys),max=Math.max(1,...ys);if(max-min<.01)max=min+1;const minT=hst.length?hst[0].t:0,maxT=Math.max(minT+1,...hst.map(x=>x.t));
 c.font="12px system-ui";c.fillStyle="#a2b8c8";c.textAlign="right";c.fillText(max.toFixed(1),left-9,top+5);c.fillText(min.toFixed(1),left-9,bottom);c.fillText(minT.toFixed(1),left,bottom+19);c.textAlign="right";c.fillText(maxT.toFixed(1)+(mode==="bio"&&sim.training.generation?" Gen.":" s"),right,bottom+19);
 c.strokeStyle="#55dbb4";c.lineWidth=3;c.beginPath();let started=false;
 for(const pt of hst){if(!Number.isFinite(pt.v))continue;const x=left+(pt.t-minT)/(maxT-minT)*(right-left),y=bottom-(pt.v-min)/(max-min)*(bottom-top);if(!started){c.moveTo(x,y);started=true;}else c.lineTo(x,y);}
 if(started)c.stroke();
}
function frame(now){
 const delta=lastFrame?Math.min(.10,(now-lastFrame)/1000):0;lastFrame=now;
 if(playing){
  accum+=delta*Number($("speed").value);let count=0;
  while(accum>=1/120&&count<140&&!sim.finished){stepSim(sim);accum-=1/120;count++;}
  if(count===140)accum=0;
  if(sim.finished){playing=false;$("play").textContent="▶ Neustart";$("overlay").textContent=mode==="arena"?"Rennen beendet: "+sim.body.winner:"Simulation beendet. Mit Reset erneut starten.";$("overlay").classList.remove("hidden");}
 }
 if(mode==="bio"&&sim.training.running){
  trainOneGeneration(sim);
  if(!sim.training.running){
   const tr=sim.training;
   if(tr.best){
    const best={genome:{...tr.best},training:tr.score,validation:tr.validation,version:VERSION,seed:sim.seed};safeSet(BIOKEY,best);
    const savedTraining=tr;
    params={...params,...tr.best};
    sim=makeSim(mode,preset,params,seed);sim.training=savedTraining;playing=false;controls();
    note("Training abgeschlossen: bester Regler gespeichert und in den Simulator übernommen.");
    $("overlay").textContent="Training abgeschlossen. Starte den optimierten Läufer.";$("overlay").classList.remove("hidden");
   }
  }
 }
 drawScene(sceneCtx,sim);
 if(now-renderTick>90){refresh();renderTick=now;}
 requestAnimationFrame(frame);
}
function scenarios(){const items=safeGet(KEY,[]);return Array.isArray(items)?items.filter(x=>x&&typeof x.name==="string").slice(0,100):[];}
function showSaved(){const p=$("saved");p.replaceChildren();let o=document.createElement("option");o.value="";o.textContent="– Bitte auswählen –";p.append(o);scenarios().forEach((item,i)=>{let o=document.createElement("option");o.value=String(i);o.textContent=item.name+" · "+(CONFIG[item.mode]?.title||"?");p.append(o);});}
function scenario(){return{format:"DMP_SIM_SCENARIO",version:VERSION,name:$("scenarioName").value.trim()||CONFIG[mode].title+" "+new Date().toLocaleDateString("de-DE"),mode,preset,params:{...params},seed,createdAt:new Date().toISOString()};}
function validScenario(o){
 if(!o||o.format!=="DMP_SIM_SCENARIO"||!CONFIG[o.mode]||!CONFIG[o.mode].presets.some(x=>x[0]===o.preset)||!o.params||typeof o.params!=="object")return false;
 if(!Number.isSafeInteger(o.seed)||o.seed<1||o.seed>2147483647||typeof o.name!=="string"||o.name.length>60)return false;
 const fieldsValid=FIELDS[o.preset].every(f=>Number.isFinite(o.params[f[0]])&&o.params[f[0]]>=f[2]&&o.params[f[0]]<=f[3]);
 const namesValid=["nameA","nameB","entityName"].every(key=>o.params[key]===undefined||(typeof o.params[key]==="string"&&o.params[key].length<=24));
 const colorsValid=["color","colorA","colorB"].every(key=>o.params[key]===undefined||(typeof o.params[key]==="string"&&/^#[a-fA-F0-9]{6}$/.test(o.params[key])));
 const kindsValid=["kindA","kindB"].every(key=>o.params[key]===undefined||o.params[key]==="biped"||o.params[key]==="quadruped");
 const idsValid=["entityId","entityA","entityB"].every(key=>o.params[key]===undefined||(typeof o.params[key]==="string"&&/^[a-zA-Z0-9_-]{1,80}$/.test(o.params[key])));
 const shapeValid=["torso","limb","head"].every(key=>o.params[key]===undefined||(typeof o.params[key]==="number"&&Number.isFinite(o.params[key])&&o.params[key]>=.5&&o.params[key]<=1.6));
 return fieldsValid&&namesValid&&colorsValid&&kindsValid&&idsValid&&shapeValid;
}
function loadScenario(s){
 if(!validScenario(s)){note("Datei enthält kein gültiges Simulationsszenario.",true);return;}
 mode=s.mode;preset=s.preset;params=Object.fromEntries(FIELDS[preset].map(f=>[f[0],s.params[f[0]]]));if(mode==="arena"){for(const key of ["nameA","nameB","colorA","colorB","kindA","kindB","entityA","entityB"]){if(s.params[key]!==undefined)params[key]=s.params[key];}}
 if(mode==="bio"){for(const key of ["entityId","entityName","color","torso","limb","head"]){if(s.params[key]!==undefined)params[key]=s.params[key];}}
 seed=s.seed;
 document.querySelectorAll(".module").forEach(b=>{const yes=b.dataset.mode===mode;b.classList.toggle("active",yes);b.setAttribute("aria-pressed",String(yes));});controls();resetSim();$("scenarioName").value=s.name;note("Experiment geladen. Mit Start wiederholen.");
}
$("modules").addEventListener("click",e=>{const btn=e.target.closest("[data-mode]");if(btn)switchMode(btn.dataset.mode);});
$("preset").addEventListener("change",e=>{preset=e.target.value;params=initialParams(preset);controls();resetSim();});
$("play").addEventListener("click",togglePlay);
$("step").addEventListener("click",doStep);
$("reset").addEventListener("click",resetSim);
$("save").addEventListener("click",()=>{const all=scenarios();const s=scenario();if(!validScenario(s)){note("Ungültige Werte.",true);return;}all.unshift(s);if(safeSet(KEY,all.slice(0,60))){showSaved();note("Experiment im Browser gespeichert.");}});
$("load").addEventListener("click",()=>{const i=$("saved").value;if(i===""){note("Bitte ein Experiment auswählen.",true);return;}const s=scenarios()[Number(i)];if(s)loadScenario(s);});
$("export").addEventListener("click",()=>{
 const blob=new Blob([JSON.stringify(scenario(),null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="dmp-simulation-"+mode+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);note("JSON-Experiment exportiert.");
});
function downloadText(text,filename,type){
 const blob=new Blob([text],{type});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$("csvExport").addEventListener("click",()=>{
 const q=scenario(),history=sim.history;
 const hdr=["# DMP Simulationswerkstatt "+VERSION,"# Modul: "+mode,"# Versuch: "+preset,"# Zufallsstartwert: "+seed,"# Parameter: "+JSON.stringify(q.params),"zeit_s,messwert"];
 const lines=history.map(h=>[h.t.toFixed(4),h.v.toFixed(6)].join(","));
 downloadText("\uFEFF"+hdr.concat(lines).join("\r\n"),"dmp-messwerte-"+mode+".csv","text/csv;charset=utf-8");
 note("CSV-Messreihe exportiert ("+history.length+" Messpunkte).");
});
$("compare").addEventListener("click",()=>{
 const index=$("saved").value,other=index===""?null:scenarios()[Number(index)];
 if(!other||!validScenario(other)){note("Zuerst ein gespeichertes Experiment auswählen.",true);return;}
 if(other.mode!==mode||other.preset!==preset){note("Für A/B-Vergleich dasselbe Modul und denselben Aufbau auswählen.",true);return;}
 function run(p,seed){
  const test=makeSim(mode,preset,p,seed);
  const duration=mode==="physics"?15:mode==="bio"?14:mode==="arena"?30:12;
  for(let j=0;j<duration*120&&!test.finished;j++)stepSim(test,1/120);
  return test;
 }
 const current=run(params,seed),comparison=run(other.params,other.seed);
 const av=measure(current).plot,bv=measure(comparison).plot;
 if(mode==="arena"){note("A/B · aktueller Sieger: "+(current.body.winner||"offen")+" · gespeicherter Sieger: "+(comparison.body.winner||"offen")+".");return;}
 const unit=mode==="crash"?" kN":mode==="bio"?" m":preset==="fall"?" m":preset==="pendulum"?" °":"";
 note("A/B nach festem Versuch: aktuell "+av.toFixed(2)+unit+" · gespeichert "+bv.toFixed(2)+unit+" · Differenz "+(av-bv).toFixed(2)+unit+".");
});
$("importButton").addEventListener("click",()=>$("importFile").click());
$("importFile").addEventListener("change",async e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(file.size>200000){note("Datei zu groß (max. 200 KB).",true);e.target.value="";return;}
 try{const obj=JSON.parse(await file.text());loadScenario(obj);}catch{note("JSON konnte nicht gelesen werden.",true);}e.target.value="";
});
$("help").addEventListener("click",()=>dialog.showModal());
$("closeHelp").addEventListener("click",()=>dialog.close());
document.addEventListener("keydown",e=>{if(e.code==="Space"&&!["INPUT","SELECT","BUTTON","TEXTAREA"].includes(document.activeElement.tagName)&&!dialog.open){e.preventDefault();togglePlay();}});
document.querySelectorAll(".module").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===mode)));
const entry = new URLSearchParams(window.location.search);
const requestedSaved = entry.get("saved");
const stored = scenarios();
const savedIndex = requestedSaved !== null && /^(0|[1-9]\d*)$/.test(requestedSaved) ? Number(requestedSaved) : -1;
const requestedMode = entry.get("mode");
if (savedIndex >= 0 && savedIndex < stored.length && validScenario(stored[savedIndex])) {
  loadScenario(stored[savedIndex]);
} else if (requestedMode && CONFIG[requestedMode]) {
  switchMode(requestedMode);
} else {
  controls();
}
const entityRequested = entry.get("entity");
if(entityRequested && (mode==="arena"||mode==="bio")){
 const found=findEntity(localStorage,entityRequested);
 if(found)applyEntityToLab(found,mode,entry.get("slot")==="B"?"B":"A");
 else note("Entität in diesem Browser nicht gefunden. Erstelle sie im Editor oder importiere JSON.",true);
}
showSaved();refresh();requestAnimationFrame(frame);
