(function(){
"use strict";

const canvas=document.getElementById("game");
const ctx=canvas.getContext("2d");
const W=canvas.width,H=canvas.height;

const ui={
  score:document.getElementById("score"),
  time:document.getElementById("time"),
  hp:document.getElementById("hp"),
  combo:document.getElementById("combo"),
  power:document.getElementById("power"),
  superFill:document.getElementById("superFill"),
  best:document.getElementById("best"),
  overlay:document.getElementById("overlay"),
  tag:document.getElementById("tag"),
  title:document.getElementById("title"),
  text:document.getElementById("text"),
  start:document.getElementById("startBtn"),
  fire:document.getElementById("fireBtn"),
  superBtn:document.getElementById("superBtn"),
  soundBtn:document.getElementById("soundBtn"),
  pauseBtn:document.getElementById("pauseBtn"),
  pauseStamp:document.getElementById("pauseStamp"),
  bossHud:document.getElementById("bossHud"),
  bossFill:document.getElementById("bossFill"),
  phaseLabel:document.getElementById("phaseLabel")
};

const safeStore={
  get(k,fallback){try{const v=localStorage.getItem(k);return v===null?fallback:v}catch(_){return fallback}},
  set(k,v){try{localStorage.setItem(k,String(v))}catch(_){}}
};

let best=Number(safeStore.get("sergeySplashBest",0))||0;
ui.best.textContent=best;

let running=false,paused=false,last=0,elapsed=0,countdown=0,spawnCd=0,score=0,combo=0;
let bossSpawned=false,shootHeld=false,shake=0,flash=0,phaseKey="",killsSinceDrop=0,totalKills=0,rescueUsed=false;
let soundOn=safeStore.get("sergeySplashSound","1")!=="0";
let audioCtx=null;

const keys={},touch=new Set(),gestureTouch=new Set(),enemies=[],shots=[],enemyShots=[],particles=[],pickups=[],floaters=[],rings=[];
const p={x:W/2,y:H/2,r:22,speed:292,hp:5,maxHp:5,inv:0,fireCd:0,rapid:0,shield:0,mega:0,super:0};

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rand(a,b){return a+Math.random()*(b-a)}
function dist2(a,b){const dx=a.x-b.x,dy=a.y-b.y;return dx*dx+dy*dy}
function circleHit(a,b){const r=(a.r||0)+(b.r||0);return dist2(a,b)<r*r}
function nowPhase(){
  if(elapsed<18)return {key:"warm",name:"Warm-up",spawn:.82,cap:15};
  if(elapsed<38)return {key:"rush",name:"Robot-Rush",spawn:.62,cap:19};
  return {key:"final",name:"Finale",spawn:.45,cap:23};
}
function comboMult(){return Math.max(1,Math.min(3,1+Math.floor(combo/10)))}
function vibrate(ms){try{if(navigator.vibrate)navigator.vibrate(ms)}catch(_){}}

function ensureAudio(){
  if(!soundOn)return null;
  try{
    if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==="suspended")audioCtx.resume();
    return audioCtx;
  }catch(_){return null}
}
function tone(freq=440,dur=.05,type="sine",gain=.025){
  const a=ensureAudio();if(!a)return;
  try{
    const o=a.createOscillator(),g=a.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,a.currentTime);
    g.gain.setValueAtTime(gain,a.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+dur);
    o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+dur);
  }catch(_){}
}
function sfx(kind){
  if(kind==="shoot")tone(620,.035,"sine",.014);
  if(kind==="hit")tone(250,.045,"triangle",.018);
  if(kind==="pickup"){tone(760,.07,"sine",.03);setTimeout(()=>tone(980,.08,"sine",.025),35)}
  if(kind==="hurt")tone(120,.12,"sawtooth",.028);
  if(kind==="boss")tone(90,.25,"square",.025);
  if(kind==="super"){tone(210,.18,"sine",.04);setTimeout(()=>tone(520,.22,"sine",.035),70)}
}

function reset(){
  elapsed=0;countdown=2.6;spawnCd=.45;score=0;combo=0;bossSpawned=false;shootHeld=false;shake=0;flash=0;
  phaseKey="";killsSinceDrop=0;totalKills=0;rescueUsed=false;
  enemies.length=shots.length=enemyShots.length=particles.length=pickups.length=floaters.length=rings.length=0;
  Object.assign(p,{x:W/2,y:H/2,hp:5,inv:0,fireCd:0,rapid:0,shield:0,mega:0,super:0});
  paused=false;ui.pauseStamp.classList.add("hidden");ui.pauseBtn.textContent="⏸";
  ui.bossHud.classList.add("hidden");
  announce("BEREIT?", "#ffffff", 1.0);
  updateUI();
}

