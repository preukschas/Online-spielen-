(function(){
  "use strict";

  var STORAGE_KEY = "dmp.elli-good-day.v2";
  var OLD_STORAGE_KEY = "dmp.elli-good-day.v1";
  var CHAPTERS = ["garden","story","basket","craft","tea"];
  var BRIDGES = ["bridge1","bridge2","bridge3","bridge4"];
  var JOURNEY = [
    {type:"scene",id:"garden",icon:"🌷",title:"Kapitel 1 · Gartenrunde",text:"Blumen versorgen und ruhig in den Tag starten."},
    {type:"bridge",id:"bridge1",icon:"🧩",title:"Tetris-Weg I",text:"Räume 2 Reihen und öffne den Weg zur Leseecke."},
    {type:"scene",id:"story",icon:"📖",title:"Kapitel 2 · Leseecke",text:"Eine kleine Geschichte für heute auswählen."},
    {type:"bridge",id:"bridge2",icon:"🧩",title:"Tetris-Weg II",text:"Räume 2 Reihen und bringe Ordnung in den nächsten Abschnitt."},
    {type:"scene",id:"basket",icon:"🧺",title:"Kapitel 3 · In Ruhe sortieren",text:"Sechs Dinge bekommen ihren Platz."},
    {type:"bridge",id:"bridge3",icon:"🧩",title:"Tetris-Weg III",text:"Räume 2 Reihen und öffne den Basteltisch."},
    {type:"scene",id:"craft",icon:"🎨",title:"Kapitel 4 · Basteltisch",text:"Hintergrund, Motive und Positionen selbst gestalten."},
    {type:"bridge",id:"bridge4",icon:"🧩",title:"Tetris-Weg IV",text:"Räume 2 Reihen für den Weg zur gemütlichen Pause."},
    {type:"scene",id:"tea",icon:"☕",title:"Kapitel 5 · Kleine Pause",text:"Getränk und Lieblingsplatz für den Moment wählen."}
  ];
  var BRIDGE_TARGET = 2;

  var app = document.getElementById("app");
  var homeButton = document.getElementById("homeButton");
  var resetButton = document.getElementById("resetButton");
  var heartCounter = document.getElementById("heartCounter");
  var overviewTemplate = document.getElementById("overviewTemplate");
  var toastTimer = null;
  var activeCleanup = null;
  var state = loadState();

  function freshState(){
    return {
      completed:[],
      bridgesCompleted:[],
      bridgeLines:{bridge1:0,bridge2:0,bridge3:0,bridge4:0},
      craft:{
        background:"meadow",
        selectedMotif:"🌼",
        selectedSize:"medium",
        pieces:[]
      }
    };
  }

  function normalizeState(value){
    var result = freshState();
    if(!value || typeof value !== "object"){ return result; }

    if(Array.isArray(value.completed)){
      result.completed = value.completed.filter(function(id){ return CHAPTERS.indexOf(id) !== -1; });
      result.completed = Array.from(new Set(result.completed));
    }

    if(Array.isArray(value.bridgesCompleted)){
      result.bridgesCompleted = value.bridgesCompleted.filter(function(id){ return BRIDGES.indexOf(id) !== -1; });
      result.bridgesCompleted = Array.from(new Set(result.bridgesCompleted));
    }

    if(value.bridgeLines && typeof value.bridgeLines === "object"){
      BRIDGES.forEach(function(id){
        var n = Number(value.bridgeLines[id]);
        result.bridgeLines[id] = Number.isFinite(n) ? Math.max(0,Math.min(BRIDGE_TARGET,Math.floor(n))) : 0;
      });
    }

    if(value.craft && typeof value.craft === "object"){
      if(["meadow","forest","night","lake","rainbow","paper"].indexOf(value.craft.background) !== -1){
        result.craft.background = value.craft.background;
      }
      if(typeof value.craft.selectedMotif === "string" && value.craft.selectedMotif.trim()){
        result.craft.selectedMotif = value.craft.selectedMotif.slice(0,12);
      }
      if(["small","medium","large"].indexOf(value.craft.selectedSize) !== -1){
        result.craft.selectedSize = value.craft.selectedSize;
      }
      if(Array.isArray(value.craft.pieces)){
        result.craft.pieces = value.craft.pieces.slice(0,60).map(function(piece){
          return {
            symbol:typeof piece.symbol === "string" && piece.symbol ? piece.symbol.slice(0,12) : "🌼",
            x:clamp(Number(piece.x)||50,3,97),
            y:clamp(Number(piece.y)||50,4,96),
            size:["small","medium","large"].indexOf(piece.size) !== -1 ? piece.size : "medium"
          };
        });
      }
    }

    /* Migration from the free-order 1.0 version:
       a later completed chapter implies that the bridges before it are already open. */
    var furthest = -1;
    CHAPTERS.forEach(function(id,index){
      if(result.completed.indexOf(id) !== -1){ furthest = Math.max(furthest,index); }
    });
    for(var i=0;i<furthest;i++){
      var bridgeId = BRIDGES[i];
      if(result.bridgesCompleted.indexOf(bridgeId) === -1){ result.bridgesCompleted.push(bridgeId); }
      result.bridgeLines[bridgeId] = BRIDGE_TARGET;
    }

    result.bridgesCompleted.forEach(function(id){ result.bridgeLines[id] = BRIDGE_TARGET; });
    return result;
  }

  function loadState(){
    var candidate = null;
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(raw){ candidate = JSON.parse(raw); }
      if(!candidate){
        var oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
        if(oldRaw){ candidate = JSON.parse(oldRaw); }
      }
    }catch(error){}
    var normalized = normalizeState(candidate);
    try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(normalized)); }catch(error){}
    return normalized;
  }

  function saveState(){
    try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }catch(error){}
  }

  function clamp(value,min,max){
    return Math.min(max,Math.max(min,value));
  }

  function hasCompleted(sceneId){
    return state.completed.indexOf(sceneId) !== -1;
  }

  function hasBridgeCompleted(bridgeId){
    return state.bridgesCompleted.indexOf(bridgeId) !== -1;
  }

  function stepDone(step){
    return step.type === "scene" ? hasCompleted(step.id) : hasBridgeCompleted(step.id);
  }

  function journeyIndex(type,id){
    for(var i=0;i<JOURNEY.length;i++){
      if(JOURNEY[i].type === type && JOURNEY[i].id === id){ return i; }
    }
    return -1;
  }

  function isStepUnlocked(index){
    if(index <= 0){ return true; }
    return stepDone(JOURNEY[index-1]);
  }

  function nextStep(type,id){
    var index = journeyIndex(type,id);
    return index >= 0 && index < JOURNEY.length-1 ? JOURNEY[index+1] : null;
  }

  function cleanup(){
    if(typeof activeCleanup === "function"){
      try{ activeCleanup(); }catch(error){}
    }
    activeCleanup = null;
  }

  function completeScene(sceneId,message){
    if(!hasCompleted(sceneId)){
      state.completed.push(sceneId);
      saveState();
      updateCounter();
      showToast("♡ Neuer Herzmoment: " + message);
    }else{
      showToast("Diesen Herzmoment hast du heute schon gesammelt.");
    }
    addContinueButton("scene",sceneId);
  }

  function completeBridge(bridgeId){
    if(!hasBridgeCompleted(bridgeId)){
      state.bridgesCompleted.push(bridgeId);
      state.bridgeLines[bridgeId] = BRIDGE_TARGET;
      saveState();
      updateCounter();
      showToast("🧩 Der nächste Abschnitt ist offen.");
    }
  }

  function updateCounter(){
    var hearts = state.completed.length;
    var bridges = state.bridgesCompleted.length;
    heartCounter.textContent = "♡ " + hearts + "/5 · 🧩 " + bridges + "/4";
    heartCounter.setAttribute("aria-label",hearts + " von 5 Herzmomenten und " + bridges + " von 4 Tetris-Wegen");
  }

  function showToast(message){
    var toast = document.querySelector(".toast");
    if(!toast){
      toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role","status");
      toast.setAttribute("aria-live","polite");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function(){ toast.classList.remove("show"); },2600);
  }

  function focusApp(){
    window.setTimeout(function(){
      try{ app.focus({preventScroll:true}); }catch(error){ app.focus(); }
    },0);
  }

  function cardHtml(step,index){
    var done = stepDone(step);
    var unlocked = isStepUnlocked(index);
    var status = done ? (step.type === "scene" ? "Herzmoment ✓" : "Weg frei ✓") : (unlocked ? "Jetzt dran" : "Noch geschlossen");
    var classes = "scene-card journey-card " + (step.type === "bridge" ? "bridge-card " : "") + (done ? "is-done " : "") + (!unlocked ? "is-locked" : "");
    return "<button class=\"" + classes + "\" type=\"button\" data-step-type=\"" + step.type + "\" data-step-id=\"" + step.id + "\" data-step-index=\"" + index + "\"" + (!unlocked ? " aria-disabled=\"true\"" : "") + ">" +
      "<span class=\"scene-icon\" aria-hidden=\"true\">" + step.icon + "</span>" +
      "<span class=\"scene-copy\"><strong>" + step.title + "</strong><small>" + step.text + "</small></span>" +
      "<span class=\"scene-state\">" + status + "</span>" +
      "</button>";
  }

  function renderOverview(){
    cleanup();
    app.innerHTML = "";
    app.appendChild(overviewTemplate.content.cloneNode(true));

    var grid = document.getElementById("sceneGrid");
    grid.classList.add("journey-grid");
    grid.innerHTML = JOURNEY.map(cardHtml).join("");

    grid.querySelectorAll("[data-step-type]").forEach(function(card){
      card.addEventListener("click",function(){
        var index = Number(card.getAttribute("data-step-index"));
        if(!isStepUnlocked(index)){
          showToast("Erst den Abschnitt direkt davor abschließen.");
          return;
        }
        openStep(card.getAttribute("data-step-type"),card.getAttribute("data-step-id"));
      });
    });

    var doneSteps = JOURNEY.filter(stepDone).length;
    var note = document.getElementById("dayNote");
    if(doneSteps === 0){
      note.innerHTML = "<strong>Der Tag beginnt im Garten.</strong> Danach verbinden ruhige Tetris-Wege die einzelnen Kapitel miteinander.";
    }else if(doneSteps < JOURNEY.length){
      var currentIndex = 0;
      while(currentIndex < JOURNEY.length && stepDone(JOURNEY[currentIndex])){ currentIndex++; }
      var current = JOURNEY[Math.min(currentIndex,JOURNEY.length-1)];
      note.innerHTML = "<strong>" + doneSteps + " von " + JOURNEY.length + " Abschnitten geschafft.</strong> Als Nächstes: " + current.title + ". Nichts läuft gegen die Uhr.";
    }else{
      note.innerHTML = "<div class=\"completion\"><span class=\"big-heart\" aria-hidden=\"true\">💛</span><h3>Ein schöner Tag.</h3><p>Alle fünf Kapitel und alle vier Tetris-Wege sind geschafft. Du kannst jeden Abschnitt jederzeit noch einmal besuchen.</p></div>";
    }

    updateCounter();
    focusApp();
  }

  function sceneFrame(icon,title,intro,body){
    return "<section class=\"scene\">" +
      "<header class=\"scene-head\"><span class=\"scene-head-icon\" aria-hidden=\"true\">" + icon + "</span><div><h2>" + title + "</h2><p>" + intro + "</p></div></header>" +
      "<div class=\"scene-body\">" + body + "</div></section>";
  }

  function backButton(){
    return "<button class=\"soft-button back-button\" type=\"button\">← Zur Tagesübersicht</button>";
  }

  function wireBackButton(){
    var button = app.querySelector(".back-button");
    if(button){ button.addEventListener("click",renderOverview); }
  }

  function addContinueButton(type,id){
    var actions = app.querySelector(".scene-actions");
    if(!actions || actions.querySelector(".continue-button")){ return; }
    var next = nextStep(type,id);
    if(!next){ return; }
    var nextIndex = journeyIndex(next.type,next.id);
    if(!isStepUnlocked(nextIndex)){ return; }
    var button = document.createElement("button");
    button.type = "button";
    button.className = "primary-button continue-button";
    button.textContent = next.type === "bridge" ? "Weiter zum Tetris-Weg →" : "Weiter zum nächsten Kapitel →";
    button.addEventListener("click",function(){ openStep(next.type,next.id); });
    actions.appendChild(button);
  }

  function openStep(type,id){
    cleanup();
    var index = journeyIndex(type,id);
    if(index < 0 || !isStepUnlocked(index)){
      showToast("Dieser Abschnitt ist noch nicht geöffnet.");
      renderOverview();
      return;
    }
    if(type === "bridge"){ renderTetrisBridge(id); return; }
    openScene(id);
  }

  function openScene(sceneId){
    if(sceneId === "garden"){ renderGarden(); }
    else if(sceneId === "story"){ renderStory(); }
    else if(sceneId === "basket"){ renderBasket(); }
    else if(sceneId === "craft"){ renderCraft(); }
    else if(sceneId === "tea"){ renderTea(); }
  }

  function renderGarden(){
    var body =
      "<div class=\"garden-bed\" aria-label=\"Fünf Pflanzen im Garten\">" +
      "<button class=\"flower-button\" type=\"button\" aria-label=\"Pflanze 1 gießen\">🌱</button>" +
      "<button class=\"flower-button\" type=\"button\" aria-label=\"Pflanze 2 gießen\">🌱</button>" +
      "<button class=\"flower-button\" type=\"button\" aria-label=\"Pflanze 3 gießen\">🌱</button>" +
      "<button class=\"flower-button\" type=\"button\" aria-label=\"Pflanze 4 gießen\">🌱</button>" +
      "<button class=\"flower-button\" type=\"button\" aria-label=\"Pflanze 5 gießen\">🌱</button>" +
      "</div>" +
      "<p class=\"sort-message\" id=\"gardenMessage\">Tippe die Pflanzen nacheinander an. Es gibt keine Eile.</p>" +
      "<div class=\"scene-actions\">" + backButton() + "</div>";

    app.innerHTML = sceneFrame("🌷","Kapitel 1 · Gartenrunde","Elli schaut kurz nach den Blumen. Jede Pflanze darf in ihrem eigenen Tempo aufblühen.",body);
    wireBackButton();
    if(hasCompleted("garden")){ addContinueButton("scene","garden"); }

    var watered = 0;
    var flowers = app.querySelectorAll(".flower-button");
    flowers.forEach(function(flower,index){
      flower.addEventListener("click",function(){
        if(flower.classList.contains("is-watered")){ return; }
        flower.classList.add("is-watered");
        flower.textContent = ["🌼","🌷","🌻","🌸","🌺"][index];
        flower.setAttribute("aria-label","Pflanze " + (index+1) + " ist versorgt");
        watered += 1;
        var message = document.getElementById("gardenMessage");
        if(watered < flowers.length){
          message.textContent = "Sehr schön. Noch " + (flowers.length-watered) + " Pflanze" + ((flowers.length-watered)===1 ? "" : "n") + " – wann immer du möchtest.";
        }else{
          message.textContent = "Alle Blumen sind versorgt. Jetzt ist der erste Tetris-Weg geöffnet.";
          completeScene("garden","Zeit im Garten");
        }
      });
    });
    focusApp();
  }

  function renderStory(){
    var body =
      "<div class=\"choice-grid\">" +
      "<button class=\"choice-button\" type=\"button\" data-story=\"fox\"><strong>🦊 Der kleine Fuchs</strong><span>Eine ruhige Waldgeschichte.</span></button>" +
      "<button class=\"choice-button\" type=\"button\" data-story=\"bird\"><strong>🐦 Die mutige Amsel</strong><span>Ein kleiner Ausflug vor dem Regen.</span></button>" +
      "<button class=\"choice-button\" type=\"button\" data-story=\"boat\"><strong>⛵ Das Boot im Bach</strong><span>Ein Papierboot findet seinen Weg.</span></button>" +
      "</div>" +
      "<div class=\"story-box\" id=\"storyBox\">Wähle die Geschichte, auf die du heute Lust hast.</div>" +
      "<div class=\"scene-actions\">" + backButton() + "</div>";

    app.innerHTML = sceneFrame("📖","Kapitel 2 · Leseecke","Heute muss nicht die längste oder spannendste Geschichte gewinnen. Es reicht die, die gerade passt.",body);
    wireBackButton();
    if(hasCompleted("story")){ addContinueButton("scene","story"); }

    var stories = {
      fox:"Der kleine Fuchs setzte sich unter einen großen Farn und hörte dem Wald zu. Erst als die Blätter ganz leise raschelten, ging er weiter – und fand hinter dem nächsten Baum genau den sonnigen Platz, den er gesucht hatte.",
      bird:"Die Amsel sah die dunklen Wolken und flog trotzdem noch einmal bis zum Gartenzaun. Dort wartete sie, sang drei Töne und kehrte dann ganz gemütlich in ihr trockenes Nest zurück.",
      boat:"Das Papierboot trieb nicht besonders schnell. Es drehte sich an einem Stein einmal im Kreis, glitt unter einem Blatt hindurch und kam am Ende genau dort an, wo zwei neugierige Hände schon auf es warteten."
    };

    app.querySelectorAll("[data-story]").forEach(function(button){
      button.addEventListener("click",function(){
        app.querySelectorAll("[data-story]").forEach(function(other){ other.classList.remove("is-selected"); });
        button.classList.add("is-selected");
        document.getElementById("storyBox").textContent = stories[button.getAttribute("data-story")];
        completeScene("story","eine Geschichte zusammen");
      });
    });
    focusApp();
  }

  function renderBasket(){
    var body =
      "<div class=\"sort-layout\">" +
      "<div><p><strong>1.</strong> Tippe einen Gegenstand an. <strong>2.</strong> Tippe danach auf den Platz, an den du ihn legen möchtest.</p>" +
      "<div class=\"object-row\" id=\"objectRow\">" +
      "<button class=\"object-button\" type=\"button\" data-kind=\"books\"><span>📗</span><small>Buch</small></button>" +
      "<button class=\"object-button\" type=\"button\" data-kind=\"craft\"><span>🖍️</span><small>Stift</small></button>" +
      "<button class=\"object-button\" type=\"button\" data-kind=\"outside\"><span>⚽</span><small>Ball</small></button>" +
      "<button class=\"object-button\" type=\"button\" data-kind=\"books\"><span>📘</span><small>Buch</small></button>" +
      "<button class=\"object-button\" type=\"button\" data-kind=\"craft\"><span>✂️</span><small>Schere</small></button>" +
      "<button class=\"object-button\" type=\"button\" data-kind=\"outside\"><span>🧢</span><small>Kappe</small></button>" +
      "</div></div>" +
      "<div class=\"basket-row\">" +
      "<button class=\"basket-button\" type=\"button\" data-basket=\"books\">📚 Bücherregal</button>" +
      "<button class=\"basket-button\" type=\"button\" data-basket=\"craft\">🎨 Bastelkiste</button>" +
      "<button class=\"basket-button\" type=\"button\" data-basket=\"outside\">🌳 Draußenkorb</button>" +
      "</div></div>" +
      "<p class=\"sort-message\" id=\"sortMessage\">Alles darf Stück für Stück seinen Platz finden.</p>" +
      "<div class=\"scene-actions\">" + backButton() + "</div>";

    app.innerHTML = sceneFrame("🧺","Kapitel 3 · In Ruhe sortieren","Sechs Dinge liegen noch herum. Es gibt keine Minuspunkte, wenn etwas erst beim zweiten Versuch seinen Platz findet.",body);
    wireBackButton();
    if(hasCompleted("basket")){ addContinueButton("scene","basket"); }

    var selected = null;
    var sortedCount = 0;
    var kindNames = {books:"Bücherregal",craft:"Bastelkiste",outside:"Draußenkorb"};

    app.querySelectorAll(".object-button").forEach(function(button){
      button.addEventListener("click",function(){
        if(button.classList.contains("is-sorted")){ return; }
        app.querySelectorAll(".object-button").forEach(function(other){ other.classList.remove("is-selected"); });
        selected = button;
        button.classList.add("is-selected");
        document.getElementById("sortMessage").textContent = button.querySelector("small").textContent + " ausgewählt. Wo soll es hin?";
      });
    });

    app.querySelectorAll(".basket-button").forEach(function(basket){
      basket.addEventListener("click",function(){
        var message = document.getElementById("sortMessage");
        if(!selected){
          message.textContent = "Such dir zuerst ganz in Ruhe einen Gegenstand aus.";
          return;
        }
        var expected = selected.getAttribute("data-kind");
        var target = basket.getAttribute("data-basket");
        if(expected !== target){
          message.textContent = "Das darf noch einmal wandern. Versuch es beim " + kindNames[expected] + ".";
          return;
        }
        selected.classList.remove("is-selected");
        selected.classList.add("is-sorted");
        selected.disabled = true;
        selected = null;
        sortedCount += 1;
        if(sortedCount === 6){
          message.textContent = "Fertig. Alles hat seinen Platz – und der nächste Tetris-Weg ist offen.";
          completeScene("basket","gemeinsam Ordnung geschaffen");
        }else{
          message.textContent = "Passt. Noch " + (6-sortedCount) + " Teil" + ((6-sortedCount)===1 ? "" : "e") + ".";
        }
      });
    });
    focusApp();
  }

  function craftBackgroundLabel(id){
    return {
      meadow:"🌷 Blumenwiese",
      forest:"🌲 Waldweg",
      night:"🌙 Sternennacht",
      lake:"🪷 Am See",
      rainbow:"🌈 Regenbogen",
      paper:"✏️ Bastelpapier"
    }[id] || "Hintergrund";
  }

  function renderCraft(){
    var body =
      "<div class=\"craft-studio\">" +
        "<aside class=\"craft-sidebar\">" +
          "<div class=\"craft-section\"><h3>1. Hintergrund</h3><div class=\"background-grid\">" +
            "<button class=\"background-button\" type=\"button\" data-bg=\"meadow\">🌷<span>Wiese</span></button>" +
            "<button class=\"background-button\" type=\"button\" data-bg=\"forest\">🌲<span>Wald</span></button>" +
            "<button class=\"background-button\" type=\"button\" data-bg=\"night\">🌙<span>Nacht</span></button>" +
            "<button class=\"background-button\" type=\"button\" data-bg=\"lake\">🪷<span>See</span></button>" +
            "<button class=\"background-button\" type=\"button\" data-bg=\"rainbow\">🌈<span>Regenbogen</span></button>" +
            "<button class=\"background-button\" type=\"button\" data-bg=\"paper\">✏️<span>Papier</span></button>" +
          "</div></div>" +
          "<div class=\"craft-section\"><h3>2. Motiv</h3><div class=\"motif-grid\">" +
            ["🌼","🦋","🍃","⭐","🐞","☁️","❤️","🌞","🐝","🍄","🌻","🐦"].map(function(symbol){
              return "<button class=\"motif-button\" type=\"button\" data-motif=\"" + symbol + "\">" + symbol + "</button>";
            }).join("") +
          "</div>" +
          "<div class=\"custom-motif\"><input id=\"customMotif\" type=\"text\" maxlength=\"12\" aria-label=\"Eigenes Motiv\" placeholder=\"Eigenes Symbol, z. B. 🎈\"><button id=\"useCustomMotif\" class=\"soft-button\" type=\"button\">Verwenden</button></div></div>" +
          "<div class=\"craft-section\"><h3>3. Größe</h3><div class=\"size-row\">" +
            "<button class=\"size-button\" type=\"button\" data-size=\"small\">Klein</button>" +
            "<button class=\"size-button\" type=\"button\" data-size=\"medium\">Mittel</button>" +
            "<button class=\"size-button\" type=\"button\" data-size=\"large\">Groß</button>" +
          "</div></div>" +
          "<div class=\"craft-tools\"><button id=\"undoCraft\" class=\"soft-button\" type=\"button\">↶ Letztes zurück</button><button id=\"clearCraft\" class=\"soft-button\" type=\"button\">Bild leeren</button></div>" +
        "</aside>" +
        "<div class=\"craft-canvas-area\">" +
          "<div class=\"art-board craft-bg-" + state.craft.background + "\" id=\"artBoard\" aria-label=\"Dein frei gestaltbares Bastelbild\"></div>" +
          "<p class=\"craft-help\">Motiv auswählen und dann an die gewünschte Stelle tippen. Bereits gesetzte Motive kannst du mit dem Finger oder der Maus verschieben.</p>" +
          "<div class=\"craft-summary\" id=\"craftSummary\"></div>" +
        "</div>" +
      "</div>" +
      "<div class=\"scene-actions\">" + backButton() + "<button class=\"primary-button\" id=\"finishCraft\" type=\"button\">Bild fertig</button></div>";

    app.innerHTML = sceneFrame("🎨","Kapitel 4 · Basteltisch","Jetzt bestimmst du selbst: Hintergrund, Motiv, Größe und die genaue Position jedes einzelnen Elements.",body);
    wireBackButton();
    if(hasCompleted("craft")){ addContinueButton("scene","craft"); }

    var board = document.getElementById("artBoard");
    var finish = document.getElementById("finishCraft");
    var summary = document.getElementById("craftSummary");
    var dragging = null;
    var dragPointerId = null;
    var movedDuringDrag = false;

    function saveCraft(){
      saveState();
      updateCraftSummary();
    }

    function updateCraftSummary(){
      summary.textContent = craftBackgroundLabel(state.craft.background) + " · " + state.craft.pieces.length + " Motiv" + (state.craft.pieces.length === 1 ? "" : "e");
      finish.disabled = state.craft.pieces.length < 3;
    }

    function setSelectedControls(){
      app.querySelectorAll("[data-bg]").forEach(function(button){
        button.classList.toggle("is-selected",button.getAttribute("data-bg") === state.craft.background);
      });
      app.querySelectorAll("[data-motif]").forEach(function(button){
        button.classList.toggle("is-selected",button.getAttribute("data-motif") === state.craft.selectedMotif);
      });
      app.querySelectorAll("[data-size]").forEach(function(button){
        button.classList.toggle("is-selected",button.getAttribute("data-size") === state.craft.selectedSize);
      });
    }

    function pieceElement(piece,index){
      var element = document.createElement("button");
      element.type = "button";
      element.className = "art-piece craft-piece size-" + piece.size;
      element.textContent = piece.symbol;
      element.style.left = piece.x + "%";
      element.style.top = piece.y + "%";
      element.dataset.index = String(index);
      element.setAttribute("aria-label","Motiv " + piece.symbol + " verschieben");
      wirePieceDrag(element);
      return element;
    }

    function redrawPieces(){
      board.querySelectorAll(".craft-piece").forEach(function(piece){ piece.remove(); });
      state.craft.pieces.forEach(function(piece,index){ board.appendChild(pieceElement(piece,index)); });
      updateCraftSummary();
    }

    function eventPercent(event){
      var rect = board.getBoundingClientRect();
      return {
        x:clamp(((event.clientX-rect.left)/rect.width)*100,3,97),
        y:clamp(((event.clientY-rect.top)/rect.height)*100,4,96)
      };
    }

    function wirePieceDrag(element){
      element.addEventListener("pointerdown",function(event){
        event.preventDefault();
        event.stopPropagation();
        dragging = element;
        dragPointerId = event.pointerId;
        movedDuringDrag = false;
        try{ element.setPointerCapture(event.pointerId); }catch(error){}
      });
      element.addEventListener("pointermove",function(event){
        if(dragging !== element || event.pointerId !== dragPointerId){ return; }
        movedDuringDrag = true;
        var pos = eventPercent(event);
        element.style.left = pos.x + "%";
        element.style.top = pos.y + "%";
      });
      element.addEventListener("pointerup",function(event){
        if(dragging !== element){ return; }
        var pos = eventPercent(event);
        var index = Number(element.dataset.index);
        if(state.craft.pieces[index]){
          state.craft.pieces[index].x = pos.x;
          state.craft.pieces[index].y = pos.y;
          saveCraft();
        }
        dragging = null;
        dragPointerId = null;
        try{ element.releasePointerCapture(event.pointerId); }catch(error){}
      });
      element.addEventListener("click",function(event){
        if(movedDuringDrag){ event.preventDefault(); }
      });
    }

    board.addEventListener("pointerdown",function(event){
      if(event.target.closest(".craft-piece")){ return; }
      var pos = eventPercent(event);
      state.craft.pieces.push({
        symbol:state.craft.selectedMotif || "🌼",
        x:pos.x,
        y:pos.y,
        size:state.craft.selectedSize || "medium"
      });
      if(state.craft.pieces.length > 60){ state.craft.pieces.shift(); }
      saveCraft();
      redrawPieces();
    });

    app.querySelectorAll("[data-bg]").forEach(function(button){
      button.addEventListener("click",function(){
        state.craft.background = button.getAttribute("data-bg");
        board.className = "art-board craft-bg-" + state.craft.background;
        saveCraft();
        setSelectedControls();
      });
    });

    app.querySelectorAll("[data-motif]").forEach(function(button){
      button.addEventListener("click",function(){
        state.craft.selectedMotif = button.getAttribute("data-motif");
        saveCraft();
        setSelectedControls();
      });
    });

    app.querySelectorAll("[data-size]").forEach(function(button){
      button.addEventListener("click",function(){
        state.craft.selectedSize = button.getAttribute("data-size");
        saveCraft();
        setSelectedControls();
      });
    });

    document.getElementById("useCustomMotif").addEventListener("click",function(){
      var input = document.getElementById("customMotif");
      var value = input.value.trim();
      if(!value){
        showToast("Erst ein eigenes Symbol oder kurzes Motiv eingeben.");
        input.focus();
        return;
      }
      state.craft.selectedMotif = value.slice(0,12);
      saveCraft();
      setSelectedControls();
      showToast("Eigenes Motiv ausgewählt: " + state.craft.selectedMotif);
    });

    document.getElementById("undoCraft").addEventListener("click",function(){
      if(!state.craft.pieces.length){ showToast("Auf dem Bild ist noch nichts zum Zurücknehmen."); return; }
      state.craft.pieces.pop();
      saveCraft();
      redrawPieces();
    });

    document.getElementById("clearCraft").addEventListener("click",function(){
      if(!state.craft.pieces.length){ return; }
      if(window.confirm("Möchtest du alle gesetzten Motive vom Bild nehmen?")){
        state.craft.pieces = [];
        saveCraft();
        redrawPieces();
      }
    });

    finish.addEventListener("click",function(){
      if(state.craft.pieces.length < 3){
        showToast("Setze mindestens drei Motive auf dein Bild.");
        return;
      }
      completeScene("craft","ein ganz eigenes Bild gestaltet");
      finish.textContent = "Bild ist fertig ✓";
      showToast("Dein Bastelbild bleibt gespeichert.");
    });

    setSelectedControls();
    redrawPieces();
    focusApp();
  }

  function renderTea(){
    var body =
      "<div class=\"pause-builder\">" +
      "<div class=\"option-group\"><h3>Was darf ins Glas oder in die Tasse?</h3><div class=\"option-list\">" +
      "<button class=\"option-pill\" type=\"button\" data-drink=\"Tee\">🍵 Tee</button>" +
      "<button class=\"option-pill\" type=\"button\" data-drink=\"Kakao\">☕ Kakao</button>" +
      "<button class=\"option-pill\" type=\"button\" data-drink=\"Wasser\">💧 Wasser</button>" +
      "</div></div>" +
      "<div class=\"option-group\"><h3>Wo soll die Pause sein?</h3><div class=\"option-list\">" +
      "<button class=\"option-pill\" type=\"button\" data-place=\"auf der Gartenbank\">🌿 Gartenbank</button>" +
      "<button class=\"option-pill\" type=\"button\" data-place=\"am Fenster\">🪟 Fensterplatz</button>" +
      "<button class=\"option-pill\" type=\"button\" data-place=\"auf dem Sofa\">🛋️ Sofa</button>" +
      "</div></div></div>" +
      "<div class=\"pause-result\" id=\"pauseResult\">Eine Pause braucht keinen besonderen Grund.</div>" +
      "<div class=\"scene-actions\">" + backButton() + "<button class=\"primary-button\" id=\"finishPause\" type=\"button\" disabled>Pause genießen</button></div>";

    app.innerHTML = sceneFrame("☕","Kapitel 5 · Kleine Pause","Zum Schluss wird nichts mehr erledigt. Elli sucht nur aus, was sich für einen ruhigen Moment gut anhört.",body);
    wireBackButton();

    var drink = "";
    var place = "";
    var finish = document.getElementById("finishPause");
    var result = document.getElementById("pauseResult");

    function updatePause(){
      if(drink && place){
        result.textContent = drink + " " + place + ". Mehr muss gerade nicht passieren.";
        finish.disabled = false;
      }else if(drink){
        result.textContent = drink + " ist ausgesucht. Jetzt fehlt nur noch ein gemütlicher Platz.";
      }else if(place){
        result.textContent = "Der Platz ist ausgesucht. Jetzt noch etwas zu trinken.";
      }
    }

    app.querySelectorAll("[data-drink]").forEach(function(button){
      button.addEventListener("click",function(){
        app.querySelectorAll("[data-drink]").forEach(function(other){ other.classList.remove("is-selected"); });
        button.classList.add("is-selected");
        drink = button.getAttribute("data-drink");
        updatePause();
      });
    });

    app.querySelectorAll("[data-place]").forEach(function(button){
      button.addEventListener("click",function(){
        app.querySelectorAll("[data-place]").forEach(function(other){ other.classList.remove("is-selected"); });
        button.classList.add("is-selected");
        place = button.getAttribute("data-place");
        updatePause();
      });
    });

    finish.addEventListener("click",function(){
      completeScene("tea","einfach kurz Pause gemacht");
      finish.textContent = "Pause läuft ✓";
      finish.disabled = true;
      result.textContent = drink + " " + place + ". Jetzt darf für einen Moment einfach alles so bleiben.";
    });
    focusApp();
  }

  /* ------------------------------------------------------------------
     Ruhiges Tetris als verbindendes Haupt-Gameplay
     ------------------------------------------------------------------ */

  var TETRIS_SHAPES = [
    [[1,1,1,1]],
    [[1,1],[1,1]],
    [[0,1,0],[1,1,1]],
    [[1,0,0],[1,1,1]],
    [[0,0,1],[1,1,1]],
    [[0,1,1],[1,1,0]],
    [[1,1,0],[0,1,1]]
  ];
  var TETRIS_COLORS = ["#6f8f72","#5f7f9d","#d9aa55","#d7928f","#8b78a6","#73a4a0","#b98b67"];

  function emptyBoard(rows,cols){
    var result = [];
    for(var y=0;y<rows;y++){
      var row = [];
      for(var x=0;x<cols;x++){ row.push(0); }
      result.push(row);
    }
    return result;
  }

  function cloneMatrix(matrix){
    return matrix.map(function(row){ return row.slice(); });
  }

  function rotateMatrix(matrix){
    var rows = matrix.length;
    var cols = matrix[0].length;
    var result = [];
    for(var x=0;x<cols;x++){
      var row = [];
      for(var y=rows-1;y>=0;y--){ row.push(matrix[y][x]); }
      result.push(row);
    }
    return result;
  }

  function collides(board,matrix,px,py){
    for(var y=0;y<matrix.length;y++){
      for(var x=0;x<matrix[y].length;x++){
        if(!matrix[y][x]){ continue; }
        var bx = px+x;
        var by = py+y;
        if(bx < 0 || bx >= board[0].length || by >= board.length){ return true; }
        if(by >= 0 && board[by][bx]){ return true; }
      }
    }
    return false;
  }

  function mergePiece(board,piece){
    for(var y=0;y<piece.matrix.length;y++){
      for(var x=0;x<piece.matrix[y].length;x++){
        if(!piece.matrix[y][x]){ continue; }
        var by = piece.y+y;
        var bx = piece.x+x;
        if(by >= 0 && by < board.length && bx >= 0 && bx < board[0].length){
          board[by][bx] = piece.colorIndex+1;
        }
      }
    }
  }

  function clearFullLines(board){
    var cleared = 0;
    for(var y=board.length-1;y>=0;y--){
      var full = board[y].every(function(cell){ return cell !== 0; });
      if(full){
        board.splice(y,1);
        board.unshift(new Array(board[0].length).fill(0));
        cleared += 1;
        y += 1;
      }
    }
    return cleared;
  }

  function renderTetrisBridge(bridgeId){
    var bridgeNumber = BRIDGES.indexOf(bridgeId)+1;
    var alreadyDone = hasBridgeCompleted(bridgeId);
    var currentLines = Number(state.bridgeLines[bridgeId]) || 0;
    var body =
      "<div class=\"tetris-layout\">" +
        "<div class=\"tetris-stage\">" +
          "<canvas id=\"tetrisCanvas\" width=\"300\" height=\"540\" aria-label=\"Tetris-Spielfeld\"></canvas>" +
          "<div class=\"tetris-controls\" aria-label=\"Tetris-Steuerung\">" +
            "<button type=\"button\" data-tetris=\"left\" aria-label=\"Nach links\">←</button>" +
            "<button type=\"button\" data-tetris=\"rotate\" aria-label=\"Drehen\">↻</button>" +
            "<button type=\"button\" data-tetris=\"right\" aria-label=\"Nach rechts\">→</button>" +
            "<button type=\"button\" data-tetris=\"down\" aria-label=\"Schneller nach unten\">↓</button>" +
            "<button type=\"button\" data-tetris=\"drop\" class=\"wide\" aria-label=\"Sofort ablegen\">⬇ Ablegen</button>" +
          "</div>" +
        "</div>" +
        "<aside class=\"tetris-panel\">" +
          "<div class=\"tetris-kicker\">Verbindungsweg " + bridgeNumber + " von 4</div>" +
          "<h3>Räume zwei Reihen</h3>" +
          "<p>Die Steine fallen bewusst langsam. Es gibt kein Zeitlimit. Wenn der Stapel oben ankommt, wird das Brett einfach geleert – bereits geschaffte Reihen bleiben erhalten.</p>" +
          "<div class=\"tetris-progress\"><span>Reihen für diesen Weg</span><strong id=\"tetrisProgress\">" + Math.min(currentLines,BRIDGE_TARGET) + " / " + BRIDGE_TARGET + "</strong><div class=\"progress-track\"><i id=\"tetrisProgressBar\" style=\"width:" + (Math.min(currentLines,BRIDGE_TARGET)/BRIDGE_TARGET*100) + "%\"></i></div></div>" +
          "<div class=\"tetris-message\" id=\"tetrisMessage\">" + (alreadyDone ? "Dieser Weg ist bereits frei. Du kannst trotzdem noch eine entspannte Runde spielen." : "Baue in Ruhe. Zwei vollständige Reihen genügen.") + "</div>" +
          "<button id=\"pauseTetris\" class=\"soft-button tetris-pause\" type=\"button\">Pause</button>" +
          "<div class=\"keyboard-help\">Tastatur: ← → bewegen · ↑ drehen · ↓ senken · Leertaste ablegen · P pausieren</div>" +
        "</aside>" +
      "</div>" +
      "<div class=\"scene-actions\">" + backButton() + "</div>";

    app.innerHTML = sceneFrame("🧩","Tetris-Weg " + bridgeNumber,"Ein ruhiges Tetris verbindet die Kapitel. Nicht Geschwindigkeit zählt, sondern zwei vollständige Reihen.",body);
    wireBackButton();

    if(alreadyDone){ addContinueButton("bridge",bridgeId); }

    var canvas = document.getElementById("tetrisCanvas");
    var ctx = canvas.getContext("2d");
    var COLS = 10;
    var ROWS = 18;
    var CELL = 30;
    var board = emptyBoard(ROWS,COLS);
    var intervalId = null;
    var paused = false;
    var stopped = false;
    var linesThisBridge = Math.min(currentLines,BRIDGE_TARGET);
    var piece = null;
    var nextShapeIndex = Math.floor(Math.random()*TETRIS_SHAPES.length);

    function newPiece(){
      var shapeIndex = nextShapeIndex;
      nextShapeIndex = Math.floor(Math.random()*TETRIS_SHAPES.length);
      var matrix = cloneMatrix(TETRIS_SHAPES[shapeIndex]);
      piece = {
        matrix:matrix,
        x:Math.floor((COLS-matrix[0].length)/2),
        y:0,
        colorIndex:shapeIndex
      };
      if(collides(board,piece.matrix,piece.x,piece.y)){
        board = emptyBoard(ROWS,COLS);
        document.getElementById("tetrisMessage").textContent = "Das Brett war voll und wurde sanft geleert. Deine bereits geräumten Reihen bleiben erhalten.";
      }
    }

    function drawCell(x,y,color,alpha){
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.fillStyle = color;
      ctx.fillRect(x*CELL+1,y*CELL+1,CELL-2,CELL-2);
      ctx.fillStyle = "rgba(255,255,255,.22)";
      ctx.fillRect(x*CELL+4,y*CELL+4,CELL-8,5);
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = "#f4f1e8";
      ctx.fillRect(0,0,canvas.width,canvas.height);

      ctx.strokeStyle = "rgba(55,70,60,.08)";
      ctx.lineWidth = 1;
      for(var gx=0;gx<=COLS;gx++){
        ctx.beginPath(); ctx.moveTo(gx*CELL,0); ctx.lineTo(gx*CELL,ROWS*CELL); ctx.stroke();
      }
      for(var gy=0;gy<=ROWS;gy++){
        ctx.beginPath(); ctx.moveTo(0,gy*CELL); ctx.lineTo(COLS*CELL,gy*CELL); ctx.stroke();
      }

      for(var y=0;y<ROWS;y++){
        for(var x=0;x<COLS;x++){
          var value = board[y][x];
          if(value){ drawCell(x,y,TETRIS_COLORS[value-1],1); }
        }
      }

      if(piece){
        var ghostY = piece.y;
        while(!collides(board,piece.matrix,piece.x,ghostY+1)){ ghostY += 1; }
        for(var py=0;py<piece.matrix.length;py++){
          for(var px=0;px<piece.matrix[py].length;px++){
            if(piece.matrix[py][px]){
              if(ghostY+py >= 0){ drawCell(piece.x+px,ghostY+py,TETRIS_COLORS[piece.colorIndex],.18); }
            }
          }
        }
        for(var sy=0;sy<piece.matrix.length;sy++){
          for(var sx=0;sx<piece.matrix[sy].length;sx++){
            if(piece.matrix[sy][sx] && piece.y+sy >= 0){
              drawCell(piece.x+sx,piece.y+sy,TETRIS_COLORS[piece.colorIndex],1);
            }
          }
        }
      }
    }

    function updateProgress(cleared){
      if(cleared <= 0){ return; }
      if(!hasBridgeCompleted(bridgeId)){
        linesThisBridge = Math.min(BRIDGE_TARGET,linesThisBridge+cleared);
        state.bridgeLines[bridgeId] = linesThisBridge;
        saveState();
        document.getElementById("tetrisProgress").textContent = linesThisBridge + " / " + BRIDGE_TARGET;
        document.getElementById("tetrisProgressBar").style.width = (linesThisBridge/BRIDGE_TARGET*100) + "%";
        if(linesThisBridge >= BRIDGE_TARGET){
          completeBridge(bridgeId);
          document.getElementById("tetrisMessage").innerHTML = "<strong>Geschafft.</strong> Der nächste Abschnitt ist geöffnet. Du kannst noch weiterspielen oder direkt weitergehen.";
          addContinueButton("bridge",bridgeId);
        }else{
          document.getElementById("tetrisMessage").textContent = "Eine Reihe geschafft. Noch eine – ganz in Ruhe.";
        }
      }else{
        document.getElementById("tetrisMessage").textContent = "Schöne Reihe. Dieser Weg ist schon geöffnet, also spiel nur so lange du Lust hast.";
      }
    }

    function lockPiece(){
      mergePiece(board,piece);
      var cleared = clearFullLines(board);
      updateProgress(cleared);
      newPiece();
      draw();
    }

    function stepDown(){
      if(paused || stopped || !piece){ return; }
      if(!collides(board,piece.matrix,piece.x,piece.y+1)){
        piece.y += 1;
      }else{
        lockPiece();
      }
      draw();
    }

    function move(dx){
      if(paused || stopped || !piece){ return; }
      if(!collides(board,piece.matrix,piece.x+dx,piece.y)){ piece.x += dx; }
      draw();
    }

    function rotate(){
      if(paused || stopped || !piece){ return; }
      var rotated = rotateMatrix(piece.matrix);
      var kicks = [0,-1,1,-2,2];
      for(var i=0;i<kicks.length;i++){
        if(!collides(board,rotated,piece.x+kicks[i],piece.y)){
          piece.matrix = rotated;
          piece.x += kicks[i];
          break;
        }
      }
      draw();
    }

    function hardDrop(){
      if(paused || stopped || !piece){ return; }
      while(!collides(board,piece.matrix,piece.x,piece.y+1)){ piece.y += 1; }
      lockPiece();
    }

    function togglePause(){
      paused = !paused;
      document.getElementById("pauseTetris").textContent = paused ? "Weiter" : "Pause";
      document.getElementById("tetrisMessage").textContent = paused ? "Pausiert. Der Tag wartet auf dich." : (hasBridgeCompleted(bridgeId) ? "Weiter geht's – ganz ohne Eile." : "Weiter geht's – zwei Reihen genügen.");
      draw();
    }

    function onKey(event){
      if(["ArrowLeft","ArrowRight","ArrowDown","ArrowUp"," ","p","P"].indexOf(event.key) === -1){ return; }
      event.preventDefault();
      if(event.key === "ArrowLeft"){ move(-1); }
      else if(event.key === "ArrowRight"){ move(1); }
      else if(event.key === "ArrowDown"){ stepDown(); }
      else if(event.key === "ArrowUp"){ rotate(); }
      else if(event.key === " "){ hardDrop(); }
      else{ togglePause(); }
    }

    app.querySelectorAll("[data-tetris]").forEach(function(button){
      button.addEventListener("click",function(){
        var action = button.getAttribute("data-tetris");
        if(action === "left"){ move(-1); }
        else if(action === "right"){ move(1); }
        else if(action === "rotate"){ rotate(); }
        else if(action === "down"){ stepDown(); }
        else if(action === "drop"){ hardDrop(); }
      });
    });
    document.getElementById("pauseTetris").addEventListener("click",togglePause);
    window.addEventListener("keydown",onKey,{passive:false});

    newPiece();
    draw();
    intervalId = window.setInterval(stepDown,1200);

    activeCleanup = function(){
      stopped = true;
      if(intervalId){ window.clearInterval(intervalId); }
      window.removeEventListener("keydown",onKey);
    };
    focusApp();
  }

  homeButton.addEventListener("click",renderOverview);

  resetButton.addEventListener("click",function(){
    var ok = window.confirm("Möchtest du den ganzen Tag inklusive Tetris-Wegen und Bastelbild neu beginnen?");
    if(!ok){ return; }
    cleanup();
    state = freshState();
    saveState();
    renderOverview();
    showToast("Der Tag beginnt noch einmal ganz von vorn.");
  });

  updateCounter();
  renderOverview();
})();