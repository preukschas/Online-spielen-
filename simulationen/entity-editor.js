import {ENTITY_KEY,ENTITY_LIMIT,ENTITY_FIELDS,ENTITY_APPEARANCES,COMBAT_KEYS,newEntity,validateEntity,toBiomechanics,toArena,safeEntityList,findEntity} from "./entity-model.js";
import {ENTITY_CATALOG,catalogEntity,installCatalog} from "./entity-catalog.js";
import {drawCharacter,characterThumbnail} from "./entity-art.js";
import {duelDefaultGenome} from "./duel-core.js";
const $=id=>document.getElementById(id),NS="http://www.w3.org/2000/svg";
let draft,selected=null,playing=false,phase=0,last=0;
const names={mass:"Masse",amplitude:"Schrittweite",frequency:"Schrittfrequenz",feedback:"Balance-Regler",traction:"Bodenhaftung",endurance:"Ausdauer",torso:"Rumpfgröße",limb:"Beinlänge",head:"Kopfgröße"};
function id(){return typeof crypto!=="undefined"&&crypto.randomUUID?"e_"+crypto.randomUUID().replaceAll("-",""):"e_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,12);}
function notice(s,err=false){$("message").textContent=s;$("message").style.color=err?"#ffaaaa":"#9df1d1";}
function library(){return safeEntityList(localStorage);}
function write(data){try{localStorage.setItem(ENTITY_KEY,JSON.stringify(data));return true;}catch{notice("Browser-Speicher nicht verfügbar. Exportiere deine Entität als JSON.",true);return false;}}
function valueText(k){return draft[k].toLocaleString("de-DE",{maximumFractionDigits:2})+(ENTITY_FIELDS[k][4]?" "+ENTITY_FIELDS[k][4]:"");}
function newDraft(type="human"){setDraft(newEntity(type,id()),false);$("template").value=type;notice("Neuer Entwurf: zum dauerhaften Speichern auf „Entität speichern“ klicken.");}
function setDraft(e,saved=false){draft={...e,appearance:e.appearance||"generic"};selected=saved?draft.id:null;sync();showSaved();selectCard();}
function selectCard(){
 document.querySelectorAll(".catalog-card").forEach(card=>card.setAttribute("aria-pressed",String(draft.id==="catalog-"+card.dataset.key)));
 const item=ENTITY_CATALOG.find(i=>i.key===draft.id.replace(/^catalog-/,""));
 if(item)showCatalogFact(item);
}
const skillNames={aggression:"Angriffsdrang",guard:"Deckung",jump:"Sprungbereitschaft",
 punch:"Schlagen",kick:"Treten",push:"Schubsen / Nahdistanz",range:"Kampfdistanz",
 stride:"Schrittweite",cadence:"Schritttakt",footwork:"Fußarbeit",evade:"Ausweichen",
 spring:"Sprungimpuls",balance:"Balance",recovery:"Erholung"};
function combatSliders(){
 const target=$("combatFields");target.replaceChildren();
 for(const key of COMBAT_KEYS){
  const block=document.createElement("div");block.className="range";
  const label=document.createElement("label");label.htmlFor="c_"+key;label.textContent=skillNames[key]||key;
  const out=document.createElement("output");out.id="combat_"+key;label.append(out);
  const input=document.createElement("input");input.type="range";input.min="0";input.max="100";input.step="1";input.id="c_"+key;
  input.addEventListener("input",()=>{if(!draft.combat)return;draft.combat[key]=Number(input.value)/100;out.textContent=input.value+" %";showCombatSummary();});
  block.append(label,input);target.append(block);
 }
}
function showCombatSummary(){
 const summary=$("combatSummary");if(!draft.combat){summary.textContent="";return;}
 const top=COMBAT_KEYS.map(k=>[skillNames[k],draft.combat[k]]).sort((a,b)=>b[1]-a[1]).slice(0,4);
 summary.textContent="Profil-Schwerpunkte: "+top.map(([k,v])=>k+" "+Math.round(v*100)+" %").join(" · ")+". Lernrunden dürfen diese Gene später verändern.";
}
function syncCombat(){
 const active=!!draft.combat;
 $("combatArea").hidden=!active;$("enableCombat").hidden=active;
 $("fighterStyleSelect").value=draft.fighterStyle||"";
 if(!active)return;
 for(const key of COMBAT_KEYS){
  const v=Math.round((draft.combat[key]??.5)*100);
  $("c_"+key).value=String(v);$("combat_"+key).textContent=v+" %";
 }
 showCombatSummary();
}
function showCatalogFact(item){
 const box=$("catalogFact");box.replaceChildren();
 const caption=document.createElement("strong");caption.textContent=item.emoji+" "+item.name+" · "+item.type+". ";
 box.append(caption,document.createTextNode(item.fact+" "+(item.talent?"Bewegungs-/Kampfstil: "+item.talent+". ":"")));
 if(item.source){
  const link=document.createElement("a");link.href=item.source;link.target="_blank";link.rel="noopener noreferrer";link.textContent="Recherchequelle ↗";box.append(link);
 }else{
  const label=document.createElement("span");label.className="catalog-label";label.textContent=" Konstruktions-/Spielannahme";box.append(label);
 }
}
function renderCatalog(){
 const grid=$("catalogGrid");grid.replaceChildren();
 for(const item of ENTITY_CATALOG){
  const example=catalogEntity(item),button=document.createElement("button");
  button.className="catalog-card";button.type="button";button.dataset.key=item.key;button.setAttribute("aria-pressed","false");
  button.setAttribute("aria-label",item.name+" als Figur laden");
  button.append(characterThumbnail(example));
  const title=document.createElement("strong");title.textContent=item.emoji+" "+item.name;
  const desc=document.createElement("small");desc.textContent=item.mass.toLocaleString("de-DE")+" kg · "+(item.kind==="biped"?"2 Beine":"4 Beine");
  button.append(title,desc);
  if(item.talent){const detail=document.createElement("small");detail.className="skill-tag";detail.textContent=item.talent;button.append(detail);}
  button.hidden=$("catalogFilter").value==="fighters"?!item.fighterStyle:$("catalogFilter").value==="other"?!!item.fighterStyle:false;
  button.addEventListener("click",()=>{
   const existing=findEntity(localStorage,example.id);
   setDraft(existing||example,!!existing);
   showCatalogFact(item);
   notice("„"+item.name+"“ geladen. Alle Modellwerte und die Grafik kannst du anpassen.");
  });
  grid.append(button);
 }
}
function sync(){
 $("name").value=draft.name;$("kind").value=draft.kind;$("color").value=draft.color;
 $("template").value=draft.appearance==="robot"||draft.appearance==="robotdog"?"robot":draft.kind==="quadruped"||draft.appearance==="ostrich"?"animal":"human";
 $("appearance").value=draft.appearance||"generic";
 $("r_mass").min=draft.kind==="biped"?30:3;
 $("r_mass").max=draft.mass>120?650:120;
 Object.keys(ENTITY_FIELDS).forEach(k=>{$("r_"+k).value=draft[k];$("v_"+k).textContent=valueText(k);});
 $("massNumber").value=String(draft.mass);
 syncCombat();draw();
}
function sliders(){
 Object.entries(ENTITY_FIELDS).forEach(([k,v])=>{
  const block=document.createElement("div");block.className="range";
  const lab=document.createElement("label");lab.htmlFor="r_"+k;lab.textContent=names[k];
  const output=document.createElement("output");output.id="v_"+k;lab.append(output);
  const control=document.createElement("input");control.type="range";control.id="r_"+k;control.min=v[1];control.max=v[2];control.step=v[3];
  control.addEventListener("input",()=>{
   draft[k]=Number(control.value);output.textContent=valueText(k);
   if(k==="mass")$("massNumber").value=String(draft.mass);
   draw();
  });
  if(k==="mass"){
   const row=document.createElement("div");row.className="mass-inline";row.append(control);
   const number=document.createElement("input");number.type="number";number.id="massNumber";
   number.setAttribute("aria-label","Masse in Kilogramm");number.min="3";number.max="650";number.step=".5";
   number.addEventListener("change",()=>{
     const n=Number(number.value),min=draft.kind==="biped"?30:3;
     if(!Number.isFinite(n)||n<min||n>650){notice("Masse muss zwischen "+min+" und 650 kg liegen.",true);sync();return;}
     draft.mass=n;sync();
   });
   row.append(number);block.append(lab,row);
  }else block.append(lab,control);
  $(["torso","limb","head"].includes(k)?"visualFields":"modelFields").append(block);
 });
}
function showSaved(){
 const entries=library(),box=$("saved");box.replaceChildren();
 const placeholder=new Option(entries.length?"– Entität auswählen –":"Noch keine Entitäten gespeichert","");box.append(placeholder);
 entries.forEach(e=>box.append(new Option(e.name+" · "+(e.kind==="biped"?"2 Beine":"4 Beine"),e.id)));
 box.value=selected&&entries.some(e=>e.id===selected)?selected:"";
 $("savedHint").textContent=entries.length+" / "+ENTITY_LIMIT+" Entitäten · nur lokal im Browser · JSON-Export als Backup.";
}
function store(){
 draft.name=$("name").value.trim();
 const valid=validateEntity(draft);
 if(!valid){notice("Bitte einen gültigen Namen (1–24 Zeichen) und erlaubte Werte eingeben.",true);return false;}
 const entries=library(),index=entries.findIndex(e=>e.id===valid.id);
 if(index<0){if(entries.length>=ENTITY_LIMIT){notice("40 Speicherplätze belegt. Bitte eine Entität löschen.",true);return false;}entries.unshift(valid);}
 else entries[index]=valid;
 if(!write(entries))return false;
 draft=valid;selected=valid.id;showSaved();return true;
}
function svg(tag,attrs={},focus=""){
 const e=document.createElementNS(NS,tag);
 Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));
 if(focus){e.dataset.focus=focus;e.style.cursor="pointer";}
 $("bodyDrawing").append(e);return e;
}
function tone(hex,delta){
 const src=/^#[0-9a-f]{6}$/i.test(hex)?hex:"#65e4b9";
 return "#"+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(src.slice(i,i+2),16)+delta)).toString(16).padStart(2,"0")).join("");
}
function limb(x1,y1,x2,y2,c,w=11){
 const dark=svg("line",{x1,y1,x2,y2,stroke:tone(c,-65),"stroke-width":w+6,"stroke-linecap":"round"});dark.setAttribute("pointer-events","none");
 svg("line",{x1,y1,x2,y2,stroke:c,"stroke-width":w,"stroke-linecap":"round"},"limb");
 const sx=x1+(x2-x1)*.07,sy=y1+(y2-y1)*.07,ex=x1+(x2-x1)*.80,ey=y1+(y2-y1)*.80;
 const highlight=svg("line",{x1:sx,y1:sy,x2:ex,y2:ey,stroke:"#ffffff66","stroke-width":Math.max(2,w*.18),"stroke-linecap":"round"});
 highlight.setAttribute("pointer-events","none");
}
function ball(x,y,r,c,focus=""){
 const under=svg("circle",{cx:x,cy:y+3,r:r+3,fill:"#081f2c",opacity:.5});under.setAttribute("pointer-events","none");
 svg("circle",{cx:x,cy:y,r,fill:c,stroke:tone(c,68),"stroke-width":2.5},focus);
 const light=svg("ellipse",{cx:x-r*.24,cy:y-r*.35,rx:r*.38,ry:r*.18,fill:"#ffffff65"});
 light.setAttribute("pointer-events","none");
}
function rect(x,y,w,h,c,r=12,focus=""){
 const under=svg("rect",{x:x+2,y:y+4,width:w,height:h,rx:r,fill:"#061826",opacity:.45});under.setAttribute("pointer-events","none");
 svg("rect",{x,y,width:w,height:h,rx:r,fill:c,stroke:tone(c,63),"stroke-width":2.4},focus);
 const light=svg("rect",{x:x+5,y:y+4,width:Math.max(1,w-10),height:Math.min(5,h*.24),rx:2,fill:"#ffffff5b"});
 light.setAttribute("pointer-events","none");
}
function joint(x,y){
 const a=svg("circle",{cx:x,cy:y,r:8,fill:"#0b293b",stroke:"#d8fff4","stroke-width":2},"limb");
 const b=svg("circle",{cx:x,cy:y,r:3,fill:"#f8d389"});b.setAttribute("pointer-events","none");
}

