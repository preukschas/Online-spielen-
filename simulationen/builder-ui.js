import {BUILDER_VERSION,DT,blank,addBody,addHinge,deleteBody,deleteJoint,bodyById,sample,snapshot,restore,step,jointError,worldPoint} from "./builder-core.js";
import {contacts} from "./builder-collision.js";
const $=id=>document.getElementById(id),w=$("world"),cx=w.getContext("2d"),chart=$("chart"),cc=chart.getContext("2d");
const KEY="dmp_builder_scenes_v1",PI=Math.PI;
let scene=sample("double"),design=snapshot(scene),selectedBody=scene.bodies[0]?.id||null,selectedJoint=null;
let running=false,clock=0,acc=0,last=0,frameIndex=0,history=[],drag=null,peak=0;
const number=(v,n=2)=>Number.isFinite(v)?v.toFixed(n).replace(".",","):"–";
const xp=x=>480+85*x,yp=y=>300+85*y;
const toWorld=(x,y)=>({x:(x-480)/85,y:(y-300)/85});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const notify=(msg,err=false)=>{const n=$("notice");n.textContent=msg;n.style.color=err?"#ffa9a9":"#70e3c2"};
const loadStore=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(x)?x.slice(0,40):[]}catch{return[]}};
function sync(){
 scene.name=$("filename").value.trim().slice(0,60)||"Meine Maschine";
 design=snapshot(scene);
}
function reset(){
 running=false;clock=0;acc=0;history=[];peak=0;
 scene=restore(design);$("play").textContent="▶ Starten";$("stateTag").textContent="BAU-MODUS";
 renderUI();draw();stats();
}
function chooseTemplate(name){
 scene=name==="empty"?blank():sample(name);selectedBody=scene.bodies[0]?.id||null;selectedJoint=scene.joints[0]?.id||null;
 $("filename").value=scene.name;sync();reset();notify("Vorlage „"+scene.name+"“ geladen.");
}
function options(sel,entries,desired){
 sel.replaceChildren();
 for(const [value,label] of entries){const o=document.createElement("option");o.value=String(value);o.textContent=label;sel.append(o);}
 const target=String(desired);if(entries.some(x=>String(x[0])===target))sel.value=target;
}
function makeField(container,label,key,value,min,max,stepVal,context){
 const wrap=document.createElement("div"),lab=document.createElement("label"),inp=document.createElement("input");
 lab.className="field-label";lab.textContent=label;inp.className="field";inp.type="number";inp.min=min;inp.max=max;inp.step=stepVal;
 inp.value=String(Number(value.toFixed(4)));inp.setAttribute("aria-label",label);inp.dataset.field=key;
 inp.addEventListener("change",()=>{
  const n=Number(inp.value);
  if(!Number.isFinite(n)){inp.value=value;return;}
  const v=clamp(n,min,max),obj=context==="body"?bodyById(scene,selectedBody):scene.joints.find(x=>x.id===selectedJoint);
  if(!obj)return;
  if(context==="body"){
   if(key==="angle"){obj.angle=v*PI/180;}
   else obj[key]=v;
   if(key==="mass"||key==="length"){
    obj.invM=1/obj.mass;obj.invI=1/(obj.kind==="wheel"?.125*obj.mass*obj.length**2:obj.mass*(obj.length**2+.22**2)/12);
    if(key==="length"){ // keep saved anchors within edited geometry
     for(const j of scene.joints){
      if(j.a===obj.id)j.localA.x=clamp(j.localA.x,-obj.length/2,obj.length/2);
      if(j.b===obj.id)j.localB.x=clamp(j.localB.x,-obj.length/2,obj.length/2);
     }
    }
   }
  }else obj[key]=v;
  sync();reset();
 });
 wrap.append(lab,inp);container.append(wrap);
}
function renderUI(){
 $("sceneName").textContent=scene.name;$("filename").value=scene.name;$("gravity").value=scene.gravity;
 $("collisions").checked=scene.collisions!==false;
 $("ccd").checked=scene.ccd!==false;
 $("restitution").value=scene.restitution??.05;
 $("friction").value=scene.friction??.35;
 $("bodyCount").textContent=scene.bodies.length;$("jointCount").textContent=scene.joints.length;
 const selected=bodyById(scene,selectedBody);
 if(!selected)selectedBody=scene.bodies[0]?.id||null;
 const bodyList=$("bodyList");bodyList.replaceChildren();
 for(const b of scene.bodies){
  const btn=document.createElement("button");btn.type="button";btn.className="chip"+(b.id===selectedBody?" selected":"");
  btn.textContent=(b.kind==="wheel"?"◉ ":"▰ ")+b.name;btn.addEventListener("click",()=>{selectedBody=b.id;renderUI();draw()});
  bodyList.append(btn);
 }
 if(!scene.bodies.length){const e=document.createElement("span");e.className="empty";e.textContent="Noch keine Körper.";bodyList.append(e)}
 const bod=bodyById(scene,selectedBody),props=$("bodyProps");props.replaceChildren();
 if(bod){
  const name=document.createElement("label");name.className="field-label";name.textContent="Name";const input=document.createElement("input");input.className="field full";input.maxLength=35;input.value=bod.name;
  input.setAttribute("aria-label","Körpername");input.addEventListener("change",()=>{bod.name=input.value.trim().slice(0,35)||"Körper "+bod.id;sync();renderUI()});props.append(name,input);
  const grid=document.createElement("div");grid.className="columns";
  makeField(grid,"Länge / Ø (m)","length",bod.length,.3,2.8,.1,"body");
  makeField(grid,"Masse (kg)","mass",bod.mass,.2,35,.2,"body");
  makeField(grid,"Position X (m)","x",bod.x,-4.6,4.6,.1,"body");
  makeField(grid,"Position Y (m)","y",bod.y,-3.2,2.1,.1,"body");
  makeField(grid,"Winkel (°)","angle",bod.angle*180/PI,-360,360,5,"body");
  makeField(grid,"Start-Vx (m/s)","startVx",bod.startVx||0,-500,500,10,"body");
  makeField(grid,"Start-Vy (m/s)","startVy",bod.startVy||0,-500,500,10,"body");
  props.append(grid);
  const remove=document.createElement("button");remove.className="btn full";remove.style.marginTop="9px";remove.textContent="− Körper entfernen";remove.addEventListener("click",()=>{
   deleteBody(scene,bod.id);selectedBody=scene.bodies[0]?.id||null;selectedJoint=null;sync();reset();
  });props.append(remove);
 }
 options($("jointA"),[[0,"Rahmen (fest)"],...scene.bodies.map(b=>[b.id,b.name])],0);
 options($("jointB"),scene.bodies.map(b=>[b.id,b.name]),selectedBody);
 const joints=$("jointList");joints.replaceChildren();
 if(!scene.joints.some(j=>j.id===selectedJoint))selectedJoint=scene.joints[0]?.id||null;
 for(const j of scene.joints){
  const btn=document.createElement("button");btn.className="chip"+(j.id===selectedJoint?" selected":"");btn.type="button";
  btn.textContent="● "+(j.a===0?"Rahmen":bodyById(scene,j.a)?.name||"?")+" ↔ "+(bodyById(scene,j.b)?.name||"?")+(j.motor?" ⚡":"");
  btn.addEventListener("click",()=>{selectedJoint=j.id;renderUI();draw()});joints.append(btn);
 }
 if(!scene.joints.length){const e=document.createElement("span");e.className="empty";e.textContent="Noch keine Gelenke.";joints.append(e)}
 const j=scene.joints.find(j=>j.id===selectedJoint),jointProps=$("jointProps");jointProps.replaceChildren();
 if(j){
  const label=document.createElement("label");label.className="checkline";const box=document.createElement("input");box.type="checkbox";box.checked=j.motor;box.setAttribute("aria-label","Gelenkmotor aktivieren");
  const text=document.createElement("span");text.textContent="Motor aktiv";box.addEventListener("change",()=>{j.motor=box.checked;sync();renderUI()});label.append(box,text);jointProps.append(label);
  const g=document.createElement("div");g.className="columns";
  makeField(g,"Motor-Drehzahl (U/min)","rpm",j.rpm,-120,120,5,"joint");
  makeField(g,"Motormoment (N·m)","torque",j.torque,0,100,1,"joint");jointProps.append(g);
  const del=document.createElement("button");del.className="btn full";del.style.marginTop="10px";del.textContent="− Gelenk entfernen";
  del.addEventListener("click",()=>{deleteJoint(scene,j.id);selectedJoint=null;sync();reset()});jointProps.append(del);
 }
}
function draw(){
 cx.clearRect(0,0,w.width,w.height);
 const bg=cx.createLinearGradient(0,0,780,540);
 bg.addColorStop(0,"#18384a");bg.addColorStop(.62,"#10293b");bg.addColorStop(1,"#071a2b");
 cx.fillStyle=bg;cx.fillRect(0,0,960,540);
 const halo=cx.createRadialGradient(600,200,20,600,200,560);
 halo.addColorStop(0,"#367d7938");halo.addColorStop(1,"#00000000");
 cx.fillStyle=halo;cx.fillRect(0,0,960,540);
 cx.save();cx.strokeStyle="#79bfba20";cx.lineWidth=1;
 for(let x=55;x<=960;x+=42.5){cx.beginPath();cx.moveTo(x,0);cx.lineTo(x,540);cx.stroke();}
 for(let y=45;y<=540;y+=42.5){cx.beginPath();cx.moveTo(0,y);cx.lineTo(960,y);cx.stroke();}
 cx.strokeStyle="#9dcad044";cx.setLineDash([5,8]);cx.beginPath();cx.moveTo(480,40);cx.lineTo(480,488);cx.stroke();
 cx.beginPath();cx.moveTo(30,300);cx.lineTo(930,300);cx.stroke();cx.restore();
 const gy=yp(2.2);
 const earth=cx.createLinearGradient(0,gy,0,540);
 earth.addColorStop(0,"#275d5e");earth.addColorStop(1,"#13313f");
 cx.fillStyle=earth;cx.fillRect(0,gy,960,540-gy);
 cx.fillStyle="#78dfc0";cx.fillRect(0,gy,960,5);
 for(let x=0;x<970;x+=32){cx.strokeStyle="#79d0ba4d";cx.lineWidth=2;cx.beginPath();cx.moveTo(x,gy+15);cx.lineTo(x+17,gy+32);cx.stroke();}
 cx.fillStyle="#a5d9da";cx.font="700 11px system-ui";cx.fillText("BODEN · Y +2,2 m",30,gy-12);
 cx.fillStyle="#d9fff0";cx.font="800 12px system-ui";cx.fillText("DMP SIM LAB / MASCHINENWERKSTATT",30,31);
 cx.fillStyle="#8eb3c2";cx.font="11px system-ui";cx.fillText("2D · KONSTRUKTION / ANIMATION",30,51);
 cx.fillStyle="#9fead5";cx.textAlign="right";cx.font="700 13px system-ui";cx.fillText(scene.bodies.length+" KÖRPER   /   "+scene.joints.length+" GELENKE",930,31);cx.textAlign="left";
 for(const body of scene.bodies){
  const active=body.id===selectedBody,p=85*body.length/2;
  const color=active?"#77ebc9":"#9bbbd0";
  cx.save();cx.translate(xp(body.x),yp(body.y));cx.rotate(body.angle);
  if(active){cx.shadowColor="#6df2d4";cx.shadowBlur=21;cx.shadowOffsetY=3;}
  if(body.kind==="bar"){
   cx.strokeStyle=active?"#f6d89b":"#b5d6d9";cx.lineWidth=active?3:2;
   cx.fillStyle="#1a4050";cx.beginPath();cx.roundRect(-p-3,-13,2*p+6,26,10);cx.fill();cx.stroke();
   const metal=cx.createLinearGradient(0,-12,0,12);
   metal.addColorStop(0,active?"#c4ffed":"#d4e4f1");
   metal.addColorStop(.32,color);metal.addColorStop(1,active?"#2c988a":"#456e83");
   cx.fillStyle=metal;cx.beginPath();cx.roundRect(-p,-10,2*p,20,7);cx.fill();
   cx.fillStyle="#ffffff78";cx.beginPath();cx.roundRect(-p+8,-7,Math.max(1,2*p-16),3,1);cx.fill();
   for(const xx of [-p+15,p-15]){cx.fillStyle="#0b2738";cx.beginPath();cx.arc(xx,0,4.2,0,2*PI);cx.fill();}
  }else{
   const metal=cx.createRadialGradient(-p*.27,-p*.31,2,0,0,p);
   metal.addColorStop(0,"#e5fff5");metal.addColorStop(.23,color);
   metal.addColorStop(.75,active?"#328e84":"#50768e");metal.addColorStop(1,"#142d41");
   cx.fillStyle=metal;cx.beginPath();cx.arc(0,0,p,0,2*PI);cx.fill();
   cx.shadowBlur=0;cx.strokeStyle=active?"#fff0b9":"#c6e3e8";cx.lineWidth=3;cx.stroke();
   cx.fillStyle="#183b4d";cx.beginPath();cx.arc(0,0,p*.74,0,2*PI);cx.fill();
   cx.strokeStyle=color;cx.lineWidth=Math.max(5,p*.11);
   for(let i=0;i<6;i++){const a=i*PI/3;cx.beginPath();cx.moveTo(Math.cos(a)*p*.16,Math.sin(a)*p*.16);cx.lineTo(Math.cos(a)*p*.65,Math.sin(a)*p*.65);cx.stroke();}
   cx.fillStyle=color;cx.beginPath();cx.arc(0,0,p*.17,0,2*PI);cx.fill();
  }
  cx.shadowBlur=0;
  cx.fillStyle="#143648";cx.strokeStyle="#c1f8e5";cx.lineWidth=2;cx.beginPath();cx.arc(0,0,7,0,2*PI);cx.fill();cx.stroke();
  if(active){
   cx.strokeStyle="#f1c87d";cx.lineWidth=2;cx.setLineDash([7,6]);cx.beginPath();
   if(body.kind==="bar")cx.roundRect(-p-10,-22,2*p+20,44,10);
   else cx.arc(0,0,p+13,0,2*PI);
   cx.stroke();cx.setLineDash([]);
  }
  cx.restore();
  cx.textAlign="center";cx.fillStyle=active?"#e9ffdd":"#bbd8dd";cx.font=active?"800 14px system-ui":"600 14px system-ui";
  cx.fillText(body.name,xp(body.x),yp(body.y)-p*(body.kind==="wheel"?1:0)-22);cx.textAlign="left";
 }
 for(const j of scene.joints){
  const b=bodyById(scene,j.b);if(!b)continue;
  const a=j.a===0?null:bodyById(scene,j.a);
  const at=a?worldPoint(a,j.localA):j.localA,other=worldPoint(b,j.localB);
  const x=xp((at.x+other.x)/2),y=yp((at.y+other.y)/2);
  cx.save();cx.shadowColor=j.motor?"#ffd28d":"#adf5e3";cx.shadowBlur=j.id===selectedJoint?20:9;
  cx.fillStyle=j.motor?"#f3c87b":"#d5f5ec";cx.strokeStyle=j.id===selectedJoint?"#fff5c8":"#204456";
  cx.lineWidth=3;cx.beginPath();cx.arc(x,y,j.motor?14:11,0,2*PI);cx.fill();cx.stroke();cx.restore();
  cx.fillStyle="#123044";cx.font="900 13px system-ui";cx.textAlign="center";cx.fillText(j.motor?"M":"●",x,y+4.5);cx.textAlign="left";
  if(j.a===0){cx.strokeStyle="#f2c875";cx.lineWidth=3;cx.beginPath();cx.moveTo(x-19,y-24);cx.lineTo(x+19,y-24);cx.stroke();}
 }
 if(scene.collisions!==false){
  const hits=contacts(scene);
  for(const contact of hits.slice(0,45)){
   const x=xp(contact.point.x),y=yp(contact.point.y);
   cx.strokeStyle="#ffca7e";cx.lineWidth=3;cx.beginPath();cx.arc(x,y,10+frameIndex%8,0,2*PI);cx.stroke();
   cx.fillStyle="#ffe2a4";cx.beginPath();cx.arc(x,y,3,0,2*PI);cx.fill();
  }
 }
 if(!scene.bodies.length){
  cx.fillStyle="#c0e0e4";cx.font="700 22px system-ui";cx.textAlign="center";
  cx.fillText("Beginne mit einer Stange oder einem Rad.",480,220);cx.textAlign="left";
 }
}
function drawChart(){
 cc.fillStyle="#0d1d2c";cc.fillRect(0,0,900,140);
 cc.strokeStyle="#2e4b5d";for(let y=20;y<140;y+=30){cc.beginPath();cc.moveTo(40,y);cc.lineTo(880,y);cc.stroke();}
 const data=history.slice(-180).filter(h=>Number.isFinite(h.angle));if(data.length<2)return;
 const low=Math.min(-15,...data.map(x=>x.angle)),high=Math.max(15,...data.map(x=>x.angle)),range=high-low||1;
 cc.strokeStyle="#70e3c2";cc.lineWidth=3;cc.beginPath();
 data.forEach((v,i)=>{const x=40+i/(data.length-1)*840,y=115-(v.angle-low)/range*95;if(i===0)cc.moveTo(x,y);else cc.lineTo(x,y)});cc.stroke();
 cc.fillStyle="#b5cbd3";cc.font="12px system-ui";cc.fillText(number(high,1)+"°",3,20);cc.fillText(number(low,1)+"°",3,115);
}
function stats(){
 const errors=jointError(scene),residual=errors.length?Math.max(...errors):0;
 $("time").textContent=number(clock)+" s";$("bodyCount").textContent=scene.bodies.length;
 $("jointCount").textContent=scene.joints.length;$("residual").textContent=number(1000*residual)+" mm";
 $("contactsNow").textContent=scene.collisions===false?"Aus":String(scene.contactsNow||0);
 $("ccdSubsteps").textContent=scene.collisions===false||scene.ccd===false?"Aus":String(scene.ccdSubsteps||1);
 drawChart();
}
function record(){
 const b=bodyById(scene,selectedBody)||scene.bodies[0];if(!b)return;
 history.push({t:clock,x:b.x,y:b.y,angle:b.angle*180/PI});
 if(history.length>5000)history.shift();
}
function frame(now){
 const delta=last?Math.min(.1,(now-last)/1000):0;last=now;
 if(running){
  acc+=delta*Number($("speed").value);let loops=0;
  while(acc>=DT&&loops<70){step(scene);clock+=DT;acc-=DT;loops++;if((++frameIndex)%12===0)record();}
  if(loops>=70)acc=0;
  draw();stats();
 }
 requestAnimationFrame(frame);
}
function download(content,name,mime){
 const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function showSaved(){
 const saved=$("saved"),items=loadStore();saved.replaceChildren();
 const none=document.createElement("option");none.value="";none.textContent="– Maschine auswählen –";saved.append(none);
 items.forEach((item,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=item.name||"Maschine";saved.append(o)});
}
$("play").addEventListener("click",()=>{
 running=!running;$("play").textContent=running?"❚❚ Pause":"▶ Starten";
 $("stateTag").textContent=running?"SIMULATION":"BAU-MODUS";
 if(!running){notify("Simulation pausiert. Die Konstruktion kann jetzt verändert werden.");}
});
$("step").addEventListener("click",()=>{running=false;$("play").textContent="▶ Starten";$("stateTag").textContent="BAU-MODUS";step(scene);clock+=DT;record();draw();stats()});
$("reset").addEventListener("click",()=>reset());
$("template").addEventListener("change",e=>chooseTemplate(e.target.value));
$("addBar").addEventListener("click",()=>{running=false;try{const b=addBody(scene,"bar");selectedBody=b.id;sync();reset();notify("Neue Stange hinzugefügt.")}catch(e){notify(e.message,true)}});
$("addWheel").addEventListener("click",()=>{running=false;try{const b=addBody(scene,"wheel");selectedBody=b.id;sync();reset();notify("Neues Rad hinzugefügt.")}catch(e){notify(e.message,true)}});
$("addJoint").addEventListener("click",()=>{
 running=false;
 const a=Number($("jointA").value),b=Number($("jointB").value),pa=Number($("tipA").value),pb=Number($("tipB").value);
 try{const j=addHinge(scene,a,b,pa,pb);selectedJoint=j.id;sync();reset();notify("Gelenk hinzugefügt. Jetzt kann ein Motor aktiviert werden.")}catch(e){notify(e.message,true)}
});
$("gravity").addEventListener("change",()=>{scene.gravity=clamp(Number($("gravity").value)||0,0,20);sync();reset()});
$("collisions").addEventListener("change",e=>{scene.collisions=e.target.checked;sync();reset();notify(scene.collisions?"Kontakte aktiv.":"Kontakte deaktiviert.")});
$("ccd").addEventListener("change",e=>{scene.ccd=e.target.checked;sync();reset();notify(scene.ccd?"Kontinuierliche Kontaktprüfung aktiviert.":"CCD ausgeschaltet: schnelle Objekte können durch andere hindurchfliegen.")});
for(const [id,min,max] of [["restitution",0,.8],["friction",0,1]]){
 $(id).addEventListener("change",()=>{
  const value=Number($(id).value);
  if(!Number.isFinite(value)){$(id).value=scene[id];return;}
  scene[id]=clamp(value,min,max);sync();reset();
 });
}
$("filename").addEventListener("change",()=>{sync();renderUI()});
$("new").addEventListener("click",()=>chooseTemplate("empty"));
$("save").addEventListener("click",()=>{
 sync();const entries=loadStore();entries.unshift(design);
 try{localStorage.setItem(KEY,JSON.stringify(entries.slice(0,30)));showSaved();notify("Konstruktion im Browser gespeichert.")}catch{notify("Browser-Speicher blockiert. Bitte JSON exportieren.",true)}
});
$("load").addEventListener("click",()=>{
 const n=$("saved").value;if(n===""){notify("Bitte gespeicherte Maschine auswählen.",true);return;}
 try{scene=restore(loadStore()[Number(n)]);selectedBody=scene.bodies[0]?.id||null;selectedJoint=null;$("filename").value=scene.name;sync();reset();notify("Gespeicherte Maschine geladen.")}catch(e){notify("Konstruktion nicht lesbar: "+e.message,true)}
});
$("json").addEventListener("click",()=>{sync();download(JSON.stringify(design,null,2),"dmp-maschine.json","application/json");notify("Maschine als JSON exportiert.")});
$("csv").addEventListener("click",()=>{const lines=["zeit_s;x_m;y_m;winkel_grad",...history.map(h=>[h.t,h.x,h.y,h.angle].map(x=>Number(x).toFixed(5)).join(";"))];download("\uFEFF"+lines.join("\r\n"),"maschinen-messdaten.csv","text/csv;charset=utf-8");notify("CSV mit "+history.length+" Messpunkten exportiert.")});
$("import").addEventListener("click",()=>$("importFile").click());
$("importFile").addEventListener("change",async e=>{
 const f=e.target.files?.[0];e.target.value="";if(!f)return;if(f.size>75000){notify("Datei zu groß (max. 75 KB).",true);return;}
 try{const parsed=restore(JSON.parse(await f.text()));scene=parsed;selectedBody=scene.bodies[0]?.id||null;selectedJoint=null;$("filename").value=scene.name;sync();reset();notify("Maschine importiert.")}catch(e){notify("Ungültige Maschinendatei: "+e.message,true)}
});
function pointerLocal(event){
 const rect=w.getBoundingClientRect();return {x:(event.clientX-rect.left)/rect.width*w.width,y:(event.clientY-rect.top)/rect.height*w.height};
}
function pick(x,y){
 for(let i=scene.bodies.length-1;i>=0;i--){
  const b=scene.bodies[i],dx=x-xp(b.x),dy=y-yp(b.y),a=b.angle;
  const xx=dx*Math.cos(a)+dy*Math.sin(a),yy=-dx*Math.sin(a)+dy*Math.cos(a),half=b.length*85/2;
  if(b.kind==="wheel"?Math.hypot(dx,dy)<half+15:Math.abs(xx)<half+18&&Math.abs(yy)<25)return b;
 }
 return null;
}
w.addEventListener("pointerdown",e=>{
 if(running)return;
 const p=pointerLocal(e),b=pick(p.x,p.y);if(!b)return;
 selectedBody=b.id;drag={id:b.id,offsetX:b.x-toWorld(p.x,p.y).x,offsetY:b.y-toWorld(p.x,p.y).y};
 w.setPointerCapture(e.pointerId);renderUI();draw();
});
w.addEventListener("pointermove",e=>{
 if(!drag||running)return;
 const b=bodyById(scene,drag.id);if(!b)return;
 const p=pointerLocal(e),v=toWorld(p.x,p.y);
 b.x=clamp(v.x+drag.offsetX,-4.6,4.6);b.y=clamp(v.y+drag.offsetY,-3.2,2.1);
 draw();
});
function endDrag(){if(!drag)return;drag=null;sync();renderUI();draw();notify("Position aktualisiert. Gelenke bleiben mit ihren Ankerpunkten verbunden.")}
w.addEventListener("pointerup",endDrag);w.addEventListener("pointercancel",endDrag);
$("stateTag").textContent="BAU-MODUS";$("template").value="double";
renderUI();showSaved();draw();stats();requestAnimationFrame(frame);
