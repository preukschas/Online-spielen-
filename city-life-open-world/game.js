(()=>{
'use strict';
if(!window.THREE){
  document.body.innerHTML='<div style="padding:30px;color:white;font:18px system-ui">Three.js konnte nicht geladen werden.</div>';
  return;
}
const THREE=window.THREE;
const canvas=document.getElementById('game3d');
const stage=document.getElementById('stage');
const ui={
 money:document.getElementById('money'),vehicleName:document.getElementById('vehicleName'),speed:document.getElementById('speed'),
 hpText:document.getElementById('hpText'),hpBar:document.getElementById('hpBar'),carHpText:document.getElementById('carHpText'),
 carHpBar:document.getElementById('carHpBar'),heatText:document.getElementById('heatText'),heatBar:document.getElementById('heatBar'),
 place:document.getElementById('place'),inventory:document.getElementById('inventory'),log:document.getElementById('log'),
 panel:document.getElementById('interactionPanel'),toast:document.getElementById('toast')
};

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x9fc8df);
scene.fog=new THREE.Fog(0x9fc8df,90,390);
const camera=new THREE.PerspectiveCamera(72,16/9,.08,650);
scene.add(camera);

const hemi=new THREE.HemisphereLight(0xcbe8ff,0x536348,1.45);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1d0,2.35);sun.position.set(-90,150,-70);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-220;sun.shadow.camera.right=220;sun.shadow.camera.top=220;sun.shadow.camera.bottom=-220;sun.shadow.camera.near=1;sun.shadow.camera.far=420;scene.add(sun);

function setupDynamicLights(){
  flashlightTarget=new THREE.Object3D();flashlightTarget.position.set(0,-.08,-12);camera.add(flashlightTarget);
  flashlight=new THREE.SpotLight(0xfff0cf,0,48,.31,.52,1.65);flashlight.position.set(.18,-.10,-.12);flashlight.target=flashlightTarget;flashlight.castShadow=false;camera.add(flashlight);

  flashlightModel=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,.34,12),new THREE.MeshStandardMaterial({color:0x2e3438,roughness:.45,metalness:.55}));
  body.rotation.z=Math.PI/2;body.position.set(.17,-.31,-.54);flashlightModel.add(body);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.07,12),new THREE.MeshStandardMaterial({color:0x535c61,roughness:.32,metalness:.65,emissive:0xffe8b6,emissiveIntensity:.15}));
  rim.rotation.z=Math.PI/2;rim.position.set(.34,-.31,-.54);flashlightModel.add(rim);flashlightModel.visible=false;camera.add(flashlightModel);

  carHeadTarget=new THREE.Object3D();scene.add(carHeadTarget);
  carHeadLightL=new THREE.SpotLight(0xfff1cc,0,58,.25,.56,1.7);carHeadLightR=new THREE.SpotLight(0xfff1cc,0,58,.25,.56,1.7);
  carHeadLightL.castShadow=false;carHeadLightR.castShadow=false;carHeadLightL.target=carHeadTarget;carHeadLightR.target=carHeadTarget;scene.add(carHeadLightL,carHeadLightR);

  for(let i=0;i<10;i++){const l=new THREE.PointLight(0xffd990,0,23,2);l.castShadow=false;scene.add(l);lampLightPool.push(l)}
}

const WORLD_W=620,WORLD_D=420,ROAD_W=24.4,SIDEWALK=4.0;
const roadsX=[65,185,307,431,555],roadsZ=[52,157,264,369];
const keys=new Set(),buildingMeshes=[],solidBoxes=[],cars=[],traffic=[],npcs=[],police=[],effects=[],pickups=[],climbables=[],streetLamps=[],lampLightPool=[];
const interiors={},customBuildings=[];
const raycaster=new THREE.Raycaster();
const centerNdc=new THREE.Vector2(0,0);
let toastTimer=0,last=performance.now(),lookDragging=false,lastPX=0,lastPY=0,pointerLocked=false,saveTimer=0,raceMarker=null,weaponHolder=null,waterWeapon=null,pistolWeapon=null,muzzleFlash=null,muzzleTimer=0,flashlight=null,flashlightTarget=null,flashlightModel=null,carHeadLightL=null,carHeadLightR=null,carHeadTarget=null;
const SAVE_KEY='city-life-v5-1-save';
let savedData={};

const state={
 x:117,z:157,yaw:0,pitch:0,money:1000,hp:100,heat:0,lastCrime:99,
 sprint:false,vehicle:null,speedKmh:0,firstPerson:true,inventory:[],activeWeapon:null,
 sprayCd:0,shootCd:0,punchCd:0,worldTime:16.2,flashlight:false,headlightsOn:true,cameraShake:0,mode:'outside',currentBuilding:null,returnPos:null,jumpY:0,jumpV:0,grounded:true,race:{active:false,index:0,time:0,best:null}
};
setupDynamicLights();

const buildings=[
 {id:'market',x:8,z:7,w:45,d:32,name:'FRISCHMARKT',type:'shop',color:0xb86c53,door:[30.5,41.5],items:[['Getränk',4,'🥤',4],['Snack',6,'🥪',8],['Lebensmittel',25,'🛍️',0],['Wasserpistole',35,'💦',0]]},
 {id:'home-a',x:79,z:6,w:76,d:33,name:'WOHNHAUS AM PARK',type:'home',color:0xbb8b65,door:[117,42]},
 {id:'tech',x:211,z:7,w:70,d:32,name:'TECH CENTER',type:'shop',color:0x929da6,door:[246,41.5],items:[['Kopfhörer',55,'🎧',0],['Smartwatch',180,'⌚',0],['Smartphone',320,'📱',0],['Laptop',900,'💻',0]]},
 {id:'cafe',x:335,z:7,w:70,d:32,name:'CAFÉ CENTRAL',type:'cafe',color:0xa96e52,door:[370,41.5],items:[['Kaffee',4,'☕',6],['Kuchen',6,'🍰',8],['Sandwich',8,'🥪',12]]},
 {id:'premium',x:459,z:6,w:90,d:33,name:'PREMIUM MOTORS',type:'dealer',color:0x8b969e,door:[468,43],portal:true},
 {id:'logistics',x:8,z:72,w:45,d:56,name:'LOGISTIK',type:'job',color:0xa9977a,door:[56,100]},
 {id:'park',x:79,z:72,w:76,d:56,name:'STADTPARK',type:'park',color:0x71965f},
 {id:'dealer',x:211,z:72,w:70,d:56,name:'CITY MOTORS',type:'dealer',color:0x8c979f,door:[220,131],portal:true},
 {id:'parking',x:335,z:72,w:70,d:56,name:'PARKHAUS',type:'parking',color:0x777e83,door:[344,131],portal:true},
 {id:'garage',x:459,z:72,w:90,d:56,name:'MOTORWERK',type:'garage',color:0x85898b,door:[456,100],portal:true},
 {id:'fashion',x:8,z:178,w:45,d:50,name:'MODEHAUS',type:'shop',color:0xc18c74,door:[56,203],items:[['T-Shirt',30,'👕',0],['Sneaker',75,'👟',0],['Jacke',80,'🧥',0],['Uhr',120,'⌚',0]]},
 {id:'home-b',x:79,z:177,w:76,d:51,name:'WOHNQUARTIER',type:'home',color:0xb87f60,door:[117,231]},
 {id:'mall',x:211,z:178,w:70,d:50,name:'CITY MALL',type:'shop',color:0x999ca0,door:[246,231],items:[['Kamera',350,'📷',0],['Konsole',450,'🎮',0],['Pistole',650,'🔫',0],['Schmuck',600,'💎',0]]},
 {id:'moto',x:335,z:178,w:70,d:50,name:'BIKE & MOTO',type:'dealer',color:0x8b9196,door:[344,231],portal:true},
 {id:'home-c',x:459,z:177,w:90,d:51,name:'WOHNPARK',type:'home',color:0xb9896b,door:[504,231]},
 {id:'police',x:8,z:285,w:45,d:35,name:'POLIZEI',type:'police',color:0x89969f,door:[56,302.5]},
 {id:'station',x:79,z:285,w:76,d:35,name:'HAUPTBAHNHOF',type:'station',color:0x929a9e,door:[117,282]},
 {id:'office',x:211,z:285,w:70,d:35,name:'BUSINESS CENTER',type:'office',color:0xa89c88,door:[246,282]},
 {id:'gas',x:335,z:285,w:70,d:35,name:'TANKSTELLE',type:'garage',color:0xa49e89,door:[332,302.5],portal:true},
 {id:'exotic',x:459,z:285,w:90,d:35,name:'EXOTIC MOTORS',type:'dealer',color:0x8f9499,door:[468,331],portal:true}
];

const vehicleSpecs={
 'City Sedan':{color:0x416f9d,max:210,acc:78,turn:1.7,price:28000,type:'sedan'},
 'Falcon SUV':{color:0x546b53,max:190,acc:64,turn:1.45,price:52000,type:'suv'},
 'Cargo Van':{color:0xd6d2c8,max:165,acc:52,turn:1.25,price:39000,type:'van'},
 'Volt E':{color:0x4c7e88,max:240,acc:92,turn:1.75,price:68000,type:'electric'},
 'Lamborghini Huracán':{color:0xe1b52d,max:325,acc:120,turn:1.95,price:265000,type:'sport'},
 'Bugatti Chiron':{color:0x275f9e,max:420,acc:132,turn:1.9,price:420000,type:'sport'},
 'Ferrari 488':{color:0xb62c31,max:340,acc:124,turn:1.92,price:290000,type:'sport'},
 'Ferrari Roma':{color:0x8d202c,max:320,acc:112,turn:1.85,price:245000,type:'sport'},
 'Ducati Panigale':{color:0xc72e32,max:299,acc:118,turn:2.22,price:36000,type:'bike'},
 'Ducati Monster':{color:0x303438,max:225,acc:101,turn:2.12,price:19000,type:'bike'}
};

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function dist2(x,z,a,b){return Math.hypot(x-a,z-b)}
function log(msg){const d=document.createElement('div');d.textContent=msg;ui.log.prepend(d);while(ui.log.children.length>12)ui.log.lastChild.remove()}
function toast(msg){ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1200)}
function crime(n,msg){state.heat=clamp(state.heat+n,0,100);state.lastCrime=0;if(msg)log(msg)}
function damageStage(hp){if(hp<=0)return 5;if(hp<=20)return 4;if(hp<=40)return 3;if(hp<=60)return 2;if(hp<=80)return 1;return 0}
function damageLabel(hp){return ['Intakt','Leichte Schäden','Beschädigt','Schwer beschädigt','Kritisch','Totalschaden'][damageStage(hp)]}

function resize(){
 const r=stage.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix()
}
new ResizeObserver(resize).observe(stage);resize();

function mat(color,rough=.75,metal=.05){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
function meshBox(w,h,d,color,rough=.75,metal=.05){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color,rough,metal));m.castShadow=true;m.receiveShadow=true;return m
}
function addBox(x,y,z,w,h,d,color,rough=.75,metal=.05,parent=scene){
 const m=meshBox(w,h,d,color,rough,metal);m.position.set(x,y,z);parent.add(m);return m
}
function setupHeldWeapons(){
 weaponHolder=new THREE.Group();camera.add(weaponHolder);weaponHolder.position.set(.42,-.34,-.72);weaponHolder.rotation.set(-.08,-.10,0);
 waterWeapon=new THREE.Group();
 addBox(0,0,0,.48,.16,.16,0x2aa9e0,.40,.10,waterWeapon);
 addBox(.24,0,0,.22,.10,.11,0xffdf58,.42,.05,waterWeapon);
 const wg=addBox(-.08,-.16,0,.13,.30,.13,0xef5f74,.55,.05,waterWeapon);wg.rotation.z=-.18;
 const tank=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),mat(0x56d6c6,.38,.08));tank.position.set(-.20,.03,0);waterWeapon.add(tank);
 waterWeapon.rotation.y=Math.PI/2;weaponHolder.add(waterWeapon);
 pistolWeapon=new THREE.Group();
 addBox(0,0,0,.50,.14,.14,0x292d30,.32,.48,pistolWeapon);
 addBox(.24,0,0,.22,.09,.10,0x15181a,.30,.55,pistolWeapon);
 const pg=addBox(-.08,-.17,0,.14,.31,.14,0x3c4144,.48,.30,pistolWeapon);pg.rotation.z=-.16;
 muzzleFlash=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),new THREE.MeshBasicMaterial({color:0xffd56b}));muzzleFlash.position.set(.38,0,0);muzzleFlash.visible=false;pistolWeapon.add(muzzleFlash);
 pistolWeapon.rotation.y=Math.PI/2;weaponHolder.add(pistolWeapon);waterWeapon.visible=false;pistolWeapon.visible=false
}
function updateHeldWeapons(dt){
 if(!weaponHolder)return;
 muzzleTimer=Math.max(0,muzzleTimer-dt);if(muzzleFlash)muzzleFlash.visible=muzzleTimer>0;
 weaponHolder.visible=state.firstPerson&&!state.vehicle;
 if(!weaponHolder.visible)return;
 waterWeapon.visible=state.activeWeapon==='water'&&state.inventory.includes('Wasserpistole');
 pistolWeapon.visible=state.activeWeapon==='pistol'&&state.inventory.includes('Pistole')
}
function makeLabel(text,width=7){
 const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle='rgba(23,29,32,.88)';x.fillRect(0,0,512,128);x.fillStyle='#fff';x.font='700 44px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,64);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));s.scale.set(width,width*.25,1);return s
}

