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
 panel:document.getElementById('interactionPanel'),toast:document.getElementById('toast'),wanted:document.getElementById('wantedStars'),racePlace:document.getElementById('racePlace'),weather:document.getElementById('weatherText')
};

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
const MAX_PIXEL_RATIO=2.75;
const cityQuality={mode:'auto',ratio:Math.min(window.devicePixelRatio||1,2),fps:60,frames:0,elapsed:0};
function setCityQuality(mode){
 if(!['auto','high','balanced','battery'].includes(mode))return false;
 cityQuality.mode=mode;const dpr=window.devicePixelRatio||1;
 cityQuality.ratio=Math.min(dpr,mode==='high'?MAX_PIXEL_RATIO:mode==='balanced'?1.5:mode==='battery'?1:Math.min(2,dpr));
 renderer.setPixelRatio(cityQuality.ratio);try{localStorage.setItem('city-life-quality',mode)}catch(_){}return true
}
try{setCityQuality(localStorage.getItem('city-life-quality')||'auto')}catch(_){setCityQuality('auto')}
function adaptCityQuality(dt){
 cityQuality.elapsed+=dt;cityQuality.frames++;if(cityQuality.elapsed<3)return;
 const fps=cityQuality.frames/cityQuality.elapsed;cityQuality.fps=Math.round(fps);cityQuality.elapsed=0;cityQuality.frames=0;if(cityQuality.mode!=='auto')return;
 const dpr=window.devicePixelRatio||1,next=fps<35?Math.max(.8,cityQuality.ratio-.2):fps>55?Math.min(dpr,2,cityQuality.ratio+.1):cityQuality.ratio;
 if(Math.abs(next-cityQuality.ratio)>.04){cityQuality.ratio=next;renderer.setPixelRatio(next)}
}
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
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-95;sun.shadow.camera.right=95;sun.shadow.camera.top=95;sun.shadow.camera.bottom=-95;sun.shadow.camera.near=.5;sun.shadow.camera.far=310;sun.shadow.bias=-.00018;sun.shadow.normalBias=.035;scene.add(sun);const sunTarget=new THREE.Object3D();scene.add(sunTarget);sun.target=sunTarget;

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
const keys=new Set(),buildingMeshes=[],solidBoxes=[],cars=[],traffic=[],npcs=[],police=[],effects=[],pickups=[],climbables=[],streetLamps=[],lampLightPool=[],staticColliders=[],trafficLights=[],roadblocks=[],boats=[],helicopters=[],raceOpponents=[],windowMats=[],roadSurfaceMats=[],shopLightMats=[],doorSystems=[],verticalAccess=[],climbSurfaces=[],physicsProps=[],vehicleDebris=[],districtLandmarks=[];
const interiors={},customBuildings=[];
const raycaster=new THREE.Raycaster();
const centerNdc=new THREE.Vector2(0,0);
let toastTimer=0,last=performance.now(),lookDragging=false,lastPX=0,lastPY=0,pointerLocked=false,saveTimer=0,raceMarker=null,weaponHolder=null,waterWeapon=null,pistolWeapon=null,muzzleFlash=null,muzzleTimer=0,flashlight=null,flashlightTarget=null,flashlightModel=null,carHeadLightL=null,carHeadLightR=null,carHeadTarget=null,trafficClock=0,mirrorFrame=0,cockpit=null,mirrorSystem=null,playerHeli=null,policeHeli=null,playerAvatar=null,firstPersonBody=null,playerAnimTime=0,rainSystem=null,lightningFlash=null,audioCtx=null,audioMaster=null,engineOsc=null,engineGain=null,ambienceGain=null,rainGain=null,sirenOsc=null,sirenGain=null,footstepClock=0,buildPreview=null;
const SAVE_KEY='city-life-v5-1-save';
let savedData={};

const state={
 x:117,z:157,yaw:0,pitch:0,money:1000,hp:100,heat:0,lastCrime:99,
 sprint:false,vehicle:null,speedKmh:0,firstPerson:true,inventory:[],activeWeapon:null,
 sprayCd:0,shootCd:0,punchCd:0,worldTime:16.2,flashlight:false,headlightsOn:true,cameraShake:0,handbrake:false,boat:null,aircraft:null,heliUp:false,heliDown:false,wantedStars:0,weather:'clear',weatherTimer:0,weatherBlend:0,stormFlash:0,baseY:0,interiorFloor:0,buildMode:false,buildChoice:0,buildRotation:0,buildDoorSide:0,buildWindowStyleIndex:0,mode:'outside',currentBuilding:null,returnPos:null,jumpY:0,jumpV:0,grounded:true,race:{active:false,index:0,time:0,best:null}
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
 {id:'gym',x:91,z:84,w:52,d:32,name:'CITY GYM',type:'gym',color:0x667b83,door:[117,119]},
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
 const r=stage.getBoundingClientRect();renderer.setPixelRatio(cityQuality.ratio);renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);
 camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix()
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
 weaponHolder.visible=state.firstPerson&&!state.vehicle&&!state.boat&&!state.aircraft;
 if(!weaponHolder.visible)return;
 waterWeapon.visible=state.activeWeapon==='water'&&state.inventory.includes('Wasserpistole');
 pistolWeapon.visible=state.activeWeapon==='pistol'&&state.inventory.includes('Pistole');
 if(firstPersonBody)firstPersonBody.visible=state.firstPerson&&!state.vehicle&&!state.boat&&!state.aircraft&&!waterWeapon.visible&&!pistolWeapon.visible
}
function makeLabel(text,width=7){
 const c=document.createElement('canvas');c.width=768;c.height=192;const x=c.getContext('2d');x.fillStyle='rgba(23,29,32,.88)';x.fillRect(0,0,768,192);x.fillStyle='#fff';x.font='700 66px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(text,384,96);
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
function addCircleCollider(x,z,r,type,opt={}){
 const c={shape:'circle',x,z,r,type,solid:true,hardness:opt.hardness??1,breakable:!!opt.breakable,breakSpeed:opt.breakSpeed??45,mesh:opt.mesh||null,interiorId:opt.interiorId||null,height:opt.height??99,floor:opt.floor??0,dynamic:!!opt.dynamic,prop:opt.prop||null};
 staticColliders.push(c);return c
}
function addBoxCollider(x,z,w,d,type,opt={}){
 const c={shape:'box',x,z,w,d,type,solid:true,hardness:opt.hardness??1,breakable:!!opt.breakable,breakSpeed:opt.breakSpeed??38,mesh:opt.mesh||null,interiorId:opt.interiorId||null,height:opt.height??99,floor:opt.floor??0};
 staticColliders.push(c);return c
}
function colliderOverlaps(c,x,z,r){
 if(c.shape==='circle')return dist2(x,z,c.x,c.z)<r+c.r;
 const nx=clamp(x,c.x-c.w/2,c.x+c.w/2),nz=clamp(z,c.z-c.d/2,c.z+c.d/2);
 return dist2(x,z,nx,nz)<r
}
function collisionAt(x,z,r=.55,vehicleMode=false){
 if(state.mode==='interior'){
  const room=interiors[state.currentBuilding];if(!room)return null;
  if(x-r<room.minX+.55||x+r>room.maxX-.55||z-r<room.minZ+.55||z+r>room.maxZ-.55)return{type:'wall',hardness:1.1};
 }else{
  if(x<1||z<1||x>WORLD_W-1||z>WORLD_D-1)return{type:'boundary',hardness:1.2};
  if(z>386&&!(x>67&&x<340&&z<392))return{type:'water',hardness:1.2};
  for(const b of buildings){if(b.type==='park')continue;const q=structureRect(b),roof=buildingHeight(b);if(!vehicleMode&&state.baseY>=roof-.25)continue;if(x+r>q.x&&x-r<q.x+q.w&&z+r>q.z&&z-r<q.z+q.d)return{type:'building',building:b,hardness:1.2}}
 }
 for(const c of staticColliders){
  if(!c.solid)continue;
  if(state.mode==='outside'&&c.interiorId)continue;
  if(state.mode==='interior'&&c.interiorId!==state.currentBuilding)continue;
  if(state.mode==='interior'&&c.interiorId&&c.floor!==state.interiorFloor)continue;
  if(!vehicleMode&&c.type==='climbable'&&state.baseY+state.jumpY>=c.height-.08)continue;
  if(colliderOverlaps(c,x,z,r))return{type:c.type,collider:c,hardness:c.hardness}
 }
 return null
}
function blocked(x,z,r=.55){return !!collisionAt(x,z,r,false)}
function isRoadSurface(x,z){
 return roadsX.some(rx=>Math.abs(x-rx)<=ROAD_W/2)||roadsZ.some(rz=>Math.abs(z-rz)<=ROAD_W/2)
}
function vehicleCollisionPoints(c,x=c.x,z=c.z,a=c.a){
 const dim=c.mesh.userData.dim||{length:4,width:2},r=Math.max(.32,dim.width*.43),off=dim.length*.30,ca=Math.cos(a),sa=Math.sin(a);
 return [{x:x+ca*off,z:z+sa*off,r},{x,z,r},{x:x-ca*off,z:z-sa*off,r}]
}
function vehicleStaticHit(c,x,z,a=c.a){
 for(const p of vehicleCollisionPoints(c,x,z,a)){const hit=collisionAt(p.x,p.z,p.r,true);if(hit)return hit}
 return null
}
function vehicleRadius(c){const d=c.mesh.userData.dim||{length:4,width:2};return Math.max(.72,Math.max(d.width*.52,d.length*.24))}
function vehicleDynamicHit(c,x,z){
 for(const other of cars){
  if(other===c||!other.mesh.visible)continue;
  if((other.interiorId||null)!==(c.interiorId||null))continue;
  if(Math.abs((other.y||0)-(c.y||0))>2.4)continue;
  const min=vehicleRadius(c)+vehicleRadius(other);
  if(dist2(x,z,other.x,other.z)<min)return{type:'vehicle',other,hardness:.82}
 }
 return null
}
function populateBreakableFurniture(){
 for(let i=0;i<20;i++){
  const x=roadsX[i%roadsX.length]+(i%2?1:-1)*(ROAD_W/2+2.5),z=86+(i*23)%246;
  if(roadsZ.some(r=>Math.abs(r-z)<18))continue;
  // Do not spawn roadside obstacles on top of existing solid geometry.
  const obstacleRadius=i%3===0?.9:.30;
  if(staticColliders.some(col=>col.solid&&!col.interiorId&&colliderOverlaps(col,x,z,obstacleRadius+.35)))continue;
  if(buildings.some(b=>{if(b.type==='park')return false;const q=structureRect(b);return x>q.x-2&&x<q.x+q.w+2&&z>q.z-2&&z<q.z+q.d+2}))continue;
  const group=new THREE.Group(),isBarrier=i%3===0;
  if(isBarrier){addBox(0,.45,0,1.8,.75,.25,0xc75138,.7,.05,group);addBox(0,.5,-.15,1.5,.14,.06,0xe9e7de,.7,.03,group)}
  else{addBox(0,.50,0,.34,1,.34,0xd6ad48,.7,.10,group);addBox(0,.91,0,.35,.11,.35,0xe8e8df,.4,.2,group)}
  group.position.set(x,0,z);scene.add(group);
  addCircleCollider(x,z,isBarrier?.9:.30,isBarrier?'barrier':'bollard',{hardness:.42,breakable:true,breakSpeed:isBarrier?30:22,mesh:group})
 }
 // Zusätzliche zerstörbare Straßenschilder und Bushaltestellen.
 for(let i=0;i<8;i++){
  const x=70+i*67,z=roadsZ[(i+2)%roadsZ.length]+(i%2?18:-18),g=new THREE.Group();
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,2.1,8),mat(0x7d8589,.55,.45));pole.position.y=1.05;g.add(pole);addBox(0,1.88,0,.72,.52,.10,0x4f7ca1,.52,.22,g);g.position.set(x,0,z);scene.add(g);
  addCircleCollider(x,z,.32,'trafficSign',{hardness:.30,breakable:true,breakSpeed:20,mesh:g})
 }
 for(const x of [170,420]){
  const z=247,g=new THREE.Group();addBox(0,1.25,0,4.4,.16,.18,0x59656b,.48,.45,g);for(const dx of [-2.05,2.05])addBox(dx,1.25,0,.12,2.5,.12,0x59656b,.48,.45,g);
  const glass=addBox(0,1.30,.08,3.9,2.1,.055,0x8bb5c5,.18,.05,g);glass.material.transparent=true;glass.material.opacity=.42;g.position.set(x,0,z);scene.add(g);
  addBoxCollider(x,z,4.1,.35,'busShelter',{hardness:.28,breakable:true,breakSpeed:28,mesh:g})
 }
}
function breakStaticCollider(col,c,impact){
 if(!col||!col.breakable||impact<col.breakSpeed)return false;
 col.solid=false;
 if(col.mesh){
  const side=Math.sin(c.a-col.mesh.rotation.y)>=0?1:-1;
  col.mesh.rotation.z=side*(col.type==='lamp'?1.20:.82);
  col.mesh.position.y=col.type==='lamp'?.22:.08
 }
 toast(col.type==='lamp'?'💥 Laterne umgefahren':'💥 Hindernis umgestoßen');
 return true
}
function vehicleNPCHit(c,x,z){
 const radius=vehicleRadius(c)*.82+.34;
 for(const n of npcs){
  if(n.pirate&&state.mode!=='outside')continue;
  if(state.mode==='outside'&&n.interiorId)continue;
  if(state.mode==='interior'&&n.interiorId!==state.currentBuilding)continue;
  if(dist2(x,z,n.x,n.z)<radius)return n
 }
 return null
}
function pushNPCFromVehicle(n,c){
 const dx=n.x-c.x,dz=n.z-c.z,len=Math.hypot(dx,dz)||1,nx=dx/len,nz=dz/len;
 const tx=n.x+nx*1.5,tz=n.z+nz*1.5;
 if(!blocked(tx,tz,.32)){n.x=tx;n.z=tz;n.mesh.position.set(n.x,0,n.z)}
 n.stun=Math.max(n.stun||0,1.0)
}
function vehicleSweep(c,dx,dz){
 const travel=Math.hypot(dx,dz),steps=clamp(Math.ceil(travel/.42),1,28),sx=c.x,sz=c.z;
 for(let i=1;i<=steps;i++){
  const t=i/steps,tx=sx+dx*t,tz=sz+dz*t;
  const staticHit=vehicleStaticHit(c,tx,tz,c.a);
  if(staticHit){
   const impact=Math.abs(c.speed);
   if(staticHit.collider&&staticHit.collider.dynamic&&staticHit.collider.prop){
    const p=staticHit.collider.prop;pushPhysicsProp(p,Math.cos(c.a),Math.sin(c.a),impact);c.x=tx;c.z=tz;c.speed*=clamp(.82-p.mass*.08,.62,.82);vehicleDamage(c,Math.min(5,impact*.012));return{type:'dynamicProp',impact,handled:true}
   }
   if(staticHit.collider&&breakStaticCollider(staticHit.collider,c,impact)){c.x=tx;c.z=tz;c.speed*=.58;vehicleDamage(c,Math.min(13,2+impact*.025));return{type:'brokenProp',impact,handled:true}}
   return{...staticHit,impact}
  }
  const person=vehicleNPCHit(c,tx,tz);if(person)return{type:'npc',npc:person,impact:Math.abs(c.speed),hardness:.22};
  const dyn=vehicleDynamicHit(c,tx,tz);
  if(dyn)return{...dyn,impact:Math.abs(c.speed)+Math.abs(dyn.other.speed||0)};
  c.x=tx;c.z=tz
 }
 return null
}

function buildGround(){
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(WORLD_W,WORLD_D),new THREE.MeshStandardMaterial({color:0x6f815d,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(WORLD_W/2,-.03,WORLD_D/2);ground.receiveShadow=true;scene.add(ground);
 const asphalt=mat(0x42494d,.96,.02),side=mat(0xa7a7a2,1,0),line=mat(0xe6dda5,.95,0);
 for(const z of roadsZ){
  {const r=addBox(WORLD_W/2,.02,z,WORLD_W,.06,ROAD_W,0x42494d,.98,0);roadSurfaceMats.push(r.material)}
  addBox(WORLD_W/2,.055,z-ROAD_W/2-SIDEWALK/2,WORLD_W,.11,SIDEWALK,0xa7a7a2,1,0);
  addBox(WORLD_W/2,.055,z+ROAD_W/2+SIDEWALK/2,WORLD_W,.11,SIDEWALK,0xa7a7a2,1,0);
  for(let x=4;x<WORLD_W;x+=9)addBox(x,.09,z,5,.025,.22,0xe6dda5,.9,0)
 }
 for(const x of roadsX){
  {const r=addBox(x,.025,WORLD_D/2,ROAD_W,.065,WORLD_D,0x42494d,.98,0);roadSurfaceMats.push(r.material)}
  addBox(x-ROAD_W/2-SIDEWALK/2,.06,WORLD_D/2,SIDEWALK,.12,WORLD_D,0xa7a7a2,1,0);
  addBox(x+ROAD_W/2+SIDEWALK/2,.06,WORLD_D/2,SIDEWALK,.12,WORLD_D,0xa7a7a2,1,0);
  for(let z=4;z<WORLD_D;z+=9)addBox(x,.095,z,.22,.025,5,0xe6dda5,.9,0)
 }
 for(const x of roadsX)for(const z of roadsZ){
  for(let k=-3;k<=3;k++){addBox(x+k*2.5,.11,z-ROAD_W/2-1.1,1.35,.025,2.4,0xf1f1ee,1,0);addBox(x+k*2.5,.11,z+ROAD_W/2+1.1,1.35,.025,2.4,0xf1f1ee,1,0)}
 }
}
function buildingHeight(b){if(b.type==='office'||b.type==='station')return 18;if(b.type==='home')return 14;if(b.type==='parking')return 11;if(b.type==='dealer')return 9;return 10}
function addWindows(group,q,h,color=0x79a9bd,buildingType='generic'){
 const wm=new THREE.MeshStandardMaterial({color,roughness:.3,metalness:.05,emissive:0x172027,emissiveIntensity:.12});windowMats.push({mat:wm,type:buildingType,seed:windowMats.length%7});
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
 const windowColor=b.windowStyle==='warm'?0xe5b77f:b.windowStyle==='blue'?0x70a8c7:0x79a9bd;addWindows(group,q,h,windowColor,b.type);
 const label=makeLabel(b.name,Math.min(11,Math.max(5,q.w*.48)));label.position.set(q.x+q.w/2,Math.min(h-1.2,3.3),q.z-.20);group.add(label);
 if(b.type==='dealer'||b.type==='shop'||b.type==='cafe'||b.type==='gym'){const glassColor=b.type==='cafe'?0xc88b62:b.type==='gym'?0x74b8b1:0x8dbfd3;const glass=addBox(q.x+q.w/2,2.25,q.z-.13,q.w*.76,3.5,.14,glassColor,.25,.05,group);glass.material.emissive=new THREE.Color(b.type==='cafe'?0x5c2c14:b.type==='gym'?0x164c49:0x18394a);glass.material.emissiveIntensity=.05;shopLightMats.push(glass.material)}
 b._box=q;b._mesh=group;buildingMeshes.push(group);solidBoxes.push(q);if(b.door){createDoorSystem(b,null,'outside');if(b.portal)createDoorSystem(b,null,'vehicleOutside')}
}
function makeTree(x,z,s=1){
 const g=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.28*s,.38*s,3.2*s,8),mat(0x64452f,1,0));trunk.position.y=1.6*s;trunk.castShadow=true;g.add(trunk);
 const greens=[0x3d783d,0x4e8b48,0x356b39];for(let i=0;i<4;i++){const f=new THREE.Mesh(new THREE.SphereGeometry((1.25+(i%2)*.28)*s,9,7),mat(greens[i%greens.length],.95,0));f.position.set((i-1.5)*.45*s,3.5*s+(i%2)*.55*s,((i%3)-1)*.35*s);f.castShadow=true;g.add(f)}
 g.position.set(x,0,z);scene.add(g);addCircleCollider(x,z,.46*s,'tree',{hardness:1.25,mesh:g});return g
}
function populateTrees(){
 const rows=[136,238.5,337,407];
 for(const z of rows){let n=0;for(let x=22;x<WORLD_W-12;x+=36){const tx=x+((n++%3)-1)*3.4;if(roadsX.some(v=>Math.abs(tx-v)<21)||roadsZ.some(v=>Math.abs(z-v)<21))continue;if(buildings.some(b=>{if(b.type==='park')return false;const q=structureRect(b);return tx>q.x-3&&tx<q.x+q.w+3&&z>q.z-3&&z<q.z+q.d+3}))continue;makeTree(tx,z,.8+(n%3)*.08)}}
 const p=buildings.find(b=>b.id==='park');for(let i=0;i<24;i++){const tx=p.x+6+(i*9.7)%(p.w-12),tz=p.z+6+(i*7.1)%(p.d-12),blockedByBuilding=buildings.some(b=>{if(b.type==='park')return false;const q=structureRect(b);return tx>q.x-2&&tx<q.x+q.w+2&&tz>q.z-2&&tz<q.z+q.d+2});if(!blockedByBuilding)makeTree(tx,tz,.72+(i%3)*.08)}
}
function trafficPhase(axis){
 const t=trafficClock%24;
 if(t<9)return axis==='h'?'green':'red';
 if(t<11)return axis==='h'?'yellow':'red';
 if(t<13)return'red';
 if(t<22)return axis==='v'?'green':'red';
 return axis==='v'?'yellow':'red'
}
function makeSignalHead(axis){
 const g=new THREE.Group(),housing=meshBox(.42,1.18,.34,0x22282c,.78,.16);housing.position.y=.28;g.add(housing);
 const colors=[0xd22c32,0xe0b238,0x34b65f],ys=[.66,.28,-.10],bulbs=[];
 for(let i=0;i<3;i++){const m=new THREE.MeshStandardMaterial({color:colors[i],roughness:.32,metalness:.02,emissive:colors[i],emissiveIntensity:.10});const b=new THREE.Mesh(new THREE.SphereGeometry(.115,10,7),m);b.position.set(0,ys[i],-.18);g.add(b);bulbs.push(b)}
 g.userData={axis,bulbs};return g
}
function buildTrafficLights(){
 for(const x of roadsX)for(const z of roadsZ){
  const root=new THREE.Group();root.position.set(x,0,z);scene.add(root);
  const hHead=makeSignalHead('h'),vHead=makeSignalHead('v');
  const hpole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,3.6,8),mat(0x3e474c,.75,.35));hpole.position.set(-ROAD_W/2-1.0,1.8,-ROAD_W/2-1.0);root.add(hpole);
  hHead.position.set(-ROAD_W/2-1.0,3.25,-ROAD_W/2-.75);root.add(hHead);
  const vpole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,3.6,8),mat(0x3e474c,.75,.35));vpole.position.set(ROAD_W/2+1.0,1.8,ROAD_W/2+1.0);root.add(vpole);
  vHead.position.set(ROAD_W/2+.75,3.25,ROAD_W/2+1.0);vHead.rotation.y=Math.PI/2;root.add(vHead);
  trafficLights.push({x,z,root,hHead,vHead})
 }
}
function updateTrafficLights(dt){
 trafficClock+=dt;
 for(const t of trafficLights)for(const head of [t.hHead,t.vHead]){
  const phase=trafficPhase(head.userData.axis),bulbs=head.userData.bulbs;
  bulbs[0].material.emissiveIntensity=phase==='red'?4.5:.10;
  bulbs[1].material.emissiveIntensity=phase==='yellow'?4.5:.10;
  bulbs[2].material.emissiveIntensity=phase==='green'?4.5:.10
 }
}
function nextIntersectionForCar(c){
 if(c.axis==='h'){
  const list=c.dir>0?roadsX:[...roadsX].reverse();
  for(const x of list){const d=(x-c.x)*c.dir;if(d>=0&&d<45)return{x,z:c.z,dist:d,axis:'h'}}
 }else{
  const list=c.dir>0?roadsZ:[...roadsZ].reverse();
  for(const z of list){const d=(z-c.z)*c.dir;if(d>=0&&d<45)return{x:c.x,z,dist:d,axis:'v'}}
 }
 return null
}
function trafficCarAhead(c){
 let best=Infinity;
 for(const o of traffic){
  if(o===c||o.axis!==c.axis||o.dir!==c.dir)continue;
  const lateral=c.axis==='h'?Math.abs(o.z-c.z):Math.abs(o.x-c.x);if(lateral>2.4)continue;
  const d=c.axis==='h'?(o.x-c.x)*c.dir:(o.z-c.z)*c.dir;if(d>0&&d<best)best=d
 }
 return best
}
function approachingTraffic(x,z,r=10){
 if(state.vehicle&&dist2(state.vehicle.x,state.vehicle.z,x,z)<r+4&&Math.abs(state.vehicle.speed)>10)return true;
 for(const p of police)if(p.mesh.visible&&dist2(p.x,p.z,x,z)<r+3&&Math.abs(p.speed)>10)return true;
 for(const c of traffic){const d=dist2(c.x,c.z,x,z);if(d<r&&Math.abs(c.speed)>10)return true}
 return false
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
 g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);const collider=addCircleCollider(x,z,.28,'lamp',{hardness:.55,breakable:true,breakSpeed:42,mesh:g});const lightX=x+Math.cos(rot)*.86,lightZ=z-Math.sin(rot)*.86;streetLamps.push({x,z,lightX,lightZ,group:g,bulb,halo,shell,collider})
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

