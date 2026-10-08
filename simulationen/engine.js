// DMP Sim Lab – deterministische, bewusst vereinfachte Lehrmodelle
export const VERSION="1.0.0";
export const CONFIG={
 physics:{title:"Physik-Spielwiese",presets:[["fall","Freier Fall"],["pendulum","Pendel"],["ramp","Schiefe Ebene"],["collision","Kugelkollision"]],limit:"Lehrmodell mit idealisierten Körpern, festem Zeitschritt und angenommener Reibung. Nicht für technische Nachweise."},
 crash:{title:"Crashtest",presets:[["barrier","Auto gegen Barriere"]],limit:"Feder-Dämpfer-Modell einer Knautschzone; kein realer Fahrzeugcrash, keine Verletzungsprognose und keine Sicherheitsbewertung."},
 bio:{title:"Biomechanik",presets:[["walker","Zweibeiner: Balance & Gang"]],limit:"Stark vereinfachte Regelungs- und Kinematikdemo. Lernen optimiert Modellparameter, keine anatomisch korrekte Mensch-/Tier-Simulation."},
 arena:{title:"Arena",presets:[["race","Hindernisrennen"]],limit:"Regelbasiertes Rennen vereinfachter Agenten; Sieger entstehen aus transparenten Spielregeln, nicht aus realen biomechanischen Fähigkeiten."}
};
export const FIELDS={
 fall:[["gravity","Schwerkraft",0,20,0.5,"m/s²",9.81],["height","Starthöhe",2,22,1,"m",16],["bounce","Rückprall",0,1,.05,"",.65]],
 pendulum:[["gravity","Schwerkraft",0,20,.5,"m/s²",9.81],["length","Pendellänge",.5,5,.1,"m",2.6],["friction","Dämpfung",0,2,.05,"",.06]],
 ramp:[["gravity","Schwerkraft",0,20,.5,"m/s²",9.81],["angle","Neigung",5,45,1,"°",24],["friction","Gleitreibung",0,1,.02,"",.12]],
 collision:[["massA","Masse A",1,10,.5,"kg",3],["massB","Masse B",1,10,.5,"kg",5],["velocity","Starttempo A",.5,8,.5,"m/s",4],["bounce","Elastizität",0,1,.05,"",.85]],
 barrier:[["mass","Fahrzeugmasse",600,2500,100,"kg",1250],["velocity","Aufpralltempo",10,90,5,"km/h",50],["stiffness","Federsteifigkeit",80,600,20,"kN/m",280],["damping","Dämpfung",1,25,1,"kNs/m",10],["crush","Knautschweg",.2,1.3,.1,"m",.75]],
 walker:[["mass","Körpermasse",30,120,5,"kg",70],["amplitude","Schrittweite",.2,1,.05,"",.55],["frequency","Schrittfrequenz",.7,2.6,.1,"Hz",1.5],["feedback","Balance-Regler",1,8,.25,"",4.5],["traction","Bodenhaftung",.2,1,.1,"",.8]],
 race:[["speedA","Tempo A",1,6,.2,"m/s",3.5],["speedB","Tempo B",1,6,.2,"m/s",3.3],["staminaA","Ausdauer A",.2,1,.1,"",.8],["staminaB","Ausdauer B",.2,1,.1,"",.9],["obstacle","Hindernisschwierigkeit",0,1,.1,"",.6]]
};
export function initialParams(preset){return Object.fromEntries((FIELDS[preset]||[]).map(f=>[f[0],f[6]]))}
export function random(seed){let state=(seed>>>0)||1;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296}}
export function makeSim(mode,preset,params,seed=42){
 let p={...initialParams(preset),...params},r=random(seed);
 let s={mode,preset,p,seed,time:0,finished:false,history:[],plotClock:0};
 if(mode==="physics"){
  if(preset==="fall")s.body={y:p.height,v:0,bounces:0};
  if(preset==="pendulum")s.body={angle:.78,omega:0};
  if(preset==="ramp")s.body={d:0,v:0};
  if(preset==="collision")s.body={x1:-3.3,x2:2.8,v1:p.velocity,v2:-p.velocity*.25,hit:false};
 }
 if(mode==="crash")s.body={x:-5,v:p.velocity/3.6,force:0,maxG:0,compression:0,maxCompression:0,energy:.5*p.mass*(p.velocity/3.6)**2};
 if(mode==="bio"){s.body=makeWalker(p,r);s.training={running:false,generation:0,best:null,history:[],score:-Infinity,validation:null};}
 if(mode==="arena"){s.body={racers:[{name:String(p.nameA||"Entität A").slice(0,24),x:0,v:0,finish:null,stamina:p.staminaA,base:p.speedA,penalty:0},{name:String(p.nameB||"Entität B").slice(0,24),x:0,v:0,finish:null,stamina:p.staminaB,base:p.speedB,penalty:0}],winner:null,seed};}
 record(s);
 return s;
}
function makeWalker(p,r){return{x:0,y:0,theta:(r()-.5)*.15,omega:0,phase:0,v:.05,energy:0,fallen:false,fallTime:null,stepCount:0};}
function updateWalker(b,p,dt,r){
 if(b.fallen)return;
 const phaseBefore=b.phase;b.phase+=2*Math.PI*p.frequency*dt;
 if(Math.floor(b.phase/Math.PI)>Math.floor(phaseBefore/Math.PI))b.stepCount++;
 const h=Math.max(.05,Math.cos(b.theta)**2),drive=(1.18*p.amplitude*p.frequency*p.traction*h)*(0.86+.14*Math.sin(b.phase)**2);
 const damping=.35+.23*p.feedback;
 const torque=2.5*Math.sin(b.theta)-.74*p.feedback*b.theta-damping*b.omega+.45*p.amplitude*Math.sin(b.phase)+(.06*r()-.03);
 b.omega+=torque*dt;b.theta+=b.omega*dt;
 const target=Math.max(0,drive*(1-.10*Math.abs(p.frequency-1.7)));
 b.v+=(target-b.v)*Math.min(1,3*dt);b.x+=b.v*dt;
 b.energy+=dt*p.mass*(.011+.022*p.amplitude*p.amplitude*p.frequency*p.frequency+.007*p.feedback);
 if(Math.abs(b.theta)>.88){b.fallen=true;b.fallTime=b.x;}
}
export function stepSim(s,dt=1/120){
 if(s.finished)return;
 const p=s.p,b=s.body;s.time+=dt;
 if(s.mode==="physics"){
  if(s.preset==="fall"){b.v-=p.gravity*dt;b.y+=b.v*dt;if(b.y<0){b.y=0;if(Math.abs(b.v)>.25){b.v=-b.v*p.bounce;b.bounces++}else b.v=0;}}
  if(s.preset==="pendulum"){b.omega+=(-p.gravity/p.length*Math.sin(b.angle)-p.friction*b.omega)*dt;b.angle+=b.omega*dt;}
  if(s.preset==="ramp"){const a=p.gravity*(Math.sin(p.angle*Math.PI/180)-p.friction*Math.cos(p.angle*Math.PI/180));b.v=Math.max(0,b.v+a*dt);b.d=Math.min(13,b.d+b.v*dt);if(b.d===13){b.v=0;s.finished=true;}}
  if(s.preset==="collision"){b.x1+=b.v1*dt;b.x2+=b.v2*dt;const rad=.48;if(!b.hit&&b.x2-b.x1<=rad*2&&b.v1>b.v2){const v1=b.v1,v2=b.v2,e=p.bounce;b.v1=(p.massA*v1+p.massB*v2-p.massB*e*(v1-v2))/(p.massA+p.massB);b.v2=(p.massA*v1+p.massB*v2+p.massA*e*(v1-v2))/(p.massA+p.massB);b.hit=true;const overlap=rad*2-(b.x2-b.x1);b.x1-=overlap/2;b.x2+=overlap/2;}if(b.x1>8&&b.x2>8||b.x1< -8&&b.x2< -8)s.finished=true;}
 }
 if(s.mode==="crash"){
  b.x+=b.v*dt;
  const compression=Math.max(0,b.x),stiffness=p.stiffness*1000,damp=p.damping*1000;
  b.force=compression>0?stiffness*Math.min(compression,p.crush)+damp*Math.max(0,b.v)+Math.max(0,compression-p.crush)*stiffness*25:0;
  b.v-=b.force/p.mass*dt;
  b.compression=Math.max(0,Math.min(compression,p.crush));
  b.maxCompression=Math.max(b.maxCompression,b.compression);
  b.maxG=Math.max(b.maxG,b.force/p.mass/9.81);
  if(b.x<-.6&&b.v<0){s.finished=true;b.force=0;}
  if(s.time>12)s.finished=true;
 }
 if(s.mode==="bio"){updateWalker(b,p,dt,random(s.seed+Math.floor(s.time*120)));if(b.fallen||s.time>22)s.finished=true;}
 if(s.mode==="arena"){
  for(let i=0;i<2;i++){const racer=b.racers[i];if(racer.finish!==null)continue;
   racer.v+=(racer.base*(.72+.28*racer.stamina)-racer.v)*dt*2;
   racer.x+=racer.v*dt;
   for(const pos of [8,17,25]){const key="passed"+pos;if(!racer[key]&&racer.x>=pos){racer[key]=true;const hazard=.75+.7*random(s.seed+pos*173+i*719)();racer.penalty+=p.obstacle*hazard;racer.v=Math.max(0,racer.v*(1-.65*p.obstacle));}}
   racer.stamina=Math.max(.1,racer.stamina-.008*dt);
   if(racer.x>=32){racer.x=32;racer.finish=s.time;}
  }
  if(b.racers.every(a=>a.finish!==null)||s.time>60){s.finished=true;const [a,c]=b.racers;b.winner=a.finish===null?(c.finish===null?"Unentschieden":c.name):c.finish===null?a.name:Math.abs(a.finish-c.finish)<.001?"Unentschieden":a.finish<c.finish?a.name:c.name;}
 }
 s.plotClock+=dt;if(s.plotClock>=.10){s.plotClock=0;record(s);}
}
export function measure(s){
 const p=s.p,b=s.body,fmt=(n,d=2)=>Number.isFinite(n)?n.toFixed(d):"–";
 if(s.mode==="physics"){
  if(s.preset==="fall")return{plot:b.y,chart:"Höhe (m)",read:[["Höhe",fmt(b.y)+" m"],["Tempo",fmt(Math.abs(b.v))+" m/s"],["Aufprälle",String(b.bounces)],["Zeit",fmt(s.time,1)+" s"]]};
  if(s.preset==="pendulum")return{plot:b.angle*180/Math.PI,chart:"Auslenkung (°)",read:[["Winkel",fmt(b.angle*180/Math.PI,1)+"°"],["Drehgeschw.",fmt(b.omega)+" rad/s"],["Länge",fmt(p.length,1)+" m"],["Zeit",fmt(s.time,1)+" s"]]};
  if(s.preset==="ramp")return{plot:b.v,chart:"Geschwindigkeit (m/s)",read:[["Strecke",fmt(b.d,1)+" m"],["Tempo",fmt(b.v)+" m/s"],["Neigung",fmt(p.angle,0)+"°"],["Zeit",fmt(s.time,1)+" s"]]};
  return{plot:b.v1,chart:"Geschwindigkeit Kugel A (m/s)",read:[["Tempo A",fmt(b.v1)+" m/s"],["Tempo B",fmt(b.v2)+" m/s"],["Kontakt",b.hit?"Ja":"Nein"],["Zeit",fmt(s.time,1)+" s"]]};
 }
 if(s.mode==="crash")return{plot:b.force/1000,chart:"Kontaktkraft (kN)",read:[["Aktuelle Kraft",fmt(b.force/1000,1)+" kN"],["Spitzenlast",fmt(b.maxG,1)+" g"],["Max. Stauchung",fmt(b.maxCompression*100,0)+" cm"],["Tempo",fmt(Math.abs(b.v)*3.6,1)+" km/h"]]};
 if(s.mode==="bio")return{plot:b.x,chart:"Gelaufene Strecke (m)",read:[["Strecke",fmt(b.x,2)+" m"],["Stabilität",b.fallen?"Gestürzt":"Aufrecht"],["Energie (Modell)",fmt(b.energy,0)+" E"],["Training",s.training.generation+" Gen."]]};
 const [a,c]=b.racers;return{plot:a.x-c.x,chart:"Vorsprung A − B (m)",read:[["Entität A",fmt(a.x,1)+" / 32 m"],["Entität B",fmt(c.x,1)+" / 32 m"],["Zeit",fmt(s.time,1)+" s"],["Sieger",b.winner||"–"]]};
}
function record(s){const m=measure(s);s.history.push({t:s.time,v:m.plot});if(s.history.length>240)s.history.shift();}
export function evaluateWalker(p,genome,seed=17){
 const q={...p,...genome},r=random(seed),b=makeWalker(q,r);const dt=1/60;
 for(let t=0;t<14;t+=dt){updateWalker(b,q,dt,r);if(b.fallen)break;}
 const score=b.x-(b.fallen?4:0)-b.energy*.028;
 return{score,distance:b.x,fallen:b.fallen,energy:b.energy};
}
export function trainOneGeneration(s){
 if(s.mode!=="bio")return;
 const tr=s.training;if(!tr.running)return;
 const r=random(s.seed+tr.generation*917+77),current=tr.best;
 for(let i=0;i<14;i++){
  let g;
  if(current&&i<10){g={amplitude:clamp(current.amplitude+(r()-.5)*.55,.2,1),frequency:clamp(current.frequency+(r()-.5)*1,.7,2.6),feedback:clamp(current.feedback+(r()-.5)*3,1,8)};}
  else g={amplitude:.2+r()*.8,frequency:.7+r()*1.9,feedback:1+r()*7};
  const v=evaluateWalker(s.p,g,s.seed+tr.generation%3);
  if(v.score>tr.score){tr.score=v.score;tr.best=g;tr.validation=evaluateWalker(s.p,g,s.seed+501);}
 }
 tr.generation++;tr.history.push({generation:tr.generation,training:tr.score,validation:tr.validation.score});
 if(tr.generation>=25)tr.running=false;
}
export function trainedToArena(genome){return clamp(1.8+genome.amplitude*genome.frequency*1.15,1,6);}
export function arenaBatch(params,seed=42,count=10){
 let wins=[0,0,0];
 for(let i=0;i<count;i++){
  const q=i%2?{...params,speedA:params.speedB,speedB:params.speedA,staminaA:params.staminaB,staminaB:params.staminaA}:params;
  const s=makeSim("arena","race",q,seed+i);
  for(let j=0;j<60*60&&!s.finished;j++)stepSim(s,1/60);
  const [a,b]=s.body.racers;let winner=a.finish===null?1:b.finish===null?0:Math.abs(a.finish-b.finish)<.001?2:a.finish<b.finish?0:1;
  if(i%2&&winner!==2)winner=1-winner;wins[winner]++;
 }
 return wins;
}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const colors={a:"#53deb6",b:"#f8bc6a"};
function txt(c,t,x,y,size=17,color="#d8edfb",align="left"){c.fillStyle=color;c.font="600 "+size+"px system-ui";c.textAlign=align;c.fillText(t,x,y);c.textAlign="left";}
function line(c,x1,y1,x2,y2,color="#65879a",w=2){c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function box(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
function grid(c){let grad=c.createLinearGradient(0,0,0,560);grad.addColorStop(0,"#13293d");grad.addColorStop(1,"#0b1727");c.fillStyle=grad;c.fillRect(0,0,1000,560);c.strokeStyle="#284259";c.lineWidth=1;for(let x=0;x<1000;x+=50){c.beginPath();c.moveTo(x,0);c.lineTo(x,560);c.stroke();}for(let y=0;y<560;y+=50){c.beginPath();c.moveTo(0,y);c.lineTo(1000,y);c.stroke();}}
function ground(c,y){box(c,0,y,1000,560-y,"#153343");line(c,0,y,1000,y,"#5ab99f",4);for(let x=0;x<1000;x+=35)line(c,x,y+10,x+15,y+22,"#2f5b68",2);}
export function drawScene(c,s){
 if(!s)return;grid(c);const p=s.p,b=s.body,t=s.time;
 if(s.mode==="physics"){
  if(s.preset==="fall"){ground(c,476);for(let i=0;i<5;i++){line(c,110+i*14,90,110+i*14,476,"#2a4957",1)}const y=476-Math.max(0,b.y)/22*365;circle(c,460,y-18,24,colors.a);circle(c,453,y-25,7,"#dbffef");line(c,90,y-18,120,y-18,"#f5c86a");txt(c,b.y.toFixed(2)+" m",130,y-25,18);txt(c,"HÖHE",90,67,13,"#88a5b9");}
  if(s.preset==="pendulum"){ground(c,498);const topX=500,topY=92,scale=Math.min(115,340/p.length),L=p.length*scale;line(c,360,92,640,92,"#e1e8ef",10);line(c,topX,topY,topX+Math.sin(b.angle)*L,topY+Math.cos(b.angle)*L,"#a9ced4",5);circle(c,topX+Math.sin(b.angle)*L,topY+Math.cos(b.angle)*L,30,colors.a);circle(c,topX,topY,11,"#f6c86c");line(c,topX,topY,topX,topY+365,"#4e6d7b",1);txt(c,"Schwerkraft · "+p.gravity+" m/s²",35,50,15);}
  if(s.preset==="ramp"){ground(c,491);const ang=p.angle*Math.PI/180,startX=115,startY=450,length=Math.min(720,340/Math.tan(ang)),endY=startY-Math.tan(ang)*length; c.fillStyle="#294a56";c.beginPath();c.moveTo(startX,startY);c.lineTo(startX+length,endY);c.lineTo(startX+length,startY);c.closePath();c.fill();line(c,startX,startY,startX+length,endY,"#7db5b4",6);const a=clamp(b.d/13,0,1);let x=startX+a*length,y=startY-a*Math.tan(ang)*length-19;circle(c,x,y,21,colors.a);txt(c,"Neigung "+p.angle+"°",50,67,17);}
  if(s.preset==="collision"){ground(c,450);const scale=67,x1=500+b.x1*scale,x2=500+b.x2*scale;circle(c,x1,414,30,colors.a);circle(c,x2,414,30,colors.b);txt(c,"A · "+p.massA+" kg",x1,360,16,colors.a,"center");txt(c,"B · "+p.massB+" kg",x2,360,16,colors.b,"center");txt(c,"Impuls und Rückprall",48,72,18);}
 }
 if(s.mode==="crash"){ground(c,465);const barrier=770;box(c,barrier,108,35,356,"#7593a3");for(let y=110;y<465;y+=29)line(c,barrier+1,y,barrier+34,y+30,"#b5cfda",2);txt(c,"STARRE BARRIERE",795,90,14);
  const front=barrier+b.x*92;const rear=front-214;
  box(c,rear,354,front-rear-8,80,"#47aa96");box(c,rear+35,322,112,45,"#308372");box(c,rear+42,330,42,30,"#a6dce0");box(c,rear+90,330,48,30,"#a6dce0");box(c,front-15,358,16,60,"#ffce79");circle(c,rear+53,440,23,"#15212b");circle(c,rear+53,440,12,"#8a9faa");circle(c,front-39,440,23,"#15212b");circle(c,front-39,440,12,"#8a9faa");
  if(b.compression>0){box(c,barrier,370,Math.max(2,b.compression*92),10,"#f8bc6a");}
  txt(c,"MODELLIERTER KONTAKT",35,70,15);txt(c,"Max. Stauchung: "+(b.maxCompression*100).toFixed(0)+" cm",35,100,16,colors.b);
 }
 if(s.mode==="bio"){ground(c,480);const x=clamp(250+b.x*28,80,860),py=372+b.theta*35,phase=b.phase,amp=p.amplitude*80;
  // zweigliedriges illustratives Strichmodell, Kopfausrichtung folgt Schwerpunktregelung
  const hx=x+Math.sin(b.theta)*30;let kneeAX=hx+Math.sin(phase)*amp*.62,kneeBX=hx-Math.sin(phase)*amp*.62;
  line(c,hx,py,hx+Math.sin(b.theta)*-10,py-112,colors.a,15);line(c,hx+Math.sin(b.theta)*-10,py-112,hx+Math.sin(b.theta)*-15,py-155,colors.a,5);
  circle(c,hx-15*Math.sin(b.theta),py-175,28,"#f8cf99");
  line(c,hx,py,kneeAX,py+57,"#7ccdb7",13);line(c,kneeAX,py+57,kneeAX+Math.sin(phase)*23,475-Math.max(0,Math.sin(phase))*25,"#7ccdb7",10);
  line(c,hx,py,kneeBX,py+57,"#f8bc6a",13);line(c,kneeBX,py+57,kneeBX-Math.sin(phase)*23,475-Math.max(0,-Math.sin(phase))*25,"#f8bc6a",10);
  line(c,hx,py-91,hx+Math.sin(phase)*43,py-15,"#70bfae",7);line(c,hx,py-91,hx-Math.sin(phase)*43,py-15,"#f8bc6a",7);
  line(c,hx,180,hx,470,"#f0dd7999",1);txt(c,b.fallen?"GESTÜRZT":s.training.running?"EVOLUTION LÄUFT":"BALANCE & GANG",35,65,18,b.fallen?"#ff9999":colors.a);txt(c,"Training: "+s.training.generation+"/25 Generationen",35,96,14);
  if(b.fallen)txt(c,"Versuch beendet – Reset oder Training starten",500,180,20,"#ffb2a9","center");
 }
 if(s.mode==="arena"){ground(c,478);box(c,34,156,932,245,"#1d344a");line(c,34,270,966,270,"#496478",4);line(c,74,156,74,401,"#92b9c5",3);for(let i=0;i<13;i++){line(c,74+i*69,156,74+i*69,401,"#314c5e",1);}
  for(const pos of [8,17,25]){const px=74+pos/32*850;for(const y of [213,325]){box(c,px-9,y-26,18,45,"#ee9a51");txt(c,"▲",px,y-33,17,colors.b,"center");}}
  const finish=924;for(let j=0;j<10;j++)for(let k=0;k<2;k++)box(c,finish+j%2*8,158+j*24+k*12,8,12,(j+k)%2?"#f8f8ff":"#16283b");
  for(let i=0;i<2;i++){const e=b.racers[i],x=74+e.x/32*850,y=i===0?207:327;circle(c,x,y,30,i===0?colors.a:colors.b);txt(c,i===0?"A":"B",x,y+8,23,"#122436","center");txt(c,e.name,55,y-45,16,i===0?colors.a:colors.b);}
  if(b.winner)txt(c,"SIEGER: "+b.winner,500,78,29,colors.a,"center");else txt(c,"HINDERNISRENNEN · 32 m",500,78,20,"#bdd4de","center");
 }
 txt(c,"SIMULATION · v"+VERSION,23,540,12,"#7798a9");txt(c,t.toFixed(2)+" s",976,540,13,"#c5d4e1","right");
}
