// Phase-1-End-to-End-Regressionen: echte Browser-Engines, keine echten Apple-Geräte.
// Isolierte neue Browserkontexte, JSON-Roundtrips, Editor und Touch-nahe Bedienwege.
import {strict as assert} from "node:assert";
import {chromium,webkit,devices} from "playwright";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const mime={".html":"text/html;charset=utf-8",".js":"text/javascript;charset=utf-8",".css":"text/css;charset=utf-8",".json":"application/json;charset=utf-8"};
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,"http://localhost");
  const file=resolve(root,decodeURIComponent(u.pathname).replace(/^\/+/,"")||"index.html");
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  const b=await readFile(file);res.writeHead(200,{"Content-Type":mime[extname(file)]||"application/octet-stream","Cache-Control":"no-store"}).end(b);
 }catch{res.writeHead(404).end("Not found");}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const base="http://127.0.0.1:"+server.address().port;
await mkdir("test-artifacts",{recursive:true});
let passed=0,failed=0;
async function check(label,fn){
 try{await fn();passed++;console.log("PASS "+label);}
 catch(e){failed++;console.error("FAIL "+label+": "+(e?.stack||String(e)));}
}
async function run(browser,name,settings){
 const ctx=await browser.newContext({...settings,acceptDownloads:true});
 const page=await ctx.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 page.on("console",m=>{if(m.type()==="error")errors.push("console: "+m.text())});
 try{
  await check(name+" Portal: fünf aktive / fünf Schutterwald-Planungen und Filter",async()=>{
   await page.goto(base+"/index.html",{waitUntil:"networkidle"});
   assert.equal(await page.locator(".sim.available").count(),5);
   assert.equal(await page.locator(".sim.planned").count(),5);
   assert.equal(await page.locator(".sim.planned").filter({hasText:"Schutterwald"}).count(),5);
   await page.locator('[data-filter="planned"]').click();
   assert.equal(await page.locator(".sim.planned:visible").count(),5);
   await page.locator("#search").fill("Starkregen");
   assert.equal(await page.locator(".sim.planned:visible").count(),1);
   await page.locator("#search").fill("");
   await page.locator('[data-filter="all"]').click();
  });
  await check(name+" Labor: gültiger JSON Export-Import mit Wiederherstellung",async()=>{
   await page.goto(base+"/lab.html",{waitUntil:"networkidle"});
   await page.locator("#param-height").evaluate(el=>{el.value="11";el.dispatchEvent(new Event("input",{bubbles:true}));});
   await page.locator("#scenarioName").fill("Phase1 JSON Roundtrip "+name);
   const downloadPending=page.waitForEvent("download");
   await page.locator("#export").click();
   const download=await downloadPending;
   assert.match(download.suggestedFilename(),/\.json$/);
   const file=await readFile(await download.path());
   const data=JSON.parse(file.toString("utf8"));
   assert.equal(data.format,"DMP_SIM_SCENARIO");
   assert.equal(data.params.height,11);
   await page.locator("#param-height").evaluate(el=>{el.value="19";el.dispatchEvent(new Event("input",{bubbles:true}));});
   assert.equal(await page.locator("#param-height").inputValue(),"19");
   await page.locator("#importFile").setInputFiles({name:"roundtrip.json",mimeType:"application/json",buffer:file});
   await page.waitForFunction(()=>document.querySelector("#notice")?.textContent?.includes("Experiment geladen"));
   assert.equal(await page.locator("#param-height").inputValue(),"11");
   assert.match(await page.locator("#scenarioName").inputValue(),/Phase1 JSON Roundtrip/);
  });
  await check(name+" Labor: beschädigte und manipulierte JSON-Dateien werden abgelehnt",async()=>{
   const before=await page.locator("#param-height").inputValue();
   await page.locator("#importFile").setInputFiles({name:"invalid.json",mimeType:"application/json",buffer:Buffer.from("{kaputt")});
   await page.waitForFunction(()=>document.querySelector("#notice")?.textContent?.includes("JSON konnte nicht gelesen"));
   assert.equal(await page.locator("#param-height").inputValue(),before);
   await page.locator("#importFile").setInputFiles({name:"invalid-shape.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify({
     format:"DMP_SIM_SCENARIO",version:"1.2.0",mode:"physics",preset:"fall",name:"Manipuliert",seed:42,params:{gravity:Infinity,height:-300,bounce:0}
   }))});
   await page.waitForFunction(()=>document.querySelector("#notice")?.textContent?.includes("kein gültiges Simulationsszenario"));
   assert.equal(await page.locator("#param-height").inputValue(),before);
  });
  await check(name+" Entitäten-Editor: zeichnen, speichern, löschen, JSON wieder importieren",async()=>{
   await page.goto(base+"/editor.html",{waitUntil:"networkidle"});
   assert.equal(await page.locator(".catalog-card").count(),10);
   assert.equal(await page.locator("#saved option").count(),11);
   await page.locator('.catalog-card[data-key="cheetah"]').click();
   assert.equal(await page.locator("#name").inputValue(),"Gepard");
   assert.equal(await page.locator("#appearance").inputValue(),"cheetah");
   assert.ok(await page.locator("#bodyDrawing > *").count()>20);
   await page.locator('.catalog-card[data-key="horse"]').click();
   assert.equal(await page.locator("#massNumber").inputValue(),"500");
   await page.locator("#template").selectOption("animal");
   await page.locator("#name").fill("Phase1 Testfuchs");
   await page.locator("#r_mass").evaluate(el=>{el.value="50";el.dispatchEvent(new Event("input",{bubbles:true}));});
   assert.match(await page.locator("#massStat").innerText(),/50 kg/);
   assert.equal(await page.locator("#kind").inputValue(),"quadruped");
   assert.ok(await page.locator("#bodyDrawing > *").count()>20);
   await page.locator("#animate").click();
   assert.equal(await page.locator("#animate").getAttribute("aria-pressed"),"true");
   await page.locator("#resetPose").click();
   assert.equal(await page.locator("#animate").getAttribute("aria-pressed"),"false");
   await page.locator("#save").click();
   assert.match(await page.locator("#message").innerText(),/gespeichert/);
   assert.equal(await page.locator("#saved option").count(),12);
   const dlPending=page.waitForEvent("download");
   await page.locator("#export").click();
   const file=await readFile(await (await dlPending).path());
   assert.equal(JSON.parse(file.toString("utf8")).name,"Phase1 Testfuchs");
   await page.locator("#saved").selectOption({index:1});
   page.once("dialog",d=>d.accept());
   await page.locator("#delete").click();
   assert.equal(await page.locator("#saved option").count(),11);
   await page.locator("#importFile").setInputFiles({name:"entity.json",mimeType:"application/json",buffer:file});
   await page.waitForFunction(()=>document.querySelector("#message")?.textContent?.includes("importiert"));
   assert.equal(await page.locator("#saved option").count(),2);
   assert.equal(await page.locator("#name").inputValue(),"Phase1 Testfuchs");
  });
  await check(name+" Entität: Übergabe an Biomechanik und Arena B",async()=>{
   await page.locator("#bio").click();
   await page.waitForURL(/lab\.html\?mode=bio/);
   assert.equal(await page.locator("#preset").inputValue(),"quad");
   assert.match(await page.locator("#scenarioName").inputValue(),/Phase1 Testfuchs/);
   await page.goto(base+"/editor.html",{waitUntil:"networkidle"});
   await page.locator("#saved").selectOption({index:1});
   await page.locator("#load").click();
   await page.locator("#arenaB").click();
   await page.waitForURL(/lab\.html\?mode=arena/);
   assert.equal(await page.locator("#nameB").inputValue(),"Phase1 Testfuchs");
   assert.equal(await page.locator(".module[data-mode=arena]").getAttribute("aria-pressed"),"true");
  });
  await check(name+" Maschinenbaukasten: JSON re-importieren und Fehler abweisen",async()=>{
   await page.goto(base+"/builder.html",{waitUntil:"networkidle"});
   const dlPending=page.waitForEvent("download");
   await page.locator("#json").click();
   const file=await readFile(await (await dlPending).path());
   await page.locator("#template").selectOption("empty");
   assert.equal(await page.locator("#bodyList .chip").count(),0);
   await page.locator("#importFile").setInputFiles({name:"maschine.json",mimeType:"application/json",buffer:file});
   await page.waitForFunction(()=>document.querySelector("#notice")?.textContent?.includes("importiert"));
   assert.equal(await page.locator("#bodyList .chip").count(),2);
   assert.equal(await page.locator("#jointList .chip").count(),2);
   await page.locator("#importFile").setInputFiles({name:"falsch.json",mimeType:"application/json",buffer:Buffer.from('{"format":"FALSCH"}')});
   await page.waitForFunction(()=>document.querySelector("#notice")?.textContent?.includes("Ungültige Maschinendatei"));
   assert.equal(await page.locator("#bodyList .chip").count(),2);
  });
  if(name==="chromium-desktop"){
   await check(name+" Maschinenbaukasten: Maus-Drag verändert Körperposition",async()=>{
    await page.locator("#template").selectOption("empty");
    await page.locator("#addBar").click();
    assert.equal(await page.locator('[data-field="x"]').inputValue(),"-1");
    const rect=await page.locator("#world").boundingBox();
    assert.ok(rect&&rect.width>200);
    const x=rect.x+rect.width*(395/960),y=rect.y+rect.height*(215/540);
    await page.mouse.move(x,y);await page.mouse.down();
    await page.mouse.move(x+Math.min(70,rect.width*.08),y,{steps:8});
    await page.mouse.up();
    const next=Number(await page.locator('[data-field="x"]').inputValue());
    assert.ok(next>-.65,"Drag did not move body: x="+next);
   });
  }
  await check(name+" Keine JS-Fehler und keine horizontalen Überläufe",async()=>{
   assert.deepEqual(errors,[]);
   const size=await page.evaluate(()=>({full:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert.ok(size.full<=size.viewport+3,JSON.stringify(size));
  });
  try{await page.screenshot({path:"test-artifacts/phase1-"+name+".png",fullPage:true});}catch{}
 }finally{await ctx.close();}
}
try{
 const chrome=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{await run(chrome,"chromium-desktop",{viewport:{width:1440,height:900}});}finally{await chrome.close();}
 const safari=await webkit.launch({headless:true});
 try{await run(safari,"webkit-iphone",{...devices["iPhone 13"]});}finally{await safari.close();}
}finally{await new Promise(done=>server.close(done));}
console.log("PHASE1 RESULT "+passed+" passed, "+failed+" failed");
if(failed)process.exitCode=1;
