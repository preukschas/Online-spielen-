/* DMP KI-Lernarena v3: zwei unabhängig evolvierende Teams, dynamische Hindernisse.
   Didaktisches deterministisches 2D-Modell, keine kalibrierte Realphysik. */
export const ARENA_VERSION=3, INPUTS=17, HIDDEN=12, OUTPUTS=3;
export const GENE_COUNT=(INPUTS+1)*HIDDEN+(HIDDEN+1)*OUTPUTS;
export const GOAL=36, DT=1/30, MAX_TIME=24, POPULATION=28;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function rng(seed=1){let x=(seed>>>0)||1;return ()=>((x=Math.imul(x,1664525)+1013904223>>>0)/4294967296);}
export function createCourse(seed=1){
 const r=rng(seed);
 const objects=[
  {x:3.1,w:1.55,type:"ceiling",bottom:.52},
  {x:6.15,w:1.25,type:"wall",h:1.30},
  {x:9.45,w:1.50,type:"pit"},
  {x:12.5,w:.85,type:"sweeper",h:.85,amplitude:.63,period:2.7},
  {x:15.7,w:1.48,type:"crusher",bottom:.24,amplitude:.97,period:3.3},
  {x:19.3,w:1.40,type:"wall",h:1.57},
  {x:22.25,w:1.50,type:"ceiling",bottom:.46},
  {x:25.1,w:1.90,type:"pit"},
  {x:28.45,w:.95,type:"sweeper",h:.92,amplitude:.68,period:2.2},
  {x:31.3,w:1.25,type:"crusher",bottom:.20,amplitude:1.07,period:2.65},
  {x:34.2,w:.95,type:"wall",h:1.10}
 ];
 return objects.map((o,i)=>({...o,id:i,
  x:o.x+(r()-.5)*.26,w:o.w+(r()-.5)*.14,
  h:o.h?o.h+(r()-.5)*.12:0,
  phase:r()*Math.PI*2}));
}
export function obstacleAt(o,t=0){
 const a=o.amplitude||0;
 const phase=t*(2*Math.PI/(o.period||1))+(o.phase||0);
 if(o.type==="sweeper")return {...o,x:o.x+a*Math.sin(phase),bottom:0,top:o.h,velocity:a*Math.cos(phase)*2*Math.PI/o.period};
 if(o.type==="crusher")return {...o,bottom:o.bottom+a*(.5+.5*Math.sin(phase)),top:2.40,
  velocity:a*.5*Math.cos(phase)*2*Math.PI/o.period};
 if(o.type==="ceiling")return {...o,top:2.4,velocity:0};
 if(o.type==="wall")return {...o,bottom:0,top:o.h,velocity:0};
 return {...o,bottom:-10,top:-10,velocity:0};
}
export function randomGenome(r){return Array.from({length:GENE_COUNT},()=>clamp((r()+r()+r()-1.5)*1.65,-3.8,3.8));}
export function validGenome(g){return Array.isArray(g)&&g.length===GENE_COUNT&&g.every(v=>typeof v==="number"&&Number.isFinite(v)&&Math.abs(v)<=4);}
export function policy(g,s){
 if(!validGenome(g))throw Error("Ungültige Steuerungsgewichte");
 const near=s.course.map(o=>obstacleAt(o,s.t)).filter(o=>o.x+o.w>=s.x-.17).sort((a,b)=>a.x-b.x);
 const o=near[0],following=near[1];
 const d=o?o.x-s.x-.22:8;
 const features=[
  clamp(d/4,-1,1),o?clamp(o.w/2.1,0,1):0,o?clamp(o.h/2,0,1):0,
  o?.type==="wall"?1:0,o?.type==="pit"?1:0,o?.type==="ceiling"?1:0,
  o?.type==="crusher"?1:0,o?.type==="sweeper"?1:0,
  o?clamp((o.bottom??0)/1.5,-1,1):0,o?clamp(o.velocity/2,-1,1):0,
  clamp(s.vx/7,-1,1),clamp(s.vy/7,-1,1),clamp(s.y/2.6,-1,1),
  s.grounded?1:-1,s.crouched?1:-1,clamp((GOAL-s.x)/GOAL,0,1),
  following?clamp((following.x-s.x)/8,-1,1):1
 ];
 const hidden=Array(HIDDEN),out=Array(OUTPUTS);let p=0;
 for(let i=0;i<HIDDEN;i++){
  let v=g[p+INPUTS];for(let j=0;j<INPUTS;j++)v+=features[j]*g[p+j];
  hidden[i]=Math.tanh(v);p+=INPUTS+1;
 }
 for(let i=0;i<OUTPUTS;i++){
  let v=g[p+HIDDEN];for(let j=0;j<HIDDEN;j++)v+=hidden[j]*g[p+j];
  out[i]=Math.tanh(v);p+=HIDDEN+1;
 }
 return {drive:out[0],jump:out[1],crouch:out[2],sensors:{distance:d,kind:o?.type||"none",clearance:o?.bottom||0}};
}
export function makeEpisode(seed=1){
 return {seed,course:createCourse(seed),x:.6,y:0,vx:0,vy:0,t:0,
  grounded:true,crouched:false,blocked:false,finished:false,reached:false,failed:false,
  jumps:0,duckSteps:0,hits:0,energy:0,score:0,steps:0,lastDrive:0,lastJump:0,lastCrouch:0};
}
function onPit(course,x){return course.some(o=>o.type==="pit"&&x>o.x+.11&&x<o.x+o.w-.11);}
export function stepEpisode(s,g){
 if(s.finished)return s;
 const action=policy(g,s),{drive,jump,crouch}=action;
 s.crouched=crouch>.12;
 if(s.crouched)s.duckSteps++;
 if(s.grounded&&!s.crouched&&jump>.20){
  s.vy=6.1+Math.max(0,jump)*.60;s.grounded=false;s.jumps++;s.energy+=.66;
 }
 const friction=s.grounded?.973:.991;
 s.vx=clamp((s.vx+drive*19*DT)*friction,-3.1,s.crouched?4.1:6.8);
 const prevX=s.x,prevY=s.y,simTime=s.t+DT;
 let nextX=clamp(prevX+s.vx*DT,.2,GOAL+.25);
 let nextY=prevY+s.vy*DT-.5*9.81*DT*DT;
 s.vy-=9.81*DT;
 // Abgründe sind echte Bodenlücken: ohne Sprung fällt der Roboter.
 let surface=onPit(s.course,nextX)?-Infinity:0;
 for(const raw of s.course){
  if(raw.type!=="wall")continue;
  const o=obstacleAt(raw,simTime);
  if(nextX+.21>o.x&&nextX-.21<o.x+o.w&&prevY>=o.top-.045)
   surface=Math.max(surface,o.top);
 }
 if(Number.isFinite(surface)&&nextY<=surface&&s.vy<=0&&prevY>=surface-.05){
  nextY=surface;s.vy=0;s.grounded=true;
 }else s.grounded=false;
 // Unterschiedliche Körperhöhe: Ducken statt nur Springen.
 const bodyHeight=s.crouched?.33:.84,half=.21;
 let contact=false;
 for(const raw of s.course){
  if(raw.type==="pit")continue;
  const o=obstacleAt(raw,simTime);
  if(nextX+half<=o.x||nextX-half>=o.x+o.w)continue;
  if(nextY>=o.top-.025||nextY+bodyHeight<=o.bottom+.025)continue;
  contact=true;
  // Wenn ein Hindernis auf den Körper zurollt, bleibt die Position stabil;
  // der Kontakt ist nicht zu einer erfolgreichen Passage umdeutbar.
  nextX=prevX;s.vx=0;
  break;
 }
 if(contact&&!s.blocked)s.hits++;
 s.blocked=contact;s.x=nextX;s.y=nextY;
 if(s.y<-.48){s.failed=true;s.finished=true;}
 s.lastDrive=drive;s.lastJump=jump;s.lastCrouch=crouch;
 s.energy+=(Math.abs(drive)*.07+Math.max(0,jump)*.016+(s.crouched?.032:0))*DT;
 s.t+=DT;s.steps++;
 if(s.x>=GOAL||s.t>=MAX_TIME-1e-7){
  s.finished=true;s.reached=s.x>=GOAL&&!s.failed;
 }
 s.score=Math.max(0,s.x-.6)+(s.reached?28+(MAX_TIME-s.t)*.43:0)
  -s.jumps*.09-s.hits*.42-s.energy*.035-(s.failed?6:0);
 return s;
}
export function runEpisode(g,seed=1){
 if(!validGenome(g))throw Error("Ungültige Gewichte");
 const s=makeEpisode(seed);
 for(let i=0;i<Math.ceil(MAX_TIME/DT)+2&&!s.finished;i++)stepEpisode(s,g);
 return {score:s.score,x:s.x,reached:s.reached,failed:s.failed,t:s.t,jumps:s.jumps,
  hits:s.hits,duckSteps:s.duckSteps,energy:s.energy};
}
export function evaluateGenome(g,seeds){
 if(!validGenome(g)||!Array.isArray(seeds)||!seeds.length)throw Error("Ungültige Auswertung");
 const trials=seeds.map(seed=>runEpisode(g,seed));
 return {score:trials.reduce((v,t)=>v+t.score,0)/trials.length,
  distance:trials.reduce((v,t)=>v+t.x,0)/trials.length,
  success:trials.filter(t=>t.reached).length/trials.length,trials};
}
function newTeam(r,size){return {population:Array.from({length:size},()=>randomGenome(r)),champion:null,bestScore:-Infinity};}
export function newTrainer(seed=42,size=POPULATION){
 if(!Number.isSafeInteger(seed)||seed<1||seed>1e9||!Number.isInteger(size)||size<8||size>64)
  throw Error("Ungültige Trainingseinstellungen");
 return {version:ARENA_VERSION,seed,size,generation:0,
  teams:{blue:newTeam(rng(seed+404),size),green:newTeam(rng(seed+17421),size)},
  history:[],last:null};
}
function mutate(parent,r,rate){
 const g=parent.slice();
 for(let i=0;i<g.length;i++)if(r()<rate)g[i]=clamp(g[i]+(r()+r()+r()+r()-2)*.58,-4,4);
 return g;
}
function nextPopulation(evaluated,seed,size){
 const r=rng(seed),next=[evaluated[0].weights.slice(),evaluated[1].weights.slice()];
 const pool=evaluated.slice(0,Math.min(14,size));
 const select=()=>{
  const a=pool[Math.floor(r()*pool.length)],b=pool[Math.floor(r()*pool.length)];
  return a.fitness>b.fitness?a:b;
 };
 while(next.length<size){
  const a=select().weights,b=select().weights;
  next.push(next.length%7===0?randomGenome(r):mutate(
   a.map((v,i)=>r()<.20?b[i]:v),r,next.length%4===0?.34:.21));
 }
 return next;
}
export function raceResult(a,b){
 // Zielzeit entscheidet beim Zieleinlauf, sonst zurückgelegte Distanz.
 if(a.reached!==b.reached)return a.reached?1:-1;
 if(a.reached&&b.reached&&Math.abs(a.t-b.t)>1e-6)return a.t<b.t?1:-1;
 if(Math.abs(a.x-b.x)>.02)return a.x>b.x?1:-1;
 if(Math.abs(a.score-b.score)>.02)return a.score>b.score?1:-1;
 return 0;
}
export function trainGeneration(t){
 const seeds=[t.seed+101,t.seed+202];
 // Gleiche Strecken für beide Teams: jede Steuerung wird selbst gefahren.
 const scored={};
 for(const team of ["blue","green"])
  scored[team]=t.teams[team].population.map((weights,index)=>({
   index,weights,metrics:evaluateGenome(weights,seeds)}));
 const results={};
 for(const [team,opponent] of [["blue","green"],["green","blue"]]){
  const list=scored[team],against=scored[opponent];
  for(const row of list){
   const foe=against[row.index];
   const margin=row.metrics.score-foe.metrics.score;
   const wins=row.metrics.trials.reduce((v,trial,k)=>v+raceResult(trial,foe.metrics.trials[k]),0)/seeds.length;
   row.fitness=row.metrics.score+1.7*wins+1.15*Math.tanh(margin/8);
   row.wins=wins;
  }
  list.sort((a,b)=>b.fitness-a.fitness);
  const bestByDistance=list.reduce((a,b)=>a.metrics.score>=b.metrics.score?a:b);
  const state=t.teams[team];
  if(bestByDistance.metrics.score>state.bestScore){
   state.bestScore=bestByDistance.metrics.score;state.champion=bestByDistance.weights.slice();
  }
  const validated=evaluateGenome(state.champion,[t.seed+15001,t.seed+15002]);
  results[team]={mean:list.reduce((v,x)=>v+x.metrics.score,0)/list.length,
   training:state.bestScore,validation:validated.score,success:validated.success,
   wins:list.reduce((v,x)=>v+x.wins,0)/list.length};
  state.population=nextPopulation(list,t.seed+(t.generation+1)*7717+(team==="blue"?19:1037),t.size);
 }
 t.generation++;
 const championBlue=evaluateGenome(t.teams.blue.champion,[t.seed+25001,t.seed+25002]);
 const championGreen=evaluateGenome(t.teams.green.champion,[t.seed+25001,t.seed+25002]);
 const headToHead=championBlue.trials.reduce((a,run,i)=>a+raceResult(run,championGreen.trials[i]),0);
 const entry={generation:t.generation,blue:results.blue,green:results.green,headToHead};
 t.history.push(entry);if(t.history.length>2000)t.history.shift();
 t.last=entry;return entry;
}
export function snapshot(t){
 return {version:ARENA_VERSION,seed:t.seed,size:t.size,generation:t.generation,
  teams:Object.fromEntries(["blue","green"].map(team=>[team,{
   population:t.teams[team].population.map(g=>g.slice()),
   champion:t.teams[team].champion?.slice()||null,
   bestScore:Number.isFinite(t.teams[team].bestScore)?t.teams[team].bestScore:null
  }])),history:t.history.map(x=>JSON.parse(JSON.stringify(x)))};
}
export function restoreTrainer(x){
 if(!x||x.version!==ARENA_VERSION||!Number.isInteger(x.seed)||x.seed<1||x.seed>1e9||
  !Number.isInteger(x.size)||x.size<8||x.size>64||
  !Number.isInteger(x.generation)||x.generation<0||x.generation>20000||
  !x.teams||!Array.isArray(x.history)||x.history.length>2000||
  !x.history.every(h=>Number.isInteger(h.generation)&&h.generation>0&&
    ["blue","green"].every(team=>h[team]&&["mean","training","validation","success","wins"].every(k=>Number.isFinite(h[team][k]))))||
  ["blue","green"].some(team=>{
   const z=x.teams[team];return !z||!Array.isArray(z.population)||z.population.length!==x.size||
    !z.population.every(validGenome)||!(z.champion===null||validGenome(z.champion))||
    !(z.bestScore===null&&z.champion===null||Number.isFinite(z.bestScore)&&z.champion!==null);
  })||x.history.length!==x.generation&&x.generation<2000)
  throw Error("Trainingsdatei passt nicht zur Zwei-Team-Arena v3.");
 return {...x,teams:Object.fromEntries(["blue","green"].map(team=>[team,{
   population:x.teams[team].population.map(g=>g.slice()),
   champion:x.teams[team].champion?.slice()||null,bestScore:x.teams[team].bestScore??-Infinity}])),
  history:x.history.map(v=>JSON.parse(JSON.stringify(v))),last:x.history.at(-1)||null};
}
