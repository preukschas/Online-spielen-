/* City Racer – Open World · 3D-Demo v0.1 | Single-player browser game
   Rendering: three.js r161 (external CDN). All gameplay stays client-side.
*/
const $ = id => document.getElementById(id);
const loadMessage = $('loadmsg');
let THREE;
try {
  THREE = await import('https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js');
} catch (first) {
  try { THREE = await import('https://unpkg.com/three@0.161.0/build/three.module.js'); }
  catch (second) {
    loadMessage.textContent = '3D-Bibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen und neu laden.';
    throw second;
  }
}
let renderer;
try {
  renderer = new THREE.WebGLRenderer({antialias: true, powerPreference:'high-performance'});
} catch (e) {
  loadMessage.textContent = 'WebGL wird auf diesem Gerät/Browser nicht unterstützt.';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, /iPad|iPhone|Android/i.test(navigator.userAgent)?1.35:1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
$('game').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#92bdd7');
scene.fog = new THREE.Fog('#a6c4d6', 200, 570);
const camera = new THREE.PerspectiveCamera(68, innerWidth/innerHeight, 0.1, 1250);
const ambient = new THREE.HemisphereLight(0xcbe4ff, 0x708064, 2.0);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffedc5, 2.15);
sun.position.set(110,180,-90);
scene.add(sun);
const mats = new Map();
function material(color,roughness=0.85,metalness=0) {
  const key = String(color)+'-'+roughness+'-'+metalness;
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({color,roughness,metalness}));
  return mats.get(key);
}
function box(parent,w,h,d,color,x=0,y=0,z=0,customMat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),customMat || material(color));
  mesh.position.set(x,y,z); parent.add(mesh);return mesh;
}
function cyl(parent,r,h,color,x=0,y=0,z=0,r2=r) {
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r2,r,h,9), material(color));
  m.position.set(x,y,z);parent.add(m);return m;
}
function sphere(parent,r,color,x=0,y=0,z=0) {
  const m=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),material(color));
  m.position.set(x,y,z);parent.add(m);return m;
}
function sign(text,x,y,z,width=10,color='#ffffff',bg='#163047',parent=scene) {
  const canvas=document.createElement('canvas');
  canvas.width=512;canvas.height=128;
  const c=canvas.getContext('2d');
  c.fillStyle=bg;c.fillRect(0,0,512,128);
  c.strokeStyle='rgba(255,255,255,.34)';c.lineWidth=5;c.strokeRect(5,5,502,118);
  c.font='900 48px system-ui';c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';
  c.fillText(text,256,66,490);
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
  m.position.set(x,y,z);parent.add(m);
  return m;
}
const ground=box(scene,2600,0.5,1250,'#719368',620,-.43,0);
const roads=[-315,-210,-105,0,105,210,315];
const additionalEastRoads=[420,525];
const solids=[],shops=[],cars=[],npcs=[],traffic=[],collectibles=[],objects=[];
const obstacles=[],trafficLights=[],bicycles=[],mountainBases=[],burglarHomes=[];
const home={x:-157.5,z:-157.5,w:40,d:35,roof:null};
const crimeState={wanted:0,seconds:0,punchWait:0,attackTime:0,arrestTime:0};
const rail={x:-351,stations:[{name:'Hauptbahnhof CITY',z:-190},{name:'Walddorf',z:248}],train:null,onboard:false,tickets:0,phase:0,dir:1,stop:0,locked:false,gates:[],gateClosed:false};
const airports=[
  {name:'CITY INTERNATIONAL',country:'Deutschland',gate:{x:735,z:-120},terminal:{x:735,z:-172},runway:{x:935,z:-220},parkX:835},
  {name:'RIVIÈRE AÉROPORT',country:'Frankreich',gate:{x:1510,z:-120},terminal:{x:1510,z:-172},runway:{x:1420,z:-220},parkX:1480}
];
const flight={plane:null,tickets:0,side:0,stop:0,phase:'parked',phaseTime:0,progress:0,onboard:false};
const law={suspect:null,arrestTimer:0,prisoner:null};
const prison={x:262.5,z:-262.5,w:65,d:65};
const station={x:262.5,z:157.5,pumps:[{x:242,z:143},{x:262,z:143},{x:282,z:143}]};
let seed=809;
function rng(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function colorBuilding(){
  return ['#a3b3bc','#b8b1a0','#b3bbb9','#a8a99f','#8fa7b2','#b3a79b','#879ba9'][Math.floor(rng()*7)];
}
function windowsForBuilding(x,z,w,d,h) {
  const floorCount=Math.min(11,Math.floor(h/4));
  const cols=Math.max(3,Math.floor(w/6));
  for(let f=0;f<floorCount;f++){
    const wy=3.5+f*3.9;
    for(let k=0;k<cols;k++){
      const wx=x-w/2+(k+0.5)*w/cols;
      const tint=rng()>.77?'#d8d3a5':'#35576b';
      box(scene,Math.min(3.2,w/cols*.64),2.4,.12,tint,wx,wy,z-d/2-.09);
      if(f%3!==2) box(scene,Math.min(2.8,w/cols*.59),.14,.27,'#d4d4cb',wx,wy-1.32,z-d/2-.16);
    }
    const depthCols=Math.max(3,Math.floor(d/7));
    for(let k=0;k<depthCols;k++){
      const wz=z-d/2+(k+.5)*d/depthCols;
      const a=rng()>.8?'#d4d8b1':'#36566b';
      box(scene,.12,2.2,Math.min(3,d/depthCols*.6),a,x-w/2-.08,wy,wz);
    }
  }
}
function genericBuilding(x,z,w,d,h) {
  const color=colorBuilding();
  box(scene,w,h,d,color,x,h/2,z);
  box(scene,w+1.5,1.0,d+1.5,'#67757a',x,h+.5,z);
  // Architectural details add silhouette depth with modest GPU cost.
  box(scene,w+.7,.45,d+.7,'#c5c6be',x,3.3,z);
  box(scene,w+.6,.35,d+.6,'#4d606b',x,h-1,z);
  box(scene,w*.23,.55,d*.18,'#64757d',x-w*.25,h+1.5,z);
  for(const side of [-1,1]){
    box(scene,.22,h-3,.36,'#d0d2cb',x+side*(w/2+.2),(h-3)/2+2,z-d/2-.25);
    box(scene,w*.17,.22,1.2,'#556d76',x+side*w*.32,5.2,z-d/2-1.0);
  }
  box(scene,w+.2,2.3,d+.2,'#68777a',x,1.15,z);
  windowsForBuilding(x,z,w,d,h);
  if(rng()>.45)box(scene,w*.22,1.2,d*.20,'#777e78',x+w*.27,h+1.1,z);
  solids.push({x,z,w,d});
}
const shopDefs=[
  {id:'markt',type:'shop',name:'CITY MARKT',x:52.5,z:52.5,color:'#c9a97b'},
  {id:'job',type:'job',name:'EXPRESS JOBS',x:-52.5,z:52.5,color:'#c6b78e'},
  {id:'cars',type:'cars',name:'AUTOHAUS',x:157.5,z:52.5,color:'#a9bac7'},
  {id:'cafe',type:'cafe',name:'CITY CAFÉ',x:-52.5,z:-52.5,color:'#ceb29f'},
  {id:'service',type:'service',name:'WERKSTATT',x:157.5,z:-52.5,color:'#9dacb5'}
];
function createShop(def){
  const x=def.x,z=def.z,w=66,d=64,front=z-d/2,wall=7;
  const root=new THREE.Group();scene.add(root);
  box(root,w,.25,d,'#b4b2ac',x,.03,z);
  box(root,w,wall,1,'#c6d3d8',x,wall/2,z+d/2);
  box(root,1,wall,d,'#c6d3d8',x-w/2,wall/2,z);
  box(root,1,wall,d,'#c6d3d8',x+w/2,wall/2,z);
  const gap=10, side=(w-gap)/2;
  box(root,side,wall,1,'#9faeb4',x-(gap+side)/2,wall/2,front);
  box(root,side,wall,1,'#9faeb4',x+(gap+side)/2,wall/2,front);
  box(root,gap,1.6,1,'#c2d1d5',x,wall-.8,front);
  const glazing=new THREE.MeshStandardMaterial({color:'#9bc4d5',roughness:.16,metalness:.15,transparent:true,opacity:.34});
  box(root,side-3,4.4,.1,null,x-(gap+side)/2,3.9,front-.60,glazing);
  box(root,side-3,4.4,.1,null,x+(gap+side)/2,3.9,front-.60,glazing);
  // Two visible sliding door leaves; passage stays open between them.
  box(root,.24,5.25,.3,'#d0e3e8',x-gap/2,2.7,front-.42);
  box(root,.24,5.25,.3,'#d0e3e8',x+gap/2,2.7,front-.42);
  box(root,2.1,4.8,.09,null,x-gap/2+1.14,2.45,front-.35,glazing);
  box(root,2.1,4.8,.09,null,x+gap/2-1.14,2.45,front-.35,glazing);
  box(root,1.1,.12,.25,'#e9dfb5',x-gap/2+2.9,2.6,front-.55);
  box(root,1.1,.12,.25,'#e9dfb5',x+gap/2-2.9,2.6,front-.55);
  box(root,w,1.5,d,'#425563',x,wall+.75,z);
  const roof=box(root,w,.55,d,'#323f49',x,wall+1.67,z);
  sign(def.name,x,7.8,front-1.12,Math.min(w*.70,29),'#ffe6aa','#162b3b',root);
  box(root,18,1.35,3,'#755c49',x,0.73,z+9);
  box(root,16,.15,2,'#d6c5a5',x,1.48,z+9);
  for(let i=0;i<4;i++)box(root,3.3,2.1,1.7,'#7996a2',x-22+i*15,1.12,z+23);
  for(let i=0;i<6;i++){box(root,2.4,.75,2.5,i%2?'#c6b06d':'#86a58f',x-23+i*9,2.0,z+8);}
  if(def.type==='cars'){
    const showcase=createCar('#dd5141',true);
    showcase.group.position.set(x+17,0,z+18);scene.add(showcase.group);
  }
  if(def.type==='service')sign('TANKEN + TUNING',x,5,front-3,24,'#ffe2ac','#5a4035',root);
  shops.push({...def,w,d,front,door:gap,roof});
}
function tree(x,z,size=1){
  obstacles.push({x,z,r:.55*size});
  cyl(scene,.37*size,3.6*size,'#66503b',x,1.8*size,z);
  sphere(scene,2.4*size,'#32674d',x,5.5*size,z);
  sphere(scene,1.9*size,'#437b59',x-1.5*size,4.4*size,z);
  sphere(scene,1.8*size,'#3a744f',x+1.4*size,4.7*size,z);
}
function streetLight(x,z){
  obstacles.push({x,z,r:.55});
  cyl(scene,.13,7.1,'#667c86',x,3.55,z);
  box(scene,2,.16,.25,'#70878f',x+.85,7.05,z);
  box(scene,1.35,.12,.30,'#fff1c4',x+1.1,6.96,z);
}
function createRailway(){
  // Dedicated western railway: real animated 3D carriage, not teleport-only travel.
  const x=rail.x,nearStop=rail.stations[0],farStop=rail.stations[1];
  box(scene,11,.2,660,'#747d7f',x,.08,-10);
  for(const offset of [-1.6,1.6])box(scene,.22,.25,660,'#8d9da5',x+offset,.24,-10);
  for(let z=-336;z<=322;z+=5)box(scene,5.2,.15,.5,'#6b5445',x,.20,z);
  rail.stations.forEach((stop,i)=>{
    const z=stop.z;
    box(scene,12,.55,64,'#c8c4b8',x+10,.32,z);
    box(scene,11,1.4,19,'#c0cad1',x+19,1.1,z+12);
    box(scene,12,.5,20,'#374f5d',x+19,4.8,z+12);
    for(const side of [-1,1])box(scene,.3,4,.4,'#8399a6',x+15+side*4,2.6,z+7);
    sign(i===0?'CITY HAUPTBAHNHOF':'WALDDORF BAHNHOF',x+21,6,z+12,34,'#ffffff','#19456d');
    sign('🎫 TICKETS',x+15,3,z-20,10,'#ffe9bb','#285d74');
    box(scene,2.3,3.7,2,'#266aa4',x+15,1.86,z-20);
    box(scene,1.5,.9,.12,'#adced5',x+15,2.25,z-21.05);
    sign('GLEIS 1',x+8,3,z+29,10,'#f9f1d8','#263f54');
    for(let k=-1;k<=1;k++){
      const passenger=makeHuman(k?'#495e6b':'#a46a4c');
      passenger.group.position.set(x+9+k*2.4,0,z+4);
      scene.add(passenger.group);
    }
  });
  // Distinct settlement on the northern terminus, away from the central skyline.
  sign('WILLKOMMEN IN WALDDORF',-270,8,314,32,'#f5e3ac','#45664e');
  for(let i=0;i<5;i++){
    const z=256+i*15;
    const x=-270+(i%2)*25;
    const h=4.5+i%3*1.8;
    box(scene,12,h,11,'#d3bc97',x,h/2,z);
    box(scene,13,1,12,'#775246',x,h+.6,z);
    box(scene,2,3,.2,'#614938',x,1.5,z-5.6);
  }
  const train=new THREE.Group();
  for(const offset of [-14,0,14]){
    box(train,3.7,4.3,12.7,offset===-14?'#317da4':'#e2e6e4',0,3.4,offset);
    box(train,3.9,.45,12.7,'#2f647e',0,5.65,offset);
    for(const side of [-1,1]){
      for(let k=-2;k<=2;k++)box(train,.11,1.25,1.4,'#448399',side*1.89,4.0,offset+k*2.0);
    }
    for(const wheel of [-3.7,3.7])for(const side of [-1,1]){
      const w=cyl(train,.55,.25,'#303940',side*1.85,1,wheel+offset);w.rotation.z=Math.PI/2;
    }
    box(train,1.3,2.5,.13,'#99bfca',0,3.3,offset-6.4);
  }
  train.position.set(x,0,nearStop.z);
  scene.add(train);
  rail.train=train;rail.phase=0;rail.stop=0;rail.dir=1;
}
function nearestRailStop(){
  return rail.stations.findIndex(st=>Math.hypot(player.x-(rail.x+14),player.z-st.z)<29);
}
function trainAction(){
  if(rail.onboard){toast('🚆 Bitte bis zur nächsten Station mitfahren.',2);return true;}
  const stop=nearestRailStop();
  if(stop<0 || player.car)return false;
  const board=()=>{const dst=rail.stop===0?1:0;
    if(rail.stop!==stop||rail.phase>0){toast('🚆 Zug ist unterwegs. Bitte am Bahnsteig warten.');return;}
    if(rail.tickets<1){toast('🎫 Erst ein Ticket am Automaten kaufen!');return;}
    rail.tickets--;rail.onboard=true;save();
    avatar.group.visible=false;
    toast('🚆 Eingestiegen! Nächster Halt: '+rail.stations[dst].name,4);
  };
  const opts=[{label:'🎫 Ticket kaufen · 25 €',primary:true,run:()=>spend(25,()=>{rail.tickets++;toast('🎫 Ticket gekauft. Du kannst einsteigen!');})}];
  if(rail.stop===stop&&rail.phase===0)opts.push({label:'🚆 Mit gültigem Ticket einsteigen ('+rail.tickets+' vorhanden)',disabled:rail.tickets<1,run:board});
  opts.push({label:'Schließen',run:()=>{}});
  openModal('🚉 '+rail.stations[stop].name,'Fahrkarte am blauen Automaten kaufen. Der Zug fährt wirklich zwischen Stadt und Dorf und hält an beiden Bahnhöfen. Fahrpreis: 25 € virtuelles Spielgeld.',opts);
  return true;
}
function updateRail(dt){
  if(!rail.train)return;
  const from=rail.stations[rail.stop],to=rail.stations[1-rail.stop];
  if(rail.phase===0){rail.phaseTime=(rail.phaseTime||0)+dt;if(rail.phaseTime>10){rail.phase=1;rail.phaseTime=0;}}
  else{
    const delta=to.z-rail.train.position.z;
    const speed=Math.min(18,Math.max(4,Math.abs(delta)*.25));
    const step=Math.sign(delta)*Math.min(Math.abs(delta),speed*dt);
    rail.train.position.z+=step;
    if(Math.abs(to.z-rail.train.position.z)<.3){
      rail.train.position.z=to.z;rail.stop=1-rail.stop;rail.phase=0;rail.phaseTime=0;
      if(rail.onboard){
        rail.onboard=false;player.x=rail.x+13;player.z=to.z;
        player.y=0;avatar.group.visible=true;save();
        toast('🚉 Angekommen in '+to.name+'! Gute Reise.',5);
      }
    }
  }
  if(rail.onboard){player.x=rail.x;player.z=rail.train.position.z;avatar.group.visible=false;}
}
function createLevelCrossing(){
  const x=rail.x;
  box(scene,30,.19,19,'#b7adb0',x,.13,0);
  for(const z of [-7,7]){
    box(scene,12,.22,.55,'#fbf6e8',x,.28,z);
    for(const side of [-1,1]){
      box(scene,.48,5.4,.48,'#e9e3da',x+side*17,2.7,z+side*8);
    }
  }
  for(const gx of [x-15,x+15]){
    const pivot=new THREE.Group();
    pivot.position.set(gx,1.9,0);
    box(pivot,.45,.38,22,'#f6eeea',0,0,0);
    for(let d=-9;d<=9;d+=3)box(pivot,.55,.40,1.2,'#e04138',0,.02,d);
    scene.add(pivot);
    box(scene,1.2,2.5,1.1,'#414f57',gx,1.25,12.5);
    const red=sphere(scene,.5,'#9d2422',gx,3,12.5);
    red.material=new THREE.MeshBasicMaterial({color:'#8c2724'});
    rail.gates.push({x:gx,pivot,signal:red});
  }
  sign('BAHNÜBERGANG',x+28,5,13,20,'#ffefda','#752e27');
}
function updateLevelCrossing(dt){
  if(!rail.train)return;
  const active=rail.phase!==0&&Math.abs(rail.train.position.z)<85;
  rail.gateClosed=active;
  for(const g of rail.gates){
    const target=active?0:1.3;
    g.pivot.rotation.x=THREE.MathUtils.lerp(g.pivot.rotation.x,target,Math.min(1,dt*3));
    g.signal.material.color.set(active&&Math.floor(elapsed*4)%2===0?'#ff3838':'#632725');
  }
}
function crossingCollision(x,z,radius=2){
  return rail.gateClosed&&Math.abs(z)<12+radius&&rail.gates.some(g=>Math.abs(x-g.x)<.7+radius);
}
function createAirliner(){
  const g=new THREE.Group();
  const white='#e6ecf0',navy='#24638b';
  const tube=cyl(g,2.15,26,white,0,4,0);tube.rotation.z=Math.PI/2;
  sphere(g,2.0,white,13,4,0);
  box(g,2.3,.5,29,navy,1,4,0); // two long wings
  box(g,5,.22,10,navy,-10,6.0,0);
  box(g,5,4,.34,navy,-11,6,0);
  box(g,5,.38,2.2,'#1f465c',12,4.7,0);
  for(const z of [-2.1,2.1]){
    for(let x=-7.5;x<10;x+=2.3)box(g,.8,.67,.08,'#538dab',x,4.4,z>0?2.1:-2.1);
    const engine=cyl(g,.95,4.3,'#a5b5bb',2,2,z*3.5);engine.rotation.z=Math.PI/2;
  }
  for(const xx of [-8,9]){
    for(const z of [-1.8,1.8]){
      const w=cyl(g,.48,.27,'#313c46',xx,1.2,z);w.rotation.x=Math.PI/2;
    }
  }
  sign('REGIONAL AIR',0,6.7,0,10,'#fff','#285c88',g);
  g.position.set(airports[0].parkX,0,-220);
  scene.add(g);
  flight.plane=g;
}
function airportIndexNearby(){
  if(player.car||rail.onboard||flight.onboard)return -1;
  return airports.findIndex(a=>near(player,a.gate,23));
}
function airportAction(){
  const here=airportIndexNearby();
  if(here<0)return false;
  const dest=airports[1-here];
  const boardingAllowed=flight.phase==='parked'&&flight.stop===here&&flight.phaseTime<17;
  const options=[{
    label:'🎫 Flugticket nach '+dest.country+' kaufen · 100 €',primary:true,
    run:()=>spend(100,()=>{flight.tickets++;toast('🎫 Flugticket gekauft!');})
  }];
  options.push({
    label:'✈️ Einsteigen ('+flight.tickets+' Ticket'+(flight.tickets===1?'':'s')+' vorhanden)',
    disabled:!boardingAllowed||flight.tickets<1,
    run:()=>{
      if(!(flight.phase==='parked'&&flight.stop===here&&flight.tickets>0))return;
      flight.tickets--;flight.onboard=true;if(firstPerson)changeCamera();avatar.group.visible=false;save();renderHUD();
      toast('✈️ Boarding abgeschlossen · Ziel: '+dest.country+'!',4);
    }
  });
  options.push({label:'Schließen',run:()=>{}});
  openModal('✈️ '+airports[here].name,
    'Flug von '+airports[here].country+' nach '+dest.country+'. Flugticket am blauen Automaten: 100 € Spielgeld. '+(boardingAllowed?'Flugzeug steht bereit.':'Flugzeug unterwegs – auf die nächste Landung warten.'),options);
  return true;
}
function updateFlight(dt){
  if(!flight.plane)return;
  if(flight.phase==='parked'){
    flight.phaseTime+=dt;
    flight.plane.position.set(airports[flight.stop].parkX,0,-220);
    flight.plane.rotation.y=flight.stop===0?0:Math.PI;
    flight.plane.rotation.z=0;
    if(flight.phaseTime>=20){
      flight.phase='flying';flight.progress=0;flight.phaseTime=0;
      if(flight.onboard){toast('🛫 Start! Wir fliegen nach '+airports[1-flight.stop].country+'.',4);}
    }
  }else{
    flight.progress=Math.min(1,flight.progress+dt/29);
    const a=airports[flight.stop],b=airports[1-flight.stop],t=flight.progress;
    flight.plane.position.set(a.parkX+(b.parkX-a.parkX)*t,Math.sin(Math.PI*t)*118,-220);
    flight.plane.rotation.y=flight.stop===0?0:Math.PI;
    flight.plane.rotation.z=(flight.stop===0?1:-1)*.11*Math.cos(Math.PI*t);
    if(t>=1){
      flight.stop=1-flight.stop;flight.phase='parked';flight.phaseTime=0;flight.progress=0;
      flight.plane.rotation.z=0;
      if(flight.onboard){
        flight.onboard=false;flight.side=flight.stop;
        player.x=airports[flight.side].gate.x;player.z=airports[flight.side].gate.z;
        player.y=0;player.vertical=0;avatar.group.visible=true;avatar.group.position.set(player.x,0,player.z);
        player.cameraYaw=0;save();renderHUD();
        toast('🛬 Angekommen in '+airports[flight.side].country+'! Willkommen am Flughafen.',5);
      }
    }
  }
  if(flight.onboard){
    player.x=flight.plane.position.x;player.z=flight.plane.position.z;
    avatar.group.visible=false;
  }
}
function createAirports(){
  airports.forEach((a,i)=>{
    const {x,z}=a.terminal,runway=a.runway;
    box(scene,365,.08,110,'#546167',runway.x,.02,runway.z);
    box(scene,270,.11,48,'#343d44',runway.x,.10,runway.z);
    for(let xx=runway.x-118;xx<runway.x+120;xx+=24)box(scene,11,.13,.7,'#eff0e5',xx,.21,runway.z);
    for(const dz of [-22,22])for(let xx=runway.x-127;xx<runway.x+130;xx+=20)
      box(scene,2,.22,.35,'#fff9bb',xx,.23,runway.z+dz);
    box(scene,103,.18,56,'#8d9fa8',x,.10,z);
    box(scene,88,11,36,i?'#b8c3c6':'#c6d0d3',x,5.5,z);
    box(scene,94,1.1,43,'#516772',x,11.5,z);
    const glass=new THREE.MeshStandardMaterial({color:'#83b8ce',roughness:.19,metalness:.14,transparent:true,opacity:.48});
    box(scene,78,7,.17,null,x,5,z+18.3,glass);
    for(let k=-3;k<=3;k++)box(scene,.4,7,.3,'#d2e0e3',x+k*10,5,z+18.45);
    box(scene,20,1.8,7,'#e6e2cb',x,1,z+22);
    const towerX=x+44;
    cyl(scene,4.0,27,'#99b1be',towerX,13.5,z-10);
    box(scene,13,4,13,'#405965',towerX,29,z-10);
    box(scene,15,.7,15,'#253743',towerX,31.4,z-10);
    sign(i?'FRANCE – RIVIÈRE':'CITY AIRPORT',x,13.2,z+19.5,45,'#f2f5ff','#1f557c');
    sign('FLUGTICKETS',a.gate.x,4.3,a.gate.z-3.5,15,'#ffeaba','#28558b');
    box(scene,2.8,4.2,2.0,'#3166ae',a.gate.x,2.1,a.gate.z-4);
    box(scene,1.7,1.2,.15,'#99d6ef',a.gate.x,2.65,a.gate.z-5.05);
    for(let k=0;k<5;k++){
      const traveler=makeHuman(k%2?'#527089':'#b36d55');
      traveler.group.position.set(x-26+k*12,0,z+24);
      scene.add(traveler.group);
    }
    solids.push({x,z:z-3,w:88,d:36});
  });
  box(scene,410,.10,18,'#43545b',560,.07,-105);
  box(scene,280,.10,18,'#455561',1530,.07,-105);
  box(scene,18,.1,340,'#53616a',1620,.06,30);
  for(let i=0;i<8;i++){
    const xx=1590+(i%3)*25,zz=-42+Math.floor(i/3)*80;
    const h=8+(i%3)*4;
    box(scene,20,h,18,i%2?'#dec8b0':'#d4bcb3',xx,h/2,zz);
    box(scene,23,1,20,'#ae745e',xx,h+.6,zz);
    box(scene,3,4,.16,'#517f99',xx-5,4,zz-9.1);
    solids.push({x:xx,z:zz,w:20,d:18});
  }
  sign('BIENVENUE EN FRANCE',1580,8,180,38,'#f4efdf','#325f7d');
}
function createTrafficLights(){
  // Signals switch in two alternating phases: red really stops approaching cars.
  for(const cross of [[0,0],[-105,0],[105,0],[0,-105],[0,105]]){
    const [x,z]=cross;
    for(const side of [-1,1]){
      const postX=x+side*12.3,postZ=z+side*12.3;
      cyl(scene,.2,7,'#506872',postX,3.5,postZ);
      const housing=box(scene,1.1,3.0,.7,'#25313a',postX,7.2,postZ);
      const lamps=[];
      for(const [i,color] of ['#fa3c3c','#f0c148','#50f07a'].entries()){
        const lamp=sphere(scene,.36,color,postX,8.2-i*1.0,postZ-.43);
        lamps.push(lamp);
      }
      trafficLights.push({x,z,axis:side===-1?'x':'z',lamps});
      obstacles.push({x:postX,z:postZ,r:.60});
    }
  }
}
function signalGreen(axis){
  const cycle=(elapsed%24);
  return axis==='x'?cycle<10:(cycle>=12&&cycle<22);
}
function updateTrafficLights(){
  for(const s of trafficLights){
    const green=signalGreen(s.axis);
    for(let i=0;i<3;i++)s.lamps[i].material=material(i===0?(green?'#482a30':'#ff2424'):i===1?((elapsed%24>=10&&elapsed%24<12)||(elapsed%24>=22)?'#ffe348':'#66542c'):(green?'#3afc63':'#21442f'),.4);
  }
}
function makeBicycle(x,z,color='#32b0a8'){
  const g=new THREE.Group();
  for(const offset of [-1.0,1.0]){
    const wheel=new THREE.Mesh(new THREE.TorusGeometry(.55,.09,8,14),material('#252f36'));
    wheel.position.set(0,.62,offset);g.add(wheel);
  }
  const frame=box(g,.12,.2,1.9,color,0,1.02,0);frame.rotation.x=.12;
  box(g,.85,.10,.14,color,0,1.55,-.90);
  box(g,.85,.13,.3,'#252b31',0,1.32,.38);
  cyl(g,.1,.6,'#718b93',0,1.36,-.85);
  const rider=makeHuman('#6678a0','#d8ad88');rider.group.position.set(0,.50,.15);rider.group.scale.set(.7,.7,.7);g.add(rider.group);
  g.position.set(x,0,z);scene.add(g);return g;
}
function createBicycles(){
  for(const [i,p] of [[1,[-18,30]],[2,[23,118]],[3,[-118,-18]],[4,[115,218]]]){
    const model=makeBicycle(p[0],p[1],i%2?'#2ac3af':'#ce805b');
    bicycles.push({group:model,x:p[0],z:p[1],dir:i%2?1:-1});
  }
}
function updateBicycles(dt){
  for(const b of bicycles){
    b.z+=b.dir*dt*3.2;
    if(b.z>344)b.z=-344;if(b.z< -344)b.z=344;
    b.group.position.set(b.x,0,b.z);
    b.group.rotation.y=b.dir<0?0:Math.PI;
  }
}
function mustStopAtRed(x,z,heading,speed){
  if(speed<=0)return false;
  const horizontal=Math.abs(Math.sin(heading))>.70;
  for(const c of [[0,0],[-105,0],[105,0],[0,-105],[0,105]]){
    const [cx,cz]=c;
    if(horizontal){
      if(Math.abs(z-cz)>7||signalGreen('x'))continue;
      const d=cx-x,forward=Math.sign(Math.sin(heading));
      if(d*forward>0&&d*forward<18)return true;
    }else{
      if(Math.abs(x-cx)>7||signalGreen('z'))continue;
      const d=cz-z,forward=-Math.sign(Math.cos(heading));
      if(d*forward>0&&d*forward<18)return true;
    }
  }
  return false;
}
function buildCity() {
  for(const p of roads){
    box(scene,18,.09,760,'#3f5056',p,.03,0);
    box(scene,1140,.09,18,'#3f5056',170,.035,p);
    box(scene,2.3,.16,760,'#a8a9a2',p-10.3,.08,0);
    box(scene,2.3,.16,760,'#a8a9a2',p+10.3,.08,0);
    box(scene,1140,.16,2.3,'#a8a9a2',170,.08,p-10.3);
    box(scene,1140,.16,2.3,'#a8a9a2',170,.08,p+10.3);
    for(let t=-352;t<=352;t+=18){
      if(roads.some(other=>Math.abs(t-other)<18))continue;
      box(scene,.22,.12,8,'#d0cebf',p,.10,t);
      box(scene,8,.12,.22,'#d0cebf',t,.10,p);
    }
  }
  for(const x of additionalEastRoads){
    box(scene,18,.09,760,'#3f5056',x,.03,0);
    for(const side of [-1,1])box(scene,2.3,.16,760,'#a8a9a2',x+side*10.3,.08,0);
    for(let z=-352;z<=352;z+=22){
      if(roads.some(r=>Math.abs(r-z)<14))continue;
      box(scene,.22,.12,8,'#d0cebf',x,.10,z);
    }
  }
  for(const a of roads.concat(additionalEastRoads))for(const b of roads){
    if(a===-210||a===210||b===-210||b===210)continue;
    for(let v=-7;v<=7;v+=3.5){
      box(scene,1.6,.15,3.3,'#d6d9ce',a+v,.14,b+13.5);
      box(scene,3.3,.15,1.6,'#d6d9ce',a+13.5,.14,b+v);
    }
  }
  for(const x of [-262.5,-157.5,-52.5,52.5,157.5,262.5,367.5,472.5])
    for(const z of [-262.5,-157.5,-52.5,52.5,157.5,262.5]){
      box(scene,87,.09,87,'#878f81',x,.02,z);
      const specialty=shopDefs.find(s=>s.x===x&&s.z===z);
      if(x===station.x&&z===station.z)createGasStation();
      else if(x===prison.x&&z===prison.z)createPrison();
      else if(specialty)createShop(specialty);
      else if(x===home.x&&z===home.z){box(scene,83,.16,83,'#668b65',x,.07,z);}
      else if((x===-262.5&&z===-157.5)||(x===367.5&&z===52.5))createTargetHome(x,z);
      else genericBuilding(x,z,54+rng()*11,52+rng()*16,13+Math.floor(rng()*8)*4.2);
      for(let k=-1;k<=1;k+=2){
        tree(x+k*39,z+38,0.75+rng()*.25);
      }
      streetLight(x-42,z-42);
    }
  createRailway();
  createLevelCrossing();
  createAirports();
  createMountains();
  createAirliner();
  createTrafficLights();
  // A riverside park, additional skyline and city border
  box(scene,150,.1,35,'#648d69',0,.1,360);
  for(let i=0;i<14;i++){
    const x=-350+i*50;
    if(Math.abs(x)<315)tree(x,350,0.75+rng()*.5);
  }
  for(let i=0;i<15;i++){
    const x=-360+rng()*720,z=-360+rng()*720;
    if(roads.some(r=>Math.abs(x-r)<23||Math.abs(z-r)<23))continue;
    // Decorative light urban stones in unused corners
    if(rng()>.5)box(scene,1.8,.32,1.4,'#a6a49a',x,.16,z);
  }
}
function createGasStation(){
  const {x,z}=station;
  box(scene,87,.22,87,'#69737a',x,.12,z);
  // Open-front visual shell: the customer can see staff behind the transparent glass.
  box(scene,48,7,1,'#d4d8d5',x,3.55,z+39);
  box(scene,1,7,23,'#d4d8d5',x-23.5,3.55,z+28);
  box(scene,1,7,23,'#d4d8d5',x+23.5,3.55,z+28);
  box(scene,48,1.3,1,'#d4d8d5',x,6.35,z+16.5);
  const shopGlass=new THREE.MeshStandardMaterial({color:'#a9d4d9',transparent:true,opacity:.22,roughness:.17,metalness:.1,side:THREE.DoubleSide});
  box(scene,48,5.6,.12,null,x,3.2,z+16.5,shopGlass);
  box(scene,50,1.2,26,'#315a63',x,7.35,z+28);
  box(scene,11,4,.13,'#487382',x,3.3,z+16.35);
  sign('CITY TANK',x,8.8,z+15.95,24,'#fcf3dc','#22586a');
  solids.push({x,z:z+28,w:48,d:23});
  box(scene,67,.85,28,'#f0f1e7',x,8,z-13);
  for(const px of [x-29,x+29])for(const pz of [z-23,z-3])box(scene,.85,7,.85,'#d1d7d4',px,3.5,pz);
  station.pumps.forEach((pump,i)=>{
    obstacles.push({x:pump.x,z:pump.z,r:2});
    box(scene,2.2,3.4,1.5,'#e4e8e5',pump.x,1.7,pump.z);
    box(scene,2.4,.8,1.8,'#348b77',pump.x,3.6,pump.z);
    box(scene,1.4,.9,.12,'#263f50',pump.x,2.5,pump.z-.82);
    box(scene,.4,1.65,.4,'#152a32',pump.x+1.25,2,pump.z);
    sign('PUMPE '+(i+1),pump.x,4.75,pump.z-1.1,5,'#fff6b1','#257a72');
  });
  // Counter is visible behind the glass, staffed by two cashiers.
  box(scene,13,1.4,2.8,'#7b5d46',x,1.0,z+26);
  box(scene,12,.15,2.9,'#e0c9a6',x,1.75,z+26);
  for(const px of [x-4,x+4]){
    const clerk=makeHuman('#286358','#c79d7e');
    clerk.group.position.set(px,0,z+30.5);
    scene.add(clerk.group);
    box(scene,1.3,.45,.35,'#354b56',px,2.2,z+26);
  }
  sign('TANKSTELLE →',x,5.2,z-39,24,'#fff8ca','#205d63');
}
function createPrison(){
  const {x,z,w,d}=prison;
  box(scene,w,13,d,'#82929c',x,6.5,z);
  box(scene,w+1,1.1,d+1,'#455764',x,13.6,z);
  box(scene,w+1,1.5,d+1,'#657883',x,1,z);
  for(let side of [-1,1]){
    for(let k=0;k<5;k++){
      const xx=x-23+k*11;
      box(scene,4,4,.18,'#243b4d',xx,8,z+side*(d/2+.12));
      for(let bar=0;bar<3;bar++)box(scene,.15,4,.25,'#a7b3bb',xx-1.35+bar*1.35,8,z+side*(d/2+.28));
    }
  }
  // A guarded entrance and exterior fence form a visible prison campus.
  box(scene,9,6,.25,'#4a5660',x,3,z-d/2-.22);
  box(scene,4,5,.28,'#253440',x,2.6,z-d/2-.44);
  sign('STADTGEFÄNGNIS',x,15,z-d/2-1,34,'#f5ebd2','#25394b');
  for(const side of [-1,1])for(let k=-1;k<=1;k++){
    box(scene,.27,4.8,10,'#b9c2c5',x+side*36,2.4,z+k*12);
  }
  solids.push({x,z,w,d});
}
function makeHuman(clothes='#27384b',skin='#d5a785'){
  const g=new THREE.Group();
  const body=box(g,.76,1.17,.37,clothes,0,1.42,0);
  sphere(g,.36,skin,0,2.27,0);
  box(g,.74,.14,.42,'#332920',0,2.58,0);
  const l1=box(g,.30,.9,.31,'#273241',-.21,.48,0);
  const l2=box(g,.30,.9,.31,'#273241',.21,.48,0);
  box(g,.34,.17,.55,'#f0efed',-.21,.08,-.12);
  box(g,.34,.17,.55,'#f0efed',.21,.08,-.12);
  box(g,.23,.87,.27,skin,-.52,1.43,0);
  box(g,.23,.87,.27,skin,.52,1.43,0);
  return {group:g,legs:[l1,l2],body};
}
function createCar(color='#eec277',sport=false){
  const group=new THREE.Group();
  const paint=material(color,.34,.36);
  const length=sport?4.8:4.25;
  box(group,2.14,.55,length,null,0,.68,0,paint);
  box(group,1.75,.58,sport?2.1:2.3,'#354a59',0,1.2,.24);
  box(group,1.69,.035,.35,'#9ac7d4',0,1.34,-.42);
  box(group,1.72,.08,.36,'#d1d9d8',0,.78,-length/2+.28);
  for(const side of [-1,1]){
    box(group,.13,.18,.5,'#192e39',side*1.02,1.08,-.12);
    box(group,.13,.16,.7,'#bdcbd0',side*.90,.52,-length/2+.22);
  }
  box(group,1.73,.10,1.0,null,0,1.51,.40,paint);
  box(group,1.80,.06,.27,'#e6f0ec',0,.98,-1.92);
  for(const side of [-1,1])for(const front of [-1,1]){
    const wheel=cyl(group,.43,.29,'#22252a',side*1.05,.45,front*1.42);
    wheel.rotation.z=Math.PI/2;
    const hub=cyl(group,.18,.31,'#b5b9bb',side*1.05,.45,front*1.42);
    hub.rotation.z=Math.PI/2;
  }
  for(const side of [-1,1]){
    box(group,.46,.22,.12,'#ffecd9',side*.72,.67,-length/2-.02);
    box(group,.47,.21,.12,'#ba3029',side*.73,.66,length/2+.02);
  }
  if(sport)box(group,2.0,.12,.48,null,0,1.13,length/2-.27,paint);
  group.userData={length};
  return {group,color,sport};
}
function makeMotorbike(){
  const g=new THREE.Group();
  for(const wz of [-1.15,1.1]){
    const tire=cyl(g,.62,.27,'#22282f',0,.66,wz);
    tire.rotation.z=Math.PI/2;
    const rim=cyl(g,.36,.30,'#a3b6c0',0,.66,wz);
    rim.rotation.z=Math.PI/2;
  }
  box(g,.45,.35,2.2,'#293840',0,1.02,0);
  box(g,.84,.43,1.3,'#ce4e35',0,1.42,-.22);
  box(g,.66,.25,.77,'#27282e',0,1.63,.60);
  box(g,1.45,.12,.20,'#bbc9d1',0,2.06,-.91);
  cyl(g,.12,.65,'#a3b5c0',0,1.73,-.97);
  sphere(g,.3,'#fff2cc',0,1.42,-1.25);
  box(g,.45,.23,.30,'#be302d',0,1.13,1.20);
  for(const side of [-1,1])box(g,.14,.14,.9,'#a1acb1',side*.47,.9,.32);
  const rider=makeHuman('#23435d','#bb917b');
  rider.group.scale.set(.63,.63,.63);
  rider.group.position.set(0,.71,.35);
  g.add(rider.group);
  return {group:g,rider};
}
function addMotorbike(){
  const obj=makeMotorbike(),x=-153,z=-192;
  obj.group.position.set(x,0,z);scene.add(obj.group);
  sign('DEIN MOTORRAD',x+8,5.0,z+1,15,'#fff3d7','#4d392f');
  const bike={group:obj.group,name:'DMP Moto 250',x,z,heading:0,speed:0,max:37,
    accel:24,health:100,fuel:100,loaner:true,owned:true,bike:true,price:0,rider:obj.rider};
  cars.push(bike);
  return bike;
}
let player={x:5,z:20,y:0,vertical:0,heading:0,cameraYaw:0,camPitch:0.15,car:null};
const avatar=makeHuman('#253d55');
scene.add(avatar.group);
const heroCars=[];
let collisionCooldown=0;
let qualitySamples=0,qualityTime=0,qualityReduced=false;
function addHeroCar(x,z,color,name,price,owned=false,sport=false,loaner=false){
  const v=createCar(color,sport);
  v.group.position.set(x,0,z);
  v.group.rotation.y=0;
  scene.add(v.group);
  const entry={...v,x,z,heading:0,speed:0,max:sport?39:29,accel:sport?23:18,
    name,price,owned,loaner,health:100,fuel:100};
  cars.push(entry);heroCars.push(entry);return entry;
}
function createNPCs(){
  for(let i=0;i<24;i++){
    const hue=['#395867','#8c695f','#5d697d','#937b62','#315d5a'][i%5];
    const npc=makeHuman(hue,i%3?'#d1a37f':'#9f7256');
    const pathRoad=roads[i%roads.length];
    const axis=i%2?'x':'z';
    const fixed=pathRoad+(i%4<2?-14:14);
    const t=-330+rng()*660;
    npc.group.position.set(axis==='z'?fixed:t,0,axis==='z'?t:fixed);
    scene.add(npc.group);
    npcs.push({g:npc.group,legs:npc.legs,axis,fixed,t,dir:i%3===0?-1:1,speed:.8+rng()*1.2,phase:rng()*5,robbed:false,stunned:0});
  }
}
function createTraffic(){
  for(let i=0;i<18;i++){
    const c=createCar(['#889ca7','#b6aa99','#7f9291','#b4bac5','#b06f61','#6e8496'][i%6],i%7===0);
    scene.add(c.group);
    const axis=i%2?'x':'z', road=roads[(i+2)%roads.length];
    const dir=i%3===0?-1:1;
    traffic.push({g:c.group,x:axis==='z'?road+(dir>0?3:-3):(-335+i*36),
      z:axis==='x'?road+(dir>0?-3:3):(-335+i*36),axis,dir,speed:8+(i%5)*1.8});
  }
}
let helicopter=null;
let heliBlades=null;
let patrolCar=null;
function createPoliceAndHeli(){
  // Patrol vehicle stays on the northern extension, safely off the initial road crossing.
  patrolCar=createCar('#eff2f5',false);
  scene.add(patrolCar.group);
  box(patrolCar.group,1.2,.18,.7,'#203da8',0,1.65,0);
  box(patrolCar.group,.45,.14,.35,'#e33d3d',-.38,1.78,0);
  box(patrolCar.group,.45,.14,.35,'#5f9fff',.38,1.78,0);
  patrolCar.group.position.set(-315,0,-330);
  sign('POLIZEI',-315,7,-337,20,'#d9eeff','#193e67');
  helicopter=new THREE.Group();
  box(helicopter,4.5,1.9,7,'#3d5969',0,0,0);
  box(helicopter,3.2,.85,3.3,'#7cb4cb',0,.7,-1.1);
  box(helicopter,1.1,.65,7,'#455a67',0,.3,5);
  box(helicopter,3.2,.2,1.2,'#273e4c',0,.9,8.4);
  for(const x of [-2,2]){
    box(helicopter,.18,.2,7,'#d5d6d2',x,-1.3,0);
    box(helicopter,.13,1,.15,'#b5c5c8',x,-.9,-2);
    box(helicopter,.13,1,.15,'#b5c5c8',x,-.9,2);
  }
  heliBlades=new THREE.Group();
  box(heliBlades,20,.16,.55,'#272a2e');
  box(heliBlades,.55,.16,20,'#272a2e');
  heliBlades.position.y=1.8;helicopter.add(heliBlades);
  scene.add(helicopter);
}
function updatePoliceAndHeli(dt){
  if(helicopter){
    helicopter.position.set(-220+Math.cos(elapsed*.12)*90,55+Math.sin(elapsed*.36)*6,-222+Math.sin(elapsed*.12)*90);
    helicopter.rotation.y=-elapsed*.12;
    heliBlades.rotation.y+=dt*16;
  }
  if(patrolCar&&!crimeState.wanted){
    const u=(elapsed*9)%620;
    patrolCar.group.position.set(-315,0,-310+u);
    patrolCar.group.rotation.y=Math.PI;
  }
}

function createRobberyEvent(){
  // Fictional NPC wrongdoing: a thief is apprehended by the patrol and taken to prison.
  const thief=makeHuman('#6c4350','#b88973');
  thief.group.position.set(-240,0,-300);
  scene.add(thief.group);
  law.suspect=thief.group;
  law.arrestTimer=0;
  const guard=makeHuman('#213d72','#bd9377');
  guard.group.position.set(prison.x-38,0,prison.z-35);
  scene.add(guard.group);
  law.guard=guard.group;
  law.messageShown=false;
  law.prisoner=false;
  sign('POLIZEIWACHE',-315,7,-337,23,'#ebf5fa','#244764');
}
function updateCrime(dt){
  if(!law.suspect)return;
  law.arrestTimer+=dt;
  const t=law.arrestTimer;
  if(t<22){
    law.suspect.visible=true;
    law.suspect.position.set(-240+Math.min(t*3,45),0,-300);
  }else if(t<37){
    law.suspect.visible=false;
    if(!law.messageShown){
      law.messageShown=true;
      toast('🚓 Polizei: Ein NPC wurde nach einem Raub festgenommen.',5);
    }
  }else{
    law.suspect.visible=true;
    law.suspect.position.set(prison.x,0,prison.z+3);
    if(!law.prisoner){
      law.prisoner=true;
      toast('🚔 Der festgenommene Räuber sitzt nun im Stadtgefängnis.',5);
    }
  }
}
function marker(x,z,color='#ffd35f'){
  const g=new THREE.Group();g.position.set(x,0,z);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.45,.23,8,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}));
  ring.position.y=3.35;g.add(ring);
  cyl(g,.64,.28,color,0,.12,0);
  scene.add(g);return g;
}
const savedKey='dmp_city_racer_3d_demo_01';
let state={cash:0,wins:0,owned:false,deliveries:0,inventory:[],built:false,burgled:[],job:false,jobTarget:-1};
try{
  const data=JSON.parse(localStorage.getItem(savedKey)||'null');
  if(data&&typeof data==='object'){
    state.cash=Math.max(0,Number(data.cash)||0);
    state.wins=Math.max(0,Number(data.wins)||0);
    state.owned=!!data.owned;
    state.deliveries=Math.max(0,Number(data.deliveries)||0);
    state.inventory=Array.isArray(data.inventory)?data.inventory.slice(0,40):[];
    state.built=!!data.built;
    state.burgled=Array.isArray(data.burgled)?data.burgled.filter(Number.isInteger).slice(0,20):[];
    rail.tickets=Math.max(0,Math.min(99,Number(data.trainTickets)||0));
    flight.tickets=Math.max(0,Math.min(99,Number(data.flightTickets)||0));
    flight.side=data.flightSide===1?1:0;
    flight.stop=flight.side;
    if(flight.side===1){player.x=airports[1].gate.x;player.z=airports[1].gate.z;}
  }
}catch(e){}
let day=0.27,playing=false,firstPerson=false,showModal=false,race=null,elapsed=0,toastUntil=0,lastFrame=performance.now();
const input={forward:0,side:0,gas:false,brake:false,sprint:false};
const keys={};
const jobMarker=marker(-27,21,'#ffd167');
const raceMarker=marker(0,-30,'#72d9ff');
const deliveryMarkers=[marker(-115,21,'#5bffab'),marker(125,21,'#5bffab'),marker(-9,125,'#5bffab')];
deliveryMarkers.forEach(m=>m.visible=false);
const checkpoint=marker(0,-105,'#50edff');checkpoint.visible=false;
const vehicleLoan=addHeroCar(11,-29,'#d8ae54','City Compact (Leihwagen)',0,false,false,true);
const personal=addHeroCar(157,21,'#c74237','Veloce GT',950,state.owned,true,false);
personal.group.visible=state.owned; // Showroom preview is already inside. Purchased car appears outside.
const npcRace=createCar('#46bee6',true);scene.add(npcRace.group);npcRace.group.visible=false;
function collectiblesCreate(){
  const locs=[[-16,-70],[40,-109],[-175,-110],[-95,74],[105,115],[175,-105],[-213,140],[0,206],[-178,0],[104,-209],[207,28],[-3,-206],[1510,-108],[1545,-70],[1610,160],[1550,180],[1625,210]];
  locs.forEach(([x,z],i)=>{
    const s=sphere(scene,.72,'#f6cc55',x,1.4,z);
    s.scale.set(1,.20,1);collectibles.push({x,z,obj:s,taken:false,phase:i});
  });
}
function wall(x,z,w,d,h=7,color='#d4c7a8'){
  box(scene,w,h,d,color,x,h/2,z);
  solids.push({x,z,w,d});
}
function buildHouse(){
  // An accessible starter home is always present, including when an old save says built=true.
  const {x,z,w,d}=home;
  box(scene,w,.28,d,'#a9a59c',x,.15,z);
  box(scene,w,0.13,d,'#cfb99e',x,.26,z);
  wall(x-w/2,z,1,d);
  wall(x+w/2,z,1,d);
  wall(x,z+d/2,w,1);
  // Front entrance: a real passable opening between two wall sections.
  wall(x-12,z-d/2,16,1);
  wall(x+12,z-d/2,16,1);
  box(scene,8,.75,1,'#e0e5dd',x,6.6,z-d/2);
  box(scene,8,.14,2,'#a5b4bb',x,.13,z-d/2-1.4);
  // Windows and lighting.
  for(const xx of [x-13,x+13]){
    box(scene,5.2,3.2,.15,'#75aabc',xx,3.8,z-d/2-.64);
    box(scene,5.5,.15,.55,'#fff5dd',xx,2.15,z-d/2-.78);
  }
  box(scene,1.3,5.6,.2,'#714d37',x-4.6,3,z-d/2-.66);
  box(scene,1.3,5.6,.2,'#714d37',x+4.6,3,z-d/2-.66);
  home.roof=box(scene,w+2,1.1,d+2,'#465b63',x,7.65,z);
  sign('🏠 MEIN ZUHAUSE',x,8.6,z-d/2-1.35,28,'#fff9dd','#285e55');
  // Living room: sofa and TV.
  box(scene,10,1.1,3.3,'#5b8277',x-10,.74,z-5);
  box(scene,10,1.8,.9,'#5b8277',x-10,1.75,z-3.7);
  box(scene,7,.7,2.8,'#986e52',x-8,.49,z-10);
  box(scene,8,3.8,.27,'#2d3f47',x-13,2.5,z+5);
  // Functional kitchen: countertop, cabinets, sink, oven.
  box(scene,15,2,3.2,'#d8d8cf',x-10,1,z+11.2);
  box(scene,15,.25,3.4,'#8e9b9e',x-10,2.08,z+11.2);
  box(scene,3.2,2.7,2.8,'#e3ebe8',x-16,1.35,z+8);
  box(scene,2.5,.12,2.5,'#232a2e',x-8,2.29,z+11.0);
  for(const xx of [x-8.85,x-7.25]){
    for(const zz of [z+10.4,z+11.8]){
      const burner=cyl(scene,.36,.04,'#777f84',xx,2.38,zz);
    }
  }
  sign('KÜCHE',x-10,5.6,z+15.9,12,'#f7e7c7','#405e60');
  // Bathroom with real partition and doorway (south opening for the player).
  wall(x+5,z+6.5,1,21,6,'#d1dedf');
  wall(x+12.5,z+16.5,15,1,6,'#d1dedf');
  wall(x+12.5,z-3.5,15,1,6,'#d1dedf');
  // Inward bathroom access has a doorway in the partition gap z = -8 ... -4.
  // Clear that doorway by replacing its lower middle wall section via passage collision below.
  const bathPartition=solids.find(o=>o.x===x+5&&o.z===z+6.5);
  if(bathPartition){const idx=solids.indexOf(bathPartition);solids.splice(idx,1);}
  // Split partition around passage.
  wall(x+5,z+13,1,8,6,'#d1dedf');
  wall(x+5,z+2,1,8,6,'#d1dedf');
  box(scene,4,2.5,4,'#edf1f0',x+13,1.25,z+11);
  box(scene,2,1.4,1.9,'#f9fcfb',x+13,.75,z+3);
  cyl(scene,.63,.23,'#f4f8fa',x+13,1.55,z+3);
  box(scene,3.2,1.6,1.1,'#dceaf0',x+9,.83,z+14);
  sign('WC + BAD',x+12,5.8,z+15.9,11,'#eefaff','#4d707e');
  // Sleeping corner.
  box(scene,8,.78,9,'#806e57',x+11,.44,z-10.5);
  box(scene,7.4,.45,8,'#92aaa3',x+11,1.08,z-10.5);
  box(scene,6,.35,1.8,'#e9e8e1',x+11,1.45,z-13.5);
  sign('SCHLAFEN',x+11,5.7,z-15,9,'#f7eed5','#617780');
  state.built=true;
}
function createTargetHome(x,z){
  box(scene,52,.15,54,'#719275',x,.08,z);
  const centerZ=z+2,front=z-14;
  // Hollow residence: the front doorway can be opened by in-game burglary,
  // and the visitor can actually enter a modeled room.
  wall(x-18.5,centerZ,1,32,10,'#c1b398');
  wall(x+18.5,centerZ,1,32,10,'#c1b398');
  wall(x,centerZ+15.5,38,1,10,'#c1b398');
  wall(x-12,front,14,1,10,'#c1b398');
  wall(x+12,front,14,1,10,'#c1b398');
  box(scene,40,1,34,'#855c50',x,10.5,centerZ);
  const roof=scene.children[scene.children.length-1];
  for(const dx of [-12,12])box(scene,5,4,.2,'#51849e',x+dx,5,front-.55);
  const door=box(scene,7.6,6,.25,'#674c38',x,3,front-.55);
  const lock={x,z:front,w:7.6,d:.6};
  solids.push(lock);
  sign('WOHNHAUS',x,12,front-.6,20,'#fff8dd','#4f625b');
  // Interior furniture is visible when the roof hides.
  box(scene,8,1.1,3,'#7b968c',x-8,.65,centerZ+4);
  box(scene,8,2,.8,'#72918b',x-8,1.6,centerZ+5);
  box(scene,7,.7,3,'#936c4e',x+8,.5,centerZ+4);
  box(scene,7,.9,9,'#907c68',x-8,.58,centerZ-6);
  box(scene,3,2.5,2.5,'#f0eee9',x+12,1.3,centerZ+12);
  box(scene,3,1.9,8,'#c4c9c0',x+14,.95,centerZ-4);
  const loot=box(scene,2.4,1.8,2.2,'#d6bd66',x,1.05,centerZ+10);
  sign('WERTSACHEN',x,4,centerZ+10,12,'#ffefa1','#645b30');
  const id=burglarHomes.length,looted=state.burgled.includes(id);
  burglarHomes.push({id,x,z:front,centerZ,open:looted,looted,door,lock,roof,loot});
  if(looted){door.visible=false;loot.visible=false;const idx=solids.indexOf(lock);if(idx>=0)solids.splice(idx,1);}
}
function createMountains(){
  const peaks=[
    {x:-80,z:-510,r:98,h:80},{x:80,z:-536,r:105,h:105},
    {x:260,z:-521,r:108,h:142},{x:455,z:-544,r:94,h:121},
    {x:595,z:-518,r:100,h:91}
  ];
  for(const [i,m] of peaks.entries()){
    const stone=new THREE.Mesh(new THREE.ConeGeometry(m.r,m.h,9,4),material(i%2?'#637878':'#71817b'));
    stone.position.set(m.x,m.h/2,m.z);scene.add(stone);
    const cap=new THREE.Mesh(new THREE.ConeGeometry(m.r*.29,m.h*.29,9),material('#e5ebea'));
    cap.position.set(m.x,m.h*.855,m.z);scene.add(cap);
    mountainBases.push({x:m.x,z:m.z,r:m.r*.64});
    for(let n=0;n<5;n++){
      const angle=(n/5)*Math.PI*2;
      const tx=m.x+Math.cos(angle)*m.r*.91,tz=m.z+Math.sin(angle)*m.r*.91;
      if(tz> -405)continue;
      tree(tx,tz,.8+rng()*.55);
    }
  }
  // Scenic access road and viewpoint before the mountain wall.
  box(scene,13,.16,120,'#69746e',0,.1,-385);
  box(scene,46,.16,27,'#7f8a84',0,.16,-442);
  sign('BERGE & PANORAMA',0,7,-456,31,'#faf6d2','#325648');
  box(scene,12,5,10,'#8b7058',-38,2.5,-450);
  box(scene,14,1,12,'#655248',-38,5.5,-450);
  solids.push({x:-38,z:-450,w:12,d:10});
}
function initialise(){
  buildCity();createNPCs();createTraffic();createBicycles();collectiblesCreate();createPoliceAndHeli();createRobberyEvent();addMotorbike();
  buildHouse();
  avatar.group.position.set(player.x,0,player.z);
  camera.position.set(player.x,8,player.z+15);
  renderHUD();
}
function renderHUD(){
  $('cash').textContent=state.cash.toLocaleString('de-DE')+' €';
  $('vehicle').textContent=flight.onboard?'✈️ Im Flugzeug':rail.onboard?'🚆 Im Zug':player.car?(player.car.bike?'🏍️ ':'🚗 ')+player.car.name:'🚶 Zu Fuß';
  $('speed').textContent=player.car?Math.round(Math.abs(player.car.speed)*3.6)+' km/h · ⛽ '+Math.round(player.car.fuel)+'%':'0 km/h';
  $('progress').textContent='🏁 '+state.wins+' Siege';
  $('wanted').textContent=crimeState.wanted?'🚓 Fahndung '+crimeState.wanted+'/3':'🟢 Keine Fahndung';
  const goal=airports[flight.side].gate;
  const distance=Math.hypot(goal.x-player.x,goal.z-player.z);
  $('navigation').textContent=flight.onboard?'✈️ '+airports[1-flight.stop].country+' · im Flug':
    '✈️ Flughafen '+airports[flight.side].country+': '+Math.round(distance)+' m '+(goal.x>player.x+20?'→ Osten':goal.x<player.x-20?'← Westen':goal.z<player.z?'↑ Norden':'↓ Süden');
  document.body.classList.toggle('driving',!!player.car);
  document.body.classList.toggle('wanted',crimeState.wanted>0);
  if(flight.onboard){$('mission').textContent='✈️ Flug nach '+airports[1-flight.stop].country+' · '+Math.round(flight.progress*100)+' % Strecke';}
  else if(rail.onboard){$('mission').textContent='🚆 Zugreise nach '+rail.stations[1-rail.stop].name+' · Ticket eingelöst';}
  else if(race){
    $('mission').textContent='🏁 Rennen! Checkpoint '+(race.index+1)+'/'+race.points.length+
      ' · '+Math.round(race.elapsed)+'s · Gegner: '+Math.round(race.aiProgress*100)+'%';
  }else if(state.job){
    $('mission').textContent='📦 Lieferung läuft! Folge dem grünen Zielmarker. Belohnung: 350 € Spielgeld.';
  }else if(!state.owned){
    $('mission').textContent='💰 '+state.cash+' € · Gelber Marker = Job · Blauer Marker = Rennen. Der goldene Wagen ist kostenlos ausleihbar!';
  }else{
    $('mission').textContent='🏆 Freies Spiel: Neue Jobs, Rennen, Läden und Fahrzeug-Tuning. Du besitzt den Veloce GT!';
  }
}
function save(){
  try{localStorage.setItem(savedKey,JSON.stringify({
    cash:state.cash,wins:state.wins,owned:state.owned,deliveries:state.deliveries,
    inventory:state.inventory,built:state.built,burgled:state.burgled,trainTickets:rail.tickets,
    flightTickets:flight.tickets,flightSide:flight.side
  }));}catch(e){}
}
function toast(text,seconds=3){
  const el=$('toast');el.textContent=text;el.classList.add('show');toastUntil=performance.now()+seconds*1000;
}
function near(a,b,r){return Math.hypot(a.x-b.x,a.z-b.z)<r;}
function nearestCar(){
  return cars.filter(c=>c.group.visible).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];
}
function openModal(title,desc,options){
  showModal=true;$('modalTitle').textContent=title;$('modalText').textContent=desc;
  const area=$('modalOptions');area.replaceChildren();
  options.forEach(o=>{
    const b=document.createElement('button');b.textContent=o.label;b.className=o.primary?'primary':'';
    b.disabled=!!o.disabled;b.addEventListener('click',()=>{closeModal();o.run();});area.appendChild(b);
  });
  $('modal').classList.remove('hidden');
}
function closeModal(){showModal=false;$('modal').classList.add('hidden');}
function showInventory(){
  if(!playing||rail.onboard||flight.onboard)return;
  const counts=new Map();
  for(const item of state.inventory)counts.set(item,(counts.get(item)||0)+1);
  const lines=counts.size?[...counts].map(([item,count])=>item+' × '+count).join(' · '):'Du hast noch keine Sachen. Besuche den City Markt oder das Café.';
  openModal('🎒 Dein Inventar',lines+'\n\n'+(state.owned?'🚗 Fahrzeug: Veloce GT.':'🚶 Noch kein eigenes Auto.')+
    '\n💰 Guthaben: '+state.cash+' €',[
      {label:'🧃 Getränk verwenden',disabled:!state.inventory.includes('Getränk'),run:()=>useItem('Getränk')},
      {label:'🥪 Sandwich essen',disabled:!state.inventory.includes('Sandwich'),run:()=>useItem('Sandwich')},
      {label:'🍰 Kuchen essen',disabled:!state.inventory.includes('Kuchen'),run:()=>useItem('Kuchen')},
      {label:'🍞 Toast essen',disabled:!state.inventory.includes('Toast'),run:()=>useItem('Toast')},
      {label:'Schließen',primary:true,run:()=>{}}
  ]);
}
function useItem(name){
  const at=state.inventory.indexOf(name);
  if(at>=0){state.inventory.splice(at,1);save();toast('✅ '+name+' verwendet!');}
}
function spend(cost,success){if(state.cash<cost){toast('Nicht genug Spielgeld! Du brauchst '+cost+' €.');return;}state.cash-=cost;success();save();renderHUD();}
function showShop(s){
  if(s.id==='markt'){
    openModal('🛒 City Markt','Du bist im Laden. Wähle eine Ware. Alles kostet nur virtuelles Spielgeld.',[
      {label:'🥤 Getränk · 15 €',run:()=>spend(15,()=>{state.inventory.push('Getränk');toast('Getränk gekauft!')})},
      {label:'🎒 Rucksack · 80 €',run:()=>spend(80,()=>{state.inventory.push('Rucksack');toast('Rucksack im Inventar!')})},
      {label:'📱 Smartphone · 270 €',run:()=>spend(270,()=>{state.inventory.push('Smartphone');toast('Smartphone gekauft!')})}
    ]);
  }else if(s.id==='cars'){
    openModal('🏎️ Veloce Autohaus',state.owned?'Dein Sportwagen wartet vor dem Autohaus.':'Ein echter Sportwagen für 950 € Spielgeld. Verdiene Geld durch Jobs und Rennen!',[
      {label:state.owned?'✅ Veloce GT bereits gekauft':'🚘 Veloce GT kaufen · 950 €',disabled:state.owned,primary:true,run:()=>spend(950,()=>{state.owned=true;personal.owned=true;personal.group.visible=true;toast('Veloce GT gehört jetzt dir!')})}
    ]);
  }else if(s.id==='cafe'){
    openModal('☕ City Café','Bestelle etwas zu essen. Bezahlen geht mit deinem verdienten Spielgeld.',[
      {label:'🥪 Sandwich · 25 €',run:()=>spend(25,()=>{state.inventory.push('Sandwich');toast('Sandwich gekauft!')})},
      {label:'🍰 Kuchen · 18 €',run:()=>spend(18,()=>{state.inventory.push('Kuchen');toast('Lecker!')})}
    ]);
  }else if(s.id==='service'){
    openModal('🔧 Werkstatt & Tankstelle','Hier kannst du dein Fahrzeug mit Spielgeld tanken, reparieren und verbessern.',[
      {label:'⛽ Leihwagen tanken · 20 €',run:()=>spend(20,()=>{vehicleLoan.fuel=100;toast('Tank wieder voll!')})},
      {label:'🧰 Fahrzeug reparieren · 80 €',run:()=>spend(80,()=>{(player.car||vehicleLoan).health=100;toast('Fahrzeug repariert!')})},
      {label:'🚀 Veloce Motor-Tuning · 300 €',disabled:!state.owned,run:()=>spend(300,()=>{personal.max=49;toast('Motor aufgerüstet!')})}
    ]);
  }else if(s.id==='job'){startJob();}
}
const targets=[{x:-115,z:21},{x:125,z:21},{x:-9,z:125}];
function startJob(){
  if(state.job){toast('Liefere zuerst dein Paket aus!');return;}
  state.job=true;
  state.jobTarget=state.deliveries%targets.length;
  deliveryMarkers.forEach((m,i)=>m.visible=i===state.jobTarget);
  toast('📦 Paket übernommen! Folge der grünen Markierung.');
  renderHUD();
}
function finishJob(){
  const i=state.jobTarget;
  if(i<0)return;
  deliveryMarkers[i].visible=false;
  state.job=false;state.jobTarget=-1;state.deliveries++;state.cash+=350;
  toast('📦 Zugestellt! +350 € Spielgeld!',4);save();renderHUD();
}
function setCar(car){
  if(player.car){const old=player.car;player.x=old.x+2.8;player.z=old.z+2.5;avatar.group.visible=true;player.car=null;toast('Ausgestiegen');}
  else if(car){
    player.car=car;avatar.group.visible=false;player.x=car.x;player.z=car.z;player.cameraYaw=car.heading;
    toast(car.loaner?'Leihwagen: kostenlos!':'Gute Fahrt, dein '+car.name+'!');
  }
  renderHUD();
}
function tryVehicle(){
  if(showModal||!playing||rail.onboard||flight.onboard)return;
  if(player.car){setCar(null);return;}
  const car=nearestCar();
  if(car&&near(player,car,7)){
    if(!car.owned&&!car.loaner){toast('Dieses Fahrzeug ist noch nicht gekauft!');return;}
    setCar(car);
  }else toast('Gehe zu einem Auto oder Motorrad! Goldener Leihwagen und rotes Motorrad sind kostenlos.');
}
const track=[{x:0,z:-105},{x:-105,z:-105},{x:-105,z:0},{x:0,z:0},{x:0,z:-30}];
const start={x:0,z:-30};
const raceSegments=[];
let raceTotal=0,prevPoint=start;
for(const p of track){const len=Math.hypot(p.x-prevPoint.x,p.z-prevPoint.z);raceSegments.push({a:prevPoint,b:p,start:raceTotal,len});raceTotal+=len;prevPoint=p;}
function placeRaceAI(distance){
  let left=Math.min(distance,raceTotal);
  let pt=track[track.length-1],yaw=0;
  for(const s of raceSegments){
    if(left<=s.len){
      const t=s.len?left/s.len:0;
      pt={x:s.a.x+(s.b.x-s.a.x)*t,z:s.a.z+(s.b.z-s.a.z)*t};
      yaw=Math.atan2(s.b.x-s.a.x,s.a.z-s.b.z);
      break;
    }left-=s.len;
  }
  npcRace.group.position.set(pt.x+2.6,0,pt.z+2.6);
  npcRace.group.rotation.y=-yaw;
}
function startRace(){
  if(!player.car){toast('Steig zuerst in den goldenen Leihwagen!');return;}
  if(race){toast('Rennen läuft bereits!');return;}
  const car=player.car;car.x=0;car.z=-30;car.heading=0;car.speed=0;
  car.group.position.set(car.x,0,car.z);car.group.rotation.y=0;
  player.x=car.x;player.z=car.z;player.cameraYaw=0;
  race={elapsed:0,index:0,points:track,aiProgress:0};
  checkpoint.visible=true;checkpoint.position.set(track[0].x,0,track[0].z);
  npcRace.group.visible=true;
  placeRaceAI(0);
  toast('🏁 Rennen gestartet! Folge den türkisen Ringen!',4);renderHUD();
}
function finishRace(){
  const raceTime=race.elapsed;
  const won=race.aiProgress<1;
  npcRace.group.visible=false;checkpoint.visible=false;
  race=null;
  if(won){state.cash+=650;state.wins++;toast('🏆 GEWONNEN! '+raceTime.toFixed(1)+'s · +650 €',5);}
  else{state.cash+=180;toast('🏁 Ziel erreicht! +180 € Teilnahmegeld',4);}
  save();renderHUD();
}
function nearPump(){return station.pumps.some(p=>Math.hypot(player.x-p.x,player.z-p.z)<10);}
function openFuelMenu(car){
  if(!car){toast('⛽ Fahre mit einem Auto zur Zapfsäule.');return;}
  if(Math.abs(car.speed)>1.5){toast('⛽ Bitte zum Tanken anhalten!');return;}
  const missing=Math.max(0,100-car.fuel),price=Math.ceil(missing*.45);
  openModal('⛽ CITY TANK',car.name+' · Tank: '+Math.round(car.fuel)+' % · Volltanken: '+price+' € Spielgeld',[
    {label:'⛽ Volltanken · '+price+' €',disabled:missing<.1,primary:true,run:()=>spend(price,()=>{car.fuel=100;toast('⛽ Vollgetankt!');renderHUD();})},
    {label:'⛽ 20 % nachtanken · 9 €',disabled:missing<1,run:()=>spend(9,()=>{car.fuel=Math.min(100,car.fuel+20);toast('⛽ Getankt!');renderHUD();})},
    {label:'Schließen',run:()=>{}}
  ]);
}
function showHomeWelcome(){
  openModal('🏠 Mein Wohnhaus','Das Haus gehört dir! Gehe durch die offene Haustür. Drinnen gibt es Küche, Badezimmer mit WC, Wohnzimmer und ein Bett.',[
    {label:'🏠 Haus betreten',primary:true,run:()=>{player.x=home.x;player.z=home.z-10;player.y=0;avatar.group.position.set(player.x,0,player.z);toast('🏠 Willkommen zu Hause!',3)}},
    {label:'Schließen',run:()=>{}}
  ]);
}
function insideHome(){return Math.abs(player.x-home.x)<home.w/2-1&&Math.abs(player.z-home.z)<home.d/2-1;}
function homeAction(){
  if(insideHome()){
    if(near(player,{x:home.x-8,z:home.z+11},5)){
      openModal('🍳 Deine Küche','Du kannst etwas kochen oder Wasser trinken.',[
        {label:'🥪 Toast zubereiten (kostenlos)',primary:true,run:()=>{state.inventory.push('Toast');save();toast('🍳 Toast in deinem Inventar!')}},
        {label:'🚰 Wasser trinken',run:()=>toast('💧 Erfrischt!',2)}
      ]);return true;
    }
    if(near(player,{x:home.x+13,z:home.z+3},5)){
      openModal('🚽 Dein Badezimmer','Das ist dein eigenes WC mit Waschbecken und Badewanne.',[
        {label:'🚽 Toilette benutzen',primary:true,run:()=>toast('✅ Badezimmer benutzt.',2)},
        {label:'🧼 Hände waschen',run:()=>toast('🫧 Hände gewaschen.',2)}
      ]);return true;
    }
    if(near(player,{x:home.x+11,z:home.z-10.5},5)){
      openModal('🛏️ Dein Schlafzimmer','Du kannst im Bett schlafen und den Tagesablauf weiterschalten.',[
        {label:'🌙 Schlafen',primary:true,run:()=>{day=(day+.18)%1;toast('😴 Ausgeschlafen!',3)}}
      ]);return true;
    }
  }
  if(near(player,{x:home.x,z:home.z-18},7)){showHomeWelcome();return true;}
  return false;
}
function closestNPC(dist=5){
  let best=null,d=dist;
  for(const n of npcs){
    const distance=Math.hypot(player.x-n.g.position.x,player.z-n.g.position.z);
    if(distance<d){d=distance;best=n;}
  }
  return best;
}
function markWanted(level){
  crimeState.wanted=Math.max(crimeState.wanted,level);
  crimeState.seconds=Math.max(crimeState.seconds,25+level*12);
  renderHUD();
}
function punchAction(){
  if(!playing||showModal||player.car||rail.onboard||flight.onboard||crimeState.arrestTime>0)return;
  if(crimeState.punchWait>0)return;
  crimeState.punchWait=.7;crimeState.attackTime=.5;
  const target=closestNPC(4.3);
  if(target){
    target.stunned=4;target.dir*=-1;
    markWanted(1);toast('🥊 Treffer! Die Person flieht und die Polizei wird informiert.',3);
  }else toast('🥊 Schlag ins Leere. Gehe näher zu einer Spielfigur.',2);
}
function burglaryAction(){
  for(const b of burglarHomes){
    if(!b.open&&near(player,{x:b.x,z:b.z-2},7)){
      b.open=true;b.door.visible=false;
      const idx=solids.indexOf(b.lock);if(idx>=0)solids.splice(idx,1);
      markWanted(2);toast('🚨 Einbruch im Spiel! Die Haustür ist offen – Polizei alarmiert!',4);
      return true;
    }
    if(b.open&&near(player,{x:b.x,z:b.centerZ+10},5)){
      if(b.looted){toast('📦 Hier sind keine Wertsachen mehr.',2);return true;}
      b.looted=true;b.loot.visible=false;state.burgled.push(b.id);
      state.cash+=180;markWanted(3);save();renderHUD();
      toast('💰 Wertsachen eingesammelt: +180 € Spielgeld · Polizei sucht dich!',4);
      return true;
    }
  }
  return false;
}
function robAction(){
  if(!playing||showModal||player.car||rail.onboard||flight.onboard||crimeState.arrestTime>0)return;
  // Fictional game-only robbery, with police consequences and no gore.
  const n=closestNPC(5.3);
  if(n){
    if(n.robbed){toast('Die Spielfigur hat kein Spielgeld mehr.',2);return;}
    n.robbed=true;n.stunned=5;n.dir*=-1;
    const money=40+Math.floor(rng()*75);
    state.cash+=money;markWanted(2);save();renderHUD();
    toast('💰 '+money+' € Spielgeld erbeutet – Polizei verständigt!',4);
    return;
  }
  if(burglaryAction())return;
  toast('🔎 Keine Person in Reichweite. Vor einem fremden Haus kannst du einen Einbruch versuchen.',3);
}
function updateWanted(dt){
  crimeState.punchWait=Math.max(0,crimeState.punchWait-dt);
  crimeState.attackTime=Math.max(0,crimeState.attackTime-dt);
  if(avatar.group.children.length>0){
    avatar.group.rotation.z=crimeState.attackTime>0?Math.sin((.5-crimeState.attackTime)*18)*.16:0;
  }
  if(crimeState.arrestTime>0){
    crimeState.arrestTime=Math.max(0,crimeState.arrestTime-dt);
    if(crimeState.arrestTime===0){
      player.x=prison.x;player.z=prison.z-42;player.y=0;player.vertical=0;
      avatar.group.position.set(player.x,0,player.z);
      toast('🚔 Entlassen. Fahndung beendet.',4);renderHUD();
    }
    return;
  }
  if(!crimeState.wanted||rail.onboard||flight.onboard)return;
  crimeState.seconds-=dt;
  if(crimeState.seconds<=0){crimeState.wanted=0;crimeState.seconds=0;toast('🟢 Fahndung beendet.',2);renderHUD();return;}
  // An active police patrol visibly follows the culprit through the street grid.
  if(patrolCar){
    const g=patrolCar.group,x=g.position.x,z=g.position.z,dx=player.x-x,dz=player.z-z;
    const distance=Math.hypot(dx,dz);
    if(distance>2&&distance<1000){
      const step=dt*24, nx=x+dx/distance*step,nz=z+dz/distance*step;
      if(!wallCollision(nx,nz,2,true))g.position.set(nx,0,nz);
      else if(!wallCollision(nx,z,2,true))g.position.x=nx;
      else if(!wallCollision(x,nz,2,true))g.position.z=nz;
      g.rotation.y=-Math.atan2(dx,-dz);
    }
    if(distance<6&&crimeState.wanted>=2&&!player.car){
      const fine=Math.min(state.cash,60+crimeState.wanted*20);
      state.cash-=fine;crimeState.wanted=0;crimeState.seconds=0;
      crimeState.arrestTime=7;
      player.x=prison.x;player.z=prison.z-42;
      player.y=0;player.vertical=0;
      avatar.group.position.set(player.x,0,player.z);
      save();renderHUD();toast('🚔 Festgenommen! 7 Sekunden Arrest, '+fine+' € Spielgeld Strafe.',5);
    }
  }
}

