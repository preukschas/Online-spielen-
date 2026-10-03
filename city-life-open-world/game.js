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
  {id:'market',x:80,y:70,w:450,h:320,name:'FRISCHMARKT',type:'shop',wall:'#b86c53',door:[305,415],items:[['Getränk',4,'🥤',4],['Snack',6,'🥪',8],['Lebensmittel',25,'🛍️',0],['Rucksack',45,'🎒',0],['Tablet',250,'📱',0]]},
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
  {id:'mall',x:2110,y:1780,w:700,h:500,name:'CITY MALL',type:'shop',wall:'#999ca0',door:[2460,2310],items:[['Kamera',350,'📷',0],['Konsole',450,'🎮',0],['Schmuck',600,'💎',0],['Fernseher',700,'📺',0]]},
  {id:'moto',x:3350,y:1780,w:700,h:500,name:'BIKE & MOTO',type:'dealer',wall:'#8b9196',vehiclePortal:true,entrance:[3440,2310],exit:[3960,2310],dealerSet:'moto'},
  {id:'home-c',x:4590,y:1770,w:900,h:510,name:'WOHNPARK',type:'home',wall:'#b9896b',door:[5040,2310]},

  {id:'police',x:80,y:2850,w:450,h:350,name:'POLIZEI',type:'police',wall:'#89969f',door:[560,3025]},
  {id:'station',x:790,y:2850,w:760,h:350,name:'HAUPTBAHNHOF',type:'station',wall:'#929a9e',door:[1170,2820]},
  {id:'office',x:2110,y:2850,w:700,h:350,name:'BUSINESS CENTER',type:'office',wall:'#a89c88',door:[2460,2820]},
  {id:'gas',x:3350,y:2850,w:700,h:350,name:'TANKSTELLE',type:'garage',wall:'#a49e89',door:[3320,3025]},
  {id:'exotic',x:4590,y:2850,w:900,h:350,name:'EXOTIC MOTORS',type:'dealer',wall:'#8f9499',vehiclePortal:true,entrance:[4680,2820],exit:[5390,2820],dealerSet:'exotic'}
];

const specs={
  'City Sedan':{type:'sedan',color:'#466f99',max:420,acc:.68,turn:.0037,price:28000},
  'Falcon SUV':{type:'suv',color:'#566d54',max:380,acc:.58,turn:.0030,price:52000},
  'Cargo Van':{type:'van',color:'#d7d3c8',max:320,acc:.48,turn:.0025,price:39000},
  'Volt E':{type:'electric',color:'#4f7d85',max:540,acc:.96,turn:.0040,price:68000},
  'Lamborghini Huracán':{type:'sport',color:'#e4b82e',max:760,acc:1.38,turn:.0047,price:265000},
  'Ferrari 488':{type:'sport',color:'#bb3030',max:720,acc:1.28,turn:.0045,price:290000},
  'Ferrari Roma':{type:'sport',color:'#8e1f2a',max:660,acc:1.14,turn:.0043,price:245000},
  'Ducati Panigale':{type:'bike',color:'#c53030',max:690,acc:1.48,turn:.0056,price:36000},
  'Ducati Monster':{type:'bike',color:'#55575a',max:560,acc:1.18,turn:.0053,price:19000}
};

const dealerSets={
  normal:['City Sedan','Falcon SUV','Volt E'],
  premium:['Lamborghini Huracán','Ferrari 488','Ferrari Roma'],
  moto:['Ducati Panigale','Ducati Monster','Volt E'],
  exotic:['Lamborghini Huracán','Ferrari 488','Ducati Panigale']
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
    forSale:!!opt.forSale,showroom:!!opt.showroom
  };
}

