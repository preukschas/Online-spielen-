(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else root.WaterGeoData=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
// Land-use objects in live OSM are real volunteered geodata. Topography remains synthetic
// until an explicitly verified EPSG:25832 ASCII DGM is imported.
const SITES={
 center:{label:"Schutterwald · Gemeinde-Ortskoordinate",lat:48.45833,lon:7.88306,source:"https://www.schutterwald.de/gemeinde-schutterwald/informationen/zahlen-daten-fakten"},
 hoefen:{label:"Höfen · Ortsteilmitte",lat:48.44464,lon:7.87741,source:"https://mapcarta.com/de/18151016"},
 langhurst:{label:"Langhurst · Ortsteilmitte",lat:48.47327,lon:7.87695,source:"https://mapcarta.com/de/18106924"},
 moerburghalle:{label:"Umfeld Mörburghalle · OSM-Parkplatz",lat:48.45162,lon:7.88845,source:"https://mapcarta.com/de/W34297210"}
};
const R=6378137, deg=Math.PI/180;
function localPoint(lat,lon,origin){
 return {x:(lon-origin.lon)*deg*R*Math.cos(origin.lat*deg),y:(origin.lat-lat)*deg*R};
}
function bounds(origin,width=240,height=160){
 const north=origin.lat+height/2/(deg*R);
 const south=origin.lat-height/2/(deg*R);
 const west=origin.lon-width/2/(deg*R*Math.cos(origin.lat*deg));
 const east=origin.lon+width/2/(deg*R*Math.cos(origin.lat*deg));
 return {north,south,west,east};
}
function query(origin,width=240,height=160){
 const b=bounds(origin,width,height);
 const bbox=[b.south,b.west,b.north,b.east].map(n=>n.toFixed(7)).join(",");
 return '[out:json][timeout:25];(way["building"]('+bbox+');way["highway"]('+bbox+');way["waterway"]('+bbox+');way["natural"="water"]('+bbox+');way["landuse"]('+bbox+');way["leisure"="park"]('+bbox+'););out geom;';
}
function onSegmentDistance(p,a,b){
 const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;
 const t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;
 return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
}
function inPolygon(p,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if(((a.y>p.y)!==(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x))inside=!inside;
 }
 return inside;
}
const isClosed=(geom)=>{
 if(geom.length<4)return false;
 const a=geom[0],b=geom[geom.length-1];
 return Math.abs(a.lat-b.lat)<1e-6&&Math.abs(a.lon-b.lon)<1e-6;
};
function rasterizeOSM(json,origin,base,W=24,H=16,size=10){
 if(!json||!Array.isArray(json.elements))throw new Error("Keine gültigen OpenStreetMap-Geometriedaten.");
 if(!Array.isArray(base)||base.length!==W*H)throw new Error("Rasterzellen fehlen.");
 const ways=json.elements.filter(e=>e.type==="way"&&e.tags&&Array.isArray(e.geometry)&&e.geometry.length>=2).map(e=>({
  tags:e.tags,ring:e.geometry.map(p=>localPoint(p.lat,p.lon,origin)),closed:isClosed(e.geometry)
 }));
 if(ways.length===0)throw new Error("OpenStreetMap hat in diesem Kartenausschnitt keine passenden Objekte geliefert.");
 const cells=base.map(c=>({...c,kind:"green",site:false}));
 const centerX=W*size/2,centerY=H*size/2;
 const rank={field:1,green:2,water:3,road:4,building:5};
 let counts={building:0,road:0,water:0,field:0,green:0};
 for(const c of cells){
  const p={x:(c.x+.5)*size-centerX,y:(c.y+.5)*size-centerY};
  let kind="green",score=0;
  for(const e of ways){
   const t=e.tags;
   let k=null,hit=false;
   if(t.building){k="building";hit=e.closed&&inPolygon(p,e.ring);}
   else if(t.highway){
    const cls=String(t.highway);
    if(["path","footway","cycleway","steps","pedestrian","track"].includes(cls))continue;
    k="road";const width=["motorway","trunk","primary","secondary"].includes(cls)?7:5;
    for(let i=1;i<e.ring.length;i++)if(onSegmentDistance(p,e.ring[i-1],e.ring[i])<=width){hit=true;break;}
   }else if(t.waterway||t.natural==="water"){
    k="water";
    if(e.closed)hit=inPolygon(p,e.ring);
    else for(let i=1;i<e.ring.length;i++)if(onSegmentDistance(p,e.ring[i-1],e.ring[i])<5){hit=true;break;}
   }else if(t.landuse||t.leisure==="park"){
    if(!e.closed)continue;
    const category=t.landuse;
    k=["farmland","farmyard","meadow","orchard","vineyard","allotments"].includes(category)?"field":"green";
    hit=inPolygon(p,e.ring);
   }
   if(hit&&k&&rank[k]>score){kind=k;score=rank[k];}
  }
  c.kind=kind;counts[kind]++;
 }
 // Reserve six illustrative storage locations only in green/open raster cells.
 const targets=[[7,4],[17,6],[8,12],[19,12],[12,8],[4,10]];
 const reserved=new Set();
 for(const [x,y] of targets){
  const candidates=cells.filter(c=>["field","green"].includes(c.kind)&&!reserved.has(c.y*W+c.x));
  candidates.sort((a,b)=>(Math.abs(a.x-x)+Math.abs(a.y-y))-(Math.abs(b.x-x)+Math.abs(b.y-y)));
  if(candidates.length){const c=candidates[0];c.site=true;reserved.add(c.y*W+c.x);}
 }
 return {cells,counts,featureCount:ways.length,origin:{lat:origin.lat,lon:origin.lon},hasRealElevation:false};
}
// WGS84 degrees -> ETRS89/UTM32 (EPSG:25832), approximate <1 m for illustrative sampling.
// Used only to locate cells in licensed DGM1 ASCII grid; not a substitute for surveying.
function toUTM32(lat,lon){
 const a=6378137,f=1/298.257223563,e2=f*(2-f),ep2=e2/(1-e2);
 const phi=lat*deg,lambda=(lon-9)*deg,k0=.9996;
 const s=Math.sin(phi),co=Math.cos(phi),t=Math.tan(phi),N=a/Math.sqrt(1-e2*s*s);
 const T=t*t,C=ep2*co*co,A=lambda*co;
 const e4=e2*e2,e6=e4*e2;
 const M=a*((1-e2/4-3*e4/64-5*e6/256)*phi
 -(3*e2/8+3*e4/32+45*e6/1024)*Math.sin(2*phi)
 +(15*e4/256+45*e6/1024)*Math.sin(4*phi)
 -(35*e6/3072)*Math.sin(6*phi));
 const east=500000+k0*N*(A+(1-T+C)*Math.pow(A,3)/6+(5-18*T+T*T+72*C-58*ep2)*Math.pow(A,5)/120);
 const north=k0*(M+N*t*(A*A/2+(5-T+9*C+4*C*C)*Math.pow(A,4)/24+(61-58*T+T*T+600*C-330*ep2)*Math.pow(A,6)/720));
 return {east,north};
}
function parseASC(text,origin,base,W=24,H=16,size=10){
 if(typeof text!=="string"||text.length>30*1024*1024)throw new Error("DGM-ASCII nicht lesbar oder über 30 MB.");
 const lines=text.trim().split(/\r?\n/);
 const header={};let cursor=0;
 while(cursor<Math.min(lines.length,12)){
   const m=lines[cursor].trim().match(/^(ncols|nrows|xllcorner|yllcorner|xllcenter|yllcenter|cellsize|NODATA_value)\s+(-?[\d.]+(?:[eE][+-]?\d+)?)/i);
   if(!m)break;
   header[m[1].toLowerCase()]=Number(m[2]);cursor++;
 }
 const cols=header.ncols,rows=header.nrows,spacing=header.cellsize;
 if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<=0||rows<=0||cols*rows>4000000||!Number.isFinite(spacing)||spacing<=0)
  throw new Error("Ungültiger DGM-ASCII-Header. Erwartet: ncols/nrows/cellsize.");
 if(!Number.isFinite(header.xllcorner)&&!Number.isFinite(header.xllcenter))throw new Error("xllcorner/xllcenter fehlt.");
 if(!Number.isFinite(header.yllcorner)&&!Number.isFinite(header.yllcenter))throw new Error("yllcorner/yllcenter fehlt.");
 if(lines.length-cursor<rows)throw new Error("DGM-ASCII unvollständig.");
 const left=Number.isFinite(header.xllcorner)?header.xllcorner:header.xllcenter-spacing*.5;
 const bottom=Number.isFinite(header.yllcorner)?header.yllcorner:header.yllcenter-spacing*.5;
 const samples=[];
 for(const cell of base){
   const x=(cell.x+.5)*size-W*size/2,y=(cell.y+.5)*size-H*size/2;
   const lat=origin.lat-y/(deg*R);
   const lon=origin.lon+x/(deg*R*Math.cos(origin.lat*deg));
   const pos=toUTM32(lat,lon);
   const col=Math.floor((pos.east-left)/spacing), row=rows-1-Math.floor((pos.north-bottom)/spacing);
   if(col<0||col>=cols||row<0||row>=rows)throw new Error("DGM-ASCII deckt den gewählten 240 × 160 m Ausschnitt nicht vollständig ab.");
   samples.push({row,col,index:cell.y*W+cell.x});
 }
 const rowIndexes=new Set(samples.map(s=>s.row));
 const rowCache={};
 for(const row of rowIndexes){
  const tokens=lines[cursor+row].trim().split(/\s+/);
  if(tokens.length!==cols)throw new Error("DGM-Rasterzeile "+row+" hat nicht "+cols+" Werte.");
  rowCache[row]=tokens;
 }
 const cells=base.map(c=>({...c}));
 let min=Infinity,max=-Infinity;
 for(const s of samples){
  const z=Number(rowCache[s.row][s.col]);
  if(!Number.isFinite(z)||(Number.isFinite(header.nodata_value)&&z===header.nodata_value)||z<0||z>3000)
   throw new Error("Fehlender oder unplausibler DGM-Höhenwert in Modellzelle "+s.index+".");
  cells[s.index].elevation=z;min=Math.min(min,z);max=Math.max(max,z);
 }
 return {cells,min,max,spacing,crs:"EPSG:25832",source:"user-import",hasRealElevation:true};
}
return {SITES,localPoint,bounds,query,rasterizeOSM,toUTM32,parseASC};
});
