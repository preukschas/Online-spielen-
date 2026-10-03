(() => {
  "use strict";
  // ISO-Kürzel, Land, Hauptstadt, Region, Kartenpunkt, Landesfakt, Hauptstadtfakt.
  const rows = [
    ["ALB","Albanien","Tirana","Südost",19.8,41.3,"In Albanien stehen noch viele kleine Bunker aus dem 20. Jahrhundert.","Tirana hat einen großen Platz, der nach Skanderbeg benannt ist."],
    ["AND","Andorra","Andorra la Vella","Süd",1.52,42.51,"Andorra liegt hoch in den Pyrenäen zwischen Frankreich und Spanien.","Andorra la Vella zählt zu den höchstgelegenen Hauptstädten Europas."],
    ["AUT","Österreich","Wien","Mitte",14.2,47.7,"Durch Österreich fließt die Donau, bevor sie mehrere weitere Länder erreicht.","In Wien fahren Straßenbahnen, die dort liebevoll „Bim“ heißen."],
    ["BEL","Belgien","Brüssel","Nordwest",4.7,50.7,"Belgien hat drei Amtssprachen: Niederländisch, Französisch und Deutsch.","In Brüssel steht das Atomium: eine begehbare Konstruktion aus neun Kugeln."],
    ["BIH","Bosnien und Herzegowina","Sarajevo","Südost",17.8,44.1,"In Mostar verbindet eine berühmte Steinbrücke zwei Seiten der Stadt.","Durch Sarajevo fließt die Miljacka."],
    ["BLR","Belarus","Minsk","Ost",28.0,53.7,"Belarus ist ein Binnenland östlich von Polen.","Die Hauptstadt Minsk liegt am Fluss Swislatsch."],
    ["BGR","Bulgarien","Sofia","Südost",25.4,42.8,"Bulgarien ist für Rosenanbau und Rosenöl bekannt.","Sofia liegt am Fuß des Witoscha-Gebirges."],
    ["HRV","Kroatien","Zagreb","Südost",16.5,45.4,"Kroatien hat eine lange Küste an der Adria und viele Inseln.","Zagreb liegt im Landesinneren, obwohl Kroatien für seine Strände bekannt ist."],
    ["CYP","Zypern","Nikosia","Südost",33.1,35.2,"Auf Zypern kann man am Meer sein und die Berge des Troodos sehen.","Nikosia ist seit Jahrzehnten durch eine Pufferzone geteilt."],
    ["CZE","Tschechien","Prag","Mitte",15.1,49.8,"Die Moldau ist der längste Fluss, der ganz in Tschechien verläuft.","Prags Karlsbrücke führt über die Moldau."],
    ["DNK","Dänemark","Kopenhagen","Nord",9.8,56.0,"Dänemark besteht aus einer Halbinsel und vielen Inseln.","Kopenhagen liegt unter anderem auf den Inseln Seeland und Amager."],
    ["EST","Estland","Tallinn","Nord",25.5,58.7,"Estland hat viele Inseln in der Ostsee.","Tallinns Altstadt besitzt noch mittelalterliche Stadtmauern."],
    ["FIN","Finnland","Helsinki","Nord",25.8,64.4,"Finnland ist für seine zahlreichen Seen bekannt.","In Helsinki gibt es Fährverbindungen zu vielen Inseln vor der Küste."],
    ["FRA","Frankreich","Paris","West",2.7,46.5,"Frankreich reicht vom Atlantik bis an das Mittelmeer.","Die Seine fließt mitten durch Paris."],
    ["DEU","Deutschland","Berlin","Mitte",10.4,51.1,"Deutschland grenzt an neun andere Staaten.","Berlin liegt an der Spree."],
    ["GRC","Griechenland","Athen","Südost",22.6,39.1,"Zu Griechenland gehören zahlreiche Inseln im Mittelmeer.","Über Athen erhebt sich die Akropolis."],
    ["HUN","Ungarn","Budapest","Mitte",19.2,47.2,"Der Plattensee ist ein großer See in Ungarn.","Die Donau trennt Buda und Pest und verbindet sie durch Brücken."],
    ["ISL","Island","Reykjavík","Nord",-18.6,64.9,"Auf Island gibt es Vulkane, Gletscher und heiße Quellen.","Reykjavík wird mit Erdwärme versorgt."],
    ["IRL","Irland","Dublin","Nordwest",-8.0,53.3,"Irland wird wegen seiner Landschaft oft die grüne Insel genannt.","Durch Dublin fließt die Liffey."],
    ["ITA","Italien","Rom","Süd",12.7,42.7,"Italien hat auf der Karte ungefähr die Form eines Stiefels.","Innerhalb Roms liegt der eigenständige Staat Vatikanstadt."],
    ["LVA","Lettland","Riga","Nord",24.6,56.9,"Lettland liegt an der Ostsee zwischen Estland und Litauen.","Riga liegt an der Düna, die dort Daugava heißt."],
    ["LIE","Liechtenstein","Vaduz","Mitte",9.54,47.14,"Liechtenstein liegt zwischen der Schweiz und Österreich.","Vaduz ist klein genug, dass man viele Sehenswürdigkeiten zu Fuß erreicht."],
    ["LTU","Litauen","Vilnius","Nord",24.0,55.2,"Litauen ist der südlichste der drei baltischen Staaten.","Vilnius hat eine Altstadt mit vielen barocken Gebäuden."],
    ["LUX","Luxemburg","Luxemburg","Mitte",6.1,49.7,"Luxemburg grenzt an Belgien, Deutschland und Frankreich.","Die Stadt Luxemburg ist von tiefen Tälern und vielen Brücken geprägt."],
    ["MLT","Malta","Valletta","Süd",14.4,35.9,"Malta ist ein Inselstaat im Mittelmeer.","Valletta liegt auf einer schmalen Halbinsel zwischen zwei Häfen."],
    ["MDA","Moldau","Chișinău","Ost",28.5,47.1,"Moldau liegt zwischen Rumänien und der Ukraine.","Chișinău besitzt viele Parks und breite Alleen."],
    ["MCO","Monaco","Monaco","Süd",7.42,43.73,"Monaco liegt direkt am Mittelmeer und ist sehr klein.","Beim Großen Preis von Monaco wird durch Straßen der Stadt gefahren."],
    ["MNE","Montenegro","Podgorica","Südost",19.2,42.8,"Der Name Montenegro bedeutet „Schwarzer Berg“.","Podgorica liegt nahe dem Zusammenfluss zweier Flüsse."],
    ["NLD","Niederlande","Amsterdam","Nordwest",5.3,52.1,"Einige Flächen der Niederlande liegen unter dem Meeresspiegel.","Amsterdam ist für seine Grachten bekannt."],
    ["MKD","Nordmazedonien","Skopje","Südost",21.7,41.6,"Nordmazedonien besitzt keinen Zugang zum Meer.","Der Vardar fließt durch Skopje."],
    ["NOR","Norwegen","Oslo","Nord",10.5,62.5,"Norwegens Fjorde sind tief eingeschnittene Meeresarme.","Oslo liegt am Oslofjord."],
    ["POL","Polen","Warschau","Mitte",19.1,52.0,"Die Weichsel ist Polens längster Fluss.","Die Weichsel fließt auch durch Warschau."],
    ["PRT","Portugal","Lissabon","Süd",-8.0,39.7,"Portugal liegt am westlichen Rand des europäischen Festlands.","Lissabon liegt am breiten Mündungsgebiet des Tejo."],
    ["ROU","Rumänien","Bukarest","Südost",25.0,45.8,"Die Karpaten ziehen sich bogenförmig durch Rumänien.","Bukarest besitzt einen riesigen Parlamentspalast."],
    ["RUS","Russland","Moskau","Ost",36.5,56.2,"Russland erstreckt sich über Europa und Asien; der Ural dient oft als Grenze.","Durch Moskau fließt die Moskwa."],
    ["SMR","San Marino","San Marino","Süd",12.46,43.94,"San Marino ist vollständig von Italien umgeben.","Die Altstadt von San Marino liegt auf dem Berg Titano."],
    ["SRB","Serbien","Belgrad","Südost",20.8,44.2,"Serbien liegt im Südosten Europas und hat keinen Meereszugang.","Bei Belgrad mündet die Save in die Donau."],
    ["SVK","Slowakei","Bratislava","Mitte",19.4,48.7,"In der Slowakei ragt die Hohe Tatra auf.","Bratislava liegt an der Donau, nicht weit von Wien."],
    ["SVN","Slowenien","Ljubljana","Mitte",14.8,46.1,"Slowenien hat Alpen, Wälder und eine kurze Adriaküste.","Auf einer Brücke in Ljubljana sitzen steinerne Drachen."],
    ["ESP","Spanien","Madrid","Süd",-3.8,40.4,"Im Norden Spaniens erhebt sich das Gebirge der Pyrenäen.","Madrid liegt weit im Landesinneren."],
    ["SWE","Schweden","Stockholm","Nord",15.1,62.2,"Schweden hat zahlreiche Seen und Inseln.","Stockholm ist auf mehreren Inseln gebaut."],
    ["CHE","Schweiz","Bern","Mitte",8.3,46.8,"In der Schweiz treffen verschiedene Sprachregionen aufeinander.","Die Aare macht bei Bern eine große Schleife um die Altstadt."],
    ["UKR","Ukraine","Kyjiw","Ost",31.2,49.3,"Die Ukraine hat Küste am Schwarzen Meer.","Der Dnipro fließt durch Kyjiw."],
    ["GBR","Vereinigtes Königreich","London","Nordwest",-2.4,54.2,"Zum Vereinigten Königreich gehören England, Schottland, Wales und Nordirland.","Die Themse fließt durch London."],
    ["VAT","Vatikanstadt","Vatikanstadt","Süd",12.45,41.9,"Vatikanstadt ist der kleinste unabhängige Staat der Welt.","Auf dem Petersplatz können sich sehr viele Menschen versammeln."],
    ["XKX","Kosovo","Pristina","Südost",21.0,42.6,"Kosovo wird von vielen, aber nicht allen Staaten als unabhängig anerkannt.","Pristina besitzt eine auffällig gestaltete Nationalbibliothek."],
    ["TUR","Türkei","Ankara","Südost",28.6,41.0,"Ein kleiner Teil der Türkei liegt in Europa, der größere in Asien.","Ankara ist die Hauptstadt der Türkei, nicht Istanbul."]
  ];
  const countries=rows.map(([id,name,capital,region,lon,lat,fact,cityFact])=>({id,name,capital,region,lon,lat,fact,cityFact}));
  // Linien zeigen den groben Verlauf und sind bewusst keine Navigationskarte.
  const rivers=[
    {name:"Donau",pts:[[8.5,48],[13.45,48.57],[16.37,48.2],[17.1,48.15],[19.05,47.5],[20.46,44.8],[22.6,44.65],[29.6,45.2]],fact:"Die Donau fließt unter anderem durch Wien, Bratislava, Budapest und Belgrad."},
    {name:"Rhein",pts:[[7.6,47.6],[7.75,48.58],[8.46,49.48],[6.96,50.94],[5.9,51.98],[4.5,51.92]],fact:"Am Rhein liegen Städte wie Basel, Straßburg, Köln und Rotterdam."},
    {name:"Seine",pts:[[4.7,47.5],[3.4,48.0],[2.35,48.86],[0.1,49.5]],fact:"Die Seine führt durch Paris und mündet am Ärmelkanal."},
    {name:"Themse",pts:[[-1.8,51.6],[-1.1,51.5],[-0.12,51.51],[0.8,51.5]],fact:"Auf der Themse fuhren schon lange vor Autos Waren durch London."},
    {name:"Weichsel",pts:[[19,49.6],[19.94,50.06],[21,52.23],[18.65,54.35]],fact:"Die Weichsel fließt durch Krakau und Warschau bis zur Ostsee."},
    {name:"Elbe",pts:[[15.7,50.8],[13.74,51.05],[11.63,52.13],[9.99,53.55],[8.7,53.9]],fact:"Die Elbe fließt durch Dresden und Hamburg in Richtung Nordsee."},
    {name:"Po",pts:[[7.1,44.7],[7.7,45.1],[9.2,45.2],[11.6,44.84],[12.4,44.95]],fact:"Der Po fließt quer durch Norditalien zur Adria."},
    {name:"Tejo",pts:[[-4.5,40.3],[-4.0,39.85],[-6.8,39.5],[-9.1,38.72]],fact:"Der Tejo durchquert Spanien und erreicht bei Lissabon den Atlantik."},
    {name:"Dnipro",pts:[[31,52.2],[30.5,50.45],[32,49.0],[35.0,48.0],[33.2,46.6]],fact:"Der Dnipro fließt durch Kyjiw und weiter zum Schwarzen Meer."},
    {name:"Loire",pts:[[4.2,44.9],[3.16,47.0],[0.68,47.39],[-1.55,47.22],[-2.2,47.25]],fact:"An der Loire stehen viele berühmte Schlösser."}
  ];
  const mountains=[
    {name:"Alpen",pts:[[6,45.8],[8.3,46.8],[10.4,46.8],[12.3,47.0],[15,46.3]],fact:"Die Alpen erstrecken sich über mehrere Länder; auch die Schweiz und Österreich liegen darin."},
    {name:"Pyrenäen",pts:[[-1.8,42.8],[0.2,42.7],[2.9,42.5]],fact:"Die Pyrenäen bilden über weite Strecken die Grenze zwischen Spanien und Frankreich."},
    {name:"Karpaten",pts:[[17.7,49.2],[20,49.1],[23.0,48.5],[25.5,47.4],[24.8,45.5]],fact:"Die Karpaten ziehen sich in einem großen Bogen durch Mittel- und Osteuropa."},
    {name:"Apennin",pts:[[8.9,44.5],[10.7,43.5],[12.5,42.0],[14.3,40.5],[16.0,39.1]],fact:"Der Apennin bildet das Rückgrat der italienischen Halbinsel."},
    {name:"Skandinavisches Gebirge",pts:[[7,59],[8,62],[13,65],[17,68],[20,69]],fact:"Das Skandinavische Gebirge verläuft vor allem durch Norwegen und Schweden."},
    {name:"Dinarisches Gebirge",pts:[[14.1,45.4],[16.2,44.5],[18.5,43.5],[20.0,42.1]],fact:"Das Dinarische Gebirge begleitet einen Teil der östlichen Adriaküste."},
    {name:"Balkangebirge",pts:[[22.6,43.2],[24.2,42.9],[26.2,42.8],[28.0,42.7]],fact:"Das Balkangebirge gab der Balkanhalbinsel ihren Namen."},
    {name:"Schottisches Hochland",pts:[[-6.2,57.8],[-4.8,57.3],[-3.6,57.0]],fact:"Im schottischen Hochland steht der Ben Nevis, der höchste Berg des Vereinigten Königreichs."}
  ];
  const regions=["Nord","Nordwest","West","Mitte","Süd","Südost","Ost"];
  const $=id=>document.getElementById(id);
  const els={map:$("map"),title:$("mapTitle"),hint:$("mapHint"),caption:$("caption"),step:$("stepLabel"),question:$("question"),instruction:$("instruction"),answers:$("answers"),postcard:$("postcard"),feedback:$("feedback"),button:$("mainButton"),time:$("time"),fill:$("timerfill"),bar:$("timerbar"),score:$("score"),best:$("best"),album:$("album"),albumCount:$("albumCount"),route:$("routeStat")};
  const key="dmp-europa-express-v1";
  let saved;
  try{saved=JSON.parse(localStorage.getItem(key))||{best:0,album:[],mastery:{}}}catch{saved={best:0,album:[],mastery:{}}}
  if(!Array.isArray(saved.album))saved.album=[]; if(!saved.mastery||typeof saved.mastery!=="object")saved.mastery={};
  let state={mode:"idle",round:0,step:0,remaining:30,score:0,question:null,mistakes:0,wrongValues:new Set(),used:new Set(),timer:null,last:0,country:null};
  const rand=n=>Math.floor(Math.random()*n);
  const shuffle=a=>[...a].sort(()=>Math.random()-.5);
  const pick=a=>a[rand(a.length)];
  const pos=([lon,lat])=>[Math.round((lon+25)*1000/70),Math.round((72-lat)*620/38)];
  const el=(tag,attrs={})=>{let e=document.createElementNS("http://www.w3.org/2000/svg",tag);for(let [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e};
  const line=o=>o.pts.map((p,i)=>{let [x,y]=pos(p);return(i?"L":"M")+x+","+y}).join(" ");
  function save(){try{localStorage.setItem(key,JSON.stringify(saved))}catch{}}
  function itemKey(q){return q.type+":"+(q.type==="capital"?q.item.capital:q.item.name)}
  function weighted(list,type){
    let pool=list.filter(x=>!state.used.has(type+":"+x.name));if(!pool.length)pool=list;
    let min=Math.min(...pool.map(x=>saved.mastery[type+":"+x.name]||0));
    return pick(pool.filter(x=>(saved.mastery[type+":"+x.name]||0)<=min+1));
  }
  function options(correct,pool){
    let all=shuffle([...new Set(pool.filter(x=>x!==correct))]).slice(0,2);
    return shuffle([correct,...all]);
  }
  function makeQuestion(){
    let step=state.step, type=step===0?(state.round%2?"region":"country"):step===1?"capital":state.round%2?"river":"mountain";
    let c=state.country;
    if(step===0){c=weighted(countries,type);state.country=c}
    if(type==="country"){
      let others=shuffle(countries.filter(x=>x.id!==c.id&&Math.hypot(x.lon-c.lon,x.lat-c.lat)>7)).slice(0,2);
      return{type,item:c,answer:c.id,choices:shuffle([c,...others]),prompt:"Finde "+c.name+" auf der Karte",help:"Tippe auf den passenden goldenen Kartenpunkt.",fact:c.fact,stamp:"🧭"};
    }
    if(type==="region")return{type,item:c,answer:c.region,choices:options(c.region,regions),prompt:"Zu welcher Gegend gehört "+c.name+"?",help:"Wähle die Region unserer Lernkarte.",fact:c.fact,stamp:"🧭"};
    if(type==="capital")return{type,item:c,answer:c.capital,choices:options(c.capital,countries.map(x=>x.capital)),prompt:"Was ist die Hauptstadt von "+c.name+"?",help:"Der goldene Punkt zeigt das Land.",fact:c.cityFact,stamp:"🏙️"};
    let item=weighted(type==="river"?rivers:mountains,type);
    return{type,item,answer:item.name,choices:options(item.name,(type==="river"?rivers:mountains).map(x=>x.name)),prompt:type==="river"?"Welcher Fluss leuchtet auf?":"Welches Gebirge leuchtet auf?",help:"Schau auf die helle Linie der Karte.",fact:item.fact,stamp:type==="river"?"🌊":"⛰️"};
  }
  function drawMap(){
    els.map.replaceChildren();
    const q=state.question;
    const base=el("g");els.map.append(base);
    for(let [id,d] of Object.entries(window.EUROPE_SHAPES||{})){let p=el("path",{d,class:"land"+(q&&["region","capital"].includes(q.type)&&q.item.id===id?" active":"")});base.append(p)}
    for(let r of rivers)els.map.append(el("path",{d:line(r),class:"waterline"+(q?.type==="river"&&q.item===r?" active":"")}));
    for(let m of mountains)els.map.append(el("path",{d:line(m),class:"ridge"+(q?.type==="mountain"&&q.item===m?" active":"")}));
    if(!q)return;
    if(q.type==="country"){
      q.choices.forEach((c,i)=>pin(c.lon,c.lat,String.fromCharCode(65+i),true,()=>answer(c.id),c.name));
      els.caption.textContent="A, B oder C? Tippe direkt auf den Kartenpunkt.";
    }else if(q.type==="capital"||q.type==="region"){
      pin(q.item.lon,q.item.lat,"★",false,null,q.item.name);
      els.caption.textContent=q.item.name+" ist gold markiert.";
    }else els.caption.textContent=q.type==="river"?"Die leuchtende blaue Linie ist gesucht.":"Die leuchtende Berglinie ist gesucht.";
  }
  function pin(lon,lat,label,candidate,callback,name){
    const [x,y]=pos([lon,lat]),g=el("g",{class:"map-pin "+(candidate?"candidate":"target"),role:candidate?"button":"img","aria-label":candidate?"Kartenpunkt "+label:name,tabindex:candidate?"0":"-1"});
    g.append(el("circle",{cx:x,cy:y,r:16}));let t=el("text",{x,y:y+1});t.textContent=label;g.append(t);g.append(el("circle",{cx:x,cy:y,r:25,class:"hit"}));
    if(callback){g.addEventListener("click",callback);g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();callback()}})}
    els.map.append(g);
  }
  function showQuestion(){
    state.question=makeQuestion();state.mistakes=0;state.wrongValues=new Set();state.mode="question";
    const q=state.question;els.step.textContent="STATION "+(state.step+1)+" VON 3 · "+({country:"LAND",region:"REGION",capital:"HAUPTSTADT",river:"FLUSS",mountain:"GEBIRGE"}[q.type]);
    els.question.textContent=q.prompt;els.instruction.textContent=q.help;els.feedback.textContent="";els.answers.replaceChildren();els.postcard.classList.add("hide");els.button.classList.add("hide");
    if(q.type!=="country")q.choices.forEach(value=>{let b=document.createElement("button");b.className="answer";b.type="button";b.textContent=value;b.dataset.value=value;b.addEventListener("click",()=>answer(value,b));els.answers.append(b)});
    else q.choices.forEach((c,i)=>{let b=document.createElement("button");b.className="answer";b.type="button";b.textContent=String.fromCharCode(65+i)+" · "+c.name;b.dataset.value=c.id;b.addEventListener("click",()=>answer(c.id,b));els.answers.append(b)});
    drawMap();update();state.last=performance.now();state.timer=setInterval(tick,100);
  }
  function tick(){
    if(state.mode!=="question")return;
    const now=performance.now();state.remaining=Math.max(0,state.remaining-(now-state.last)/1000);state.last=now;update();
    if(state.remaining<=0)finish(false);
  }
  function pause(){clearInterval(state.timer);state.timer=null}
  function answer(value,button){
    if(state.mode!=="question"||state.wrongValues.has(value))return;
    const q=state.question;
    if(value!==q.answer){
      state.mistakes++;state.wrongValues.add(value);state.remaining=Math.max(0,state.remaining-3);if(button){button.disabled=true;button.classList.add("wrong")}
      els.answers.querySelectorAll(".answer").forEach(b=>{if(b.dataset.value===value){b.disabled=true;b.classList.add("wrong")}});
      els.feedback.textContent=state.mistakes===1?"Fast! Schau genauer hin; 3 Sekunden gehen verloren.":"Hinweis: Es beginnt mit „"+String(q.type==="country"?q.item.name:q.answer).slice(0,2)+"…“.";
      if(state.remaining<=0)finish(false);else update();
      return;
    }
    pause();state.mode="postcard";
    let gained=state.mistakes?25:50;state.score+=gained;
    const k=itemKey(q);saved.mastery[k]=(saved.mastery[k]||0)+(state.mistakes?0:1);
    if(!saved.album.includes(k))saved.album.push(k);save();state.used.add(k);
    els.score.textContent=state.score;
    els.answers.querySelectorAll(".answer").forEach(b=>{b.disabled=true;if(b.dataset.value===value)b.classList.add("correct")});
    els.feedback.textContent="Richtig! +"+gained+" Punkte";
    let h=document.createElement("div");h.className="stamp";h.textContent=q.stamp;let title=document.createElement("h3");title.textContent=q.type==="capital"?q.item.capital:q.item.name;let body=document.createElement("p");body.textContent=q.fact;
    els.postcard.replaceChildren(h,title,body);els.postcard.classList.remove("hide");
    els.button.textContent=state.step===2?"Reise abschließen →":"Nächste Station →";els.button.classList.remove("hide");
    renderAlbum();update();
  }
  function update(){
    els.time.textContent=Math.ceil(state.remaining);els.fill.style.width=(state.remaining/30*100)+"%";els.bar.setAttribute("aria-valuenow",String(Math.ceil(state.remaining)));
    els.score.textContent=state.score;els.best.textContent=saved.best||0;els.route.textContent=state.step+" / 3 Stationen";
    document.querySelectorAll(".track").forEach((node,i)=>node.className="track"+(i<state.step?" done":i===state.step&&state.mode!=="idle"?" current":""));
  }
  function finish(done){
    pause();state.mode="end";state.question=null;drawMap();els.answers.replaceChildren();els.postcard.classList.add("hide");
    let bonus=done?Math.ceil(state.remaining)*3:0;state.score+=bonus;
    if(state.score>(saved.best||0)){saved.best=state.score;save()}
    els.step.textContent=done?"REISE GESCHAFFT":"ZEIT ABGELAUFEN";els.question.textContent=done?"Alle drei Stationen erreicht!":"Das war eine flinke Reise!";
    els.instruction.textContent=done?"Du hast "+bonus+" Zeitbonus-Punkte gesammelt. Neue Routen und wiederholte knifflige Orte warten.":"Die entdeckten Postkarten bleiben erhalten. Versuch die Route noch einmal.";
    els.feedback.textContent="";els.caption.textContent="Deine nächste Reise startet mit neuen Aufgaben.";els.button.textContent="Neue Reise starten →";els.button.classList.remove("hide");els.hint.textContent="Runde beendet";update();
  }
  function start(){
    pause();state.round++;state.step=0;state.remaining=30;state.score=0;state.country=null;state.used=new Set();
    els.hint.textContent="30 Sekunden Rätselzeit · Pause bei Postkarten";showQuestion();
  }
  function renderAlbum(){
    els.albumCount.textContent="("+saved.album.length+" Postkarten)";
    els.album.replaceChildren();
    for(let id of saved.album.slice(-12).reverse()){let s=document.createElement("span");s.className="chip";s.textContent=id.split(":").slice(1).join(":");els.album.append(s)}
    if(!saved.album.length)els.album.textContent="Noch keine Postkarten – die erste Reise wartet.";
  }
  els.button.addEventListener("click",()=>{
    if(state.mode==="idle"||state.mode==="end")start();
    else if(state.mode==="postcard"){state.step++;if(state.step===3)finish(true);else showQuestion()}
  });
  renderAlbum();update();drawMap();
  window.EuropaExpressDebug={countries,rivers,mountains,getState:()=>({...state,used:[...state.used]})};
})();