function start(){
  ensureAudio();reset();running=true;last=performance.now();
  ui.overlay.classList.add("hidden");
  requestAnimationFrame(loop);
}

function finish(reason){
  running=false;shootHeld=false;
  const previousBest=best;
  if(score>best){best=score;safeStore.set("sergeySplashBest",best);ui.best.textContent=best}
  const isNew=score>previousBest;
  const rating=score>=14000?"★★★":score>=7000?"★★☆":"★☆☆";
  ui.tag.textContent=isNew?"NEUER BESTWERT!":"RUNDE BEENDET";
  ui.title.textContent=reason==="hp"?"Sergey macht eine Splash-Pause!":"60 Sekunden geschafft!";
  ui.text.textContent="Punkte: "+score+" · Treffer-Serie: ×"+comboMult()+" · Wertung "+rating+". "+(isNew?"Das ist dein neuer Rekord!":"Noch eine Runde für den nächsten Rekord?");
  ui.start.textContent="NOCHMAL SPIELEN";
  ui.overlay.classList.remove("hidden");
  ui.pauseStamp.classList.add("hidden");
  ui.bossHud.classList.add("hidden");
}

function togglePause(force){
  if(!running)return;
  paused=typeof force==="boolean"?force:!paused;
  ui.pauseStamp.classList.toggle("hidden",!paused);
  ui.pauseBtn.textContent=paused?"▶":"⏸";
  if(!paused)last=performance.now();
}

function updateUI(){
  ui.score.textContent=score;
  ui.time.textContent=Math.max(0,Math.ceil(60-elapsed));
  ui.hp.textContent="★".repeat(Math.max(0,p.hp))+"☆".repeat(Math.max(0,p.maxHp-p.hp));
  ui.combo.textContent="×"+comboMult();
  const pct=Math.round(p.super);
  ui.power.textContent=pct+"%";
  ui.superFill.style.width=pct+"%";
  ui.superBtn.disabled=p.super<100||!running||paused||countdown>0;
  const ph=nowPhase();ui.phaseLabel.textContent=ph.name;
  const boss=enemies.find(e=>e.type==="boss");
  if(boss){
    ui.bossHud.classList.remove("hidden");
    ui.bossFill.style.width=(100*boss.hp/boss.maxHp)+"%";
  }else ui.bossHud.classList.add("hidden");
}

function announce(text,color="#ffffff",life=1.1){
  floaters.push({x:W/2,y:H*.22,text,color,life,max:life,size:34,center:true});
}
function floater(x,y,text,color="#ffffff",size=19){
  floaters.push({x,y,text,color,life:.85,max:.85,size,center:false});
}

function spawnEnemy(forceBoss=false){
  if(!forceBoss&&enemies.length>=nowPhase().cap)return false;
  let type="slime",r=18,hp=1,speed=rand(62,88),value=45;
  if(forceBoss){type="boss";r=48;hp=24;speed=47;value=800}
  else{
    const roll=Math.random();
    if(elapsed>42&&roll<.15){type="tank";r=28;hp=4;speed=48;value=120}
    else if(elapsed>34&&roll<.38){type="bouncer";r=17;hp=1;speed=rand(112,142);value=90}
    else if(elapsed>17&&roll<.68){type="bot";r=23;hp=2;speed=rand(60,83);value=70}
  }

  const side=Math.floor(Math.random()*4);let x,y;
  if(side===0){x=-r-8;y=rand(45,H-45)}
  if(side===1){x=W+r+8;y=rand(45,H-45)}
  if(side===2){x=rand(45,W-45);y=-r-8}
  if(side===3){x=rand(45,W-45);y=H+r+8}
  enemies.push({x,y,r,hp,maxHp:hp,speed,type,value,wobble:rand(0,Math.PI*2),flash:0,stun:0,attackCd:rand(1.4,3.0)});
  return true;
}

function nearestEnemy(){
  let target=null,bestD=Infinity;
  for(const e of enemies){
    const d=dist2(p,e);
    if(d<bestD){bestD=d;target=e}
  }
  return target;
}

