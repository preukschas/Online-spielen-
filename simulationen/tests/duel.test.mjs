import test from "node:test";
import assert from "node:assert/strict";
import {CONFIG,makeSim,measure,stepSim,arenaBatch} from "../engine.js";
import {duelDefaultGenome,duelValidGenome,makeDuelTraining,simulateDuel,trainDuelGeneration,duelStyle,movementMetrics} from "../duel-core.js";

test("Duell ist eine auswählbare Arena-Variante",()=>{
 assert.ok(CONFIG.arena.presets.some(([name])=>name==="duel"));
 const s=makeSim("arena","duel",{nameA:"Moe",nameB:"Robo",kindB:"quadruped"},19);
 assert.equal(s.body.fighters[0].name,"Moe");
 assert.equal(s.body.fighters[1].kind,"quadruped");
 assert.equal(s.body.fighters.length,2);
 assert.equal(s.duelTraining.generation,0);
 assert.equal(measure(s).read.length,5);
});
test("Duell endet mit Sieger und endlichen Spielwerten",()=>{
 const s=makeSim("arena","duel",{duelDuration:12,nameA:"Robot A",nameB:"Robot B"},27);
 for(let i=0;i<1500&&!s.finished;i++)stepSim(s);
 assert.equal(s.finished,true);
 assert.ok(s.body.winner);
 for(const f of s.body.fighters){
  assert.ok(f.hp>=0&&f.hp<=100);
  assert.ok(Number.isFinite(f.x)&&Number.isFinite(f.energy));
  assert.ok(f.x>=0&&f.x<=12);
 }
});
test("Gleiche Duell-Startwerte führen zu identischen Resultaten",()=>{
 const p={duelDuration:12};
 const a=simulateDuel(p,[duelDefaultGenome(),duelDefaultGenome()],501);
 const b=simulateDuel(p,[duelDefaultGenome(),duelDefaultGenome()],501);
 const summary=x=>x.fighters.map(f=>[f.hp,f.points,f.hits,f.ringouts,f.x,f.energy]);
 assert.deepEqual(summary(a),summary(b));
 assert.deepEqual(a.events,b.events);
});
test("Duellaktionen führen zu Kontakten, Punkten und Bewegung",()=>{
 let hits=0,points=0,actions=new Set(),jump=false;
 for(let n=0;n<8;n++){
  const b=simulateDuel({duelDuration:24},[duelDefaultGenome(),duelDefaultGenome()],n*41+19);
  hits+=b.fighters.reduce((x,f)=>x+f.hits,0);
  points+=b.fighters.reduce((x,f)=>x+f.points,0);
  for(const e of b.events)actions.add(e.action);
  jump ||= b.fighters.some(f=>f.action==="Springen");
 }
 assert.ok(hits>0&&points>0);
 assert.ok(["Schlagen","Treten","Schubsen"].some(a=>actions.has(a)));
});
test("Evolution trainiert beide Entitäten über zusätzliche Generationen",()=>{
 const p={duelDuration:12,speedA:3.5,speedB:3.5};
 const tr=makeDuelTraining();
 tr.running=true;tr.targetGeneration=2;
 trainDuelGeneration(tr,p,99);trainDuelGeneration(tr,p,99);
 assert.equal(tr.generation,2);assert.equal(tr.running,false);
 assert.ok(tr.genomes.every(duelValidGenome));
 assert.ok(tr.scores.every(Number.isFinite));
 const before=JSON.stringify(tr.genomes);
 tr.targetGeneration=4;tr.running=true;
 trainDuelGeneration(tr,p,99);trainDuelGeneration(tr,p,99);
 assert.equal(tr.generation,4);assert.equal(tr.history.length,4);
 assert.ok(tr.wins.reduce((x,y)=>x+y)===4);
 assert.ok(tr.genomes.every(duelValidGenome));
 assert.ok(before.length>10);
});
test("Mehrfachduelle mit Seitenwechsel erhalten Anzahl der Runden",()=>{
 const p={nameA:"Blau",nameB:"Gelb",duelDuration:12};
 const wins=arenaBatch(p,33,10,"duel");
 assert.equal(wins.reduce((a,b)=>a+b),10);
});
test("Bewegungsgene steuern physikalisch wirksame Schritte und Balance",()=>{
 const a={...duelDefaultGenome(),stride:1,cadence:1,footwork:1,balance:1};
 const b={...duelDefaultGenome(),stride:0,cadence:0,footwork:0,balance:0};
 const rival=duelDefaultGenome(),params={duelDuration:12};
 const fast=simulateDuel(params,[a,rival],812);
 const slow=simulateDuel(params,[b,rival],812);
 const fa=fast.fighters[0],fb=slow.fighters[0];
 assert.ok(fa.steps>0&&fb.steps>0);
 assert.ok(fa.energySpent>=0&&fb.energySpent>=0);
 assert.notEqual(fa.steps,fb.steps,"Schrittfrequenz verändert die Zahl der Schritte");
 assert.notEqual(fa.travel,fb.travel,"Bewegungsgene wirken auf tatsächlich gelaufene Strecke");
 assert.ok(Number.isFinite(fa.pose.leftHip)&&Number.isFinite(fa.pose.rightKnee));
});
test("Sprungtechnik, Laufstil und Ausweichen sind trainierbare Gene",()=>{
 const old={aggression:.59,guard:.4,jump:.3,punch:.56,kick:.41,push:.39,range:.46};
 assert.equal(duelValidGenome(old),true,"Lernstand aus älterer Version bleibt gültig");
 const springer={...duelDefaultGenome(),spring:1,jump:1,evade:0,range:0,aggression:0,push:0,
  guard:0,stride:0,cadence:0,footwork:0,balance:0,recovery:0};
 assert.equal(duelStyle(springer),"Springer");
 assert.equal(duelValidGenome({...springer,spring:1.1}),false);
 const state=simulateDuel({duelDuration:16},[springer,duelDefaultGenome()],11);
 const metrics=movementMetrics(state.fighters[0]);
 assert.ok(Number.isFinite(metrics.travel)&&Number.isFinite(metrics.energyUsed));
 assert.ok(typeof metrics.style==="string"&&metrics.style.length>0);
});
test("Evolution bewertet auch Bewegungsleistung und bewahrt alle Bewegungsparameter",()=>{
 const training=makeDuelTraining(),p={duelDuration:12};
 training.running=true;training.targetGeneration=3;
 for(let i=0;i<3;i++)trainDuelGeneration(training,p,18);
 assert.equal(training.generation,3);
 for(const g of training.genomes){
  assert.ok(duelValidGenome(g));
  for(const k of ["stride","cadence","footwork","evade","spring","balance","recovery"])
   assert.ok(g[k]>=0&&g[k]<=1,k);
 }
 assert.ok(training.last?.movementA);
 assert.ok(training.last?.movementB);
 assert.ok(training.history.every(h=>Number.isFinite(h.training)));
});
