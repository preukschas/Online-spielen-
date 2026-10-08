import {ARENA_VERSION,GOAL,DT,MAX_TIME,newTrainer,trainGeneration,makeEpisode,stepEpisode,snapshot,restoreTrainer,obstacleAt,raceResult} from "./learn-arena-core.js?v=3";
const el=id=>document.getElementById(id);
const canvas=el("arena"),ctx=canvas.getContext("2d"),chart=el("chart"),graph=chart.getContext("2d");
const STORE="dmp_neuroarena_training_v3";
let trainer;
try{trainer=restoreTrainer(JSON.parse(localStorage.getItem(STORE)));}catch{trainer=newTrainer(42);}
el("seed").value=String(trainer.seed);
let courseSeed=trainer.seed+30001,race=null,playing=false,lastFrame=0,accumulator=0,training=false,stopRequested=false,drawTime=0;
function fmt(v,d=1){return Number.isFinite(v)?v.toFixed(d).replace(".",","):"–";}
function notice(s,error=false){el("notice").textContent=s;el("notice").classList.toggle("error",error);}
function store(){try{localStorage.setItem(STORE,JSON.stringify(snapshot(trainer)));}catch{notice("Lokaler Speicher nicht verfügbar. Bitte das Training als JSON exportieren.",true);}}
function compareStart(){
 race={blue:makeEpisode(courseSeed),green:makeEpisode(courseSeed),
  weightsBlue:(trainer.teams.blue.champion||trainer.teams.blue.population[0]).slice(),
  weightsGreen:(trainer.teams.green.champion||trainer.teams.green.population[0]).slice()};
 accumulator=0;playing=false;lastFrame=0;el("overlay").hidden=false;
 el("overlay").textContent=trainer.generation?"▶ Blau gegen Grün · "+trainer.generation+" Generationen":"▶ Zwei untrainierte Roboter starten";
 el("play").textContent="▶ Rennen starten";
 el("courseLabel").textContent="Gleicher, unbekannter Testparcours · Seed "+courseSeed;
 updateRace();drawArena();
}
function statusClass(s){return s.reached?"Ziel erreicht ✓":s.failed?"In Abgrund gefallen":s.finished?"Zeit abgelaufen":"im Rennen";}
function updateRace(){
 if(!race)return;
 const a=race.blue,b=race.green,who=raceResult(a,b);
 const outcome=a.finished&&b.finished?(who>0?"BLAU GEWINNT":who<0?"GRÜN GEWINNT":"UNENTSCHIEDEN"):
  who>0?"Blau führt":who<0?"Grün führt":"Gleichstand";
 el("raceStatus").textContent="🔵 Blau: "+fmt(a.x,1)+"/"+GOAL+" m ("+statusClass(a)+") · 🟢 Grün: "+
  fmt(b.x,1)+"/"+GOAL+" m ("+statusClass(b)+") · "+outcome+" · Sprünge: "+a.jumps+"/"+b.jumps+
  " · Ducken: "+a.duckSteps+"/"+b.duckSteps+" Schritte.";
}
function rounded(x,y,w,h,r,color){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=color;ctx.fill();
}
function paintRobot(s,ground,scale,color,shadow){
 const x=56+s.x*scale,y=ground-s.y*64;
 ctx.save();ctx.translate(x,y);ctx.shadowColor=shadow;ctx.shadowBlur=18;
 rounded(-17,s.crouched?-13:-28,34,s.crouched?12:25,6,color);ctx.shadowBlur=0;
 rounded(-12,s.crouched?-10:-21,24,7,3,"#092432");ctx.fillStyle="#e1ffff";ctx.beginPath();ctx.arc(6,s.crouched?-7:-17,3,0,Math.PI*2);ctx.fill();
 const spin=s.x*5;
 for(const px of [-12,12]){
  ctx.fillStyle="#0a1c2a";ctx.beginPath();ctx.arc(px,0,8,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#8cbdcf";ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,0,8,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle="#cee8ea";ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px+Math.cos(spin)*5,Math.sin(spin)*5);ctx.stroke();
 }
 if(!s.grounded){ctx.fillStyle="#fbc578";ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(0,15);ctx.lineTo(9,0);ctx.fill();}
 ctx.restore();
}
function drawLane(ground,s,accent,label,dim=false){
 const left=56,right=1046,scale=(right-left)/(GOAL+2);
 rounded(24,ground-183,1032,201,12,dim?"#0d2638":"#102c40");
 ctx.strokeStyle="#ffffff12";ctx.lineWidth=1;
 for(let i=0;i<=GOAL+2;i+=2){const x=left+i*scale;ctx.beginPath();ctx.moveTo(x,ground-181);ctx.lineTo(x,ground+17);ctx.stroke();}
 for(let y=0;y<=3;y++){ctx.beginPath();ctx.moveTo(24,ground-y*50);ctx.lineTo(1056,ground-y*50);ctx.stroke();}
 ctx.fillStyle="#204f55";ctx.fillRect(24,ground+8,1032,10);
 ctx.fillStyle="#72bdac";ctx.fillRect(24,ground+7,1032,2);
 for(const raw of s.course){
  const o=obstacleAt(raw,s.t),x=left+o.x*scale,w=o.w*scale,h=(o.h||0)*64;
  if(o.type==="pit"){
   ctx.fillStyle="#071421";ctx.fillRect(x,ground,w,18);
   ctx.fillStyle="#e26f6d";ctx.fillRect(x,ground+1,4,17);ctx.fillRect(x+w-4,ground+1,4,17);
   ctx.strokeStyle="#ffc57a";ctx.lineWidth=2;ctx.setLineDash([4,3]);
   ctx.beginPath();ctx.moveTo(x,ground-5);ctx.lineTo(x+w,ground-5);ctx.stroke();ctx.setLineDash([]);
  }else if(o.type==="ceiling"||o.type==="crusher"){
   const lower=ground-o.bottom*64,upper=ground-o.top*64;
   ctx.fillStyle=o.type==="crusher"?"#de6568":"#8587ae";
   rounded(x,upper,w,lower-upper,4,ctx.fillStyle);
   ctx.fillStyle=o.type==="crusher"?"#ffbbb0":"#dbdbff";
   ctx.fillRect(x,lower-5,w,5);
   ctx.strokeStyle="#ffffff7c";ctx.lineWidth=1;
   for(let z=x+5;z<x+w;z+=12){ctx.beginPath();ctx.moveTo(z,lower-9);ctx.lineTo(Math.min(z+7,x+w),lower-3);ctx.stroke();}
   if(o.type==="crusher"){ctx.fillStyle="#ff6d68";ctx.font="bold 11px system-ui";ctx.fillText("↕",x+w/2-5,upper+14);}
  }else{
   const grad=ctx.createLinearGradient(x,ground-h,x+w,ground);
   if(o.type==="sweeper"){grad.addColorStop(0,"#f48399");grad.addColorStop(1,"#bc4460");}
   else{grad.addColorStop(0,"#f7d397");grad.addColorStop(1,"#c8804d");}
   rounded(x,ground-h,w,h,3,grad);
   ctx.fillStyle="#412a29";for(let v=6;v<h-5;v+=14)ctx.fillRect(x+3,ground-v,Math.max(1,w-6),3);
   ctx.fillStyle="#ffe2a2";ctx.fillRect(x,ground-h,w,4);
   if(o.type==="sweeper"){ctx.fillStyle="#ffeaea";ctx.font="bold 13px system-ui";ctx.fillText("↔",x+w/2-7,ground-h-5);}
  }
 }
 const goal=left+GOAL*scale;
 ctx.setLineDash([9,7]);ctx.strokeStyle="#eeffff";ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(goal,ground-170);ctx.lineTo(goal,ground+6);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle=accent;ctx.font="800 18px system-ui";ctx.textAlign="left";ctx.fillText(label,43,ground-145);
 ctx.fillStyle="#bbd6df";ctx.font="12px system-ui";ctx.textAlign="right";
 ctx.fillText(fmt(s.x,1)+" m / "+GOAL+" m · "+statusClass(s),1030,ground-146);
 paintRobot(s,ground,scale,accent,accent);
 const p=Math.min(1,s.x/GOAL);
 rounded(40,ground+25,1000,4,2,"#33515f");
 rounded(40,ground+25,Math.max(0,1000*p),4,2,accent);
}
function drawArena(){
 const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
 const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,"#071b2b");gradient.addColorStop(1,"#102b3a");
 ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
 if(!race)return;
 drawLane(250,race.blue,"#7da8f6","TEAM BLAU · EVOLUTION "+trainer.generation,true);
 drawLane(512,race.green,"#7beac1","TEAM GRÜN · EVOLUTION "+trainer.generation);
 ctx.fillStyle="#90bcc6";ctx.textAlign="right";ctx.font="10px system-ui";
 ctx.fillText("STRECKE + BEWEGUNGEN SIND SIMULIERT · KEINE REALPHYSIK",1054,554);
}
function drawChart(){
 const c=graph,w=chart.width,h=chart.height;c.clearRect(0,0,w,h);
 c.fillStyle="#0b2434";c.fillRect(0,0,w,h);
 const left=65,right=w-24,top=25,bottom=h-40,points=trainer.history;
 const values=points.flatMap(p=>[p.blue.training,p.green.training,p.blue.validation,p.green.validation]).filter(Number.isFinite);
 let min=values.length?Math.min(0,...values):0,max=values.length?Math.max(10,...values):10;
 if(max-min<1)max=min+1;const pad=(max-min)*.12;max+=pad;min-=pad;
 c.lineWidth=1;c.strokeStyle="#6c8ea13d";c.fillStyle="#a5c4ce";c.font="12px system-ui";
 for(let k=0;k<=4;k++){
  const y=top+(bottom-top)*k/4;c.beginPath();c.moveTo(left,y);c.lineTo(right,y);c.stroke();
  c.textAlign="right";c.fillText(fmt(max-(max-min)*k/4,0),left-12,y+4);
 }
 for(let k=0;k<=5;k++){const x=left+(right-left)*k/5;c.beginPath();c.moveTo(x,top);c.lineTo(x,bottom);c.stroke();}
 c.fillStyle="#a3c3d0";c.textAlign="left";
 c.fillText(points.length?String(points[0].generation):"0",left,bottom+24);
 c.textAlign="right";c.fillText(points.length?String(points.at(-1).generation):"Generation",right,bottom+24);
 if(!points.length){c.textAlign="center";c.fillStyle="#a3bcc7";c.font="15px system-ui";
  c.fillText("Trainiere beide Teams: zwei echte Lernkurven erscheinen hier.",w/2,h/2);return;}
 const plot=(team,key,color,dashed=false)=>{
  c.strokeStyle=color;c.lineWidth=dashed?1.5:3;c.setLineDash(dashed?[6,5]:[]);
  c.lineJoin="round";c.lineCap="round";c.beginPath();
  points.forEach((p,i)=>{const x=left+i/Math.max(1,points.length-1)*(right-left);
   const y=bottom-(p[team][key]-min)/(max-min)*(bottom-top);
   if(i===0)c.moveTo(x,y);else c.lineTo(x,y);});
  c.stroke();c.setLineDash([]);
 };
 plot("blue","training","#7da8f6");plot("green","training","#7beac1");
 plot("blue","validation","#7da8f6",true);plot("green","validation","#7beac1",true);
}
function updateTraining(){
 const h=trainer.history,latest=h.at(-1);
 el("generation").textContent=String(trainer.generation);
 el("best").textContent=latest?"🔵 "+fmt(latest.blue.training,1)+" · 🟢 "+fmt(latest.green.training,1):"–";
 el("validation").textContent=latest?"🔵 "+fmt(latest.blue.validation,1)+" · 🟢 "+fmt(latest.green.validation,1):"–";
 el("success").textContent=latest?"🔵 "+fmt(latest.blue.success*100,0)+" % · 🟢 "+fmt(latest.green.success*100,0)+" %":"–";
 const tbody=el("history");tbody.replaceChildren();
 if(!h.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=6;td.textContent="Noch keine Trainingsdaten";tr.append(td);tbody.append(tr);}
 for(const p of h.slice(-9).reverse()){
  const tr=document.createElement("tr");
  const winner=p.headToHead>0?"Blau":p.headToHead<0?"Grün":"Remis";
  for(const v of [p.generation,fmt(p.blue.training),fmt(p.green.training),fmt(p.blue.validation),fmt(p.green.validation),winner]){
   const td=document.createElement("td");td.textContent=String(v);tr.append(td);
  }
  tbody.append(tr);
 }
 drawChart();
}
async function train(rounds){
 if(training)return;
 training=true;stopRequested=false;playing=false;el("play").textContent="▶ Vergleich fortsetzen";
 for(const id of ["train5","train25","clear","seed","import","importFile"])el(id).disabled=true;
 el("stop").disabled=false;
 notice("Trainingslauf gestartet. Fortschritt wird nach jeder Generation gespeichert.");
 let finished=0;
 try{
  for(let i=0;i<rounds&&!stopRequested;i++){
   const result=trainGeneration(trainer);finished++;
   store();updateTraining();
   el("trainingBar").style.width=String(Math.round(100*finished/rounds))+"%";
   el("trainingStatus").textContent="Generation "+trainer.generation+" · Runde "+finished+"/"+rounds+
    " · 🔵 "+fmt(result.blue.training,1)+" / 🟢 "+fmt(result.green.training,1)+" · Test "+fmt(result.blue.validation,1)+" / "+fmt(result.green.validation,1);
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  compareStart();
  notice(stopRequested?"Training nach Generation "+trainer.generation+" angehalten.":"Beide Teams trainiert. Jetzt gegeneinander auf einem neuen Hindernisparcours testen.");
 }catch(e){notice("Trainingsfehler: "+e.message,true);}
 finally{
  training=false;stopRequested=false;
  for(const id of ["train5","train25","clear","seed","import","importFile"])el(id).disabled=false;
  el("stop").disabled=true;
  el("trainingBar").style.width="0%";
 }
}
function togglePlay(){
 if(!race)compareStart();
 if(race.blue.finished&&race.green.finished)compareStart();
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
    if(!race.blue.finished)stepEpisode(race.blue,race.weightsBlue);
    if(!race.green.finished)stepEpisode(race.green,race.weightsGreen);
    accumulator-=DT;
   }
   if(steps>=42)accumulator=0;
  }
  lastFrame=now;
  if(race.blue.finished&&race.green.finished){
   playing=false;el("overlay").hidden=false;el("overlay").textContent=(raceResult(race.blue,race.green)>0?"🔵 Blau gewinnt":raceResult(race.blue,race.green)<0?"🟢 Grün gewinnt":"Unentschieden")+" · ↺ Wiederholen";
   el("play").textContent="▶ Erneut starten";
  }
  if(now-drawTime>70){updateRace();drawArena();drawTime=now;}
 }
 requestAnimationFrame(tick);
}
el("train5").addEventListener("click",()=>train(5));el("train25").addEventListener("click",()=>train(25));
el("stop").addEventListener("click",()=>{stopRequested=true;el("trainingStatus").textContent="Stopp angefordert – aktuelle Generation abschließen.";});
el("play").addEventListener("click",togglePlay);
el("restart").addEventListener("click",()=>{compareStart();notice("Derselbe Kurs und dieselben Steuerungen wurden zurückgesetzt.");});
el("newCourse").addEventListener("click",()=>{
 courseSeed+=97;if(courseSeed>1e9)courseSeed=trainer.seed+30001;
 compareStart();notice("Neuer, beim Training nicht verwendeter Kurs geladen (Seed "+courseSeed+").");
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
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="dmp-lernarena-seed-"+trainer.seed+"-gen-"+trainer.generation+".json";
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 notice("Trainingsdaten als JSON exportiert.");
});
el("import").addEventListener("click",()=>el("importFile").click());
el("importFile").addEventListener("change",async(e)=>{
 const file=e.target.files?.[0];e.target.value="";
 if(!file)return;
 if(file.size>6000000){notice("Datei zu groß (maximal 6 MB).",true);return;}
 try{
  const loaded=restoreTrainer(JSON.parse(await file.text()));
  trainer=loaded;el("seed").value=String(trainer.seed);courseSeed=trainer.seed+30001;
  store();updateTraining();compareStart();notice("Training importiert: Generation "+trainer.generation+".");
 }catch(err){notice("Import abgelehnt: "+err.message,true);}
});
window.addEventListener("resize",drawArena);
updateTraining();compareStart();
el("trainingStatus").textContent=trainer.generation?"Zwei Teams geladen: je "+trainer.size+" Steuerungen, "+trainer.generation+" Generationen.":"Bereit. Zwei Teams mit je "+trainer.size+" Steuerungen · Wettbewerbs-Evolution.";
requestAnimationFrame(tick);
