import {contacts,solveContacts,contactImpulse,firstSweptImpact,safeContactInterval} from "./builder-collision.js";
// DMP Mechanik-Baukasten – modellhafte 2D-Starrkörper mit Drehgelenken.
// SI-Einheiten: Meter, Kilogramm, Sekunden, N·m. Kein Konstruktionsnachweis.
export const BUILDER_VERSION="1.2.0";
export const DT=1/120;
const LIMIT={bodies:20,joints:25};
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const rotate=(p,a)=>({x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y});
export const worldPoint=(b,local)=>add(b,rotate(local,b.angle));
export const tip=(body,position)=>({x:(body.kind==="wheel"?body.length/2:body.length/2)*position,y:0});
const inertia=b=>b.kind==="wheel"?.125*b.mass*b.length*b.length:b.mass*(b.length*b.length+.22*.22)/12;
function normalizeBody(data,id){
 const kind=data.kind==="wheel"?"wheel":"bar";
 const length=clamp(Number(data.length)||1.2,.3,2.8);
 const mass=clamp(Number(data.mass)||2,.2,35);
 return{id,kind,name:String(data.name||"Körper "+id).slice(0,35),length,mass,
  x:clamp(Number(data.x)||0,-4.6,4.6),y:clamp(Number(data.y)||0,-3.2,2.1),
  angle:Number.isFinite(data.angle)?clamp(data.angle,-Math.PI*2,Math.PI*2):0,
  startVx:clamp(Number(data.startVx)||0,-500,500),startVy:clamp(Number(data.startVy)||0,-500,500),
  vx:clamp(Number(data.startVx)||0,-500,500),vy:clamp(Number(data.startVy)||0,-500,500),omega:0,
  invM:1/mass,invI:1/inertia({kind,length,mass})};
}
export function blank(){return{format:"DMP_MECHANIC_BUILDER",version:1,name:"Neue Maschine",gravity:9.81,
 bodies:[],joints:[],nextId:1,collisions:true,restitution:.05,friction:.35,ccd:true,contactsNow:0,ccdSubsteps:1,ccdImpacts:0};}
