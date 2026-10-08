import {VERSION,CONFIG,FIELDS,initialParams,makeSim,stepSim,measure,trainOneGeneration,trainedToArena,arenaBatch} from "./engine.js?v=1.4.0";
import {trainDuelGeneration,duelValidGenome,duelDefaultGenome} from "./duel-core.js?v=1.4.0";
import {drawScene} from "./render-v2.js?v=1.4.0";
import {safeEntityList,findEntity,toBiomechanics,toArena} from "./entity-model.js";
const $=id=>document.getElementById(id),canvas=$("scene"),sceneCtx=canvas.getContext("2d"),chartCtx=$("chart").getContext("2d");
const KEY="dmp_simlab_scenarios_v1",BIOKEY="dmp_simlab_best_walker_v1",DUELKEY="dmp_duel_progress_v1";
let mode="physics",preset="fall",params=initialParams(preset),seed=42,sim=makeSim(mode,preset,params,seed),playing=false,accum=0,lastFrame=0,dialog=$("helpDialog"),renderTick=0,lastSceneRender=0,sceneDirty=true;
function formatValue(v,f){return String(Number(v.toFixed(3))).replace(".",",")+(f[5]?" "+f[5]:"")}
function note(message,error=false){const n=$("notice");n.textContent=message;n.style.color=error?"#ff9e9e":"#55dbb4";}
function safeGet(key,defaultValue){try{return JSON.parse(localStorage.getItem(key))??defaultValue}catch{return defaultValue}}
function safeSet(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{note("Browser-Speicher nicht verfügbar. Bitte JSON exportieren.",true);return false}}

