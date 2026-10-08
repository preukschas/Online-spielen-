(function(root,factory){
 const api=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else root.HoefenGeoV2=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
// Native LGL DGM1 TXT/XYZ sampling (X east, Y north, Z metres, EPSG:25832 assumed).
// Raster cell centroids are projected using the same WGS84->UTM32 transformation
// as the .asc import. This only imports *observed values*, never interpolates
// missing coverage or substitutes fictional heights.
function centroid(x,y,origin,W,H,size,toUTM32){
 const rad=Math.PI/180,R=6378137;
 const northDistance=((H/2)-(y+.5))*size;
 const eastDistance=((x+.5)-(W/2))*size;
 const lat=origin.lat+northDistance/(rad*R);
 const lon=origin.lon+eastDistance/(rad*R*Math.cos(origin.lat*rad));
 return toUTM32(lat,lon);
}
function start({origin,W,H,size,toUTM32,maxDistance=12}){
 if(!origin||typeof toUTM32!=="function"||!Number.isInteger(W)||!Number.isInteger(H)||W<1||H<1)
   throw new Error("Ungültiges Höhenraster.");
 const targets=Array.from({length:W*H},(_,i)=>centroid(i%W,Math.floor(i/W),origin,W,H,size,toUTM32));
 const p00=targets[0], px=targets[1]||{east:p00.east+size,north:p00.north};
 const py=targets[W]||{east:p00.east,north:p00.north-size};
 const ux=px.east-p00.east,uy=px.north-p00.north;
 const vx=py.east-p00.east,vy=py.north-p00.north;
 const det=ux*vy-uy*vx;
 if(Math.abs(det)<1e-9)throw new Error("Koordinatenumrechnung fehlgeschlagen.");
 const distance=new Float64Array(W*H).fill(Infinity), heights=new Float64Array(W*H);
 const stats={points:0,matchingPoints:0,invalidLines:0,min:Infinity,max:-Infinity};
 function consumeLine(line){
  const t=line.trim();if(!t||t.startsWith("#"))return;
  const m=t.split(/[\s;]+/);
  if(m.length<3){stats.invalidLines++;return;}
  const x=Number(m[0]),y=Number(m[1]),z=Number(m[2]);
  // Reject invalid or explicitly nodata points; unrealistic elevations not silently accepted.
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z)||z<0||z>3000){
   stats.invalidLines++;return;
  }
  stats.points++;
  const dx=x-p00.east,dy=y-p00.north;
  const col=Math.round((dx*vy-dy*vx)/det);
  const row=Math.round((ux*dy-uy*dx)/det);
  if(row<0||row>=H||col<0||col>=W)return;
  const i=row*W+col;
  const d2=(x-targets[i].east)**2+(y-targets[i].north)**2;
  if(d2<distance[i]&&d2<=maxDistance**2){
   if(!Number.isFinite(distance[i]))stats.matchingPoints++;
   distance[i]=d2;heights[i]=z;
  }
 }
 function finish(base){
  if(!Array.isArray(base)||base.length!==W*H)throw new Error("Modellzellen fehlen.");
  const uncovered=[];for(let i=0;i<distance.length;i++)if(!Number.isFinite(distance[i]))uncovered.push(i);
  if(uncovered.length)throw new Error("Höhendaten decken den Ausschnitt nicht vollständig ab: "+uncovered.length+" von "+distance.length+" Rasterzellen fehlen.");
  const result=base.map((cell,i)=>{
   const z=heights[i];stats.min=Math.min(stats.min,z);stats.max=Math.max(stats.max,z);
   return {...cell,elevation:z};
  });
  return {cells:result,stats,crs:"EPSG:25832",sample:"nearest observed DGM1 XYZ point at raster cell center",
    maxSampleDistance:maxDistance,coverage:"complete"};
 }
 return {consumeLine,finish,stats};
}
async function readFile(file,opts,onProgress){
 if(!file||typeof file.size!=="number"||file.size>110*1024*1024)
  throw new Error("DGM1-Datei zu groß (max. 110 MB). Bitte einen kleineren XYZ-Ausschnitt entpacken.");
 const sampler=start(opts);
 const MAXLINE=300;
 let buffer="",completed=0;
 const decoder=typeof TextDecoder==="function"?new TextDecoder("utf-8"):null;
 function append(text){
  buffer+=text;
  let pos;
  while((pos=buffer.indexOf("\n"))!==-1){
   const line=buffer.slice(0,pos);buffer=buffer.slice(pos+1);
   if(line.length>MAXLINE)throw new Error("Ungewöhnlich lange XYZ-Zeile.");
   sampler.consumeLine(line);
  }
  if(buffer.length>MAXLINE)throw new Error("Ungültiges XYZ-Datensatzformat.");
 }
 if(decoder&&file.stream&&typeof file.stream==="function"){
  const reader=file.stream().getReader();
  try{
   for(;;){
    const data=await reader.read();if(data.done)break;
    completed+=data.value.byteLength;
    append(decoder.decode(data.value,{stream:true}));
    if(onProgress)onProgress(completed/file.size,sampler.stats);
   }
   append(decoder.decode());
  }finally{reader.releaseLock();}
 }else{
  const raw=await file.text();completed=file.size;append(raw);
 }
 if(buffer.trim())sampler.consumeLine(buffer);
 return sampler.finish(opts.base);
}
function parseText(content,options){
 const sampler=start(options);
 for(const line of String(content).split(/\r?\n/))sampler.consumeLine(line);
 return sampler.finish(options.base);
}
return {centroid,start,readFile,parseText};
});
