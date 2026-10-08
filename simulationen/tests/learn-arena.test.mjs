import test from "node:test";
import assert from "node:assert/strict";
import {
 ARENA_VERSION,GOAL,DT,MAX_TIME,GENE_COUNT,INPUTS,HIDDEN,OUTPUTS,rng,createCourse,obstacleAt,
 randomGenome,validGenome,policy,makeEpisode,stepEpisode,runEpisode,evaluateGenome,
 newTrainer,trainGeneration,raceResult,snapshot,restoreTrainer
} from "../learn-arena-core.js";
function constant({drive=0,jump=0,crouch=0}={}){
 const g=Array(GENE_COUNT).fill(0);
 const start=(INPUTS+1)*HIDDEN;
 [drive,jump,crouch].forEach((v,k)=>g[start+k*(HIDDEN+1)+HIDDEN]=v);
 return g;
}
test("11 deterministische Hindernisse: Mauern, Abgründe, niedrige Decken, vertikale Pressen, fahrende Kehrer",()=>{
 const a=createCourse(42),b=createCourse(43);
 assert.deepEqual(a,createCourse(42));assert.notDeepEqual(a,b);
 assert.equal(a.length,11);
 for(const type of ["wall","pit","ceiling","crusher","sweeper"])
  assert.ok(a.some(o=>o.type===type),type);
 assert.equal(a.filter(o=>o.type==="pit").length,2);
 for(const type of ["crusher","sweeper"]){
  const o=a.find(o=>o.type===type);
  const start=obstacleAt(o,0),moved=obstacleAt(o,.43);
  assert.ok(start.x!==moved.x||start.bottom!==moved.bottom);
 }
});
test("Policy hat drei verschiedene Aktionen und 17 Sensorsignale",()=>{
 assert.equal(INPUTS,17);assert.equal(OUTPUTS,3);
 const g=randomGenome(rng(11)),s=makeEpisode(21);
 assert.equal(g.length,GENE_COUNT);assert.ok(validGenome(g));
 const a=policy(g,s);
 for(const action of ["drive","jump","crouch"])
  assert.ok(Number.isFinite(a[action])&&a[action]>=-1&&a[action]<=1,action);
 for(const bad of [[],[Infinity],Array(GENE_COUNT).fill(NaN),Array(GENE_COUNT).fill(9)])
  assert.equal(validGenome(bad),false);
});
test("Niedrige Decke verlangt Ducken statt eines einfachen Sprungs",()=>{
 const stand=makeEpisode(42),duck=makeEpisode(42);
 const go=constant({drive:4,jump:-4,crouch:-4});
 const ducking=constant({drive:4,jump:-4,crouch:4});
 for(let k=0;k<175;k++){stepEpisode(stand,go);stepEpisode(duck,ducking);}
 const ceiling=stand.course.find(o=>o.type==="ceiling");
 assert.ok(stand.x<=ceiling.x-.15,"stehender Roboter bleibt vor der Decke");
 assert.ok(duck.x>ceiling.x+ceiling.w,"geduckter Roboter fährt unter der Decke durch");
 assert.ok(duck.duckSteps>0);
 assert.ok(stand.hits>0);
});
test("Abgründe bleiben gefährlich, Bewegung ist reproduzierbar und endlich",()=>{
 const g=randomGenome(rng(123)),a=makeEpisode(7),b=makeEpisode(7);
 for(let k=0;k<130;k++){stepEpisode(a,g);stepEpisode(b,g);}
 assert.deepEqual(a,b);
 for(const key of ["x","y","vx","vy","t","energy","score"])
  assert.ok(Number.isFinite(a[key]),key);
 const ended=runEpisode(g,7);
 assert.ok(ended.x>=0&&ended.x<=GOAL+.25);
 assert.ok(ended.t<=MAX_TIME+DT);
 const pit=makeEpisode(42),p=pit.course.find(o=>o.type==="pit");
 pit.x=p.x+p.w/2;pit.y=-.47;pit.vy=-1;pit.grounded=false;
 stepEpisode(p,constant());
 assert.equal(p.failed,true);assert.equal(p.reached,false);
});
test("Beide unabhängigen Teams entwickeln sich, konkurrieren und speichern ihre Chromosomen",()=>{
 const t=newTrainer(42,8),t2=newTrainer(42,8);
 assert.notDeepEqual(t.teams.blue.population,t.teams.green.population);
 assert.deepEqual(snapshot(t),snapshot(t2));
 const beforeBlue=t.teams.blue.population.map(g=>g.slice()),beforeGreen=t.teams.green.population.map(g=>g.slice());
 const first=trainGeneration(t),firstCopy=trainGeneration(t2);
 assert.deepEqual(first,firstCopy);
 assert.equal(t.generation,1);
 assert.ok(t.teams.blue.champion&&t.teams.green.champion);
 assert.ok(validGenome(t.teams.blue.champion)&&validGenome(t.teams.green.champion));
 assert.notDeepEqual(t.teams.blue.population,beforeBlue);
 assert.notDeepEqual(t.teams.green.population,beforeGreen);
 for(const team of ["blue","green"]){
  assert.ok(Number.isFinite(first[team].training)&&Number.isFinite(first[team].validation));
  assert.ok(first[team].success>=0&&first[team].success<=1);
  assert.ok(first[team].wins>=-1&&first[team].wins<=1);
 }
 assert.ok(first.headToHead>=-2&&first.headToHead<=2);
});
test("Zielzeit, Distanz und Wertung entscheiden den direkten Wettlauf",()=>{
 const a={reached:true,t:4,x:GOAL,score:70},b={reached:true,t:5,x:GOAL,score:90};
 assert.equal(raceResult(a,b),1);assert.equal(raceResult(b,a),-1);
 assert.equal(raceResult({reached:false,x:5,score:2},{reached:false,x:7,score:2}),-1);
 assert.equal(raceResult(a,a),0);
});
test("JSON speichert beide Teams, und Wiederaufnahme bleibt deterministisch",()=>{
 const t=newTrainer(1337,8);
 trainGeneration(t);trainGeneration(t);
 const restored=restoreTrainer(JSON.parse(JSON.stringify(snapshot(t))));
 assert.equal(restored.version,ARENA_VERSION);
 assert.equal(restored.generation,2);
 assert.deepEqual(snapshot(restored),snapshot(t));
 assert.deepEqual(trainGeneration(t),trainGeneration(restored));
 assert.deepEqual(snapshot(t),snapshot(restored));
});
test("ungültige/alte Imports können kein Modell beschädigen",()=>{
 const original=snapshot(newTrainer(42,8));
 const bad=[{seed:-1},{version:2},{size:64},{population:[]},
  {teams:{blue:original.teams.blue,green:{...original.teams.green,population:[]}}},
  {teams:{blue:original.teams.blue,green:{...original.teams.green,champion:Array(GENE_COUNT).fill(NaN)}}},
  {history:[{generation:1,blue:{mean:NaN},green:{mean:0}}]}];
 for(const change of bad)assert.throws(()=>restoreTrainer({...original,...change}));
 assert.throws(()=>restoreTrainer(null));
});
