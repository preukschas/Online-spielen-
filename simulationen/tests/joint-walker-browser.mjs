// Independent browser regression for the new articulated learning arena.
import {strict as assert} from "node:assert";
import {chromium,webkit,devices} from "playwright";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"};
const server=createServer(async(req,res)=>{
 try{
  const {pathname}=new URL(req.url,"http://localhost");
  const target=resolve(root,decodeURIComponent(pathname).replace(/^\/+/,"")||"index.html");
  if(!(target===root||target.startsWith(root+sep)))return res.writeHead(403).end("Forbidden");
  const bytes=await readFile(target);
  res.writeHead(200,{"Content-Type":types[extname(target)]||"text/plain; charset=utf-8","Cache-Control":"no-store"}).end(bytes);
 }catch{res.writeHead(404).end("Not found");}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const url="http://127.0.0.1:"+server.address().port+"/joint-walker.html";
await mkdir("test-artifacts",{recursive:true});
async function check(browser,label,options){
 const context=await browser.newContext({...options,acceptDownloads:true}),page=await context.newPage();
 const faults=[];page.on("pageerror",e=>faults.push(e.message));
 try{
  await page.goto(url,{waitUntil:"networkidle"});
  assert.match(await page.title(),/Gelenk-Lernarena/);
  assert.equal(await page.locator("#arena").count(),1);
  assert.equal(await page.locator("#generation").innerText(),"0");
  const size=await page.evaluate(()=>({page:document.documentElement.scrollWidth,view:innerWidth}));
  assert.ok(size.page<=size.view+3,label+" horizontal overflow "+JSON.stringify(size));
  await page.locator("#train5").click();
  await page.waitForFunction(()=>Number(document.querySelector("#generation")?.textContent)>=5
   &&document.querySelector("#stop")?.disabled===true,null,{timeout:120000});
  const data=await page.evaluate(()=>JSON.parse(localStorage.getItem("dmp_joint_walker_v1")));
  assert.equal(data.generation,5);
  const rival=await page.evaluate(()=>JSON.parse(localStorage.getItem("dmp_joint_walker_v1__rival_v1")));
  assert.equal(rival.generation,5,"Roboter B muss ebenfalls lernen");
  assert.equal(rival.population.length,24);
  assert.equal(rival.champion.length,256);
  assert.notDeepEqual(rival.population,data.population,"A/B dürfen kein identischer Zustand sein");
  assert.notDeepEqual(rival.champion,data.champion,"Beide sollen eigene Champion-Gewichte lernen");
  assert.equal(await page.locator("#generationB").textContent(),"5");
  assert.match(await page.locator("#contestInfo").textContent(),/Gegeneinander/);
  assert.equal(data.population.length,24);
  assert.equal(data.champion.length,256);
  assert.equal(data.history.length,5);
  assert.ok(Number.isFinite(data.history[4].validation));
  await page.locator("#trainB").click();
  await page.waitForFunction(()=>document.querySelector("#generationB")?.textContent==="6"&&
     document.querySelector("#stop")?.disabled===true,null,{timeout:120000});
  assert.equal(await page.locator("#generation").textContent(),"5","B lernt zusätzlich unabhängig von A");
  if(label==="chromium-desktop"){
   const pairDownload=page.waitForEvent("download");
   await page.locator("#exportPair").click();
   assert.match((await pairDownload).suggestedFilename(),/dmp-gelenklernarena-A-B/);
  }
  await page.locator("#play").click();
  await page.waitForTimeout(550);
  assert.match(await page.locator("#raceStatus").innerText(),/Bodenkontakte/);
  await page.locator("#restart").click();
  const course1=await page.locator("#courseLabel").textContent();
  await page.locator("#newCourse").click();
  const course2=await page.locator("#courseLabel").textContent();
  assert.notEqual(course1,course2);
  if(label==="chromium-desktop"){
   const download=page.waitForEvent("download");
   await page.locator("#export").click();
   assert.match((await download).suggestedFilename(),/dmp-gelenklernarena.*\.json$/);
   const buffer=Buffer.from(JSON.stringify(data));
   await page.locator("#importFile").setInputFiles({name:"restore.json",mimeType:"application/json",buffer});
   await page.waitForFunction(()=>document.querySelector("#notice")?.textContent.includes("importiert"));
  }
  await page.reload({waitUntil:"networkidle"});
  assert.equal(await page.locator("#generation").textContent(),"5");
  assert.equal(await page.locator("#generationB").textContent(),"6");
  assert.equal(faults.length,0,label+": "+JSON.stringify(faults));
  await page.screenshot({path:"test-artifacts/joint-walker-"+label+".png",fullPage:true});
  console.log("PASS "+label+" real gait evolution, worker, persistent model and responsive UI");
 }finally{await context.close();}
}
try{
 const chrome=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{await check(chrome,"chromium-desktop",{viewport:{width:1440,height:900}});
     await check(chrome,"chromium-mobile",{viewport:{width:375,height:812},isMobile:true,hasTouch:true,deviceScaleFactor:2});}
 finally{await chrome.close();}
 const safari=await webkit.launch({headless:true});
 try{await check(safari,"webkit-iphone",{...devices["iPhone 13"]});
     await check(safari,"webkit-ipad",{...devices["iPad (gen 7)"]});}
 finally{await safari.close();}
}finally{await new Promise(done=>server.close(done));}
