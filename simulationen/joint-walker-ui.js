import {GAIT_GOAL as GOAL, GAIT_DT as DT, GAIT_POPULATION, newGaitTrainer as newTrainer, trainGaitGeneration as trainGeneration, makeGaitWorld as makeEpisode, gaitStep as stepEpisode, gaitSnapshot as snapshot, restoreGaitTrainer as restoreTrainer, gaitRivalTrial, footPosition, groundHeight} from "./joint-walker-core.js?v=2";
import {ENTITY_KEY, ENTITY_LIMIT, safeEntityList,findEntity} from "./entity-model.js";
const el=id=>document.getElementById(id);
const canvas=el("arena"),ctx=canvas.getContext("2d"),chart=el("chart"),graph=chart.getContext("2d");
const STORE="dmp_joint_walker_v1",SELECTED="dmp_joint_walker_selected_v1",RIVAL_SUFFIX="__rival_v1";
const entities=()=>safeEntityList(localStorage);
const profileKey=e=>STORE+(e?"__"+e.id:"");
const sameEntity=(a,b)=>JSON.stringify(a||null)===JSON.stringify(b||null);
const opponentSeed=n=>1+((n+104729-1)%1000000000);
const rivalKey=e=>profileKey(e)+RIVAL_SUFFIX;
function newRival(entity,seed){return newTrainer(opponentSeed(seed),GAIT_POPULATION,entity);}
function loadRival(entity,main){
 try{const saved=restoreTrainer(JSON.parse(localStorage.getItem(rivalKey(entity))));
  if(sameEntity(saved.entity,entity))return saved;}catch{}
 return newRival(entity,main.seed);
}
let selectedEntity=null,trainer,rival,contestSummary="";
function refreshEntities(){
 const list=entities(),select=el("entitySelect"),chosen=selectedEntity?.id||"";
 select.replaceChildren(new Option("🤖 Standard-Zweibeiner (ohne Generator)",""));
 list.forEach(e=>select.append(new Option(e.name+" · "+(e.kind==="quadruped"?"4 Beine":"2 Beine"),e.id)));
 if(selectedEntity&&!list.some(e=>e.id===selectedEntity.id))select.append(new Option(selectedEntity.name+" · importiert",selectedEntity.id));
 select.value=chosen;
}
function selectProfile(entity,notify=true){
 selectedEntity=entity;
 let loaded=null;
 try{loaded=restoreTrainer(JSON.parse(localStorage.getItem(profileKey(entity))));}catch{}
 trainer=loaded&&sameEntity(loaded.entity,entity)?loaded:newTrainer(42,GAIT_POPULATION,entity);
 rival=loadRival(entity,trainer);
 try{localStorage.setItem(SELECTED,entity?.id||"");}catch{}
 el("seed").value=String(trainer.seed);
 courseSeed=trainer.seed+30001;
 refreshEntities();updateTraining();compareStart();
 el("trainingStatus").textContent=trainer.generation?
  "A: "+trainer.generation+" / B: "+rival.generation+" Generationen für "+(entity?.name||"Standard-Zweibeiner")+" geladen.":
  "Bereit: "+(entity?.name||"Standard-Zweibeiner")+" · "+(entity?.kind==="quadruped"?"4 Beine / 8 Gelenke":"2 Beine / 4 Gelenke")+".";
 if(notify)notice("Eigenständiges Trainingsprofil gewählt: "+(entity?.name||"Standard-Zweibeiner")+".");
}
const queryEntity=new URLSearchParams(location.search).get("entity");
selectedEntity=findEntity(localStorage,queryEntity||localStorage.getItem(SELECTED))||null;
try{trainer=restoreTrainer(JSON.parse(localStorage.getItem(profileKey(selectedEntity))));}
catch{trainer=newTrainer(42,GAIT_POPULATION,selectedEntity);}
if(!sameEntity(trainer.entity,selectedEntity))trainer=newTrainer(42,GAIT_POPULATION,selectedEntity);
rival=loadRival(selectedEntity,trainer);
refreshEntities();el("seed").value=String(trainer.seed);
let courseSeed=trainer.seed+30001,race=null,playing=false,lastFrame=0,accumulator=0,training=false,stopRequested=false,drawTime=0;
function fmt(v,d=1){return Number.isFinite(v)?v.toFixed(d).replace(".",","):"–";}
function notice(s,error=false){el("notice").textContent=s;el("notice").classList.toggle("error",error);}
function store(){try{
 localStorage.setItem(profileKey(selectedEntity),JSON.stringify(snapshot(trainer)));
 localStorage.setItem(rivalKey(selectedEntity),JSON.stringify(snapshot(rival)));
}catch{notice("Lokaler Speicher nicht verfügbar. Beide Trainingsstände als JSON sichern.",true);}}
function compareStart(){
 race={reference:makeEpisode(courseSeed,trainer.entity),champion:makeEpisode(courseSeed,trainer.entity),
  weightsA:trainer.champion||trainer.baseline,weightsB:rival.champion||rival.baseline};
 accumulator=0;playing=false;lastFrame=0;el("overlay").hidden=false;
 el("overlay").textContent="▶ Duell der beiden lernenden Modelle starten";
 el("play").textContent="▶ Vergleich starten";
 el("courseLabel").textContent="Gemeinsamer Prüf-Boden · Startwert "+courseSeed;
 updateRace();drawArena();
}
function statusClass(s){return s.reached?"Ziel erreicht ✓":s.fallen?"Gestürzt":s.finished?"Zeit abgelaufen":"im Rennen";}
function raceWinner(a,b){
 if(a.reached!==b.reached)return a.reached?"A":"B";
 if(a.reached&&b.reached)return Math.abs(a.t-b.t)<.022?"Unentschieden":a.t<b.t?"A":"B";
 if(Math.abs(a.x-b.x)<.015)return "Unentschieden";
 return a.x>b.x?"A":"B";
}
function updateRace(){
 if(!race)return;
 const a=race.reference,b=race.champion;
 const contact=s=>s.steps?fmt(s.contactTicks/s.steps*100,0)+" %":"0 %";
 const completed=a.finished&&b.finished;
 el("raceStatus").textContent="🔵 A: "+fmt(a.x,2)+" m · "+statusClass(a)+" · "+a.landings+" Bodenkontakte · "+contact(a)+
 " | 🟢 B: "+fmt(b.x,2)+" m · "+statusClass(b)+" · "+b.landings+" Bodenkontakte · "+contact(b)+
 (completed?" · Sieger auf diesem Boden: "+raceWinner(a,b):"");
}

