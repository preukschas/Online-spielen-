/* DMP SIM LAB · Canvas renderer 2.0
   Presentation-only layer: all movement, physics and outcomes come from engine.js. */
import {drawScene as legacyDraw} from "./engine.js?v=1.4.0";
const W=1000,H=560,PI=Math.PI;
const C={mint:"#79eac7",aqua:"#88cfea",gold:"#f1c879",coral:"#f3a48c",ink:"#0a2232",white:"#f0faf6",muted:"#9db9c8"};
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
const validColor=(v,d)=>/^#[a-f0-9]{6}$/i.test(v||"")?v:d;
function rr(c,x,y,w,h,r=12){c.beginPath();c.roundRect(x,y,w,h,r);}
function fill(c,x,y,w,h,color,r=0){
 c.fillStyle=color;if(r){rr(c,x,y,w,h,r);c.fill();}else c.fillRect(x,y,w,h);
}
function grad(c,x,y,w,h,a,b,r=0){const g=c.createLinearGradient(x,y,x+w*.35,y+h);g.addColorStop(0,a);g.addColorStop(1,b);fill(c,x,y,w,h,g,r);}
function stroke(c,x1,y1,x2,y2,color,w=2,dash=[]){
 c.save();c.strokeStyle=color;c.lineWidth=w;c.lineCap="round";c.setLineDash(dash);c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.restore();
}
function label(c,str,x,y,size=15,color=C.white,align="left",weight=650){
 c.save();c.font=weight+" "+size+"px system-ui, sans-serif";c.fillStyle=color;c.textAlign=align;
 c.textBaseline="alphabetic";c.fillText(String(str),x,y);c.restore();
}
function textChip(c,str,x,y,color=C.mint,width){
 const w=width||Math.max(96,Math.min(270,str.length*7.5+24));
 fill(c,x,y,w,30,"#123b47e8",9);c.save();c.strokeStyle="#5bb2a07c";c.lineWidth=1;rr(c,x,y,w,30,9);c.stroke();c.restore();
 label(c,str,x+12,y+20,12,color,"left",750);return w;
}
function disc(c,x,y,r,color,edge="#d8fff1"){
 if(!Number.isFinite(x+y+r)||r<=0)return;
 c.save();c.shadowColor=color;c.shadowBlur=r*.36;c.shadowOffsetY=5;
 const g=c.createRadialGradient(x-r*.36,y-r*.46,1,x,y,r);g.addColorStop(0,"#e5fff7");g.addColorStop(.21,color);g.addColorStop(.77,color);g.addColorStop(1,"#173746");
 c.beginPath();c.arc(x,y,r,0,2*PI);c.fillStyle=g;c.fill();c.restore();
 c.save();c.strokeStyle=edge;c.lineWidth=2;c.beginPath();c.arc(x,y,r-.7,0,2*PI);c.stroke();c.restore();
 fill(c,x-r*.25,y-r*.48,r*.4,r*.17,"#ffffff65",r*.08);
}
function joint(c,x,y,r=8){
 c.save();c.shadowColor="#c7ffee66";c.shadowBlur=9;c.fillStyle="#1e4654";c.beginPath();c.arc(x,y,r,0,PI*2);c.fill();c.restore();
 c.strokeStyle="#d5fff0";c.lineWidth=2;c.beginPath();c.arc(x,y,r-1,0,PI*2);c.stroke();
 c.fillStyle=C.gold;c.beginPath();c.arc(x,y,Math.max(2,r*.3),0,PI*2);c.fill();
}
function ring(c,x,y,r,color=C.mint,alpha=.48){
 c.save();c.strokeStyle=color;c.globalAlpha=alpha;c.lineWidth=1.5;c.beginPath();c.arc(x,y,r,0,PI*2);c.stroke();c.restore();
}
function bg(c,mode){
 const g=c.createLinearGradient(0,0,650,H);g.addColorStop(0,"#143449");g.addColorStop(.6,"#0c2639");g.addColorStop(1,"#081b2a");
 fill(c,0,0,W,H,g);
 const aura=c.createRadialGradient(760,160,10,760,160,580);aura.addColorStop(0,mode==="crash"?"#a67a4b36":mode==="arena"?"#447cba36":"#55b8ae34");aura.addColorStop(1,"#00000000");
 fill(c,0,0,W,H,aura);
 c.save();c.strokeStyle="#6facbd1d";c.lineWidth=1;
 for(let x=40;x<=W;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}
 for(let y=40;y<=H;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
 c.restore();
 fill(c,0,0,W,4,"#75e4b9a6");
 for(let x=16;x<W;x+=100)for(let y=18;y<H;y+=100){
  c.fillStyle="#7db7c54c";c.beginPath();c.arc(x,y,1.3,0,2*PI);c.fill();
 }
}
function ground(c,y){
 grad(c,0,y,W,H-y,"#28525a","#112c3e");
 fill(c,0,y,W,6,"#6cdabc");
 fill(c,0,y+7,W,15,"#214454");
 for(let x=-20;x<1020;x+=46)stroke(c,x,y+24,x+27,y+44,"#87cabb33",2);
 const g=c.createLinearGradient(0,y,0,H);g.addColorStop(0,"#00000028");g.addColorStop(1,"#00000000");fill(c,0,y,W,H-y,g);
}
function hud(c,mode,s){
 const name={physics:"PHYSICS STUDIO",crash:"CRASH LAB",bio:"BIOMECHANICS",arena:"ARENA",mechanics:"MECHANICS LAB"}[mode]||"SIM LAB";
 c.save();
 fill(c,23,20,193,33,"#071e2dbb",9);
 fill(c,23,20,4,33,mode==="crash"?C.coral:mode==="arena"?C.gold:C.mint,3);
 label(c,"DMP  /  "+name,36,42,12,"#d8eee9","left",800);
 const time=s.time.toFixed(2)+" s";
 fill(c,844,20,130,33,"#082535cc",9);label(c,"◷ "+time,953,42,14,C.white,"right",750);
 c.restore();
}
function footer(c,s){
 stroke(c,24,524,976,524,"#a9e6dd2c",1);
 label(c,"MODELL · DIDAKTISCHE SIMULATION",25,545,10,"#8bb5c0","left",760);
 label(c,(s.finished?"ABGESCHLOSSEN":"LIVE")+(s.seed?"   /   SEED "+s.seed:""),974,545,10,s.finished?C.gold:C.mint,"right",730);
}
function shadow(c,x,y,w=84,h=13){c.save();c.fillStyle="#051a274a";c.beginPath();c.ellipse(x,y,w,h,0,0,2*PI);c.fill();c.restore();}
function gauge(c,x,y,w,h,value,color=C.mint){
 fill(c,x,y,w,h,"#0a2939",h/2);
 const v=clamp(value,0,1);if(v>0)grad(c,x,y,Math.max(4,w*v),h,color,"#2b8c83",h/2);
 c.strokeStyle="#ffffff30";c.lineWidth=1;rr(c,x,y,w,h,h/2);c.stroke();
}
function arrow(c,x1,y1,x2,y2,color=C.gold){
 stroke(c,x1,y1,x2,y2,color,3);const a=Math.atan2(y2-y1,x2-x1);
 stroke(c,x2,y2,x2-12*Math.cos(a-.5),y2-12*Math.sin(a-.5),color,3);
 stroke(c,x2,y2,x2-12*Math.cos(a+.5),y2-12*Math.sin(a+.5),color,3);
}
function wheel(c,x,y,r,rot=0){
 shadow(c,x,y+17,r*1.05,4);
 disc(c,x,y,r,"#243c4b","#a6c3c8");
 disc(c,x,y,r*.52,"#7d9fa5","#e4f3ef");
 for(let j=0;j<5;j++){const a=rot+j*PI*2/5;stroke(c,x+Math.cos(a)*r*.2,y+Math.sin(a)*r*.2,x+Math.cos(a)*r*.48,y+Math.sin(a)*r*.48,"#365868",3);}
 joint(c,x,y,4);
}
function trajectory(c,x,y,length=110,dir=1,color=C.mint){
 c.save();for(let i=0;i<4;i++){stroke(c,x-dir*(32+i*28),y-9+i*6,x-dir*(10+i*25),y-9+i*6,color,Math.max(1,4-i*.7),[9,8]);}c.restore();
}
function drawPhysics(c,s){
 const p=s.p,b=s.body,t=s.time;
 if(s.preset==="fall"){
  const base=468,y=base-clamp(b.y,0,22)*16.2;
  ground(c,base);shadow(c,505,474,90,11);
  fill(c,89,75,80,364,"#0c2f42a9",12);
  for(let n=0;n<=20;n+=2){const yy=430-n*16;stroke(c,101,yy,130,yy,"#a7dbd07f",n%4===0?2:1);label(c,String(n)+" m",135,yy+4,10,C.muted);}
  stroke(c,99,y,448,y,C.gold,1.5,[6,7]);
  if(t>.2){trajectory(c,518,y-22,110,1,"#76ddba");}
  disc(c,505,y-24,32,C.mint);ring(c,505,y-24,43,C.mint,.32);
  textChip(c,"HÖHE  "+b.y.toFixed(2)+" m",585,180,C.mint,181);
  textChip(c,"TEMPO  "+Math.abs(b.v).toFixed(2)+" m/s",585,220,C.gold,196);
  label(c,"GRAVITATION",47,89,11,C.mint);
  arrow(c,505,y+17,505,y+69,C.gold);
 }
 else if(s.preset==="pendulum"){
  ground(c,496);const topX=505,topY=126,L=p.length*Math.min(112,327/p.length);
  fill(c,347,101,315,20,"#496676",8);grad(c,350,101,309,9,"#d2e9e7","#689ca7",4);
  for(let i=-2;i<=2;i++)stroke(c,365+i*61,117,370+i*61,126,"#d7efe1",2);
  c.save();c.strokeStyle="#70c8c773";c.lineWidth=2;c.setLineDash([6,8]);c.beginPath();c.arc(topX,topY,L,PI*.18,PI*.82);c.stroke();c.restore();
  const x=topX+Math.sin(b.angle)*L,y=topY+Math.cos(b.angle)*L;
  stroke(c,topX,topY,topX,topY+L,"#acd1d133",1.5,[4,6]);
  stroke(c,topX,topY,x,y,"#d2e8e9",6);stroke(c,topX,topY,x,y,"#588d93",2);
  disc(c,x,y,33,C.mint);joint(c,topX,topY,9);shadow(c,x,490,47,7);
  textChip(c,"AUSLENKUNG  "+Math.round(b.angle*180/PI)+"°",32,116,C.mint,214);
  textChip(c,"LÄNGE  "+p.length.toFixed(1)+" m",32,157,C.gold,196);
 }
 else if(s.preset==="ramp"){
  ground(c,491);const ang=p.angle*PI/180,x0=285,y0=446,len=Math.min(610,330/Math.tan(ang)),y1=y0-Math.tan(ang)*len;
  c.fillStyle="#234554";c.beginPath();c.moveTo(x0,y1);c.lineTo(x0+len,y0);c.lineTo(x0,y0);c.closePath();c.fill();
  c.fillStyle="#31657770";c.beginPath();c.moveTo(x0+12,y1+9);c.lineTo(x0+len,y0);c.lineTo(x0+12,y0);c.closePath();c.fill();
  stroke(c,x0,y1,x0+len,y0,"#a8d4cd",10);stroke(c,x0,y1-3,x0+len,y0-3,"#e4f8e6",2);
  const fraction=clamp(b.d/13,0,1),x=x0+fraction*len,y=y1+fraction*Math.tan(ang)*len-31;
  disc(c,x,y,27,C.mint);ring(c,x,y,35,C.mint,.27);
  textChip(c,"NEIGUNG  "+p.angle+"°",45,94,C.mint,174);
  textChip(c,"WEG  "+b.d.toFixed(2)+" m",45,135,C.gold,167);
  arrow(c,x-8,y+27,x+Math.cos(ang)*65,y+27+Math.sin(ang)*65,C.gold);
  label(c,"TALABWÄRTS →",716,415,12,C.gold);
 }
 else if(s.preset==="collision"){
  ground(c,466);fill(c,80,405,844,58,"#163b4d",13);stroke(c,90,434,913,434,"#b1d3d152",3,[11,10]);
  const x1=500+b.x1*67,x2=500+b.x2*67;
  shadow(c,x1,451,40,8);shadow(c,x2,451,40,8);
  disc(c,x1,401,31,C.mint);disc(c,x2,401,31,C.gold);
  label(c,"A",x1,410,20,"#082a36","center",900);label(c,"B",x2,410,20,"#082a36","center",900);
  textChip(c,"A  "+p.massA+" kg",125,102,C.mint,160);textChip(c,"B  "+p.massB+" kg",125,142,C.gold,160);
  textChip(c,b.hit?"KONTAKT · ERFOLGT":"KOLLISIONSMODELL",125,182,b.hit?C.gold:C.aqua,205);
  if(!b.hit){arrow(c,x1+40,365,x1+105,365,C.mint);arrow(c,x2-40,365,x2-82,365,C.gold);}
  else{ring(c,(x1+x2)/2,403,Math.min(85,35+t*13),C.gold,.32);}
 }
}
function drawCar(c,rear,front,sim,vertical=0,tilt=0){
 const x=rear,w=clamp(front-rear-6,92,208),level=clamp(sim.body.damageLevel||0,0,20),d=level/20;
 c.save();c.translate(0,-vertical*66);
 if(tilt){const pivot=x+w*.5;c.translate(pivot,407);c.rotate(-tilt);c.translate(-pivot,-407);}
 shadow(c,x+w*.5,454,w*.56,12);
 c.beginPath();c.moveTo(x+7,356);c.lineTo(x+35,332+d*5);c.lineTo(x+66,305+d*20);
 c.lineTo(x+Math.min(136,w*.70),305+d*13);c.lineTo(x+Math.min(166,w*.83),338+d*16);
 c.lineTo(x+w-4,346+d*6);c.lineTo(x+w,360+d*4);c.lineTo(x+w,415);
 c.lineTo(x+7,416);c.closePath();
 const g=c.createLinearGradient(x,335,x+w,425);g.addColorStop(0,level>=15?"#c78878":"#98f0cc");
 g.addColorStop(.55,level>=9?"#7d9e98":"#45b59d");g.addColorStop(1,level>=6?"#526d73":"#246e7e");
 c.fillStyle=g;c.fill();c.strokeStyle="#d0f9e5";c.lineWidth=2;c.stroke();
 c.beginPath();c.moveTo(x+Math.min(68,w*.36),312+d*16);c.lineTo(x+Math.min(131,w*.68),312+d*13);
 c.lineTo(x+Math.min(151,w*.81),337+d*15);c.lineTo(x+Math.min(46,w*.30),337+d*13);c.closePath();
 c.fillStyle=level>=12?"#394854":"#23465d";c.fill();c.strokeStyle="#a7d7dc";c.lineWidth=2;c.stroke();
 stroke(c,x+Math.min(99,w*.52),310+d*14,x+Math.min(99,w*.52),337+d*13,"#8ec7d4",2);
 fill(c,x+w-18,358+d*5,12,24,"#ffe0a2",4);fill(c,x+6,358,9,25,"#fa9285",3);
 stroke(c,x+25,395,x+w-16,395,"#b4f5d884",2);
 wheel(c,x+Math.min(49,w*.28),422,24,sim.time*4);wheel(c,x+Math.max(67,w-38),422,24,sim.time*4);
 // Jede zusätzliche Stufe zeichnet ein weiteres Verformungs-/Risselement.
 for(let i=0;i<level;i++){
  const dx=x+w-14-((i*37)%Math.max(40,w-32)),yy=353+(i*19)%53;
  stroke(c,dx,yy,dx-6-(i%3)*3,yy+6+(i%4)*2,i%3===0?C.coral:"#153b49",1.3+(i%3)*.4);
 }
 if(level>=5)stroke(c,x+w-8,385,x+w-21,405,C.coral,3);
 if(level>=9){stroke(c,x+w*.58,316+d*8,x+w*.48,331+d*11,"#e4f8f7",2);stroke(c,x+w*.58,316+d*8,x+w*.65,333+d*14,"#e4f8f7",2);}
 if(level>=13){stroke(c,x+w*.48,315+d*10,x+w*.37,327+d*13,"#eef6e3",2);stroke(c,x+w*.55,329+d*8,x+w*.58,337+d*12,C.coral,2);}
 if(level>=17){ring(c,x+w-22,348,26,C.coral,.5);stroke(c,x+w-10,365,x+w+10,383,C.coral,3);}
 c.restore();
}
function drawCrash(c,s){
 const p=s.p,b=s.body,wall=776;
 ground(c,470);
 if(s.preset==="barrier"){
  fill(c,wall,95,35,374,"#718e9a",3);
  for(let i=0;i<15;i++)fill(c,wall+4,101+i*24,26,13,i%2?"#26394b":"#f3c779");
  stroke(c,wall,95,wall,469,"#e2f1eb",3);
  const front=wall+Math.min(0,b.x)*92,rear=front-(214-b.compression*86);
  drawCar(c,rear,front,s);
  if(b.compression>0){ring(c,wall,382,35,C.gold,.55);stroke(c,wall+8,370,wall+8+b.compression*100,370,C.gold,8);}
  label(c,"BETONBARRIERE",830,104,13,C.gold);
 }else if(s.preset==="gate"){
  fill(c,wall+10,295,15,172,"#8caaab",3);joint(c,wall+17,337,12);
  if(!b.gateBroken){
   stroke(c,wall,337,wall,451,"#f4f0dd",13);
   for(let y=352;y<452;y+=28)stroke(c,wall,y,wall,y+13,C.coral,9);
  }else{
   stroke(c,wall+17,338,wall+95,429,"#f4f0dd",12);
   for(let k=0;k<3;k++)stroke(c,wall+36+k*20,356+k*23,wall+46+k*20,368+k*23,C.coral,8);
   ring(c,wall+17,338,46,C.gold,.65);
  }
  const front=wall+b.x*92,rear=front-(214-b.compression*65);
  drawCar(c,rear,front,s);
  label(c,b.gateBroken?"SCHRANKE GEBROCHEN":"SCHRANKE · BRUCHLAST",820,104,13,C.gold);
 }else if(s.preset==="jump"){
  const ang=p.angle*PI/180,runup=1.2,takeoffX=645,top=runup*Math.tan(ang)*66;
  fill(c,90,456,465,15,"#396878",3);
  c.save();c.beginPath();c.moveTo(takeoffX-runup*82,470);c.lineTo(takeoffX,470-top);c.lineTo(takeoffX,470);c.closePath();c.fillStyle="#386273";c.fill();c.restore();
  stroke(c,takeoffX-runup*82,470,takeoffX,470-top,"#e8dcaf",8);
  stroke(c,takeoffX,470-top,takeoffX+20,470-top,C.gold,2,[5,5]);
  const v0=p.velocity/3.6,launch=Math.sqrt(Math.max(0,v0*v0-2*9.81*runup*Math.tan(ang)));
  const vx=launch*Math.cos(ang),vy=launch*Math.sin(ang),flight=(vy+Math.sqrt(vy*vy+2*9.81*runup*Math.tan(ang)))/9.81;
  const scale=Math.min(14,275/Math.max(12,vx*flight));
  const front=b.airborne?takeoffX+Math.max(0,b.x)*scale:takeoffX+b.x*82;
  const tilt=b.airborne&&!b.landed?Math.atan2(b.vy,Math.max(1,b.vx)):b.onRamp?ang:0;
  drawCar(c,front-214,front,s,b.y,tilt);
  label(c,b.airborne?(b.landed?"LANDEAUFPRALL":"BALLISTISCHER FLUG"):"ANFAHRT & SPRUNGRAMPE",720,106,13,C.gold);
  textChip(c,"HÖHE  "+b.y.toFixed(2)+" m",32,240,C.aqua,205);
 }
 textChip(c,"TEMPO  "+(Math.abs(b.v)*3.6).toFixed(1)+" km/h",32,112,C.mint,220);
 textChip(c,"MAX. BELASTUNG  "+b.maxG.toFixed(1)+" g",32,155,C.gold,250);
 textChip(c,"SCHADEN  "+String(b.damageLevel).padStart(2,"0")+" / 20",32,198,b.damageLevel>14?C.coral:C.aqua,244);
 label(c,"SCHADENINDEX · DIDAKTISCH",37,296,11,C.muted);
 gauge(c,37,307,240,12,b.damageLevel/20,b.damageLevel>14?C.coral:C.gold);
}
function drawWalker(c,s){
 const p=s.p,b=s.body,quad=b.legs.length===4,x=clamp(240+b.x/Math.max(1,p.targetDistance)*585,146,825);
 const color=validColor(p.color,C.mint),legFactor=clamp(p.limb||1,.6,1.55),head=clamp(p.head||1,.6,1.5),body=clamp(p.torso||1,.65,1.6);
 ground(c,476);
 // Festes, stets sichtbares Ziel bei frei wählbarer Strecke.
 stroke(c,848,210,848,467,C.gold,3,[9,7]);
 for(let k=0;k<5;k++)for(let n=0;n<2;n++)fill(c,850+n*11,245+k*11,11,11,(k+n)%2?"#153247":"#ecf6e4");
 label(c,"ZIEL "+p.targetDistance+" m",834,195,15,C.gold,"right",800);
 stroke(c,240,465,848,465,"#9fbbc144",3,[8,10]);
 shadow(c,x,473,quad?117:67,11);
 const hipY=quad?350:350,baseY=hipY+clamp(b.theta,-.9,.9)*23;
 if(quad){
  const anchors=[-66,-26,37,73];
  stroke(c,x-70*body,baseY-12,x+73*body,baseY-12,color,35);
  stroke(c,x+63,baseY-14,x+90,baseY-49,color,18);
  disc(c,x+103,baseY-59,23*head,color);
  for(let i=0;i<4;i++){const leg=b.legs[i],seg=52*legFactor,at=x+anchors[i],
    kx=at+seg*Math.sin(leg.hip),ky=baseY+seg*Math.cos(leg.hip),fx=kx+seg*Math.sin(leg.hip-leg.knee),fy=ky+seg*Math.cos(leg.hip-leg.knee);
    stroke(c,at,baseY,kx,ky,i%2?C.gold:color,12);stroke(c,kx,ky,fx,fy,i%2?C.gold:color,10);
    joint(c,kx,ky,7);stroke(c,fx-9,fy,fx+12,fy,"#d7fff2",5);if(leg.contact)ring(c,fx,fy,11,C.gold,.58);
  }
 }else{
  const shoulderY=baseY-116*body;
  stroke(c,x,baseY,x-11,shoulderY,color,27);
  disc(c,x-14,shoulderY-26*head,25*head,color);
  for(let i=0;i<2;i++){const leg=b.legs[i],seg=59*legFactor,anchor=x+(i?14:-14),kx=anchor+seg*Math.sin(leg.hip),ky=baseY+seg*Math.cos(leg.hip),fx=kx+seg*Math.sin(leg.hip-leg.knee),fy=ky+seg*Math.cos(leg.hip-leg.knee);
   stroke(c,anchor,baseY,kx,ky,i?C.gold:color,14);stroke(c,kx,ky,fx,fy,i?C.gold:color,11);
   joint(c,anchor,baseY,7);joint(c,kx,ky,7);
   stroke(c,fx-11,fy,fx+15,fy,"#e6fff7",5);if(leg.contact)ring(c,fx,fy,13,C.gold,.7);
  }
  stroke(c,x-13,shoulderY+20,x+38*Math.sin(b.phase),baseY-50,color,9);
  stroke(c,x-13,shoulderY+20,x-38*Math.sin(b.phase),baseY-50,C.gold,9);
 }
 ring(c,x,baseY-40,29,C.aqua,.18);
 stroke(c,x,baseY-10,x,473,"#f9dc9877",1,[5,5]);
 const status=b.fallen?"STURZ":s.training.running?"TRAINING":"BEWEGUNG";
 textChip(c,(quad?"VIERBEINER":"ZWEIBEINER")+" · "+status,33,101,b.fallen?C.coral:C.mint,272);
 textChip(c,"STRECKE  "+b.x.toFixed(2)+" m",33,140,C.gold,213);
 textChip(c,"KONTAKTE  "+b.contacts+" / "+b.legs.length,33,179,C.aqua,185);
 label(c,"BALANCE",34,246,11,C.muted);
 gauge(c,34,259,220,12,clamp(1-Math.abs(b.theta)/.88,0,1),b.fallen?C.coral:C.mint);
 label(c,"GEN. "+s.training.generation+" / "+Math.max(s.training.generation,s.training.targetGeneration)+" · ZIEL "+p.targetDistance+" m",34,299,13,C.muted);
 if(b.fallen)textChip(c,"VERSUCH BEENDET",660,94,C.coral,220);
 if(b.goalReached)textChip(c,"ZIEL ERREICHT ✓",656,94,C.mint,216);
}
function drawRacer(c,entity,x,y,slot,phase){
 const col=validColor(entity.color,slot==="A"?C.mint:C.gold);
 shadow(c,x,y+35,51,8);
 if(entity.kind==="quadruped"){
  stroke(c,x-19,y,x+22,y,col,18);stroke(c,x+20,y-4,x+36,y-19,col,10);disc(c,x+40,y-21,13,col);
  for(const dx of [-14,16])for(const shift of [0,8])stroke(c,x+dx+shift,y+7,x+dx+shift+Math.sin(phase+shift)*7,y+26,col,6);
 }else{
  const stride=Math.sin(phase)*13;
  stroke(c,x,y-16,x,y+7,col,15);disc(c,x,y-30,12,col);
  stroke(c,x-1,y+7,x-13+stride,y+31,col,7);stroke(c,x+1,y+7,x+14-stride,y+31,col,7);
  stroke(c,x,y-10,x-18-stride*.5,y+8,C.aqua,6);stroke(c,x,y-10,x+18+stride*.5,y+8,C.aqua,6);
 }
 ring(c,x,y,42,col,.28);fill(c,x-18,y-53,36,19,"#0d2c3f",8);
 label(c,slot,x,y-39,12,C.white,"center",850);
}
function arenaLane(c,y,color){
 fill(c,37,y-60,927,108,"#163b4e",15);
 fill(c,45,y-53,911,94,"#163249",10);
 stroke(c,55,y+41,950,y+41,"#72b8c84c",2);
 for(let j=1;j<16;j++)stroke(c,70+j*54,y-50,70+j*54,y+40,"#8acbd323",1,[4,8]);
 stroke(c,70,y-50,70,y+40,"#c9edf1",2);
}
function drawDuel(c,s){
 const b=s.body,who=b.fighters;
 ground(c,466);
 fill(c,105,414,788,50,"#254859",9);
 stroke(c,110,417,890,417,C.gold,4);
 for(let i=0;i<14;i++)stroke(c,132+i*57,421,115+i*57,453,"#8cd0bf3d",2);
 stroke(c,128,150,128,462,C.coral,4,[6,8]);stroke(c,872,150,872,462,C.coral,4,[6,8]);
 label(c,"KAMPFZONE",500,399,11,C.muted,"center");
 who.forEach((e,i)=>{
  const col=validColor(e.color,i===0?C.mint:C.gold),x=155+e.x/12*690,y=365-e.y*43;
  const dir=e.facing||1;
  shadow(c,x,429,45,8);
  c.save();c.translate(x,y);c.scale(dir,1);
  const phase=s.time*8+i*PI;
  const contact=e.actionTime>0,action=e.action;
  const jump=e.y>.1;
  if(e.kind==="quadruped"){
   stroke(c,-23,0,22,0,col,19);stroke(c,19,-1,40,-21,col,10);
   disc(c,47,-25,13,col);
   for(const dx of [-17,15])for(const off of [0,12]){
    stroke(c,dx+off/2,7,dx+off/2+Math.sin(phase+off)*5,27,col,7);
   }
   if(contact&&["Schlagen","Treten","Schubsen"].includes(action))stroke(c,18,0,58,2,C.gold,9);
  }else{
   const stride=jump?6:Math.sin(phase)*12;
   stroke(c,0,-30,0,7,col,19);disc(c,0,-46,15,col);
   stroke(c,-3,8,-18+stride,32,col,10);
   if(contact&&action==="Treten")stroke(c,2,8,49,5,C.gold,12);
   else stroke(c,3,8,17-stride,32,col,10);
   stroke(c,-4,-22,-27,-1,col,8);
   if(contact&&action==="Schlagen")stroke(c,6,-21,52,-24,C.gold,10);
   else if(contact&&action==="Schubsen"){stroke(c,5,-15,49,-9,C.aqua,10);stroke(c,1,-8,42,-2,C.aqua,8);}
   else stroke(c,4,-22,25,-3,col,8);
  }
  if(contact&&action==="Blocken"){
   ring(c,10,-10,35,C.aqua,.8);
   stroke(c,26,-38,32,17,C.aqua,8);
  }
  if(contact&&["Schubsen","Schlagen","Treten"].includes(action)){
   ring(c,49,-10,16,C.gold,.55);
   for(let k=0;k<3;k++)stroke(c,58+k*5,-22+k*12,76+k*7,-17+k*12,C.gold,2);
  }
  if(jump)ring(c,0,-6,41,C.mint,.26);
  c.restore();
  label(c,e.name,x,262,17,col,"center",750);
  textChip(c,contact?action:"Bereit",Math.max(110,Math.min(785,x-69)),280,contact?C.gold:C.muted,140);
  label(c,"+"+e.points+" Punkte",x,320,12,C.white,"center");
 });
 const [a,d]=who;
 for(const [i,e] of who.entries()){
  const x=i?543:34,col=i?C.gold:C.mint;
  fill(c,x,80,421,126,"#0b2b3dbf",15);
  label(c,e.name,x+14,103,18,col,"left",800);
  label(c,e.hp.toFixed(0)+" / 100 HP",x+14,125,12,C.white);
  gauge(c,x+14,133,384,15,e.hp/100,col);
  label(c,"ENERGIE",x+14,169,11,C.muted);
  gauge(c,x+85,158,312,9,e.energy/100,C.aqua);
  label(c,"TREFFER "+e.hits+"  ·  BLOCKS "+e.blocks+"  ·  RINGAUS "+e.ringouts,x+14,191,11,C.muted);
 }
 textChip(c,"DUELL · "+Math.ceil(Math.max(0,b.limit-b.elapsed))+" s",380,217,C.gold,240);
 if(b.winner)textChip(c,"SIEGER: "+b.winner,350,352,C.gold,330);
 const tr=s.duelTraining;
 if(tr&&tr.generation)label(c,"EVOLUTION · GEN "+tr.generation,500,506,13,C.mint,"center",800);
}
function drawArena(c,s){
 const b=s.body,p=s.p;
 if(s.preset==="duel"){drawDuel(c,s);return;}
 ground(c,487);arenaLane(c,222,C.mint);arenaLane(c,371,C.gold);
 const fx=920;fill(c,fx,152,19,267,"#c9e4eb",2);
 for(let r=0;r<14;r++)for(let col=0;col<2;col++)fill(c,fx+col*10,153+r*19,10,19,(r+col)%2?"#102638":"#f0f8ef");
 for(const at of (s.preset==="race"?[8,17,25]:[])){
  const px=70+at/32*850;
  for(const y of [222,371]){
   fill(c,px-11,y+1,21,36,"#b96b44",6);
   fill(c,px-16,y-9,30,16,"#f3c477",5);
   label(c,"!",px,y+4,13,"#182d40","center",850);
  }
 }
 const colors=[C.mint,C.gold];
 b.racers.forEach((e,i)=>{
  const y=i===0?222:371,x=70+clamp(e.x,0,32)/32*850,col=validColor(e.color,colors[i]);
  fill(c,73,y-50,clamp(e.x,0,32)/32*845,4,col,2);
  if(e.v>.2)trajectory(c,x-3,y,86,1,col);
  drawRacer(c,e,x,y,i===0?"A":"B",s.time*4+i*PI);
  label(c,e.name,71,y-75,18,col);
  fill(c,768,y-92,147,21,"#0a2839",8);
  gauge(c,785,y-85,114,7,e.stamina,col);
 });
 textChip(c,s.preset==="sprint"?"SPRINT · 32 METER":"HINDERNISRENNEN · 32 METER",33,76,C.mint,295);
 if(b.winner)textChip(c,"SIEGER: "+String(b.winner).slice(0,20),612,76,C.gold,322);
 label(c,"START",47,461,13,C.muted);
 label(c,"ZIEL",909,461,13,C.gold);
}

function gear(c,x,y,r,teeth,angle,color){
 c.save();c.translate(x,y);c.rotate(angle);
 c.shadowColor=color;c.shadowBlur=23;c.shadowOffsetY=6;
 c.beginPath();
 for(let k=0;k<teeth*4;k++){
  const a=(k/(teeth*4))*2*PI,rad=r*(k%4===1||k%4===2?1.09:.96);
  if(k===0)c.moveTo(Math.cos(a)*rad,Math.sin(a)*rad);else c.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);
 }
 c.closePath();const g=c.createLinearGradient(-r,-r,r,r);
 g.addColorStop(0,"#d7fff2");g.addColorStop(.16,color);g.addColorStop(.8,"#34657a");g.addColorStop(1,"#162f43");
 c.fillStyle=g;c.fill();c.shadowBlur=0;c.strokeStyle="#c7f1e5";c.lineWidth=2;c.stroke();
 disc(c,0,0,r*.68,"#21495b","#8bc7c9");
 for(let i=0;i<6;i++){
  const a=i*PI/3;stroke(c,Math.cos(a)*r*.2,Math.sin(a)*r*.2,Math.cos(a)*r*.55,Math.sin(a)*r*.55,color,r*.11);
 }
 disc(c,0,0,14,"#e4f6ed","#56777f");disc(c,0,0,5,"#183849");
 c.restore();
}
function mechanicsScene(c,s){
 const p=s.p,b=s.body;
 ground(c,481);
 if(s.preset==="lever"){
  const cx=510,cy=283,a=b.angle,l=p.armA*97,r=p.armB*97;
  const lx=cx-l*Math.cos(a),ly=cy+l*Math.sin(a),rx=cx+r*Math.cos(a),ry=cy-r*Math.sin(a);
  c.save();c.beginPath();c.moveTo(cx,cy+12);c.lineTo(cx-56,440);c.lineTo(cx+56,440);c.closePath();
  const g=c.createLinearGradient(460,285,550,441);g.addColorStop(0,"#73959f");g.addColorStop(1,"#244457");c.fillStyle=g;c.fill();c.strokeStyle="#bbd9d8";c.lineWidth=2;c.stroke();c.restore();
  stroke(c,cx-320,cy,cx+315,cy,"#85a9b851",1,[5,8]);
  stroke(c,lx,ly,rx,ry,"#153543",29);
  stroke(c,lx,ly,rx,ry,C.mint,19);
  stroke(c,lx,ly-4,rx,ry-4,"#d5fff27a",3);
  joint(c,cx,cy,17);
  disc(c,lx,ly,13,C.gold);disc(c,rx,ry,13,C.aqua);
  stroke(c,lx,ly+13,lx,ly+53,"#b9dadc",5);fill(c,lx-27,ly+53,54,48,"#d6a66c",8);
  stroke(c,rx,ry+13,rx,ry+53,"#b9dadc",5);fill(c,rx-27,ry+53,54,48,"#719fb4",8);
  label(c,"KRAFT",lx,ly+118,13,C.gold,"center");
  label(c,"LAST",rx,ry+118,13,C.aqua,"center");
  textChip(c,"DREHMOMENT  "+b.torque.toFixed(1)+" Nm",42,103,C.gold,248);
  textChip(c,"WINKEL  "+(a*180/PI).toFixed(1)+"°",42,144,C.mint,210);
 }
 else if(s.preset==="crank"){
  const cx=265,cy=308,r=p.crank*118,px=cx+Math.cos(b.angle)*r,py=cy+Math.sin(b.angle)*r,sliderX=cx+b.position*118;
  fill(c,152,432,720,12,"#4d8292",5);fill(c,154,441,716,7,"#163645",4);
  for(let x=167;x<856;x+=46)stroke(c,x,442,x-11,465,"#8eb6ba66",2);
  ring(c,cx,cy,r+15,C.mint,.20);disc(c,cx,cy,r,"#356c7b","#c4fcf0");
  for(let i=0;i<8;i++){
   const a=b.angle+i*2*PI/8;stroke(c,cx,cy,cx+Math.cos(a)*r*.78,cy+Math.sin(a)*r*.78,"#20485b",8);
  }
  stroke(c,px,py,sliderX,cy,"#174255",17);stroke(c,px,py,sliderX,cy,C.gold,10);
  disc(c,cx,cy,15,"#badbd9");joint(c,px,py,12);
  fill(c,sliderX-50,cy-32,100,64,"#7bc8b7",14);
  fill(c,sliderX-36,cy-20,72,39,"#174557",7);
  joint(c,sliderX,cy,10);
  textChip(c,"DREHZAHL  "+p.rpm+" U/MIN",43,103,C.mint,216);
  textChip(c,"SCHIEBER  "+b.position.toFixed(2)+" m",43,144,C.gold,231);
 }
 else if(s.preset==="gears"){
  const ra=Math.min(139,p.teethA*3.1),rb=Math.min(154,p.teethB*3.1),distance=ra+rb;
  const ax=500-distance/2,bx=500+distance/2,y=303;
  shadow(c,ax,473,ra*.9,12);shadow(c,bx,473,rb*.9,12);
  gear(c,ax,y,ra,p.teethA,b.angleA,C.mint);
  gear(c,bx,y,rb,p.teethB,b.angleB,C.gold);
  label(c,p.teethA+" ZÄHNE",ax,105,16,C.mint,"center");
  label(c,p.teethB+" ZÄHNE",bx,105,16,C.gold,"center");
  textChip(c,"ÜBERSETZUNG  "+(p.teethB/p.teethA).toFixed(2)+" : 1",35,155,C.mint,238);
  textChip(c,"AUSGANG  "+b.rpmB.toFixed(1)+" U/min",35,196,C.gold,249);
  textChip(c,"WIRKUNGSGRAD  "+(p.efficiency*100).toFixed(0)+" %",716,154,C.aqua,237);
  label(c,"ANTRIEB",ax,476,14,C.mint,"center");
  label(c,"ABTRIEB",bx,476,14,C.gold,"center");
 }
}