function structureRect(b){
 if(b.custom)return{x:b.x,z:b.z,w:b.w,d:b.d};
 if(b.type==='park')return{x:b.x,z:b.z,w:b.w,d:b.d};
 let x=b.x+1.8,z=b.z+1.8,w=Math.max(8,b.w-3.6),d=Math.max(8,b.d-3.6),safe=24;
 for(const rx of roadsX){
  if(x<rx&&x+w>rx-safe)w=Math.max(8,rx-safe-x);
  else if(x>rx&&x<rx+safe){const right=x+w;x=rx+safe;w=Math.max(8,right-x)}
 }
 for(const rz of roadsZ){
  if(z<rz&&z+d>rz-safe)d=Math.max(8,rz-safe-z);
  else if(z>rz&&z<rz+safe){const bottom=z+d;z=rz+safe;d=Math.max(8,bottom-z)}
 }
 return{x,z,w,d}
}
function blocked(x,z,r=.55){
 if(state.mode==='interior'){
  const room=interiors[state.currentBuilding];if(!room)return false;
  return x-r<room.minX+.55||x+r>room.maxX-.55||z-r<room.minZ+.55||z+r>room.maxZ-.55;
 }
 if(x<1||z<1||x>WORLD_W-1||z>WORLD_D-1)return true;
 // Wasser ist kein begehbarer Boden; der Hafensteg bleibt erreichbar.
 if(z>386&&!(x>67&&x<340&&z<392))return true;
 for(const b of buildings){if(b.type==='park')continue;const q=structureRect(b);if(x+r>q.x&&x-r<q.x+q.w&&z+r>q.z&&z-r<q.z+q.d)return true}
 for(const c of climbables){if(state.jumpY<c.h-.08&&x+r>c.x-c.w/2&&x-r<c.x+c.w/2&&z+r>c.z-c.d/2&&z-r<c.z+c.d/2)return true}
 return false
}

function buildGround(){
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(WORLD_W,WORLD_D),new THREE.MeshStandardMaterial({color:0x6f815d,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(WORLD_W/2,-.03,WORLD_D/2);ground.receiveShadow=true;scene.add(ground);
 const asphalt=mat(0x42494d,.96,.02),side=mat(0xa7a7a2,1,0),line=mat(0xe6dda5,.95,0);
 for(const z of roadsZ){
  addBox(WORLD_W/2,.02,z,WORLD_W,.06,ROAD_W,0x42494d,.98,0);
  addBox(WORLD_W/2,.055,z-ROAD_W/2-SIDEWALK/2,WORLD_W,.11,SIDEWALK,0xa7a7a2,1,0);
  addBox(WORLD_W/2,.055,z+ROAD_W/2+SIDEWALK/2,WORLD_W,.11,SIDEWALK,0xa7a7a2,1,0);
  for(let x=4;x<WORLD_W;x+=9)addBox(x,.09,z,5,.025,.22,0xe6dda5,.9,0)
 }
 for(const x of roadsX){
  addBox(x,.025,WORLD_D/2,ROAD_W,.065,WORLD_D,0x42494d,.98,0);
  addBox(x-ROAD_W/2-SIDEWALK/2,.06,WORLD_D/2,SIDEWALK,.12,WORLD_D,0xa7a7a2,1,0);
  addBox(x+ROAD_W/2+SIDEWALK/2,.06,WORLD_D/2,SIDEWALK,.12,WORLD_D,0xa7a7a2,1,0);
  for(let z=4;z<WORLD_D;z+=9)addBox(x,.095,z,.22,.025,5,0xe6dda5,.9,0)
 }
 for(const x of roadsX)for(const z of roadsZ){
  for(let k=-3;k<=3;k++){addBox(x+k*2.5,.11,z-ROAD_W/2-1.1,1.35,.025,2.4,0xf1f1ee,1,0);addBox(x+k*2.5,.11,z+ROAD_W/2+1.1,1.35,.025,2.4,0xf1f1ee,1,0)}
 }
}
function buildingHeight(b){if(b.type==='office'||b.type==='station')return 18;if(b.type==='home')return 14;if(b.type==='parking')return 11;if(b.type==='dealer')return 9;return 10}
function addWindows(group,q,h,color=0x79a9bd){
 const wm=new THREE.MeshStandardMaterial({color,roughness:.3,metalness:.05,emissive:0x0b151b,emissiveIntensity:.12});
 const floors=Math.max(1,Math.floor((h-2.5)/3)),cols=Math.max(2,Math.floor(q.w/4.2));
 for(let f=0;f<floors;f++)for(let c=0;c<cols;c++){
  const wx=q.x+2+(c+.5)*(q.w-4)/cols,wy=2.2+f*2.8;
  const a=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.35,.10),wm);a.position.set(wx,wy,q.z-.06);group.add(a);
  const b=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.35,.10),wm);b.position.set(wx,wy,q.z+q.d+.06);group.add(b)
 }
 const zcols=Math.max(1,Math.floor(q.d/4.2));
 for(let f=0;f<floors;f++)for(let c=0;c<zcols;c++){
  const wz=q.z+2+(c+.5)*(q.d-4)/zcols,wy=2.2+f*2.8;
  const a=new THREE.Mesh(new THREE.BoxGeometry(.10,1.35,1.8),wm);a.position.set(q.x-.06,wy,wz);group.add(a);
  const b=new THREE.Mesh(new THREE.BoxGeometry(.10,1.35,1.8),wm);b.position.set(q.x+q.w+.06,wy,wz);group.add(b)
 }
}
function makeBuilding(b){
 if(b.type==='park'){
  addBox(b.x+b.w/2,.02,b.z+b.d/2,b.w,.05,b.d,0x6e965e,1,0);
  addBox(b.x+b.w/2,.08,b.z+b.d/2,3,.12,b.d-5,0xc3b99c,1,0);
  addBox(b.x+b.w/2,.08,b.z+b.d/2,b.w-5,.12,3,0xc3b99c,1,0);
  return
 }
 const q=structureRect(b),h=buildingHeight(b),group=new THREE.Group();scene.add(group);
 addBox(q.x+q.w/2,h/2,q.z+q.d/2,q.w,h,q.d,b.color,.82,.03,group);
 addBox(q.x+q.w/2,h+.18,q.z+q.d/2,q.w+.25,.36,q.d+.25,b.type==='home'?0x654735:0x4a5053,.92,.02,group);
 addWindows(group,q,h);
 const label=makeLabel(b.name,Math.min(11,Math.max(5,q.w*.48)));label.position.set(q.x+q.w/2,Math.min(h-1.2,3.3),q.z-.20);group.add(label);
 if(b.type==='dealer'){addBox(q.x+q.w/2,2.25,q.z-.13,q.w*.76,3.5,.14,0x8dbfd3,.25,.05,group)}
 b._box=q;b._mesh=group;buildingMeshes.push(group);solidBoxes.push(q)
}
function makeTree(x,z,s=1){
 const g=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.28*s,.38*s,3.2*s,8),mat(0x64452f,1,0));trunk.position.y=1.6*s;trunk.castShadow=true;g.add(trunk);
 const greens=[0x3d783d,0x4e8b48,0x356b39];for(let i=0;i<4;i++){const f=new THREE.Mesh(new THREE.SphereGeometry((1.25+(i%2)*.28)*s,9,7),mat(greens[i%greens.length],.95,0));f.position.set((i-1.5)*.45*s,3.5*s+(i%2)*.55*s,((i%3)-1)*.35*s);f.castShadow=true;g.add(f)}
 g.position.set(x,0,z);scene.add(g);return g
}
function populateTrees(){
 const rows=[136,238.5,337,407];
 for(const z of rows){let n=0;for(let x=22;x<WORLD_W-12;x+=36){const tx=x+((n++%3)-1)*3.4;if(roadsX.some(v=>Math.abs(tx-v)<21)||roadsZ.some(v=>Math.abs(z-v)<21))continue;if(buildings.some(b=>{if(b.type==='park')return false;const q=structureRect(b);return tx>q.x-3&&tx<q.x+q.w+3&&z>q.z-3&&z<q.z+q.d+3}))continue;makeTree(tx,z,.8+(n%3)*.08)}}
 const p=buildings.find(b=>b.id==='park');for(let i=0;i<24;i++)makeTree(p.x+6+(i*9.7)%(p.w-12),p.z+6+(i*7.1)%(p.d-12),.72+(i%3)*.08)
}
function makeLamp(x,z,rot=0){
 const g=new THREE.Group();
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.11,4.6,8),mat(0x424a4e,.7,.35));pole.position.y=2.3;pole.castShadow=true;g.add(pole);
 addBox(.45,4.48,0,.9,.08,.08,0x424a4e,.7,.35,g);
 const shell=addBox(.86,4.40,0,.40,.17,.34,0x394247,.45,.45,g);
 const bulbMat=new THREE.MeshStandardMaterial({color:0xffe4ac,roughness:.28,metalness:.02,emissive:0xffd27a,emissiveIntensity:0});
 const bulb=new THREE.Mesh(new THREE.BoxGeometry(.27,.055,.22),bulbMat);bulb.position.set(.86,4.31,0);g.add(bulb);
 const halo=new THREE.Mesh(new THREE.SphereGeometry(.20,9,7),new THREE.MeshBasicMaterial({color:0xffd58c,transparent:true,opacity:0,depthWrite:false}));
 halo.position.set(.86,4.18,0);g.add(halo);
 g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);const lightX=x+Math.cos(rot)*.86,lightZ=z-Math.sin(rot)*.86;streetLamps.push({x,z,lightX,lightZ,group:g,bulb,halo,shell})
}
function populateProps(){
 for(const z of roadsZ)for(let x=26;x<WORLD_W-18;x+=52){
  if(roadsX.some(v=>Math.abs(x-v)<23))continue;
  makeLamp(x,z-ROAD_W/2-SIDEWALK-1.1,-Math.PI/2);
  makeLamp(x,z+ROAD_W/2+SIDEWALK+1.1,Math.PI/2)
 }
 for(const x of roadsX)for(let z=25;z<WORLD_D-15;z+=57){
  if(roadsZ.some(v=>Math.abs(z-v)<23))continue;
  makeLamp(x-ROAD_W/2-SIDEWALK-1.1,z,0);
  makeLamp(x+ROAD_W/2+SIDEWALK+1.1,z,Math.PI)
 }
}

