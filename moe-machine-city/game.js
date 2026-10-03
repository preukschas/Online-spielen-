
(()=>{
"use strict";

const $=id=>document.getElementById(id);
const KEY="moe_machine_city_demo_v07";
const SAVE_VERSION=8;

const VOCAB=[
"welcome (to)","Hello!","I'm (= I am)","the","bat","Nice to meet you.","What's your name?",
"I like","English","Hi.","My name is ...","music","And you?","sport","animal","computer","It's time to go.","See you!","yes","Bye!","Goodbye!",
"is the colour of your","you look so fine","I like you","England","Greenwich","hair","skirt","top","cap","come with me","a colour mix","shoe","hat","shirt","dress",
"zero","one","two","three","four","five","six","seven","eight","nine","ten","go in","a","park","colour","activity","number","people","dog","tennis","boy",
"I spy with my little eye ...","something","it's (= it is)","here","bus","I can play football.","I can buy ...","red","green","blue","yellow","black","grey","brown","white","orange","purple","pink",
"I'm from ...","from","this","my","bike","cool","fan","eleven","How old are you?","that's (= that is)","England","Where are you from?","pet","they're (= they are)","nice","twelve","cat","photo","Germany",
"dad / father","mum / mother","parents","sister","brother","aunt","uncle","grandmother","grandfather"
];

const SCENE_WORDS={
  1:["welcome (to)","Hello!","I'm (= I am)","the","Nice to meet you.","What's your name?","computer","yes","Hi.","My name is ...","this","my"],
  2:["England","Greenwich","a","people","boy","photo","I'm from ...","from","eleven","How old are you?","that's (= that is)","Where are you from?","twelve","Germany"],
  3:["I like","English","music","And you?","sport","animal","It's time to go.","See you!","Bye!","Goodbye!","I like you","come with me","go in","here","bus","bike","cool","fan"],
  4:["activity","number","dog","tennis","I can play football.","it's (= it is)","one","two","three"],
  5:["is the colour of your","you look so fine","hair","skirt","top","cap","a colour mix","shoe","hat","shirt","dress","colour","red","green","blue","yellow","black","grey","brown","white","orange","purple","pink"],
  6:["bat","park","I spy with my little eye ...","something","pet","they're (= they are)","nice","cat"],
  7:["zero","four","five","six","seven","eight","nine","ten","I can buy ...","England"],
  8:["dad / father","mum / mother","parents","sister","brother","aunt","uncle","grandmother","grandfather"]
};

const fresh=()=>({
  version:SAVE_VERSION,scene:1,node:"s1_glitches",inv:[],flags:{},clues:[],
  log:["Moe startet sein Spiel."],stats:{game:0,english:0,mistakes:0,cells:0,hits:0},
  learning:{},visited:[],completed:false,sound:true
});

let memorySave=null;
let timers=[];
let cleanups=[];
let audioCtx=null;
let transitionPending=false;

function safeGet(){
  try{return localStorage.getItem(KEY)}catch(e){return memorySave}
}
function safeSet(v){
  memorySave=v;
  try{localStorage.setItem(KEY,v)}catch(e){}
}
function safeRemove(){
  memorySave=null;
  try{localStorage.removeItem(KEY)}catch(e){}
}
function load(){
  const base=fresh();
  try{
    const raw=safeGet();
    if(!raw)return base;
    const parsed=JSON.parse(raw);
    if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return base;
    const out={...base,...parsed,version:SAVE_VERSION};
    out.scene=Number.isFinite(Number(parsed.scene))?Math.max(1,Math.min(8,Math.floor(Number(parsed.scene)))):base.scene;
    out.node=typeof parsed.node==="string"&&/^s[1-8]_[a-z0-9_]+$/.test(parsed.node)?parsed.node:base.node;
    out.inv=Array.isArray(parsed.inv)?parsed.inv.filter(x=>x&&typeof x.id==="string"&&typeof x.label==="string").slice(0,40):[];
    out.clues=Array.isArray(parsed.clues)?parsed.clues.filter(x=>x&&typeof x.id==="string"&&typeof x.text==="string").slice(0,40):[];
    out.log=Array.isArray(parsed.log)?parsed.log.filter(x=>typeof x==="string").slice(-9):base.log;
    out.flags=parsed.flags&&typeof parsed.flags==="object"&&!Array.isArray(parsed.flags)?{...parsed.flags}:{};
    out.stats={...base.stats};
    if(parsed.stats&&typeof parsed.stats==="object"&&!Array.isArray(parsed.stats)){
      for(const k of Object.keys(out.stats)){const n=Number(parsed.stats[k]);out.stats[k]=Number.isFinite(n)?Math.max(0,Math.floor(n)):out.stats[k]}
    }
    out.learning={};
    if(parsed.learning&&typeof parsed.learning==="object"&&!Array.isArray(parsed.learning)){
      for(const [w,v] of Object.entries(parsed.learning).slice(0,250)){
        if(!v||typeof v!=="object"||Array.isArray(v))continue;
        out.learning[w]={seen:Math.max(0,Math.floor(Number(v.seen)||0)),correct:Math.max(0,Math.floor(Number(v.correct)||0)),wrong:Math.max(0,Math.floor(Number(v.wrong)||0))}
      }
    }
    out.visited=Array.isArray(parsed.visited)?[...new Set(parsed.visited.filter(x=>typeof x==="string"&&/^scene-[1-8]$/.test(x)))]:[];
    out.completed=!!parsed.completed;
    out.sound=parsed.sound!==false;
    return out;
  }catch(e){return base}
}
let st=load();

function save(){safeSet(JSON.stringify(st))}
function later(fn,ms){const id=setTimeout(fn,ms);timers.push(id);return id}
function cleanup(){timers.forEach(clearTimeout);timers=[];cleanups.forEach(fn=>{try{fn()}catch(e){}});cleanups=[]}
function onCleanup(fn){cleanups.push(fn)}
function log(msg){if(msg){st.log.push(msg);st.log=st.log.slice(-9)}}
function addItem(id,label){if(!st.inv.some(x=>x.id===id))st.inv.push({id,label})}
function has(id){return st.inv.some(x=>x.id===id)}
function addClue(id,text){if(!st.clues.some(x=>x.id===id)){st.clues.push({id,text});log("Hinweis: "+text)}}
function norm(s){return String(s||"").toLowerCase().trim().replace(/[.!?,'’]/g,"").replace(/\s+/g," ")}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function scheduleGo(node,scene,msg,ms=300){if(transitionPending)return;transitionPending=true;later(()=>go(node,scene,msg),ms)}

function ensureAudio(){
  if(!st.sound)return null;
  if(!audioCtx){
    const C=window.AudioContext||window.webkitAudioContext;
    if(C)audioCtx=new C();
  }
  if(audioCtx&&audioCtx.state==="suspended")audioCtx.resume();
  return audioCtx
}
function beep(freq=420,dur=.06,type="sine",gain=.03){
  const ctx=ensureAudio();if(!ctx)return;
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type;o.frequency.value=freq;g.gain.value=gain;
  o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+dur)
}
function sfx(kind){
  if(kind==="good"){beep(620,.05);later(()=>beep(820,.06),55)}
  else if(kind==="bad"){beep(170,.09,"square",.018)}
  else if(kind==="pickup"){beep(920,.05,"triangle",.025)}
  else if(kind==="open"){beep(300,.05);later(()=>beep(520,.08),45)}
}
function toast(t){
  const el=$("toast");el.textContent=t;el.classList.add("show");later(()=>el.classList.remove("show"),1300)
}
function recordWord(w,result="seen"){
  if(!w)return;
  const r=st.learning[w]||{seen:0,correct:0,wrong:0};
  if(result==="seen")r.seen++;
  if(result==="correct")r.correct++;
  if(result==="wrong")r.wrong++;
  st.learning[w]=r
}
function recordWords(arr,result="seen"){arr.forEach(w=>recordWord(w,result))}
function visitScene(scene){
  const key="scene-"+scene;
  if(!st.visited.includes(key)){
    st.visited.push(key);
    recordWords(SCENE_WORDS[scene]||[],"seen");
  }
}

function fb(text,ok=true){
  $("feedback").textContent=text||"";
  $("feedback").className="feedback "+(ok?"ok":"bad");
  if(text)sfx(ok?"good":"bad")
}
function mini(t=""){$("miniStatus").textContent=t}
function chips(arr=[]){$("chips").innerHTML=arr.map(x=>'<span class="chip">'+x+"</span>").join("")}
function effect(t=""){$("effect").hidden=!t;$("effect").textContent=t}
function robotDim(v){$("robot").classList.toggle("dim",!!v)}
function button(label,fn,sub=""){
  const b=document.createElement("button");b.type="button";b.className="choice";
  b.innerHTML="<div>"+label+"</div>"+(sub?'<small>'+sub+"</small>":"");
  b.addEventListener("click",()=>{ensureAudio();fn()});
  return b
}
function choiceGrid(title,choices,cls="g3"){
  $("playTitle").textContent=title;
  const g=document.createElement("div");g.className="grid "+cls;
  choices.forEach(c=>g.appendChild(button(c[0],c[1],c[2]||"")));
  $("playArea").appendChild(g)
}
function go(node,scene,msg){
  cleanup();
  transitionPending=false;
  if(msg)log(msg);
  st.node=node;st.scene=scene||st.scene;save();render()
}
function shell(o){
  transitionPending=false;
  visitScene(st.scene);
  $("sceneTag").textContent=st.completed?"Kapitel 1 abgeschlossen":"Szene "+st.scene+" / 8";
  $("kicker").textContent=o.k||"";
  $("title").textContent=o.title||"";
  $("story").textContent=o.story||"";
  $("world").className="world s"+st.scene;
  $("english").hidden=!o.en;$("english").textContent=o.en||"";
  $("playArea").innerHTML="";fb("");mini("");chips(o.chips||[]);effect(o.effect||"");robotDim(o.robotOff);
  $("mission").textContent=o.mission||"Erkunde Machine City.";
  $("inventory").innerHTML=st.inv.length?st.inv.map(i=>'<span class="item">'+i.label+"</span>").join(""):'<span class="muted">Noch leer</span>';
  $("progress").style.width=(st.completed?100:Math.max(0,(st.scene-1)/8*100))+"%";
  $("progressText").textContent=st.completed?"Kapitel 1 abgeschlossen":"Szene "+st.scene+" von 8";
  $("clueCount").textContent=st.clues.length;$("wordCount").textContent=Object.keys(st.learning).length;$("gameCount").textContent=st.stats.game;
  $("events").innerHTML=st.log.slice().reverse().map(x=>'<div class="event">• '+x+"</div>").join("");
  $("soundBtn").textContent=st.sound?"🔊 Ton":"🔇 Ton aus"
}
function englishAnswer({prompt,answers,hint,tracked,next}){
  $("playTitle").textContent=prompt;
  const row=document.createElement("div");row.className="answerrow";
  const input=document.createElement("input");input.className="answer";input.autocomplete="off";input.placeholder="Kurze englische Antwort";
  let tries=0;
  let solved=false;
  const check=()=>{
    if(solved)return;
    ensureAudio();
    const ok=answers.map(norm).includes(norm(input.value));
    if(ok){
      solved=true;input.disabled=true;[...row.querySelectorAll("button")].forEach(b=>b.disabled=true);
      st.stats.english++;recordWords(tracked,"correct");save();fb("Richtig – die Spielwelt reagiert.");later(next,320)
    }else{
      tries++;st.stats.mistakes++;recordWords(tracked,"wrong");save();fb(tries<2?hint:"Fast. Du kannst jetzt Wortbausteine benutzen.",false);
      if(tries>=2&&!$("playArea").querySelector(".help-row")){
        const help=document.createElement("div");help.className="help-row";
        answers[0].split(" ").forEach(w=>{
          const c=document.createElement("button");c.type="button";c.className="help-chip";c.textContent=w;
          c.onclick=()=>{input.value=(input.value+" "+w).trim();input.focus()};
          help.appendChild(c)
        });
        $("playArea").appendChild(help)
      }
    }
  };
  row.append(input,button("Bestätigen",check));$("playArea").appendChild(row);
  input.addEventListener("keydown",e=>{if(e.key==="Enter")check()});input.focus()
}

/* Szene 1 */
function s1Glitches(){
  shell({k:"Der falsche Bildschirm",title:"Etwas stimmt mit dem Spiel nicht",
    story:"Moe spielt ganz normal. Dann friert alles ein. Drei Störungen gehören eindeutig nicht zum Spiel.",
    mission:"Finde die drei echten Störungen.",chips:["Computer offline","3 Signale versteckt"]});
  $("playTitle").textContent="Untersuche den Bildschirm.";
  const box=document.createElement("div");box.className="screen";let found=0;
  [[14,20,true],[61,16,true],[46,62,true],[78,59,false],[28,56,false]].forEach(([x,y,real],i)=>{
    const b=document.createElement("button");b.type="button";b.className="glitch";b.style.left=x+"%";b.style.top=y+"%";
    b.setAttribute("aria-label","Bildschirmbereich "+(i+1));
    b.onclick=()=>{
      ensureAudio();
      if(real&&!b.classList.contains("found")){
        b.classList.add("found");found++;sfx("pickup");mini("Signale "+found+" / 3");
        if(found===1)fb("Da reagiert etwas auf Moe.");
        if(found===2)fb("Noch eins – die Störungen bilden ein Muster.");
        if(found===3){
          st.stats.game++;addClue("screen-pattern","Die Störungen reagieren gezielt auf Moe.");save();
          fb("Alle drei Signale gefunden.");scheduleGo("s1_name",1,"Der fremde Bildschirm spricht Moe direkt an.",450)
        }
      }else if(real&&b.classList.contains("found"))fb("Diese Störung hast du schon gefunden.");else if(!real)fb("Das gehört noch zum alten Spiel.",false)
    };
    box.appendChild(b)
  });
  $("playArea").appendChild(box)
}
function s1Name(){
  shell({k:"Der falsche Bildschirm",title:"Der Computer fragt nach Moe",
    story:"Der Desktop verschwindet. Nur eine einzige Frage bleibt. Ein Satz reicht – dann passiert etwas mit dem ganzen Zimmer.",
    en:"What's your name?",mission:"Antworte einmal auf Englisch.",chips:["Unbekannte Verbindung"]});
  englishAnswer({prompt:"Schreibe einen kurzen Satz.",answers:["My name is Moe"],hint:"Tipp: My name is ...",tracked:["My name is ..."],
    next:()=>{sfx("open");go("s2_scan",2,"Moes Name löst das Portal nach Machine City aus.")}})
}

/* Szene 2 */
function s2Scan(){
  shell({k:"Identitäts-Check",title:"Das Tor kennt zu viele Dinge",
    story:"Moe landet vor einem gigantischen Stadttor. Der Scanner hat sechs Datenkarten geladen. Drei ergeben ein sinnvolles Profil – zwei Orte wirken wie fremde Erinnerungen.",
    mission:"Wähle Germany, boy und photo.",chips:["Scanner aktiv","Profil unvollständig"]});
  $("playTitle").textContent="Baue das Profil aus drei Karten.";
  const vals=shuffle(["Germany","England","Greenwich","boy","photo","people"]),picked=[];
  let solved=false;
  const g=document.createElement("div");g.className="scan";
  vals.forEach(v=>{
    const b=button(v,()=>{
      if(solved)return;
      if(picked.includes(v)){picked.splice(picked.indexOf(v),1);b.classList.remove("selected");return}
      if(picked.length>=3)return;
      picked.push(v);b.classList.add("selected");
      if(picked.length===3){
        const ok=["Germany","boy","photo"].every(x=>picked.includes(x));
        if(ok){
          solved=true;st.stats.game++;recordWords(["Germany","boy","photo"],"correct");addClue("foreign-places","Der Scanner kennt England und Greenwich aus Moes Welt.");
          save();fb("Profil akzeptiert – England und Greenwich bleiben trotzdem im Speicher.");scheduleGo("s2_origin",2,"Das Tor akzeptiert das Profil, aber nicht alle Daten passen.",500)
        }else{
          st.stats.mistakes++;save();fb("Diese drei Karten passen nicht zusammen.",false);picked.splice(0);[...g.children].forEach(x=>x.classList.remove("selected"))
        }
      }
    });g.appendChild(b)
  });
  $("playArea").appendChild(g)
}
function s2Origin(){
  shell({k:"Identitäts-Check",title:"Ein Satz öffnet das Tor",
    story:"Der Roboter versteht die fremden Ortsdaten nicht. Das Tor wartet nur noch auf Moes Herkunft.",
    en:"Where are you from?",mission:"Öffne das Stadttor.",chips:["Tor verriegelt"],
    effect:st.clues.some(x=>x.id==="foreign-places")?"Moe weiß bereits: Das System kennt Daten aus seiner echten Welt.":""});
  englishAnswer({prompt:"Antworte kurz.",answers:["I'm from Germany","I’m from Germany"],hint:"Tipp: I'm from ...",tracked:["I'm from ...","Germany"],
    next:()=>{sfx("open");go("s3_bike",3,"Das Tor öffnet sich. Dahinter beginnt Machine City.")}})
}

/* Szene 3 */
function s3Bike(){
  shell({k:"Die Stadt wie ein Videospiel",title:"Moe fährt selbst",
    story:"Machine City liegt vor ihm. Moe nimmt ein futuristisches Bike. Auf der Straße erscheinen Roboter und blaue Datenzellen.",
    mission:"Überstehe 7 Abschnitte und steuere aktiv.",chips:["Bike online","Schild 3"]});
  $("playTitle").textContent="Ausweichen und Datenzellen einsammeln.";
  const road=document.createElement("div");road.className="road";
  const bike=document.createElement("div");bike.className="bike";bike.textContent="🏍️";road.appendChild(bike);$("playArea").appendChild(road);
  const hud=document.createElement("div");hud.className="roadhud";$("playArea").appendChild(hud);
  const controls=document.createElement("div");controls.className="grid g3";$("playArea").appendChild(controls);
  let lane=1,round=0,shield=3,cells=0,running=true,moves=0;
  const setLane=(n,user=true)=>{const next=Math.max(0,Math.min(2,n));if(user&&next!==lane)moves++;lane=next;bike.style.left=(lane*33.333+13)+"%";update()};
  ["← Links","Mitte","Rechts →"].forEach((lab,i)=>controls.appendChild(button(lab,()=>setLane(i,true))));
  const key=e=>{if(e.target.tagName==="INPUT")return;if(e.key==="ArrowLeft"){e.preventDefault();setLane(lane-1,true)}if(e.key==="ArrowRight"){e.preventDefault();setLane(lane+1,true)}};
  document.addEventListener("keydown",key);onCleanup(()=>document.removeEventListener("keydown",key));
  let swipeStart=null;
  road.addEventListener("pointerdown",e=>{swipeStart=e.clientX;try{road.setPointerCapture(e.pointerId)}catch(_){}});
  road.addEventListener("pointerup",e=>{if(swipeStart===null)return;const dx=e.clientX-swipeStart;swipeStart=null;if(Math.abs(dx)>=32)setLane(lane+(dx>0?1:-1),true)});
  road.addEventListener("pointercancel",()=>{swipeStart=null});
  const update=()=>{hud.innerHTML="<span>Abschnitt "+Math.min(round+1,7)+" / 7</span><span>🔹 "+cells+"</span><span>Steuerung "+moves+"</span><span>Schild "+("●".repeat(shield)||"Notbetrieb")+"</span>";chips(["Bike online","Schild "+shield,"Daten "+cells,"Steuerung "+moves])};
  const finish=()=>{
    running=false;st.stats.game++;st.stats.cells=cells;st.flags.bikeMoves=moves;
    if(cells>=2)addClue("network-cells","Die Datenzellen tragen dieselbe Netzkennung wie Moes Profil.");save();
    if(moves<2){fb("Die Fahrt ist vorbei – aber Moe hat kaum gesteuert. Das Bike verlangt eine kurze Kalibrierung.",false);scheduleGo("s3_calibrate",3,"Das Bike fordert vor dem Weiterfahren eine Steuerungs-Kalibrierung.",650)}
    else{fb("Fahrt geschafft.");scheduleGo("s3_terminal",3,"Moe erreicht das Stadionviertel mit "+cells+" Datenzellen.",450)}
  };
  const wave=()=>{
    if(!running)return;if(round>=7){finish();return}
    const bad=Math.floor(Math.random()*3);let pick=Math.floor(Math.random()*3);if(pick===bad)pick=(pick+1)%3;
    const o=document.createElement("div");o.className="obstacle";o.textContent="🤖";o.style.left=(bad*33.333+14)+"%";road.appendChild(o);
    const p=document.createElement("div");p.className="pickup";p.textContent="🔹";p.style.left=(pick*33.333+15)+"%";road.appendChild(p);
    later(()=>{o.style.top="148px";p.style.top="148px"},25);
    later(()=>{
      if(!running)return;
      if(lane===bad){shield--;st.stats.mistakes++;sfx("bad");fb(shield>0?"Treffer – Schild verliert Energie.":"Notbetrieb rettet das Bike.",false);if(shield<=0)shield=1}
      else if(lane===pick){cells++;sfx("pickup");fb("Datenzelle eingesammelt.")}
      else fb("Sauber ausgewichen.");
      o.remove();p.remove();round++;update();later(wave,250)
    },930)
  };
  setLane(1,false);update();wave()
}
function s3Calibrate(){
  shell({k:"Die Stadt wie ein Videospiel",title:"Steuerung kalibrieren",
    story:"Das Bike hat gemerkt, dass Moe fast nur geradeaus gefahren ist. Bevor es ihn ins Stadionviertel lässt, muss er die Steuerung einmal aktiv prüfen.",
    mission:"Drücke Links → Rechts → Mitte.",chips:["Kalibrierung"]});
  $("playTitle").textContent="Links → Rechts → Mitte";
  const seq=[0,2,1],entered=[];let locked=false;
  const g=document.createElement("div");g.className="grid g3";
  ["Links","Mitte","Rechts"].forEach((lab,i)=>g.appendChild(button(lab,()=>{
    if(locked)return;
    const expected=seq[entered.length];
    if(i===expected){entered.push(i);sfx("pickup");mini("Kalibrierung "+entered.length+" / 3");if(entered.length===3){locked=true;[...g.querySelectorAll("button")].forEach(b=>b.disabled=true);st.stats.game++;save();fb("Steuerung bestätigt.");scheduleGo("s3_terminal",3,"Moe bestätigt die Bike-Steuerung und erreicht das Stadionviertel.",350)}}
    else{entered.splice(0);st.stats.mistakes++;save();fb("Reihenfolge zurückgesetzt.",false)}
  })));
  $("playArea").appendChild(g)
}
function s3Terminal(){
  const bonus=st.stats.cells>=2;
  shell({k:"Die Stadt wie ein Videospiel",title:"Das Terminal kennt Moe",
    story:"Vor dem Stadion zeigt ein öffentliches Terminal für einen Moment Moes Namen. Es wirkt, als hätte es auf ihn gewartet.",
    mission:"Entscheide, wie Moe das Terminal untersucht.",chips:["Terminal aktiv"],
    effect:bonus?"Die gesammelten Datenzellen können jetzt als sicherer Analyseweg benutzt werden.":""});
  const c=[];
  if(bonus)c.push(["Datenzelle einsetzen",()=>{addClue("same-network","Profil, Tor und Terminal benutzen dieselbe geheime Kennung.");st.flags.profile=true;go("s4_football",4,"Die Datenzelle bestätigt die geheime Netzverbindung.")},"Belohnung aus der Bike-Fahrt"]);
  c.push(
    ["Roboter holen",()=>go("s4_football",4,"Moe zeigt dem Roboter die seltsame Meldung.")],
    ["Direkt untersuchen",()=>{st.flags.profile=true;addClue("same-network","Profil, Tor und Terminal benutzen dieselbe geheime Kennung.");go("s4_football",4,"Moe entdeckt seine Kennung im Terminal.")}],
    ["Zum Stadion weiter",()=>go("s4_football",4,"Moe lässt das Terminal zunächst hinter sich.")]
  );
  choiceGrid("Was macht Moe?",c,bonus?"g2":"g3")
}

/* Szene 4 */
function s4Football(){
  shell({k:"Das große Stadion",title:"Jetzt zählt Timing",
    story:"Im Stadion fährt ein leuchtendes Ziel durch das Tor. Moe hat sieben Schüsse. Drei gute Treffer bringen einen besonderen Zugang.",
    en:"I can play football.",mission:"Triff möglichst 3-mal.",chips:["7 Schüsse","Ziel 3 Treffer"],
    effect:st.flags.profile?"Ein Stadionmonitor zeigt kurz dieselbe geheime Kennung wie das Terminal.":""});
  $("playTitle").textContent="Schieße, wenn das Ziel in der Mitte ist.";
  const pitch=document.createElement("div");pitch.className="pitch";
  const zone=document.createElement("div");zone.className="goalzone";pitch.appendChild(zone);
  const target=document.createElement("div");target.className="target";pitch.appendChild(target);$("playArea").appendChild(pitch);
  const hud=document.createElement("div");hud.className="footballhud";$("playArea").appendChild(hud);
  let hits=0,shots=0,done=false,training=false,misses=0;
  const update=()=>{hud.innerHTML="<span>Treffer "+hits+" / 3</span><span>Schüsse "+shots+(training?" · Training":" / 7")+"</span>";mini("Treffer "+hits+" · Schüsse "+shots)};
  const finish=()=>{if(done)return;done=true;st.stats.game++;st.stats.hits=hits;if(hits>=3)addItem("stadium","Stadionzugang");save();fb(hits>=3?"Starke Runde – Stadionzugang erhalten.":"Challenge beendet – weiter geht's.");scheduleGo("s4_dog",4,hits>=3?"Moe gewinnt den Stadionzugang.":"Moe beendet die Fußballrunde.",480)};
  const shoot=()=>{
    if(done)return;shots++;
    const left=parseFloat(getComputedStyle(target).left)||0,ratio=left/(pitch.clientWidth||1);
    if(ratio>.34&&ratio<.66){hits++;misses=0;sfx("good");fb("Treffer!")}else{misses++;st.stats.mistakes++;sfx("bad");fb("Daneben – nächster Ball.",false)}
    if(misses>=3&&!training){target.style.animationDuration="2.7s";toast("Hilfsmodus: Ziel bewegt sich langsamer")}
    update();
    if(hits>=3){finish();return}
    if(!training&&shots>=7){
      if(hits===0){training=true;shots=0;target.style.animation="none";target.style.left="50%";target.style.transform="translateX(-50%)";$("playTitle").textContent="Training: Ein Treffer in die Mitte reicht jetzt.";fb("Nur Durchklicken reicht nicht. Das Ziel wird angehalten – triff einmal die Mitte.",false);update();return}
      finish()
    }else if(training&&hits>=1)finish()
  };
  $("playArea").appendChild(button("⚽ Schießen!",shoot));
  const key=e=>{if(e.target.tagName==="INPUT")return;if(e.code==="Space"){e.preventDefault();shoot()}};
  document.addEventListener("keydown",key);onCleanup(()=>document.removeEventListener("keydown",key));update()
}
function s4Dog(){
  shell({k:"Das große Stadion",title:"Ein Hund kennt einen verbotenen Weg",
    story:"Mitten im nächsten Durchgang rennt ein Hund durch eine gesperrte Seitentür. Am Halsband blinkt ein kleiner Chip.",
    mission:"Entscheide, ob Moe dem Hund folgt.",chips:["Seitentür offen"],
    effect:has("stadium")?"Moe besitzt durch die gute Fußballrunde bereits einen Stadionzugang.":""});
  choiceGrid("Was macht Moe?",[
    ["Hund helfen",()=>{addItem("dog","Hunde-Chip");st.flags.dog=true;go("s5_maker",5,"Moe hilft dem Hund und findet seinen Chip.")},"Kann später nützlich werden."],
    ["Beim Stadion bleiben",()=>{if(!has("stadium"))addItem("stadium","Stadionzugang");st.flags.stadium=true;go("s5_maker",5,"Moe sichert sich Zugriff auf das Stadionnetz.")}],
    ["Hund verfolgen",()=>{addItem("dog","Hunde-Chip");st.flags.dog=true;st.flags.secretDoor=true;addClue("restricted-route","Der Hund kennt gesperrte Technikwege.");go("s5_maker",5,"Moe folgt dem Hund durch einen verbotenen Technikgang.")},"Mehr Risiko, mehr Hinweis."]
  ])
}

/* Szene 5 */
function s5Maker(){
  shell({k:"Das Maker Lab",title:"Moe baut seine eigene Ausrüstung",
    story:"Im Maker Lab kann Moe wirklich etwas drucken. Gegenstand wählen, Farbe wählen, Druck starten.",
    mission:"Baue einen Gegenstand.",chips:["3D-Druck bereit"],
    effect:has("stadium")?"Der Stadionzugang schaltet eine zusätzliche Sportvorlage frei.":""});
  $("playTitle").textContent="Teil wählen → Farbe wählen → drucken.";
  const parts=[["shirt","👕"],["shoe","👟"],["cap","🧢"],["hat","🎩"],["top","🎽"],["dress","👗"],["skirt","🩱"],["tech gear","🦾"]];
  const colors=[["red","#b74b4b"],["green","#3b845c"],["blue","#386fa3"],["yellow","#c0a23b"],["black","#1b1b1b"],["grey","#777"],["brown","#795548"],["white","#e8e8e8"],["orange","#d4772b"],["purple","#7954a5"],["pink","#c96d91"]];
  let part=null,color=null;
  const cat=document.createElement("div");cat.className="catalog";const pbs=[];
  parts.forEach(([n,ico])=>{const b=button(ico+" "+n,()=>{part=n;pbs.forEach(x=>x.classList.remove("sel"));b.classList.add("sel");refresh()});pbs.push(b);cat.appendChild(b)});
  $("playArea").appendChild(cat);
  const preview=document.createElement("div");preview.className="preview";$("playArea").appendChild(preview);
  const sw=document.createElement("div");sw.className="swatches";const sbs=[];
  colors.forEach(([n,c])=>{const b=document.createElement("button");b.type="button";b.className="swatch";b.style.background=c;b.setAttribute("aria-label",n);b.onclick=()=>{ensureAudio();color=n;sbs.forEach(x=>x.classList.remove("sel"));b.classList.add("sel");recordWord(n,"correct");refresh()};sbs.push(b);sw.appendChild(b)});
  $("playArea").appendChild(sw);
  const track=document.createElement("div");track.className="printbar";track.innerHTML="<i></i>";$("playArea").appendChild(track);
  const print=button("3D-Druck starten",()=>{
    if(!part||!color){fb("Wähle zuerst Teil und Farbe.",false);return}
    pbs.concat(sbs).forEach(x=>x.disabled=true);print.disabled=true;let p=0;const bar=track.querySelector("i");
    const step=()=>{p+=25;bar.style.width=p+"%";sfx("pickup");if(p<100)later(step,210);else{if(part==="tech gear")addItem("tech","Technikanzug");else addItem("custom",color+" "+part);st.stats.game++;log("Moe druckt "+color+" "+part+".");save();scheduleGo("s5_cube",5,"Moes eigener Druck ist fertig.",300)}};
    step()
  });
  print.style.marginTop="9px";$("playArea").appendChild(print);
  function refresh(){
    const ico=(parts.find(x=>x[0]===part)||["","🧩"])[1];
    preview.innerHTML='<span class="previewbig">'+ico+'</span><div><b>'+(part||"Noch kein Teil")+'</b><div class="muted">'+(color?"Farbe: "+color:"Noch keine Farbe")+"</div></div>";
    mini(part&&color?part+" · "+color:"Konfiguration offen")
  }refresh()
}
function s5Cube(){
  const tech=has("tech");
  shell({k:"Das Maker Lab",title:"Der Drucker startet von allein",
    story:"Moes Druck ist fertig. Dann beginnt die Maschine ohne Auftrag erneut und erzeugt einen kleinen schwarzen Würfel.",
    mission:"Entscheide, was Moe mit dem Würfel macht.",chips:["Unbekannter Druckauftrag"],
    effect:tech?"Der Technikanzug kann den Würfel unauffälliger analysieren.":""});
  const c=[];
  if(tech)c.push(["Mit Technikanzug analysieren",()=>{addItem("cube","Schwarzer Würfel");st.flags.cube=true;addClue("cube-user","Der Würfel wurde ausdrücklich für USER MOE gedruckt.");go("s6_park",6,"Der Technikanzug liest den Würfel aus, ohne Alarm auszulösen.")},"Sicherer Bonusweg"]);
  c.push(
    ["Würfel mitnehmen",()=>{addItem("cube","Schwarzer Würfel");st.flags.cube=true;go("s6_park",6,"Moe nimmt den schwarzen Würfel mit.")}],
    ["Würfel scannen",()=>{addItem("cube","Schwarzer Würfel");st.flags.cube=true;addClue("cube-user","Der Würfel wurde ausdrücklich für USER MOE gedruckt.");go("s6_park",6,"Der Scan nennt USER MOE.")}],
    ["Liegen lassen",()=>go("s6_park",6,"Moe lässt den Würfel zurück.")]
  );
  choiceGrid("Was macht Moe?",c,"g2")
}

/* Szene 6 */
function s6Park(){
  shell({k:"Der Maschinenpark",title:"Ein Suchspiel führt zur nächsten Spur",
    story:"Im Park gibt der Roboter vier kurze Hinweise. Moe muss das passende Ziel finden. Kein Vokabeltest – eher eine Schnitzeljagd.",
    mission:"Löse vier Suchrunden.",chips:["Suchrunde 1 / 4"],
    effect:has("dog")?"Der Hund aus dem Stadion taucht wieder auf und bleibt in Moes Nähe.":""});
  const rounds=[
    {cue:"something green",target:"green"},
    {cue:"a dog",target:"dog"},
    {cue:"a cat",target:"cat"},
    {cue:"a bat",target:"bat"}
  ];
  const objs=[["🐕","dog"],["🐈","cat"],["🟩","green"],["🦇","bat"],["🔵","blue"],["🌸","pink"],["⚙️","grey"],["🟥","red"]];
  let round=0,roundLocked=false;
  function draw(){
    roundLocked=false;
    const r=rounds[round];
    $("english").hidden=false;$("english").textContent="I spy with my little eye "+r.cue+".";
    chips(["Suchrunde "+(round+1)+" / 4"]);mini("Runde "+(round+1)+" von 4");$("playArea").innerHTML="";$("playTitle").textContent="Finde das Ziel – ohne eingeblendete Lösung.";
    const g=document.createElement("div");g.className="park";
    shuffle(objs).forEach(([ico,name])=>{
      const b=document.createElement("button");b.type="button";b.className="obj";b.textContent=ico;b.setAttribute("aria-label",name);
      b.onclick=()=>{
        if(roundLocked)return;ensureAudio();
        if(name===r.target){
          roundLocked=true;recordWord(name,"correct");sfx("good");fb("Gefunden.");round++;
          if(round>=rounds.length){st.stats.game++;if(has("dog"))addClue("dog-route","Der Hund führt Moe genau zu einer versteckten Wartungstür.");save();scheduleGo("s6_door",6,"Hinter dem letzten Suchziel entdeckt Moe eine Metallfuge.",350)}
          else later(draw,250)
        }else{st.stats.mistakes++;recordWord(r.target,"wrong");save();fb("Nicht dieses. Weiter suchen.",false)}
      };g.appendChild(b)
    });$("playArea").appendChild(g)
  }draw()
}
function s6Door(){
  const effects=[];if(has("cube"))effects.push("Der schwarze Würfel pulsiert.");if(has("dog"))effects.push("Der Hunde-Chip reagiert.");if(has("tech"))effects.push("Der Technikanzug erkennt eine Schnittstelle.");
  shell({k:"Der Maschinenpark",title:"Die versteckte Wartungstür",
    story:"Hinter der Metallfuge liegt ein Zugang unter die Stadt. Jetzt wirken frühere Entscheidungen sichtbar weiter.",
    mission:"Öffne die Wartungstür.",chips:["Wartungstür verriegelt"],effect:effects.join(" ")});
  const c=[];
  if(has("cube"))c.push(["Schwarzen Würfel einsetzen",()=>{addClue("underground-link","Der Würfel ist ein Schlüssel für das alte Netz.");sfx("open");go("s7_doors",7,"Der Würfel öffnet die Wartungstür.")},"Folge aus dem Maker Lab"]);
  if(has("dog"))c.push(["Hunde-Chip einsetzen",()=>{sfx("open");go("s7_doors",7,"Der Hunde-Chip schaltet den Servicemodus frei.")},"Folge aus dem Stadion"]);
  if(has("tech"))c.push(["Technikanzug verbinden",()=>{sfx("open");go("s7_doors",7,"Der Technikanzug öffnet die Wartungsschnittstelle.")},"Folge aus dem Maker Lab"]);
  c.push(["Notmechanismus knacken",()=>go("s6_circuit",6,"Moe öffnet die Abdeckung des alten Notmechanismus."),"Immer verfügbar – keine Sackgasse"]);
  choiceGrid("Wie öffnet Moe die Tür?",c,"g2")
}
function s6Circuit(){
  shell({k:"Der Maschinenpark",title:"Merke dir die Schalterfolge",
    story:"Drei alte Schalter blinken kurz auf. Moe muss die Reihenfolge anschließend aus dem Gedächtnis wiederholen.",
    mission:"Beobachte die Schalter und wiederhole danach die Folge.",chips:["Notmechanismus"]});
  $("playTitle").textContent="Achte auf die Schalter …";
  const seq=[2,1,3],entered=[];let ready=false,locked=false;
  const g=document.createElement("div");g.className="circuit";
  [1,2,3].forEach(n=>{const b=document.createElement("button");b.type="button";b.className="switch";b.textContent=n;b.disabled=true;b.onclick=()=>{
    if(!ready||locked)return;ensureAudio();entered.push(n);b.classList.add("on");later(()=>b.classList.remove("on"),150);
    const i=entered.length-1;if(seq[i]!==n){entered.splice(0);st.stats.mistakes++;save();fb("Falsche Reihenfolge – noch einmal.",false);return}
    if(entered.length===3){locked=true;[...g.querySelectorAll("button")].forEach(x=>x.disabled=true);st.stats.game++;save();fb("Entriegelt.");sfx("open");scheduleGo("s7_doors",7,"Der Notmechanismus öffnet die Wartungstür.",300)}
  };g.appendChild(b)});
  $("playArea").appendChild(g);
  const buttons=[...g.querySelectorAll("button")];
  seq.forEach((n,i)=>later(()=>{buttons[n-1].classList.add("on");later(()=>buttons[n-1].classList.remove("on"),260)},350+i*430));
  later(()=>{ready=true;buttons.forEach(b=>b.disabled=false);$("playTitle").textContent="Jetzt aus dem Gedächtnis."},1750)
}

/* Szene 7 */
function s7Doors(){
  shell({k:"Die elf Türen",title:"Elf Türen, ein richtiger Weg",
    story:"Unter der Stadt stehen Türen von 0 bis 10. Der Roboter gibt nur einen kurzen Hinweis.",
    en:"door seven",mission:"Finde Tür 7.",chips:["11 Türen"],
    effect:st.clues.some(x=>x.id==="underground-link")?"Der Würfel zeigt schwach in Richtung Tür 7.":""});
  $("playTitle").textContent="Öffne die richtige Tür.";
  const g=document.createElement("div");g.className="doors";let solved=false;
  for(let i=0;i<=10;i++){
    const b=document.createElement("button");b.type="button";b.className="door";b.textContent=i;
    if(i===7&&st.clues.some(x=>x.id==="underground-link"))b.classList.add("on");
    b.onclick=()=>{if(solved)return;ensureAudio();if(i===7){solved=true;[...g.querySelectorAll("button")].forEach(x=>x.disabled=true);recordWord("seven","correct");st.stats.game++;save();fb("Tür 7 öffnet sich.");sfx("open");scheduleGo("s7_power",7,"Hinter Tür 7 liegt ein alter Energieverteiler.",280)}else{st.stats.mistakes++;save();fb("Diese Tür bleibt verriegelt.",false)}};g.appendChild(b)
  }$("playArea").appendChild(g)
}
function s7Power(){
  shell({k:"Die elf Türen",title:"Der alte Computer braucht Energie",
    story:"Vier Schalter müssen in der richtigen Reihenfolge aktiviert werden. Erst dann fährt der alte Rechner hoch.",
    en:"two · four · six · eight",mission:"Aktiviere 2 → 4 → 6 → 8.",chips:["Energie offline"],
    effect:has("stadium")?"Der Stadionzugang erkennt Teile dieses alten Netzes.":has("tech")?"Der Technikanzug zeigt die korrekte Spannung.":""});
  $("playTitle").textContent="Aktiviere die vier Zahlen in Reihenfolge.";
  const seq=[2,4,6,8],entered=[],g=document.createElement("div");g.className="doors";let locked=false;
  for(let i=0;i<=10;i++){
    const b=document.createElement("button");b.type="button";b.className="door";b.textContent=i;b.onclick=()=>{
      if(locked)return;ensureAudio();const expected=seq[entered.length];
      if(i===expected){entered.push(i);b.classList.add("on");recordWord(["zero","one","two","three","four","five","six","seven","eight","nine","ten"][i],"correct");mini("Energie "+entered.length+" / 4");sfx("pickup");if(entered.length===4){locked=true;[...g.querySelectorAll("button")].forEach(x=>x.disabled=true);st.stats.game++;save();fb("Energie online.");scheduleGo("s7_route",7,"Der alte Computer fährt hoch.",320)}}
      else{entered.splice(0);[...g.children].forEach(x=>x.classList.remove("on"));st.stats.mistakes++;save();fb("Schaltung zurückgesetzt.",false)}
    };g.appendChild(b)
  }$("playArea").appendChild(g)
}
function s7Route(){
  const recognized=st.flags.profile||st.clues.some(x=>x.id==="same-network");
  shell({k:"Die elf Türen",title:"Der Rechner kennt drei Orte",
    story:"Germany, England und Greenwich erscheinen nacheinander – danach Moes Kennung. Dahinter liegt eine Karte mit fünf getrennten Reichen.",
    mission:"Entscheide, wie weit Moe in das Netz eindringt.",chips:["Altes Netz online"],
    effect:recognized?"Die bekannte Kennung lässt den Computer eine Sicherheitsabfrage überspringen.":""});
  choiceGrid("Wie weit geht Moe?",[
    ["Nur Karte sichern",()=>{addClue("five-realms","Machine City ist nur eines von fünf Reichen.");go("s8_family",8,"Moe sichert die Karte der fünf Reiche.")}],
    ["Tiefer suchen",()=>{st.flags.deepData=true;addClue("planned-arrival","Moes Ankunft wurde schon vor seinem Eintreffen registriert.");go("s8_family",8,"Moe findet Hinweise auf eine vorbereitete Ankunft.")},"Mehr Wissen, mehr Risiko."],
    ["Roboter anschließen",()=>{st.flags.robotLinked=true;addClue("robot-network","Der Begleitroboter ist technisch mit dem alten Netz verwandt.");go("s8_family",8,"Der Roboter liest einen Teil des alten Netzes aus.")}]
  ])
}

/* Szene 8 */
function s8Family(){
  shell({k:"Die Bilderwand",title:"Das Archiv baut ein Profil",
    story:"Der letzte Raum zeigt Familienbilder. Moe erkennt zuerst die Beziehung – das englische Wort wird danach als Fund eingeblendet.",
    mission:"Löse drei Familien-Zuordnungen.",chips:["Archiv aktiv","Profil wächst"],
    effect:st.flags.robotLinked?"Der Roboter erkennt Teile der Archivsoftware wieder, obwohl er behauptet, noch nie hier gewesen zu sein.":""});
  const people=[["👩","mum / mother"],["👨","dad / father"],["👧","sister"],["👦","brother"],["👵","grandmother"],["👴","grandfather"],["🧔","uncle"],["👩‍🦱","aunt"]];
  const tasks=[
    {cue:"Wähle Mutter und Vater.",targets:["mum / mother","dad / father"],reveal:"mum / mother + dad / father = parents",result:"parents"},
    {cue:"Finde die Großmutter.",targets:["grandmother"],reveal:"grandmother",result:"grandmother"},
    {cue:"Finde den Onkel.",targets:["uncle"],reveal:"uncle",result:"uncle"}
  ];
  let round=0,roundLocked=false;
  function draw(){
    roundLocked=false;
    const t=tasks[round],selected=[];$("playArea").innerHTML="";$("playTitle").textContent=t.cue;mini("Zuordnung "+(round+1)+" / 3");
    const g=document.createElement("div");g.className="family";
    shuffle(people).forEach(([ico,label])=>{
      const b=document.createElement("button");b.type="button";b.className="person";b.textContent=ico;b.setAttribute("aria-label",label);
      b.onclick=()=>{
        if(roundLocked||selected.includes(label))return;ensureAudio();selected.push(label);b.classList.add("sel");
        if(selected.length===t.targets.length){
          const ok=t.targets.every(x=>selected.includes(x));
          if(ok){roundLocked=true;recordWords(t.targets.concat([t.result]),"correct");$("english").hidden=false;$("english").textContent=t.reveal;fb("Richtig – Wortfund: "+t.reveal);round++;if(round>=3){st.stats.game++;save();scheduleGo("s8_final",8,"Das Archiv vervollständigt Moes Profil.",550)}else later(draw,520)}
          else{selected.splice(0);[...g.children].forEach(x=>x.classList.remove("sel"));st.stats.mistakes++;recordWords(t.targets,"wrong");save();fb("Noch nicht. Versuch es erneut.",false)}
        }
      };g.appendChild(b)
    });$("playArea").appendChild(g)
  }draw()
}
function s8Final(){
  st.completed=true;save();
  const e=[];if(has("cube"))e.push("Der schwarze Würfel pulsiert.");if(st.flags.robotLinked)e.push("Der Roboter unterbricht die Verbindung für einen Moment.");if(st.clues.length>=5)e.push("Moe erkennt mehrere Symbole aus seinen früheren Entdeckungen.");
  shell({k:"Kapitel 1 · Finale",title:"Jemand kennt Moe",
    story:"Die Familienbilder verschwinden. Fünf Reiche erscheinen. Nur Machine City ist offen. Dann gehen die Augen des Roboters aus. Aus dem ganzen Raum kommt eine einzige ruhige Stimme.",
    en:"Moe.",mission:"Kapitel 1 abgeschlossen.",chips:["5 Reiche","Kapitel 1 abgeschlossen"],effect:e.join(" "),robotOff:true});
  $("playTitle").textContent="Die Reise hat gerade erst begonnen.";
  const map=document.createElement("div");map.className="realmmap";["⚙️","🌲","🏟️","🏔️","❓"].forEach((x,i)=>{const r=document.createElement("div");r.className="realm "+(i===0?"open":"");r.textContent=x;map.appendChild(r)});$("playArea").appendChild(map);
  const g=document.createElement("div");g.className="grid g2";g.style.marginTop="10px";
  g.appendChild(button("Kapitel neu spielen",()=>{cleanup();st=fresh();save();render()}));
  g.appendChild(button("Spielstand behalten",()=>{fb("Gespeichert. Kapitel 2 kann später hier anschließen.");toast("Spielstand gespeichert")}));
  $("playArea").appendChild(g)
}

const NODE={
  s1_glitches:s1Glitches,s1_name:s1Name,s2_scan:s2Scan,s2_origin:s2Origin,
  s3_bike:s3Bike,s3_calibrate:s3Calibrate,s3_terminal:s3Terminal,s4_football:s4Football,s4_dog:s4Dog,
  s5_maker:s5Maker,s5_cube:s5Cube,s6_park:s6Park,s6_door:s6Door,s6_circuit:s6Circuit,
  s7_doors:s7Doors,s7_power:s7Power,s7_route:s7Route,s8_family:s8Family,s8_final:s8Final
};
function render(){
  cleanup();
  const fn=NODE[st.node]||s1Glitches;
  if(!NODE[st.node]){st.node="s1_glitches";st.scene=1;st.completed=false}
  fn();save()
}

/* Journal */
function openJournal(){
  const clues=st.clues.length?st.clues.map(x=>"<div>• "+x.text+"</div>").join(""):"Noch keine Hinweise.";
  const inv=st.inv.length?st.inv.map(x=>'<span class="item">'+x.label+"</span>").join(""):"Noch kein Inventar.";
  const mastered=Object.entries(st.learning).filter(([,r])=>r.correct>0).map(([w])=>w);
  const seen=Object.keys(st.learning);
  $("journalBody").innerHTML=
    '<div class="section"><h4>Hinweise</h4><div class="muted">'+clues+'</div></div>'+
    '<div class="section"><h4>Inventar</h4><div class="inv">'+inv+'</div></div>'+
    '<div class="section"><h4>Englisch im Abenteuer</h4><div class="muted" style="margin-bottom:8px">'+seen.length+' Wörter/Begriffe begegnet · '+mastered.length+' aktiv richtig erkannt</div><div class="wordcloud">'+
    seen.map(w=>'<span class="word '+(mastered.includes(w)?"mastered":"")+'">'+w+(mastered.includes(w)?" ✓":"")+"</span>").join("")+
    "</div></div>";
  $("journalModal").classList.add("show")
}
function closeJournal(){$("journalModal").classList.remove("show")}

/* Start / Controls */
function enterGame(newGame=false){
  ensureAudio();
  if(newGame){safeRemove();st=fresh();save()}
  $("boot").hidden=true;render()
}
$("continueBtn").onclick=()=>enterGame(false);
$("newBtn").onclick=()=>{const raw=safeGet();if(raw&&!st.completed&&!confirm("Ein vorhandener Spielstand wird überschrieben. Wirklich neu starten?"))return;enterGame(true)};
$("journalBtn").onclick=openJournal;
$("closeJournalBtn").onclick=closeJournal;
$("journalModal").onclick=e=>{if(e.target===$("journalModal"))closeJournal()};
$("restartBtn").onclick=()=>{if(confirm("Spielstand wirklich zurücksetzen?")){cleanup();safeRemove();st=fresh();save();toast("Neues Spiel gestartet");render()}};
$("soundBtn").onclick=()=>{st.sound=!st.sound;save();$("soundBtn").textContent=st.sound?"🔊 Ton":"🔇 Ton aus";if(st.sound){ensureAudio();sfx("good")}};


/* Mobile/Tab-Sicherheit: Beim App-Wechsel keine Minispiele im Hintergrund verlieren */
document.addEventListener("visibilitychange",()=>{
  if(document.hidden){cleanup();save()}
  else if($("boot").hidden){render();toast("Szene sicher neu aufgebaut")}
});

/* Weiterspielen nur sinnvoll anzeigen, wenn wirklich Save da ist */
const raw=safeGet();
window.__machineCityReady=true; var rs=$("runtimeStatus"); if(rs){rs.textContent="Spielcode aktiv ✓";rs.style.color="#7de2a7";}
if(!raw){$("continueBtn").textContent="Spiel starten"}
else{
  try{
    const saved=JSON.parse(raw);
    $("continueBtn").textContent=saved.completed?"Finale ansehen":"Weiterspielen · Szene "+(saved.scene||1)
  }catch(e){$("continueBtn").textContent="Spiel starten"}
}
})();
