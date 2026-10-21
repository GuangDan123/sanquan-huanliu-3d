import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const out=resolve(process.argv[2]||'artifacts/pressure-waves-20261013/effect');await mkdir(out,{recursive:true});
const report={checks:[],errors:[]},check=(ok,name,data)=>{report.checks.push({ok,name,data});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
const seek=async time=>{await page.evaluate(t=>window.__circulationSequenceDebug.seek(t),time);await page.waitForTimeout(200);};
const state=()=>page.evaluate(()=>JSON.stringify(window.__circulationSequenceDebug.sequence.pressureWaves.map(w=>({r:w.mesh.material.uniforms.uRadii.value,a:w.mesh.material.uniforms.uAlpha.value}))));
try{
 await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=explore');await page.waitForFunction(()=>window.__circulationSequenceDebug&&document.getElementById('loading-screen').classList.contains('hidden'));
 await seek(19);
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return s.pressureWaves.length===3&&s.pressureWaves.every(w=>{const columns=w.high?s.descentColumns.filter(c=>Math.sign(c.h)===Math.sign(w.lat)):s.ascentColumns;return columns.every(c=>w.center.distanceTo(c.curve.getPoint(w.high?1:0))<.1)&&Math.abs(w.center.length()-5.16)<1e-6&&Array.from({length:w.mesh.geometry.attributes.position.count},(_,i)=>{const p=w.mesh.geometry.attributes.position;return Math.hypot(p.getX(i),p.getY(i),p.getZ(i));}).every(r=>r>5.15&&r<5.17)&&w.mesh.material.transparent&&!w.mesh.material.depthWrite;});}), 'Spherical wave patches sit directly beneath the descent columns and at the equatorial ascent base');
 check(await page.evaluate(()=>window.__circulationSequenceDebug.sequence.pressureWaves.every(w=>w.mesh.material.uniforms.uColor.value.getHex()===(w.high?0x72d44a:0xffd447)&&w.word.textContent===(w.high?'高压':'低压'))), 'Outward high-pressure waves use green and inward low-pressure waves use yellow with clear words');
 for(const time of [0,2,16,18,40]){
  await seek(time);check(await page.evaluate(t=>window.__circulationSequenceDebug.sequence.pressureWaves.every(w=>w.mesh.visible===(t>(w.high?17:.5))),time), `Wave effects appear with their respective vertical motion at ${time}s`);
 }
 for(const [time,high] of [[2,false],[18,true]]){
  await seek(time);const before=await page.evaluate(h=>window.__circulationSequenceDebug.sequence.pressureWaves.filter(w=>w.high===h).map(w=>w.mesh.material.uniforms.uRadii.value.slice()),high);
  await seek(time+.05);check(await page.evaluate(a=>window.__circulationSequenceDebug.sequence.pressureWaves.filter(w=>w.high===a.high).every((w,j)=>w.mesh.material.uniforms.uRadii.value.every((r,i)=>a.high?r>a.before[j][i]:r<a.before[j][i])),{high,before}), high?'High-pressure rings expand from inside to outside':'Low-pressure rings contract from outside to inside');
 }
 await seek(18.5);const frozen=await state();await page.waitForTimeout(250);check(await state()===frozen,'Pausing freezes every wave radius and its formation opacity');
 await page.click('#mechanism-demo-play');await page.waitForTimeout(300);check(await state()!==frozen,'Playing advances the ring animation');await page.click('#mechanism-reveal');const explained=await state();await page.waitForTimeout(250);check(await state()===explained,'Pause-and-explain freezes waves together with the arrows');await page.click('#sequence-close');
 await seek(40);const complete=await state();await page.waitForTimeout(300);check(await state()!==complete,'Wave rings keep moving after circulation formation ends');await page.click('#mechanism-reveal');const completeFrozen=await state();await page.waitForTimeout(250);check(await state()===completeFrozen,'Pause after completion also freezes the rings');await page.click('#sequence-close');
 await page.evaluate(()=>window.__threeCellDebug.STATE.showPressure=false);await page.waitForTimeout(100);check(await page.evaluate(()=>window.__circulationSequenceDebug.sequence.pressureWaves.every(w=>!w.mesh.visible&&w.word.hidden)), 'The pressure layer switch hides all wave patches and pressure words');await page.evaluate(()=>window.__threeCellDebug.STATE.showPressure=true);
 for(const [width,height] of [[1366,768],[390,844]])for(const mode of ['ride','overview']){
  await page.setViewportSize({width,height});await page.evaluate(m=>window.__circulationSequenceDebug.cameraMode(m),mode);
  for(const time of [3.5,18.5,40]){
   await seek(time);await page.screenshot({path:join(out,`${width}-${mode}-${time}.png`)});
   const words=await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,f=window.__threeCellDebug.getSceneFraming();return s.pressureWaves.filter(w=>!w.word.hidden).map(w=>{const r=w.word.getBoundingClientRect();return {text:w.word.textContent,inside:r.left>=f.left&&r.right<=f.left+f.availableW&&r.top>=100&&r.bottom<=f.top+f.availableH};});});
   check(words.every(w=>w.inside),`${width} ${mode} ${time}s: visible pressure words stay inside the usable scene`,words);
   if(mode==='ride'&&time!==40)check(words.some(w=>w.text===(time===3.5?'低压':'高压')),`${width} ${time}s: the active pressure word is visible near its wave patch`,words);
  }
 }
 check(report.errors.length===0,'No browser or shader errors',report.errors);
}catch(e){report.errors.push(String(e));console.error(e);}finally{await writeFile(join(out,'check.json'),JSON.stringify(report,null,2));await browser.close();}
process.exitCode=report.errors.length||report.checks.some(c=>!c.ok)?1:0;
