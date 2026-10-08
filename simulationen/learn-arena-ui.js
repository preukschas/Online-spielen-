import {ARENA_VERSION,GOAL,DT,MAX_TIME,newTrainer,trainGeneration,makeEpisode,stepEpisode,snapshot,restoreTrainer,runEpisode,validGenome} from "./learn-arena-core.js?v=1";
const el=id=>document.getElementById(id);
const canvas=el("arena"),ctx=canvas.getContext("2d"),chart=el("chart"),graph=chart.getContext("2d");
const STORE="dmp_neuroarena_training_v1";
let trainer;
try{trainer=restoreTrainer(JSON.parse(localStorage.getItem(STORE)));}catch{trainer=newTrainer(42);}
el("seed").value=String(trainer.seed);
let courseSeed=trainer.seed+15001,race=null,playing=false,lastFrame=0,accumulator=0,training=false,stopRequested=false,drawTime=0;
function fmt(v,d=1){return Number.isFinite(v)?v.toFixed(d).replace(".",","):"–";}
function notice(s,error=false){el("notice").textContent=s;el("notice").classList.toggle("error",error);}
function store(){try{localStorage.setItem(STORE,JSON.stringify(snapshot(trainer)));}catch{notice("Lokaler Speicher nicht verfügbar. Bitte das Training als JSON exportieren.",true);}}
function compareStart(){
 const model=trainer.champion||trainer.baseline;
 race={reference:makeEpisode(courseSeed),champion:makeEpisode(courseSeed),weights:model};
 accumulator=0;playing=false;lastFrame=0;el("overlay").hidden=false;
 el("overlay").textContent=trainer.champion?"▶ Gelerntes Modell gegen Referenz":"▶ Vergleich starten – trainiere zuerst";
 el("play").textContent="▶ Vergleich starten";
 el("courseLabel").textContent="Unbekannter Testparcours · Seed "+courseSeed;
 updateRace();drawArena();
}
function statusClass(s){return s.reached?"Ziel erreicht":s.finished?"Zeit abgelaufen":"im Rennen";}
function updateRace(){
 if(!race)return;
 const a=race.reference,b=race.champion;
 el("raceStatus").textContent="Referenz: "+fmt(a.x,1)+" / "+GOAL+" m ("+statusClass(a)+") · Trainiertes Modell: "+fmt(b.x,1)+" / "+GOAL+" m ("+statusClass(b)+"). Sprünge: "+a.jumps+" / "+b.jumps+".";
}
function rounded(x,y,w,h,r,color){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=color;ctx.fill();
}
function paintRobot(s,ground,scale,color,shadow){
 const x=56+s.x*scale,y=ground-s.y*64;
 ctx.save();ctx.translate(x,y);ctx.shadowColor=shadow;ctx.shadowBlur=18;
 rounded(-17,-28,34,25,8,color);ctx.shadowBlur=0;
 rounded(-12,-21,24,9,4,"#092432");ctx.fillStyle="#e1ffff";ctx.beginPath();ctx.arc(6,-17,3.5,0,Math.PI*2);ctx.fill();
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
 const left=56,right=1046,scale=(right-left)/34;
 ctx.fillStyle=dim?"#0d2638":"#102c40";rounded(24,ground-183,1032,201,12,ctx.fillStyle);
 ctx.strokeStyle="#ffffff12";ctx.lineWidth=1;
 for(let i=0;i<=34;i+=2){const x=left+i*scale;ctx.beginPath();ctx.moveTo(x,ground-181);ctx.lineTo(x,ground+17);ctx.stroke();}
 for(let y=0;y<=3;y++){ctx.beginPath();ctx.moveTo(24,ground-y*50);ctx.lineTo(1056,ground-y*50);ctx.stroke();}
 ctx.fillStyle="#204f55";ctx.fillRect(24,ground+8,1032,10);ctx.fillStyle="#72bdac";ctx.fillRect(24,ground+7,1032,2);
 for(const o of s.course){
  const x=left+o.x*scale,w=o.w*scale,h=o.h*64;
  const grad=ctx.createLinearGradient(x,ground-h,x+w,ground);
  grad.addColorStop(0,"#f7d397");grad.addColorStop(1,"#c8804d");
  rounded(x,ground-h,w,h,3,grad);
  ctx.fillStyle="#412a29";for(let v=6;v<h-5;v+=14){ctx.fillRect(x+3,ground-v,w-6,3);}
  ctx.fillStyle="#ffe2a2";ctx.fillRect(x,ground-h,w,4);
 }
 const goal=left+GOAL*scale;
 ctx.setLineDash([9,7]);ctx.strokeStyle="#eeffff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(goal,ground-170);ctx.lineTo(goal,ground+6);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle=accent;ctx.font="800 18px system-ui";ctx.textAlign="left";ctx.fillText(label,43,ground-145);
 ctx.fillStyle="#bbd6df";ctx.font="12px system-ui";ctx.textAlign="right";ctx.fillText(fmt(s.x,1)+" m / "+GOAL+" m",1030,ground-146);
 paintRobot(s,ground,scale,accent,accent);
 const p=Math.min(1,s.x/GOAL);rounded(40,ground+25,1000,4,2,"#33515f");rounded(40,ground+25,Math.max(0,1000*p),4,2,accent);
}
function drawArena(){
 const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
 const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,"#071b2b");gradient.addColorStop(1,"#102b3a");ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
 if(!race)return;
 drawLane(250,race.reference,"#7da8f6","REFERENZ · OHNE LERNSTRATEGIE",true);
 drawLane(512,race.champion,"#7beac1",trainer.champion?"CHAMPION · GEN. "+trainer.generation:"UNTRAINIERT · NOCH KEIN CHAMPION");
 ctx.fillStyle="#90bcc6";ctx.textAlign="right";ctx.font="10px system-ui";ctx.fillText("LÄNGENMASSTAB: MODELLMETER · KEINE REALPHYSIK",1054,554);
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
    " · Ø "+fmt(result.mean,1)+" · bester Trainingswert "+fmt(result.training,1)+" · Test "+fmt(result.validation,1);
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  compareStart();
  notice(stopRequested?"Training nach Generation "+trainer.generation+" angehalten.":"Training abgeschlossen. Teste den Champion auf neuen Hindernissen.");
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
 trainer=newTrainer(seed);courseSeed=seed+15001;store();updateTraining();compareStart();
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
 if(file.size>1000000){notice("Datei zu groß (maximal 1 MB).",true);return;}
 try{
  const loaded=restoreTrainer(JSON.parse(await file.text()));
  trainer=loaded;el("seed").value=String(trainer.seed);courseSeed=trainer.seed+15001;
  store();updateTraining();compareStart();notice("Training importiert: Generation "+trainer.generation+".");
 }catch(err){notice("Import abgelehnt: "+err.message,true);}
});
window.addEventListener("resize",drawArena);
updateTraining();compareStart();
el("trainingStatus").textContent=trainer.generation?"Gespeicherter Stand geladen: "+trainer.generation+" Generationen · 28 Modelle.":"Bereit. 28 Modelle · zwei feste Trainingskurse · zwei separate Testkurse.";
requestAnimationFrame(tick);
