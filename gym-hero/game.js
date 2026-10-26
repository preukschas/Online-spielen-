/* GYM HERO 3D v0.1 – DMP Lernwelt. 3D modeled from code, no external art assets.
   Browser graphics via Three.js r161. */
const $=id=>document.getElementById(id);
let T;
try{T=await import('https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js')}
catch(e){try{T=await import('https://unpkg.com/three@0.161.0/build/three.module.js')}
catch(err){$('loadmsg').textContent='3D-Bibliothek konnte nicht geladen werden. Bitte mit Internetverbindung neu laden.';throw err}}
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'})}
catch(err){$('loadmsg').textContent='3D konnte nicht gestartet werden: Bitte WebGL im Browser aktivieren.';throw err}
renderer.setPixelRatio(Math.min(1.8,devicePixelRatio||1));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.34;
$('game').append(renderer.domElement);
renderer.domElement.tabIndex=0;
const scene=new T.Scene();
scene.background=new T.Color(0x101d2a);
scene.fog=new T.Fog(0x162b39,32,64);
const camera=new T.PerspectiveCamera(67,innerWidth/innerHeight,0.1,150);
const hemi=new T.HemisphereLight(0xb4e9ff,0x203044,2.25);scene.add(hemi);
const key=new T.DirectionalLight(0xffffff,2.25);key.position.set(-4,15,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-21;key.shadow.camera.right=21;key.shadow.camera.top=19;key.shadow.camera.bottom=-19;key.shadow.bias=-0.0003;scene.add(key);
for(const [x,z,col,intensity] of [[-10,-8,0x72f7db,46],[10,6,0xe581ff,43],[2,-9,0x76a9ff,37]]){
 const l=new T.PointLight(col,intensity,14,2);l.position.set(x,4.6,z);scene.add(l);
}
const mats=new Map();
function mat(color,metal=0,rough=.68,emissive=0){
 const k=[color,metal,rough,emissive].join('/');
 if(!mats.has(k))mats.set(k,new T.MeshStandardMaterial({color,metalness:metal,roughness:rough,emissive:emissive||0,emissiveIntensity:emissive?.5:0}));
 return mats.get(k);
}
const steel=mat(0x8195a5,.83,.28),black=mat(0x121c27,.16,.8),ink=mat(0x1a2833,.05,.85),mint=mat(0x35ddb9,.28,.35),pink=mat(0xd868e7,.24,.45),gold=mat(0xffc66e,.25,.34),wall=mat(0x1c3441,.11,.83);
function mesh(parent,geom,m,x=0,y=0,z=0,cast=true){
 const o=new T.Mesh(geom,typeof m==='number'?mat(m):m);o.position.set(x,y,z);o.castShadow=cast;o.receiveShadow=true;parent.add(o);return o;
}
function box(p,w,h,d,m,x=0,y=0,z=0){return mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z)}
function cyl(p,r,h,m,x=0,y=0,z=0,segments=16){return mesh(p,new T.CylinderGeometry(r,r,h,segments),m,x,y,z)}
function sph(p,r,m,x=0,y=0,z=0){return mesh(p,new T.SphereGeometry(r,18,12),m,x,y,z)}
function beam(p,a,b,r,m){
 const mid=new T.Vector3().addVectors(new T.Vector3(...a),new T.Vector3(...b)).multiplyScalar(.5);
 const dir=new T.Vector3(...b).sub(new T.Vector3(...a));
 const o=mesh(p,new T.CylinderGeometry(r,r,dir.length(),10),m,mid.x,mid.y,mid.z);
 o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return o;
}
function plaque(text,width=3,height=.55,fg='#c3fff2',bg='#112c3b'){
 const cv=document.createElement('canvas');cv.width=768;cv.height=160;
 const c=cv.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,cv.width,cv.height);c.strokeStyle='#4cecc9';c.lineWidth=7;c.strokeRect(5,5,758,150);
 c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.font='900 60px system-ui';c.fillText(text,384,82,720);
 const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
 return new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,transparent:false}));
}
function label(p,text,x,y,z,w=3,h=.63,rot=0){
 const s=plaque(text,w,h);s.position.set(x,y,z);s.rotation.y=rot;p.add(s);return s;
}
// ARCHITECTURE: rubber tiles, large glass panes, glowing ribs, wall mirrors.
box(scene,33,.35,27,mat(0x25323b),0,-.27,0);
for(let i=-16;i<17;i++)for(let j=-13;j<14;j++){
 const odd=((i+j)&1)===0;
 box(scene,.975,.022,.975,odd?mat(0x26333b):mat(0x293740),i,.009,j);
}
for(let x=-16;x<=16;x+=4)box(scene,.048,.025,27,mat(0x36505c),x,.03,0);
for(let z=-13;z<=13;z+=4)box(scene,33,.025,.048,mat(0x36505c),0,.03,z);
box(scene,33,7,.5,wall,0,3.4,-13.5);
box(scene,.46,7,27,wall,-16.5,3.4,0);
box(scene,.46,7,27,wall,16.5,3.4,0);
box(scene,33,.22,.5,steel,0,7,-13.5);
const neonA=mat(0x80ffe5,.24,.2,0x2bc29d),neonB=mat(0xbc89ff,.1,.3,0x8041a5);
for(const [x,y,z,w,d] of [[-13,6,-12,5,.12],[-6,6,-12,5,.12],[1,6,-12,5,.12],[8,6,-12,5,.12],[13,6,-12,2,.12]]){
 box(scene,w,.1,d,neonA,x,y,z);
}
for(let x=-13;x<=13;x+=6){
 box(scene,.12,6,.12,steel,x,4,13.1);
 box(scene,.18,.13,26,steel,x,6.7,0);
}
box(scene,33,.18,.15,steel,0,6.7,13.1);
// Front wall: tinted transparent storefront
const glass=new T.MeshStandardMaterial({color:0x2a6172,metalness:.2,roughness:.1,transparent:true,opacity:.16,side:T.DoubleSide});
for(let x=-14;x<=14;x+=4){
 const g=mesh(scene,new T.PlaneGeometry(3.85,5.8),glass,x,3.45,13.05,false);
}
// Wall stripe + mirrors + posters
box(scene,32,.5,.09,neonA,0,4.8,-13.15);
for(const x of [-11.5,-5.5,.5,6.5,12]){
 const panel=box(scene,4.4,3.3,.08,mat(0x537884,.8,.08),x,2.7,-13.2);
 box(scene,4.5,.1,.15,steel,x,4.42,-13.15);
 box(scene,4.5,.1,.15,steel,x,.98,-13.15);
}
label(scene,'NO BRAIN · NO GAIN',0,5.7,-13.03,9.5,1.05);
for(let x of [-15.8,15.8])for(let z of [-9,-3,3,9]){
 const p=new T.PointLight(0x3ad4bb,9,3,2);p.position.set(x,5,z);scene.add(p);
 box(scene,.09,.16,1.4,neonA,x,5,z);
}
// Gym mats and colored training zones
for(const [x,z,color] of [[-9,5,0x21695c],[-9,-5,0x55508b],[9,-5,0x275c88],[9,5,0x744263]]){
 const area=box(scene,9,.035,8,mat(color),x,.043,z);area.receiveShadow=true;
 for(let j=-3;j<=3;j++)box(scene,7.8,.036,.016,mat(0xffffff),x,.066,z+j);
}
// Sign over reception
box(scene,4.5,1.2,.95,ink,0,.62,-10.5);
label(scene,'GYM HERO',0,1.45,-9.95,3.8,.65);
for(let x of [-14.1,14.1])for(let z=-11;z<=10;z+=2.2){
 box(scene,.8,2.1,1.7,mat(z%3>1?0x385569:0x3a4b60,.35,.58),x,1.07,z);
 box(scene,.64,.11,.05,steel,x,1.55,z+1.0);
}
// 3D training equipment.
const stations=[];
function station(id,title,subtitle,x,z,accent,construct){
 const root=new T.Group();root.position.set(x,0,z);scene.add(root);
 construct(root);
 const ring=mesh(root,new T.TorusGeometry(1.37,.04,8,64),mat(accent,.22,.22,accent),0,.085,0);
 ring.rotation.x=Math.PI/2;ring.castShadow=false;
 const sign=label(root,title,0,3.25,0,3.4,.62);
 const halo=new T.PointLight(accent,12,4,2);halo.position.y=2.5;root.add(halo);
 const marker=sph(root,.14,mat(0xffefa9,.1,.2,accent),0,2.75,0);marker.castShadow=false;
 stations.push({id,title,subtitle,x,z,root,ring,marker,sign,accent});
}
function weights(p){
 for(const z of [-.82,.15,.95]){box(p,3.7,.12,.14,steel,0,.78,z);for(const x of [-1.4,-.6,.25,1.2]){
  const o=new T.Group();o.position.set(x,.97,z);p.add(o);
  beam(o,[-.26,0,0],[.26,0,0],.055,steel);
  for(const s of [-1,1])cyl(o,.15,.13,black,s*.2,0,0).rotation.z=Math.PI/2;
 }}
 box(p,4.1,1.7,.45,ink,0,1.1,-1.1);box(p,3.8,.2,.65,black,0,2,-1.05);
}
function bench(p){
 box(p,.98,.22,2.8,mat(0x116f70),0,.68,0);
 for(const z of [-.84,.85])box(p,.15,.7,.15,steel,0,.35,z);
 for(const x of [-1.55,1.55]){box(p,.16,2.2,.19,steel,x,1.1,-.75);box(p,.5,.16,.5,steel,x,2.2,-.75);}
 beam(p,[-2.2,2.28,-.75],[2.2,2.28,-.75],.065,steel);
 for(const x of [-1.95,-1.8,1.8,1.95])cyl(p,.4,.09,black,x,2.28,-.75).rotation.z=Math.PI/2;
 box(p,.62,.18,.7,mat(0x287386),0,.8,1.12);
}
function treadmill(p){
 const ramp=box(p,2.6,.23,3.1,black,0,.25,0);ramp.rotation.x=.035;
 box(p,2.35,.09,2.75,mat(0x1c3340),0,.39,0);
 for(const x of [-1.18,1.18])beam(p,[x,.37,-1],[x,1.8,-1.1],.07,steel);
 beam(p,[-1.25,1.8,-1.1],[1.25,1.8,-1.1],.08,steel);
 const screen=box(p,1.2,.58,.12,mat(0x1b737d,.3,.2,0x056675),0,1.88,-1.15);screen.rotation.x=-.32;
}
function bag(p){
 for(const x of [-1.18,1.18]){box(p,.14,3.35,.14,steel,x,1.7,-.5);}
 beam(p,[-1.5,3.4,-.5],[1.5,3.4,-.5],.1,steel);
 beam(p,[0,3.4,-.5],[0,2.7,-.5],.025,steel);
 cyl(p,.58,1.7,mat(0xbd64d6,.12,.68),0,1.92,-.5);
 sph(p,.57,mat(0xbd64d6,.12,.68),0,2.72,-.5);
 sph(p,.57,mat(0xbd64d6,.12,.68),0,1.1,-.5);
 for(const x of [-.45,.45])for(let z of [-1.5,1.0]){
  cyl(p,.3,.62,mat(0x307e98),x,.31,z,18);
 }
}
station('add','HANTELN','Plus und Minus',-9,5,0x38edb2,weights);
station('mul','BANKDRÜCKEN','Malaufgaben',-9,-5,0xb28cff,bench);
station('div','LAUFBAND','Geteiltaufgaben',9,-5,0x73d7ff,treadmill);
station('mix','BOXSACK','Alles gemischt',9,5,0xff92b6,bag);
// Décor: ceiling light strips, hydration area and plants.
for(const x of [-12,-4,4,12])for(const z of [-8,0,8]){
 box(scene,2.5,.11,.5,mat(0xd4ffff,.05,.27,0x80d5d3),x,6.75,z);
 const bulb=new T.PointLight(0xb6f8ef,8,10,2);bulb.position.set(x,6.25,z);scene.add(bulb);
}
for(const x of [-4,4])for(const z of [10.5]){
 const pot=cyl(scene,.38,.6,mat(0x526878),x,.3,z);
 for(let a=0;a<5;a++){let rr=a/5*Math.PI*2;const f=box(scene,.18,1.55,.48,mat(0x3ba677),x+Math.cos(rr)*.15,1.22,z+Math.sin(rr)*.15);f.rotation.z=Math.cos(rr)*.44;f.rotation.x=Math.sin(rr)*.33}
}
// Character made of primitive meshes; strength changes real geometry.
const player=new T.Group();scene.add(player);player.position.set(0,0,8);
const playerVisual=new T.Group();player.add(playerVisual);
const shoes=mat(0xebf8f5,.05,.55),pant=mat(0x203d64,.1,.76),skin=mat(0xc98562,.02,.82),shirt=mat(0x13c1ac,.04,.63),hair=mat(0x1b2028,.03,.86);
const torso=box(playerVisual,.92,1.13,.48,shirt,0,1.52,0);
const waist=box(playerVisual,.67,.33,.4,pant,0,.92,0);
const head=sph(playerVisual,.34,skin,0,2.36,0);
const crown=sph(playerVisual,.34,hair,0,2.55,.01);crown.scale.set(1,.44,1);
const eyes=[];
for(const x of [-.125,.125])eyes.push(sph(playerVisual,.026,black,x,2.39,-.32));
const armGroups=[],legGroups=[];
for(const s of [-1,1]){
 const shoulder=new T.Group();shoulder.position.set(s*.66,1.91,0);playerVisual.add(shoulder);
 const upper=cyl(shoulder,.19,.65,skin,0,-.37,0);const fore=cyl(shoulder,.15,.5,skin,0,-.89,0);
 sph(shoulder,.16,skin,0,-1.14,0);
 armGroups.push({pivot:shoulder,upper,fore,s});
 const hip=new T.Group();hip.position.set(s*.19,.84,0);playerVisual.add(hip);
 box(hip,.3,.62,.36,pant,0,-.35,0);
 box(hip,.26,.42,.29,skin,0,-.86,0);
 box(hip,.35,.21,.65,shoes,0,-1.08,-.13);
 legGroups.push({pivot:hip,s});
}
const shadowCircle=mesh(player,new T.CircleGeometry(.62,32),new T.MeshBasicMaterial({color:0x020a0d,transparent:true,opacity:.22,depthWrite:false}),0,.047,0,false);shadowCircle.rotation.x=-Math.PI/2;
const SAVEKEY='dmp-gym-hero-3d-v1';
let strength=10,coins=0,correct=0,wrong=0;
try{const v=JSON.parse(localStorage.getItem(SAVEKEY)||'null');if(v&&typeof v==='object'){strength=Math.max(0,Math.min(50000,Number(v.strength)||0));coins=Math.max(0,Number(v.coins)||0);correct=Math.max(0,Number(v.correct)||0);wrong=Math.max(0,Number(v.wrong)||0)}}catch(e){}
function currentLevel(){return 1+Math.floor(strength/100)}
function save(){try{localStorage.setItem(SAVEKEY,JSON.stringify({strength,coins,correct,wrong}))}catch(e){}}
function updateStats(){
 $('strength').textContent=strength;$('level').textContent=currentLevel();$('coins').textContent=coins;
 $('strengthBar').style.width=(strength%100)+'%';
 const size=Math.min(2,1+strength/350);
 torso.scale.x=size;torso.scale.z=1+(size-1)*.45;
 for(const arm of armGroups){arm.pivot.position.x=arm.s*(.66+(size-1)*.12);arm.upper.scale.x=arm.upper.scale.z=Math.min(1.8,size);arm.fore.scale.x=arm.fore.scale.z=Math.min(1.5,1+(size-1)*.75)}
}
updateStats();
const state={playing:false,quiz:false,paused:false,yaw:0,pitch:.3,dist:6.6,keys:new Set(),drag:false,px:0,py:0,t:0,steps:0,nearest:null,question:null,lock:false,quizTimer:null,shake:0,celebrate:0};
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),1400)}
function hideAll(){for(const id of ['start','pause','quiz'])$(id).classList.add('hidden')}
function begin(){hideAll();state.playing=true;state.paused=false;state.quiz=false;state.keys.clear();renderer.domElement.focus()}
function pause(){if(!state.playing||state.quiz)return;state.paused=true;state.keys.clear();$('pause').classList.remove('hidden')}
function resume(){state.paused=false;$('pause').classList.add('hidden');renderer.domElement.focus()}
function rand(a,b){return a+Math.floor(Math.random()*(b-a+1))}
function makeProblem(kind){
 let a,b,answer,op;
 const l=Math.min(12,currentLevel());
 if(kind==='mix')kind=['add','mul','div'][rand(0,2)];
 if(kind==='add'){
   a=rand(l>=4?10:1,Math.min(100,12+l*6));b=rand(1,Math.min(95,10+l*5));
   if(Math.random()<.43){if(a<b)[a,b]=[b,a];op='−';answer=a-b}
   else{op='+';answer=a+b}
 }else if(kind==='mul'){a=rand(2,Math.min(12,5+l));b=rand(2,Math.min(12,5+l));op='×';answer=a*b}
 else{b=rand(2,Math.min(12,5+l));answer=rand(2,Math.min(12,5+l));a=b*answer;op='÷'}
 return {prompt:a+' '+op+' '+b+' = ?',answer};
}
function showQuestion(){state.question=makeProblem(state.nearest.id);state.lock=false;$('problem').textContent=state.question.prompt;$('answer').value='';$('feedback').textContent='';$('feedback').classList.remove('wrong');$('check').disabled=false;$('answer').disabled=false;$('answer').focus()}
function openQuiz(){
 if(!state.nearest||!state.playing||state.paused)return;
 state.quiz=true;state.keys.clear();
 $('taskType').textContent=state.nearest.title+' · '+state.nearest.subtitle;
 $('quiz').classList.remove('hidden');showQuestion();
}
function closeQuiz(){
 clearTimeout(state.quizTimer);state.quiz=false;state.lock=false;$('quiz').classList.add('hidden');state.keys.clear();renderer.domElement.focus();
}
function check(){
 if(!state.quiz||state.lock)return;
 const raw=$('answer').value.trim();
 if(raw===''||!Number.isFinite(Number(raw))){$('feedback').textContent='Bitte zuerst eine Zahl eingeben!';return}
 state.lock=true;
 $('check').disabled=true;$('answer').disabled=true;
 const ok=Number(raw)===state.question.answer;
 const prevLevel=currentLevel();
 if(ok){
  strength+=10;coins+=5;correct++;state.celebrate=1.25;
  $('feedback').textContent='✅ Richtig! +10 Stärke · +5 Münzen';
  $('feedback').classList.remove('wrong');toast('💪 +10 STÄRKE!');
 }else{
  strength=Math.max(0,strength-5);wrong++;state.shake=.45;
  $('feedback').textContent='❌ Leider falsch. Richtig ist '+state.question.answer+'. −5 Stärke';
  $('feedback').classList.add('wrong');toast('−5 STÄRKE');
 }
 updateStats();save();
 const leveled=currentLevel()>prevLevel;
 if(leveled)toast('⭐ LEVEL '+currentLevel()+' ERREICHT!');
 state.quizTimer=setTimeout(()=>{if(state.quiz)showQuestion()},leveled?1600:1250);
}
$('check').addEventListener('click',check);
$('answer').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check()}if(e.key==='Escape'){e.preventDefault();closeQuiz()}});
$('leaveQuiz').addEventListener('click',closeQuiz);
$('startBtn').addEventListener('click',begin);
$('pauseBtn').addEventListener('click',()=>{if(state.quiz)return;if(state.paused)resume();else pause()});
$('resume').addEventListener('click',resume);
$('helpReset').addEventListener('click',()=>{if(confirm('Deinen gesamten Gym-Fortschritt wirklich löschen?')){strength=10;coins=0;correct=0;wrong=0;save();updateStats();toast('Neuer Spielstand!');resume()}});
$('full').addEventListener('click',()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.()});
window.addEventListener('keydown',e=>{
 if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)&&!state.quiz)e.preventDefault();
 if(e.code==='Escape'){
  if(state.quiz){closeQuiz();return}
  if(state.playing){if(state.paused)resume();else pause()}return;
 }
 if(state.quiz||!state.playing||state.paused)return;
 state.keys.add(e.code);
 if(e.code==='KeyE'&&!e.repeat)openQuiz();
});
window.addEventListener('keyup',e=>state.keys.delete(e.code));
window.addEventListener('blur',()=>state.keys.clear());
const cv=renderer.domElement;
cv.addEventListener('pointerdown',e=>{state.drag=true;state.px=e.clientX;state.py=e.clientY;cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointerup',()=>state.drag=false);
cv.addEventListener('pointercancel',()=>state.drag=false);
cv.addEventListener('pointermove',e=>{if(!state.drag||!state.playing||state.quiz||state.paused)return;
 state.yaw+=(e.clientX-state.px)*.006;
 state.pitch=Math.max(.08,Math.min(.93,state.pitch+(e.clientY-state.py)*.004));
 state.px=e.clientX;state.py=e.clientY;
});
cv.addEventListener('wheel',e=>{e.preventDefault();state.dist=Math.max(3.8,Math.min(10.8,state.dist+Math.sign(e.deltaY)*.55))},{passive:false});
function collide(x,z){
 if(Math.abs(x)>15.4||Math.abs(z)>12.35)return true;
 // Reception near back center.
 if(Math.abs(x)<2.8&&z<-9.7)return true;
 for(const station of stations){
 const dx=x-station.x,dz=z-station.z;
 // Large machines block only their physical core, not their interactive ring.
 if(Math.abs(dx)<1.65&&Math.abs(dz)<1.5)return true;
 }
 return false;
}
const clock=new T.Clock();let nearestLast=null;
function step(dt){
 if(!state.playing||state.paused||state.quiz){state.steps*=Math.max(0,1-dt*7);return}
 if(state.keys.has('ArrowLeft'))state.yaw+=dt*1.8;
 if(state.keys.has('ArrowRight'))state.yaw-=dt*1.8;
 if(state.keys.has('ArrowUp'))state.pitch=Math.min(.9,state.pitch+dt*.7);
 if(state.keys.has('ArrowDown'))state.pitch=Math.max(.08,state.pitch-dt*.7);
 const ix=(state.keys.has('KeyD')?1:0)-(state.keys.has('KeyA')?1:0);
 const iz=(state.keys.has('KeyS')?1:0)-(state.keys.has('KeyW')?1:0);
 const len=Math.hypot(ix,iz);
 if(len){
  const vx=(Math.cos(state.yaw)*ix+Math.sin(state.yaw)*iz)/len;
  const vz=(-Math.sin(state.yaw)*ix+Math.cos(state.yaw)*iz)/len;
  const speed=state.keys.has('ShiftLeft')||state.keys.has('ShiftRight')?8.0:4.7;
  const nx=player.position.x+vx*speed*dt,nz=player.position.z+vz*speed*dt;
  if(!collide(nx,player.position.z))player.position.x=nx;
  if(!collide(player.position.x,nz))player.position.z=nz;
  const a=Math.atan2(-vx,-vz);let diff=Math.atan2(Math.sin(a-player.rotation.y),Math.cos(a-player.rotation.y));
  player.rotation.y+=diff*Math.min(1,dt*13);
  state.steps+=dt*(speed>5?13:9);
 }else state.steps*=Math.max(0,1-dt*8);
 // Stations can be used from outside equipment bounds.
 const nearest=stations.map(s=>({s,d:Math.hypot(player.position.x-s.x,player.position.z-s.z)})).sort((a,b)=>a.d-b.d)[0];
 state.nearest=nearest.d<3.8?nearest.s:null;
 if(state.nearest!==nearestLast){
  nearestLast=state.nearest;
  $('prompt').style.display=state.nearest?'block':'none';
  if(state.nearest)$('prompt').innerHTML='Drücke <strong>E</strong> für '+state.nearest.title+'<small>'+state.nearest.subtitle+' · richtig +10 / falsch −5</small>';
 }
 const moving=len>0;
 const stride=Math.sin(state.steps)*Math.min(1,len);
 const relax=state.celebrate>0?Math.sin((1.25-state.celebrate)*13):0;
 for(const leg of legGroups)leg.pivot.rotation.x=moving?leg.s*stride*.6:0;
 for(const arm of armGroups)arm.pivot.rotation.x=moving?-arm.s*stride*.45:relax*.6;
 playerVisual.position.y=moving?Math.abs(Math.sin(state.steps))*.045:Math.sin(state.t*2)*.014;
 playerVisual.rotation.z=state.shake>0?Math.sin(state.t*55)*.08:0;
}
function renderFrame(){
 const dt=Math.min(clock.getDelta(),.05);
 state.t+=dt;
 state.shake=Math.max(0,state.shake-dt);
 state.celebrate=Math.max(0,state.celebrate-dt);
 step(dt);
 for(const s of stations){s.marker.position.y=2.75+Math.sin(state.t*2.8+s.x)*.17;s.ring.rotation.z=state.t*.23;if(s===state.nearest)s.ring.scale.setScalar(1.12+Math.sin(state.t*5)*.06);else s.ring.scale.setScalar(1)}
 const focus=new T.Vector3(player.position.x,1.55,player.position.z);
 const horizontal=state.dist*Math.cos(state.pitch);
 const desired=new T.Vector3(
   player.position.x+Math.sin(state.yaw)*horizontal,
   1.55+Math.sin(state.pitch)*state.dist,
   player.position.z+Math.cos(state.yaw)*horizontal
 );
 // Limit camera to gym bounds, so it stays inside the building.
 desired.x=Math.max(-15.6,Math.min(15.6,desired.x));
 desired.z=Math.max(-12.6,Math.min(12.6,desired.z));
 desired.y=Math.max(1.3,Math.min(6.55,desired.y));
 camera.position.lerp(desired,1-Math.exp(-dt*9));
 camera.lookAt(focus);
 renderer.render(scene,camera);
 requestAnimationFrame(renderFrame);
}
window.addEventListener('resize',()=>{
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);
});
$('loadmsg').textContent='Bereit! Jetzt kannst du dein Gym betreten.';
camera.position.set(0,5,14);
requestAnimationFrame(renderFrame);