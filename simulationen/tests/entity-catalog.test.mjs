import test from "node:test";
import assert from "node:assert/strict";
import {ENTITY_KEY,ENTITY_LIMIT,newEntity,validateEntity,toBiomechanics,toArena,safeEntityList} from "../entity-model.js";
import {ENTITY_CATALOG,catalogEntity,installCatalog} from "../entity-catalog.js";
import {drawCharacter,characterThumbnail} from "../entity-art.js";
import {makeSim,stepSim} from "../engine.js";
function storage(items=[]){
 const values=new Map([[ENTITY_KEY,JSON.stringify(items)]]);
 return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
}
test("Zehn unterschiedliche Figuren inklusive realistischen Tiermassen",()=>{
 assert.equal(ENTITY_CATALOG.length,10);
 assert.equal(new Set(ENTITY_CATALOG.map(x=>x.key)).size,10);
 for(const item of ENTITY_CATALOG){
  const e=catalogEntity(item);assert.ok(e,item.key);
  assert.equal(e.appearance,item.appearance);
  assert.equal(e.mass,item.mass);
  assert.ok(toArena(e));
  assert.ok(toBiomechanics(e));
 }
 assert.equal(catalogEntity("horse").mass,500);
 assert.equal(catalogEntity("cat").mass,4.5);
 assert.equal(catalogEntity("ostrich").kind,"biped");
});
test("Zeichnungen sind typspezifisch, sichere Artennamen und alte JSONs kompatibel",()=>{
 const legacy=newEntity("animal","old");
 assert.equal(validateEntity(legacy).appearance,"generic");
 assert.equal(validateEntity({...legacy,appearance:"<img src=x>"}),null);
 assert.equal(validateEntity({...legacy,appearance:"human"}),null);
 const horse=catalogEntity("horse");
 assert.equal(validateEntity({...horse,kind:"biped"}),null);
 assert.equal(validateEntity({...horse,mass:651}),null);
 assert.ok(validateEntity({...horse,mass:650}));
});
test("Automatische Erstinstallation bewahrt geänderte Entitäten und verhindert Doppelungen",()=>{
 const st=storage(),r=installCatalog(st);
 assert.deepEqual(r,{added:10,skipped:0,ok:true});
 assert.equal(safeEntityList(st).length,10);
 assert.equal(installCatalog(st).added,0);
 const changes=safeEntityList(st);
 const wolf=changes.find(e=>e.id==="catalog-wolf");
 wolf.name="Mein eigener Wolf";st.setItem(ENTITY_KEY,JSON.stringify(changes));
 assert.equal(installCatalog(st).added,0);
 assert.equal(safeEntityList(st).find(e=>e.id==="catalog-wolf").name,"Mein eigener Wolf");
});
test("Vorlagen füllen keine volle Bibliothek über das 40er-Limit",()=>{
 const all=Array.from({length:ENTITY_LIMIT-2},(_,i)=>newEntity("human","custom"+i));
 const st=storage(all),result=installCatalog(st);
 assert.equal(result.added,2);assert.equal(result.skipped,8);
 assert.equal(safeEntityList(st).length,ENTITY_LIMIT);
 const blocked={getItem:()=>null,setItem:()=>{throw Error("Storage disabled");}};
 assert.equal(installCatalog(blocked).ok,false);
});
test("10 SVG-Stilfiguren erzeugen darstellbare Knoten",()=>{
 const previous=globalThis.document;
 try{
  globalThis.document={createElementNS:(ns,tag)=>({
   tag,attributes:{},children:[],setAttribute(k,v){this.attributes[k]=v;},
   append(node){this.children.push(node);}
  })};
  for(const item of ENTITY_CATALOG){
   const entity=catalogEntity(item),root={children:[],append(node){this.children.push(node);}};
   assert.equal(drawCharacter(root,entity,.3),true,item.key);
   assert.ok(root.children.length>10,item.key);
   const thumb=characterThumbnail(entity);
   assert.equal(thumb.tag,"svg");
   assert.ok(thumb.children.length>10);
  }
 }finally{globalThis.document=previous;}
});
test("Klein- und Großtiermassen laufen im didaktischen Physikkern ohne NaN",()=>{
 for(const name of ["cat","horse","cheetah","ostrich"]){
  const entity=catalogEntity(name),converted=toBiomechanics(entity);
  const sim=makeSim("bio",converted.preset,converted.params,11);
  for(let i=0;i<240;i++)stepSim(sim);
  assert.ok(Number.isFinite(sim.body.x),name);
  assert.ok(Number.isFinite(sim.body.energy),name);
 }
});
