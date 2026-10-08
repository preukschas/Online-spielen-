// Schematische, eigenständige SVG-Figuren für Kampflegenden.
// Keine Porträts/Fotos, keine Behauptung über das tatsächliche Aussehen.
const NS="http://www.w3.org/2000/svg";
const SKINS={ali:"#86513f",tyson:"#85492e",shields:"#81513f",bruce:"#cb9d71",
 oyama:"#c39272",ronda:"#e7b999",riner:"#855439",saenchai:"#b9815d",
 khabib:"#d2aa86",musashi:"#d2a27b"};
const COLORS={ali:["#e44f56","#faf9ed"],tyson:["#202630","#e3d2b3"],shields:["#7f53c3","#d7c0f5"],
 bruce:["#e9be45","#1c252d"],oyama:["#f0f1ec","#151c27"],ronda:["#3775c7","#f5fafc"],
 riner:["#f3f4ed","#0d1522"],saenchai:["#df4566","#efddbb"],
 khabib:["#338a76","#d3ebdb"],musashi:["#4e6a83","#ded8c5"]};
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function drawFighter(root,e,move=0){
 const style=e.fighterStyle;
 if(!Object.hasOwn(SKINS,style))return false;
 const node=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));root.append(n);return n;};
 const p=(d,fill,attrs={})=>node("path",{d,fill,...attrs});
 const c=(x,y,r,fill,attrs={})=>node("circle",{cx:x,cy:y,r,fill,...attrs});
 const ell=(x,y,rx,ry,fill,attrs={})=>node("ellipse",{cx:x,cy:y,rx,ry,fill,...attrs});
 const line=(x1,y1,x2,y2,stroke,w=6,attrs={})=>node("line",{x1,y1,x2,y2,stroke,"stroke-width":w,"stroke-linecap":"round",...attrs});
 const rect=(x,y,w,h,fill,rx=6,attrs={})=>node("rect",{x,y,width:w,height:h,rx,fill,...attrs});
 const skin=SKINS[style],shirt=e.color,accent=COLORS[style][1],hair=style==="ronda"?"#b77b3f":style==="shields"?"#242334":style==="bruce"?"#202324":style==="musashi"?"#22262c":"#27313b";
 const boxer=["ali","tyson","shields"].includes(style);
 const judo=["oyama","ronda","riner"].includes(style);
 const samurai=style==="musashi",female=["shields","ronda"].includes(style);
 const b=e.torso||1,leg=e.limb||1,head=e.head||1;
 const phase=Math.sin(move)*14,hipY=285;
 const chestWidth=clamp((style==="riner"?78:style==="tyson"?72:style==="bruce"?50:62)*b,44,108);
 const lX=280-chestWidth/2,rX=280+chestWidth/2;
 // Dynamische Beinzeichnung in zweiter Ebene; gelernte Gelenkpositionen sind nicht maßstabsgetreu.
 for(const side of [-1,1]){
  const hX=280+side*17,kneeX=hX+side*phase,ankleX=hX-side*phase*.64;
  line(hX,hipY,kneeX,335,skin,20);
  line(kneeX,335,ankleX,401,skin,14);
  const pant= judo||samurai?shirt:boxer?["ali","shields"].includes(style)?shirt:"#1b2632":style==="bruce"?"#e5bd45":shirt;
  if(judo||samurai){
   p("M"+(hX-15)+" 284 L"+(kneeX-16)+" 356 L"+(ankleX-11)+" 392 L"+(ankleX+12)+" 392 L"+(kneeX+15)+" 356 L"+(hX+15)+" 284 Z",pant,
     {stroke:"#d8dbe0","stroke-width":1.2});
  }else{
   p("M"+(hX-19)+" 279 L"+(kneeX-18)+" 316 L"+(kneeX+19)+" 317 L"+(hX+17)+" 279 Z",pant);
   line(kneeX,335,ankleX,400,skin,15);
  }
  line(ankleX-7,404,ankleX+19,404,style==="bruce"?"#272c32":style==="ronda"?"#f4f7f9":"#e2ddd4",10);
 }
 // Jacke, Tanktop, Karate-/Judo-Gi.
 if(judo){
  p("M"+lX+" 177 L"+(rX)+" 177 L"+(rX-2)+" 291 L"+(lX+3)+" 291 Z",shirt,{stroke:"#bdc9cf","stroke-width":2});
  p("M"+lX+" 174 L283 237 L"+(lX+21)+" 260 L"+(lX+7)+" 200 Z",accent,{opacity:.72});
  p("M"+rX+" 174 L278 236 L"+(rX-14)+" 262 L"+(rX-5)+" 203 Z",shirt,{stroke:"#a6b5be","stroke-width":2});
  p("M273 182 L280 218 L291 184","none",{stroke:skin,"stroke-width":5});
  rect(lX-2,265,chestWidth+5,12,style==="ronda"?"#141724":"#151b24",3);
  p("M280 277 l-12 44 h12 l9 -44 Z","#1a2330");
  rect(lX+4,281,9,2,accent,1);
 }else if(samurai){
  p("M"+lX+" 174 Q280 183 "+rX+" 174 L"+(rX+6)+" 291 L"+(lX-4)+" 291 Z",shirt,{stroke:"#2a394a","stroke-width":3});
  p("M"+lX+" 181 L290 270 L304 262 L"+(lX+16)+" 178 Z",accent,{opacity:.84});
  rect(lX-9,269,chestWidth+18,13,"#37362e",4);
  p("M"+lX+" 279 L"+(lX-30)+" 401 L"+(rX+35)+" 401 L"+rX+" 279 Z",shirt,{stroke:"#9eb9c5","stroke-width":1.7});
  for(let i=0;i<5;i++)line(lX-4+i*(chestWidth+9)/4,304,lX-19+i*(chestWidth+34)/4,395,"#d1e3e4",1.2,{opacity:.35});
 }else{
  rect(lX,179,chestWidth,100,shirt,boxer?20:12);
  if(style==="bruce"){
   line(lX+8,185,lX+8,273,"#22282c",7);line(rX-7,184,rX-7,275,"#22282c",7);
  }else if(boxer){
   // Brust-/Sporttrikot, das in unserer Cartoon-Optik eindeutig als Boxer erkennbar ist.
   line(lX+6,185,rX-6,185,accent,4);
   rect(lX-4,265,chestWidth+8,22,accent,5);
   rect(lX+chestWidth*.32,270,chestWidth*.36,12,shirt,2);
  }else if(style==="saenchai"){
   line(lX+7,192,rX-7,192,accent,5);
   p("M"+lX+" 241 L"+rX+" 241 L"+(rX+3)+" 288 L"+(lX-3)+" 288 Z",shirt);
   rect(lX,268,chestWidth,8,accent,3);
  }else{
   rect(lX-1,265,chestWidth+2,14,accent,4);
   line(280,185,280,254,"#9bd5c9",3);
  }
 }
 // Arme in der individuellen Deckung.
 const handHigh=boxer?214:judo?235:style==="bruce"?198:style==="saenchai"?213:samurai?246:225;
 const ext=boxer?10:samurai?40:21;
 for(const side of [-1,1]){
   const shoulder=280+side*(chestWidth/2-2),elbow=shoulder+side*(boxer?29:35),wrist=280+side*ext+(side>0?-phase:phase);
   line(shoulder,193,elbow,238,shirt,19);
   line(elbow,238,wrist,handHigh,skin,15);
   if(boxer){
     ell(wrist,handHigh,17,17,style==="tyson"?"#c53f36":style==="shields"?"#e8b83c":"#d33b45",{stroke:"#f5f1df","stroke-width":3});
     rect(wrist-10,handHigh+11,20,8,accent,2);
   }else if(judo){
     ell(wrist,handHigh,8,11,skin);
     rect(shoulder-8,194,16,20,shirt,4);
   }else{
     ell(wrist,handHigh,9,10,skin);
     if(style==="khabib"||style==="saenchai")rect(wrist-9,handHigh-3,18,9,accent,3);
   }
 }
 // Kopf/Haare; individueller Sportdress statt Foto-Likeness.
 const hy=134,rx=25*head,ry=30*head;
 if(female&&style==="ronda"){
    p("M"+(280-rx)+" 122 Q249 92 274 96 Q319 87 "+(280+rx)+" 130 L318 165 L303 160 Z",hair);
    ell(314,152,12,22,hair);
 }else if(female&&style==="shields"){
    for(let k=0;k<6;k++)c(258+k*8,105+(k%2)*4,8,hair);
 }
 ell(280,hy,rx,ry,skin,{stroke:"#76564b","stroke-width":1.5});
 if(style==="khabib"){
   p("M252 115 Q281 91 308 116 Q291 113 280 116 Q265 109 252 115",hair);
   p("M260 141 Q280 174 300 141 Q304 159 287 169 L274 169 Q255 154 260 141 Z","#42332a");
 }else if(style==="musashi"){
   p("M255 112 Q268 88 287 100 Q303 98 306 122 L295 116 L283 112 Z",hair);
   ell(284,99,12,9,hair);
   p("M295 100 Q327 92 321 73 Q311 85 295 90 Z",hair);
 }else if(style==="bruce"){
   p("M252 124 Q244 96 275 97 Q304 93 309 123 Q290 113 279 113 Q268 118 252 124",hair);
 }else if(style==="oyama"||style==="saenchai"){
   p("M252 124 Q253 103 273 103 Q299 98 308 123 Q288 113 279 114 Q269 117 252 124",hair);
 }else if(style==="tyson"||style==="riner"){
   p("M256 111 Q280 103 303 111 L306 117 Q282 112 255 117 Z",hair);
 }else if(style==="ali"){
   p("M252 116 Q246 101 264 100 L287 96 Q309 101 308 120 Q285 114 277 113 Q260 114 252 116",hair);
 }else if(style==="shields"){
   ell(312,117,14,18,hair);
 }
 c(271,134,2.5,"#172331");c(290,134,2.5,"#172331");
 p("M272 148 Q280 153 289 147","none",{stroke:"#784e40","stroke-width":2,"stroke-linecap":"round"});
 // Outfit-Details sind charakteristisch, aber frei interpretiert.
 if(style==="ali"){line(258,282,303,282,"#f1d3a7",4);}
 if(style==="tyson"){rect(262,273,36,10,"#f8cf63",4);}
 if(style==="shields"){c(280,201,7,"#e9c65f");}
 if(style==="bruce"){p("M259 207 L280 226 L299 207","none",{stroke:"#2b3432","stroke-width":3});}
 if(style==="khabib"){rect(258,207,43,7,"#d3eadc",3);}
 if(style==="saenchai"){for(let k=0;k<3;k++)line(260+k*14,278,267+k*14,283,accent,3);}
 if(samurai){
   // Zwei stilisierte Holz-Trainingsschwerter; keine Waffenphysik im Duell.
   p("M220 281 L344 177","none",{stroke:"#90683f","stroke-width":9,"stroke-linecap":"round"});
   p("M221 283 L344 179","none",{stroke:"#dfc28d","stroke-width":3,"stroke-linecap":"round"});
   p("M333 279 L224 209","none",{stroke:"#785334","stroke-width":7,"stroke-linecap":"round"});
   rect(206,269,35,9,"#34302b",2);
 }
 return true;
}
