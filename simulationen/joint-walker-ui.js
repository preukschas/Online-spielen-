import {GAIT_GOAL as GOAL, GAIT_DT as DT, GAIT_POPULATION, newGaitTrainer as newTrainer, trainGaitGeneration as trainGeneration, makeGaitWorld as makeEpisode, gaitStep as stepEpisode, gaitSnapshot as snapshot, restoreGaitTrainer as restoreTrainer, footPosition, groundHeight} from "./joint-walker-core.js?v=1";
const el=id=>document.getElementById(id);
const canvas=el("arena"),ctx=canvas.getContext("2d"),chart=el("chart"),graph=chart.getContext("2d");
const STORE="dmp_joint_walker_v1";
let trainer;
try{trainer=restoreTrainer(JSON.parse(localStorage.getItem(STORE)));}catch{trainer=newTrainer(42);}
el("seed").value=String(trainer.seed);
let courseSeed=trainer.seed+30001,race=null,playing=false,lastFrame=0,accumulator=0,training=false,stopRequested=false,drawTime=0;
function fmt(v,d=1){return Number.isFinite(v)?v.toFixed(d).replace(".",","):"–";}
function notice(s,error=false){el("notice").textContent=s;el("notice").classList.toggle("error",error);}
function store(){try{localStorage.setItem(STORE,JSON.stringify(snapshot(trainer)));}catch{notice("Lokaler Speicher nicht verfügbar. Bitte das Training als JSON exportieren.",true);}}
function compareStart(){
 const model=trainer.champion||trainer.baseline;
 race={reference:makeEpisode(courseSeed),champion:makeEpisode(courseSeed),weights:model};
 accumulator=0;playing=false;lastFrame=0;el("overlay").hidden=false;
 el("overlay").textContent=trainer.champion?"▶ Gelenk-Wettlauf starten":"🧠 Zuerst Gelenke trainieren";
 el("play").textContent="▶ Vergleich starten";
 el("courseLabel").textContent="Unbekannter Prüf-Boden · Startwert "+courseSeed;
 updateRace();drawArena();
}