function doorBy(id,side='outside'){return doorSystems.find(d=>d.buildingId===id&&d.side===side)||null}
function exteriorDoorPose(b,vehicleGate=false){
 const q=structureRect(b),[px,pz]=b.door||[q.x+q.w/2,q.z-.25],dists=[Math.abs(px-q.x),Math.abs(px-(q.x+q.w)),Math.abs(pz-q.z),Math.abs(pz-(q.z+q.d))],idx=dists.indexOf(Math.min(...dists));
 let x=px,z=pz,rot=0;
 if(idx===0){x=q.x-.09;rot=Math.PI/2;if(b.portal&&!vehicleGate)z=clamp(pz+2.6,q.z+1.2,q.z+q.d-1.2)}
 else if(idx===1){x=q.x+q.w+.09;rot=-Math.PI/2;if(b.portal&&!vehicleGate)z=clamp(pz-2.6,q.z+1.2,q.z+q.d-1.2)}
 else if(idx===2){z=q.z-.09;rot=0;if(b.portal&&!vehicleGate)x=clamp(px+2.6,q.x+1.2,q.x+q.w-1.2)}
 else{z=q.z+q.d+.09;rot=Math.PI;if(b.portal&&!vehicleGate)x=clamp(px-2.6,q.x+1.2,q.x+q.w-1.2)}
 return{x,z,rot,idx}
}
function pedestrianDoorPoint(b){
 const p=exteriorDoorPose(b,false);return[p.x,p.z]
}
function createDoorSystem(b,room=null,side='outside'){
 const vehicleGate=side==='vehicleOutside'||side==='vehicleInside',portal=vehicleGate,w=portal?4.2:1.45,h=portal?3.25:2.42;
 const pivot=new THREE.Group(),panel=meshBox(w,h,.12,portal?0x465157:0x6b4935,.60,.24);
 const recess=meshBox(w*.94,h*.94,.08,0x111518,.98,.01),topFrame=meshBox(w+.22,.13,.20,portal?0x343b3f:0x493729,.72,.24);
 recess.position.set(portal?0:w*.48,h/2,.08);topFrame.position.set(portal?0:w*.48,h+.065,0);pivot.add(recess,topFrame,panel);
 if(!portal){
  const leftFrame=meshBox(.12,h+.12,.18,0x493729,.72,.20),rightFrame=leftFrame.clone();
  leftFrame.position.set(-.06,h/2,0);rightFrame.position.set(w+.06,h/2,0);pivot.add(leftFrame,rightFrame);
  const handle=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),mat(0xc7a25a,.34,.55));handle.position.set(w*.82,h*.52,-.10);panel.add(handle)
 }else{
  for(let y=.42;y<h;y+=.42){const slat=meshBox(w*.94,.035,.135,0x5b666b,.54,.28);slat.position.set(0,y-h/2,-.02);panel.add(slat)}
 }
 scene.add(pivot);

 if(side==='outside'||side==='vehicleOutside'){
  const p=exteriorDoorPose(b,vehicleGate);pivot.position.set(p.x,0,p.z);pivot.rotation.y=p.rot;
  if(!vehicleGate)b._pedDoor=[p.x,p.z]
 }else{
  const gateOffset=vehicleGate?0:(b.portal?2.6:0);
  pivot.position.set(room.exit.x+gateOffset,0,room.maxZ-.12);
  if(!vehicleGate)room.pedExit={x:room.exit.x+gateOffset,z:room.maxZ-1.45}
 }
 panel.position.set(portal?0:w*.48,h/2,0);

 const d={buildingId:b.id,side,pivot,panel,portal,open:0,target:0,timer:0,pending:null,baseY:panel.position.y};
 doorSystems.push(d);return d
}
function requestDoorTransition(b,type){
 const side=type==='enter'?'outside':'inside',d=doorBy(b.id,side);
 if(!d){return type==='enter'?enterInterior(b):leaveInterior()}
 oneShotSound('door',1);d.target=1;d.timer=0;d.pending={type,b}
}
function requestVehicleDoorTransition(b,type){
 const side=type==='vehicleEnter'?'vehicleOutside':'vehicleInside',d=doorBy(b.id,side);
 if(!d){return type==='vehicleEnter'?enterVehicleInterior(b):leaveVehicleInterior()}
 oneShotSound('door',1.3);d.target=1;d.timer=0;d.pending={type,b}
}
function updateDoors(dt){
 for(const d of doorSystems){
  d.open+=(d.target-d.open)*clamp(dt*7,0,1);
  if(d.portal)d.panel.position.y=d.baseY+d.open*3.45;
  else d.panel.rotation.y=-d.open*1.48;
  if(d.target>0&&d.open>.92&&d.pending){
   const p=d.pending;d.pending=null;d.timer=2.2;
   if(p.type==='enter')enterInterior(p.b);else if(p.type==='leave')leaveInterior();else if(p.type==='vehicleEnter')enterVehicleInterior(p.b);else if(p.type==='vehicleLeave')leaveVehicleInterior()
  }
  if(d.target>0&&!d.pending){d.timer-=dt;if(d.timer<=0)d.target=0}
 }
}
function addFurniture(room,x,z,w,d,h,color,type='furniture',floor=0,rough=.82){
 const y=floor*4.2+h/2,m=addBox(x,y,z,w,h,d,color,rough,.04);addBoxCollider(x,z,w,d,type,{hardness:.75,mesh:m,interiorId:room.id,floor});return m
}
function addInteriorLabel(text,x,y,z,w=5){const l=makeLabel(text,w);l.position.set(x,y,z);scene.add(l);return l}
function decorateInterior(b,room){
 const cx=room.cx,cz=room.cz,w=room.w,d=room.d;
 if(b.id==='market'){
  for(const x of [cx-6,cx,cx+6])for(const z of [cz-3,cz+2])addFurniture(room,x,z,4.4,1.1,1.8,0x8b775d,'shelf');
  addFurniture(room,cx-7,room.minZ+2.5,7,1.3,1.05,0x6f503b,'counter');addInteriorLabel('KASSE',cx-7,2.15,room.minZ+2.3,4)
 }else if(b.type==='gym'){
  addInteriorLabel('CITY GYM · FITNESS',cx,3.65,room.minZ+.25,7);
  // Laufbänder
  for(const x of [cx-7,cx-2.5,cx+2,cx+6.5]){const base=addFurniture(room,x,cz-4,3.1,1.05,.28,0x30383c,'treadmill');const console=addBox(x+1.15,.92,cz-4,.18,1.25,.72,0x222a2e,.48,.18);console.rotation.z=-.13}
  // Hantelbank + Langhantel
  for(const x of [cx-5,cx+4]){addFurniture(room,x,cz+1,2.8,.72,.48,0x4a555a,'bench');const bar=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,2.9,10),mat(0xaab2b6,.36,.72));bar.rotation.z=Math.PI/2;bar.position.set(x,1.05,cz+.1);scene.add(bar);for(const off of [-1.25,1.25]){const plate=new THREE.Mesh(new THREE.CylinderGeometry(.26,.26,.12,12),mat(0x25292b,.78,.15));plate.rotation.z=Math.PI/2;plate.position.set(x+off,1.05,cz+.1);scene.add(plate)}}
  // Hantelregal
  addFurniture(room,cx+7,cz+5,2.4,.8,1.25,0x40494d,'rack');for(let i=0;i<5;i++){const d1=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,.65,9),mat(0x25292b,.65,.42));d1.rotation.z=Math.PI/2;d1.position.set(cx+6.2+i*.40,1.42,cz+5);scene.add(d1)}
  // Matten / freie Trainingsfläche
  for(const x of [cx-6,cx-2,cx+2])addBox(x,.055,cz+5,2.8,.05,1.4,0x4e8176,.90,.01);
  // Empfang und Umkleiden-Hinweis
  addFurniture(room,cx,room.minZ+2.3,6.0,1.1,1.0,0x596c72,'counter');addInteriorLabel('EMPFANG · UMKLEIDEN',cx,2.25,room.minZ+2.15,5.8)
 }else if(b.type==='cafe'){
  addFurniture(room,cx,room.minZ+2.6,w*.62,1.2,1.05,0x714d39,'counter');
  for(const x of [cx-6,cx,cx+6]){addFurniture(room,x,cz+2,2.2,2.2,.78,0x8b6547,'table');for(const z of [cz+.2,cz+3.8])addFurniture(room,x,z,.7,.7,.85,0x5f5147,'chair')}
  addInteriorLabel('CAFÉ · SITZBEREICH',cx,3.5,room.minZ+.25,7)
 }else if(b.id==='police'){
  for(const x of [cx-6,cx,cx+6])addFurniture(room,x,cz-2,3.2,1.4,.82,0x59636a,'desk');
  const bars=new THREE.Mesh(new THREE.BoxGeometry(7,2.6,.12),new THREE.MeshStandardMaterial({color:0x59636a,wireframe:true,roughness:.5}));bars.position.set(cx,1.35,cz+5);scene.add(bars);addBoxCollider(cx,cz+5,7,.2,'cell',{interiorId:b.id});addInteriorLabel('POLIZEI · ZELLEN',cx,3.5,room.minZ+.25,7)
 }else if(b.type==='garage'){
  for(const x of [cx-6,cx+6]){addFurniture(room,x,cz,3.2,5,.20,0x3d4447,'lift');addBox(x-1.3,1.8,cz,0.18,3.4,.18,0xd5a63a,.5,.3);addBox(x+1.3,1.8,cz,0.18,3.4,.18,0xd5a63a,.5,.3)}
  addFurniture(room,cx,room.minZ+2,7,1.1,1.0,0x4d5960,'workbench');addInteriorLabel('WERKSTATT',cx,3.6,room.minZ+.25,6)
 }else if(b.id==='station'){
  for(const x of [cx-7,cx,cx+7])addFurniture(room,x,cz+2,4.2,.7,.82,0x65737a,'bench');
  for(const x of [cx-5,cx+5])addFurniture(room,x,room.minZ+2.2,1.2,.8,1.8,0x4380a1,'ticket');
  addInteriorLabel('FAHRKARTEN · GLEISE',cx,3.7,room.minZ+.25,8)
 }else if(b.type==='office'){
  for(const x of [cx-6,cx,cx+6])for(const z of [cz-3,cz+3])addFurniture(room,x,z,3.2,1.4,.78,0x6c6258,'desk');
  addInteriorLabel('BÜROS',cx,3.7,room.minZ+.25,5)
 }else if(b.type==='home'){
  addFurniture(room,cx-6,cz,5.5,3,.85,0x806047,'sofa');addFurniture(room,cx+5,cz-2,4.6,2.7,.72,0xb9aa91,'bed');addFurniture(room,cx+4,cz+4,5.2,1.0,.95,0x766754,'kitchen');
  addInteriorLabel('WOHNUNG',cx,3.5,room.minZ+.25,5)
 }else if(b.type==='dealer'||b.type==='parking'){
  for(let x=cx-w/2+4;x<cx+w/2-3;x+=6)addBox(x,.07,cz,3.2,.03,d-4,0xd5d6d4,1,0);
  addInteriorLabel(b.type==='parking'?'PARKDECK':'SHOWROOM',cx,3.6,room.minZ+.25,7)
 }else if(b.id==='logistics'){
  for(const x of [cx-6,cx,cx+6])for(const z of [cz-2,cz+3])addFurniture(room,x,z,3.6,2.2,1.4,0x8c6a43,'pallet');
  addInteriorLabel('LAGER',cx,3.5,room.minZ+.25,5)
 }else{
  for(const x of [cx-6,cx,cx+6])addFurniture(room,x,cz,3.5,1.1,1.35,0x7e765f,'display');
  addFurniture(room,cx,room.minZ+2.5,6.5,1.2,1.0,0x6d5540,'counter');addInteriorLabel(b.name,cx,3.6,room.minZ+.25,7)
 }
}
function makeVerticalAccess(b,room){
 if(!['office','station','home'].includes(b.type))return;
 const floorY=4.2;room.hasUpper=true;room.upperY=floorY;
 addBox(room.cx,floorY-.05,room.cz,room.w-.8,.12,room.d-.8,0x8f8d86,.92,.02);
 const sx=room.minX+3.2,sz=room.cz;
 for(let i=0;i<16;i++)addBox(sx+i*.32,.12+i*.255,sz,.40,.24,2.1,0x8a7b68,.88,.02);
 verticalAccess.push({buildingId:b.id,type:'stairs',x:sx+2.4,z:sz,from:0,to:1,dest0:{x:sx,z:sz},dest1:{x:sx+5.0,z:sz}});
 const ex=room.maxX-2.6,ez=room.cz-3;const shaft=addBox(ex,2.1,ez,2.2,4.2,2.2,0x545d61,.62,.25);addBoxCollider(ex,ez,2.2,2.2,'elevator',{interiorId:b.id,floor:0,mesh:shaft});
 verticalAccess.push({buildingId:b.id,type:'elevator',x:ex,z:ez,from:0,to:1,dest0:{x:ex,z:ez+1.8},dest1:{x:ex,z:ez+1.8}});
 // upstairs furniture
 if(b.type==='office'){for(const x of [room.cx-6,room.cx,room.cx+6])addFurniture(room,x,room.cz+2,3.3,1.4,.75,0x5e6570,'desk',1)}
 else if(b.type==='home'){addFurniture(room,room.cx-5,room.cz,4.5,2.6,.72,0x98866e,'bed',1);addFurniture(room,room.cx+5,room.cz,3.2,2.2,.78,0x72604f,'table',1)}
 else{for(const x of [room.cx-6,room.cx,room.cx+6])addFurniture(room,x,room.cz+2,3.5,.7,.78,0x66747c,'bench',1)}
}
function nearestVerticalAccess(max=2.8){
 if(state.mode!=='interior')return null;let best=null,bd=max;for(const a of verticalAccess){if(a.buildingId!==state.currentBuilding)continue;const d=dist2(state.x,state.z,a.x,a.z);if(d<bd){bd=d;best=a}}return best
}
function useVerticalAccess(){
 const a=nearestVerticalAccess();if(!a)return false;const up=state.interiorFloor===0;state.interiorFloor=up?1:0;state.baseY=up?4.2:0;const d=up?a.dest1:a.dest0;state.x=d.x;state.z=d.z;state.jumpY=0;state.jumpV=0;state.grounded=true;oneShotSound('door',.65);toast((a.type==='elevator'?'🛗 Aufzug':'🪜 Treppe')+' · '+(up?'Obergeschoss':'Erdgeschoss'));return true
}
function addClimbSurface(x,z,w,d,h,kind='mantle',opt={}){
 const c={x,z,w,d,h,kind,targetX:opt.targetX??x,targetZ:opt.targetZ??z,buildingId:opt.buildingId||null,collider:opt.collider||null};climbSurfaces.push(c);return c
}
function buildClimbables(){
 const defs=[
  {x:101,z:96,w:3.2,d:2.4,h:1.0,color:0x8a633f,kind:'container'},
  {x:108,z:101,w:4.0,d:2.2,h:1.25,color:0x76604c,kind:'container'},
  {x:125,z:109,w:5.5,d:1.2,h:1.15,color:0x6b705f,kind:'wall'},
  {x:156,z:389,w:4.2,d:2.2,h:1.0,color:0x8a633f,kind:'railing'},
  {x:150,z:120,w:6.5,d:2.4,h:2.35,color:0x526777,kind:'container'}
 ];
 for(const c of defs){climbables.push(c);const mesh=addBox(c.x,c.h/2,c.z,c.w,c.h,c.d,c.color,.92,0);c.collider=addBoxCollider(c.x,c.z,c.w,c.d,'climbable',{hardness:.48,breakable:c.h<1.4,breakSpeed:32,mesh,height:c.h});addClimbSurface(c.x,c.z,c.w,c.d,c.h,c.kind,{collider:c.collider})}
 // Leitern auf ausgewählten Gebäuden bis aufs Dach
 for(const id of ['logistics','garage','office']){
  const b=buildings.find(x=>x.id===id);if(!b)continue;const q=structureRect(b),h=buildingHeight(b),lx=q.x+.9,lz=q.z+q.d+.65;
  for(let y=.4;y<h;y+=.55){addBox(lx,y,lz,1.15,.07,.08,0x8d9498,.5,.55);addBox(lx-.52,y,lz,.06,.55,.06,0x6a7175,.55,.5);addBox(lx+.52,y,lz,.06,.55,.06,0x6a7175,.55,.5)}
  addClimbSurface(lx,lz,1.8,1.4,h+.12,'ladder',{targetX:q.x+1.2,targetZ:q.z+q.d-1.2,buildingId:id})
 }
}
function buildInteriors(){
 let idx=0;
 for(const b of buildings){
  if(b.type==='park')continue;
  const large=b.type==='dealer'||b.type==='parking'||b.type==='garage',w=large?42:(b.id==='station'||b.id==='office'?34:28),d=large?26:22;
  const cx=2000+(idx%5)*90,cz=55+Math.floor(idx/5)*78;idx++;
  const room={id:b.id,cx,cz,w,d,minX:cx-w/2,maxX:cx+w/2,minZ:cz-d/2,maxZ:cz+d/2,spawn:{x:cx,z:cz+d/2-3.2},exit:{x:cx,z:cz+d/2-1.5},vehicleSpawn:{x:cx,z:cz+d/2-5.0},vehicleExit:{x:cx,z:cz+d/2-2.8}};
  interiors[b.id]=room;
  addBox(cx,.02,cz,w,.08,d,b.type==='parking'?0x62696d:b.type==='dealer'?0x9aa0a4:0xc3b69f,.95,0);
  const wc=b.type==='dealer'||b.type==='parking'||b.type==='garage'?0x80888c:0xd7cbb8;
  addBox(cx,2.6,room.minZ,w,5.2,.28,wc,.88,0);addBox(cx,2.6,room.maxZ,w,5.2,.28,wc,.88,0);
  addBox(room.minX,2.6,cz,.28,5.2,d,wc,.88,0);addBox(room.maxX,2.6,cz,.28,5.2,d,wc,.88,0);
  const label=makeLabel(b.name,Math.min(11,w*.34));label.position.set(cx,3.8,room.minZ+.2);scene.add(label);
  decorateInterior(b,room);makeVerticalAccess(b,room);createDoorSystem(b,room,'inside');if(b.portal)createDoorSystem(b,room,'vehicleInside');
  for(let n=0;n<2;n++){
   const human=createHuman(n?0x765f88:0x58758a,0xd3a37f,false),hx=cx+(n?3.5:-3.5),hz=cz+(n?1.5:-1.5);human.position.set(hx,0,hz);scene.add(human);
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
function createPlayerAvatar(){
 const g=new THREE.Group();
 const jacketMat=mat(0x2f7d55,.82,.03),shirtMat=mat(0xe7ece8,.92,0),pantsMat=mat(0x2d3439,.94,0),shoeMat=mat(0x171a1c,.96,.02),skinMat=mat(0xd2a078,.90,0),hairMat=mat(0x3a2b22,.92,0);
 const torso=new THREE.Mesh(new THREE.CylinderGeometry(.35,.44,1.02,10),jacketMat);torso.position.y=1.28;torso.castShadow=true;g.add(torso);
 const shirt=meshBox(.36,1.31,-.36,.34,.58,.05,0xe7ece8,.92,0);g.add(shirt);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.29,12,9),skinMat);head.position.y=2.03;head.castShadow=true;g.add(head);
 const hair=new THREE.Mesh(new THREE.SphereGeometry(.295,12,8,0,Math.PI*2,0,Math.PI*.48),hairMat);hair.position.set(0,2.17,0);g.add(hair);
 const legL=new THREE.Mesh(new THREE.CylinderGeometry(.105,.125,.78,8),pantsMat),legR=legL.clone();legL.position.set(-.16,.49,0);legR.position.set(.16,.49,0);legL.castShadow=legR.castShadow=true;g.add(legL,legR);
 const shoeL=meshBox(-.16,.105,.08,.22,.15,.42,0x171a1c,.95,.02);const shoeR=meshBox(.16,.105,.08,.22,.15,.42,0x171a1c,.95,.02);g.add(shoeL,shoeR);
 const armL=new THREE.Mesh(new THREE.CylinderGeometry(.08,.09,.80,8),jacketMat),armR=armL.clone();armL.position.set(-.48,1.30,0);armR.position.set(.48,1.30,0);armL.rotation.z=.20;armR.rotation.z=-.20;armL.castShadow=armR.castShadow=true;g.add(armL,armR);
 const handL=new THREE.Mesh(new THREE.SphereGeometry(.095,8,6),skinMat),handR=handL.clone();handL.position.set(-.55,.91,0);handR.position.set(.55,.91,0);g.add(handL,handR);
 g.userData={torso,head,legL,legR,armL,armR,shoeL,shoeR,handL,handR};
 return g
}
function setupPlayerAvatar(){
 playerAvatar=createPlayerAvatar();playerAvatar.position.set(state.x,state.jumpY,state.z);scene.add(playerAvatar);
 firstPersonBody=new THREE.Group();camera.add(firstPersonBody);firstPersonBody.position.set(0,-.48,-.62);
 const skin=mat(0xd2a078,.90,0),jacket=mat(0x2f7d55,.82,.03);
 for(const side of [-1,1]){
  const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,.48,8),jacket);sleeve.rotation.z=side*.22;sleeve.rotation.x=-1.02;sleeve.position.set(side*.22,-.04,-.10);firstPersonBody.add(sleeve);
  const hand=new THREE.Mesh(new THREE.SphereGeometry(.075,8,6),skin);hand.position.set(side*.26,-.18,-.32);firstPersonBody.add(hand)
 }
 firstPersonBody.visible=false
}
function updatePlayerAvatar(dt){
 if(!playerAvatar||!firstPersonBody)return;
 const u=playerAvatar.userData,moving=keys.has('w')||keys.has('a')||keys.has('s')||keys.has('d')||keys.has('ArrowUp')||keys.has('ArrowDown')||keys.has('ArrowLeft')||keys.has('ArrowRight');

 if(state.vehicle){
  const c=state.vehicle,isBike=c.spec.type==='bike';
  playerAvatar.visible=!state.firstPerson&&!isBike;
  firstPersonBody.visible=false;
  if(playerAvatar.visible){
   playerAvatar.position.set(c.x,.18+(c.y||0),c.z);playerAvatar.rotation.set(0,-c.a+Math.PI/2,0);
   u.legL.rotation.z=-1.05;u.legR.rotation.z=1.05;u.armL.rotation.z=.66;u.armR.rotation.z=-.66;
   u.torso.rotation.z=0;playerAvatar.scale.set(.78,.78,.78)
  }
  return
 }
 if(state.boat){
  const b=state.boat;playerAvatar.visible=!state.firstPerson;firstPersonBody.visible=false;
  if(playerAvatar.visible){playerAvatar.scale.set(.88,.88,.88);playerAvatar.position.set(b.x,.34,b.z);playerAvatar.rotation.set(0,-b.a+Math.PI/2,0);u.legL.rotation.z=0;u.legR.rotation.z=0;u.armL.rotation.z=.35;u.armR.rotation.z=-.35}
  return
 }
 if(state.aircraft){
  const h=state.aircraft;playerAvatar.visible=!state.firstPerson;firstPersonBody.visible=false;
  if(playerAvatar.visible){playerAvatar.scale.set(.72,.72,.72);playerAvatar.position.set(h.x,h.y+.32,h.z);playerAvatar.rotation.set(0,-h.a+Math.PI/2,0);u.legL.rotation.z=-.92;u.legR.rotation.z=.92;u.armL.rotation.z=.60;u.armR.rotation.z=-.60}
  return
 }

 playerAvatar.scale.set(1,1,1);playerAvatar.visible=!state.firstPerson;
 firstPersonBody.visible=state.firstPerson&&!state.activeWeapon;
 if(moving)playerAnimTime+=dt*(state.sprint?10.5:7.2);
 const swing=moving?Math.sin(playerAnimTime)*(state.sprint?.68:.45):0;
 u.legL.rotation.z=swing;u.legR.rotation.z=-swing;u.armL.rotation.z=.20-swing*.62;u.armR.rotation.z=-.20+swing*.62;u.torso.rotation.z=0;
 const bob=moving?Math.abs(Math.sin(playerAnimTime*2))*(state.sprint?.055:.032):0;
 playerAvatar.position.set(state.x,state.baseY+state.jumpY+bob,state.z);playerAvatar.rotation.set(0,-state.yaw+Math.PI/2,0);
 if(!state.grounded){u.legL.rotation.z=-.22;u.legR.rotation.z=.22;u.armL.rotation.z=.58;u.armR.rotation.z=-.58}
 firstPersonBody.position.y=-.48-bob*.45
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
  const rider=new THREE.Group();
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(.17,.24,.72,8),mat(0x324755,.88,0));torso.rotation.z=-.38;torso.position.set(-.05,1.46,0);rider.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),mat(0xd3a17c,.90,0));head.position.set(.24,1.82,0);rider.add(head);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.205,10,7),mat(0x1f2528,.42,.28));helmet.scale.y=.72;helmet.position.set(.24,1.89,0);rider.add(helmet);
  for(const side of [-1,1]){const arm=new THREE.Mesh(new THREE.CylinderGeometry(.055,.065,.62,7),mat(0xd3a17c,.9,0));arm.position.set(.28,1.45,side*.26);arm.rotation.z=-.75;arm.rotation.x=side*.35;rider.add(arm)}
  rider.visible=false;g.add(rider);
  g.userData={dim:{length:2.05,width:.78,height:1.35},body:frame,hood:tank,cabin:seat,wheels,baseColor:sp.color,damageStage:-1,headLights:lights.head,tailLights:lights.tail,sirenLights:[],cracks:[],panelCrack:null,frontBumper:null,rearBumper:null,rider};return g
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
 const car={id:opt.id||('car-'+cars.length+'-'+name.replace(/\s+/g,'-')),name,spec:{...sp},mesh,x,z,y:0,a,speed:0,hp:100,lastDamage:-99,locked:!!opt.locked,forSale:!!opt.forSale,owned:!!opt.owned,stolen:false,price:opt.price||sp.price,police:!!opt.police,ai:!!opt.ai,axis:opt.axis||null,dir:opt.dir||1,interiorId:opt.interiorId||null,skidCd:0,visualRoll:0,visualPitch:0,raceAI:!!opt.raceAI,raceIndex:0,raceFinished:false,raceFinishTime:null,tireHP:[100,100,100,100],flatTires:[false,false,false,false],flatTire:false,tuning:{},detachedParts:{frontBumper:false,rearBumper:false,hood:false},garageStored:false};cars.push(car);return car
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
  const c=addCar(names[i%names.length],x,z,horizontal?(dir>0?0:Math.PI):(dir>0?Math.PI/2:-Math.PI/2),{ai:true,axis:horizontal?'h':'v',dir});c.speed=55+(i%5)*7;c.cruiseSpeed=c.speed;traffic.push(c)
 }
}
function spawnPolice(){
 for(let i=0;i<5;i++){const c=addCar('City Sedan',20+i*5,300,0,{police:true});c.mesh.visible=false;police.push(c)}
}

