// DMP SIM LAB – recherchierte Arten + deutlich gekennzeichnete Modellwerte.
// Reale Körpermassen aus den jeweils verlinkten Artprofilen; Gang- und
// Spielparameter sind frei gewählte, nicht kalibrierte Startwerte.
import {ENTITY_KEY,ENTITY_LIMIT,newEntity,validateEntity,safeEntityList} from "./entity-model.js";
import {FIGHTER_CATALOG} from "./fighter-catalog.js";
export const ENTITY_CATALOG=Object.freeze([
 {key:"cheetah",name:"Gepard",emoji:"🐆",type:"Tier",appearance:"cheetah",kind:"quadruped",
  color:"#eac479",mass:50,amplitude:1,frequency:2.6,feedback:5.2,traction:.95,endurance:.4,torso:1.35,limb:1.25,head:.75,
  fact:"Gepard (Acinonyx jubatus): ausgewachsene Tiere etwa 21–72 kg. Auf kurze Sprints spezialisiert.",source:"https://animaldiversity.org/accounts/Acinonyx_jubatus/"},
 {key:"wolf",name:"Grauwolf",emoji:"🐺",type:"Tier",appearance:"wolf",kind:"quadruped",
  color:"#929ca8",mass:40,amplitude:.7,frequency:2,feedback:5.2,traction:.9,endurance:.9,torso:1.2,limb:1,head:.95,
  fact:"Grauwolf (Canis lupus): je nach Geschlecht und Region ca. 23–80 kg; ausdauernder Läufer.",source:"https://animaldiversity.org/accounts/Canis_lupus/"},
 {key:"horse",name:"Reitpferd",emoji:"🐎",type:"Tier",appearance:"horse",kind:"quadruped",
  color:"#b77c52",mass:500,amplitude:.95,frequency:2.1,feedback:5.3,traction:.85,endurance:.85,torso:1.45,limb:1.5,head:.9,
  fact:"Hauspferd (Equus caballus): sehr große Rassenvielfalt, ca. 227–900 kg. 500 kg ist ein Beispiel.",source:"https://animaldiversity.org/accounts/Equus_caballus/"},
 {key:"fox",name:"Rotfuchs",emoji:"🦊",type:"Tier",appearance:"fox",kind:"quadruped",
  color:"#d87643",mass:6,amplitude:.75,frequency:2.1,feedback:5.3,traction:.9,endurance:.75,torso:.98,limb:.85,head:1,
  fact:"Rotfuchs (Vulpes vulpes): erwachsene Tiere etwa 3–14 kg, charakteristischer buschiger Schwanz.",source:"https://animaldiversity.org/accounts/Vulpes_vulpes/"},
 {key:"cat",name:"Hauskatze",emoji:"🐈",type:"Tier",appearance:"cat",kind:"quadruped",
  color:"#c9a782",mass:4.5,amplitude:.65,frequency:2,feedback:5.8,traction:.95,endurance:.65,torso:.85,limb:.75,head:1.1,
  fact:"Hauskatze (Felis catus): im Artprofil etwa 4,1–5,4 kg; beweglicher Körper und sprungkräftige Gliedmaßen.",source:"https://animaldiversity.org/accounts/Felis_catus/"},
 {key:"ostrich",name:"Strauß",emoji:"🪶",type:"Tier",appearance:"ostrich",kind:"biped",
  color:"#535c69",mass:110,amplitude:.95,frequency:2.2,feedback:5.1,traction:.85,endurance:.78,torso:1.15,limb:1.55,head:.65,
  fact:"Afrikanischer Strauß (Struthio camelus): etwa 90–130 kg, zweibeiniger Laufvogel.",source:"https://animaldiversity.org/accounts/Struthio_camelus/"},
 {key:"sprinter",name:"Mensch · Sprint",emoji:"🏃",type:"Mensch",appearance:"human",kind:"biped",
  color:"#47bdd3",mass:78,amplitude:.92,frequency:2.4,feedback:5.4,traction:.9,endurance:.55,torso:1.05,limb:1.2,head:.93,
  fact:"Fiktives Sprint-Testmodell (78 kg). Masse, Körperbau, Balance und Taktzahl sind individuelle Modellannahmen; keine Athletendaten.",source:null},
 {key:"endurance",name:"Mensch · Ausdauer",emoji:"🚶",type:"Mensch",appearance:"human",kind:"biped",
  color:"#53c6a1",mass:67,amplitude:.68,frequency:1.7,feedback:5.8,traction:.85,endurance:.98,torso:.98,limb:1.1,head:1,
  fact:"Fiktives Ausdauer-Testmodell (67 kg). Hohe Modellausdauer ist ein Spielwert, kein medizinischer Messwert.",source:null},
 {key:"robot",name:"Humanoider Roboter",emoji:"🤖",type:"Maschine",appearance:"robot",kind:"biped",
  color:"#83b9f7",mass:80,amplitude:.69,frequency:1.8,feedback:6.3,traction:.95,endurance:.85,torso:1.12,limb:1.02,head:.8,
  fact:"Fiktiver humanoider Forschungsroboter, 80 kg angenommene Konstruktionsmasse. Keine Herstellerdaten.",source:null},
 {key:"robotdog",name:"Roboterhund",emoji:"🦾",type:"Maschine",appearance:"robotdog",kind:"quadruped",
  color:"#8bcbd2",mass:45,amplitude:.69,frequency:2,feedback:6.1,traction:.95,endurance:.9,torso:1.2,limb:.9,head:.75,
  fact:"Fiktiver Vierbein-Roboter, 45 kg angenommene Masse. Mechanische Grenzwerte und Leistung sind Modellannahmen.",source:null}
].concat(FIGHTER_CATALOG));
export function catalogEntity(entry){
 const raw=typeof entry==="string"?ENTITY_CATALOG.find(e=>e.key===entry):entry;
 if(!raw)return null;
 const base=newEntity(raw.kind==="quadruped"?"animal":raw.type==="Maschine"?"robot":"human","catalog-"+raw.key);
 const properties=["name","appearance","kind","color","mass","amplitude","frequency","feedback","traction","endurance","torso","limb","head","fighterStyle","combat"];
 for(const prop of properties)if(raw[prop]!==undefined)base[prop]=raw[prop];
 return validateEntity(base);
}
// Nur fehlende Muster einfügen, niemals vorhandene Entwürfe/Änderungen überschreiben.
export function installCatalog(storage){
 const entries=safeEntityList(storage),known=new Set(entries.map(e=>e.id));let added=0,skipped=0;
 for(const item of ENTITY_CATALOG){
  const e=catalogEntity(item);
  if(known.has(e.id))continue;
  if(entries.length>=ENTITY_LIMIT){skipped++;continue;}
  entries.push(e);known.add(e.id);added++;
 }
 if(!added)return {added,skipped,ok:true};
 try{storage.setItem(ENTITY_KEY,JSON.stringify(entries));return{added,skipped,ok:true};}
 catch{return{added:0,skipped,ok:false};}
}
