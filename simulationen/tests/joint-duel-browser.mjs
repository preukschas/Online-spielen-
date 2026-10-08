import {strict as assert} from "node:assert";
import {chromium,webkit,devices} from "playwright";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {newGaitTrainer,trainGaitGeneration,gaitSnapshot} from "../joint-walker-core.js";
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const mime={".js":"text/javascript; charset=utf-8",".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8"};
const srv=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,"http://127.0.0.1").pathname;
  const filename=resolve(root,decodeURIComponent(pathname).replace(/^\/+/,"")||"index.html");
  if(!(filename===root||filename.startsWith(root+sep)))return res.writeHead(403).end("Forbidden");
  const buffer=await readFile(filename);
  res.writeHead(200,{"Content-Type":mime[extname(filename)]||"text/plain; charset=utf-8","Cache-Control":"no-store"}).end(buffer);
 }catch{res.writeHead(404).end("Not found");}
});
await new Promise(done=>srv.listen(0,"127.0.0.1",done));
const url="http://127.0.0.1:"+srv.address().port+"/joint-duel.html";
await mkdir("test-artifacts",{recursive:true});
const gait=newGaitTrainer(42,16);
for(let i=0;i<10;i++)trainGaitGeneration(gait);
const checkpoint=JSON.stringify(gaitSnapshot(gait));
const rival=newGaitTrainer(104771,12);
for(let i=0;i<9;i++)trainGaitGeneration(rival);
const checkpointB=JSON.stringify(gaitSnapshot(rival));
async function check(browser,label,opts){
 const context=await browser.newContext({...opts,acceptDownloads:true});
 await context.addInitScript(data=>{
  if(!localStorage.getItem("dmp_joint_walker_v1"))localStorage.setItem("dmp_joint_walker_v1",data.a);
  if(!localStorage.getItem("dmp_joint_walker_v1__rival_v1"))localStorage.setItem("dmp_joint_walker_v1__rival_v1",data.b);
 },{a:checkpoint,b:checkpointB});
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto(url,{waitUntil:"networkidle"});
  assert.match(await page.title(),/Roboter-Duell/);
  assert.equal(await page.locator("#generation").textContent(),"0");
  assert.match(await page.locator("#gaitStatus").textContent(),/Beide Gelenknetze/);
  assert.equal(await page.locator("#arena").count(),1);
  const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
  assert.ok(widths.scroll<=widths.viewport+3,label+": horizontal overflow "+JSON.stringify(widths));
  await page.locator("#add1").click();
  await page.waitForFunction(()=>document.querySelector("#generation")?.textContent==="1"&&document.querySelector("#stop")?.disabled===true,null,{timeout:60000});
  const json=await page.evaluate(()=>JSON.parse(localStorage.getItem("dmp_joint_duel_v1")));
  assert.equal(json.generation,1);
  assert.equal(json.gaitA.length,256);assert.equal(json.gaitB.length,256);
  assert.notDeepEqual(json.gaitA,json.gaitB,"A and B must import different learned brains");
  assert.equal(json.tactics.length,2);assert.equal(json.history.length,1);
  await page.locator("#play").click();
  await page.waitForTimeout(550);
  assert.match(await page.locator("#duelStatus").textContent(),/Schildpunkte/);
  await page.locator("#play").click();
  await page.locator("#restart").click();
  const first=await page.locator("#arenaLabel").textContent();
  await page.locator("#newSeed").click();
  assert.notEqual(first,await page.locator("#arenaLabel").textContent());
  await page.locator("#ten").click();
  await page.waitForFunction(()=>document.querySelector("#tournamentStatus")?.textContent.includes("10 Duelle:")&&
   document.querySelector("#ten")?.disabled===false,null,{timeout:60000});
  assert.match(await page.locator("#tournamentStatus").textContent(),/Siege/);
  if(label==="chromium-desktop"){
   const download=page.waitForEvent("download");
   await page.locator("#export").click();assert.match((await download).suggestedFilename(),/dmp-roboterduell.*\.json$/);
   await page.locator("#fileDuel").setInputFiles({name:"duel.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(json))});
   await page.waitForFunction(()=>document.querySelector("#notice")?.textContent?.includes("erfolgreich importiert"),null,{timeout:10000});
  }
  await page.reload({waitUntil:"networkidle"});
  assert.equal(await page.locator("#generation").textContent(),"1");
  assert.deepEqual(errors,[],label+" script errors");
  await page.screenshot({path:"test-artifacts/robot-duel-"+label+".png",fullPage:true});
  console.log("PASS "+label+": learned gait transfer, strategy generations, 10 matches, pause/replay, storage");
 }finally{await context.close();}
}
try{
 const chromiumBrowser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{
  await check(chromiumBrowser,"chromium-desktop",{viewport:{width:1400,height:860}});
  await check(chromiumBrowser,"chromium-mobile",{viewport:{width:375,height:812},hasTouch:true,isMobile:true,deviceScaleFactor:2});
 }finally{await chromiumBrowser.close();}
 const safari=await webkit.launch({headless:true});
 try{
  await check(safari,"webkit-iphone",{...devices["iPhone 13"]});
  await check(safari,"webkit-ipad",{...devices["iPad (gen 7)"]});
 }finally{await safari.close();}
}finally{await new Promise(done=>srv.close(done));}
