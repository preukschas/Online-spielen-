/* Eigenständige DMP Aktions-Duell-Arena: zwei gleichzeitig evolvierende Entitäten.
 * 2D-Spielmodell, keine reale Kampf-, Verletzungs- oder Biomechanik-Physik.
 */
import {duelDefaultGenome,duelValidGenome,duelStyle,makeDuel,stepDuel,
  simulateDuel,makeDuelTraining,trainDuelGeneration} from "./duel-core.js?v=1.7.0";
import {drawScene} from "./render-v2.js?v=1.7.0";
import {safeEntityList,toArena} from "./entity-model.js";
import {installCatalog} from "./entity-catalog.js";
const $=id=>document.getElementById(id),ctx=$("ring").getContext("2d");
const PREFIX="dmp_duel_progress_v1_",DEFAULT_MOVES=["Schlagen","Springen","Schubsen"];
const state={params:{nameA:"Roboter A",nameB:"Roboter B",colorA:"#70e5c1",colorB:"#f8c37d",
  kindA:"biped",kindB:"biped",speedA:3.5,speedB:3.5,staminaA:.8,staminaB:.8,
  duelDuration:24,duelMoves:DEFAULT_MOVES.slice()},seed:42,training:makeDuelTraining(),
  fight:null,playing:false,speed:1,lastFrame:0,carry:0,workToken:0,comparing:false,notice:""};
