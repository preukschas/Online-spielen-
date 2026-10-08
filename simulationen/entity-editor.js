import {ENTITY_KEY,ENTITY_LIMIT,ENTITY_FIELDS,newEntity,validateEntity,toBiomechanics,toArena,safeEntityList,findEntity} from "./entity-model.js";
const $=id=>document.getElementById(id),NS="http://www.w3.org/2000/svg";
let draft,selected=null,playing=false,phase=0,last=0;
const names={mass:"Masse",amplitude:"Schrittweite",frequency:"Schrittfrequenz",feedback:"Balance-Regler",traction:"Bodenhaftung",endurance:"Ausdauer",torso:"Rumpfgröße",limb:"Beinlänge",head:"Kopfgröße"};
function id(){return typeof crypto!=="undefined"&&crypto.randomUUID?"e_"+crypto.randomUUID().replaceAll("-",""):"e_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,12);}
function notice(s,err=false){$("message").textContent=s;$("message").style.color=err?"#ffaaaa":"#9df1d1";}
function library(){return safeEntityList(localStorage);}
function write(data){try{localStorage.setItem(ENTITY_KEY,JSON.stringify(data));return true;}catch{notice("Browser-Speicher nicht verfügbar. Exportiere deine Entität als JSON.",true);return false;}}
function valueText(k){return draft[k].toLocaleString("de-DE",{maximumFractionDigits:2})+(ENTITY_FIELDS[k][4]?" "+ENTITY_FIELDS[k][4]:"");}
function newDraft(type="human"){setDraft(newEntity(type,id()),false);$("template").value=type;notice("Neuer Entwurf: zum dauerhaften Speichern auf „Entität speichern“ klicken.");}
function setDraft(e,saved=false){draft={...e};selected=saved?draft.id:null;sync();showSaved();}
function sync(){
 $("name").value=draft.name;$("kind").value=draft.kind;$("color").value=draft.color;
 Object.keys(ENTITY_FIELDS).forEach(k=>{$("r_"+k).value=draft[k];$("v_"+k).textContent=valueText(k);});
 $("r_mass").min=draft.kind==="biped"?30:10;draw();
}
function sliders(){
 Object.entries(ENTITY_FIELDS).forEach(([k,v])=>{
  const block=document.createElement("div");block.className="range";
  const lab=document.createElement("label");lab.htmlFor="r_"+k;lab.textContent=names[k];
  const output=document.createElement("output");output.id="v_"+k;lab.append(output);
  const control=document.createElement("input");control.type="range";control.id="r_"+k;control.min=v[1];control.max=v[2];control.step=v[3];
  control.addEventListener("input",()=>{draft[k]=Number(control.value);output.textContent=valueText(k);draw();});
  block.append(lab,control);$(["torso","limb","head"].includes(k)?"visualFields":"modelFields").append(block);
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
function limb(x1,y1,x2,y2,c,w=11){svg("line",{x1,y1,x2,y2,stroke:c,"stroke-width":w,"stroke-linecap":"round"},"limb");}
function ball(x,y,r,c,focus=""){svg("circle",{cx:x,cy:y,r,fill:c,stroke:"#d5fff2","stroke-width":2},focus);}
function rect(x,y,w,h,c,r=12,focus=""){svg("rect",{x,y,width:w,height:h,rx:r,fill:c,stroke:"#c2e9df","stroke-width":2},focus);}
function joint(x,y){ball(x,y,5,"#f5e8cd");}
function draw(){
 $("bodyDrawing").replaceChildren();
 const e=validateEntity(draft),stats=e?toArena(e):null;
 $("massStat").textContent=draft.mass+" kg";
 $("speedStat").textContent=stats?stats.speed.toFixed(2)+" m/s":"–";
 $("staminaStat").textContent=Math.round(draft.endurance*100)+" %";
 $("bodyPreview").setAttribute("aria-label",(draft.name||"Entität")+", "+(draft.kind==="biped"?"Zweibeiner":"Vierbeiner")+", schematische Vorschau");
 const c=draft.color,move=playing?Math.sin(phase):0;
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
 const label=svg("text",{x:25,y:37,fill:"#98dfc5","font-size":15,"font-family":"system-ui"});
 label.textContent=(draft.kind==="biped"?"ZWEIBEINER":"VIERBEINER")+" · "+draft.name.slice(0,24).toUpperCase();
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
 if(mode==="arena")query.set("slot",slot);
 location.assign("./lab.html?"+query.toString());
}
sliders();newDraft();
$("name").addEventListener("input",ev=>{draft.name=ev.target.value;draw();});
$("color").addEventListener("input",ev=>{draft.color=ev.target.value;draw();});
$("kind").addEventListener("change",ev=>{draft.kind=ev.target.value;if(draft.kind==="biped"&&draft.mass<30)draft.mass=30;sync();});
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