function draw(){
 $("bodyDrawing").replaceChildren();
 const e=validateEntity(draft),stats=e?toArena(e):null;
 $("massStat").textContent=draft.mass+" kg";
 $("speedStat").textContent=stats?stats.speed.toFixed(2)+" m/s":"–";
 $("staminaStat").textContent=Math.round(draft.endurance*100)+" %";
 $("bodyPreview").setAttribute("aria-label",(draft.name||"Entität")+", "+(draft.kind==="biped"?"Zweibeiner":"Vierbeiner")+", schematische Vorschau");
 const c=draft.color,move=playing?Math.sin(phase):0;
 if(!drawCharacter($("bodyDrawing"),draft,move)){
 if(draft.kind==="biped"){
  const x=280,hip=277,top=hip-100*draft.torso,a=46*draft.limb,b=52*draft.limb;
  [-1,1].forEach((side,i)=>{
   const hx=x+side*16,ky=hip+a*.92,kx=hx+side*move*30,fx=kx-side*move*15,fy=Math.min(410,ky+b);
   limb(hx,hip,kx,ky,i?"#f4c77c":c,13);limb(kx,ky,fx,fy,i?"#f4c77c":c,11);joint(hx,hip);joint(kx,ky);limb(fx-13,fy,fx+15,fy,"#eff7ee",5);
  });
  limb(x,hip,x,top,c,26*draft.torso);rect(x-15*draft.torso,top-5,30*draft.torso,26*draft.torso,c,7,"torso");
  for(const side of [-1,1]){limb(x+side*12,top+24,x+side*(35+move*9),top+78*draft.limb,c,10);}
  ball(x,top-27*draft.head,22*draft.head,c,"head");
  ball(x+7*draft.head,top-30*draft.head,3,"#123143");
 }else{
  const x=277,y=249,w=172*draft.torso,h=43*draft.torso,start=x-w/2,anchors=[start+16,start+55,start+w-55,start+w-16];
  anchors.forEach((hx,i)=>{
   const sway=(i%2?1:-1)*move*13,ky=y+50*draft.limb,fy=Math.min(410,ky+67*draft.limb),kx=hx+sway;
   limb(hx,y+12,kx,ky,i%2?"#eabf7e":c,12);limb(kx,ky,kx+sway*.2,fy,i%2?"#eabf7e":c,9);joint(hx,y+12);joint(kx,ky);
  });
  rect(start,y-h/2,w,h,c,h*.3,"torso");
  limb(start+w-5,y-5,start+w+36,y-40,c,21);
  ball(start+w+54,y-53,21*draft.head,c,"head");
  ball(start+w+60,y-57,3,"#123143");
 }
 }
 const label=svg("text",{x:25,y:37,fill:"#98dfc5","font-size":15,"font-family":"system-ui"});
 label.textContent=(draft.kind==="biped"?"ZWEIBEINER":"VIERBEINER")+" · "+draft.name.slice(0,24).toUpperCase();

 // Blueprint annotations are visual aids, not additional physics calculations.
 const centerX=draft.kind==="biped"?280:277;
 const centerY=draft.kind==="biped"?272:249;
 const ring=svg("circle",{cx:centerX,cy:centerY,r:24,fill:"none",stroke:"#f2c77e",opacity:.78,"stroke-width":1.3,"stroke-dasharray":"4 5"});
 ring.setAttribute("pointer-events","none");
 const point=svg("circle",{cx:centerX,cy:centerY,r:4.5,fill:"#ffd993",stroke:"#112d38","stroke-width":1.5});
 point.setAttribute("pointer-events","none");
 const leader=svg("path",{d:"M"+(centerX+25)+" "+centerY+" L410 "+(centerY-38)+" H488",fill:"none",stroke:"#9bd5d1",opacity:.7,"stroke-width":1.6});
 leader.setAttribute("pointer-events","none");
 const massText=svg("text",{x:414,y:centerY-45,fill:"#d5f8e9","font-size":11,"font-family":"system-ui","font-weight":700});massText.textContent="SCHWERPUNKT";
 const detail=svg("text",{x:26,y:60,fill:"#a4cbd2","font-size":11,"font-family":"system-ui"});detail.textContent="SEGMENTE + GELENKE  ·  "+(draft.kind==="biped"?"2 BEINE":"4 BEINE")+"  ·  "+draft.mass+" kg";
 const sub=svg("text",{x:26,y:80,fill:"#7caab9","font-size":10,"font-family":"system-ui"});sub.textContent="SCHEMATISCHE KÖRPERANSICHT  /  KEIN ANATOMISCHES MODELL";

}
function exportJSON(){
 const valid=validateEntity({...draft,name:$("name").value.trim()});
 if(!valid){notice("Bitte erst einen gültigen Namen festlegen.",true);return;}
 const data=new Blob([JSON.stringify(valid,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(data),a=document.createElement("a");a.href=url;
 a.download="dmp-entitaet-"+valid.id.slice(0,22)+".json";a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);notice("JSON-Datei exportiert.");
}
function send(mode,slot){
 if(!store())return;
 if(mode==="bio"&&!toBiomechanics(draft)){notice("Biomechanik-Werte nicht gültig.",true);return;}
 if(mode==="arena"&&!toArena(draft)){notice("Arena-Werte nicht gültig.",true);return;}
 const query=new URLSearchParams({mode,entity:draft.id});
 if(mode==="arena"){query.set("slot",slot);if(draft.combat)query.set("preset","duel");}
 location.assign("./lab.html?"+query.toString());
}
sliders();combatSliders();
$("catalogFilter").addEventListener("change",renderCatalog);
$("enableCombat").addEventListener("click",()=>{
 if(draft.kind!=="biped"){notice("Kampffähigkeiten sind zunächst für Zweibeiner verfügbar.",true);return;}
 draft.combat=duelDefaultGenome();syncCombat();notice("Kampfprofil hinzugefügt – alle vierzehn Eigenschaften sind editierbar.");
});
$("clearCombat").addEventListener("click",()=>{delete draft.combat;delete draft.fighterStyle;sync();notice("Kampfprofil aus dem Entwurf entfernt.");});
$("fighterStyleSelect").addEventListener("change",ev=>{
 if(ev.target.value)draft.fighterStyle=ev.target.value;else delete draft.fighterStyle;
 draft.appearance="human";draft.kind="biped";sync();
});
const preferredGroup=new URLSearchParams(location.search).get("category");
if(["all","fighters","other"].includes(preferredGroup))$("catalogFilter").value=preferredGroup;
renderCatalog();
const seeded=installCatalog(localStorage);
const defaultKey=$("catalogFilter").value==="fighters"?"ali":"cheetah";
const first=findEntity(localStorage,"catalog-"+defaultKey)||catalogEntity(defaultKey);
setDraft(first,!!findEntity(localStorage,"catalog-"+defaultKey));
notice(seeded.ok?(seeded.added+" neue Katalog-Entitäten lokal gespeichert. "+(seeded.skipped?seeded.skipped+" wegen 40er-Grenze nicht gespeichert.":"20 Beispiel-Figuren auswählbar.")):"Browser-Speicher nicht verfügbar; Katalog kann trotzdem geladen werden.",!seeded.ok);
$("name").addEventListener("input",ev=>{draft.name=ev.target.value;draw();});
$("color").addEventListener("input",ev=>{draft.color=ev.target.value;draw();});
$("kind").addEventListener("change",ev=>{
 draft.kind=ev.target.value;
 if(ENTITY_APPEARANCES[draft.appearance]!==draft.kind)draft.appearance="generic";
 if(draft.kind==="biped"&&draft.mass<30)draft.mass=30;
 if(draft.kind!=="biped"){delete draft.combat;delete draft.fighterStyle;}
 sync();
});
$("appearance").addEventListener("change",ev=>{
 draft.appearance=ev.target.value;
 if(draft.appearance!=="human")delete draft.fighterStyle;
 const kind=ENTITY_APPEARANCES[draft.appearance];
 if(kind&&kind!=="neutral")draft.kind=kind;
 if(draft.kind==="biped"&&draft.mass<30)draft.mass=30;
 sync();
});
$("template").addEventListener("change",ev=>newDraft(ev.target.value));
$("save").addEventListener("click",()=>{if(store())notice("Entität gespeichert und bereit für die Simulation.");});
$("new").addEventListener("click",()=>newDraft($("template").value));
$("export").addEventListener("click",exportJSON);
$("import").addEventListener("click",()=>$("importFile").click());
$("importFile").addEventListener("change",async ev=>{
 const file=ev.target.files?.[0];if(!file)return;
 try{
  if(file.size>200000)throw Error("Zu große Datei (maximal 200 KB).");
  const parsed=validateEntity(JSON.parse(await file.text()));
  if(!parsed)throw Error("Dateiformat oder Werte ungültig.");
  setDraft({...parsed,id:id()});if(store())notice("Entität als neuer Eintrag importiert und gespeichert.");
 }catch(err){notice("Import fehlgeschlagen: "+err.message,true);}
 finally{ev.target.value="";}
});
$("load").addEventListener("click",()=>{
 const chosen=findEntity(localStorage,$("saved").value);
 if(!chosen){notice("Bitte eine Entität auswählen.",true);return;}
 setDraft(chosen,true);notice("Entität geladen.");
});
$("delete").addEventListener("click",()=>{
 const chosen=findEntity(localStorage,$("saved").value);
 if(!chosen){notice("Bitte zuerst eine Entität auswählen.",true);return;}
 if(!confirm("„"+chosen.name+"“ wirklich löschen?"))return;
 if(write(library().filter(e=>e.id!==chosen.id))){newDraft();notice("Entität gelöscht.");}
});
$("bio").addEventListener("click",()=>send("bio"));
$("joint").addEventListener("click",()=>{if(store())location.assign("./joint-walker.html?entity="+encodeURIComponent(draft.id));});
$("arenaA").addEventListener("click",()=>send("arena","A"));
$("arenaB").addEventListener("click",()=>send("arena","B"));
$("animate").addEventListener("click",()=>{
 playing=!playing;$("animate").textContent=playing?"❚❚ Vorschau pausieren":"▶ Gang-Vorschau";
 $("animate").setAttribute("aria-pressed",String(playing));$("previewState").textContent=playing?"BEWEGUNGSVORSCHAU":"VORSCHAU";draw();
});
$("resetPose").addEventListener("click",()=>{playing=false;phase=0;$("animate").textContent="▶ Gang-Vorschau";$("animate").setAttribute("aria-pressed","false");$("previewState").textContent="VORSCHAU";draw();});
$("bodyDrawing").addEventListener("click",ev=>{const el=ev.target.closest("[data-focus]");if(el)$("r_"+el.dataset.focus)?.focus();});
function frame(now){if(playing&&now-last>33){phase+=.08;draw();last=now;}requestAnimationFrame(frame);}
requestAnimationFrame(frame);
const requested=new URLSearchParams(location.search).get("id");
if(requested){const e=findEntity(localStorage,requested);if(e){setDraft(e,true);notice("Entität zum Bearbeiten geöffnet.");}else notice("Entität in diesem Browser nicht gefunden.",true);}
