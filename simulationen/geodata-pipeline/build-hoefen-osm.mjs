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
let json,endpoint,error;
for(const service of services){
 try{json=await request(service);endpoint=service;break}
 catch(e){error=e;console.warn("Overpass endpoint failed",service,e.message);}
}
if(!json)throw Error("No real OSM available. NOT creating snapshot: "+(error?.message||"unknown"));
const sanity=p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.lat>48.3&&p.lat<48.6&&p.lon>7.6&&p.lon<8.1;
const allowedTags=["highway","building","waterway","natural","water","landuse","leisure","name"];
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
