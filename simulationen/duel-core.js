/* DMP Duell-Arena: deterministisches 2D-Lehr-/Spielmodell, keine reale Kampf- oder Verletzungsphysik. */
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
// Alle Gene liegen zwischen 0 und 1. Bewegung wirkt auf Bodenhaftung, Beschleunigung,
 // Schrittzyklus, Sprungimpuls, Ausweichen und Stabilität; kein rein optisches Training.
const DEFAULT={aggression:.59,guard:.40,jump:.30,punch:.56,kick:.41,push:.39,range:.46,
 stride:.46,cadence:.55,footwork:.52,evade:.38,spring:.48,balance:.56,recovery:.52};
const KEYS=Object.keys(DEFAULT);
export function duelDefaultGenome(){return {...DEFAULT};}
// Alte gespeicherte Gene aus Version 1.4 bleiben importierbar.
export function duelValidGenome(g){return !!g&&typeof g==="object"&&
  ["aggression","guard","jump","punch","kick","push","range"].every(k=>Number.isFinite(g[k])&&g[k]>=0&&g[k]<=1)&&
  KEYS.every(k=>g[k]===undefined||(Number.isFinite(g[k])&&g[k]>=0&&g[k]<=1));}
export function duelStyle(g){
 const p={...DEFAULT,...g};
 const styles=[
  ["Springer",p.spring*.72+p.jump*.28],
  ["Konterläufer",p.evade*.6+p.guard*.4],
  ["Distanzkämpfer",p.range*.56+p.footwork*.44],
  ["Druckkämpfer",p.aggression*.55+p.push*.45],
  ["Techniker",p.balance*.34+p.recovery*.33+p.cadence*.33],
  ["Schnellläufer",p.stride*.4+p.cadence*.3+p.footwork*.3]
 ];
 styles.sort((a,b)=>b[1]-a[1]);return styles[0][0];
}
export function movementMetrics(f){return{steps:f.steps,travel:+f.travel.toFixed(2),jumps:f.jumps,
 dodges:f.dodges,energyUsed:+f.energySpent.toFixed(2),style:duelStyle(f.genome)};}
