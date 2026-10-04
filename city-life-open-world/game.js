(()=>{
'use strict';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const W=canvas.width,H=canvas.height;
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
  camX:530,camY:1210,walk:0,inventory:[],sprayCd:0,waterFx:[],shootCd:0,shotFx:[],activeWeapon:null,firstPerson:true
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
  const safe=178;
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

  ctx.strokeStyle='rgba(245,245,245,.30)';ctx.lineWidth=2;
  for(const y of roadsY){
    for(let x=120;x<WORLD_W;x+=420){ctx.strokeRect(x,y+76,115,42);}
  }
  for(const x of roadsX){
    for(let y=120;y<WORLD_H;y+=420){ctx.strokeRect(x+76,y,42,115);}
  }

  cityTrees.forEach(t=>drawTree(t.x,t.y,t.r));
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
function fpRoadHalfScreen(p){
  return clamp(175*p.scale+42,68,W*.44);
}
function drawFirstPersonBuilding(b,p){
  const q=structureRect(b);
  const worldFront=clamp(Math.min(q.w,q.h)*.58,95,220);
  const bw=clamp(worldFront*p.scale,40,500);
  const bh=clamp(fpBuildingHeight(b)*p.scale,30,430);
  const gy=fpGroundY(p.forward);
  const roadHalf=fpRoadHalfScreen(p);
  let x=p.sx-bw/2;

  // Gebäude bleiben optisch neben der Fahrbahn und schneiden nicht durch die Straße.
  if(p.side<0)x=Math.min(x,W/2-roadHalf-bw-28);
  else x=Math.max(x,W/2+roadHalf+28);
  x=clamp(x,-bw*.65,W-bw*.35);
  const y=gy-bh;

  // breiter Gehweg-/Vorgartenstreifen vor der Fassade
  ctx.fillStyle='rgba(182,180,171,.86)';
  ctx.beginPath();
  ctx.moveTo(x-8,gy);ctx.lineTo(x+bw+8,gy);ctx.lineTo(x+bw*.90,gy+Math.min(38,bh*.15));ctx.lineTo(x+bw*.10,gy+Math.min(38,bh*.15));
  ctx.closePath();ctx.fill();

  ctx.fillStyle='rgba(0,0,0,.24)';ctx.fillRect(x+10,y+11,bw,bh);
  ctx.fillStyle=b.wall||'#9a8b7d';ctx.fillRect(x,y,bw,bh);

  // Fassadentiefe und Sockel
  const shade=ctx.createLinearGradient(x,y,x+bw,y);
  shade.addColorStop(0,'rgba(0,0,0,.23)');shade.addColorStop(.22,'rgba(255,255,255,.05)');shade.addColorStop(.78,'rgba(255,255,255,.02)');shade.addColorStop(1,'rgba(0,0,0,.19)');
  ctx.fillStyle=shade;ctx.fillRect(x,y,bw,bh);
  ctx.fillStyle='rgba(45,43,39,.24)';ctx.fillRect(x,y+bh*.86,bw,bh*.14);

  if(b.type==='home'){
    ctx.fillStyle='#654635';ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+bw/2,y-bh*.17);ctx.lineTo(x+bw+5,y);ctx.closePath();ctx.fill();
    ctx.fillStyle='#4f3729';ctx.fillRect(x+bw*.20,y-bh*.11,Math.max(6,bw*.07),bh*.12);
  }else if(b.type==='office'||b.type==='station'){
    ctx.fillStyle='rgba(50,62,69,.30)';ctx.fillRect(x+bw*.08,y+bw*.02,bw*.84,bh*.10);
  }

  const cols=clamp(Math.floor(bw/58),2,8),rows=clamp(Math.floor(bh/60),1,5);
  const cellW=(bw-30)/cols,cellH=(bh-45)/rows;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const ww=Math.max(9,Math.min(30,cellW*.52)),wh=Math.max(10,Math.min(27,cellH*.47));
    const wx=x+15+c*cellW+(cellW-ww)/2,wy=y+22+r*cellH;
    ctx.fillStyle='#304652';ctx.fillRect(wx-2,wy-2,ww+4,wh+4);
    ctx.fillStyle='#79a9bd';ctx.fillRect(wx,wy,ww,wh);
    ctx.fillStyle='rgba(240,252,255,.48)';ctx.fillRect(wx+3,wy+3,Math.max(2,ww*.23),wh-6);
    ctx.strokeStyle='rgba(30,40,45,.55)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(wx+ww*.52,wy);ctx.lineTo(wx+ww*.52,wy+wh);ctx.stroke();
    if(b.type==='home'&&r<2){
      ctx.fillStyle='rgba(69,96,57,.62)';ctx.fillRect(wx-2,wy+wh+2,ww+4,Math.max(2,wh*.12));
    }
  }

  if(b.type==='dealer'){
    ctx.fillStyle='rgba(155,211,235,.80)';ctx.fillRect(x+bw*.08,y+bh*.48,bw*.84,bh*.43);
    ctx.strokeStyle='rgba(230,248,255,.50)';ctx.lineWidth=2;
    for(let k=1;k<4;k++){ctx.beginPath();ctx.moveTo(x+bw*(.08+.21*k),y+bh*.48);ctx.lineTo(x+bw*(.08+.21*k),y+bh*.91);ctx.stroke();}
  }

  // Tür niemals in der Straßenmitte, sondern in der Fassade.
  ctx.fillStyle='#3f3028';ctx.fillRect(x+bw*.44,gy-Math.max(20,bh*.22),Math.max(14,bw*.11),Math.max(20,bh*.22));
  ctx.fillStyle='rgba(255,220,150,.35)';ctx.fillRect(x+bw*.46,gy-Math.max(18,bh*.19),Math.max(5,bw*.035),Math.max(7,bh*.07));

  ctx.fillStyle='#242a2e';ctx.fillRect(x+7,y+6,Math.min(bw-14,210),Math.max(18,bh*.11));
  ctx.fillStyle='#fff';ctx.font='bold '+clamp(bw/20,10,17)+'px system-ui';ctx.fillText(b.name,x+13,y+clamp(bh*.085,15,26));
}
function drawFirstPersonTree(x,y,r,p){
  const gy=fpGroundY(p.forward),h=clamp(r*4.8*p.scale,24,250),w=h*.72;
  const roadHalf=fpRoadHalfScreen(p);
  let sx=p.sx;
  if(p.side<0)sx=Math.min(sx,W/2-roadHalf-w*.60-10);
  else sx=Math.max(sx,W/2+roadHalf+w*.60+10);
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
  const gy=fpGroundY(p.forward),w=clamp((c.w||68)*1.85*p.scale,24,330),h=clamp((c.h||34)*1.55*p.scale,13,155);
  const x=p.sx-w/2,y=gy-h;
  ctx.fillStyle='rgba(0,0,0,.30)';ctx.beginPath();ctx.ellipse(p.sx,gy+3,w*.53,h*.28,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=policeCar?'#e6ecef':(c.hp<=0?'#555':c.color||'#888');rr(x,y,w,h,Math.max(4,h*.18));ctx.fill();
  if(policeCar){ctx.fillStyle='#194f99';ctx.fillRect(x,y,w*.28,h);ctx.fillRect(x+w*.74,y,w*.26,h);}
  if(c.name&&c.name.includes('Lamborghini')){
    ctx.fillStyle='#1c2327';ctx.beginPath();ctx.moveTo(x+w*.22,y+h*.22);ctx.lineTo(x+w*.76,y+h*.14);ctx.lineTo(x+w*.88,y+h*.58);ctx.lineTo(x+w*.15,y+h*.58);ctx.closePath();ctx.fill();
  }else if(c.name&&c.name.includes('Bugatti')){
    ctx.fillStyle='#b8d3e2';ctx.beginPath();ctx.ellipse(p.sx,y+h*.62,w*.16,h*.23,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#17242d';ctx.beginPath();ctx.ellipse(p.sx,y+h*.62,w*.11,h*.17,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(x+w*.46,y+h*.08,w*.08,h*.80);
  }else{
    ctx.fillStyle='#9cc5d6';rr(x+w*.25,y+h*.12,w*.50,h*.38,Math.max(3,h*.08));ctx.fill();
  }
  ctx.fillStyle='#15191b';ctx.beginPath();ctx.ellipse(x+w*.18,gy,w*.10,h*.21,0,0,Math.PI*2);ctx.ellipse(x+w*.82,gy,w*.10,h*.21,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f4e6a7';ctx.fillRect(x+w*.82,y+h*.55,Math.max(2,w*.06),Math.max(2,h*.12));
  ctx.fillStyle='#b93535';ctx.fillRect(x+w*.08,y+h*.55,Math.max(2,w*.05),Math.max(2,h*.12));
  if(policeCar){ctx.fillStyle='#e33';ctx.fillRect(p.sx-w*.06,y-4,w*.06,5);ctx.fillStyle='#39f';ctx.fillRect(p.sx,y-4,w*.06,5);}
}
function drawFirstPersonPerson(person,p){
  const gy=fpGroundY(p.forward),h=clamp(52*(person.height||1)*p.scale,18,220),w=h*.32,x=p.sx;
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(x,gy+2,w*.48,h*.09,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=person.bottom||'#343b40';ctx.lineWidth=Math.max(2,w*.18);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,gy-h*.36);ctx.lineTo(x-w*.22,gy);ctx.moveTo(x,gy-h*.36);ctx.lineTo(x+w*.22,gy);ctx.stroke();
  ctx.strokeStyle=person.top||'#546d80';ctx.lineWidth=Math.max(4,w*.42);ctx.beginPath();ctx.moveTo(x,gy-h*.72);ctx.lineTo(x,gy-h*.33);ctx.stroke();
  ctx.strokeStyle=person.skin||'#d9a47e';ctx.lineWidth=Math.max(2,w*.13);ctx.beginPath();ctx.moveTo(x-w*.08,gy-h*.62);ctx.lineTo(x-w*.40,gy-h*.40);ctx.moveTo(x+w*.08,gy-h*.62);ctx.lineTo(x+w*.40,gy-h*.40);ctx.stroke();
  ctx.fillStyle=person.skin||'#d9a47e';ctx.beginPath();ctx.arc(x,gy-h*.86,Math.max(3,w*.24),0,Math.PI*2);ctx.fill();
  ctx.fillStyle=person.hair||'#35271f';ctx.beginPath();ctx.arc(x,gy-h*.90,Math.max(3,w*.23),Math.PI,Math.PI*2);ctx.fill();
  if(person.hat){ctx.fillStyle='#2d3337';ctx.fillRect(x-w*.26,gy-h*.99,w*.52,Math.max(2,h*.04));}
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
function nearestRoadInfo(){
  let best={dist:Infinity,axis:'h',coord:0};
  for(const y of roadsY){const d=Math.abs(state.y-y);if(d<best.dist)best={dist:d,axis:'h',coord:y};}
  for(const x of roadsX){const d=Math.abs(state.x-x);if(d<best.dist)best={dist:d,axis:'v',coord:x};}
  return best;
}
function drawFirstPerson(){
  const horizon=310;
  const sky=ctx.createLinearGradient(0,0,0,horizon);
  sky.addColorStop(0,'#69a9d4');sky.addColorStop(.58,'#a7cee4');sky.addColorStop(1,'#e7eef0');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,horizon);
  ctx.fillStyle='#73865f';ctx.fillRect(0,horizon,W,H-horizon);

  const road=nearestRoadInfo();
  const roadAngle=road.axis==='h'?0:Math.PI/2;
  const align=Math.abs(Math.cos(state.a-roadAngle));
  const onRoad=road.dist<170;

  if(onRoad&&align>.50){
    // Fahrbahn, Gehwege und Bordsteine laufen sauber nach vorne.
    const asphalt=ctx.createLinearGradient(0,horizon,0,H);asphalt.addColorStop(0,'#555d61');asphalt.addColorStop(1,'#343a3e');
    ctx.fillStyle=asphalt;ctx.beginPath();ctx.moveTo(W*.455,horizon);ctx.lineTo(W*.545,horizon);ctx.lineTo(W*.92,H);ctx.lineTo(W*.08,H);ctx.closePath();ctx.fill();

    ctx.fillStyle='#aeadab';
    ctx.beginPath();ctx.moveTo(W*.405,horizon);ctx.lineTo(W*.455,horizon);ctx.lineTo(W*.08,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(W*.545,horizon);ctx.lineTo(W*.595,horizon);ctx.lineTo(W,H);ctx.lineTo(W*.92,H);ctx.closePath();ctx.fill();

    ctx.strokeStyle='#d5d3ca';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(W*.455,horizon);ctx.lineTo(W*.08,H);ctx.moveTo(W*.545,horizon);ctx.lineTo(W*.92,H);ctx.stroke();

    ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=2;
    for(let i=2;i<10;i+=2){
      const t=i/10,y=horizon+(H-horizon)*t*t,spread=55+430*t;
      ctx.beginPath();ctx.moveTo(W/2-spread,y);ctx.lineTo(W/2-spread*.96,y+18);ctx.stroke();
      ctx.beginPath();ctx.moveTo(W/2+spread,y);ctx.lineTo(W/2+spread*.96,y+18);ctx.stroke();
    }

    ctx.strokeStyle='#ded59d';
    for(let i=1;i<11;i++){
      const t=i/11,y=horizon+(H-horizon)*t*t;
      ctx.lineWidth=2+7*t;ctx.beginPath();ctx.moveTo(W/2,y);ctx.lineTo(W/2,y+10+25*t);ctx.stroke();
    }
  }else if(onRoad){
    // Beim Blick quer zur Straße wird keine falsche Straße "nach vorne" erfunden.
    ctx.fillStyle='#aaa9a3';ctx.fillRect(0,horizon,W,H-horizon);
    ctx.fillStyle='#474e53';ctx.beginPath();ctx.moveTo(0,horizon+95);ctx.lineTo(W,horizon+95);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
  }

  const drawables=[];
  for(const b of buildings){
    if(b.type==='park')continue;
    const q=structureRect(b),cx=q.x+q.w/2,cy=q.y+q.h/2;
    const p=fpProject(cx,cy);
    if(p&&p.forward<1650&&Math.abs(p.side)>150){
      drawables.push({d:p.forward,fn:()=>drawFirstPersonBuilding(b,p)});
    }
  }

  for(const t of cityTrees){
    const p=fpProject(t.x,t.y);
    if(p&&p.forward<1450)drawables.push({d:p.forward,fn:()=>drawFirstPersonTree(t.x,t.y,t.r,p)});
  }

  for(const c of traffic){
    if(c.dead)continue;const p=fpProject(c.x,c.y);
    if(p&&p.forward<1250)drawables.push({d:p.forward,fn:()=>drawFirstPersonCar(c,p,false)});
  }
  worldCars.forEach((c,i)=>{
    if(i===state.worldCar)return;const p=fpProject(c.x,c.y);
    if(p&&p.forward<1250)drawables.push({d:p.forward,fn:()=>drawFirstPersonCar(c,p,false)});
  });
  for(const person of people){
    const p=fpProject(person.x,person.y);
    if(p&&p.forward<850)drawables.push({d:p.forward,fn:()=>drawFirstPersonPerson(person,p)});
  }
  for(const pc of police){
    const p=fpProject(pc.x,pc.y);
    if(p&&p.forward<1300)drawables.push({d:p.forward,fn:()=>drawFirstPersonCar({w:68,h:34,color:'#e8edf0',name:'Polizei',hp:100},p,true)});
  }

  drawables.sort((a,b)=>b.d-a.d);drawables.forEach(o=>o.fn());

  ctx.fillStyle='rgba(255,255,255,.62)';ctx.font='bold 14px system-ui';ctx.fillText('ICH-PERSPEKTIVE',18,28);
  drawFirstPersonOverlay();
}

function drawRoomBase(b){
  ctx.fillStyle=b.type==='parking'?'#73797d':b.type==='dealer'?'#a6aaad':b.type==='home'?'#c2a17c':'#d8cbb5';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ede9e1';ctx.fillRect(0,0,W,52);ctx.fillRect(0,H-52,W,52);ctx.fillRect(0,0,52,H);ctx.fillRect(W-52,0,52,H);
  ctx.fillStyle='#283138';ctx.font='bold 25px system-ui';ctx.fillText(b.name,72,88);
}
function drawInterior(){
  const b=currentBuilding();drawRoomBase(b);
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
  state.punchT=Math.max(0,state.punchT-dt);state.punchCd=Math.max(0,state.punchCd-dt);updateWaterFx(dt);updateShotFx(dt);

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
document.addEventListener('fullscreenchange',updateFullscreenButton);document.addEventListener('webkitfullscreenchange',updateFullscreenButton);
updateViewButton();updateFullscreenButton();

hud();requestAnimationFrame(frame);
})();