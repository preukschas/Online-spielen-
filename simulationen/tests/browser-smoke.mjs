// Browser smoke test for the public SimLab release. Run via GitHub Actions.
import { strict as assert } from "node:assert";
import { chromium, webkit, devices } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8"};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,"http://localhost");
    const relative=decodeURIComponent(url.pathname).replace(/^\/+/,"");
    const path=resolve(root,relative||"index.html");
    if(!(path===root||path.startsWith(root+sep))){res.writeHead(403).end("Forbidden");return;}
    const bytes=await readFile(path);
    res.writeHead(200,{"Content-Type":mime[extname(path)]||"application/octet-stream","Cache-Control":"no-store"}).end(bytes);
  }catch(err){res.writeHead(404).end("Not found");}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const base="http://127.0.0.1:"+server.address().port;
await mkdir("test-artifacts",{recursive:true});
let passed=0,failed=0;
async function check(label,fn){
  try {await fn();passed++;console.log("PASS "+label);}
  catch(error){failed++;console.error("FAIL "+label+": "+error.stack);}
}
async function testViewport(browser,name,opts){
 const context=await browser.newContext(opts);
 const page=await context.newPage();
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 page.on("console",msg=>{if(msg.type()==="error")errors.push("console: "+msg.text());});
 await page.goto(base+"/index.html",{waitUntil:"networkidle"});
 await check(name+" Portal zeigt Mechanik als startbar",async()=>{
  const card=page.locator('.sim.available[href="./lab.html?mode=mechanics"]');
  assert.equal(await card.count(),1);
  assert.match(await card.innerText(),/Mechanik/);
 });
 await page.goto(base+"/lab.html",{waitUntil:"networkidle"});
 await check(name+" title and canvas",async()=>{
  assert.match(await page.title(),/Simulationswerkstatt/);
  assert.equal(await page.locator("#scene").count(),1);
  assert.equal(await page.locator("#parameters input[type=range]").count(),3);
  assert.equal(await page.locator(".module").count(),5);
 });
 await check(name+" no horizontal overflow",async()=>{
  const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth,canvas:document.querySelector("#scene").getBoundingClientRect().width}));
  assert.ok(widths.scroll<=widths.inner+3,JSON.stringify(widths));assert.ok(widths.canvas>200);
 });
 await check(name+" start pause reset step",async()=>{
  await page.locator("#play").click();
  await page.waitForTimeout(400);
  await page.locator("#play").click();
  let time=Number((await page.locator("#heroTime").innerText()).replace(",","."));
  assert.ok(time>0,"Simulation did not advance");
  await page.waitForTimeout(250);
  assert.equal((await page.locator("#heroTime").innerText()).replace(",","."),time.toFixed(1));
  await page.locator("#reset").click();
  assert.equal((await page.locator("#heroTime").innerText()).replace(",","."),"0.0");
  await page.locator("#step").click();
  assert.match(await page.locator("#readouts").innerText(),/Höhe/);
 });
 await check(name+" switch 5 modules and chart",async()=>{
  for(const mode of ["crash","bio","arena","mechanics","physics"]){
   await page.locator('.module[data-mode="'+mode+'"]').click();
   assert.equal(await page.locator('.module[data-mode="'+mode+'"]').getAttribute("aria-pressed"),"true");
   assert.equal(await page.locator("#readouts .readout").count(),4);
   await page.locator("#play").click();await page.waitForTimeout(130);
   await page.locator("#reset").click();
  }
 });
 await check(name+" arena names persisted across browser reload",async()=>{
  await page.locator('.module[data-mode="arena"]').click();
  await page.locator("#nameA").fill("Komet");
  await page.locator("#nameA").press("Tab");
  await page.locator("#nameB").fill("Luchs");
  await page.locator("#nameB").press("Tab");
  await page.locator("#scenarioName").fill("Arena Test "+name);
  await page.locator("#save").click();
  await page.reload({waitUntil:"networkidle"});
  await page.locator("#saved").selectOption({index:1});
  await page.locator("#load").click();
  assert.equal(await page.locator("#nameA").inputValue(),"Komet");
  assert.equal(await page.locator("#nameB").inputValue(),"Luchs");
 });
 await check(name+" parameter changes do not crash",async()=>{
  await page.locator('.module[data-mode="crash"]').click();
  const range=page.locator("#param-velocity");
  await range.evaluate(el=>{el.value="90";el.dispatchEvent(new Event("input",{bubbles:true}));});
  assert.match(await page.locator("#parameters").innerText(),/90 km\/h/);
  await page.locator("#play").click();await page.waitForTimeout(300);await page.locator("#reset").click();
 });
 await check(name+" biologic training completes",async()=>{
  await page.locator('.module[data-mode="bio"]').click();
  await page.locator("#trainButton").click();
  await page.waitForFunction(()=>document.querySelector("#trainStatus")?.textContent?.includes("25/25"),{timeout:15000});
  const best=await page.evaluate(()=>localStorage.getItem("dmp_simlab_best_walker_v1"));
  assert.ok(best&&JSON.parse(best).genome);
 });
 await check(name+" vierbeiniger Gelenkläufer",async()=>{
   await page.locator('.module[data-mode="bio"]').click();
   await page.locator("#preset").selectOption("quad");
   assert.equal(await page.locator("#preset").inputValue(),"quad");
   await page.locator("#trainButton").click();
   await page.waitForFunction(()=>document.querySelector("#trainStatus")?.textContent?.includes("25/25"),{timeout:15000});
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("dmp_simlab_best_walker_v1")));
   assert.ok(saved?.genome?.feedback);
   await page.locator("#play").click();await page.waitForTimeout(160);await page.locator("#reset").click();
 });
 await check(name+" Arena-Sprint mit 50 Duellen",async()=>{
   await page.locator('.module[data-mode="arena"]').click();
   await page.locator("#preset").selectOption("sprint");
   assert.equal(await page.locator("#preset").inputValue(),"sprint");
   await page.getByRole("button",{name:/50 Duelle/}).click();
   assert.match(await page.locator("#notice").innerText(),/50 Duelle/);
   await page.locator("#play").click();await page.waitForTimeout(160);await page.locator("#reset").click();
 });
 await check(name+" CSV-Export und A-B-Vergleich",async()=>{
   await page.locator('.module[data-mode="physics"]').click();
   await page.locator("#scenarioName").fill("Messreihe "+name);
   await page.locator("#save").click();
   await page.locator("#param-height").evaluate(el=>{el.value="10";el.dispatchEvent(new Event("input",{bubbles:true}));});
   await page.locator("#saved").selectOption({index:1});
   await page.locator("#compare").click();
   assert.match(await page.locator("#notice").innerText(),/A\/B nach festem Versuch/);
   const downloading=page.waitForEvent("download");
   await page.locator("#csvExport").click();
   const download=await downloading;
   assert.match(download.suggestedFilename(),/\.csv$/);
   assert.match(await page.locator("#notice").innerText(),/CSV-Messreihe exportiert/);
 });
 await check(name+" Mechanik Hebel, Kurbel, Zahnräder",async()=>{
  await page.locator('.module[data-mode="mechanics"]').click();
  assert.equal(await page.locator("#preset option").count(),3);
  for(const preset of ["lever","crank","gears"]){
    await page.locator("#preset").selectOption(preset);
    assert.equal(await page.locator("#preset").inputValue(),preset);
    assert.equal(await page.locator("#readouts .readout").count(),4);
    await page.locator("#play").click();
    await page.waitForTimeout(240);
    await page.locator("#play").click();
    await page.locator("#step").click();
    const read=await page.locator("#readouts").innerText();
    assert.ok(read.length>15,read);
    await page.locator("#reset").click();
  }
 });
 await check(name+" Mechanik-Einstellungen über Neustart reproduzieren",async()=>{
  await page.locator('.module[data-mode="mechanics"]').click();
  await page.locator("#preset").selectOption("gears");
  await page.locator("#param-teethA").evaluate(el=>{el.value="20";el.dispatchEvent(new Event("input",{bubbles:true}));});
  await page.locator("#scenarioName").fill("Getriebe-Test "+name);
  await page.locator("#save").click();
  await page.reload({waitUntil:"networkidle"});
  await page.locator("#saved").selectOption({index:1});
  await page.locator("#load").click();
  assert.equal(await page.locator("#preset").inputValue(),"gears");
  assert.equal(await page.locator("#param-teethA").inputValue(),"20");
 });
 await check(name+" all scripts clean",async()=>{assert.equal(errors.length,0,JSON.stringify(errors));});
 await page.screenshot({path:"test-artifacts/"+name.replace(/\W+/g,"-")+".png",fullPage:true});
 await context.close();
}
try{
 const chrome=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{await testViewport(chrome,"chromium-desktop",{viewport:{width:1440,height:900}});
 await testViewport(chrome,"chromium-mobile",{viewport:{width:375,height:812},isMobile:true,hasTouch:true,deviceScaleFactor:2});}
 finally{await chrome.close();}
 const safari=await webkit.launch({headless:true});
 try{await testViewport(safari,"webkit-iphone",{...devices["iPhone 13"]});
 await testViewport(safari,"webkit-ipad",{...devices["iPad (gen 7)"]});}
 finally{await safari.close();}
}finally{await new Promise(r=>server.close(r));}
console.log("RESULT "+passed+" passed, "+failed+" failed");
if(failed)process.exitCode=1;