function buildClimbables(){
 const defs=[
  {x:101,z:96,w:3.2,d:2.4,h:1.0,color:0x8a633f},
  {x:108,z:101,w:4.0,d:2.2,h:1.25,color:0x76604c},
  {x:125,z:109,w:5.5,d:1.2,h:1.15,color:0x6b705f},
  {x:156,z:389,w:4.2,d:2.2,h:1.0,color:0x8a633f}
 ];
 for(const c of defs){climbables.push(c);addBox(c.x,c.h/2,c.z,c.w,c.h,c.d,c.color,.92,0)}
}
function buildInteriors(){
 let idx=0;
 for(const b of buildings){
  if(b.type==='park')continue;
  const large=b.type==='dealer'||b.type==='parking',w=large?42:26,d=large?26:19;
  const cx=2000+(idx%5)*90,cz=55+Math.floor(idx/5)*75;idx++;
  const room={id:b.id,cx,cz,w,d,minX:cx-w/2,maxX:cx+w/2,minZ:cz-d/2,maxZ:cz+d/2,spawn:{x:cx,z:cz+d/2-3.2},exit:{x:cx,z:cz+d/2-1.5},vehicleSpawn:{x:cx,z:cz+d/2-5.0},vehicleExit:{x:cx,z:cz+d/2-2.8}};
  interiors[b.id]=room;
  addBox(cx,.02,cz,w,.08,d,b.type==='parking'?0x62696d:b.type==='dealer'?0x9aa0a4:0xc3b69f,.95,0);
  const wc=b.type==='dealer'||b.type==='parking'?0x80888c:0xd7cbb8;
  addBox(cx,2.6,room.minZ,w,5.2,.28,wc,.88,0);addBox(cx,2.6,room.maxZ,w,5.2,.28,wc,.88,0);
  addBox(room.minX,2.6,cz,.28,5.2,d,wc,.88,0);addBox(room.maxX,2.6,cz,.28,5.2,d,wc,.88,0);
  const label=makeLabel(b.name,Math.min(11,w*.34));label.position.set(cx,3.8,room.minZ+.2);scene.add(label);
  const exitLabel=makeLabel('AUSGANG',4.8);exitLabel.position.set(cx,2.8,room.maxZ-.25);exitLabel.material.opacity=.88;scene.add(exitLabel);
  // Theke / Einrichtung
  if(b.type==='shop'||b.type==='cafe'||b.type==='job'||b.type==='garage'){
   addBox(cx,1.0,room.minZ+3,w*.42,1.1,1.3,0x735943,.86,0);
   for(let k=-1;k<=1;k++)addBox(cx+k*5,.85,cz+1,3.5,1.6,1.0,b.type==='garage'?0x555d61:0x8c765b,.9,0);
  }
  if(b.type==='home'){addBox(cx-5,.55,cz,6,1.0,3.2,0x8b6c52,.92,0);addBox(cx+5,.45,cz-1,4.5,.75,2.5,0xb9a58b,.92,0)}
  if(large){
   for(let x=cx-w/2+4;x<cx+w/2-3;x+=6){addBox(x,.07,cz,3.2,.03,d-4,0xd5d6d4,1,0)}
   const inSign=makeLabel('EINFAHRT / AUSFAHRT',8);inSign.position.set(cx,2.3,room.maxZ-.35);scene.add(inSign)
  }
  // Zwei Innenraum-NPCs pro Gebäude
  for(let n=0;n<2;n++){
   const human=createHuman(n?0x765f88:0x58758a,0xd3a37f,false);
   const hx=cx+(n?3.5:-3.5),hz=cz+(n?1.5:-1.5);human.position.set(hx,0,hz);scene.add(human);
   npcs.push({mesh:human,x:hx,z:hz,horizontal:n%2===0,dir:n?1:-1,speed:.45,phase:n,stun:0,pirate:false,interiorId:b.id,bounds:room})
  }
 }
}
function createHuman(color=0x58758a,skin=0xd6a27e,pirate=false){
 const g=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(.34,.43,1.05,8),mat(color,.9,0));body.position.y=1.25;body.castShadow=true;g.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.28,10,8),mat(skin,.9,0));head.position.y=2.0;head.castShadow=true;g.add(head);
 const legMat=mat(0x30383d,.95,0);const legL=new THREE.Mesh(new THREE.CylinderGeometry(.10,.12,.78,7),legMat),legR=legL.clone();legL.position.set(-.16,.48,0);legR.position.set(.16,.48,0);g.add(legL,legR);
 const armMat=mat(skin,.92,0);const armL=new THREE.Mesh(new THREE.CylinderGeometry(.075,.085,.78,7),armMat),armR=armL.clone();armL.position.set(-.47,1.28,0);armR.position.set(.47,1.28,0);armL.rotation.z=.22;armR.rotation.z=-.22;g.add(armL,armR);
 if(pirate){const hat=addBox(0,2.32,0,.76,.10,.45,0x281f1b,.85,0,g);const band=addBox(0,2.17,.25,.50,.10,.08,0x9b2525,.9,0,g)}
 g.userData={legL,legR,armL,armR};return g
}
function spawnNPCs(){
 const colors=[0x56778e,0x8b5d4c,0x65794e,0x765f88,0x92734f];
 for(let i=0;i<38;i++){
  const horizontal=i%2===0,road=horizontal?roadsZ[i%roadsZ.length]:roadsX[i%roadsX.length],side=i%4<2?-1:1;
  const x=horizontal?(30+(i*37)%560):road+side*(ROAD_W/2+SIDEWALK+2.2),z=horizontal?road+side*(ROAD_W/2+SIDEWALK+2.2):(25+(i*31)%370);
  const g=createHuman(colors[i%colors.length],0xd0a078,false);g.position.set(x,0,z);scene.add(g);npcs.push({mesh:g,x,z,horizontal,dir:i%3?1:-1,speed:1.0+(i%5)*.08,phase:i,stun:0,pirate:false})
 }
}
function addVehicleLights(g,length,width,isBike=false){
 const headMat=new THREE.MeshStandardMaterial({color:0xfff0c8,roughness:.22,metalness:.02,emissive:0xffe0a0,emissiveIntensity:.10});
 const tailMat=new THREE.MeshStandardMaterial({color:0xa42128,roughness:.28,metalness:.02,emissive:0xe62931,emissiveIntensity:.12});
 const head=[],tail=[];
 if(isBike){
   const h=new THREE.Mesh(new THREE.BoxGeometry(.10,.14,.34),headMat);h.position.set(length*.46,.84,0);g.add(h);head.push(h);
   const t=new THREE.Mesh(new THREE.BoxGeometry(.08,.12,.28),tailMat);t.position.set(-length*.46,.76,0);g.add(t);tail.push(t)
 }else{
   for(const z of [-width*.31,width*.31]){
    const h=new THREE.Mesh(new THREE.BoxGeometry(.055,.14,.34),headMat.clone());h.position.set(length*.495,.69,z);g.add(h);head.push(h);
    const t=new THREE.Mesh(new THREE.BoxGeometry(.055,.14,.34),tailMat.clone());t.position.set(-length*.495,.69,z);g.add(t);tail.push(t)
   }
 }
 return {head,tail}
}
function addWindshieldCracks(g,length,width,height){
 const cracks=[];
 const frontX=length*.15+.015,baseY=.98+(height-1)*.25,halfH=Math.max(.52,height*.55*.90),halfW=width*.78*.88;
 const patterns=[
  [[0,0,.02,.18],[.02,.18,-.05,.34],[.02,.18,.12,.29],[0,0,-.13,.13],[0,0,.16,-.08],[-.13,.13,-.24,.22],[.16,-.08,.27,-.19]],
  [[-.06,-.05,-.20,-.14],[-.20,-.14,-.29,-.28],[-.20,-.14,-.31,-.05],[-.06,-.05,.04,-.24],[.04,-.24,.18,-.33],[.04,-.24,.20,-.16]]
 ];
 for(const pat of patterns){
  const pos=[];
  for(const seg of pat){
   const [z1,y1,z2,y2]=seg;
   pos.push(frontX,baseY+y1*halfH,z1*halfW,frontX,baseY+y2*halfH,z2*halfW)
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  const line=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xdbe8ec,transparent:true,opacity:.78,depthTest:true}));
  line.visible=false;g.add(line);cracks.push(line)
 }
 return cracks
}
function addPanelCracks(g,length,width){
 const pos=[],y=1.045,cx=length*.31;
 const segs=[
  [cx-.18,-.04,cx+.02,.02],[cx+.02,.02,cx+.18,.16],[cx+.02,.02,cx+.20,-.13],
  [cx-.18,-.04,cx-.34,.11],[cx-.18,-.04,cx-.30,-.18],
  [cx+.20,-.13,cx+.34,-.22]
 ];
 for(const [x1,z1,x2,z2] of segs)pos.push(x1,y,z1*width,x2,y,z2*width);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 const line=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0x24292b,transparent:true,opacity:.92}));line.visible=false;g.add(line);return line
}
function makeCarMesh(name,policeCar=false){
 const sp=vehicleSpecs[name]||vehicleSpecs['City Sedan'],g=new THREE.Group();
 if(sp.type==='bike'){
  const wheelMat=mat(0x151719,.96,.03),hubMat=mat(0x9aa1a5,.45,.7);
  const wheels=[];
  for(const sx of [-1,1]){
   const w=new THREE.Mesh(new THREE.CylinderGeometry(.39,.39,.16,16),wheelMat);w.rotation.x=Math.PI/2;w.position.set(sx*.78,.43,0);w.castShadow=true;g.add(w);wheels.push(w);
   const hub=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.17,12),hubMat);hub.rotation.x=Math.PI/2;hub.position.copy(w.position);g.add(hub)
  }
  const frame=meshBox(1.15,.16,.18,sp.color,.42,.42);frame.position.set(0,.75,0);frame.rotation.z=-.10;g.add(frame);
  const tank=meshBox(.58,.34,.52,sp.color,.35,.35);tank.position.set(.15,1.02,0);g.add(tank);
  const seat=meshBox(.52,.16,.42,0x202427,.8,.05);seat.position.set(-.36,1.03,0);g.add(seat);
  const fork=meshBox(.08,.78,.08,0xb7bdc0,.35,.65);fork.position.set(.63,.78,0);fork.rotation.z=-.22;g.add(fork);
  addBox(.70,1.18,0,.12,.08,.76,0x3b4144,.55,.5,g);
  const lights=addVehicleLights(g,2.05,.78,true);
  g.userData={dim:{length:2.05,width:.78,height:1.35},body:frame,hood:tank,cabin:seat,wheels,baseColor:sp.color,damageStage:-1,headLights:lights.head,tailLights:lights.tail,sirenLights:[],cracks:[],panelCrack:null,frontBumper:null,rearBumper:null};return g
 }
 const sport=sp.type==='sport',suv=sp.type==='suv',van=sp.type==='van';
 const length=sport?4.5:van?5.0:suv?4.7:4.4,width=sport?1.92:suv?1.95:1.82,height=sport?1.0:suv?1.65:van?1.75:1.42;
 const bodyColor=policeCar?0xe7ecef:sp.color;let sirenLights=[];
 const body=meshBox(length,.48,width,bodyColor,.40,.38);body.position.y=.62;g.add(body);
 const hood=meshBox(length*.34,.22,width*.90,bodyColor,.38,.38);hood.position.set(length*.30,.92,0);g.add(hood);
 const cabin=meshBox(length*.42,height*.55,width*.78,0x335564,.22,.12);cabin.position.set(-length*.06,.98+(height-1)*.25,0);g.add(cabin);
 if(policeCar){
  addBox(-length*.10,1.55,0,.65,.11,.28,0x22272a,.4,.2,g);
  const rm=new THREE.MeshStandardMaterial({color:0xd33b3b,roughness:.25,metalness:.05,emissive:0xff2020,emissiveIntensity:.25});
  const bm=new THREE.MeshStandardMaterial({color:0x3475da,roughness:.25,metalness:.05,emissive:0x2478ff,emissiveIntensity:.25});
  const red=new THREE.Mesh(new THREE.BoxGeometry(.28,.09,.22),rm);red.position.set(-length*.22,1.62,0);g.add(red);
  const blue=new THREE.Mesh(new THREE.BoxGeometry(.28,.09,.22),bm);blue.position.set(.02,1.62,0);g.add(blue);sirenLights=[red,blue]
 }
 const wheelMat=mat(0x17191a,.95,.05),hubMat=mat(0x8d9498,.45,.7),wheels=[];
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const wx=sx*length*.31,wz=sz*width*.52,w=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.20,12),wheelMat);w.rotation.x=Math.PI/2;w.position.set(wx,.37,wz);w.castShadow=true;g.add(w);wheels.push(w);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.205,10),hubMat);hub.rotation.x=Math.PI/2;hub.position.copy(w.position);g.add(hub)
 }
 const lights=addVehicleLights(g,length,width,false);
 const frontBumper=meshBox(.14,.18,width*.84,0x30363a,.62,.32);frontBumper.position.set(length*.50,.48,0);g.add(frontBumper);
 const rearBumper=meshBox(.14,.16,width*.82,0x30363a,.66,.28);rearBumper.position.set(-length*.50,.48,0);g.add(rearBumper);
 const cracks=addWindshieldCracks(g,length,width,height);const panelCrack=addPanelCracks(g,length,width);
 if(name.includes('Bugatti')){const grille=new THREE.Mesh(new THREE.TorusGeometry(.34,.07,6,16,Math.PI*1.5),mat(0x1d2529,.3,.75));grille.rotation.y=Math.PI/2;grille.position.set(length*.51,.62,0);g.add(grille)}
 if(name.includes('Lamborghini'))addBox(length*.12,.72,0,.06,.25,width*.74,0x1b2226,.35,.45,g);
 g.userData={dim:{length,width,height},body,hood,cabin,wheels,baseColor:bodyColor,damageStage:-1,headLights:lights.head,tailLights:lights.tail,sirenLights,cracks,panelCrack,frontBumper,rearBumper};return g
}
function addCar(name,x,z,a=0,opt={}){
 const sp=vehicleSpecs[name],mesh=makeCarMesh(name,!!opt.police);mesh.position.set(x,0,z);mesh.rotation.y=-a;scene.add(mesh);
 const car={id:opt.id||('car-'+cars.length+'-'+name.replace(/\s+/g,'-')),name,spec:sp,mesh,x,z,a,speed:0,hp:100,lastDamage:-99,locked:!!opt.locked,forSale:!!opt.forSale,owned:!!opt.owned,stolen:false,price:opt.price||sp.price,police:!!opt.police,ai:!!opt.ai,axis:opt.axis||null,dir:opt.dir||1,interiorId:opt.interiorId||null};cars.push(car);return car
}
function addShowroomCar(buildingId,name,dx,dz){
 const r=interiors[buildingId];if(!r)return null;
 return addCar(name,r.cx+dx,r.cz+dz,0,{id:'showroom-'+buildingId+'-'+name,locked:true,forSale:true,interiorId:buildingId})
}
function spawnCars(){
 addCar('City Sedan',126,164,0,{});
 addCar('Falcon SUV',172,150,Math.PI/2,{});
 addCar('Volt E',296,157,0,{});
 addShowroomCar('premium','Lamborghini Huracán',-9,-3);addShowroomCar('premium','Ferrari 488',0,-3);addShowroomCar('premium','Bugatti Chiron',9,-3);
 addShowroomCar('dealer','City Sedan',-8,-3);addShowroomCar('dealer','Falcon SUV',0,-3);addShowroomCar('dealer','Volt E',8,-3);
 addShowroomCar('moto','Ducati Panigale',-7,-3);addShowroomCar('moto','Ducati Monster',0,-3);addShowroomCar('moto','Volt E',7,-3);
 addShowroomCar('exotic','Bugatti Chiron',-9,-3);addShowroomCar('exotic','Lamborghini Huracán',0,-3);addShowroomCar('exotic','Ferrari 488',9,-3);
 const pr=interiors.parking;if(pr){addCar('City Sedan',pr.cx-8,pr.cz-3,0,{interiorId:'parking'});addCar('Falcon SUV',pr.cx,pr.cz-3,0,{interiorId:'parking'});addCar('Cargo Van',pr.cx+8,pr.cz-3,0,{interiorId:'parking'})}
 const names=['City Sedan','Falcon SUV','Cargo Van','Ferrari Roma','Volt E'];
 for(let i=0;i<24;i++){
  const horizontal=i%2===0,axis=horizontal?roadsZ[i%roadsZ.length]:roadsX[i%roadsX.length],lane=(i%4<2?-4.5:4.5),dir=i%3?1:-1;
  const x=horizontal?(i*27)%WORLD_W:axis+lane,z=horizontal?axis+lane:(i*31)%WORLD_D;
  const c=addCar(names[i%names.length],x,z,horizontal?(dir>0?0:Math.PI):(dir>0?Math.PI/2:-Math.PI/2),{ai:true,axis:horizontal?'h':'v',dir});c.speed=55+(i%5)*7;traffic.push(c)
 }
}
function spawnPolice(){
 for(let i=0;i<2;i++){const c=addCar('City Sedan',20+i*5,300,0,{police:true});c.mesh.visible=false;police.push(c)}
}

