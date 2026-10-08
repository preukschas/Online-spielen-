import test from "node:test";
import assert from "node:assert/strict";
import {makeSim,stepSim,measure,evaluateWalker,trainOneGeneration,arenaBatch,trainedToArena,crashDamageLevel} from "../engine.js";
function advance(sim,n=120){for(let i=0;i<n&&!sim.finished;i++)stepSim(sim);}
test("Freier Fall ohne Schwerkraft",()=>{const s=makeSim("physics","fall",{gravity:0,height:10,bounce:0});advance(s);assert.equal(s.body.y,10);});
test("Freier Fall in einer Sekunde",()=>{const s=makeSim("physics","fall",{gravity:9.81,height:16,bounce:0});advance(s);assert.ok(Math.abs(s.body.y-11.095)<.1);});
test("Pendel bleibt numerisch endlich",()=>{const s=makeSim("physics","pendulum");advance(s,1000);assert.ok(Number.isFinite(s.body.angle)&&Math.abs(s.body.angle)<2);});
test("Rampe erreicht Endpunkt",()=>{const s=makeSim("physics","ramp");advance(s,2500);assert.equal(s.body.d,13);assert.equal(s.finished,true);});
test("Kugelkollision erhält linearen Impuls",()=>{const s=makeSim("physics","collision");const p=s.p;const before=p.massA*s.body.v1+p.massB*s.body.v2;advance(s,250);const after=p.massA*s.body.v1+p.massB*s.body.v2;assert.ok(s.body.hit);assert.ok(Math.abs(after-before)<1e-6);});
test("Crashtest bildet positiven Kontakt ab",()=>{const s=makeSim("crash","barrier");advance(s,1500);assert.ok(s.body.maxG>0);assert.ok(s.body.maxCompression>0);assert.ok(s.body.maxCompression<=s.p.crush);});
test("Biomechanik trainiert 25 Generationen und validiert",()=>{const s=makeSim("bio","walker");s.training.running=true;s.training.targetGeneration=25;for(let i=0;i<25;i++)trainOneGeneration(s);assert.equal(s.training.generation,25);assert.equal(s.training.running,false);assert.ok(Number.isFinite(s.training.validation.score));assert.ok(trainedToArena(s.training.best)>=1);});
test("Biomechanik-Evaluation ist wiederholbar",()=>{const s=makeSim("bio","walker");const g={amplitude:.55,frequency:1.5,feedback:4.5};assert.deepEqual(evaluateWalker(s.p,g,21),evaluateWalker(s.p,g,21));});
test("Arena erreicht Ziel und beendet das Rennen",()=>{const s=makeSim("arena","race",{nameA:"Robo Grün",nameB:"Robo Gold"});advance(s,8000);assert.equal(s.finished,true);assert.ok(s.body.winner);assert.equal(s.body.racers[0].name,"Robo Grün");});
test("Arena 10 Durchläufe mit Seitenwechsel",()=>{const s=makeSim("arena","race");const w=arenaBatch(s.p,123,10);assert.equal(w.reduce((a,b)=>a+b),10);});
test("Simulationswiederholung mit gleichem Startwert",()=>{const a=makeSim("physics","fall",{},77),b=makeSim("physics","fall",{},77);advance(a,300);advance(b,300);assert.deepEqual(a.body,b.body);assert.deepEqual(measure(a),measure(b));});

test("Gelenkmotoren im Zweibeiner bleiben innerhalb der Winkelgrenzen",()=>{
 const s=makeSim("bio","walker",{},15);advance(s,1000);
 assert.equal(s.body.legs.length,2);
 for(const l of s.body.legs){assert.ok(l.hip>=-.85&&l.hip<=.85);assert.ok(l.knee>=0&&l.knee<=1.6);assert.ok(Number.isFinite(l.hipRate));}
});
test("Vierbeiner hat vier motorisierte Beine und reproduzierbare Kontakte",()=>{
 const a=makeSim("bio","quad",{},117),b=makeSim("bio","quad",{},117);
 assert.equal(a.body.legs.length,4);
 advance(a,1000);advance(b,1000);
 assert.deepEqual(a.body,b.body);
 assert.ok(a.body.contacts>=0&&a.body.contacts<=4);
});
test("Vierbeiner trainiert 25 Generationen",()=>{
 const s=makeSim("bio","quad",{},23);s.training.running=true;s.training.targetGeneration=25;
 for(let i=0;i<25;i++)trainOneGeneration(s);
 assert.equal(s.training.generation,25);
 assert.ok(Number.isFinite(s.training.validation.score));
});
test("Sprint ist ein eigenes Rennen ohne Hindernisstrafen",()=>{
 const s=makeSim("arena","sprint",{},77);advance(s,8000);
 assert.equal(s.finished,true);
 assert.equal(s.body.racers[0].penalty,0);
 assert.equal(s.body.racers[1].penalty,0);
 assert.ok(s.body.winner);
});
test("Arena vergleicht 50 Startzuordnungen",()=>{
 for(const preset of ["race","sprint"]){
  const params=makeSim("arena",preset).p;
  const wins=arenaBatch(params,77,50,preset);
  assert.equal(wins.reduce((a,b)=>a+b,0),50);
 }
});

test("Lern-Evaluation entspricht dem simulierten Lauf bei gleichem Seed",()=>{
 for(const preset of ["walker","quad"]){
  const params={amplitude:.65,frequency:1.4,feedback:5,traction:.8,mass:55};
  const s=makeSim("bio",preset,params,14);
  advance(s,1680);
  const e=evaluateWalker(s.p,{},14);
  assert.ok(Math.abs(s.body.x-e.distance)<1e-8);
  assert.ok(Math.abs(s.body.energy-e.energy)<1e-8);
 }
});

