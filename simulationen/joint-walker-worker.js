import {restoreGaitTrainer,trainGaitGeneration,gaitSnapshot,gaitRivalTrial} from "./joint-walker-core.js?v=3";
let active=false,stop=false,trainer=null,trainers=null,mode="single",side="both",goal=0,done=0;
function end(reason){
 active=false;
 if(mode==="pair")postMessage({type:"done-pair",reason,snapshots:trainers.map(gaitSnapshot),done,goal});
 else postMessage({type:"done",reason,snapshot:gaitSnapshot(trainer),done,goal});
}
function work(){
 if(!active)return;
 if(stop||done>=goal){end(stop?"stopped":"complete");return;}
 try {
  if(mode==="pair"){
   const [a,b]=trainers;
   // Snapshot rival champions BEFORE the training step: no one gets to react to a future opponent.
   const wa=a.champion||a.baseline,wb=b.champion||b.baseline;
   const contestSeed=1+(a.seed+8101+(done%7)*109)%900000000;
   const resultA=side==="B"?null:trainGaitGeneration(a,wb,contestSeed);
   const resultB=side==="A"?null:trainGaitGeneration(b,wa,contestSeed);
   done++;
   const test=gaitRivalTrial(a.champion||a.baseline,b.champion||b.baseline,contestSeed,a.entity);
   postMessage({type:"progress-pair",snapshots:trainers.map(gaitSnapshot),resultA,resultB,
     contest:{winner:test.winner,distanceA:test.a.distance,distanceB:test.b.distance,reachedA:test.a.reached,
      reachedB:test.b.reached,timeA:test.a.time,timeB:test.b.time},done,goal,side});
  }else{
   const result=trainGaitGeneration(trainer);done++;
   postMessage({type:"progress",snapshot:gaitSnapshot(trainer),result,done,goal});
  }
  setTimeout(work,0);
 } catch(error){active=false;postMessage({type:"error",message:String(error?.message||error)});}
}
onmessage=event=>{
 const data=event.data||{};
 if(data.type==="stop"){stop=true;return;}
 if(active)return;
 if(data.type!=="start"&&data.type!=="start-pair")return;
 try{
  const rounds=data.rounds;
  if(!Number.isInteger(rounds)||rounds<1||rounds>100)throw Error("Ungültige Trainingslänge");
  if(data.type==="start-pair"){
   if(!Array.isArray(data.snapshots)||data.snapshots.length!==2)throw Error("Zwei vollständige Modellstände erforderlich");
   trainers=data.snapshots.map(restoreGaitTrainer);
   if(JSON.stringify(trainers[0].entity)!==JSON.stringify(trainers[1].entity))
    throw Error("Die Modelle müssen dieselbe Körperdefinition benutzen");
   if(!["both","A","B"].includes(data.side))throw Error("Ungültige Team-Auswahl");
   side=data.side;mode="pair";trainer=null;
  }else{trainer=restoreGaitTrainer(data.snapshot);mode="single";trainers=null;}
  active=true;stop=false;done=0;goal=rounds;
  setTimeout(work,0);
 }catch(error){active=false;postMessage({type:"error",message:String(error?.message||error)});}
};