function shoot(){
  if(!running||paused||countdown>0||p.fireCd>0)return;
  const t=nearestEnemy();let dx=1,dy=0;
  if(t){dx=t.x-p.x;dy=t.y-p.y;const d=Math.hypot(dx,dy)||1;dx/=d;dy/=d}
  const mega=p.mega>0;
  shots.push({
    x:p.x+dx*29,y:p.y+dy*29,r:mega?12:7,
    vx:dx*(mega?505:590),vy:dy*(mega?505:590),
    life:1.25,dmg:mega?2:1,pierce:mega?2:0,trail:mega
  });
  p.fireCd=p.rapid>0?.095:.205;
  burst(p.x+dx*28,p.y+dy*28,"#b7f6ff",mega?5:3,90);
  sfx("shoot");
}

function useSuper(){
  if(!running||paused||countdown>0||p.super<100)return;
  p.super=0;shake=Math.max(shake,10);flash=.22;enemyShots.length=0;
  rings.push({x:p.x,y:p.y,r:12,life:.55,max:.55});
  let hits=0;
  for(const e of enemies){
    const damage=e.type==="boss"?5:4;
    e.hp-=damage;e.flash=.28;hits++;
  }
  for(let i=enemies.length-1;i>=0;i--){
    if(enemies[i].hp<=0){killEnemy(enemies[i],true);enemies.splice(i,1)}
  }
  burst(p.x,p.y,"#aef6ff",42,320);
  floater(p.x,p.y-48,"SUPER SPLASH!","#ffe36c",28);
  score+=hits*15;combo+=Math.min(4,hits);
  sfx("super");vibrate(45);updateUI();
}

function shootBubble(e,count=1){
  if(enemyShots.length>=28)return;
  const base=Math.atan2(p.y-e.y,p.x-e.x);
  for(let i=0;i<count;i++){
    const spread=count===1?0:(i-(count-1)/2)*.22;
    const a=base+spread;
    const speed=e.type==="boss"?170:e.type==="tank"?125:145;
    const r=e.type==="boss"?12:e.type==="tank"?13:9;
    enemyShots.push({x:e.x,y:e.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r,life:5,type:e.type});
  }
  burst(e.x,e.y,"#ffd78a",4,65);
}

function hurtPlayer(label="AUTSCH!"){
  if(p.inv>0)return false;
  p.hp--;p.inv=1.65;combo=0;shake=9;flash=.18;
  burst(p.x,p.y,"#ff8b92",22,210);floater(p.x,p.y-38,label,"#ff8b92",22);
  repelEnemies();sfx("hurt");vibrate(45);
  if(p.hp===2&&!rescueUsed){
    rescueUsed=true;
    dropPickup(clamp(p.x+65,35,W-35),clamp(p.y-35,45,H-35),true);
    floater(p.x,p.y+48,"NOTFALL-SCHILD!","#87efff",15);
  }
  if(p.hp<=0){updateUI();finish("hp")}
  return true;
}

function burst(x,y,color,n,speed){
  const room=Math.max(0,220-particles.length);
  n=Math.min(n,room);
  for(let i=0;i<n;i++){
    const a=rand(0,Math.PI*2),s=rand(speed*.25,speed);
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.25,.65),max:.65,r:rand(2,6),color});
  }
}

function dropPickup(x,y,forced=false){
  const r=Math.random();let type;
  if(forced&&p.hp<3)type="shield";
  else type=r<.28?"star":r<.52?"rapid":r<.75?"shield":"mega";
  pickups.push({x,y,r:15,type,life:11,bob:rand(0,Math.PI*2)});
  killsSinceDrop=0;
}

function killEnemy(e,fromSuper=false){
  const mult=comboMult();
  const gain=e.value*mult;
  score+=gain;if(!fromSuper)combo++;totalKills++;killsSinceDrop++;
  if(!fromSuper)p.super=clamp(p.super+(e.type==="boss"?35:e.type==="tank"?11:7),0,100);
  burst(e.x,e.y,e.type==="boss"?"#ffe36c":"#78f2aa",e.type==="boss"?42:12,e.type==="boss"?270:155);
  floater(e.x,e.y-8,"+"+gain,e.type==="boss"?"#ffe36c":"#ffffff",e.type==="boss"?24:16);
  if(e.type==="boss"){
    dropPickup(e.x,e.y,true);dropPickup(e.x+34,e.y+12);score+=500;
    announce("BOSS GESPLASHT!","#ffe36c",1.45);shake=Math.max(shake,12);sfx("pickup");
  }else if(killsSinceDrop>=6||Math.random()<.17)dropPickup(e.x,e.y);
  if(!fromSuper)sfx("hit");
}