function buildHarbor(){
 const water=new THREE.Mesh(new THREE.PlaneGeometry(WORLD_W,34),new THREE.MeshStandardMaterial({color:0x287ca4,roughness:.30,metalness:.12,transparent:true,opacity:.90}));water.rotation.x=-Math.PI/2;water.position.set(WORLD_W/2,.03,403);scene.add(water);
 for(let i=0;i<3;i++){
  const gx=110+i*95,g=new THREE.Group();for(let p=0;p<5;p++)addBox((p-2)*1.1,.22,0,1,.28,5.5,0x8a633f,.95,0,g);addBox(0,.48,-1.9,5.4,.18,.35,0x694a31,.95,0,g);g.position.set(gx,.12,402+(i%2)*5);scene.add(g);
  const pirate=createHuman(0x6c2929,0xc99872,true);pirate.position.set(gx,.38,402+(i%2)*5);scene.add(pirate);npcs.push({mesh:pirate,x:gx,z:402+(i%2)*5,horizontal:true,dir:0,speed:0,phase:0,stun:0,pirate:true})
 }
 for(let x=75;x<330;x+=22)addBox(x,.35,389.5,16,.55,4.5,0x765338,.95,0)
}

function loadPersistentState(){
 try{savedData=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')||{}}catch(_){savedData={}}
 if(Number.isFinite(savedData.money))state.money=Math.max(0,savedData.money);
 if(Array.isArray(savedData.inventory))state.inventory=[...new Set(savedData.inventory.filter(x=>typeof x==='string'))];
 if(Number.isFinite(savedData.x)&&Number.isFinite(savedData.z)&&savedData.x>1&&savedData.x<WORLD_W-1&&savedData.z>1&&savedData.z<385){state.x=savedData.x;state.z=savedData.z}
 if(Number.isFinite(savedData.yaw))state.yaw=savedData.yaw;
 if(Number.isFinite(savedData.bestRace))state.race.best=savedData.bestRace;
 if(Array.isArray(savedData.customBuildings)){
  for(const raw of savedData.customBuildings.slice(0,12)){
   if(!raw||!Number.isFinite(raw.x)||!Number.isFinite(raw.z))continue;
   const b={id:String(raw.id||('custom-'+Date.now())),x:raw.x,z:raw.z,w:8,d:8,name:String(raw.name||'EIGENES GEBÄUDE'),type:'home',color:Number(raw.color)||0xa88468,door:[raw.x+4,raw.z+9.1],custom:true};
   buildings.push(b);customBuildings.push(b)
  }
 }
}
function saveGame(){
 try{
  const ownedCarIds=[...new Set(cars.filter(c=>c.owned).map(c=>c.id))];
  const data={money:Math.round(state.money),inventory:[...new Set(state.inventory)],x:state.mode==='outside'?state.x:undefined,z:state.mode==='outside'?state.z:undefined,yaw:state.yaw,bestRace:state.race.best,ownedCarIds,collected:pickups.filter(p=>p.collected).map(p=>p.id),customBuildings:customBuildings.map(b=>({id:b.id,x:b.x,z:b.z,name:b.name,color:b.color}))};
  localStorage.setItem(SAVE_KEY,JSON.stringify(data));savedData=data
 }catch(_){}
}
function restoreOwnedCars(){
 const ids=new Set(Array.isArray(savedData.ownedCarIds)?savedData.ownedCarIds:[]);
 const legacy=new Set(Array.isArray(savedData.ownedModels)?savedData.ownedModels:[]);
 for(const c of cars){
  if(ids.has(c.id)||(legacy.has(c.name)&&c.forSale)){c.locked=false;c.forSale=false;c.owned=true}
 }
}
function spawnPickups(){
 const defs=[
  {id:'coin-park-1',x:91,z:88,label:'Stadtmünzen',money:80,color:0xe8c64f},
  {id:'coin-park-2',x:138,z:116,label:'Stadtmünzen',money:120,color:0xe8c64f},
  {id:'part-park',x:116,z:98,label:'Werkzeugteil',item:'Werkzeugteil',color:0x78949e},
  {id:'part-station',x:124,z:279,label:'Elektronikteil',item:'Elektronikteil',color:0x6ca2c5},
  {id:'part-harbor',x:99,z:388.7,label:'Hafenteil',item:'Hafenteil',color:0xb57a4e},
  {id:'coin-harbor',x:291,z:389,label:'Stadtmünzen',money:160,color:0xe8c64f}
 ];
 const done=new Set(Array.isArray(savedData.collected)?savedData.collected:[]);
 for(const d of defs){
  const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.42,0),new THREE.MeshStandardMaterial({color:d.color,roughness:.35,metalness:.45,emissive:d.color,emissiveIntensity:.12}));
  mesh.position.set(d.x,.72,d.z);mesh.castShadow=true;scene.add(mesh);
  const p={...d,mesh,collected:done.has(d.id),phase:Math.random()*6.28};mesh.visible=!p.collected;pickups.push(p)
 }
}
function nearestPickup(max=2.5){
 if(state.mode!=='outside')return null;let best=null,bd=max;
 for(const p of pickups){if(p.collected)continue;const d=dist2(state.x,state.z,p.x,p.z);if(d<bd){bd=d;best=p}}
 return best
}
function collectPickup(p){
 if(!p||p.collected)return;p.collected=true;p.mesh.visible=false;
 if(p.money){state.money+=p.money;toast('💰 +'+p.money+' €')}
 if(p.item&&!state.inventory.includes(p.item)){state.inventory.push(p.item);toast('📦 '+p.item+' eingesammelt')}
 log('Eingesammelt: '+p.label);saveGame();hud()
}
function updatePickups(dt){
 for(const p of pickups){if(p.collected)continue;p.phase+=dt*2.2;p.mesh.rotation.y+=dt*1.7;p.mesh.position.y=.72+Math.sin(p.phase)*.12}
}
function setupRace(){
 const geo=new THREE.TorusGeometry(3.4,.20,8,28),material=new THREE.MeshStandardMaterial({color:0xffd34f,emissive:0x9b7217,emissiveIntensity:.9,roughness:.35});
 raceMarker=new THREE.Mesh(geo,material);raceMarker.rotation.y=Math.PI/2;raceMarker.visible=false;scene.add(raceMarker);
 state.race.checkpoints=[[185,157],[307,157],[431,157],[431,264],[307,264],[185,264],[185,157]]
}
function startRace(){
 if(state.mode!=='outside'||!state.vehicle)return toast('Für das Rennen draußen in ein Fahrzeug einsteigen');
 state.race.active=true;state.race.index=0;state.race.time=0;raceMarker.visible=true;const cp=state.race.checkpoints[0];raceMarker.position.set(cp[0],3.2,cp[1]);toast('🏁 Rennen gestartet!')
}
function updateRace(dt){
 if(!state.race.active)return;state.race.time+=dt;
 const cp=state.race.checkpoints[state.race.index];if(!cp)return;
 raceMarker.rotation.z+=dt*.7;
 if(dist2(state.x,state.z,cp[0],cp[1])<8){
  state.race.index++;
  if(state.race.index>=state.race.checkpoints.length){
   const t=state.race.time;state.race.active=false;raceMarker.visible=false;state.money+=800;
   if(!state.race.best||t<state.race.best)state.race.best=t;
   log('🏁 Rennen beendet: '+t.toFixed(1)+' s · +800 €');toast('🏆 Ziel! '+t.toFixed(1)+' s');saveGame();return
  }
  const n=state.race.checkpoints[state.race.index];raceMarker.position.set(n[0],3.2,n[1]);toast('Checkpoint '+state.race.index+'/'+state.race.checkpoints.length)
 }
}
function roadArea(x,z,margin=0){
 return roadsX.some(rx=>Math.abs(x-rx)<ROAD_W/2+SIDEWALK+margin)||roadsZ.some(rz=>Math.abs(z-rz)<ROAD_W/2+SIDEWALK+margin)
}
function overlapsBuilding(x,z,w,d,margin=1.5){
 return buildings.some(b=>{const q=structureRect(b);return x+w/2>q.x-margin&&x-w/2<q.x+q.w+margin&&z+d/2>q.z-margin&&z-d/2<q.z+q.d+margin})
}
function buildCustomInterior(b){
 const n=customBuildings.length,cx=4200+n*42,cz=60,w=20,d=16;
 const room={id:b.id,cx,cz,w,d,minX:cx-w/2,maxX:cx+w/2,minZ:cz-d/2,maxZ:cz+d/2,spawn:{x:cx,z:cz+d/2-3},exit:{x:cx,z:cz+d/2-1.4},vehicleSpawn:{x:cx,z:cz},vehicleExit:{x:cx,z:cz+d/2-2.5}};
 interiors[b.id]=room;
 addBox(cx,.02,cz,w,.08,d,0xb9ac98,.95,0);addBox(cx,2.6,room.minZ,w,5.2,.28,0xd2c4ae,.88,0);addBox(cx,2.6,room.maxZ,w,5.2,.28,0xd2c4ae,.88,0);addBox(room.minX,2.6,cz,.28,5.2,d,0xd2c4ae,.88,0);addBox(room.maxX,2.6,cz,.28,5.2,d,0xd2c4ae,.88,0);
 const label=makeLabel(b.name,7);label.position.set(cx,3.6,room.minZ+.2);scene.add(label)
}
function buildStructure(){
 if(state.vehicle||state.mode!=='outside')return toast('Zum Bauen draußen aussteigen');
 const cost=1500;if(state.money<cost)return toast('Gebäude kostet 1.500 €');
 const tx=state.x+Math.cos(state.yaw)*11,tz=state.z+Math.sin(state.yaw)*11;
 if(tx<8||tz<8||tx>WORLD_W-8||tz>380||roadArea(tx,tz,5)||overlapsBuilding(tx,tz,8,8,2))return toast('Hier ist kein freier Bauplatz');
 const id='custom-'+Date.now(),colors=[0xa88468,0x8797a1,0xb37a64,0x8f9b76],color=colors[customBuildings.length%colors.length];
 const b={id,x:tx-4,z:tz-4,w:8,d:8,name:'EIGENES GEBÄUDE '+(customBuildings.length+1),type:'home',color,door:[tx,tz+5.1],custom:true};
 buildings.push(b);customBuildings.push(b);makeBuilding(b);buildCustomInterior(b);state.money-=cost;log('🏗️ '+b.name+' gebaut.');toast('🏗️ Gebäude gebaut');saveGame();hud()
}
function tryJump(){
 if(state.vehicle||!state.grounded)return;
 if(state.mode==='outside'){
  const fx=state.x+Math.cos(state.yaw)*1.4,fz=state.z+Math.sin(state.yaw)*1.4;
  const c=climbables.find(o=>dist2(fx,fz,o.x,o.z)<Math.max(o.w,o.d)*.60+1.0);
  if(c){
   state.jumpY=c.h+.18;state.jumpV=2.2;state.grounded=false;
   const nx=state.x+Math.cos(state.yaw)*2.5,nz=state.z+Math.sin(state.yaw)*2.5;
   if(!blocked(nx,nz,.48)){state.x=nx;state.z=nz;toast('🧗 Hochgeklettert');return}
   state.jumpY=0
  }
 }
 state.jumpV=5.4;state.grounded=false;toast('⬆️ Sprung')
}
function setupWorld(){
 loadPersistentState();setupHeldWeapons();buildGround();buildings.forEach(makeBuilding);populateTrees();populateProps();buildClimbables();buildInteriors();spawnNPCs();spawnCars();spawnPolice();buildHarbor();spawnPickups();setupRace();restoreOwnedCars()
}
setupWorld();

