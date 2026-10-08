// DMP SIM LAB — portable entity definitions for educational models.
// Shape affects the 2D preview; only supported parameters are passed into the simulators.
export const ENTITY_KEY = "dmp_simlab_entities_v1";
export const ENTITY_FORMAT = "DMP_SIM_ENTITY";
export const ENTITY_SCHEMA = 1;
export const ENTITY_LIMIT = 40;
export const ENTITY_FIELDS = Object.freeze({
  mass:["Masse",10,120,5,"kg"],
  amplitude:["Schrittweite",.2,1,.05,""],
  frequency:["Schrittfrequenz",.7,2.6,.1,"Hz"],
  feedback:["Balance-Regler",1,8,.25,""],
  traction:["Bodenhaftung",.2,1,.1,""],
  endurance:["Ausdauer",.2,1,.05,""],
  torso:["Rumpfgröße (Grafik)",.65,1.6,.05,"×"],
  limb:["Beinlänge (Grafik)",.6,1.55,.05,"×"],
  head:["Kopfgröße (Grafik)",.6,1.5,.05,"×"]
});
export const ENTITY_PRESETS = Object.freeze({
  human:{name:"Läufer",kind:"biped",color:"#65e4b9",mass:70,amplitude:.55,frequency:1.5,feedback:4.5,traction:.8,endurance:.8,torso:1,limb:1,head:1},
  animal:{name:"Vierbeiner",kind:"quadruped",color:"#f3c577",mass:40,amplitude:.65,frequency:1.8,feedback:4.5,traction:.8,endurance:.75,torso:1.15,limb:.85,head:.9},
  robot:{name:"Roboter",kind:"biped",color:"#89b6ff",mass:85,amplitude:.6,frequency:1.7,feedback:5,traction:.9,endurance:.95,torso:1.1,limb:1.05,head:.75}
});
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export function newEntity(type="human",id="draft"){
  const base=ENTITY_PRESETS[type]||ENTITY_PRESETS.human;
  return {format:ENTITY_FORMAT,schema:ENTITY_SCHEMA,id,...base};
}
export function validateEntity(value){
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  if(value.format!==ENTITY_FORMAT||value.schema!==ENTITY_SCHEMA)return null;
  if(typeof value.id!=="string"||!/^[A-Za-z0-9_-]{1,80}$/.test(value.id))return null;
  if(typeof value.name!=="string"||value.name.trim().length<1||value.name.trim().length>24)return null;
  if(value.kind!=="biped"&&value.kind!=="quadruped")return null;
  if(value.kind==="biped"&&value.mass<30)return null;
  if(typeof value.color!=="string"||!/^#[0-9a-fA-F]{6}$/.test(value.color))return null;
  for(const [key,field] of Object.entries(ENTITY_FIELDS)){
    if(typeof value[key]!=="number"||!Number.isFinite(value[key])||value[key]<field[1]||value[key]>field[2])return null;
  }
  const normalized={format:ENTITY_FORMAT,schema:ENTITY_SCHEMA,id:value.id,name:value.name.trim(),kind:value.kind,color:value.color.toLowerCase()};
  for(const key of Object.keys(ENTITY_FIELDS))normalized[key]=value[key];
  return normalized;
}
export function toBiomechanics(entity){
  const e=validateEntity(entity);if(!e)return null;
  return {preset:e.kind==="quadruped"?"quad":"walker",params:{
    mass:e.mass,amplitude:e.amplitude,frequency:e.frequency,feedback:e.feedback,traction:e.traction,
    color:e.color,torso:e.torso,limb:e.limb,head:e.head,entityName:e.name
  }};
}
export function toArena(entity){
  const e=validateEntity(entity);if(!e)return null;
  // Deliberately simplified game-rule projection; NOT a speed prediction for actual bodies.
  const shape=e.kind==="quadruped"?1.07:1;
  const massFactor=clamp(1-(e.mass-55)/400,.8,1.13);
  const speed=clamp(1.3+e.amplitude*e.frequency*1.25*e.traction*shape*massFactor,1,6);
  return {name:e.name,speed:Math.round(speed*100)/100,stamina:e.endurance,color:e.color,kind:e.kind};
}
export function safeEntityList(storage){
  try{
    const v=JSON.parse(storage.getItem(ENTITY_KEY)||"[]");
    if(!Array.isArray(v))return [];
    const ids=new Set();
    return v.slice(0,ENTITY_LIMIT).map(validateEntity).filter(e=>{
      if(!e||ids.has(e.id))return false;ids.add(e.id);return true;
    });
  }catch{return [];}
}
export function findEntity(storage,id){
  if(typeof id!=="string"||id.length>80)return null;
  return safeEntityList(storage).find(e=>e.id===id)||null;
}
