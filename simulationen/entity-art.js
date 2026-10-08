import {drawFighter} from "./fighter-art.js";
// DMP SIM LAB – selbst gezeichnete SVG-Figuren für 10 Arten.
// Schematische Illustrationen, keine anatomisch korrekten 3D-Modelle.
const NS="http://www.w3.org/2000/svg";
const bound=(x,a,b)=>Math.max(a,Math.min(b,x));
function shade(hex,d){return "#"+[1,3,5].map(i=>bound(parseInt(hex.slice(i,i+2),16)+d,0,255).toString(16).padStart(2,"0")).join("");}
export function drawCharacter(root,e,move=0){
 if(e.fighterStyle&&drawFighter(root,e,move))return true;
 const type=e.appearance||"generic";
 if(type==="generic")return false;
 if(!["human","robot","ostrich","cat","fox","wolf","horse","cheetah","robotdog"].includes(type))return false;
 const c=e.color,light=shade(c,38),dark=shade(c,-45),deep=shade(c,-90);
 const node=(tag,a={})=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(a))n.setAttribute(k,String(v));root.append(n);return n;};
 const line=(x1,y1,x2,y2,color,w=7)=>node("line",{x1,y1,x2,y2,stroke:color,"stroke-width":w,"stroke-linecap":"round"});
 const ellipse=(x,y,rx,ry,color,attrs={})=>node("ellipse",{cx:x,cy:y,rx,ry,fill:color,...attrs});
 const circle=(x,y,r,color,attrs={})=>node("circle",{cx:x,cy:y,r,fill:color,...attrs});
 const path=(d,color,attrs={})=>node("path",{d,fill:color,...attrs});
 const box=(x,y,w,h,fill,rx=7,attrs={})=>node("rect",{x,y,width:w,height:h,rx,fill,...attrs});
 const leg=(hip,fy,index,robot=false,hoof=false)=>{
   const step=Math.sin(move+index*Math.PI)*17;
   const kneeY=(hip[1]+fy)/2,ankleX=hip[0]+step*.55;
   line(hip[0],hip[1],hip[0]+step,kneeY,robot?deep:dark,robot?18:15);
   line(hip[0]+step,kneeY,ankleX,fy,robot?light:c,robot?12:11);
   circle(hip[0]+step,kneeY,robot?8:6,robot?"#1c3c4d":light);
   if(hoof)box(ankleX-11,fy-2,23,10,deep,2);
   else path("M"+(ankleX-9)+" "+fy+" q13 10 29 1", "none",{stroke:robot?"#dbf9ff":deep,"stroke-width":7,"stroke-linecap":"round"});
 };
 if(type==="human"||type==="robot"){
   const metal=type==="robot",hipY=278,torsoY=171,headY=122,arm=(metal?dark:shade(c,-22));
   const s=e.limb,t=e.torso,h=e.head;
   // Untere Extremitäten, dynamisch paarweise versetzt.
   for(const i of [0,1]){
     const x=280+(i?15:-15),swing=Math.sin(move+i*Math.PI)*19;
     line(x,hipY,x+swing,337,metal?dark:"#303947",metal?19:23);
     line(x+swing,337,x-swing*.22,406,metal?light:"#536475",metal?15:17);
     circle(x+swing,337,metal?8:6,metal?"#18394c":"#c4ad94");
     path("M"+(x-swing*.22-9)+" 408 h29", "none",{stroke:metal?light:"#f3f4f5","stroke-width":12,"stroke-linecap":"round"});
   }
   if(metal){
     box(243,torsoY-4,74*t,108,deep,13,{stroke:light,"stroke-width":4});
     box(255,191,51,33,"#123245",5,{stroke:"#7ae9e0","stroke-width":2});
     line(257,236,308,236,"#6fe5f0",4);
     box(243,hipY-12,74,24,dark,7);
   }else{
     box(245,torsoY,70*t,93,c,16);
     box(250,255,60,27,deep,8);
     line(261,183,299,183,light,3);
   }
   for(const i of [0,1]){
      const side=i?1:-1,dx=Math.sin(move+i*Math.PI)*10,x=280+side*43;
      line(x,189,x+side*11+dx,265,metal?light:arm,metal?18:16);
      circle(x+side*11+dx,269,metal?8:9,metal?"#b6f3fa":"#d8aa8a");
      if(metal)circle(x,189,9,"#16394b",{stroke:"#c4f7f7","stroke-width":3});
   }
   if(metal){
      box(252,91,57*h,62*h,light,11,{stroke:"#d8f5fb","stroke-width":3});
      box(258,109,45*h,25*h,"#113145",6);
      box(268,118,7,7,"#6bfff1",2);box(286,118,7,7,"#6bfff1",2);
      line(280,90,280,73,dark,4);circle(280,72,7,"#f6d38a");
   }else{
      ellipse(280,122,28*h,33*h,"#d6a382");
      path("M251 115 Q248 77 280 91 Q312 83 309 119 Q293 103 280 104 Q266 110 251 115",deep);
      circle(270,123,2.5,"#153142");circle(291,123,2.5,"#153142");
      path("M273 139 q8 5 15 0","none",{stroke:"#8d4938","stroke-width":2});
   }
   return true;
 }
 if(type==="ostrich"){
   const sway=move*19;
   for(const [i,x]of [248,298].entries()){
     const dx=Math.sin(move+i*Math.PI)*15;
     line(x,270,x+dx,338,"#d8b59c",12);
     line(x+dx,338,x-dx*.4,402,"#d8b59c",8);
     path("M"+(x-dx*.4-6)+" 404 q15 5 34 0","none",{stroke:"#d8b59c","stroke-width":8,"stroke-linecap":"round"});
   }
   ellipse(259,237,103*e.torso*.8,58*e.torso*.8,dark);
   for(let i=0;i<6;i++)ellipse(225+i*16,232+(i%2)*11,27,28,i%2?c:deep,{opacity:.85});
   path("M319 225 Q338 178 337 143 Q332 107 362 98","none",{stroke:"#e5c8b0","stroke-width":22,"stroke-linecap":"round"});
   ellipse(372,94,19*e.head,16*e.head,"#e8cbb8");
   path("M389 91 l28 10 -27 7 Z","#efbb71");
   circle(379,91,3,"#122b3b");
   path("M180 218 q-21 -31 -38 -10 q23 4 44 30",light);
   return true;
 }
 const robot=type==="robotdog",horse=type==="horse",cat=type==="cat",fox=type==="fox",wolf=type==="wolf",cheetah=type==="cheetah";
 const bodyX=270,bodyY=255;
 const length=horse?180:cheetah?171:wolf?166:fox?145:cat?135:155;
 const height=horse?57:wolf?56:fox?46:cat?43:cheetah?42:48;
 const k=e.torso;
 const left=bodyX-length*k*.52,right=bodyX+length*k*.50;
 // Hintere Beine + Schwanz zuerst, damit der Rumpf davor liegt.
 leg([left+22,bodyY+17],406,0,robot,horse);
 leg([right-25,bodyY+17],406,1,robot,horse);
 if(robot){
   path("M"+(left-5)+" 239 Q"+(left-55)+" 240 "+(left-64)+" 216","none",{stroke:"#7199ac","stroke-width":9,"stroke-linecap":"round"});
 }else if(horse){
   path("M"+(left-8)+" 227 Q"+(left-42)+" 291 "+(left-60)+" 350","none",{stroke:deep,"stroke-width":19,"stroke-linecap":"round"});
 }else if(cat){
   path("M"+(left-8)+" 237 Q"+(left-70)+" 230 "+(left-48)+" 164","none",{stroke:dark,"stroke-width":16,"stroke-linecap":"round"});
 }else if(fox){
   path("M"+(left-5)+" 240 Q"+(left-41)+" 201 "+(left-89)+" 265 Q"+(left-48)+" 308 "+(left-5)+" 251",c,{stroke:dark,"stroke-width":3});
   path("M"+(left-89)+" 265 Q"+(left-75)+" 241 "+(left-57)+" 239 Q"+(left-70)+" 265 "+(left-69)+" 279 Z","#fff2d4");
 }else{
   path("M"+(left-5)+" 240 Q"+(left-54)+" 270 "+(left-64)+" 231","none",{stroke:dark,"stroke-width":wolf?24:18,"stroke-linecap":"round"});
   if(cheetah)for(let i=0;i<3;i++)line(left-27-i*10,244+i*2,left-30-i*10,252+i*2,deep,4);
 }
 if(robot){
   box(left,bodyY-38,(right-left),75,dark,16,{stroke:"#b6f1f6","stroke-width":3});
   box(left+14,bodyY-24,right-left-28,46,c,7);
   line(left+30,bodyY-8,right-25,bodyY-8,"#dffbff",2);
   box(left+38,bodyY-5,26,10,"#56f5cb",3);
 }else{
   ellipse(bodyX,bodyY,length*k*.54,height*k*.72,c,{stroke:light,"stroke-width":3});
   ellipse(bodyX+13,bodyY+height*.28,length*k*.38,height*k*.16,light,{opacity:.43});
 }
 if(cheetah){
   for(let row=0;row<3;row++)for(let i=0;i<6;i++){
     const px=bodyX-67+i*24+(row%2)*8,py=bodyY-25+row*19;
     if(((px-bodyX)/(length*k*.54))**2+((py-bodyY)/(height*k*.72))**2<.83)
       ellipse(px,py,3+(i%2),3.5,deep);
   }
 }
 if(wolf){for(let i=0;i<5;i++)path("M"+(right-26+i*6)+" 239 l"+(i%2?14:8)+" 27 l-24 -14 Z",light,{opacity:.8});}
 if(horse){
   // Mähne und längerer Hals
   path("M"+(right-28)+" 250 L"+(right+14)+" 163 Q"+(right+28)+" 149 "+(right+44)+" 170 L"+(right+9)+" 280 Z",c,{stroke:dark,"stroke-width":4});
   for(let i=0;i<5;i++)path("M"+(right-14+i*7)+" "+(230-i*13)+" l-18 -9 l11 20 Z",deep);
 }
 if(!horse) {
   const x=right-22;
   ellipse(x+16,bodyY-16,robot?26:30,robot?28:32,robot?dark:c,{stroke:light,"stroke-width":2});
 }
 leg([left+40,bodyY+24],405,1,robot,horse);
 leg([right-15,bodyY+24],405,0,robot,horse);
 const headX=horse?right+52:robot?right+39:right+41;
 const headY=horse?175:robot?213:fox?220:cat?219:cheetah?220:222;
 if(robot){
   box(headX-31,headY-26,63,51,light,8,{stroke:"#e4fcff","stroke-width":3});
   box(headX-22,headY-8,45,20,"#133345",5);
   circle(headX-9,headY+2,5,"#73f5e4");circle(headX+10,headY+2,5,"#73f5e4");
   line(headX,headY-27,headX,headY-46,light,4);circle(headX,headY-49,6,"#ffcf7b");
 }else{
   if(horse)path("M"+(headX-25)+" 166 L"+(headX+16)+" 160 L"+(headX+24)+" 205 L"+(headX+6)+" 221 L"+(headX-15)+" 211 Z",c,{stroke:dark,"stroke-width":3});
   else ellipse(headX,headY,horse?32:fox?27:cat?32:cheetah?30:35,horse?29:fox?29:cat?33:cheetah?30:38,c,{stroke:light,"stroke-width":2});
   if(cat||fox||wolf||horse){
     const earY=headY-(horse?37:33),width=horse?15:cat?20:fox?25:21;
     for(const side of [-1,1]){
       const x=headX+side*19;
       path("M"+(x-width/2)+" "+(earY+18)+" L"+(x+side*width*.18)+" "+(earY-(fox?22:15))+" L"+(x+width/2)+" "+(earY+18)+" Z",dark);
       path("M"+(x-width/4)+" "+(earY+12)+" L"+(x+side*width*.15)+" "+(earY-6)+" L"+(x+width/4)+" "+(earY+12)+" Z",light);
     }
   }
   if(wolf||fox||horse)path("M"+(headX+10)+" "+(headY+3)+" Q"+(headX+41)+" "+(headY+7)+" "+(headX+43)+" "+(headY+23)+" L"+(headX+13)+" "+(headY+25)+" Z",fox?"#f6e5c9":light);
   circle(headX+10,headY-6,3.8,"#143141");
   circle(headX+(horse?30:36),headY+12,3,deep);
   if(cheetah){
     // Typische Tränenstreifen neben der Nase.
     path("M"+(headX+15)+" "+(headY-2)+" l6 21","none",{stroke:deep,"stroke-width":4,"stroke-linecap":"round"});
     for(let i=0;i<4;i++)circle(headX-15+(i%2)*10,headY-17+i*9,2.5,deep);
   }
   if(cat){for(const sign of [-1,1])for(const i of [-1,0,1])line(headX+sign*18,headY+13+i*4,headX+sign*54,headY+13+i*9,light,1.5);}
 }
 return true;
}
export function characterThumbnail(entity){
 const svg=document.createElementNS(NS,"svg");
 svg.setAttribute("viewBox","85 60 390 370");
 svg.setAttribute("aria-hidden","true");
 svg.setAttribute("focusable","false");
 drawCharacter(svg,entity,0);
 return svg;
}
