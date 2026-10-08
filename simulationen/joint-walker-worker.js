import {restoreGaitTrainer,trainGaitGeneration,gaitSnapshot} from "./joint-walker-core.js?v=1";
let active=false,stop=false,trainer=null,goal=0,done=0;
function end(reason){
 active=false;
 postMessage({type:"done",reason,snapshot:gaitSnapshot(trainer),done,goal});
}
function work(){
 if(!active)return;
 if(stop||done>=goal){end(stop?"stopped":"complete");return;}
 try {
  const result=trainGaitGeneration(trainer);done++;
  postMessage({type:"progress",snapshot:gaitSnapshot(trainer),result,done,goal});
  // Yield to the worker event loop, so "stop" remains responsive.
  setTimeout(work,0);
 } catch(error){
  active=false;postMessage({type:"error",message:String(error?.message||error)});
 }
}
onmessage=(event)=>{
 const data=event.data||{};
 if(data.type==="stop"){stop=true;return;}
 if(data.type==="start"&&!active){
  try {
   const rounds=data.rounds;
   if(!Number.isInteger(rounds)||rounds<1||rounds>100)throw Error("Ungültige Trainingslänge");
   trainer=restoreGaitTrainer(data.snapshot);
   active=true;stop=false;done=0;goal=rounds;
   setTimeout(work,0);
  } catch(error){active=false;postMessage({type:"error",message:String(error?.message||error)});}
 }
};
