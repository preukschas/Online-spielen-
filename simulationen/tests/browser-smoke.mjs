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
  const card=page.locator('.sim.available[href="./builder.html"]');
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
  await page.waitForFunction(()=>document.querySelector("#trainStatus")?.textContent?.includes("25/25"),null,{timeout:15000});
  const best=await page.evaluate(()=>localStorage.getItem("dmp_simlab_best_walker_v1"));
  assert.ok(best&&JSON.parse(best).genome);
 });
 await check(name+" vierbeiniger Gelenkläufer",async()=>{
   await page.locator('.module[data-mode="bio"]').click();
   await page.locator("#preset").selectOption("quad");
   assert.equal(await page.locator("#preset").inputValue(),"quad");
   await page.locator("#trainButton").click();
   await page.waitForFunction(()=>document.querySelector("#trainStatus")?.textContent?.includes("25/25"),null,{timeout:15000});
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
 await check(name+" Maschinenbaukasten startet und zeichnet",async()=>{
   const ctx=await browser.newContext({...opts,acceptDownloads:true});
   const builder=await ctx.newPage(),err=[];
   builder.on("pageerror",e=>err.push(e.message));
   await builder.goto(base+"/builder.html",{waitUntil:"networkidle"});
   assert.match(await builder.title(),/Maschinenbaukasten/);
   assert.equal(await builder.locator("#world").count(),1);
   assert.equal(await builder.locator("#bodyList .chip").count(),2);
   assert.equal(await builder.locator("#jointList .chip").count(),2);
   const widths=await builder.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:innerWidth}));
   assert.ok(widths.scroll<=widths.view+3,JSON.stringify(widths));
   await builder.locator("#play").click();
   await builder.waitForTimeout(250);
   await builder.locator("#play").click();
   const value=await builder.locator("#time").textContent();
   assert.notEqual(value,"0,00 s");
   await builder.locator("#reset").click();
   assert.equal(await builder.locator("#time").textContent(),"0,00 s");
   assert.deepEqual(err,[]);
   await ctx.close();
 });
 await check(name+" Baukasten erstellt Körper, Gelenk, Motor und lädt JSON",async()=>{
   const ctx=await browser.newContext({...opts,acceptDownloads:true});
   const builder=await ctx.newPage();await builder.goto(base+"/builder.html",{waitUntil:"networkidle"});
   await builder.locator("#template").selectOption("empty");
   await builder.locator("#addBar").click();
   await builder.locator("#addWheel").click();
   assert.equal(await builder.locator("#bodyList .chip").count(),2);
   await builder.locator("#jointB").selectOption({index:1});
   await builder.locator("#addJoint").click();
   assert.equal(await builder.locator("#jointList .chip").count(),1);
   await builder.getByRole("checkbox",{name:/Gelenkmotor/}).check();
   await builder.getByRole("button",{name:/Starten/}).click();
   await builder.waitForTimeout(130);
   await builder.getByRole("button",{name:/Pause/}).click();
   await builder.locator("#reset").click();
   await builder.locator("#filename").fill("Mein Getriebe");
   await builder.locator("#save").click();
   assert.match(await builder.locator("#notice").textContent(),/gespeichert/);
   await builder.reload({waitUntil:"networkidle"});
   await builder.locator("#saved").selectOption({index:1});
   await builder.locator("#load").click();
   assert.equal(await builder.locator("#bodyList .chip").count(),2);
   assert.equal(await builder.locator("#jointList .chip").count(),1);
   assert.equal(await builder.getByRole("checkbox",{name:/Gelenkmotor/}).isChecked(),true);
   const down=builder.waitForEvent("download");
   await builder.locator("#json").click();
   assert.match((await down).suggestedFilename(),/\.json$/);
   await ctx.close();
 });
 await check(name+" Kontaktphysik auf Kollision zweier Räder",async()=>{
   const ctx=await browser.newContext({...opts,acceptDownloads:true});
   const builder=await ctx.newPage();
   const errors=[];builder.on("pageerror",e=>errors.push(e.message));
   await builder.goto(base+"/builder.html",{waitUntil:"networkidle"});
   await builder.locator("#template").selectOption("collision");
   assert.equal(await builder.locator("#bodyList .chip").count(),2);
   assert.equal(await builder.locator("#collisions").isChecked(),true);
   await builder.locator("#play").click();
   await builder.waitForTimeout(300);
   assert.match(await builder.locator("#contactsNow").textContent(),/^[1-9]\d*$/);
   await builder.locator("#play").click();
   await builder.locator("#reset").click();
   assert.deepEqual(errors,[]);
   await ctx.close();
 });
 await check(name+" Kontaktregler, Import und altes Layout",async()=>{
   const ctx=await browser.newContext({...opts,acceptDownloads:true});
   const builder=await ctx.newPage();
   await builder.goto(base+"/builder.html",{waitUntil:"networkidle"});
   await builder.locator("#template").selectOption("collision");
   await builder.locator("#collisions").uncheck();
   assert.equal(await builder.locator("#contactsNow").textContent(),"Aus");
   await builder.locator("#restitution").fill("0.45");
   await builder.locator("#restitution").press("Tab");
   await builder.locator("#friction").fill("0.7");
   await builder.locator("#friction").press("Tab");
   await builder.locator("#filename").fill("Kollision ohne Kontakte");
   await builder.locator("#save").click();
   await builder.reload({waitUntil:"networkidle"});
   await builder.locator("#saved").selectOption({index:1});
   await builder.locator("#load").click();
   assert.equal(await builder.locator("#collisions").isChecked(),false);
   assert.equal(await builder.locator("#restitution").inputValue(),"0.45");
   assert.equal(await builder.locator("#friction").inputValue(),"0.7");
   const dims=await builder.evaluate(()=>({width:document.documentElement.scrollWidth,view:innerWidth}));
   assert.ok(dims.width<=dims.view+3,JSON.stringify(dims));
   await ctx.close();
 });

 await check(name+" CCD fängt schnellen Radstoß vor dem Tunneling ab",async()=>{
   const ctx=await browser.newContext({...opts,acceptDownloads:true});
   const builder=await ctx.newPage(),errors=[];
   builder.on("pageerror",e=>errors.push(e.message));
   await builder.goto(base+"/builder.html",{waitUntil:"networkidle"});
   await builder.locator("#template").selectOption("fast");
   assert.equal(await builder.locator("#ccd").isChecked(),true);
   assert.equal(await builder.getByRole("spinbutton",{name:"Start-Vx (m/s)"}).inputValue(),"220");
   await builder.locator("#step").click();
   const micro=Number(await builder.locator("#ccdSubsteps").innerText());
   assert.ok(micro>1,"Keine zusätzlichen Zeit-Teilschritte: "+micro);
   assert.ok(Number(await builder.locator("#contactsNow").innerText())>=1);
   await builder.locator("#reset").click();
   await builder.locator("#ccd").uncheck();
   await builder.locator("#step").click();
   assert.equal(await builder.locator("#ccdSubsteps").innerText(),"Aus");
   assert.equal(await builder.locator("#contactsNow").innerText(),"0");
   assert.deepEqual(errors,[]);
   await ctx.close();
 });
 await check(name+" CCD-Auswahl und Startgeschwindigkeit über Reload erhalten",async()=>{
   const ctx=await browser.newContext({...opts,acceptDownloads:true});
   const builder=await ctx.newPage();
   await builder.goto(base+"/builder.html",{waitUntil:"networkidle"});
   await builder.locator("#template").selectOption("fast");
   await builder.locator("#ccd").uncheck();
   await builder.locator("#filename").fill("Schnellstoß-Test "+name);
   await builder.locator("#save").click();
   await builder.reload({waitUntil:"networkidle"});
   await builder.locator("#saved").selectOption({index:1});
   await builder.locator("#load").click();
   assert.equal(await builder.locator("#ccd").isChecked(),false);
   assert.equal(await builder.getByRole("spinbutton",{name:"Start-Vx (m/s)"}).inputValue(),"220");
   await ctx.close();
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
