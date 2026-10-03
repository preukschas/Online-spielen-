(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const titleEl = document.getElementById('modalTitle');
  const textEl = document.getElementById('modalText');
  const tagEl = document.getElementById('modalTag');
  const actionsEl = document.getElementById('modalActions');
  const questionBox = document.getElementById('questionBox');
  const answerEl = document.getElementById('answer');
  const unitEl = document.getElementById('answerUnit');
  const feedbackEl = document.getElementById('feedback');
  const toastEl = document.getElementById('toast');
  const saveKey = 'dmp-mario-maler-v1';
  const W = 900, H = 540;
  const paintImage = new Image();
  paintImage.src = 'assets/mario.webp';
  const jobs = [
    {
      name: 'Die Gartenmauer', location: 'Schutterwald', color: '#e9be63', accent: '#79b7d7',
      brief: 'Ein sonniger Anstrich für die Gartenmauer. Zuerst müssen im Büro die Eimer zusammengerechnet werden.',
      questions: [
        {where:'Büro · Materialliste', prompt:'Im Lager stehen 24 kleine und 18 große Pinsel. Wie viele Pinsel sind das zusammen?', answer:42, unit:'Pinsel', hint:'Rechne erst 24 + 10 und dann + 8.', explain:'24 + 18 = 42.'},
        {where:'Baustelle · Bestand prüfen', prompt:'63 Abdeckfolien sind da. 28 wurden verbraucht. Wie viele sind noch übrig?', answer:35, unit:'Folien', hint:'63 − 20 − 8.', explain:'63 − 28 = 35.'},
        {where:'Baustelle · Vermessen', prompt:'Eine Mauer ist 8 m lang. Ein 3 m breites Tor bleibt frei. Wie viele Meter streicht Mario?', answer:5, unit:'m', hint:'Ziehe die Torbreite von 8 m ab.', explain:'8 m − 3 m = 5 m.'}
      ]
    },
    {
      name: 'Das bunte Vereinsheim', location: 'Ortenau', color: '#7cc7b8', accent: '#ffcb78',
      brief: 'Im Vereinsheim warten mehrere Wände. Packe die Farbrollen passend ein.',
      questions: [
        {where:'Büro · Rollen bestellen', prompt:'7 Kartons enthalten jeweils 6 Farbrollen. Wie viele Rollen sind das?', answer:42, unit:'Rollen', hint:'Das ist 7 × 6 aus dem kleinen Einmaleins.', explain:'7 × 6 = 42.'},
        {where:'Baustelle · Fläche', prompt:'Eine Wand ist 4 m breit und 3 m hoch. Wie groß ist ihre Fläche?', answer:12, unit:'m²', hint:'Breite × Höhe.', explain:'4 m × 3 m = 12 m².'},
        {where:'Baustelle · Nachschub', prompt:'9 Eimer stehen im Auto und 4 im Büro. 2 sind schon leer. Wie viele volle Eimer bleiben?', answer:11, unit:'Eimer', hint:'Erst 9 + 4, dann 2 abziehen.', explain:'9 + 4 − 2 = 11.'}
      ]
    },
    {
      name: 'Die große Fassade', location: 'Offenburg', color: '#86b1df', accent: '#f8c969',
      brief: 'Jetzt wird die Fassade höher. Gerüst freigeben und die Fensterfläche abziehen.',
      questions: [
        {where:'Büro · Gerüstteile', prompt:'9 Stapel mit jeweils 8 Gerüstschellen: Wie viele Schellen sind es?', answer:72, unit:'Schellen', hint:'9 × 8 = ?', explain:'9 × 8 = 72.'},
        {where:'Baustelle · Vermessen', prompt:'Die Wand ist 5 m breit und 3 m hoch. Wie viele Quadratmeter sind das?', answer:15, unit:'m²', hint:'5 × 3.', explain:'5 m × 3 m = 15 m².'},
        {where:'Baustelle · Fenster aussparen', prompt:'Die Wand hat 15 m², das Fenster 3 m². Wie viel Fläche wird gestrichen?', answer:12, unit:'m²', hint:'15 − 3.', explain:'15 m² − 3 m² = 12 m².'}
      ]
    },
    {
      name: 'Der Auftrag mit Sonderwunsch', location: 'Kehl', color: '#e5a877', accent: '#82bfdf',
      brief: 'Der Kunde hat einen Farbwunsch. Berate ihn, während du die Materialmenge im Blick behältst.',
      questions: [
        {where:'Büro · Lieferschein', prompt:'52 L Farbvorrat, 37 L neue Lieferung: Wie viele Liter sind verfügbar?', answer:89, unit:'L', hint:'52 + 30 + 7.', explain:'52 + 37 = 89 L.'},
        {where:'Baustelle · Fläche', prompt:'Die Wand ist 6 m breit und 4 m hoch. Wie groß ist sie?', answer:24, unit:'m²', hint:'6 × 4.', explain:'6 m × 4 m = 24 m².'},
        {where:'Baustelle · Farbbedarf', prompt:'1 L Farbe reicht für 4 m². Wie viele Liter braucht eine Fläche von 24 m²?', answer:6, unit:'L', hint:'Wie oft passt 4 in 24?', explain:'24 ÷ 4 = 6 L.'}
      ]
    },
    {
      name: 'Das Finale am Rathaus', location: 'Ortenau', color: '#a6c17a', accent: '#f3ba76',
      brief: 'Der größte Auftrag! Berechne die Anstrichfläche und plane die Eimer genau.',
      questions: [
        {where:'Büro · Endabrechnung', prompt:'84 m Abdeckband sind da, 27 m werden für Fenster gebraucht. Wie viele Meter bleiben?', answer:57, unit:'m', hint:'84 − 20 − 7.', explain:'84 − 27 = 57 m.'},
        {where:'Baustelle · echte Fläche', prompt:'Die Fassade ist 7 m breit und 5 m hoch. Ein Fenster mit 5 m² bleibt frei. Wie viele m² werden gestrichen?', answer:30, unit:'m²', hint:'Erst 7 × 5, dann 5 abziehen.', explain:'7 × 5 − 5 = 30 m².'},
        {where:'Baustelle · Farbbedarf', prompt:'1 L Farbe reicht für 5 m². Wie viele Liter braucht Mario für 30 m²?', answer:6, unit:'L', hint:'30 ÷ 5.', explain:'30 ÷ 5 = 6 L.'}
      ]
    }
  ];

  const state = {
    phase: 'intro', jobIndex: 0, stars: 0, painted: Array(12).fill(false), paintProgress: 0,
    x: 155, row: 0, milestones: new Set(), paintColor: jobs[0].color,
    speedBonus: false, sound: true, question: null, wrong: 0, lastTime: 0,
    keys: {left:false,right:false,up:false,down:false,paint:false}, ladderReady: true
  };
  try {
    const saved = JSON.parse(localStorage.getItem(saveKey) || 'null');
    if (saved && Number.isInteger(saved.jobIndex) && saved.jobIndex >= 0 && saved.jobIndex <= jobs.length) {
      state.jobIndex = saved.jobIndex;
      state.stars = Number.isInteger(saved.stars) ? Math.max(0,saved.stars) : 0;
    }
  } catch (_) { /* storage may be unavailable */ }
  const job = () => jobs[Math.min(state.jobIndex, jobs.length-1)];
  const count = () => state.painted.filter(Boolean).length;

  const recentQuestionPrompts = [];
  const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
  function generatedQuestion(slot){
    const j=Math.min(state.jobIndex,jobs.length-1);
    let q;
    if(slot===0){
      if(j===0){const a=rnd(18,39),b=rnd(11,34);q={where:'Büro · Materialliste',prompt:`Im Lager stehen ${a} kleine und ${b} große Pinsel. Wie viele Pinsel sind das zusammen?`,answer:a+b,unit:'Pinsel',hint:`Rechne ${a} + ${b}.`,explain:`${a} + ${b} = ${a+b}.`};}
      else if(j===1){const a=rnd(4,9),b=rnd(3,8);q={where:'Büro · Rollen bestellen',prompt:`${a} Kartons enthalten jeweils ${b} Farbrollen. Wie viele Rollen sind das?`,answer:a*b,unit:'Rollen',hint:`Das ist ${a} × ${b}.`,explain:`${a} × ${b} = ${a*b}.`};}
      else if(j===2){const a=rnd(6,10),b=rnd(5,9);q={where:'Büro · Gerüstteile',prompt:`${a} Stapel mit jeweils ${b} Gerüstschellen: Wie viele Schellen sind es?`,answer:a*b,unit:'Schellen',hint:`Rechne ${a} × ${b}.`,explain:`${a} × ${b} = ${a*b}.`};}
      else if(j===3){const a=rnd(35,69),b=rnd(20,49);q={where:'Büro · Lieferschein',prompt:`${a} L Farbvorrat und ${b} L neue Lieferung: Wie viele Liter sind verfügbar?`,answer:a+b,unit:'L',hint:`Rechne ${a} + ${b}.`,explain:`${a} + ${b} = ${a+b} L.`};}
      else{const a=rnd(75,99),b=rnd(21,49);q={where:'Büro · Endabrechnung',prompt:`${a} m Abdeckband sind da, ${b} m werden gebraucht. Wie viele Meter bleiben?`,answer:a-b,unit:'m',hint:`Rechne ${a} − ${b}.`,explain:`${a} − ${b} = ${a-b} m.`};}
    }else if(slot===1){
      if(j===0){const a=rnd(7,12),b=rnd(2,4);q={where:'Baustelle · Vermessen',prompt:`Eine Mauer ist ${a} m lang. Ein ${b} m breites Tor bleibt frei. Wie viele Meter streicht Mario?`,answer:a-b,unit:'m',hint:`Ziehe ${b} von ${a} ab.`,explain:`${a} − ${b} = ${a-b} m.`};}
      else if(j===4){const w=rnd(6,9),h=rnd(4,6),win=rnd(4,8),area=w*h-win;q={where:'Baustelle · echte Fläche',prompt:`Die Fassade ist ${w} m breit und ${h} m hoch. ${win} m² Fensterfläche bleiben frei. Wie viele m² werden gestrichen?`,answer:area,unit:'m²',hint:`Erst ${w} × ${h}, dann ${win} abziehen.`,explain:`${w} × ${h} − ${win} = ${area} m².`};}
      else{const w=rnd(j===1?3:4,j===1?6:8),h=rnd(2,5);q={where:'Baustelle · Fläche',prompt:`Eine Wand ist ${w} m breit und ${h} m hoch. Wie groß ist ihre Fläche?`,answer:w*h,unit:'m²',hint:'Breite × Höhe.',explain:`${w} × ${h} = ${w*h} m².`};}
    }else{
      if(j<=1){const a=rnd(7,15),b=rnd(3,9),used=rnd(1,Math.min(5,a+b-1));q={where:'Baustelle · Nachschub',prompt:`${a} Eimer stehen im Auto und ${b} im Büro. ${used} sind leer. Wie viele volle Eimer bleiben?`,answer:a+b-used,unit:'Eimer',hint:`Erst ${a} + ${b}, dann ${used} abziehen.`,explain:`${a} + ${b} − ${used} = ${a+b-used}.`};}
      else if(j===2){const w=rnd(5,8),h=rnd(3,5),win=rnd(2,6),area=w*h-win;q={where:'Baustelle · Fenster aussparen',prompt:`Die Wand ist ${w} m × ${h} m groß. ${win} m² Fenster bleiben frei. Wie viel Fläche wird gestrichen?`,answer:area,unit:'m²',hint:`Erst ${w} × ${h}, dann ${win} abziehen.`,explain:`${w} × ${h} − ${win} = ${area} m².`};}
      else{const cover=rnd(j===3?3:4,6),liters=rnd(4,9),area=cover*liters;q={where:'Baustelle · Farbbedarf',prompt:`1 L Farbe reicht für ${cover} m². Wie viele Liter braucht Mario für ${area} m²?`,answer:liters,unit:'L',hint:`${area} ÷ ${cover}.`,explain:`${area} ÷ ${cover} = ${liters} L.`};}
    }
    return {...q,_slot:slot};
  }
  function pickQuestion(slot){
    let q=generatedQuestion(slot),tries=0;
    while(recentQuestionPrompts.includes(q.prompt)&&tries++<12)q=generatedQuestion(slot);
    recentQuestionPrompts.push(q.prompt);
    if(recentQuestionPrompts.length>18)recentQuestionPrompts.shift();
    return q;
  }
  const updateHud = () => {
    document.getElementById('jobLabel').textContent = state.jobIndex >= jobs.length ? 'Alle Aufträge geschafft' : `Auftrag ${state.jobIndex+1} von ${jobs.length}: ${job().name}`;
    document.getElementById('progressLabel').textContent = `${count()} / 12 Felder`;
    document.getElementById('starLabel').textContent = `⭐ ${state.stars}`;
  };
  function save() { try { localStorage.setItem(saveKey, JSON.stringify({jobIndex:state.jobIndex, stars:state.stars})); } catch (_) {} }
  let toastTimer;
  function toast(message) {
    toastEl.textContent = message; toastEl.classList.remove('hidden');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2400);
  }
  let audio;
  function beep(frequency=520, duration=.08) {
    if (!state.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.035, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime+duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(); oscillator.stop(audio.currentTime+duration);
    } catch (_) {}
  }
  document.getElementById('soundBtn').addEventListener('click', e => {
    state.sound = !state.sound; e.currentTarget.textContent = state.sound ? '🔊 Ton an' : '🔇 Ton aus';
  });

  function showModal(tag, title, text, buttons) {
    Object.keys(state.keys).forEach(key => state.keys[key] = false);
    state.paintProgress = 0;
    tagEl.textContent = tag; titleEl.textContent = title; textEl.textContent = text;
    questionBox.classList.add('hidden'); feedbackEl.textContent = '';
    actionsEl.replaceChildren();
    for (const b of buttons) {
      const button = document.createElement('button'); button.type='button'; button.textContent=b.label;
      if (b.secondary) button.classList.add('secondary');
      button.addEventListener('click', b.action); actionsEl.append(button);
    }
    overlay.classList.remove('hidden');
  }
  function hideModal() { overlay.classList.add('hidden'); if (document.activeElement===answerEl) answerEl.blur(); state.question=null; state.phase='site'; state.ladderReady=true; }
  function openQuestion(q, onCorrect) {
    state.phase='question'; state.question=q; state.wrong=0;
    showModal(q.where, 'Rechnen für den Auftrag', q.prompt, [{label:'Antwort prüfen', action:submitAnswer}]);
    questionBox.classList.remove('hidden'); unitEl.textContent=q.unit; answerEl.value='';
    state.afterAnswer=onCorrect; setTimeout(() => answerEl.focus(), 20);
  }
  function submitAnswer() {
    if (state.phase !== 'question' || !state.question) return;
    const raw = answerEl.value.trim();
    if (!/^-?\d+$/.test(raw)) { feedbackEl.textContent='Bitte eine ganze Zahl eingeben.'; answerEl.focus(); return; }
    const q = state.question;
    if (Number(raw) !== q.answer) {
      state.wrong++; feedbackEl.textContent=`Noch nicht. Tipp: ${q.hint}`;
      answerEl.select(); beep(210,.12); return;
    }
    const bonus=state.wrong===0 ? 2 : 1;
    state.phase='answered';state.question=null;
    state.stars += bonus; updateHud(); beep(650,.13);
    const next=state.afterAnswer;
    showModal('Richtig!', 'Sauber gerechnet!', `${q.explain} ${bonus===2?'⭐ Zwei Sterne für die erste richtige Antwort!':'⭐ Gut drangeblieben!'}`, [{label:state.jobIndex===0&&q._slot===0?'Zur Baustelle':'Weiter',action:()=>{hideModal();next();}}]);
  }
  answerEl.addEventListener('keydown', e=>{if(e.key==='Enter'){e.preventDefault();if(e.repeat)return;submitAnswer();}});

  function startJob() {
    if (state.jobIndex >= jobs.length) { showFinal(); return; }
    state.phase='office'; state.painted=Array(12).fill(false); state.milestones=new Set();
    state.x=155; state.row=0; state.paintColor=job().color; state.speedBonus=false; updateHud();
    showModal(`Auftrag ${state.jobIndex+1} · ${job().location}`,job().name,job().brief,[
      {label:'Ins Büro',action:()=>openQuestion(pickQuestion(0),()=>toast('Auftrag vorbereitet – ab auf das Gerüst!'))}
    ]);
  }
  function colleague() {
    state.phase='dialogue';
    const line=['„Mario, welcher Eimer gehört nach oben? Die Etiketten sind durcheinander!“','„Kannst du kurz helfen, die Rollen zu sortieren?“','„Der Pinsel ist weg. Wer hat ihn zuletzt gesehen?“','„Die Abdeckfolie flattert! Was machen wir?“','„Die letzte Farbrolle ist verschwunden!“'][state.jobIndex];
    showModal('Kollege auf der Baustelle','Kurze Teamfrage',line,[
      {label:'Zusammen lösen',action:()=>{state.speedBonus=true;state.stars++;updateHud();hideModal();toast('Teamwork! Mario streicht jetzt schneller. ⭐');}},
      {label:'Mit Humor weiter',secondary:true,action:()=>{hideModal();toast('Ein Lacher hilft. Weiter geht’s!');}}
    ]);
  }
  function customer() {
    state.phase='dialogue';
    showModal('Kunde vor Ort','Noch ein Sonderwunsch!',
      '„Das sieht gut aus. Können wir den Rest etwas anders absetzen?“ Mario kann zuerst abstimmen oder gleich ein Musterfeld anlegen.',[
      {label:'Farbton absprechen',action:()=>{state.stars++;updateHud();hideModal();toast('Kunde zufrieden: klare Absprache! ⭐');}},
      {label:'Musterfeld streichen',secondary:true,action:()=>{state.paintColor=job().accent;hideModal();toast('Neue Akzentfarbe für die übrigen Felder!');}}
    ]);
  }
  function afterPaint() {
    const n=count(); updateHud(); beep(460+n*15,.065);
    if (n===12) { finishJob(); return; }
    if (n===2 && !state.milestones.has('colleague')) {state.milestones.add('colleague');colleague();return;}
    if (n===4 && !state.milestones.has('measure')) {state.milestones.add('measure');openQuestion(pickQuestion(1),()=>toast('Maße stimmen – weiter streichen!'));return;}
    if (n===7 && !state.milestones.has('customer')) {state.milestones.add('customer');customer();return;}
    if (n===9 && !state.milestones.has('paintmath')) {state.milestones.add('paintmath');openQuestion(pickQuestion(2),()=>toast('Material geplant – die letzten Felder warten!'));}
  }
  function finishJob() {
    state.phase='complete'; state.stars+=3; state.jobIndex++; save(); updateHud(); beep(850,.2);
    showModal('Fassade fertig!','Stark gemacht, Mario!',
      `Alle 12 Wandfelder sind gestrichen. Drei Abschlusssterne kommen dazu. ${state.jobIndex<jobs.length?'Der nächste Auftrag wartet schon.':'Du hast die ganze Auftragsliste geschafft!'}`,[
        {label:state.jobIndex<jobs.length?'Nächster Auftrag':'Ergebnis ansehen',action:()=>state.jobIndex<jobs.length?startJob():showFinal()}
      ]);
  }
  function showFinal() {
    state.phase='final'; updateHud();
    showModal('Feierabend','Mario, Malermeister auf Tour!',
      `Fünf Aufträge, fünf Fassaden und ${state.stars} Sterne. Du hast gerechnet, gemessen, Farbe geplant und dich auf dem Gerüst durchgearbeitet.`,[
        {label:'Noch einmal spielen',action:()=>{state.jobIndex=0;state.stars=0;save();startJob();}}
      ]);
  }
  function intro() {
    const completed=state.jobIndex;
    showModal('Marios Malerabenteuer','Die Baustelle ruft!',
      'Klettere auf die Gerüste, streiche Fassaden und löse echte Rechenaufgaben im Büro und auf der Baustelle. Fehler sind okay: Mario gibt dir einen Tipp und du versuchst es erneut.',[
        {label:completed>=jobs.length?'Ergebnis ansehen':completed?'Weiter bei Auftrag '+(completed+1):'Spiel starten',action:()=>completed>=jobs.length?showFinal():startJob()},
        ...(completed?[{label:'Von vorn beginnen',secondary:true,action:()=>{state.jobIndex=0;state.stars=0;save();startJob();}}]:[])
      ]);
  }

  const controlButtons=[...document.querySelectorAll('[data-control]')];
  controlButtons.forEach(button => {
    const name=button.dataset.control;
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);state.keys[name]=true;button.classList.add('pressed');if(name==='up'||name==='down')tryClimb(name);});
    for(const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event,()=>{state.keys[name]=false;button.classList.remove('pressed');});
  });
  const keyMap={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',' ':'paint'};
  window.addEventListener('keydown',e=>{
    if (e.target===answerEl && !overlay.classList.contains('hidden')) return;
    const name=keyMap[e.key]; if (!name) return; e.preventDefault();
    if (!state.keys[name]&&(name==='up'||name==='down')) tryClimb(name);
    state.keys[name]=true;
  });
  window.addEventListener('keyup',e=>{const name=keyMap[e.key];if(name)state.keys[name]=false;});
  window.addEventListener('blur',()=>{Object.keys(state.keys).forEach(k=>state.keys[k]=false);controlButtons.forEach(b=>b.classList.remove('pressed'));});
  function tryClimb(direction) {
    if (state.phase!=='site' || !state.ladderReady) return;
    if (Math.abs(state.x-155)>47 && Math.abs(state.x-805)>47) {toast('Zum Klettern an eine blaue Leiter gehen.');return;}
    const next=state.row+(direction==='up'?1:-1);
    if (next<0||next>2) {toast(next>2?'Höher geht es nicht.':'Hier ist schon der Boden.');return;}
    state.row=next;state.ladderReady=false;beep(390,.09);
    setTimeout(()=>state.ladderReady=true,260);
  }
  function nearestCell() {
    const col=Math.round((state.x-270)/140);
    if(col<0||col>3||Math.abs(state.x-(270+col*140))>67)return -1;
    return state.row*4+col;
  }
  function tick(dt) {
    if (state.phase!=='site') return;
    const dx=(state.keys.right?1:0)-(state.keys.left?1:0);
    if(dx){state.x=Math.max(130,Math.min(830,state.x+dx*230*dt));state.paintProgress=0;}
    if(state.keys.paint && !dx){
      const cell=nearestCell();
      if(cell>=0&&!state.painted[cell]){
        state.paintProgress+=dt*(state.speedBonus?1.7:1);
        if(state.paintProgress>=.54){state.painted[cell]=true;state.paintProgress=0;afterPaint();}
      } else state.paintProgress=0;
    }
  }

  function roundedRect(x,y,w,h,r,fill,stroke) {
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
  }
  function draw() {
    const config=job();
    const sky=ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#8cc9e7');sky.addColorStop(1,'#f4ddaa');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fff7d4';ctx.beginPath();ctx.arc(748,78,37,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#659687';ctx.beginPath();ctx.moveTo(0,392);ctx.quadraticCurveTo(100,280,248,385);ctx.quadraticCurveTo(400,310,600,381);ctx.quadraticCurveTo(760,310,900,375);ctx.lineTo(900,540);ctx.lineTo(0,540);ctx.fill();
    ctx.fillStyle='#356c58';ctx.fillRect(0,470,W,70);
    // Building and facade. Painted panels are the actual play targets.
    roundedRect(185,82,590,393,9,'#e7dac3','#c9b995');
    ctx.fillStyle='#4d6864';ctx.fillRect(175,75,610,16);
    for(let row=0;row<3;row++) for(let col=0;col<4;col++){
      const i=row*4+col, x=208+col*140, y=340-row*116;
      roundedRect(x,y,124,105,5,state.painted[i] ? (i<7?config.color:state.paintColor) : '#f0e9d9',state.painted[i]?'#b0a581':'#d7c6a8');
      if(!state.painted[i]){
        ctx.fillStyle='#c3b9a5';ctx.font='800 25px system-ui';ctx.textAlign='center';ctx.fillText('✦',x+62,y+59);
      } else {
        ctx.fillStyle='#ffffff22';ctx.fillRect(x+10,y+12,104,8);
      }
    }
    // Scaffold rails and ladders.
    ctx.strokeStyle='#5b6670';ctx.lineWidth=8;ctx.lineCap='round';
    for(const x of [160,790]){ctx.beginPath();ctx.moveTo(x,95);ctx.lineTo(x,468);ctx.stroke();}
    for(const y of [215,331,447]){ctx.beginPath();ctx.moveTo(129,y);ctx.lineTo(831,y);ctx.stroke();ctx.fillStyle='#88715a';ctx.fillRect(128,y-3,704,11);}
    ctx.strokeStyle='#7a98a7';ctx.lineWidth=4;
    for(const x of [155,805]){
      for(const side of [-11,11]){ctx.beginPath();ctx.moveTo(x+side,102);ctx.lineTo(x+side,449);ctx.stroke();}
      for(let y=115;y<449;y+=22){ctx.beginPath();ctx.moveTo(x-11,y);ctx.lineTo(x+11,y);ctx.stroke();}
    }
    // Highlight the reachable unpainted panel.
    if(state.phase==='site'){
      const i=nearestCell();
      if(i>=0&&!state.painted[i]){
        const c=i%4, r=Math.floor(i/4), x=208+c*140, y=340-r*116;
        ctx.setLineDash([8,6]);ctx.lineWidth=4;ctx.strokeStyle='#fff6a9';ctx.strokeRect(x+3,y+3,118,99);ctx.setLineDash([]);
        if(state.paintProgress){ctx.fillStyle='#fff3a8';ctx.fillRect(x+8,y+90,108*Math.min(1,state.paintProgress/.54),7);}
      }
    }
    // Mario caricature: generated from the user's photo; fallback remains playable if image cannot load.
    const feet=440-state.row*116;
    if(paintImage.complete&&paintImage.naturalWidth){ctx.drawImage(paintImage,state.x-39,feet-100,78,105);}
    else {ctx.fillStyle='#303635';roundedRect(state.x-24,feet-64,48,63,13,'#303635');ctx.fillStyle='#d99b78';ctx.beginPath();ctx.arc(state.x,feet-78,18,0,Math.PI*2);ctx.fill();}
    roundedRect(18,15,Math.min(495,config.name.length*19+190),47,12,'#183d39dd');
    ctx.textAlign='left';ctx.fillStyle='#fff8df';ctx.font='800 22px system-ui';ctx.fillText(config.name,34,46);
    if(state.phase==='site'&&nearestCell()<0){roundedRect(295,482,310,40,12,'#183d39d9');ctx.fillStyle='#fff';ctx.font='700 16px system-ui';ctx.fillText('Zur Wand gehen und 🖌️ gedrückt halten',310,508);}
  }
  function frame(time){const dt=Math.min(.05,(time-state.lastTime)/1000||0);state.lastTime=time;tick(dt);draw();requestAnimationFrame(frame);}
  updateHud();intro();requestAnimationFrame(frame);
})();
