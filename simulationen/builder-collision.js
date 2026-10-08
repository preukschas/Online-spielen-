// DMP SIM LAB: didaktische 2D-Kontaktgeometrie für Rad (Kreis) und Stange (Kapsel).
// Reine Geometrie + Positionskorrektur, kein Material-/Sicherheitsnachweis.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dot=(a,b)=>a.x*b.x+a.y*b.y;
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y});
const mul=(v,s)=>({x:v.x*s,y:v.y*s});
const norm2=v=>dot(v,v);
const rotate=(v,t)=>({x:v.x*Math.cos(t)-v.y*Math.sin(t),y:v.x*Math.sin(t)+v.y*Math.cos(t)});
const isWheel=b=>b.kind==="wheel";
const radius=b=>isWheel(b)?b.length/2:.11;
const capsule=b=>{const q=rotate({x:b.length/2,y:0},b.angle);return {a:{x:b.x-q.x,y:b.y-q.y},b:{x:b.x+q.x,y:b.y+q.y}}};
function closestPoint(point,s){
 const delta=sub(s.b,s.a),len=norm2(delta);
 return add(s.a,mul(delta,len<1e-12?0:clamp(dot(sub(point,s.a),delta)/len,0,1)));
}
// Closest points on two segments, robust for parallel and endpoint contacts.
function closestSegments(a,b){
 const u=sub(a.b,a.a),v=sub(b.b,b.a),w=sub(a.a,b.a);
 const A=dot(u,u),B=dot(u,v),C=dot(v,v),D=dot(u,w),E=dot(v,w);
 const det=A*C-B*B;let s=0,t=0;
 if(A<1e-12&&C<1e-12)return [a.a,b.a];
 if(A<1e-12){t=clamp(E/C,0,1)}
 else if(C<1e-12){s=clamp(-D/A,0,1)}
 else{
  s=det>1e-12?clamp((B*E-C*D)/det,0,1):0;
  t=clamp((B*s+E)/C,0,1);
  s=clamp((B*t-D)/A,0,1);
 }
 return [add(a.a,mul(u,s)),add(b.a,mul(v,t))];
}
export function touchingContact(a,b){
 if(!a||!b||a.id===b.id)return null;
 const centerDist=Math.hypot(b.x-a.x,b.y-a.y),reach=(isWheel(a)?radius(a):a.length/2+.11)+(isWheel(b)?radius(b):b.length/2+.11);
 if(centerDist>reach+.005)return null;
 let p,q;
 if(isWheel(a)&&isWheel(b)){p={x:a.x,y:a.y};q={x:b.x,y:b.y};}
 else if(!isWheel(a)&&isWheel(b)){p=closestPoint(b,capsule(a));q={x:b.x,y:b.y};}
 else if(isWheel(a)&&!isWheel(b)){p={x:a.x,y:a.y};q=closestPoint(a,capsule(b));}
 else [p,q]=closestSegments(capsule(a),capsule(b));
 let delta=sub(q,p),len=Math.hypot(delta.x,delta.y);
 if(len>=radius(a)+radius(b))return null;
 if(len<1e-8){
  // Collinear or intersecting capsule centerlines: move along a surface normal,
  // not along the length of the bar (which would make the bodies slide apart).
  if(!isWheel(a)||!isWheel(b)){
   const ref=!isWheel(a)?a:b;
   const perpendicular={x:-Math.sin(ref.angle),y:Math.cos(ref.angle)};
   const side=dot(sub(b,a),perpendicular)<0?-1:1;
   delta=mul(perpendicular,side);len=1;
  }else{
   delta=sub(b,a);len=Math.hypot(delta.x,delta.y);
   if(len<1e-8){delta={x:1,y:0};len=1;}
  }
 }
 const n=mul(delta,1/len),penetration=radius(a)+radius(b)-Math.hypot(q.x-p.x,q.y-p.y);
 return {a:a.id,b:b.id,n,penetration,ra:sub(p,a),rb:sub(q,b),point:{x:(p.x+q.x)/2,y:(p.y+q.y)/2}};
}
export function connected(aId,bId,joints){
 return joints.some(j=>(j.a===aId&&j.b===bId)||(j.a===bId&&j.b===aId));
}
export function contacts(scene){
 const found=[];
 if(scene.collisions===false)return found;
 for(let i=0;i<scene.bodies.length;i++){
  for(let j=i+1;j<scene.bodies.length;j++){
   const a=scene.bodies[i],b=scene.bodies[j];
   if(connected(a.id,b.id,scene.joints))continue;
   const contact=touchingContact(a,b);if(contact)found.push(contact);
  }
 }
 return found;
}
export function solveContacts(scene,stiffness=.85,corrections=null){
 const pairs=contacts(scene),slop=.001;
 for(const c of pairs){
  const a=scene.bodies.find(b=>b.id===c.a),b=scene.bodies.find(b=>b.id===c.b);
  const effective=a.invM+b.invM+a.invI*cross(c.ra,c.n)**2+b.invI*cross(c.rb,c.n)**2;
  if(effective<1e-9)continue;
  const correction=Math.max(0,c.penetration-slop)*stiffness/effective;
  if(!Number.isFinite(correction))continue;
  const dAx=-c.n.x*correction*a.invM,dAy=-c.n.y*correction*a.invM,dAa=-cross(c.ra,c.n)*correction*a.invI;
  const dBx=c.n.x*correction*b.invM,dBy=c.n.y*correction*b.invM,dBa=cross(c.rb,c.n)*correction*b.invI;
  a.x+=dAx;a.y+=dAy;a.angle+=dAa;
  b.x+=dBx;b.y+=dBy;b.angle+=dBa;
  if(corrections){
   const A=corrections.get(a.id),B=corrections.get(b.id);
   if(A){A.x+=dAx;A.y+=dAy;A.angle+=dAa;}
   if(B){B.x+=dBx;B.y+=dBy;B.angle+=dBa;}
  }
 }
 return pairs.length;
}
export function contactImpulse(scene,c,restitutionOverride=null){
 const a=scene.bodies.find(b=>b.id===c.a),b=scene.bodies.find(b=>b.id===c.b);
 if(!a||!b)return;
 const n=c.n,ra=c.ra,rb=c.rb;
 // Velocity at points (v + omega x r).
 const velocity=(body,r)=>({x:body.vx-body.omega*r.y,y:body.vy+body.omega*r.x});
 let relative=sub(velocity(b,rb),velocity(a,ra));
 const vN=dot(relative,n);
 if(vN>=-.015)return;
 const qA=cross(ra,n),qB=cross(rb,n);
 const invMass=a.invM+b.invM+a.invI*qA*qA+b.invI*qB*qB;
 if(invMass<=1e-12)return;
 const e=clamp(restitutionOverride??scene.restitution??.05,0,.8);
 // Correct only the incoming normal component, using limited restitution.
 const impulse=-(1+e)*vN/invMass;
 const v1=mul(n,impulse);
 a.vx-=a.invM*v1.x;a.vy-=a.invM*v1.y;a.omega-=a.invI*cross(ra,v1);
 b.vx+=b.invM*v1.x;b.vy+=b.invM*v1.y;b.omega+=b.invI*cross(rb,v1);
 relative=sub(velocity(b,rb),velocity(a,ra));
 const tangent={x:-n.y,y:n.x},qT_A=cross(ra,tangent),qT_B=cross(rb,tangent);
 const tangentInvMass=a.invM+b.invM+a.invI*qT_A*qT_A+b.invI*qT_B*qT_B;
 if(tangentInvMass<=1e-12)return;
 const friction=clamp(scene.friction??.35,0,1);
 const jt=clamp(-dot(relative,tangent)/tangentInvMass,-friction*impulse,friction*impulse);
 const ft=mul(tangent,jt);
 a.vx-=a.invM*ft.x;a.vy-=a.invM*ft.y;a.omega-=a.invI*cross(ra,ft);
 b.vx+=b.invM*ft.x;b.vy+=b.invM*ft.y;b.omega+=b.invI*cross(rb,ft);
}