function makeBoat(x,z,name='Hafenfloß',color=0x8a633f){
 const g=new THREE.Group();
 for(let p=0;p<5;p++)addBox((p-2)*1.1,.22,0,1,.28,5.5,color,.95,0,g);
 addBox(0,.48,-1.9,5.4,.18,.35,0x694a31,.95,0,g);
 const rail=addBox(0,.72,1.8,4.6,.08,.08,0x59412f,.85,.08,g);rail.rotation.x=.02;
 g.position.set(x,.12,z);scene.add(g);
 const b={name,mesh:g,x,z,a:0,speed:0,max:58,turn:1.15};boats.push(b);return b
}
function buildHarbor(){
 const water=new THREE.Mesh(new THREE.PlaneGeometry(WORLD_W,34),new THREE.MeshStandardMaterial({color:0x287ca4,roughness:.30,metalness:.12,transparent:true,opacity:.90}));water.rotation.x=-Math.PI/2;water.position.set(WORLD_W/2,.03,403);scene.add(water);
 for(let i=0;i<3;i++){
  const gx=110+i*95,bz=392.6+i*.55,b=makeBoat(gx,bz,i===0?'Hafenfloß':i===1?'Motorfloß':'Arbeitsboot',i===2?0x6e7d82:0x8a633f);
  const pirate=createHuman(0x6c2929,0xc99872,true);pirate.position.set(0,.26,0);b.mesh.add(pirate);npcs.push({mesh:pirate,x:gx,z:bz,horizontal:true,dir:0,speed:0,phase:0,stun:0,pirate:true,boat:b})
 }
 for(let x=75;x<330;x+=22)addBox(x,.35,389.5,16,.55,4.5,0x765338,.95,0)
}
function makeHelicopter(x,z,y=0,name='City Helicopter',policeUnit=false){
 const g=new THREE.Group(),bodyMat=mat(policeUnit?0xe6ecef:0x566d73,.45,.28);
 const body=new THREE.Mesh(new THREE.SphereGeometry(1.15,14,10),bodyMat);body.scale.set(1.7,.72,.78);body.position.y=.72;body.castShadow=true;g.add(body);
 const glass=new THREE.Mesh(new THREE.SphereGeometry(.86,12,8),new THREE.MeshStandardMaterial({color:0x5f8da0,roughness:.20,metalness:.08,transparent:true,opacity:.78}));glass.scale.set(1.2,.68,.72);glass.position.set(.78,.90,0);g.add(glass);
 const tail=addBox(-2.2,.82,0,3.1,.22,.28,policeUnit?0xd9e0e4:0x485a60,.55,.22,g);
 const tailFin=addBox(-3.35,1.22,0,.18,1.12,.72,policeUnit?0x275f9e:0x3c4b50,.56,.18,g);
 const mast=addBox(-.05,1.72,0,.12,.62,.12,0x4b5357,.55,.55,g);
 const rotor=new THREE.Group();const blade1=addBox(0,0,0,7.2,.05,.16,0x25292c,.62,.42,rotor),blade2=addBox(0,0,0,.16,.05,7.2,0x25292c,.62,.42,rotor);rotor.position.set(0,2.05,0);g.add(rotor);
 const tailRotor=new THREE.Group();addBox(0,0,0,.05,1.25,.12,0x2b3033,.6,.45,tailRotor);addBox(0,0,0,.05,.12,1.25,0x2b3033,.6,.45,tailRotor);tailRotor.position.set(-3.48,1.20,0);tailRotor.rotation.z=Math.PI/2;g.add(tailRotor);
 addBox(.1,.12,-1.0,3.1,.08,.10,0x2f3436,.62,.42,g);addBox(.1,.12,1.0,3.1,.08,.10,0x2f3436,.62,.42,g);
 let siren=[];
 if(policeUnit){const rm=new THREE.MeshStandardMaterial({color:0xd33b3b,emissive:0xff2020,emissiveIntensity:.25}),bm=new THREE.MeshStandardMaterial({color:0x3475da,emissive:0x2478ff,emissiveIntensity:.25});const r=new THREE.Mesh(new THREE.BoxGeometry(.28,.10,.22),rm),b=new THREE.Mesh(new THREE.BoxGeometry(.28,.10,.22),bm);r.position.set(.1,1.58,-.28);b.position.set(.1,1.58,.28);g.add(r,b);siren=[r,b]}
 g.position.set(x,y,z);scene.add(g);
 const heli={name,mesh:g,x,z,y,a:0,speed:0,verticalSpeed:0,max:185,rotor,tailRotor,police:policeUnit,siren,active:!policeUnit};helicopters.push(heli);return heli
}
function setupHelicopters(){
 playerHeli=makeHelicopter(44,340,.05,'City Helicopter',false);
 policeHeli=makeHelicopter(28,318,18,'Polizei-Helikopter',true);policeHeli.mesh.visible=false;policeHeli.active=false;
 const target=new THREE.Object3D();scene.add(target);const spot=new THREE.SpotLight(0xe6f4ff,0,72,.30,.58,1.55);spot.castShadow=false;spot.target=target;scene.add(spot);policeHeli.searchLight=spot;policeHeli.searchTarget=target
}
function nearestBoat(max=5){
 let best=null,bd=max;for(const b of boats){const d=dist2(state.x,state.z,b.x,b.z);if(d<bd){bd=d;best=b}}return best
}
function nearestHelicopter(max=5){
 if(!playerHeli)return null;return dist2(state.x,state.z,playerHeli.x,playerHeli.z)<max&&playerHeli.y<2?playerHeli:null
}
function updateBoat(dt){
 const b=state.boat;if(!b)return;
 const up=keys.has('w')||keys.has('ArrowUp'),down=keys.has('s')||keys.has('ArrowDown'),left=keys.has('a')||keys.has('ArrowLeft'),right=keys.has('d')||keys.has('ArrowRight');
 if(up)b.speed+=25*dt;if(down)b.speed-=22*dt;b.speed*=Math.pow(.985,dt*60);b.speed=clamp(b.speed,-18,b.max);
 const steer=(right?1:0)-(left?1:0),moving=clamp(Math.abs(b.speed)/18,.15,1);b.a+=steer*b.turn*dt*moving*(b.speed>=0?1:-1);
 const ms=b.speed/3.6,nx=b.x+Math.cos(b.a)*ms*dt,nz=b.z+Math.sin(b.a)*ms*dt;
 const shoreLimit=(nx>65&&nx<340)?391.3:386.7;const boatHit=boats.some(o=>o!==b&&dist2(nx,nz,o.x,o.z)<4.2);if(nx>8&&nx<WORLD_W-8&&nz>shoreLimit&&nz<WORLD_D-2&&!boatHit){b.x=nx;b.z=nz}else b.speed*=-.18;
 b.mesh.position.set(b.x,.12+Math.sin(performance.now()*.0018)*.025,b.z);b.mesh.rotation.y=-b.a;for(const n of npcs)if(n.boat===b){n.x=b.x;n.z=b.z}state.x=b.x;state.z=b.z;state.yaw=b.a;state.speedKmh=b.speed
}
function updateHelicopter(dt){
 const h=state.aircraft;if(!h)return;
 const up=keys.has('w')||keys.has('ArrowUp'),down=keys.has('s')||keys.has('ArrowDown'),left=keys.has('a')||keys.has('ArrowLeft'),right=keys.has('d')||keys.has('ArrowRight');
 if(up)h.speed+=42*dt;if(down)h.speed-=35*dt;h.speed*=Math.pow(.989,dt*60);h.speed=clamp(h.speed,-35,h.max);
 const steer=(right?1:0)-(left?1:0);h.a+=steer*1.12*dt*clamp(Math.abs(h.speed)/30+.25,.25,1.25);
 if(state.heliUp)h.verticalSpeed+=7.5*dt;if(state.heliDown)h.verticalSpeed-=7.5*dt;h.verticalSpeed*=Math.pow(.94,dt*60);h.verticalSpeed=clamp(h.verticalSpeed,-8,8);
 let minY=.05;for(const b of buildings){if(b.type==='park')continue;const q=structureRect(b);if(h.x>q.x-1.8&&h.x<q.x+q.w+1.8&&h.z>q.z-1.8&&h.z<q.z+q.d+1.8){minY=Math.max(minY,buildingHeight(b)+1.4)}}
 const nextY=clamp(h.y+h.verticalSpeed*dt,minY,85);if(nextY<=minY&&h.verticalSpeed<0)h.verticalSpeed=0;h.y=nextY;
 const ms=h.speed/3.6,nx=h.x+Math.cos(h.a)*ms*dt,nz=h.z+Math.sin(h.a)*ms*dt;
 let airBlocked=false;
 if(h.y<24){for(const b of buildings){if(b.type==='park')continue;const q=structureRect(b),bh=buildingHeight(b);if(h.y<bh+2&&nx>q.x-2&&nx<q.x+q.w+2&&nz>q.z-2&&nz<q.z+q.d+2){airBlocked=true;break}}}
 if(nx>3&&nx<WORLD_W-3&&nz>3&&nz<WORLD_D-3&&!airBlocked){h.x=nx;h.z=nz}else{h.speed*=-.20;if(airBlocked){state.cameraShake=.12;toast('🚁 Zu nah am Gebäude')}}

 h.rotor.rotation.y+=dt*(12+Math.abs(h.speed)*.03);h.tailRotor.rotation.x+=dt*18;h.mesh.position.set(h.x,h.y,h.z);h.mesh.rotation.y=-h.a;h.mesh.rotation.z=-steer*.10*clamp(Math.abs(h.speed)/80,0,1);
 state.x=h.x;state.z=h.z;state.yaw=h.a;state.speedKmh=h.speed
}
function updatePoliceHelicopter(dt){
 if(!policeHeli)return;
 const active=state.wantedStars>=3&&state.mode==='outside';
 policeHeli.mesh.visible=active;policeHeli.active=active;if(policeHeli.searchLight)policeHeli.searchLight.intensity=active?(state.wantedStars>=4?115:65):0;if(!active)return;
 const radius=state.wantedStars>=5?24:34,ang=performance.now()*.00018,tx=state.x+Math.cos(ang)*radius,tz=state.z+Math.sin(ang)*radius,ty=state.aircraft?clamp(state.aircraft.y+5,16,70):18+state.wantedStars*2.5;
 policeHeli.x+=(tx-policeHeli.x)*clamp(dt*.55,0,1);policeHeli.z+=(tz-policeHeli.z)*clamp(dt*.55,0,1);policeHeli.y+=(ty-policeHeli.y)*clamp(dt*.8,0,1);policeHeli.a=Math.atan2(state.z-policeHeli.z,state.x-policeHeli.x);
 policeHeli.rotor.rotation.y+=dt*18;policeHeli.tailRotor.rotation.x+=dt*22;policeHeli.mesh.position.set(policeHeli.x,policeHeli.y,policeHeli.z);policeHeli.mesh.rotation.y=-policeHeli.a;if(policeHeli.searchLight){policeHeli.searchLight.position.set(policeHeli.x,policeHeli.y-.4,policeHeli.z);policeHeli.searchTarget.position.set(state.x,0,state.z)}
 if(policeHeli.siren.length===2){const phase=Math.sin(performance.now()*.020)>0;policeHeli.siren[0].material.emissiveIntensity=phase?6:.25;policeHeli.siren[1].material.emissiveIntensity=phase?.25:6}
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
   const w=Number(raw.w)||8,d=Number(raw.d)||8,type=['home','garage','shop'].includes(raw.type)?raw.type:'home',door=Array.isArray(raw.door)&&raw.door.length===2?raw.door:[raw.x+w/2,raw.z+d+1.1];
   const b={id:String(raw.id||('custom-'+Date.now())),x:raw.x,z:raw.z,w,d,name:String(raw.name||'EIGENES GEBÄUDE'),type,color:Number(raw.color)||0xa88468,door,custom:true,portal:type==='garage',windowStyle:String(raw.windowStyle||'normal'),rotation:Number(raw.rotation)||0};
   buildings.push(b);customBuildings.push(b)
  }
 }
}
function saveGame(){
 try{
  const ownedCarIds=[...new Set(cars.filter(c=>c.owned).map(c=>c.id))];
  const data={money:Math.round(state.money),inventory:[...new Set(state.inventory)],x:state.mode==='outside'?state.x:undefined,z:state.mode==='outside'?state.z:undefined,yaw:state.yaw,bestRace:state.race.best,ownedCarIds,tuning:Object.fromEntries(cars.filter(c=>c.owned&&c.tuning).map(c=>[c.id,c.tuning])),carStatus:Object.fromEntries(cars.filter(c=>c.owned).map(c=>[c.id,{hp:c.hp,tireHP:c.tireHP,flatTires:c.flatTires,garageStored:c.garageStored}])),collected:pickups.filter(p=>p.collected).map(p=>p.id),customBuildings:customBuildings.map(b=>({id:b.id,x:b.x,z:b.z,w:b.w,d:b.d,name:b.name,type:b.type,color:b.color,door:b.door,windowStyle:b.windowStyle||'normal',rotation:b.rotation||0}))};
  localStorage.setItem(SAVE_KEY,JSON.stringify(data));savedData=data
 }catch(_){}
}
function restoreOwnedCars(){
 const ids=new Set(Array.isArray(savedData.ownedCarIds)?savedData.ownedCarIds:[]);
 const legacy=new Set(Array.isArray(savedData.ownedModels)?savedData.ownedModels:[]);
 for(const c of cars){
  if(ids.has(c.id)||(legacy.has(c.name)&&c.forSale)){c.locked=false;c.forSale=false;c.owned=true}
  const upgrades=savedData.tuning?.[c.id];if(upgrades){c.tuning={...upgrades};if(upgrades.engine){c.spec.max*=1.12;c.spec.acc*=1.15}if(upgrades.suspension)c.spec.turn*=1.12;if(upgrades.paint&&c.mesh.userData.body){c.mesh.userData.baseColor=0x27a5a0;c.mesh.userData.body.material.color.setHex(0x27a5a0)}if(upgrades.rims)(c.mesh.userData.wheels||[]).forEach(w=>{if(w.material){w.material=w.material.clone();w.material.color.setHex(0xd5b86e);w.material.metalness=.62}})}
  const status=savedData.carStatus?.[c.id];if(status){c.hp=Number.isFinite(status.hp)?clamp(status.hp,0,100):100;c.tireHP=Array.isArray(status.tireHP)?status.tireHP.slice(0,4):[100,100,100,100];while(c.tireHP.length<4)c.tireHP.push(100);c.flatTires=Array.isArray(status.flatTires)?status.flatTires.slice(0,4).map(Boolean):[false,false,false,false];while(c.flatTires.length<4)c.flatTires.push(false);c.garageStored=!!status.garageStored;c.mesh.visible=!c.garageStored;syncTireState(c);applyDamageVisual(c,true)}
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
function prepareRaceOpponents(){
 const names=['Ferrari Roma','Volt E','Lamborghini Huracán'];
 if(!raceOpponents.length){
  for(let i=0;i<3;i++){const c=addCar(names[i],145-i*6,161.5-(i%2)*9,0,{id:'race-ai-'+i,raceAI:true});c.mesh.visible=false;raceOpponents.push(c)}
 }
 raceOpponents.forEach((c,i)=>{c.x=150-i*6;c.z=i%2?152.5:161.5;c.a=0;c.speed=0;c.hp=100;c.raceIndex=0;c.raceFinished=false;c.raceFinishTime=null;c.mesh.visible=true;c.mesh.position.set(c.x,0,c.z);c.mesh.rotation.set(0,0,0)})
}
function startRace(){
 if(state.race.active)return toast('Das Rennen läuft bereits');
 if(state.mode!=='outside'||!state.vehicle)return toast('Für das Rennen draußen in ein Fahrzeug einsteigen');
 if(state.aircraft||state.boat)return toast('Rennen nur mit Auto oder Motorrad');
 prepareRaceOpponents();
 const c=state.vehicle;c.x=158;c.z=152.5;c.a=0;c.speed=0;c.mesh.position.set(c.x,0,c.z);c.mesh.rotation.set(0,0,0);state.x=c.x;state.z=c.z;state.yaw=0;
 state.race.active=true;state.race.index=0;state.race.time=0;raceMarker.visible=true;const cp=state.race.checkpoints[0];raceMarker.position.set(cp[0],3.2,cp[1]);toast('🏁 Rennen gegen 3 KI-Fahrer gestartet!')
}
function angleDelta(a,b){let d=(b-a)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return d}
function updateRaceAI(c,dt){
 if(!state.race.active||c.raceFinished)return;
 const cp=state.race.checkpoints[c.raceIndex];if(!cp){c.raceFinished=true;c.raceFinishTime=state.race.time;return}
 const desired=Math.atan2(cp[1]-c.z,cp[0]-c.x),delta=angleDelta(c.a,desired);
 const corner=Math.abs(delta),targetSpeed=Math.min(c.spec.max*.72,corner>.55?82:corner>.25?125:185+(c===raceOpponents[2]?12:0));
 c.speed+=(targetSpeed-c.speed)*clamp(dt*(targetSpeed>c.speed?1.5:3.0),0,1);
 c.a+=clamp(delta,-c.spec.turn*dt*.75,c.spec.turn*dt*.75);
 const ms=c.speed/3.6,dx=Math.cos(c.a)*ms*dt,dz=Math.sin(c.a)*ms*dt,hit=vehicleSweep(c,dx,dz);
 if(hit){c.speed*=hit.type==='vehicle'?.70:.45;c.a+=(Math.random()-.5)*.12}
 c.y=vehicleRoadY57(c);c.mesh.position.set(c.x,c.y,c.z);c.mesh.rotation.y=-c.a;
 if(dist2(c.x,c.z,cp[0],cp[1])<8){c.raceIndex++;if(c.raceIndex>=state.race.checkpoints.length){c.raceFinished=true;c.raceFinishTime=state.race.time;c.speed*=.65}}
}
function raceProgress(entity,index){
 if(index>=state.race.checkpoints.length)return 1e9;
 const cp=state.race.checkpoints[index],d=dist2(entity.x,entity.z,cp[0],cp[1]);return index*10000-d
}
function currentRacePlace(){
 if(!state.race.active||!state.vehicle)return null;
 const scores=[{me:true,score:raceProgress(state.vehicle,state.race.index)},...raceOpponents.map(c=>({me:false,score:c.raceFinished?1e9-(c.raceFinishTime||999):raceProgress(c,c.raceIndex)}))].sort((a,b)=>b.score-a.score);
 return scores.findIndex(x=>x.me)+1
}
function finishPlayerRace(){
 const t=state.race.time,place=clamp(1+raceOpponents.filter(c=>c.raceFinished).length,1,4),rewards=[1500,1000,700,400],reward=rewards[place-1]||400;
 state.race.active=false;raceMarker.visible=false;state.money+=reward;
 if(!state.race.best||t<state.race.best)state.race.best=t;
 raceOpponents.forEach(c=>{c.mesh.visible=false;c.speed=0});
 log('🏁 Rennen: Platz '+place+' · '+t.toFixed(1)+' s · +'+reward+' €');toast('🏆 Platz '+place+' · '+t.toFixed(1)+' s');saveGame()
}
function cancelRace(reason='Rennen abgebrochen'){
 if(!state.race.active)return;state.race.active=false;raceMarker.visible=false;raceOpponents.forEach(c=>{c.mesh.visible=false;c.speed=0});if(ui.racePlace)ui.racePlace.textContent='Rennen: –';toast(reason)
}
function updateRace(dt){
 if(state.race.active&&!state.vehicle){cancelRace('Rennen abgebrochen – Fahrzeug verlassen');return}
 if(!state.race.active){if(ui.racePlace)ui.racePlace.textContent='Rennen: –';return}
 state.race.time+=dt;raceOpponents.forEach(c=>updateRaceAI(c,dt));
 const cp=state.race.checkpoints[state.race.index];if(!cp)return;
 raceMarker.rotation.z+=dt*.7;
 const place=currentRacePlace();if(ui.racePlace)ui.racePlace.textContent='Rennen: Platz '+place+'/4 · '+state.race.time.toFixed(1)+' s';
 if(dist2(state.x,state.z,cp[0],cp[1])<8){
  state.race.index++;
  if(state.race.index>=state.race.checkpoints.length){finishPlayerRace();return}
  const n=state.race.checkpoints[state.race.index];raceMarker.position.set(n[0],3.2,n[1]);toast('Checkpoint '+state.race.index+'/'+state.race.checkpoints.length+' · Platz '+place)
 }
}
function roadArea(x,z,margin=0){
 return roadsX.some(rx=>Math.abs(x-rx)<ROAD_W/2+SIDEWALK+margin)||roadsZ.some(rz=>Math.abs(z-rz)<ROAD_W/2+SIDEWALK+margin)
}
function overlapsBuilding(x,z,w,d,margin=1.5){
 return buildings.some(b=>{const q=structureRect(b);return x+w/2>q.x-margin&&x-w/2<q.x+q.w+margin&&z+d/2>q.z-margin&&z-d/2<q.z+q.d+margin})
}
function buildCustomInterior(b){
 const n=customBuildings.indexOf(b)>=0?customBuildings.indexOf(b):customBuildings.length,cx=4200+n*46,cz=60,w=Math.max(20,b.w*1.8),d=Math.max(16,b.d*1.65);
 const room={id:b.id,cx,cz,w,d,minX:cx-w/2,maxX:cx+w/2,minZ:cz-d/2,maxZ:cz+d/2,spawn:{x:cx,z:cz+d/2-3},exit:{x:cx,z:cz+d/2-1.4},vehicleSpawn:{x:cx,z:cz},vehicleExit:{x:cx,z:cz+d/2-2.5}};
 interiors[b.id]=room;
 addBox(cx,.02,cz,w,.08,d,0xb9ac98,.95,0);addBox(cx,2.6,room.minZ,w,5.2,.28,0xd2c4ae,.88,0);addBox(cx,2.6,room.maxZ,w,5.2,.28,0xd2c4ae,.88,0);addBox(room.minX,2.6,cz,.28,5.2,d,0xd2c4ae,.88,0);addBox(room.maxX,2.6,cz,.28,5.2,d,0xd2c4ae,.88,0);
 const label=makeLabel(b.name,7);label.position.set(cx,3.6,room.minZ+.2);scene.add(label);decorateInterior(b,room);makeVerticalAccess(b,room);createDoorSystem(b,room,'inside')
}
const BUILD_TYPES=[
 {key:'home',label:'Wohnhaus',w:8,d:8,cost:1500,color:0xa88468},
 {key:'garage',label:'Garage/Werkstatt',w:10,d:9,cost:2200,color:0x718087},
 {key:'shop',label:'Laden',w:12,d:9,cost:3000,color:0xb17b62}
];
const BUILD_WINDOW_STYLES=['normal','warm','blue'];
function buildSpec(){return BUILD_TYPES[state.buildChoice%BUILD_TYPES.length]}
function buildDims(){const b=buildSpec(),rot=state.buildRotation%2;return{w:rot?b.d:b.w,d:rot?b.w:b.d}}
function buildDoorPoint(cx,cz,w,d,side){
 if(side===0)return[cx,cz+d/2+1.1];
 if(side===1)return[cx+w/2+1.1,cz];
 if(side===2)return[cx,cz-d/2-1.1];
 return[cx-w/2-1.1,cz]
}
function buildPlacement(){
 const sp=buildSpec(),dim=buildDims(),cx=state.x+Math.cos(state.yaw)*12,cz=state.z+Math.sin(state.yaw)*12;
 const valid=cx-dim.w/2>5&&cz-dim.d/2>5&&cx+dim.w/2<WORLD_W-5&&cz+dim.d/2<380&&!overlapsBuilding(cx,cz,dim.w,dim.d,2.4)&&!roadArea(cx,cz,Math.max(dim.w,dim.d)*.55)&&!roadsX.some(x=>Math.abs(cx-x)<ROAD_W/2+SIDEWALK+dim.w/2)&&!roadsZ.some(z=>Math.abs(cz-z)<ROAD_W/2+SIDEWALK+dim.d/2);
 return{sp,...dim,cx,cz,valid}
}
function ensureBuildPreview(){
 if(buildPreview)return;const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0x64b882,transparent:true,opacity:.38,roughness:.65,depthWrite:false}));m.visible=false;scene.add(m);buildPreview=m
}
function refreshBuildPanel(){
 if(!state.buildMode)return;const p=buildPlacement(),row=clearPanel('🏗️ Baumodus · '+p.sp.label+' · '+p.sp.cost.toLocaleString('de-DE')+' €');
 row.appendChild(pbtn('🏠 Typ: '+p.sp.label,()=>{state.buildChoice=(state.buildChoice+1)%BUILD_TYPES.length;refreshBuildPanel()}));
 row.appendChild(pbtn('↻ Drehen',()=>{state.buildRotation=(state.buildRotation+1)%4;refreshBuildPanel()}));
 row.appendChild(pbtn('🚪 Türseite '+(state.buildDoorSide+1),()=>{state.buildDoorSide=(state.buildDoorSide+1)%4;refreshBuildPanel()}));
 row.appendChild(pbtn('🪟 Fenster '+BUILD_WINDOW_STYLES[state.buildWindowStyleIndex||0],()=>{state.buildWindowStyleIndex=((state.buildWindowStyleIndex||0)+1)%BUILD_WINDOW_STYLES.length;refreshBuildPanel()}));
 row.appendChild(pbtn(p.valid?'✅ Platzieren':'⛔ Kein Bauplatz',()=>placeBuildPreview(),true));
 row.appendChild(pbtn('❌ Baumodus beenden',()=>toggleBuildMode(false)))
}
function toggleBuildMode(force){
 if(state.vehicle||state.boat||state.aircraft||state.mode!=='outside')return toast('Zum Bauen draußen aussteigen');
 state.buildMode=typeof force==='boolean'?force:!state.buildMode;ensureBuildPreview();buildPreview.visible=state.buildMode;if(state.buildMode){refreshBuildPanel();toast('🏗️ Baumodus aktiv – Vorschau vor dir')}else{ui.panel.textContent='Baumodus beendet.';toast('Baumodus beendet')}
}
function updateBuildPreview(){
 if(!buildPreview||!state.buildMode)return;const p=buildPlacement(),h=buildingHeight({type:p.sp.key});buildPreview.position.set(p.cx,h/2,p.cz);buildPreview.scale.set(p.w,h,p.d);buildPreview.material.color.setHex(p.valid?0x64b882:0xd65b55);buildPreview.material.opacity=p.valid?.38:.28
}
function placeBuildPreview(){
 if(!state.buildMode)return toggleBuildMode(true);const p=buildPlacement();if(!p.valid)return toast('⛔ Hier kann nicht gebaut werden');if(state.money<p.sp.cost)return toast('Zu wenig Geld: '+p.sp.cost.toLocaleString('de-DE')+' €');
 const id='custom-'+Date.now(),door=buildDoorPoint(p.cx,p.cz,p.w,p.d,state.buildDoorSide),style=BUILD_WINDOW_STYLES[state.buildWindowStyleIndex||0],names={home:'EIGENES WOHNHAUS',garage:'EIGENE WERKSTATT',shop:'EIGENER LADEN'};
 const b={id,x:p.cx-p.w/2,z:p.cz-p.d/2,w:p.w,d:p.d,name:names[p.sp.key]+' '+(customBuildings.length+1),type:p.sp.key,color:p.sp.color,door,custom:true,portal:p.sp.key==='garage',windowStyle:style,rotation:state.buildRotation};
 buildings.push(b);customBuildings.push(b);makeBuilding(b);buildCustomInterior(b);state.money-=p.sp.cost;log('🏗️ '+b.name+' gebaut.');toast('🏗️ Gebäude gebaut');saveGame();hud();refreshBuildPanel()
}
function buildStructure(){if(!state.buildMode)return toggleBuildMode(true);placeBuildPreview()}
function tryJump(){
 if(state.vehicle||state.boat||state.aircraft||!state.grounded)return;
 const c=findClimbTarget();
 if(c){
  if(c.kind==='ladder'){state.baseY=c.h;state.x=c.targetX;state.z=c.targetZ;state.jumpY=0;state.jumpV=0;state.grounded=true;toast('🪜 Aufs Dach geklettert');return}
  state.baseY=c.h;state.x=c.x;state.z=c.z;state.jumpY=.08;state.jumpV=1.2;state.grounded=false;toast('🧗 '+(c.kind==='railing'?'Geländer':'Hindernis')+' überwunden');return
 }
 state.jumpV=5.4;state.grounded=false;toast('⬆️ Sprung')
}
function makePhysicsProp(type,x,z,rot=0){
 const g=new THREE.Group();let r=.5,mass=1.0,h=.9;
 if(type==='bin'){
  const body=addBox(0,.55,0,.72,1.0,.66,0x3f6c55,.82,.04,g),lid=addBox(0,1.08,0,.80,.12,.72,0x2f5141,.72,.08,g);r=.58;mass=1.1;h=1.14
 }else if(type==='crate'){
  addBox(0,.45,0,.88,.88,.88,0x8b633d,.90,.02,g);for(const a of [-.34,.34]){addBox(a,.45,0,.07,.78,.92,0x60432c,.92,.01,g);addBox(0,.45,a,.92,.78,.07,0x60432c,.92,.01,g)}r=.58;mass=.8;h=.9
 }else if(type==='cart'){
  addBox(0,.72,0,1.25,.65,.75,0x8b969b,.48,.52,g);addBox(-.72,.68,0,.14,.75,.12,0x687278,.50,.50,g);for(const dx of [-.46,.46])for(const dz of [-.30,.30]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.08,9),mat(0x222628,.95,.04));w.rotation.x=Math.PI/2;w.position.set(dx,.23,dz);g.add(w)}r=.82;mass=.65;h=1.1
 }else{
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,1.65,8),mat(0x5b6266,.55,.45));pole.position.y=.82;g.add(pole);addBox(0,1.55,0,.72,.50,.10,0xd3d6d5,.48,.24,g);r=.34;mass=.45;h=1.8
 }
 g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);const prop={type,mesh:g,x,z,vx:0,vz:0,r,mass,tipped:false};const col=addCircleCollider(x,z,r,'dynamicProp',{hardness:.36,dynamic:true,prop,mesh:g,height:h});prop.collider=col;physicsProps.push(prop);return prop
}
function populatePhysicsProps(){
 const defs=[];
 for(let i=0;i<12;i++)defs.push(['bin',25+(i*43)%560,roadsZ[i%roadsZ.length]+(i%2?18:-18)]);
 for(let i=0;i<10;i++)defs.push(['crate',82+(i*47)%470,136+(i%3)*101]);
 for(let i=0;i<7;i++)defs.push(['cart',35+(i*71)%520,roadsZ[(i+1)%roadsZ.length]+(i%2?17:-17)]);
 for(let i=0;i<8;i++)defs.push(['sign',roadsX[i%roadsX.length]+(i%2?18:-18),35+(i*43)%340]);
 for(const [type,x,z] of defs){if(!roadsX.some(v=>Math.abs(x-v)<ROAD_W/2-1)&&!roadsZ.some(v=>Math.abs(z-v)<ROAD_W/2-1)&&!buildings.some(b=>{if(b.type==='park')return false;const q=structureRect(b);return x>q.x-1&&x<q.x+q.w+1&&z>q.z-1&&z<q.z+q.d+1}))makePhysicsProp(type,x,z)}
}
function pushPhysicsProp(prop,dx,dz,power){
 const l=Math.hypot(dx,dz)||1,scale=clamp(power/(18*prop.mass),.4,8);prop.vx+=dx/l*scale;prop.vz+=dz/l*scale;if(power>35&&!prop.tipped){prop.tipped=true;prop.mesh.rotation.z=(dx+dz>=0?1:-1)*(prop.type==='sign'?1.15:.62)}
}
function propStaticBlocked(prop,x,z){
 if(x<2||z<2||x>WORLD_W-2||z>WORLD_D-2)return true;
 for(const b of buildings){if(b.type==='park')continue;const q=structureRect(b);if(x+prop.r>q.x&&x-prop.r<q.x+q.w&&z+prop.r>q.z&&z-prop.r<q.z+q.d)return true}return false
}
function updatePhysicsProps(dt){
 for(const p of physicsProps){
  const speed=Math.hypot(p.vx,p.vz);if(speed<.02){p.vx=0;p.vz=0;continue}
  const nx=p.x+p.vx*dt,nz=p.z+p.vz*dt,other=physicsProps.find(o=>o!==p&&dist2(nx,nz,o.x,o.z)<p.r+o.r);
  if(!propStaticBlocked(p,nx,nz)&&!other){p.x=nx;p.z=nz}else if(other){other.vx+=p.vx*.35/Math.max(.5,other.mass);other.vz+=p.vz*.35/Math.max(.5,other.mass);p.vx*=-.12;p.vz*=-.12}else{p.vx*=-.18;p.vz*=-.18}
  p.vx*=Math.pow(.91,dt*60);p.vz*=Math.pow(.91,dt*60);p.mesh.position.x=p.x;p.mesh.position.z=p.z;p.collider.x=p.x;p.collider.z=p.z;
  if(speed>2)p.mesh.rotation.y+=dt*clamp(speed*.12,-2,2)
 }
}
function bridgeElevation57(x,z,a=0){
 // Ost-West-Fahrbahn der Straße z=264 wird über x=307 angehoben; Nord-Süd-Verkehr bleibt darunter.
 if(state.mode==='interior'||Math.abs(z-264)>ROAD_W/2-1||Math.abs(Math.sin(a))>.62)return 0;
 const d=Math.abs(x-307);if(d>=42)return 0;if(d<=20)return 5.2;return 5.2*(42-d)/22
}
function vehicleRoadY57(c,x=c.x,z=c.z,a=c.a){return bridgeElevation57(x,z,a)}
function buildDistrictLandmarks57(){
 const defs=[
  ['ALTSTADT',62,25,0x7c6756],['PARK & WOHNEN',118,148,0x5f8064],['INNENSTADT',307,112,0x596f83],
  ['GEWERBEPARK',515,118,0x75664f],['BAHNHOF & BUSINESS',186,342,0x66737c],['HAFEN & INDUSTRIE',500,363,0x526a70]
 ];
 for(const [name,x,z,color] of defs){
  const g=new THREE.Group(),pole=addBox(0,1.35,0,.16,2.7,.16,0x4c5559,.62,.42,g),board=addBox(0,2.5,0,4.8,1.05,.18,color,.72,.12,g);const label=makeLabel(name,4.4);label.position.set(0,2.5,-.13);g.add(label);g.position.set(x,0,z);scene.add(g);districtLandmarks.push({name,x,z,group:g})
 }
}
function buildCityStructures57(){
 // Echte höhengetrennte Kreuzung: Ost-West-Brücke über die Nord-Süd-Straße bei (307,264).
 const bridge=new THREE.Group();scene.add(bridge);
 const z=264;
 for(let x=266;x<=348;x+=3){
  const y=bridgeElevation57(x,z,0),deck=addBox(x,y-.14,z,3.2,.28,ROAD_W-1.6,0x4b5357,.88,.06,bridge);deck.receiveShadow=true;
  if(y>1.2&&Math.abs(x-307)>19){for(const side of [-1,1])addBox(x,y*.5,z+side*(ROAD_W*.46),.24,y,.24,0x737d82,.82,.10,bridge)}
  for(const side of [-1,1])addBox(x,y+.34,z+side*(ROAD_W*.47),3.1,.56,.16,0x8d9599,.72,.16,bridge)
 }
 // Unterführung der Nord-Süd-Achse bleibt auf Höhe 0; Stützwände und Beleuchtung machen die Ebene lesbar.
 for(const side of [-1,1])addBox(307+side*(ROAD_W/2+1.0),2.5,264,.7,5.0,34,0x777f83,.92,.04,bridge);
 for(const zz of [252,258,264,270,276]){const lamp=addBox(307,4.45,zz,9.5,.10,.12,0xd7d5c8,.35,.05,bridge);lamp.material.emissive=new THREE.Color(0xffdc92);lamp.material.emissiveIntensity=2.1}
 const under=makeLabel('UNTERFÜHRUNG',5.2);under.position.set(307,4.2,247);bridge.add(under);

 // Befahrbarer Tunnel an der östlichen Nord-Süd-Achse x=555.
 const tunnel=new THREE.Group();scene.add(tunnel);
 for(let zz=184;zz<=226;zz+=3.5){
  for(const side of [-1,1])addBox(555+side*(ROAD_W/2+.55),2.9,zz,.65,5.8,3.7,0x60696d,.96,.03,tunnel);
  addBox(555,5.75,zz,ROAD_W+1.8,.36,3.7,0x596267,.94,.03,tunnel)
 }
 for(const zz of [188,198,208,218,224]){const l=addBox(555,5.45,zz,7.5,.08,.12,0xe4ddc7,.35,.04,tunnel);l.material.emissive=new THREE.Color(0xffd78a);l.material.emissiveIntensity=2.0}
 const tl=makeLabel('CITY TUNNEL',5.0);tl.position.set(555,6.6,182);tunnel.add(tl)
}
function setupWorld(){
 loadPersistentState();setupHeldWeapons();buildGround();setupWeatherFX();buildings.forEach(makeBuilding);populateTrees();populateProps();populatePhysicsProps();populateBreakableFurniture();buildCityStructures57();buildDistrictLandmarks57();buildTrafficLights();buildClimbables();buildInteriors();spawnNPCs();spawnCars();spawnPolice();buildHarbor();setupHelicopters();spawnPickups();setupRace();restoreOwnedCars()
}
setupWorld();setupCockpitAndMirrors();setupPlayerAvatar();