function duelKey(){return DUELKEY+"_"+encodeURIComponent(String(params.entityA||params.nameA||"Entität A").slice(0,80)+"|"+String(params.entityB||params.nameB||"Entität B").slice(0,80));}
function restoreDuel(){
 if(mode!=="arena"||preset!=="duel"||!sim.duelTraining)return;
 const saved=safeGet(duelKey(),null);
 if(saved&&Number.isInteger(saved.generation)&&saved.generation>=0&&saved.generation<=9999&&Array.isArray(saved.genomes)&&saved.genomes.length===2&&saved.genomes.every(duelValidGenome)){
  sim.duelTraining={...sim.duelTraining,...saved,running:false,targetGeneration:Math.max(saved.targetGeneration||0,saved.generation),
    history:Array.isArray(saved.history)?saved.history.slice(-250):[]};
  params.genomeA={...saved.genomes[0]};params.genomeB={...saved.genomes[1]};
  sim.body.fighters[0].genome={...params.genomeA};sim.body.fighters[1].genome={...params.genomeB};
 }
}
function startDuelTraining(){
 const tr=sim.duelTraining;if(!tr)return;
 if(tr.running){tr.running=false;note("Duell-Evolution pausiert nach Generation "+tr.generation+".");}
 else{if(tr.targetGeneration<=tr.generation)tr.targetGeneration=tr.generation+params.evoRounds;
  tr.running=true;playing=false;$("play").textContent="▶ Start";note("Beide Entitäten trainieren selbstständig in simulierten Duellen.");}
 $("overlay").classList.add("hidden");refresh();
}
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
  if(preset==="duel")delete params["genome"+side];
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
  const btn=document.createElement("button");btn.className="extra-button";btn.type="button";btn.id="trainButton";btn.textContent="🧠 Evolution starten";
  btn.addEventListener("click",startTraining);ex.append(btn);
  const s=document.createElement("p");s.id="trainStatus";s.className="train-status";s.textContent="Lernziel: Zielstrecke erreichen, Balance halten und Energie sparen. Weitere Generationen jederzeit möglich.";ex.append(s);
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
   field.addEventListener("change",()=>{params[key]=field.value.trim().slice(0,24)||fallback;if(preset==="duel")delete params["genome"+key.slice(-1)];resetSim();});
   ex.append(title,field);
  }
  if(preset==="duel"){
   const hint=document.createElement("p");hint.className="micro";hint.textContent="Die Figuren duellieren sich automatisch mit Schubsen, Schlagen, Treten, Springen und Blocken. Ihre Entscheidungen können sie über viele Generationen verbessern.";ex.append(hint);
   const train=document.createElement("button");train.type="button";train.className="extra-button";train.id="duelTrainButton";train.textContent="🧠 Evolution starten";train.addEventListener("click",startDuelTraining);ex.append(train);
   const status=document.createElement("p");status.id="duelStatus";status.className="train-status";ex.append(status);
   const erase=document.createElement("button");erase.type="button";erase.className="secondary";erase.textContent="↺ Training dieser Paarung zurücksetzen";
   erase.addEventListener("click",()=>{try{localStorage.removeItem(duelKey());}catch{}delete params.genomeA;delete params.genomeB;resetSim();note("Evolution dieser beiden Entitäten zurückgesetzt.");});ex.append(erase);
  }else{
   const imp=document.createElement("button");imp.type="button";imp.className="extra-button";imp.textContent="🦿 Besten Läufer als Entität A laden";
   imp.addEventListener("click",()=>{const best=safeGet(BIOKEY,null);if(!best){note("Noch kein trainierter Zweibeiner oder Vierbeiner gespeichert.",true);return;}
    params.speedA=trainedToArena(best.genome);resetSim();controls();note("Trainierter Läufer für A übernommen.");});ex.append(imp);
  }
  const bat=document.createElement("button");bat.type="button";bat.className="extra-button";bat.textContent=preset==="duel"?"🥊 10 Duelle vergleichen":"🏁 10 Durchläufe vergleichen";
  bat.addEventListener("click",()=>{const w=arenaBatch(params,seed,10,preset);note("10 "+(preset==="duel"?"Duelle":"Rennen")+" · A "+w[0]+" Siege · B "+w[1]+" Siege · "+w[2]+" Unentschieden.");});ex.append(bat);
  const tournament=document.createElement("button");tournament.type="button";tournament.className="extra-button";tournament.textContent="🏆 50 Runden auswerten";
  tournament.addEventListener("click",()=>{const w=arenaBatch(params,seed,50,preset);note("50 Runden · A "+w[0]+" Siege · B "+w[1]+" Siege · "+w[2]+" Gleichstand.");});ex.append(tournament);
 }
 if(mode==="crash"&&preset==="barrier"){
  const cmp=document.createElement("button");cmp.type="button";cmp.className="extra-button";cmp.textContent="📊 Knautschzone A/B vergleichen";
  cmp.addEventListener("click",()=>{
   function run(k){const s=makeSim("crash","barrier",{...params,stiffness:k},seed);for(let i=0;i<1800&&!s.finished;i++)stepSim(s);return{g:s.body.maxG,c:s.body.maxCompression};}
   const a=run(params.stiffness*.7),b=run(params.stiffness*1.3);note("A (weicher): "+a.g.toFixed(1)+" g, "+(100*a.c).toFixed(0)+" cm · B (härter): "+b.g.toFixed(1)+" g, "+(100*b.c).toFixed(0)+" cm. Nur Lehrmodell.");
  });ex.append(cmp);
 }
 $("configTag").textContent=mode.toUpperCase();
}
function resetSim(){playing=false;accum=0;sceneDirty=true;sim=makeSim(mode,preset,params,seed);restoreDuel();$("play").textContent="▶ Start";$("overlay").textContent="Drücke Start, um die Simulation auszuführen.";$("overlay").classList.remove("hidden");refresh();}
function switchMode(next){if(!CONFIG[next])return;mode=next;preset=CONFIG[next].presets[0][0];params=initialParams(preset);document.querySelectorAll(".module").forEach(b=>{const active=b.dataset.mode===next;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));});controls();resetSim();note("");}
function togglePlay(){if(sim.finished){resetSim()}playing=!playing;$("play").textContent=playing?"❚❚ Pause":"▶ Fortsetzen";if(playing)$("overlay").classList.add("hidden");refresh();}
function doStep(){playing=false;$("play").textContent="▶ Fortsetzen";if(!sim.finished)stepSim(sim,1/120);$("overlay").classList.add("hidden");refresh();}
function startTraining(){
 if(mode!=="bio")return;
 const tr=sim.training;
 if(tr.running){tr.running=false;note("Training pausiert. Fortsetzen bei Generation "+tr.generation+".");}
 else{
  if(tr.targetGeneration<=tr.generation)tr.targetGeneration=tr.generation+params.generations;
  tr.running=true;
  note("Evolution trainiert auf "+params.targetDistance+" m · Generation "+(tr.generation+1)+" bis "+tr.targetGeneration+".");
 }
 $("overlay").classList.add("hidden");refresh();
}
function refresh(){
 const m=measure(sim);$("heroTime").textContent=sim.time.toFixed(1).replace(".",",");$("chartLabel").textContent=m.chart;
 const out=$("readouts");out.replaceChildren();
 for(const [label,val] of m.read){const d=document.createElement("div");d.className="readout";const a=document.createElement("small"),b=document.createElement("strong");a.textContent=label;b.textContent=val;d.append(a,b);out.append(d);}
 if(mode==="bio"&&$("trainStatus")){
  const tr=sim.training;
  $("trainStatus").textContent="Ziel: "+params.targetDistance+" m · Gen. "+tr.generation+"/"+tr.targetGeneration+(tr.validation?" · Bestwert "+tr.score.toFixed(2)+" · Test "+tr.validation.score.toFixed(2)+" · "+(tr.validation.goalReached?"Ziel erreicht ✓":"Ziel offen"):" · zunächst Start drücken");
  $("trainButton").textContent=tr.running?"⏸ Training pausieren":tr.generation>0&&tr.generation>=tr.targetGeneration?"🧠 Weitere "+params.generations+" Generationen":tr.targetGeneration>tr.generation?"▶ Training fortsetzen":"🧠 "+params.generations+" Generationen trainieren";
 }
 if(mode==="arena"&&preset==="duel"&&$("duelStatus")){
  const tr=sim.duelTraining;
  $("duelStatus").textContent="Lernziel: siegen, Treffer vermeiden, Energie sparen. Generation "+tr.generation+"/"+tr.targetGeneration+
   " · Bewertung A "+(Number.isFinite(tr.scores[0])?tr.scores[0].toFixed(1):"–")+
   " · B "+(Number.isFinite(tr.scores[1])?tr.scores[1].toFixed(1):"–")+
   " · Testduelle A/B/Remis: "+tr.wins.join("/")+" · Fortschritt wird lokal gespeichert.";
  $("duelTrainButton").textContent=tr.running?"⏸ Evolution pausieren":tr.generation>=tr.targetGeneration&&tr.generation>0?
   "🧠 Weitere "+params.evoRounds+" Generationen":tr.targetGeneration>tr.generation?
   "▶ Evolution fortsetzen":"🧠 "+params.evoRounds+" Generationen trainieren";
 }
 drawChart();
}
function drawChart(){
 const c=chartCtx,w=c.canvas.width,h=c.canvas.height;
 const left=61,right=w-21,top=18,bottom=h-31;
 c.clearRect(0,0,w,h);
 const panel=c.createLinearGradient(0,0,0,h);
 panel.addColorStop(0,"#102f42");panel.addColorStop(1,"#0b2131");
 c.fillStyle=panel;c.fillRect(0,0,w,h);
 let points=sim.history.slice(-320);
 const isTraining=(mode==="bio"&&sim.training.generation>0)||(mode==="arena"&&preset==="duel"&&sim.duelTraining.generation>0);
 if(isTraining){
  points=mode==="bio"?sim.training.history.map(p=>({t:p.generation,v:p.validation})):sim.duelTraining.history.map(p=>({t:p.generation,v:p.training}));
  $("chartLabel").textContent=mode==="bio"?"Bewertung im unabhängigen Test · Generationen":"Strategie-Bewertung · Generationen";
 }
 const good=points.filter(p=>Number.isFinite(p.t)&&Number.isFinite(p.v));
 const values=good.map(p=>p.v);
 let low=Math.min(0,...values),high=Math.max(1,...values);
 if(high-low<.01)high=low+1;
 const start=good.length?good[0].t:0,end=good.length?good[good.length-1].t:1;
 const span=Math.max(.1,end-start);
 const colors={physics:"#78eac5",crash:"#f1c678",bio:"#bda9fa",arena:"#8bc3f8",mechanics:"#75e0d5"};
 const accent=colors[mode]||"#78eac5";
 c.save();c.strokeStyle="#648ba036";c.lineWidth=1;
 for(let i=0;i<=4;i++){
  const y=top+i*(bottom-top)/4;
  c.beginPath();c.moveTo(left,y);c.lineTo(right,y);c.stroke();
 }
 for(let i=0;i<=8;i++){
  const x=left+i*(right-left)/8;
  c.beginPath();c.moveTo(x,top);c.lineTo(x,bottom);c.stroke();
 }
 c.restore();
 c.save();c.font="11px system-ui";c.fillStyle="#a4c5d0";
 c.textAlign="right";
 for(let i=0;i<=4;i++){
  const val=high-(high-low)*i/4;
  c.fillText(val.toFixed(Math.abs(high-low)>100?0:1),left-9,top+i*(bottom-top)/4+4);
 }
 c.textAlign="left";c.fillText(start.toFixed(1),left,bottom+21);
 c.textAlign="right";c.fillText(end.toFixed(1)+(isTraining?" Gen.":" s"),right,bottom+21);
 c.restore();
 if(good.length){
  const xy=good.map(p=>({x:left+(p.t-start)/span*(right-left),y:bottom-(p.v-low)/(high-low)*(bottom-top)}));
  c.save();c.beginPath();c.rect(left,top,right-left,bottom-top);c.clip();
  const under=c.createLinearGradient(0,top,0,bottom);
  under.addColorStop(0,accent+"55");under.addColorStop(1,accent+"00");
  c.beginPath();c.moveTo(xy[0].x,bottom);
  for(const p of xy)c.lineTo(p.x,p.y);
  c.lineTo(xy[xy.length-1].x,bottom);c.closePath();c.fillStyle=under;c.fill();
  c.shadowColor=accent;c.shadowBlur=10;c.strokeStyle=accent;c.lineWidth=3.3;c.lineJoin="round";c.lineCap="round";
  c.beginPath();xy.forEach((p,i)=>{if(i===0)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y);});c.stroke();
  c.shadowBlur=0;
  const last=xy[xy.length-1];c.fillStyle=accent;c.beginPath();c.arc(last.x,last.y,4.5,0,Math.PI*2);c.fill();
  c.strokeStyle="#e7fff5";c.lineWidth=2;c.stroke();
  c.restore();
 }
 c.fillStyle=accent;c.fillRect(14,14,25,3);
}
function frame(now){
 const activeAtStart=playing||(mode==="bio"&&sim.training.running)||(mode==="arena"&&preset==="duel"&&sim.duelTraining.running);
 const delta=lastFrame?Math.min(.10,(now-lastFrame)/1000):0;lastFrame=now;
 if(playing){
  accum+=delta*Number($("speed").value);let count=0;
  while(accum>=1/120&&count<140&&!sim.finished){stepSim(sim);accum-=1/120;count++;}
  if(count===140)accum=0;
  if(sim.finished){playing=false;$("play").textContent="▶ Neustart";$("overlay").textContent=mode==="arena"?"Rennen beendet: "+sim.body.winner:mode==="bio"?(sim.body.goalReached?"Ziel erreicht! "+sim.p.targetDistance+" m in "+sim.time.toFixed(1)+" Sekunden.":"Versuch beendet – Ziel nicht erreicht. Training starten oder fortsetzen."):"Simulation beendet. Mit Reset erneut starten.";$("overlay").classList.remove("hidden");}
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
    note("Trainingsrunde abgeschlossen ("+tr.generation+" Generationen). Bester Regler übernommen; weitere Generationen jederzeit möglich.");
    $("overlay").textContent="Training abgeschlossen. Starte den optimierten Läufer.";$("overlay").classList.remove("hidden");
   }
  }
 }
 if(mode==="arena"&&preset==="duel"&&sim.duelTraining.running){
  const tr=sim.duelTraining;
  trainDuelGeneration(tr,sim.p,seed);
  params.genomeA={...tr.genomes[0]};params.genomeB={...tr.genomes[1]};
  safeSet(duelKey(),{...tr,running:false});
  sceneDirty=true;
  if(!tr.running){
   resetSim();
   note("Evolution abgeschlossen: "+tr.generation+" Generationen. Beide Entitäten haben ihre verbesserten Strategien übernommen.");
   $("overlay").textContent="Training abgeschlossen. Starte das Duell der verbesserten Entitäten!";
   $("overlay").classList.remove("hidden");
  }
 }
 // When idle, reuse the last canvas frame and throttle expensive chart repainting.
 // This reduces GPU/CPU load in mobile WebKit without affecting fixed-step simulation time.
 if(activeAtStart||sceneDirty||now-lastSceneRender>=1000){drawScene(sceneCtx,sim);lastSceneRender=now;sceneDirty=false;}
 if(now-renderTick>(activeAtStart?90:600)){refresh();renderTick=now;}
 requestAnimationFrame(frame);
}
function scenarios(){const items=safeGet(KEY,[]);return Array.isArray(items)?items.filter(x=>x&&typeof x.name==="string").slice(0,100):[];}
function showSaved(){const p=$("saved");p.replaceChildren();let o=document.createElement("option");o.value="";o.textContent="– Bitte auswählen –";p.append(o);scenarios().forEach((item,i)=>{let o=document.createElement("option");o.value=String(i);o.textContent=item.name+" · "+(CONFIG[item.mode]?.title||"?");p.append(o);});}
function scenario(){return{format:"DMP_SIM_SCENARIO",version:VERSION,name:$("scenarioName").value.trim()||CONFIG[mode].title+" "+new Date().toLocaleDateString("de-DE"),mode,preset,params:{...params},seed,createdAt:new Date().toISOString()};}
function validScenario(o){
 if(!o||o.format!=="DMP_SIM_SCENARIO"||!CONFIG[o.mode]||!CONFIG[o.mode].presets.some(x=>x[0]===o.preset)||!o.params||typeof o.params!=="object")return false;
 if(!Number.isSafeInteger(o.seed)||o.seed<1||o.seed>2147483647||typeof o.name!=="string"||o.name.length>60)return false;
 const fieldsValid=FIELDS[o.preset].every(f=>{const v=o.params[f[0]]??f[6];return Number.isFinite(v)&&v>=f[2]&&v<=f[3];});
 const namesValid=["nameA","nameB","entityName"].every(key=>o.params[key]===undefined||(typeof o.params[key]==="string"&&o.params[key].length<=24));
 const colorsValid=["color","colorA","colorB"].every(key=>o.params[key]===undefined||(typeof o.params[key]==="string"&&/^#[a-fA-F0-9]{6}$/.test(o.params[key])));
 const kindsValid=["kindA","kindB"].every(key=>o.params[key]===undefined||o.params[key]==="biped"||o.params[key]==="quadruped");
 const idsValid=["entityId","entityA","entityB"].every(key=>o.params[key]===undefined||(typeof o.params[key]==="string"&&/^[a-zA-Z0-9_-]{1,80}$/.test(o.params[key])));
 const shapeValid=["torso","limb","head"].every(key=>o.params[key]===undefined||(typeof o.params[key]==="number"&&Number.isFinite(o.params[key])&&o.params[key]>=.5&&o.params[key]<=1.6));
 const genomeValid=["genomeA","genomeB"].every(key=>o.params[key]===undefined||duelValidGenome(o.params[key]));
 return fieldsValid&&namesValid&&colorsValid&&kindsValid&&idsValid&&shapeValid&&genomeValid;
}
function loadScenario(s){
 if(!validScenario(s)){note("Datei enthält kein gültiges Simulationsszenario.",true);return;}
 mode=s.mode;preset=s.preset;params=Object.fromEntries(FIELDS[preset].map(f=>[f[0],s.params[f[0]]??f[6]]));if(mode==="arena"){for(const key of ["nameA","nameB","colorA","colorB","kindA","kindB","entityA","entityB","genomeA","genomeB"]){if(s.params[key]!==undefined)params[key]=s.params[key];}}
 if(mode==="bio"){for(const key of ["entityId","entityName","color","torso","limb","head"]){if(s.params[key]!==undefined)params[key]=s.params[key];}}
 seed=s.seed;
 document.querySelectorAll(".module").forEach(b=>{const yes=b.dataset.mode===mode;b.classList.toggle("active",yes);b.setAttribute("aria-pressed",String(yes));});controls();resetSim();$("scenarioName").value=s.name;note("Experiment geladen. Mit Start wiederholen.");
}
$("modules").addEventListener("click",e=>{const btn=e.target.closest("[data-mode]");if(btn)switchMode(btn.dataset.mode);});
$("preset").addEventListener("change",e=>{
 const prev={...params};preset=e.target.value;params=initialParams(preset);
 if(mode==="arena"){
  for(const key of ["nameA","nameB","colorA","colorB","kindA","kindB","entityA","entityB","speedA","speedB","staminaA","staminaB","genomeA","genomeB"]){
   if(prev[key]!==undefined)params[key]=prev[key];
  }
 }
 controls();resetSim();
});
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
  const requestedPreset=entry.get("preset");
  if(requestedPreset&&CONFIG[requestedMode].presets.some(v=>v[0]===requestedPreset)){
   preset=requestedPreset;params=initialParams(preset);controls();resetSim();
  }
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
