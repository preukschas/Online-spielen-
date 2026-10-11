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

const WORLD_W=620,WORLD_D=420,ROAD_W=24.4,SIDEWALK=4.0;
const roadsX=[65,185,307,431,555],roadsZ=[52,157,264,369];
const keys=new Set(),buildingMeshes=[],solidBoxes=[],cars=[],traffic=[],npcs=[],police=[],effects=[];
const raycaster=new THREE.Raycaster();
const centerNdc=new THREE.Vector2(0,0);
let toastTimer=0,last=performance.now(),lookDragging=false,lastPX=0,lastPY=0,pointerLocked=false;

const state={
 x:117,z:157,yaw:0,pitch:0,money:1000,hp:100,heat:0,lastCrime:99,
 sprint:false,vehicle:null,speedKmh:0,firstPerson:true,inventory:[],activeWeapon:null,
 sprayCd:0,shootCd:0,punchCd:0,worldTime:16.2
};

const buildings=[
 {id:'market',x:8,z:7,w:45,d:32,name:'FRISCHMARKT',type:'shop',color:0xb86c53,door:[30.5,41.5],items:[['Getränk',4,'🥤',4],['Snack',6,'🥪',8],['Lebensmittel',25,'🛍️',0],['Wasserpistole',35,'💦',0]]},
 {id:'home-a',x:79,z:6,w:76,d:33,name:'WOHNHAUS AM PARK',type:'home',color:0xbb8b65,door:[117,42]},
 {id:'tech',x:211,z:7,w:70,d:32,name:'TECH CENTER',type:'shop',color:0x929da6,door:[246,41.5],items:[['Kopfhörer',55,'🎧',0],['Smartwatch',180,'⌚',0],['Smartphone',320,'📱',0],['Laptop',900,'💻',0]]},
 {id:'cafe',x:335,z:7,w:70,d:32,name:'CAFÉ CENTRAL',type:'cafe',color:0xa96e52,door:[370,41.5],items:[['Kaffee',4,'☕',6],['Kuchen',6,'🍰',8],['Sandwich',8,'🥪',12]]},
 {id:'premium',x:459,z:6,w:90,d:33,name:'PREMIUM MOTORS',type:'dealer',color:0x8b969e},
 {id:'logistics',x:8,z:72,w:45,d:56,name:'LOGISTIK',type:'job',color:0xa9977a,door:[56,100]},
 {id:'park',x:79,z:72,w:76,d:56,name:'STADTPARK',type:'park',color:0x71965f},
 {id:'dealer',x:211,z:72,w:70,d:56,name:'CITY MOTORS',type:'dealer',color:0x8c979f},
 {id:'parking',x:335,z:72,w:70,d:56,name:'PARKHAUS',type:'parking',color:0x777e83},
 {id:'garage',x:459,z:72,w:90,d:56,name:'MOTORWERK',type:'garage',color:0x85898b,door:[456,100]},
 {id:'fashion',x:8,z:178,w:45,d:50,name:'MODEHAUS',type:'shop',color:0xc18c74,door:[56,203],items:[['T-Shirt',30,'👕',0],['Sneaker',75,'👟',0],['Jacke',80,'🧥',0],['Uhr',120,'⌚',0]]},
 {id:'home-b',x:79,z:177,w:76,d:51,name:'WOHNQUARTIER',type:'home',color:0xb87f60,door:[117,231]},
 {id:'mall',x:211,z:178,w:70,d:50,name:'CITY MALL',type:'shop',color:0x999ca0,door:[246,231],items:[['Kamera',350,'📷',0],['Konsole',450,'🎮',0],['Pistole',650,'🔫',0],['Schmuck',600,'💎',0]]},
 {id:'moto',x:335,z:178,w:70,d:50,name:'BIKE & MOTO',type:'dealer',color:0x8b9196},
 {id:'home-c',x:459,z:177,w:90,d:51,name:'WOHNPARK',type:'home',color:0xb9896b,door:[504,231]},
 {id:'police',x:8,z:285,w:45,d:35,name:'POLIZEI',type:'police',color:0x89969f,door:[56,302.5]},
 {id:'station',x:79,z:285,w:76,d:35,name:'HAUPTBAHNHOF',type:'station',color:0x929a9e,door:[117,282]},
 {id:'office',x:211,z:285,w:70,d:35,name:'BUSINESS CENTER',type:'office',color:0xa89c88,door:[246,282]},
 {id:'gas',x:335,z:285,w:70,d:35,name:'TANKSTELLE',type:'garage',color:0xa49e89,door:[332,302.5]},
 {id:'exotic',x:459,z:285,w:90,d:35,name:'EXOTIC MOTORS',type:'dealer',color:0x8f9499}
];

