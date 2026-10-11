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
scene.fog = new THREE.Fog('#a6c4d6', 170, 430);
const camera = new THREE.PerspectiveCamera(68, innerWidth/innerHeight, 0.1, 850);
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
const ground=box(scene,810,0.5,810,'#719368',0,-.43,0);
const roads=[-315,-210,-105,0,105,210,315];
const solids=[],shops=[],cars=[],npcs=[],traffic=[],collectibles=[],objects=[];
const obstacles=[],trafficLights=[],bicycles=[];
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
    box(scene,760,.09,18,'#3f5056',0,.035,p);
    box(scene,2.3,.16,760,'#a8a9a2',p-10.3,.08,0);
    box(scene,2.3,.16,760,'#a8a9a2',p+10.3,.08,0);
    box(scene,760,.16,2.3,'#a8a9a2',0,.08,p-10.3);
    box(scene,760,.16,2.3,'#a8a9a2',0,.08,p+10.3);
    for(let t=-352;t<=352;t+=18){
      if(roads.some(other=>Math.abs(t-other)<18))continue;
      box(scene,.22,.12,8,'#d0cebf',p,.10,t);
      box(scene,8,.12,.22,'#d0cebf',t,.10,p);
    }
  }
  for(const a of roads)for(const b of roads){
    if(a===-210||a===210||b===-210||b===210)continue;
    for(let v=-7;v<=7;v+=3.5){
      box(scene,1.6,.15,3.3,'#d6d9ce',a+v,.14,b+13.5);
      box(scene,3.3,.15,1.6,'#d6d9ce',a+13.5,.14,b+v);
    }
  }
  for(const x of [-262.5,-157.5,-52.5,52.5,157.5,262.5])
    for(const z of [-262.5,-157.5,-52.5,52.5,157.5,262.5]){
      box(scene,87,.09,87,'#878f81',x,.02,z);
      const specialty=shopDefs.find(s=>s.x===x&&s.z===z);
      if(x===station.x&&z===station.z)createGasStation();
      else if(x===prison.x&&z===prison.z)createPrison();
      else if(specialty)createShop(specialty);
      else if(x===-157.5&&z===-157.5){sign('BAUGRUNDSTÜCK',x,4,z-27,25,'#ffe2a8','#395747');}else genericBuilding(x,z,54+rng()*11,52+rng()*16,13+Math.floor(rng()*8)*4.2);
      for(let k=-1;k<=1;k+=2){
        tree(x+k*39,z+38,0.75+rng()*.25);
      }
      streetLight(x-42,z-42);
    }
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
  box(scene,48,7,23,'#d4d8d5',x,3.55,z+28);
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
    npcs.push({g:npc.group,legs:npc.legs,axis,fixed,t,dir:i%3===0?-1:1,speed:.8+rng()*1.2,phase:rng()*5});
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
  if(patrolCar){
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
let state={cash:0,wins:0,owned:false,deliveries:0,inventory:[],built:false,job:false,jobTarget:-1};
try{
  const data=JSON.parse(localStorage.getItem(savedKey)||'null');
  if(data&&typeof data==='object'){
    state.cash=Math.max(0,Number(data.cash)||0);
    state.wins=Math.max(0,Number(data.wins)||0);
    state.owned=!!data.owned;
    state.deliveries=Math.max(0,Number(data.deliveries)||0);
    state.inventory=Array.isArray(data.inventory)?data.inventory.slice(0,40):[];
    state.built=!!data.built;
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
  const locs=[[-16,-70],[40,-109],[-175,-110],[-95,74],[105,115],[175,-105],[-213,140],[0,206],[-178,0],[104,-209],[207,28],[-3,-206]];
  locs.forEach(([x,z],i)=>{
    const s=sphere(scene,.72,'#f6cc55',x,1.4,z);
    s.scale.set(1,.20,1);collectibles.push({x,z,obj:s,taken:false,phase:i});
  });
}
function buildHouse(){
  if(state.built)return;
  const x=-157.5,z=-157.5;
  box(scene,25,.30,25,'#b0b0a6',x,.17,z);
  box(scene,21,9,20,'#cfbf9e',x,4.65,z);
  box(scene,24,1,23,'#514842',x,9.6,z);
  box(scene,3.3,5,.15,'#654d38',x,2.7,z-10.1);
  box(scene,5.5,3,.16,'#83b5c4',x-6,5,z-10.1);
}
function initialise(){
  buildCity();createNPCs();createTraffic();createBicycles();collectiblesCreate();createPoliceAndHeli();createRobberyEvent();
  if(state.built)buildHouse();
  avatar.group.position.set(player.x,0,player.z);
  camera.position.set(player.x,8,player.z+15);
  renderHUD();
}
function renderHUD(){
  $('cash').textContent=state.cash.toLocaleString('de-DE')+' €';
  $('vehicle').textContent=player.car?'🚗 '+player.car.name:'🚶 Zu Fuß';
  $('speed').textContent=player.car?Math.round(Math.abs(player.car.speed)*3.6)+' km/h · ⛽ '+Math.round(player.car.fuel)+'%':'0 km/h';
  $('progress').textContent='🏁 '+state.wins+' Siege';
  document.body.classList.toggle('driving',!!player.car);
  if(race){
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
    inventory:state.inventory,built:state.built
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
  if(!playing)return;
  const counts=new Map();
  for(const item of state.inventory)counts.set(item,(counts.get(item)||0)+1);
  const lines=counts.size?[...counts].map(([item,count])=>item+' × '+count).join(' · '):'Du hast noch keine Sachen. Besuche den City Markt oder das Café.';
  openModal('🎒 Dein Inventar',lines+'\n\n'+(state.owned?'🚗 Fahrzeug: Veloce GT.':'🚶 Noch kein eigenes Auto.')+
    '\n💰 Guthaben: '+state.cash+' €',[
      {label:'🧃 Getränk verwenden',disabled:!state.inventory.includes('Getränk'),run:()=>useItem('Getränk')},
      {label:'🥪 Sandwich essen',disabled:!state.inventory.includes('Sandwich'),run:()=>useItem('Sandwich')},
      {label:'🍰 Kuchen essen',disabled:!state.inventory.includes('Kuchen'),run:()=>useItem('Kuchen')},
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
  if(showModal||!playing)return;
  if(player.car){setCar(null);return;}
  const car=nearestCar();
  if(car&&near(player,car,7)){
    if(!car.owned&&!car.loaner){toast('Dieses Fahrzeug ist noch nicht gekauft!');return;}
    setCar(car);
  }else toast('Gehe zuerst zu einem Auto! Der goldene Wagen ist frei.');
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
function interact(){
  if(!playing||showModal)return;
  if(nearPump()){openFuelMenu(player.car);return;}
  if(state.job&&near(player,targets[state.jobTarget],9)){finishJob();return;}
  const pick=collectibles.find(c=>!c.taken&&near(player,c,5.5));
  if(pick){pick.taken=true;pick.obj.visible=false;state.cash+=20;state.inventory.push('Fundmünze');toast('🪙 Münze eingesammelt · +20 €!');save();renderHUD();return;}
  if(!player.car){
    const s=shops.find(s=>Math.abs(player.x-s.x)<s.w/2+6&&player.z>s.front-8&&player.z<s.z+s.d/2+7);
    if(s){showShop(s);return;}
    if(near(player,{x:-27,z:21},13)){startJob();return;}
    if(near(player,{x:-157,z:-157},25)&&!state.built){
      openModal('🏠 Baugrundstück','Errichte auf diesem Bauplatz für 400 € dein erstes kleines Haus.',[
        {label:'Haus bauen · 400 €',primary:true,run:()=>spend(400,()=>{state.built=true;buildHouse();toast('🏠 Dein erstes Haus steht!')})}
      ]);return;
    }
  }else if(near(player,start,19)){startRace();return;}
  toast(player.car?'🏁 Fahre zum blauen Rennmarker oder steige aus!':'Betritt einen Laden oder folge dem gelben Jobmarker.');
}
function wallCollision(x,z,radius=.65,isVehicle=false){
  // Enlarged vehicle bounds: cars MUST stay outside every building including shop doors.
  if(Math.abs(x)>371-radius||Math.abs(z)>371-radius)return true;
  if(isVehicle)for(const o of obstacles){if(Math.hypot(x-o.x,z-o.z)<o.r+radius)return true;}
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
function jump(){if(player.car||!playing||showModal)return;if(player.y===0){player.vertical=9;toast('⬆ Spring! ',.8);}}
function updateCar(dt){
  const c=player.car;
  if(!c)return;
  let pedal=Math.max(0,input.forward);
  let brake=Math.max(0,-input.forward);
  if(input.gas)pedal=1;
  if(input.brake)brake=1;
  if(c.fuel<=0){pedal=0;if(Math.abs(c.speed)<.3)toast('⛽ Tank leer! Werkstatt aufsuchen.',1);}
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
    if(wallCollision(nx,nz,2.0,true)){hit=true;break;}
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
    const move=(!signalGreen(t.axis)&&nearSignal)?0:t.speed*dt;
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
    n.t+=n.dir*n.speed*dt;
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
  if(state.job && near(player,targets[state.jobTarget],7.5))finishJob();
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
  for(const s of shops){
    s.roof.visible=!(Math.abs(player.x-s.x)<s.w/2-1&&player.z>s.front&&player.z<s.z+s.d/2);
  }
}
function updateCamera(dt){
  const tgt=player.car?{x:player.car.x,y:1.4,z:player.car.z,yaw:player.cameraYaw}:
    {x:player.x,y:player.y+1.6,z:player.z,yaw:player.cameraYaw};
  const angle=tgt.yaw;
  if(firstPerson){
    const shift=player.car?1.0:0;
    const eye=new THREE.Vector3(tgt.x,tgt.y+shift,tgt.z);
    const ahead=new THREE.Vector3(tgt.x+Math.sin(angle)*20,tgt.y+shift-1+player.camPitch*13,tgt.z-Math.cos(angle)*20);
    camera.position.lerp(eye,Math.min(1,dt*16));
    camera.lookAt(ahead);
    avatar.group.visible=false;
  }else{
    avatar.group.visible=!player.car;
    const distance=player.car?13:10;
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
  if(nearPump())text=player.car?'⛽ ANHALTEN · E / AKTION: Tanken':'⛽ Tanken nur mit einem Fahrzeug';
  else if(state.job&&near(player,targets[state.jobTarget],13))text='📦 Ziel erreicht – Paket wird zugestellt';
  else if(player.car){
    if(near(player,start,22))text='🏁 E / Aktion: Rennen starten';
    else text='🚗 F / AUTO: Aussteigen · Lenken + Gas + Bremse';
  }else{
    const s=shops.find(s=>Math.abs(player.x-s.x)<s.w/2+6&&player.z>s.front-8&&player.z<s.z+s.d/2+7);
    const c=nearestCar();
    if(s)text='🚪 Durch die offene Tür gehen · E / Aktion: '+s.name;
    else if(near(player,prison,54))text='🚔 Stadtgefängnis: Hier werden festgenommene Räuber untergebracht';
    else if(collectibles.some(c=>!c.taken&&near(player,c,5.5)))text='🪙 E / AKTION: Gegenstand einsammeln';
    else if(near(player,{x:-27,z:21},14))text='📦 E / Aktion: Lieferjob annehmen';
    else if(c&&near(player,c,7))text='🚗 F / AUTO: '+(c.loaner?'Leihwagen fahren':'Einsteigen');
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
    if(player.car)updateCar(dt);else updateFoot(dt);
    updateNPCs(dt);updateTrafficLights();updateTraffic(dt);updateBicycles(dt);updatePoliceAndHeli(dt);updateCrime(dt);updateMission(dt);updateShopsRoof();
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
  $('btnSprint').addEventListener('pointerdown',e=>{e.preventDefault();touchSprint=true;});
  for(const event of ['pointerup','pointercancel','pointerleave'])$('btnSprint').addEventListener(event,()=>{touchSprint=false;});
  for(const [id,key] of [['btnGas','gas'],['btnBrake','brake']]){
    const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);input[key]=true;});
    for(const evt of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(evt,()=>{input[key]=false;});
  }
  $('closeModal').addEventListener('click',closeModal);
  $('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal();});
  $('help').addEventListener('click',()=>openModal('🎮 Steuerung & Ziele','iPad: linker Joystick bewegt den Menschen bzw. lenkt das Auto. Gas und Bremse im Auto rechts. Wische rechts über die Stadt, um dich umzusehen. PC: WASD, E Aktion, F Ein-/Aussteigen, V Perspektive, Leertaste springen, Shift sprinten, R Rennen am blauen Marker. Der goldene Wagen ist kostenlos geliehen. Jobs bringen 350 €, Rennen bis 650 €. Der rote Sportwagen kostet 950 €.',[{label:'Alles klar!',primary:true,run:()=>{}}]));
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
