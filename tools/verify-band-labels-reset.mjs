import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const out=resolve(process.argv[2]||'artifacts/band-labels-reset-20261013/reset');await mkdir(out,{recursive:true});
const report={checks:[],errors:[]},check=(ok,name,data)=>{report.checks.push({ok,name,data});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}}),cdp=await page.context().newCDPSession(page);
page.on('pageerror',e=>report.errors.push(String(e)));
const seek=async t=>{await page.evaluate(t=>window.__circulationSequenceDebug.seek(t),t);await page.waitForTimeout(200);};
const pose=()=>page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,c=window.__threeCellDebug.camera;return {p:c.position.toArray(),q:c.quaternion.toArray(),fov:c.fov,near:c.near,root:s.root.rotation.y};});
const motion=()=>page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,d=window.__threeCellDebug;return JSON.stringify({e:window.__circulationSequenceDebug.elapsed(),playing:d.STATE.playing,rotation:d.earthGroup.rotation.y,arrows:s.arrowLoops.flatMap(l=>l.arrows.map(a=>a.helper.position.toArray())),waves:s.pressureWaves.map(w=>w.mesh.material.uniforms.uRadii.value)});});
try{
 await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=explore');await page.waitForFunction(()=>window.__circulationSequenceDebug&&document.getElementById('loading-screen').classList.contains('hidden'));
 for(const [width,height] of [[1366,768],[390,844]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>window.__circulationSequenceDebug.cameraMode('ride'));
  for(const t of [3.5,18.5,40]){
   await seek(t);
   const labels=await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,c=window.__threeCellDebug.camera;return s.labels.filter(l=>l.onBand&&l.obj.visible&&getComputedStyle(l.obj.element).visibility!=='hidden').map(l=>{const p=l.obj.getWorldPosition(c.position.clone()).project(c),r=l.obj.element.getBoundingClientRect();return {text:l.obj.element.textContent,lat:l.lat,actualLatitude:Math.asin(l.obj.position.y/l.obj.position.length())*180/Math.PI,centerError:Math.hypot((r.left+r.right)/2-(p.x+1)*innerWidth/2,(r.top+r.bottom)/2-(1-p.y)*innerHeight/2),leader:!!l.leader};});});
   check(labels.every(l=>!l.leader&&Math.abs(l.actualLatitude-l.lat)<1e-6&&l.centerError<1),`${width} ${t}s: visible subtropical names sit directly on their belts without leaders`,labels);
   if(width===1366&&t===18.5)check(labels.length>0,'The subtropical belt name is visible in the descent close-up');
   check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,b=getComputedStyle(s.labels.find(l=>l.pressure).obj.element);return s.pressureWaves.every(w=>{const c=getComputedStyle(w.word);return c.color!==b.color&&c.backgroundColor!==b.backgroundColor&&parseFloat(c.borderRadius)>100;})&&getComputedStyle(s.pressureWaves[0].word).color!==getComputedStyle(s.pressureWaves[2].word).color;}),`${width} ${t}s: high and low pressure pills differ from each other and belt labels`);
   await page.screenshot({path:join(out,`${width}-${t}.png`)});
  }
  await seek(18.5);await page.click('#mechanism-reveal');const frozen=await motion();
  check(await page.locator('#reset-globe-view').evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.left>=0&&r.right<=innerWidth&&hit===el;}),`${width}: reset button is fully visible and unobstructed`);
  await page.click('#reset-globe-view');await page.waitForTimeout(1050);const baseline=await pose();
  check(await motion()===frozen&&await page.locator('#sequence-explanation').evaluate(el=>el.open),`${width}: reset with explanation open preserves the exact pause and airflow`);
  const point=await page.evaluate(()=>{const f=window.__threeCellDebug.getSceneFraming();return {x:f.centerX,y:f.centerY-20};});
  if(width===390){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});
   for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x-i*12,y:point.y+i*4,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x-160,point.y+35,{steps:8});await page.mouse.up();await page.mouse.wheel(0,-200);}
  await page.waitForTimeout(350);const dragged=await pose();
  check(dragged.p.some((v,i)=>Math.abs(v-baseline.p[i])>.1),`${width}: actual dragging changes the globe view`);
  await page.click('#reset-globe-view');await page.waitForTimeout(1050);const restored=await pose();
  check(restored.p.every((v,i)=>Math.abs(v-baseline.p[i])<.01)&&restored.q.every((v,i)=>Math.abs(v-baseline.q[i])<.001)&&Math.abs(restored.root-baseline.root)<.001&&restored.fov===50&&restored.near===.1,`${width}: reset restores initial orientation, lens and zoom after dragging`,{baseline,restored});
  check(await motion()===frozen,`${width}: dragging, zooming and reset keep the paused process unchanged`);
  await page.waitForTimeout(200);check(JSON.stringify(await pose())===JSON.stringify(restored),`${width}: restored camera stays stable without orbit drift`);
  await page.screenshot({path:join(out,`${width}-reset-paused.png`)});await page.click('#sequence-close');
  await page.evaluate(()=>window.__circulationSequenceDebug.seek(25,true));await page.waitForTimeout(120);await page.click('#reset-globe-view');await page.waitForTimeout(1050);
  check(await page.evaluate(()=>window.__threeCellDebug.STATE.playing&&window.__circulationSequenceDebug.elapsed()>25&&!window.__circulationSequenceDebug.sequence.cameraActive),`${width}: resetting during playback preserves progress and keeps the overview`);
  await seek(40);await page.click('#reset-globe-view');await page.waitForTimeout(1050);
  check(await page.evaluate(()=>window.__circulationSequenceDebug.elapsed()===40&&window.__circulationSequenceDebug.sequence.flows.every(f=>f.group.visible)),`${width}: reset after completion retains all three circulation cells`);
 }
 check(report.errors.length===0,'No browser errors',report.errors);
}catch(e){report.errors.push(String(e));console.error(e);}finally{await writeFile(join(out,'check.json'),JSON.stringify(report,null,2));await browser.close();}
process.exitCode=report.errors.length||report.checks.some(c=>!c.ok)?1:0;
