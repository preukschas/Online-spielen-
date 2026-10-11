(()=>{
'use strict';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const W=1280,H=720;
let renderScale=1;
function configureHiDPI(){
  const dpr=window.devicePixelRatio||1;
  renderScale=Math.max(1.5,Math.min(2.25,dpr));
  const bw=Math.round(W*renderScale),bh=Math.round(H*renderScale);
  if(canvas.width!==bw||canvas.height!==bh){
    canvas.width=bw;canvas.height=bh;
  }
  ctx.setTransform(renderScale,0,0,renderScale,0,0);
  ctx.imageSmoothingEnabled=true;
  if('imageSmoothingQuality' in ctx)ctx.imageSmoothingQuality='high';
}
configureHiDPI();
const WORLD_W=6200,WORLD_H=4200;
const keys=new Set();

const ui={
  money:document.getElementById('money'),
  vehicleName:document.getElementById('vehicleName'),
  speed:document.getElementById('speed'),
  hpText:document.getElementById('hpText'),
  hpBar:document.getElementById('hpBar'),
  carHpText:document.getElementById('carHpText'),
  carHpBar:document.getElementById('carHpBar'),
  heatText:document.getElementById('heatText'),
  heatBar:document.getElementById('heatBar'),
  place:document.getElementById('place'),
  inventory:document.getElementById('inventory'),
  log:document.getElementById('log'),
  panel:document.getElementById('interactionPanel'),
  toast:document.getElementById('toast')
};

const roadsX=[650,1850,3070,4310,5550];
const roadsY=[520,1570,2640,3690];

const buildings=[
  {id:'market',x:80,y:70,w:450,h:320,name:'FRISCHMARKT',type:'shop',wall:'#b86c53',door:[305,415],items:[['Getränk',4,'🥤',4],['Snack',6,'🥪',8],['Lebensmittel',25,'🛍️',0],['Rucksack',45,'🎒',0],['Wasserpistole',35,'💦',0],['Tablet',250,'📱',0]]},
  {id:'home-a',x:790,y:60,w:760,h:330,name:'WOHNHAUS AM PARK',type:'home',wall:'#bb8b65',door:[1170,420]},
  {id:'tech',x:2110,y:70,w:700,h:320,name:'TECH CENTER',type:'shop',wall:'#929da6',door:[2460,415],items:[['Kopfhörer',55,'🎧',0],['Smartwatch',180,'⌚',0],['Smartphone',320,'📱',0],['Laptop',900,'💻',0]]},
  {id:'cafe',x:3350,y:70,w:700,h:320,name:'CAFÉ CENTRAL',type:'cafe',wall:'#a96e52',door:[3700,415],items:[['Kaffee',4,'☕',6],['Kuchen',6,'🍰',8],['Sandwich',8,'🥪',12]]},
  {id:'premium',x:4590,y:60,w:900,h:330,name:'PREMIUM MOTORS',type:'dealer',wall:'#8b969e',vehiclePortal:true,entrance:[4680,420],exit:[5390,420],dealerSet:'premium'},

  {id:'logistics',x:80,y:720,w:450,h:560,name:'LOGISTIK',type:'job',wall:'#a9977a',door:[560,1000]},
  {id:'park',x:790,y:720,w:760,h:560,name:'STADTPARK',type:'park',wall:'#71965f'},
  {id:'dealer',x:2110,y:720,w:700,h:560,name:'CITY MOTORS',type:'dealer',wall:'#8c979f',vehiclePortal:true,entrance:[2200,1310],exit:[2720,1310],dealerSet:'normal'},
  {id:'parking',x:3350,y:720,w:700,h:560,name:'PARKHAUS',type:'parking',wall:'#777e83',vehiclePortal:true,entrance:[3440,1310],exit:[3960,1310]},
  {id:'garage',x:4590,y:720,w:900,h:560,name:'MOTORWERK',type:'garage',wall:'#85898b',door:[4560,1000]},

  {id:'fashion',x:80,y:1780,w:450,h:500,name:'MODEHAUS',type:'shop',wall:'#c18c74',door:[560,2030],items:[['T-Shirt',30,'👕',0],['Sneaker',75,'👟',0],['Jacke',80,'🧥',0],['Uhr',120,'⌚',0]]},
  {id:'home-b',x:790,y:1770,w:760,h:510,name:'WOHNQUARTIER',type:'home',wall:'#b87f60',door:[1170,2310]},
  {id:'mall',x:2110,y:1780,w:700,h:500,name:'CITY MALL',type:'shop',wall:'#999ca0',door:[2460,2310],items:[['Kamera',350,'📷',0],['Konsole',450,'🎮',0],['Pistole',650,'🔫',0],['Schmuck',600,'💎',0],['Fernseher',700,'📺',0]]},
  {id:'moto',x:3350,y:1780,w:700,h:500,name:'BIKE & MOTO',type:'dealer',wall:'#8b9196',vehiclePortal:true,entrance:[3440,2310],exit:[3960,2310],dealerSet:'moto'},
  {id:'home-c',x:4590,y:1770,w:900,h:510,name:'WOHNPARK',type:'home',wall:'#b9896b',door:[5040,2310]},

  {id:'police',x:80,y:2850,w:450,h:350,name:'POLIZEI',type:'police',wall:'#89969f',door:[560,3025]},
  {id:'station',x:790,y:2850,w:760,h:350,name:'HAUPTBAHNHOF',type:'station',wall:'#929a9e',door:[1170,2820]},
  {id:'office',x:2110,y:2850,w:700,h:350,name:'BUSINESS CENTER',type:'office',wall:'#a89c88',door:[2460,2820]},
  {id:'gas',x:3350,y:2850,w:700,h:350,name:'TANKSTELLE',type:'garage',wall:'#a49e89',door:[3320,3025]},
  {id:'exotic',x:4590,y:2850,w:900,h:350,name:'EXOTIC MOTORS',type:'dealer',wall:'#8f9499',vehiclePortal:true,entrance:[4680,2820],exit:[5390,2820],dealerSet:'exotic'}
];

const cityTrees=[];
for(const y of [1360,2385,3370,4070]){
  let n=0;
  for(let x=220;x<WORLD_W-120;x+=360){
    const tx=x+((n++%3)-1)*34;
    if(!roadsX.some(rx=>Math.abs(tx-rx)<210)&&!roadsY.some(ry=>Math.abs(y-ry)<210)&&
       !buildings.some(b=>b.type!=='park'&&tx>b.x-35&&tx<b.x+b.w+35&&y>b.y-35&&y<b.y+b.h+35)){
      cityTrees.push({x:tx,y,r:16+(n%3)*2});
    }
  }
}

const cityProps=[];
for(const y of roadsY){
  for(let x=260;x<WORLD_W-180;x+=520){
    if(roadsX.some(rx=>Math.abs(x-rx)<235))continue;
    for(const side of [-1,1]){
      const py=y+side*166;
      if(!isBuildingZone(x,py,28)){
        cityProps.push({type:'lamp',x,y:py,side});
        if((Math.floor(x/520)+side+2)%3===0)cityProps.push({type:'bin',x:x+38,y:py+side*7,side});
        if((Math.floor(x/520)+side+3)%4===0)cityProps.push({type:'bench',x:x-52,y:py+side*13,side});
      }
    }
  }
}
for(const x of roadsX){
  for(let y=250;y<WORLD_H-150;y+=570){
    if(roadsY.some(ry=>Math.abs(y-ry)<235))continue;
    for(const side of [-1,1]){
      const px=x+side*166;
      if(!isBuildingZone(px,y,28)){
        cityProps.push({type:'lamp',x:px,y,side});
        if((Math.floor(y/570)+side+2)%4===0)cityProps.push({type:'sign',x:px+side*12,y:y+35,side});
      }
    }
  }
}

const specs={
  'City Sedan':{type:'sedan',color:'#466f99',max:420,acc:.68,turn:.0037,price:28000},
  'Falcon SUV':{type:'suv',color:'#566d54',max:380,acc:.58,turn:.0030,price:52000},
  'Cargo Van':{type:'van',color:'#d7d3c8',max:320,acc:.48,turn:.0025,price:39000},
  'Volt E':{type:'electric',color:'#4f7d85',max:540,acc:.96,turn:.0040,price:68000},
  'Lamborghini Huracán':{type:'sport',color:'#e4b82e',max:760,acc:1.38,turn:.0047,price:265000},
  'Bugatti Chiron':{type:'sport',color:'#2c65a8',max:810,acc:1.46,turn:.0045,price:420000},
  'Ferrari 488':{type:'sport',color:'#bb3030',max:720,acc:1.28,turn:.0045,price:290000},
  'Ferrari Roma':{type:'sport',color:'#8e1f2a',max:660,acc:1.14,turn:.0043,price:245000},
  'Ducati Panigale':{type:'bike',color:'#c53030',max:690,acc:1.48,turn:.0056,price:36000},
  'Ducati Monster':{type:'bike',color:'#55575a',max:560,acc:1.18,turn:.0053,price:19000}
};

const dealerSets={
  normal:['City Sedan','Falcon SUV','Volt E'],
  premium:['Lamborghini Huracán','Ferrari 488','Ferrari Roma'],
  moto:['Ducati Panigale','Ducati Monster','Volt E'],
  exotic:['Bugatti Chiron','Lamborghini Huracán','Ferrari 488']
};

let nextVehicleId=1;
function makeVehicle(x,y,a,name,opt={}){
  const sp=specs[name];
  return {
    id:nextVehicleId++,x,y,a,name,
    type:sp.type,color:sp.color,max:sp.max,acc:sp.acc,turn:sp.turn,price:opt.price??sp.price,
    w:sp.type==='van'?74:sp.type==='suv'?68:sp.type==='bike'?29:sp.type==='sport'?64:60,
    h:sp.type==='van'?38:sp.type==='suv'?35:sp.type==='bike'?18:31,
    hp:opt.hp??100,owned:!!opt.owned,stolen:!!opt.stolen,locked:!!opt.locked,
    forSale:!!opt.forSale,showroom:!!opt.showroom,lastDamageAt:0
  };
}

const worldCars=[
  makeVehicle(720,820,0,'City Sedan'),
  makeVehicle(1730,880,Math.PI/2,'Falcon SUV'),
  makeVehicle(2980,760,0,'Ferrari 488'),
  makeVehicle(4260,1450,Math.PI/2,'Cargo Van'),
  makeVehicle(5480,1690,Math.PI/2,'Lamborghini Huracán'),
  makeVehicle(5200,3690,0,'Bugatti Chiron'),
  makeVehicle(3170,2480,0,'Ducati Monster'),
  makeVehicle(1640,2740,0,'Volt E')
];

const roomVehicles={};
for(const b of buildings){
  if(b.type==='dealer'){
    roomVehicles[b.id]=dealerSets[b.dealerSet].map((name,i)=>
      makeVehicle(300+i*300,300,0,name,{locked:true,forSale:true,showroom:true})
    );
  }
  if(b.type==='parking'){
    roomVehicles[b.id]=[
      makeVehicle(250,245,0,'City Sedan'),
      makeVehicle(540,245,0,'Falcon SUV'),
      makeVehicle(830,245,0,'Ferrari Roma'),
      makeVehicle(350,455,0,'Cargo Van'),
      makeVehicle(690,455,0,'Ducati Monster')
    ];
  }
}

const trafficModels=['City Sedan','Falcon SUV','Cargo Van','Ferrari Roma','Lamborghini Huracán','Bugatti Chiron','Ducati Panigale','Volt E'];
const traffic=[];
for(let i=0;i<56;i++){
  const horizontal=i%2===0,name=trafficModels[i%trafficModels.length],sp=specs[name];
  traffic.push({
    x:horizontal?(i*263)%WORLD_W:roadsX[i%roadsX.length]+(i%2?45:-45),
    y:horizontal?roadsY[i%roadsY.length]+(i%4<2?45:-45):(i*197)%WORLD_H,
    a:horizontal?(i%3?0:Math.PI):(i%3?Math.PI/2:-Math.PI/2),
    horizontal,dir:i%3?1:-1,speed:72+(i%7)*9,name,type:sp.type,color:sp.color,hp:100,dead:false,
    w:sp.type==='van'?69:sp.type==='suv'?65:sp.type==='bike'?26:59,
    h:sp.type==='van'?35:sp.type==='suv'?33:sp.type==='bike'?16:30
  });
}

const skin=['#f0c6a2','#d9a47e','#bc805e','#905f44','#6b4532'];
const tops=['#37688f','#984a50','#547a50','#997243','#655182','#357b7d','#7f5741'];
const bottoms=['#293640','#414149','#544a40','#304657'];
const hairs=['#211a16','#493327','#745338','#c1a46f','#853e31'];

function makePerson(i,x,y,horizontal){
  return {
    x,y,horizontal,dir:i%3?1:-1,speed:34+(i%6)*7,phase:i*.62,
    skin:skin[i%skin.length],top:tops[(i*3)%tops.length],bottom:bottoms[(i*5)%bottoms.length],
    hair:hairs[(i*2)%hairs.length],height:.92+(i%5)*.03,shoe:bottoms[(i+2)%bottoms.length],hat:i%9===0,coat:i%4===0,stun:0,pause:0
  };
}
const people=[];
for(let i=0;i<80;i++){
  const horizontal=i%2===0;
  people.push(makePerson(
    i,
    horizontal?140+(i*251)%5850:roadsX[i%roadsX.length]+(i%4<2?158:-158),
    horizontal?roadsY[i%roadsY.length]+(i%4<2?158:-158):160+(i*201)%3800,
    horizontal
  ));
}
const indoorPeople={};
for(const b of buildings){
  if(['home','shop','cafe','office','dealer','parking','garage'].includes(b.type)){
    indoorPeople[b.id]=[
      makePerson(100+b.id.length,260,220,true),
      makePerson(150+b.id.length,780,430,false)
    ];
  }
}

const police=[];
const state={
  x:1170,y:1570,a:0,money:1000,hp:100,heat:0,lastCrime:99999,
  worldCar:-1,speed:0,sprint:false,punchT:0,punchCd:0,
  mode:'outside',buildingId:null,rx:140,ry:640,roomCar:-1,roomSpeed:0,
  camX:530,camY:1210,walk:0,inventory:[],sprayCd:0,waterFx:[],shootCd:0,shotFx:[],activeWeapon:null,firstPerson:true,worldTime:16.2
};

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function dist(ax,ay,bx,by){return Math.hypot(ax-bx,ay-by);}
function rr(x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function currentBuilding(){return buildings.find(b=>b.id===state.buildingId)||null;}
function currentCar(){
  if(state.mode==='outside'&&state.worldCar>=0)return worldCars[state.worldCar]||null;
  if(state.mode==='interior'&&state.roomCar>=0)return (roomVehicles[state.buildingId]||[])[state.roomCar]||null;
  return null;
}
function hasWaterPistol(){
  return state.inventory.some(x=>x.includes('Wasserpistole'));
}
function hasPistol(){
  return state.inventory.some(x=>x.includes('Pistole')&&!x.includes('Wasserpistole'));
}
function angleDiff(a,b){
  let d=(b-a+Math.PI)%(Math.PI*2)-Math.PI;
  if(d<-Math.PI)d+=Math.PI*2;
  return d;
}
function toast(text){
  ui.toast.textContent=text;ui.toast.style.display='block';clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>ui.toast.style.display='none',1500);
}
function log(text){
  const d=document.createElement('div');d.textContent=text;ui.log.prepend(d);
  while(ui.log.children.length>7)ui.log.lastChild.remove();
}
function hud(){
  const c=currentCar(),speed=state.mode==='outside'?state.speed:state.roomSpeed;
  ui.money.textContent=Math.round(state.money).toLocaleString('de-DE')+' €';
  ui.vehicleName.textContent=c?c.name:'Zu Fuß';
  ui.speed.textContent=c?Math.round(Math.abs(speed))+' km/h':'0 km/h';
  ui.hpText.textContent=Math.round(state.hp)+'%';ui.hpBar.style.width=state.hp+'%';
  ui.carHpText.textContent=c?(damageStageLabel(c)+' · '+Math.round(Math.max(0,c.hp))+'%'):'–';ui.carHpBar.style.width=c?Math.max(0,c.hp)+'%':'0';
  ui.heatText.textContent=Math.round(state.heat)+'%';ui.heatBar.style.width=state.heat+'%';
  ui.place.textContent=state.mode==='outside'?'Großstadt':currentBuilding().name;
  ui.inventory.innerHTML=state.inventory.length?state.inventory.map(x=>'<div>'+x+'</div>').join(''):'Leer';
}
function crime(amount,msg){state.heat=clamp(state.heat+amount,0,100);state.lastCrime=0;if(msg)log(msg);hud();}
function structureRect(b){
  if(b.type==='park')return {x:b.x,y:b.y,w:b.w,h:b.h};
  let x=b.x+18,y=b.y+18,w=Math.max(80,b.w-36),h=Math.max(80,b.h-36);
  const safe=240;
  for(const rx of roadsX){
    if(x<rx&&x+w>rx-safe)w=Math.max(80,rx-safe-x);
    else if(x>rx&&x<rx+safe){const right=x+w;x=rx+safe;w=Math.max(80,right-x);}
  }
  for(const ry of roadsY){
    if(y<ry&&y+h>ry-safe)h=Math.max(80,ry-safe-y);
    else if(y>ry&&y<ry+safe){const bottom=y+h;y=ry+safe;h=Math.max(80,bottom-y);}
  }
  return {x,y,w,h};
}
function isRoadZone(x,y,margin=0){
  return roadsY.some(ry=>Math.abs(y-ry)<122+margin)||roadsX.some(rx=>Math.abs(x-rx)<122+margin);
}
function isBuildingZone(x,y,margin=0){
  return buildings.some(b=>{
    if(b.type==='park')return false;
    const q=structureRect(b);
    return x>q.x-margin&&x<q.x+q.w+margin&&y>q.y-margin&&y<q.y+q.h+margin;
  });
}
function outsideBlocked(x,y,r){
  for(const b of buildings){
    if(b.type==='park')continue;
    const q=structureRect(b);
    if(x+r>q.x&&x-r<q.x+q.w&&y+r>q.y&&y-r<q.y+q.h)return true;
  }
  return false;
}
function near(x,y,p,d){return dist(x,y,p[0],p[1])<d;}
function nearestDoor(){
  let result=null,best=82;
  for(const b of buildings){
    if(!b.door)continue;
    const d=dist(state.x,state.y,b.door[0],b.door[1]);
    if(d<best){best=d;result=b;}
  }
  return result;
}
function nearestVehicle(list,x,y,max=90){
  let idx=-1,best=max;
  list.forEach((c,i)=>{const d=dist(x,y,c.x,c.y);if(d<best){best=d;idx=i;}});
  return idx;
}
function outsidePortalNear(){
  for(const b of buildings){
    if(!b.vehiclePortal)continue;
    if(near(state.x,state.y,b.entrance,120))return {building:b,kind:'entrance'};
    if(near(state.x,state.y,b.exit,120))return {building:b,kind:'exit'};
  }
  return null;
}
function panel(title){
  ui.panel.innerHTML='';
  const t=document.createElement('div');t.className='panel-title';t.textContent=title;ui.panel.appendChild(t);
  const row=document.createElement('div');row.className='panel-row';ui.panel.appendChild(row);return row;
}
function panelButton(text,fn,primary=false){
  const b=document.createElement('button');b.textContent=text;if(primary)b.className='primary';b.addEventListener('click',fn);return b;
}
function buildingPanel(){
  const b=currentBuilding();if(!b)return;
  const row=panel(b.name);
  if(b.type==='shop'||b.type==='cafe'){
    for(const [name,price,icon,heal=0] of b.items||[]){
      row.appendChild(panelButton('Kaufen '+icon+' '+name+' · '+price+' €',()=>{
        if(state.money<price)return toast('Zu wenig Geld.');
        if(name==='Wasserpistole'&&hasWaterPistol())return toast('Du hast schon eine Wasserpistole.');
        if(name==='Pistole'&&hasPistol())return toast('Du hast schon eine Pistole.');
        state.money-=price;
        if(heal>0){
          state.hp=Math.min(100,state.hp+heal);
          log('✅ '+name+' gekauft und benutzt: +'+heal+' Gesundheit.');
        }else{
          state.inventory.push(icon+' '+name);
          if(name==='Wasserpistole'){state.activeWeapon='water';log('💦 Wasserpistole gekauft. G oder „Spritzen“ benutzen.');}
          else if(name==='Pistole'){state.activeWeapon='pistol';log('🔫 Pistole gekauft. R oder „Schießen“ benutzen.');}
          else log('✅ '+name+' gekauft und ins Inventar gelegt.');
        }
        hud();
      },price<=10));
      if(b.type==='shop'){
        row.appendChild(panelButton('Klauen '+icon+' '+name,()=>{
          state.inventory.push(icon+' '+name+' ⚠️');crime(12,'⚠️ '+name+' im Spiel gestohlen.');hud();
        }));
      }
    }
  }
  if(b.type==='home')row.appendChild(panelButton('🛏️ Ausruhen',()=>{state.hp=100;state.heat=Math.max(0,state.heat-10);log('🛏️ Ausgeruht.');hud();},true));
  if(b.type==='job')row.appendChild(panelButton('📦 Arbeiten · +120 €',()=>{state.money+=120;log('💼 Schicht beendet: +120 €.');hud();},true));
  if(b.type==='garage')row.appendChild(panelButton('🔧 Eigene/gestohlene Fahrzeuge reparieren · 500 €',()=>{
    if(state.money<500)return toast('Zu wenig Geld.');
    state.money-=500;worldCars.forEach(c=>{if(c.owned||c.stolen)c.hp=100;});
    Object.values(roomVehicles).forEach(list=>list.forEach(c=>{if(c.owned||c.stolen)c.hp=100;}));
    log('🔧 Fahrzeuge repariert.');hud();
  },true));
  if(b.type==='dealer'){
    const s=document.createElement('span');s.className='muted';s.textContent='Gehe direkt zu einem Showroom-Fahrzeug und drücke E.';row.appendChild(s);
  }
  if(b.type==='parking'){
    const s=document.createElement('span');s.className='muted';s.textContent='Parkhaus: Autos stehen auf Stellplätzen. Es gibt nur die markierte Einfahrt und Ausfahrt.';row.appendChild(s);
  }
}
function showroomActions(c){
  const row=panel(c.name+' · '+c.price.toLocaleString('de-DE')+' €');
  if(c.locked&&c.forSale){
    row.appendChild(panelButton('Kaufen',()=>{
      if(state.money<c.price)return toast('Zu wenig Geld.');
      state.money-=c.price;c.owned=true;c.locked=false;c.forSale=false;c.showroom=false;
      log('🚘 '+c.name+' gekauft. F drücken und selbst zur AUSFAHRT fahren.');toast('F drücken → zur AUSFAHRT');hud();
    },true));
    row.appendChild(panelButton('Im Spiel klauen',()=>{
      c.stolen=true;c.locked=false;c.forSale=false;c.showroom=false;
      crime(28,'⚠️ '+c.name+' aus dem Showroom gestohlen.');toast('F drücken → zur AUSFAHRT');hud();
    }));
  }else{
    const s=document.createElement('span');s.className='muted';s.textContent='F drücken, einsteigen und zur AUSFAHRT fahren.';row.appendChild(s);
  }
}
function enterBuildingOnFoot(b){
  state.mode='interior';state.buildingId=b.id;state.rx=140;state.ry=640;state.roomCar=-1;state.roomSpeed=0;state.walk=0;
  log('🚪 '+b.name+' betreten.');buildingPanel();hud();
}
function leaveBuildingOnFoot(){
  const b=currentBuilding();if(!b)return;
  const p=b.vehiclePortal?b.exit:b.door;
  state.mode='outside';state.buildingId=null;state.x=p[0]+60;state.y=p[1]+60;state.walk=0;
  log('🚪 '+b.name+' verlassen.');ui.panel.textContent='Du bist wieder draußen.';hud();
}
function moveWorldCarIntoRoom(b){
  const c=worldCars[state.worldCar];if(!c)return;
  worldCars.splice(state.worldCar,1);state.worldCar=-1;
  c.x=145;c.y=630;c.a=0;
  (roomVehicles[b.id]||(roomVehicles[b.id]=[])).push(c);
  state.roomCar=roomVehicles[b.id].length-1;state.roomSpeed=0;state.mode='interior';state.buildingId=b.id;state.rx=c.x;state.ry=c.y;
  log('🚗 Du fährst in '+b.name+' hinein.');buildingPanel();hud();
}
function moveRoomCarOutside(){
  const b=currentBuilding(),list=roomVehicles[b.id]||[],c=list[state.roomCar];if(!c)return;
  list.splice(state.roomCar,1);state.roomCar=-1;
  c.x=b.exit[0]+100;c.y=b.exit[1]+82;c.a=0;
  worldCars.push(c);state.worldCar=worldCars.length-1;state.speed=0;
  state.mode='outside';state.buildingId=null;state.x=c.x;state.y=c.y;state.a=0;
  log('🚗 Du fährst aus '+b.name+' heraus.');ui.panel.textContent='Du bist wieder auf der Straße.';hud();
}
function action(){
  if(state.mode==='outside'){
    if(state.worldCar>=0){
      const p=outsidePortalNear();
      if(p&&p.kind==='entrance'){moveWorldCarIntoRoom(p.building);return;}
      toast('Mit dem Auto zur blauen EINFAHRT fahren und E drücken.');return;
    }
    const p=outsidePortalNear();
    if(p&&p.kind==='entrance'){enterBuildingOnFoot(p.building);return;}
    const d=nearestDoor();if(d){enterBuildingOnFoot(d);return;}
    toast('Keine Aktion in der Nähe.');return;
  }

  const b=currentBuilding();
  if(state.roomCar>=0){
    const c=(roomVehicles[b.id]||[])[state.roomCar];
    if(c.x>1120&&c.y>580){moveRoomCarOutside();return;}
    toast('Fahre zur grünen AUSFAHRT.');return;
  }

  if(state.rx>1135&&state.ry>580){leaveBuildingOnFoot();return;}

  if(b.type==='dealer'){
    const list=roomVehicles[b.id]||[],i=nearestVehicle(list,state.rx,state.ry,112);
    if(i>=0){showroomActions(list[i]);return;}
  }
  buildingPanel();
}
function vehicleAction(){
  if(state.mode==='outside'){
    if(state.worldCar>=0){
      const c=worldCars[state.worldCar];state.x=c.x+44;state.y=c.y+38;state.worldCar=-1;state.speed=0;log('🚶 Du steigst aus.');hud();return;
    }
    const i=nearestVehicle(worldCars,state.x,state.y,90);if(i<0)return toast('Kein Fahrzeug in der Nähe.');
    const c=worldCars[i];if(c.hp<=0)return toast('Totalschaden.');
    state.worldCar=i;state.x=c.x;state.y=c.y;state.a=c.a;
    if(!c.owned&&!c.stolen){c.stolen=true;crime(18,'🚘 Fahrzeug im Spiel genommen.');}
    hud();return;
  }

  const b=currentBuilding(),list=roomVehicles[b.id]||[];
  if(state.roomCar>=0){
    const c=list[state.roomCar];state.rx=c.x+42;state.ry=c.y+38;state.roomCar=-1;state.roomSpeed=0;log('🚶 Du steigst aus.');hud();return;
  }
  const i=nearestVehicle(list,state.rx,state.ry,90);if(i<0)return toast('Kein Fahrzeug in der Nähe.');
  const c=list[i];if(c.hp<=0)return toast('Totalschaden.');
  if(c.locked)return toast('Showroom-Fahrzeug gesperrt. E drücken: kaufen oder im Spiel klauen.');
  state.roomCar=i;state.rx=c.x;state.ry=c.y;state.a=c.a;
  if(!c.owned&&!c.stolen){c.stolen=true;crime(20,'🚘 Fahrzeug im Gebäude genommen.');}
  hud();
}
function sprayWater(){
  if(currentCar())return toast('Zum Spritzen erst aussteigen.');
  if(!hasWaterPistol())return toast('Wasserpistole zuerst im Frischmarkt kaufen.');
  if(state.sprayCd>0)return;
  state.activeWeapon='water';

  const outside=state.mode==='outside';
  const x=outside?state.x:state.rx,y=outside?state.y:state.ry;
  const list=outside?people:(indoorPeople[state.buildingId]||[]);
  state.sprayCd=360;
  state.waterFx.push({
    mode:outside?'outside':'interior',
    buildingId:outside?null:state.buildingId,
    x,y,a:state.a,ttl:260
  });

  let target=null,best=190;
  for(const p of list){
    const dx=p.x-x,dy=p.y-y,d=Math.hypot(dx,dy);
    if(d>best||d<14)continue;
    const a=Math.atan2(dy,dx);
    if(Math.abs(angleDiff(state.a,a))<0.34){best=d;target=p;}
  }
  if(target){
    target.wet=1200;target.pause=Math.max(target.pause||0,650);
    target.dir*=-1;
    toast('💦 Treffer!');
  }else{
    toast('💦 Pssssch!');
  }
}
function updateWaterFx(dt){
  state.sprayCd=Math.max(0,state.sprayCd-dt);
  for(const fx of state.waterFx)fx.ttl-=dt;
  state.waterFx=state.waterFx.filter(fx=>fx.ttl>0);
}
function drawWaterFx(mode){
  for(const fx of state.waterFx){
    if(fx.mode!==mode)continue;
    if(mode==='interior'&&fx.buildingId!==state.buildingId)continue;
    const t=clamp(fx.ttl/260,0,1),len=175*(1-t*.12);
    ctx.save();
    ctx.globalAlpha=.35+.55*t;
    ctx.strokeStyle='#6fd3ff';ctx.lineWidth=5;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(fx.x+Math.cos(fx.a)*28,fx.y+Math.sin(fx.a)*28);
    ctx.lineTo(fx.x+Math.cos(fx.a)*len,fx.y+Math.sin(fx.a)*len);ctx.stroke();
    ctx.fillStyle='#aeeaff';
    for(let i=0;i<7;i++){
      const d=45+i*18,j=(i%2?5:-5);
      ctx.beginPath();ctx.arc(fx.x+Math.cos(fx.a)*d-Math.sin(fx.a)*j,fx.y+Math.sin(fx.a)*d+Math.cos(fx.a)*j,2.2+(i%2),0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
}

function shootPistol(){
  if(currentCar())return toast('Zum Schießen erst aussteigen.');
  if(!hasPistol())return toast('Pistole zuerst in der City Mall kaufen.');
  if(state.shootCd>0)return;

  const outside=state.mode==='outside';
  const x=outside?state.x:state.rx,y=outside?state.y:state.ry;
  const list=outside?people:(indoorPeople[state.buildingId]||[]);
  state.shootCd=420;state.activeWeapon='pistol';

  let target=null,best=315;
  for(const p of list){
    const dx=p.x-x,dy=p.y-y,d=Math.hypot(dx,dy);
    if(d>best||d<20)continue;
    const a=Math.atan2(dy,dx);
    if(Math.abs(angleDiff(state.a,a))<0.18){best=d;target=p;}
  }

  const endDist=target?best:300;
  state.shotFx.push({
    mode:outside?'outside':'interior',
    buildingId:outside?null:state.buildingId,
    x,y,a:state.a,len:endDist,ttl:120
  });

  if(target){
    target.stun=Math.max(target.stun||0,900);
    target.pause=Math.max(target.pause||0,900);
    target.x+=Math.cos(state.a)*16;target.y+=Math.sin(state.a)*16;
    crime(38,'🔫 Schuss abgegeben – hohe Polizeiaufmerksamkeit.');
    toast('🔫 Treffer');
  }else{
    crime(24,'🔫 Schuss abgegeben – Polizeiaufmerksamkeit.');
    toast('🔫 Schuss');
  }
}
function updateShotFx(dt){
  state.shootCd=Math.max(0,state.shootCd-dt);
  for(const fx of state.shotFx)fx.ttl-=dt;
  state.shotFx=state.shotFx.filter(fx=>fx.ttl>0);
}
function drawShotFx(mode){
  for(const fx of state.shotFx){
    if(fx.mode!==mode)continue;
    if(mode==='interior'&&fx.buildingId!==state.buildingId)continue;
    const t=clamp(fx.ttl/120,0,1);
    ctx.save();
    ctx.globalAlpha=.35+.65*t;
    const sx=fx.x+Math.cos(fx.a)*26,sy=fx.y+Math.sin(fx.a)*26;
    const ex=fx.x+Math.cos(fx.a)*fx.len,ey=fx.y+Math.sin(fx.a)*fx.len;
    ctx.strokeStyle='#f7d878';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(ex,ey);ctx.stroke();
    ctx.fillStyle='#ffd66b';ctx.beginPath();ctx.arc(sx,sy,5+4*t,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
}

function punch(){
  if(state.punchCd>0||currentCar())return;
  state.punchT=160;state.punchCd=330;
  const list=state.mode==='outside'?people:(indoorPeople[state.buildingId]||[]);
  const px=state.mode==='outside'?state.x:state.rx,py=state.mode==='outside'?state.y:state.ry;
  for(const p of list){
    if(dist(px,py,p.x,p.y)<50){
      p.stun=550;p.x+=Math.cos(state.a)*28;p.y+=Math.sin(state.a)*28;
      crime(8,'👊 Angriff – geringe Polizeiaufmerksamkeit.');break;
    }
  }
}
function damageStage(c){
  if(!c||c.hp<=0)return 5;
  if(c.hp<=20)return 4;
  if(c.hp<=40)return 3;
  if(c.hp<=60)return 2;
  if(c.hp<=80)return 1;
  return 0;
}
function damageStageLabel(c){
  const stage=damageStage(c);
  return ['Intakt','Leichte Schäden','Beschädigt','Schwer beschädigt','Kritisch','Totalschaden'][stage];
}
function damageCar(c,amount){
  const now=performance.now();
  if(!c||now-(c.lastDamageAt||0)<420)return false;
  c.lastDamageAt=now;
  const before=damageStage(c);
  c.hp=Math.max(0,c.hp-amount);
  const after=damageStage(c);
  if(c.hp<=0){
    toast('💥 Totalschaden');
    log('💥 Fahrzeug: Totalschaden.');
  }else if(after>before){
    toast('🚗 '+damageStageLabel(c));
    log('🚗 Fahrzeugzustand: '+damageStageLabel(c)+' ('+Math.round(c.hp)+'%).');
  }
  return true;
}
function outsideCarCollisions(){
  if(state.worldCar<0)return;
  const c=worldCars[state.worldCar];
  for(const t of traffic){
    if(t.dead)continue;
    if(dist(c.x,c.y,t.x,t.y)<(Math.max(c.w,c.h)+Math.max(t.w,t.h))*.46){
      const dmg=Math.min(24,3+(Math.abs(state.speed)+t.speed)*.026);
      const hit=damageCar(c,dmg);
      if(hit){t.hp=Math.max(0,t.hp-dmg*.45);if(t.hp<=0){t.dead=true;t.speed=0;}state.hp=Math.max(0,state.hp-dmg*.025);}
      state.speed*=-.14;return;
    }
  }
  for(let i=0;i<worldCars.length;i++){
    if(i===state.worldCar)continue;
    const o=worldCars[i];
    if(dist(c.x,c.y,o.x,o.y)<(Math.max(c.w,c.h)+Math.max(o.w,o.h))*.43){
      const dmg=Math.min(20,3+Math.abs(state.speed)*.024);
      const hit=damageCar(c,dmg);
      if(hit)o.hp=Math.max(0,o.hp-dmg*.40);
      state.speed*=-.12;return;
    }
  }
}
function updateOutside(dt){
  if(state.worldCar>=0){
    const c=worldCars[state.worldCar];if(c.hp<=0){state.speed=0;return;}
    const up=keys.has('w')||keys.has('ArrowUp'),down=keys.has('s')||keys.has('ArrowDown'),left=keys.has('a')||keys.has('ArrowLeft'),right=keys.has('d')||keys.has('ArrowRight');
    if(up)state.speed+=c.acc*dt;if(down)state.speed-=c.acc*.72*dt;
    state.speed*=Math.pow(.985,dt/16.67);state.speed=clamp(state.speed,-c.max*.32,c.max);
    if(Math.abs(state.speed)>5)state.a+=((left?-1:0)+(right?1:0))*c.turn*dt*(state.speed>=0?1:-1);
    const visualScale=1.05+(c.max/760)*0.42;
    const travel=Math.abs(state.speed)*dt/1000*visualScale;
    const steps=Math.max(1,Math.ceil(travel/16));
    const stepDistance=(state.speed*dt/1000*visualScale)/steps;
    let crashed=false;
    for(let i=0;i<steps;i++){
      const nx=state.x+Math.cos(state.a)*stepDistance,ny=state.y+Math.sin(state.a)*stepDistance;
      if(!outsideBlocked(nx,ny,28)){
        state.x=nx;state.y=ny;c.x=nx;c.y=ny;c.a=state.a;
      }else{
        damageCar(c,Math.min(22,4+Math.abs(state.speed)*.025));state.speed*=-.12;crashed=true;break;
      }
    }
    if(!crashed)outsideCarCollisions();return;
  }
  if(state.firstPerson){
    const forward=(keys.has('w')||keys.has('ArrowUp')?1:0)-(keys.has('s')||keys.has('ArrowDown')?1:0);
    const turn=(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0);
    state.a+=turn*.00265*dt;
    if(forward){
      const sp=state.sprint?205:130;
      const nx=state.x+Math.cos(state.a)*forward*sp*dt/1000,ny=state.y+Math.sin(state.a)*forward*sp*dt/1000;
      if(!outsideBlocked(nx,state.y,13))state.x=nx;if(!outsideBlocked(state.x,ny,13))state.y=ny;
      state.walk+=dt*.018;
    }else state.walk=0;
    return;
  }
  let dx=0,dy=0;
  if(keys.has('w')||keys.has('ArrowUp'))dy--;if(keys.has('s')||keys.has('ArrowDown'))dy++;
  if(keys.has('a')||keys.has('ArrowLeft'))dx--;if(keys.has('d')||keys.has('ArrowRight'))dx++;
  if(dx||dy){
    const l=Math.hypot(dx,dy);dx/=l;dy/=l;const sp=state.sprint?205:130;
    const nx=state.x+dx*sp*dt/1000,ny=state.y+dy*sp*dt/1000;
    if(!outsideBlocked(nx,state.y,13))state.x=nx;if(!outsideBlocked(state.x,ny,13))state.y=ny;
    state.a=Math.atan2(dy,dx);state.walk+=dt*.018;
  }else state.walk=0;
}
function updateInterior(dt){
  const b=currentBuilding(),list=roomVehicles[b.id]||[];
  if(state.roomCar>=0){
    const c=list[state.roomCar];if(c.hp<=0){state.roomSpeed=0;return;}
    const up=keys.has('w')||keys.has('ArrowUp'),down=keys.has('s')||keys.has('ArrowDown'),left=keys.has('a')||keys.has('ArrowLeft'),right=keys.has('d')||keys.has('ArrowRight');
    if(up)state.roomSpeed+=c.acc*dt*.62;if(down)state.roomSpeed-=c.acc*.55*dt;
    state.roomSpeed*=Math.pow(.978,dt/16.67);state.roomSpeed=clamp(state.roomSpeed,-95,220);
    if(Math.abs(state.roomSpeed)>4)state.a+=((left?-1:0)+(right?1:0))*c.turn*dt*.95*(state.roomSpeed>=0?1:-1);
    c.x=clamp(c.x+Math.cos(state.a)*state.roomSpeed*dt/1000,70,1200);
    c.y=clamp(c.y+Math.sin(state.a)*state.roomSpeed*dt/1000,120,650);
    c.a=state.a;state.rx=c.x;state.ry=c.y;
    if(c.x>1160&&c.y>565)moveRoomCarOutside();
    return;
  }
  let dx=0,dy=0;
  if(keys.has('w')||keys.has('ArrowUp'))dy--;if(keys.has('s')||keys.has('ArrowDown'))dy++;
  if(keys.has('a')||keys.has('ArrowLeft'))dx--;if(keys.has('d')||keys.has('ArrowRight'))dx++;
  if(dx||dy){
    const l=Math.hypot(dx,dy);dx/=l;dy/=l;
    state.rx=clamp(state.rx+dx*172*dt/1000,65,1200);state.ry=clamp(state.ry+dy*172*dt/1000,80,650);
    state.a=Math.atan2(dy,dx);state.walk+=dt*.018;
  }else state.walk=0;
}
function updateTraffic(dt){
  for(const c of traffic){
    if(c.dead)continue;const d=c.speed*c.dir*dt/1000;
    if(c.horizontal){c.x+=d;if(c.x<-120)c.x=WORLD_W+120;if(c.x>WORLD_W+120)c.x=-120;}
    else{c.y+=d;if(c.y<-120)c.y=WORLD_H+120;if(c.y>WORLD_H+120)c.y=-120;}
  }
}
function updatePeople(list,dt,inside){
  for(const p of list){
    if(p.wet>0)p.wet=Math.max(0,p.wet-dt);
    if(p.stun>0){p.stun-=dt;continue;}
    if(p.pause>0){p.pause-=dt;continue;}
    if(Math.random()<.00045*dt){p.pause=500+Math.random()*1400;continue;}
    p.phase+=dt*.009;const d=p.speed*p.dir*dt/1000;
    if(p.horizontal){p.x+=d;if(p.x<(inside?100:40)||p.x>(inside?1120:WORLD_W-40))p.dir*=-1;}
    else{p.y+=d;if(p.y<(inside?140:40)||p.y>(inside?520:WORLD_H-40))p.dir*=-1;}
  }
}
function updatePolice(dt){
  state.lastCrime+=dt;if(state.lastCrime>7000)state.heat=Math.max(0,state.heat-dt*.0045);
  if(state.mode!=='outside'||state.heat<55){police.length=0;return;}
  const n=Math.min(2,1+Math.floor((state.heat-55)/30));
  while(police.length<n)police.push({x:state.x+700,y:state.y+500,speed:0,a:0});
  while(police.length>n)police.pop();
  for(const p of police){
    const a=Math.atan2(state.y-p.y,state.x-p.x);p.a=a;p.speed=Math.min(335,p.speed+.095*dt);
    p.x+=Math.cos(a)*p.speed*dt/1000;p.y+=Math.sin(a)*p.speed*dt/1000;
  }
}
function camera(){
  const speedAbs=state.worldCar>=0?Math.abs(state.speed):0;
  const look=clamp((speedAbs-160)*.10,0,70);
  const leadX=Math.cos(state.a)*look,leadY=Math.sin(state.a)*look;
  const tx=clamp(state.x-W/2+leadX,0,WORLD_W-W),ty=clamp(state.y-H/2+leadY,0,WORLD_H-H);
  const follow=state.worldCar>=0?.075:.11;
  state.camX+=(tx-state.camX)*follow;state.camY+=(ty-state.camY)*follow;
}

function drawTree(x,y,r){
  ctx.fillStyle='rgba(0,0,0,.20)';ctx.beginPath();ctx.ellipse(x+9,y+19,r*1.35,r*.72,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#5d3d28';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y+28);ctx.lineTo(x,y+3);ctx.moveTo(x,y+10);ctx.lineTo(x-9,y-2);ctx.moveTo(x,y+9);ctx.lineTo(x+10,y-3);ctx.stroke();
  const cs=['#275a31','#326b38','#3d7b3f','#4b8a46','#2d6535','#568f49'];
  for(let i=0;i<38;i++){
    const a=i*2.399,rad=r*(.10+(i%9)/9);
    const lx=x+Math.cos(a)*rad,ly=y+Math.sin(a)*rad*.78;
    ctx.fillStyle=cs[i%cs.length];ctx.beginPath();ctx.ellipse(lx,ly,4.8+(i%4),3.1+(i%3)*.7,a*.45,0,Math.PI*2);ctx.fill();
    if(i%5===0){ctx.fillStyle='rgba(255,255,255,.08)';ctx.beginPath();ctx.ellipse(lx-1.5,ly-1.2,2.2,1.2,a,0,Math.PI*2);ctx.fill();}
  }
}
function lightingProfile(){
  const t=state.worldTime%24;
  const daylight=clamp(Math.sin((t-6)/12*Math.PI),0,1);
  const warm=clamp(1-Math.abs(t-18)/4,0,1);
  return {t,daylight,warm,night:1-daylight};
}
function drawCityPropTop(p){
  ctx.save();ctx.translate(p.x,p.y);
  if(p.type==='lamp'){
    ctx.fillStyle='rgba(0,0,0,.20)';ctx.beginPath();ctx.ellipse(4,7,9,4,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#41494e';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(0,-22);ctx.lineTo(9,-22);ctx.stroke();
    ctx.fillStyle='#d8dde0';ctx.fillRect(6,-25,8,5);
  }else if(p.type==='bench'){
    ctx.fillStyle='#6a4b36';ctx.fillRect(-18,-5,36,9);ctx.fillRect(-16,-12,32,5);
    ctx.fillStyle='#343a3d';ctx.fillRect(-14,4,3,8);ctx.fillRect(11,4,3,8);
  }else if(p.type==='bin'){
    ctx.fillStyle='#39484a';rr(-7,-9,14,18,3);ctx.fill();ctx.fillStyle='#657477';ctx.fillRect(-8,-10,16,3);
  }else if(p.type==='sign'){
    ctx.strokeStyle='#555d61';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(0,-15);ctx.stroke();
    ctx.fillStyle='#2d6fa3';ctx.fillRect(-10,-22,20,12);ctx.fillStyle='#fff';ctx.fillRect(-5,-18,10,2);
  }
  ctx.restore();
}
function drawRoads(){
  ctx.fillStyle='#74875f';ctx.fillRect(0,0,WORLD_W,WORLD_H);
  ctx.fillStyle='#464d52';roadsY.forEach(y=>ctx.fillRect(0,y-122,WORLD_W,244));roadsX.forEach(x=>ctx.fillRect(x-122,0,244,WORLD_H));
  ctx.fillStyle='#a7a7a2';roadsY.forEach(y=>{ctx.fillRect(0,y-141,WORLD_W,19);ctx.fillRect(0,y+122,WORLD_W,19);});roadsX.forEach(x=>{ctx.fillRect(x-141,0,19,WORLD_H);ctx.fillRect(x+122,0,19,WORLD_H);});

  ctx.fillStyle='rgba(255,255,255,.035)';
  const tx0=Math.max(0,Math.floor((state.camX-120)/83)*83),tx1=Math.min(WORLD_W,state.camX+W+120);
  const ty0=Math.max(0,Math.floor((state.camY-120)/71)*71),ty1=Math.min(WORLD_H,state.camY+H+120);
  for(let x=tx0;x<tx1;x+=83)for(let y=ty0;y<ty1;y+=71){
    if(roadsY.some(ry=>Math.abs(y-ry)<118)||roadsX.some(rx=>Math.abs(x-rx)<118))ctx.fillRect(x+(y%17),y+(x%13),2,2);
  }
  ctx.strokeStyle='rgba(25,28,30,.24)';ctx.lineWidth=1;
  for(let y=20;y<WORLD_H;y+=63){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD_W,y);ctx.stroke();}

  ctx.strokeStyle='#e4d99e';ctx.lineWidth=4;ctx.setLineDash([34,25]);
  roadsY.forEach(y=>{ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD_W,y);ctx.stroke();});
  roadsX.forEach(x=>{ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD_H);ctx.stroke();});
  ctx.setLineDash([]);

  for(const x of roadsX)for(const y of roadsY){
    ctx.fillStyle='rgba(255,255,255,.82)';
    for(let i=-3;i<=3;i++){ctx.fillRect(x-108+i*31,y-141,19,31);ctx.fillRect(x-108+i*31,y+110,19,31);}
    ctx.fillStyle='rgba(255,255,255,.32)';
    ctx.beginPath();ctx.moveTo(x+42,y-66);ctx.lineTo(x+67,y-52);ctx.lineTo(x+42,y-38);ctx.closePath();ctx.fill();
  }

  // feine Fahrbahnreparaturen, Gullys und Kanaldeckel
  ctx.strokeStyle='rgba(22,25,27,.20)';ctx.lineWidth=2;
  for(const y of roadsY){
    for(let x=330;x<WORLD_W;x+=760){
      ctx.beginPath();ctx.moveTo(x,y-38);ctx.quadraticCurveTo(x+28,y-28,x+48,y-47);ctx.stroke();
      ctx.fillStyle='rgba(25,29,31,.45)';ctx.beginPath();ctx.ellipse(x+105,y+58,12,8,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(130,138,142,.28)';ctx.stroke();
    }
  }
  for(const x of roadsX){
    for(let y=340;y<WORLD_H;y+=790){
      ctx.fillStyle='rgba(25,29,31,.42)';ctx.beginPath();ctx.ellipse(x-58,y+92,8,12,0,0,Math.PI*2);ctx.fill();
    }
  }

  ctx.strokeStyle='rgba(245,245,245,.30)';ctx.lineWidth=2;
  for(const y of roadsY){
    for(let x=120;x<WORLD_W;x+=420){ctx.strokeRect(x,y+76,115,42);}
  }
  for(const x of roadsX){
    for(let y=120;y<WORLD_H;y+=420){ctx.strokeRect(x+76,y,42,115);}
  }

  cityTrees.forEach(t=>drawTree(t.x,t.y,t.r));
  cityProps.forEach(drawCityPropTop);
}
function drawBrickFacade(b){
  ctx.fillStyle=b.wall;rr(b.x,b.y,b.w,b.h,8);ctx.fill();
  ctx.strokeStyle='rgba(70,45,35,.24)';ctx.lineWidth=1;
  for(let y=b.y+50,row=0;y<b.y+b.h-10;y+=18,row++){
    for(let x=b.x+(row%2?19:0);x<b.x+b.w;x+=38)ctx.strokeRect(x,y,38,18);
  }
}
function drawBuilding(b){
  if(b.type==='park'){
    ctx.fillStyle='#6f965e';rr(b.x,b.y,b.w,b.h,18);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='rgba(215,205,174,.48)';
    ctx.fillRect(b.x+b.w*.47,b.y+28,b.w*.06,b.h-56);
    ctx.fillRect(b.x+28,b.y+b.h*.47,b.w-56,b.h*.06);
    for(let k=0;k<30;k++){
      const tx=b.x+55+(k*97)%(b.w-110),ty=b.y+60+(k*71)%(b.h-120);
      drawTree(tx,ty,14+(k%3)*2);
    }
    return;
  }

  const q=structureRect(b);

  // Grundstück / Vorgarten trennt Gebäude klar von Straße und Gehweg.
  ctx.fillStyle=b.type==='dealer'||b.type==='parking'||b.type==='garage'?'#747b78':'#788b68';
  rr(b.x,b.y,b.w,b.h,12);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=1;ctx.stroke();

  // Zufahrt / Gehweg zur Tür bzw. zum Portal.
  const cx=q.x+q.w/2,cy=q.y+q.h/2;
  if(b.door){
    ctx.strokeStyle='#b8b5ab';ctx.lineWidth=24;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(b.door[0],b.door[1]);ctx.lineTo(clamp(b.door[0],q.x+12,q.x+q.w-12),clamp(b.door[1],q.y+12,q.y+q.h-12));ctx.stroke();
  }
  if(b.vehiclePortal){
    ctx.strokeStyle='#6e7376';ctx.lineWidth=34;ctx.lineCap='butt';
    for(const p of [b.entrance,b.exit]){ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(clamp(p[0],q.x+18,q.x+q.w-18),clamp(p[1],q.y+18,q.y+q.h-18));ctx.stroke();}
  }

  ctx.fillStyle='rgba(0,0,0,.28)';rr(q.x+12,q.y+14,q.w,q.h,10);ctx.fill();
  ctx.fillStyle=b.wall;rr(q.x,q.y,q.w,q.h,9);ctx.fill();

  // Fassadenmaterial: horizontale Geschosse + feine Mauerstruktur.
  ctx.strokeStyle='rgba(60,48,42,.20)';ctx.lineWidth=1;
  for(let y=q.y+38;y<q.y+q.h-16;y+=26){ctx.beginPath();ctx.moveTo(q.x+4,y);ctx.lineTo(q.x+q.w-4,y);ctx.stroke();}
  for(let y=q.y+52,row=0;y<q.y+q.h-16;y+=20,row++){
    for(let x=q.x+(row%2?18:0);x<q.x+q.w;x+=42){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(Math.min(x+26,q.x+q.w),y);ctx.stroke();}
  }

  ctx.fillStyle='rgba(255,255,255,.10)';ctx.fillRect(q.x+7,q.y+7,q.w-14,7);
  ctx.fillStyle='rgba(0,0,0,.14)';ctx.fillRect(q.x+7,q.y+q.h-15,q.w-14,9);

  const signTypes=['shop','cafe','dealer','garage','office','station','police'];
  if(signTypes.includes(b.type)){
    ctx.fillStyle='#252b2f';rr(q.x+14,q.y+13,Math.min(290,q.w-28),36,4);ctx.fill();
    ctx.fillStyle='#fff';ctx.font='bold 14px system-ui';ctx.fillText(b.name,q.x+25,q.y+37);
  }

  const topOffset=signTypes.includes(b.type)?66:34;
  for(let y=q.y+topOffset;y<q.y+q.h-58;y+=66){
    for(let x=q.x+30;x<q.x+q.w-42;x+=74){
      ctx.fillStyle='#40545e';ctx.fillRect(x-3,y-3,49,43);
      const glass=ctx.createLinearGradient(x,y,x+43,y+37);glass.addColorStop(0,'#a5cfe1');glass.addColorStop(.45,'#78a8ba');glass.addColorStop(1,'#547887');
      ctx.fillStyle=glass;ctx.fillRect(x,y,43,37);
      ctx.fillStyle='rgba(255,255,255,.34)';ctx.fillRect(x+4,y+4,9,29);
      ctx.strokeStyle='rgba(28,38,43,.62)';ctx.beginPath();ctx.moveTo(x+21,y);ctx.lineTo(x+21,y+37);ctx.stroke();
    }
  }

  if(b.type==='home'){
    ctx.fillStyle='#684936';ctx.beginPath();ctx.moveTo(q.x+5,q.y);ctx.lineTo(q.x+q.w/2,q.y-44);ctx.lineTo(q.x+q.w-5,q.y);ctx.closePath();ctx.fill();
    ctx.fillStyle='#4b3428';ctx.fillRect(q.x+q.w*.23,q.y-24,20,26);
    ctx.fillStyle='#555d60';
    for(let y=q.y+116;y<q.y+q.h-55;y+=78){
      ctx.fillRect(q.x+55,y,Math.max(80,q.w*.28),8);
      if(q.w>420)ctx.fillRect(q.x+q.w*.58,y,Math.max(80,q.w*.25),8);
    }
  }

  if(b.type==='dealer'){
    ctx.fillStyle='rgba(164,219,240,.80)';ctx.fillRect(q.x+38,q.y+q.h*.46,q.w-76,q.h*.42);
    ctx.strokeStyle='rgba(235,250,255,.55)';ctx.lineWidth=2;
    for(let x=q.x+60;x<q.x+q.w-40;x+=95){ctx.beginPath();ctx.moveTo(x,q.y+q.h*.46);ctx.lineTo(x,q.y+q.h*.88);ctx.stroke();}
  }

  if(b.type==='parking'){
    ctx.fillStyle='#5f666a';ctx.fillRect(q.x+35,q.y+q.h*.34,q.w-70,q.h*.55);
    ctx.strokeStyle='#4a5054';for(let y=q.y+q.h*.40;y<q.y+q.h*.87;y+=36){ctx.beginPath();ctx.moveTo(q.x+35,y);ctx.lineTo(q.x+q.w-35,y);ctx.stroke();}
  }

  if(b.vehiclePortal){
    ctx.fillStyle='#2b73bc';ctx.fillRect(b.entrance[0]-58,b.entrance[1]-17,116,34);
    ctx.fillStyle='#fff';ctx.font='bold 11px system-ui';ctx.fillText('EINFAHRT',b.entrance[0]-30,b.entrance[1]+4);
    ctx.fillStyle='#2e8952';ctx.fillRect(b.exit[0]-58,b.exit[1]-17,116,34);
    ctx.fillStyle='#fff';ctx.fillText('AUSFAHRT',b.exit[0]-31,b.exit[1]+4);
  }else if(b.door){
    const nearDoor=dist(state.x,state.y,b.door[0],b.door[1])<82;
    const dx=clamp(b.door[0],q.x+20,q.x+q.w-20),dy=clamp(b.door[1],q.y+20,q.y+q.h-20);
    ctx.fillStyle='#45372e';ctx.fillRect(dx-20,dy-22,40,44);
    ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(dx-15,dy-17,10,34);
    ctx.fillStyle=nearDoor?'#f0ca4e':'rgba(235,235,225,.72)';
    ctx.beginPath();ctx.arc(b.door[0],b.door[1],nearDoor?13:8,0,Math.PI*2);ctx.fill();
    if(nearDoor){ctx.fillStyle='#20262a';ctx.font='bold 12px system-ui';ctx.fillText('E',b.door[0]-4,b.door[1]+4);}
  }
}
function drawVehicle(c,active){
  ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a);
  const w=c.w,h=c.h;
  ctx.fillStyle='rgba(0,0,0,.30)';ctx.beginPath();ctx.ellipse(6,8,w*.61,h*.70,0,0,Math.PI*2);ctx.fill();

  const body=c.hp<=0?'#555':c.color;
  if(c.type==='bike'){
    ctx.fillStyle='#121517';ctx.beginPath();ctx.arc(-w*.31,0,6.7,0,Math.PI*2);ctx.arc(w*.31,0,6.7,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#b5bcc0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(-w*.31,0,4.5,0,Math.PI*2);ctx.arc(w*.31,0,4.5,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=body;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-w*.20,0);ctx.lineTo(-2,-6);ctx.lineTo(w*.20,0);ctx.stroke();
    ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(1,-5,w*.21,5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#202529';ctx.fillRect(-4,-10,9,8);
    ctx.strokeStyle='#c9d0d3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.15,-2);ctx.lineTo(w*.28,-7);ctx.stroke();
    ctx.fillStyle='#f3e29b';ctx.beginPath();ctx.arc(w*.32,-3,2.5,0,Math.PI*2);ctx.fill();
  }else{
    const grad=ctx.createLinearGradient(-w/2,-h/2,w/2,h/2);
    grad.addColorStop(0,'rgba(255,255,255,.26)');grad.addColorStop(.28,body);grad.addColorStop(.72,body);grad.addColorStop(1,'rgba(0,0,0,.25)');
    ctx.fillStyle=grad;
    if(c.type==='sport'){
      ctx.beginPath();ctx.moveTo(-w*.49,-h*.34);ctx.quadraticCurveTo(-w*.37,-h*.52,-w*.11,-h*.48);ctx.lineTo(w*.34,-h*.39);ctx.quadraticCurveTo(w*.50,-h*.24,w*.50,0);ctx.quadraticCurveTo(w*.50,h*.24,w*.34,h*.39);ctx.lineTo(-w*.11,h*.48);ctx.quadraticCurveTo(-w*.37,h*.52,-w*.49,h*.34);ctx.closePath();ctx.fill();
    }else rr(-w/2,-h/2,w,h,c.type==='van'?5:c.type==='suv'?8:9),ctx.fill();

    // tyres + hubs
    ctx.fillStyle='#111416';
    for(const [wx,wy] of [[-w*.28,-h*.52],[w*.27,-h*.52],[-w*.28,h*.52],[w*.27,h*.52]]){ctx.beginPath();ctx.ellipse(wx,wy,w*.10,h*.13,0,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#8f969a';
    for(const [wx,wy] of [[-w*.28,-h*.49],[w*.27,-h*.49],[-w*.28,h*.49],[w*.27,h*.49]]){ctx.beginPath();ctx.arc(wx,wy,Math.max(2,h*.075),0,Math.PI*2);ctx.fill();}

    // cabin
    ctx.fillStyle='#253843';rr(-w*.13,-h/2+5,w*.34,h-10,5);ctx.fill();
    const glass=ctx.createLinearGradient(-w*.11,-h*.35,w*.16,h*.35);glass.addColorStop(0,'#b6d7e5');glass.addColorStop(.45,'#78a8bb');glass.addColorStop(1,'#3e6574');
    ctx.fillStyle=glass;rr(-w*.09,-h/2+7,w*.25,h-14,4);ctx.fill();
    ctx.strokeStyle='rgba(20,28,32,.72)';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(w*.01,-h*.34);ctx.lineTo(w*.01,h*.34);ctx.stroke();

    // lights and mirrors
    ctx.fillStyle='#fae9a4';ctx.fillRect(w/2-5,-h/2+4,4,7);ctx.fillRect(w/2-5,h/2-11,4,7);
    ctx.fillStyle='#bf3434';ctx.fillRect(-w/2+1,-h/2+4,4,7);ctx.fillRect(-w/2+1,h/2-11,4,7);
    ctx.fillStyle='#1b2023';ctx.fillRect(-2,-h/2-4,6,5);ctx.fillRect(-2,h/2-1,6,5);

    if(c.name&&c.name.includes('Bugatti')){
      ctx.strokeStyle='#dbe7ed';ctx.lineWidth=1.7;ctx.beginPath();ctx.ellipse(w*.34,0,5.5,h*.24,0,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(-w*.05,-h*.42,w*.11,h*.84);
    }else if(c.name&&c.name.includes('Lamborghini')){
      ctx.fillStyle='#1d2327';ctx.beginPath();ctx.moveTo(w*.12,-h*.41);ctx.lineTo(w*.39,-h*.25);ctx.lineTo(w*.39,h*.25);ctx.lineTo(w*.12,h*.41);ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.15)';ctx.beginPath();ctx.moveTo(-w*.33,-h*.31);ctx.lineTo(-w*.08,-h*.39);ctx.lineTo(-w*.08,h*.39);ctx.lineTo(-w*.33,h*.31);ctx.closePath();ctx.fill();
    }else if(c.name&&c.name.includes('Ferrari')){
      ctx.fillStyle='rgba(20,25,28,.52)';ctx.fillRect(w*.23,-h*.30,w*.13,h*.60);
    }else if(c.type==='electric'){
      ctx.fillStyle='#86e1e5';ctx.fillRect(w*.38,-4,5,8);
    }
  }

  if(active){
    ctx.strokeStyle='rgba(255,213,92,.92)';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.beginPath();ctx.ellipse(0,0,w*.63,h*.78,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  }

  const dmgStage=damageStage(c);
  if(dmgStage>=1){ctx.strokeStyle='rgba(35,35,35,.62)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-9,-5);ctx.lineTo(7,6);ctx.stroke();}
  if(dmgStage>=2){ctx.strokeStyle='rgba(25,25,25,.78)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,9);ctx.lineTo(12,-8);ctx.moveTo(-15,3);ctx.lineTo(-4,-8);ctx.stroke();}
  if(dmgStage>=3){ctx.fillStyle='rgba(70,70,70,.32)';ctx.beginPath();ctx.arc(-w*.20,-h*.62,7,0,Math.PI*2);ctx.fill();}
  if(dmgStage>=4){ctx.fillStyle='rgba(65,65,65,.52)';ctx.beginPath();ctx.arc(-w*.22,-h*.68,10,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(-w*.10,-h*.76,7,0,Math.PI*2);ctx.fill();}
  if(dmgStage>=5){ctx.fillStyle='rgba(25,25,25,.70)';ctx.fillRect(-w*.42,-h*.12,w*.84,h*.24);}
  ctx.restore();
}
function drawPoliceCar(p){
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a||0);
  ctx.fillStyle='rgba(0,0,0,.30)';ctx.beginPath();ctx.ellipse(5,7,38,20,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e8edf0';rr(-34,-17,68,34,8);ctx.fill();
  ctx.fillStyle='#194f99';ctx.fillRect(-34,-17,20,34);ctx.fillRect(15,-17,19,34);
  ctx.fillStyle='#9ec4d5';rr(-8,-12,22,24,4);ctx.fill();
  ctx.fillStyle='#1b2023';ctx.fillRect(-28,-21,13,5);ctx.fillRect(15,-21,13,5);ctx.fillRect(-28,16,13,5);ctx.fillRect(15,16,13,5);
  ctx.fillStyle='#d33';ctx.fillRect(-6,-21,7,4);ctx.fillStyle='#39f';ctx.fillRect(1,-21,7,4);
  ctx.restore();
}
function drawWaterPistolHeld(){
  ctx.save();
  ctx.translate(7,-1);
  ctx.fillStyle='#2aa9e0';
  rr(0,-4,20,8,3);ctx.fill();
  ctx.fillStyle='#ffe05a';
  ctx.fillRect(18,-2,9,4);
  ctx.fillStyle='#ef5f74';
  ctx.fillRect(5,4,7,11);
  ctx.fillStyle='#56d6c6';
  ctx.beginPath();ctx.arc(2,0,5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.65)';
  ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(3,-2);ctx.lineTo(15,-2);ctx.stroke();
  ctx.restore();
}

function drawPistolHeld(){
  ctx.save();
  ctx.translate(7,-1);
  ctx.fillStyle='#25292c';
  rr(0,-3,19,6,2);ctx.fill();
  ctx.fillStyle='#111416';
  ctx.fillRect(16,-2,8,4);
  ctx.fillStyle='#3b4044';
  ctx.fillRect(5,3,6,12);
  ctx.fillStyle='#171a1c';
  ctx.fillRect(6,11,5,4);
  ctx.fillStyle='rgba(255,255,255,.16)';
  ctx.fillRect(3,-2,10,1);
  ctx.restore();
}

function drawPerson(p,x,y,a,phase,player){
  ctx.save();ctx.translate(x,y);ctx.rotate(a||0);
  const h=player?1:p.height,bob=Math.sin(phase)*1.2,leg=Math.sin(phase)*5.2,arm=-Math.sin(phase)*4.2;ctx.translate(0,bob);
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(4,22*h,13*h,6*h,0,0,Math.PI*2);ctx.fill();

  const pants=player?'#293640':p.bottom,shirt=player?'#37688f':p.top,skinTone=player?'#f0c6a2':p.skin,hairTone=player?'#30231d':p.hair;
  ctx.strokeStyle=pants;ctx.lineWidth=5*h;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,8*h);ctx.lineTo(-4*h+leg,23*h);ctx.moveTo(0,8*h);ctx.lineTo(4*h-leg,23*h);ctx.stroke();
  ctx.strokeStyle=player?'#1e2428':(p.shoe||'#25292c');ctx.lineWidth=3*h;ctx.beginPath();ctx.moveTo(-5*h+leg,23*h);ctx.lineTo(-10*h+leg,24*h);ctx.moveTo(5*h-leg,23*h);ctx.lineTo(10*h-leg,24*h);ctx.stroke();

  ctx.strokeStyle=shirt;ctx.lineWidth=(p.coat&&!player?11:9)*h;ctx.beginPath();ctx.moveTo(0,-4*h);ctx.lineTo(0,11*h);ctx.stroke();
  if(p.coat&&!player){ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=1.3*h;ctx.beginPath();ctx.moveTo(0,-5*h);ctx.lineTo(0,11*h);ctx.stroke();}

  ctx.strokeStyle=skinTone;ctx.lineWidth=4*h;ctx.beginPath();ctx.moveTo(-2*h,0);ctx.lineTo(-9*h+arm,10*h);ctx.moveTo(2*h,0);ctx.lineTo(9*h-arm,10*h);ctx.stroke();
  if(player&&state.activeWeapon==='pistol'&&hasPistol())drawPistolHeld(); else if(player&&hasWaterPistol())drawWaterPistolHeld();

  ctx.fillStyle=skinTone;ctx.beginPath();ctx.arc(0,-12*h,8*h,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=hairTone;ctx.beginPath();ctx.arc(0,-14*h,7.8*h,Math.PI,Math.PI*2);ctx.fill();
  if(!player&&p.hat){ctx.fillStyle='#30363a';ctx.fillRect(-8*h,-20*h,16*h,4*h);ctx.fillRect(-5*h,-24*h,10*h,5*h);}
  ctx.fillStyle='#262626';ctx.beginPath();ctx.arc(-2.6*h,-11*h,1*h,0,Math.PI*2);ctx.arc(2.6*h,-11*h,1*h,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(80,45,35,.7)';ctx.lineWidth=1*h;ctx.beginPath();ctx.moveTo(-2*h,-7*h);ctx.lineTo(2*h,-7*h);ctx.stroke();
  if(!player&&p.wet>0){
    ctx.fillStyle='rgba(104,207,255,.85)';
    for(let i=0;i<4;i++){ctx.beginPath();ctx.arc((-8+i*5)*h,(2+(i%2)*7)*h,1.8*h,0,Math.PI*2);ctx.fill();}
  }
  ctx.restore();
}
function drawCity(){
  drawRoads();buildings.forEach(drawBuilding);
  traffic.forEach(c=>drawVehicle(c,false));
  worldCars.forEach((c,i)=>drawVehicle(c,i===state.worldCar));
  people.forEach(p=>{const a=p.horizontal?(p.dir>0?0:Math.PI):(p.dir>0?Math.PI/2:-Math.PI/2);drawPerson(p,p.x,p.y,a,p.phase,false);});
  police.forEach(drawPoliceCar);
  if(state.worldCar<0)drawPerson({height:1,skin:'#f0c6a2',top:'#37688f',bottom:'#293640',hair:'#30231d'},state.x,state.y,state.a,state.walk,true);
  drawWaterFx('outside');drawShotFx('outside');
}
function fpProject(wx,wy){
  const dx=wx-state.x,dy=wy-state.y,ca=Math.cos(state.a),sa=Math.sin(state.a);
  const forward=dx*ca+dy*sa,side=-dx*sa+dy*ca;
  if(forward<24)return null;
  const focal=760;
  const sx=W/2+side*focal/forward;
  if(sx<-420||sx>W+420)return null;
  return {forward,side,sx,scale:focal/forward};
}
function fpGroundY(forward){
  return 316+330*(1-clamp(forward/1750,0,1));
}
function fpBuildingHeight(b){
  if(b.type==='home')return 118;
  if(b.type==='office'||b.type==='station')return 135;
  if(b.type==='dealer'||b.type==='mall')return 86;
  if(b.type==='parking')return 92;
  return 78;
}
function fpRoadsideBoundary(forward,side){
  const horizon=310,gy=fpGroundY(forward);
  const t=clamp((gy-horizon)/(H-horizon),0,1);
  if(side<0)return (W*.405)*(1-t);
  return W-(W*.405)*(1-t);
}
function fpRoadHalfScreen(p){
  const edge=fpRoadsideBoundary(p.forward,p.side||1);
  return p.side<0?W/2-edge:edge-W/2;
}
function drawFirstPersonBuilding(b,p){
  const q=structureRect(b);
  const worldFront=clamp(Math.min(q.w,q.h)*.58,95,220);
  const bw=clamp(worldFront*p.scale,40,500);
  const bh=clamp(fpBuildingHeight(b)*p.scale,30,430);
  const gy=fpGroundY(p.forward);
  let x=p.sx-bw/2;
  const innerEdge=fpRoadsideBoundary(p.forward,p.side);
  const streetGap=38;

  if(p.side<0)x=Math.min(x,innerEdge-streetGap-bw);
  else x=Math.max(x,innerEdge+streetGap);
  if(x+bw<-30||x>W+30)return;
  const y=gy-bh;
  const depth=clamp(bw*.10,8,38)*(p.side<0?1:-1);

  // Grundstück, Sockel und Gebäudetiefe
  ctx.fillStyle='rgba(178,178,169,.92)';
  ctx.beginPath();ctx.moveTo(x-10,gy);ctx.lineTo(x+bw+10,gy);ctx.lineTo(x+bw*.90,gy+Math.min(42,bh*.16));ctx.lineTo(x+bw*.10,gy+Math.min(42,bh*.16));ctx.closePath();ctx.fill();

  ctx.fillStyle='rgba(0,0,0,.18)';
  ctx.beginPath();ctx.moveTo(x+bw,y+10);ctx.lineTo(x+bw+depth,y+20);ctx.lineTo(x+bw+depth,gy);ctx.lineTo(x+bw,gy);ctx.closePath();ctx.fill();

  ctx.fillStyle=b.wall||'#9a8b7d';ctx.fillRect(x,y,bw,bh);
  const wall=ctx.createLinearGradient(x,y,x+bw,y);
  wall.addColorStop(0,'rgba(0,0,0,.18)');wall.addColorStop(.30,'rgba(255,255,255,.06)');wall.addColorStop(.78,'rgba(255,255,255,.015)');wall.addColorStop(1,'rgba(0,0,0,.24)');
  ctx.fillStyle=wall;ctx.fillRect(x,y,bw,bh);
  ctx.fillStyle='rgba(55,50,45,.22)';ctx.fillRect(x,gy-bh*.13,bw,bh*.13);

  // Dachkante / Attika
  ctx.fillStyle=b.type==='home'?'#664835':'#4b5052';
  if(b.type==='home'){
    ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+bw*.50,y-bh*.17);ctx.lineTo(x+bw+4,y);ctx.closePath();ctx.fill();
    ctx.fillStyle='#443127';ctx.fillRect(x+bw*.20,y-bh*.10,Math.max(6,bw*.07),bh*.11);
  }else{
    ctx.fillRect(x-2,y-7,bw+4,9);
    ctx.fillStyle='rgba(255,255,255,.10)';ctx.fillRect(x+4,y-5,bw-8,2);
  }

  const signTypes=['shop','cafe','dealer','garage','office','station','police'];
  const rows=clamp(Math.floor(bh/70),1,5),cols=clamp(Math.floor(bw/64),2,8);
  const topPad=signTypes.includes(b.type)?Math.max(28,bh*.15):Math.max(18,bh*.10);
  const usableH=Math.max(35,bh-topPad-38);
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const cellW=(bw-28)/cols,cellH=usableH/rows;
    const ww=Math.max(9,Math.min(33,cellW*.56)),wh=Math.max(10,Math.min(30,cellH*.50));
    const wx=x+14+c*cellW+(cellW-ww)/2,wy=y+topPad+r*cellH;
    ctx.fillStyle='#334750';ctx.fillRect(wx-2,wy-2,ww+4,wh+4);
    const glass=ctx.createLinearGradient(wx,wy,wx+ww,wy+wh);
    glass.addColorStop(0,'#b6d8e7');glass.addColorStop(.45,'#77a8bb');glass.addColorStop(1,'#425f6b');
    ctx.fillStyle=glass;ctx.fillRect(wx,wy,ww,wh);
    ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.moveTo(wx+3,wy+2);ctx.lineTo(wx+ww*.36,wy+2);ctx.lineTo(wx+ww*.18,wy+wh-2);ctx.lineTo(wx+3,wy+wh-2);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(25,35,40,.65)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(wx+ww*.52,wy);ctx.lineTo(wx+ww*.52,wy+wh);ctx.stroke();

    if(b.type==='home'&&r<rows-1&&bw>120){
      ctx.fillStyle='#555d60';ctx.fillRect(wx-6,wy+wh+3,ww+12,3);
      ctx.strokeStyle='#343a3d';ctx.lineWidth=1;
      for(let k=0;k<4;k++){const bx=wx-4+k*(ww+8)/3;ctx.beginPath();ctx.moveTo(bx,wy+wh+3);ctx.lineTo(bx,wy+wh+12);ctx.stroke();}
      ctx.fillStyle='rgba(72,105,59,.72)';ctx.fillRect(wx+2,wy+wh+7,Math.max(6,ww*.38),4);
    }
  }

  if(signTypes.includes(b.type)){
    ctx.fillStyle='#252b2f';rr(x+8,y+8,Math.min(bw-16,210),Math.max(18,bh*.10),4);ctx.fill();
    ctx.fillStyle='#f4f6f7';ctx.font='600 '+clamp(bw/20,10,17)+'px system-ui';ctx.fillText(b.name,x+14,y+clamp(bh*.075,15,25));
  }

  if(b.type==='dealer'){
    const sy=y+bh*.52,sh=bh*.36;
    const showroom=ctx.createLinearGradient(x,sy,x+bw,sy+sh);showroom.addColorStop(0,'rgba(170,220,239,.85)');showroom.addColorStop(1,'rgba(72,112,128,.82)');
    ctx.fillStyle=showroom;ctx.fillRect(x+bw*.07,sy,bw*.86,sh);
    ctx.strokeStyle='rgba(230,248,255,.55)';ctx.lineWidth=2;
    for(let k=1;k<5;k++){ctx.beginPath();ctx.moveTo(x+bw*(.07+.172*k),sy);ctx.lineTo(x+bw*(.07+.172*k),sy+sh);ctx.stroke();}
  }

  // Eingang und kleine Fassadendetails
  const doorW=Math.max(14,bw*.11),doorH=Math.max(22,bh*.24);
  ctx.fillStyle=b.type==='dealer'?'#546a73':'#43352d';ctx.fillRect(x+bw*.44,gy-doorH,doorW,doorH);
  ctx.fillStyle='rgba(174,213,228,.40)';ctx.fillRect(x+bw*.46,gy-doorH+4,doorW*.38,doorH*.35);
  ctx.fillStyle='#d4b979';ctx.beginPath();ctx.arc(x+bw*.44+doorW*.78,gy-doorH*.48,Math.max(1.5,doorW*.04),0,Math.PI*2);ctx.fill();

  if(b.type==='shop'||b.type==='cafe'){
    ctx.fillStyle='rgba(50,55,57,.65)';ctx.fillRect(x+bw*.08,gy-bh*.25,bw*.25,bh*.04);
    ctx.fillStyle='rgba(236,221,188,.72)';ctx.fillRect(x+bw*.10,gy-bh*.21,bw*.20,bh*.12);
  }
}
function drawFirstPersonTree(x,y,r,p){
  const gy=fpGroundY(p.forward),h=clamp(r*4.8*p.scale,24,250),w=h*.72;
  let sx=p.sx;
  const innerEdge=fpRoadsideBoundary(p.forward,p.side);
  if(p.side<0)sx=Math.min(sx,innerEdge-w*.60-28);
  else sx=Math.max(sx,innerEdge+w*.60+28);
  if(sx<-w||sx>W+w)return;

  ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(sx,gy+2,w*.28,h*.06,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#5e402c';ctx.fillRect(sx-w*.055,gy-h*.38,w*.11,h*.38);
  const grad=ctx.createRadialGradient(sx-w*.12,gy-h*.72,4,sx,gy-h*.65,w*.62);
  grad.addColorStop(0,'#639a55');grad.addColorStop(.52,'#39753f');grad.addColorStop(1,'#24572f');
  ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(sx,gy-h*.68,w*.52,h*.34,0,0,Math.PI*2);ctx.fill();
  for(let i=0;i<14;i++){
    ctx.fillStyle=i%3===0?'#568f49':i%2?'#4b8747':'#2f6a39';
    ctx.beginPath();ctx.arc(sx+(i%7-3)*w*.08,gy-h*(.55+(i%4)*.07),Math.max(2,w*.065),0,Math.PI*2);ctx.fill();
  }
}
function drawFirstPersonCar(c,p,policeCar=false){
  const gy=fpGroundY(p.forward);
  const rel=Math.cos((c.a??state.a)-state.a);
  const seenRear=rel>0;
  const baseW=(c.w||68),baseH=(c.h||34);
  const w=clamp(baseW*1.95*p.scale,26,350),h=clamp(baseH*1.72*p.scale,14,165);
  const x=p.sx-w/2,y=gy-h;
  const body=policeCar?'#e7ecef':(c.hp<=0?'#555':c.color||'#888');

  ctx.fillStyle='rgba(0,0,0,.34)';ctx.beginPath();ctx.ellipse(p.sx,gy+4,w*.50,h*.22,0,0,Math.PI*2);ctx.fill();

  const bodyGrad=ctx.createLinearGradient(x,y,x+w,y+h);
  bodyGrad.addColorStop(0,'rgba(255,255,255,.24)');bodyGrad.addColorStop(.25,body);bodyGrad.addColorStop(.75,body);bodyGrad.addColorStop(1,'rgba(0,0,0,.28)');
  ctx.fillStyle=bodyGrad;
  ctx.beginPath();ctx.moveTo(x+w*.10,gy);ctx.lineTo(x+w*.04,y+h*.55);ctx.quadraticCurveTo(x+w*.12,y+h*.20,x+w*.30,y+h*.12);
  ctx.lineTo(x+w*.70,y+h*.12);ctx.quadraticCurveTo(x+w*.88,y+h*.20,x+w*.96,y+h*.55);ctx.lineTo(x+w*.90,gy);ctx.closePath();ctx.fill();

  if(policeCar){
    ctx.fillStyle='#194f99';ctx.fillRect(x+w*.05,y+h*.52,w*.18,h*.40);ctx.fillRect(x+w*.77,y+h*.52,w*.18,h*.40);
  }

  // Scheibe und Dach
  const glass=ctx.createLinearGradient(x+w*.28,y+h*.15,x+w*.70,y+h*.48);
  glass.addColorStop(0,'#c1e1ed');glass.addColorStop(.55,'#6f9eaf');glass.addColorStop(1,'#314b57');
  ctx.fillStyle=glass;
  ctx.beginPath();ctx.moveTo(x+w*.31,y+h*.20);ctx.lineTo(x+w*.69,y+h*.20);ctx.lineTo(x+w*.78,y+h*.50);ctx.lineTo(x+w*.22,y+h*.50);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.moveTo(x+w*.34,y+h*.23);ctx.lineTo(x+w*.47,y+h*.23);ctx.lineTo(x+w*.38,y+h*.45);ctx.lineTo(x+w*.27,y+h*.45);ctx.closePath();ctx.fill();

  // Räder
  ctx.fillStyle='#121517';
  for(const wx of [x+w*.14,x+w*.86]){ctx.beginPath();ctx.ellipse(wx,gy,w*.075,h*.18,0,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#92999d';
  for(const wx of [x+w*.14,x+w*.86]){ctx.beginPath();ctx.arc(wx,gy,Math.max(2,h*.07),0,Math.PI*2);ctx.fill();}

  // Front-/Heckdetails abhängig von Fahrtrichtung.
  if(seenRear){
    ctx.fillStyle='#ad2f31';ctx.fillRect(x+w*.11,y+h*.62,w*.12,h*.12);ctx.fillRect(x+w*.77,y+h*.62,w*.12,h*.12);
    ctx.fillStyle='#252a2d';ctx.fillRect(x+w*.38,y+h*.73,w*.24,h*.08);
    ctx.fillStyle='rgba(230,236,239,.72)';ctx.fillRect(x+w*.43,y+h*.76,w*.14,h*.05);
  }else{
    ctx.fillStyle='#f2e7b3';ctx.fillRect(x+w*.10,y+h*.61,w*.13,h*.11);ctx.fillRect(x+w*.77,y+h*.61,w*.13,h*.11);
    ctx.fillStyle='#1e2529';ctx.fillRect(x+w*.30,y+h*.71,w*.40,h*.10);
    ctx.strokeStyle='rgba(205,214,218,.58)';ctx.lineWidth=1;
    for(let k=1;k<5;k++){ctx.beginPath();ctx.moveTo(x+w*(.30+.08*k),y+h*.71);ctx.lineTo(x+w*(.30+.08*k),y+h*.81);ctx.stroke();}
  }

  if(c.name&&c.name.includes('Lamborghini')){
    ctx.fillStyle='rgba(17,22,25,.88)';ctx.beginPath();ctx.moveTo(x+w*.17,y+h*.50);ctx.lineTo(x+w*.32,y+h*.35);ctx.lineTo(x+w*.68,y+h*.35);ctx.lineTo(x+w*.83,y+h*.50);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.moveTo(x+w*.08,y+h*.56);ctx.lineTo(x+w*.22,y+h*.42);ctx.moveTo(x+w*.92,y+h*.56);ctx.lineTo(x+w*.78,y+h*.42);ctx.stroke();
  }else if(c.name&&c.name.includes('Bugatti')){
    ctx.strokeStyle='rgba(220,232,238,.84)';ctx.lineWidth=Math.max(1.5,w*.012);ctx.beginPath();ctx.ellipse(p.sx,y+h*.69,w*.12,h*.15,0,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(p.sx-w*.035,y+h*.18,w*.07,h*.62);
  }else if(c.name&&c.name.includes('Ferrari')){
    ctx.fillStyle='rgba(24,28,30,.48)';ctx.beginPath();ctx.moveTo(x+w*.25,y+h*.56);ctx.lineTo(x+w*.38,y+h*.42);ctx.lineTo(x+w*.62,y+h*.42);ctx.lineTo(x+w*.75,y+h*.56);ctx.closePath();ctx.fill();
  }

  if(policeCar){
    ctx.fillStyle='#d33';ctx.fillRect(p.sx-w*.07,y+h*.08,w*.07,6);ctx.fillStyle='#39f';ctx.fillRect(p.sx,y+h*.08,w*.07,6);
  }

  if(c.hp<60){ctx.fillStyle='rgba(55,55,55,.24)';ctx.beginPath();ctx.arc(x+w*.18,y+h*.20,Math.max(3,w*.035),0,Math.PI*2);ctx.fill();}
  if(c.hp<25){ctx.fillStyle='rgba(45,45,45,.48)';ctx.beginPath();ctx.arc(x+w*.20,y+h*.05,Math.max(5,w*.055),0,Math.PI*2);ctx.fill();}
}
function drawFirstPersonPerson(person,p){
  const gy=fpGroundY(p.forward),h=clamp(58*(person.height||1)*p.scale,18,235),w=h*.30,x=p.sx;
  const step=Math.sin((person.phase||0))*h*.035;

  ctx.fillStyle='rgba(0,0,0,.24)';ctx.beginPath();ctx.ellipse(x,gy+3,w*.55,h*.075,0,0,Math.PI*2);ctx.fill();

  // Beine + Schuhe
  ctx.strokeStyle=person.bottom||'#343b40';ctx.lineWidth=Math.max(2.2,w*.20);ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x-w*.08,gy-h*.36);ctx.lineTo(x-w*.18+step,gy-h*.04);ctx.moveTo(x+w*.08,gy-h*.36);ctx.lineTo(x+w*.18-step,gy-h*.04);ctx.stroke();
  ctx.strokeStyle=person.shoe||'#22272a';ctx.lineWidth=Math.max(2,w*.14);ctx.beginPath();ctx.moveTo(x-w*.18+step,gy-h*.04);ctx.lineTo(x-w*.31+step,gy);ctx.moveTo(x+w*.18-step,gy-h*.04);ctx.lineTo(x+w*.31-step,gy);ctx.stroke();

  // Torso als Form statt dicker Linie
  ctx.fillStyle=person.top||'#546d80';ctx.beginPath();ctx.moveTo(x-w*.34,gy-h*.72);ctx.quadraticCurveTo(x,gy-h*.80,x+w*.34,gy-h*.72);ctx.lineTo(x+w*.25,gy-h*.35);ctx.lineTo(x-w*.25,gy-h*.35);ctx.closePath();ctx.fill();
  if(person.coat){ctx.fillStyle='rgba(30,36,40,.20)';ctx.fillRect(x-1,gy-h*.71,2,h*.34);}

  // Arme
  ctx.strokeStyle=person.skin||'#d9a47e';ctx.lineWidth=Math.max(2,w*.12);ctx.beginPath();ctx.moveTo(x-w*.27,gy-h*.66);ctx.lineTo(x-w*.43-step,gy-h*.42);ctx.moveTo(x+w*.27,gy-h*.66);ctx.lineTo(x+w*.43+step,gy-h*.42);ctx.stroke();

  // Hals + Kopf
  ctx.fillStyle=person.skin||'#d9a47e';ctx.fillRect(x-w*.08,gy-h*.80,w*.16,h*.10);
  ctx.beginPath();ctx.ellipse(x,gy-h*.89,w*.25,h*.115,0,0,Math.PI*2);ctx.fill();

  // Haare, Gesicht bei kurzer Distanz
  ctx.fillStyle=person.hair||'#35271f';ctx.beginPath();ctx.ellipse(x,gy-h*.925,w*.25,h*.075,0,Math.PI,Math.PI*2);ctx.fill();
  if(person.hat){ctx.fillStyle='#2d3337';ctx.fillRect(x-w*.28,gy-h*.99,w*.56,Math.max(2,h*.035));ctx.fillRect(x-w*.17,gy-h*1.04,w*.34,h*.06);}
  if(p.forward<340){
    ctx.fillStyle='#2b2928';ctx.beginPath();ctx.arc(x-w*.075,gy-h*.895,Math.max(1,w*.018),0,Math.PI*2);ctx.arc(x+w*.075,gy-h*.895,Math.max(1,w*.018),0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(80,45,35,.7)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-w*.06,gy-h*.85);ctx.lineTo(x+w*.06,gy-h*.85);ctx.stroke();
  }
}
function drawFirstPersonOverlay(){
  if(state.worldCar>=0){
    const c=worldCars[state.worldCar];
    ctx.fillStyle='rgba(13,17,20,.88)';ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,H-90);ctx.quadraticCurveTo(W*.25,H-155,W*.50,H-130);ctx.quadraticCurveTo(W*.75,H-155,W,H-90);ctx.lineTo(W,H);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#343b40';ctx.lineWidth=9;ctx.beginPath();ctx.arc(W*.50,H-48,44,Math.PI,Math.PI*2);ctx.stroke();
    ctx.fillStyle=c.color;ctx.globalAlpha=.82;ctx.beginPath();ctx.moveTo(W*.18,H);ctx.lineTo(W*.30,H-62);ctx.lineTo(W*.70,H-62);ctx.lineTo(W*.82,H);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
  }else{
    ctx.fillStyle='rgba(240,198,162,.95)';ctx.beginPath();ctx.ellipse(W*.70,H-34,38,19,-.25,0,Math.PI*2);ctx.fill();
    if(state.activeWeapon==='pistol'&&hasPistol()){
      ctx.fillStyle='#25292c';rr(W*.69,H-92,100,30,7);ctx.fill();ctx.fillStyle='#111416';ctx.fillRect(W*.76,H-87,40,20);ctx.fillStyle='#3b4044';ctx.fillRect(W*.71,H-64,28,52);
    }else if(hasWaterPistol()){
      ctx.fillStyle='#2aa9e0';rr(W*.68,H-92,112,32,8);ctx.fill();ctx.fillStyle='#ffe05a';ctx.fillRect(W*.76,H-84,45,15);ctx.fillStyle='#ef5f74';ctx.fillRect(W*.71,H-65,30,48);
    }
  }
  if((hasPistol()||hasWaterPistol())&&state.worldCar<0){
    ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W/2-9,H/2);ctx.lineTo(W/2+9,H/2);ctx.moveTo(W/2,H/2-9);ctx.lineTo(W/2,H/2+9);ctx.stroke();
  }
  const shot=state.shotFx.find(f=>f.mode==='outside'&&f.ttl>0);
  if(shot){ctx.fillStyle='rgba(255,211,94,.85)';ctx.beginPath();ctx.arc(W*.775,H-87,9,0,Math.PI*2);ctx.fill();}
  const water=state.waterFx.find(f=>f.mode==='outside'&&f.ttl>0);
  if(water){ctx.strokeStyle='rgba(100,210,255,.9)';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(W*.78,H-80);ctx.lineTo(W*.52,H*.53);ctx.stroke();}
}
function drawFirstPersonProp(prop,p){
  const gy=fpGroundY(p.forward),scale=p.scale;
  if(prop.type==='lamp'){
    const h=clamp(95*scale,26,330),x=p.sx;
    ctx.strokeStyle='#444c50';ctx.lineWidth=clamp(5*scale,2,12);ctx.beginPath();ctx.moveTo(x,gy);ctx.lineTo(x,gy-h);ctx.quadraticCurveTo(x,gy-h-10,x+(prop.side||1)*h*.18,gy-h-10);ctx.stroke();
    ctx.fillStyle='#d5dadd';ctx.fillRect(x+(prop.side||1)*h*.15-(prop.side<0?10:0),gy-h-16,10,7);
    const lp=lightingProfile();if(lp.daylight<.38){ctx.fillStyle='rgba(255,218,145,.24)';ctx.beginPath();ctx.arc(x+(prop.side||1)*h*.18,gy-h-12,Math.max(7,h*.12),0,Math.PI*2);ctx.fill();}
  }else if(prop.type==='bench'){
    const w=clamp(48*scale,14,150),h=clamp(22*scale,8,70),x=p.sx;
    ctx.fillStyle='#654936';ctx.fillRect(x-w/2,gy-h*.55,w,h*.20);ctx.fillRect(x-w/2,gy-h,w,h*.18);
    ctx.fillStyle='#343a3d';ctx.fillRect(x-w*.37,gy-h*.40,3,h*.42);ctx.fillRect(x+w*.34,gy-h*.40,3,h*.42);
  }else if(prop.type==='bin'){
    const w=clamp(18*scale,7,55),h=clamp(34*scale,12,100);
    ctx.fillStyle='#3d4b4d';rr(p.sx-w/2,gy-h,w,h,Math.max(2,w*.12));ctx.fill();ctx.fillStyle='#6d7b7d';ctx.fillRect(p.sx-w*.55,gy-h-3,w*1.1,4);
  }else if(prop.type==='sign'){
    const h=clamp(58*scale,18,180),w=clamp(27*scale,10,80);
    ctx.strokeStyle='#50595e';ctx.lineWidth=Math.max(2,3*scale);ctx.beginPath();ctx.moveTo(p.sx,gy);ctx.lineTo(p.sx,gy-h);ctx.stroke();
    ctx.fillStyle='#2b6c9d';ctx.fillRect(p.sx-w/2,gy-h-w*.65,w,w*.52);ctx.fillStyle='#fff';ctx.fillRect(p.sx-w*.25,gy-h-w*.46,w*.50,Math.max(1,w*.06));
  }
}
function drawFirstPersonStreetSurface(horizon,road,align,onRoad){
  if(onRoad&&align>.50){
    const asphalt=ctx.createLinearGradient(0,horizon,0,H);
    asphalt.addColorStop(0,'#596267');asphalt.addColorStop(.55,'#444b50');asphalt.addColorStop(1,'#30363a');
    ctx.fillStyle=asphalt;ctx.beginPath();ctx.moveTo(W*.455,horizon);ctx.lineTo(W*.545,horizon);ctx.lineTo(W*.92,H);ctx.lineTo(W*.08,H);ctx.closePath();ctx.fill();

    // Gehwege: bewusst über der Szenerie gezeichnet, damit kein Haus/Baum die Straße übermalen kann.
    const sidewalk=ctx.createLinearGradient(0,horizon,0,H);
    sidewalk.addColorStop(0,'#c1c0ba');sidewalk.addColorStop(1,'#999b98');
    ctx.fillStyle=sidewalk;
    ctx.beginPath();ctx.moveTo(W*.405,horizon);ctx.lineTo(W*.455,horizon);ctx.lineTo(W*.08,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(W*.545,horizon);ctx.lineTo(W*.595,horizon);ctx.lineTo(W,H);ctx.lineTo(W*.92,H);ctx.closePath();ctx.fill();

    ctx.strokeStyle='#e0ded6';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(W*.455,horizon);ctx.lineTo(W*.08,H);ctx.moveTo(W*.545,horizon);ctx.lineTo(W*.92,H);ctx.stroke();
    ctx.strokeStyle='rgba(90,92,91,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W*.405,horizon);ctx.lineTo(0,H);ctx.moveTo(W*.595,horizon);ctx.lineTo(W,H);ctx.stroke();

    // Mittelmarkierung
    ctx.strokeStyle='#e5dca5';
    for(let i=1;i<11;i++){
      const t=i/11,y=horizon+(H-horizon)*t*t;
      ctx.lineWidth=2+7*t;ctx.beginPath();ctx.moveTo(W/2,y);ctx.lineTo(W/2,y+10+25*t);ctx.stroke();
    }

    // Zebrastreifen, wenn sich eine Kreuzung vor dem Spieler befindet.
    let intersectionAhead=Infinity;
    if(road.axis==='h'){
      for(const rx of roadsX){
        const dx=rx-state.x,dy=road.coord-state.y,ca=Math.cos(state.a),sa=Math.sin(state.a);
        const f=dx*ca+dy*sa;if(f>80)intersectionAhead=Math.min(intersectionAhead,f);
      }
    }else{
      for(const ry of roadsY){
        const dx=road.coord-state.x,dy=ry-state.y,ca=Math.cos(state.a),sa=Math.sin(state.a);
        const f=dx*ca+dy*sa;if(f>80)intersectionAhead=Math.min(intersectionAhead,f);
      }
    }
    if(intersectionAhead<700){
      const gy=fpGroundY(intersectionAhead),t=clamp((gy-horizon)/(H-horizon),0,1),half=55+430*t;
      ctx.fillStyle='rgba(245,245,242,.76)';
      for(let k=-3;k<=3;k++)ctx.fillRect(W/2-half*.82+k*(half*.23),gy,half*.12,Math.max(3,7+18*t));
    }

    // Asphaltstruktur nur auf der Fahrbahn.
    ctx.fillStyle='rgba(255,255,255,.035)';
    for(let i=0;i<55;i++){
      const t=(i%11+1)/12,y=horizon+(H-horizon)*t*t;
      const half=(W*.045)+(W*.375)*t;
      const x=W/2-half+(i*73%(Math.max(12,half*2)));
      ctx.fillRect(x,y+(i%4)*3,2+(i%2),1);
    }
  }else if(onRoad){
    ctx.fillStyle='#aaa9a3';ctx.fillRect(0,horizon,W,H-horizon);
    ctx.fillStyle='#474e53';ctx.beginPath();ctx.moveTo(0,horizon+95);ctx.lineTo(W,horizon+95);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
  }
}

function nearestRoadInfo(){
  let best={dist:Infinity,axis:'h',coord:0};
  for(const y of roadsY){const d=Math.abs(state.y-y);if(d<best.dist)best={dist:d,axis:'h',coord:y};}
  for(const x of roadsX){const d=Math.abs(state.x-x);if(d<best.dist)best={dist:d,axis:'v',coord:x};}
  return best;
}
function drawFirstPerson(){
  const horizon=310;
  const light=lightingProfile();
  const sky=ctx.createLinearGradient(0,0,0,horizon);
  if(light.daylight>.35){
    sky.addColorStop(0,light.warm>.35?'#6d9fc5':'#66a6d1');
    sky.addColorStop(.58,light.warm>.35?'#b8c8d2':'#a7cee4');
    sky.addColorStop(1,light.warm>.35?'#e9c8aa':'#e7eef0');
  }else{
    sky.addColorStop(0,'#172438');sky.addColorStop(.65,'#2c4057');sky.addColorStop(1,'#596676');
  }
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,horizon);

  // Sonne / Dunst
  if(light.daylight>.18){
    const sx=W*(.72-.18*Math.cos(light.t/24*Math.PI*2)),sy=70+105*(1-light.daylight);
    ctx.fillStyle='rgba(255,224,164,'+(0.20+0.36*light.daylight)+')';ctx.beginPath();ctx.arc(sx,sy,26,0,Math.PI*2);ctx.fill();
    const glow=ctx.createRadialGradient(sx,sy,6,sx,sy,110);glow.addColorStop(0,'rgba(255,220,155,.20)');glow.addColorStop(1,'rgba(255,220,155,0)');ctx.fillStyle=glow;ctx.fillRect(sx-110,sy-110,220,220);
  }

  ctx.fillStyle=light.daylight>.35?'#73865f':'#38483e';ctx.fillRect(0,horizon,W,H-horizon);

  const road=nearestRoadInfo();
  const roadAngle=road.axis==='h'?0:Math.PI/2;
  const align=Math.abs(Math.cos(state.a-roadAngle));
  const onRoad=road.dist<170;

  // 1. Hintergrundszenerie zuerst: Häuser und Bäume.
  const scenery=[];
  for(const b of buildings){
    if(b.type==='park')continue;
    const q=structureRect(b),cx=q.x+q.w/2,cy=q.y+q.h/2;
    const p=fpProject(cx,cy);
    if(p&&p.forward<1650&&Math.abs(p.side)>230){
      scenery.push({d:p.forward,fn:()=>drawFirstPersonBuilding(b,p)});
    }
  }
  for(const t of cityTrees){
    const p=fpProject(t.x,t.y);
    if(p&&p.forward<1450&&Math.abs(p.side)>205)scenery.push({d:p.forward,fn:()=>drawFirstPersonTree(t.x,t.y,t.r,p)});
  }
  scenery.sort((a,b)=>b.d-a.d);scenery.forEach(o=>o.fn());

  // 2. Straße und Gehwege als harte Vordergrundmaske.
  // Dadurch kann die Fahrbahn niemals von Gebäuden oder Bäumen übermalt werden.
  drawFirstPersonStreetSurface(horizon,road,align,onRoad);

  // Straßenmöbel auf Gehwegen nach der Straßenmaske zeichnen.
  const props=[];
  for(const prop of cityProps){
    const p=fpProject(prop.x,prop.y);
    if(p&&p.forward<1150&&Math.abs(p.side)>135)props.push({d:p.forward,fn:()=>drawFirstPersonProp(prop,p)});
  }
  props.sort((a,b)=>b.d-a.d);props.forEach(o=>o.fn());

  // 3. Bewegliche Objekte kommen auf die Straße/Gehwege zurück.
  const actors=[];
  for(const c of traffic){
    if(c.dead)continue;const p=fpProject(c.x,c.y);
    if(p&&p.forward<1250)actors.push({d:p.forward,fn:()=>drawFirstPersonCar(c,p,false)});
  }
  worldCars.forEach((c,i)=>{
    if(i===state.worldCar)return;const p=fpProject(c.x,c.y);
    if(p&&p.forward<1250)actors.push({d:p.forward,fn:()=>drawFirstPersonCar(c,p,false)});
  });
  for(const person of people){
    const p=fpProject(person.x,person.y);
    if(p&&p.forward<850)actors.push({d:p.forward,fn:()=>drawFirstPersonPerson(person,p)});
  }
  for(const pc of police){
    const p=fpProject(pc.x,pc.y);
    if(p&&p.forward<1300)actors.push({d:p.forward,fn:()=>drawFirstPersonCar({w:68,h:34,color:'#e8edf0',name:'Polizei',hp:100},p,true)});
  }
  actors.sort((a,b)=>b.d-a.d);actors.forEach(o=>o.fn());

  // leichte Tiefen-/Kamerawirkung
  if(light.warm>.15){ctx.fillStyle='rgba(255,174,104,'+(light.warm*.035)+')';ctx.fillRect(0,0,W,H);}
  if(light.daylight<.40){ctx.fillStyle='rgba(18,30,46,'+((.40-light.daylight)*.30)+')';ctx.fillRect(0,0,W,H);}
  const vignette=ctx.createRadialGradient(W/2,H*.46,H*.20,W/2,H*.46,W*.68);vignette.addColorStop(.55,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.18)');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);

  ctx.save();ctx.textRendering='optimizeLegibility';ctx.fillStyle='rgba(255,255,255,.72)';ctx.font='600 14px system-ui';ctx.fillText('ICH-PERSPEKTIVE',18,28);ctx.restore();
  drawFirstPersonOverlay();
}

function drawRoomBase(b){
  ctx.fillStyle=b.type==='parking'?'#73797d':b.type==='dealer'?'#a6aaad':b.type==='home'?'#c2a17c':'#d8cbb5';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ede9e1';ctx.fillRect(0,0,W,52);ctx.fillRect(0,H-52,W,52);ctx.fillRect(0,0,52,H);ctx.fillRect(W-52,0,52,H);
  ctx.fillStyle='#283138';ctx.font='bold 25px system-ui';ctx.fillText(b.name,72,88);
}
function drawInterior(){
  const b=currentBuilding();drawRoomBase(b);
  const floorGlow=ctx.createLinearGradient(0,80,0,H);floorGlow.addColorStop(0,'rgba(255,255,255,.08)');floorGlow.addColorStop(1,'rgba(0,0,0,.10)');ctx.fillStyle=floorGlow;ctx.fillRect(52,52,W-104,H-104);
  for(let lx=210;lx<W-120;lx+=310){const lg=ctx.createRadialGradient(lx,120,8,lx,160,150);lg.addColorStop(0,'rgba(255,242,205,.16)');lg.addColorStop(1,'rgba(255,242,205,0)');ctx.fillStyle=lg;ctx.fillRect(lx-150,52,300,260);}
  if(b.type==='home'){
    ctx.fillStyle='#d9c4a4';ctx.fillRect(75,145,430,220);ctx.fillStyle='#7c624d';ctx.fillRect(105,175,170,120);ctx.fillStyle='#d9d2c5';ctx.fillRect(315,170,155,130);
    ctx.fillStyle='#b58e69';ctx.fillRect(610,145,500,220);ctx.fillStyle='#6f4f3b';ctx.fillRect(650,195,150,85);ctx.fillStyle='#e9e0d3';ctx.fillRect(865,175,190,110);
    ctx.fillStyle='#9b765c';ctx.fillRect(90,420,430,160);ctx.fillStyle='#39444b';ctx.fillRect(135,465,220,65);ctx.fillStyle='#73604d';ctx.fillRect(650,420,420,160);ctx.fillStyle='#e8e8e5';ctx.fillRect(700,445,310,95);
  }
  if(b.type==='shop'){
    ctx.fillStyle='#8c765b';for(let r=0;r<2;r++)for(let i=0;i<4;i++){const x=100+i*275,y=170+r*205;ctx.fillRect(x,y,180,72);ctx.fillStyle='#bea27a';for(let k=0;k<5;k++)ctx.fillRect(x+14+k*31,y+16,19,39);ctx.fillStyle='#8c765b';}
  }
  if(b.type==='cafe'){
    ctx.fillStyle='#734f35';for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(150+i*225,280,52,0,Math.PI*2);ctx.fill();ctx.fillStyle='#4a392d';ctx.fillRect(146+i*225,280,8,70);ctx.fillStyle='#734f35';}
  }
  if(b.type==='dealer'||b.type==='parking'){
    ctx.fillStyle='#646b70';ctx.fillRect(80,130,1120,470);
    ctx.strokeStyle='#d6d9da';ctx.lineWidth=2;
    for(let x=120;x<1180;x+=150){ctx.beginPath();ctx.moveTo(x,160);ctx.lineTo(x,540);ctx.stroke();}
    if(b.type==='dealer'){ctx.fillStyle='#eef2f4';ctx.fillRect(80,110,1120,68);ctx.fillStyle='#30383d';ctx.font='bold 18px system-ui';ctx.fillText('SHOWROOM – Fahrzeuge stehen physisch im Gebäude',340,150);}
  }
  if(b.type==='garage'){
    ctx.fillStyle='#565d61';ctx.fillRect(120,160,1040,370);ctx.fillStyle='#d4ad4a';ctx.fillRect(210,210,30,250);ctx.fillRect(1010,210,30,250);
  }

  if(b.vehiclePortal){
    ctx.fillStyle='#2d75bd';ctx.fillRect(58,575,170,55);ctx.fillStyle='#fff';ctx.font='bold 16px system-ui';ctx.fillText('← EINFAHRT',75,609);
    ctx.fillStyle='#2f8952';ctx.fillRect(1050,575,170,55);ctx.fillStyle='#fff';ctx.fillText('AUSFAHRT →',1070,609);
  }else{
    ctx.fillStyle='#6f4d35';ctx.fillRect(1080,570,100,55);ctx.fillStyle='#fff';ctx.font='bold 13px system-ui';ctx.fillText('AUSGANG',1096,603);
  }

  (roomVehicles[b.id]||[]).forEach((c,i)=>{
    drawVehicle(c,i===state.roomCar);
    if(b.type==='dealer'&&c.forSale){ctx.fillStyle='#1f262a';ctx.font='bold 12px system-ui';ctx.fillText(c.name,c.x-55,c.y+48);ctx.fillText(c.price.toLocaleString('de-DE')+' €',c.x-38,c.y+65);}
  });

  (indoorPeople[b.id]||[]).forEach(p=>{
    const a=p.horizontal?(p.dir>0?0:Math.PI):(p.dir>0?Math.PI/2:-Math.PI/2);
    drawPerson(p,p.x,p.y,a,p.phase,false);
  });

  if(state.roomCar<0)drawPerson({height:1,skin:'#f0c6a2',top:'#37688f',bottom:'#293640',hair:'#30231d'},state.rx,state.ry,state.a,state.walk,true);

  drawWaterFx('interior');drawShotFx('interior');

  if(state.roomCar<0&&b.type==='dealer'){
    const list=roomVehicles[b.id]||[],i=nearestVehicle(list,state.rx,state.ry,112);
    if(i>=0){ctx.strokeStyle='#ffd348';ctx.lineWidth=3;ctx.beginPath();ctx.arc(list[i].x,list[i].y,75,0,Math.PI*2);ctx.stroke();}
  }
}
function drawSpeedFX(){
  if(state.mode!=='outside'||state.worldCar<0)return;
  const v=Math.abs(state.speed);if(v<280)return;
  const strength=clamp((v-280)/480,0,1);
  ctx.save();
  ctx.globalAlpha=.08+.17*strength;
  ctx.strokeStyle='#dce8ef';ctx.lineWidth=1+2.6*strength;
  const cx=W/2,cy=H/2;
  for(let i=0;i<30;i++){
    const a=(i/30)*Math.PI*2;
    const r1=155+(i%6)*24,r2=r1+32+strength*90;
    ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);ctx.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2);ctx.stroke();
  }
  ctx.globalAlpha=.08+.10*strength;
  ctx.fillStyle='#eef6fa';
  const side=35+strength*70;
  ctx.fillRect(0,H*.18,side,2);ctx.fillRect(0,H*.77,side*1.25,2);
  ctx.fillRect(W-side,H*.28,side,2);ctx.fillRect(W-side*1.25,H*.68,side*1.25,2);
  ctx.restore();
}

function drawMiniMap(){
  if(state.mode!=='outside')return;
  const mw=190,mh=120,x=W-mw-14,y=14,sx=mw/WORLD_W,sy=mh/WORLD_H;
  ctx.save();ctx.globalAlpha=.9;ctx.fillStyle='#151c21';rr(x,y,mw,mh,9);ctx.fill();ctx.strokeStyle='#73818a';ctx.stroke();
  ctx.strokeStyle='#65717a';ctx.lineWidth=4;
  roadsY.forEach(v=>{ctx.beginPath();ctx.moveTo(x,y+v*sy);ctx.lineTo(x+mw,y+v*sy);ctx.stroke();});
  roadsX.forEach(v=>{ctx.beginPath();ctx.moveTo(x+v*sx,y);ctx.lineTo(x+v*sx,y+mh);ctx.stroke();});
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+state.x*sx,y+state.y*sy,4,0,Math.PI*2);ctx.fill();ctx.restore();
}

function updateViewButton(){
  const b=document.getElementById('viewBtn');if(b)b.textContent=state.firstPerson?'👁 Ich-Perspektive':'🗺 Vogelperspektive';
}
function toggleView(){
  if(state.mode!=='outside')return toast('Perspektivwechsel draußen verfügbar.');
  state.firstPerson=!state.firstPerson;updateViewButton();
  toast(state.firstPerson?'Ich-Perspektive':'Vogelperspektive');
}
async function toggleFullscreen(){
  const el=document.getElementById('app');
  try{
    if(document.fullscreenElement||document.webkitFullscreenElement){
      if(document.exitFullscreen)await document.exitFullscreen();else if(document.webkitExitFullscreen)document.webkitExitFullscreen();
    }else if(el.requestFullscreen){
      await el.requestFullscreen();
    }else if(el.webkitRequestFullscreen){
      el.webkitRequestFullscreen();
    }else{
      document.body.classList.toggle('pseudo-fullscreen');
    }
  }catch(_){
    document.body.classList.toggle('pseudo-fullscreen');
  }
}
function updateFullscreenButton(){
  const b=document.getElementById('fullscreenBtn');if(!b)return;
  const on=!!(document.fullscreenElement||document.webkitFullscreenElement)||document.body.classList.contains('pseudo-fullscreen');
  b.textContent=on?'↙ Vollbild verlassen':'⛶ Vollbild';
}
function resetGame(){location.reload();}

let last=performance.now();
function frame(now){
  const dt=Math.min(32,now-last);last=now;
  state.punchT=Math.max(0,state.punchT-dt);state.punchCd=Math.max(0,state.punchCd-dt);updateWaterFx(dt);updateShotFx(dt);state.worldTime=(state.worldTime+dt*.0000030)%24;

  if(state.mode==='outside'){
    updateOutside(dt);updateTraffic(dt);updatePeople(people,dt,false);updatePolice(dt);camera();
  }else{
    updateInterior(dt);updatePeople(indoorPeople[state.buildingId]||[],dt,true);police.length=0;
  }
  hud();

  ctx.clearRect(0,0,W,H);
  if(state.mode==='outside'){
    if(state.firstPerson){drawFirstPerson();drawSpeedFX();drawMiniMap();}
    else{ctx.save();ctx.translate(-state.camX,-state.camY);drawCity();ctx.restore();drawSpeedFX();drawMiniMap();}
  }else drawInterior();

  requestAnimationFrame(frame);
}

function normalizeKey(e){return e.key.length===1?e.key.toLowerCase():e.key;}
window.addEventListener('blur',()=>keys.clear());
document.addEventListener('keydown',e=>{
  const k=normalizeKey(e);
  if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)){keys.add(k);e.preventDefault();}
  if(k==='e'){e.preventDefault();action();}
  if(k==='f'){e.preventDefault();vehicleAction();}
  if(k==='g'){e.preventDefault();sprayWater();}
  if(k==='r'){e.preventDefault();shootPistol();}
  if(k==='v'){e.preventDefault();toggleView();}
  if(e.code==='Space'){e.preventDefault();punch();}
  if(e.key==='Shift')state.sprint=true;
});
document.addEventListener('keyup',e=>{keys.delete(normalizeKey(e));if(e.key==='Shift')state.sprint=false;});
canvas.addEventListener('pointerdown',()=>canvas.focus());

const dirMap={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
document.querySelectorAll('[data-dir]').forEach(btn=>{
  const key=dirMap[btn.dataset.dir];
  const start=e=>{
    e.preventDefault();
    try{btn.setPointerCapture(e.pointerId);}catch(_){}
    keys.add(key);
  };
  const stop=e=>{
    keys.delete(key);
    if(e&&btn.hasPointerCapture&&btn.hasPointerCapture(e.pointerId)){
      try{btn.releasePointerCapture(e.pointerId);}catch(_){}
    }
  };
  btn.addEventListener('pointerdown',start);
  btn.addEventListener('pointerup',stop);
  btn.addEventListener('pointercancel',stop);
});
document.getElementById('actionBtn').addEventListener('click',action);
document.getElementById('vehicleBtn').addEventListener('click',vehicleAction);
document.getElementById('punchBtn').addEventListener('click',punch);
document.getElementById('sprayBtn').addEventListener('click',sprayWater);
document.getElementById('shootBtn').addEventListener('click',shootPistol);
document.getElementById('sprintBtn').addEventListener('click',()=>{state.sprint=!state.sprint;toast(state.sprint?'Sprint an':'Sprint aus');});
document.getElementById('resetBtn').addEventListener('click',resetGame);
document.getElementById('viewBtn').addEventListener('click',toggleView);
document.getElementById('fullscreenBtn').addEventListener('click',toggleFullscreen);
document.addEventListener('fullscreenchange',()=>{configureHiDPI();updateFullscreenButton();});document.addEventListener('webkitfullscreenchange',()=>{configureHiDPI();updateFullscreenButton();});window.addEventListener('resize',configureHiDPI);
updateViewButton();updateFullscreenButton();

log('🖥️ Hochauflösende Darstellung aktiv: '+Math.round(W*renderScale)+'×'+Math.round(H*renderScale)+'.');hud();requestAnimationFrame(frame);
})();