function interact(){
  if(!playing||showModal||crimeState.arrestTime>0)return;
  if(rail.onboard||flight.onboard)return;
  if(airportAction())return;
  if(!player.car&&trainAction())return;
  if(nearPump()){openFuelMenu(player.car);return;}
  if(!player.car&&homeAction())return;
  if(!player.car&&burglaryAction())return;
  if(state.job&&near(player,targets[state.jobTarget],9)){finishJob();return;}
  const pick=collectibles.find(c=>!c.taken&&near(player,c,5.5));
  if(pick){pick.taken=true;pick.obj.visible=false;state.cash+=20;state.inventory.push('Fundmünze');toast('🪙 Münze eingesammelt · +20 €!');save();renderHUD();return;}
  if(!player.car){
    const s=shops.find(s=>Math.abs(player.x-s.x)<s.w/2+6&&player.z>s.front-8&&player.z<s.z+s.d/2+7);
    if(s){showShop(s);return;}
    if(near(player,{x:-27,z:21},13)){startJob();return;}
    if(near(player,{x:home.x,z:home.z-18},8)){showHomeWelcome();return;}
  }else if(near(player,start,19)){startRace();return;}
  toast(player.car?'🏁 Fahre zum blauen Rennmarker oder steige aus!':'Betritt einen Laden oder folge dem gelben Jobmarker.');
}
function wallCollision(x,z,radius=.65,isVehicle=false){
  // Enlarged vehicle bounds: cars MUST stay outside every building including shop doors.
  if(x< -680+radius||x>1920-radius||Math.abs(z)>620-radius)return true;
  if(isVehicle&&crossingCollision(x,z,radius))return true;
  if(isVehicle)for(const o of obstacles){if(Math.hypot(x-o.x,z-o.z)<o.r+radius)return true;}
  for(const hill of mountainBases){if(Math.hypot(x-hill.x,z-hill.z)<hill.r+radius)return true;}
  for(const b of solids){
    if(Math.abs(x-b.x)<b.w/2+radius&&Math.abs(z-b.z)<b.d/2+radius)return true;
  }
  for(const s of shops){
    const dx=Math.abs(x-s.x),front=s.front,back=s.z+s.d/2, half=s.w/2;
    if(dx<half+radius && z>front-radius && z<back+radius){
      // Shop doors are for pedestrians, never for vehicles.
      if(isVehicle)return true;
      const sidewall=dx>half-0.3-radius;
      const rearwall=z>back-0.3-radius;
      const frontwall=z<front+0.5+radius && dx>s.door/2-radius;
      if(sidewall||rearwall||frontwall)return true;
    }
  }
  return false;
}
function updateFoot(dt){
  const f=Math.max(-1,Math.min(1,input.forward)),r=Math.max(-1,Math.min(1,input.side));
  const norm=Math.max(1,Math.hypot(f,r));const moving=Math.hypot(f,r)>.1;
  const speed=(input.sprint?11:6.8)*dt/norm;
  const yaw=player.cameraYaw,dirX=Math.sin(yaw)*f+Math.cos(yaw)*r;
  const dirZ=-Math.cos(yaw)*f+Math.sin(yaw)*r;
  const nx=player.x+dirX*speed,nz=player.z+dirZ*speed;
  if(!wallCollision(nx,player.z))player.x=nx;
  if(!wallCollision(player.x,nz))player.z=nz;
  if(moving)player.heading=Math.atan2(dirX,-dirZ);
  if(player.y>0||player.vertical!==0){
    player.vertical-=22*dt;player.y+=player.vertical*dt;
    if(player.y<=0){player.y=0;player.vertical=0;}
  }
  avatar.group.position.set(player.x,player.y,player.z);
  avatar.group.rotation.y=-player.heading;
  const walk=Math.sin(elapsed*(input.sprint?19:13))*(moving?.33:0);
  avatar.legs[0].rotation.x=walk;avatar.legs[1].rotation.x=-walk;
}
function jump(){if(player.car||rail.onboard||flight.onboard||!playing||showModal)return;if(player.y===0){player.vertical=9;toast('⬆ Spring! ',.8);}}
function updateCar(dt){
  const c=player.car;
  if(!c)return;
  let pedal=Math.max(0,input.forward);
  let brake=Math.max(0,-input.forward);
  if(input.gas)pedal=1;
  if(input.brake)brake=1;
  if(c.fuel<=0){pedal=0;if(Math.abs(c.speed)<.3)toast('⛽ Tank leer! Werkstatt aufsuchen.',1);}
  if(rail.gateClosed&&Math.abs(c.z)<9&&Math.abs(c.x-rail.x)<33&&Math.abs(c.speed)>2)c.speed*=Math.exp(-1.6*dt);
  const accel=c.accel*(c.health/100*.65+.35);
  if(pedal)c.speed+=accel*pedal*dt;
  if(brake)c.speed-=24*brake*dt;
  if(!pedal&&!brake)c.speed*=Math.exp(-1.85*dt);
  if(Math.abs(c.speed)<.03)c.speed=0;
  c.speed=THREE.MathUtils.clamp(c.speed,-11,c.max*(c.health/100*.65+.35));
  const steer=input.side;
  if(Math.abs(c.speed)>.25){
    c.heading+=steer*dt*(1.35+Math.min(Math.abs(c.speed)/27,.9))*Math.sign(c.speed);
  }
  // Continuous collision sweep avoids tunnelling through walls at high speed.
  if(mustStopAtRed(c.x,c.z,c.heading,c.speed)){c.speed=Math.max(0,c.speed-45*dt);if(c.speed<1)c.speed=0;}
  const dx=Math.sin(c.heading)*c.speed*dt,dz=-Math.cos(c.heading)*c.speed*dt;
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.65));
  let hit=false;
  for(let j=0;j<steps;j++){
    const nx=c.x+dx/steps,nz=c.z+dz/steps;
    if(wallCollision(nx,nz,c.bike?1.05:2.0,true)){hit=true;break;}
    c.x=nx;c.z=nz;
  }
  if(hit){
    if(collisionCooldown<=0 && Math.abs(c.speed)>3){
      c.health=Math.max(8,c.health-Math.min(24,Math.abs(c.speed)*.8));
      collisionCooldown=.65;toast('💥 Unfall! Fahrzeugzustand: '+Math.round(c.health)+'%',2);
    }
    c.speed=0;
  }
  c.fuel=Math.max(0,c.fuel-Math.abs(c.speed)*dt*.008);
  c.group.position.set(c.x,0,c.z);c.group.rotation.y=-c.heading;
  player.x=c.x;player.z=c.z;
  // The fixed chase camera follows vehicle direction; touch-drag adjusts only look offset.
  player.cameraYaw=THREE.MathUtils.lerp(player.cameraYaw,c.heading,Math.min(1,dt*(firstPerson?7:3)));
}
function updateTraffic(dt){
  for(const t of traffic){
    const nearSignal=trafficLights.some(s=>s.axis===t.axis&&
      (t.axis==='z'?Math.abs(t.x-s.x)<8&&Math.abs(t.z-s.z)<18:Math.abs(t.z-s.z)<8&&Math.abs(t.x-s.x)<18));
    const nearClosedGate=rail.gateClosed&&t.axis==='x'&&Math.abs(t.z)<9&&
      ((t.dir<0&&t.x>rail.x+14&&t.x<rail.x+34)||
      (t.dir>0&&t.x<rail.x-14&&t.x>rail.x-34));
    const move=((!signalGreen(t.axis)&&nearSignal)||nearClosedGate)?0:t.speed*dt;
    if(t.axis==='z')t.z+=move*t.dir;
    else t.x+=move*t.dir;
    if(t.x>364)t.x=-364;if(t.x< -364)t.x=364;
    if(t.z>364)t.z=-364;if(t.z< -364)t.z=364;
    t.g.position.set(t.x,0,t.z);
    t.g.rotation.y=t.axis==='z'?(t.dir>0?Math.PI:0):(t.dir>0?-Math.PI/2:Math.PI/2);
    if(player.car&&near(t,player.car,3.4)&&Math.abs(player.car.speed)>2 && collisionCooldown<=0){
      player.car.health=Math.max(8,player.car.health-Math.min(20,Math.abs(player.car.speed)*.7));
      player.car.speed=0;
      collisionCooldown=.85;
      toast('💥 Zusammenstoß mit dem Verkehr!',2);
    }
  }
}
function updateNPCs(dt){
  for(const n of npcs){
    if(n.stunned>0)n.stunned=Math.max(0,n.stunned-dt);
    n.t+=n.dir*n.speed*(n.stunned>0?2.5:1)*dt;
    if(n.t>338){n.t=338;n.dir=-1;}
    if(n.t< -338){n.t=-338;n.dir=1;}
    n.g.position.set(n.axis==='z'?n.fixed:n.t,0,n.axis==='z'?n.t:n.fixed);
    n.g.rotation.y=n.axis==='z'?(n.dir>0?Math.PI:0):(n.dir>0?-Math.PI/2:Math.PI/2);
    n.legs[0].rotation.x=Math.sin(elapsed*9+n.phase)*.27;
    n.legs[1].rotation.x=-n.legs[0].rotation.x;
  }
}
function updateMission(dt){
  for(const [i,c] of collectibles.entries()){
    if(c.taken)continue;
    c.obj.position.y=1.3+Math.sin(elapsed*2+i)*.3;
    c.obj.rotation.y+=dt*1.7;
    // Pickups are intentionally collected with the interaction button, not merely by walking over them.
  }
  if(!rail.onboard&&!flight.onboard&&state.job&&near(player,targets[state.jobTarget],7.5))finishJob();
  if(race){
    race.elapsed+=dt;
    const aiDist=Math.min(raceTotal,race.elapsed*11.1);
    race.aiProgress=aiDist/raceTotal;
    placeRaceAI(aiDist);
    const target=race.points[race.index];
    if(target&&player.car&&near(player,target,14)){
      race.index++;
      if(race.index===race.points.length){finishRace();}
      else{
        checkpoint.position.set(race.points[race.index].x,0,race.points[race.index].z);
        toast('✅ Checkpoint '+race.index+'/'+race.points.length,1.25);
      }
    }
  }
}
function updateShopsRoof(){
  if(home.roof)home.roof.visible=!(Math.abs(player.x-home.x)<home.w/2-1&&Math.abs(player.z-home.z)<home.d/2-1);
  for(const b of burglarHomes){
    b.roof.visible=!(b.open&&Math.abs(player.x-b.x)<18&&player.z>b.z&&player.z<b.centerZ+16);
  }
  for(const s of shops){
    s.roof.visible=!(Math.abs(player.x-s.x)<s.w/2-1&&player.z>s.front&&player.z<s.z+s.d/2);
  }
}
function updateCamera(dt){
  const tgt=flight.onboard?{x:flight.plane.position.x,y:flight.plane.position.y+5,z:flight.plane.position.z,yaw:flight.stop===0?Math.PI/2:-Math.PI/2}:rail.onboard?{x:rail.x,y:5,z:rail.train.position.z,yaw:Math.PI}:player.car?{x:player.car.x,y:1.4,z:player.car.z,yaw:player.cameraYaw}:
    {x:player.x,y:player.y+1.6,z:player.z,yaw:player.cameraYaw};
  const angle=tgt.yaw;
  if(rail.onboard)player.cameraYaw=rail.stop===0?Math.PI:0;
  if(firstPerson){
    const shift=player.car?1.0:0;
    const eye=new THREE.Vector3(tgt.x,tgt.y+shift,tgt.z);
    const ahead=new THREE.Vector3(tgt.x+Math.sin(angle)*20,tgt.y+shift-1+player.camPitch*13,tgt.z-Math.cos(angle)*20);
    camera.position.lerp(eye,Math.min(1,dt*16));
    camera.lookAt(ahead);
    avatar.group.visible=false;
  }else{
    avatar.group.visible=!(player.car||rail.onboard||flight.onboard);
    const distance=flight.onboard?33:(rail.onboard?21:(player.car?13:10));
    const desired=new THREE.Vector3(
      tgt.x-Math.sin(angle)*distance,tgt.y+(player.car?6.8:5.4)+player.camPitch*5,tgt.z+Math.cos(angle)*distance);
    desired.y=Math.max(2.3,desired.y);
    camera.position.lerp(desired,Math.min(1,dt*5));
    camera.lookAt(tgt.x,tgt.y+1.15,tgt.z);
  }
}
function drawMap(){
  const c=$('minimap').getContext('2d'),W=176,scale=.32;
  c.clearRect(0,0,W,W);c.save();c.beginPath();c.arc(88,88,86,0,Math.PI*2);c.clip();
  c.fillStyle='#789276';c.fillRect(0,0,W,W);
  c.translate(88,88);
  for(const r of roads){
    c.fillStyle='#3b4c56';
    c.fillRect((r-player.x)*scale-3,-88,6,176);
    c.fillRect(-88,(r-player.z)*scale-3,176,6);
  }
  const dots=[
    {x:home.x,z:home.z,color:'#a8ed9b'},
    {x:260,z:-510,color:'#e6e6eb'},
    ...rail.stations.map(st=>({x:rail.x+14,z:st.z,color:'#fce7a1'})),
    {x:rail.x,z:0,color:rail.gateClosed?'#fa4141':'#e8e4ad'},
    ...airports.map(a=>({x:a.gate.x,z:a.gate.z,color:'#9bdcfb'})),
    {x:station.x,z:station.z,color:'#36eea9'},
    {x:-27,z:21,color:'#fce277'},
    {x:0,z:-30,color:'#63dcff'},
    {x:52.5,z:52.5,color:'#ef9e5d'},
    {x:157.5,z:52.5,color:'#ee876d'},
    {x:prison.x,z:prison.z,color:'#cdddf3'}
  ];
  if(state.job)dots.push({...targets[state.jobTarget],color:'#57ff98'});
  if(race)dots.push({...race.points[race.index],color:'#44fcff'});
  dots.forEach(p=>{const x=(p.x-player.x)*scale,z=(p.z-player.z)*scale;if(Math.hypot(x,z)>82)return;
    c.beginPath();c.fillStyle=p.color;c.arc(x,z,3.8,0,Math.PI*2);c.fill();});
  c.save();c.rotate(-player.cameraYaw);
  c.beginPath();c.moveTo(0,-9);c.lineTo(-6,7);c.lineTo(6,7);c.closePath();c.fillStyle='#fff';c.fill();c.strokeStyle='#11364e';c.lineWidth=2;c.stroke();c.restore();
  c.restore();
}
function hint(){
  let text='';
  if(!player.car&&insideHome()){
    if(near(player,{x:home.x-8,z:home.z+11},6))text='🍳 E / AKTION: Küche benutzen';
    else if(near(player,{x:home.x+13,z:home.z+3},6))text='🚽 E / AKTION: WC benutzen';
    else if(near(player,{x:home.x+11,z:home.z-10.5},6))text='🛏️ E / AKTION: Schlafen';
    else text='🏠 Dein Wohnhaus: Küche, WC, Schlafzimmer, Wohnzimmer';
  }
  else if(!player.car&&burglarHomes.some(b=>!b.open&&near(player,{x:b.x,z:b.z-2},9)))text='🚪 E / AKTION: In fremdes Haus einbrechen';
  else if(!player.car&&burglarHomes.some(b=>b.open&&near(player,{x:b.x,z:b.centerZ+10},6)))text='💰 E / AKTION: Wertsachen einsammeln';
  else if(!player.car&&closestNPC(4.5))text='🥊 G / SCHLAG oder H / RAUB (Polizei!)';
  else if(flight.onboard)text='✈️ Flug nach '+airports[1-flight.stop].country;
  else if(!player.car&&airportIndexNearby()>=0)text='✈️ E / AKTION: Flugtickets / Boarding';
  else if(rail.onboard)text='🚆 Unterwegs nach '+rail.stations[1-rail.stop].name;
  else if(!player.car&&nearestRailStop()>=0)text='🎫 E / AKTION: Fahrkartenautomat und Zug';
  else if(nearPump())text=player.car?'⛽ ANHALTEN · E / AKTION: Tanken':'⛽ Tanken nur mit einem Fahrzeug';
  else if(state.job&&near(player,targets[state.jobTarget],13))text='📦 Ziel erreicht – Paket wird zugestellt';
  else if(player.car){
    if(rail.gateClosed&&Math.abs(player.x-rail.x)<48&&Math.abs(player.z)<25)text='🚧 Schranken geschlossen – Zug hat Vorrang!';
    else if(near(player,start,22))text='🏁 E / Aktion: Rennen starten';
    else text='🚗 F / AUTO: Aussteigen · Lenken + Gas + Bremse';
  }else{
    const s=shops.find(s=>Math.abs(player.x-s.x)<s.w/2+6&&player.z>s.front-8&&player.z<s.z+s.d/2+7);
    const c=nearestCar();
    if(s)text='🚪 Durch die offene Tür gehen · E / Aktion: '+s.name;
    else if(near(player,prison,54))text='🚔 Stadtgefängnis: Hier werden festgenommene Räuber untergebracht';
    else if(collectibles.some(c=>!c.taken&&near(player,c,5.5)))text='🪙 E / AKTION: Gegenstand einsammeln';
    else if(near(player,{x:-27,z:21},14))text='📦 E / Aktion: Lieferjob annehmen';
    else if(c&&near(player,c,7))text=(c.bike?'🏍️ F / MOTORRAD: ':'🚗 F / AUTO: ')+(c.loaner?(c.bike?'Motorrad fahren':'Leihwagen fahren'):'Einsteigen');
    else if(near(player,{x:-157,z:-157},25)&&!state.built)text='🏠 E / Aktion: Haus bauen';
  }
  $('prompt').textContent=text;$('prompt').classList.toggle('show',!!text);
}
function updateDay(dt){
  day=(day+dt*.00055)%1;
  const daylight=.65+.35*Math.max(0,Math.sin(day*Math.PI*2));
  ambient.intensity=1.25+daylight*.85;
  sun.intensity=1.3+daylight*.85;
  const sky=new THREE.Color('#8aafc8').lerp(new THREE.Color('#cbd5d7'),Math.max(0,1-daylight)*.55);
  scene.background.copy(sky);scene.fog.color.copy(sky);
}
function tick(t){
  requestAnimationFrame(tick);
  const dt=Math.min(.05,Math.max(0,(t-lastFrame)/1000));lastFrame=t;
  if(playing&&!showModal){
    elapsed+=dt;collisionCooldown=Math.max(0,collisionCooldown-dt);updateDay(dt);
    input.forward=Number(!!keys.KeyW||!!keys.ArrowUp)-Number(!!keys.KeyS||!!keys.ArrowDown)+stickValue.y;
    input.side=Number(!!keys.KeyD||!!keys.ArrowRight)-Number(!!keys.KeyA||!!keys.ArrowLeft)+stickValue.x;
    input.forward=THREE.MathUtils.clamp(input.forward,-1,1);input.side=THREE.MathUtils.clamp(input.side,-1,1);
    input.sprint=!!keys.ShiftLeft||!!keys.ShiftRight||touchSprint;
    if(crimeState.arrestTime>0||rail.onboard||flight.onboard){}else if(player.car)updateCar(dt);else updateFoot(dt);
    updateRail(dt);
    updateFlight(dt);
    updateLevelCrossing(dt);
    updateNPCs(dt);updateWanted(dt);updateTrafficLights();updateTraffic(dt);updateBicycles(dt);updatePoliceAndHeli(dt);updateCrime(dt);updateMission(dt);updateShopsRoof();
  }
  updateCamera(dt);
  if(playing){
    drawMap();hint();
    if(Math.floor(t/190)!==Math.floor((t-dt*1000)/190))renderHUD();
  }
  if(t>toastUntil)$('toast').classList.remove('show');
  renderer.render(scene,camera);
  if(playing && !qualityReduced && dt>0 && dt<.05){
    qualityTime+=dt;qualitySamples++;
    if(qualityTime>12){
      const fps=qualitySamples/qualityTime;
      if(fps<29 && renderer.getPixelRatio()>1.01){
        renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);
        qualityReduced=true;toast('⚙️ Grafik automatisch optimiert für flüssigeres Spielen.',3);
      }
      qualityTime=0;qualitySamples=0;
    }
  }
}
const stickValue={x:0,y:0};let touchSprint=false;
function setupControls(){
  window.addEventListener('keydown',e=>{
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
    keys[e.code]=true;
    if(e.repeat)return;
    if(e.code==='KeyE')interact();
    if(e.code==='KeyF')tryVehicle();
    if(e.code==='KeyV')changeCamera();
    if(e.code==='KeyI')showInventory();
    if(e.code==='KeyG')punchAction();
    if(e.code==='KeyH')robAction();
    if(e.code==='Space')jump();
    if(e.code==='KeyR'&&player.car&&near(player,start,35))startRace();
    if(e.code==='Escape')closeModal();
  });
  window.addEventListener('keyup',e=>{keys[e.code]=false;});
  window.addEventListener('blur',()=>{for(const k in keys)keys[k]=false;input.gas=false;input.brake=false;touchSprint=false;stickValue.x=0;stickValue.y=0;centerStick();save();});
  $('camera').addEventListener('click',changeCamera);
  $('inventory').addEventListener('click',showInventory);
  $('btnCar').addEventListener('click',tryVehicle);
  $('btnUse').addEventListener('click',interact);
  $('btnJump').addEventListener('click',jump);
  $('btnHit').addEventListener('click',punchAction);
  $('btnRob').addEventListener('click',robAction);
  $('btnSprint').addEventListener('pointerdown',e=>{e.preventDefault();touchSprint=true;});
  for(const event of ['pointerup','pointercancel','pointerleave'])$('btnSprint').addEventListener(event,()=>{touchSprint=false;});
  for(const [id,key] of [['btnGas','gas'],['btnBrake','brake']]){
    const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);input[key]=true;});
    for(const evt of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(evt,()=>{input[key]=false;});
  }
  $('closeModal').addEventListener('click',closeModal);
  $('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal();});
  $('help').addEventListener('click',()=>openModal('🎮 Steuerung & Ziele','iPad: linker Joystick bewegt den Menschen bzw. lenkt das Auto. Gas und Bremse im Auto rechts. Wische rechts über die Stadt, um dich umzusehen. PC: WASD, E Aktion, F Ein-/Aussteigen, V Perspektive, Leertaste springen, Shift sprinten, R Rennen am blauen Marker. Der goldene Wagen ist kostenlos geliehen. Jobs bringen 350 €, Rennen bis 650 €. Der rote Sportwagen kostet 950 €. NEU: Flughafen im Osten (der Wegweiser zeigt die Entfernung). Flugticket am Terminal für 100 € kaufen, beim stehenden Flugzeug mit AKTION einsteigen und nach Frankreich fliegen. Rückflüge brauchen ebenfalls ein Ticket. Der Bahnübergang liegt westlich der City: Bei herannahendem Zug schließen Schranken automatisch – davor halten! NEU: Dein eigenes Wohnhaus liegt im Südwesten (Küche mit Toast, WC und Bett). Das rote Motorrad steht neben dem Haus, kostenlos fahren mit F. G = Schlagen, H = Spielfiguren berauben bzw. Einbruch an einer fremden Tür, E = Wertsachen mitnehmen. Alles nur im Spiel ohne Blut; die Polizei fahndet bei Straftaten. Berge mit Aussichtspunkt liegen nördlich der Stadt.',[{label:'Alles klar!',primary:true,run:()=>{}}]));
  $('fullscreen').addEventListener('click',()=>{const e=document.documentElement;if(document.fullscreenElement)document.exitFullscreen();else if(e.requestFullscreen)e.requestFullscreen().catch(()=>toast('Vollbild nicht verfügbar'));});
  $('start').addEventListener('click',()=>{$('veil').style.display='none';playing=true;lastFrame=performance.now();toast('Willkommen in City Racer! Folge dem gelben Marker.',4);});
  const area=$('stick');let pointer=null;
  area.addEventListener('pointerdown',e=>{e.preventDefault();pointer=e.pointerId;area.setPointerCapture(pointer);moveStick(e);});
  area.addEventListener('pointermove',e=>{if(e.pointerId===pointer)moveStick(e);});
  const release=e=>{if(pointer!==null&&(e.pointerId===pointer||e.type==='lostpointercapture')){pointer=null;stickValue.x=0;stickValue.y=0;centerStick();}};
  area.addEventListener('pointerup',release);area.addEventListener('pointercancel',release);area.addEventListener('lostpointercapture',release);
  let dragId=null,lastX=0,lastY=0;
  renderer.domElement.addEventListener('pointerdown',e=>{dragId=e.pointerId;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(dragId);});
  renderer.domElement.addEventListener('pointermove',e=>{if(dragId!==e.pointerId||!playing||showModal)return;
    const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
    player.cameraYaw-=dx*.005;
    player.camPitch=THREE.MathUtils.clamp(player.camPitch+dy*.002,-.45,.7);
  });
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(ev,()=>{dragId=null;});
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
  window.addEventListener('pagehide',save);
  setInterval(()=>{if(playing)save();},14000);
}
function centerStick(){$('stickknob').style.left='50%';$('stickknob').style.top='50%';}
function moveStick(e){
  const r=$('stick').getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  let dx=(e.clientX-cx)/(r.width*.34),dy=(e.clientY-cy)/(r.height*.34);
  const n=Math.max(1,Math.hypot(dx,dy));dx/=n;dy/=n;
  stickValue.x=dx;stickValue.y=-dy;
  $('stickknob').style.left=(50+dx*34)+'%';$('stickknob').style.top=(50+dy*34)+'%';
}
function changeCamera(){
  firstPerson=!firstPerson;
  document.body.classList.toggle('first',firstPerson);
  $('camera').textContent=firstPerson?'👁 Ich':'👁 Außen';
  toast(firstPerson?'Ich-Perspektive':'Außenkamera',1.2);
}
initialise();setupControls();
loadMessage.textContent='✅ Stadt geladen. Viel Spaß!';
$('start').disabled=false;
requestAnimationFrame(tick);