const vehicleSpecs={
 'City Sedan':{color:0x416f9d,max:210,acc:78,turn:1.7,price:28000,type:'sedan'},
 'Falcon SUV':{color:0x546b53,max:190,acc:64,turn:1.45,price:52000,type:'suv'},
 'Cargo Van':{color:0xd6d2c8,max:165,acc:52,turn:1.25,price:39000,type:'van'},
 'Volt E':{color:0x4c7e88,max:240,acc:92,turn:1.75,price:68000,type:'electric'},
 'Lamborghini Huracán':{color:0xe1b52d,max:325,acc:120,turn:1.95,price:265000,type:'sport'},
 'Bugatti Chiron':{color:0x275f9e,max:420,acc:132,turn:1.9,price:420000,type:'sport'},
 'Ferrari 488':{color:0xb62c31,max:340,acc:124,turn:1.92,price:290000,type:'sport'},
 'Ferrari Roma':{color:0x8d202c,max:320,acc:112,turn:1.85,price:245000,type:'sport'}
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
function makeLabel(text,width=7){
 const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle='rgba(23,29,32,.88)';x.fillRect(0,0,512,128);x.fillStyle='#fff';x.font='700 44px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,64);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));s.scale.set(width,width*.25,1);return s
}

function structureRect(b){
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
 if(x<1||z<1||x>WORLD_W-1||z>WORLD_D-1)return true;
 for(const b of buildings){if(b.type==='park')continue;const q=structureRect(b);if(x+r>q.x&&x-r<q.x+q.w&&z+r>q.z&&z-r<q.z+q.d)return true}
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
function makeLamp(x,z){
 const g=new THREE.Group();const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.11,4.6,8),mat(0x424a4e,.7,.35));pole.position.y=2.3;pole.castShadow=true;g.add(pole);const arm=addBox(.45,4.48,0,.9,.08,.08,0x424a4e,.7,.35,g);const lamp=addBox(.86,4.40,0,.35,.15,.30,0xd9dcda,.35,.1,g);g.position.set(x,0,z);scene.add(g)
}
function populateProps(){
 for(const z of roadsZ)for(let x=26;x<WORLD_W-18;x+=52){if(roadsX.some(v=>Math.abs(x-v)<23))continue;makeLamp(x,z-ROAD_W/2-SIDEWALK-1.1);makeLamp(x,z+ROAD_W/2+SIDEWALK+1.1)}
 for(const x of roadsX)for(let z=25;z<WORLD_D-15;z+=57){if(roadsZ.some(v=>Math.abs(z-v)<23))continue;makeLamp(x-ROAD_W/2-SIDEWALK-1.1,z);makeLamp(x+ROAD_W/2+SIDEWALK+1.1,z)}
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
function makeCarMesh(name,policeCar=false){
 const sp=vehicleSpecs[name]||vehicleSpecs['City Sedan'],g=new THREE.Group(),sport=sp.type==='sport',suv=sp.type==='suv',van=sp.type==='van';
 const length=sport?4.5:van?5.0:suv?4.7:4.4,width=sport?1.92:suv?1.95:1.82,height=sport?1.0:suv?1.65:van?1.75:1.42;
 const bodyColor=policeCar?0xe7ecef:sp.color;
 const body=meshBox(length,.48,width,bodyColor,.40,.38);body.position.y=.62;g.add(body);
 const hood=meshBox(length*.34,.22,width*.90,bodyColor,.38,.38);hood.position.set(length*.30,.92,0);g.add(hood);
 const cabin=meshBox(length*.42,height*.55,width*.78,0x335564,.22,.12);cabin.position.set(-length*.06,.98+(height-1)*.25,0);g.add(cabin);
 if(policeCar){addBox(-length*.10,1.55,0,.65,.11,.28,0x22272a,.4,.2,g);addBox(-length*.22,1.62,0,.28,.09,.22,0xd33b3b,.3,.1,g);addBox(.02,1.62,0,.28,.09,.22,0x3475da,.3,.1,g)}
 const wheelMat=mat(0x17191a,.95,.05),hubMat=mat(0x8d9498,.45,.7);
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const wx=sx*length*.31,wz=sz*width*.52,w=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.20,12),wheelMat);w.rotation.x=Math.PI/2;w.position.set(wx,.37,wz);w.castShadow=true;g.add(w);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.205,10),hubMat);hub.rotation.x=Math.PI/2;hub.position.copy(w.position);g.add(hub)
 }
 addBox(length*.49,.68,-width*.32,.05,.13,.36,0xf3e7ae,.25,.1,g);addBox(length*.49,.68,width*.32,.05,.13,.36,0xf3e7ae,.25,.1,g);
 addBox(-length*.49,.68,-width*.32,.05,.13,.36,0xb52f32,.35,.1,g);addBox(-length*.49,.68,width*.32,.05,.13,.36,0xb52f32,.35,.1,g);
 if(name.includes('Bugatti')){const grille=new THREE.Mesh(new THREE.TorusGeometry(.34,.07,6,16,Math.PI*1.5),mat(0x1d2529,.3,.75));grille.rotation.y=Math.PI/2;grille.position.set(length*.51,.62,0);g.add(grille)}
 if(name.includes('Lamborghini')){addBox(length*.12,.72,0,.06,.25,width*.74,0x1b2226,.35,.45,g)}
 g.userData.dim={length,width,height};return g
}
function addCar(name,x,z,a=0,opt={}){
 const sp=vehicleSpecs[name],mesh=makeCarMesh(name,!!opt.police);mesh.position.set(x,0,z);mesh.rotation.y=-a;scene.add(mesh);
 const car={name,spec:sp,mesh,x,z,a,speed:0,hp:100,lastDamage:-99,locked:!!opt.locked,forSale:!!opt.forSale,price:opt.price||sp.price,police:!!opt.police,ai:!!opt.ai,axis:opt.axis||null,dir:opt.dir||1};cars.push(car);return car
}
function spawnCars(){
 addCar('City Sedan',126,164,0,{});
 addCar('Falcon SUV',172,150,Math.PI/2,{});
 addCar('Volt E',296,157,0,{});
 addCar('Lamborghini Huracán',474,43,0,{locked:true,forSale:true});
 addCar('Ferrari 488',494,43,0,{locked:true,forSale:true});
 addCar('Bugatti Chiron',514,43,0,{locked:true,forSale:true});
 addCar('Bugatti Chiron',475,331,0,{locked:true,forSale:true});
 addCar('Lamborghini Huracán',497,331,0,{locked:true,forSale:true});
 addCar('Ferrari 488',519,331,0,{locked:true,forSale:true});
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

function setupWorld(){
 buildGround();buildings.forEach(makeBuilding);populateTrees();populateProps();spawnNPCs();spawnCars();spawnPolice();buildHarbor()
}
setupWorld();

function currentCar(){return state.vehicle}
function nearestCar(max=4.6){
 let best=null,bd=max;for(const c of cars){if(c.ai||c.police)continue;const d=dist2(state.x,state.z,c.x,c.z);if(d<bd){bd=d;best=c}}return best
}
function nearestBuilding(max=8){
 let best=null,bd=max;for(const b of buildings){if(b.type==='park')continue;const p=b.door||[b.x+b.w/2,b.z+b.d/2],d=dist2(state.x,state.z,p[0],p[1]);if(d<bd){bd=d;best=b}}return best
}
function clearPanel(title){ui.panel.innerHTML='';const t=document.createElement('div');t.className='strong';t.textContent=title;ui.panel.appendChild(t);const row=document.createElement('div');row.className='action-buttons';row.style.marginTop='8px';ui.panel.appendChild(row);return row}
function pbtn(text,fn,primary=false){const b=document.createElement('button');b.textContent=text;if(primary)b.className='primary';b.onclick=fn;return b}
function openBuilding(b){
 const row=clearPanel(b.name);
 if(b.type==='shop'||b.type==='cafe'){
  for(const it of b.items||[]){const [name,price,icon,heal=0]=it;row.appendChild(pbtn('Kaufen '+icon+' '+name+' · '+price+' €',()=>{
   if(state.money<price)return toast('Zu wenig Geld');
   if(name==='Wasserpistole'&&state.inventory.includes('Wasserpistole'))return toast('Schon vorhanden');
   if(name==='Pistole'&&state.inventory.includes('Pistole'))return toast('Schon vorhanden');
   state.money-=price;if(heal)state.hp=clamp(state.hp+heal,0,100);else state.inventory.push(name);if(name==='Wasserpistole')state.activeWeapon='water';if(name==='Pistole')state.activeWeapon='pistol';log(name+' gekauft.');hud()
  },price<=10))}
 }else if(b.type==='job')row.appendChild(pbtn('📦 Arbeiten · +120 €',()=>{state.money+=120;log('Schicht beendet: +120 €.');hud()},true));
 else if(b.type==='garage')row.appendChild(pbtn('🔧 Fahrzeug reparieren · 500 €',()=>{if(!state.vehicle)return toast('Mit Fahrzeug kommen');if(state.money<500)return toast('Zu wenig Geld');state.money-=500;state.vehicle.hp=100;log('Fahrzeug repariert.');hud()},true));
 else if(b.type==='home')row.appendChild(pbtn('🛏️ Ausruhen',()=>{state.hp=100;state.heat=Math.max(0,state.heat-10);hud();toast('Ausgeruht')},true));
 else {const s=document.createElement('span');s.className='muted';s.textContent='3D-Gebäude – Innenräume folgen als nächster Ausbauschritt.';row.appendChild(s)}
}
function openCarSale(c){
 const row=clearPanel(c.name+' · '+c.price.toLocaleString('de-DE')+' €');
 row.appendChild(pbtn('Kaufen',()=>{if(state.money<c.price)return toast('Zu wenig Geld');state.money-=c.price;c.locked=false;c.forSale=false;log(c.name+' gekauft.');hud()},true));
 row.appendChild(pbtn('Im Spiel klauen',()=>{c.locked=false;c.forSale=false;crime(35,'Fahrzeugdiebstahl – Polizei sucht dich.');toast('F drücken und losfahren')}));
}
function action(){
 if(state.vehicle)return toast('Zum Interagieren aussteigen');
 const c=nearestCar(4);if(c&&c.locked&&c.forSale)return openCarSale(c);
 const b=nearestBuilding();if(b)return openBuilding(b);
 toast('Nichts in Reichweite')
}
function vehicleAction(){
 if(state.vehicle){
  const c=state.vehicle;state.x=c.x-Math.cos(c.a)*2.5;state.z=c.z-Math.sin(c.a)*2.5;state.vehicle=null;state.speedKmh=0;toast('Ausgestiegen');return
 }
 const c=nearestCar();if(!c)return toast('Kein Fahrzeug in der Nähe');if(c.locked)return toast('Fahrzeug ist gesperrt – E für Optionen');
 state.vehicle=c;state.speedKmh=c.speed||0;state.yaw=c.a;toast('Eingestiegen: '+c.name)
}

function vehicleDamage(c,amount){
 const now=performance.now()/1000;if(now-c.lastDamage<.42)return;c.lastDamage=now;const before=damageStage(c.hp);c.hp=clamp(c.hp-amount,0,100);const after=damageStage(c.hp);if(after>before)toast(damageLabel(c.hp));if(c.hp<=0){c.speed=0;state.speedKmh=0}
}
function updateVehicle(dt){
 const c=state.vehicle;if(!c)return;
 const up=keys.has('w')||keys.has('ArrowUp'),down=keys.has('s')||keys.has('ArrowDown'),left=keys.has('a')||keys.has('ArrowLeft'),right=keys.has('d')||keys.has('ArrowRight');
 if(c.hp<=0){c.speed*=.93}else{
  if(up)c.speed+=c.spec.acc*dt;if(down)c.speed-=c.spec.acc*.92*dt;
  c.speed*=Math.pow(.985,dt*60);c.speed=clamp(c.speed,-45,c.spec.max);
  const steer=(right?1:0)-(left?1:0),factor=clamp(Math.abs(c.speed)/45,.18,1.1);c.a+=steer*c.spec.turn*dt*factor*(c.speed>=0?1:-1)
 }
 const ms=c.speed/3.6,nx=c.x+Math.cos(c.a)*ms*dt,nz=c.z+Math.sin(c.a)*ms*dt;
 if(!blocked(nx,nz,1.15)){c.x=nx;c.z=nz}else{vehicleDamage(c,Math.min(24,4+Math.abs(c.speed)*.06));c.speed*=-.12}
 c.mesh.position.set(c.x,0,c.z);c.mesh.rotation.y=-c.a;state.x=c.x;state.z=c.z;state.yaw=c.a;state.speedKmh=c.speed
}
function updateFoot(dt){
 const forward=(keys.has('w')||keys.has('ArrowUp')?1:0)-(keys.has('s')||keys.has('ArrowDown')?1:0);
 const strafe=(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0);
 if(!forward&&!strafe)return;
 const len=Math.hypot(forward,strafe)||1,f=forward/len,s=strafe/len,spd=state.sprint?6.6:4.1;
 const dx=Math.cos(state.yaw)*f-Math.sin(state.yaw)*s,dz=Math.sin(state.yaw)*f+Math.cos(state.yaw)*s;
 const nx=state.x+dx*spd*dt,nz=state.z+dz*spd*dt;if(!blocked(nx,nz,.48)){state.x=nx;state.z=nz}
}
function updateTraffic(dt){
 for(const c of traffic){
  const ms=c.speed/3.6;if(c.axis==='h'){c.x+=c.dir*ms*dt;if(c.x>WORLD_W+8)c.x=-8;if(c.x<-8)c.x=WORLD_W+8;c.a=c.dir>0?0:Math.PI}
  else{c.z+=c.dir*ms*dt;if(c.z>WORLD_D+8)c.z=-8;if(c.z<-8)c.z=WORLD_D+8;c.a=c.dir>0?Math.PI/2:-Math.PI/2}
  c.mesh.position.set(c.x,0,c.z);c.mesh.rotation.y=-c.a
 }
}
function updateNPCs(dt){
 for(const n of npcs){
  if(n.pirate)continue;if(n.stun>0){n.stun-=dt;continue}n.phase+=dt*5;
  if(n.horizontal){n.x+=n.dir*n.speed*dt;if(n.x<12||n.x>WORLD_W-12)n.dir*=-1}else{n.z+=n.dir*n.speed*dt;if(n.z<12||n.z>WORLD_D-38)n.dir*=-1}
  n.mesh.position.set(n.x,0,n.z);n.mesh.rotation.y=n.horizontal?(n.dir>0?-Math.PI/2:Math.PI/2):(n.dir>0?Math.PI:0);
  const u=n.mesh.userData,u1=Math.sin(n.phase)*.42;u.legL.rotation.z=u1;u.legR.rotation.z=-u1;u.armL.rotation.z=.22-u1*.55;u.armR.rotation.z=-.22+u1*.55
 }
}
function updatePolice(dt){
 state.lastCrime+=dt;if(state.lastCrime>7)state.heat=Math.max(0,state.heat-dt*1.7);
 for(let i=0;i<police.length;i++){
  const p=police[i];if(state.heat<25){p.mesh.visible=false;continue}
  p.mesh.visible=true;if(!p._active){p.x=state.x-25-i*5;p.z=state.z+18+i*8;p._active=true}
  const tx=state.x,tz=state.z,a=Math.atan2(tz-p.z,tx-p.x);p.a=a;p.speed=clamp((p.speed||0)+70*dt,0,220);
  const ms=p.speed/3.6,nx=p.x+Math.cos(a)*ms*dt,nz=p.z+Math.sin(a)*ms*dt;if(!blocked(nx,nz,1)){p.x=nx;p.z=nz}
  p.mesh.position.set(p.x,0,p.z);p.mesh.rotation.y=-a
  if(dist2(p.x,p.z,state.x,state.z)<2.5){state.heat=Math.max(0,state.heat-25*dt);state.hp=Math.max(0,state.hp-2*dt)}
 }
 if(state.heat<20)for(const p of police)p._active=false
}
function updateLighting(dt){
 state.worldTime=(state.worldTime+dt*.03)%24;const t=state.worldTime,day=clamp(Math.sin((t-6)/12*Math.PI),0,1);hemi.intensity=.25+1.3*day;sun.intensity=.12+2.3*day;
 const sky=new THREE.Color(day>.15?0x9fc8df:0x17263a);scene.background.lerp(sky,.03);scene.fog.color.copy(scene.background);sun.position.set(Math.cos(t/24*Math.PI*2)*140,35+day*150,Math.sin(t/24*Math.PI*2)*120)
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
  camera.position.set(state.x,1.72,state.z);const d=cameraDir();camera.lookAt(camera.position.clone().add(d))
 }else{
  const behind=new THREE.Vector3(state.x-Math.cos(state.yaw)*5.5,3.2,state.z-Math.sin(state.yaw)*5.5);camera.position.lerp(behind,.18);camera.lookAt(state.x,1.15,state.z)
 }
}
state._lookOffsetYaw=0;
function toggleView(){state.firstPerson=!state.firstPerson;document.getElementById('viewBtn').textContent=state.firstPerson?'👁 Ich-Perspektive':'🎥 Verfolgerkamera';toast(state.firstPerson?'Ich-Perspektive':'Verfolgerkamera')}

