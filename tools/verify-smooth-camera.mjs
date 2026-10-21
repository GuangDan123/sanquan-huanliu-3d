import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const out=resolve('artifacts/smooth-camera-20261013/camera');await mkdir(out,{recursive:true});
const report={checks:[],errors:[],metrics:[]},check=(ok,name,data)=>{report.checks.push({ok,name,data});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>report.errors.push(String(e)));
const seek=async t=>{await page.evaluate(t=>window.__circulationSequenceDebug.seek(t),t);await page.waitForTimeout(100);};
const pose=()=>page.evaluate(()=>({p:window.__threeCellDebug.camera.position.toArray(),q:window.__threeCellDebug.camera.quaternion.toArray(),fov:window.__threeCellDebug.camera.fov,near:window.__threeCellDebug.camera.near}));
try{
 await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=explore');await page.waitForFunction(()=>window.__circulationSequenceDebug&&document.getElementById('loading-screen').classList.contains('hidden'));
 for(const [width,height] of [[1366,768],[390,844]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>{window.__circulationSequenceDebug.seek(0);window.__circulationSequenceDebug.cameraMode('ride');});await page.waitForTimeout(200);
  check(await page.evaluate(()=>window.__circulationSequenceDebug.sequence.rideFrames?.length===1601&&!window.__circulationSequenceDebug.sequence.cameraActive),`${width}: camera path is prepared before playback begins`);
  const metrics=await page.evaluate(()=>{const frames=window.__circulationSequenceDebug.sequence.rideFrames;return {maxMove:Math.max(...frames.slice(1).map((f,i)=>f.eye.distanceTo(frames[i].eye))),maxRelativeMove:Math.max(...frames.slice(1).map((f,i)=>f.eye.distanceTo(frames[i].eye)/Math.min(f.eye.length(),frames[i].eye.length()))),maxTurn:Math.max(...frames.slice(1).map((f,i)=>f.rotation.angleTo(frames[i].rotation)))};});report.metrics.push({width,...metrics});
  check(metrics.maxRelativeMove<(width===1366?.03:.05),`${width}: close-up camera travel is slower than the previous abrupt zoom`,metrics);
  check(metrics.maxTurn<.04,`${width}: the entire 40-second path turns smoothly at stage boundaries`,metrics);
  const lens=[];for(const t of [0,.01,.025,.05,.25,.5,1,1.5]){await seek(t);lens.push({t,...await pose()});}
  check(Math.abs(lens[1].fov-lens[0].fov)<.01&&lens.every((v,i)=>!i||v.fov>=lens[i-1].fov)&&Math.abs(lens.at(-1).fov-65)<1e-6,`${width}: the opening lens eases gradually instead of jumping from 50 to 65 degrees`,lens.map(v=>({t:v.t,fov:v.fov})));
  for(const t of [4,12,15,19,23,27,30,31,33,35,38]){
   await seek(t);const a=await pose();await seek(t+.01);const b=await pose();
   check(Math.hypot(...b.p.map((v,i)=>v-a.p[i]))<.4,`${width} ${t}s: the camera crosses the route boundary without a position jump`);
  }
  await seek(17);const saved=await pose();await seek(29);await seek(17);
  check(JSON.stringify(await pose())===JSON.stringify(saved),`${width}: scrubbing reproduces the same smoothed camera pose`);
  await page.click('#mechanism-demo-play');await page.waitForTimeout(250);await page.click('#mechanism-reveal');const frozen=await pose();await page.waitForTimeout(250);
  check(JSON.stringify(await pose())===JSON.stringify(frozen),`${width}: pause freezes position, rotation and zoom exactly`);
  await page.click('#sequence-continue');await page.waitForTimeout(250);check(JSON.stringify(await pose())!==JSON.stringify(frozen),`${width}: continuing advances the same smoothed camera path`);await page.click('#mechanism-reveal');await page.click('#sequence-close');
  for(const t of [2,15.6,17,28.5,32,40]){await seek(t);await page.screenshot({path:join(out,`${width}-${t}.png`)});}
 }
 check(report.errors.length===0,'No browser errors',report.errors);
}catch(e){report.errors.push(String(e));console.error(e);}finally{await writeFile(join(out,'check.json'),JSON.stringify(report,null,2));await browser.close();}
process.exitCode=report.errors.length||report.checks.some(c=>!c.ok)?1:0;
