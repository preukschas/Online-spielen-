import {GAIT_DT,footPosition,restoreGaitTrainer,validGaitGenome} from "./joint-walker-core.js?v=3";
import {tacticStyle,makeJointDuel,stepJointDuel,newJointDuelTrainer,jointDuelSnapshot,restoreJointDuel} from "./joint-duel-core.js";
const $=id=>document.getElementById(id),canvas=$("arena"),ctx=canvas.getContext("2d"),chart=$("chart"),graph=chart.getContext("2d");
const GAIT_KEY="dmp_joint_walker_v1",RIVAL_GAIT_KEY=GAIT_KEY+"__rival_v1",KEY="dmp_joint_duel_v1";
let model=null,match=null,playing=false,last=0,acc=0,worker=null,busy=false,seed=30043,pending=[null,null];
const fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d).replace(".",","):"–";
const msg=(s,error=false)=>{$("notice").textContent=s;$("notice").classList.toggle("error",error);};
const read=key=>{try{return JSON.parse(localStorage.getItem(key));}catch{return null;}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{msg("Browser-Speicher nicht verfügbar. Bitte als JSON exportieren.",true);return false;}};
const persist=()=>{if(model)save(KEY,jointDuelSnapshot(model));};
try{model=restoreJointDuel(read(KEY));}catch{}
if(!model){
 try{const g=restoreGaitTrainer(read(GAIT_KEY));if(g.champion&&validGaitGenome(g.champion)){let rival=null;try{rival=restoreGaitTrainer(read(RIVAL_GAIT_KEY));}catch{};model=newJointDuelTrainer(g.champion,rival?.champion&&validGaitGenome(rival.champion)?rival.champion:g.baseline,g.seed);persist();}}catch{}
}
if(model)seed=model.seed+30001;
const gated=["loadGait","prepareGait","importGaitA","importGaitB","add1","add10","add100","ten","fifty","resetTraining","importDuel"];
function gate(b){
 busy=b;for(const id of gated)$(id).disabled=b;
 $("stop").disabled=!b;
 for(const id of ["play","restart","newSeed"])$(id).disabled=b||!model;
}
function pair(a,b,s=42){
 model=newJointDuelTrainer(a,b,s);seed=s+30001;pending=[null,null];persist();refresh();restart();
}
function loadLocal(){
 try{
  const g=restoreGaitTrainer(read(GAIT_KEY));
  if(!validGaitGenome(g.champion))throw Error("kein trainierter Champion gespeichert");
  let rival=null;try{rival=restoreGaitTrainer(read(RIVAL_GAIT_KEY));}catch{}
  const brainB=rival?.champion&&validGaitGenome(rival.champion)?rival.champion:g.baseline;
  if(model&&!confirm("Bisherige Duell-Strategien durch die getrennten Laufmodelle A und B ersetzen?"))return;
  pair(g.champion,brainB,g.seed);
  msg(rival?.champion?"Beide getrennt trainierten Laufgehirne übernommen: A Gen. "+g.generation+" / B Gen. "+rival.generation+".":
    "A wurde trainiert; B nutzt zunächst ein untrainiertes Modell. Trainiere B in der Gelenk-Lernarena, um auch seine Gelenke zu verbessern.");
 }catch(e){msg("Laufmodell nicht vorhanden: "+e.message+". Du kannst direkt hier 15 Generationen trainieren.",true);}
}
$("loadGait").addEventListener("click",loadLocal);
function setGait(side,g){
 if(!validGaitGenome(g))throw Error("Es werden 256 gültige neuronale Gelenkgewichte benötigt.");
 if(model){
  if(!confirm("Neues Gelenkmodell für Roboter "+(side?"B":"A")+" verwenden? Strategie-Training wird zurückgesetzt."))return;
  pair(side?model.gaitA:g,side?g:model.gaitB,model.seed);
 }else{
  pending[side]=g.slice();
  if(pending[0]&&pending[1])pair(pending[0],pending[1]);
  else msg("Laufgehirn "+(side?"B":"A")+" geladen. Noch das andere Laufgehirn laden.");
 }
 refresh();
}
for(const [id,file,side] of [["importGaitA","fileGaitA",0],["importGaitB","fileGaitB",1]]){
 $(id).addEventListener("click",()=>$(file).click());
 $(file).addEventListener("change",async e=>{
  const f=e.target.files?.[0];e.target.value="";if(!f)return;
  if(f.size>1e6){msg("Datei zu groß.",true);return;}
  try{const g=restoreGaitTrainer(JSON.parse(await f.text()));if(!g.champion)throw Error("Noch kein trainierter Champion");setGait(side,g.champion);}
  catch(err){msg("Import abgelehnt: "+err.message,true);}
 });
}
function refresh(){
 $("generation").textContent=model?String(model.generation):"0";
 $("styleA").textContent=model?tacticStyle(model.tactics[0]):"–";
 $("styleB").textContent=model?tacticStyle(model.tactics[1]):"–";
 $("gaitA").textContent=model?"256 Gewichte aktiv":pending[0]?"Gehirn A geladen":"Laufmodell fehlt";
 $("gaitB").textContent=model?"256 Gewichte aktiv":pending[1]?"Gehirn B geladen":"Laufmodell fehlt";
 $("winRate").textContent=model?.validation?fmt(model.validation.winRate*100,0)+" %":"–";
 $("gaitStatus").textContent=model?"Beide Gelenknetze geladen; dieselben neuronalen Motorsteuerungen bewegen die Roboter auch im Duell. Nur die Taktikgene werden hier optimiert.":
 "Du kannst ein Laufmodell selbst erzeugen, bestehende Modelle laden oder A und B separat aus JSON importieren.";
 const tb=$("history");tb.replaceChildren();
 if(!model?.history.length){
  const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=5;td.textContent="Noch keine Generationen";tr.append(td);tb.append(tr);
 }
 for(const h of (model?.history||[]).slice(-10).reverse()){
  const tr=document.createElement("tr");
  for(const v of [h.generation,fmt(h.fitnessA),fmt(h.fitnessB),fmt(h.validation),fmt(h.winRate*100,0)+" %"]){
   const td=document.createElement("td");td.textContent=String(v);tr.append(td);
  }tb.append(tr);
 }
 chartDraw();if(!busy)gate(false);
}
function restart(){
 playing=false;last=0;acc=0;
 match=model?makeJointDuel(model.gaitA,model.gaitB,model.tactics[0],model.tactics[1],seed):null;
 $("overlay").hidden=false;$("overlay").textContent=match?"▶ Duell starten":"🦿 Zuerst zwei Laufgehirne laden";
 $("play").textContent="▶ Duell starten";
 $("arenaLabel").textContent=match?"Zwei lernende Roboter · Test-Seed "+seed:"Trainierte Laufgehirne fehlen";
 status();draw();
}
function result(g){return g.winner<0?"Unentschieden":"Roboter "+(g.winner===0?"A":"B")+" gewinnt";}
function status(){
 if(!match){$("duelStatus").textContent="Trainiere oder importiere zunächst ein zweibeiniges Gelenkmodell.";return;}
 const [a,b]=match.fighters;
 $("duelStatus").textContent="A: "+fmt(a.hp,0)+" Schildpunkte / "+a.hits+" Treffer / "+a.contacts+" Kontakt-Takte · B: "+
 fmt(b.hp,0)+" Schildpunkte / "+b.hits+" Treffer / "+b.contacts+" Kontakt-Takte · "+fmt(match.time,1)+" s"+
 (match.finished?" · "+result(match):"");
 const e=match.events.at(-1);
 $("fightEvents").textContent=e?e.name+" · "+e.action+(e.blocked?" · geblockt":""):
  "Aktionen: Schubsen · Treten · Schlagen · Blocken · Ausweichen";
}
const X=x=>55+x/7*972,Y=y=>456-y*104;
function line(x,y,xx,yy,color,w=3){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();}
function box(x,y,w,h,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,7);ctx.fill();}
function robot(f,color){
 const b=f.body,toWorld=p=>({x:f.x+f.face*(p.x-b.x),y:p.y});
 const px=p=>X(p.x),py=p=>Y(p.y);
 for(const n of [1,0]){
  const p=footPosition(b,n),h=toWorld(p.hip),k=toWorld(p.knee),foot=toWorld(p.foot),c=n===0?color:"#668da6";
  line(px(h),py(h),px(k),py(k),c,9);line(px(k),py(k),px(foot),py(foot),c,8);
  line(px(foot)-8,py(foot),px(foot)+10,py(foot),b.contacts[n]?"#ffe29b":c,6);
  for(const z of [h,k]){ctx.beginPath();ctx.arc(px(z),py(z),5,0,2*Math.PI);ctx.fillStyle="#0b2636";ctx.fill();ctx.strokeStyle=c;ctx.lineWidth=3;ctx.stroke();}
 }
 const h=toWorld({x:b.x,y:b.y}),t=toWorld({x:b.x+Math.sin(b.phi)*.52,y:b.y+Math.cos(b.phi)*.52}),head=toWorld({x:b.x+Math.sin(b.phi)*.65,y:b.y+Math.cos(b.phi)*.65});
 line(px(h),py(h),px(t),py(t),color,17);line(px(t),py(t),px(head),py(head),color,5);
 ctx.beginPath();ctx.arc(px(head),py(head),13,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();
 ctx.fillStyle="#0b2434";ctx.beginPath();ctx.arc(px(head)+f.face*4,py(head)-2,3,0,2*Math.PI);ctx.fill();
 const hand=toWorld({x:b.x+.35*Math.sin(b.phi),y:b.y+.34});
 line(px(hand),py(hand),px(hand)+f.face*(f.actionTime>.01?55:30),py(hand)-24,color,7);
 if(f.actionTime>0){
  ctx.font="bold 13px system-ui";const w=Math.max(88,ctx.measureText(f.action).width+24),bx=Math.min(1070-w,Math.max(8,X(f.x)-w/2)),by=Y(b.y+1.06);
  box(bx,by-16,w,28,"#153c4ee8");ctx.textAlign="center";ctx.fillStyle="#ebf9f5";ctx.fillText(f.action,bx+w/2,by+3);
 }
}
function draw(){
 ctx.clearRect(0,0,1080,570);
 const grad=ctx.createLinearGradient(0,0,0,570);grad.addColorStop(0,"#092233");grad.addColorStop(1,"#174357");
 ctx.fillStyle=grad;ctx.fillRect(0,0,1080,570);
 for(let m=0;m<=7;m++){line(X(m),88,X(m),470,"#d1e3e715",1);ctx.fillStyle="#8baebb";ctx.textAlign="center";ctx.font="11px system-ui";ctx.fillText(m+" m",X(m),490);}
 for(let y=130;y<440;y+=55)line(25,y,1055,y,"#d1e3e715",1);
 box(20,456,1040,12,"#28605f");line(X(.2),86,X(.2),455,"#ffe4b4",2);line(X(6.8),86,X(6.8),455,"#ffe4b4",2);
 for(const [x,col,index] of [[45,"#8eb5ff",0],[625,"#7cf0bf",1]]){
  box(x,26,407,20,"#35566a");box(x,26,407*(match?match.fighters[index].hp/100:0),20,col);
  ctx.fillStyle="#d4eeed";ctx.textAlign="left";ctx.font="bold 15px system-ui";ctx.fillText("ROBOTER "+(index?"B":"A"),x+8,68);
 }
 if(!match){ctx.textAlign="center";ctx.fillStyle="#b6d7d7";ctx.font="bold 25px system-ui";ctx.fillText("Gelenkmodelle fehlen – beginne mit Lauftraining",540,300);return;}
 robot(match.fighters[0],"#8eb5ff");robot(match.fighters[1],"#7cf0bf");
 ctx.textAlign="center";ctx.fillStyle="#a1c1cb";ctx.font="11px system-ui";
 ctx.fillText("NEURONALE HÜFT- UND KNIEMOTOREN · DIDAKTISCHE 2D-KONTAKTPHYSIK",540,550);
 if(match.finished){box(365,255,350,52,"#0e3145e9");ctx.fillStyle="#ffe7ab";ctx.font="bold 25px system-ui";ctx.fillText(result(match),540,289);}
}
function chartDraw(){
 const c=graph,w=chart.width,h=chart.height,rows=model?.history||[],L=63,R=w-22,T=25,B=h-42;
 c.fillStyle="#0c2839";c.fillRect(0,0,w,h);
 const nums=rows.flatMap(x=>[x.fitnessA,x.fitnessB,x.validation]),low=Math.min(-10,...nums),high=Math.max(10,...nums),pad=(high-low)*.12,lo=low-pad,hi=high+pad;
 for(let j=0;j<=4;j++){const y=T+j*(B-T)/4;c.beginPath();c.moveTo(L,y);c.lineTo(R,y);c.strokeStyle="#6d9ba43e";c.stroke();c.fillStyle="#a8c7d2";c.font="11px system-ui";c.textAlign="right";c.fillText(fmt(hi-(hi-lo)*j/4,0),L-7,y+3);}
 c.fillStyle="#9bbed1";c.font="12px system-ui";c.textAlign="left";c.fillText(rows.length?String(rows[0].generation):"0",L,B+22);
 c.textAlign="right";c.fillText(rows.length?String(rows.at(-1).generation):"Generation",R,B+22);
 if(!rows.length){c.textAlign="center";c.font="15px system-ui";c.fillText("Starte das Duell-Training: echte Fitnesswerte erscheinen hier.",w/2,h/2);return;}
 for(const [key,color] of [["fitnessA","#83acf0"],["fitnessB","#7cf0be"],["validation","#ffd28c"]]){
  c.beginPath();c.strokeStyle=color;c.lineWidth=3;
  rows.forEach((x,i)=>{const px=L+i/Math.max(1,rows.length-1)*(R-L),py=B-(x[key]-lo)/(hi-lo)*(B-T);
   if(i===0)c.moveTo(px,py);else c.lineTo(px,py);
  });c.stroke();
 }
}
function clean(){
 worker?.terminate();worker=null;busy=false;gate(false);$("progressBar").style.width="0%";
}
function runTask(kind,count){
 if(busy)return;
 if(kind!=="gait"&&!model){msg("Du brauchst zwei trainierte Laufgehirne.",true);return;}
 try{
  playing=false;gate(true);$("progressBar").style.width="0%";
  $("trainingStatus").textContent=kind==="gait"?"Neuronale Gelenksteuerungen werden trainiert …":
   kind==="duel"?"Beide Strategien lernen aus echten Duellen …":"Gepaarte Duelle mit Seitenwechsel laufen …";
  worker=new Worker(new URL("./joint-duel-worker.js?v=2",import.meta.url),{type:"module"});
  worker.onmessage=e=>{
   const v=e.data||{};
   try{
    if(v.type==="error"){msg("Rechenfehler: "+v.message,true);clean();return;}
    if(v.type==="progress-gait"){
     $("trainingStatus").textContent="Gelenklernen A & B "+v.done+"/"+v.total+" · Fit "+fmt(v.fitnessA)+"/"+fmt(v.fitnessB)+" · Prüfung "+fmt(v.holdoutA)+"/"+fmt(v.holdoutB);
     $("progressBar").style.width=(100*v.done/v.total)+"%";
    }
    if(v.type==="progress-duel"){
     model=restoreJointDuel(v.snapshot);persist();refresh();
     $("trainingStatus").textContent="Generation "+model.generation+" · "+v.done+"/"+v.total+
      " · Fit A "+fmt(v.result.fitnessA)+" · B "+fmt(v.result.fitnessB)+" · Testquote A "+fmt(v.result.winRate*100,0)+" %";
     $("progressBar").style.width=(100*v.done/v.total)+"%";
    }
    if(v.type==="progress-tournament"){
     $("tournamentStatus").textContent=v.done+"/"+v.total+" · A "+v.results[0]+" · B "+v.results[1]+" · Unentschieden "+v.results[2];
     $("progressBar").style.width=(100*v.done/v.total)+"%";
    }
    if(v.type==="done-gait"){
     if(!Array.isArray(v.checkpoints)||v.checkpoints.length!==2)throw Error("Zwei Laufmodelle fehlen");
     const A=restoreGaitTrainer(v.checkpoints[0]),B=restoreGaitTrainer(v.checkpoints[1]);
     if(!validGaitGenome(A.champion)||!validGaitGenome(B.champion))throw Error("Ein trainierter Champion fehlt");
     save(GAIT_KEY,v.checkpoints[0]);save(RIVAL_GAIT_KEY,v.checkpoints[1]);
     pair(A.champion,B.champion,A.seed);
     $("trainingStatus").textContent="Lauftraining A: "+A.generation+" / B: "+B.generation+" Generationen.";
     msg("Zwei unabhängig trainierte Laufgehirne übernommen. Jetzt können beide eigene Duellstrategien entwickeln.");clean();
    }
    if(v.type==="done-duel"){
     model=restoreJointDuel(v.snapshot);persist();refresh();restart();
     msg(v.reason==="stopped"?"Training gestoppt und gespeichert.":"Strategien getrennt weiterentwickelt; beide Roboter nutzen weiterhin ihre Laufgehirne.");clean();
    }
    if(v.type==="done-tournament"){
     $("tournamentStatus").textContent=v.completed+" Duelle: A "+v.results[0]+" Siege · B "+v.results[1]+" Siege · "+v.results[2]+" Remis.";
     msg("Turnier mit Seitenwechseln abgeschlossen.");clean();
    }
   }catch(err){msg("Auswertung fehlgeschlagen: "+err.message,true);clean();}
  };
  worker.onerror=e=>{e.preventDefault();msg("Browser konnte den Trainings-Worker nicht starten: "+e.message,true);clean();};
  worker.postMessage(kind==="gait"?{type:"start-gait",rounds:count,seed:model?.seed||42}:
   kind==="duel"?{type:"start-duel",rounds:count,snapshot:jointDuelSnapshot(model)}:
   {type:"start-tournament",rounds:count,snapshot:jointDuelSnapshot(model)});
 }catch(e){msg("Trainingsstart fehlgeschlagen: "+e.message,true);clean();}
}
$("prepareGait").addEventListener("click",()=>{if(model&&!confirm("Neues Laufgehirn für beide Roboter trainieren? Die Strategien werden zurückgesetzt."))return;runTask("gait",15);});
for(const [id,n] of [["add1",1],["add10",10],["add100",100]])$(id).addEventListener("click",()=>runTask("duel",n));
$("ten").addEventListener("click",()=>runTask("tournament",10));
$("fifty").addEventListener("click",()=>runTask("tournament",50));
$("stop").addEventListener("click",()=>{worker?.postMessage({type:"stop"});$("trainingStatus").textContent="Stopp nach laufendem Simulationsdurchlauf angefordert.";});
$("play").addEventListener("click",()=>{if(!model)return;if(match.finished)restart();playing=!playing;acc=0;last=0;$("overlay").hidden=playing;$("play").textContent=playing?"❚❚ Pause":"▶ Fortsetzen";});
$("restart").addEventListener("click",()=>{restart();msg("Duell mit gleichem Startwert zurückgesetzt.");});
$("newSeed").addEventListener("click",()=>{seed+=97;if(seed>1e9)seed=model.seed+30001;restart();msg("Neuer unabhängiger Test-Startwert "+seed+".");});
$("resetTraining").addEventListener("click",()=>{
 if(!model||!confirm("Strategien zurücksetzen, aber beide trainierten Gelenknetze behalten?"))return;
 pair(model.gaitA,model.gaitB,model.seed);msg("Taktiktraining zurückgesetzt; Laufsteuerungen unverändert.");
});
$("export").addEventListener("click",()=>{
 if(!model)return;
 const blob=new Blob([JSON.stringify(jointDuelSnapshot(model),null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="dmp-roboterduell-"+model.seed+"-gen-"+model.generation+".json";
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 msg("Vollständiges Duell mit beiden Gelenknetzen exportiert.");
});
$("importDuel").addEventListener("click",()=>$("fileDuel").click());
$("fileDuel").addEventListener("change",async e=>{
 const f=e.target.files?.[0];e.target.value="";if(!f)return;
 if(f.size>180000){msg("Duell-Datei zu groß.",true);return;}
 try{model=restoreJointDuel(JSON.parse(await f.text()));seed=model.seed+30001;persist();refresh();restart();msg("Duellmodelle und Generation "+model.generation+" erfolgreich importiert.");}
 catch(err){msg("Import ungültig: "+err.message,true);}
});
function tick(now){
 if(playing&&match){
  if(last){acc+=Math.min(.1,(now-last)/1000)*Number($("speed").value);let i=0;
   while(acc>=GAIT_DT&&i++<35&&!match.finished){stepJointDuel(match);acc-=GAIT_DT;}
   if(i>=35)acc=0;
  }last=now;draw();status();
  if(match.finished){playing=false;$("play").textContent="▶ Erneut starten";$("overlay").textContent=result(match)+" · ↺ Wiederholen";$("overlay").hidden=false;}
 }
 requestAnimationFrame(tick);
}
refresh();restart();requestAnimationFrame(tick);
