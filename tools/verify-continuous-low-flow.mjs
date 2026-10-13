import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const out=resolve('artifacts/continuous-low-flow-20261013');await mkdir(out,{recursive:true});
const report={checks:[],errors:[]},check=(ok,name,data)=>{report.checks.push({ok,name,data});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>report.errors.push(String(e)));
try{
 await page.goto(pathToFileURL(resolve('三圈环流3D交互式教学平台.html')).href+'?state=explore');await page.waitForFunction(()=>window.__circulationSequenceDebug&&document.getElementById('loading-screen').classList.contains('hidden'));
 for(const mode of ['ride','overview'])for(const time of [3.8,4.1,9.8,10.2,11,11.9,12,12.1,13.5,14.9,15,15.1,18.9,19.1,23,40]){
  await page.evaluate(({mode,time})=>{window.__circulationSequenceDebug.cameraMode(mode);window.__circulationSequenceDebug.seek(time);},{mode,time});await page.waitForTimeout(100);
  const data=await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return [1,-1].map(h=>s.cells.hadley.map(kind=>{const f=s.flows.find(f=>f.h===h&&f.kind===kind);return {h,kind,visible:f.group.visible,ribbon:f.ribbon.geometry.drawRange.count/48,core:f.tubes[0].geometry.drawRange.count/24,particleMax:Math.max(...Array.from({length:f.particles.geometry.drawRange.count},(_,i)=>{const p=f.particles.geometry.attributes.position;return f.curve.getPoint(0).distanceTo(window.__threeCellDebug.makeVector3(p.getX(i),p.getY(i),p.getZ(i)));}))};}));});
  check(data.every(flows=>flows.every((f,i)=>!f.visible||i===0||flows[i-1].visible&&flows[i-1].core===100)),`${mode} ${time}s: no low-latitude segment appears before airflow reaches it`,data);
  check(data.every(flows=>flows.filter(f=>f.visible).every(f=>f.ribbon===f.core)),`${mode} ${time}s: ribbon and core share one advancing front`);
  if(time<12)check(data.every(flows=>!flows.find(f=>f.kind==='parallel').visible),`${mode} ${time}s: the 30-degree horizontal segment stays hidden before arrival`);
 }
 for(const [width,height] of [[1366,768],[390,844]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>window.__circulationSequenceDebug.cameraMode('ride'));
  for(const time of [11,11.9,12.1,13.5,15.1,40]){await page.evaluate(t=>window.__circulationSequenceDebug.seek(t),time);await page.waitForTimeout(180);await page.screenshot({path:join(out,`${width}-${time}.png`)});}
 }
 await page.evaluate(()=>window.__circulationSequenceDebug.seek(13.5));const frozen=await page.evaluate(()=>window.__circulationSequenceDebug.sequence.flows.map(f=>f.ribbon.geometry.drawRange.count));await page.waitForTimeout(200);
 check(await page.evaluate(a=>window.__circulationSequenceDebug.sequence.flows.every((f,i)=>f.ribbon.geometry.drawRange.count===a[i]),frozen),'Pausing freezes the revised continuous drawing');
 await page.click('#mechanism-demo-play');await page.waitForTimeout(400);
 check(await page.evaluate(()=>window.__circulationSequenceDebug.sequence.flows.filter(f=>f.kind==='parallel').every(f=>f.ribbon.geometry.drawRange.count>50*48)),'Continuing advances the horizontal flow from its paused front');
 await page.evaluate(()=>window.__circulationSequenceDebug.seek(40));
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return [1,-1].every(h=>Object.values(s.cells).every(kinds=>kinds.every((kind,i)=>{const f=s.flows.find(f=>f.h===h&&f.kind===kind),n=s.flows.find(f=>f.h===h&&f.kind===kinds[(i+1)%kinds.length]);return f.group.visible&&f.ribbon.geometry.drawRange.count===4800&&f.curve.getPoint(1).distanceTo(n.curve.getPoint(0))<1e-6;})));}),'All three completed cells remain present and closed after the timing change');
 check(report.errors.length===0,'No browser errors',report.errors);
}catch(e){report.errors.push(String(e));console.error(e);}finally{await writeFile(join(out,'check.json'),JSON.stringify(report,null,2));await browser.close();}
process.exitCode=report.errors.length||report.checks.some(c=>!c.ok)?1:0;
