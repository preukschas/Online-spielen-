// Browser-Regression der unverketteten Höfen-Testvorschau (keine echten Apple-Geräte).
import {strict as assert} from "node:assert";
import {chromium,webkit,devices} from "playwright";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8"};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,"http://localhost");
  const file=resolve(root,decodeURIComponent(url.pathname).replace(/^\/+/,"")||"index.html");
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  const b=await readFile(file);
  res.writeHead(200,{"Content-Type":mime[extname(file)]||"application/octet-stream","Cache-Control":"no-store"}).end(b);
 }catch{res.writeHead(404).end("Not found");}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const base="http://127.0.0.1:"+server.address().port;
await mkdir("test-artifacts",{recursive:true});
let errors=0;
async function run(browser,name,opts){
 const ctx=await browser.newContext({...opts,acceptDownloads:true}),page=await ctx.newPage();
 const faults=[];page.on("pageerror",e=>faults.push(e.message));
 try{
  await page.goto(base+"/vorschau-hoefen/",{waitUntil:"networkidle"});
  assert.match(await page.title(),/Höfen/);
  assert.equal(await page.locator("#terrain").count(),1);
  assert.equal(await page.locator("#start").count(),1);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=4,"horizontal overflow "+overflow);
  await page.locator("#step").click();
  assert.match(await page.locator("#clock").textContent(),/Minute 1/);
  await page.locator("#reset").click();
  assert.match(await page.locator("#clock").textContent(),/Minute 0/);
  await page.locator("#saveA").click();
  await page.locator('[data-preset="green"]').click();
  await page.locator("#saveB").click();
  await page.locator("#runAB").click();
  assert.notEqual(await page.locator("#aFlow").textContent(),"–");
  assert.notEqual(await page.locator("#bFlow").textContent(),"–");
  const d=page.waitForEvent("download");
  await page.locator("#export").click();
  const file=await d,data=JSON.parse((await readFile(await file.path())).toString("utf8"));
  assert.equal(data.format,"DMP-Hoefen-Runoff-v1");
  assert.equal(data.geo.length,2400);
  await page.locator("#rain").evaluate(el=>{el.value="30";el.dispatchEvent(new Event("input",{bubbles:true}));});
  await page.locator("#import").setInputFiles({name:"test.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(data))});
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent.includes("erfolgreich geladen"));
  assert.equal(await page.locator("#rain").inputValue(),String(data.config.rain));
  await page.locator("#terrain").click({position:{x:125,y:120}});
  assert.match(await page.locator("#actionStatus").textContent(),/1 Eingriffe/);
  const osm={elements:[
   {type:"way",tags:{highway:"residential"},geometry:[
    {lat:48.4429,lon:7.87},{lat:48.4429,lon:7.884}
   ]},
   {type:"way",id:190027,tags:{waterway:"ditch",name:"Bruchgraben"},geometry:[
    {lat:48.4427,lon:7.872},{lat:48.44275,lon:7.880},{lat:48.4428,lon:7.883}
   ]}
  ]};
  await page.route("**/api/interpreter?*",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(osm)}));
  await page.locator("#getOsm").click();
  await page.waitForFunction(()=>document.querySelector("#geoStatus")?.textContent.includes("OSM geladen"));
  assert.match(await page.locator("#mapKind").textContent(),/OSM/);
  assert.match(await page.locator("#waterwayStatus").textContent(),/Bruchgraben.*markierte|Bruchgraben.*geladen/);
  // Generate a complete synthetic EPSG:25832 XYZ fixture to test native-file loading.
  // Values below are test fixture heights, NOT genuine LGL elevation measurements.
  const xyz=await page.evaluate(()=>{
    const E=window.HoefenWater,G=window.WaterGeoData,V=window.HoefenGeoV2;
    return E.BASE.map(c=>{
      const p=V.centroid(c.x,c.y,E.ORIGIN,E.W,E.H,E.SIZE,G.toUTM32);
      return p.east.toFixed(3)+" "+p.north.toFixed(3)+" "+(150+.02*c.x+.01*c.y).toFixed(3);
    }).join("\\n");
  });
  await page.locator("#demInput").setInputFiles({name:"fixture.xyz",mimeType:"text/plain",buffer:Buffer.from(xyz)});
  await page.waitForFunction(()=>document.querySelector("#geoStatus")?.textContent.includes("Höhen importiert"),{timeout:20000});
  assert.match(await page.locator("#mapKind").textContent(),/IMPORTIERTE HÖHEN/);
  await page.locator("#restoreMap").click();
  assert.match(await page.locator("#mapKind").textContent(),/SCHEMATISCH/);
  await page.screenshot({path:"test-artifacts/hoefen-"+name+".png",fullPage:true});
  assert.deepEqual(faults,[],"browser errors");
  console.log("PASS: Höfen Browser-Regression "+name);
 }catch(e){errors++;console.error("FAIL: Höfen "+name+"\n"+(e?.stack||e));}
 finally{await ctx.close();}
}
const desktop=await chromium.launch({headless:true}),webkitBrowser=await webkit.launch({headless:true});
try{
 await run(desktop,"desktop",{viewport:{width:1360,height:900}});
 await run(webkitBrowser,"iphone",{...devices["iPhone 13"]});
 await run(webkitBrowser,"ipad",{...devices["iPad (gen 7) landscape"]});
}finally{await Promise.all([desktop.close(),webkitBrowser.close()]);await new Promise(done=>server.close(done));}
if(errors)process.exitCode=1;