try{installCatalog(localStorage);}catch{}
const finite=n=>Number.isFinite(n)?n:0;
function key(){
 const p=state.params;
 return PREFIX+encodeURIComponent(String(p.entityA||p.nameA).slice(0,80)+"|"+String(p.entityB||p.nameB).slice(0,80));
}
function say(msg,error=false){
 state.notice=msg;const el=$("status");el.textContent=msg;el.classList.toggle("error",error);
}
function persisted(){
 const t=state.training;
 try{localStorage.setItem(key(),JSON.stringify({
  generation:t.generation,targetGeneration:t.generation,running:false,genomes:t.genomes,
  scores:t.scores.map(x=>Number.isFinite(x)?x:0),history:t.history,last:t.last,wins:t.wins
 }));}catch{say("Browser-Speicher nicht verfügbar. Die Runde bleibt nur bis zum Neuladen erhalten.",true);}
}
function restore(){
 state.training=makeDuelTraining();
 try{
  const t=JSON.parse(localStorage.getItem(key())||"null");
  if(!t||!Number.isInteger(t.generation)||t.generation<0||t.generation>5000||
   !Array.isArray(t.genomes)||t.genomes.length!==2||!t.genomes.every(duelValidGenome))return;
  state.training.genomes=t.genomes.map(g=>({...duelDefaultGenome(),...g}));
  state.training.generation=t.generation;state.training.targetGeneration=t.generation;
  state.training.history=Array.isArray(t.history)?t.history.filter(h=>Number.isFinite(h.training)).slice(-250):[];
  state.training.wins=Array.isArray(t.wins)&&t.wins.length===3&&t.wins.every(x=>Number.isInteger(x)&&x>=0)?
   t.wins.slice():[0,0,0];
  state.training.last=t.last&&typeof t.last==="object"?t.last:null;
  state.training.scores=Array.isArray(t.scores)&&t.scores.length===2?t.scores.slice():[-Infinity,-Infinity];
 }catch{}
}
function newFight(seed=state.seed){
 state.fight=makeDuel(state.params,state.training.genomes,seed);
 state.carry=0;
 draw();refresh();
}
function draw(){
 if(!state.fight)return;
 const m=state.fight;
 drawScene(ctx,{mode:"arena",preset:"duel",body:m,p:state.params,time:m.elapsed,
  finished:m.finished,seed:m.seed,duelTraining:state.training});
}
function refresh(){
 const t=state.training,m=state.fight;
 $("gen").textContent=t.generation.toLocaleString("de-DE");
 $("target").textContent=t.running?t.targetGeneration.toLocaleString("de-DE"):"pausiert";
 $("record").textContent=t.wins[0]+" / "+t.wins[1]+" / "+t.wins[2];
 $("styles").textContent="A: "+duelStyle(t.genomes[0])+" · B: "+duelStyle(t.genomes[1]);
 $("speedText").textContent=state.speed+"×";
 $("play").textContent=state.playing?"⏸ Pausieren":"▶ Duell starten";
 $("trainPause").textContent=t.running?"⏸ Training pausieren":"▶ Evolution fortsetzen";
 $("trainPause").disabled=state.comparing||(!t.running&&t.targetGeneration<=t.generation);
 for(const id of ["plus1","plus100","compare10","compare50"])$(id).disabled=state.comparing;
 $("live").textContent=m?(m.finished?"🏆 "+m.winner:"Runde läuft · "+m.elapsed.toFixed(1).replace(".",",")+" s"):"Bereit";
 if(m){
  $("hpA").textContent=Math.round(m.fighters[0].hp);
  $("hpB").textContent=Math.round(m.fighters[1].hp);
  $("hits").textContent=m.fighters[0].hits+" : "+m.fighters[1].hits;
  $("jumps").textContent=m.fighters[0].jumps+" : "+m.fighters[1].jumps;
  $("energy").textContent=Math.round(m.fighters[0].energy)+" : "+Math.round(m.fighters[1].energy);
  $("score").textContent=m.fighters[0].points+" : "+m.fighters[1].points;
 }
 const l=t.last;
 $("outcome").textContent=l?
  "Letztes Training: "+l.winner+" · Trefferpunkte "+Math.round(l.hpA)+" : "+Math.round(l.hpB)+
  " · Stile "+l.styleA+" / "+l.styleB:
  "Beide Modelle starten mit einer Grundstrategie. Trainiere A und B gleichzeitig.";
 renderChart();
}
function renderChart(){
 const c=$("fitness"),g=c.getContext("2d"),w=c.width,h=c.height,rows=state.training.history.slice(-90);
 g.clearRect(0,0,w,h);g.fillStyle="#0a2131";g.fillRect(0,0,w,h);
 g.strokeStyle="#44617377";g.lineWidth=1;
 for(let i=1;i<5;i++){g.beginPath();g.moveTo(20,10+i*(h-30)/5);g.lineTo(w-12,10+i*(h-30)/5);g.stroke();}
 g.fillStyle="#a6c7d0";g.font="12px system-ui";g.fillText("Fitness-Verlauf / beide Modelle",15,21);
 if(rows.length<2)return;
 const values=rows.map(x=>finite(x.training));
 let min=Math.min(...values),max=Math.max(...values);if(max-min<.01){max+=1;min-=1;}
 g.strokeStyle="#76e6c2";g.lineWidth=2.4;g.beginPath();
 values.forEach((v,i)=>{const x=20+i/(values.length-1)*(w-32),y=35+(1-(v-min)/(max-min))*(h-49);
  i===0?g.moveTo(x,y):g.lineTo(x,y);});g.stroke();
}
function stopWork(){
 state.workToken++;state.training.running=false;state.comparing=false;
}
function selectOptions(slot){
 const el=$("entity"+slot),value=el.value;el.textContent="";
 const basic=document.createElement("option");basic.value="";basic.textContent="Standard-Roboter";el.append(basic);
 for(const e of safeEntityList(localStorage)){
  const opt=document.createElement("option");opt.value=e.id;opt.textContent=e.name+" · "+(e.kind==="biped"?"Zweibeiner":"Vierbeiner");el.append(opt);
 }
 el.value=[...el.options].some(o=>o.value===value)?value:"";
}
function applyEntity(slot){
 stopWork();const p=state.params;
 const id=$("entity"+slot).value;
 const e=safeEntityList(localStorage).find(item=>item.id===id);
 const a=e?toArena(e):null;
 p["entity"+slot]=e?e.id:undefined;
 p["name"+slot]=a?a.name:"Roboter "+slot;
 p["kind"+slot]=a?a.kind:"biped";
 p["color"+slot]=a?a.color:(slot==="A"?"#70e5c1":"#f8c37d");
 p["speed"+slot]=a?a.speed:3.5;
 p["stamina"+slot]=a?a.stamina:.8;
 $("name"+slot).value=p["name"+slot];
 restore();newFight();say(e?"Entität „"+e.name+"“ eingesetzt. Vorhandener Lernstand für dieses Paar geladen.":"Standard-Roboter "+slot+" eingesetzt.");
}
function readMoves(){
 return [...document.querySelectorAll("[data-move]:checked")].map(x=>x.value);
}
function updateMoves(){
 const moves=readMoves();
 if(!moves.some(x=>x==="Schlagen"||x==="Schubsen")){
  say("Bitte mindestens Schlagen oder Schubsen aktivieren.",true);return false;
 }
 state.params.duelMoves=moves;
 stopWork();newFight();say("Neue Aktionen gelten jetzt für Duell und Evolution.");return true;
}
function queueTraining(count){
 if(state.comparing)return;
 const t=state.training;
 t.targetGeneration=Math.max(t.targetGeneration,t.generation)+count;
 if(!t.running){
  t.running=true;
  const token=++state.workToken;
  const run=()=>{
   if(!t.running||token!==state.workToken)return;
   try{
    trainDuelGeneration(t,state.params,state.seed);
    if(t.generation%2===0||!t.running)persisted();
    if(t.generation%1===0){refresh();draw();}
    if(t.running){say("🧠 Beide Roboter lernen · Generation "+t.generation+" / "+t.targetGeneration);
     setTimeout(run,8);}
    else{persisted();newFight(state.seed+1009+t.generation);say("Training abgeschlossen: Generation "+t.generation+". Beide Modelle wurden optimiert.");}
   }catch(e){t.running=false;persisted();say("Trainingsfehler: "+e.message,true);}
  };
  state.playing=false;say("Training gestartet. Beide Modelle entwickeln ihre Strategie.");setTimeout(run,30);
 }else{say("Training um "+count+" Generation"+(count===1?"":"en")+" verlängert.");}
 refresh();
}
function swapParams(p){
 const q={...p};
 for(const k of ["name","color","kind","speed","stamina","entity"]){
  q[k+"A"]=p[k+"B"];q[k+"B"]=p[k+"A"];
 }
 return q;
}
function compare(total){
 if(state.comparing)return;
 stopWork();persisted();
 state.playing=false;state.comparing=true;const token=++state.workToken,results=[0,0,0];
 const params={...state.params,duelMoves:state.params.duelMoves.slice()},
       genomes=state.training.genomes.map(g=>({...g}));
 let done=0;
 say("🥊 0 / "+total+" Duelle ausgewertet …");refresh();
 const run=()=>{
  if(token!==state.workToken)return;
  try{
   const swapped=done%2===1;
   const p=swapped?swapParams(params):params;
   const g=swapped?[genomes[1],genomes[0]]:genomes;
   const s=simulateDuel(p,g,state.seed+507+Math.floor(done/2)*199);
   const pointsA=s.fighters[0].hp+s.fighters[0].points*.72;
   const pointsB=s.fighters[1].hp+s.fighters[1].points*.72;
   const idx=Math.abs(pointsA-pointsB)<.3?2:
    pointsA>pointsB?(swapped?1:0):(swapped?0:1);
   results[idx]++;done++;
   say("🥊 "+done+" / "+total+" Duelle · A "+results[0]+" / B "+results[1]+" / Remis "+results[2]);refresh();
   if(done<total)setTimeout(run,1);
   else{state.comparing=false;refresh();
    say("🏆 Ergebnis aus "+total+" Duellen (mit Seitenwechsel): A "+results[0]+" Siege · B "+results[1]+" Siege · "+results[2]+" Remis.");}
  }catch(e){state.comparing=false;refresh();say("Auswertung fehlgeschlagen: "+e.message,true);}
 };
 setTimeout(run,15);
}
function download(){
 const t=state.training;
 const payload={format:"DMP_DUEL_STANDALONE_1",saved:new Date().toISOString(),
  params:state.params,seed:state.seed,generation:t.generation,genomes:t.genomes,
  history:t.history,wins:t.wins};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=url;link.download="duell-arena-generation-"+t.generation+".json";document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);say("Trainingsstand als JSON-Datei exportiert.");
}
function tick(now){
 const delta=state.lastFrame?Math.min(.1,(now-state.lastFrame)/1000):0;state.lastFrame=now;
 if(state.playing&&state.fight&&!state.fight.finished){
  state.carry+=delta*state.speed;
  let count=0;
  while(state.carry>=1/60&&count<36&&!state.fight.finished){
   stepDuel(state.fight,1/60);state.carry-=1/60;count++;
  }
  if(state.fight.finished){state.playing=false;
   say(state.fight.winner==="Unentschieden"?"Unentschieden – starte ein neues Duell.":"🏆 Gewinner: "+state.fight.winner);}
  draw();
  if(count)refreshStats();
 }
 requestAnimationFrame(tick);
}
function refreshStats(){
 const m=state.fight;if(!m)return;
 $("live").textContent=m.finished?"🏆 "+m.winner:"Kampfzeit "+m.elapsed.toFixed(1).replace(".",",")+" s";
 $("hpA").textContent=Math.round(m.fighters[0].hp);$("hpB").textContent=Math.round(m.fighters[1].hp);
 $("hits").textContent=m.fighters[0].hits+" : "+m.fighters[1].hits;
 $("jumps").textContent=m.fighters[0].jumps+" : "+m.fighters[1].jumps;
 $("energy").textContent=Math.round(m.fighters[0].energy)+" : "+Math.round(m.fighters[1].energy);
 $("score").textContent=m.fighters[0].points+" : "+m.fighters[1].points;
 if(m.finished)$("play").textContent="▶ Neues Duell";
}
function setup(){
 for(const slot of ["A","B"]){
  selectOptions(slot);
  $("entity"+slot).addEventListener("change",()=>applyEntity(slot));
  $("name"+slot).addEventListener("change",()=>{
   stopWork();state.params["entity"+slot]=undefined;
   state.params["name"+slot]=$("name"+slot).value.trim().slice(0,24)||"Roboter "+slot;
   $("entity"+slot).value="";restore();newFight();say("Duellpaar geändert.");
  });
 }
 for(const cb of document.querySelectorAll("[data-move]"))cb.addEventListener("change",()=>{
  if(!readMoves().some(x=>x==="Schlagen"||x==="Schubsen")){cb.checked=true;say("Ein Angriff muss aktiviert bleiben.",true);return;}
  updateMoves();
 });
 $("duration").addEventListener("change",()=>{
  state.params.duelDuration=Number($("duration").value);stopWork();newFight();
 });
 $("speed").addEventListener("change",()=>{state.speed=Number($("speed").value);refresh();});
 $("play").addEventListener("click",()=>{
  if(state.comparing)return;
  if(state.fight.finished)newFight(state.seed+state.training.generation+Math.floor(Date.now()/1000)%10000);
  state.playing=!state.playing;$("play").textContent=state.playing?"⏸ Pausieren":"▶ Duell starten";
  say(state.playing?"▶ Live-Duell läuft. Beide Figuren handeln automatisch.":"Live-Duell pausiert.");
 });
 $("resetFight").addEventListener("click",()=>{state.playing=false;newFight();say("Aktuelles Duell zurückgesetzt, Trainingsstand erhalten.");});
 $("plus1").addEventListener("click",()=>queueTraining(1));
 $("plus100").addEventListener("click",()=>queueTraining(100));
 $("trainPause").addEventListener("click",()=>{
  const t=state.training;
  if(t.running){stopWork();persisted();say("Evolution pausiert bei Generation "+t.generation);}
  else if(t.targetGeneration>t.generation)queueTraining(0);
  refresh();
 });
 $("compare10").addEventListener("click",()=>compare(10));
 $("compare50").addEventListener("click",()=>compare(50));
 $("export").addEventListener("click",download);
 $("wipe").addEventListener("click",()=>{
  if(!confirm("Trainingsstand für dieses Paar wirklich löschen?"))return;
  stopWork();state.playing=false;try{localStorage.removeItem(key());}catch{}
  restore();newFight();say("Trainingsstand dieses Paars gelöscht.");
 });
 restore();newFight();say("Bereit: Schlagen, Springen, Schubsen. Zwei Gegner können unabhängig voneinander lernen.");
 requestAnimationFrame(tick);
}
setup();