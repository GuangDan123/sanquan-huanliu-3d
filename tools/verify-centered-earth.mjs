// Verify the delivered offline page: solar visibility, globe framing and step/view transitions.
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
const out=resolve(process.argv[2]||'artifacts/centered-earth-20261011');
await mkdir(out,{recursive:true});
const report={checks:[],errors:[],screenshots:[],buildSha256:createHash('sha256').update(await readFile('三圈环流3D交互式教学平台.html')).digest('hex')};
const port=24000+process.pid%1000;
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,`--user-data-dir=${join(out,'profile')}`,'about:blank'],{stdio:'ignore',windowsHide:true});
let ws;
const check=(ok,name,evidence)=>{report.checks.push({ok,name,evidence});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
try{
 let tab;
 for(let i=0;i<80;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'});if(r.ok){tab=await r.json();break;}}catch{}await sleep(100);}
 if(!tab)throw Error('Chrome startup timeout');
 ws=new WebSocket(tab.webSocketDebuggerUrl);let id=0;const pending=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);});
 await new Promise(r=>ws.addEventListener('open',r));
 const send=(method,params={})=>new Promise((resolve,reject)=>{const k=++id;pending.set(k,{resolve,reject});ws.send(JSON.stringify({id:k,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const viewport=async(w,h)=>{await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:false});await sleep(350);};
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(out,name+'.png'),Buffer.from(r.data,'base64'));report.screenshots.push(name+'.png');};
 const measure=()=>ev(`(()=>{
  const d=window.__threeCellDebug,f=d.getSceneFraming(),c=d.earthGroup.getWorldPosition(d.makeVector3(0,0,0)),p=c.clone().project(d.camera);
  const distance=d.camera.position.distanceTo(c),radius=d.atmosphereRadius,n=d.camera.position.clone().sub(c).normalize();
  const right=d.makeVector3(1,0,0).applyQuaternion(d.camera.quaternion),up=d.makeVector3(0,1,0).applyQuaternion(d.camera.quaternion);
  const origin=c.clone().addScaledVector(n,radius*radius/distance),rim=radius*Math.sqrt(1-radius*radius/distance/distance),points=[];
  for(let i=0;i<120;i++){const t=i*Math.PI*2/120,v=origin.clone().addScaledVector(right,rim*Math.cos(t)).addScaledVector(up,rim*Math.sin(t)).project(d.camera);points.push({x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2});}
  const labels=[...d.latLabels,...d.pressureLabels,...d.windLabels,...d.mechanismLabels].filter(x=>x.obj.visible&&getComputedStyle(x.obj.element).display!=='none').map(x=>({text:x.obj.element.textContent,...x.obj.element.getBoundingClientRect().toJSON()}));
  const oldTangent=Math.tan(d.camera.fov*Math.PI/360)*Math.min(f.availableW,f.availableH)/innerHeight*.78;
  let surface=null;
  if(d.STATE.step===1&&d.STATE.mechanismStage===0){
   const g=d.mechanismGroups[0],radii=[],worldRadius=v=>g.localToWorld(v).distanceTo(c);
   g.updateMatrixWorld(true);
   for(const child of g.children){
    if(child.userData.kind==='upper')for(let i=0;i<=400;i++)radii.push(worldRadius(child.geometry.parameters.path.getPoint(i/400)));
    if(child.isLine||child.isPoints){const a=child.geometry.attributes.position;for(let i=0;i<a.count;i++)radii.push(worldRadius(d.makeVector3(a.getX(i),a.getY(i),a.getZ(i))));}
    if(child.isMesh&&child.geometry.type==='SphereGeometry')radii.push(worldRadius(child.position.clone()));
    if(child.type==='ArrowHelper'&&child.visible)radii.push(worldRadius(child.position.clone()));
   }
   surface={min:Math.min(...radii),max:Math.max(...radii),earthRadius:d.earthRadius,count:radii.length,rootCenterError:g.getWorldPosition(d.makeVector3(0,0,0)).distanceTo(c),hemisphereLabels:d.mechanismLabels.filter(x=>x.group===g).map(x=>({north:x.obj.position.y>0,visible:x.obj.visible}))};
  }
  return{step:d.STATE.step,center:{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2},framing:f,distance,oldFitDistance:8.1/Math.sin(Math.atan(oldTangent)),bounds:{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))},labels,surface,sun:d.getSunDiagnostics(),sunDisplay:getComputedStyle(document.querySelector('.sun-label')).display,controlTop:document.getElementById('control-panel').getBoundingClientRect().top};
 })()`);
 const inspect=async name=>{
  const m=await measure(),f=m.framing;
  check(!m.sun.visible&&!m.sun.labelVisible&&!m.sun.arrowsVisible&&m.sunDisplay==='none',name+' hides sun, label and all radiation arrows',{visible:m.sun.visible,labelVisible:m.sun.labelVisible,arrowsVisible:m.sun.arrowsVisible,display:m.sunDisplay});
  check(Math.abs(m.center.x-(f.left+f.availableW/2))<1&&Math.abs(m.center.y-f.centerY)<1,name+' centers Earth in usable area',{center:m.center,framing:f});
  check(m.distance<m.oldFitDistance*.85,name+' enlarges Earth relative to previous whole-globe framing',{distance:m.distance,oldFitDistance:m.oldFitDistance});
  check(m.bounds.left>=f.left&&m.bounds.right<=f.left+f.availableW&&m.bounds.top>=f.top&&m.bounds.bottom<=f.top+f.availableH,name+' keeps entire atmosphere clear of panels',m.bounds);
  check(m.labels.every(x=>x.left>=0&&x.right<=innerWidthValue+1&&x.top>=0&&x.bottom<=m.controlTop+1),name+' keeps visible labels above controls',m.labels);
  if(m.surface){const s=m.surface;check(s.count>900&&s.rootCenterError<1e-6&&s.min>s.earthRadius+.08&&s.max<s.earthRadius+.2,name+' places trajectories, references, parcels and arrow origins on Earth surface',s);}
 };
 let innerWidthValue=1366;
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
 await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 await viewport(1366,768);
 await send('Page.navigate',{url:pathToFileURL(resolve('三圈环流3D交互式教学平台.html')).href});
 let loaded=false;for(let i=0;i<120;i++){if(await ev('!!window.__threeCellDebug&&document.getElementById("loading-screen").classList.contains("hidden")')){loaded=true;break;}await sleep(100);}
 check(loaded,'Standalone platform loads offline');if(!loaded)throw Error('Page did not initialize');
 await ev('document.getElementById("btn-start-free").click()');await sleep(500);
 for(const [w,h] of [[1366,768],[1600,1000],[760,800],[390,844]]){
  innerWidthValue=w;await viewport(w,h);
  for(const step of [1,2]){
   await ev(`window.__threeCellDebug.transitionToStep(${step})`);await sleep(850);
   await inspect(`${w} step ${step+1} automatic focus`);await shot(`${w}-step-${step+1}`);
   for(const view of ['side','front','top','reset']){
    await ev(`window.__threeCellDebug.setView('${view}')`);await sleep(900);
    await inspect(`${w} step ${step+1} ${view}`);
   }
  }
 }
 await viewport(1366,768);innerWidthValue=1366;
 await ev('window.__classroomDebug.state.autoFocus=false;window.__threeCellDebug.transitionToStep(1)');await sleep(300);await inspect('Autofocus disabled step entry');
 await ev('window.__classroomDebug.state.autoFocus=true');
 await ev('window.__threeCellDebug.setView("front")');await sleep(900);
 for(const bend of [0,12,24,45]){
  await ev(`(()=>{const e=document.getElementById('coriolis-slider');e.value=${bend};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  for(const elapsed of [0,3,6,10]){
   await ev(`window.__threeCellDebug.STATE.mechanismDemo.elapsed=${elapsed};window.__threeCellDebug.STATE.mechanismDemo.running=false;window.__threeCellDebug.STATE.playing=false`);await sleep(100);
   await inspect(`Surface path bend ${bend} time ${elapsed}`);
  }
 }
 await ev("(()=>{const e=document.getElementById('coriolis-slider');e.value=12;e.dispatchEvent(new Event('input',{bubbles:true}));})()");
 await ev('window.__threeCellDebug.setView("top")');await sleep(900);
 const topSurface=(await measure()).surface;
 check(topSurface.hemisphereLabels.find(l=>l.north).visible&&!topSurface.hemisphereLabels.find(l=>!l.north).visible,'Polar view hides the label behind Earth');await shot('surface-top');
 for(const stage of [0,1,2,3]){await ev(`window.__threeCellDebug.setMechanismStage(${stage})`);await sleep(800);await inspect(`Mechanism node ${stage+1}`);await shot(`mechanism-node-${stage+1}`);}
 await ev('window.__threeCellDebug.STATE.viewLocked=true');const locked=await ev('window.__classroomDebug.state.focusAnimation');
 await ev('window.__classroomDebug.focus(true)');check(locked===await ev('window.__classroomDebug.state.focusAnimation'),'View lock still blocks node focus');await ev('window.__threeCellDebug.STATE.viewLocked=false');
 await ev('window.__threeCellDebug.transitionToStep(2);document.getElementById("diagram-toggle").click()');await sleep(1100);await inspect('Third step with diagram');await shot('step-3-diagram');
 await ev('document.getElementById("diagram-close").click();window.__threeCellDebug.transitionToStep(0)');await sleep(850);
 const restored=await measure();check(restored.sun.visible&&restored.sun.labelVisible&&restored.sun.arrowsVisible&&restored.sunDisplay!=='none','First step restores solar teaching scene');await shot('step-1-restored');
 await ev('window.__threeCellDebug.transitionToStep(1);window.__threeCellDebug.setView("top");window.__threeCellDebug.transitionToStep(2)');await sleep(1000);await inspect('Rapid step/view changes do not restore stale camera focus');
 check(report.errors.length===0,'No uncaught browser exceptions',report.errors);
}catch(e){report.errors.push(String(e));check(false,'Verification execution',String(e));}
finally{report.passed=report.checks.every(c=>c.ok)&&report.errors.length===0;await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));if(ws)ws.close();chrome.kill();}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,failed:report.checks.filter(c=>!c.ok).map(c=>c.name),out}));
if(!report.passed)process.exitCode=1;