// Continuous collision detection (CCD): swept time-of-impact in seconds.
// Wheel/wheel is solved analytically; capsule pairs use conservative advancement
// over the translated and rotating centerline segments. Does not model deformation.
function gapAt(a,b,t){
 const A={...a,x:a.x+a.vx*t,y:a.y+a.vy*t,angle:a.angle+a.omega*t};
 const B={...b,x:b.x+b.vx*t,y:b.y+b.vy*t,angle:b.angle+b.omega*t};
 let p,q;
 if(isWheel(A)&&isWheel(B)){p=A;q=B;}
 else if(!isWheel(A)&&isWheel(B)){p=closestPoint(B,capsule(A));q=B;}
 else if(isWheel(A)&&!isWheel(B)){p=A;q=closestPoint(A,capsule(B));}
 else [p,q]=closestSegments(capsule(A),capsule(B));
 return Math.hypot(p.x-q.x,p.y-q.y)-radius(A)-radius(B);
}
export function sweptContactTime(a,b,dt){
 if(!a||!b||a.id===b.id||!Number.isFinite(dt)||dt<=0)return null;
 const startGap=gapAt(a,b,0);
 if(startGap<=0)return null; // Existing penetration handled by contact projection.
 const dx=(b.vx||0)-(a.vx||0),dy=(b.vy||0)-(a.vy||0);
 const speed=Math.hypot(dx,dy)+Math.abs(a.omega||0)*a.length/2+Math.abs(b.omega||0)*b.length/2;
 if(speed<1e-10||startGap>speed*dt+1e-8)return null;
 if(isWheel(a)&&isWheel(b)){
  const x=b.x-a.x,y=b.y-a.y;
  const A=dx*dx+dy*dy,B=2*(x*dx+y*dy),R=radius(a)+radius(b),C=x*x+y*y-R*R;
  const discriminant=B*B-4*A*C;
  if(A<=1e-12||B>=0||discriminant<0)return null;
  const impact=(-B-Math.sqrt(discriminant))/(2*A);
  return impact>=0&&impact<=dt?impact:null;
 }
 let t=0,prev=0;
 // Upper bound on feature approach speed allows guaranteed safe advancement
 // for linearly translated, uniformly rotating centerline approximations.
 for(let i=0;i<80;i++){
  const gap=gapAt(a,b,t);
  if(gap<=1e-5){
   let lo=prev,hi=t;
   for(let j=0;j<18;j++){
    const mid=(lo+hi)*.5;
    if(gapAt(a,b,mid)<=1e-5)hi=mid;else lo=mid;
   }
   return hi;
  }
  const advancement=Math.max(1e-9,.92*gap/speed);
  prev=t;t+=advancement;
  if(t>dt)return null;
 }
 return null; // Bounded fallback to adaptive substeps in the physics integrator.
}
export function firstSweptImpact(scene,dt){
 if(scene.collisions===false)return null;
 let earliest=null;
 for(let i=0;i<scene.bodies.length;i++){
  for(let j=i+1;j<scene.bodies.length;j++){
   const a=scene.bodies[i],b=scene.bodies[j];
   if(connected(a.id,b.id,scene.joints))continue;
   const t=sweptContactTime(a,b,dt);
   if(t!==null&&(earliest===null||t<earliest))earliest=t;
  }
 }
 return earliest;
}
// Conservative interval cap: smallest capsule radius is 0.11 m;
// no adjacent free-body centerline can travel more than about 0.07 m
// relative to another potential collision body in one adaptive substep.
export function safeContactInterval(scene,dt){
 if(scene.collisions===false||scene.bodies.length<2)return dt;
 let speedLimit=0;
 for(let i=0;i<scene.bodies.length;i++){
  for(let j=i+1;j<scene.bodies.length;j++){
   const a=scene.bodies[i],b=scene.bodies[j];
   if(connected(a.id,b.id,scene.joints))continue;
   const rel=Math.hypot((b.vx||0)-(a.vx||0),(b.vy||0)-(a.vy||0))
     +Math.abs(a.omega||0)*a.length/2+Math.abs(b.omega||0)*b.length/2;
   if(rel<1e-9)continue;
   const reach=a.length/2+b.length/2+(a.kind==="bar"?.11:0)+(b.kind==="bar"?.11:0);
   if(Math.hypot(b.x-a.x,b.y-a.y)>reach+rel*dt+.12)continue;
   speedLimit=Math.max(speedLimit,rel);
  }
 }
 if(speedLimit<1e-8)return dt;
 return Math.min(dt,.07/speedLimit);
}
