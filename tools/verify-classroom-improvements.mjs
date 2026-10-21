import { tmpProfile } from './lib/tmp-profile.mjs';
// Browser verification for classroom route, true particle alpha, power saving and hidden rendering.
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
const out=resolve(process.argv[2]||'artifacts/classroom-improvements-20261010');await mkdir(out,{recursive:true});
const report={checks:[],errors:[],screenshots:[],buildSha256:createHash('sha256').update(await readFile('气压带与风带3D交互式教学平台.html')).digest('hex')};
const port=23000+process.pid%1000,chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,`--user-data-dir=${tmpProfile()}`,'about:blank'],{stdio:'ignore',windowsHide:true});let ws;
const check=(ok,name,evidence)=>{report.checks.push({ok,name,evidence});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
try{
 let tab;for(let i=0;i<80;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'});if(r.ok){tab=await r.json();break;}}catch{}await sleep(100);}if(!tab)throw Error('Chrome startup timeout');
 ws=new WebSocket(tab.webSocketDebuggerUrl);let id=0;const pending=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);});await new Promise(r=>ws.addEventListener('open',r));
 const send=(method,params={})=>new Promise((resolve,reject)=>{const k=++id;pending.set(k,{resolve,reject});ws.send(JSON.stringify({id:k,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const ready=async expression=>{for(let i=0;i<100;i++){if(await ev(expression))return true;await sleep(100);}return false;};
 const viewport=async(w,h)=>{await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:false});await sleep(250);};
 const click=async s=>{await ev(`(()=>{let p=document.querySelector(${JSON.stringify(s)})?.parentElement;while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement;}})()`);await ev(`document.querySelector(${JSON.stringify(s)}).scrollIntoView({block:'nearest',inline:'nearest'})`);await sleep(60);const p=await ev(`(()=>{const e=document.querySelector(${JSON.stringify(s)}),r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),disabled:e.disabled}})()`);if(!p.hit||p.disabled)throw Error('Control unavailable: '+s+' '+JSON.stringify(p));await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:p.x,y:p.y});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:p.x,y:p.y});await sleep(80);};
 const select=(id,value)=>ev(`(()=>{const e=document.getElementById(${JSON.stringify(id)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(out,name+'.png'),Buffer.from(r.data,'base64'));report.screenshots.push(name+'.png');};
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await viewport(1600,1000);
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__auditDraws=0;for(const p of [WebGLRenderingContext.prototype,WebGL2RenderingContext.prototype])for(const name of ['drawArrays','drawElements']){const original=p[name];p[name]=function(...args){window.__auditDraws++;return original.apply(this,args);};}window.__auditCanvasDraws=0;const original=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...args){window.__auditCanvasDraws++;return original.apply(this,args);};`});
 await send('Page.navigate',{url:pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=landsea'});
 check(await ready('window.__landSeaDebug&&window.__threeCellDebug.STATE.step===3&&document.getElementById("landsea-formation-next")&&document.getElementById("loading-screen").classList.contains("hidden")'),'Offline platform loads');
 await ev('window.__threeCellDebug.STATE.speed=20');
 for(let i=0;i<3;i++){await click('#landsea-formation-next');check(await ready('!window.__threeCellDebug.STATE.playing'),'Automatic pause at node '+i);}
 const alpha=await ev(`(()=>{const m=window.__landSeaDebug.group.getObjectByName('landsea-mechanism-field'),p=m.children[2],t=m.children[3],a=p.geometry.attributes.particleAlpha;return{node:window.__landSeaDebug.formation.node,hidden:[...p.geometry.index.array].filter(i=>i<160).every(i=>a.getX(i)===0),active:[...p.geometry.index.array].filter(i=>i>=160).every(i=>a.getX(i)===1),fade:t.geometry.attributes.particleAlpha.getX(196*18)>t.geometry.attributes.particleAlpha.getX(196*18+16),shader:p.material.onBeforeCompile.toString().includes('diffuseColor.a *= vParticleAlpha')}})()`);
 check(alpha.node===2&&alpha.hidden&&alpha.active&&alpha.fade&&alpha.shader,'Dormant particles truly transparent; trails fade via alpha',alpha);await shot('column-no-black-particles');
 const normal=await ev('window.__landSeaDebug.mechanism()');await click('#perf-toggle');await sleep(100);const low=await ev('window.__landSeaDebug.mechanism()');
 check(low.activeParticleCount<normal.activeParticleCount*.45&&low.pointDrawCount===low.activeParticleCount&&low.trailDrawCount===low.activeParticleCount*18,'Power saving reduces particle updates and both draw counts',{normal:normal.activeParticleCount,low:low.activeParticleCount});
 await select('density-select','sparse');await sleep(80);const sparse=await ev('window.__landSeaDebug.mechanism().activeParticleCount');check(sparse<low.activeParticleCount,'Density combines with power saving');await click('#perf-toggle');await select('density-select','medium');
 await ev('window.__threeCellDebug.STATE.playing=false');await sleep(150);const frozen=await ev('JSON.stringify(window.__landSeaDebug.mechanism())');await sleep(250);check(frozen===await ev('JSON.stringify(window.__landSeaDebug.mechanism())'),'Paused field diagnostics freeze');
 await click('#landsea-next');await sleep(200);const draws=await ev('({gl:window.__auditDraws,canvas:window.__auditCanvasDraws})');await sleep(350);const later=await ev('({gl:window.__auditDraws,canvas:window.__auditCanvasDraws})');check(draws.gl===later.gl&&draws.canvas===later.canvas,'Paused fifth step performs no hidden WebGL or repeated Canvas drawing',{draws,later});
 await click('#climate-formation-next');await sleep(150);check(await ev('window.__monsoonClimateDebug.formation.progress>0'),'Fifth step continues to animate');
 await click('#classroom-start');check(await ev('window.__classroomDebug.state.active&&window.__threeCellDebug.STATE.step===0&&!window.__threeCellDebug.STATE.playing'),'Classroom route starts with prediction and paused single cell');await shot('route-single');
 await click('#classroom-next');check(await ev('window.__threeCellDebug.STATE.step===1'),'Route enters three-cell reasoning');await ev('window.__threeCellDebug.setMechanismStage(1)');await sleep(900);const focus=await ev('({y:window.__threeCellDebug.cameraTarget?.y,animation:window.__classroomDebug.state.focusAnimation})');check(await ev('document.getElementById("teaching-auto-focus").checked'),'Automatic focus enabled');await shot('route-30-focus');
 await click('#teaching-auto-focus');await sleep(900);const n=await ev('window.__classroomDebug.state.focusAnimation');await click('#mechanism-demo-replay');await sleep(100);check(await ev('window.__classroomDebug.state.focusAnimation')===n,'Disabling focus preserves manual view on replay');
 await click('#teaching-focus-now');check(await ev('window.__classroomDebug.state.focusAnimation')>n,'Manual node focus remains available');
 await click('#classroom-next');check(await ev('window.__lessonDebug.state.open&&window.__lessonDebug.state.tab==="season"'),'Route opens seasonal comparison');await shot('route-season');
 await click('#classroom-lesson-next');check(await ev('!window.__lessonDebug.state.open&&window.__threeCellDebug.STATE.step===3'),'Route continues from classroom topic to globe');
 check(await ev('document.getElementById("step-node-dock").contains(document.getElementById("landsea-formation-next"))'),'Land-sea node controls use fixed area');await shot('route-landsea');
 await click('#classroom-next');check(await ev('window.__threeCellDebug.STATE.step===4'),'Route enters climate mechanisms');await shot('route-climate');
 await click('#classroom-next');check(await ev('window.__lessonDebug.state.tab==="section"&&document.getElementById("teaching-section-mode").value==="blank"'),'Drawing task opens blank without revealing answers');await shot('route-drawing');
 await click('#classroom-lesson-next');check(await ev('window.__lessonDebug.state.tab==="quiz"&&document.getElementById("teaching-quiz-level").value==="transfer"'),'Route finishes with transfer tasks');await shot('route-transfer');
 for(const [w,h] of [[1366,768],[760,800],[390,844]]){
  await viewport(w,h);await ev('window.__classroomDebug.go(3)');await click('#landsea-formation-next');check(await ready('!window.__threeCellDebug.STATE.playing'),w+' land-sea node is clickable and pauses');await shot(w+'-route-landsea');
  await click('#classroom-next');await click('#climate-formation-next');check(await ready('!window.__threeCellDebug.STATE.playing'),w+' climate node is clickable and pauses');await shot(w+'-route-climate');
  await click('#classroom-next');await click('#classroom-lesson-next');check(await ev('window.__lessonDebug.state.tab==="quiz"'),w+' route navigation works inside topic');await shot(w+'-route-transfer');
 }
 await click('#classroom-lesson-exit');check(await ev('!window.__classroomDebug.state.active&&document.getElementById("classroom-lesson-route").hidden'),'Route exits without clearing student answers');
 await ev('document.getElementById("lesson-close").click();window.__classroomDebug.go(1)');await viewport(1366,768);await click('#projection-toggle');await shot('projection-focus');
 await ev('window.__threeCellDebug.STATE.viewLocked=true');const before=await ev('window.__classroomDebug.state.focusAnimation');await ev('window.__classroomDebug.focus(true)');check(await ev('window.__classroomDebug.state.focusAnimation')===before,'Teacher view lock blocks automatic focus');
 check(report.errors.length===0,'No uncaught browser exceptions',report.errors);
}catch(e){report.errors.push(String(e));check(false,'Browser verification execution',String(e));}finally{report.passed=report.errors.length===0&&report.checks.every(x=>x.ok);await writeFile(join(out,'check.json'),JSON.stringify(report,null,2));ws?.close();chrome.kill();}
console.log(`Classroom improvements: ${report.checks.filter(x=>x.ok).length}/${report.checks.length}`);process.exitCode=report.passed?0:1;
