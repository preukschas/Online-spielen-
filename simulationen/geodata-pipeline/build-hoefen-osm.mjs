// Create a versioned, independently retrievable OSM snapshot for the local Hoefen demo.
// This script NEVER writes synthetic "real" geodata. If OSM is unavailable,
// exit nonzero and leave the last verified snapshot untouched.
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {resolve} from "node:path";
import vm from "node:vm";
const dir=resolve("simulationen/vorschau-hoefen");
const root=resolve("simulationen/geodata-pipeline");
const loadUMD=async filename=>{
 const ctx={module:{exports:{}}};
 vm.runInNewContext(await readFile(resolve(dir,filename),"utf8"),ctx,{filename});
 return ctx.module.exports;
};
const E=await loadUMD("hoefen-core.js"),G=await loadUMD("water-geodata.js");
const query=G.query(E.ORIGIN,E.W*E.SIZE,E.H*E.SIZE);
const bbox=G.bounds(E.ORIGIN,E.W*E.SIZE,E.H*E.SIZE);
const services=[
 "https://overpass.kumi.systems/api/interpreter",
 "https://overpass-api.de/api/interpreter",
 "https://overpass.nchc.org.tw/api/interpreter"
];
const maxResponse=16*1024*1024;
const allowedTags=["highway","building","waterway","natural","water","landuse","leisure","name"];
async function request(url){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),45000);
 try{
  const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8","Accept":"application/json"},body:"data="+encodeURIComponent(query),signal:ctrl.signal});
  if(!response.ok)throw Error("HTTP "+response.status);
  const contentLength=Number(response.headers.get("content-length")||"0");
  if(contentLength>maxResponse)throw Error("response too big");
  const raw=await response.text();
  if(raw.length>maxResponse)throw Error("response exceeds limit");
  return JSON.parse(raw);
 }finally{clearTimeout(timer);}
}
// Fallback to the official OpenStreetMap API 0.6 map endpoint if public
// Overpass mirrors reject or rate-limit the request. Avoid fake data.
const decode=s=>String(s).replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
const attrs=s=>Object.fromEntries([...s.matchAll(/([A-Za-z_:][-\w:.]*)="([^"]*)"/g)].map(x=>[x[1],decode(x[2])]));
function parseOsmXml(text){
 if(!text.includes("<osm"))throw Error("No OSM XML");
 const nodes=new Map();
 for(const x of text.matchAll(/<node\b([^>]*?)\/?>/g)){
  const a=attrs(x[1]),lat=Number(a.lat),lon=Number(a.lon);
  if(a.id&&Number.isFinite(lat)&&Number.isFinite(lon))nodes.set(a.id,{lat,lon});
 }
 const elements=[];
 for(const x of text.matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)){
  const a=attrs(x[1]),tags={},geometry=[];
  for(const tag of x[2].matchAll(/<tag\b([^>]*?)\/?>/g)){
   const t=attrs(tag[1]);if(allowedTags.includes(t.k))tags[t.k]=t.v;
  }
  if(!Object.keys(tags).length)continue;
  for(const nd of x[2].matchAll(/<nd\b([^>]*?)\/?>/g)){
   const p=nodes.get(attrs(nd[1]).ref);if(p)geometry.push(p);
  }
  if(geometry.length>=2&&geometry.length<=5000)elements.push({type:"way",id:Number(a.id),tags,geometry});
 }
 return {elements};
}
async function officialOSM(){
 const bounds=[bbox.west,bbox.south,bbox.east,bbox.north].map(x=>x.toFixed(7)).join(",");
 let last;
 for(const url of ["https://api.openstreetmap.org/api/0.6/map?bbox="+bounds,
                   "https://www.openstreetmap.org/api/0.6/map?bbox="+bounds]){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),45000);
  try{
   const response=await fetch(url,{signal:c.signal,headers:{
     Accept:"application/xml",
     "User-Agent":"DMP-SimLab/1.0 (+https://github.com/preukschas/Online-spielen-)"
   }});
   if(!response.ok)throw Error("HTTP "+response.status);
   const raw=await response.text();
   if(raw.length>30*1024*1024)throw Error("OSM XML too large");
   const result=parseOsmXml(raw);
   if(result.elements.length<10)throw Error("Too few geometries in official OSM map API");
   return {json:result,endpoint:url.split("?")[0]};
  }catch(e){last=e;console.warn("Official OSM API failed",e.message);}
  finally{clearTimeout(timer);}
 }
 throw last||Error("Official OSM API unavailable");
}
let json,endpoint,error;
for(const service of services){
 try{json=await request(service);endpoint=service;break}
 catch(e){error=e;console.warn("Overpass endpoint failed",service,e.message);}
}
if(!json){
 try{const result=await officialOSM();json=result.json;endpoint=result.endpoint;}
 catch(e){error=e;}
}
if(!json)throw Error("No real OSM available. NOT creating snapshot: "+(error?.message||"unknown"));
const sanity=p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.lat>48.3&&p.lat<48.6&&p.lon>7.6&&p.lon<8.1;

const unique=new Set(),ways=[];
for(const way of json.elements||[]){
 if(way.type!=="way"||!Number.isSafeInteger(way.id)||unique.has(way.id)||!way.tags||!Array.isArray(way.geometry)||way.geometry.length<2||way.geometry.length>5000)continue;
 if(!way.geometry.every(sanity))continue;
 const tags={};
 for(const key of allowedTags)if(typeof way.tags[key]==="string")tags[key]=way.tags[key].slice(0,120);
 if(!Object.keys(tags).length)continue;
 // Do not publish address, personal names or unrelated tags.
 unique.add(way.id);
 ways.push({type:"way",id:way.id,tags,geometry:way.geometry.map(p=>({lat:+p.lat.toFixed(7),lon:+p.lon.toFixed(7)}))});
}
if(ways.length<10)throw Error("Only "+ways.length+" OSM features. Reject incomplete download.");
const raster=G.rasterizeOSM({elements:ways},E.ORIGIN,E.BASE,E.W,E.H,E.SIZE);
if(raster.cells.length!==E.N||!raster.counts.road&&!raster.counts.building)throw Error("No useful raster classifications");
const water=ways.filter(w=>w.tags.waterway),named=water.filter(w=>/\bBruchgraben\b/i.test(w.tags.name||""));
const saved={
 schema:"dmp-hoefen-osm-v1",municipality:"Schutterwald",district:"Höfen",
 generatedAt:new Date().toISOString(),valid:true,
 origin:E.ORIGIN,bbox,
 attribution:"© OpenStreetMap-Mitwirkende (ODbL)",
 originalService:endpoint,originalQuery:query,
 metadata:{featureCount:ways.length,waterwayCount:water.length,namedBruchgrabenSegments:named.length,cellCounts:raster.counts,
  includesRealElevation:false,grabenMapped:named.length>0,license:"ODbL"},
 elements:ways
};
const target=resolve(dir,"hoefen-ortsdaten.json");
await writeFile(target,JSON.stringify(saved)+"\n");
console.log(JSON.stringify({snapshot:target,at:saved.generatedAt,features:ways.length,waterways:water.length,taggedBruchgraben:named.length,cells:raster.counts,bytes:JSON.stringify(saved).length}));