function statusClass(s){return s.reached?"Ziel erreicht ✓":s.fallen?"Gestürzt":s.finished?"Zeit abgelaufen":"im Rennen";}
function updateRace(){
 if(!race)return;
 const a=race.reference,b=race.champion;
 const contact=s=>s.steps?fmt(s.contactTicks/s.steps*100,0)+" %":"0 %";
 el("raceStatus").textContent="Untrainiert: "+fmt(a.x,2)+" m · "+statusClass(a)+
 " · Bodenkontakte "+a.landings+" | Champion: "+fmt(b.x,2)+" m · "+statusClass(b)+
 " · Bodenkontakte "+b.landings+" · Bodenkontakt-Zeit "+contact(b)+".";
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
 for(const side of [1,0]){
  const points=footPosition(s,side),shade=side===0?color:"#688ba0";
  drawLine(px(points.hip),py(points.hip),px(points.knee),py(points.knee),shade,9);
  drawLine(px(points.knee),py(points.knee),px(points.foot),py(points.foot),shade,8);
  drawLine(px(points.foot)-8,py(points.foot),px(points.foot)+10,py(points.foot),s.contacts[side]?"#ffce7f":shade,6);
  for(const p of [points.hip,points.knee]){
   ctx.beginPath();ctx.arc(px(p),py(p),5.5,0,Math.PI*2);
   ctx.fillStyle="#071e31";ctx.fill();ctx.strokeStyle=shade;ctx.lineWidth=3;ctx.stroke();
  }
 }
 const hip={x:s.x,y:s.y},top={x:s.x+Math.sin(s.phi)*.49,y:s.y+Math.cos(s.phi)*.49};
 const head={x:top.x+Math.sin(s.phi)*.11,y:top.y+Math.cos(s.phi)*.11};
 drawLine(px(hip),py(hip),px(top),py(top),color,15);
 drawLine(px(top),py(top),px(head),py(head),color,5);
 ctx.beginPath();ctx.arc(px(head),py(head),12,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();
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
 drawLane(246,race.reference,"#7da8f6","REFERENZ · UNTRAINIERTER ZWEIBEINER");
 drawLane(511,race.champion,"#7beac1",trainer.champion?"CHAMPION · GENERATION "+trainer.generation:"UNTRAINIERT · NOCH KEIN CHAMPION");
 ctx.fillStyle="#90bcc6";ctx.textAlign="right";ctx.font="10px system-ui";
 ctx.fillText("2D GELENK-LEHRMODELL · KEINE VOLLE STARRKÖRPERPHYSIK",1054,555);
}

function drawChart(){
 const c=graph,w=chart.width,h=chart.height;c.clearRect(0,0,w,h);
 c.fillStyle="#0b2434";c.fillRect(0,0,w,h);
 const left=65,right=w-24,top=25,bottom=h-40,points=trainer.history;
 const values=points.flatMap(p=>[p.mean,p.training,p.validation]).filter(Number.isFinite);
 let min=values.length?Math.min(0,...values):0,max=values.length?Math.max(10,...values):10;
 if(max-min<1)max=min+1;const pad=(max-min)*.12;max+=pad;min-=pad;
 c.lineWidth=1;c.strokeStyle="#6c8ea13d";c.fillStyle="#a5c4ce";c.font="12px system-ui";
 for(let k=0;k<=4;k++){
  const y=top+(bottom-top)*k/4;c.beginPath();c.moveTo(left,y);c.lineTo(right,y);c.stroke();
  c.textAlign="right";c.fillText(fmt(max-(max-min)*k/4,0),left-12,y+4);
 }
 const count=points.length;
 for(let k=0;k<=5;k++){
  const x=left+(right-left)*k/5;
  c.beginPath();c.moveTo(x,top);c.lineTo(x,bottom);c.stroke();
 }
 c.fillStyle="#a3c3d0";c.textAlign="left";
 c.fillText(count?String(points[0].generation):"0",left,bottom+24);
 c.textAlign="right";c.fillText(count?String(points[count-1].generation):"Generation",right,bottom+24);
 if(count===0){
  c.textAlign="center";c.fillStyle="#a3bcc7";c.font="15px system-ui";
  c.fillText("Starte das Training: echte Messwerte erscheinen hier.",w/2,h/2);return;
 }
 const plot=(key,color)=>{
  c.strokeStyle=color;c.lineWidth=3;c.lineJoin="round";c.lineCap="round";c.beginPath();
  points.forEach((p,i)=>{
    const x=left+(i/(Math.max(1,count-1)))*(right-left);
    const y=bottom-(p[key]-min)/(max-min)*(bottom-top);
    if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
  });
  c.stroke();
  const v=points[count-1][key];const x=count===1?left:right,y=bottom-(v-min)/(max-min)*(bottom-top);
  c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fillStyle=color;c.fill();
 };
 plot("mean","#7c9ee9");plot("training","#7eebc0");plot("validation","#ffd28c");
}
function updateTraining(){
 const h=trainer.history,latest=h.at(-1);
 el("generation").textContent=String(trainer.generation);
 el("best").textContent=latest?fmt(latest.training,1):"–";
 el("validation").textContent=latest?fmt(latest.validation,1):"–";
 el("success").textContent=latest?fmt(latest.success*100,0)+" %":"–";
 const tbody=el("history");tbody.replaceChildren();
 if(!h.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=5;td.textContent="Noch keine Trainingsdaten";tr.append(td);tbody.append(tr);}
 for(const p of h.slice(-9).reverse()){
  const tr=document.createElement("tr");
  for(const s of [p.generation,fmt(p.mean),fmt(p.training),fmt(p.validation),fmt(100*p.success,0)+" %"]){
   const td=document.createElement("td");td.textContent=String(s);tr.append(td);
  }
  tbody.append(tr);
 }
 drawChart();
}

let worker=null;
function buttons(busy){
 for(const id of ["train5","train25","clear","seed","import","importFile"])el(id).disabled=busy;
 el("stop").disabled=!busy;
}
function progress(msg){
 trainer=restoreTrainer(msg.snapshot);
 store();updateTraining();
 el("trainingBar").style.width=Math.round(100*msg.done/msg.goal)+"%";
 el("trainingStatus").textContent="Generation "+trainer.generation+" · Runde "+msg.done+"/"+msg.goal+
 " · Mittel "+fmt(msg.result.mean)+" · Champion "+fmt(msg.result.training)+" · Test "+fmt(msg.result.validation)+
 " · Ankunft "+fmt(msg.result.success*100,0)+" %.";
}
function finishTraining(stopped){
 training=false;buttons(false);el("trainingBar").style.width="0%";
 compareStart();
 notice(stopped?"Nach Generation "+trainer.generation+" angehalten.":"Evolution abgeschlossen: Champion im Gelenk-Wettlauf vergleichen.");
}
async function fallback(rounds){
 let completed=0;
 try{
  while(completed<rounds&&!stopRequested){
   const result=trainGeneration(trainer);completed++;
   progress({snapshot:snapshot(trainer),result,done:completed,goal:rounds});
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  finishTraining(stopRequested);
 }catch(error){training=false;buttons(false);notice("Trainingsfehler: "+error.message,true);}
}
function train(rounds){
 if(training)return;
 training=true;stopRequested=false;playing=false;buttons(true);
 notice("Trainiere "+trainer.size+" Roboter pro Generation auf sechs Trainingsböden.");
 if(typeof Worker==="undefined"){fallback(rounds);return;}
 try{
  worker=new Worker(new URL("./joint-walker-worker.js?v=1",import.meta.url),{type:"module"});
  worker.onmessage=event=>{
   const m=event.data||{};
   try{
    if(m.type==="progress")progress(m);
    else if(m.type==="done"){
     trainer=restoreTrainer(m.snapshot);store();updateTraining();
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
   notice("Der Trainings-Worker ist fehlgeschlagen. Die bisherige Generation ist gespeichert.",true);
  };
  worker.postMessage({type:"start",rounds,snapshot:snapshot(trainer)});
 }catch(error){
  worker?.terminate();worker=null;notice("Training im Browser ohne Worker.",true);fallback(rounds);
 }
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
    if(!race.reference.finished)stepEpisode(race.reference,trainer.baseline);
    if(!race.champion.finished)stepEpisode(race.champion,race.weights);
    accumulator-=DT;
   }
   if(steps>=42)accumulator=0;
  }
  lastFrame=now;
  if(race.reference.finished&&race.champion.finished){
   playing=false;el("overlay").hidden=false;el("overlay").textContent="Vergleich abgeschlossen · ↺ Wiederholen";
   el("play").textContent="▶ Erneut starten";
  }
  if(now-drawTime>70){updateRace();drawArena();drawTime=now;}
 }
 requestAnimationFrame(tick);
}
el("train5").addEventListener("click",()=>train(5));el("train25").addEventListener("click",()=>train(25));
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
 trainer=newTrainer(seed);courseSeed=seed+30001;store();updateTraining();compareStart();
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
  trainer=loaded;el("seed").value=String(trainer.seed);courseSeed=trainer.seed+30001;
  store();updateTraining();compareStart();notice("Training importiert: Generation "+trainer.generation+".");
 }catch(err){notice("Import abgelehnt: "+err.message,true);}
});
window.addEventListener("resize",drawArena);
updateTraining();compareStart();
el("trainingStatus").textContent=trainer.generation?"Gespeicherter Stand geladen: "+trainer.generation+" Generationen · 24 Gelenk-Steuerungen.":"Bereit. 24 Gelenk-Steuerungen · 6 Trainingsböden · 5 separate Testböden.";
requestAnimationFrame(tick);