function collect(u){
  if(u.type==="star"){score+=180;p.super=clamp(p.super+12,0,100);floater(u.x,u.y,"+180 ★","#ffe36c")}
  if(u.type==="rapid"){p.rapid=Math.max(p.rapid,8);floater(u.x,u.y,"TURBO!","#ffb765")}
  if(u.type==="shield"){p.shield=Math.max(p.shield,9);if(p.hp<5)p.hp++;floater(u.x,u.y,"SCHILD!","#87efff")}
  if(u.type==="mega"){p.mega=Math.max(p.mega,7);floater(u.x,u.y,"MEGA!","#f8a2ff")}
  burst(u.x,u.y,"#ffe36c",16,165);sfx("pickup");vibrate(18);
}

function inputVector(){
  let x=0,y=0;
  if(keys.ArrowLeft||keys.a||keys.A||touch.has("left")||gestureTouch.has("left"))x--;
  if(keys.ArrowRight||keys.d||keys.D||touch.has("right")||gestureTouch.has("right"))x++;
  if(keys.ArrowUp||keys.w||keys.W||touch.has("up")||gestureTouch.has("up"))y--;
  if(keys.ArrowDown||keys.s||keys.S||touch.has("down")||gestureTouch.has("down"))y++;
  const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};
}

function repelEnemies(){
  for(const e of enemies){
    let dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;
    if(d<150){
      const push=145-d*.45;
      e.x+=dx/d*push;e.y+=dy/d*push;e.stun=Math.max(e.stun,.55);
    }
  }
}