function hitNPC(max=18){
 raycaster.setFromCamera(centerNdc,camera);const meshes=[];for(const n of npcs){n.mesh.traverse(o=>{if(o.isMesh){o.userData.npc=n;meshes.push(o)}})}const hits=raycaster.intersectObjects(meshes,false);for(const h of hits){if(h.distance<=max&&h.object.userData.npc)return h.object.userData.npc}return null
}
function sprayWater(){
 if(!state.inventory.includes('Wasserpistole'))return toast('Wasserpistole im Frischmarkt kaufen');if(state.sprayCd>0)return;state.sprayCd=.35;state.activeWeapon='water';const n=hitNPC(15);if(n){n.stun=.55;toast('💦 Treffer!')}else toast('💦 Pssssch!')
}
function shootPistol(){
 if(!state.inventory.includes('Pistole'))return toast('Pistole in der City Mall kaufen');if(state.shootCd>0)return;state.shootCd=.42;state.activeWeapon='pistol';const n=hitNPC(35);crime(n?38:24,'Schuss abgegeben – Polizeiaufmerksamkeit.');if(n){n.stun=1.2;toast('🔫 Treffer')}else toast('🔫 Schuss')
}
function punch(){
 if(state.punchCd>0)return;state.punchCd=.5;const n=hitNPC(2.4);if(n){n.stun=.8;crime(8,'Auseinandersetzung – Aufmerksamkeit steigt.');toast('👊 Treffer')}else toast('👊')
}

