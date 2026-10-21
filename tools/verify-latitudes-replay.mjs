import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const out=resolve('artifacts/latitudes-replay-20261013');await mkdir(out,{recursive:true});
const report={checks:[],errors:[]},check=(ok,name)=>{report.checks.push({ok,name});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}}),cdp=await page.context().newCDPSession(page);page.on('pageerror',e=>report.errors.push(String(e)));
const seek=async t=>{await page.evaluate(t=>window.__circulationSequenceDebug.seek(t),t);await page.waitForTimeout(180);};
try{
 await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=explore');await page.waitForFunction(()=>window.__circulationSequenceDebug&&document.getElementById('loading-screen').classList.contains('hidden'));
 for(const [width,height] of [[1366,768],[390,844]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>window.__circulationSequenceDebug.cameraMode('ride'));
  for(const t of [12,18.5,40]){
   await seek(t);
   check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return [-30,30].every(lat=>{const g=s.guides.find(g=>g.lat===lat),p=g.line.geometry.attributes.position;return g.line.visible&&g.line.material.isLineDashedMaterial&&g.line.material.opacity>=.7&&Array.from({length:p.count},(_,i)=>{const r=Math.hypot(p.getX(i),p.getY(i),p.getZ(i));return r>5.14&&r<5.16&&Math.abs(Math.asin(p.getY(i)/r)*180/Math.PI-lat)<1e-4;}).every(Boolean);});}),`${width} ${t}s: both 30-degree latitude lines remain above the pressure belts`);
   await page.screenshot({path:join(out,`${width}-${t}.png`)});
  }
  await seek(18.5);await page.click('#tog-grid');await page.waitForTimeout(150);
  check(await page.evaluate(()=>window.__circulationSequenceDebug.sequence.guides.filter(g=>g.lat!==0).every(g=>!g.line.visible)),`${width}: grid switch hides the latitude lines while paused`);
  await page.click('#tog-grid');await page.waitForTimeout(150);
  check(await page.evaluate(()=>window.__circulationSequenceDebug.sequence.guides.filter(g=>g.lat!==0).every(g=>g.line.visible)),`${width}: grid switch restores both latitude lines while paused`);
  for(const scenario of ['reset','drag','finished-overview']){
   await page.evaluate(()=>window.__circulationSequenceDebug.cameraMode('ride'));await seek(scenario==='finished-overview'?40:18.5);
   if(scenario==='reset'){await page.click('#reset-globe-view');await page.waitForTimeout(900);}
   if(scenario==='finished-overview')await page.click('#sequence-camera-toggle');
   if(scenario==='drag'){
    await page.click('#mechanism-reveal');
    const p=await page.evaluate(()=>{const f=window.__threeCellDebug.getSceneFraming();return {x:f.centerX-40,y:f.centerY-35};});
    if(width===390){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x-i*12,y:p.y+i*3,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
    else{await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x-110,p.y+25,{steps:6});await page.mouse.up();await page.mouse.wheel(0,-100);}
    await page.waitForTimeout(150);
    check(await page.evaluate(()=>window.__circulationSequenceDebug.sequence.freeView&&document.getElementById('sequence-explanation').open),`${width}: ${scenario} reproduces free observation with explanation open`);
    if(width===390)await page.click('#sequence-close');
   }
   await page.click('#mechanism-demo-replay');await page.waitForTimeout(250);
   check(await page.evaluate(()=>{const d=window.__circulationSequenceDebug,s=d.sequence;return d.elapsed()>0&&d.elapsed()<1&&s.cameraActive&&s.cameraMode==='ride'&&!s.freeView&&!s.freeLens&&window.__threeCellDebug.STATE.playing&&!document.getElementById('sequence-explanation').open;}),`${width} ${scenario}: replay restarts at the equator and restores camera follow`);
   const before=await page.evaluate(()=>window.__threeCellDebug.camera.position.toArray());await page.waitForTimeout(1500);
   check(await page.evaluate(before=>{const s=window.__circulationSequenceDebug.sequence,c=window.__threeCellDebug.camera;return c.position.toArray().some((v,i)=>Math.abs(v-before[i])>.2)&&s.cameraActive&&s.ridePose.kind==='equator-rise';},before),`${width} ${scenario}: camera advances along the airflow after replay`);
   await page.click('#mechanism-reveal');const frozen=await page.evaluate(()=>({e:window.__circulationSequenceDebug.elapsed(),p:window.__threeCellDebug.camera.position.toArray()}));await page.waitForTimeout(200);
   check(await page.evaluate(f=>window.__circulationSequenceDebug.elapsed()===f.e&&window.__threeCellDebug.camera.position.toArray().every((v,i)=>Math.abs(v-f.p[i])<1e-8),frozen),`${width} ${scenario}: pause still freezes the resumed follow camera`);
   await page.screenshot({path:join(out,`${width}-replay-${scenario}.png`)});await page.click('#sequence-close');
  }
 }
 check(report.errors.length===0,'No browser errors');
}catch(e){report.errors.push(String(e));console.error(e);}finally{await writeFile(join(out,'check.json'),JSON.stringify(report,null,2));await browser.close();}
process.exitCode=report.errors.length||report.checks.some(c=>!c.ok)?1:0;