function update(dt){
  if(countdown>0){
    countdown-=dt;
    if(countdown<=0){countdown=0;announce("LOS!","#7ff0ff",.8);tone(780,.08,"sine",.03)}
    updateUI();return;
  }

  elapsed+=dt;
  if(elapsed>=60){elapsed=60;updateUI();finish("time");return}

  const ph=nowPhase();
  if(ph.key!==phaseKey){
    phaseKey=ph.key;
    if(ph.key==="rush")announce("ROBOT-RUSH!","#c7a7ff",1.15);
    if(ph.key==="final")announce("FINALE!","#ffe36c",1.15);
  }

  p.inv=Math.max(0,p.inv-dt);p.fireCd=Math.max(0,p.fireCd-dt);
  p.rapid=Math.max(0,p.rapid-dt);p.shield=Math.max(0,p.shield-dt);p.mega=Math.max(0,p.mega-dt);

  const v=inputVector();
  p.x=clamp(p.x+v.x*p.speed*dt,30,W-30);
  p.y=clamp(p.y+v.y*p.speed*dt,42,H-30);
  if(shootHeld||keys[" "]||keys.Spacebar)shoot();

  if(!bossSpawned&&elapsed>=30){
    bossSpawned=true;spawnEnemy(true);spawnCd=1.1;
    announce("MEGA-BOT!","#ffe36c",1.5);shake=7;sfx("boss");vibrate(35);
  }

  spawnCd-=dt;
  if(spawnCd<=0){
    if(spawnEnemy(false))spawnCd=rand(ph.spawn*.72,ph.spawn*1.28);
    else spawnCd=.22;
  }

  for(let i=shots.length-1;i>=0;i--){
    const s=shots[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
    if(s.trail&&Math.random()<.55)particles.push({x:s.x,y:s.y,vx:rand(-20,20),vy:rand(-20,20),life:.22,max:.22,r:rand(2,4),color:"#c7f8ff"});
    if(s.life<=0||s.x<-40||s.x>W+40||s.y<-40||s.y>H+40){shots.splice(i,1);continue}
    let remove=false;
    for(let j=enemies.length-1;j>=0;j--){
      const e=enemies[j];
      if(circleHit(s,e)){
        e.hp-=s.dmg;e.flash=.11;burst(s.x,s.y,"#c4f8ff",4,95);
        if(e.hp<=0){killEnemy(e);enemies.splice(j,1)}
        if(s.pierce>0){s.pierce--;s.dmg=Math.max(1,s.dmg-1)}
        else remove=true;
        break;
      }
    }
    if(remove)shots.splice(i,1);
  }

  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    e.flash=Math.max(0,e.flash-dt);e.stun=Math.max(0,e.stun-dt);e.wobble+=dt*4;
    if(e.stun<=0){
      let dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;dx/=d;dy/=d;
      let wobble=.10;
      if(e.type==="bouncer")wobble=.62;
      if(e.type==="tank")wobble=.04;
      const w=Math.sin(e.wobble)*wobble;
      e.x+=(dx-w*dy)*e.speed*dt;e.y+=(dy+w*dx)*e.speed*dt;

      if(e.type==="bot"||e.type==="tank"||e.type==="boss"){
        e.attackCd-=dt;
        const onScreen=e.x>20&&e.x<W-20&&e.y>20&&e.y<H-20;
        if(onScreen&&e.attackCd<=0){
          shootBubble(e,e.type==="boss"?3:1);
          e.attackCd=e.type==="boss"?rand(1.45,1.9):e.type==="tank"?rand(2.6,3.4):rand(2.2,3.0);
        }
      }
    }

    if(circleHit(p,e)){
      if(p.shield>0){
        score+=35;combo++;p.super=clamp(p.super+4,0,100);
        burst(e.x,e.y,"#8cecff",13,185);floater(e.x,e.y,"BLOCK!","#8cecff",15);
        if(e.type==="boss"){e.hp-=2;e.stun=.55;e.x+=(e.x-p.x)*.6;e.y+=(e.y-p.y)*.6}
        else enemies.splice(i,1);
        continue;
      }
      if(p.inv<=0){
        hurtPlayer("AUTSCH!");
        if(!running)return;
      }
    }
  }

  for(let i=enemyShots.length-1;i>=0;i--){
    const b=enemyShots[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    if(b.life<=0||b.x<-30||b.x>W+30||b.y<-30||b.y>H+30){enemyShots.splice(i,1);continue}
    if(circleHit(p,b)){
      if(p.shield>0){
        score+=10;burst(b.x,b.y,"#8cecff",8,120);enemyShots.splice(i,1);continue;
      }
      enemyShots.splice(i,1);
      if(p.inv<=0){
        hurtPlayer("PLATSCH!");
        if(!running)return;
      }
    }
  }

  for(let i=pickups.length-1;i>=0;i--){
    const u=pickups[i];u.life-=dt;u.bob+=dt*4;
    if(u.life<=0){pickups.splice(i,1);continue}
    let dx=p.x-u.x,dy=p.y-u.y,d=Math.hypot(dx,dy)||1;
    if(d<120){const pull=(125-d)*3.5;u.x+=dx/d*pull*dt;u.y+=dy/d*pull*dt}
    if(circleHit(p,u)||d<30){collect(u);pickups.splice(i,1)}
  }

  for(let i=particles.length-1;i>=0;i--){
    const q=particles[i];q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.982;q.vy*=.982;q.life-=dt;
    if(q.life<=0)particles.splice(i,1);
  }
  for(let i=floaters.length-1;i>=0;i--){
    const f=floaters[i];f.life-=dt;if(!f.center)f.y-=25*dt;if(f.life<=0)floaters.splice(i,1);
  }
  for(let i=rings.length-1;i>=0;i--){
    const r=rings[i];r.life-=dt;r.r+=520*dt;if(r.life<=0)rings.splice(i,1);
  }
  shake=Math.max(0,shake-24*dt);flash=Math.max(0,flash-dt);
  updateUI();
}

function roundedPath(x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}
function roundedFill(x,y,w,h,r,fill){roundedPath(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill()}

function drawArena(){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"#1b607d");g.addColorStop(.55,"#12445f");g.addColorStop(1,"#0a2b42");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

  ctx.save();
  ctx.globalAlpha=.13;ctx.strokeStyle="#bdf5ff";ctx.lineWidth=2;
  for(let x=24;x<W;x+=72){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
  for(let y=28;y<H;y+=72){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
  ctx.restore();

  const t=elapsed+performance.now()/7000;
  for(let i=0;i<9;i++){
    const x=(80+i*118)%W,y=76+(i%3)*170;
    ctx.fillStyle=i%2?"#6defff10":"#ffffff0b";
    ctx.beginPath();ctx.ellipse(x+Math.sin(t+i)*12,y,38,18,0,0,Math.PI*2);ctx.fill();
  }

  ctx.save();ctx.globalAlpha=.18;ctx.strokeStyle="#8cf0ff";ctx.lineWidth=4;
  ctx.beginPath();ctx.arc(W*.15,H*.82,75,Math.PI*1.1,Math.PI*1.9);ctx.stroke();
  ctx.beginPath();ctx.arc(W*.82,H*.18,95,.1,1.05);ctx.stroke();ctx.restore();

  const vignette=ctx.createRadialGradient(W/2,H/2,130,W/2,H/2,590);
  vignette.addColorStop(.55,"#00000000");vignette.addColorStop(1,"#00000055");
  ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
}

function drawTarget(t){
  if(!t)return;
  ctx.save();ctx.translate(t.x,t.y);ctx.strokeStyle="#e4fbff";ctx.globalAlpha=.55+.18*Math.sin(performance.now()/110);
  ctx.lineWidth=2;ctx.setLineDash([6,7]);ctx.beginPath();ctx.arc(0,0,t.r+10,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.moveTo(-t.r-15,0);ctx.lineTo(-t.r-6,0);ctx.moveTo(t.r+6,0);ctx.lineTo(t.r+15,0);ctx.stroke();ctx.restore();
}

function drawPlayer(){
  ctx.save();ctx.translate(p.x,p.y);
  if(p.inv>0&&Math.floor(p.inv*13)%2===0)ctx.globalAlpha=.35;
  ctx.fillStyle="#07131f55";ctx.beginPath();ctx.ellipse(0,23,29,11,0,0,Math.PI*2);ctx.fill();

  if(p.shield>0){
    ctx.strokeStyle="#83eeff";ctx.lineWidth=5;ctx.globalAlpha=.52+.22*Math.sin(performance.now()/100);
    ctx.beginPath();ctx.arc(0,0,36,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  }

  const t=nearestEnemy();let a=0;if(t)a=Math.atan2(t.y-p.y,t.x-p.x);ctx.rotate(a);
  roundedFill(-28,-12,17,28,7,"#1b90b5");ctx.fillStyle="#bdf8ff";ctx.fillRect(-24,-7,9,4);
  ctx.fillStyle="#ff8b43";ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#ffd8b6";ctx.beginPath();ctx.arc(4,-8,13,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#17283a";ctx.beginPath();ctx.arc(9,-10,2.2,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#2a4660";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-13,12);ctx.lineTo(-17,24);ctx.moveTo(8,16);ctx.lineTo(12,26);ctx.stroke();
  roundedFill(13,-7,27,14,6,p.mega>0?"#f3a0ff":"#55dff7");roundedFill(32,-4,16,8,4,"#dffcff");
  ctx.fillStyle="#fff";ctx.font="1000 13px system-ui";ctx.textAlign="center";ctx.fillText("S",-6,11);ctx.restore();
}

function drawEnemy(e){
  ctx.save();ctx.translate(e.x,e.y);
  ctx.fillStyle="#06131f55";ctx.beginPath();ctx.ellipse(0,e.r*.7,e.r*.82,e.r*.3,0,0,Math.PI*2);ctx.fill();
  if(e.flash>0)ctx.globalAlpha=.5;

  if(e.type==="slime"){
    ctx.fillStyle="#72f0a0";ctx.beginPath();ctx.arc(0,4,e.r,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#173044";ctx.beginPath();ctx.arc(-6,0,3,0,Math.PI*2);ctx.arc(6,0,3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#173044";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,4,7,.2,2.95);ctx.stroke();
  }else if(e.type==="bouncer"){
    ctx.rotate(Math.sin(e.wobble)*.2);ctx.fillStyle="#ff9d62";roundedFill(-e.r,-e.r,e.r*2,e.r*2,7,ctx.fillStyle);
    ctx.fillStyle="#fff1d7";ctx.beginPath();ctx.arc(-6,-3,4,0,Math.PI*2);ctx.arc(6,-3,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#572516";ctx.beginPath();ctx.arc(-6,-3,2,0,Math.PI*2);ctx.arc(6,-3,2,0,Math.PI*2);ctx.fill();
  }else{
    const boss=e.type==="boss",tank=e.type==="tank";
    ctx.fillStyle=boss?"#ffd75b":tank?"#59d1c7":"#a98cff";
    roundedFill(-e.r,-e.r*.72,e.r*2,e.r*1.44,boss?13:9,ctx.fillStyle);
    ctx.fillStyle="#15283b";ctx.fillRect(-e.r*.58,-e.r*.17,e.r*1.16,e.r*.38);
    ctx.fillStyle=boss?"#ff765f":"#8cecff";ctx.beginPath();ctx.arc(-e.r*.25,0,e.r*.1,0,Math.PI*2);ctx.arc(e.r*.25,0,e.r*.1,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=boss?6:4;ctx.beginPath();ctx.moveTo(-e.r*.68,-e.r*.68);ctx.lineTo(-e.r*.88,-e.r*.98);ctx.moveTo(e.r*.68,-e.r*.68);ctx.lineTo(e.r*.88,-e.r*.98);ctx.stroke();
    if(tank){ctx.fillStyle="#d7fff6";ctx.fillRect(-e.r*.55,e.r*.48,e.r*1.1,5)}
  }
  ctx.restore();
}

function drawPickup(u){
  ctx.save();ctx.translate(u.x,u.y+Math.sin(u.bob)*4);
  const color=u.type==="star"?"#ffd75b":u.type==="rapid"?"#ffae61":u.type==="shield"?"#83eeff":"#f39eff";
  ctx.fillStyle=color;ctx.shadowBlur=18;ctx.shadowColor=color;ctx.beginPath();ctx.arc(0,0,u.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle="#102236";ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="1000 15px system-ui";
  ctx.fillText(u.type==="star"?"★":u.type==="rapid"?"⚡":u.type==="shield"?"S":"M",0,1);ctx.restore();
}

function drawFloaters(){
  for(const f of floaters){
    ctx.save();ctx.globalAlpha=clamp(f.life/f.max,0,1);ctx.fillStyle=f.color;ctx.font="1000 "+f.size+"px system-ui";
    ctx.textAlign="center";ctx.shadowBlur=8;ctx.shadowColor="#0009";ctx.fillText(f.text,f.x,f.y);ctx.restore();
  }
}
function render(){
  ctx.save();
  if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));
  drawArena();

  const target=nearestEnemy();
  if(target){
    ctx.save();ctx.globalAlpha=.16;ctx.strokeStyle="#d8fbff";ctx.lineWidth=1.5;ctx.setLineDash([5,9]);
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(target.x,target.y);ctx.stroke();ctx.restore();
    drawTarget(target);
  }

  for(const u of pickups)drawPickup(u);
  for(const e of enemies)drawEnemy(e);

  for(const b of enemyShots){
    ctx.save();ctx.globalAlpha=.9;
    const g=ctx.createRadialGradient(b.x-3,b.y-3,1,b.x,b.y,b.r*1.25);
    g.addColorStop(0,"#fff7cf");g.addColorStop(.35,"#ffd779");g.addColorStop(.72,"#ff9e7a99");g.addColorStop(1,"#ff7f6a00");
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,b.y,b.r*1.3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#fff5c7aa";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.stroke();ctx.restore();
  }

  for(const s of shots){
    const g=ctx.createRadialGradient(s.x,s.y,1,s.x,s.y,s.r*1.6);g.addColorStop(0,"#ffffff");g.addColorStop(.35,"#c9faff");g.addColorStop(1,"#47d8ff00");
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(s.x,s.y,s.r*1.6,0,Math.PI*2);ctx.fill();
  }
  for(const q of particles){
    ctx.globalAlpha=clamp(q.life/q.max,0,1);ctx.fillStyle=q.color;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  for(const r of rings){
    ctx.save();ctx.globalAlpha=clamp(r.life/r.max,0,1);ctx.strokeStyle="#bdf8ff";ctx.lineWidth=10;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  drawPlayer();drawFloaters();

  if(countdown>0){
    const n=Math.ceil(countdown);
    ctx.fillStyle="#06132199";ctx.fillRect(0,0,W,H);ctx.fillStyle=n===1?"#7ff0ff":"#ffffff";
    ctx.font="1000 92px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(n),W/2,H/2);
  }
  if(flash>0){ctx.globalAlpha=clamp(flash*2.8,0,.45);ctx.fillStyle="#ffffff";ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}
  ctx.restore();
}

function loop(now){
  if(!running)return;
  const dt=Math.min(.033,(now-last)/1000||0);last=now;
  if(!paused)update(dt);
  render();
  if(running)requestAnimationFrame(loop);
}

function key(e,down){
  keys[e.key]=down;
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Enter"].includes(e.key))e.preventDefault();
  if(down&&!e.repeat){
    if(e.key===" ")shoot();
    if(e.key==="Enter"||e.key==="e"||e.key==="E")useSuper();
    if(e.key==="p"||e.key==="P")togglePause();
  }
}

addEventListener("keydown",e=>key(e,true),{passive:false});
addEventListener("keyup",e=>key(e,false),{passive:false});

document.querySelectorAll(".move").forEach(btn=>{
  const d=btn.dataset.dir;
  const on=e=>{e.preventDefault();touch.add(d);btn.classList.add("active");try{btn.setPointerCapture(e.pointerId)}catch(_){}};
  const off=e=>{e.preventDefault();touch.delete(d);btn.classList.remove("active")};
  btn.addEventListener("pointerdown",on);btn.addEventListener("pointerup",off);btn.addEventListener("pointercancel",off);btn.addEventListener("lostpointercapture",off);
});

ui.fire.addEventListener("pointerdown",e=>{
  e.preventDefault();shootHeld=true;ui.fire.classList.add("active");shoot();try{ui.fire.setPointerCapture(e.pointerId)}catch(_){}
});
["pointerup","pointercancel","lostpointercapture"].forEach(name=>ui.fire.addEventListener(name,e=>{
  e.preventDefault();shootHeld=false;ui.fire.classList.remove("active");
}));
ui.superBtn.addEventListener("click",useSuper);
ui.start.addEventListener("click",start);
ui.pauseBtn.addEventListener("click",()=>togglePause());
ui.soundBtn.addEventListener("click",()=>{
  soundOn=!soundOn;safeStore.set("sergeySplashSound",soundOn?"1":"0");ui.soundBtn.textContent=soundOn?"🔊":"🔇";if(soundOn)ensureAudio();
});
ui.soundBtn.textContent=soundOn?"🔊":"🔇";

// Mobil/iPad: Das Spielfeld selbst wird zum virtuellen Joystick.
// Ziehen/Wischen bewegt Sergey auch diagonal; D-Pad und Tastatur bleiben aktiv.
canvas.style.touchAction="none";
canvas.style.userSelect="none";
canvas.style.webkitUserSelect="none";
let moveGesture=null;
function clearMoveGesture(){
  moveGesture=null;
  gestureTouch.clear();
}
function updateMoveGesture(e){
  if(!moveGesture || moveGesture.id!==e.pointerId)return;
  const dx=e.clientX-moveGesture.x,dy=e.clientY-moveGesture.y;
  const dead=14;
  gestureTouch.clear();
  if(Math.abs(dx)>dead)gestureTouch.add(dx<0?"left":"right");
  if(Math.abs(dy)>dead)gestureTouch.add(dy<0?"up":"down");
  if(e.cancelable)e.preventDefault();
}
canvas.addEventListener("pointerdown",e=>{
  if(!running||paused||(e.pointerType==="mouse"&&e.button!==0))return;
  moveGesture={id:e.pointerId,x:e.clientX,y:e.clientY};
  try{canvas.setPointerCapture(e.pointerId)}catch(_){}
  if(e.cancelable)e.preventDefault();
},{passive:false});
canvas.addEventListener("pointermove",updateMoveGesture,{passive:false});
canvas.addEventListener("pointerup",e=>{if(moveGesture&&moveGesture.id===e.pointerId)clearMoveGesture();if(e.cancelable)e.preventDefault()},{passive:false});
canvas.addEventListener("pointercancel",e=>{if(moveGesture&&moveGesture.id===e.pointerId)clearMoveGesture()},{passive:false});
canvas.addEventListener("lostpointercapture",()=>clearMoveGesture());
canvas.addEventListener("selectstart",e=>e.preventDefault());
canvas.addEventListener("contextmenu",e=>e.preventDefault());
document.addEventListener("visibilitychange",()=>{clearMoveGesture();if(document.hidden&&running)togglePause(true)});

window.__sergeySplashTest={
  snapshot:()=>({running,paused,elapsed,score,combo,enemies:enemies.length,shots:shots.length,enemyShots:enemyShots.length,pickups:pickups.length,hp:p.hp,super:p.super,bossSpawned}),
  start,shoot,useSuper,togglePause,
  step:(seconds)=>{const steps=Math.ceil(seconds/0.016);for(let i=0;i<steps&&running&&!paused;i++)update(Math.min(.016,seconds/steps));render()},
  setSuper:(v)=>{p.super=clamp(v,0,100);updateUI()},
  spawnBoss:()=>spawnEnemy(true),
  move:(dir,on)=>{if(on)touch.add(dir);else touch.delete(dir)}
};

updateUI();render();
})();