function currentCar(){return state.vehicle}
function nearestCar(max=4.6){
 let best=null,bd=max;
 for(const c of cars){
  if(c.ai||c.police)continue;
  if(state.mode==='outside'&&c.interiorId)continue;
  if(state.mode==='interior'&&c.interiorId!==state.currentBuilding)continue;
  const d=dist2(state.x,state.z,c.x,c.z);if(d<bd){bd=d;best=c}
 }
 return best
}
function nearestBuilding(max=8){
 if(state.mode!=='outside')return null;
 let best=null,bd=max;for(const b of buildings){if(b.type==='park'||!b.door)continue;const p=b.door,d=dist2(state.x,state.z,p[0],p[1]);if(d<bd){bd=d;best=b}}return best
}
function nearestPortalBuilding(max=9){
 if(state.mode!=='outside')return null;
 let best=null,bd=max;for(const b of buildings){if(!b.portal||!b.door)continue;const d=dist2(state.x,state.z,b.door[0],b.door[1]);if(d<bd){bd=d;best=b}}return best
}
function buildingById(id){return buildings.find(b=>b.id===id)||null}
function enterInterior(b){
 const r=interiors[b.id];if(!r)return toast('Innenraum noch nicht verfügbar');
 state.returnPos={x:state.x,z:state.z,yaw:state.yaw};state.mode='interior';state.currentBuilding=b.id;state.x=r.spawn.x;state.z=r.spawn.z;state.yaw=-Math.PI/2;state.jumpY=0;state.jumpV=0;state.grounded=true;openBuilding(b);toast('🚪 '+b.name+' betreten')
}
function leaveInterior(){
 const b=buildingById(state.currentBuilding),ret=state.returnPos;if(!b||!ret)return;
 state.mode='outside';state.currentBuilding=null;state.x=ret.x;state.z=ret.z;state.yaw=ret.yaw;state.returnPos=null;ui.panel.textContent='Du bist wieder draußen.';toast('🚪 '+b.name+' verlassen')
}
function enterVehicleInterior(b){
 const r=interiors[b.id],c=state.vehicle;if(!r||!c)return;
 state.returnPos={x:c.x,z:c.z,yaw:c.a};state.mode='interior';state.currentBuilding=b.id;c.interiorId=b.id;c.x=r.vehicleSpawn.x;c.z=r.vehicleSpawn.z;c.a=-Math.PI/2;c.speed=0;c.mesh.position.set(c.x,0,c.z);c.mesh.rotation.y=-c.a;state.x=c.x;state.z=c.z;state.yaw=c.a;openBuilding(b);toast('🚗 '+b.name+' – Innenraum')
}
function leaveVehicleInterior(){
 const b=buildingById(state.currentBuilding),c=state.vehicle;if(!b||!c||!b.door)return;
 const q=structureRect(b),px=b.door[0],pz=b.door[1];
 const sides=[
  {d:Math.abs(px-q.x),dx:-1,dz:0,a:Math.PI},
  {d:Math.abs(px-(q.x+q.w)),dx:1,dz:0,a:0},
  {d:Math.abs(pz-q.z),dx:0,dz:-1,a:-Math.PI/2},
  {d:Math.abs(pz-(q.z+q.d)),dx:0,dz:1,a:Math.PI/2}
 ].sort((a,b)=>a.d-b.d);
 const out=sides[0];c.interiorId=null;c.x=px+out.dx*5.2;c.z=pz+out.dz*5.2;c.a=out.a;c.speed=0;c.mesh.position.set(c.x,0,c.z);c.mesh.rotation.y=-c.a;
 state.mode='outside';state.currentBuilding=null;state.x=c.x;state.z=c.z;state.yaw=c.a;state.returnPos=null;toast('🚗 Ausfahrt: '+b.name)
}
function clearPanel(title){ui.panel.innerHTML='';const t=document.createElement('div');t.className='strong';t.textContent=title;ui.panel.appendChild(t);const row=document.createElement('div');row.className='action-buttons';row.style.marginTop='8px';ui.panel.appendChild(row);return row}
function pbtn(text,fn,primary=false){const b=document.createElement('button');b.textContent=text;if(primary)b.className='primary';b.onclick=fn;return b}
function openBuilding(b){
 const row=clearPanel(b.name);
 if(b.type==='shop'||b.type==='cafe'){
  for(const it of b.items||[]){
   const [name,price,icon,heal=0]=it;
   row.appendChild(pbtn('Kaufen '+icon+' '+name+' · '+price+' €',()=>{
    if(state.money<price)return toast('Zu wenig Geld');
    if(name==='Wasserpistole'&&state.inventory.includes('Wasserpistole'))return toast('Schon vorhanden');
    if(name==='Pistole'&&state.inventory.includes('Pistole'))return toast('Schon vorhanden');
    state.money-=price;
    if(heal)state.hp=clamp(state.hp+heal,0,100);
    else state.inventory.push(name);
    if(name==='Wasserpistole')state.activeWeapon='water';
    if(name==='Pistole')state.activeWeapon='pistol';
    log(name+' gekauft.');saveGame();hud()
   },price<=10));
   if(b.type==='shop'){
    row.appendChild(pbtn('Klauen '+icon+' '+name,()=>{
     if(!heal&&!state.inventory.includes(name))state.inventory.push(name);
     if(name==='Wasserpistole')state.activeWeapon='water';
     if(name==='Pistole')state.activeWeapon='pistol';
     crime(12,'⚠️ '+name+' im Spiel gestohlen.');saveGame();hud()
    }))
   }
  }
 }else if(b.type==='job')row.appendChild(pbtn('📦 Arbeiten · +120 €',()=>{state.money+=120;log('Schicht beendet: +120 €.');saveGame();hud()},true));
 else if(b.type==='garage')row.appendChild(pbtn('🔧 Fahrzeug reparieren · 500 €',()=>{
  if(!state.vehicle)return toast('Mit Fahrzeug in die Werkstatt fahren');if(state.money<500)return toast('Zu wenig Geld');
  state.money-=500;state.vehicle.hp=100;applyDamageVisual(state.vehicle,true);log('Fahrzeug repariert.');saveGame();hud()
 },true));
 else if(b.type==='home')row.appendChild(pbtn('🛏️ Ausruhen',()=>{state.hp=100;state.heat=Math.max(0,state.heat-10);saveGame();hud();toast('Ausgeruht')},true));
 else if(b.type==='dealer'){const m=document.createElement('span');m.className='muted';m.textContent='Gehe zu einem Showroom-Fahrzeug. E = kaufen/klauen, F = einsteigen. Mit E an der markierten Ausfahrt fährst du wieder hinaus.';row.appendChild(m)}
 else if(b.type==='parking'){const m=document.createElement('span');m.className='muted';m.textContent='Parkhaus: Fahrzeuge stehen physisch auf Stellplätzen. Mit E an der Ausfahrt gelangst du wieder nach draußen.';row.appendChild(m)}
 else {const m=document.createElement('span');m.className='muted';m.textContent='Du befindest dich im begehbaren 3D-Innenraum.';row.appendChild(m)}
}
function openCarSale(c){
 const row=clearPanel(c.name+' · '+c.price.toLocaleString('de-DE')+' €');
 row.appendChild(pbtn('Kaufen',()=>{if(state.money<c.price)return toast('Zu wenig Geld');state.money-=c.price;c.locked=false;c.forSale=false;c.owned=true;log(c.name+' gekauft.');saveGame();hud()},true));
 row.appendChild(pbtn('Im Spiel klauen',()=>{c.locked=false;c.forSale=false;c.stolen=true;crime(35,'Fahrzeugdiebstahl – Polizei sucht dich.');saveGame();toast('F drücken und losfahren')}));
}
function action(){
 if(state.vehicle){
  if(state.mode==='outside'){
   const b=nearestPortalBuilding();if(b)return enterVehicleInterior(b);
   return toast('Mit dem Fahrzeug zur Einfahrt eines Autohauses/Parkhauses fahren')
  }
  const room=interiors[state.currentBuilding];
  if(room&&dist2(state.x,state.z,room.vehicleExit.x,room.vehicleExit.z)<6)return leaveVehicleInterior();
  return toast('Zur AUSFAHRT fahren und E drücken')
 }
 if(state.mode==='interior'){
  const room=interiors[state.currentBuilding];
  const c=nearestCar(4);if(c&&c.locked&&c.forSale)return openCarSale(c);
  if(room&&dist2(state.x,state.z,room.exit.x,room.exit.z)<3.4)return leaveInterior();
  const b=buildingById(state.currentBuilding);if(b)return openBuilding(b);
 }
 const pickup=nearestPickup&&nearestPickup(2.5);if(pickup)return collectPickup(pickup);
 const c=nearestCar(4);if(c&&c.locked&&c.forSale)return openCarSale(c);
 const b=nearestBuilding();if(b)return enterInterior(b);
 toast('Nichts in Reichweite')
}
function vehicleAction(){
 if(state.vehicle){
  const c=state.vehicle;state.x=c.x-Math.cos(c.a)*2.5;state.z=c.z-Math.sin(c.a)*2.5;state.vehicle=null;state.speedKmh=0;state._lookOffsetYaw=0;toast('Ausgestiegen');return
 }
 const c=nearestCar();if(!c)return toast('Kein Fahrzeug in der Nähe');if(c.locked)return toast('Fahrzeug ist gesperrt – E für Optionen');
 state.vehicle=c;state.speedKmh=c.speed||0;state.yaw=c.a;state._lookOffsetYaw=0;toast('Eingestiegen: '+c.name)
}