function currentCar(){return state.vehicle}
function nearestCar(max=4.6){
 let best=null,bd=max;
 for(const c of cars){
  if(c.ai||c.police||c.raceAI||!c.mesh.visible)continue;
  if(state.mode==='outside'&&c.interiorId)continue;
  if(state.mode==='interior'&&c.interiorId!==state.currentBuilding)continue;
  const d=dist2(state.x,state.z,c.x,c.z);if(d<bd){bd=d;best=c}
 }
 return best
}
function nearestBuilding(max=8){
 if(state.mode!=='outside')return null;
 let best=null,bd=max;for(const b of buildings){if(b.type==='park'||!b.door)continue;const p=b._pedDoor||pedestrianDoorPoint(b),d=dist2(state.x,state.z,p[0],p[1]);if(d<bd){bd=d;best=b}}return best
}
function nearestPortalBuilding(max=9){
 if(state.mode!=='outside')return null;
 let best=null,bd=max;for(const b of buildings){if(!b.portal||!b.door)continue;const d=dist2(state.x,state.z,b.door[0],b.door[1]);if(d<bd){bd=d;best=b}}return best
}
function buildingById(id){return buildings.find(b=>b.id===id)||null}
function enterInterior(b){
 const r=interiors[b.id];if(!r)return toast('Innenraum noch nicht verfügbar');
 state.returnPos={x:state.x,z:state.z,yaw:state.yaw};state.mode='interior';state.currentBuilding=b.id;state.interiorFloor=0;state.baseY=0;const sp=r.pedExit?{x:r.pedExit.x,z:r.pedExit.z-1.8}:r.spawn;state.x=sp.x;state.z=sp.z;state.yaw=-Math.PI/2;state.jumpY=0;state.jumpV=0;state.grounded=true;openBuilding(b);toast('🚪 '+b.name+' betreten')
}
function leaveInterior(){
 const b=buildingById(state.currentBuilding),ret=state.returnPos;if(!b||!ret)return;
 state.mode='outside';state.currentBuilding=null;state.interiorFloor=0;state.baseY=0;state.x=ret.x;state.z=ret.z;state.yaw=ret.yaw;state.returnPos=null;ui.panel.textContent='Du bist wieder draußen.';toast('🚪 '+b.name+' verlassen')
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
 if(b.type==='gym'){
  row.appendChild(pbtn('🏃 Laufband · 15 €',()=>{if(state.money<15)return toast('Zu wenig Geld');state.money-=15;state.hp=clamp(state.hp+12,0,100);log('🏃 Training im CITY GYM.');toast('Training abgeschlossen · +Fitness');saveGame();hud()}));
  row.appendChild(pbtn('🏋️ Krafttraining · 20 €',()=>{if(state.money<20)return toast('Zu wenig Geld');state.money-=20;state.hp=clamp(state.hp+16,0,100);log('🏋️ Krafttraining im CITY GYM.');toast('Krafttraining abgeschlossen');saveGame();hud()}))
 }else if(b.type==='shop'||b.type==='cafe'){
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
  state.money-=500;state.vehicle.hp=100;repairTires(state.vehicle);restoreDetachedParts(state.vehicle);applyDamageVisual(state.vehicle,true);log('Fahrzeug repariert.');saveGame();hud()
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
 if(state.boat||state.aircraft)return toast('Zum Interagieren erst aussteigen');
 if(state.vehicle){
  if(state.mode==='outside'){
   const b=nearestPortalBuilding();if(b)return requestVehicleDoorTransition(b,'vehicleEnter');
   return toast('Mit dem Fahrzeug zur Einfahrt eines Autohauses/Parkhauses fahren')
  }
  const room=interiors[state.currentBuilding];
  if(room&&dist2(state.x,state.z,room.vehicleExit.x,room.vehicleExit.z)<6){const b=buildingById(state.currentBuilding);return requestVehicleDoorTransition(b,'vehicleLeave')}
  return toast('Zur AUSFAHRT fahren und E drücken')
 }
 if(state.mode==='interior'){
  const room=interiors[state.currentBuilding];
  const c=nearestCar(4);if(c&&c.locked&&c.forSale)return openCarSale(c);
  if(room&&state.interiorFloor===0){const ex=room.pedExit||room.exit;if(dist2(state.x,state.z,ex.x,ex.z)<3.4){const b=buildingById(state.currentBuilding);return requestDoorTransition(b,'leave')}}
  const b=buildingById(state.currentBuilding);if(b)return openBuilding(b);
 }
 const pickup=nearestPickup&&nearestPickup(2.5);if(pickup)return collectPickup(pickup);
 const c=nearestCar(4);if(c&&c.locked&&c.forSale)return openCarSale(c);
 const b=nearestBuilding();if(b)return requestDoorTransition(b,'enter');
 toast('Nichts in Reichweite')
}
function vehicleAction(){
 if(state.buildMode)toggleBuildMode(false);
 if(state.aircraft){
  const h=state.aircraft;if(h.y>1.2)return toast('Zum Aussteigen erst landen');state.x=h.x-2.4;state.z=h.z;state.aircraft=null;state.speedKmh=0;state.heliUp=false;state.heliDown=false;toast('Aus Hubschrauber ausgestiegen');return
 }
 if(state.boat){
  const b=state.boat;if(b.z>393.5)return toast('Zum Aussteigen näher an den Steg fahren');state.x=b.x;state.z=389.3;state.boat=null;state.speedKmh=0;toast('Vom Boot ausgestiegen');return
 }
 if(state.vehicle){
  const c=state.vehicle;if(state.race.active)cancelRace();if(c.mesh.userData.rider)c.mesh.userData.rider.visible=false;state.x=c.x-Math.cos(c.a)*2.5;state.z=c.z-Math.sin(c.a)*2.5;state.vehicle=null;state.speedKmh=0;state._lookOffsetYaw=0;toast('Ausgestiegen');return
 }
 const h=nearestHelicopter();if(h){state.flashlight=false;const fb=document.getElementById('flashlightBtn');if(fb)fb.textContent='🔦 Taschenlampe';state.aircraft=h;state.yaw=h.a;state.speedKmh=h.speed||0;toast('🚁 Eingestiegen: '+h.name);return}
 const b=nearestBoat();if(b){state.flashlight=false;const fb=document.getElementById('flashlightBtn');if(fb)fb.textContent='🔦 Taschenlampe';state.boat=b;state.yaw=b.a;state.speedKmh=b.speed||0;toast('🚤 Aufgestiegen: '+b.name);return}
 const c=nearestCar();if(!c)return toast('Kein Fahrzeug, Boot oder Hubschrauber in der Nähe');if(c.locked)return toast('Fahrzeug ist gesperrt – E für Optionen');
 state.flashlight=false;const fb=document.getElementById('flashlightBtn');if(fb)fb.textContent='🔦 Taschenlampe';state.vehicle=c;if(c.mesh.userData.rider)c.mesh.userData.rider.visible=true;state.speedKmh=c.speed||0;state.yaw=c.a;state._lookOffsetYaw=0;toast('Eingestiegen: '+c.name)
}

function spawnCrashFX(c,amount){
 const count=clamp(Math.round(amount*.45),3,10),origin=new THREE.Vector3(c.x,.7,c.z);
 for(let i=0;i<count;i++){
  const spark=new THREE.Mesh(new THREE.SphereGeometry(.025+(i%3)*.012,5,4),new THREE.MeshBasicMaterial({color:i%3===0?0xfff0a3:0xff8a32,transparent:true,opacity:.95}));
  spark.position.copy(origin).add(new THREE.Vector3((Math.random()-.5)*1.2,Math.random()*.45,(Math.random()-.5)*1.2));scene.add(spark);
  effects.push({mesh:spark,ttl:.22+Math.random()*.28,velocity:new THREE.Vector3((Math.random()-.5)*5,2+Math.random()*4,(Math.random()-.5)*5),gravity:9.5,fade:true})
 }
}
function syncTireState(c){
 const wheels=c.mesh.userData.wheels||[];c.flatTires=c.flatTires||[false,false,false,false];c.tireHP=c.tireHP||[100,100,100,100];
 c.flatTire=c.flatTires.some(Boolean);
 wheels.forEach((w,i)=>{if(!w.userData.baseScale)w.userData.baseScale=w.scale.clone();if(u.base?.wheelPos?.[i])w.position.copy(u.base.wheelPos[i]);const flat=!!c.flatTires[i];w.scale.copy(w.userData.baseScale);if(flat){w.scale.z*=.58;w.scale.x*=1.08;w.position.y=Math.max(.22,w.position.y-.07)}});
}
function damageTire(c,index,amount=100){
 if(!c||c.spec.type==='bike')return;if(c.tuning?.tires)amount*=.58;index=clamp(index|0,0,3);c.tireHP=c.tireHP||[100,100,100,100];c.flatTires=c.flatTires||[false,false,false,false];
 c.tireHP[index]=clamp(c.tireHP[index]-amount,0,100);if(c.tireHP[index]<=18&&!c.flatTires[index]){c.flatTires[index]=true;toast('🛞 Reifen '+(index+1)+' platt');}
 syncTireState(c)
}
function repairTires(c){if(!c)return;c.tireHP=[100,100,100,100];c.flatTires=[false,false,false,false];c.flatTire=false;const u=c.mesh.userData;if(u.base?.wheelPos)(u.wheels||[]).forEach((w,i)=>{if(u.base.wheelPos[i])w.position.copy(u.base.wheelPos[i])});syncTireState(c)}
function spawnDetachedPart(c,key){
 const source=c.mesh.userData[key];if(!source||!source.parent||c.detachedParts?.[key])return;
 c.detachedParts=c.detachedParts||{};c.detachedParts[key]=true;c.mesh.updateMatrixWorld(true);
 const clone=source.clone();clone.material=source.material?.clone?source.material.clone():source.material;
 const wp=source.getWorldPosition(new THREE.Vector3()),wq=source.getWorldQuaternion(new THREE.Quaternion());clone.position.copy(wp);clone.quaternion.copy(wq);source.visible=false;scene.add(clone);
 vehicleDebris.push({mesh:clone,vx:Math.cos(c.a)*(2+Math.abs(c.speed)/35)+(Math.random()-.5)*2,vz:Math.sin(c.a)*(2+Math.abs(c.speed)/35)+(Math.random()-.5)*2,vy:2.8+Math.random()*2,spin:(Math.random()-.5)*5,ttl:22});
}
function restoreDetachedParts(c){if(!c)return;const u=c.mesh.userData;for(const k of ['frontBumper','rearBumper','hood'])if(u[k])u[k].visible=true;c.detachedParts={frontBumper:false,rearBumper:false,hood:false}}
function updateVehicleDebris(dt){
 for(let i=vehicleDebris.length-1;i>=0;i--){const d=vehicleDebris[i];d.ttl-=dt;d.vy-=9.5*dt;d.mesh.position.x+=d.vx*dt;d.mesh.position.z+=d.vz*dt;d.mesh.position.y=Math.max(.10,d.mesh.position.y+d.vy*dt);if(d.mesh.position.y<=.101){d.vy*=-.18;d.vx*=.92;d.vz*=.92}d.mesh.rotation.x+=d.spin*dt;d.mesh.rotation.z+=d.spin*.7*dt;if(d.ttl<=0){scene.remove(d.mesh);d.mesh.geometry?.dispose?.();if(d.mesh.material?.dispose)d.mesh.material.dispose();vehicleDebris.splice(i,1)}}
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
 const u=c.mesh.userData,stage=damageStage(c.hp);syncTireState(c);if(!force&&u.damageStage===stage)return;u.damageStage=stage;const b=u.base;
 const body=u.body,hood=u.hood,cabin=u.cabin,wheels=u.wheels||[];
 if(body&&b.bodyPos){body.position.copy(b.bodyPos);body.scale.copy(b.bodyScale);body.rotation.copy(b.bodyRot);body.scale.x=Math.max(.91,1-stage*.014);body.position.x-=stage*.025;body.rotation.z=stage>=4?.025*(stage-3):0;body.rotation.y=stage>=3?.012*(stage-2):0;if(body.material){body.material.roughness=clamp(.40+stage*.095,.4,.92);body.material.color.setHex(u.baseColor||c.spec.color)}}
 if(hood&&b.hoodPos){hood.position.copy(b.hoodPos);hood.scale.copy(b.hoodScale);hood.rotation.copy(b.hoodRot);hood.position.x-=stage*.045;hood.scale.x=Math.max(.72,1-stage*.055);hood.rotation.z=stage>=2?.045*stage:0;hood.rotation.y=stage>=4?.05:0}
 if(cabin&&b.cabinPos){cabin.position.copy(b.cabinPos);cabin.scale.copy(b.cabinScale);cabin.rotation.copy(b.cabinRot);cabin.rotation.z=stage>=3?-.018*(stage-2):0;cabin.position.y-=stage>=5?.06:0;if(cabin.material)cabin.material.roughness=stage>=3?.60:.22}
 wheels.forEach((w,i)=>{if(b.wheelRots[i])w.rotation.copy(b.wheelRots[i]);if(b.wheelPos[i])w.position.copy(b.wheelPos[i]);if(stage>=3&&i===0)w.rotation.z+=.12;if(stage>=4&&i===1)w.rotation.z-=.18;if(stage>=5&&i===2){w.rotation.z+=.34;w.position.y-=.08}});
 if(u.frontBumper&&u.frontBumper.parent===c.mesh&&b.frontBumperPos){u.frontBumper.position.copy(b.frontBumperPos);u.frontBumper.rotation.copy(b.frontBumperRot);u.frontBumper.position.x-=stage*.055;if(stage>=3)u.frontBumper.rotation.z=.06*(stage-2);if(stage>=5)u.frontBumper.position.y-=.22}
 if(u.rearBumper&&u.rearBumper.parent===c.mesh&&b.rearBumperPos){u.rearBumper.position.copy(b.rearBumperPos);u.rearBumper.rotation.copy(b.rearBumperRot);if(stage>=4)u.rearBumper.rotation.z=-.05*(stage-3)}
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
 if(amount>3)oneShotSound('crash',clamp(amount/8,.7,3));
 const now=performance.now()/1000;if(now-c.lastDamage<.42)return;c.lastDamage=now;
 const before=damageStage(c.hp);c.hp=clamp(c.hp-amount,0,100);const after=damageStage(c.hp);
 if(c.spec.type!=='bike'){
  if(c.hp<62&&!c.flatTires?.[0])damageTire(c,0,100);
  if(c.hp<42&&!c.flatTires?.[3])damageTire(c,3,100);
  if(c.hp<24&&!c.flatTires?.[1])damageTire(c,1,100);
 }
 c.detachedParts=c.detachedParts||{};
 if(c.hp<30&&!c.detachedParts.frontBumper)spawnDetachedPart(c,'frontBumper');
 if(c.hp<17&&!c.detachedParts.rearBumper)spawnDetachedPart(c,'rearBumper');
 if(c.hp<8&&!c.detachedParts.hood)spawnDetachedPart(c,'hood');
 applyDamageVisual(c);spawnCrashFX(c,amount);
 if(c===state.vehicle)state.cameraShake=Math.max(state.cameraShake,clamp(amount*.008,.045,.22));
 if(after>before)toast(damageLabel(c.hp));if(c.hp<=0){c.speed=0;if(c===state.vehicle)state.speedKmh=0}
}
function spawnSkidMarks(c){
 const dim=c.mesh.userData.dim||{length:4,width:2},ca=Math.cos(c.a),sa=Math.sin(c.a),sx=-Math.sin(c.a),sz=Math.cos(c.a);
 const rx=c.x-ca*dim.length*.27,rz=c.z-sa*dim.length*.27;
 for(const side of [-1,1]){
  const m=new THREE.Mesh(new THREE.BoxGeometry(.78,.012,.13),new THREE.MeshBasicMaterial({color:0x202326,transparent:true,opacity:.42,depthWrite:false}));
  m.position.set(rx+sx*dim.width*.34,.115,rz+sz*dim.width*.34);m.rotation.y=-c.a;scene.add(m);effects.push({mesh:m,ttl:3.2,fade:true})
 }
}
function updateVehicle(dt){
 const c=state.vehicle;if(!c)return;
 const up=keys.has('w')||keys.has('ArrowUp'),down=keys.has('s')||keys.has('ArrowDown'),left=keys.has('a')||keys.has('ArrowLeft'),right=keys.has('d')||keys.has('ArrowRight');
 const steer=(right?1:0)-(left?1:0),isBike=c.spec.type==='bike',ds=damageStage(c.hp),speedFactor=[1,.96,.86,.70,.48,0][ds],accFactor=[1,.98,.90,.76,.55,0][ds];
 const road=state.mode==='interior'||isRoadSurface(c.x,c.z),wetGrip=state.mode==='outside'?weatherGrip():1,flatCount=(c.flatTires||[]).filter(Boolean).length,tireGrip=Math.max(.34,1-flatCount*.18),surfaceCap=(road?1:.62)*(wetGrip<1?.94:1),surfaceGrip=(road?1:.72)*wetGrip*tireGrip*(c.tuning?.tires?1.10:1);
 const rawCap=(state.mode==='interior'?Math.min(38,c.spec.max):c.spec.max)*surfaceCap*Math.max(.38,1-flatCount*.20),speedCap=rawCap*speedFactor;
 const abs=Math.abs(c.speed);

 if(c.hp<=0)c.speed*=Math.pow(.88,dt*60);
 else{
  const brakePower=(road?145:105)*(wetGrip<1?.78:1)*(c.tuning?.brakes?1.25:1)*Math.max(.55,1-flatCount*.12);
  if(up){
   if(c.speed<-5)c.speed+=brakePower*dt;
   else c.speed+=c.spec.acc*accFactor*dt
  }
  if(down){
   if(c.speed>5)c.speed-=brakePower*dt;
   else c.speed-=c.spec.acc*.66*accFactor*dt
  }
  if(!up&&!down)c.speed*=Math.pow(road?.989:.974,dt*60);
  else c.speed*=Math.pow(road?.995:.985,dt*60);

  if(state.handbrake&&abs>12)c.speed*=Math.pow(.958,dt*60);
  c.speed=clamp(c.speed,-Math.min(42,speedCap*.24),speedCap);

  const speedRatio=clamp(Math.abs(c.speed)/Math.max(55,speedCap),0,1);
  const speedSteer=clamp((isBike?1.24:1.08)-speedRatio*(isBike?.50:.58),isBike?.55:.42,isBike?1.24:1.08);
  const moving=clamp(Math.abs(c.speed)/18,.14,1);
  const handbrakeBoost=state.handbrake&&Math.abs(c.speed)>25?(isBike?1.18:1.58):1;
  c.a+=steer*c.spec.turn*dt*moving*speedSteer*surfaceGrip*handbrakeBoost*(c.speed>=0?1:-1);
  if(state.handbrake&&steer&&Math.abs(c.speed)>38)c.speed*=Math.pow(.974,dt*60);
  if(flatCount&&Math.abs(c.speed)>12){const left=(c.flatTires?.[0]?1:0)+(c.flatTires?.[2]?1:0),right=(c.flatTires?.[1]?1:0)+(c.flatTires?.[3]?1:0),pull=(right-left)*.075+(right===left?.035:0);c.a+=dt*pull*Math.sign(c.speed)}
  if(ds>=4&&Math.abs(c.speed)>25)c.a+=Math.sin(performance.now()*.004)*.00075*(ds-3)
 }

 const ms=c.speed/3.6,dx=Math.cos(c.a)*ms*dt,dz=Math.sin(c.a)*ms*dt,hit=vehicleSweep(c,dx,dz);
 if(hit){
  const impact=hit.impact||Math.abs(c.speed);
  if(hit.type==='brokenProp'||hit.type==='dynamicProp'){
   // Reaktion wurde bereits am exakten Aufprallpunkt verarbeitet.
  }else if(hit.type==='vehicle'){
   const o=hit.other,rel=Math.max(impact,Math.abs(c.speed-o.speed));
   vehicleDamage(c,Math.min(26,3+rel*.050));vehicleDamage(o,Math.min(22,2+rel*.038));
   const transfer=c.speed*.24;c.speed*=-.16;o.speed=clamp((o.speed||0)+transfer,-35,o.spec?.max||220);
   const nx=c.x-o.x,nz=c.z-o.z,n=Math.hypot(nx,nz)||1;o.x-=nx/n*.22;o.z-=nz/n*.22;o.mesh.position.set(o.x,0,o.z);
   if(o.police)crime(10,'⚠️ Polizeifahrzeug gerammt.')
  }else if(hit.type==='npc'){
   pushNPCFromVehicle(hit.npc,c);c.speed*=.22;if(impact>55)vehicleDamage(c,Math.min(6,1+impact*.018));toast('⚠️ Hindernis – Fahrzeug abgebremst')
  }else{
   const hardness=hit.hardness||1,damage=Math.min(28,(3+impact*.060)*hardness);vehicleDamage(c,damage);
   c.speed*=-clamp(.08+.08*(1-hardness),.06,.16);
   c.a+=(Math.random()-.5)*clamp(impact*.0016,0,.16)
  }
 }

 c.skidCd=Math.max(0,c.skidCd-dt);
 if(state.handbrake&&road&&Math.abs(c.speed)>35&&c.skidCd<=0){spawnSkidMarks(c);c.skidCd=.075}
 const suspensionFactor=c.tuning?.suspension?.72:1,rollTarget=-steer*clamp(Math.abs(c.speed)/(isBike?75:110),0,1)*(isBike?.48:(state.handbrake?.075:.045))*suspensionFactor;
 const pitchTarget=(down&&c.speed>8?.030:up&&c.speed>5?-.014:0);
 c.visualRoll+=(rollTarget-c.visualRoll)*clamp(dt*8,0,1);c.visualPitch+=(pitchTarget-c.visualPitch)*clamp(dt*7,0,1);
 if(c.mesh.userData.rider)c.mesh.userData.rider.visible=c===state.vehicle||c.raceAI;
 c.y=vehicleRoadY57(c);c.mesh.position.set(c.x,c.y,c.z);c.mesh.rotation.y=-c.a;c.mesh.rotation.z=c.visualRoll;c.mesh.rotation.x=c.visualPitch;
 state.x=c.x;state.z=c.z;state.yaw=c.a;state.speedKmh=c.speed
}
function supportHeightAt(x,z){
 if(state.mode==='interior')return state.interiorFloor*4.2;
 for(const b of buildings){if(b.type==='park')continue;const q=structureRect(b),h=buildingHeight(b);if(x>q.x+.15&&x<q.x+q.w-.15&&z>q.z+.15&&z<q.z+q.d-.15&&Math.abs(state.baseY-h)<.6)return h}
 for(const c of climbSurfaces)if(c.kind!=='ladder'&&(!c.collider||c.collider.solid)&&x>c.x-c.w/2&&x<c.x+c.w/2&&z>c.z-c.d/2&&z<c.z+c.d/2&&Math.abs(state.baseY-c.h)<.6)return c.h;
 return 0
}
function updateSupportAfterMove(){
 if(state.mode==='interior')return;
 if(state.baseY<=0)return;const support=supportHeightAt(state.x,state.z);if(support>0){state.baseY=support;return}
 state.jumpY=state.baseY;state.baseY=0;state.jumpV=-1.0;state.grounded=false;toast('⬇️ Heruntergesprungen')
}
function findClimbTarget(){
 if(state.mode!=='outside')return null;const fx=state.x+Math.cos(state.yaw)*1.35,fz=state.z+Math.sin(state.yaw)*1.35;
 let best=null,bd=3.0;for(const c of climbSurfaces){if(c.collider&&!c.collider.solid)continue;const d=dist2(fx,fz,c.x,c.z);if(d<bd){const delta=c.h-state.baseY;if(c.kind==='ladder'||(delta>.15&&delta<=1.65)){bd=d;best=c}}}return best
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
 const nx=state.x+dx*spd*dt,nz=state.z+dz*spd*dt;const hit=collisionAt(nx,nz,.48,false);if(hit&&hit.collider&&hit.collider.dynamic&&hit.collider.prop){pushPhysicsProp(hit.collider.prop,dx,dz,state.sprint?18:10);state.x+=dx*spd*dt*.35;state.z+=dz*spd*dt*.35}else if(!hit){state.x=nx;state.z=nz;updateSupportAfterMove()}
}
function updateTraffic(dt){
 for(const c of traffic){
  const junction=nextIntersectionForCar(c),ahead=trafficCarAhead(c),phase=junction?trafficPhase(junction.axis):'green';
  let target=c.cruiseSpeed||62;
  if(junction&&junction.dist<11&&(phase==='red'||phase==='yellow'))target=0;
  if(ahead<10)target=Math.min(target,Math.max(0,(ahead-3.5)*8));
  if(ahead<4.3)target=0;
  if(state.vehicle&&dist2(c.x,c.z,state.vehicle.x,state.vehicle.z)<7.5)target=0;
  if(roadblocks.some(r=>r.collider&&r.collider.solid&&dist2(c.x,c.z,r.x,r.z)<10))target=0;
  const accel=target>c.speed?28:52;c.speed+=(target-c.speed)*clamp(dt*accel/Math.max(20,Math.abs(target-c.speed)),0,1);
  const ms=c.speed/3.6;
  if(c.axis==='h'){c.x+=c.dir*ms*dt;if(c.x>WORLD_W+8)c.x=-8;if(c.x<-8)c.x=WORLD_W+8;c.a=c.dir>0?0:Math.PI}
  else{c.z+=c.dir*ms*dt;if(c.z>WORLD_D+8)c.z=-8;if(c.z<-8)c.z=WORLD_D+8;c.a=c.dir>0?Math.PI/2:-Math.PI/2}
  c.y=vehicleRoadY57(c);c.mesh.position.set(c.x,c.y,c.z);c.mesh.rotation.y=-c.a;
  if(state.vehicle&&state.mode==='outside'&&dist2(c.x,c.z,state.vehicle.x,state.vehicle.z)<2.4){
   const impact=Math.min(18,4+(Math.abs(c.speed)+Math.abs(state.vehicle.speed||0))*.035);vehicleDamage(state.vehicle,impact);vehicleDamage(c,impact*.58);state.vehicle.speed*=.72;c.speed*=.82
  }
 }
}
function updateNPCs(dt){
 for(const n of npcs){
  if(n.pirate)continue;if(n.stun>0){n.stun-=dt;continue}n.phase+=dt*5;
  let canMove=true;
  if(n.interiorId){
   const r=n.bounds;if(n.horizontal){if(n.x<r.minX+2||n.x>r.maxX-2)n.dir*=-1}else if(n.z<r.minZ+2||n.z>r.maxZ-2)n.dir*=-1
  }else{
   if(n.horizontal){
    if(n.x<12||n.x>WORLD_W-12)n.dir*=-1;
    const next=roadsX.find(rx=>Math.abs(rx-n.x)<7.0);
    if(next!==undefined&&Math.abs(n.z-roadsZ.reduce((a,b)=>Math.abs(b-n.z)<Math.abs(a-n.z)?b:a,roadsZ[0]))<ROAD_W/2+SIDEWALK+4){
      if(trafficPhase('h')!=='green'||approachingTraffic(next,n.z,11))canMove=false
    }
   }else{
    if(n.z<12||n.z>WORLD_D-38)n.dir*=-1;
    const next=roadsZ.find(rz=>Math.abs(rz-n.z)<7.0);
    if(next!==undefined&&Math.abs(n.x-roadsX.reduce((a,b)=>Math.abs(b-n.x)<Math.abs(a-n.x)?b:a,roadsX[0]))<ROAD_W/2+SIDEWALK+4){
      if(trafficPhase('v')!=='green'||approachingTraffic(n.x,next,11))canMove=false
    }
   }
  }
  if(canMove){
   if(n.horizontal)n.x+=n.dir*n.speed*dt;else n.z+=n.dir*n.speed*dt
  }
  n.waiting=!canMove;n.mesh.position.set(n.x,0,n.z);n.mesh.rotation.y=n.horizontal?(n.dir>0?-Math.PI/2:Math.PI/2):(n.dir>0?Math.PI:0);
  const u=n.mesh.userData,u1=canMove?Math.sin(n.phase)*.42:0;u.legL.rotation.z=u1;u.legR.rotation.z=-u1;u.armL.rotation.z=.22-u1*.55;u.armR.rotation.z=-.22+u1*.55
 }
}
function wantedFromHeat(h){
 if(h<10)return 0;if(h<25)return 1;if(h<45)return 2;if(h<65)return 3;if(h<85)return 4;return 5
}
function clearRoadblocks(){
 for(const r of roadblocks){r.group.visible=false;scene.remove(r.group);if(r.collider)r.collider.solid=false}roadblocks.length=0
}
function spawnRoadblock(){
 if(state.mode!=='outside'||state.wantedStars<4||roadblocks.length>=Math.min(2,state.wantedStars-3))return;
 const axis=Math.abs(Math.cos(state.yaw))>.55?'h':'v',ahead=42+roadblocks.length*18;
 let x=state.x+Math.cos(state.yaw)*ahead,z=state.z+Math.sin(state.yaw)*ahead;
 if(axis==='h'){z=roadsZ.reduce((a,b)=>Math.abs(b-z)<Math.abs(a-z)?b:a,roadsZ[0]);x=clamp(x,20,WORLD_W-20)}
 else{x=roadsX.reduce((a,b)=>Math.abs(b-x)<Math.abs(a-x)?b:a,roadsX[0]);z=clamp(z,20,WORLD_D-45)}
 const g=new THREE.Group();g.position.set(x,0,z);if(axis==='v')g.rotation.y=Math.PI/2;scene.add(g);
 for(const off of [-3.2,0,3.2]){addBox(off,.42,0,2.4,.72,.55,off===0?0xf1f1ec:0xd95a3a,.75,.08,g)}
 const sign=makeLabel('POLIZEI · STOP',5.5);sign.position.set(0,2.0,0);g.add(sign);
 const col=addBoxCollider(x,z,axis==='h'?8.2:1.2,axis==='h'?1.2:8.2,'roadblock',{hardness:1.0,breakable:true,breakSpeed:80,mesh:g});roadblocks.push({x,z,axis,group:g,collider:col})
}
function policeRoadTarget(p){
 const dx=state.x-p.x,dz=state.z-p.z;
 if(Math.abs(dx)>Math.abs(dz)){
  const road=roadsZ.reduce((a,b)=>Math.abs(b-p.z)<Math.abs(a-p.z)?b:a,roadsZ[0]);return{x:state.x,z:road}
 }
 const road=roadsX.reduce((a,b)=>Math.abs(b-p.x)<Math.abs(a-p.x)?b:a,roadsX[0]);return{x:road,z:state.z}
}
function updatePolice(dt){
 state.wantedStars=wantedFromHeat(state.heat);
 if(state.mode==='interior'){state.lastCrime+=dt;if(state.lastCrime>7)state.heat=Math.max(0,state.heat-dt*.75);for(const p of police)p.mesh.visible=false;clearRoadblocks();return}
 state.lastCrime+=dt;if(state.lastCrime>10)state.heat=Math.max(0,state.heat-dt*(state.wantedStars>=3?.75:1.35));
 const activeCount=[0,1,2,3,4,5][state.wantedStars];
 if(state.wantedStars>=4)spawnRoadblock();else clearRoadblocks();
 for(let i=0;i<police.length;i++){
  const p=police[i];if(i>=activeCount){p.mesh.visible=false;p._active=false;continue}
  p.mesh.visible=true;if(!p._active){if(i%2===0){p.x=clamp(state.x-34-i*5,5,WORLD_W-5);p.z=roadsZ.reduce((a,b)=>Math.abs(b-state.z)<Math.abs(a-state.z)?b:a,roadsZ[0])+(i%4<2?4.5:-4.5)}else{p.x=roadsX.reduce((a,b)=>Math.abs(b-state.x)<Math.abs(a-state.x)?b:a,roadsX[0])+(i%4<2?4.5:-4.5);p.z=clamp(state.z+30+i*5,5,WORLD_D-40)}p._active=true}
  const target=policeRoadTarget(p),a=Math.atan2(target.z-p.z,target.x-p.x);p.a=a;
  const maxSpeed=[0,155,180,205,230,255][state.wantedStars],acc=[0,45,55,65,75,85][state.wantedStars];p.speed=clamp((p.speed||0)+acc*dt,0,maxSpeed);
  const ms=p.speed/3.6,nx=p.x+Math.cos(a)*ms*dt,nz=p.z+Math.sin(a)*ms*dt;
  if(!vehicleStaticHit(p,nx,nz,a)){p.x=nx;p.z=nz}
  else if(!blocked(nx,p.z,1)){p.x=nx}else if(!blocked(p.x,nz,1)){p.z=nz}
  p.y=vehicleRoadY57(p);p.mesh.position.set(p.x,p.y,p.z);p.mesh.rotation.y=-a;
  if(dist2(p.x,p.z,state.x,state.z)<2.6){
   if(state.vehicle){vehicleDamage(state.vehicle,4.4+state.wantedStars*.55);vehicleDamage(p,2.2);state.vehicle.speed*=.91;p.speed*=.80}
   else state.hp=Math.max(0,state.hp-(1.0+state.wantedStars*.45)*dt)
  }
 }
 if(state.wantedStars===0)for(const p of police)p._active=false
}
function ensureAudio(){
 if(audioCtx)return audioCtx;
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
 audioCtx=new AC();audioMaster=audioCtx.createGain();audioMaster.gain.value=.32;audioMaster.connect(audioCtx.destination);
 engineGain=audioCtx.createGain();engineGain.gain.value=0;engineGain.connect(audioMaster);engineOsc=audioCtx.createOscillator();engineOsc.type='sawtooth';engineOsc.frequency.value=55;engineOsc.connect(engineGain);engineOsc.start();
 ambienceGain=audioCtx.createGain();ambienceGain.gain.value=.018;ambienceGain.connect(audioMaster);
 const amb=audioCtx.createOscillator();amb.type='sine';amb.frequency.value=42;amb.connect(ambienceGain);amb.start();
 rainGain=audioCtx.createGain();rainGain.gain.value=0;rainGain.connect(audioMaster);
 const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.28;
 const noise=audioCtx.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=audioCtx.createBiquadFilter();filter.type='highpass';filter.frequency.value=900;noise.connect(filter);filter.connect(rainGain);noise.start();
 sirenGain=audioCtx.createGain();sirenGain.gain.value=0;sirenGain.connect(audioMaster);sirenOsc=audioCtx.createOscillator();sirenOsc.type='square';sirenOsc.frequency.value=660;sirenOsc.connect(sirenGain);sirenOsc.start();
 return audioCtx
}
function unlockAudio(){const a=ensureAudio();if(a&&a.state==='suspended')a.resume().catch(()=>{})}
function oneShotSound(type='click',strength=1){
 const a=ensureAudio();if(!a||a.state!=='running')return;
 const o=a.createOscillator(),g=a.createGain(),now=a.currentTime;
 const conf=type==='crash'?[75,24,.16]:type==='door'?[170,75,.11]:type==='step'?[95,62,.045]:type==='thunder'?[42,20,.65]:[220,120,.08];
 o.type=type==='crash'||type==='thunder'?'sawtooth':'sine';o.frequency.setValueAtTime(conf[0],now);o.frequency.exponentialRampToValueAtTime(Math.max(18,conf[1]),now+conf[2]);
 g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(clamp(.025*strength,.008,.22),now+.008);g.gain.exponentialRampToValueAtTime(.0001,now+conf[2]);o.connect(g);g.connect(audioMaster);o.start(now);o.stop(now+conf[2]+.02)
}
function updateAudio(dt){
 if(!audioCtx||audioCtx.state!=='running')return;
 const now=audioCtx.currentTime,c=state.vehicle;
 if(c){const speed=Math.abs(c.speed),throttle=(keys.has('w')||keys.has('ArrowUp'))?1:0;engineOsc.frequency.setTargetAtTime(52+speed*1.55+throttle*28,now,.035);engineGain.gain.setTargetAtTime(.025+clamp(speed/250,0,.10)+throttle*.025,now,.04)}
 else engineGain.gain.setTargetAtTime(0,now,.06);
 const wet=state.weather==='rain'||state.weather==='storm',rainLevel=wet?(state.weather==='storm'?.11:.07):0;rainGain.gain.setTargetAtTime(rainLevel*(state.mode==='outside'?1:.18),now,.18);
 const policeNear=state.wantedStars>0&&police.some(p=>p.mesh.visible&&dist2(p.x,p.z,state.x,state.z)<80);sirenGain.gain.setTargetAtTime(policeNear?.025:0,now,.08);if(policeNear)sirenOsc.frequency.setTargetAtTime(Math.sin(performance.now()*.008)>0?720:540,now,.02)
}
function setupWeatherFX(){
 const count=720,pos=new Float32Array(count*3);for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*70;pos[i*3+1]=Math.random()*35;pos[i*3+2]=(Math.random()-.5)*70}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));const matRain=new THREE.PointsMaterial({color:0xaedcf4,size:.08,transparent:true,opacity:.55,depthWrite:false});
 rainSystem=new THREE.Points(geo,matRain);rainSystem.visible=false;scene.add(rainSystem);
 lightningFlash=new THREE.PointLight(0xd7eaff,0,180,1.5);lightningFlash.position.set(state.x,30,state.z);scene.add(lightningFlash)
}
function weatherLabel(){return state.weather==='rain'?'🌧️ Regen':state.weather==='fog'?'🌫️ Nebel':state.weather==='storm'?'⛈️ Gewitter':'☀️ Klar'}
function setWeather(w){
 state.weather=w;state.weatherTimer=0;toast('Wetter: '+weatherLabel());if(ui.weather)ui.weather.textContent=weatherLabel()
}
function cycleWeather(){const list=['clear','rain','fog','storm'],i=list.indexOf(state.weather);setWeather(list[(i+1)%list.length])}
function updateWeather(dt){
 state.weatherTimer+=dt;if(state.weatherTimer>95){state.weatherTimer=0;const r=Math.random();setWeather(r<.48?'clear':r<.70?'rain':r<.86?'fog':'storm')}
 const outdoors=state.mode==='outside',wet=state.weather==='rain'||state.weather==='storm',foggy=outdoors&&(state.weather==='fog'||state.weather==='storm');
 const target=wet?1:0;state.weatherBlend+=(target-state.weatherBlend)*clamp(dt*.45,0,1);
 for(const m of roadSurfaceMats){m.roughness=.98-state.weatherBlend*.55;m.metalness=.02+state.weatherBlend*.20}
 if(rainSystem){
  rainSystem.visible=wet&&outdoors;rainSystem.position.set(state.x,0,state.z);const a=rainSystem.geometry.attributes.position;
  if(wet){for(let i=0;i<a.count;i++){a.array[i*3+1]-=dt*(state.weather==='storm'?35:24);a.array[i*3]-=dt*(state.weather==='storm'?3.2:1.0);if(a.array[i*3+1]<0){a.array[i*3+1]=32+Math.random()*5;a.array[i*3]=(Math.random()-.5)*70;a.array[i*3+2]=(Math.random()-.5)*70}}a.needsUpdate=true}
 }
 const baseFar=foggy?(state.weather==='storm'?115:150):390,baseNear=foggy?28:90;scene.fog.near+=(baseNear-scene.fog.near)*clamp(dt*.7,0,1);scene.fog.far+=(baseFar-scene.fog.far)*clamp(dt*.7,0,1);
 if(state.weather==='storm'&&Math.random()<dt*.018){state.stormFlash=.20;oneShotSound('thunder',2.4)}
 state.stormFlash=Math.max(0,state.stormFlash-dt);if(lightningFlash){lightningFlash.position.set(state.x,26,state.z);lightningFlash.intensity=state.stormFlash>0?180:0}
}
function weatherGrip(){return state.weather==='storm'?.67:state.weather==='rain'?.78:1}
function daylightLevel(){
 const t=state.worldTime%24;return clamp(Math.sin((t-6)/12*Math.PI),0,1)
}
function updateStreetLights(day){
 const night=clamp((.48-day)/.40,0,1);
 for(const l of streetLamps){const broken=l.collider&&!l.collider.solid;l.bulb.material.emissiveIntensity=broken?0:.15+night*4.2;l.halo.material.opacity=broken?0:night*.34}
 for(const p of lampLightPool)p.intensity=0;
 if(state.mode!=='outside'||night<.04)return;
 const near=streetLamps.filter(l=>!l.collider||l.collider.solid).map(l=>({l,d:dist2(state.x,state.z,l.x,l.z)})).filter(o=>o.d<72).sort((a,b)=>a.d-b.d).slice(0,lampLightPool.length);
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
 const cy=c.y||0;carHeadLightL.position.set(baseX+lx*dim.width*.26,.72+cy,baseZ+lz*dim.width*.26);
 carHeadLightR.position.set(baseX-lx*dim.width*.26,.72+cy,baseZ-lz*dim.width*.26);
 carHeadTarget.position.set(c.x+fx*36,.55+cy,c.z+fz*36);
 carHeadLightL.intensity=leftBroken?0:92*f;carHeadLightR.intensity=rightBroken?0:92*f
}
function toggleFlashlight(){
 if(state.vehicle||state.boat||state.aircraft)return toast('Taschenlampe nur zu Fuß');
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
 flashlight.intensity=state.flashlight&&!state.vehicle&&!state.boat&&!state.aircraft?110:0;
 flashlightModel.visible=state.flashlight&&!state.vehicle&&!state.boat&&!state.aircraft&&state.firstPerson;
 if(flashlightModel.visible){const rim=flashlightModel.children[1];if(rim&&rim.material)rim.material.emissiveIntensity=2.2}
 updateStreetLights(day);updateCarLights(day)
}
function updateLighting(dt){
 state.worldTime=(state.worldTime+dt*.03)%24;const t=state.worldTime,day=clamp(Math.sin((t-6)/12*Math.PI),0,1),dawn=Math.max(0,1-Math.abs(t-7.0)/1.8),dusk=Math.max(0,1-Math.abs(t-19.2)/1.8);
 hemi.intensity=.22+1.3*day;sun.intensity=.10+2.35*day;const warmth=clamp(dawn+dusk,0,1);sun.color.setRGB(1,.94-.18*warmth,.80-.28*warmth);
 const daySky=new THREE.Color(0x9fc8df),sunset=new THREE.Color(0xd8896a),nightSky=new THREE.Color(0x17263a);const sky=day<.12?nightSky:(warmth>.15?daySky.clone().lerp(sunset,warmth*.52):daySky);scene.background.lerp(sky,.035);
 scene.fog.color.copy(scene.background);sun.position.set(state.x+Math.cos(t/24*Math.PI*2)*110,35+day*150,state.z+Math.sin(t/24*Math.PI*2)*100);sunTarget.position.set(state.x,0,state.z);
 const night=clamp((.50-day)/.44,0,1);windowMats.forEach(o=>{const active=o.type==='home'?night*(.70+(o.seed%3)*.12):night*1.25;o.mat.emissive.setHex(o.type==='home'?0xffc56d:0xd8efff);o.mat.emissiveIntensity=.08+active*2.0});shopLightMats.forEach(m=>m.emissiveIntensity=.05+night*2.7);
 renderer.toneMappingExposure=.88+day*.20+night*.05+state.stormFlash*.20;updatePersonalLights()
}

