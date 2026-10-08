/* DMP GELENK-DUELL v1 – trained biped gait + evolutionary fight tactics.
 * Stylized non-graphic collision model; NOT medical or engineering physics.
 */
import {GAIT_DT,validGaitGenome,gaitRng,makeGaitWorld,gaitStep} from "./joint-walker-core.js";
export const JOINT_DUEL_VERSION=1,DUEL_DT=GAIT_DT,DUEL_TIME=6,DUEL_POPULATION=8;
export const STRATEGY_KEYS=["attack","shove","kick","guard","evade","range","tempo","pressure","balance","counter","stamina"];
const INITIAL=[.55,.52,.42,.52,.35,.54,.54,.57,.54,.50,.58];
const bound=(x,a,b)=>Math.min(b,Math.max(a,x));
export function defaultTactic(){return INITIAL.slice();}
export function validTactic(t){return Array.isArray(t)&&t.length===INITIAL.length&&t.every(x=>Number.isFinite(x)&&x>=0&&x<=1);}
export function tacticStyle(t){
 if(!validTactic(t))return "Unbekannt";
 const scores=[["Druck",t[1]+t[7]],["Konter",t[9]+t[3]],["Ausweichen",t[4]+t[5]],["Angriff",t[0]+t[2]],["Kontrolle",t[8]+t[10]]];
 return scores.sort((a,b)=>b[1]-a[1])[0][0];
}
function robot(w,t,side,seed){
 if(!validGaitGenome(w)||!validTactic(t))throw Error("Ungültiges Lauf- oder Kampfmodell");
 const body=makeGaitWorld(seed);
 return {name:side?"Roboter B":"Roboter A",side,face:side?-1:1,
  x:side?5.6:1.4,body,gait:w.slice(),tactic:t.slice(),
  hp:100,energy:100,points:0,hits:0,blocks:0,dodges:0,knockdowns:0,
  contacts:0,ringSeconds:0,travel:0,action:"Bereit",actionTime:0,
  cooldown:0,stun:0,decision:0,guard:false,dodge:false};
}
export function makeJointDuel(gaitA,gaitB,tacticA=defaultTactic(),tacticB=defaultTactic(),seed=42){
 if(!Number.isSafeInteger(seed)||seed<1||seed>1e9)throw Error("Ungültiger Startwert");
 const sa=seed*27+11;
 const a=robot(gaitA,tacticA,0,sa),b=robot(gaitB,tacticB,1,sa);
 return {seed,fighters:[a,b],time:0,steps:0,events:[],winner:null,finished:false,limit:DUEL_TIME};
}
function choose(a,b,match,r){
 const g=a.tactic,dist=Math.abs(a.x-b.x);
 a.guard=false;a.dodge=false;
 if(a.cooldown>0||a.stun>0||a.energy<9)return;
 const threat=["Schubsen","Treten","Schlagen"].includes(b.action)&&b.actionTime>.01&&dist<1.4;
 const v=r();
 if(threat&&v<g[3]*(g[9]*.5+.32)){
  a.action="Blocken";a.guard=true;a.actionTime=.37;a.cooldown=.37;a.energy-=3;return;
 }
 if(threat&&v<g[4]*.36+g[3]*.12){
  a.action="Ausweichen";a.dodge=true;a.actionTime=.30;a.cooldown=.32;a.dodges++;a.energy-=4;return;
 }
 if(!a.body.contacts.some(Boolean)||dist>.73+g[5]*.76||r()>.25+g[0]*.58+g[7]*.13)return;
 const toss=r()*(.18+g[1]+g[2]+g[0]);
 const type=toss<.18+g[1]?"Schubsen":toss<.18+g[1]+g[2]?"Treten":"Schlagen";
 a.action=type;a.actionTime=.22;a.cooldown=type==="Treten"?.66:type==="Schubsen"?.53:.44;
 a.energy-=type==="Treten"?13:type==="Schubsen"?10:8;
 const reach=type==="Treten"?1.20:type==="Schubsen"?.97:.73;
 if(dist>reach)return;
 if(b.dodge&&b.actionTime>.02&&r()<.72)return;
 const factor=b.guard&&b.actionTime>.01?.24:1,damage=type==="Treten"?11:type==="Schubsen"?6:8;
 b.hp=bound(b.hp-damage*factor,0,100);a.hits++;a.points+=factor<1?1:type==="Schubsen"?3:5;
 if(factor<1)b.blocks++;
 // Abstract contact impulse influences the *same gait body's velocity and tilt.*
 const impulse=(type==="Schubsen"?1.7:type==="Treten"?1.3:1.0)*factor;
 b.body.vx=bound(b.body.vx-impulse,-2.6,3.3);
 b.body.omega=bound(b.body.omega+impulse*.21,-8,8);
 b.stun=Math.max(b.stun,factor<1?.03:.13);
 match.events.push({time:match.time,name:a.name,action:type,blocked:factor<1});
 if(match.events.length>12)match.events.shift();
}
export function stepJointDuel(match){
 if(match.finished)return match;
 const dt=DUEL_DT,r=gaitRng(match.seed+923+match.steps*7711);
 for(const a of match.fighters){
  a.cooldown=Math.max(0,a.cooldown-dt);a.actionTime=Math.max(0,a.actionTime-dt);
  a.stun=Math.max(0,a.stun-dt);a.energy=bound(a.energy+(2.4+a.tactic[10]*3.2)*dt,0,100);
  if(a.body.fallen||a.hp<=0)continue;
  if(match.time>=a.decision){
   choose(a,match.fighters[1-a.side],match,r);
   a.decision=match.time+.09+(.19-a.tactic[6]*.10);
  }
 }
 for(const a of match.fighters){
  if(a.body.fallen)continue;
  const previousBodyX=a.body.x,previousX=a.x;
  // Gait neural network drives 4 servos through the original physics step.
  a.body.finished=false;a.body.reached=false;
  gaitStep(a.body,a.gait);
  a.body.finished=false;
  const dx=a.body.x-previousBodyX;
  a.x+=a.face*dx;
  const supported=a.body.contacts.some(Boolean);
  if(supported){
   a.contacts++;
   // Small traction-limited opponent approach/retreat tweak (NOT a motor replacement).
   const gap=Math.abs(match.fighters[1-a.side].x-a.x);
   const desire=gap>.54+a.tactic[5]*.75?1:-.20;
   a.body.vx=bound(a.body.vx+desire*(.08+.10*a.tactic[7])*dt,-2.6,3.3);
   if(a.dodge)a.body.vx=bound(a.body.vx-.22*dt,-2.6,3.3);
  }
  a.x=bound(a.x,.20,6.8);
  a.travel+=Math.abs(a.x-previousX);
  if(a.x<=.20||a.x>=6.8){a.ringSeconds+=dt;a.hp=bound(a.hp-14*dt,0,100);a.body.vx*=-.35;}
  if(a.body.fallen){a.knockdowns++;a.hp=0;}
 }
 const [a,b]=match.fighters;
 if(!a.body.fallen&&!b.body.fallen&&b.x-a.x<.66){
  const overlap=(.66-(b.x-a.x))/2;
  a.x=bound(a.x-overlap,.20,6.8);b.x=bound(b.x+overlap,.20,6.8);
  a.body.vx=bound(a.body.vx-.38,-2.6,3.3);
  b.body.vx=bound(b.body.vx-.38,-2.6,3.3);
 }
 match.steps++;match.time+=dt;
 if(match.time>=match.limit||match.fighters.some(x=>x.hp<=0)){
  match.finished=true;
  const aa=a.hp+a.points*.4,bb=b.hp+b.points*.4;
  match.winner=Math.abs(aa-bb)<.5?-1:aa>bb?0:1;
 }
 return match;
}
export function runJointDuel(ga,gb,sa,sb,seed=42){
 const match=makeJointDuel(ga,gb,sa,sb,seed);
 for(let i=0;i<=Math.ceil(DUEL_TIME/DUEL_DT)+1&&!match.finished;i++)stepJointDuel(match);
 return match;
}
export function jointDuelScore(m,side){
 const a=m.fighters[side],b=m.fighters[1-side];
 return .34*(a.hp-b.hp)+.65*(a.points-b.points)+
 .9*(a.hits-b.hits)+.65*(a.blocks-b.blocks)+.3*(a.dodges-b.dodges)+
 .35*(a.travel-b.travel)+.016*(a.contacts-b.contacts)-
 1.1*(a.ringSeconds-b.ringSeconds)+(m.winner===side?13:m.winner===1-side?-13:0);
}
export function compareJointDuels(ga,gb,sa,sb,seeds){
 if(!validGaitGenome(ga)||!validGaitGenome(gb)||!validTactic(sa)||!validTactic(sb)||
 !Array.isArray(seeds)||!seeds.length||seeds.length>16||
 !seeds.every(x=>Number.isInteger(x)&&x>0&&x<=1e9))throw Error("Ungültiger Turnier-Vergleich");
 let score=0,wins=0;
 for(const seed of seeds){
  const a=runJointDuel(ga,gb,sa,sb,seed),b=runJointDuel(gb,ga,sb,sa,seed);
  score+=(jointDuelScore(a,0)+jointDuelScore(b,1))/2;
  wins+=(a.winner===0?1:a.winner===-1?.5:0)+(b.winner===1?1:b.winner===-1?.5:0);
 }
 return {score:score/seeds.length,winRate:wins/(2*seeds.length),matches:2*seeds.length};
}
export function newJointDuelTrainer(ga,gb,seed=42){
 if(!validGaitGenome(ga)||!validGaitGenome(gb))throw Error("Zuerst gültige Gelenksteuerungen importieren");
 if(!Number.isInteger(seed)||seed<1||seed>1e9)throw Error("Ungültiger Startwert");
 return {version:JOINT_DUEL_VERSION,seed,generation:0,gaitA:ga.slice(),gaitB:gb.slice(),
  tactics:[defaultTactic(),defaultTactic()],history:[],validation:null};
}
export function validJointDuelTrainer(t){
 return !!t&&t.version===JOINT_DUEL_VERSION&&Number.isInteger(t.seed)&&t.seed>=1&&t.seed<=1e9&&
 Number.isInteger(t.generation)&&t.generation>=0&&t.generation<=5000&&
 validGaitGenome(t.gaitA)&&validGaitGenome(t.gaitB)&&
 Array.isArray(t.tactics)&&t.tactics.length===2&&t.tactics.every(validTactic)&&
 Array.isArray(t.history)&&t.history.length<=500&&t.history.every(h=>Number.isInteger(h.generation)&&
 ["fitnessA","fitnessB","validation","winRate"].every(k=>Number.isFinite(h[k]))&&h.winRate>=0&&h.winRate<=1);
}
export function jointDuelSnapshot(t){
 if(!validJointDuelTrainer(t))throw Error("Ungültige Duell-Daten");
 return {version:t.version,seed:t.seed,generation:t.generation,gaitA:t.gaitA.slice(),gaitB:t.gaitB.slice(),
  tactics:t.tactics.map(x=>x.slice()),history:t.history.map(x=>({...x})),
  validation:t.validation?{...t.validation}:null};
}
export function restoreJointDuel(t){
 if(!validJointDuelTrainer(t))throw Error("Ungültiger Duell-Import");
 if(t.validation!=null&&(!Number.isFinite(t.validation.score)||!Number.isFinite(t.validation.winRate)||
 t.validation.winRate<0||t.validation.winRate>1||!Number.isInteger(t.validation.matches)))throw Error("Ungültige Validierung");
 return jointDuelSnapshot(t);
}
function fitness(t,side,candidate,opponent){
 const ga=side===0?t.gaitA:t.gaitB,gb=side===0?t.gaitB:t.gaitA;
 const seeds=[t.seed+323,t.seed+727],a=compareJointDuels(ga,gb,candidate,opponent,seeds);
 const b=compareJointDuels(ga,gb,candidate,defaultTactic(),[t.seed+953]);
 return a.score*.72+b.score*.28;
}
export function evolveJointDuelGeneration(t){
 if(!validJointDuelTrainer(t))throw Error("Duellstand ungültig");
 const r=gaitRng(t.seed+t.generation*12817+77),before=t.tactics.map(s=>s.slice());
 const next=[],scores=[];
 for(let side=0;side<2;side++){
  let best=before[side].slice(),rating=fitness(t,side,best,before[1-side]);
  for(let i=0;i<DUEL_POPULATION;i++){
   const candidate=i===DUEL_POPULATION-1?
    INITIAL.map(v=>bound(v+(r()+r()-1)*.55,0,1)):
    best.map(v=>r()<.65?bound(v+(r()+r()-1)*(i%3===0?.60:.33),0,1):v);
   const score=fitness(t,side,candidate,before[1-side]);
   if(score>rating){best=candidate;rating=score;}
  }
  next.push(best);scores.push(rating);
 }
 t.tactics=next;t.generation++;
 const valid=compareJointDuels(t.gaitA,t.gaitB,next[0],next[1],
  [t.seed+15001,t.seed+15071,t.seed+15131]);
 t.validation=valid;
 const row={generation:t.generation,fitnessA:scores[0],fitnessB:scores[1],
  validation:valid.score,winRate:valid.winRate};
 t.history.push(row);if(t.history.length>500)t.history.shift();
 return row;
}
