import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const out=resolve(process.argv[2]||'artifacts/synchronized-descent-clean-labels-20261013/layout');await mkdir(out,{recursive:true});
const checks=[],errors=[],evidence=[],check=(ok,name,data)=>{checks.push({ok,name,data});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto(pathToFileURL(resolve('三圈环流3D交互式教学平台.html')).href+'?state=explore');await page.waitForFunction(()=>window.__circulationSequenceDebug&&document.getElementById('loading-screen').classList.contains('hidden'));await page.waitForTimeout(800);
 for(const mode of ['ride','overview']){
  await page.evaluate(m=>window.__circulationSequenceDebug.cameraMode(m),mode);
  for(const time of [15.2,16,17,18.8,19,22,25,33,40]){
   await page.evaluate(t=>window.__circulationSequenceDebug.seek(t),time);await page.waitForTimeout(120);
   check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return [1,-1].every(h=>{const a=s.flows.find(f=>f.h===h&&f.kind==='sink'),b=s.flows.find(f=>f.h===h&&f.kind==='ferrel-sink');return a.start===b.start&&a.end===b.end&&a.group.visible&&b.group.visible&&a.ribbon.geometry.drawRange.count===b.ribbon.geometry.drawRange.count&&a.tubes[0].geometry.drawRange.count===b.tubes[0].geometry.drawRange.count;});}), `${mode} ${time}s: both 30-degree branches descend together and remain visible`);
  }
 }
 for(const [width,height] of [[1366,768],[760,800],[390,844]])for(const mode of ['ride','overview']){
  await page.setViewportSize({width,height});await page.evaluate(m=>window.__circulationSequenceDebug.cameraMode(m),mode);
  for(const time of [2,8,17,25,28.5,32,40]){
   await page.evaluate(t=>window.__circulationSequenceDebug.seek(t),time);await page.waitForTimeout(200);
   const result=await page.evaluate(()=>{
    const s=window.__circulationSequenceDebug.sequence,e=window.__circulationSequenceDebug.elapsed(),c=window.__threeCellDebug.camera;
    const labels=[...s.labels.filter(l=>l.obj.visible).map(l=>l.obj.element),...s.annotations.filter(n=>!n.el.hidden&&!n.label.hidden).map(n=>n.label),...s.pressureWaves.filter(w=>!w.word.hidden).map(w=>w.word)].filter(el=>getComputedStyle(el).visibility!=='hidden').map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,text:el.textContent};});
    const segments=[];
    for(const f of s.flows.filter(f=>f.group.visible)){
     let previous=null;const p=Math.max(0,Math.min(1,(e-f.start)/(f.end-f.start)));
     for(let i=0;i<=150;i++){const w=s.root.localToWorld(f.curve.getPoint(i/150*p)),n=w.clone().project(c),q={x:(n.x+1)*innerWidth/2,y:(1-n.y)*innerHeight/2,visible:n.z>-1&&n.z<1&&w.clone().sub(s.root.position).dot(c.position.clone().sub(w))>0};if(q.visible&&previous?.visible)segments.push([previous,q]);previous=q;}
    }
    const crosses=(r,[a,b])=>{let lo=0,hi=1;for(const [p,q] of [[a.x-b.x,a.x-r.left],[b.x-a.x,r.right-a.x],[a.y-b.y,a.y-r.top],[b.y-a.y,r.bottom-a.y]]){if(p===0){if(q<0)return false;}else if(p<0)lo=Math.max(lo,q/p);else hi=Math.min(hi,q/p);if(lo>hi)return false;}return true;};
    const frame=window.__threeCellDebug.getSceneFraming(),offscreenLabels=s.labels.filter(l=>{const p=l.obj.getWorldPosition(c.position.clone()).project(c),x=(p.x+1)*innerWidth/2,y=(1-p.y)*innerHeight/2,r=l.obj.element.getBoundingClientRect(),outside=p.z<=-1||p.z>=1||x<=frame.left+16||x>=frame.left+frame.availableW-16||y<=110||y>=frame.top+frame.availableH-18,visible=l.obj.visible&&getComputedStyle(l.obj.element).visibility!=='hidden';return outside&&(visible||l.leader&&!l.leader.hidden)||visible&&Math.hypot(Math.max(r.left-x,0,x-r.right),Math.max(r.top-y,0,y-r.bottom))>160.01;}).map(l=>l.obj.element.textContent);
    return {labels,offscreenLabels,routeOverlaps:labels.filter(r=>segments.some(segment=>crosses({...r,left:r.left-3,right:r.right+3,top:r.top-3,bottom:r.bottom+3},segment))).map(r=>r.text),mutualOverlaps:labels.filter((r,i)=>labels.slice(i+1).some(a=>r.left<a.right&&r.right>a.left&&r.top<a.bottom&&r.bottom>a.top)).map(r=>r.text),noteCount:s.annotations.filter(n=>!n.el.hidden&&!n.label.hidden).length};
   });evidence.push({width,mode,time,...result});
   check(result.routeOverlaps.length===0,`${width} ${mode} ${time}s: text stays clear of visible airflow`,result.routeOverlaps);
   check(result.mutualOverlaps.length===0,`${width} ${mode} ${time}s: labels do not cover each other`,result.mutualOverlaps);
   check(result.noteCount<=1,`${width} ${mode} ${time}s: only the current explanation is expanded`);
   check(result.offscreenLabels.length===0,`${width} ${mode} ${time}s: offscreen pressure labels and long leaders stay hidden`,result.offscreenLabels);
   if([8,17,32,40].includes(time))await page.screenshot({path:join(out,`${width}-${mode}-${time}.png`)});
  }
 }
 await page.setViewportSize({width:1366,height:768});await page.evaluate(()=>{window.__circulationSequenceDebug.cameraMode('ride');window.__circulationSequenceDebug.seek(32);});await page.waitForTimeout(250);
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,l=s.labels.find(l=>l.pressure&&l.obj.element.textContent.includes('赤道低'));return !l.obj.visible&&(!l.leader||l.leader.hidden);}), 'The equatorial pressure label and its leader hide during the polar close-up');
 await page.evaluate(()=>window.__circulationSequenceDebug.seek(40));await page.waitForTimeout(250);
 check(await page.evaluate(()=>{const l=window.__circulationSequenceDebug.sequence.labels.find(l=>l.pressure&&l.obj.element.textContent.includes('赤道低'));return l.obj.visible&&getComputedStyle(l.obj.element).visibility!=='hidden';}), 'The equatorial pressure label reappears when the camera returns to the full globe');
 await page.evaluate(()=>window.__circulationSequenceDebug.seek(25));await page.waitForTimeout(250);
 const marker=page.locator('.sequence-note[data-kind="sink"][data-hemisphere="1"] .sequence-note-marker');
 await marker.hover();await page.waitForTimeout(100);check(await page.locator('.sequence-note[data-kind="sink"][data-hemisphere="1"] .sequence-note-label').isVisible(),'Hovering a small marker reveals its local explanation');
 await marker.click();check(await page.evaluate(()=>document.getElementById('sequence-explanation').open&&document.getElementById('sequence-explanation-title').textContent.includes('30°')),'Clicking a small marker still pauses and opens its detailed explanation');
 check(errors.length===0,'No browser errors');
}catch(e){errors.push(String(e));console.error(e);}finally{await writeFile(join(out,'check.json'),JSON.stringify({checks,errors,evidence},null,2));await browser.close();}
process.exitCode=errors.length||checks.some(c=>!c.ok)?1:0;