test("Mechanik: Hebel-Momentgleichgewicht ohne Bewegung",()=>{
 const s=makeSim("mechanics","lever",{armA:2,armB:1,force:50,load:100},17);
 advance(s,1200);
 assert.ok(Math.abs(s.body.angle)<1e-10);
 assert.ok(Math.abs(s.body.omega)<1e-10);
 assert.ok(Math.abs(s.body.torque)<1e-10);
});
test("Mechanik: Hebel erreicht Anschlag, überschreitet Winkelbegrenzung nicht",()=>{
 const s=makeSim("mechanics","lever",{armA:3,armB:.5,force:180,load:0,inertia:.5},7);
 advance(s,2000);
 assert.ok(s.body.angle<=.7&&s.body.angle>=-.7);
 assert.equal(s.body.stop,true);
 assert.equal(s.body.omega,0);
});
test("Mechanik: Kurbel-Schubstange Länge eingehalten",()=>{
 const s=makeSim("mechanics","crank",{crank:.9,rod:1.2,rpm:180},7);
 for(let i=0;i<1200;i++){
  stepSim(s);
  const {angle,position,velocity}=s.body;
  const x=.9*Math.cos(angle),y=.9*Math.sin(angle);
  assert.ok(Math.abs(Math.hypot(position-x,y)-1.2)<1e-9);
  assert.ok(Number.isFinite(velocity));
 }
});
test("Mechanik: Zahnradübersetzung, Drehrichtung, Wirkungsgrad",()=>{
 const p={teethA:20,teethB:40,rpm:100,torque:40,efficiency:.8};
 const s=makeSim("mechanics","gears",p,5);
 advance(s,120);
 assert.ok(Math.abs(s.body.rpmB+50)<1e-9);
 assert.ok(Math.abs(s.body.torqueB-64)<1e-9);
 const omegaIn=100*2*Math.PI/60,omegaOut=Math.abs(s.body.rpmB)*2*Math.PI/60;
 assert.ok(Math.abs(s.body.torqueB*omegaOut/(p.torque*omegaIn)-.8)<1e-9);
 assert.ok(Math.abs(s.body.angleB+p.teethA/p.teethB*s.body.angleA-Math.PI/p.teethB)<1e-9);
});
test("Mechanik: identische Parameter liefern reproduzierbare Messwerte",()=>{
 for(const preset of ["lever","crank","gears"]){
  const a=makeSim("mechanics",preset,{},992),b=makeSim("mechanics",preset,{},992);
  advance(a,480);advance(b,480);
  assert.deepEqual(a.body,b.body);
  assert.deepEqual(a.history,b.history);
  assert.equal(measure(a).read.length,4);
 }
});

test("Schiefe Ebene: Strecke nimmt talwärts zu, keine Eigenbewegung ohne Schwerkraft",()=>{
 const down=makeSim("physics","ramp",{gravity:9.81,angle:24,friction:.12});advance(down,120);
 assert.ok(down.body.d>0&&down.body.v>0);
 const still=makeSim("physics","ramp",{gravity:0});advance(still,120);
 assert.equal(still.body.d,0);
});
test("Schranke kann unter modellierter Bruchkraft durchbrochen werden",()=>{
 const s=makeSim("crash","gate",{velocity:60,gateStrength:30});
 advance(s,1800);
 assert.equal(s.body.gateBroken,true);assert.ok(s.body.maxG>0);
 assert.ok(s.body.impactEnergy>0);assert.ok(s.body.damageLevel>0);
 assert.equal(s.finished,true);
});
test("Sprungrampe erzeugt Flug, Landung, Belastung und Schadensindex",()=>{
 const s=makeSim("crash","jump",{velocity:65,angle:24});
 for(let i=0;i<900&&!s.body.airborne&&!s.finished;i++)stepSim(s);
 assert.equal(s.body.airborne,true);assert.ok(s.body.y>0);
 advance(s,2500);
 assert.equal(s.body.landed,true);assert.equal(s.finished,true);
 assert.ok(s.body.maxG>0);assert.ok(s.body.damageLevel>0);
});
test("Jede der 20 Schadensstufen lässt sich aus dem Belastungsindex ableiten",()=>{
 const levels=[];
 for(let i=0;i<=20;i++){
  const ratio=i/20;
  levels.push(crashDamageLevel({maxG:45*ratio,maxCompression:.75*ratio,impactEnergy:1000*ratio,energy:1000},{crush:.75}));
 }
 assert.deepEqual(levels,Array.from({length:21},(_,i)=>i));
});
test("Biomechanik hat sichtbares Ziel und kann es erfolgreich erreichen",()=>{
 const s=makeSim("bio","walker",{targetDistance:5},42);advance(s,4000);
 assert.equal(s.body.goalReached,true);
 assert.equal(s.finished,true);
 assert.equal(measure(s).read[0][1],"5 m");
});
test("Evolution kann weitere Generationen ohne Verlust des besten Reglers trainieren",()=>{
 const s=makeSim("bio","quad",{targetDistance:8},42);
 s.training.running=true;s.training.targetGeneration=2;
 trainOneGeneration(s);trainOneGeneration(s);
 assert.equal(s.training.running,false);assert.equal(s.training.generation,2);
 const last=s.training.score;
 s.training.targetGeneration=4;s.training.running=true;
 trainOneGeneration(s);trainOneGeneration(s);
 assert.equal(s.training.generation,4);assert.equal(s.training.history.length,4);
 assert.ok(s.training.score>=last);assert.ok(Number.isFinite(s.training.validation.score));
});
