(function(){
  "use strict";

  var STORAGE_KEY = "dmp.elli-good-day.v1";
  var SCENES = ["garden","story","basket","craft","tea"];
  var app = document.getElementById("app");
  var homeButton = document.getElementById("homeButton");
  var resetButton = document.getElementById("resetButton");
  var heartCounter = document.getElementById("heartCounter");
  var overviewTemplate = document.getElementById("overviewTemplate");

  var state = loadState();
  var toastTimer = null;

  function loadState(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(!raw){ return {completed:[]}; }
      var parsed = JSON.parse(raw);
      var completed = Array.isArray(parsed.completed) ? parsed.completed.filter(function(id){
        return SCENES.indexOf(id) !== -1;
      }) : [];
      return {completed:Array.from(new Set(completed))};
    }catch(error){
      return {completed:[]};
    }
  }

  function saveState(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }catch(error){
      /* Das Spiel bleibt auch ohne lokalen Speicher vollständig spielbar. */
    }
  }

  function hasCompleted(sceneId){
    return state.completed.indexOf(sceneId) !== -1;
  }

  function completeScene(sceneId, message){
    if(!hasCompleted(sceneId)){
      state.completed.push(sceneId);
      saveState();
      updateCounter();
      showToast("♡ Neuer Herzmoment: " + message);
    }else{
      showToast("Diesen Herzmoment hast du heute schon gesammelt.");
    }
  }

  function updateCounter(){
    var count = state.completed.length;
    heartCounter.textContent = "♡ " + count + " / " + SCENES.length;
    heartCounter.setAttribute("aria-label", count + " von " + SCENES.length + " Herzmomenten");
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
    toastTimer = window.setTimeout(function(){
      toast.classList.remove("show");
    },2600);
  }

  function focusApp(){
    window.setTimeout(function(){
      app.focus({preventScroll:true});
    },0);
  }

  function renderOverview(){
    app.innerHTML = "";
    app.appendChild(overviewTemplate.content.cloneNode(true));

    var cards = app.querySelectorAll("[data-scene]");
    cards.forEach(function(card){
      var sceneId = card.getAttribute("data-scene");
      var done = hasCompleted(sceneId);
      card.classList.toggle("is-done",done);
      var stateLabel = card.querySelector("[data-state-for]");
      if(stateLabel){ stateLabel.textContent = done ? "Herzmoment ✓" : "Noch offen"; }
      card.addEventListener("click",function(){ openScene(sceneId); });
    });

    var count = state.completed.length;
    var note = document.getElementById("dayNote");
    if(count === 0){
      note.innerHTML = "<strong>Der Tag ist noch ganz offen.</strong> Fang dort an, wo es sich gerade gut anfühlt.";
    }else if(count < SCENES.length){
      note.innerHTML = "<strong>" + count + " Herzmoment" + (count === 1 ? "" : "e") + " gesammelt.</strong> Alles andere kann warten – such dir einfach den nächsten kleinen Moment aus.";
    }else{
      note.innerHTML = "<div class=\"completion\"><span class=\"big-heart\" aria-hidden=\"true\">💛</span><h3>Ein schöner Tag.</h3><p>Alle fünf Herzmomente sind gesammelt. Nichts musste schnell gehen und trotzdem ist viel passiert. Du kannst jeden Bereich noch einmal besuchen oder den Tag einfach so stehen lassen.</p></div>";
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

    app.innerHTML = sceneFrame("🌷","Gartenrunde","Elli schaut kurz nach den Blumen. Jede Pflanze darf in ihrem eigenen Tempo aufblühen.",body);
    wireBackButton();

    var watered = 0;
    var flowers = app.querySelectorAll(".flower-button");
    flowers.forEach(function(flower,index){
      flower.addEventListener("click",function(){
        if(flower.classList.contains("is-watered")){ return; }
        flower.classList.add("is-watered");
        flower.textContent = ["🌼","🌷","🌻","🌸","🌺"][index];
        flower.setAttribute("aria-label","Pflanze " + (index + 1) + " ist versorgt");
        watered += 1;
        var message = document.getElementById("gardenMessage");
        if(watered < flowers.length){
          message.textContent = "Sehr schön. Noch " + (flowers.length - watered) + " Pflanze" + ((flowers.length - watered) === 1 ? "" : "n") + " – wann immer du möchtest.";
        }else{
          message.textContent = "Alle Blumen sind versorgt. Jetzt darf der Garten einfach Garten sein.";
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

    app.innerHTML = sceneFrame("📖","Leseecke","Heute muss nicht die längste oder spannendste Geschichte gewinnen. Es reicht die, die gerade passt.",body);
    wireBackButton();

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
      "<button class=\"object-button\" type=\"button\" data-item=\"book1\" data-kind=\"books\"><span>📗</span><small>Buch</small></button>" +
      "<button class=\"object-button\" type=\"button\" data-item=\"crayon\" data-kind=\"craft\"><span>🖍️</span><small>Stift</small></button>" +
      "<button class=\"object-button\" type=\"button\" data-item=\"ball\" data-kind=\"outside\"><span>⚽</span><small>Ball</small></button>" +
      "<button class=\"object-button\" type=\"button\" data-item=\"book2\" data-kind=\"books\"><span>📘</span><small>Buch</small></button>" +
      "<button class=\"object-button\" type=\"button\" data-item=\"scissors\" data-kind=\"craft\"><span>✂️</span><small>Schere</small></button>" +
      "<button class=\"object-button\" type=\"button\" data-item=\"cap\" data-kind=\"outside\"><span>🧢</span><small>Kappe</small></button>" +
      "</div></div>" +
      "<div class=\"basket-row\">" +
      "<button class=\"basket-button\" type=\"button\" data-basket=\"books\">📚 Bücherregal</button>" +
      "<button class=\"basket-button\" type=\"button\" data-basket=\"craft\">🎨 Bastelkiste</button>" +
      "<button class=\"basket-button\" type=\"button\" data-basket=\"outside\">🌳 Draußenkorb</button>" +
      "</div></div>" +
      "<p class=\"sort-message\" id=\"sortMessage\">Alles darf Stück für Stück seinen Platz finden.</p>" +
      "<div class=\"scene-actions\">" + backButton() + "</div>";

    app.innerHTML = sceneFrame("🧺","In Ruhe sortieren","Sechs Dinge liegen noch herum. Es gibt keine Minuspunkte, wenn etwas erst beim zweiten Versuch seinen Platz findet.",body);
    wireBackButton();

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
          message.textContent = "Fertig. Alles hat seinen Platz – ganz ohne Hektik.";
          completeScene("basket","gemeinsam Ordnung geschaffen");
        }else{
          message.textContent = "Passt. Noch " + (6 - sortedCount) + " Teil" + ((6 - sortedCount) === 1 ? "" : "e") + ".";
        }
      });
    });
    focusApp();
  }

  function renderCraft(){
    var body =
      "<div class=\"craft-layout\">" +
      "<div class=\"craft-controls\"><button class=\"shape-button\" type=\"button\" data-shape=\"🌼\">🌼 Blume</button><button class=\"shape-button\" type=\"button\" data-shape=\"🦋\">🦋 Schmetterling</button><button class=\"shape-button\" type=\"button\" data-shape=\"🍃\">🍃 Blatt</button><button class=\"shape-button\" type=\"button\" data-shape=\"⭐\">⭐ Stern</button><button class=\"shape-button\" type=\"button\" data-shape=\"🐞\">🐞 Käfer</button><button class=\"shape-button\" type=\"button\" data-shape=\"☁️\">☁️ Wolke</button></div>" +
      "<div class=\"art-board\" id=\"artBoard\" aria-label=\"Dein Bastelbild\"></div></div>" +
      "<p class=\"sort-message\" id=\"craftMessage\">Setze mindestens drei Dinge auf das Bild. Du darfst natürlich mehr nehmen.</p>" +
      "<div class=\"scene-actions\">" + backButton() + "<button class=\"primary-button\" id=\"finishCraft\" type=\"button\" disabled>Bild fertig</button></div>";

    app.innerHTML = sceneFrame("🎨","Basteltisch","Hier gibt es keine Vorlage. Elli nimmt einfach, was ihr gefällt, und das Bild entsteht nach und nach.",body);
    wireBackButton();

    var positions = [
      [12,18],[62,16],[35,58],[72,61],[18,67],[48,30],[8,44],[80,35],[52,72],[29,29]
    ];
    var pieces = 0;
    var board = document.getElementById("artBoard");
    var finish = document.getElementById("finishCraft");

    app.querySelectorAll("[data-shape]").forEach(function(button){
      button.addEventListener("click",function(){
        var piece = document.createElement("span");
        piece.className = "art-piece";
        piece.textContent = button.getAttribute("data-shape");
        var pos = positions[pieces % positions.length];
        piece.style.left = pos[0] + "%";
        piece.style.top = pos[1] + "%";
        piece.setAttribute("aria-hidden","true");
        board.appendChild(piece);
        pieces += 1;
        if(pieces >= 3){
          finish.disabled = false;
          document.getElementById("craftMessage").textContent = pieces < 8 ? "Sieht schon nach einem richtigen Bild aus. Du kannst weitergestalten oder es so lassen." : "Das Bild ist schön voll geworden. Wann immer du möchtest, ist es fertig.";
        }
      });
    });

    finish.addEventListener("click",function(){
      completeScene("craft","etwas Eigenes gestaltet");
      finish.textContent = "Bild ist fertig ✓";
      finish.disabled = true;
      document.getElementById("craftMessage").textContent = "Fertig ist genau dann, wenn es sich fertig anfühlt.";
    });
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

    app.innerHTML = sceneFrame("☕","Kleine Pause","Zum Schluss wird nichts mehr erledigt. Elli sucht nur aus, was sich für einen ruhigen Moment gut anhört.",body);
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

  homeButton.addEventListener("click",renderOverview);

  resetButton.addEventListener("click",function(){
    var ok = window.confirm("Möchtest du die fünf Herzmomente dieses Tages zurücksetzen und neu beginnen?");
    if(!ok){ return; }
    state = {completed:[]};
    saveState();
    renderOverview();
    showToast("Der Tag beginnt noch einmal ganz von vorn.");
  });

  updateCounter();
  renderOverview();
})();