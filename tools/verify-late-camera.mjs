import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const out=resolve('artifacts/stable-late-camera-20261016');
await mkdir(out,{recursive:true});
const report={checks:[],metrics:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage();
page.on('pageerror',e=>report.errors.push(String(e)));
const check=(ok,name,data)=>{report.checks.push({ok,name,data});console.log(`${ok?'PASS':'FAIL'} ${name}${data?' '+JSON.stringify(data):''}`);assert(ok,name);};
const pose=()=>page.evaluate(()=>{const c=window.__threeCellDebug.camera;return JSON.stringify({eye:c.position.toArray(),rotation:c.quaternion.toArray(),fov:c.fov});});
const seek=async time=>{await page.evaluate(t=>window.__circulationSequenceDebug.seek(t),time);await page.waitForTimeout(80);};
try{
  for(const [width,height] of [[1366,900],[390,844]]){
    await page.setViewportSize({width,height});
    await page.goto(pathToFileURL(resolve('三圈环流3D交互式教学平台.html')).href+'?state=explore');
    await page.waitForFunction(()=>window.__circulationSequenceDebug);await page.waitForTimeout(2200);
    await page.evaluate(()=>document.getElementById('teaching-intro-play').click());
    await seek(29);await page.evaluate(()=>window.__circulationSequenceDebug.cameraMode('ride'));await page.waitForTimeout(500);
    const metrics=await page.evaluate(()=>{
      const frames=window.__circulationSequenceDebug.sequence.rideFrames,late=frames.slice(1160),motion=late.slice(1).map((f,i)=>({speed:f.eye.distanceTo(late[i].eye)/.025,relativeSpeed:f.eye.distanceTo(late[i].eye)/late[i].eye.length()/.025,turn:f.rotation.angleTo(late[i].rotation)/.025,radial:(f.eye.length()-late[i].eye.length())/.025}));
      return {maxSpeed:Math.max(...motion.map(m=>m.speed)),maxRelativeSpeed:Math.max(...motion.map(m=>m.relativeSpeed)),maxTurn:Math.max(...motion.map(m=>m.turn)),minRadialSpeed:Math.min(...motion.map(m=>m.radial)),holdTravel:frames[1348].eye.distanceTo(frames[1332].eye),samples:[29,30,31,32,33,34,35,36,38,40].map(t=>({t,radius:frames[Math.round(t/.025)].eye.length()}))};
    });
    report.metrics.push({width,...metrics});
    check(metrics.maxRelativeSpeed<.36&&metrics.maxTurn<.4,`${width}: no rapid late-camera travel or turning`,metrics);
    check(metrics.minRadialSpeed>-.01,`${width}: no repeated push-in after 29 seconds`);
    check(metrics.holdTravel<.001,`${width}: polar observation holds steady before the final overview`);
    const frames=[];
    for(const time of [29,30,31,32,33,35,38,40]){
      await seek(time);
      const frame=await page.evaluate(()=>{
        const d=window.__threeCellDebug,s=window.__circulationSequenceDebug.sequence,r=window.__circulationSequenceDebug.route(window.__circulationSequenceDebug.elapsed()),world=s.root.localToWorld(r.point.clone()),p=world.clone().project(d.camera),f=d.getSceneFraming();
        return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2,z:p.z,framing:f,distance:d.camera.position.distanceTo(s.root.position),visible:world.clone().sub(s.root.position).dot(d.camera.position.clone().sub(world))>0};
      });
      frames.push({time,...frame});
      check(frame.distance>5.3&&frame.visible&&frame.z>-1&&frame.z<1&&frame.x>frame.framing.left&&frame.x<frame.framing.left+frame.framing.availableW&&frame.y>frame.framing.top&&frame.y<frame.framing.top+frame.framing.availableH,`${width}: air parcel remains visible at ${time}s`,frame);
      if([29,31,33,35,38,40].includes(time))await page.screenshot({path:join(out,`${width}-${time}.png`)});
    }
    report.metrics.push({width,frames});
    await seek(31.5);const paused=await pose();await page.waitForTimeout(300);
    check(paused===await pose(),`${width}: pausing freezes the late camera`);
    await seek(37);await seek(31.5);
    check(paused===await pose(),`${width}: seeking restores the same late-camera pose`);
    await page.evaluate(()=>{window.__threeCellDebug.STATE.speed=2;window.__circulationSequenceDebug.seek(29,true);});
    const playback=await page.evaluate(()=>new Promise(resolve=>{
      const start=performance.now(),last=new Map(),jumps=[],samples=[];
      const tick=()=>{
        const d=window.__circulationSequenceDebug,e=d.elapsed();
        for(const n of d.sequence.annotations){
          if(n.el.hidden||n.label.hidden){last.delete(n);continue;}
          const r=n.label.getBoundingClientRect(),previous=last.get(n);
          if(previous){const dt=(performance.now()-previous.time)/1000,move=Math.hypot(r.x-previous.x,r.y-previous.y);if(dt<.1&&move>Math.max(12,dt*300))jumps.push({e,kind:n.kind,move,dt});}
          last.set(n,{x:r.x,y:r.y,time:performance.now()});
        }
        samples.push({e,radius:window.__threeCellDebug.camera.position.distanceTo(d.sequence.root.position)});
        if(e>=39.9||performance.now()-start>12000)resolve({jumps,samples});else requestAnimationFrame(tick);
      };requestAnimationFrame(tick);
    }));
    report.metrics.push({width,playback});
    check(playback.samples.at(-1).e>=39.9,`${width}: continuous playback reaches the final overview`);
    check(playback.jumps.length===0,`${width}: teaching labels remain stable during late playback`,playback.jumps);
    await seek(32);
    const note=page.locator('.sequence-note.is-current .sequence-note-label:visible');
    await note.click();
    check(await page.locator('#sequence-explanation').isVisible()&&!await page.evaluate(()=>window.__threeCellDebug.STATE.playing),`${width}: clicking the short label pauses and opens details`);
    const pixels=await page.locator('#scene-container canvas').screenshot();
    const colorCount=await page.evaluate(async src=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const a=ctx.getImageData(0,0,c.width,c.height).data;let earth=0,air=0;for(let i=0;i<a.length;i+=4){if(a[i+2]>70&&a[i+2]>a[i]*1.2)earth++;if(a[i+1]>100&&Math.max(a[i],a[i+2])>140)air++;}return {earth,air};},'data:image/png;base64,'+pixels.toString('base64'));
    check(colorCount.earth>1000&&colorCount.air>100,`${width}: Earth and airflow render in the late view`,colorCount);
  }
  check(report.errors.length===0,'No browser errors',report.errors);
}catch(e){report.errors.push(String(e));console.error(e);process.exitCode=1;}
finally{await writeFile(join(out,'checks.json'),JSON.stringify(report,null,2));await browser.close();}