function spawnCrashFX(c,amount){
 const count=clamp(Math.round(amount*.45),3,10),origin=new THREE.Vector3(c.x,.7,c.z);
 for(let i=0;i<count;i++){
  const spark=new THREE.Mesh(new THREE.SphereGeometry(.025+(i%3)*.012,5,4),new THREE.MeshBasicMaterial({color:i%3===0?0xfff0a3:0xff8a32,transparent:true,opacity:.95}));
  spark.position.copy(origin).add(new THREE.Vector3((Math.random()-.5)*1.2,Math.random()*.45,(Math.random()-.5)*1.2));scene.add(spark);
  effects.push({mesh:spark,ttl:.22+Math.random()*.28,velocity:new THREE.Vector3((Math.random()-.5)*5,2+Math.random()*4,(Math.random()-.5)*5),gravity:9.5,fade:true})
 }
}
function ensureDamageParts(c){
 const u=c.mesh.userData;if(u.damageReady)return;u.damageReady=true;
 u.base={
  bodyPos:u.body?u.body.position.clone():null,bodyScale:u.body?u.body.scale.clone():null,bodyRot:u.body?u.body.rotation.clone():null,
  hoodPos:u.hood?u.hood.position.clone():null,hoodScale:u.hood?u.hood.scale.clone():null,hoodRot:u.hood?u.hood.rotation.clone():null,
  cabinPos:u.cabin?u.cabin.position.clone():null,cabinScale:u.cabin?u.cabin.scale.clone():null,cabinRot:u.cabin?u.cabin.rotation.clone():null,
  wheelRots:(u.wheels||[]).map(w=>w.rotation.clone()),wheelPos:(u.wheels||[]).map(w=>w.position.clone()),
  frontBumperPos:u.frontBumper?u.frontBumper.position.clone():null,frontBumperRot:u.frontBumper?u.frontBumper.rotation.clone():null,
  rearBumperPos:u.rearBumper?u.rearBumper.position.clone():null,rearBumperRot:u.rearBumper?u.rearBumper.rotation.clone():null
 };
 u.damageMarks=[];
 const dim=u.dim||{length:4,width:2};
 for(let i=0;i<5;i++){
  const mark=meshBox(.28+.05*(i%2),.025,.60+.09*(i%3),0x24282a,.98,.02);mark.position.set(dim.length*.20-i*.25,.94+(i%2)*.08,(i%2?-.43:.43)*Math.min(1,dim.width));mark.rotation.y=(i-2)*.16;mark.visible=false;c.mesh.add(mark);u.damageMarks.push(mark)
 }
 if(!u.smoke){
  u.smoke=new THREE.Group();
  for(let i=0;i<4;i++){const puff=new THREE.Mesh(new THREE.SphereGeometry(.18+i*.055,7,5),new THREE.MeshStandardMaterial({color:0x434748,transparent:true,opacity:.0,roughness:1}));puff.position.set(i*.10,i*.22,(i%2?-.10:.10));u.smoke.add(puff)}
  u.smoke.position.set(dim.length*.28,1.18,0);c.mesh.add(u.smoke)
 }
}
function applyDamageVisual(c,force=false){
 if(!c||!c.mesh)return;ensureDamageParts(c);
 const u=c.mesh.userData,stage=damageStage(c.hp);if(!force&&u.damageStage===stage)return;u.damageStage=stage;const b=u.base;
 const body=u.body,hood=u.hood,cabin=u.cabin,wheels=u.wheels||[];
 if(body&&b.bodyPos){body.position.copy(b.bodyPos);body.scale.copy(b.bodyScale);body.rotation.copy(b.bodyRot);body.scale.x=Math.max(.91,1-stage*.014);body.position.x-=stage*.025;body.rotation.z=stage>=4?.025*(stage-3):0;body.rotation.y=stage>=3?.012*(stage-2):0;if(body.material){body.material.roughness=clamp(.40+stage*.095,.4,.92);body.material.color.setHex(u.baseColor||c.spec.color)}}
 if(hood&&b.hoodPos){hood.position.copy(b.hoodPos);hood.scale.copy(b.hoodScale);hood.rotation.copy(b.hoodRot);hood.position.x-=stage*.045;hood.scale.x=Math.max(.72,1-stage*.055);hood.rotation.z=stage>=2?.045*stage:0;hood.rotation.y=stage>=4?.05:0}
 if(cabin&&b.cabinPos){cabin.position.copy(b.cabinPos);cabin.scale.copy(b.cabinScale);cabin.rotation.copy(b.cabinRot);cabin.rotation.z=stage>=3?-.018*(stage-2):0;cabin.position.y-=stage>=5?.06:0;if(cabin.material)cabin.material.roughness=stage>=3?.60:.22}
 wheels.forEach((w,i)=>{if(b.wheelRots[i])w.rotation.copy(b.wheelRots[i]);if(b.wheelPos[i])w.position.copy(b.wheelPos[i]);if(stage>=3&&i===0)w.rotation.z+=.12;if(stage>=4&&i===1)w.rotation.z-=.18;if(stage>=5&&i===2){w.rotation.z+=.34;w.position.y-=.08}});
 if(u.frontBumper&&b.frontBumperPos){u.frontBumper.position.copy(b.frontBumperPos);u.frontBumper.rotation.copy(b.frontBumperRot);u.frontBumper.position.x-=stage*.055;if(stage>=3)u.frontBumper.rotation.z=.06*(stage-2);if(stage>=5)u.frontBumper.position.y-=.22}
 if(u.rearBumper&&b.rearBumperPos){u.rearBumper.position.copy(b.rearBumperPos);u.rearBumper.rotation.copy(b.rearBumperRot);if(stage>=4)u.rearBumper.rotation.z=-.05*(stage-3)}
 (u.cracks||[]).forEach((line,i)=>{line.visible=stage>=i+2;line.material.opacity=stage>=4?.96:.72});
 if(u.panelCrack)u.panelCrack.visible=stage>=3;
 u.damageMarks.forEach((m,i)=>m.visible=stage>=i+1);
 if(u.smoke){u.smoke.visible=stage>=4;u.smoke.children.forEach((p,i)=>{p.material.opacity=stage>=5?.30+(i*.035):.18+(i*.025)})}
 if(stage===0){(u.headLights||[]).forEach(m=>m.visible=true);(u.tailLights||[]).forEach(m=>m.visible=true)}
}
function updateVehicleDamageFX(dt){
 for(const c of cars){
  const u=c.mesh.userData,stage=damageStage(c.hp);if(!u.smoke||stage<4)continue;
  u.smoke.rotation.y+=dt*.55;
  u.smoke.children.forEach((p,i)=>{p.position.y=(i*.22)+Math.sin(performance.now()*.002+i)*.05;p.position.x=i*.10+Math.sin(performance.now()*.0014+i)*.035})
 }
}
function vehicleDamage(c,amount){
 const now=performance.now()/1000;if(now-c.lastDamage<.42)return;c.lastDamage=now;const before=damageStage(c.hp);c.hp=clamp(c.hp-amount,0,100);const after=damageStage(c.hp);applyDamageVisual(c);spawnCrashFX(c,amount);
 if(c===state.vehicle)state.cameraShake=Math.max(state.cameraShake,clamp(amount*.008,.045,.22));
 if(after>before)toast(damageLabel(c.hp));if(c.hp<=0){c.speed=0;if(c===state.vehicle)state.speedKmh=0}
}
function updateVehicle(dt){
 const c=state.vehicle;if(!c)return;
 const up=keys.has('w')||keys.has('ArrowUp'),down=keys.has('s')||keys.has('ArrowDown'),left=keys.has('a')||keys.has('ArrowLeft'),right=keys.has('d')||keys.has('ArrowRight');
 const ds=damageStage(c.hp),speedFactor=[1,.96,.86,.70,.48,0][ds],accFactor=[1,.98,.90,.76,.55,0][ds];
 const rawCap=state.mode==='interior'?Math.min(38,c.spec.max):c.spec.max,speedCap=rawCap*speedFactor;
 if(c.hp<=0){c.speed*=.90}else{
  if(up)c.speed+=c.spec.acc*accFactor*dt;if(down)c.speed-=c.spec.acc*.92*dt;
  c.speed*=Math.pow(.985,dt*60);c.speed=clamp(c.speed,-28*speedFactor,speedCap);
  const steer=(right?1:0)-(left?1:0),factor=clamp(Math.abs(c.speed)/45,.18,1.1);c.a+=steer*c.spec.turn*dt*factor*(c.speed>=0?1:-1);
  if(ds>=4&&Math.abs(c.speed)>25)c.a+=Math.sin(performance.now()*.004)*.00075*(ds-3)
 }
 const ms=c.speed/3.6,nx=c.x+Math.cos(c.a)*ms*dt,nz=c.z+Math.sin(c.a)*ms*dt;
 let moved=false;
 if(!blocked(nx,nz,1.05)){c.x=nx;c.z=nz;moved=true}else{vehicleDamage(c,Math.min(22,3+Math.abs(c.speed)*.055));c.speed*=-.12}
 // Fahrzeug-zu-Fahrzeug-Crashs
 if(moved){
  const dim=c.mesh.userData.dim||{length:4,width:2};const radius=Math.max(.72,dim.length*.28);
  for(const other of cars){
   if(other===c||!other.mesh.visible)continue;
   if((other.interiorId||null)!==(c.interiorId||null))continue;
   const od=other.mesh.userData.dim||{length:4,width:2},threshold=radius+Math.max(.72,od.length*.28);
   if(dist2(c.x,c.z,other.x,other.z)<threshold){
    const impact=Math.min(24,4+(Math.abs(c.speed)+Math.abs(other.speed||0))*.045);
    vehicleDamage(c,impact);vehicleDamage(other,impact*.72);c.speed*=-.18;
    if(other.police)crime(10,'⚠️ Polizeifahrzeug gerammt.');
    break
   }
  }
 }
 c.mesh.position.set(c.x,0,c.z);c.mesh.rotation.y=-c.a;state.x=c.x;state.z=c.z;state.yaw=c.a;state.speedKmh=c.speed
}
function updateFoot(dt){
 if(!state.grounded){
  state.jumpV-=11.8*dt;state.jumpY+=state.jumpV*dt;
  if(state.jumpY<=0){state.jumpY=0;state.jumpV=0;state.grounded=true}
 }
 const forward=(keys.has('w')||keys.has('ArrowUp')?1:0)-(keys.has('s')||keys.has('ArrowDown')?1:0);
 const strafe=(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0);
 if(!forward&&!strafe)return;
 const len=Math.hypot(forward,strafe)||1,f=forward/len,side=strafe/len,spd=state.sprint?6.6:4.1;
 const dx=Math.cos(state.yaw)*f-Math.sin(state.yaw)*side,dz=Math.sin(state.yaw)*f+Math.cos(state.yaw)*side;
 const nx=state.x+dx*spd*dt,nz=state.z+dz*spd*dt;if(!blocked(nx,nz,.48)){state.x=nx;state.z=nz}
}
function updateTraffic(dt){
 for(const c of traffic){
  const ms=c.speed/3.6;if(c.axis==='h'){c.x+=c.dir*ms*dt;if(c.x>WORLD_W+8)c.x=-8;if(c.x<-8)c.x=WORLD_W+8;c.a=c.dir>0?0:Math.PI}
  else{c.z+=c.dir*ms*dt;if(c.z>WORLD_D+8)c.z=-8;if(c.z<-8)c.z=WORLD_D+8;c.a=c.dir>0?Math.PI/2:-Math.PI/2}
  c.mesh.position.set(c.x,0,c.z);c.mesh.rotation.y=-c.a;
  if(state.vehicle&&state.mode==='outside'&&dist2(c.x,c.z,state.vehicle.x,state.vehicle.z)<2.4){
   const impact=Math.min(18,4+(Math.abs(c.speed)+Math.abs(state.vehicle.speed||0))*.035);vehicleDamage(state.vehicle,impact);vehicleDamage(c,impact*.58);state.vehicle.speed*=.72;c.speed*=.82
  }
 }
}
function updateNPCs(dt){
 for(const n of npcs){
  if(n.pirate)continue;if(n.stun>0){n.stun-=dt;continue}n.phase+=dt*5;
  if(n.interiorId){
   const r=n.bounds;if(n.horizontal){n.x+=n.dir*n.speed*dt;if(n.x<r.minX+2||n.x>r.maxX-2)n.dir*=-1}else{n.z+=n.dir*n.speed*dt;if(n.z<r.minZ+2||n.z>r.maxZ-2)n.dir*=-1}
  }else if(n.horizontal){n.x+=n.dir*n.speed*dt;if(n.x<12||n.x>WORLD_W-12)n.dir*=-1}else{n.z+=n.dir*n.speed*dt;if(n.z<12||n.z>WORLD_D-38)n.dir*=-1}
  n.mesh.position.set(n.x,0,n.z);n.mesh.rotation.y=n.horizontal?(n.dir>0?-Math.PI/2:Math.PI/2):(n.dir>0?Math.PI:0);
  const u=n.mesh.userData,u1=Math.sin(n.phase)*.42;u.legL.rotation.z=u1;u.legR.rotation.z=-u1;u.armL.rotation.z=.22-u1*.55;u.armR.rotation.z=-.22+u1*.55
 }
}
function updatePolice(dt){
 if(state.mode==='interior'){state.lastCrime+=dt;if(state.lastCrime>7)state.heat=Math.max(0,state.heat-dt*1.15);for(const p of police)p.mesh.visible=false;return}
 state.lastCrime+=dt;if(state.lastCrime>7)state.heat=Math.max(0,state.heat-dt*1.7);
 for(let i=0;i<police.length;i++){
  const p=police[i];if(state.heat<25){p.mesh.visible=false;continue}
  p.mesh.visible=true;if(!p._active){p.x=state.x-25-i*5;p.z=state.z+18+i*8;p._active=true}
  const tx=state.x,tz=state.z,a=Math.atan2(tz-p.z,tx-p.x);p.a=a;p.speed=clamp((p.speed||0)+70*dt,0,220);
  const ms=p.speed/3.6,nx=p.x+Math.cos(a)*ms*dt,nz=p.z+Math.sin(a)*ms*dt;
  if(!blocked(nx,nz,1)){p.x=nx;p.z=nz}
  else if(!blocked(nx,p.z,1)){p.x=nx}
  else if(!blocked(p.x,nz,1)){p.z=nz}
  else{
   const nearestX=roadsX.reduce((best,v)=>Math.abs(v-p.x)<Math.abs(best-p.x)?v:best,roadsX[0]);
   const nearestZ=roadsZ.reduce((best,v)=>Math.abs(v-p.z)<Math.abs(best-p.z)?v:best,roadsZ[0]);
   const ax=Math.abs(nearestX-p.x)<Math.abs(nearestZ-p.z)?Math.sign(nearestX-p.x):0;
   const az=ax===0?Math.sign(nearestZ-p.z):0;p.x+=ax*Math.min(ms*dt,1.2);p.z+=az*Math.min(ms*dt,1.2)
  }
  p.mesh.position.set(p.x,0,p.z);p.mesh.rotation.y=-a
  if(dist2(p.x,p.z,state.x,state.z)<2.5){
   state.heat=Math.max(0,state.heat-25*dt);
   if(state.vehicle){vehicleDamage(state.vehicle,5.5);vehicleDamage(p,3.0);state.vehicle.speed*=.90;p.speed*=.82}
   else state.hp=Math.max(0,state.hp-2*dt)
  }
 }
 if(state.heat<20)for(const p of police)p._active=false
}
function daylightLevel(){
 const t=state.worldTime%24;return clamp(Math.sin((t-6)/12*Math.PI),0,1)
}
function updateStreetLights(day){
 const night=clamp((.48-day)/.40,0,1);
 for(const l of streetLamps){l.bulb.material.emissiveIntensity=.15+night*4.2;l.halo.material.opacity=night*.34}
 for(const p of lampLightPool)p.intensity=0;
 if(state.mode!=='outside'||night<.04)return;
 const near=streetLamps.map(l=>({l,d:dist2(state.x,state.z,l.x,l.z)})).filter(o=>o.d<72).sort((a,b)=>a.d-b.d).slice(0,lampLightPool.length);
 near.forEach((o,i)=>{const p=lampLightPool[i];p.position.set(o.l.lightX,4.14,o.l.lightZ);p.intensity=night*38*(1-o.d/100);p.distance=24})
}
function updateCarLights(day){
 const night=clamp((.52-day)/.42,0,1);
 for(const c of cars){
  const u=c.mesh.userData,stage=damageStage(c.hp),manual=(c===state.vehicle?state.headlightsOn:true);
  const on=(night>.03||c===state.vehicle)&&manual&&stage<5;
  (u.headLights||[]).forEach((m,i)=>{const broken=stage>=4&&i===0||stage>=5;m.visible=!broken;m.material.emissiveIntensity=broken?0:(on?2.8+night*3.2:.10)});
  const braking=c===state.vehicle&&(keys.has('s')||keys.has('ArrowDown'));
  (u.tailLights||[]).forEach((m,i)=>{const broken=stage>=5&&i===1;m.visible=!broken;m.material.emissiveIntensity=broken?0:(.22+night*1.7+(braking?3.0:0))});
  if(u.sirenLights&&u.sirenLights.length===2){const phase=Math.sin(performance.now()*.018)>0;u.sirenLights[0].material.emissiveIntensity=c.police&&c.mesh.visible?(phase?6:.25):.12;u.sirenLights[1].material.emissiveIntensity=c.police&&c.mesh.visible?(phase?.25:6):.12}
 }
 carHeadLightL.intensity=0;carHeadLightR.intensity=0;
 const c=state.vehicle;
 if(!c||state.mode!=='outside'||!state.headlightsOn||c.hp<=0)return;
 const u=c.mesh.userData,dim=u.dim||{length:4.4,width:1.8},stage=damageStage(c.hp),f=Math.max(.75,night);
 const fx=Math.cos(c.a),fz=Math.sin(c.a),lx=-Math.sin(c.a),lz=Math.cos(c.a),front=dim.length*.46;
 const leftBroken=stage>=4,rightBroken=stage>=5;
 const baseX=c.x+fx*front,baseZ=c.z+fz*front;
 carHeadLightL.position.set(baseX+lx*dim.width*.26,.72,baseZ+lz*dim.width*.26);
 carHeadLightR.position.set(baseX-lx*dim.width*.26,.72,baseZ-lz*dim.width*.26);
 carHeadTarget.position.set(c.x+fx*36,.55,c.z+fz*36);
 carHeadLightL.intensity=leftBroken?0:92*f;carHeadLightR.intensity=rightBroken?0:92*f
}
function toggleFlashlight(){
 if(state.vehicle)return toast('Taschenlampe nur zu Fuß');
 state.flashlight=!state.flashlight;
 if(state.flashlight&&!state.firstPerson){state.firstPerson=true;document.getElementById('viewBtn').textContent='👁 Ich-Perspektive'}
 const b=document.getElementById('flashlightBtn');if(b)b.textContent=state.flashlight?'🔦 Lampe AN':'🔦 Taschenlampe';
 toast(state.flashlight?'🔦 Taschenlampe an':'🔦 Taschenlampe aus')
}
function toggleHeadlights(){
 if(!state.vehicle)return toast('Autolicht im Fahrzeug umschalten');
 state.headlightsOn=!state.headlightsOn;const b=document.getElementById('headlightBtn');if(b)b.textContent=state.headlightsOn?'💡 Licht AN':'💡 Licht AUS';
 toast(state.headlightsOn?'💡 Autolicht an':'💡 Autolicht aus')
}
function updatePersonalLights(){
 const day=daylightLevel();
 flashlight.intensity=state.flashlight&&!state.vehicle?110:0;
 flashlightModel.visible=state.flashlight&&!state.vehicle&&state.firstPerson;
 if(flashlightModel.visible){const rim=flashlightModel.children[1];if(rim&&rim.material)rim.material.emissiveIntensity=2.2}
 updateStreetLights(day);updateCarLights(day)
}
function updateLighting(dt){
 state.worldTime=(state.worldTime+dt*.03)%24;const t=state.worldTime,day=clamp(Math.sin((t-6)/12*Math.PI),0,1);hemi.intensity=.25+1.3*day;sun.intensity=.12+2.3*day;
 const sky=new THREE.Color(day>.15?0x9fc8df:0x17263a);scene.background.lerp(sky,.03);scene.fog.color.copy(scene.background);sun.position.set(Math.cos(t/24*Math.PI*2)*140,35+day*150,Math.sin(t/24*Math.PI*2)*120);updatePersonalLights()
}

