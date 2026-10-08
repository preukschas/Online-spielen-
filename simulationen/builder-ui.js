import {BUILDER_VERSION,DT,blank,addBody,addHinge,deleteBody,deleteJoint,bodyById,sample,snapshot,restore,step,jointError,worldPoint} from "./builder-core.js";
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
 const bg=cx.createLinearGradient(0,0,0,540);bg.addColorStop(0,"#142a3b");bg.addColorStop(1,"#081827");cx.fillStyle=bg;cx.fillRect(0,0,960,540);
 cx.strokeStyle="#274357";cx.lineWidth=1;
 for(let x=0;x<=960;x+=85){cx.beginPath();cx.moveTo(x,0);cx.lineTo(x,540);cx.stroke()}
 for(let y=0;y<=540;y+=85){cx.beginPath();cx.moveTo(0,y);cx.lineTo(960,y);cx.stroke()}
 const gy=yp(2.2);cx.fillStyle="#1a3b44";cx.fillRect(0,gy,960,540-gy);cx.strokeStyle="#4bcaad";cx.lineWidth=3;cx.beginPath();cx.moveTo(0,gy);cx.lineTo(960,gy);cx.stroke();
 cx.fillStyle="#92b4c0";cx.font="15px system-ui";cx.fillText("BODEN",30,gy-12);
 for(const b of scene.bodies){
  const active=b.id===selectedBody,p=85*b.length/2,c=active?"#70e3c2":"#a9bcd3";
  cx.save();cx.translate(xp(b.x),yp(b.y));cx.rotate(b.angle);
  cx.fillStyle=c;cx.strokeStyle=active?"#f8dc94":"#e9f7fc";cx.lineWidth=active?4:2;
  if(b.kind==="bar"){cx.beginPath();cx.roundRect(-p,-9,2*p,18,8);cx.fill();cx.stroke()}
  else{cx.beginPath();cx.arc(0,0,p,0,2*PI);cx.fill();cx.stroke();cx.strokeStyle="#2a5961";cx.lineWidth=7;
   for(let i=0;i<5;i++){let a=i*2*PI/5;cx.beginPath();cx.moveTo(0,0);cx.lineTo(Math.cos(a)*p*.84,Math.sin(a)*p*.84);cx.stroke();}}
  cx.fillStyle="#113340";cx.beginPath();cx.arc(0,0,7,0,2*PI);cx.fill();
  cx.restore();cx.textAlign="center";cx.fillStyle=active?"#e9fdce":"#b9d7de";cx.font="15px system-ui";
  cx.fillText(b.name,xp(b.x),yp(b.y)-p*(b.kind==="wheel"?1:0)-18);cx.textAlign="left";
 }
 for(const j of scene.joints){
  const b=bodyById(scene,j.b);if(!b)continue;
  const a=j.a===0?null:bodyById(scene,j.a);
  const at=a?worldPoint(a,j.localA):j.localA,other=worldPoint(b,j.localB);
  const x=xp((at.x+other.x)/2),y=yp((at.y+other.y)/2);
  cx.fillStyle=j.motor?"#f3c16f":"#f0f7ff";cx.strokeStyle=j.id===selectedJoint?"#fff5c8":"#16354a";cx.lineWidth=3;
  cx.beginPath();cx.arc(x,y,j.motor?13:10,0,2*PI);cx.fill();cx.stroke();
  cx.fillStyle="#163246";cx.font="14px system-ui";cx.textAlign="center";cx.fillText(j.motor?"⚡":"●",x,y+5);cx.textAlign="left";
  if(j.a===0){cx.strokeStyle="#f2c875";cx.beginPath();cx.moveTo(x-18,y-21);cx.lineTo(x+18,y-21);cx.stroke()}
 }
 if(!scene.bodies.length){cx.fillStyle="#b9d4dc";cx.font="23px system-ui";cx.textAlign="center";cx.fillText("Starte mit „＋ Stange“ oder „＋ Rad“.",480,225);cx.textAlign="left";}
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