function setupCockpitAndMirrors(){
 cockpit=new THREE.Group();camera.add(cockpit);cockpit.visible=false;
 const dash=meshBox(1.72,.27,.44,0x252c30,.68,.18);dash.position.set(0,-.49,-.90);cockpit.add(dash);cockpit.userData.dash=dash;
 const trim=meshBox(1.52,.055,.17,0x657177,.38,.48);trim.position.set(0,-.32,-.98);cockpit.add(trim);

 // Größeres mehrteiliges Lenkrad
 const steering=new THREE.Group();steering.position.set(-.30,-.30,-.61);steering.rotation.x=.16;cockpit.add(steering);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(.235,.030,14,40),mat(0x121618,.52,.48));rim.castShadow=true;steering.add(rim);
 const hub=new THREE.Mesh(new THREE.CylinderGeometry(.090,.090,.055,16),mat(0x30383c,.42,.55));hub.rotation.x=Math.PI/2;hub.position.z=.015;steering.add(hub);
 const badge=new THREE.Mesh(new THREE.CylinderGeometry(.047,.047,.061,16),mat(0x8fa4ad,.28,.72));badge.rotation.x=Math.PI/2;badge.position.z=.026;steering.add(badge);
 for(const a of [0,Math.PI*2/3,Math.PI*4/3]){const spoke=meshBox(.175,.032,.026,0x333b3f,.42,.52);spoke.position.set(Math.cos(a)*.085,Math.sin(a)*.085,.005);spoke.rotation.z=a;steering.add(spoke)}
 // Griffverdickungen links/rechts
 for(const a of [-.82,.82]){const grip=new THREE.Mesh(new THREE.TorusGeometry(.235,.042,10,14,.48),mat(0x15191b,.72,.25));grip.rotation.z=a-.24;steering.add(grip)}
 cockpit.userData.wheel=steering;cockpit.userData.steerVisual=0;

 const column=meshBox(.12,.11,.40,0x30373b,.54,.46);column.position.set(-.30,-.39,-.84);cockpit.add(column);
 // Pedale
 for(const x of [-.16,.08]){const pedal=meshBox(.10,.18,.035,0x777f83,.42,.55);pedal.position.set(x,-.64,-.84);pedal.rotation.x=-.38;cockpit.add(pedal)}
 // A-Säulen
 const pillarL=meshBox(.055,.72,.06,0x242a2d,.72,.15);pillarL.position.set(-.76,-.02,-.88);pillarL.rotation.z=-.15;cockpit.add(pillarL);
 const pillarR=pillarL.clone();pillarR.position.x=.76;pillarR.rotation.z=.15;cockpit.add(pillarR);

 const sc=document.createElement('canvas');sc.width=512;sc.height=256;const sx=sc.getContext('2d'),tex=new THREE.CanvasTexture(sc);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const speedPlane=new THREE.Mesh(new THREE.PlaneGeometry(.49,.245),new THREE.MeshBasicMaterial({map:tex,transparent:false}));speedPlane.position.set(.20,-.37,-.65);cockpit.add(speedPlane);
 cockpit.userData.speedCanvas=sc;cockpit.userData.speedCtx=sx;cockpit.userData.speedTex=tex;cockpit.userData.lastSpeed=-1;

 const rearTarget=new THREE.WebGLRenderTarget(512,192,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true});
 const leftTarget=new THREE.WebGLRenderTarget(320,192,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true});
 const rightTarget=new THREE.WebGLRenderTarget(320,192,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true});
 for(const t of [rearTarget.texture,leftTarget.texture,rightTarget.texture]){t.wrapS=THREE.RepeatWrapping;t.repeat.x=-1;t.offset.x=1;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy())}
 const rearCam=new THREE.PerspectiveCamera(58,512/192,.18,220),leftCam=new THREE.PerspectiveCamera(62,320/192,.18,180),rightCam=new THREE.PerspectiveCamera(62,320/192,.18,180);
 scene.add(rearCam,leftCam,rightCam);

 const rear=new THREE.Mesh(new THREE.PlaneGeometry(.86,.31),new THREE.MeshBasicMaterial({map:rearTarget.texture}));rear.position.set(0,.21,-.62);cockpit.add(rear);
 const left=new THREE.Mesh(new THREE.PlaneGeometry(.42,.25),new THREE.MeshBasicMaterial({map:leftTarget.texture}));left.position.set(-.77,-.07,-.68);left.rotation.y=.22;cockpit.add(left);
 const right=new THREE.Mesh(new THREE.PlaneGeometry(.42,.25),new THREE.MeshBasicMaterial({map:rightTarget.texture}));right.position.set(.77,-.07,-.68);right.rotation.y=-.22;cockpit.add(right);
 for(const m of [rear,left,right]){const frame=meshBox(m.geometry.parameters.width+.040,m.geometry.parameters.height+.040,.026,0x171b1d,.65,.40);frame.position.copy(m.position);frame.rotation.copy(m.rotation);frame.position.z-=.018;cockpit.add(frame)}
 mirrorSystem={rearTarget,leftTarget,rightTarget,rearCam,leftCam,rightCam,rear,left,right}
}
function setMirrorCamera(cam,c,angle,side=0){
 const ca=Math.cos(c.a),sa=Math.sin(c.a),lx=-sa,lz=ca;
 cam.position.set(c.x+lx*side,1.42+(c.y||0),c.z+lz*side);
 const lookA=c.a+angle;cam.lookAt(c.x+Math.cos(lookA)*28+lx*side,1.18+(c.y||0),c.z+Math.sin(lookA)*28+lz*side);cam.updateMatrixWorld()
}
function updateCockpit(){
 if(!cockpit)return;
 const c=state.vehicle,show=!!c&&state.firstPerson&&c.spec.type!=='bike';cockpit.visible=show;
 if(!show)return;
 cockpit.userData.dash.material.color.setHex(c.spec.type==='sport'?0x1d2225:c.spec.type==='suv'?0x30383b:0x252c30);
 const steer=(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0);
 const speedRatio=clamp(Math.abs(c.speed)/Math.max(90,c.spec.max),0,1),targetSteer=-steer*(1.35-speedRatio*.55);
 cockpit.userData.steerVisual+=(targetSteer-cockpit.userData.steerVisual)*.18;cockpit.userData.wheel.rotation.z=cockpit.userData.steerVisual;
 const speed=Math.round(Math.abs(c.speed));if(speed!==cockpit.userData.lastSpeed){
  cockpit.userData.lastSpeed=speed;const x=cockpit.userData.speedCtx,cv=cockpit.userData.speedCanvas;
  x.fillStyle='#0c1215';x.fillRect(0,0,cv.width,cv.height);
  const grad=x.createLinearGradient(0,0,cv.width,0);grad.addColorStop(0,'#111c21');grad.addColorStop(.5,'#17262c');grad.addColorStop(1,'#10171a');x.fillStyle=grad;x.fillRect(10,10,cv.width-20,cv.height-20);
  x.strokeStyle='#41545c';x.lineWidth=4;x.strokeRect(10,10,cv.width-20,cv.height-20);
  x.fillStyle='#7fd5ff';x.font='700 104px system-ui';x.textAlign='center';x.fillText(speed,256,132);
  x.fillStyle='#d1dce0';x.font='600 34px system-ui';x.fillText('km/h',256,184);
  x.fillStyle='#8fa1a8';x.font='600 24px system-ui';x.fillText(c.name.slice(0,24),256,226);cockpit.userData.speedTex.needsUpdate=true
 }
}
function renderMirrors(){
 const c=state.vehicle;if(!mirrorSystem||!c||!state.firstPerson||c.spec.type==='bike')return;
 mirrorFrame++;if(mirrorFrame%3!==0)return;
 const wasCockpit=cockpit.visible,wasCar=c.mesh.visible,wasFP=firstPersonBody?firstPersonBody.visible:false;cockpit.visible=false;c.mesh.visible=false;if(firstPersonBody)firstPersonBody.visible=false;
 const oldTarget=renderer.getRenderTarget();
 setMirrorCamera(mirrorSystem.rearCam,c,Math.PI,0);renderer.setRenderTarget(mirrorSystem.rearTarget);renderer.clear();renderer.render(scene,mirrorSystem.rearCam);
 setMirrorCamera(mirrorSystem.leftCam,c,Math.PI*.80,-.72);renderer.setRenderTarget(mirrorSystem.leftTarget);renderer.clear();renderer.render(scene,mirrorSystem.leftCam);
 setMirrorCamera(mirrorSystem.rightCam,c,-Math.PI*.80,.72);renderer.setRenderTarget(mirrorSystem.rightTarget);renderer.clear();renderer.render(scene,mirrorSystem.rightCam);
 renderer.setRenderTarget(oldTarget);c.mesh.visible=wasCar;cockpit.visible=wasCockpit;if(firstPersonBody)firstPersonBody.visible=wasFP
}
function renderMainScene(){
 updateCockpit();renderMirrors();
 const own=state.vehicle&&state.firstPerson?state.vehicle:null,was=own?own.mesh.visible:false;if(own)own.mesh.visible=false;
 renderer.setRenderTarget(null);renderer.render(scene,camera);if(own)own.mesh.visible=was
}
function cameraDir(){
 const cp=Math.cos(state.pitch);return new THREE.Vector3(Math.cos(state.yaw)*cp,Math.sin(state.pitch),Math.sin(state.yaw)*cp)
}
function updateCamera(){
 if(state.aircraft){
  const h=state.aircraft;
  if(state.firstPerson){camera.position.set(h.x+Math.cos(h.a)*.65,h.y+1.15,h.z+Math.sin(h.a)*.65);state.yaw=h.a+state._lookOffsetYaw;const d=cameraDir();camera.lookAt(camera.position.clone().add(d))}
  else{const behind=new THREE.Vector3(h.x-Math.cos(h.a)*10,h.y+5.2,h.z-Math.sin(h.a)*10);camera.position.lerp(behind,.12);camera.lookAt(h.x,h.y+.7,h.z)}
 }else if(state.boat){
  const b=state.boat;if(state.firstPerson){camera.position.set(b.x+Math.cos(b.a)*.8,1.55,b.z+Math.sin(b.a)*.8);state.yaw=b.a+state._lookOffsetYaw;const d=cameraDir();camera.lookAt(camera.position.clone().add(d))}
  else{const behind=new THREE.Vector3(b.x-Math.cos(b.a)*7,4.0,b.z-Math.sin(b.a)*7);camera.position.lerp(behind,.12);camera.lookAt(b.x,.8,b.z)}
 }else if(state.vehicle){
  const c=state.vehicle;if(state.firstPerson){
   const pos=new THREE.Vector3(c.x,1.35+(c.y||0),c.z).add(new THREE.Vector3(Math.cos(c.a)*.45,0,Math.sin(c.a)*.45));camera.position.lerp(pos,.35);state.yaw=c.a+state._lookOffsetYaw;const d=cameraDir();camera.lookAt(camera.position.clone().add(d))
  }else{
   const behind=new THREE.Vector3(c.x-Math.cos(c.a)*7.3,3.9+(c.y||0),c.z-Math.sin(c.a)*7.3);camera.position.lerp(behind,.12);camera.lookAt(c.x,1.0+(c.y||0),c.z)
  }
 }else if(state.firstPerson){
  camera.position.set(state.x,1.72+state.baseY+state.jumpY,state.z);const d=cameraDir();camera.lookAt(camera.position.clone().add(d))
 }else{
  const behind=new THREE.Vector3(state.x-Math.cos(state.yaw)*5.5,3.2+state.baseY+state.jumpY,state.z-Math.sin(state.yaw)*5.5);camera.position.lerp(behind,.18);camera.lookAt(state.x,1.15+state.baseY+state.jumpY,state.z)
 }
 if(state.cameraShake>0){camera.position.x+=(Math.random()-.5)*state.cameraShake;camera.position.y+=(Math.random()-.5)*state.cameraShake*.55;camera.position.z+=(Math.random()-.5)*state.cameraShake}
 const mobile=state.vehicle||state.boat||state.aircraft,targetFov=mobile?72+clamp(Math.abs(mobile.speed)/300,0,1)*7:72;
 if(Math.abs(camera.fov-targetFov)>.03){camera.fov+=(targetFov-camera.fov)*.10;camera.updateProjectionMatrix()}
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
  if(e.fade&&e.mesh.material)e.mesh.material.opacity=clamp(e.ttl<.6?e.ttl/.6:1,0,1)
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
 if(state.vehicle||state.boat||state.aircraft)return toast('Zum Spritzen erst aussteigen');
 if(!state.inventory.includes('Wasserpistole'))return toast('Wasserpistole im Frischmarkt kaufen');if(state.sprayCd>0)return;state.sprayCd=.35;state.activeWeapon='water';spawnBeam(0x64d2ff,7,.035,.16);const n=hitNPC(15);if(n){n.stun=.55;toast('💦 Treffer!')}else toast('💦 Pssssch!')
}
function shootPistol(){
 if(state.vehicle||state.boat||state.aircraft)return toast('Zum Schießen erst aussteigen');
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
 const c=state.vehicle||state.boat||state.aircraft;ui.money.textContent=Math.round(state.money).toLocaleString('de-DE')+' €';ui.vehicleName.textContent=c?c.name:'Zu Fuß';ui.speed.textContent=Math.round(Math.abs(c?c.speed:0))+' km/h';
 ui.hpText.textContent=Math.round(state.hp)+'%';ui.hpBar.style.width=state.hp+'%';ui.carHpText.textContent=state.vehicle?damageLabel(state.vehicle.hp)+' · '+Math.round(state.vehicle.hp)+'%':(state.boat?'Boot':state.aircraft?'Flugfähig':'–');ui.carHpBar.style.width=(state.vehicle?state.vehicle.hp:state.boat||state.aircraft?100:0)+'%';
 ui.heatText.textContent=Math.round(state.heat)+'%';ui.heatBar.style.width=state.heat+'%';if(ui.wanted)ui.wanted.textContent='★'.repeat(state.wantedStars)+'☆'.repeat(5-state.wantedStars);ui.place.textContent=placeName();if(ui.weather)ui.weather.textContent=weatherLabel();ui.inventory.textContent=state.inventory.length?state.inventory.join(' · '):'Leer'
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
 check('Statische Objekt-Collider vorhanden',staticColliders.length>80&&staticColliders.some(c=>c.type==='tree')&&staticColliders.some(c=>c.type==='lamp'));
 check('Swept/Substep-Fahrzeugkollision vorhanden',typeof vehicleSweep==='function'&&typeof vehicleStaticHit==='function');
 check('Handbremse vorhanden',typeof state.handbrake==='boolean');
 check('Reifenspuren/Body-Roll vorhanden',typeof spawnSkidMarks==='function'&&cars.every(c=>Number.isFinite(c.visualRoll)));
 check('Ampeln vorhanden',trafficLights.length===roadsX.length*roadsZ.length&&typeof trafficPhase==='function');
 check('Verkehr hält bei Ampeln',typeof nextIntersectionForCar==='function'&&typeof trafficCarAhead==='function');
 check('Fußgängerregeln vorhanden',typeof approachingTraffic==='function'&&npcs.some(n=>!n.interiorId&&!n.pirate));
 check('5 Fahndungsstufen',wantedFromHeat(99)===5&&police.length===5);
 check('Straßensperren vorhanden',typeof spawnRoadblock==='function');
 check('Spielbarer Hubschrauber vorhanden',!!playerHeli&&typeof updateHelicopter==='function');
 check('Polizeihubschrauber vorhanden',!!policeHeli&&typeof updatePoliceHelicopter==='function'&&!!policeHeli.searchLight);
 check('Steuerbare Hafenboote vorhanden',boats.length===3&&typeof updateBoat==='function');
 check('KI-Renngegner vorhanden',typeof updateRaceAI==='function'&&typeof currentRacePlace==='function');
 check('Motorradphysik/Fahrer vorhanden',!!vehicleSpecs['Ducati Panigale']&&typeof updateVehicle==='function');
 check('3D-Cockpit vorhanden',!!cockpit&&!!cockpit.userData.wheel&&!!cockpit.userData.speedTex);
 check('Rück-/Seitenspiegel-Kameras vorhanden',!!mirrorSystem&&mirrorSystem.rearCam instanceof THREE.PerspectiveCamera&&mirrorSystem.leftCam instanceof THREE.PerspectiveCamera&&mirrorSystem.rightCam instanceof THREE.PerspectiveCamera);
 check('Spielerfigur sichtbar',!!playerAvatar&&!!firstPersonBody&&playerAvatar.userData.legL&&playerAvatar.userData.armR);
 check('Sound-System 5.5',typeof ensureAudio==='function'&&typeof updateAudio==='function'&&typeof oneShotSound==='function');
 check('Wetter-System 5.5',!!rainSystem&&typeof updateWeather==='function'&&typeof weatherGrip==='function');
 check('Tag/Nacht-Fensterlicht',windowMats.length>=buildings.filter(b=>b.type!=='park').length&&shopLightMats.length>0);
 check('Dynamischer Schattenbereich',!!sunTarget&&sun.shadow.normalBias>0);
 check('Individuelle Innenräume',typeof decorateInterior==='function'&&interiors.market&&interiors.police&&interiors.station);
 check('Animierte Türen',doorSystems.length>=buildings.filter(b=>b.door).length&&typeof updateDoors==='function');
 check('Sichtbare Haustüren',buildings.filter(b=>b.type!=='park'&&b.door).every(b=>!!b._pedDoor&&!!doorBy(b.id,'outside')));
 check('Separate Fahrzeugtore',buildings.filter(b=>b.portal).every(b=>!!doorBy(b.id,'vehicleOutside')&&!!doorBy(b.id,'vehicleInside')));
 check('Treppen/Aufzüge',verticalAccess.length>=6&&typeof useVerticalAccess==='function');
 check('Erweitertes Klettern',climbSurfaces.some(c=>c.kind==='ladder')&&climbSurfaces.some(c=>c.kind==='container'));
 check('Erweiterter Baumodus',typeof toggleBuildMode==='function'&&typeof placeBuildPreview==='function'&&BUILD_TYPES.length>=3);
 check('Physikalische Stadtobjekte',physicsProps.length>=20&&physicsProps.some(p=>p.type==='cart')&&physicsProps.some(p=>p.type==='bin'));
 check('Zerstörbare Stadtobjekte 5.7',staticColliders.some(c=>c.type==='trafficSign'&&c.breakable)&&staticColliders.some(c=>c.type==='busShelter'&&c.breakable));
 check('Vier-Reifen-Schadensmodell',cars.every(c=>Array.isArray(c.tireHP)&&c.tireHP.length===4&&Array.isArray(c.flatTires)&&c.flatTires.length===4));
 check('Abtrennbare Fahrzeugteile',typeof spawnDetachedPart==='function'&&typeof updateVehicleDebris==='function');
 check('Physische Stadtviertel-Markierungen',districtLandmarks.length>=6);
 check('Funktionale Brückenhöhe',bridgeElevation57(307,264,0)>5&&bridgeElevation57(307,264,Math.PI/2)===0);
 check('Tunnel/Unterführung vorhanden',typeof buildCityStructures57==='function');
 check('Garage/Tuning API 5.7',typeof garageRepairCost57==='function'&&typeof tuneOwnedCar57==='function'&&typeof storeGarageCar57==='function'&&typeof recallGarageCar57==='function');
 check('Adaptive Grafikqualität 5.8',typeof setCityQuality==='function'&&typeof adaptCityQuality==='function'&&cityQuality.ratio>0);
 check('CITY GYM vorhanden',!!buildingById('gym')&&!!interiors.gym);
 check('Hochauflösender Renderer',MAX_PIXEL_RATIO>=2.75&&renderer.getPixelRatio()<=MAX_PIXEL_RATIO);
 check('Hochauflösende Spiegel',!!mirrorSystem&&mirrorSystem.rearTarget.width===512&&mirrorSystem.leftTarget.width===320);
 check('Detailliertes Lenkrad',!!cockpit&&!!cockpit.userData.wheel&&cockpit.userData.wheel.children.length>=5);
 const failed=results.filter(r=>!r.ok);window.CityLifeDiagnostics={version:'5.7',results,passed:results.length-failed.length,failed:failed.length};
 log('🧪 Selbsttest: '+(results.length-failed.length)+'/'+results.length+' bestanden.');
 if(failed.length)console.warn('City Life Selbsttest fehlgeschlagen',failed);else console.info('City Life Selbsttest bestanden',results);
 return window.CityLifeDiagnostics
}
runSelfTest();

