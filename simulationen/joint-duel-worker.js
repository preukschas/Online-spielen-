import {newGaitTrainer,trainGaitGeneration,gaitSnapshot} from "./joint-walker-core.js";
import {restoreJointDuel,jointDuelSnapshot,evolveJointDuelGeneration,runJointDuel} from "./joint-duel-core.js";
let session=null;
function finish(reason){
 const s=session;if(!s)return;
 if(s.type==="gait")postMessage({type:"done-gait",reason,completed:s.done,requested:s.count,checkpoint:gaitSnapshot(s.data)});
 if(s.type==="duel")postMessage({type:"done-duel",reason,completed:s.done,requested:s.count,snapshot:jointDuelSnapshot(s.data)});
 if(s.type==="tournament")postMessage({type:"done-tournament",reason,results:s.results,completed:s.done});
 session=null;
}
function advance(){
 const s=session;if(!s)return;
 if(s.stop||s.done>=s.count){finish(s.stop?"stopped":"complete");return;}
 try{
  if(s.type==="gait"){
   const result=trainGaitGeneration(s.data);s.done++;
   postMessage({type:"progress-gait",done:s.done,total:s.count,fitness:result.training,holdout:result.validation,rate:result.success});
  }else if(s.type==="duel"){
   const result=evolveJointDuelGeneration(s.data);s.done++;
   postMessage({type:"progress-duel",done:s.done,total:s.count,snapshot:jointDuelSnapshot(s.data),result});
  }else if(s.type==="tournament"){
   const side=s.done%2;
   const seed=s.data.seed+30001+Math.floor(s.done/2)*97;
   const t=s.data;
   const game=side===0?runJointDuel(t.gaitA,t.gaitB,t.tactics[0],t.tactics[1],seed):
    runJointDuel(t.gaitB,t.gaitA,t.tactics[1],t.tactics[0],seed);
   const winner=game.winner===-1?2:side===0?game.winner:1-game.winner;
   s.results[winner]++;
   s.done++;
   if(s.done%4===0||s.done===s.count)postMessage({type:"progress-tournament",done:s.done,total:s.count,results:s.results});
  }
  setTimeout(advance,0);
 }catch(e){postMessage({type:"error",message:String(e?.message||e)});session=null;}
}
onmessage=e=>{
 const m=e.data||{};
 if(m.type==="stop"){if(session)session.stop=true;return;}
 if(session)return;
 try{
  if(m.type==="start-gait"){
   if(!Number.isInteger(m.rounds)||m.rounds<1||m.rounds>100)throw Error("Ungültige Lauftraining-Runden");
   session={type:"gait",data:newGaitTrainer(m.seed||42),done:0,count:m.rounds,stop:false};
  }else if(m.type==="start-duel"){
   if(!Number.isInteger(m.rounds)||m.rounds<1||m.rounds>100)throw Error("Ungültige Duelltraining-Runden");
   session={type:"duel",data:restoreJointDuel(m.snapshot),done:0,count:m.rounds,stop:false};
  }else if(m.type==="start-tournament"){
   if(!Number.isInteger(m.rounds)||m.rounds<1||m.rounds>100||m.rounds%2)throw Error("Turnier benötigt eine gerade Rundenzahl");
   session={type:"tournament",data:restoreJointDuel(m.snapshot),done:0,count:m.rounds,stop:false,results:[0,0,0]};
  }else return;
  setTimeout(advance,0);
 }catch(error){postMessage({type:"error",message:String(error?.message||error)});}
};