export function addBody(scene,kind="bar",data={}){
 if(scene.bodies.length>=LIMIT.bodies)throw Error("Maximal 20 Körper");
 const id=scene.nextId++;
 const body=normalizeBody({kind,name:kind==="wheel"?"Rad "+id:"Stange "+id,
  length:kind==="wheel"?.9:1.6,mass:2,x:-1+(scene.bodies.length%5)*.6,y:-1,...data},id);
 scene.bodies.push(body);return body;
}
export function bodyById(scene,id){return scene.bodies.find(b=>b.id===Number(id))||null}
export function addHinge(scene,bodyA,bodyB,placeA=1,placeB=-1){
 if(scene.joints.length>=LIMIT.joints)throw Error("Maximal 25 Gelenke");
 if(!bodyById(scene,bodyB))throw Error("Bitte einen gültigen Zielkörper wählen");
 if(bodyA!==0&&!bodyById(scene,bodyA))throw Error("Ausgangskörper fehlt");
 if(bodyA===bodyB)throw Error("Ein Gelenk benötigt unterschiedliche Körper");
 const b=bodyById(scene,bodyB),a=bodyA===0?null:bodyById(scene,bodyA);
 const localB=tip(b,placeB),localA=a?tip(a,placeA):{x:0,y:0};
 const anchor=a?worldPoint(a,localA):worldPoint(b,localB);
 if(a){
  // Neuer Körper B wird am Gelenk angesetzt, falls es noch keine Verbindungen hat.
  if(!scene.joints.some(j=>j.a===bodyB||j.b===bodyB)){
   const offset=rotate(localB,b.angle);b.x=anchor.x-offset.x;b.y=anchor.y-offset.y;
  }
 }
 const joint={id:scene.nextId++,a:bodyA,b:bodyB,localA:a?localA:anchor,localB,
  motor:false,rpm:25,torque:15};
 scene.joints.push(joint);return joint;
}
export function deleteBody(scene,id){scene.bodies=scene.bodies.filter(b=>b.id!==id);scene.joints=scene.joints.filter(j=>j.a!==id&&j.b!==id)}
export function deleteJoint(scene,id){scene.joints=scene.joints.filter(j=>j.id!==id)}
export function sample(name="pendulum"){
 const s=blank();
 if(name==="fast"){
  s.name="Schneller Radstoß (CCD)";s.gravity=0;
  addBody(s,"wheel",{name:"Schneller Ball",length:.8,mass:2,x:-1.6,y:-.8,startVx:220});
  addBody(s,"wheel",{name:"Zielrad",length:.8,mass:2,x:-.7,y:-.8});
 }else if(name==="collision"){
  s.name="Kollision: zwei Räder";
  addBody(s,"wheel",{name:"Rad A",length:1.2,mass:2,x:-1,y:-1.4,angle:0});
  addBody(s,"wheel",{name:"Rad B",length:1.2,mass:3,x:-.15,y:-1.4,angle:0});
 }else if(name==="motor"){
  s.name="Motorarm";
  const a=addBody(s,"bar",{name:"Motorhebel",x:0,y:-.9,length:2,angle:Math.PI/2,mass:3});
  const j=addHinge(s,0,a.id,0,-1);j.motor=true;
  j.rpm=18;j.torque=16;
 }else if(name==="double"){
  s.name="Doppelpendel";
  const a=addBody(s,"bar",{name:"Oberarm",x:-.7,y:-1,length:1.7,angle:1.15,mass:2});
  const b=addBody(s,"bar",{name:"Unterarm",x:1,y:-.1,length:1.4,angle:.35,mass:1.1});
  addHinge(s,0,a.id,0,-1);addHinge(s,a.id,b.id,1,-1);
 }else{
  s.name="Pendel";
  const a=addBody(s,"bar",{name:"Pendelstange",x:0,y:-.6,length:2.1,angle:1.1,mass:2});
  addHinge(s,0,a.id,0,-1);
 }
 return s;
}
export function snapshot(scene){
 return {format:"DMP_MECHANIC_BUILDER",version:1,name:String(scene.name).slice(0,60),
  gravity:scene.gravity,ccd:scene.ccd!==false,collisions:scene.collisions!==false,restitution:scene.restitution??.05,friction:scene.friction??.35,bodies:scene.bodies.map(b=>({id:b.id,kind:b.kind,name:b.name,
   length:b.length,mass:b.mass,x:b.x,y:b.y,angle:b.angle,startVx:b.startVx??0,startVy:b.startVy??0})),
  joints:scene.joints.map(j=>({id:j.id,a:j.a,b:j.b,localA:{...j.localA},localB:{...j.localB},
   motor:!!j.motor,rpm:j.rpm,torque:j.torque})),nextId:scene.nextId};
}
const fin=(x,min,max)=>Number.isFinite(x)&&x>=min&&x<=max;
export function validate(o){
 if(!o||o.format!=="DMP_MECHANIC_BUILDER"||o.version!==1||
  !Array.isArray(o.bodies)||!Array.isArray(o.joints)||o.bodies.length>LIMIT.bodies||
  o.joints.length>LIMIT.joints||!fin(o.gravity,0,20)||
  (o.collisions!==undefined&&typeof o.collisions!=="boolean")||
  (o.ccd!==undefined&&typeof o.ccd!=="boolean")||
  (o.restitution!==undefined&&!fin(o.restitution,0,.8))||
  (o.friction!==undefined&&!fin(o.friction,0,1))||
  typeof o.name!=="string"||o.name.length>60||!Number.isSafeInteger(o.nextId))return false;
 const ids=new Set();
 for(const b of o.bodies){
  if(!Number.isSafeInteger(b.id)||b.id<1||ids.has(b.id)||!["bar","wheel"].includes(b.kind)||
   typeof b.name!=="string"||b.name.length>35||!fin(b.length,.3,2.8)||!fin(b.mass,.2,35)||
   !fin(b.x,-5,5)||!fin(b.y,-4,3)||!fin(b.angle,-2*Math.PI,2*Math.PI)||
   (b.startVx!==undefined&&!fin(b.startVx,-500,500))||
   (b.startVy!==undefined&&!fin(b.startVy,-500,500)))return false;
  ids.add(b.id);
 }
 const jointIds=new Set();
 for(const j of o.joints){
  if(!Number.isSafeInteger(j.id)||j.id<1||ids.has(j.id)||jointIds.has(j.id)||
    (j.a!==0&&!ids.has(j.a))||!ids.has(j.b)||j.a===j.b||
    !fin(j.localA?.x,-8,8)||!fin(j.localA?.y,-8,8)||
    !fin(j.localB?.x,-8,8)||!fin(j.localB?.y,-8,8)||
    typeof j.motor!=="boolean"||!fin(j.rpm,-120,120)||!fin(j.torque,0,100))return false;
  jointIds.add(j.id);
 }
 const max=Math.max(0,...ids,...jointIds);
 return o.nextId>max&&o.nextId<=1000000;
}
export function restore(input){
 if(!validate(input))throw Error("Ungültige oder zu große Maschinendatei");
 const o=JSON.parse(JSON.stringify(input));
 const s=blank();s.name=o.name;s.gravity=o.gravity;s.nextId=o.nextId;
 s.collisions=o.collisions!==false;s.ccd=o.ccd!==false;s.restitution=o.restitution??.05;s.friction=o.friction??.35;
 s.bodies=o.bodies.map(b=>normalizeBody(b,b.id));
 s.joints=o.joints;
 return s;
}
// Iterativer Positionssolver (PBD) für zwei lokale Anker pro Drehgelenk.
function projectHinge(scene,j){
 const a=j.a===0?null:bodyById(scene,j.a),b=bodyById(scene,j.b);
 if(!b)return 0;
 const ra=a?rotate(j.localA,a.angle):{x:0,y:0},rb=rotate(j.localB,b.angle);
 const pa=a?add(a,ra):j.localA,pb=add(b,rb),delta=sub(pb,pa);
 const ma=a?a.invM:0,ia=a?a.invI:0,mb=b.invM,ib=b.invI;
 const kxx=ma+mb+ia*ra.y*ra.y+ib*rb.y*rb.y;
 const kxy=-ia*ra.x*ra.y-ib*rb.x*rb.y;
 const kyy=ma+mb+ia*ra.x*ra.x+ib*rb.x*rb.x;
 const det=kxx*kyy-kxy*kxy;
 if(det<1e-10)return Math.hypot(delta.x,delta.y);
 const alpha=.8;
 const impulse={x:-alpha*(kyy*delta.x-kxy*delta.y)/det,
                y:-alpha*(-kxy*delta.x+kxx*delta.y)/det};
 if(a){a.x-=ma*impulse.x;a.y-=ma*impulse.y;a.angle-=ia*cross(ra,impulse)}
 b.x+=mb*impulse.x;b.y+=mb*impulse.y;b.angle+=ib*cross(rb,impulse);
 return Math.hypot(delta.x,delta.y);
}
function groundContact(b){
 const ground=2.2;
 const axis=rotate({x:b.length/2,y:0},b.angle);
 const endpoints=b.kind==="bar"?[b.y-axis.y,b.y+axis.y]:[b.y];
 const radius=b.kind==="wheel"?b.length/2:.11;
 const penetration=Math.max(0,Math.max(...endpoints)+radius-ground);
 if(penetration>0){b.y-=penetration;b.vy=Math.min(0,b.vy)*-.08;b.vx*=.97;b.omega*=.97;}
}
function discreteStep(scene,dt=DT){
 if(!(Number.isFinite(dt)&&dt>1e-10&&dt<=.04))throw Error("Ungültiger innerer Zeitschritt");
 const prior=new Map(scene.bodies.map(b=>[b.id,{x:b.x,y:b.y,angle:b.angle}]));
 // Gelenkmotoren: relative Solldrehzahl, begrenzt durch verfügbares Moment.
 for(const j of scene.joints){
  if(!j.motor)continue;
  const a=j.a===0?null:bodyById(scene,j.a),b=bodyById(scene,j.b);
  if(!b)continue;
  const ia=a?a.invI:0,ib=b.invI,invI=ia+ib;
  if(!invI)continue;
  const target=j.rpm*2*Math.PI/60,relative=b.omega-(a?a.omega:0);
  const impulse=clamp((target-relative)/invI,-j.torque*dt,j.torque*dt);
  b.omega+=impulse*ib;if(a)a.omega-=impulse*ia;
 }
 for(const b of scene.bodies){
  b.vy+=scene.gravity*dt;
  b.vx*=.9998;b.vy*=.9998;b.omega*=.9997;
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=b.omega*dt;
 }
 let maxError=0;
 const touching=new Set();
 const correction=new Map(scene.bodies.map(b=>[b.id,{x:0,y:0,angle:0}]));
 for(let i=0;i<16;i++){
  for(const j of scene.joints)maxError=Math.max(maxError,projectHinge(scene,j));
  if(scene.collisions!==false){
   for(const c of contacts(scene))touching.add(c.a+":"+c.b);
   solveContacts(scene,.78,correction);
  }
  for(const b of scene.bodies)groundContact(b);
 }
 scene.contactsNow=touching.size;
 for(const b of scene.bodies){
  const v=prior.get(b.id);
  const offset=correction.get(b.id);
  b.vx=clamp((b.x-v.x-offset.x)/dt,-500,500);
  b.vy=clamp((b.y-v.y-offset.y)/dt,-500,500);
  b.omega=clamp((b.angle-v.angle-offset.angle)/dt,-30,30);
  b.angle=((b.angle+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
  // Design view contains actual runtime coordinates and angles. Snapshot is saved only while paused/reset.
 }
 if(scene.collisions!==false){
  for(const c of contacts(scene))contactImpulse(scene,c);
  for(const b of scene.bodies){
   b.vx=clamp(b.vx,-500,500);b.vy=clamp(b.vy,-500,500);b.omega=clamp(b.omega,-30,30);
  }
 }
 return{jointError:maxError,bodies:scene.bodies.length,joints:scene.joints.length,contacts:scene.contactsNow};
}
// CCD: swept time of impact followed by bounded adaptive integration.
// Thin bodies cannot cross more than about 7cm relative per microstep.
export function step(scene,dt=DT){
 if(!fin(dt,.0001,.04))throw Error("Ungültiger Zeitschritt");
 if(scene.collisions===false||scene.ccd===false||scene.bodies.length<2){
  const out=discreteStep(scene,dt);scene.ccdSubsteps=1;scene.ccdImpacts=0;
  return{...out,ccdSubsteps:1,ccdImpacts:0};
 }
 const MAX_SUBSTEPS=128;let remaining=dt,count=0,impacts=0,maxContacts=0,maxError=0;
 while(remaining>1e-9&&count<MAX_SUBSTEPS){
  let h=safeContactInterval(scene,remaining);
  h=Math.min(remaining,Math.max(h,1e-7));
  const first=firstSweptImpact(scene,h);
  if(first!==null&&first<h){
   h=Math.max(h*.25,Math.min(h,first+.00012));
   impacts++;
  }
  if(count===MAX_SUBSTEPS-1)h=remaining;
  const result=discreteStep(scene,h);
  remaining=Math.max(0,remaining-h);count++;
  maxContacts=Math.max(maxContacts,result.contacts);
  maxError=Math.max(maxError,result.jointError);
 }
 scene.ccdSubsteps=count;scene.ccdImpacts=impacts;
 scene.contactsNow=maxContacts;
 return{jointError:maxError,bodies:scene.bodies.length,joints:scene.joints.length,
        contacts:maxContacts,ccdSubsteps:count,ccdImpacts:impacts};
}
export function jointError(scene){
 return scene.joints.map(j=>{
  const a=j.a===0?null:bodyById(scene,j.a),b=bodyById(scene,j.b);
  if(!b)return Infinity;
  const pa=a?worldPoint(a,j.localA):j.localA,pb=worldPoint(b,j.localB);
  return Math.hypot(pa.x-pb.x,pa.y-pb.y);
 });
}