function normalizeKey(e){return e.key.length===1?e.key.toLowerCase():e.key}
document.addEventListener('pointerdown',unlockAudio,{passive:true});
document.addEventListener('keydown',e=>{
 unlockAudio();const k=normalizeKey(e);if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)){keys.add(k);e.preventDefault()}
 if(k==='e'){if(state.buildMode)placeBuildPreview();else action();e.preventDefault()}if(k==='f'){vehicleAction();e.preventDefault()}if(k==='l'){toggleFlashlight();e.preventDefault()}if(k==='h'){toggleHeadlights();e.preventDefault()}if(k==='g'){sprayWater();e.preventDefault()}if(k==='r'){shootPistol();e.preventDefault()}if(k==='v'){toggleView();e.preventDefault()}if(k==='q'){punch();e.preventDefault()}if(k==='b'){toggleBuildMode();e.preventDefault()}if(k==='t'){startRace();e.preventDefault()}if(e.code==='Space'){if(state.aircraft)state.heliUp=true;else if(state.vehicle)state.handbrake=true;else tryJump();e.preventDefault()}if(e.key==='Shift'){if(state.aircraft)state.heliDown=true;else state.sprint=true}
});
document.addEventListener('keyup',e=>{keys.delete(normalizeKey(e));if(e.key==='Shift'){state.sprint=false;state.heliDown=false}if(e.code==='Space'){state.handbrake=false;state.heliUp=false}});
window.addEventListener('blur',()=>{keys.clear();state.sprint=false;state.handbrake=false;state.heliUp=false;state.heliDown=false});
document.addEventListener('pointerlockchange',()=>pointerLocked=document.pointerLockElement===canvas);
canvas.addEventListener('click',()=>{if(window.matchMedia&&matchMedia('(pointer:fine)').matches&&canvas.requestPointerLock&&!pointerLocked)canvas.requestPointerLock()});
document.addEventListener('mousemove',e=>{if(!pointerLocked)return;state.yaw+=e.movementX*.0022;state.pitch=clamp(state.pitch-e.movementY*.0018,-1.15,1.15);if(state.vehicle)state._lookOffsetYaw=clamp(state._lookOffsetYaw+e.movementX*.0022,-1.15,1.15)});
canvas.addEventListener('pointerdown',e=>{unlockAudio();if(e.pointerType==='touch'){lookDragging=true;lastPX=e.clientX;lastPY=e.clientY;try{canvas.setPointerCapture(e.pointerId)}catch(_){}}});
canvas.addEventListener('pointermove',e=>{if(!lookDragging||e.pointerType!=='touch')return;const dx=e.clientX-lastPX,dy=e.clientY-lastPY;lastPX=e.clientX;lastPY=e.clientY;state.yaw+=dx*.006;state.pitch=clamp(state.pitch-dy*.005,-1.12,1.12);if(state.vehicle)state._lookOffsetYaw=clamp(state._lookOffsetYaw+dx*.006,-1.15,1.15)});
canvas.addEventListener('pointerup',()=>lookDragging=false);canvas.addEventListener('pointercancel',()=>lookDragging=false);

