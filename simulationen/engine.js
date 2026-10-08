// DMP Sim Lab – deterministische, bewusst vereinfachte Lehrmodelle
import {makeDuel,stepDuel,makeDuelTraining,duelDefaultGenome,duelStyle,simulateDuel} from "./duel-core.js?v=1.5.0";
export const VERSION="1.5.0";
export const CONFIG={
 physics:{title:"Physik-Spielwiese",presets:[["fall","Freier Fall"],["pendulum","Pendel"],["ramp","Schiefe Ebene"],["collision","Kugelkollision"]],limit:"Lehrmodell mit idealisierten Körpern, festem Zeitschritt und angenommener Reibung. Nicht für technische Nachweise."},
 crash:{title:"Crashtest",presets:[["barrier","Auto gegen Betonbarriere"],["gate","Auto gegen Schranke"],["jump","Auto über Sprungrampe"]],limit:"Vereinfachte Kontakt-, Bruch- und Flugmodelle. Schadensstufen sind illustrative Werte aus Belastung und Verformung, keine realen Fahrzeug- oder Verletzungsprognosen."},
 bio:{title:"Biomechanik",presets:[["walker","Zweibeiner: Balance & Gang"],["quad","Vierbeiner: Traben lernen"]],limit:"Zweibeiner-/Vierbeinermodell mit begrenzten Gelenkmotoren und vereinfachter Fußkontaktregel. Keine anatomisch vollständige oder medizinische Simulation."},
 arena:{title:"Arena",presets:[["race","Hindernisrennen"],["sprint","Sprint ohne Hindernisse"],["duel","Duell-Arena: Schubsen, Springen, Schlagen & Treten"]],limit:"Rennen und stilisierte 2D-Duelle. Kräfte, Treffer und Lernstrategien sind Spielregeln; keine realen Körper- oder Verletzungsmodelle."},
 mechanics:{title:"Maschinen & Mechanik",presets:[["lever","Hebel am Drehgelenk"],["crank","Kurbel & Schubstange"],["gears","Zahnradübersetzung"]],limit:"Idealisierte 2D-Lehrmodelle. Hebel mit Trägheit und Anschlag; Kurbel und Zahnräder kinematisch vorgegeben. Kein Festigkeitsnachweis, keine Fertigungsfreigabe."}
};
export const FIELDS={
 fall:[["gravity","Schwerkraft",0,20,0.5,"m/s²",9.81],["height","Starthöhe",2,22,1,"m",16],["bounce","Rückprall",0,1,.05,"",.65]],
 pendulum:[["gravity","Schwerkraft",0,20,.5,"m/s²",9.81],["length","Pendellänge",.5,5,.1,"m",2.6],["friction","Dämpfung",0,2,.05,"",.06]],
 ramp:[["gravity","Schwerkraft",0,20,.5,"m/s²",9.81],["angle","Neigung",5,45,1,"°",24],["friction","Gleitreibung",0,1,.02,"",.12]],
 collision:[["massA","Masse A",1,10,.5,"kg",3],["massB","Masse B",1,10,.5,"kg",5],["velocity","Starttempo A",.5,8,.5,"m/s",4],["bounce","Elastizität",0,1,.05,"",.85]],
 barrier:[["mass","Fahrzeugmasse",600,2500,100,"kg",1250],["velocity","Aufpralltempo",10,90,5,"km/h",50],["stiffness","Federsteifigkeit",80,600,20,"kN/m",280],["damping","Dämpfung",1,25,1,"kNs/m",10],["crush","Knautschweg",.2,1.3,.1,"m",.75]],
  gate:[["mass","Fahrzeugmasse",600,2500,100,"kg",1250],["velocity","Aufpralltempo",10,90,5,"km/h",50],["gateStrength","Bruchkraft der Schranke",5,120,5,"kN",35],["gateDeflection","Nachgiebigkeit",.1,1,.05,"m",.4]],
  jump:[["mass","Fahrzeugmasse",600,2500,100,"kg",1250],["velocity","Anfahrtempo",10,90,5,"km/h",50],["angle","Absprungwinkel",10,35,1,"°",22],["crush","Landungs-Knautschweg",.1,1,.05,"m",.45]],
 walker:[["mass","Körpermasse",30,120,5,"kg",70],["amplitude","Schrittweite",.2,1,.05,"",.55],["frequency","Schrittfrequenz",.7,2.6,.1,"Hz",1.5],["feedback","Balance-Regler",1,8,.25,"",4.5],["traction","Bodenhaftung",.2,1,.1,"",.8],["targetDistance","Zielstrecke",5,30,1,"m",12],["generations","Generationen pro Runde",25,100,25,"",25]],
 quad:[["mass","Körpermasse",10,120,5,"kg",40],["amplitude","Schrittweite",.2,1,.05,"",.65],["frequency","Schrittfrequenz",.7,2.6,.1,"Hz",1.8],["feedback","Balance-Regler",1,8,.25,"",4.5],["traction","Bodenhaftung",.2,1,.1,"",.8],["targetDistance","Zielstrecke",5,30,1,"m",12],["generations","Generationen pro Runde",25,100,25,"",25]],
 sprint:[["speedA","Tempo A",1,6,.2,"m/s",3.5],["speedB","Tempo B",1,6,.2,"m/s",3.3],["staminaA","Ausdauer A",.2,1,.1,"",.8],["staminaB","Ausdauer B",.2,1,.1,"",.9]],
 lever:[["armA","Hebelarm links",.5,3,.1,"m",1.5],["armB","Hebelarm rechts",.5,3,.1,"m",2],["force","Eingangskraft",0,180,5,"N",110],["load","Lastkraft",0,180,5,"N",65],["inertia","Trägheitsmoment",.5,25,.5,"kg·m²",9],["damping","Dämpfung",0,18,.5,"N·m·s",3]],
 crank:[["crank","Kurbelradius",.2,.9,.05,"m",.6],["rod","Pleuellänge",1.2,3,.1,"m",2],["rpm","Drehzahl",5,180,5,"U/min",55]],
 gears:[["teethA","Zähne Eingang",12,48,2,"",24],["teethB","Zähne Ausgang",12,60,2,"",40],["rpm","Eingangsdrehzahl",10,180,5,"U/min",90],["torque","Eingangsdrehmoment",5,100,5,"N·m",30],["efficiency","Wirkungsgrad",.5,1,.05,"",.9]],
 duel:[["speedA","Bewegungstempo A",1,6,.2,"m/s",3.5],["speedB","Bewegungstempo B",1,6,.2,"m/s",3.3],["staminaA","Ausdauer A",.2,1,.1,"",.8],["staminaB","Ausdauer B",.2,1,.1,"",.9],["duelDuration","Dauer pro Duell",12,36,6,"s",24],["evoRounds","Generationen je Lernrunde",5,25,5,"",10]],
 race:[["speedA","Tempo A",1,6,.2,"m/s",3.5],["speedB","Tempo B",1,6,.2,"m/s",3.3],["staminaA","Ausdauer A",.2,1,.1,"",.8],["staminaB","Ausdauer B",.2,1,.1,"",.9],["obstacle","Hindernisschwierigkeit",0,1,.1,"",.6]]
};
export function initialParams(preset){return Object.fromEntries((FIELDS[preset]||[]).map(f=>[f[0],f[6]]))}
export function random(seed){let state=(seed>>>0)||1;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296}}
export function makeSim(mode,preset,params,seed=42){
 let p={...initialParams(preset),...params},r=random(seed);
 let s={mode,preset,p,seed,rng:r,time:0,finished:false,history:[],plotClock:0};
 if(mode==="physics"){
  if(preset==="fall")s.body={y:p.height,v:0,bounces:0};
  if(preset==="pendulum")s.body={angle:.78,omega:0};
  if(preset==="ramp")s.body={d:0,v:0};
  if(preset==="collision")s.body={x1:-3.3,x2:2.8,v1:p.velocity,v2:-p.velocity*.25,hit:false};
 }
 if(mode==="crash")s.body={x:-5,y:0,v:p.velocity/3.6,vx:0,vy:0,force:0,maxG:0,compression:0,maxCompression:0,energy:.5*p.mass*(p.velocity/3.6)**2,impactEnergy:0,damageLevel:0,gateBroken:false,airborne:false,onRamp:false,landed:false,flightTime:0};
 if(mode==="bio"){p.gait=preset;s.body=makeWalker(p,r,preset);s.training={running:false,generation:0,targetGeneration:0,best:null,history:[],score:-Infinity,validation:null};}
 if(mode==="mechanics"){
  if(preset==="lever")s.body={angle:0,omega:0,torque:0,stop:false};
  if(preset==="crank")s.body={angle:0,position:p.crank+p.rod,velocity:0,omega:p.rpm*2*Math.PI/60};
  if(preset==="gears")s.body={angleA:0,angleB:Math.PI/p.teethB,rpmB:-p.rpm*p.teethA/p.teethB,torqueB:p.torque*p.teethB/p.teethA*p.efficiency};
 }
 if(mode==="arena"&&preset==="duel"){
  s.body=makeDuel(p,[p.genomeA||duelDefaultGenome(),p.genomeB||duelDefaultGenome()],seed);
  s.duelTraining=makeDuelTraining();
  s.duelTraining.genomes=[{...s.body.fighters[0].genome},{...s.body.fighters[1].genome}];
 }
 if(mode==="arena"&&preset!=="duel"){const appearance=(side,fallback)=>({color:/^#[a-fA-F0-9]{6}$/.test(p["color"+side]||"")?p["color"+side]:fallback,kind:p["kind"+side]==="quadruped"?"quadruped":"biped"});s.body={racers:[{name:String(p.nameA||"Entität A").slice(0,24),x:0,v:0,finish:null,stamina:p.staminaA,base:p.speedA,penalty:0,...appearance("A","#53deb6")},{name:String(p.nameB||"Entität B").slice(0,24),x:0,v:0,finish:null,stamina:p.staminaB,base:p.speedB,penalty:0,...appearance("B","#f8bc6a")}],winner:null,seed};}
 record(s);
 return s;
}
function makeWalker(p,r,preset="walker"){
 const count=preset==="quad"?4:2;
 const legs=Array.from({length:count},(_,i)=>({hip:0,knee:.15,hipRate:0,kneeRate:0,contact:false,torque:0}));
 return{x:0,y:0,theta:(r()-.5)*.15,omega:0,phase:0,v:.05,energy:0,fallen:false,fallTime:null,goalReached:false,goalTime:null,elapsed:0,stepCount:0,legs,contacts:0};
}
// Gelenkregler mit begrenzten Antrieben (didaktische, nicht vollständige Starrkörperdynamik).
// Hüft- und Kniegelenkwinkel fließen in die Fußkontakt- und Vortriebsregel ein.
function updateWalker(b,p,dt,r){
 if(b.fallen||b.goalReached)return;
 b.elapsed+=dt;
 const previous=b.phase;
 b.phase+=2*Math.PI*p.frequency*dt;
 if(Math.floor(b.phase/Math.PI)>Math.floor(previous/Math.PI))b.stepCount++;
 let contacts=0,motorWork=0;
 const count=b.legs.length;
 for(let i=0;i<count;i++){
  const leg=b.legs[i];
  const offset=count===2?i*Math.PI:[0,Math.PI,Math.PI,0][i];
  const phase=b.phase+offset;
  const hipTarget=.52*p.amplitude*Math.cos(phase);
  const kneeTarget=.09+.87*p.amplitude*Math.max(0,Math.sin(phase));
  const torqueHip=clamp(17*(hipTarget-leg.hip)-3.1*leg.hipRate,-7,7);
  const torqueKnee=clamp(22*(kneeTarget-leg.knee)-3.6*leg.kneeRate,-8,8);
  leg.hipRate=clamp(leg.hipRate+((torqueHip/2.2)-.18*leg.hipRate)*dt,-4,4);
  leg.kneeRate=clamp(leg.kneeRate+((torqueKnee/1.5)-.18*leg.kneeRate)*dt,-5,5);
  leg.hip=clamp(leg.hip+leg.hipRate*dt,-.85,.85);
  leg.knee=clamp(leg.knee+leg.kneeRate*dt,0,1.6);
  if((leg.hip===-.85&&leg.hipRate<0)||(leg.hip===.85&&leg.hipRate>0))leg.hipRate=0;
  if((leg.knee===0&&leg.kneeRate<0)||(leg.knee===1.6&&leg.kneeRate>0))leg.kneeRate=0;
  const verticalReach=(Math.cos(leg.hip)+Math.cos(leg.hip-leg.knee))/2;
  leg.contact=verticalReach>.84;
  if(leg.contact)contacts++;
  leg.torque=Math.abs(torqueHip)+Math.abs(torqueKnee);
  motorWork+=Math.abs(torqueHip*leg.hipRate)+Math.abs(torqueKnee*leg.kneeRate);
 }
 b.contacts=contacts;
 const support=clamp(contacts/count,.12,1);
 const stability=count===4?1.35:1;
 const damping=.35+.23*p.feedback;
 const torque=(2.5*Math.sin(b.theta)-.74*p.feedback*stability*b.theta-damping*b.omega+.3*p.amplitude*Math.sin(b.phase)/Math.sqrt(count)+(.06*r()-.03))/(.7+.5*support);
 b.omega+=torque*dt;b.theta+=b.omega*dt;
 const alignment=Math.max(.05,Math.cos(b.theta)**2);
 const drive=1.18*p.amplitude*p.frequency*p.traction*alignment*(.55+.65*support);
 const target=Math.max(0,drive*(1-.10*Math.abs(p.frequency-1.7)));
 b.v+=(target-b.v)*Math.min(1,(1+3*support)*dt);
 b.x+=b.v*dt;
 b.energy+=dt*(p.mass*(.011+.006*p.feedback)+motorWork*.045);
 if(Math.abs(b.theta)>.88){b.fallen=true;b.fallTime=b.x;}
 if(!b.fallen&&b.x>=p.targetDistance){b.x=p.targetDistance;b.goalReached=true;b.goalTime=b.elapsed;}
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
  if(s.preset==="barrier"||s.preset==="gate"){
   b.x+=b.v*dt;
   const compression=Math.max(0,b.x),gate=s.preset==="gate";
   const stiffness=gate?p.gateStrength*1000/p.gateDeflection:p.stiffness*1000;
   const damp=gate?stiffness*.045:p.damping*1000;
   b.force=0;
   if(!gate||!b.gateBroken){
    const depth=gate?Math.min(compression,p.gateDeflection):Math.min(compression,p.crush);
    b.force=compression>0?stiffness*depth+damp*Math.max(0,b.v)+(gate?0:Math.max(0,compression-p.crush)*stiffness*25):0;
    if(gate&&b.force>=p.gateStrength*1000){b.gateBroken=true;b.force=p.gateStrength*1000;}
    b.impactEnergy+=b.force*Math.max(0,b.v)*dt;
    b.v-=b.force/p.mass*dt;
    b.compression=depth;b.maxCompression=Math.max(b.maxCompression,depth);
   }else b.compression=0;
   b.maxG=Math.max(b.maxG,b.force/p.mass/9.81);
   if(b.x<-.6&&b.v<0){s.finished=true;b.force=0;}
   if(gate&&b.gateBroken&&b.x>5)s.finished=true;
   if(s.time>12)s.finished=true;
  }else if(s.preset==="jump"){
   const angle=p.angle*Math.PI/180,runup=1.2,rampHeight=runup*Math.tan(angle);
   if(!b.airborne){
    if(b.x< -runup)b.x+=b.v*dt;
    else{
     b.onRamp=true;
     b.v=Math.max(0,b.v-9.81*Math.sin(angle)*dt);
     b.x=Math.min(0,b.x+b.v*Math.cos(angle)*dt);
     b.y=Math.max(0,(b.x+runup)*Math.tan(angle));
     if(b.v===0)s.finished=true;
     if(b.x>=0&&!s.finished){
      b.x=0;b.y=rampHeight;b.airborne=true;b.vx=b.v*Math.cos(angle);b.vy=b.v*Math.sin(angle);
     }
    }
   }else if(!b.landed){
    b.flightTime+=dt;b.x+=b.vx*dt;b.vy-=9.81*dt;b.y+=b.vy*dt;
    if(b.y<=0&&b.flightTime>.05){
     b.y=0;b.landed=true;s.finished=true;
     const impactSpeed=Math.abs(b.vy),decel=impactSpeed*impactSpeed/(2*p.crush);
     b.force=p.mass*decel;b.maxG=decel/9.81;
     b.maxCompression=p.crush;b.compression=p.crush;
     b.impactEnergy=.5*p.mass*impactSpeed*impactSpeed;b.v=b.vx;
    }
   }
  }
  b.damageLevel=crashDamageLevel(b,p);
 }
 if(s.mode==="bio"){updateWalker(b,p,dt,s.rng);if(b.fallen||b.goalReached||s.time>22)s.finished=true;}
 if(s.mode==="mechanics"){
  if(s.preset==="lever"){
   b.torque=p.force*p.armA-p.load*p.armB-p.damping*b.omega;
   b.omega+=b.torque/p.inertia*dt;
   b.angle+=b.omega*dt;
   if(b.angle>=.7){b.angle=.7;if(b.omega>0)b.omega=0;b.stop=true}
   else if(b.angle<=-.7){b.angle=-.7;if(b.omega<0)b.omega=0;b.stop=true}
   else b.stop=false;
  }
  if(s.preset==="crank"){
   b.angle+=b.omega*dt;
   const sn=Math.sin(b.angle),co=Math.cos(b.angle);
   const root=Math.sqrt(Math.max(0,p.rod*p.rod-p.crank*p.crank*sn*sn));
   b.position=p.crank*co+root;
   b.velocity=-b.omega*p.crank*sn-(b.omega*p.crank*p.crank*sn*co)/root;
  }
  if(s.preset==="gears"){
   b.angleA+=p.rpm*2*Math.PI/60*dt;
   b.angleB=-(p.teethA/p.teethB)*b.angleA+Math.PI/p.teethB;
   b.rpmB=-p.rpm*p.teethA/p.teethB;
   b.torqueB=p.torque*p.teethB/p.teethA*p.efficiency;
  }
 }
 if(s.mode==="arena"&&s.preset==="duel"){stepDuel(b,dt);if(b.finished)s.finished=true;}
 if(s.mode==="arena"&&s.preset!=="duel"){
  for(let i=0;i<2;i++){const racer=b.racers[i];if(racer.finish!==null)continue;
   racer.v+=(racer.base*(.72+.28*racer.stamina)-racer.v)*dt*2;
   racer.x+=racer.v*dt;
   for(const pos of (s.preset==="race"?[8,17,25]:[])){const key="passed"+pos;if(!racer[key]&&racer.x>=pos){racer[key]=true;const hazard=.75+.7*random(s.seed+pos*173+i*719)();racer.penalty+=p.obstacle*hazard;racer.v=Math.max(0,racer.v*(1-.65*p.obstacle));}}
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
 if(s.mode==="crash")return{plot:b.force/1000,chart:"Kontaktkraft (kN)",read:[["Aufbau",s.preset==="gate"?"Schranke":s.preset==="jump"?"Sprungrampe":"Betonbarriere"],["Spitzenlast",fmt(b.maxG,1)+" g"],["Schadensstufe",b.damageLevel+" / 20"],[s.preset==="jump"?"Sprungweite":"Max. Verformung",s.preset==="jump"?fmt(Math.max(0,b.x),1)+" m":fmt(b.maxCompression*100,0)+" cm"],["Ergebnis",s.preset==="gate"?(b.gateBroken?"Schranke gebrochen":"Schranke intakt"):s.preset==="jump"?(b.landed?"Gelandet":b.airborne?"Im Flug":"Anfahrt"):"Knautschzone"]]};
 if(s.mode==="bio")return{plot:b.x,chart:"Gelaufene Strecke (m)",read:[["Ziel",fmt(p.targetDistance,0)+" m"],["Fortschritt",fmt(b.x,2)+" / "+fmt(p.targetDistance,0)+" m"],["Status",b.goalReached?"Ziel erreicht ✓":b.fallen?"Gestürzt":"In Bewegung"],["Kontakte",b.contacts+" / "+b.legs.length],["Training",s.training.generation+" Gen."]]};
 if(s.mode==="mechanics"){
  if(s.preset==="lever")return{plot:b.angle*180/Math.PI,chart:"Hebelwinkel (°)",read:[["Nettomoment",fmt(b.torque,1)+" N·m"],["Auslenkung",fmt(b.angle*180/Math.PI,1)+"°"],["Winkeltempo",fmt(b.omega,2)+" rad/s"],["Anschlag",b.stop?"Erreicht":"Frei"]]};
  if(s.preset==="crank")return{plot:b.position,chart:"Schieberposition (m)",read:[["Schieberweg",fmt(b.position,2)+" m"],["Schiebertempo",fmt(b.velocity,2)+" m/s"],["Kurbelwinkel",fmt(b.angle*180/Math.PI%360,1)+"°"],["Drehzahl",fmt(p.rpm,0)+" U/min"]]};
  return{plot:b.rpmB,chart:"Ausgangsdrehzahl (U/min)",read:[["Übersetzung",fmt(p.teethB/p.teethA,2)+" : 1"],["Ausgangsdrehzahl",fmt(b.rpmB,1)+" U/min"],["Ausgangsmoment",fmt(b.torqueB,1)+" N·m"],["Wirkungsgrad",fmt(100*p.efficiency,0)+" %"]]};
 }
 if(s.mode==="arena"&&s.preset==="duel"){
  const [a,c]=b.fighters;
  return{plot:a.points-c.points,chart:"Punkte A − B",read:[["Entität A",a.name+" · "+a.hp.toFixed(0)+" HP"],["Entität B",c.name+" · "+c.hp.toFixed(0)+" HP"],["Punkte",a.points+" : "+c.points],["Lernstile",duelStyle(a.genome)+" / "+duelStyle(c.genome)],["Sieger",b.winner||"Noch offen"]]};
 }
 const [a,c]=b.racers;return{plot:a.x-c.x,chart:"Vorsprung A − B (m)",read:[["Entität A",fmt(a.x,1)+" / 32 m"],["Entität B",fmt(c.x,1)+" / 32 m"],["Zeit",fmt(s.time,1)+" s"],["Sieger",b.winner||"–"]]};
}
function record(s){const m=measure(s);s.history.push({t:s.time,v:m.plot});if(s.history.length>12000)s.history.shift();}
function presetForWalker(p){return p.gait==="quad"?"quad":"walker";}
// Illustrativer Schadensindex: Spitzenverzögerung, Verformung und absorbierte Energie.
export function crashDamageLevel(b,p){
 const peak=clamp(b.maxG/45,0,1);
 const crush=clamp(b.maxCompression/Math.max(.01,p.crush||p.gateDeflection||.75),0,1);
 const work=clamp(b.impactEnergy/Math.max(1,b.energy),0,1);
 return clamp(Math.round(20*(.50*peak+.35*crush+.15*work)),0,20);
}
export function evaluateWalker(p,genome,seed=17){
 const q={...p,...genome},r=random(seed),b=makeWalker(q,r,presetForWalker(p));const dt=1/120;
 for(let i=0;i<14*120;i++){updateWalker(b,q,dt,r);if(b.fallen||b.goalReached)break;}
 const progress=Math.min(b.x,q.targetDistance)/q.targetDistance;
 const score=b.goalReached?20+(14-b.goalTime)*.8-b.energy*.028:14*progress-(b.fallen?6:0)-b.energy*.025;
 return{score,distance:b.x,fallen:b.fallen,energy:b.energy,goalReached:b.goalReached,timeToGoal:b.goalTime};
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
 if(tr.generation>=tr.targetGeneration)tr.running=false;
}
export function trainedToArena(genome){return clamp(1.8+genome.amplitude*genome.frequency*1.15,1,6);}
export function arenaBatch(params,seed=42,count=10,preset="race"){
 let wins=[0,0,0];
 if(preset==="duel"){
  for(let i=0;i<count;i++){
   const flipped=i%2===1,ga=params.genomeA||duelDefaultGenome(),gb=params.genomeB||duelDefaultGenome();
   const q=flipped?{...params,nameA:params.nameB,nameB:params.nameA,colorA:params.colorB,colorB:params.colorA,
    kindA:params.kindB,kindB:params.kindA,speedA:params.speedB,speedB:params.speedA,staminaA:params.staminaB,staminaB:params.staminaA}:params;
   const match=simulateDuel(q,flipped?[gb,ga]:[ga,gb],seed+Math.floor(i/2)*1597);
   const [a,b]=match.fighters,sa=a.hp+a.points*.72,sb=b.hp+b.points*.72;
   let win=Math.abs(sa-sb)<.3?2:sa>sb?0:1;
   if(flipped&&win<2)win=1-win;wins[win]++;
  }
  return wins;
 }

 for(let i=0;i<count;i++){
  const q=i%2?{...params,speedA:params.speedB,speedB:params.speedA,staminaA:params.staminaB,staminaB:params.staminaA}:params;
  const s=makeSim("arena",preset,q,seed+Math.floor(i/2));
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

function arrow(c,x,y,dx,dy,color){
 const tx=x+dx,ty=y+dy,dir=Math.atan2(dy,dx),sz=13;
 line(c,x,y,tx,ty,color,5);
 line(c,tx,ty,tx-sz*Math.cos(dir-.48),ty-sz*Math.sin(dir-.48),color,4);
 line(c,tx,ty,tx-sz*Math.cos(dir+.48),ty-sz*Math.sin(dir+.48),color,4);
}
function polygonGear(c,cx,cy,teeth,r,angle,color){
 c.save();c.translate(cx,cy);c.rotate(angle);
 c.fillStyle=color;c.strokeStyle="#e6f5f6";c.lineWidth=2;
 c.beginPath();
 for(let i=0;i<teeth*4;i++){
  const ang=(i/(teeth*4))*Math.PI*2,rad=r*(i%4===1||i%4===2?1.085:.955);
  if(i===0)c.moveTo(Math.cos(ang)*rad,Math.sin(ang)*rad);else c.lineTo(Math.cos(ang)*rad,Math.sin(ang)*rad);
 }
 c.closePath();c.fill();c.stroke();
 circle(c,0,0,r*.58,"#193044");
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3;line(c,Math.cos(a)*r*.24,Math.sin(a)*r*.24,Math.cos(a)*r*.48,Math.sin(a)*r*.48,"#b2d6d4",8);
 }
 circle(c,0,0,12,"#e4f4f1");circle(c,0,0,5,"#183448");c.restore();
}
function drawMechanics(c,s){
 const p=s.p,b=s.body;
 txt(c,"MECHANIKLABOR · IDEALISIERTES 2D-MODELL",32,59,17,colors.a);
 if(s.preset==="lever"){
  ground(c,494);
  const cx=500,cy=279,scale=100,ca=Math.cos(b.angle),sa=Math.sin(b.angle);
  const left={x:cx-p.armA*scale*ca,y:cy+p.armA*scale*sa};
  const right={x:cx+p.armB*scale*ca,y:cy-p.armB*scale*sa};
  line(c,left.x,left.y,right.x,right.y,"#78dbbd",20);
  c.fillStyle="#7396a9";c.beginPath();c.moveTo(cx,cy+15);c.lineTo(cx-31,462);c.lineTo(cx+31,462);c.closePath();c.fill();
  circle(c,cx,cy,17,"#f5ce7a");circle(c,cx,cy,7,"#1d3545");
  arrow(c,left.x,left.y-76,0,62,"#ffbe69");
  arrow(c,right.x,right.y+77,0,-62,"#8bddeb");
  txt(c,p.force+" N",left.x,left.y-91,17,"#ffbe69","center");
  txt(c,p.load+" N",right.x,right.y+107,17,"#8bddeb","center");
  txt(c,"Arm links: "+p.armA.toFixed(1)+" m",64,435,15);
  txt(c,"Arm rechts: "+p.armB.toFixed(1)+" m",695,435,15);
  if(b.stop)txt(c,"GELENKANSCHLAG ±40°",500,113,17,"#f5ce7a","center");
 }
 if(s.preset==="crank"){
  ground(c,474);
  const ox=250,oy=315,scale=98,theta=b.angle;
  const crankX=ox+p.crank*scale*Math.cos(theta),crankY=oy-p.crank*scale*Math.sin(theta);
  const endX=ox+b.position*scale;
  line(c,ox-10,oy,950,oy,"#4b6b7c",3);
  box(c,ox-25,oy-20,50,44,"#315065");
  circle(c,ox,oy,17,"#f5ce7a");
  line(c,ox,oy,crankX,crankY,"#ffbd71",14);
  line(c,crankX,crankY,endX,oy,"#79dac1",12);
  circle(c,crankX,crankY,12,"#edf6e9");
  box(c,endX-36,oy-33,72,66,"#3a9d93");
  box(c,ox+65,oy+36,725,17,"#527186");
  circle(c,ox,oy,7,"#15273a");circle(c,endX,oy,8,"#eff9f4");
  txt(c,"Kurbel "+p.crank.toFixed(2)+" m",65,135,16,"#ffbd71");
  txt(c,"Schubstange "+p.rod.toFixed(2)+" m",65,169,16,colors.a);
  txt(c,"Schieber",endX,oy-52,16,"#dbe9f4","center");
 }
 if(s.preset==="gears"){
  ground(c,474);
  const ra=p.teethA*2.4,rb=p.teethB*2.4,span=ra+rb,ox=500-span*.5,oy=286;
  const ax=ox,bx=ox+span;
  polygonGear(c,ax,oy,p.teethA,ra,b.angleA,"#218e80");
  polygonGear(c,bx,oy,p.teethB,rb,b.angleB,"#b8853b");
  txt(c,"ANTRIEB",ax,440,16,colors.a,"center");
  txt(c,"ABTRIEB",bx,440,16,"#f5c86a","center");
  txt(c,p.teethA+" Zähne",ax,oy-ra-30,17,colors.a,"center");
  txt(c,p.teethB+" Zähne",bx,oy-rb-30,17,"#f5c86a","center");
  arrow(c,ax,oy-2,ra*.65,0,"#ccf3e9");
  arrow(c,bx,oy+2,-rb*.65,0,"#f9d5a2");
  txt(c,"Drehmoment × "+(p.teethB/p.teethA*p.efficiency).toFixed(2),500,88,19,"#edf6f3","center");
 }
}

export function drawScene(c,s){
 if(!s)return;grid(c);const p=s.p,b=s.body,t=s.time;
 if(s.mode==="physics"){
  if(s.preset==="fall"){ground(c,476);for(let i=0;i<5;i++){line(c,110+i*14,90,110+i*14,476,"#2a4957",1)}const y=476-Math.max(0,b.y)/22*365;circle(c,460,y-18,24,colors.a);circle(c,453,y-25,7,"#dbffef");line(c,90,y-18,120,y-18,"#f5c86a");txt(c,b.y.toFixed(2)+" m",130,y-25,18);txt(c,"HÖHE",90,67,13,"#88a5b9");}
  if(s.preset==="pendulum"){ground(c,498);const topX=500,topY=92,scale=Math.min(115,340/p.length),L=p.length*scale;line(c,360,92,640,92,"#e1e8ef",10);line(c,topX,topY,topX+Math.sin(b.angle)*L,topY+Math.cos(b.angle)*L,"#a9ced4",5);circle(c,topX+Math.sin(b.angle)*L,topY+Math.cos(b.angle)*L,30,colors.a);circle(c,topX,topY,11,"#f6c86c");line(c,topX,topY,topX,topY+365,"#4e6d7b",1);txt(c,"Schwerkraft · "+p.gravity+" m/s²",35,50,15);}
  if(s.preset==="ramp"){ground(c,491);const ang=p.angle*Math.PI/180,startX=115,bottomY=450,length=Math.min(720,340/Math.tan(ang)),topY=bottomY-Math.tan(ang)*length; c.fillStyle="#294a56";c.beginPath();c.moveTo(startX,topY);c.lineTo(startX+length,bottomY);c.lineTo(startX,bottomY);c.closePath();c.fill();line(c,startX,topY,startX+length,bottomY,"#7db5b4",6);const a=clamp(b.d/13,0,1);let x=startX+a*length,y=topY+a*Math.tan(ang)*length-19;circle(c,x,y,21,colors.a);txt(c,"Neigung "+p.angle+"°",50,67,17);}
  if(s.preset==="collision"){ground(c,450);const scale=67,x1=500+b.x1*scale,x2=500+b.x2*scale;circle(c,x1,414,30,colors.a);circle(c,x2,414,30,colors.b);txt(c,"A · "+p.massA+" kg",x1,360,16,colors.a,"center");txt(c,"B · "+p.massB+" kg",x2,360,16,colors.b,"center");txt(c,"Impuls und Rückprall",48,72,18);}
 }
 if(s.mode==="crash"){ground(c,465);const barrier=770;box(c,barrier,108,35,356,"#7593a3");for(let y=110;y<465;y+=29)line(c,barrier+1,y,barrier+34,y+30,"#b5cfda",2);txt(c,"STARRE BARRIERE",795,90,14);
  const front=barrier+b.x*92;const rear=front-214;
  box(c,rear,354,front-rear-8,80,"#47aa96");box(c,rear+35,322,112,45,"#308372");box(c,rear+42,330,42,30,"#a6dce0");box(c,rear+90,330,48,30,"#a6dce0");box(c,front-15,358,16,60,"#ffce79");circle(c,rear+53,440,23,"#15212b");circle(c,rear+53,440,12,"#8a9faa");circle(c,front-39,440,23,"#15212b");circle(c,front-39,440,12,"#8a9faa");
  if(b.compression>0){box(c,barrier,370,Math.max(2,b.compression*92),10,"#f8bc6a");}
  txt(c,"MODELLIERTER KONTAKT",35,70,15);txt(c,"Max. Stauchung: "+(b.maxCompression*100).toFixed(0)+" cm",35,100,16,colors.b);
 }
 if(s.mode==="mechanics")drawMechanics(c,s);
 if(s.mode==="bio"){
  ground(c,480);
  const quad=b.legs.length===4,x=clamp(250+b.x*24,125,845);
  const tint=/^#[a-fA-F0-9]{6}$/.test(p.color||"")?p.color:colors.a;
  const hipY=quad?350:360,seg=(quad?53:61)*clamp(p.limb||1,.6,1.55);
  const baseY=hipY+b.theta*20;
  if(quad){
   const attachments=[-67,-32,35,68];
   line(c,x-74*clamp(p.torso||1,.65,1.6),baseY-10,x+75*clamp(p.torso||1,.65,1.6),baseY-10,tint,31);
   line(c,x+62,baseY-15,x+94,baseY-50,tint,16);
   circle(c,x+98,baseY-60,23*clamp(p.head||1,.6,1.5),"#f8cf99");
   line(c,x+85,baseY-81,x+78,baseY-99,"#f8cf99",6);
   b.legs.forEach((leg,i)=>{
    const anchor=x+attachments[i],ky=baseY+seg*Math.cos(leg.hip),kx=anchor+seg*Math.sin(leg.hip);
    const fx=kx+seg*Math.sin(leg.hip-leg.knee),fy=ky+seg*Math.cos(leg.hip-leg.knee);
    const shade=i%2?colors.b:tint;
    line(c,anchor,baseY,kx,ky,shade,10);line(c,kx,ky,fx,fy,shade,8);
    circle(c,kx,ky,7,"#d9f4ec");line(c,fx-9,fy,fx+12,fy,"#d9f4ec",5);
    if(leg.contact)circle(c,fx,fy,5,"#ffcf63");
   });
  }else{
   line(c,x,baseY,x-12,baseY-124*clamp(p.torso||1,.65,1.6),tint,17);
   circle(c,x-14,baseY-124*clamp(p.torso||1,.65,1.6)-22,26*clamp(p.head||1,.6,1.5),"#f8cf99");
   b.legs.forEach((leg,i)=>{
    const anchor=x+(i?12:-12),kx=anchor+seg*Math.sin(leg.hip),ky=baseY+seg*Math.cos(leg.hip);
    const fx=kx+seg*Math.sin(leg.hip-leg.knee),fy=ky+seg*Math.cos(leg.hip-leg.knee);
    const shade=i?colors.b:tint;
    line(c,anchor,baseY,kx,ky,shade,12);line(c,kx,ky,fx,fy,shade,10);
    circle(c,kx,ky,8,"#e8f8ed");line(c,fx-11,fy,fx+14,fy,"#e8f8ed",6);
    if(leg.contact)circle(c,fx,fy,6,"#ffcf63");
   });
   line(c,x-10,baseY-95,x+42*Math.sin(b.phase),baseY-34,tint,7);
   line(c,x-10,baseY-95,x-42*Math.sin(b.phase),baseY-34,"#f8bc6a",7);
  }
  line(c,x,185,x,465,"#f0dd7999",1);
  txt(c,b.fallen?"GESTÜRZT":s.training.running?"EVOLUTION LÄUFT":quad?"VIERBEINER · GELENKMOTOREN":"ZWEIBEINER · GELENKMOTOREN",35,65,17,b.fallen?"#ff9999":colors.a);
  txt(c,"Ziel "+p.targetDistance+" m · Generation "+s.training.generation+"/"+s.training.targetGeneration+" · Kontakte "+b.contacts+"/"+b.legs.length,35,96,14);
  if(b.fallen)txt(c,"Gestürzt – neuen Versuch starten",500,180,20,"#ffb2a9","center");if(b.goalReached)txt(c,"ZIEL ERREICHT!",500,180,20,"#a1f5c1","center");
 }
 if(s.mode==="arena"){ground(c,478);box(c,34,156,932,245,"#1d344a");line(c,34,270,966,270,"#496478",4);line(c,74,156,74,401,"#92b9c5",3);for(let i=0;i<13;i++){line(c,74+i*69,156,74+i*69,401,"#314c5e",1);}
  for(const pos of (s.preset==="race"?[8,17,25]:[])){const px=74+pos/32*850;for(const y of [213,325]){box(c,px-9,y-26,18,45,"#ee9a51");txt(c,"▲",px,y-33,17,colors.b,"center");}}
  const finish=924;for(let j=0;j<10;j++)for(let k=0;k<2;k++)box(c,finish+j%2*8,158+j*24+k*12,8,12,(j+k)%2?"#f8f8ff":"#16283b");
  for(let i=0;i<2;i++){const e=b.racers[i],x=74+e.x/32*850,y=i===0?207:327;circle(c,x,y,30,e.color||(i===0?colors.a:colors.b));txt(c,i===0?"A":"B",x,y+8,23,"#122436","center");txt(c,e.name,55,y-45,16,e.color||colors.a);txt(c,e.kind==="quadruped"?"4 Beine":"2 Beine",x,y+51,12,"#a5c3c9","center");}
  if(b.winner)txt(c,"SIEGER: "+b.winner,500,78,29,colors.a,"center");else txt(c,s.preset==="sprint"?"SPRINT · 32 m":"HINDERNISRENNEN · 32 m",500,78,20,"#bdd4de","center");
 }
 txt(c,"SIMULATION · v"+VERSION,23,540,12,"#7798a9");txt(c,t.toFixed(2)+" s",976,540,13,"#c5d4e1","right");
}