function mechanicsOverlay(c,s){
 const p=s.p,b=s.body;
 const kind={lever:"HEBEL & KRAFT",crank:"KURBEL & SCHUBSTANGE",gears:"ZAHNRAD-ÜBERSETZUNG"}[s.preset]||"MECHANIK";
 textChip(c,kind,750,76,C.mint,223);
 if(s.preset==="gears"){
  textChip(c,"ÜBERSETZUNG  "+(p.teethB/p.teethA).toFixed(2)+":1",32,112,C.gold,241);
  textChip(c,"WIRKUNGSGRAD  "+Math.round(p.efficiency*100)+" %",32,152,C.aqua,247);
 }else if(s.preset==="crank"){
  textChip(c,"DREHZAHL  "+p.rpm+" U/MIN",32,112,C.gold,215);
 }else if(s.preset==="lever"){
  textChip(c,"MOMENT  "+b.torque.toFixed(1)+" Nm",32,112,C.gold,218);
 }
}
export function drawScene(c,s){
 if(!s)return;
 if(s.mode==="mechanics"){c.save();bg(c,"mechanics");if(["lever","crank","gears"].includes(s.preset))mechanicsScene(c,s);else legacyDraw(c,s);hud(c,s.mode,s);footer(c,s);c.restore();return;}
 c.save();bg(c,s.mode);
 if(s.mode==="physics")drawPhysics(c,s);
 else if(s.mode==="crash")drawCrash(c,s);
 else if(s.mode==="bio")drawWalker(c,s);
 else if(s.mode==="arena")drawArena(c,s);
 hud(c,s.mode,s);footer(c,s);c.restore();
}
