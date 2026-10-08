(function(){
"use strict";
const E=window.HoefenWater,G=window.WaterGeoData,V=window.HoefenGeoV2,$=id=>document.getElementById(id);
if(!E||!G||!V||!$("terrain"))return;
const STORAGE="dmp.simlab.hoefen.complete.v1",digits=(v,d=0)=>Number(v).toLocaleString("de-DE",{maximumFractionDigits:d,minimumFractionDigits:d});
const params=["rain","duration","seal","soil","drain","storage"];
const units={rain:" mm/h",duration:" min",seal:" %",soil:" mm/h",drain:" mm/h",storage:" mm"};
let selected="basic",tool="garden",actions=[],geo=E.BASE.map(c=>({...c})),geosource={type:"schematic",hasDgm:false,date:null};
let state,active=false,raf=null,last=0,elapsed=0,results=null;
const initialB={preset:"green",seal:32,soil:15,drain:8,storage:45,actions:[]};
let slotA={preset:"basic",seal:52,soil:9,drain:8,storage:0,actions:[]},slotB=initialB;
let warning="";
function label(id,s){$(id).textContent=s;}
function status(msg){label("status",msg);}
function info(msg){label("geoStatus",msg);}
function config(){
 const data={preset:selected,minutes:E.MINUTES};
 for(const p of params)data[p]=Number($(p).value);
 return E.normalize(data);
}
function scenario(){const {rain,duration,minutes,...rest}=config();return {...rest,actions:actions.map(a=>({...a}))};}
function setPreset(name){
 if(!E.cases[name])return;
 selected=name;const p=E.cases[name];
 for(const n of ["seal","soil","drain","storage"])$(n).value=p[n];
 actions=[];refreshActions();reflectInputs();refreshPresets();restart();status("Beispielpaket „"+p.name+"“ gewählt. Ausgangsparameter sind Annahmen.");
}
function reflectInputs(){
 for(const p of params)label(p+"Val",String($(p).value)+units[p]);
 label("speedVal",String($("speed").value)+" min/s");
}
function refreshPresets(){
 document.querySelectorAll("[data-preset]").forEach(b=>{
  const on=b.dataset.preset===selected;b.classList.toggle("on",on);b.setAttribute("aria-pressed",String(on));
 });
}
function refreshTools(){
 document.querySelectorAll("[data-tool]").forEach(b=>{
  const on=b.dataset.tool===tool;b.classList.toggle("on",on);b.setAttribute("aria-pressed",String(on));
 });
 $("eraseTool").classList.toggle("on",tool==="erase");
}
function refreshActions(){
 const counts={garden:0,basin:0,unseal:0};
 for(const a of actions)counts[a.type]++;
 label("actionStatus",actions.length+" Eingriffe gesetzt: "+counts.garden+" Mulden, "+counts.basin+" Becken, "+counts.unseal+" Entsiegelungen. Karte antippen, um weitere hinzuzufügen.");
}
function stop(){
 active=false;if(raf!==null)cancelAnimationFrame(raf);
 raf=null;last=0;elapsed=0;label("start","▶ Starten");
}
function restart(){
 stop();state=E.create({...config(),cells:geo,actions});
 results=null;render();
}
function step(){
 if(state.time>=state.config.minutes){stop();status("Simulation abgeschlossen.");return;}
 E.tick(state);render();
}
function play(t){
 if(!active)return;
 if(!last)last=t;
 elapsed+=Math.max(0,Math.min(t-last,250));last=t;
 const tickDuration=1000/Math.max(1,Number($("speed").value));
 let n=0;
 while(elapsed>=tickDuration&&n<40&&state.time<state.config.minutes){
  E.tick(state);n++;elapsed-=tickDuration;
 }
 render();
 if(state.time>=state.config.minutes){stop();status("Versuch abgeschlossen. Ergebnisse können als A/B verglichen werden.");}
 else raf=requestAnimationFrame(play);
}
function playToggle(){
 if(active){stop();status("Simulation pausiert.");return;}
 if(state.time>=state.config.minutes)restart();
 active=true;last=0;elapsed=0;label("start","Ⅱ Pausieren");raf=requestAnimationFrame(play);
 status("Simulation läuft: ein Berechnungsschritt entspricht einer Modellminute.");
}
function surface(c){
 const width=Math.max(260,Math.round(c.getBoundingClientRect().width));
 const ratio=Math.max(1,Math.min(2,window.devicePixelRatio||1));
 const height=c.id==="terrain"?Math.round(width*E.H/E.W):Math.max(180,Math.round(width*.28));
 const wp=Math.round(width*ratio),hp=Math.round(height*ratio);
 if(c.width!==wp||c.height!==hp){c.width=wp;c.height=hp;}
 const ctx=c.getContext("2d");ctx.setTransform(ratio,0,0,ratio,0,0);
 return {ctx,w:width,h:height};
}
function drawMap(){
 const {ctx,w,h}=surface($("terrain")),dx=w/E.W,dy=h/E.H;
 const water=state.water,retained=state.retained;
 ctx.clearRect(0,0,w,h);
 const intervention=new Map(actions.map(a=>[a.y*E.W+a.x,a.type]));
 const showStorage=state.config.storage>0;
 for(let i=0;i<E.N;i++){
  const c=state.cells[i],x=c.x*dx,y=c.y*dy;
  const color=c.channel?"#3b85ab":c.kind==="road"?"#879fa7":c.kind==="building"?"#c18f76":c.kind==="field"?"#778d55":"#348f78";
  ctx.fillStyle=color;ctx.fillRect(x+.1,y+.1,dx-.2,dy-.2);
  if(c.kind==="building"){ctx.fillStyle="#412e3570";ctx.fillRect(x+dx*.16,y+dy*.16,dx*.67,dy*.67);}
  if(c.channel){ctx.fillStyle="#c2eaff8a";ctx.fillRect(x+dx*.30,y,dx*.36,dy);}
  const depth=water[i];
  if(depth>0.15){
   const a=Math.min(.92,.18+Math.log1p(depth)*.17);
   ctx.fillStyle="rgba(13,91,238,"+a+")";ctx.fillRect(x+.1,y+.1,dx-.2,dy-.2);
  }
  const interventionType=intervention.get(i);
  if(interventionType){
   ctx.fillStyle=interventionType==="basin"?"#f2cc69":interventionType==="garden"?"#dbf2a0":"#afffe6";
   ctx.fillRect(x+dx*.19,y+dy*.19,dx*.62,dy*.62);
   ctx.strokeStyle="#103838";ctx.lineWidth=.7;ctx.strokeRect(x+dx*.19,y+dy*.19,dx*.62,dy*.62);
  }else if(c.site&&showStorage&&c.kind!=="water"){
   ctx.strokeStyle="#f9dd9d";ctx.lineWidth=1.5;ctx.strokeRect(x+1,y+1,Math.max(.4,dx-2),Math.max(.4,dy-2));
  }
  if(retained[i]>.01&&c.site){ctx.fillStyle="#3b6cb7";ctx.fillRect(x+dx*.4,y+dy*.4,dx*.2,dy*.2);}
 }
 // Display precise OSM waterway line geometries as cartographic overlays. The simulated
 // flow still uses the coarse 20-m cells and is not a 1D/2D hydraulic stream model.
 if(geosource.waterways&&geosource.waterways.length){
   const ox=E.W*E.SIZE/2,oy=E.H*E.SIZE/2;
   for(const waterway of geosource.waterways){
     const geom=waterway.geometry||[];
     if(geom.length<2)continue;
     ctx.beginPath();
     ctx.lineWidth=waterway.isBruchgraben?Math.max(2,w/400):Math.max(1.5,w/550);
     ctx.strokeStyle=waterway.isBruchgraben?"#c6f9ff":"#8dd1ff";
     for(let k=0;k<geom.length;k++){
       const p=G.localPoint(geom[k][0],geom[k][1],E.ORIGIN);
       const x=(p.x+ox)/E.W/E.SIZE*w,y=(p.y+oy)/E.H/E.SIZE*h;
       if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
     }
     ctx.stroke();
   }
 }
 // A minimal metric grid, not cadastral boundaries.
 ctx.strokeStyle="#ffffff0f";ctx.lineWidth=.5;
 for(let x=0;x<=E.W;x+=10){ctx.beginPath();ctx.moveTo(x*dx,0);ctx.lineTo(x*dx,h);ctx.stroke();}
 for(let y=0;y<=E.H;y+=10){ctx.beginPath();ctx.moveTo(0,y*dy);ctx.lineTo(w,y*dy);ctx.stroke();}
}
function graph(){
 const {ctx,w,h}=surface($("hydrograph"));
 const lines=[state.history,results?.A.state.history,results?.B.state.history].filter(Boolean);
 const top=Math.max(1,...lines.flatMap(l=>l.map(p=>p.outflow)));
 const pad={l:47,r:13,t:18,b:31},ww=w-pad.l-pad.r,hh=h-pad.t-pad.b;
 ctx.clearRect(0,0,w,h);ctx.fillStyle="#0c2937";ctx.fillRect(0,0,w,h);
 ctx.strokeStyle="#ffffff2a";ctx.lineWidth=1;ctx.font="11px system-ui";ctx.textAlign="right";ctx.fillStyle="#aec7d1";
 for(let i=0;i<=4;i++){
  const y=pad.t+hh*(1-i/4);
  ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();
  ctx.fillText(digits(top*i/4,0),pad.l-8,y+4);
 }
 ctx.textAlign="center";
 for(let m=0;m<=E.MINUTES;m+=30)ctx.fillText(String(m),pad.l+m/E.MINUTES*ww,h-11);
 const plot=(line,color)=>{
  if(line.length<2)return;ctx.strokeStyle=color;ctx.lineWidth=2.2;ctx.beginPath();
  line.forEach((d,i)=>{const x=pad.l+d.minute/E.MINUTES*ww,y=pad.t+hh*(1-d.outflow/top);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.stroke();
 };
 if(results){plot(results.A.state.history,"#ffca84");plot(results.B.state.history,"#7ff6d3");}
 plot(state.history,"#ffffff");
}
function render(){
 if(!state)return;
 drawMap();graph();
 const m=E.metrics(state);
 const entries={metricRain:m.rain,metricSoil:m.soil,metricRetained:m.retained,
  metricDrain:m.drains,metricExit:m.outflow,metricSurface:m.surface};
 for(const [id,value] of Object.entries(entries))label(id,digits(value,0));
 label("clock","Minute "+state.time+" / "+state.config.minutes);
 label("balance","Bilanzfehler: "+digits(m.error,7)+" m³ · Modellintern nasse Rasterzellen ≥ 20 mm: "+
   m.wetCells+" / "+E.N+". Wasserbilanz: Regen = Versickerung + Rückhalt + Modell-Kanalabfluss + Randabfluss + Oberflächenwasser.");
}
function editMap(e){
 const r=$("terrain").getBoundingClientRect();
 if(!r.width||!r.height)return;
 const x=Math.min(E.W-1,Math.max(0,Math.floor((e.clientX-r.left)/r.width*E.W)));
 const y=Math.min(E.H-1,Math.max(0,Math.floor((e.clientY-r.top)/r.height*E.H)));
 const kind=geo[y*E.W+x].kind;
 if(kind==="water"&&tool!=="erase"){label("actionStatus","In einer Gewässerzelle keine künstliche Maßnahme möglich. Eine Fläche daneben wählen.");return;}
 const idx=actions.findIndex(a=>a.x===x&&a.y===y);
 if(tool==="erase"){if(idx>=0)actions.splice(idx,1);}
 else if(idx>=0&&actions[idx].type===tool)actions.splice(idx,1);
 else if(idx>=0)actions[idx].type=tool;
 else actions.push({x,y,type:tool});
 refreshActions();clearResults();restart();store();
}
function updateResults(){
 if(!results)return;
 for(const [letter,key] of [["a","A"],["b","B"]]){
  const m=results[key].metrics;
  for(const [col,val] of Object.entries({Flow:m.drains+m.outflow,Soil:m.soil,Storage:m.retained,Peak:m.peak,Wet:m.wetCells})){
   label(letter+col,digits(val,col==="Peak"?1:0));
  }
 }
 const d=(results.A.metrics.drains+results.A.metrics.outflow)-(results.B.metrics.drains+results.B.metrics.outflow);
 const pct=results.A.metrics.drains+results.A.metrics.outflow;
 label("insight","B hat bei gleichem Regen "+digits(Math.abs(d),0)+" m³ "+
   (d>=0?"weniger":"mehr")+" modellierten Gesamtabfluss als A ("+
   digits(pct?100*Math.abs(d)/pct:0,1)+" %). Nicht mit realer Wirkung verwechseln.");
}
function clearResults(){
 results=null;
 for(const p of ["aFlow","bFlow","aSoil","bSoil","aStorage","bStorage","aPeak","bPeak","aWet","bWet"])label(p,"–");
 label("insight","Vergleich ist noch nicht berechnet. Zwei Varianten abspeichern und A/B starten.");
}
function store(){
 try{localStorage.setItem(STORAGE,JSON.stringify({version:1,preset:selected,config:config(),actions,geo,geosource,slotA,slotB}));}
 catch(e){warning="Browser-Speicher nicht verfügbar; JSON-Export nutzen.";}
}
function read(){
 try{
  const v=JSON.parse(localStorage.getItem(STORAGE)||"null");
  if(!v||v.version!==1)return;
  const cfg=E.normalize(v.config),candidate=E.create({...cfg,cells:v.geo,actions:v.actions});
  selected=cfg.preset;
  for(const n of params)$(n).value=cfg[n];
  actions=candidate.actions;geo=candidate.cells;
  if(v.geosource&&["schematic","osm","osm+dem","schematic+dem"].includes(v.geosource.type))geosource=v.geosource;
  if(v.slotA)slotA=validatedSlot(v.slotA);
  if(v.slotB)slotB=validatedSlot(v.slotB);
 }catch(e){warning="Gespeicherte Daten ungültig; Standardmodell geladen.";geo=E.BASE.map(c=>({...c}));actions=[];}
}
function validatedSlot(d){
 const cfg=E.normalize(d);
 return {...cfg,actions:E.validateActions(d.actions)};
}
function summarySource(){
 const data=geosource;
 label("mapKind",data.type==="schematic"?"SCHEMATISCHES GELÄNDE":data.type==="schematic+dem"?"SCHEMATISCH + IMPORTIERTE HÖHEN":data.type==="osm+dem"?"OSM + IMPORTIERTE HÖHEN":"OSM-KLASSEN · HÖHEN SCHEMATISCH");
 let txt="Höfen · Koordinate: "+E.ORIGIN.lat.toFixed(5)+" N, "+E.ORIGIN.lon.toFixed(5)+" O. ";
 if(data.type==="schematic")txt+="Straßen, Flächen, Gewässerlauf und Höhen hypothetisch.";
 else txt+=(data.type.startsWith("osm")?"OSM-Abfrage "+data.date+". ":"Landnutzung schematisch. ")+
   (data.hasDgm?"Höhenraster importiert; Herkunft manuell prüfen.":"Geländehöhen künstlich.");
 info(txt);
 if(!data.waterways||!data.waterways.length){
   label("waterwayStatus","Bruchgraben-Verlauf nicht kartiert oder nicht bestätigt. Ein blauer schematischer Graben ist keine reale Gewässergeometrie.");
 }else{
   const br=data.waterways.filter(w=>w.isBruchgraben);
   const names=[...new Set(data.waterways.map(w=>w.name).filter(Boolean))].slice(0,5);
   label("waterwayStatus",br.length
     ?"✓ OSM: "+br.length+" namentlich als „Bruchgraben“ markierte Gewässerabschnitte geladen – Linienführung kartiert (nicht hydraulisch kalibriert)."
     :"OSM: "+data.waterways.length+" Wasserwegabschnitte geladen"+(names.length?" ("+names.join(", ")+")":" (ohne Namen)")+
      ". Keiner ist als „Bruchgraben“ bestätigt. Keine automatische Namenszuordnung.");
 }
}
function applyTerrain(next,source){
 const valid=E.create({...config(),cells:next,actions});
 geo=valid.cells;geosource=source;clearResults();restart();summarySource();store();
}
async function osmf(){
 const btn=$("getOsm");btn.disabled=true;info("OpenStreetMap/Overpass wird abgefragt …");
 try{
  const query=G.query(E.ORIGIN,E.W*E.SIZE,E.H*E.SIZE);
  let data=null,error=null;
  for(const url of ["https://overpass.kumi.systems/api/interpreter","https://overpass-api.de/api/interpreter"]){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),22000);
   try{
    const r=await fetch(url+"?data="+encodeURIComponent(query),{signal:controller.signal});
    if(!r.ok)throw Error("HTTP "+r.status);
    data=await r.json();break;
   }catch(e){error=e;}finally{clearTimeout(timer);}
  }
  if(!data)throw error||Error("OSM antwortet nicht");
  const raster=G.rasterizeOSM(data,E.ORIGIN,E.BASE,E.W,E.H,E.SIZE);
  // Incomplete waterway mapping must not silently erase the visible schematic stream.
  const waterCells=raster.cells.filter(c=>c.kind==="water").length;
  const useSketch=waterCells===0;
  const model=raster.cells.map((cell,i)=>({...cell,
   elevation:E.BASE[i].elevation,
   channel:useSketch?E.BASE[i].channel:cell.kind==="water",
   site:!cell.channel&&E.BASE[i].site,
   origin:"OSM-geometry/artificial-height"
  }));
  // If the schematic waterway is preserved, identify it explicitly as fictional.
  if(useSketch)for(let i=0;i<model.length;i++)if(model[i].channel)model[i].kind="water";
  const waterWays=data.elements.filter(e=>e.type==="way"&&e.tags?.waterway&&Array.isArray(e.geometry)&&e.geometry.length>=2);
  const waterways=waterWays.slice(0,90).map(e=>({
   id:e.id||null,name:typeof e.tags.name==="string"?e.tags.name.slice(0,95):"",
   isBruchgraben:/\bBruchgraben\b/i.test(e.tags.name||""),
   geometry:e.geometry.slice(0,800).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)).map(p=>[p.lat,p.lon])
  }));
  const m={type:"osm",date:new Date().toISOString().slice(0,10),hasDgm:false,source:"© OpenStreetMap-Mitwirkende (ODbL)",
   features:raster.featureCount,waterCells,streamSketch:useSketch,
   waterways,waterwayNames:waterways.map(w=>w.name).filter(Boolean)};
  applyTerrain(model,m);
  info("OSM geladen: "+m.features+" Objekte; "+waterCells+" Gewässerzellen. "+
    (useSketch?"Gewässerlauf weiterhin künstlich. ":"Gewässerzellen OSM-kartiert. ")+
    "Höhen, Boden, Kanal und Retention weiter modellhaft.");
  status("Geometrie aus OSM eingespielt. A/B-Szenarien bleiben mit identischem Kartenstand vergleichbar.");
 }catch(e){
  info("OSM-Abruf fehlgeschlagen: "+String(e.message||e).slice(0,110)+". Bisherige Kartenbasis bleibt unverändert.");
 }finally{btn.disabled=false;}
}
async function importDEM(file){
 if(!file)return;
 const btn=$("demInput");btn.disabled=true;
 try{
  const native=/\\.(xyz|txt)$/i.test(file.name);
  if(!native&&file.size>30*1024*1024)throw Error("ASCII-Raster größer als 30 MB. Ausschnitt zuschneiden.");
  info("DGM1-Höhendaten werden in 2.400 Modellzellen übernommen …");
  const result=native
   ?await V.readFile(file,{origin:E.ORIGIN,W:E.W,H:E.H,size:E.SIZE,base:geo,toUTM32:G.toUTM32},
     (fraction,stats)=>{if(Math.round(fraction*100)%20===0)info("DGM1-Einlesen "+Math.round(fraction*100)+" % · "+stats.matchingPoints+" Rasterzellen belegt …");})
   :G.parseASC(await file.text(),E.ORIGIN,geo,E.W,E.H,E.SIZE);
  const fromXYZ=native;
  const m={...geosource,type:geosource.type.startsWith("osm")?"osm+dem":"schematic+dem",
   hasDgm:true,demFilename:file.name,
   demMin:fromXYZ?result.stats.min:result.min,
   demMax:fromXYZ?result.stats.max:result.max,
   demResolution:fromXYZ?"Original XYZ-Punktabstand (nicht geprüft)":result.spacing,
   demFormat:fromXYZ?"LGL-XYZ":"ESRI ASCII",
   demCrs:"EPSG:25832 (vom Nutzer zu prüfen)",
   demCoverage:"2.400 von 2.400 Modellzellen belegt",
   date:new Date().toISOString().slice(0,10)};
  applyTerrain(result.cells,m);
  info("✓ Höhen importiert: "+file.name+" · "+digits(m.demMin,2)+"–"+digits(m.demMax,2)+
    " m; "+m.demCoverage+". Projektion EPSG:25832 und Datenherkunft müssen bestätigt werden.");
  status("Alle 2.400 Modellzellen besitzen übernommene Höhenwerte. Wasserfluss ist weiter ein Grobmodell.");
 }catch(e){info("Höhenimport nicht durchgeführt: "+String(e.message||e).slice(0,190));}
 finally{btn.disabled=false;}
}
function exportScenario(){
 const obj={format:"DMP-Hoefen-Runoff-v1",savedAt:new Date().toISOString(),
  place:"Höfen (Schutterwald)",notice:"Entwicklungsversion, KEINE Starkregengefahrenkarte",
  config:config(),preset:selected,actions,geo,geosource,slotA,slotB};
 const blob=new Blob([JSON.stringify(obj)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="hoefen-bruchgraben-modell.json";document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1800);
 status("Reproduzierbare Versuchsdatei exportiert.");
}
async function importScenario(file){
 if(!file)return;
 if(file.size>2*1024*1024){status("JSON größer als 2 MB.");return;}
 try{
  const obj=JSON.parse(await file.text());
  if(!obj||obj.format!=="DMP-Hoefen-Runoff-v1"||obj.place!=="Höfen (Schutterwald)")throw Error("Ungültiges Format");
  const cfg=E.normalize(obj.config),validated=E.create({...cfg,cells:obj.geo,actions:obj.actions});
  if(!Array.isArray(obj.geo)||obj.geo.length!==E.N)throw Error("Raster fehlt");
  if(!obj.geosource||!["schematic","osm","osm+dem","schematic+dem"].includes(obj.geosource.type))throw Error("Quellstatus fehlt");
  selected=cfg.preset;for(const p of params)$(p).value=cfg[p];
  geo=validated.cells;actions=validated.actions;geosource=obj.geosource;
  slotA=validatedSlot(obj.slotA);slotB=validatedSlot(obj.slotB);
  reflectInputs();refreshPresets();refreshActions();clearResults();restart();summarySource();store();
  status("A/B, Geländemodell, Eingriffe und Parameter erfolgreich geladen.");
 }catch(e){status("JSON-Import abgewiesen: "+String(e.message||e));}
}
document.querySelectorAll("[data-preset]").forEach(btn=>btn.addEventListener("click",()=>{setPreset(btn.dataset.preset);clearResults();store();}));
document.querySelectorAll("[data-tool]").forEach(btn=>btn.addEventListener("click",()=>{tool=btn.dataset.tool;refreshTools();}));
$("eraseTool").addEventListener("click",()=>{tool="erase";refreshTools();});
$("clearActions").addEventListener("click",()=>{actions=[];refreshActions();restart();clearResults();store();});
$("terrain").addEventListener("click",editMap);
for(const p of params)$(p).addEventListener("input",()=>{reflectInputs();clearResults();restart();store();});
$("speed").addEventListener("input",reflectInputs);
$("start").addEventListener("click",playToggle);
$("step").addEventListener("click",()=>{stop();step();});
$("reset").addEventListener("click",()=>{restart();status("Versuch neu gestartet.");});
$("getOsm").addEventListener("click",osmf);
$("restoreMap").addEventListener("click",()=>{applyTerrain(E.BASE.map(c=>({...c})),{type:"schematic",hasDgm:false,date:null});status("Schematische Standardlandschaft wiederhergestellt.");});
$("demInput").addEventListener("change",e=>{importDEM(e.target.files[0]);e.target.value="";});
$("saveA").addEventListener("click",()=>{slotA=scenario();store();status("Variante A gesichert: "+actions.length+" Eingriffe. Aktueller Regen wird beim A/B-Vergleich geteilt.");});
$("saveB").addEventListener("click",()=>{slotB=scenario();store();status("Variante B gesichert: "+actions.length+" Eingriffe. Aktueller Regen wird beim A/B-Vergleich geteilt.");});
$("runAB").addEventListener("click",()=>{
 stop();const c=config();
 results=E.compare({...slotA,cells:geo},{...slotB,cells:geo},{rain:c.rain,duration:c.duration,minutes:E.MINUTES});
 updateResults();render();
 status("Zwei Varianten mit identischem Regen und demselben aktuellen Gelände verglichen.");
});
$("export").addEventListener("click",exportScenario);
$("import").addEventListener("change",e=>{importScenario(e.target.files[0]);e.target.value="";});
let resizeTimer;window.addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(render,100);});
document.addEventListener("visibilitychange",()=>{if(document.hidden){stop();status("Im Hintergrund automatisch pausiert.");}});
read();reflectInputs();refreshPresets();refreshTools();refreshActions();clearResults();restart();summarySource();
if(warning)status(warning);
window.HoefenApp=Object.freeze({getState:()=>state,getTerrain:()=>geo,getSource:()=>geosource,runAB:()=>E.compare({...slotA,cells:geo},{...slotB,cells:geo},config())});
})();