const pixelX=x=>62+x*(1000/7.6);
const pixelY=(y,ground)=>ground-y*91;
function rounded(x,y,w,h,r,color){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=color;ctx.fill();
}
function drawLine(x,y,x2,y2,color,width=2){
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap="round";
 ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();
}
function paintRobot(s,ground,color){
 const px=p=>pixelX(p.x),py=p=>pixelY(p.y,ground);
 for(let side=s.legs.length-1;side>=0;side--){
  const points=footPosition(s,side),shade=side%2===0?color:"#688ba0";
  drawLine(px(points.hip),py(points.hip),px(points.knee),py(points.knee),shade,9);
  drawLine(px(points.knee),py(points.knee),px(points.foot),py(points.foot),shade,8);
  drawLine(px(points.foot)-8,py(points.foot),px(points.foot)+10,py(points.foot),s.contacts[side]?"#ffce7f":shade,6);
  for(const p of [points.hip,points.knee]){
   ctx.beginPath();ctx.arc(px(p),py(p),5.5,0,Math.PI*2);
   ctx.fillStyle="#071e31";ctx.fill();ctx.strokeStyle=shade;ctx.lineWidth=3;ctx.stroke();
  }
 }
 const e=s.entity,quad=e?.kind==="quadruped";
 const body= e?.torso||1,headScale=e?.head||1;
 let head;
 if(quad){
  const rear={x:s.x-.40*body,y:s.y+.25},front={x:s.x+.40*body,y:s.y+.25};
  drawLine(px(rear),py(rear),px(front),py(front),color,17*body);
  head={x:front.x+.12,y:front.y+.07};
  drawLine(px(front),py(front),px(head),py(head),color,9);
 }else{
  const hip={x:s.x,y:s.y},top={x:s.x+Math.sin(s.phi)*.49*body,y:s.y+Math.cos(s.phi)*.49*body};
  head={x:top.x+Math.sin(s.phi)*.11,y:top.y+Math.cos(s.phi)*.11};
  drawLine(px(hip),py(hip),px(top),py(top),color,15*body);
  drawLine(px(top),py(top),px(head),py(head),color,5);
 }
 ctx.beginPath();ctx.arc(px(head),py(head),12*headScale,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();
 ctx.beginPath();ctx.arc(px(head)+3,py(head)-2,3,0,2*Math.PI);ctx.fillStyle="#082134";ctx.fill();
}
function drawLane(ground,s,color,title){
 const top=ground-207;
 rounded(16,top,1048,224,12,"#122e40");
 for(let i=0;i<=7;i++){
  const x=pixelX(i);drawLine(x,top+8,x,ground+5,"#b3dce415",1);
  ctx.font="10px system-ui";ctx.fillStyle="#7597aa";ctx.textAlign="center";ctx.fillText(i+" m",x,ground+27);
 }
 for(const level of [.5,1,1.5])drawLine(20,pixelY(level,ground),1060,pixelY(level,ground),"#aacfe413",1);
 ctx.beginPath();ctx.moveTo(16,ground+18);
 for(let x=0;x<7.6;x+=.05)ctx.lineTo(pixelX(x),ground-groundHeight(x,s.seed)*91);
 ctx.lineTo(1064,ground+18);ctx.closePath();ctx.fillStyle="#234855";ctx.fill();
 ctx.beginPath();
 for(let x=0;x<=7.6;x+=.045){
  const px=pixelX(x),py=ground-groundHeight(x,s.seed)*91;
  if(x===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
 }
 ctx.strokeStyle="#7bd9c0";ctx.lineWidth=3;ctx.stroke();
 ctx.setLineDash([8,7]);drawLine(pixelX(GOAL),top+35,pixelX(GOAL),ground,"#f5f9f8",2);ctx.setLineDash([]);
 ctx.fillStyle=color;ctx.textAlign="left";ctx.font="800 15px system-ui";ctx.fillText(title,39,top+25);
 ctx.fillStyle="#b9d6dc";ctx.textAlign="right";ctx.font="12px system-ui";
 ctx.fillText(fmt(s.x,2)+" / "+GOAL+" m · "+statusClass(s),1030,top+25);
 paintRobot(s,ground,color);
 if(s.fallen){
  rounded(pixelX(Math.min(s.x,GOAL))-45,top+72,90,26,7,"#5b2837dd");
  ctx.fillStyle="#ffcecf";ctx.textAlign="center";ctx.font="bold 11px system-ui";
  ctx.fillText("GESTÜRZT",pixelX(Math.min(s.x,GOAL)),top+89);
 }
}
function drawArena(){
 const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
 const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,"#071b2b");gradient.addColorStop(1,"#102b3a");
 ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
 if(!race)return;
 drawLane(246,race.reference,"#7da8f6","ROBOTER A · "+(trainer.entity?.name||"STANDARD")+" · GEN. "+trainer.generation);
 drawLane(511,race.champion,"#7beac1","ROBOTER B · "+(trainer.entity?.name||"STANDARD")+" · GEN. "+rival.generation);
 ctx.fillStyle="#90bcc6";ctx.textAlign="right";ctx.font="10px system-ui";
 ctx.fillText("2D GELENK-LEHRMODELL · KEINE VOLLE STARRKÖRPERPHYSIK",1054,555);
}

function drawChart(){
 const c=graph,w=chart.width,h=chart.height;c.clearRect(0,0,w,h);
 c.fillStyle="#0b2434";c.fillRect(0,0,w,h);
 const left=65,right=w-24,top=25,bottom=h-40;
 const sets=[{rows:trainer.history,key:"training",color:"#7da8f6"},
  {rows:rival.history,key:"training",color:"#7beac1"},
  {rows:trainer.history,key:"validation",color:"#c4b8ff"},
  {rows:rival.history,key:"validation",color:"#ffd28c"}];
 const values=sets.flatMap(s=>s.rows.map(r=>r[s.key])).filter(Number.isFinite);
 const min=Math.min(0,...values),max=Math.max(10,...values)+Math.max(1,(Math.max(10,...values)-min)*.1);
 c.fillStyle="#a5c4ce";c.font="12px system-ui";
 for(let k=0;k<=4;k++){
  const y=top+(bottom-top)*k/4;c.beginPath();c.moveTo(left,y);c.lineTo(right,y);
  c.strokeStyle="#6c8ea13d";c.lineWidth=1;c.stroke();
  c.textAlign="right";c.fillText(fmt(max-(max-min)*k/4,0),left-9,y+4);
 }
 const maxGen=Math.max(1,trainer.generation,rival.generation);
 c.textAlign="left";c.fillText("0",left,bottom+24);
 c.textAlign="right";c.fillText(String(maxGen)+" Generationen",right,bottom+24);
 if(!trainer.history.length&&!rival.history.length){
  c.textAlign="center";c.font="15px system-ui";
  c.fillText("A und B beginnen unabhängig. Beide Lernkurven erscheinen hier.",w/2,h/2);return;
 }
 for(const series of sets){
  if(!series.rows.length)continue;
  c.beginPath();c.strokeStyle=series.color;c.lineWidth=2.7;c.lineJoin="round";
  for(let i=0;i<series.rows.length;i++){
   const row=series.rows[i],x=left+row.generation/maxGen*(right-left);
   const y=bottom-(row[series.key]-min)/(max-min)*(bottom-top);
   if(!i)c.moveTo(x,y);else c.lineTo(x,y);
  }
  c.stroke();
 }
}
function updateTraining(){
 const a=trainer.history.at(-1),b=rival.history.at(-1);
 el("generation").textContent=String(trainer.generation);
 el("generationB").textContent=String(rival.generation);
 el("best").textContent=a?fmt(a.training,1):"–";
 el("bestB").textContent=b?fmt(b.training,1):"–";
 el("validation").textContent=a?fmt(a.validation,1):"–";
 el("validationB").textContent=b?fmt(b.validation,1):"–";
 el("success").textContent=a?fmt(a.success*100,0)+" %":"–";
 el("successB").textContent=b?fmt(b.success*100,0)+" %":"–";
 el("contestInfo").textContent=contestSummary||"Beide Roboter nutzen eigene Populationen und ein separates Gedächtnis.";
 const tbody=el("history");tbody.replaceChildren();
 const gens=Math.max(trainer.generation,rival.generation);
 if(!gens){const tr=document.createElement("tr"),td=document.createElement("td");
 td.colSpan=5;td.textContent="A und B haben noch nicht trainiert.";tr.append(td);tbody.append(tr);}
 const count=Math.min(gens,10);
 for(let g=gens;g>gens-count;g--){
  const A=trainer.history.find(x=>x.generation===g),B=rival.history.find(x=>x.generation===g);
  const tr=document.createElement("tr");
  for(const value of [g,A?fmt(A.training):"–",B?fmt(B.training):"–",
   A?fmt(A.validation):"–",B?fmt(B.validation):"–"]){
   const td=document.createElement("td");td.textContent=String(value);tr.append(td);
  }
  tbody.append(tr);
 }
 drawChart();
}

let worker=null;
function buttons(busy){
 for(const id of ["train5","train25","train100","trainA","trainB","clear","seed","import","importFile",
  "exportB","importB","importFileB","exportPair","importPair","importFilePair","entitySelect","reloadEntities"])el(id).disabled=busy;
 el("stop").disabled=!busy;
}
function progressPair(m){
 [trainer,rival]=m.snapshots.map(restoreTrainer);
 store();updateTraining();
 const ra=m.resultA,rb=m.resultB;
 const result=m.contest;
 contestSummary="Gegeneinander auf Trainingsboden: "+
  (result.winner===0?"A gewinnt":result.winner===1?"B gewinnt":"Unentschieden")+
  " · "+fmt(result.distanceA,2)+" / "+fmt(result.distanceB,2)+" m.";
 el("trainingBar").style.width=Math.round(100*m.done/m.goal)+"%";
 el("trainingStatus").textContent=m.done+"/"+m.goal+" Runden · A Gen. "+trainer.generation+
  " (Test "+fmt(ra?.validation??trainer.history.at(-1)?.validation)+")"+
  " · B Gen. "+rival.generation+" (Test "+fmt(rb?.validation??rival.history.at(-1)?.validation)+")"+
  " · direkter Vergleich: "+(result.winner===0?"A":result.winner===1?"B":"Remis");
 el("contestInfo").textContent=contestSummary;
}
function finishTraining(stopped){
 training=false;buttons(false);el("trainingBar").style.width="0%";
 compareStart();
 notice(stopped?"Training beider Modelle angehalten – Zwischenstände gespeichert.":
 "Trainingsrunde abgeschlossen. Beide neuen Champions auf identischem Prüf-Boden vergleichen.");
}
async function fallback(rounds,side){
 try{
  for(let i=0;i<rounds&&!stopRequested;i++){
   const oppositeA=rival.champion||rival.baseline,oppositeB=trainer.champion||trainer.baseline;
   const competitionSeed=1+(trainer.seed+8101+i*109)%900000000;
   const resultA=side==="B"?null:trainGeneration(trainer,oppositeA,competitionSeed);
   const resultB=side==="A"?null:trainGeneration(rival,oppositeB,competitionSeed);
   const ra=makeEpisode(competitionSeed,trainer.entity),rb=makeEpisode(competitionSeed,trainer.entity);
   // Real contest is evaluated separately; never use unseen validation terrain for selection.
   const trial=await Promise.all([gaitRivalTrial(trainer.champion||trainer.baseline,rival.champion||rival.baseline,competitionSeed,trainer.entity)]);
   progressPair({snapshots:[snapshot(trainer),snapshot(rival)],resultA,resultB,
    contest:{winner:trial[0].winner,distanceA:trial[0].a.distance,distanceB:trial[0].b.distance},
    done:i+1,goal:rounds});
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  finishTraining(stopRequested);
 }catch(error){training=false;buttons(false);notice("Trainingsfehler: "+error.message,true);}
}
function train(rounds,side="both"){
 if(training)return;
 training=true;stopRequested=false;playing=false;buttons(true);
 notice("Beide Roboter haben eigenständige neuronale Gewichte. "+(side==="both"?"A und B lernen im selben Durchlauf.":"Nur "+side+" trainiert gegen den anderen Champion.") );
 if(typeof Worker==="undefined"){fallback(rounds,side);return;}
 try{
  worker=new Worker(new URL("./joint-walker-worker.js?v=3",import.meta.url),{type:"module"});
  worker.onmessage=event=>{
   const m=event.data||{};
   try{
    if(m.type==="progress-pair")progressPair(m);
    else if(m.type==="done-pair"){
     [trainer,rival]=m.snapshots.map(restoreTrainer);store();updateTraining();
     worker.terminate();worker=null;finishTraining(m.reason==="stopped");
    }else if(m.type==="error"){
     worker.terminate();worker=null;training=false;buttons(false);notice("Trainingsfehler: "+m.message,true);
    }
   }catch(error){
    worker?.terminate();worker=null;training=false;buttons(false);
    notice("Trainingsdatenfehler: "+error.message,true);
   }
  };
  worker.onerror=e=>{
   e.preventDefault();worker?.terminate();worker=null;training=false;buttons(false);
   notice("Trainings-Worker ist fehlgeschlagen. Letzte vollständige Generation gespeichert.",true);
  };
  worker.postMessage({type:"start-pair",rounds,side,snapshots:[snapshot(trainer),snapshot(rival)]});
 }catch(error){worker?.terminate();worker=null;notice("Training ohne Worker aktiviert.",true);fallback(rounds,side);}
}

function togglePlay(){
 if(!race)compareStart();
 if(race.reference.finished&&race.champion.finished)compareStart();
 playing=!playing;accumulator=0;lastFrame=0;
 el("play").textContent=playing?"❚❚ Pause":"▶ Vergleich fortsetzen";
 el("overlay").hidden=playing;
}
function tick(now){
 if(playing&&race){
  if(lastFrame){
   accumulator+=Math.min(.1,(now-lastFrame)/1000)*Number(el("speed").value);
   let steps=0;
   while(accumulator>=DT&&steps++<42){
    if(!race.reference.finished)stepEpisode(race.reference,race.weightsA);
    if(!race.champion.finished)stepEpisode(race.champion,race.weightsB);
    accumulator-=DT;
   }
   if(steps>=42)accumulator=0;
  }
  lastFrame=now;
  if(race.reference.finished&&race.champion.finished){
   playing=false;el("overlay").hidden=false;el("overlay").textContent="Wettlauf beendet: "+raceWinner(race.reference,race.champion)+" · ↺ Wiederholen";
   el("play").textContent="▶ Erneut starten";
  }
  if(now-drawTime>70){updateRace();drawArena();drawTime=now;}
 }
 requestAnimationFrame(tick);
}
el("entitySelect").addEventListener("change",event=>{
 const e=event.target.value?findEntity(localStorage,event.target.value)||selectedEntity:null;
 selectProfile(e);
});
el("reloadEntities").addEventListener("click",()=>{
 const current=selectedEntity?.id,updated=current?findEntity(localStorage,current):null;
 if(updated&&!sameEntity(updated,selectedEntity))selectProfile(updated,false);
 else{refreshEntities();notice("Entitäten aus dem Editor neu eingelesen.");}
});
el("train5").addEventListener("click",()=>train(5));el("train25").addEventListener("click",()=>train(25));
el("train100").addEventListener("click",()=>train(100));
el("trainA").addEventListener("click",()=>train(1,"A"));
el("trainB").addEventListener("click",()=>train(1,"B"));
el("stop").addEventListener("click",()=>{stopRequested=true;worker?.postMessage({type:"stop"});el("trainingStatus").textContent="Stopp angefordert – aktuelle Generation abschließen.";});
el("play").addEventListener("click",togglePlay);
el("restart").addEventListener("click",()=>{compareStart();notice("Derselbe Boden und dieselben Gelenksteuerungen wurden zurückgesetzt.");});
el("newCourse").addEventListener("click",()=>{
 courseSeed+=97;if(courseSeed>1e9)courseSeed=trainer.seed+30001;
 compareStart();notice("Neuer, im Training nicht verwendeter Prüf-Boden geladen (Seed "+courseSeed+").");
});
el("clear").addEventListener("click",()=>{
 if(!confirm("Alle gespeicherten Generationen und Modellgewichte dieses Trainings ersetzen? Exportiere bei Bedarf vorher eine Datei."))return;
 const seed=Number(el("seed").value);
 if(!Number.isInteger(seed)||seed<1||seed>1e9){notice("Bitte einen ganzzahligen Startwert zwischen 1 und 1.000.000.000 eingeben.",true);return;}
 trainer=newTrainer(seed,GAIT_POPULATION,selectedEntity);rival=newRival(selectedEntity,seed);
 contestSummary="";courseSeed=seed+30001;store();updateTraining();compareStart();
 el("trainingStatus").textContent="Neuer Trainingslauf bereit. Der bisherige Fortschritt wurde ersetzt.";
 notice("Neues Training mit Startwert "+seed+" angelegt.");
});
el("export").addEventListener("click",()=>{
 const data=JSON.stringify(snapshot(trainer),null,2),blob=new Blob([data],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="dmp-gelenklernarena-seed-"+trainer.seed+"-gen-"+trainer.generation+".json";
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 notice("Trainingsdaten als JSON exportiert.");
});
el("import").addEventListener("click",()=>el("importFile").click());
el("importFile").addEventListener("change",async(e)=>{
 const file=e.target.files?.[0];e.target.value="";
 if(!file)return;
 if(file.size>1000000){notice("Datei zu groß (maximal 1 MB).",true);return;}
 try{
  const loaded=restoreTrainer(JSON.parse(await file.text()));
  trainer=loaded;selectedEntity=trainer.entity;
  rival=loadRival(selectedEntity,trainer);
  if(selectedEntity&&!findEntity(localStorage,selectedEntity.id)){
   const entries=entities();
   if(entries.length<ENTITY_LIMIT)try{entries.push(selectedEntity);localStorage.setItem(ENTITY_KEY,JSON.stringify(entries));}catch{}
  }
  try{localStorage.setItem(SELECTED,selectedEntity?.id||"");}catch{}
  refreshEntities();el("seed").value=String(trainer.seed);courseSeed=trainer.seed+30001;
  store();updateTraining();compareStart();notice("Training importiert: "+(selectedEntity?.name||"Standard")+" · Generation "+trainer.generation+".");
 }catch(err){notice("Import abgelehnt: "+err.message,true);}
});
function downloadFile(payload,filename){
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
el("exportB").addEventListener("click",()=>{
 downloadFile(snapshot(rival),"dmp-gelenklernarena-B-seed-"+rival.seed+"-gen-"+rival.generation+".json");
 notice("Roboter B separat exportiert.");
});
el("importB").addEventListener("click",()=>el("importFileB").click());
el("importFileB").addEventListener("change",async e=>{
 const f=e.target.files?.[0];e.target.value="";if(!f)return;
 if(f.size>1e6){notice("Datei zu groß.",true);return;}
 try{
  const loaded=restoreTrainer(JSON.parse(await f.text()));
  if(!sameEntity(loaded.entity,selectedEntity))throw Error("Andere Körperdefinition: beide Modelle benötigen dieselbe Entität.");
  rival=loaded;store();updateTraining();compareStart();
  notice("Roboter B importiert: "+rival.generation+" Generationen.");
 }catch(err){notice("Import B abgelehnt: "+err.message,true);}
});
el("exportPair").addEventListener("click",()=>{
 downloadFile({format:"DMP_GAIT_RIVALS",version:1,profiles:[snapshot(trainer),snapshot(rival)]},
  "dmp-gelenklernarena-A-B-"+trainer.generation+"-"+rival.generation+".json");
 notice("Beide trainierten Modellstände exportiert.");
});
el("importPair").addEventListener("click",()=>el("importFilePair").click());
el("importFilePair").addEventListener("change",async e=>{
 const f=e.target.files?.[0];e.target.value="";if(!f)return;
 if(f.size>2500000){notice("Datei zu groß.",true);return;}
 try{
  const data=JSON.parse(await f.text());
  if(data?.format!=="DMP_GAIT_RIVALS"||data.version!==1||!Array.isArray(data.profiles)||
     data.profiles.length!==2)throw Error("Die Datei ist kein Trainingspaar.");
  const a=restoreTrainer(data.profiles[0]),b=restoreTrainer(data.profiles[1]);
  if(!sameEntity(a.entity,b.entity))throw Error("Die Körperdefinitionen stimmen nicht überein.");
  trainer=a;rival=b;selectedEntity=a.entity;el("seed").value=String(a.seed);
  refreshEntities();try{localStorage.setItem(SELECTED,selectedEntity?.id||"");}catch{}
  courseSeed=a.seed+30001;contestSummary="";store();updateTraining();compareStart();
  notice("Beide Modelle und ihre getrennten Lernkurven wurden importiert.");
 }catch(err){notice("Import der beiden Modelle fehlgeschlagen: "+err.message,true);}
});

window.addEventListener("resize",drawArena);
updateTraining();compareStart();
el("trainingStatus").textContent="A: "+trainer.generation+" · B: "+rival.generation+
 " Generationen · zwei separate Populationen à 24 Steuerungen.";
requestAnimationFrame(tick);
