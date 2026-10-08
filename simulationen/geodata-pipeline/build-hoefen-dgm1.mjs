// LGL DGM1 candidate: only publish a raster after valid WCS GeoTIFF and full 2400-cell coverage.
import {fromArrayBuffer} from "geotiff";
import {readFile,writeFile} from "node:fs/promises";
import vm from "node:vm";
const dir="simulationen/vorschau-hoefen/";
const load=async file=>{const ctx={module:{exports:{}}};vm.runInNewContext(await readFile(dir+file,"utf8"),ctx);return ctx.module.exports;};
const E=await load("hoefen-core.js"),G=await load("water-geodata.js"),V=await load("hoefen-geo-v2.js");
const SERVICE="https://owsproxy.lgl-bw.de/owsproxy/wcs/WCS_INSP_BW_Hoehe_Coverage_DGM1";
async function download(url,timeout=65000){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeout);
 try{
  const r=await fetch(url,{signal:abort.signal,headers:{"Accept":"application/xml,image/tiff,image/geotiff,*/*"}});
  if(!r.ok)throw Error("HTTP "+r.status);
  const data=await r.arrayBuffer();
  if(data.byteLength>35000000)throw Error("Dataset too large");
  return data;
 }finally{clearTimeout(timer);}
}
const asText=b=>new TextDecoder().decode(b);
const cap=asText(await download(SERVICE+"?service=WCS&request=GetCapabilities&version=2.0.1"));
if(!cap.includes("Coverage"))throw Error("No WCS capabilities: "+cap.slice(0,500));
const ids=[...cap.matchAll(/<(?:[\w-]+:)?CoverageId\b[^>]*>([^<]+)</g)].map(x=>x[1].trim());
console.log("LGL Coverage IDs",ids.slice(0,30));
const id=ids.find(x=>/dgm1/i.test(x))||(ids.length===1?ids[0]:null);
if(!id)throw Error("Unidentified DGM1 CoverageId");
const locations=E.BASE.map(cell=>V.centroid(cell.x,cell.y,E.ORIGIN,E.W,E.H,E.SIZE,G.toUTM32));
const bounds={xmin:Math.floor(Math.min(...locations.map(p=>p.east))-16),
 xmax:Math.ceil(Math.max(...locations.map(p=>p.east))+16),
 ymin:Math.floor(Math.min(...locations.map(p=>p.north))-16),
 ymax:Math.ceil(Math.max(...locations.map(p=>p.north))+16)};
console.log("Raster request EPSG:25832",bounds,"CoverageId",id);
let tiff,problem;
for(const format of ["image/tiff","image/geotiff"]){
 const q=new URLSearchParams({service:"WCS",version:"2.0.1",request:"GetCoverage",
 coverageId:id,format,subsettingcrs:"EPSG:25832",outputCRS:"EPSG:25832"});
 q.append("subset","E("+bounds.xmin+","+bounds.xmax+")");
 q.append("subset","N("+bounds.ymin+","+bounds.ymax+")");
 try{
  const bytes=await download(SERVICE+"?"+q.toString(),120000);
  const sig=new Uint8Array(bytes,0,Math.min(bytes.byteLength,4));
  if(!((sig[0]===73&&sig[1]===73)||(sig[0]===77&&sig[1]===77)))
   throw Error("Not a TIFF: "+asText(bytes).slice(0,380));
  tiff=await fromArrayBuffer(bytes);break;
 }catch(e){problem=e;console.log("Format failed",format,e.message);}
}
if(!tiff)throw Error("No valid LGL DGM1 GeoTIFF: "+problem?.message);
const image=await tiff.getImage(),rect=image.getBoundingBox();
const width=image.getWidth(),height=image.getHeight();
if(width<20||height<20||width>3000||height>3000||!rect.every(Number.isFinite))throw Error("Invalid GeoTIFF dimensions");
if(rect[2]-rect[0]<1000||rect[3]-rect[1]<600)throw Error("DGM bbox does not cover Höfen");
const raster=await image.readRasters({samples:[0],interleave:true}),nodata=image.getGDALNoData(),heights=[];
for(let i=0;i<locations.length;i++){
 const p=locations[i],x=Math.floor((p.east-rect[0])/(rect[2]-rect[0])*width),y=Math.floor((rect[3]-p.north)/(rect[3]-rect[1])*height);
 if(x<0||y<0||x>=width||y>=height)throw Error("Out of bounds cell "+i);
 const z=raster[y*width+x];
 if(!Number.isFinite(z)||z<100||z>230||(nodata!=null&&z===nodata))throw Error("Invalid height at "+i+" = "+z);
 heights.push(Math.round(z*100)/100);
}
const min=Math.min(...heights),max=Math.max(...heights);
if(max-min>25)throw Error("Height span implausible "+min+"-"+max);
const out={schema:"dmp-hoefen-dgm1-v1",origin:E.ORIGIN,municipality:"Schutterwald",district:"Höfen",
 source:"LGL Baden-Württemberg INSPIRE WCS DGM1",service:SERVICE,coverageId:id,
 attribution:"Datenquelle: LGL, www.lgl-bw.de, dl-de/by-2-0",licence:"dl-de/by-2-0",epsg:25832,
 acquiredAt:new Date().toISOString(),grid:{width:E.W,height:E.H,sizeM:E.SIZE},
 sampling:"nearest observed source pixel at 20m cell center",
 heightM:heights,minM:min,maxM:max,
 sourceResolutionM:[(rect[2]-rect[0])/width,(rect[3]-rect[1])/height]};
await writeFile(dir+"hoefen-dgm1.json",JSON.stringify(out)+"\n");
console.log("Real DGM1 imported",heights.length,"cells; elevations",min,max,"m");
