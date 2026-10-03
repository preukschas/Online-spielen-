'use strict';

(function(){
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const placeBtn = document.getElementById('placeBtn');
  const needle = document.getElementById('needle');
  const qualityText = document.getElementById('qualityText');
  const levelLabel = document.getElementById('levelLabel');
  const scoreLabel = document.getElementById('scoreLabel');
  const comboLabel = document.getElementById('comboLabel');
  const lifeLabel = document.getElementById('lifeLabel');
  const bestScore = document.getElementById('bestScore');

  const overlay = document.getElementById('overlay');
  const modalTag = document.getElementById('modalTag');
  const modalTitle = document.getElementById('modalTitle');
  const modalText = document.getElementById('modalText');
  const modalActions = document.getElementById('modalActions');
  const cutBox = document.getElementById('cutBox');
  const cutQuestion = document.getElementById('cutQuestion');
  const cutAnswers = document.getElementById('cutAnswers');
  const cutFeedback = document.getElementById('cutFeedback');

  const levels = [
    {name:'Gäste-WC',cols:6,rows:4,tile:'#d9e3dc',tile2:'#c6d4cc',wall:'#efe8d9',speed:0.66,pattern:'straight'},
    {name:'Küche',cols:7,rows:4,tile:'#d7c7ad',tile2:'#c6b496',wall:'#e6ded2',speed:0.78,pattern:'checker'},
    {name:'Bad',cols:7,rows:5,tile:'#b9d5dc',tile2:'#9fc5cf',wall:'#e3eceb',speed:0.92,pattern:'water'},
    {name:'Terrasse',cols:8,rows:5,tile:'#b79373',tile2:'#a57e60',wall:'#d8c8b7',speed:1.05,pattern:'stone'},
    {name:'Krummer Altbau',cols:8,rows:6,tile:'#c9c0d9',tile2:'#aea4c2',wall:'#ddd2c8',speed:1.18,pattern:'altbau'}
  ];

  const state = {
    level:0,
    placed:0,
    score:0,
    combo:1,
    hearts:3,
    meter:0,
    direction:1,
    running:false,
    awaitingCut:false,
    lastQuality:null,
    flashes:[],
    badTiles:new Set(),
    cutCount:0
  };

  let lastTime = performance.now();
  let audioCtx = null;
  let best = Number(localStorage.getItem('franzFliesenlegerBest') || 0);

  function tone(freq,duration,type){
    try{
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc=audioCtx.createOscillator();
      const gain=audioCtx.createGain();
      osc.type=type||'sine';
      osc.frequency.value=freq;
      gain.gain.setValueAtTime(0.055,audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+duration);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime+duration);
    }catch(e){}
  }
  bestScore.textContent = String(best);

  // Franz wird als deutlich sichtbares, statisches DOM-Bild über dem Spielfeld gezeigt.
  // Animation wurde bewusst entfernt, um das Laden auf iPhone/iPad robuster zu machen.
  function setFranzMood(){}

  function totalTiles(){
    const l = levels[state.level];
    return l.cols * l.rows;
  }

  function updateHud(){
    levelLabel.textContent = 'Baustelle ' + (state.level+1) + '/5 · ' + levels[state.level].name;
    scoreLabel.textContent = state.score.toLocaleString('de-DE') + ' Punkte';
    comboLabel.textContent = 'Kombo ×' + state.combo;
    lifeLabel.textContent = '❤️'.repeat(Math.max(0,state.hearts)) + '🖤'.repeat(Math.max(0,3-state.hearts));
    needle.style.left = 'calc(' + (state.meter*100).toFixed(2) + '% - 3px)';
  }

  function resetGame(){
    state.level=0;
    state.placed=0;
    state.score=0;
    state.combo=1;
    state.hearts=3;
    state.meter=0;
    state.direction=1;
    state.running=false;
    state.awaitingCut=false;
    state.lastQuality=null;
    state.flashes=[];
    state.badTiles.clear();
    state.cutCount=0;
    
    updateHud();
    showIntro();
  }

  function startLevel(){
    state.placed=0;
    state.combo=Math.max(1,state.combo);
    state.badTiles.clear();
    state.running=true;
    state.awaitingCut=false;
    state.lastQuality=null;
    
    hideOverlay();
    updateHud();
  }

  function nextLevel(){
    if(state.level >= levels.length-1){
      finishGame();
      return;
    }
    state.level++;
    startLevel();
  }

  function placeTile(){
    if(!state.running || state.awaitingCut || overlay.classList.contains('hidden')===false) return;

    const distance = Math.abs(state.meter - 0.5) * 2;
    const q = Math.max(0,Math.round(100 - distance*100));
    const index = state.placed;
    state.lastQuality=q;

    let base=0;
    let label='';
    if(q>=90){
      base=130;
      state.combo=Math.min(12,state.combo+1);
      label='PERFEKTE FUGE!';
    }else if(q>=70){
      base=95;
      state.combo=Math.min(12,state.combo+1);
      label='Sauber gesetzt';
    }else if(q>=45){
      base=60;
      state.combo=Math.max(1,state.combo-1);
      label='Sitzt';
    }else{
      base=25;
      state.combo=1;
      state.hearts--;
      state.badTiles.add(index);
      label='Schief – Nacharbeit!';
    }

    if(q>=90){ tone(880,.10,'triangle');  }
    else if(q>=70){ tone(660,.08,'triangle');  }
    else if(q>=45){ tone(420,.07,'sine');  }
    else { tone(170,.16,'sawtooth');  }

    state.score += base * state.combo;
    state.placed++;
    qualityText.textContent = label + ' · ' + q;
    state.flashes.push({text:'+'+(base*state.combo),life:1,x:canvas.width*0.72,y:95});

    if(state.hearts<=0){
      gameOver();
      updateHud();
      return;
    }

    updateHud();

    if(state.placed>=totalTiles()){
      completeLevel();
      return;
    }

    if(state.placed%6===0){
      window.setTimeout(showCutChallenge,260);
    }
  }

  const conceptQuestions = [
    {tag:'FUGENBILD',q:'Was ist für ein sauberes Fugenbild besonders wichtig?',a:'gleichmäßiger Abstand',opts:['gleichmäßiger Abstand','möglichst viel Kleber','zufälliger Versatz']},
    {tag:'UNTERGRUND',q:'Was ist vor dem Fliesen besonders wichtig?',a:'tragfähiger ebener Untergrund',opts:['tragfähiger ebener Untergrund','möglichst staubiger Boden','nasse Kleberreste']},
    {tag:'KLEBER',q:'Warum wird Kleber mit einer Zahnkelle aufgetragen?',a:'für gleichmäßige Kleberrippen',opts:['für gleichmäßige Kleberrippen','nur zur Dekoration','damit der Kleber schneller trocknet']},
    {tag:'GEFÄLLE',q:'Eine Terrasse braucht Gefälle vom Haus weg. Wohin soll Wasser laufen?',a:'vom Gebäude weg',opts:['zum Gebäude','vom Gebäude weg','zur höchsten Stelle']},
    {tag:'DEHNFUGE',q:'Was sollte man mit vorhandenen Bewegungsfugen im Untergrund machen?',a:'in den Belag übernehmen',opts:['in den Belag übernehmen','immer überfliesen','mit Hartkleber füllen']},
    {tag:'DIAGONALE',q:'Bei diagonaler Verlegung entsteht meistens ...?',a:'mehr Verschnitt',opts:['mehr Verschnitt','gar kein Verschnitt','automatisch weniger Fugen']},
    {tag:'FUGENPLAN',q:'Was hilft gegen sehr schmale Randstreifen?',a:'Verlegebild vorher ausmitteln',opts:['Verlegebild vorher ausmitteln','immer links mit ganzer Fliese starten','Fugenbreite zufällig ändern']},
    {tag:'PRÜFUNG',q:'Womit kontrolliert man, ob eine Fläche eben ist?',a:'Richtlatte oder Wasserwaage',opts:['Richtlatte oder Wasserwaage','Zollstock allein','Fugenkreuz']},
    {tag:'RECHTWINKEL',q:'Welche Seitenlängen bilden ein bekanntes rechtwinkliges Prüfdreieck?',a:'3-4-5',opts:['2-3-4','3-4-5','4-5-6']},
    {tag:'MEISTERFRAGE',q:'Was ist bei einem schwierigen Raum besser als sofort loszufliesen?',a:'erst messen und Verlegeplan machen',opts:['erst messen und Verlegeplan machen','ohne Messen beginnen','nur nach Augenmaß schneiden']},
    {tag:'AUSSENECKE',q:'Was hilft an einer Ecke für ein ruhiges Fugenbild?',a:'Fugen aufeinander abstimmen',opts:['Fugen aufeinander abstimmen','jede Wand anders beginnen','Abstände zufällig ändern']},
    {tag:'GROSSFORMAT',q:'Warum wird bei großen Fliesen oft auch die Rückseite dünn mit Kleber bestrichen?',a:'für bessere Benetzung',opts:['für bessere Benetzung','für mehr Glanz','für breitere Fugen']}
  ];

  let recentCutQuestions = [];

  function shuffleAnswers(arr){
    const copy=arr.slice();
    for(let i=copy.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      const t=copy[i]; copy[i]=copy[j]; copy[j]=t;
    }
    return copy;
  }

  function numQuestion(tag,q,answer,wrong1,wrong2,suffix){
    const s=suffix||'';
    const fmt=function(v){ return String(v).replace('.',',')+s; };
    return {tag:tag,q:q,a:fmt(answer),opts:shuffleAnswers([fmt(answer),fmt(wrong1),fmt(wrong2)])};
  }

  function generateCutQuestion(){
    const level=state.level;
    const type=Math.floor(Math.random()*(level===0?6:level===1?9:level===2?12:15));

    if(type===0){
      const tile=[30,40,45,50,60,80,90][Math.floor(Math.random()*7)];
      const cut=[5,8,10,12,15,18,20][Math.floor(Math.random()*7)];
      const target=tile-cut;
      return numQuestion('GERADER SCHNITT','Eine '+tile+'-cm-Fliese wird auf '+target+' cm gekürzt. Wie viel muss ab?',cut,Math.max(1,cut-3),cut+4,' cm');
    }
    if(type===1){
      const per=[4,5,6,7,8,9][Math.floor(Math.random()*6)];
      const rows=[2,3,4,5][Math.floor(Math.random()*4)];
      const answer=per*rows;
      return numQuestion('MENGE',rows+' Reihen brauchen jeweils '+per+' Fliesen. Wie viele Fliesen sind das?',answer,answer-per,answer+per,'');
    }
    if(type===2){
      const tile=[20,25,30,40,50,60][Math.floor(Math.random()*6)];
      const count=[3,4,5,6,7,8][Math.floor(Math.random()*6)];
      const width=tile*count;
      return numQuestion('EINTEILUNG','Die Wand ist '+width+' cm breit. Wie viele '+tile+'-cm-Fliesen passen ohne Fuge nebeneinander?',count,Math.max(1,count-1),count+1,'');
    }
    if(type===3){
      const tile=[30,40,50,60,80,90][Math.floor(Math.random()*6)];
      return numQuestion('HALBIEREN','Eine '+tile+'-cm-Fliese wird genau halbiert. Wie breit ist jedes Stück?',tile/2,tile/2-5,tile/2+5,' cm');
    }
    if(type===4){
      const boxes=[2,3,4,5][Math.floor(Math.random()*4)];
      const each=[8,10,12,15][Math.floor(Math.random()*4)];
      const answer=boxes*each;
      return numQuestion('KARTONS','In einem Karton liegen '+each+' Fliesen. Wie viele sind in '+boxes+' Kartons?',answer,answer-each,answer+each,'');
    }
    if(type===5){
      const cm=[100,120,150,180,200,250,300][Math.floor(Math.random()*7)];
      const answer=cm/100;
      return numQuestion('MASS',cm+' cm entsprechen wie vielen Metern?',answer,Math.max(0.1,answer-0.5),answer+0.5,' m');
    }
    if(type===6){
      const w=[2,2.5,3,3.5,4][Math.floor(Math.random()*5)];
      const h=[2,2.5,3][Math.floor(Math.random()*3)];
      const answer=w*h;
      return numQuestion('FLÄCHE','Eine Fläche ist '+String(w).replace('.',',')+' m breit und '+String(h).replace('.',',')+' m hoch. Wie groß ist sie?',answer,Math.max(0.5,answer-1),answer+1,' m²');
    }
    if(type===7){
      const need=[20,30,40,50,60][Math.floor(Math.random()*5)];
      const pct=10;
      const reserve=need*pct/100;
      return numQuestion('RESERVE','Du brauchst '+need+' Fliesen und planst '+pct+' % Reserve. Wie viele Fliesen Reserve sind das?',reserve,Math.max(1,reserve-2),reserve+2,'');
    }
    if(type===8){
      const per=[4,5,6][Math.floor(Math.random()*3)];
      const area=[9,10,11,12,13,14,15,16,17,18][Math.floor(Math.random()*10)];
      const answer=Math.ceil(area/per);
      return numQuestion('KLEBER','Ein Sack Fliesenkleber reicht für '+per+' m². Wie viele Säcke braucht man mindestens für '+area+' m²?',answer,Math.max(1,answer-1),answer+1,'');
    }
    if(type===9){
      const size=[20,25,50][Math.floor(Math.random()*3)];
      const perSide=100/size;
      const answer=perSide*perSide;
      return numQuestion('FLIESENMENGE','Quadratische Fliesen messen '+size+' × '+size+' cm. Wie viele braucht man ohne Fuge für 1 m²?',answer,Math.max(1,answer-perSide),answer+perSide,'');
    }
    if(type===10){
      const wall=[8,9,10,12][Math.floor(Math.random()*4)];
      const opening=[1,1.5,2][Math.floor(Math.random()*3)];
      const answer=wall-opening;
      return numQuestion('ABZUG','Eine Wand hat '+String(wall).replace('.',',')+' m². Eine Öffnung mit '+String(opening).replace('.',',')+' m² wird nicht gefliest. Wie viel bleibt?',answer,Math.max(0.5,answer-1),answer+1,' m²');
    }
    if(type===11){
      const tile=[40,50,60][Math.floor(Math.random()*3)];
      const full=[3,4,5][Math.floor(Math.random()*3)];
      const rest=[20,30,40][Math.floor(Math.random()*3)];
      const wall=tile*full+rest;
      const side=rest/2;
      return numQuestion('MITTIG TEILEN','Eine '+wall+'-cm-Wand bekommt '+full+' ganze '+tile+'-cm-Fliesen. Der Rest wird mittig geteilt. Wie breit ist jedes Randstück?',side,Math.max(1,side-5),side+5,' cm');
    }
    if(type===12){
      const area=[10,12,15,20][Math.floor(Math.random()*4)];
      const pct=[10,15][Math.floor(Math.random()*2)];
      const reserve=area*pct/100;
      return numQuestion('VERSCHNITT',pct+' % Reserve auf '+area+' m² sind wie viel zusätzliche Fläche?',reserve,Math.max(0.5,reserve-0.5),reserve+0.5,' m²');
    }
    if(type===13){
      const hours=[2,3,4][Math.floor(Math.random()*3)];
      const rate=[2,3,4][Math.floor(Math.random()*3)];
      const area=hours*rate;
      return numQuestion('ZEIT','Franz schafft '+area+' m² in '+hours+' Stunden. Wie viele m² sind das durchschnittlich pro Stunde?',rate,Math.max(1,rate-1),rate+1,' m²');
    }

    const c=conceptQuestions[Math.floor(Math.random()*conceptQuestions.length)];
    return {tag:c.tag,q:c.q,a:c.a,opts:shuffleAnswers(c.opts)};
  }

  function makeCutQuestion(){
    let item=null;
    for(let tries=0;tries<15;tries++){
      item=generateCutQuestion();
      if(recentCutQuestions.indexOf(item.q)===-1) break;
    }
    recentCutQuestions.push(item.q);
    if(recentCutQuestions.length>12) recentCutQuestions.shift();
    return item;
  }

  function showCutChallenge(){
    if(!state.running) return;
    state.awaitingCut=true;
    state.cutCount++;
    state.running=false;
    placeBtn.disabled=true;

    const item = makeCutQuestion();
    modalTag.textContent=item.tag || 'ZUSCHNITT';
    modalTitle.textContent=item.tag==='ROHR-AUSSCHNITT'?'Rohr im Weg – jetzt sauber anzeichnen.':(item.tag==='DIAGONALSCHNITT'?'Diagonal wird’s knifflig.':'Franz muss kurz an den Fliesenschneider.');
    modalText.textContent='Richtig messen spart Material und bringt Bonuspunkte.';
    cutBox.classList.remove('hidden');
    cutQuestion.textContent=item.q;
    cutFeedback.textContent='';
    cutAnswers.innerHTML='';
    modalActions.innerHTML='';

    item.opts.forEach(function(opt){
      const b=document.createElement('button');
      b.type='button';
      b.textContent=opt;
      b.addEventListener('click',function(){
        Array.from(cutAnswers.querySelectorAll('button')).forEach(function(x){x.disabled=true;});
        if(opt===item.a){
          state.score += 400 + state.combo*25;
          state.combo=Math.min(12,state.combo+1);
          tone(760,.12,'triangle');
          
          cutFeedback.textContent='✓ Passt. Material gespart! + Bonus';
        }else{
          state.combo=1;
          tone(190,.15,'sawtooth');
          
          cutFeedback.textContent='Fast. Richtig wäre: '+item.a;
        }
        updateHud();
        const go=document.createElement('button');
        go.type='button';
        go.textContent='Weiter verlegen';
        go.addEventListener('click',function(){
          cutBox.classList.add('hidden');
          hideOverlay();
          state.awaitingCut=false;
          state.running=true;
          placeBtn.disabled=false;
        });
        modalActions.appendChild(go);
      });
      cutAnswers.appendChild(b);
    });

    overlay.classList.remove('hidden');
  }

  function completeLevel(){
    state.running=false;
    placeBtn.disabled=true;
    const bad=state.badTiles.size;
    const ratio=1-bad/Math.max(1,totalTiles());
    const stars=ratio>0.94?'★★★':ratio>0.82?'★★☆':'★☆☆';
    state.score += Math.round(ratio*1000);
    tone(523,.10,'triangle');
    setTimeout(function(){tone(659,.10,'triangle');},90);
    setTimeout(function(){tone(784,.16,'triangle');},180);
    

    modalTag.textContent='AUFTRAG FERTIG';
    modalTitle.textContent=levels[state.level].name+' ist verfliest.';
    modalText.textContent='Bewertung: '+stars+' · '+bad+' Fliese'+(bad===1?'':'n')+' mit Nacharbeit. Gesamt: '+state.score.toLocaleString('de-DE')+' Punkte.';
    cutBox.classList.add('hidden');
    modalActions.innerHTML='';

    const b=document.createElement('button');
    b.type='button';
    b.textContent=state.level===levels.length-1?'Ergebnis ansehen':'Nächste Baustelle →';
    b.addEventListener('click',function(){
      placeBtn.disabled=false;
      nextLevel();
    });
    modalActions.appendChild(b);
    overlay.classList.remove('hidden');
  }

  function finishGame(){
    state.running=false;
    placeBtn.disabled=true;
    if(state.score>best){
      best=state.score;
      localStorage.setItem('franzFliesenlegerBest',String(best));
      bestScore.textContent=String(best);
    }

    modalTag.textContent='FEIERABEND';
    modalTitle.textContent='Alle Baustellen geschafft!';
    modalText.textContent='Franz beendet den Tag mit '+state.score.toLocaleString('de-DE')+' Punkten. Bestwert auf diesem Gerät: '+best.toLocaleString('de-DE')+'.';
    cutBox.classList.add('hidden');
    modalActions.innerHTML='';

    const again=document.createElement('button');
    again.type='button';
    again.textContent='Nochmal von vorn';
    again.addEventListener('click',resetGame);
    modalActions.appendChild(again);
    overlay.classList.remove('hidden');
  }

  function gameOver(){
    state.running=false;
    placeBtn.disabled=true;
    
    modalTag.textContent='BAUSTELLENSTOPP';
    modalTitle.textContent='Zu viele schiefe Fliesen.';
    modalText.textContent='Kein Problem: Auftrag neu starten und die Fugen diesmal ruhiger treffen.';
    cutBox.classList.add('hidden');
    modalActions.innerHTML='';

    const retry=document.createElement('button');
    retry.type='button';
    retry.textContent='Baustelle neu starten';
    retry.addEventListener('click',function(){
      state.hearts=3;
      state.placed=0;
      state.badTiles.clear();
      state.combo=1;
      placeBtn.disabled=false;
      startLevel();
    });

    const restart=document.createElement('button');
    restart.type='button';
    restart.className='secondary';
    restart.textContent='Ganz von vorn';
    restart.addEventListener('click',resetGame);
    modalActions.appendChild(retry);
    modalActions.appendChild(restart);
    overlay.classList.remove('hidden');
  }

  function showIntro(){
    modalTag.textContent='NEUER AUFTRAG';
    modalTitle.textContent='Franz – Meister der Fuge';
    modalText.textContent='Fünf Baustellen, eine ruhige Hand: Stoppe den Präzisionsmarker möglichst genau in der Mitte. Nach sechs Fliesen wartet jeweils ein kurzer Zuschnitt.';
    cutBox.classList.add('hidden');
    modalActions.innerHTML='';

    const start=document.createElement('button');
    start.type='button';
    start.textContent='Auf die Baustelle';
    start.addEventListener('click',function(){
      placeBtn.disabled=false;
      startLevel();
    });
    modalActions.appendChild(start);
    overlay.classList.remove('hidden');
  }

  function hideOverlay(){
    overlay.classList.add('hidden');
  }

  function drawRoundedRect(x,y,w,h,r,fill,stroke){
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
  }

  function drawRoom(now){
    const l=levels[state.level];
    const marginLeft=220;
    const marginRight=45;
    const marginTop=82;
    const marginBottom=64;
    const areaW=canvas.width-marginLeft-marginRight;
    const areaH=canvas.height-marginTop-marginBottom;
    const cell=Math.min(areaW/l.cols,areaH/l.rows);
    const gridW=cell*l.cols;
    const gridH=cell*l.rows;
    const gx=marginLeft+(areaW-gridW)/2;
    const gy=marginTop+(areaH-gridH)/2;

    ctx.fillStyle=l.wall;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle='#30434b';
    ctx.fillRect(0,0,190,canvas.height);

    ctx.fillStyle='#8a8f8c';
    ctx.fillRect(gx-13,gy-13,gridW+26,gridH+26);

    for(let i=0;i<totalTiles();i++){
      const row=Math.floor(i/l.cols);
      const col=i%l.cols;
      const x=gx+col*cell;
      const y=gy+row*cell;
      const isPlaced=i<state.placed;
      const isBad=state.badTiles.has(i);

      const patterned=((row+col)%2===0 || l.pattern==='straight')?l.tile:l.tile2;
      ctx.fillStyle=isPlaced?(isBad?'#c9796f':patterned):'#b5aea0';
      ctx.fillRect(x+3,y+3,cell-6,cell-6);

      if(isPlaced){
        if(l.pattern==='water' && (i===11 || i===18)){
          ctx.fillStyle='#6c8790';
          ctx.beginPath();ctx.arc(x+cell*.5,y+cell*.5,cell*.18,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#d9e5e7';
          ctx.beginPath();ctx.arc(x+cell*.5,y+cell*.5,cell*.11,0,Math.PI*2);ctx.fill();
        }
        const g=ctx.createLinearGradient(x,y,x+cell,y+cell);
        g.addColorStop(0,'#ffffff42');
        g.addColorStop(0.48,'#ffffff08');
        g.addColorStop(1,'#00000018');
        ctx.fillStyle=g;
        ctx.fillRect(x+4,y+4,cell-8,cell-8);

        if(isBad){
          ctx.strokeStyle='#843d35';
          ctx.lineWidth=4;
          ctx.beginPath();
          ctx.moveTo(x+cell*.18,y+cell*.78);
          ctx.lineTo(x+cell*.45,y+cell*.42);
          ctx.lineTo(x+cell*.77,y+cell*.62);
          ctx.stroke();
        }
      }else if(i===state.placed){
        ctx.strokeStyle='#f0b83f';
        ctx.lineWidth=6;
        ctx.strokeRect(x+5,y+5,cell-10,cell-10);
      }
    }

    ctx.fillStyle='#19303a';
    ctx.font='900 28px system-ui';
    ctx.fillText(l.name,gx,47);
    ctx.font='600 17px system-ui';
    ctx.fillStyle='#506771';
    ctx.fillText(state.placed+' / '+totalTiles()+' Fliesen',gx,70);


    ctx.fillStyle='#eef4f4';
    ctx.font='800 18px system-ui';
    ctx.fillText('ruhig bleiben,',28,555);
    ctx.fillStyle='#e8a82d';
    ctx.fillText('sauber verfugen.',28,578);
  }

  function drawFlashes(dt){
    state.flashes.forEach(function(f){
      f.life-=dt*1.5;
      f.y-=dt*40;
      ctx.globalAlpha=Math.max(0,f.life);
      ctx.fillStyle='#efb63a';
      ctx.font='900 30px system-ui';
      ctx.fillText(f.text,f.x,f.y);
      ctx.globalAlpha=1;
    });
    state.flashes=state.flashes.filter(function(f){return f.life>0;});
  }

  function frame(now){
    const dt=Math.min(.04,(now-lastTime)/1000);
    lastTime=now;

    if(state.running && !state.awaitingCut){
      state.meter += state.direction * levels[state.level].speed * dt;
      if(state.meter>=1){state.meter=1;state.direction=-1;}
      if(state.meter<=0){state.meter=0;state.direction=1;}
      needle.style.left='calc('+(state.meter*100).toFixed(2)+'% - 3px)';
    }

    drawRoom(now);
    drawFlashes(dt);
    requestAnimationFrame(frame);
  }

  placeBtn.addEventListener('click',placeTile);
  canvas.addEventListener('pointerdown',function(e){
    if(e.pointerType==='touch' && state.running) placeTile();
  });
  window.addEventListener('keydown',function(e){
    if(e.code==='Space'){
      e.preventDefault();
      placeTile();
    }
    if(e.key==='r' || e.key==='R'){
      if(overlay.classList.contains('hidden')){
        state.hearts=3;
        state.placed=0;
        state.badTiles.clear();
        state.combo=1;
        startLevel();
      }
    }
  });

  updateHud();
  showIntro();
  requestAnimationFrame(frame);
})();