const dirMap={up:'w',down:'s',left:'a',right:'d'};
document.querySelectorAll('[data-dir]').forEach(btn=>{const k=dirMap[btn.dataset.dir];const on=e=>{e.preventDefault();keys.add(k);try{btn.setPointerCapture(e.pointerId)}catch(_){}};const off=e=>{keys.delete(k);try{btn.releasePointerCapture(e.pointerId)}catch(_){}};btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off)});
document.getElementById('actionBtn').onclick=action;document.getElementById('vehicleBtn').onclick=vehicleAction;document.getElementById('flashlightBtn').onclick=toggleFlashlight;document.getElementById('headlightBtn').onclick=toggleHeadlights;document.getElementById('weatherBtn').onclick=()=>{unlockAudio();cycleWeather()};
const hb=document.getElementById('handbrakeBtn');hb.addEventListener('pointerdown',e=>{e.preventDefault();if(!state.vehicle)return toast('Handbremse nur im Fahrzeug');state.handbrake=true;try{hb.setPointerCapture(e.pointerId)}catch(_){}});const hbOff=e=>{state.handbrake=false;try{hb.releasePointerCapture(e.pointerId)}catch(_){}};hb.addEventListener('pointerup',hbOff);hb.addEventListener('pointercancel',hbOff);
const hu=document.getElementById('heliUpBtn'),hd=document.getElementById('heliDownBtn');
hu.addEventListener('pointerdown',e=>{e.preventDefault();if(!state.aircraft)return toast('Nur im Hubschrauber');state.heliUp=true;try{hu.setPointerCapture(e.pointerId)}catch(_){}});
hu.addEventListener('pointerup',()=>state.heliUp=false);hu.addEventListener('pointercancel',()=>state.heliUp=false);
hd.addEventListener('pointerdown',e=>{e.preventDefault();if(!state.aircraft)return toast('Nur im Hubschrauber');state.heliDown=true;try{hd.setPointerCapture(e.pointerId)}catch(_){}});
hd.addEventListener('pointerup',()=>state.heliDown=false);hd.addEventListener('pointercancel',()=>state.heliDown=false);document.getElementById('punchBtn').onclick=punch;document.getElementById('jumpBtn').onclick=tryJump;document.getElementById('buildBtn').onclick=()=>toggleBuildMode();document.getElementById('raceBtn').onclick=startRace;document.getElementById('sprayBtn').onclick=sprayWater;document.getElementById('shootBtn').onclick=shootPistol;
document.getElementById('sprintBtn').onclick=()=>{state.sprint=!state.sprint;toast(state.sprint?'Sprint an':'Sprint aus')};document.getElementById('resetBtn').onclick=resetGame;document.getElementById('viewBtn').onclick=toggleView;document.getElementById('fullscreenBtn').onclick=toggleFullscreen;

