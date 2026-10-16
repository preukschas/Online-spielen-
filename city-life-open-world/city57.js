(()=>{
'use strict';
const api=window.CityLife57;if(!api)return;

const style=document.createElement('style');
style.textContent=`
#city57-launch{position:fixed;right:16px;bottom:16px;z-index:1200;border:1px solid #80dfcb;background:#153f40;color:white;border-radius:14px;padding:12px 18px;font:700 15px system-ui;box-shadow:0 5px 18px #0008}
#city57-panel{position:fixed;z-index:1201;inset:5% 4%;background:#14242cf5;color:#fff;border:1px solid #70bfb3;border-radius:18px;padding:15px;overflow:auto;font:14px system-ui;display:none;max-width:1020px;margin:auto;box-shadow:0 8px 40px #000b}
#city57-panel button,#city57-panel select{margin:4px;padding:9px;background:#244f59;color:white;border:1px solid #83c9c2;border-radius:8px}
#city57-panel button[disabled]{opacity:.48}
#city57-panel canvas{width:100%;max-height:56vh;object-fit:contain;background:#182c36;border:1px solid #42636a;border-radius:10px}
#city57-panel .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
#city57-panel .card{padding:10px;margin:8px 0;background:#1d333b;border:1px solid #365863;border-radius:11px}
#city57-panel .muted{color:#c2d4d4}
#city57-panel .ok{color:#94e6a7}
#city57-panel .bad{color:#ffb39f}
#city57-gpshud{position:fixed;left:50%;transform:translateX(-50%);top:76px;z-index:1198;min-width:260px;max-width:min(620px,88vw);padding:9px 14px;border-radius:12px;background:#102830e8;border:1px solid #56d7dc;color:white;font:700 14px system-ui;box-shadow:0 4px 18px #0008;display:none;text-align:center}
@media(max-width:760px){#city57-panel{inset:2%;padding:10px}#city57-gpshud{top:64px;font-size:12px}}
`;
document.head.appendChild(style);

const launch=document.createElement('button');launch.id='city57-launch';launch.textContent='📱 Stadt-Handy';document.body.appendChild(launch);
const gpsHud=document.createElement('div');gpsHud.id='city57-gpshud';document.body.appendChild(gpsHud);
const panel=document.createElement('section');panel.id='city57-panel';panel.setAttribute('aria-label','City Life Smartphone, Karte, GPS und Garage');panel.tabIndex=-1;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
panel.innerHTML='<div class="row"><strong style="font-size:21px">📱 City Life 5.7</strong><button id="city57-close">✕ Schließen</button></div><div class="row"><button data-tab="map">🗺️ Karte & GPS</button><button data-tab="garage">🏠 Meine Garage</button><button data-tab="tuning">🔧 Tuning</button><button data-tab="phone">📞 Stadtservices</button><button data-tab="settings">⚙️ Grafik</button></div><div id="city57-content"></div>';
document.body.appendChild(panel);

const body=panel.querySelector('#city57-content');
const mapCanvas=document.createElement('canvas');mapCanvas.width=930;mapCanvas.height=630;
let tab='map',destination=null,tuneCarId=null,destinationId=null;const GPS_KEY='city-life-gps-target';try{destinationId=localStorage.getItem(GPS_KEY)}catch(_){}

const districtRects=[
 ['Altstadt',0,0,170,142,'#5b5148'],
 ['Park & Wohnen',0,142,190,138,'#3f604b'],
 ['Innenstadt',170,0,210,280,'#44576c'],
 ['Gewerbepark',380,0,240,190,'#665942'],
 ['Bahnhof & Business',0,280,380,106,'#505e67'],
 ['Hafen & Industrie',380,190,240,230,'#3c555e']
];

const esc=t=>String(t??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function district(x,z){return (districtRects.find(d=>x>=d[1]&&x<d[1]+d[3]&&z>=d[2]&&z<d[2]+d[4])||['Außenbezirk'])[0]}
function nearestNode(x,z,s){
 let best=null,bd=Infinity;
 for(const rx of s.roadsX)for(const rz of s.roadsZ){const d=Math.hypot(rx-x,rz-z);if(d<bd){bd=d;best={x:rx,z:rz}}}
 return best
}
function compact(points){
 const out=[];for(const p of points){if(!p)continue;const prev=out[out.length-1];if(!prev||distance(prev,p)>.5)out.push({x:p.x,z:p.z,name:p.name})}return out
}
function pathLength(points){let n=0;for(let i=1;i<points.length;i++)n+=distance(points[i-1],points[i]);return n}
function makeRoute(a,b,s){
 const start=nearestNode(a.x,a.z,s),end=nearestNode(b.x,b.z,s);if(!start||!end)return[a,b];
 const r1=compact([a,start,{x:end.x,z:start.z},end,b]),r2=compact([a,start,{x:start.x,z:end.z},end,b]);
 return pathLength(r1)<=pathLength(r2)?r1:r2
}
function directionText(a,b,index){
 const dx=b.x-a.x,dz=b.z-a.z,d=Math.round(Math.hypot(dx,dz));if(d<2)return null;
 if(index===0)return 'Zur nächsten Straße · '+d+' m';
 if(Math.abs(dx)>Math.abs(dz))return 'Fahre '+(dx>0?'Richtung Osten':'Richtung Westen')+' · '+d+' m';
 return 'Fahre '+(dz>0?'Richtung Süden':'Richtung Norden')+' · '+d+' m'
}
function instructions(points){const out=[];for(let i=1;i<points.length;i++){const t=directionText(points[i-1],points[i],i-1);if(t)out.push(t)}return out}
function destinationFromId(id,s){return s.buildings.find(b=>b.id===id)||null}
function setDestination(dest){
 destination=dest?{...dest}:null;destinationId=destination?.id||null;
 try{if(destinationId)localStorage.setItem(GPS_KEY,destinationId);else localStorage.removeItem(GPS_KEY)}catch(_){}
 updateGpsHud();if(panel.style.display==='block'&&tab==='map')render()
}
function restoreDestination(){
 if(destination||!destinationId)return;const s=api.snapshot();destination=s.buildings.find(b=>b.id===destinationId)|| (destinationId==='harbor'?{id:'harbor',name:'HAFEN',x:210,z:389}:null)
}
function updateGpsHud(){
 restoreDestination();const s=api.snapshot();if(!destination){gpsHud.style.display='none';return}
 const pts=makeRoute({x:s.x,z:s.z},destination,s),ins=instructions(pts),remaining=Math.round(pathLength(pts));
 if(distance({x:s.x,z:s.z},destination)<9){gpsHud.textContent='✅ Ziel erreicht: '+destination.name;setTimeout(()=>{destination=null;gpsHud.style.display='none'},1600);return}
 gpsHud.style.display='block';gpsHud.textContent='🧭 '+destination.name+' · '+remaining+' m · '+(ins[0]||'Ziel voraus')
}

function drawMap(){
 restoreDestination();const s=api.snapshot(),ctx=mapCanvas.getContext('2d');if(!ctx)return;
 const sx=mapCanvas.width/s.worldW,sz=mapCanvas.height/s.worldD;ctx.clearRect(0,0,mapCanvas.width,mapCanvas.height);
 for(const d of districtRects){ctx.fillStyle=d[5];ctx.fillRect(d[1]*sx,d[2]*sz,d[3]*sx,d[4]*sz);ctx.fillStyle='#e6eee9';ctx.font='600 15px system-ui';ctx.fillText(d[0],(d[1]+8)*sx,(d[2]+18)*sz)}
 ctx.strokeStyle='#9ba7ab';ctx.lineWidth=15;ctx.lineCap='round';
 for(const x of s.roadsX){ctx.beginPath();ctx.moveTo(x*sx,0);ctx.lineTo(x*sx,mapCanvas.height);ctx.stroke()}
 for(const z of s.roadsZ){ctx.beginPath();ctx.moveTo(0,z*sz);ctx.lineTo(mapCanvas.width,z*sz);ctx.stroke()}
 // Brücke sichtbar hervorheben.
 ctx.strokeStyle='#d7b96d';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(265*sx,264*sz);ctx.lineTo(349*sx,264*sz);ctx.stroke();
 for(const b of s.buildings){ctx.fillStyle=b.id==='garage'?'#6af1c5':b.id==='gym'?'#82e2d4':'#f7d17c';ctx.fillRect(b.x*sx-3,b.z*sz-3,7,7)}
 if(destination){
  const pts=makeRoute({x:s.x,z:s.z},destination,s);ctx.beginPath();ctx.strokeStyle='#42edf3';ctx.lineWidth=6;ctx.lineJoin='round';pts.forEach((p,i)=>i?ctx.lineTo(p.x*sx,p.z*sz):ctx.moveTo(p.x*sx,p.z*sz));ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='700 14px system-ui';ctx.fillText(destination.name,destination.x*sx+7,destination.z*sz-8)
 }
 ctx.fillStyle='#ff5353';ctx.beginPath();ctx.arc(s.x*sx,s.z*sz,7,0,Math.PI*2);ctx.fill();
 const info=document.getElementById('city57-distance');if(info){const pts=destination?makeRoute({x:s.x,z:s.z},destination,s):[];info.textContent=destination?'GPS: '+destination.name+' · Route '+Math.round(pathLength(pts))+' m':'GPS: Kein Ziel'}
}

function garageCard(c,s){
 const current=s.vehicleId===c.id,status=c.garageStored?'Eingelagert':current?'Aktuell gefahren':'In der Stadt',flat=c.flatCount?(' · 🛞 '+c.flatCount+' platt'):'';
 return '<div class="card"><strong>'+esc(c.name)+'</strong><div class="muted">Zustand '+Math.round(c.hp)+'%'+flat+' · '+status+'</div><div class="row">'
 +(current?'<button data-store="'+esc(c.id)+'">Einlagern</button>':'')
 +(c.garageStored?'<button data-recall="'+esc(c.id)+'">Bereitstellen</button>':'')
 +'<button data-repair="'+esc(c.id)+'">Komplett reparieren · '+Math.round(c.repairCost)+' €</button></div></div>'
}

function render(){
 const s=api.snapshot();
 if(tab==='map'){
  const opts=s.buildings.map(b=>'<option value="'+esc(b.id)+'">'+esc(b.name)+'</option>').join('');
  body.innerHTML='<p class="muted">Aktueller Stadtteil: <strong>'+esc(district(s.x,s.z))+'</strong>. Die türkise Linie läuft über das Straßennetz; die GPS-Anzeige bleibt auch bei geschlossenem Handy sichtbar.</p><div class="row"><select id="city57-destination"><option value="">Ziel auswählen</option>'+opts+'</select><button id="city57-go">GPS starten</button><button id="city57-clear">Route löschen</button></div><p id="city57-distance"></p><div id="city57-turns" class="card"></div>';
  body.appendChild(mapCanvas);
  body.querySelector('#city57-go').onclick=()=>{const id=body.querySelector('#city57-destination').value,set=destinationFromId(id,api.snapshot());if(set)setDestination(set)};
  body.querySelector('#city57-clear').onclick=()=>setDestination(null);
  if(destination){const pts=makeRoute({x:s.x,z:s.z},destination,s),ins=instructions(pts);body.querySelector('#city57-turns').innerHTML='<strong>Fahranweisungen</strong><br>'+ins.slice(0,5).map((x,i)=>(i+1)+'. '+esc(x)).join('<br>')}else body.querySelector('#city57-turns').innerHTML='<span class="muted">Noch kein GPS-Ziel gewählt.</span>';
  drawMap()
 }else if(tab==='garage'){
  const owned=s.cars.filter(c=>c.owned);
  body.innerHTML='<h3>🏠 Meine Garage · MOTORWERK</h3><p class="'+(s.nearGarage?'ok':'bad')+'">'+(s.nearGarage?'Du bist beim MOTORWERK. Fahrzeuge können eingelagert oder bereitgestellt werden.':'Zum Einlagern, Abholen oder Bearbeiten bitte zum MOTORWERK fahren.')+'</p>'+(!owned.length?'<p>Noch keine gekauften Fahrzeuge.</p>':owned.map(c=>garageCard(c,s)).join(''));
  body.querySelectorAll('[data-store]').forEach(b=>b.onclick=()=>{api.notify(api.store(b.dataset.store)?'Garage: Fahrzeug eingelagert':'Dafür mit deinem Fahrzeug zum MOTORWERK fahren');render()});
  body.querySelectorAll('[data-recall]').forEach(b=>b.onclick=()=>{api.notify(api.recall(b.dataset.recall)?'Garage: Fahrzeug bereitgestellt':'Zum MOTORWERK gehen und aussteigen');render()});
  body.querySelectorAll('[data-repair]').forEach(b=>b.onclick=()=>{api.notify(api.repair(b.dataset.repair)?'Garage: Reparatur abgeschlossen':'Reparatur nicht möglich – MOTORWERK, Fahrzeugstatus oder Guthaben prüfen');render()})
 }else if(tab==='tuning'){
  const owned=s.cars.filter(c=>c.owned);if(!tuneCarId&&owned[0])tuneCarId=owned[0].id;const c=owned.find(x=>x.id===tuneCarId)||owned[0];
  const parts=[['engine','Motor',320],['brakes','Bremsen',180],['tires','Reifen',160],['paint','Lackierung',120],['rims','Felgen',130],['suspension','Fahrwerk',210]];
  body.innerHTML='<h3>🔧 MOTORWERK Tuning</h3><p class="muted">Tuning funktioniert bei eingelagerten Fahrzeugen oder wenn du mit deinem eigenen Fahrzeug am MOTORWERK stehst.</p><select id="city57-tune-car">'+owned.map(x=>'<option value="'+esc(x.id)+'" '+(c&&x.id===c.id?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select>'+(c?'<div class="card"><strong>'+esc(c.name)+'</strong><br>'+parts.map(([id,name,cost])=>'<button data-tune="'+id+'" '+(c.tuning?.[id]?'disabled':'')+'>'+(c.tuning?.[id]?'✓ ':'')+name+' · '+cost+' €</button>').join('')+'</div>':'<p>Noch kein eigenes Fahrzeug.</p>');
  const sel=body.querySelector('#city57-tune-car');if(sel)sel.onchange=()=>{tuneCarId=sel.value;render()};
  body.querySelectorAll('[data-tune]').forEach(b=>b.onclick=()=>{api.notify(c&&api.tune(c.id,b.dataset.tune)?'Tuning eingebaut':'Nicht möglich – Fahrzeug zum MOTORWERK bringen/einlagern oder Guthaben prüfen');render()})
 }else if(tab==='settings'){
  const q=api.quality?.()||{mode:'auto',fps:0,ratio:1};
  body.innerHTML='<h3>⚙️ Grafik & Leistung</h3><p>Geschätzte Bildrate: '+q.fps+' FPS · Renderauflösung: '+q.ratio.toFixed(2)+'×</p><p class="muted">Automatik passt die Renderauflösung an die Geräteleistung an.</p><div class="row">'+[['auto','Automatisch'],['high','Hohe Qualität'],['balanced','Ausgewogen'],['battery','Akku sparen']].map(([id,name])=>'<button data-quality="'+id+'" aria-pressed="'+(q.mode===id)+'">'+name+'</button>').join('')+'</div>';
  body.querySelectorAll('[data-quality]').forEach(b=>b.onclick=()=>{api.setQuality?.(b.dataset.quality);render()})
 }else{
  const services=[['garage','MOTORWERK'],['station','HAUPTBAHNHOF'],['gym','CITY GYM'],['police','POLIZEI'],['market','FRISCHMARKT']];
  body.innerHTML='<h3>📞 Stadtservices</h3><p>Stadtteil: <strong>'+esc(district(s.x,s.z))+'</strong> · Geld: '+Math.round(s.money)+' €</p><div class="row">'+services.map(([id,name])=>'<button data-service="'+id+'">🧭 '+name+'</button>').join('')+'<button data-harbor="1">⚓ Hafen</button></div><div class="card"><strong>Fahrzeugstatus</strong><br>'+(s.vehicleId?(s.cars.find(c=>c.id===s.vehicleId)?.name||'Fahrzeug'):'Zu Fuß')+'</div>';
  body.querySelectorAll('[data-service]').forEach(b=>b.onclick=()=>{const d=destinationFromId(b.dataset.service,api.snapshot());if(d){setDestination(d);api.notify('GPS gestartet: '+d.name)}});
  const hb=body.querySelector('[data-harbor]');if(hb)hb.onclick=()=>{setDestination({id:'harbor',name:'HAFEN',x:210,z:389});api.notify('GPS gestartet: Hafen')}
 }
}

function openPhone(){panel.style.display='block';api.releaseControls?.();render();panel.focus()}
function closePhone(){panel.style.display='none';launch.focus()}
launch.onclick=openPhone;panel.querySelector('#city57-close').onclick=closePhone;
panel.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});
panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closePhone()}e.stopPropagation()});
window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='m'&&!e.repeat&&!e.target.closest('input,textarea,select,[contenteditable]')){e.preventDefault();panel.style.display=panel.style.display==='block'?'none':'block';if(panel.style.display==='block')render()}if(e.key==='Escape')closePhone()});
setInterval(()=>{updateGpsHud();if(panel.style.display==='block'&&tab==='map')drawMap()},450);
})();