const worldCars=[
  makeVehicle(720,820,0,'City Sedan'),
  makeVehicle(1730,880,Math.PI/2,'Falcon SUV'),
  makeVehicle(2980,760,0,'Ferrari 488'),
  makeVehicle(4260,1450,Math.PI/2,'Cargo Van'),
  makeVehicle(5480,1690,Math.PI/2,'Lamborghini Huracán'),
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

const trafficModels=['City Sedan','Falcon SUV','Cargo Van','Ferrari Roma','Lamborghini Huracán','Ducati Panigale','Volt E'];
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
    hair:hairs[(i*2)%hairs.length],height:.92+(i%5)*.03,stun:0,pause:0
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
  x:1100,y:1250,a:0,money:1000,hp:100,heat:0,lastCrime:99999,
  worldCar:-1,speed:0,sprint:false,punchT:0,punchCd:0,
  mode:'outside',buildingId:null,rx:140,ry:640,roomCar:-1,roomSpeed:0,
  camX:460,camY:890,walk:0,inventory:[]
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
  ui.carHpText.textContent=c?Math.round(Math.max(0,c.hp))+'%':'–';ui.carHpBar.style.width=c?Math.max(0,c.hp)+'%':'0';
  ui.heatText.textContent=Math.round(state.heat)+'%';ui.heatBar.style.width=state.heat+'%';
  ui.place.textContent=state.mode==='outside'?'Großstadt':currentBuilding().name;
  ui.inventory.innerHTML=state.inventory.length?state.inventory.map(x=>'<div>'+x+'</div>').join(''):'Leer';
}
function crime(amount,msg){state.heat=clamp(state.heat+amount,0,100);state.lastCrime=0;if(msg)log(msg);hud();}
function outsideBlocked(x,y,r){
  for(const b of buildings){
    if(b.type==='park')continue;
    if(x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h)return true;
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
        state.money-=price;
        if(heal>0){
          state.hp=Math.min(100,state.hp+heal);
          log('✅ '+name+' gekauft und benutzt: +'+heal+' Gesundheit.');
        }else{
          state.inventory.push(icon+' '+name);
          log('✅ '+name+' gekauft und ins Inventar gelegt.');
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
function damageCar(c,amount){
  c.hp=Math.max(0,c.hp-amount);
  if(c.hp<=0)toast('Totalschaden');
}
function outsideCarCollisions(){
  if(state.worldCar<0)return;
  const c=worldCars[state.worldCar];
  for(const t of traffic){
    if(t.dead)continue;
    if(dist(c.x,c.y,t.x,t.y)<(Math.max(c.w,c.h)+Math.max(t.w,t.h))*.46){
      const dmg=Math.min(55,8+(Math.abs(state.speed)+t.speed)*.10);
      damageCar(c,dmg);t.hp-=dmg*.7;if(t.hp<=0){t.dead=true;t.speed=0;}
      state.speed*=-.22;state.hp=Math.max(0,state.hp-dmg*.06);return;
    }
  }
  for(let i=0;i<worldCars.length;i++){
    if(i===state.worldCar)continue;
    const o=worldCars[i];
    if(dist(c.x,c.y,o.x,o.y)<(Math.max(c.w,c.h)+Math.max(o.w,o.h))*.43){
      const dmg=Math.min(48,6+Math.abs(state.speed)*.11);
      damageCar(c,dmg);o.hp=Math.max(0,o.hp-dmg*.6);state.speed*=-.18;return;
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
    const nx=state.x+Math.cos(state.a)*state.speed*dt/1000,ny=state.y+Math.sin(state.a)*state.speed*dt/1000;
    if(!outsideBlocked(nx,ny,28)){state.x=nx;state.y=ny;c.x=nx;c.y=ny;c.a=state.a;}
    else{damageCar(c,Math.min(42,8+Math.abs(state.speed)*.08));state.speed*=-.16;}
    outsideCarCollisions();return;
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
  while(police.length<n)police.push({x:state.x+700,y:state.y+500,speed:0});
  while(police.length>n)police.pop();
  for(const p of police){
    const a=Math.atan2(state.y-p.y,state.x-p.x);p.speed=Math.min(165,p.speed+.04*dt);
    p.x+=Math.cos(a)*p.speed*dt/1000;p.y+=Math.sin(a)*p.speed*dt/1000;
  }
}
function camera(){
  const tx=clamp(state.x-W/2,0,WORLD_W-W),ty=clamp(state.y-H/2,0,WORLD_H-H);
  state.camX+=(tx-state.camX)*.1;state.camY+=(ty-state.camY)*.1;
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

  for(let x=180;x<WORLD_W;x+=430)for(let y=180;y<WORLD_H;y+=460)drawTree(x,y,20);
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
    ctx.fillStyle='#70965e';rr(b.x,b.y,b.w,b.h,17);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=2;ctx.stroke();
    for(let k=0;k<30;k++)drawTree(b.x+50+(k*97)%(b.w-100),b.y+55+(k*69)%(b.h-110),14+(k%3)*2);
    return;
  }

  ctx.fillStyle='rgba(0,0,0,.30)';rr(b.x+14,b.y+18,b.w,b.h,10);ctx.fill();
  drawBrickFacade(b);

  ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(b.x+8,b.y+7,b.w-16,8);
  ctx.fillStyle='rgba(0,0,0,.12)';ctx.fillRect(b.x+8,b.y+b.h-16,b.w-16,10);
  ctx.strokeStyle='rgba(255,255,255,.10)';ctx.strokeRect(b.x+4,b.y+4,b.w-8,b.h-8);

  ctx.fillStyle='#252b2f';rr(b.x+15,b.y+14,Math.min(310,b.w-30),38,4);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 15px system-ui';ctx.fillText(b.name,b.x+27,b.y+40);

  for(let x=b.x+26;x<b.x+b.w-44;x+=72){
    ctx.fillStyle='#607985';ctx.fillRect(x-2,b.y+66,47,41);
    ctx.fillStyle='#79a4b8';ctx.fillRect(x,b.y+68,43,37);
    ctx.fillStyle='rgba(240,252,255,.58)';ctx.fillRect(x+5,b.y+72,12,28);
    ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(x+25,b.y+72,13,28);
    ctx.strokeStyle='rgba(30,40,45,.55)';ctx.beginPath();ctx.moveTo(x+21,b.y+68);ctx.lineTo(x+21,b.y+105);ctx.stroke();
  }

  if(b.type==='home'){
    ctx.fillStyle='#6b4b39';ctx.beginPath();ctx.moveTo(b.x+8,b.y);ctx.lineTo(b.x+b.w/2,b.y-48);ctx.lineTo(b.x+b.w-8,b.y);ctx.fill();
    ctx.fillStyle='#4f3729';ctx.fillRect(b.x+b.w*.22,b.y-24,22,26);ctx.fillRect(b.x+b.w*.72,b.y-17,19,20);
    for(let f=0;f<2;f++){
      const by=b.y+132+f*70;
      ctx.fillStyle='#5d6164';ctx.fillRect(b.x+70,by,170,10);ctx.fillRect(b.x+300,by,170,10);
      ctx.strokeStyle='#32373a';ctx.lineWidth=2;
      for(let bx=b.x+78;bx<b.x+234;bx+=22){ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx,by+23);ctx.stroke();}
      for(let bx=b.x+308;bx<b.x+464;bx+=22){ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx,by+23);ctx.stroke();}
      ctx.fillStyle='rgba(68,94,55,.55)';ctx.fillRect(b.x+86,by+16,55,9);ctx.fillRect(b.x+326,by+16,55,9);
    }
  }
  if(b.type==='dealer'){
    ctx.fillStyle='rgba(157,214,239,.78)';ctx.fillRect(b.x+45,b.y+126,b.w-90,150);
    ctx.fillStyle='rgba(255,255,255,.20)';ctx.beginPath();ctx.moveTo(b.x+55,b.y+132);ctx.lineTo(b.x+b.w-180,b.y+132);ctx.lineTo(b.x+b.w-290,b.y+270);ctx.lineTo(b.x+55,b.y+270);ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff';ctx.font='bold 13px system-ui';ctx.fillText('SHOWROOM',b.x+65,b.y+150);
  }
  if(b.type==='parking'){
    ctx.fillStyle='#646b70';ctx.fillRect(b.x+42,b.y+126,b.w-84,b.h-158);
    ctx.strokeStyle='#4e5458';for(let y=b.y+150;y<b.y+b.h-48;y+=34){ctx.beginPath();ctx.moveTo(b.x+42,y);ctx.lineTo(b.x+b.w-42,y);ctx.stroke();}
    ctx.fillStyle='rgba(255,255,255,.08)';for(let x=b.x+70;x<b.x+b.w-70;x+=105)ctx.fillRect(x,b.y+140,7,b.h-190);
  }

  if(b.vehiclePortal){
    ctx.fillStyle='#2b73bc';ctx.fillRect(b.entrance[0]-62,b.entrance[1]-18,124,36);
    ctx.fillStyle='#fff';ctx.font='bold 12px system-ui';ctx.fillText('EINFAHRT',b.entrance[0]-31,b.entrance[1]+5);
    ctx.fillStyle='#2e8952';ctx.fillRect(b.exit[0]-62,b.exit[1]-18,124,36);
    ctx.fillStyle='#fff';ctx.fillText('AUSFAHRT',b.exit[0]-32,b.exit[1]+5);
  }else if(b.door){
    const nearDoor=dist(state.x,state.y,b.door[0],b.door[1])<82;
    ctx.fillStyle=nearDoor?'#e3bd43':'#45372e';ctx.fillRect(b.door[0]-22,b.door[1]-24,44,48);
    ctx.fillStyle='rgba(255,255,255,.10)';ctx.fillRect(b.door[0]-17,b.door[1]-19,12,38);
    if(nearDoor){ctx.fillStyle='#fff';ctx.fillText('E',b.door[0]-4,b.door[1]-30);}
  }
}
function drawVehicle(c,active){
  ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a);
  const w=c.w,h=c.h;
  ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(6,8,w*.60,h*.70,0,0,Math.PI*2);ctx.fill();

  const body=c.hp<=0?'#555':active?'#efbd46':c.color;
  if(c.type==='bike'){
    ctx.fillStyle='#141719';ctx.beginPath();ctx.arc(-w*.31,0,6.5,0,Math.PI*2);ctx.arc(w*.31,0,6.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=body;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-w*.20,0);ctx.lineTo(-2,-6);ctx.lineTo(w*.18,0);ctx.stroke();
    ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(1,-5,w*.20,5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#202529';ctx.fillRect(-4,-10,9,8);
    ctx.strokeStyle='#c9d0d3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.16,-2);ctx.lineTo(w*.27,-7);ctx.stroke();
    ctx.fillStyle='#f3e29b';ctx.beginPath();ctx.arc(w*.32,-3,2.4,0,Math.PI*2);ctx.fill();
  }else{
    ctx.fillStyle=body;
    if(c.type==='sport'){
      ctx.beginPath();ctx.moveTo(-w*.49,-h*.36);ctx.quadraticCurveTo(-w*.38,-h*.52,-w*.12,-h*.48);ctx.lineTo(w*.34,-h*.40);ctx.quadraticCurveTo(w*.50,-h*.24,w*.50,0);ctx.quadraticCurveTo(w*.50,h*.24,w*.34,h*.40);ctx.lineTo(-w*.12,h*.48);ctx.quadraticCurveTo(-w*.38,h*.52,-w*.49,h*.36);ctx.closePath();ctx.fill();
    }else{rr(-w/2,-h/2,w,h,c.type==='van'?5:c.type==='suv'?7:8);ctx.fill();}

    ctx.fillStyle='rgba(255,255,255,.12)';rr(-w*.42,-h*.40,w*.70,h*.16,4);ctx.fill();
    ctx.fillStyle='#9fc7d8';rr(-w*.10,-h/2+5,w*.28,h-10,4);ctx.fill();
    ctx.fillStyle='#7da9bb';rr(-w*.02,-h/2+6,w*.11,h-12,3);ctx.fill();
    ctx.strokeStyle='rgba(20,28,32,.65)';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-w*.02,-h*.36);ctx.lineTo(-w*.02,h*.36);ctx.stroke();

    ctx.fillStyle='#121517';
    ctx.fillRect(-w/2+5,-h/2-3,13,5);ctx.fillRect(w/2-18,-h/2-3,13,5);ctx.fillRect(-w/2+5,h/2-2,13,5);ctx.fillRect(w/2-18,h/2-2,13,5);

    ctx.fillStyle='#f8eaa8';ctx.fillRect(w/2-5,-h/2+4,4,7);ctx.fillRect(w/2-5,h/2-11,4,7);
    ctx.fillStyle='#c03a3a';ctx.fillRect(-w/2+1,-h/2+4,4,7);ctx.fillRect(-w/2+1,h/2-11,4,7);

    ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(-w*.22,-2,w*.48,3);
    if(c.type==='sport'){ctx.fillStyle='#1d2327';ctx.fillRect(-w*.42,-h*.34,5,h*.68);ctx.fillRect(w*.37,-h*.31,3,h*.62);}
    if(c.type==='electric'){ctx.fillStyle='#89e6e8';ctx.fillRect(w*.38,-4,5,8);}
    if(c.type==='suv'){ctx.strokeStyle='rgba(30,35,38,.75)';ctx.strokeRect(-w*.35,-h*.34,w*.60,h*.68);}
  }

  if(c.hp<70){
    ctx.strokeStyle='rgba(25,25,25,.80)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-11,-6);ctx.lineTo(9,8);ctx.moveTo(-5,10);ctx.lineTo(13,-9);ctx.stroke();
  }
  if(c.hp<35){
    ctx.fillStyle='rgba(55,55,55,.45)';ctx.beginPath();ctx.arc(-w*.22,-h*.65,8,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function drawPerson(p,x,y,a,phase,player){
  ctx.save();ctx.translate(x,y);ctx.rotate(a||0);
  const h=player?1:p.height,bob=Math.sin(phase)*1.2,leg=Math.sin(phase)*5.2,arm=-Math.sin(phase)*4.2;ctx.translate(0,bob);
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(4,21*h,12*h,6*h,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=player?'#293640':p.bottom;ctx.lineWidth=5*h;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,8*h);ctx.lineTo(-4*h+leg,23*h);ctx.moveTo(0,8*h);ctx.lineTo(4*h-leg,23*h);ctx.stroke();
  ctx.strokeStyle=player?'#37688f':p.top;ctx.lineWidth=9*h;ctx.beginPath();ctx.moveTo(0,-4*h);ctx.lineTo(0,11*h);ctx.stroke();
  ctx.strokeStyle=player?'#f0c6a2':p.skin;ctx.lineWidth=4*h;ctx.beginPath();ctx.moveTo(-2*h,0);ctx.lineTo(-9*h+arm,10*h);ctx.moveTo(2*h,0);ctx.lineTo(9*h-arm,10*h);ctx.stroke();
  ctx.fillStyle=player?'#f0c6a2':p.skin;ctx.beginPath();ctx.arc(0,-12*h,8*h,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=player?'#30231d':p.hair;ctx.beginPath();ctx.arc(0,-14*h,7.8*h,Math.PI,Math.PI*2);ctx.fill();
  ctx.fillStyle='#262626';ctx.beginPath();ctx.arc(-2.6*h,-11*h,1*h,0,Math.PI*2);ctx.arc(2.6*h,-11*h,1*h,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawCity(){
  drawRoads();buildings.forEach(drawBuilding);
  traffic.forEach(c=>drawVehicle(c,false));
  worldCars.forEach((c,i)=>drawVehicle(c,i===state.worldCar));
  people.forEach(p=>{const a=p.horizontal?(p.dir>0?0:Math.PI):(p.dir>0?Math.PI/2:-Math.PI/2);drawPerson(p,p.x,p.y,a,p.phase,false);});
  police.forEach(p=>{ctx.fillStyle='#194f99';rr(p.x-28,p.y-15,56,30,6);ctx.fill();ctx.fillStyle='#d33';ctx.fillRect(p.x-8,p.y-20,8,4);ctx.fillStyle='#39f';ctx.fillRect(p.x,p.y-20,8,4);});
  if(state.worldCar<0)drawPerson({height:1,skin:'#f0c6a2',top:'#37688f',bottom:'#293640',hair:'#30231d'},state.x,state.y,state.a,state.walk,true);
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

  if(state.roomCar<0&&b.type==='dealer'){
    const list=roomVehicles[b.id]||[],i=nearestVehicle(list,state.rx,state.ry,112);
    if(i>=0){ctx.strokeStyle='#ffd348';ctx.lineWidth=3;ctx.beginPath();ctx.arc(list[i].x,list[i].y,75,0,Math.PI*2);ctx.stroke();}
  }
}
function drawSpeedFX(){
  if(state.mode!=='outside'||state.worldCar<0)return;
  const v=Math.abs(state.speed);if(v<300)return;
  const strength=clamp((v-300)/460,0,1);
  ctx.save();
  ctx.globalAlpha=.10+.18*strength;
  ctx.strokeStyle='#dce8ef';ctx.lineWidth=1+2*strength;
  const cx=W/2,cy=H/2;
  for(let i=0;i<24;i++){
    const a=(i/24)*Math.PI*2;
    const r1=170+(i%5)*22,r2=r1+35+strength*95;
    ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);ctx.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2);ctx.stroke();
  }
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

function resetGame(){location.reload();}

let last=performance.now();
function frame(now){
  const dt=Math.min(32,now-last);last=now;
  state.punchT=Math.max(0,state.punchT-dt);state.punchCd=Math.max(0,state.punchCd-dt);

  if(state.mode==='outside'){
    updateOutside(dt);updateTraffic(dt);updatePeople(people,dt,false);updatePolice(dt);camera();
  }else{
    updateInterior(dt);updatePeople(indoorPeople[state.buildingId]||[],dt,true);police.length=0;
  }
  hud();

  ctx.clearRect(0,0,W,H);
  if(state.mode==='outside'){
    ctx.save();ctx.translate(-state.camX,-state.camY);drawCity();ctx.restore();drawSpeedFX();drawMiniMap();
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
  if(e.code==='Space'){e.preventDefault();punch();}
  if(e.key==='Shift')state.sprint=true;
});
document.addEventListener('keyup',e=>{keys.delete(normalizeKey(e));if(e.key==='Shift')state.sprint=false;});
canvas.addEventListener('pointerdown',()=>canvas.focus());

const dirMap={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
document.querySelectorAll('[data-dir]').forEach(btn=>{
  const key=dirMap[btn.dataset.dir];
  const start=e=>{e.preventDefault();keys.add(key);};
  const stop=()=>keys.delete(key);
  btn.addEventListener('pointerdown',start);btn.addEventListener('pointerup',stop);btn.addEventListener('pointercancel',stop);btn.addEventListener('pointerleave',stop);
});
document.getElementById('actionBtn').addEventListener('click',action);
document.getElementById('vehicleBtn').addEventListener('click',vehicleAction);
document.getElementById('punchBtn').addEventListener('click',punch);
document.getElementById('sprintBtn').addEventListener('click',()=>{state.sprint=!state.sprint;toast(state.sprint?'Sprint an':'Sprint aus');});
document.getElementById('resetBtn').addEventListener('click',resetGame);

hud();requestAnimationFrame(frame);
})();