export function duelRandom(seed){let x=seed>>>0||1;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
export function duelFighter(p,side,genome){
 const left=side===0,id=left?"A":"B",color=p["color"+id];
 return {name:String(p["name"+id]||"Entität "+id).slice(0,24),
  color:/^#[0-9a-f]{6}$/i.test(color||"")?color:left?"#53deb6":"#f8bc6a",
  kind:p["kind"+id]==="quadruped"?"quadruped":"biped",
  fighterStyle:typeof p["fighterStyle"+id]==="string"?p["fighterStyle"+id]:"",
  x:left?3:9,y:0,vx:0,vy:0,hp:100,energy:100,points:0,
  hits:0,blocks:0,ringouts:0,landed:true,cooldown:0,actionTime:0,decision:0,
  action:"Bereit",facing:left?1:-1,genome:{...DEFAULT,...genome},base:p["speed"+id]||3.5,
  stamina:p["stamina"+id]||.8,stun:0,intent:0,gaitPhase:0,steps:0,
 travel:0,energySpent:0,jumps:0,dodges:0,ringCooldown:0,
 pose:{leftHip:0,rightHip:0,leftKnee:.15,rightKnee:.15,lean:0,stance:1}};
}
export function makeDuel(p,genomes=[DEFAULT,DEFAULT],seed=42){
 return {fighters:[duelFighter(p,0,genomes[0]),duelFighter(p,1,genomes[1])],
  moves:Array.isArray(p.duelMoves)?p.duelMoves.filter(x=>["Schlagen","Schubsen","Springen","Treten"].includes(x)):null,
  winner:null,elapsed:0,limit:p.duelDuration||24,seed,finished:false,events:[],round:1};
}
function perform(a,b,body,action,rng){
 const dist=Math.abs(b.x-a.x),facing=Math.sign(b.x-a.x)||a.facing;
 a.facing=facing;a.action=action;a.actionTime=.23;
 const options={Schubsen:{range:1.25,cost:13,damage:6,knock:3.8,points:3},
  Schlagen:{range:.95,cost:10,damage:10,knock:1.7,points:5},
  Treten:{range:1.55,cost:18,damage:14,knock:3.1,points:7}};
 const c=options[action];if(!c)return;
 a.energy=clamp(a.energy-c.cost,0,100);a.cooldown=action==="Treten"?.75:action==="Schubsen"?.63:.47;
 if(dist>c.range||Math.abs(a.y-b.y)>.85)return;
 const blocked=b.action==="Blocken"&&b.actionTime>0;
 const blockFactor=blocked?.23:1,impact=(c.damage*(.85+.3*rng()))*blockFactor;
 b.hp=clamp(b.hp-impact,0,100);
 b.vx+=facing*c.knock*blockFactor*(1.12-.48*b.genome.balance);
 b.stun=Math.max(b.stun,(blocked?.06:.16)*(1.22-.55*b.genome.recovery));
 a.points+=blocked?1:c.points;a.hits++;if(blocked)b.blocks++;
 body.events.push({at:body.elapsed,actor:a.name,action,blocked});if(body.events.length>12)body.events.shift();
}
// Policy: Entscheidung über Zielbewegung, Reaktion und Aktion.
function strategy(a,b,body,rng){
 const g=a.genome,dist=Math.abs(b.x-a.x);
 const face=Math.sign(b.x-a.x)||a.facing;a.facing=face;
 if(a.stun>.01){a.intent=0;return;}
 const preferred=.62+g.range*1.08;
 const threatened=b.actionTime>.04&&["Schubsen","Schlagen","Treten"].includes(b.action);
 const retreat=threatened&&dist<2&&rng()<g.evade*.67;
 a.intent=(dist>preferred?face:-face*(.25+g.footwork*.35));
 if(retreat){
  a.intent=-face*(.7+g.evade*.3);a.action="Ausweichen";
  a.actionTime=.32;a.cooldown=.29;a.energy=clamp(a.energy-3,0,100);a.dodges++;
 }
 if(a.cooldown>0||a.energy<8)return;
 if(threatened&&dist<1.65&&rng()<g.guard*.8){
  a.intent=0;a.action="Blocken";a.actionTime=.46;a.cooldown=.45;a.energy-=5;return;
 }
 if(a.landed&&dist<2.5&&(!body.moves||body.moves.includes("Springen"))&&rng()<g.jump*(.07+.13*g.spring)){
  a.vy=2.8+g.spring*2.6;a.landed=false;a.jumps++;
  a.action="Springen";a.actionTime=.40;a.cooldown=.43;a.energy=clamp(a.energy-(5+4*g.spring),0,100);return;
 }
 if(dist>1.58)return;
 const weights=[
  {a:"Schubsen",w:(.11+g.push*.9)*(dist<1.25?1:.08)},
  {a:"Schlagen",w:(.15+g.punch)*(dist<.95?1:.08)},
  {a:"Treten",w:(.16+g.kick)*(dist<1.55?1:.1)}
 ].filter(opt=>!body.moves||body.moves.includes(opt.a));
 if(!weights.length)return;
 const sum=weights.reduce((t,x)=>t+x.w,0);let pick=rng()*sum;
 for(const opt of weights){pick-=opt.w;if(pick<=0){perform(a,b,body,opt.a,rng);return;}}
}
export function stepDuel(body,dt=1/60){
 if(body.finished)return body;
 const rng=body._rng||(body._rng=duelRandom(body.seed+73));
 const f=body.fighters;
 body.elapsed+=dt;
 for(const a of f){
  a.cooldown=Math.max(0,a.cooldown-dt);a.actionTime=Math.max(0,a.actionTime-dt);
  a.stun=Math.max(0,a.stun-dt);a.decision-=dt;
  a.energy=clamp(a.energy+(3.5+2*a.stamina)*dt,0,100);
  if(a.decision<=0){a.decision=.19+rng()*.12;strategy(a,f[1-f.indexOf(a)],body,rng);}
 }
 for(const a of f){
  const g=a.genome,previous=a.x;
  // Zwei virtuelle Füße bzw. vier Beinimpulse: periodischer Kontakt begrenzt
  // die verfügbare Vortriebskraft. Gene steuern tatsächlich die Dynamik.
  const cadence=.75+g.cadence*2.25;
  const rate=Math.max(.22,Math.min(1.45,Math.abs(a.vx)/1.65));
  const oldPhase=a.gaitPhase;
  a.gaitPhase+=Math.PI*2*cadence*rate*dt;
  a.steps+=Math.max(0,Math.floor(a.gaitPhase/Math.PI)-Math.floor(oldPhase/Math.PI));
  const swing=Math.sin(a.gaitPhase),reach=.16+g.stride*.72;
  const contact=a.landed?(a.kind==="quadruped"?.93: .77+.22*Math.abs(Math.cos(a.gaitPhase))):.19;
  const traction=contact*(.72+.43*g.balance);
  const accel=(1.6+g.footwork*2.5)*(1+.28*g.stride)*(a.base/3.5)*traction*a.intent;
  a.vx=clamp(a.vx+accel*dt,-3.35*(a.base/3.5),3.35*(a.base/3.5));
  if(Math.abs(a.intent)>.1&&a.landed){
   const effort=Math.abs(accel)*dt*(.22+g.stride*.14);
   a.energy=clamp(a.energy-effort,0,100);a.energySpent+=effort;
  }
  a.vy-=9.81*dt;a.y+=a.vy*dt;
  if(a.y<=0){a.y=0;a.vy=0;a.landed=true;}
  a.x+=a.vx*dt;
  a.travel+=Math.abs(a.x-previous);
  a.vx*=Math.exp(-(a.landed?2.3: .68)*dt);
  const lean=clamp(a.vx*.085+a.intent*.08,-.35,.35);
  a.pose={leftHip:swing*reach,rightHip:-swing*reach,
   leftKnee:.16+Math.max(0,-swing)*(.5+.5*g.stride),
   rightKnee:.16+Math.max(0,swing)*(.5+.5*g.stride),
   lean,stance:contact};
  a.ringCooldown=Math.max(0,a.ringCooldown-dt);
  if(a.x<.35||a.x>11.65){
   a.x=clamp(a.x,.35,11.65);
   if(a.ringCooldown===0){
    a.hp=clamp(a.hp-15,0,100);a.ringouts++;
    f[1-f.indexOf(a)].points+=12;a.ringCooldown=.65;
   }
   a.vx*=-.32;
  }
 }
 const gap=Math.abs(f[1].x-f[0].x);
 if(gap<.72){const push=(.72-gap)/2,sgn=Math.sign(f[1].x-f[0].x)||1;f[0].x-=sgn*push;f[1].x+=sgn*push;}
 if(f.some(a=>a.hp<=0)||body.elapsed>=body.limit){
  body.finished=true;
  const [a,b]=f;
  const sa=a.hp+a.points*.72,sb=b.hp+b.points*.72;
  body.winner=Math.abs(sa-sb)<.3?"Unentschieden":sa>sb?a.name:b.name;
 }
 return body;
}
export function simulateDuel(p,genomes,seed=42){
 const b=makeDuel(p,genomes,seed);
 for(let i=0;i<Math.ceil(b.limit*30)+3&&!b.finished;i++)stepDuel(b,1/30);
 return b;
}
function scoreDuel(b,side){
 const a=b.fighters[side],c=b.fighters[1-side];
 // Bewegung zählt explizit: stabile, effiziente Fußarbeit, Ausweichen, Balance.
 const mobility=a.travel/(1+a.energySpent);
 const rivalMobility=c.travel/(1+c.energySpent);
 return (a.hp-c.hp)*.20+(a.points-c.points)*.65+(a.hits-c.hits)*.8+
  (a.hp>c.hp?5:a.hp<c.hp?-5:0)-(a.ringouts*2)+a.energy*.012+
  1.1*(mobility-rivalMobility)+.14*(a.dodges-c.dodges)+.03*(a.steps-c.steps);
}
function candidateScore(p,side,candidate,other,seed){
 // Feste Validierungsszenarien: gleicher Gegner, wechselnde Startseite.
 const base=duelDefaultGenome();let result=0;
 for(let k=0;k<4;k++){
  const foe=k<2?base:other,originalSide=(side+k)%2;
  const genomes=originalSide===0?[candidate,foe]:[foe,candidate];
  result+=scoreDuel(simulateDuel(p,genomes,seed+Math.floor(k/2)*331),originalSide);
 }
 return result/4;
}
export function makeDuelTraining(){
 return {generation:0,targetGeneration:0,running:false,genomes:[duelDefaultGenome(),duelDefaultGenome()],
  scores:[-Infinity,-Infinity],history:[],last:null,wins:[0,0,0]};
}
export function trainDuelGeneration(tr,p,seed=42){
 if(!tr.running)return tr;
 const next=tr.generation+1,rng=duelRandom(seed+next*982451653);
 const initial=tr.genomes.map(g=>({...DEFAULT,...g})),best=[],scores=[];
 for(let side=0;side<2;side++){
  const rival=initial[1-side],old=initial[side];
  let top={...old},topScore=candidateScore(p,side,top,rival,seed+12001);
  for(let n=0;n<9;n++){
   const g={...old};
   for(const k of KEYS)if(rng()<.64)g[k]=clamp(g[k]+(rng()-.5)*(n<7?.58:1.2),0,1);
   const rating=candidateScore(p,side,g,rival,seed+12001);
   if(rating>topScore){top=g;topScore=rating;}
  }
  best.push(top);scores.push(topScore);
 }
 tr.genomes=best;tr.scores=scores;tr.generation=next;
 const duel=simulateDuel(p,tr.genomes,seed+777);
 const [a,b]=duel.fighters;const win=a.name===duel.winner?0:b.name===duel.winner?1:2;
 tr.wins[win]++;
 tr.last={winner:duel.winner,scoreA:a.points,scoreB:b.points,hpA:a.hp,hpB:b.hp,
 movementA:movementMetrics(a),movementB:movementMetrics(b),styleA:duelStyle(tr.genomes[0]),styleB:duelStyle(tr.genomes[1])};
 tr.history.push({generation:next,training:(scores[0]+scores[1])/2,validation:tr.last.scoreA-tr.last.scoreB});
 if(tr.history.length>250)tr.history.shift();
 if(tr.generation>=tr.targetGeneration)tr.running=false;
 return tr;
}
