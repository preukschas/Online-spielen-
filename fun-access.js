(function(){
'use strict';
const DEFAULT_PIN_HASH='70cc782d';
const PIN_KEY='dmpFunPinHashV1';
const UNLOCK_KEY='dmpFunUnlockedUntilV1';
const FAIL_KEY='dmpFunFailedAttemptsV1';
const LOCK_KEY='dmpFunLockedUntilV1';
const UNLOCK_MS=60*60*1000;
const LOCK_MS=60*1000;
const MAX_FAILS=3;
let expiryTimer=null;

function storage(){
  for(const candidate of [window.localStorage,window.sessionStorage]){
    try{
      const t='__dmp_fun_test__';
      candidate.setItem(t,'1');
      candidate.removeItem(t);
      return candidate;
    }catch(e){}
  }
  return null;
}
const store=storage();

function hashPin(pin){
  let h=2166136261>>>0;
  const s='dmp-fun-v1:'+String(pin);
  for(let i=0;i<s.length;i++){
    h^=s.charCodeAt(i);
    h=Math.imul(h,16777619)>>>0;
  }
  return h.toString(16).padStart(8,'0');
}
function now(){return Date.now();}
function num(key){
  if(!store)return 0;
  const n=Number(store.getItem(key));
  return Number.isFinite(n)?n:0;
}
function pinHash(){
  return store&&store.getItem(PIN_KEY)||DEFAULT_PIN_HASH;
}
function isUnlocked(){
  return num(UNLOCK_KEY)>now();
}
function remainingUnlockMinutes(){
  return Math.max(0,Math.ceil((num(UNLOCK_KEY)-now())/60000));
}
function lockRemainingSeconds(){
  return Math.max(0,Math.ceil((num(LOCK_KEY)-now())/1000));
}
function checkPin(pin){
  const locked=lockRemainingSeconds();
  if(locked>0)return {ok:false,locked:true,seconds:locked};
  if(hashPin(pin)===pinHash()){
    if(store){
      store.setItem(UNLOCK_KEY,String(now()+UNLOCK_MS));
      store.setItem(FAIL_KEY,'0');
      store.removeItem(LOCK_KEY);
    }
    return {ok:true,minutes:60};
  }
  let fails=num(FAIL_KEY)+1;
  if(store)store.setItem(FAIL_KEY,String(fails));
  if(fails>=MAX_FAILS){
    if(store){
      store.setItem(FAIL_KEY,'0');
      store.setItem(LOCK_KEY,String(now()+LOCK_MS));
    }
    return {ok:false,locked:true,seconds:60};
  }
  return {ok:false,locked:false,remaining:MAX_FAILS-fails};
}
function lockNow(){
  if(store)store.removeItem(UNLOCK_KEY);
}
function changePin(oldPin,newPin){
  if(!/^\d{4}$/.test(String(newPin)))return {ok:false,reason:'format'};
  if(hashPin(oldPin)!==pinHash())return {ok:false,reason:'old'};
  if(store){
    store.setItem(PIN_KEY,hashPin(newPin));
    store.setItem(UNLOCK_KEY,String(now()+UNLOCK_MS));
    store.setItem(FAIL_KEY,'0');
    store.removeItem(LOCK_KEY);
  }
  return {ok:true};
}
function resetToDefault(oldPin){
  if(hashPin(oldPin)!==pinHash())return false;
  if(store){
    store.removeItem(PIN_KEY);
    store.setItem(UNLOCK_KEY,String(now()+UNLOCK_MS));
    store.setItem(FAIL_KEY,'0');
    store.removeItem(LOCK_KEY);
  }
  return true;
}
function addGateStyle(){
  if(document.getElementById('dmpFunGateStyle'))return;
  const s=document.createElement('style');
  s.id='dmpFunGateStyle';
  s.textContent=`
html.dmp-fun-locked body>*:not(#dmpFunGate){visibility:hidden!important}
#dmpFunGate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:18px;background:radial-gradient(circle at 50% 15%,#263832 0,#101918 58%,#080d0c 100%);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f7faf8}
#dmpFunGate *{box-sizing:border-box}
#dmpFunGate .dmpGateCard{width:min(100%,430px);padding:26px;border:1px solid #3c514b;border-radius:24px;background:rgba(20,32,29,.97);box-shadow:0 24px 70px rgba(0,0,0,.45);text-align:center}
#dmpFunGate .dmpGateIcon{font-size:58px;line-height:1;margin-bottom:8px}
#dmpFunGate h1{font-size:28px;line-height:1.1;margin:8px 0}
#dmpFunGate p{color:#b7c5c1;line-height:1.5;margin:8px 0 18px}
#dmpFunGate input{width:100%;min-height:54px;border-radius:14px;border:1px solid #4b635c;background:#0e1715;color:white;font-size:22px;text-align:center;letter-spacing:.25em;padding:10px;outline:none}
#dmpFunGate input:focus{border-color:#f2c66d;box-shadow:0 0 0 3px rgba(242,198,109,.14)}
#dmpFunGate button,#dmpFunGate a{display:flex;align-items:center;justify-content:center;width:100%;min-height:50px;border-radius:14px;font-weight:850;font-size:16px;text-decoration:none;margin-top:10px;cursor:pointer}
#dmpFunGate button{border:0;background:#f2c66d;color:#2b220e}
#dmpFunGate a{border:1px solid #425650;color:#d7e1de;background:transparent}
#dmpFunGate .dmpGateMsg{min-height:24px;margin:10px 0 0;color:#ffc8b8;font-weight:750}
#dmpFunGate .dmpGateSmall{font-size:12px;color:#82928d;margin-top:14px}
`;
  document.head.appendChild(s);
}
function removeGate(){
  const g=document.getElementById('dmpFunGate');
  if(g)g.remove();
  document.documentElement.classList.remove('dmp-fun-locked');
}
function armExpiry(options){
  if(expiryTimer)clearTimeout(expiryTimer);
  if(!store)return;
  const ms=num(UNLOCK_KEY)-now();
  if(ms<=0){
    showGate(options||{});
    return;
  }
  expiryTimer=setTimeout(()=>showGate(options||{}),ms+50);
}
function showGate(options){
  options=options||{};
  addGateStyle();
  document.documentElement.classList.add('dmp-fun-locked');
  const render=()=>{
    if(document.getElementById('dmpFunGate'))return;
    const gate=document.createElement('div');
    gate.id='dmpFunGate';
    gate.setAttribute('role','dialog');
    gate.setAttribute('aria-modal','true');
    gate.setAttribute('aria-label','PIN für Spaß-Games');
    const backHref=options.backHref||((location.pathname.replace(/\/+$/,'').split('/').length>2)?'../':'./');
    gate.innerHTML=`<div class="dmpGateCard">
      <div class="dmpGateIcon" aria-hidden="true">🔐🎮</div>
      <div style="color:#f2c66d;font-size:12px;font-weight:900;letter-spacing:.1em;text-transform:uppercase">Spaß-Games geschützt</div>
      <h1>Eltern-PIN nötig</h1>
      <p>Lernspiele bleiben jederzeit frei. Für reine Spaß-Games braucht es die Eltern-PIN.</p>
      <form id="dmpGateForm">
        <input id="dmpGatePin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" aria-label="Vierstellige Eltern-PIN" placeholder="••••">
        <button type="submit">Spielewelt freischalten</button>
      </form>
      <div class="dmpGateMsg" id="dmpGateMsg" aria-live="polite"></div>
      <a href="${backHref}">← Zur Lern- und Spielauswahl</a>
      <div class="dmpGateSmall">Nach richtiger PIN bleibt die Spielewelt 60 Minuten freigeschaltet.</div>
    </div>`;
    document.body.appendChild(gate);
    const form=document.getElementById('dmpGateForm');
    const input=document.getElementById('dmpGatePin');
    const msg=document.getElementById('dmpGateMsg');
    let timer=null;
    function refreshLock(){
      const sec=lockRemainingSeconds();
      if(sec>0){
        input.disabled=true;
        form.querySelector('button').disabled=true;
        msg.textContent='Zu viele Fehlversuche. Noch '+sec+' Sekunden warten.';
        timer=setTimeout(refreshLock,1000);
      }else{
        input.disabled=false;
        form.querySelector('button').disabled=false;
        if(msg.textContent.startsWith('Zu viele'))msg.textContent='';
      }
    }
    refreshLock();
    form.addEventListener('submit',e=>{
      e.preventDefault();
      if(!/^\d{4}$/.test(input.value)){
        msg.textContent='Bitte eine vierstellige PIN eingeben.';
        return;
      }
      const result=checkPin(input.value);
      input.value='';
      if(result.ok){
        if(timer)clearTimeout(timer);
        removeGate();
        if(options.relockOnExpiry)armExpiry(options);
        if(typeof options.onUnlock==='function')options.onUnlock();
      }else if(result.locked){
        refreshLock();
      }else{
        msg.textContent='PIN falsch. Noch '+result.remaining+' Versuch'+(result.remaining===1?'':'e')+'.';
        input.focus();
      }
    });
    setTimeout(()=>{if(!input.disabled)input.focus();},30);
  };
  if(document.body)render(); else document.addEventListener('DOMContentLoaded',render,{once:true});
}
function requireAccess(options){
  options=Object.assign({},options||{},{relockOnExpiry:true});
  if(isUnlocked()){
    document.documentElement.classList.remove('dmp-fun-locked');
    armExpiry(options);
    return true;
  }
  document.documentElement.classList.add('dmp-fun-locked');
  showGate(options);
  return false;
}
function requestAccess(options){
  options=options||{};
  if(isUnlocked()){
    if(typeof options.onUnlock==='function')options.onUnlock();
    return true;
  }
  showGate(options);
  return false;
}
window.DMPFunAccess={
  isUnlocked,
  requestAccess,
  requireAccess,
  checkPin,
  lockNow,
  changePin,
  resetToDefault,
  remainingUnlockMinutes,
  lockRemainingSeconds
};
})();