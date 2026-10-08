/* DMP KI-Lernarena v0.1 – echte evolvierende neuronale Steuerungen.
   Abstraktes 2D-Roboter-Lehrmodell, keine vollständige Biomechanik. */
export const ARENA_VERSION = 1;
export const INPUTS = 9, HIDDEN = 10, OUTPUTS = 2;
export const GENE_COUNT = (INPUTS + 1) * HIDDEN + (HIDDEN + 1) * OUTPUTS;
export const GOAL = 32, DT = 1/30, MAX_TIME = 18, POPULATION = 28;
const clamp = (n,a,b) => Math.min(b, Math.max(a,n));
export function rng(seed=1) {
 let s = (seed>>>0)||1;
 return () => ((s=Math.imul(s,1664525)+1013904223>>>0) / 4294967296);
}
export function createCourse(seed=1) {
 const r=rng(seed);
 return [6,13.6,21.2,27.1].map((x,i)=>({
   x:x+(r()-.5)*(i?1.0:.4), w:.65+r()*.55,
   h:.70+r()*.42, id:i
 }));
}
export function randomGenome(r) {
 return Array.from({length:GENE_COUNT},()=>clamp((r()+r()+r()-1.5)*1.35,-2.8,2.8));
}
export function validGenome(weights) {
 return Array.isArray(weights) && weights.length===GENE_COUNT && weights.every(v=>typeof v==="number"&&Number.isFinite(v)&&Math.abs(v)<=4);
}
export function policy(weights,s) {
 if(!validGenome(weights))throw Error("Ungültige Steuerungsgewichte");
 const o=s.course.find(z=>z.x+z.w >= s.x-.20);
 const d=o?o.x-s.x-.20:8;
 const input=[
    clamp(d/5,-1,1), o?o.h/1.5:0, o?o.w/1.5:0,
    clamp(s.vx/6.5,-1,1),clamp(s.vy/7,-1,1),
    clamp(s.y/2,-1,1),s.grounded?1:-1,
    clamp((GOAL-s.x)/GOAL,0,1), o?clamp((o.x+o.w-s.x)/5,-1,1):1
 ];
 const hidden=new Array(HIDDEN),out=new Array(OUTPUTS);
 let offset=0;
 for(let h=0;h<HIDDEN;h++){
   let sum=weights[offset+INPUTS];
   for(let j=0;j<INPUTS;j++)sum+=input[j]*weights[offset+j];
   hidden[h]=Math.tanh(sum);
   offset+=INPUTS+1;
 }
 for(let k=0;k<OUTPUTS;k++){
   let sum=weights[offset+HIDDEN];
   for(let h=0;h<HIDDEN;h++)sum+=hidden[h]*weights[offset+h];
   out[k]=Math.tanh(sum);
   offset+=HIDDEN+1;
 }
 return {drive:out[0],jump:out[1],sensors:{distance:d,height:o?.h||0}};
}
export function makeEpisode(seed=1) {
 return {seed,course:createCourse(seed),x:.6,y:0,vx:0,vy:0,t:0,
   grounded:true,blocked:false,finished:false,reached:false,
   jumps:0,hits:0,energy:0,score:0,steps:0,lastDrive:0,lastJump:0};
}
export function stepEpisode(s,weights) {
 if(s.finished)return s;
 const action=policy(weights,s);
 let {drive,jump}=action;
 const friction=s.grounded?.978:.994;
 s.vx=clamp((s.vx+drive*19*DT)*friction,-2.5,6.7);
 const oldY=s.y;
 if(s.grounded&&jump>.23){
   s.vy=5.8+Math.max(0,jump)*.45;
   s.grounded=false;s.jumps++;
   s.energy+=.7;
 }
 let nextX=clamp(s.x+s.vx*DT,.25,GOAL+.2);
 let blocked=false;
 if(s.vx>0){
   for(const o of s.course){
     if(s.x+.22<=o.x+.03&&nextX+.22>o.x&&s.y<o.h-.04){
       nextX=Math.min(nextX,o.x-.22);
       s.vx=0;blocked=true;break;
     }
   }
 }
 if(blocked&&!s.blocked)s.hits++;
 s.blocked=blocked;
 s.x=nextX;
 let nextY=s.y+s.vy*DT-.5*9.81*DT*DT;
 s.vy-=9.81*DT;
 let surface=0;
 for(const o of s.course) {
   if(s.x+.20>o.x && s.x-.20<o.x+o.w && oldY>=o.h-.035)
      surface=Math.max(surface,o.h);
 }
 if(nextY<=surface&&s.vy<=0&&oldY>=surface-.045) {
   nextY=surface;s.vy=0;s.grounded=true;
 } else s.grounded=false;
 s.y=Math.max(-.1,nextY);
 if(s.y<0){s.y=0;s.vy=0;s.grounded=true;}
 s.lastDrive=drive;s.lastJump=jump;
 s.energy+=(Math.abs(drive)*.045+Math.max(0,jump)*.015)*DT;
 s.t+=DT;s.steps++;
 if(s.x>=GOAL||s.t>=MAX_TIME-1e-8){
   s.finished=true;s.reached=s.x>=GOAL;
 }
 // Endwert ist immer aus realen Bewegungszuständen berechnet; kein vorprogrammiertes Fortschrittsschema.
 s.score=Math.max(0,s.x-.6) + (s.reached?20+(MAX_TIME-s.t)*.28:0)
   -s.jumps*.10-s.hits*.25-s.energy*.045;
 return s;
}
export function runEpisode(weights,seed=1) {
 const s=makeEpisode(seed);
 for(let n=0;n<Math.ceil(MAX_TIME/DT)+2&&!s.finished;n++)stepEpisode(s,weights);
 return {score:s.score,x:s.x,reached:s.reached,t:s.t,jumps:s.jumps,hits:s.hits,energy:s.energy};
}
export function evaluateGenome(weights,seeds) {
 if(!validGenome(weights)||!Array.isArray(seeds)||!seeds.length)throw Error("Ungültige Auswertung");
 const trials=seeds.map(seed=>runEpisode(weights,seed));
 return {score:trials.reduce((a,t)=>a+t.score,0)/trials.length,
  distance:trials.reduce((a,t)=>a+t.x,0)/trials.length,
  success:trials.filter(t=>t.reached).length/trials.length,trials};
}
export function newTrainer(seed=42,size=POPULATION) {
 if(!Number.isSafeInteger(seed)||seed<1||seed>1e9||!Number.isInteger(size)||size<8||size>64)throw Error("Ungültige Trainingseinstellungen");
 const r=rng(seed+404);
 const population=Array.from({length:size},()=>randomGenome(r));
 const baseline=population[0].slice();
 return {version:ARENA_VERSION,seed,size,generation:0,population,baseline,
  champion:null,bestScore:-Infinity,history:[],last:null};
}
function mutated(parent,r,rate=.18){
 const weights=parent.slice();
 for(let i=0;i<weights.length;i++)if(r()<rate)weights[i]=clamp(weights[i]+(r()+r()+r()+r()-2)*.52,-4,4);
 return weights;
}
export function trainGeneration(t) {
 const trainingSeeds=[t.seed+101,t.seed+202];
 const evaluated=t.population.map((g,i)=>({index:i,weights:g,metrics:evaluateGenome(g,trainingSeeds)}));
 evaluated.sort((a,b)=>b.metrics.score-a.metrics.score);
 const best=evaluated[0],mean=evaluated.reduce((a,x)=>a+x.metrics.score,0)/evaluated.length;
 if(best.metrics.score>t.bestScore){
   t.bestScore=best.metrics.score;t.champion=best.weights.slice();
 }
 t.generation++;
 const valid=t.champion?evaluateGenome(t.champion,[t.seed+15001,t.seed+15002]):null;
 const entry={generation:t.generation,mean,training:t.bestScore,
   validation:valid.score,success:valid.success};
 t.history.push(entry);if(t.history.length>2000)t.history.shift();
 t.last={...entry,trainingBest:best.metrics.score};
 const r=rng(t.seed+t.generation*7717);
 const next=[evaluated[0].weights.slice(),evaluated[1].weights.slice()];
 while(next.length<t.size){
   const select=()=>{
     const a=evaluated[Math.floor(r()*Math.min(12,evaluated.length))];
     const b=evaluated[Math.floor(r()*Math.min(12,evaluated.length))];
     return a.metrics.score>b.metrics.score?a:b;
   };
   const a=select().weights,b=select().weights;
   const child=next.length%4===0?randomGenome(r):mutated(
     a.map((v,i)=>r()<.18?b[i]:v),r,next.length%5===0?.35:.19);
   next.push(child);
 }
 t.population=next;
 return entry;
}
export function snapshot(t) {
 return {version:ARENA_VERSION,seed:t.seed,size:t.size,generation:t.generation,
   population:t.population.map(w=>w.slice()),baseline:t.baseline.slice(),
   champion:t.champion?.slice()||null,bestScore:Number.isFinite(t.bestScore)?t.bestScore:null,
   history:t.history.map(h=>({...h}))};
}
export function restoreTrainer(x) {
 if(!x||x.version!==ARENA_VERSION||!Number.isInteger(x.seed)||x.seed<1||x.seed>1e9||
  !Number.isInteger(x.size)||x.size<8||x.size>64||
  !Number.isInteger(x.generation)||x.generation<0||x.generation>20000||
  !Array.isArray(x.population)||x.population.length!==x.size||
  !x.population.every(validGenome)||!validGenome(x.baseline)||
  !(x.champion===null||validGenome(x.champion))||
  !Array.isArray(x.history)||x.history.length>2000||
  !x.history.every(h=>Number.isInteger(h.generation)&&h.generation>0&&
    ["mean","training","validation","success"].every(k=>typeof h[k]==="number"&&Number.isFinite(h[k]))&&h.success>=0&&h.success<=1)||
  !(x.bestScore===null&&x.champion===null||Number.isFinite(x.bestScore)&&x.champion!==null)
 )throw Error("Die Trainingsdatei ist ungültig oder nicht kompatibel.");
 return {...x,population:x.population.map(w=>w.slice()),baseline:x.baseline.slice(),
   champion:x.champion?.slice()||null,bestScore:x.bestScore??-Infinity,
   history:x.history.map(h=>({...h})),last:x.history.at(-1)||null};
}