function placeName(){
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
function resetGame(){location.reload()}

function normalizeKey(e){return e.key.length===1?e.key.toLowerCase():e.key}
document.addEventListener('keydown',e=>{
 const k=normalizeKey(e);if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)){keys.add(k);e.preventDefault()}
 if(k==='e'){action();e.preventDefault()}if(k==='f'){vehicleAction();e.preventDefault()}if(k==='g'){sprayWater();e.preventDefault()}if(k==='r'){shootPistol();e.preventDefault()}if(k==='v'){toggleView();e.preventDefault()}if(e.code==='Space'){punch();e.preventDefault()}if(e.key==='Shift')state.sprint=true
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
document.getElementById('actionBtn').onclick=action;document.getElementById('vehicleBtn').onclick=vehicleAction;document.getElementById('punchBtn').onclick=punch;document.getElementById('sprayBtn').onclick=sprayWater;document.getElementById('shootBtn').onclick=shootPistol;
document.getElementById('sprintBtn').onclick=()=>{state.sprint=!state.sprint;toast(state.sprint?'Sprint an':'Sprint aus')};document.getElementById('resetBtn').onclick=resetGame;document.getElementById('viewBtn').onclick=toggleView;document.getElementById('fullscreenBtn').onclick=toggleFullscreen;

function loop(now){
 const dt=Math.min(.033,(now-last)/1000||.016);last=now;state.sprayCd=Math.max(0,state.sprayCd-dt);state.shootCd=Math.max(0,state.shootCd-dt);state.punchCd=Math.max(0,state.punchCd-dt);
 if(state.vehicle)updateVehicle(dt);else updateFoot(dt);updateTraffic(dt);updateNPCs(dt);updatePolice(dt);updateLighting(dt);updateCamera();hud();renderer.render(scene,camera);requestAnimationFrame(loop)
}
log('🌆 City Life 5.0: echte Three.js-3D-Engine gestartet.');
log('🚗 Ein freier City Sedan steht nahe dem Start. Mit F einsteigen.');
hud();requestAnimationFrame(loop);
})();