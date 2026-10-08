/* DMP Gelenkläufer v1: 2D articulated neural gait-learning sandbox.
   Leg joints have finite angular acceleration and speed; feet generate
   simplified spring/damper normal reactions and friction forces.
   Educational reduced-order mechanics, NOT a rigid-body dynamics solver. */
import {validateEntity} from "./entity-model.js";
export const GAIT_VERSION=1;
export const GAIT_DT=1/45, GAIT_DURATION=9, GAIT_GOAL=7;
export const GAIT_INPUTS=16, GAIT_HIDDEN=12, GAIT_OUTPUTS=4;
export const GAIT_GENES=(GAIT_INPUTS+1)*GAIT_HIDDEN+(GAIT_HIDDEN+1)*GAIT_OUTPUTS;
export const GAIT_POPULATION=24;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function gaitRng(seed=1){
 let n=seed>>>0||1;
 return ()=>((n=Math.imul(n,1664525)+1013904223>>>0)/4294967296);
}
const legAngle=(leg,s)=>s.phi+leg.hip;
export function footPosition(s,index){
 const leg=s.legs[index],a=legAngle(leg,s),b=a-leg.knee;
 const quad=s.entity?.kind==="quadruped",scale=s.entity?.limb||1;
 // Two diagonal motor pairs share four network outputs when training quadrupeds.
 const hx=s.x+(quad?(index<2?.34:-.34)+(index%2?+.035:-.035):(index===0?-.09:.09)),hy=s.y;
 const kx=hx+.48*scale*Math.sin(a),ky=hy-.48*scale*Math.cos(a);
 return {hip:{x:hx,y:hy},knee:{x:kx,y:ky},
   foot:{x:kx+.50*scale*Math.sin(b),y:ky-.50*scale*Math.cos(b)}};
}
export function groundHeight(x,seed=1){
 if(x<1.0)return 0;
 const t=x-1;
 // Two centimeter-scale waves; deterministic terrain variation, no invisible scripted steps.
 return .022*Math.sin(t*3.4+seed*.17)+.014*Math.sin(t*6.9+seed*.21);
}
export function makeGaitWorld(seed=31,entity=null){
 const e=entity===null?null:validateEntity(entity);
 if(entity!==null&&!e)throw Error("Entität für Gelenk-Training ungültig");
 const quad=e?.kind==="quadruped";
 const legs=(quad?[-.23,.23,.23,-.23]:[-.23,.23]).map(hip=>({hip,knee:.27,hv:0,kv:0}));
 const s={seed,entity:e,x:.35,y:1.035*(e?.limb||1),vx:0,vy:0,phi:(gaitRng(seed)()-.5)*.045,omega:0,
  t:0,steps:0,fallen:false,reached:false,finished:false,contacts:legs.map(()=>false),legs,
  energy:0,slip:0,landings:0,contactTicks:0,flightTicks:0,score:0,history:[],lastActions:[0,0,0,0]};
 s.prevFeet=s.legs.map((_,i)=>footPosition(s,i).foot);
 return s;
}
export function makeGaitGenome(r=gaitRng(42)){
 return Array.from({length:GAIT_GENES},()=>clamp((r()+r()+r()+r()-2)*1.2,-3.5,3.5));
}
export function validGaitGenome(w){
 return Array.isArray(w)&&w.length===GAIT_GENES&&w.every(v=>typeof v==="number"&&Number.isFinite(v)&&Math.abs(v)<=4);
}
function nnAction(w,s){
 const input=[
  clamp(s.vx/4,-1,1),clamp(s.vy/4,-1,1),
  clamp((s.y-.88)/.42,-1,1),clamp(s.phi/1.1,-1,1),
  clamp(s.omega/5,-1,1),
  s.legs[0].hip/1.2,s.legs[0].knee/1.8,
  s.legs[1].hip/1.2,s.legs[1].knee/1.8,
  (s.contacts[0]||s.contacts[3])?1:-1,(s.contacts[1]||s.contacts[2])?1:-1,
  Math.sin(s.t*7.5),Math.cos(s.t*7.5),
  clamp((GAIT_GOAL-s.x)/GAIT_GOAL,0,1),
  clamp(s.legs[0].hv/6,-1,1),clamp(s.legs[1].hv/6,-1,1)
 ];
 let offset=0;const h=new Array(GAIT_HIDDEN),output=new Array(GAIT_OUTPUTS);
 for(let j=0;j<GAIT_HIDDEN;j++){
  let sum=w[offset+GAIT_INPUTS];
  for(let k=0;k<GAIT_INPUTS;k++)sum+=w[offset+k]*input[k];
  h[j]=Math.tanh(sum);offset+=GAIT_INPUTS+1;
 }
 for(let j=0;j<GAIT_OUTPUTS;j++){
  let sum=w[offset+GAIT_HIDDEN];
  for(let k=0;k<GAIT_HIDDEN;k++)sum+=w[offset+k]*h[k];
  output[j]=Math.tanh(sum);offset+=GAIT_HIDDEN+1;
 }
 return output;
}
export function gaitPolicy(w,s){
 if(!validGaitGenome(w))throw Error("Ungültige neuronale Steuerung");
 return nnAction(w,s);
}
export function gaitStep(s,genome){
 if(s.finished)return s;
 const dt=GAIT_DT,output=nnAction(genome,s);
 s.lastActions=output.slice();
 // Two hip and two knee servo motors. No scripted left/right coordination.
 let work=0;
 const e=s.entity,quad=e?.kind==="quadruped";
 const amplitude=clamp((e?.amplitude||.6)/.6,.55,1.35);
 const frequency=clamp((e?.frequency||1.7)/1.7,.7,1.45);
 const feedback=clamp((e?.feedback||5)/5,.65,1.55);
 for(let i=0;i<s.legs.length;i++){
  const leg=s.legs[i],motor=quad?(i===0||i===3?0:2):i*2;
  const targetH=output[motor]*1.08*amplitude,targetK=.8+output[motor+1]*.79;
  const hipAccel=clamp(54*frequency*(targetH-leg.hip)-7*feedback*leg.hv,-95,95);
  const kneeAccel=clamp(58*frequency*(targetK-leg.knee)-7*feedback*leg.kv,-100,100);
  leg.hv=clamp(leg.hv+hipAccel*dt,-6.2,6.2);
  leg.kv=clamp(leg.kv+kneeAccel*dt,-6.2,6.2);
  leg.hip=clamp(leg.hip+leg.hv*dt,-1.12,1.12);
  leg.knee=clamp(leg.knee+leg.kv*dt,.03,1.65);
  if(leg.hip===-1.12||leg.hip===1.12)leg.hv=0;
  if(leg.knee===.03||leg.knee===1.65)leg.kv=0;
  work+=(Math.abs(hipAccel*leg.hv)+Math.abs(kneeAccel*leg.kv))*.0008*dt;
 }
 const previousContacts=s.contacts.slice();
 s.vy-=9.81*dt;
 s.vx*=.996;
 s.x+=s.vx*dt;
 s.y+=s.vy*dt;
 s.omega*=.988;
 s.phi+=s.omega*dt;
 let netN=0,netF=0,moment=0;
 const feet=s.legs.map((_,i)=>footPosition(s,i).foot);
 const traction=(.83+gaitRng(s.seed+777)()*.3)*(e?.traction||.9)/.9;
 const weightScale=clamp(Math.sqrt(85/(e?.mass||85)),.6,1.6);
 for(let i=0;i<s.legs.length;i++){
  const foot=feet[i],prev=s.prevFeet[i],vx=(foot.x-prev.x)/dt,vy=(foot.y-prev.y)/dt;
  const penetration=groundHeight(foot.x,s.seed)-foot.y;
  const normal=clamp(190*penetration-Math.min(0,vy)*6,0,quad?16:28);
  const friction=clamp(-vx*8,-traction*normal,traction*normal);
  s.contacts[i]=normal>1;if(s.contacts[i]&&!previousContacts[i])s.landings++;
  netN+=normal;netF+=friction;
  moment+=(-normal*(foot.x-s.x)+friction*(s.y-foot.y)*.18)*(quad?.15:.36);
  s.slip+=Math.abs(vx)*(normal>1?1:0)*dt;
 }
 s.prevFeet=feet;
 s.vx=clamp(s.vx+netF*.72*weightScale*dt,-2.6,3.3);
 s.vy=clamp(s.vy+netN*weightScale*dt,-7,3.0);
 s.omega=clamp(s.omega+(moment-1.0*s.omega)*dt,-8,8);
 s.energy+=work+Math.abs(output[0]-output[2])*.0003*dt;
 s.t+=dt;s.steps++;
 if(s.contacts.some(Boolean))s.contactTicks++;else s.flightTicks++;
 s.fallen=(s.y<.63*(e?.limb||1)||Math.abs(s.phi)>1.05||!Number.isFinite(s.x));
 // Successful gait requires alternating support phases, not just a single ballistic jump.
 s.reached=s.x>=GAIT_GOAL&&!s.fallen&&s.landings>=4&&s.contactTicks/s.steps>=.30;
 s.finished=s.fallen||s.reached||s.t>=GAIT_DURATION-1e-8;
 const progress=clamp(s.x-.35,-1,GAIT_GOAL);
 s.score=progress*8+(s.reached?32+Math.max(0,GAIT_DURATION-s.t)*1.2:0)
   +(s.t/GAIT_DURATION)*3-(s.fallen?7:0)-s.energy*.10*(.85/(e?.endurance||.85))-s.slip*.12-s.flightTicks*dt*.36;
 if(s.steps%12===0||s.finished){
  s.history.push({t:s.t,x:s.x,y:s.y,phi:s.phi});
  if(s.history.length>80)s.history.shift();
 }
 return s;
}
export function gaitEpisode(w,seed,entity=null){
 if(!validGaitGenome(w))throw Error("Ungültige Steuerung");
 const s=makeGaitWorld(seed,entity);
 for(let i=0;i<=GAIT_DURATION/GAIT_DT+1&&!s.finished;i++)gaitStep(s,w);
 return {score:s.score,distance:s.x,fallen:s.fallen,reached:s.reached,
   time:s.t,energy:s.energy,slip:s.slip,landings:s.landings,contactShare:s.steps?s.contactTicks/s.steps:0};
}
export function gaitEvaluate(w,seeds,entity=null){
 if(!Array.isArray(seeds)||!seeds.length||seeds.length>20)throw Error("Ungültige Testkurse");
 const runs=seeds.map(seed=>gaitEpisode(w,seed,entity));
 return {score:runs.reduce((a,b)=>a+b.score,0)/runs.length,
  distance:runs.reduce((a,b)=>a+b.distance,0)/runs.length,
  success:runs.filter(x=>x.reached).length/runs.length,
  falls:runs.filter(x=>x.fallen).length/runs.length};
}
export function newGaitTrainer(seed=42,size=GAIT_POPULATION,entity=null){
 if(!Number.isSafeInteger(seed)||seed<1||seed>1e9||
    !Number.isInteger(size)||size<8||size>40)throw Error("Ungültige Trainingseinstellungen");
 const profile=entity===null?null:validateEntity(entity);
 if(entity!==null&&!profile)throw Error("Ungültige Entität");
 const r=gaitRng(seed+331);
 const population=Array.from({length:size},()=>makeGaitGenome(r));
 return {version:GAIT_VERSION,seed,size,entity:profile,generation:0,population,
  baseline:population[0].slice(),champion:null,bestScore:-Infinity,history:[]};
}
function mutate(w,r,rate=.14){
 return w.map(v=>r()<rate?clamp(v+(r()+r()+r()+r()-2)*.42,-4,4):v);
}
// Optional rival fitness is evaluated only on shared training seeds, never held-out tests.
export function gaitRivalOutcome(a,b){
 if(a.reached!==b.reached)return a.reached?1:-1;
 if(a.reached&&b.reached){const difference=b.time-a.time;return Math.abs(difference)<1e-8?0:difference>0?1:-1;}
 const difference=a.distance-b.distance;return Math.abs(difference)<.015?0:difference>0?1:-1;
}
export function gaitRivalTrial(ga,gb,seed,entity=null){
 if(!validGaitGenome(ga)||!validGaitGenome(gb))throw Error("Ungültiges Wettkampfmodell");
 const a=gaitEpisode(ga,seed,entity),b=gaitEpisode(gb,seed,entity);
 return {a,b,winner:gaitRivalOutcome(a,b)};
}
export function trainGaitGeneration(t,rivalWeights=null,contestSeed=null){
 const seeds=[101,203,317,439,563,677].map(n=>t.seed+n);
 const contest=validGaitGenome(rivalWeights)&&Number.isInteger(contestSeed)&&contestSeed>0&&contestSeed<=1e9;
 const opponent=contest?gaitEpisode(rivalWeights,contestSeed,t.entity):null;
 const results=t.population.map((w,i)=>{
  const test=gaitEvaluate(w,seeds,t.entity);
  const competition=contest?gaitRivalOutcome(gaitEpisode(w,contestSeed,t.entity),opponent):0;
  // Direct victory changes selection ranking; locomotion still dominates.
  return {w,i,test,competition,fitness:test.score+competition*7};
 });
 results.sort((a,b)=>b.fitness-a.fitness||a.i-b.i);
 const top=results[0],mean=results.reduce((sum,a)=>sum+a.test.score,0)/results.length;
 // Preserve an absolute locomotion benchmark even against a moving rival.
 const absolute=results.reduce((best,item)=>item.test.score>best.test.score?item:best,results[0]);
 if(absolute.test.score>t.bestScore){t.bestScore=absolute.test.score;t.champion=absolute.w.slice();}
 t.generation++;
 const holdout=gaitEvaluate(t.champion,[15001,15002,15003,15071,15133].map(n=>t.seed+n),t.entity);
 const line={generation:t.generation,mean,training:t.bestScore,
  validation:holdout.score,success:holdout.success,falls:holdout.falls};
 if(contest)line.competition=top.competition;
 t.history.push(line);if(t.history.length>1500)t.history.shift();
 const r=gaitRng(t.seed+6711*t.generation);
 const next=[results[0].w.slice(),results[1].w.slice()];
 // A hard-earned locomotion champion remains evolvable even when direct rivalry reshuffles ranking.
 if(t.champion&&!next.some(g=>g.every((v,i)=>v===t.champion[i])))next.push(t.champion.slice());
 while(next.length<t.size){
  const select=()=>{
   const a=results[Math.floor(r()*Math.min(10,results.length))],
         b=results[Math.floor(r()*Math.min(10,results.length))];
   return a.fitness>b.fitness?a.w:b.w;
  };
  const parent=select(),mate=select();
  const child=next.length%7===0?makeGaitGenome(r):mutate(parent.map((v,i)=>r()<.14?mate[i]:v),r,next.length%4===0?.28:.15);
  next.push(child);
 }
 t.population=next;
 return line;
}
export function gaitSnapshot(t){
 return {version:t.version,seed:t.seed,size:t.size,entity:t.entity||null,generation:t.generation,
  population:t.population.map(w=>w.slice()),baseline:t.baseline.slice(),
  champion:t.champion?.slice()||null,bestScore:Number.isFinite(t.bestScore)?t.bestScore:null,
  history:t.history.map(h=>({...h}))};
}
export function restoreGaitTrainer(value){
 const s=value;
 if(!s||s.version!==GAIT_VERSION||!Number.isInteger(s.seed)||s.seed<1||s.seed>1e9||
 !Number.isInteger(s.size)||s.size<8||s.size>40||
 !Number.isInteger(s.generation)||s.generation<0||s.generation>20000||
 !Array.isArray(s.population)||s.population.length!==s.size||!s.population.every(validGaitGenome)||
 !validGaitGenome(s.baseline)||!(s.champion===null||validGaitGenome(s.champion))||
 !(s.bestScore===null&&s.champion===null||Number.isFinite(s.bestScore)&&validGaitGenome(s.champion))||
 !(s.entity===undefined||s.entity===null||validateEntity(s.entity))||
 !Array.isArray(s.history)||s.history.length>1500||
 !s.history.every(x=>Number.isInteger(x.generation)&&x.generation>0&&
  ["mean","training","validation","success","falls"].every(k=>Number.isFinite(x[k]))&&
  x.success>=0&&x.success<=1&&x.falls>=0&&x.falls<=1))throw Error("Trainingsdaten ungültig oder inkompatibel");
 return {version:s.version,seed:s.seed,size:s.size,entity:s.entity?validateEntity(s.entity):null,generation:s.generation,
  population:s.population.map(w=>w.slice()),baseline:s.baseline.slice(),
  champion:s.champion?.slice()||null,bestScore:s.bestScore??-Infinity,
  history:s.history.map(h=>({...h}))};
}