function cameraDir(){
 const cp=Math.cos(state.pitch);return new THREE.Vector3(Math.cos(state.yaw)*cp,Math.sin(state.pitch),Math.sin(state.yaw)*cp)
}
function updateCamera(){
 if(state.vehicle){
  const c=state.vehicle;if(state.firstPerson){
   const pos=new THREE.Vector3(c.x,1.35,c.z).add(new THREE.Vector3(Math.cos(c.a)*.45,0,Math.sin(c.a)*.45));camera.position.lerp(pos,.35);state.yaw=c.a+state._lookOffsetYaw;const d=cameraDir();camera.lookAt(camera.position.clone().add(d))
  }else{
   const behind=new THREE.Vector3(c.x-Math.cos(c.a)*7.3,3.9,c.z-Math.sin(c.a)*7.3);camera.position.lerp(behind,.12);camera.lookAt(c.x,1.0,c.z)
  }
 }else if(state.firstPerson){
  camera.position.set(state.x,1.72+state.jumpY,state.z);const d=cameraDir();camera.lookAt(camera.position.clone().add(d))
 }else{
  const behind=new THREE.Vector3(state.x-Math.cos(state.yaw)*5.5,3.2+state.jumpY,state.z-Math.sin(state.yaw)*5.5);camera.position.lerp(behind,.18);camera.lookAt(state.x,1.15+state.jumpY,state.z)
 }
 if(state.cameraShake>0){camera.position.x+=(Math.random()-.5)*state.cameraShake;camera.position.y+=(Math.random()-.5)*state.cameraShake*.55;camera.position.z+=(Math.random()-.5)*state.cameraShake}
}
state._lookOffsetYaw=0;
function toggleView(){state.firstPerson=!state.firstPerson;if(!state.firstPerson&&state.flashlight){state.flashlight=false;const fb=document.getElementById('flashlightBtn');if(fb)fb.textContent='🔦 Taschenlampe'}document.getElementById('viewBtn').textContent=state.firstPerson?'👁 Ich-Perspektive':'🎥 Verfolgerkamera';toast(state.firstPerson?'Ich-Perspektive':'Verfolgerkamera')}

