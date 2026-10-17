import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const out=resolve('artifacts/localized-single-twist-20261016');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:900}}),checks=[],errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const check=(ok,name)=>{checks.push({ok,name});console.log(`${ok?'PASS':'FAIL'} ${name}`);assert(ok,name);};
const seek=async t=>{await page.evaluate(t=>window.__circulationSequenceDebug.seek(t),t);await page.waitForTimeout(180);};
const snapshot=()=>page.evaluate(()=>{const m=window.__singleCirculationDebug.model,d=window.__threeCellDebug,s=window.__circulationSequenceDebug.sequence;return JSON.stringify({earth:d.earthGroup.rotation.y,flows:m.flows.map(f=>Array.from(f.ribbon.geometry.attributes.position.array)),arrows:m.loops.map(l=>l.arrows.map(a=>a.helper.position.toArray())),equator:Array.from(s.equatorAir.particles.geometry.attributes.position.array),columns:s.ascentColumns.map(c=>c.arrows.map(a=>a.helper.position.toArray()))});});
const retainedEquator=()=>page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,m=window.__singleCirculationDebug.model;return s.equatorAir.group.visible&&s.equatorAir.particles.geometry.drawRange.count===144&&s.equatorAir.particles.material.opacity===.28&&Math.abs(s.equatorAir.center.length()-6.53)<1e-6&&s.ascentColumns.every(c=>c.group.visible&&c.beam.geometry.drawRange.count===4800&&c.arrows.some(a=>a.helper.visible)&&c.curve.getTangent(.5).dot(c.curve.getPoint(.5).normalize())>0)&&!m.equatorAir.group.visible&&m.columns.every(c=>!c.group.visible);});
const checkCanvas=async width=>{
  const buffer=await page.locator('#scene-container canvas').screenshot();
  const pixels=await page.evaluate(async src=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;let globe=0,line=0;for(let i=0;i<data.length;i+=4){if(data[i+2]>70&&data[i+2]>data[i]*1.2)globe++;if(data[i]>160&&data[i+1]>140&&data[i+2]<130)line++;}return {globe,line};},'data:image/png;base64,'+buffer.toString('base64'));
  check(pixels.globe>1000&&pixels.line>20,`${width} canvas renders both the globe and the retained airflow`);
};
try{
  await page.goto(pathToFileURL(resolve('三圈环流3D交互式教学平台.html')).href+'?state=explore');
  await page.waitForFunction(()=>window.__singleCirculationDebug&&window.__circulationSequenceDebug);await page.waitForTimeout(2200);
  await page.evaluate(()=>{document.getElementById('teaching-intro-play')?.click();window.__circulationSequenceDebug.cameraMode('overview');});await seek(0);
  await page.evaluate(()=>window.__twistOriginalMeshes=window.__singleCirculationDebug.model.flows.map(f=>f.ribbon));
  check(await page.evaluate(()=>{const m=window.__singleCirculationDebug.model;return m.flows.every(f=>f.curve.getPoints(20).every((p,i)=>p.distanceTo((f.retainedCurve||f.sourceCurve).getPoint(i/20))<1e-6))&&m.obsoleteUppers.every(tail=>{const f=m.flows.find(f=>f.h===tail.h&&f.index===1);return f.curve.getPoint(1).distanceTo(tail.curve.getPoint(0))<1e-6&&tail.ribbon.geometry.drawRange.start===0&&tail.group.visible;});}), 'Frame zero divides the same original route without changing its shape');
  for(const time of [0,.15,1,3,6,9,11.999]){
    await seek(time);
    check(await retainedEquator(),`At ${time}s the completed equatorial air mass and upward columns remain visible once`);
    check(await page.evaluate(()=>{const m=window.__singleCirculationDebug.model,s=window.__circulationSequenceDebug.sequence;return m.root.visible&&m.flows.every((f,i)=>f.ribbon===window.__twistOriginalMeshes[i])&&m.flows.filter(f=>f.index<2).every(f=>f.group.visible&&f.ribbon.geometry.drawRange.count===4800&&f.ribbon.material.uniforms.uOpacity.value>.23)&&s.flows.filter(f=>s.cells.hadley.includes(f.kind)).every(f=>!f.group.visible)&&s.arrowLoops.filter(l=>l.cell==='hadley').every(l=>l.arrows.every(a=>!a.helper.visible));}), `At ${time}s only the original fully drawn ascent and upper meshes are visible`);
    if(time>0)check(await page.evaluate(()=>window.__singleCirculationDebug.model.flows.filter(f=>f.index===1).every(f=>f.curve.getPoint(.5).z<-1e-8)), `At ${time}s the existing upper lines have begun twisting eastward`);
    check(await page.evaluate(()=>{const m=window.__singleCirculationDebug.model;return m.loops.every(l=>l.flows[0].curve.getPoint(1).distanceTo(l.flows[1].curve.getPoint(0))<1e-6)&&m.flows.every(f=>f.curve.getPoints(40).every(p=>p.length()>5.1&&p.length()<6.81));}), `At ${time}s the retained ascent and upper line stay joined and outside Earth`);
    check(await page.evaluate(()=>window.__singleCirculationDebug.model.flows.filter(f=>f.index<2).every(f=>f.ribbon.geometry.attributes.center.version>0)), `At ${time}s the glow center is uploaded with the moving line`);
    check(await page.evaluate(()=>{const m=window.__singleCirculationDebug.model;return [...m.flows.filter(f=>f.index>1),...m.obsoleteUppers].every(f=>f.curve===f.sourceCurve);}), `At ${time}s the obsolete polar paths stay in place instead of contracting`);
    if(time>0&&time<7)check(await page.evaluate(()=>{const m=window.__singleCirculationDebug.model;return m.obsoleteUppers.every(tail=>{const original=m.flows.find(f=>f.index===1&&f.h===tail.h);return tail.ribbon.geometry.drawRange.start>0&&tail.transitionOpacity<1&&tail.transitionOpacity>0&&original.curve.getPoint(1).distanceTo(tail.curve.getPoint(tail.ribbon.geometry.drawRange.start/4800))>.01;});}), `At ${time}s the high-altitude break opens while the obsolete branch fades`);
    if(time>=7)check(await page.evaluate(()=>{const m=window.__singleCirculationDebug.model;return [...m.obsoleteUppers,...m.flows.filter(f=>f.index>1)].every(f=>!f.group.visible);}), `At ${time}s the obsolete poleward, descending and return branches are gone`);
    if([0,.15,1,3,6,11.999].includes(time))await page.screenshot({path:join(out,`1366-${time}.png`)});
  }
  await seek(6);
  check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,m=window.__singleCirculationDebug.model,f=m.flows.find(f=>f.h===1&&f.index===1);return s.parcel.position.distanceTo(f.curve.getPoint(.25))<1e-6&&s.root.quaternion.angleTo(m.root.quaternion)<1e-6;}), 'The air parcel and coordinate frame follow the actual deformed line');
  const paused=await snapshot();await page.waitForTimeout(250);check(paused===await snapshot(),'Pause freezes both deformation and airflow arrows');
  await checkCanvas(1366);
  check(await page.evaluate(()=>!window.__circulationSequenceDebug.sequence.reference.visible),'No dashed obsolete polar route remains behind the fading line');
  await page.evaluate(()=>document.getElementById('mechanism-demo-play').click());await page.waitForTimeout(300);check(paused!==await snapshot(),'Play moves Earth and directly deforms the original line');await seek(6);
  const fixed=await snapshot();await seek(9);await seek(6);check(fixed===await snapshot(),'Scrubbing back restores the same line deformation');
  await seek(11.999);
  const matching=await page.evaluate(()=>{const m=window.__singleCirculationDebug.model,s=window.__circulationSequenceDebug.sequence;return Math.max(...m.flows.filter(f=>f.index<2).flatMap(f=>{const target=s.flows.find(g=>g.h===f.h&&g.kind===(f.index===0?'equator-rise':'upper'));return f.curve.getPoints(30).map((p,i)=>p.distanceTo(target.curve.getPoint(i/30)));}));});
  check(matching<1e-5,'The original line reaches exactly the continuation geometry before ownership changes');
  await seek(12);
  check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,m=window.__singleCirculationDebug.model;return !m.root.visible&&s.flows.filter(f=>['equator-rise','upper'].includes(f.kind)).every(f=>f.group.visible&&f.ribbon.geometry.drawRange.count===4800)&&s.flows.filter(f=>['sink','trade'].includes(f.kind)).every(f=>!f.group.visible);}), 'At 12s the continuation takes over without restarting ascent or early descent');
  check(await page.evaluate(()=>window.__threeCellDebug.earthGroup.userData.sequenceAtmosphere.every(m=>!m.visible))&&await retainedEquator(), 'The handoff retains the completed air mass and columns without a second atmosphere');
  await page.screenshot({path:join(out,'1366-12.png')});
  for(const time of [17,23,33,40]){
    await seek(time);check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,e=window.__circulationSequenceDebug.elapsed();return s.flows.filter(f=>s.cells.hadley.includes(f.kind)&&e>f.start).every(f=>f.group.visible);}), `The later formation continues at ${time}s`);
    check(await retainedEquator(),`At ${time}s equatorial air and upward columns still connect the two hemispheres`);
  }
  check(await page.evaluate(()=>window.__circulationSequenceDebug.sequence.flows.every(f=>f.group.visible&&f.ribbon.material.uniforms.uOpacity.value===.85)), 'The completed three-cell scene retains its original line brightness');
  await page.setViewportSize({width:390,height:844});await seek(6);await page.waitForTimeout(350);await page.screenshot({path:join(out,'390-6.png')});
  await checkCanvas(390);
  check(await retainedEquator(),'Mobile keeps the equatorial air mass and upward columns');
  check(await page.evaluate(()=>window.__singleCirculationDebug.model.flows.filter(f=>f.index<2).every(f=>f.group.visible)&&!window.__circulationSequenceDebug.sequence.flows.find(f=>f.kind==='upper').group.visible),'Mobile also shows a single inherited route');
  await page.evaluate(()=>document.getElementById('tog-paths').click());await page.waitForTimeout(120);
  check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return s.equatorAir.group.visible&&s.ascentColumns.every(c=>!c.group.visible);}), 'Path switch hides the light columns while keeping the air mass');
  await page.evaluate(()=>{document.getElementById('tog-paths').click();document.getElementById('tog-particles').click();});await page.waitForTimeout(120);
  check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return !s.equatorAir.group.visible&&s.ascentColumns.every(c=>c.group.visible);}), 'Particle switch hides the air mass while keeping the light columns');
  await page.evaluate(()=>document.getElementById('tog-particles').click());await page.waitForTimeout(120);
  check(await retainedEquator(),'Restoring the switches restores both equatorial effects');
  await page.evaluate(()=>window.__threeCellDebug.transitionToStep(2));await page.waitForTimeout(500);
  check(await page.evaluate(()=>window.__threeCellDebug.earthGroup.userData.sequenceAtmosphere.every(m=>m.visible)), 'Step three restores its own atmosphere');
  await page.evaluate(()=>window.__threeCellDebug.transitionToStep(0));await page.waitForTimeout(600);await page.evaluate(()=>{document.getElementById('teaching-intro-play')?.click();window.__singleCirculationDebug.seek(16);});await page.waitForTimeout(200);
  check(await page.evaluate(()=>{const m=window.__singleCirculationDebug.model;return !m.morphing&&m.flows.every(f=>f.curve===f.sourceCurve)&&m.polarAccumulations.every(c=>c.group.visible);}), 'Returning to step one restores the ideal loops and polar effects');
  check(errors.length===0,'No browser or shader errors');
}finally{await writeFile(join(out,'checks.json'),JSON.stringify({checks,errors},null,2));await browser.close();}
