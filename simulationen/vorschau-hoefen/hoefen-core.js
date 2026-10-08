(function(root,factory){
 const api=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else root.HoefenWater=factory();
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const W=60,H=40,SIZE=20,N=W*H,AREA=SIZE*SIZE,MINUTES=180;
const ORIGIN={lat:48.44290,lon:7.87741};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const volume=mm=>mm*AREA/1000;
const cases={
 basic:{name:"Ausgangslage",seal:52,soil:9,drain:8,storage:0},
 green:{name:"Mehr Grünflächen",seal:32,soil:15,drain:8,storage:45},
 buffer:{name:"Mehr Rückhalt",seal:48,soil:9,drain:12,storage:120}
};
function channelY(x){return 30+2.4*Math.sin(x*.12)+.6*Math.cos(x*.44);}
function makeTerrain(){
 const out=[];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const c=channelY(x),distance=Math.abs(y-c);
  const channel=distance<.7,street=(y===15&&x>6)||(x===20&&y<29)||(y===7&&x<40)||(x===44&&y<28);
  const building=!street&&!channel&&y<27&&x>8&&x<49&&((x*7+y*11)%23<9)&&y%3!==0;
  const field=distance>4&&(y>26||x<9||x>49);
  const kind=channel?"water":street?"road":building?"building":field?"field":"green";
  const elevation=149.3+(W-x)*.012+distance*.027+.02*Math.sin(x*.21+y*.11);
  const designated=(x===12||x===32||x===48)&&Math.abs(y-Math.round(c)-3)<=0;
  out.push({x,y,kind,elevation,channel,site:designated,origin:"schematic"});
 }
 return out;
}
const BASE=makeTerrain();
function normalize(value={}){
 const preset=cases[value.preset]||cases.basic;
 const num=(key,defaultValue,min,max)=>clamp(Number.isFinite(Number(value[key]))?Number(value[key]):defaultValue,min,max);
 return {
  preset:cases[value.preset]?value.preset:"basic",
  rain:num("rain",65,0,160),duration:Math.round(num("duration",60,0,180)),
  minutes:Math.round(num("minutes",MINUTES,1,240)),
  seal:num("seal",preset.seal,0,100),
  soil:num("soil",preset.soil,0,40),
  drain:num("drain",preset.drain,0,30),
  storage:num("storage",preset.storage,0,300)
 };
}
function validCells(input){
 if(!Array.isArray(input)||input.length!==N)return BASE.map(c=>({...c}));
 return input.map((c,i)=>{
  const kind=["building","road","field","green","water"].includes(c.kind)?c.kind:BASE[i].kind;
  const z=Number(c.elevation);
  if(!Number.isFinite(z)||z<0||z>3000)throw Error("Ungültige Geländehöhe in Rasterzelle "+i);
  return {x:i%W,y:Math.floor(i/W),kind,elevation:z,channel:!!c.channel||kind==="water",site:!!c.site,origin:c.origin||"import"};
 });
}
const interventions=new Set(["garden","basin","unseal"]);
function validateActions(arr){
 if(arr==null)return [];
 if(!Array.isArray(arr)||arr.length>800)throw Error("Zu viele oder ungültige Maßnahmen.");
 const map=new Map();
 for(const a of arr){
  if(!a||!Number.isInteger(a.x)||!Number.isInteger(a.y)||a.x<0||a.x>=W||a.y<0||a.y>=H||!interventions.has(a.type))throw Error("Ungültige Maßnahme.");
  map.set(a.y*W+a.x,{x:a.x,y:a.y,type:a.type});
 }
 return [...map.values()];
}
function create(input={}){
 const config=normalize(input),cells=validCells(input.cells),actions=validateActions(input.actions);
 const actionByIndex=new Map(actions.map(a=>[a.y*W+a.x,a.type]));
 return {config,cells,actions,actionByIndex,time:0,water:new Float64Array(N),retained:new Float64Array(N),
  rainMm:0,infilMm:0,drainMm:0,exitMm:0,storeMm:0,history:[{minute:0,outflow:0,channel:0}],
  peak:0,channelPassMm:0};
}
function sealFraction(cell,c,action){
 if(cell.channel)return 1;
 if(action==="garden")return .08;
 if(action==="unseal")return .02;
 const modifier=cell.kind==="building"?35:cell.kind==="road"?31:cell.kind==="field"?-25:-15;
 return clamp((c.seal+modifier)/100,0,1);
}
function metrics(state){
 const surface=state.water.reduce((s,v)=>s+v,0);
 const accounted=state.infilMm+state.storeMm+state.drainMm+state.exitMm+surface;
 let shallow=0,deep=0;
 for(let i=0;i<N;i++){if(state.water[i]>=20)shallow++;if(state.water[i]>=80)deep++;}
 return {
  rain:volume(state.rainMm),soil:volume(state.infilMm),retained:volume(state.storeMm),
  drains:volume(state.drainMm),outflow:volume(state.exitMm),
  surface:volume(surface),error:volume(state.rainMm-accounted),
  peak:state.peak,wetCells:shallow,deepCells:deep,
  channelPass:volume(state.channelPassMm)
 };
}
function tick(state){
 const c=state.config;
 if(state.time>=c.minutes)return state;
 let infil=0,stored=0,drains=0,depart=0,through=0;
 const rain=state.time<c.duration?c.rain/60:0;
 const change=new Float64Array(N);
 for(let i=0;i<N;i++){
  const cell=state.cells[i],action=state.actionByIndex.get(i);
  let w=state.water[i]+rain;
  const sealed=sealFraction(cell,c,action);
  const soilRate=c.soil*(1-sealed)/60*(action==="garden"?1.7:cell.kind==="field"?1.13:1);
  const intoSoil=Math.min(w,soilRate);
  w-=intoSoil;infil+=intoSoil;
  const capacity=action==="basin"?Math.max(160,c.storage):((cell.site&&!cell.channel)?c.storage:0);
  const inside=Math.min(w,Math.max(0,capacity-state.retained[i]));
  w-=inside;stored+=inside;state.retained[i]+=inside;
  if(!cell.channel&&(cell.kind==="road"||cell.kind==="building")){
   const lost=Math.min(w,c.drain/60);
   w-=lost;drains+=lost;
  }
  state.water[i]=w;
 }
 for(let i=0;i<N;i++){
  const cell=state.cells[i],w=state.water[i];
  if(w<=1e-12)continue;
  const x=cell.x,y=cell.y;
  // Edge flow is explicit external export. Water moving between cells is conservative.
  const border=(x===W-1||y===H-1||x===0||y===0);
  if(border){
    const fraction=cell.channel?.78:.28;
    const amount=w*fraction;change[i]-=amount;depart+=amount;continue;
  }
  const here=cell.elevation+w/1000;
  let target=-1,drop=-Infinity;
  for(const j of [i+1,i-1,i+W,i-W]){
   const dest=state.cells[j],slope=here-(dest.elevation+state.water[j]/1000);
   if(slope>drop){drop=slope;target=j;}
  }
  if(drop>0&&target>=0){
   const f=clamp((cell.channel?.57:.19)+drop*(cell.channel?1.8:.85),0,cell.channel?.82:.57);
   const amount=w*f;
   change[i]-=amount;change[target]+=amount;
   if(cell.channel)through+=amount;
  }
 }
 for(let i=0;i<N;i++){
  state.water[i]+=change[i];
  if(state.water[i]<-1e-8)throw Error("Negatives Wasservolumen in Zelle "+i);
  if(state.water[i]<0)state.water[i]=0;
 }
 state.rainMm+=rain*N;state.infilMm+=infil;state.storeMm+=stored;
 state.drainMm+=drains;state.exitMm+=depart;state.channelPassMm+=through;
 state.time++;
 const out=volume(drains+depart),qChannel=volume(through);
 state.peak=Math.max(state.peak,out);
 state.history.push({minute:state.time,outflow:out,channel:qChannel});
 return state;
}
function run(input){const s=create(input);while(s.time<s.config.minutes)tick(s);return s;}
function compare(a,b,common){
 const same={rain:common.rain,duration:common.duration,minutes:common.minutes||MINUTES};
 const x=run({...a,...same}),y=run({...b,...same});
 return {A:{state:x,metrics:metrics(x)},B:{state:y,metrics:metrics(y)}};
}
return {W,H,SIZE,N,AREA,MINUTES,ORIGIN,BASE,cases,normalize,create,tick,run,metrics,compare,validateActions,volume,channelY};
});
