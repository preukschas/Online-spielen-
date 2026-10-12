(function(){
"use strict";
const words=window.MOE_VOCAB||[];
const key="moe-unit1-trainer-v1";
const $=id=>document.getElementById(id);
let data;try{data=JSON.parse(localStorage.getItem(key)||"{}")}catch(e){data={}}
if(!data||typeof data!=="object")data={};
data.stats=data.stats||{};data.xp=data.xp||0;data.history=data.history||[];
let mode="mixed",round=[],cursor=0,tries=0,help=false,correct=0,incorrect=0,ended=false;
const get=id=>data.stats[id]||{n:0,ok:0,bad:0,streak:0,due:0};
const mastered=s=>s.ok>=3&&s.streak>=2&&s.ok/Math.max(1,s.n)>=.8;
const save=()=>{try{localStorage.setItem(key,JSON.stringify(data))}catch(e){}};
function updateCounters(){
 const tried=words.filter(w=>get(w.id).n>0).length;
 const secure=words.filter(w=>mastered(get(w.id))).length;
 $("totalWords").textContent=words.length;$("tried").textContent=tried;
 $("mastered").textContent=secure;$("xp").textContent=data.xp;
 const a=Object.values(data.stats).reduce((n,s)=>n+s.n,0);
 const b=Object.values(data.stats).reduce((n,s)=>n+s.ok,0);
 $("statAttempts").textContent=a;$("statRate").textContent=a?Math.round(100*b/a)+" %":"–";
}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function choose(){
 let a=words.filter(w=>!$("topic").value||w.topic===$("topic").value);
 if(mode==="new")a=a.filter(w=>get(w.id).n===0);
 if(mode==="pages")a=a.filter(w=>Number(w.id.slice(4))>=105&&Number(w.id.slice(4))<=165);
 if(mode==="focus"){const b=a.filter(w=>{const s=get(w.id);return !mastered(s)&&(s.bad>0||(s.n>0&&s.due<=Date.now()));});if(b.length)a=b;else a=a.filter(w=>!mastered(get(w.id)));}
 a=shuffle(a);
 if(mode==="focus"||mode==="mixed")a.sort((x,y)=>{
  const sx=get(x.id),sy=get(y.id);
  const wx=(sx.bad*2)+(!sx.n?1:0)+(!mastered(sx)?1:0);
  const wy=(sy.bad*2)+(!sy.n?1:0)+(!mastered(sy)?1:0);
  return wy-wx;
 });
 return mode==="all"?a:a.slice(0,10);
}
function expected(w){
 return w.en.replace(/\s*\(=\s*[^)]*\)/ig,"").replace(/\s*\(pl\.?\s*[^)]*\)/ig,"").replace(/\s*\((sg|pl)\)/ig,"").replace(/\(around\)/ig,"around").replace(/\s*\(phone\)/ig,"").trim();
}
function norm(s){return String(s).trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\.{3,}|…/g," ").replace(/[.,!?;:/()]/g," ").replace(/\s+/g," ").trim();}
function valid(w,input){
 const out=norm(input),wanted=norm(expected(w));
 if(out===wanted)return true;
 const parenthetical=w.en.match(/\(=\s*([^)]+)\)/i);
 if(parenthetical&&norm(parenthetical[1])===out)return true;
 const plural=w.en.match(/\(pl\.?\s*([^)]+)\)/i);
 if(plural&&norm(plural[1])===out)return true;
 if(/\(phone\)/i.test(w.en)&&norm(expected(w)+" phone")===out)return true;
 const aliases={
  "MOE-001":["im from","i am from"],
  "MOE-010":["that is"],
  "MOE-014":["they are"],
  "MOE-020":["father"],
  "MOE-021":["mother"],
  "MOE-032":["color"],
  "MOE-040":["it's"],
  "MOE-043":["I can play soccer"],
  "MOE-050":["gray"],
  "MOE-058":["I am"],
  "MOE-101":["I spy with my little eye"],
  "MOE-102":["it is"],
  "MOE-103":["dad"],
  "MOE-104":["mum"]
 };
 return (aliases[w.id]||[]).some(s=>norm(s)===out);
}
function log(w,yes,answer){
 let s={...get(w.id)};
 s.n++;if(yes){s.ok++;s.streak++;data.xp+=tries>0?0:help?5:10;}else{s.bad++;s.streak=0;}
 s.due=Date.now()+(yes?Math.min(14,Math.pow(2,s.streak-1))*86400000:0);
 data.stats[w.id]=s;
 data.history.unshift({id:w.id,date:new Date().toISOString(),ok:yes,answer:answer});
 data.history=data.history.slice(0,150);save();updateCounters();
}
function feedback(ok,title,detail,solution){
 const box=$("feedback");box.className="feedback "+(ok?"ok":"bad");box.replaceChildren();
 const h=document.createElement("strong");h.textContent=title;box.appendChild(h);
 const p=document.createElement("p");p.textContent=detail;box.appendChild(p);
 if(solution){
 const d=document.createElement("div");d.className="answer-reveal";d.textContent=solution;box.appendChild(d);
 if("speechSynthesis" in window){
  const b=document.createElement("button");b.type="button";b.className="button ghost smol";b.textContent="🔊 Anhören";
  b.onclick=()=>{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(solution);u.lang="en-GB";u.rate=.85;speechSynthesis.speak(u);};box.appendChild(b);
 }
 }
}
function lock(){
 $("answer").disabled=true;$("check").disabled=true;$("tip").disabled=true;$("skip").disabled=true;$("next").hidden=false;$("next").focus();
}
function finishWord(ans){
 const w=round[cursor],firstTry=tries===0;
 log(w,true,ans);
 if(firstTry)correct++;else incorrect++;
 tries=99;lock();
 feedback(true,firstTry?"✓ Sofort richtig!":"✓ Jetzt richtig geschrieben!",firstTry?"Sehr gut!":"Dieses Wort war zunächst falsch und wird weiterhin wiederholt.",expected(w));
}
function showWord(){
 const w=round[cursor];if(!w){finishRound();return;}
 tries=0;help=false;ended=false;
 $("roundLabel").textContent=mode==="all"?"Große Challenge":mode==="pages"?"Neue Seiten 190–191":mode==="new"?"Ungeübte Wörter":mode==="focus"?"Schwierige Wörter":"Gemischte Runde";
 $("counter").textContent=(cursor+1)+" / "+round.length;
 $("fill").style.width=Math.round(cursor*100/round.length)+"%";
 $("meter").setAttribute("aria-valuenow",Math.round(cursor*100/round.length));
 $("topicName").textContent="✦ "+w.topic+" · "+w.id+" · "+(w.page?"Buchseite "+w.page:(w.unit||"Unit 1"));
 $("prompt").textContent=w.de;
 $("extra").textContent=w.en.includes("…")||w.en.includes("...")?"Bei den Punkten (…) reicht der Satzanfang.":"Schreibe die englische Übersetzung vollständig.";
 $("answer").value="";$("answer").disabled=false;$("check").disabled=false;$("tip").disabled=false;$("skip").disabled=false;$("next").hidden=true;
 $("next").textContent=cursor===round.length-1?"Ergebnis ansehen →":"Nächstes Wort →";
 $("feedback").className="feedback hidden";$("answer").focus({preventScroll:true});
}
function finishRound(){
 ended=true;$("answerForm").classList.add("hidden");
 $("counter").textContent=round.length+" / "+round.length;
 $("fill").style.width="100%";$("meter").setAttribute("aria-valuenow","100");
 $("topicName").textContent="★ GESCHAFFT";
 $("roundLabel").textContent="Runde abgeschlossen";
 $("prompt").textContent=correct+" von "+round.length+" richtig";
 $("extra").textContent=incorrect+" Wörter brauchten eine Korrektur und werden beim Wiederholen verstärkt geübt.";
 const box=$("feedback");box.className="feedback ok";box.replaceChildren();
 const b=document.createElement("button");b.type="button";b.className="button";b.textContent="Neue Runde starten →";b.onclick=start;box.appendChild(b);
}
function start(){
 round=choose();cursor=0;correct=0;incorrect=0;ended=false;
 $("statsView").classList.add("hidden");$("trainer").classList.remove("hidden");$("answerForm").classList.remove("hidden");
 if(round.length)showWord();else{$("prompt").textContent="Keine Wörter ausgewählt";$("extra").textContent="Ändere das Thema und starte erneut.";}
}
$("answerForm").addEventListener("submit",e=>{
 e.preventDefault();if(tries===99||!round.length)return;
 const w=round[cursor],answer=$("answer").value.trim();
 if(!answer){feedback(false,"Noch keine Antwort","Schreibe zuerst deine Übersetzung.");return;}
 if(valid(w,answer)){finishWord(answer);return;}
 log(w,false,answer);
 tries++;
 feedback(false,"Noch nicht richtig",tries>=3?"Die Lösung lautet: "+expected(w)+". Bitte schreibe sie jetzt selbst korrekt in das Eingabefeld.":"Versuche es erneut. Erst die richtige Eingabe schaltet Weiter frei.");
 $("answer").select();
});
$("tip").onclick=()=>{if(!round.length)return;help=true;feedback(true,"Kleiner Hinweis","Das Wort beginnt mit „"+expected(round[cursor]).slice(0,2)+"…“.");$("tip").disabled=true;};
$("skip").onclick=()=>{if(round.length&&tries!==99){help=true;feedback(false,"Lernhilfe – kein Überspringen","Schreibe die Lösung erst korrekt, um fortzufahren.",expected(round[cursor]));$("answer").focus();}};
$("next").onclick=()=>{if(tries!==99||!round.length)return;cursor++;if(cursor<round.length)showWord();else finishRound();};
document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{
 mode=b.dataset.mode;document.querySelectorAll("[data-mode]").forEach(x=>x.classList.toggle("active",x===b));
});
$("start").onclick=start;
function viewStats(){
 $("trainer").classList.add("hidden");$("statsView").classList.remove("hidden");updateCounters();listStats();
}
function listStats(){
 const filter=$("filterWords").value,place=$("wordRows");place.replaceChildren();
 let a=words.filter(w=>{const s=get(w.id);return filter==="all"||filter==="new"&&!s.n||filter==="mastered"&&mastered(s)||filter==="weak"&&s.bad>0&&!mastered(s);});
 if(!a.length){const p=document.createElement("p");p.className="empty";p.textContent="Noch keine Wörter in dieser Auswahl.";place.appendChild(p);}
 a.forEach(w=>{
 const s=get(w.id),row=document.createElement("div");row.className="wordrow";
 const left=document.createElement("div"),title=document.createElement("b"),small=document.createElement("small");
 title.textContent=w.de;small.textContent=w.id+" · "+w.topic;left.append(title,small);
 const num=document.createElement("div");num.className="numbers";num.textContent="✓ "+s.ok+" · ✕ "+s.bad;
 const sub=document.createElement("small");sub.textContent=mastered(s)?"Sicher":s.n?"Üben":"Neu";num.appendChild(sub);row.append(left,num);place.appendChild(row);
 });
}
$("viewStats").onclick=viewStats;$("backTrain").onclick=()=>{$("statsView").classList.add("hidden");$("trainer").classList.remove("hidden");};
$("filterWords").onchange=listStats;
$("export").onclick=()=>{
 const head=["ID","Deutsch","Englisch","Richtig","Falsch","Versuche","Sicher"];
 const rows=[head].concat(words.map(w=>{const s=get(w.id);return [w.id,w.de,w.en,s.ok,s.bad,s.n,mastered(s)?"ja":"nein"];}));
 const csv="\uFEFF"+rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(";")).join("\r\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="Moe_Unit1_Lernfortschritt.csv";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$("reset").onclick=()=>{
 if(confirm("Wirklich den Lernfortschritt nur auf diesem Gerät löschen?")){data={stats:{},xp:0,history:[]};save();updateCounters();start();}
};
[...new Set(words.map(w=>w.topic))].sort().forEach(t=>{
 const opt=document.createElement("option");opt.value=t;opt.textContent=t;$("topic").appendChild(opt);
});
if(!words.length){$("prompt").textContent="Keine Vokabeln geladen";return;}
updateCounters();start();
})();