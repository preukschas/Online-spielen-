import test from "node:test";
import assert from "node:assert/strict";
import {CONFIG,makeSim,stepSim} from "../engine.js";
import {drawScene} from "../render-v2.js";

function context(){
 let operations=0;
 const text=[];
 const ctx={
  canvas:{width:1000,height:560},
  createLinearGradient(){return{addColorStop(){}};},
  createRadialGradient(){return{addColorStop(){}};},
  save(){},restore(){},beginPath(){},closePath(){},clip(){},setLineDash(){},translate(){},rotate(){},scale(){},
  stroke(){operations++;},fill(){operations++;},fillRect(){operations++;},
  fillText(content){operations++;text.push(String(content));},
  rect(...args){assert.ok(args.every(Number.isFinite));},
  roundRect(...args){assert.ok(args.slice(0,5).every(Number.isFinite));},
  arc(...args){assert.ok(args.every(Number.isFinite));},
  ellipse(...args){assert.ok(args.every(Number.isFinite));},
  lineTo(...args){assert.ok(args.every(Number.isFinite));},
  moveTo(...args){assert.ok(args.every(Number.isFinite));}
 };
 return {ctx,get operations(){return operations;},text};
}
for(const [mode,config] of Object.entries(CONFIG)){
 for(const [preset] of config.presets){
  test("Grafik rendert ohne Fehler: "+mode+" / "+preset,()=>{
   const sim=makeSim(mode,preset,{},77);
   for(let i=0;i<125&&!sim.finished;i++)stepSim(sim);
   const original=JSON.stringify(sim.body);
   const view=context();
   drawScene(view.ctx,sim);
   assert.ok(view.operations>18, "Es werden Formen und Beschriftungen gezeichnet");
   assert.equal(JSON.stringify(sim.body),original,"Die Grafik verändert keine Physikdaten");
  });
 }
}
test("Grafik mit eigenen Entitäten: zwei Farben, Zweibeiner und Vierbeiner",()=>{
 const sim=makeSim("arena","race",{
  nameA:"Robo Grün",nameB:"Wolf Gold",speedA:4,speedB:3.4,
  staminaA:.9,staminaB:.8,colorA:"#75e9c3",colorB:"#ffb67a",
  kindA:"biped",kindB:"quadruped",obstacle:.5
 },54);
 const view=context();drawScene(view.ctx,sim);
 assert.ok(view.operations>40);
 assert.ok(view.text.some(x=>x.includes("Robo Grün")));
 assert.ok(view.text.some(x=>x.includes("Wolf Gold")));
});
test("Grafik mit vierbeinigem Biomechanik-Modell",()=>{
 const sim=makeSim("bio","quad",{mass:40,color:"#72b6ff",limb:1.4,torso:1.1,head:.9},19);
 const view=context();drawScene(view.ctx,sim);
 assert.ok(view.operations>35);
});
