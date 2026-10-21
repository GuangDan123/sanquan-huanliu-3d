import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const out=resolve('artifacts/early-follow-20261016');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage(),checks=[],errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const check=(ok,name)=>{checks.push({ok,name});console.log(`${ok?'PASS':'FAIL'} ${name}`);assert(ok,name);};
const pose=()=>page.evaluate(()=>{const d=window.__threeCellDebug;return JSON.stringify({eye:d.camera.position.toArray(),rotation:d.camera.quaternion.toArray(),fov:d.camera.fov,target:d.cameraTarget.toArray()});});
const seek=async time=>{await page.evaluate(t=>window.__circulationSequenceDebug.seek(t),time);await page.waitForTimeout(150);};
try{
  for(const [width,height] of [[1366,900],[390,844]]){
    await page.setViewportSize({width,height});
    await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=explore');
    await page.waitForFunction(()=>window.__circulationSequenceDebug&&window.__singleCirculationDebug);await page.waitForTimeout(2200);
    check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return !s.cameraActive&&s.cameraMode==='overview'&&window.__circulationSequenceDebug.elapsed()===0;}),`${width}: the stationary introduction keeps the overview`);
    await page.evaluate(()=>document.getElementById('teaching-intro-play').click());
    await page.waitForFunction(()=>window.__circulationSequenceDebug.elapsed()>.3);
    check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return s.cameraMode==='ride'&&s.cameraActive&&!s.autoRidePending&&window.__circulationSequenceDebug.elapsed()<2;}),`${width}: following starts immediately with playback`);
    await page.evaluate(()=>window.__circulationSequenceDebug.seek(.4));await page.waitForTimeout(100);
    const earlyPause=await pose();await page.waitForTimeout(250);check(earlyPause===await pose(),`${width}: pausing during camera entry also freezes the camera`);
    for(const time of [2,4,6,11.999,12,17]){
      await seek(time);
      const frame=await page.evaluate(()=>{const d=window.__threeCellDebug,s=window.__circulationSequenceDebug.sequence,r=window.__circulationSequenceDebug.route(window.__circulationSequenceDebug.elapsed()),world=s.root.localToWorld(r.point.clone()),p=world.clone().project(d.camera),f=d.getSceneFraming();return {active:s.cameraActive,distance:d.camera.position.distanceTo(s.root.position),x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2,z:p.z,frame:f,cloud:s.equatorAir.group.visible,columns:s.ascentColumns.every(c=>c.group.visible)};});
      check(frame.active&&frame.distance>5.3&&frame.x>frame.frame.left&&frame.x<frame.frame.left+frame.frame.availableW&&frame.y>frame.frame.top&&frame.y<frame.frame.top+frame.frame.availableH&&frame.z>-1&&frame.z<1,`${width}: the followed air parcel stays visible and outside Earth at ${time}s`);
      check(frame.cloud&&frame.columns,`${width}: the equatorial air mass and columns remain enabled at ${time}s`);
      if([2,4,6,12].includes(time))await page.screenshot({path:join(out,`${width}-${time}.png`)});
      if(time===6){
        const fixed=await pose();await seek(9);await seek(6);check(fixed===await pose(),`${width}: seeking back restores the same follow-camera pose`);
        const buffer=await page.locator('#scene-container canvas').screenshot();
        const pixels=await page.evaluate(async src=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const a=ctx.getImageData(0,0,c.width,c.height).data;let globe=0,air=0;for(let i=0;i<a.length;i+=4){if(a[i+2]>70&&a[i+2]>a[i]*1.2)globe++;if(a[i]>160&&a[i+1]>140&&a[i+2]<130)air++;}return {globe,air};},'data:image/png;base64,'+buffer.toString('base64'));
        check(pixels.globe>1000&&pixels.air>20,`${width}: the followed scene contains rendered Earth and airflow pixels`);
      }
    }
    await page.evaluate(()=>window.__circulationSequenceDebug.cameraMode('overview'));await seek(6);
    await page.evaluate(()=>document.getElementById('mechanism-demo-play').click());await page.waitForTimeout(180);
    check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return s.cameraMode==='overview'&&!s.cameraActive&&!s.autoRidePending;}),`${width}: a manual overview selection remains in effect during playback`);
    await page.evaluate(()=>document.getElementById('mechanism-demo-replay').click());await page.waitForTimeout(900);
    check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return !s.cameraActive&&s.autoRidePending&&window.__circulationSequenceDebug.elapsed()===0;}),`${width}: replay restores the stationary overview`);
    await page.evaluate(()=>document.getElementById('teaching-intro-play').click());await page.waitForFunction(()=>window.__circulationSequenceDebug.elapsed()>.3);
    check(await page.evaluate(()=>window.__circulationSequenceDebug.sequence.cameraActive),`${width}: replay also follows from the beginning`);
  }
  check(errors.length===0,'No browser or shader errors');
}finally{await writeFile(join(out,'checks.json'),JSON.stringify({checks,errors},null,2));await browser.close();}
