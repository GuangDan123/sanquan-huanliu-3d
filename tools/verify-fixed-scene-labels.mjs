import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const out=resolve('artifacts/fixed-labels-20261016');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage(),report={checks:[],runs:[],errors:[]};
page.on('pageerror',e=>report.errors.push(String(e)));
const check=(ok,name,data)=>{report.checks.push({ok,name,data});console.log(`${ok?'PASS':'FAIL'} ${name}${data?' '+JSON.stringify(data):''}`);assert(ok,name);};
const url=pathToFileURL(resolve('三圈环流3D交互式教学平台.html')).href;

async function samplePlayback(step){
  return page.evaluate(step=>new Promise(resolve=>{
    const seq=window.__circulationSequenceDebug,single=window.__singleCirculationDebug,d=window.__threeCellDebug;
    const model=step===1?seq.sequence:single.model,start=performance.now(),placements=new Map(),anchors=new Map(),violations=[],seen=new Set(),flips=new Map();
    let frames=0,maxProjectionError=0,maxOffsetError=0;
    const visible=el=>{const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&el.getClientRects().length>0;};
    const pointToScreen=p=>{const n=model.root.localToWorld(p.clone()).project(d.camera);return {x:(n.x+1)*innerWidth/2,y:(1-n.y)*innerHeight/2};};
    const offset=(owner,el,anchor)=>{
      if(!visible(el))return;
      const r=el.getBoundingClientRect(),value=[r.left-anchor.x,r.top-anchor.y],old=placements.get(owner);
      if(old){const error=Math.hypot(value[0]-old[0],value[1]-old[1]);maxOffsetError=Math.max(maxOffsetError,error);if(error>.5)violations.push({type:'relocation',text:el.textContent,error});}
      placements.set(owner,value);seen.add(el.textContent);
    };
    const tick=()=>{
      frames++;const e=step===1?seq.elapsed():d.STATE.singleDemo.elapsed;
      for(const note of step===1?model.annotations:model.notes){
        const el=note.label,isVisible=visible(el)&&!note.el.hidden,key=el.textContent,previous=flips.get(key);
        if(previous&&previous.visible!==isVisible){previous.changes++;previous.visible=isVisible;}else if(!previous)flips.set(key,{visible:isVisible,changes:0});
        if(!isVisible)continue;
        const anchor={x:parseFloat(note.el.style.left),y:parseFloat(note.el.style.top)};offset(note,el,anchor);
      }
      for(const wave of model.pressureWaves)offset(wave,wave.word,pointToScreen(wave.center));
      if(step===1)for(const label of model.labels){
        const local=label.obj.position.toArray(),old=anchors.get(label);
        if(old&&local.some((v,i)=>Math.abs(v-old[i])>1e-8))violations.push({type:'anchor-moved',text:label.obj.element.textContent});
        anchors.set(label,local);
        const el=label.obj.element;if(!label.obj.visible||!visible(el))continue;
        const screen=pointToScreen(label.obj.position),r=el.getBoundingClientRect(),error=Math.hypot(r.left+r.width/2-screen.x,r.top+r.height/2-screen.y);
        maxProjectionError=Math.max(maxProjectionError,error);if(error>.5)violations.push({type:'detached',text:el.textContent,error});seen.add(el.textContent);
        if(label.pressure){
          const camera=d.camera.position.clone().sub(model.root.position).applyQuaternion(model.root.quaternion.clone().invert()),p=label.obj.position,delta=p.clone().sub(camera),t=Math.max(0,Math.min(1,-camera.dot(delta)/delta.lengthSq()));
          if(camera.addScaledVector(delta,t).lengthSq()<25-1e-6)violations.push({type:'visible-through-earth',text:el.textContent});
        }
      }
      if(e>=(step===1?39.99:15.99)||performance.now()-start>30000)resolve({step,e,frames,maxProjectionError,maxOffsetError,violations,seen:[...seen],visibility:[...flips].map(([text,data])=>({text,...data}))});else requestAnimationFrame(tick);
    };requestAnimationFrame(tick);
  }),step);
}
try{
  for(const [width,height] of [[1366,900],[390,844]]){
    await page.setViewportSize({width,height});
    for(const step of [0,1]){
      await page.goto(url+(step===0?'?state=guided':'?state=explore'));
      await page.waitForFunction(step=>step===0?window.__singleCirculationDebug:window.__circulationSequenceDebug,step);await page.waitForTimeout(2200);
      await page.evaluate(()=>{window.__threeCellDebug.STATE.speed=2;document.getElementById('teaching-intro-play').click();});
      const run=await samplePlayback(step);report.runs.push({width,...run});
      check(run.e>=(step===1?39.99:15.99),`${width} step ${step+1}: continuous playback completed`,{frames:run.frames});
      check(run.violations.length===0,`${width} step ${step+1}: no detached labels or changing anchor offsets`,{maxProjectionError:run.maxProjectionError,maxOffsetError:run.maxOffsetError,violations:run.violations.slice(0,5)});
      check(run.seen.length>=3,`${width} step ${step+1}: teaching labels were visible during playback`,run.seen);
      if(step===0){
        await page.evaluate(()=>window.__singleCirculationDebug.seek(3));await page.waitForTimeout(250);
        await page.screenshot({path:join(out,`${width}-single-3.png`)});
        continue;
      }
      for(const time of [17,28,32,40]){
        await page.evaluate(t=>window.__circulationSequenceDebug.seek(t),time);await page.waitForTimeout(200);
        await page.screenshot({path:join(out,`${width}-${time}.png`)});
      }
      const paused=await page.evaluate(()=>window.__circulationSequenceDebug.sequence.labels.map(l=>({p:l.obj.position.toArray(),transform:l.obj.element.style.transform,visible:l.obj.visible,visibility:l.obj.element.style.visibility})));
      await page.waitForTimeout(250);
      check(JSON.stringify(paused)===await page.evaluate(()=>JSON.stringify(window.__circulationSequenceDebug.sequence.labels.map(l=>({p:l.obj.position.toArray(),transform:l.obj.element.style.transform,visible:l.obj.visible,visibility:l.obj.element.style.visibility})))),`${width}: paused band labels stay stationary`);
      await page.evaluate(()=>window.__circulationSequenceDebug.seek(32));await page.waitForTimeout(180);
      await page.locator('#sequence-annotations .sequence-note.is-current .sequence-note-label:visible').click();
      check(await page.locator('#sequence-explanation').isVisible()&&!await page.evaluate(()=>window.__threeCellDebug.STATE.playing),`${width}: stable labels still open details and pause`);
      await page.locator('#sequence-close').click();
      await page.evaluate(()=>{window.__circulationSequenceDebug.seek(40);window.__circulationSequenceDebug.cameraMode('overview');const s=window.__circulationSequenceDebug.sequence;s.freeView=true;window.__threeCellDebug.STATE.showPaths=false;window.__threeCellDebug.STATE.showParticles=false;});
      const occlusion=await page.evaluate(async()=>{
        const d=window.__threeCellDebug,s=window.__circulationSequenceDebug.sequence,l=s.labels.find(l=>l.pressure&&l.lat===30),anchor=l.obj.getWorldPosition(l.obj.position.clone()),outward=anchor.clone().sub(s.root.position).normalize();
        const pose=async sign=>{d.camera.position.copy(s.root.position).addScaledVector(outward,sign*18);d.camera.up.set(0,1,0);d.camera.lookAt(s.root.position);d.cameraTarget.copy(s.root.position);d.camera.updateMatrixWorld(true);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const el=l.obj.element;return {visible:l.obj.visible&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).display!=='none',anchor:l.obj.position.toArray()};};
        return {front:await pose(1),back:await pose(-1),return:await pose(1)};
      });
      check(occlusion.front.visible&&!occlusion.back.visible&&occlusion.return.visible&&JSON.stringify(occlusion.front.anchor)===JSON.stringify(occlusion.return.anchor),`${width}: band label hides behind Earth and returns to its original anchor`,occlusion);
    }
  }
  check(report.errors.length===0,'No browser errors',report.errors);
}catch(e){report.errors.push(String(e));console.error(e);process.exitCode=1;}
finally{await writeFile(join(out,'checks.json'),JSON.stringify(report,null,2));await browser.close();}