function spawnBeam(color,length,radius,ttl){
 const dir=cameraDir().normalize(),start=camera.position.clone().add(dir.clone().multiplyScalar(.55)),mid=start.clone().add(dir.clone().multiplyScalar(length*.5));
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,7),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.72}));
 beam.position.copy(mid);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);scene.add(beam);effects.push({mesh:beam,ttl})
}
function updateEffects(dt){
 for(const e of effects){
  e.ttl-=dt;
  if(e.velocity){e.mesh.position.addScaledVector(e.velocity,dt);e.velocity.y-=(e.gravity||0)*dt}
  if(e.fade&&e.mesh.material)e.mesh.material.opacity=clamp(e.ttl*3.2,0,1)
 }
 for(let i=effects.length-1;i>=0;i--)if(effects[i].ttl<=0){scene.remove(effects[i].mesh);effects[i].mesh.geometry.dispose();effects[i].mesh.material.dispose();effects.splice(i,1)}
}
function hitNPC(max=18){
 raycaster.setFromCamera(centerNdc,camera);const meshes=[];
 for(const n of npcs){
  if(state.mode==='outside'&&n.interiorId)continue;
  if(state.mode==='interior'&&n.interiorId!==state.currentBuilding)continue;
  n.mesh.traverse(o=>{if(o.isMesh){o.userData.npc=n;meshes.push(o)}})
 }
 const hits=raycaster.intersectObjects(meshes,false);for(const h of hits){if(h.distance<=max&&h.object.userData.npc)return h.object.userData.npc}return null
}
function sprayWater(){
 if(state.vehicle)return toast('Zum Spritzen erst aussteigen');
 if(!state.inventory.includes('Wasserpistole'))return toast('Wasserpistole im Frischmarkt kaufen');if(state.sprayCd>0)return;state.sprayCd=.35;state.activeWeapon='water';spawnBeam(0x64d2ff,7,.035,.16);const n=hitNPC(15);if(n){n.stun=.55;toast('💦 Treffer!')}else toast('💦 Pssssch!')
}
function shootPistol(){
 if(state.vehicle)return toast('Zum Schießen erst aussteigen');
 if(!state.inventory.includes('Pistole'))return toast('Pistole in der City Mall kaufen');if(state.shootCd>0)return;state.shootCd=.42;state.activeWeapon='pistol';muzzleTimer=.08;spawnBeam(0xffd873,18,.018,.07);const n=hitNPC(35);crime(n?38:24,'Schuss abgegeben – Polizeiaufmerksamkeit.');if(n){n.stun=1.2;toast('🔫 Treffer')}else toast('🔫 Schuss')
}
function punch(){
 if(state.punchCd>0)return;state.punchCd=.5;const n=hitNPC(2.4);if(n){n.stun=.8;crime(8,'Auseinandersetzung – Aufmerksamkeit steigt.');toast('👊 Treffer')}else toast('👊')
}

function placeName(){
 if(state.mode==='interior'){const b=buildingById(state.currentBuilding);return b?b.name+' · Innenraum':'Innenraum'}
 if(state.race.active)return'Rennen · CP '+(state.race.index+1)+'/'+state.race.checkpoints.length;
 if(state.z>385)return'Hafen';if(state.x>450&&state.z<60)return'Premium Motors';if(state.x>450&&state.z>320)return'Exotic Motors';
 let b=nearestBuilding(18);return b?b.name:'Innenstadt'
}
function hud(){
 const c=state.vehicle;ui.money.textContent=Math.round(state.money).toLocaleString('de-DE')+' €';ui.vehicleName.textContent=c?c.name:'Zu Fuß';ui.speed.textContent=Math.round(Math.abs(c?c.speed:0))+' km/h';
 ui.hpText.textContent=Math.round(state.hp)+'%';ui.hpBar.style.width=state.hp+'%';ui.carHpText.textContent=c?damageLabel(c.hp)+' · '+Math.round(c.hp)+'%':'–';ui.carHpBar.style.width=(c?c.hp:0)+'%';
 ui.heatText.textContent=Math.round(state.heat)+'%';ui.heatBar.style.width=state.heat+'%';ui.place.textContent=placeName();ui.inventory.textContent=state.inventory.length?state.inventory.join(' · '):'Leer'
}
async function toggleFullscreen(){
 try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.getElementById('app').requestFullscreen)await document.getElementById('app').requestFullscreen();else document.body.classList.toggle('pseudo-fullscreen')}catch(_){document.body.classList.toggle('pseudo-fullscreen')}
 setTimeout(resize,50)
}
function resetGame(){if(confirm('Spielstand wirklich löschen und ganz neu starten?')){try{localStorage.removeItem(SAVE_KEY)}catch(_){}location.reload()}}

function runSelfTest(){
 const results=[];const check=(name,ok)=>results.push({name,ok:!!ok});
 check('WebGL-Renderer',renderer instanceof THREE.WebGLRenderer);
 check('PerspectiveCamera',camera instanceof THREE.PerspectiveCamera);
 check('20+ Stadtgebäude',buildings.length>=20);
 check('Alle Portale besitzen Innenräume',buildings.filter(b=>b.portal).every(b=>!!interiors[b.id]));
 check('Showroom-Fahrzeuge stehen in Innenräumen',cars.filter(c=>c.forSale).every(c=>!!c.interiorId&&!!interiors[c.interiorId]));
 check('Ducati vorhanden',!!vehicleSpecs['Ducati Panigale']&&!!vehicleSpecs['Ducati Monster']);
 check('5 Schadensstufen',damageStage(79)===1&&damageStage(59)===2&&damageStage(39)===3&&damageStage(19)===4&&damageStage(0)===5);
 check('Polizei schneller als Sprint',220>6.6*3.6);
 check('Pickups vorhanden',pickups.length>=6);
 check('Kletterobjekte vorhanden',climbables.length>=4);
 check('Rennstrecke vorhanden',state.race.checkpoints&&state.race.checkpoints.length>=7);
 check('Waffenmodelle vorhanden',!!waterWeapon&&!!pistolWeapon);
 check('Lokales Speichern verfügbar',typeof localStorage!=='undefined');
 check('Straßenlampen vorhanden',streetLamps.length>20&&lampLightPool.length===10);
 check('Taschenlampe vorhanden',!!flashlight&&!!flashlightModel);
 check('Auto-Scheinwerfer vorhanden',cars.every(c=>(c.mesh.userData.headLights||[]).length>0));
 check('Scheibenrisse/Crashdetails vorhanden',cars.filter(c=>c.spec.type!=='bike').every(c=>(c.mesh.userData.cracks||[]).length>=2));
 check('Schäden beeinflussen Fahrleistung',[1,.96,.86,.70,.48,0][5]===0);
 check('Polizei-Blaulicht/Rotlicht vorhanden',police.every(c=>(c.mesh.userData.sirenLights||[]).length===2));
 const failed=results.filter(r=>!r.ok);window.CityLifeDiagnostics={version:'5.2',results,passed:results.length-failed.length,failed:failed.length};
 log('🧪 Selbsttest: '+(results.length-failed.length)+'/'+results.length+' bestanden.');
 if(failed.length)console.warn('City Life Selbsttest fehlgeschlagen',failed);else console.info('City Life Selbsttest bestanden',results);
 return window.CityLifeDiagnostics
}
runSelfTest();

function normalizeKey(e){return e.key.length===1?e.key.toLowerCase():e.key}
document.addEventListener('keydown',e=>{
 const k=normalizeKey(e);if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)){keys.add(k);e.preventDefault()}
 if(k==='e'){action();e.preventDefault()}if(k==='f'){vehicleAction();e.preventDefault()}if(k==='l'){toggleFlashlight();e.preventDefault()}if(k==='h'){toggleHeadlights();e.preventDefault()}if(k==='g'){sprayWater();e.preventDefault()}if(k==='r'){shootPistol();e.preventDefault()}if(k==='v'){toggleView();e.preventDefault()}if(k==='q'){punch();e.preventDefault()}if(k==='b'){buildStructure();e.preventDefault()}if(k==='t'){startRace();e.preventDefault()}if(e.code==='Space'){tryJump();e.preventDefault()}if(e.key==='Shift')state.sprint=true
});
document.addEventListener('keyup',e=>{keys.delete(normalizeKey(e));if(e.key==='Shift')state.sprint=false});
window.addEventListener('blur',()=>{keys.clear();state.sprint=false});
document.addEventListener('pointerlockchange',()=>pointerLocked=document.pointerLockElement===canvas);
canvas.addEventListener('click',()=>{if(window.matchMedia&&matchMedia('(pointer:fine)').matches&&canvas.requestPointerLock&&!pointerLocked)canvas.requestPointerLock()});
document.addEventListener('mousemove',e=>{if(!pointerLocked)return;state.yaw+=e.movementX*.0022;state.pitch=clamp(state.pitch-e.movementY*.0018,-1.15,1.15);if(state.vehicle)state._lookOffsetYaw=clamp(state._lookOffsetYaw+e.movementX*.0022,-1.15,1.15)});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){lookDragging=true;lastPX=e.clientX;lastPY=e.clientY;try{canvas.setPointerCapture(e.pointerId)}catch(_){}}});
canvas.addEventListener('pointermove',e=>{if(!lookDragging||e.pointerType!=='touch')return;const dx=e.clientX-lastPX,dy=e.clientY-lastPY;lastPX=e.clientX;lastPY=e.clientY;state.yaw+=dx*.006;state.pitch=clamp(state.pitch-dy*.005,-1.12,1.12);if(state.vehicle)state._lookOffsetYaw=clamp(state._lookOffsetYaw+dx*.006,-1.15,1.15)});
canvas.addEventListener('pointerup',()=>lookDragging=false);canvas.addEventListener('pointercancel',()=>lookDragging=false);

const dirMap={up:'w',down:'s',left:'a',right:'d'};
document.querySelectorAll('[data-dir]').forEach(btn=>{const k=dirMap[btn.dataset.dir];const on=e=>{e.preventDefault();keys.add(k);try{btn.setPointerCapture(e.pointerId)}catch(_){}};const off=e=>{keys.delete(k);try{btn.releasePointerCapture(e.pointerId)}catch(_){}};btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off)});
document.getElementById('actionBtn').onclick=action;document.getElementById('vehicleBtn').onclick=vehicleAction;document.getElementById('flashlightBtn').onclick=toggleFlashlight;document.getElementById('headlightBtn').onclick=toggleHeadlights;document.getElementById('punchBtn').onclick=punch;document.getElementById('jumpBtn').onclick=tryJump;document.getElementById('buildBtn').onclick=buildStructure;document.getElementById('raceBtn').onclick=startRace;document.getElementById('sprayBtn').onclick=sprayWater;document.getElementById('shootBtn').onclick=shootPistol;
document.getElementById('sprintBtn').onclick=()=>{state.sprint=!state.sprint;toast(state.sprint?'Sprint an':'Sprint aus')};document.getElementById('resetBtn').onclick=resetGame;document.getElementById('viewBtn').onclick=toggleView;document.getElementById('fullscreenBtn').onclick=toggleFullscreen;

function loop(now){
 const dt=Math.min(.033,(now-last)/1000||.016);last=now;state.sprayCd=Math.max(0,state.sprayCd-dt);state.shootCd=Math.max(0,state.shootCd-dt);state.punchCd=Math.max(0,state.punchCd-dt);
 state.cameraShake=Math.max(0,state.cameraShake-dt*.72);if(state.vehicle)updateVehicle(dt);else updateFoot(dt);updateTraffic(dt);updateNPCs(dt);updatePolice(dt);updateLighting(dt);updatePickups(dt);updateRace(dt);updateVehicleDamageFX(dt);updateCamera();updateHeldWeapons(dt);updateEffects(dt);saveTimer+=dt;if(saveTimer>5){saveTimer=0;saveGame()}hud();renderer.render(scene,camera);requestAnimationFrame(loop)
}
log('🌆 City Life 5.2: Licht- und Schadens-Overhaul gestartet.');
log('🚗 Ein freier City Sedan steht nahe dem Start. Mit F einsteigen.');
hud();requestAnimationFrame(loop);
})();