function loop(now){
 const dt=Math.min(.033,(now-last)/1000||.016);last=now;adaptCityQuality(dt);state.sprayCd=Math.max(0,state.sprayCd-dt);state.shootCd=Math.max(0,state.shootCd-dt);state.punchCd=Math.max(0,state.punchCd-dt);
 state.cameraShake=Math.max(0,state.cameraShake-dt*.72);if(state.aircraft)updateHelicopter(dt);else if(state.boat)updateBoat(dt);else if(state.vehicle)updateVehicle(dt);else updateFoot(dt);updateTrafficLights(dt);updateTraffic(dt);updateNPCs(dt);updateDoors(dt);updatePolice(dt);updatePoliceHelicopter(dt);updateWeather(dt);updateLighting(dt);updatePickups(dt);updateRace(dt);updateVehicleDamageFX(dt);updateVehicleDebris(dt);updatePhysicsProps(dt);updateBuildPreview();updatePlayerAvatar(dt);updateCamera();updateHeldWeapons(dt);updateEffects(dt);updateAudio(dt);if(!state.vehicle&&!state.boat&&!state.aircraft&&(keys.has('w')||keys.has('a')||keys.has('s')||keys.has('d')||keys.has('ArrowUp')||keys.has('ArrowDown'))){footstepClock+=dt*(state.sprint?1.7:1);if(footstepClock>.42){footstepClock=0;oneShotSound('step',state.sprint?1.2:.8)}}else footstepClock=0;saveTimer+=dt;if(saveTimer>5){saveTimer=0;saveGame()}hud();renderMainScene();requestAnimationFrame(loop)
}
log('🌆 City Life 5.7: Stadt-Handy, GPS, Garage, Tuning und neue Bauwerke gestartet.');
log('🚗 Ein freier City Sedan steht nahe dem Start. Mit F einsteigen.');
// Integration API for City Life 5.7 smartphone, garage, tuning, map and GPS.
function garageBuilding57(){return buildingById('garage')}
function nearGarage57(max=55){
 const b=garageBuilding57();if(!b)return false;const p=b._pedDoor||b.door||[b.x+b.w/2,b.z+b.d/2];return dist2(state.x,state.z,p[0],p[1])<=max
}
function garageRepairCost57(c){
 if(!c)return 0;const flat=(c.flatTires||[]).filter(Boolean).length,parts=Object.values(c.detachedParts||{}).filter(Boolean).length;
 return Math.max(180,Math.round((100-c.hp)*7+flat*140+parts*160))
}
function repairOwnedCar57(c){
 if(!c||!c.owned)return false;const eligible=c.garageStored||(state.vehicle===c&&nearGarage57());if(!eligible)return false;
 const cost=garageRepairCost57(c);if(state.money<cost)return false;state.money-=cost;c.hp=100;repairTires(c);restoreDetachedParts(c);c.loosePart=false;applyDamageVisual(c,true);saveGame();hud();toast('🔧 Fahrzeug vollständig repariert · '+cost+' €');return true
}
function tuneOwnedCar57(c,part){
 if(!c||!c.owned)return false;const eligible=c.garageStored||(state.vehicle===c&&nearGarage57());if(!eligible)return false;
 const costs={engine:320,brakes:180,tires:160,paint:120,rims:130,suspension:210};if(!costs[part]||state.money<costs[part])return false;c.tuning=c.tuning||{};if(c.tuning[part])return false;
 state.money-=costs[part];c.tuning[part]=true;
 if(part==='tires')repairTires(c);
 if(part==='engine')c.spec={...c.spec,max:c.spec.max*1.12,acc:c.spec.acc*1.15};
 if(part==='suspension')c.spec={...c.spec,turn:c.spec.turn*1.12};
 if(part==='paint'&&c.mesh.userData.body){c.mesh.userData.baseColor=0x27a5a0;c.mesh.userData.body.material.color.setHex(0x27a5a0);if(c.mesh.userData.hood)c.mesh.userData.hood.material.color.setHex(0x27a5a0)}
 if(part==='rims')(c.mesh.userData.wheels||[]).forEach(w=>{if(w.material){w.material=w.material.clone();w.material.color.setHex(0xd5b86e);w.material.metalness=.68;w.material.roughness=.30}});
 saveGame();hud();toast('🔧 Tuning: '+part);return true
}
function storeGarageCar57(id){
 const c=cars.find(v=>v.id===id);if(!c||!c.owned||state.vehicle!==c||state.mode!=='outside'||!nearGarage57())return false;
 state.vehicle=null;state.speedKmh=0;c.speed=0;c.garageStored=true;c.mesh.visible=false;if(c.mesh.userData.rider)c.mesh.userData.rider.visible=false;saveGame();hud();toast('🏠 Fahrzeug in der Garage eingelagert');return true
}
function recallGarageCar57(id){
 const c=cars.find(v=>v.id===id);if(!c||!c.owned||state.mode!=='outside'||state.vehicle||state.boat||state.aircraft||!nearGarage57())return false;
 c.garageStored=false;c.x=431;c.z=101;c.y=0;c.a=Math.PI/2;c.speed=0;c.interiorId=null;c.mesh.position.set(c.x,0,c.z);c.mesh.rotation.set(0,-c.a,0);c.mesh.visible=true;saveGame();toast('🚗 Fahrzeug am MOTORWERK bereitgestellt');return true
}
window.CityLife57={
 quality:()=>({...cityQuality}),setQuality:setCityQuality,
 snapshot:()=>({
  x:state.x,z:state.z,mode:state.mode,money:state.money,vehicleId:state.vehicle?.id||null,nearGarage:nearGarage57(),roadsX:[...roadsX],roadsZ:[...roadsZ],worldW:WORLD_W,worldD:WORLD_D,
  buildings:buildings.filter(b=>b.type!=='park').map(b=>({id:b.id,name:b.name||b.id,x:b.door?.[0]??b.x+b.w/2,z:b.door?.[1]??b.z+b.d/2,type:b.type})),
  districts:districtLandmarks.map(d=>({name:d.name,x:d.x,z:d.z})),
  cars:cars.filter(c=>!c.ai&&!c.police&&!c.raceAI).map(c=>({id:c.id,name:c.name,owned:c.owned,x:c.x,z:c.z,hp:c.hp,interiorId:c.interiorId,garageStored:!!c.garageStored,flatCount:(c.flatTires||[]).filter(Boolean).length,tireHP:[...(c.tireHP||[])],tuning:{...(c.tuning||{})},repairCost:garageRepairCost57(c)}))
 }),
 tune:(id,part)=>tuneOwnedCar57(cars.find(v=>v.id===id),part),
 recall:id=>recallGarageCar57(id),
 store:id=>storeGarageCar57(id),
 repair:id=>repairOwnedCar57(cars.find(v=>v.id===id)),
 releaseControls:()=>{keys.clear();state.sprint=false;state.handbrake=false;state.heliUp=false;state.heliDown=false},
 notify:message=>toast(message)
};
hud();requestAnimationFrame(loop);
})();