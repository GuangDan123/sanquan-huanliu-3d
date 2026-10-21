import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const out=resolve('artifacts/single-polar-20261016');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const check=(ok,name)=>{checks.push({ok,name});console.log(`${ok?'PASS':'FAIL'} ${name}`);assert(ok,name);};
const seek=async t=>{await page.evaluate(t=>window.__singleCirculationDebug.seek(t),t);await page.waitForTimeout(140);};
const snapshot=()=>page.evaluate(()=>{const m=window.__singleCirculationDebug.model;return JSON.stringify({clouds:m.polarAccumulations.map(c=>Array.from(c.particles.geometry.attributes.position.array)),arrows:m.descentColumns.map(c=>c.arrows.map(a=>a.helper.position.toArray())),particles:m.descentColumns.map(c=>Array.from(c.particles.geometry.attributes.position.array)),parcels:m.descentColumns.map(c=>c.parcels.map(s=>s.position.toArray()))});});
try{
  await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=guided');
  await page.waitForFunction(()=>window.__singleCirculationDebug);await page.waitForTimeout(2200);
  await page.evaluate(()=>document.getElementById('teaching-intro-play')?.click());await seek(5.2);
  check(await page.evaluate(()=>{const m=window.__singleCirculationDebug.model;return m.polarAccumulations.every(c=>!c.group.visible)&&m.descentColumns.every(c=>!c.group.visible);}), 'Polar effects wait for the arriving upper flow');
  await seek(8.4);await page.screenshot({path:join(out,'1366-buildup.png')});
  check(await page.evaluate(()=>{const m=window.__singleCirculationDebug.model;return m.polarAccumulations.every(c=>c.group.visible&&c.particles.geometry.drawRange.count>=70)&&m.descentColumns.every(c=>!c.group.visible);}), 'Both air masses accumulate before descent begins');
  await seek(10);await page.screenshot({path:join(out,'1366-descent.png')});
  check(await page.evaluate(()=>{const m=window.__singleCirculationDebug.model;return m.descentColumns.length===6&&m.descentColumns.every(c=>c.group.visible&&c.arrows.some(a=>a.helper.visible)&&c.particles.geometry.drawRange.count>0&&[.1,.3,.6,.8].every(t=>c.curve.getTangent(t).dot(c.curve.getPoint(t).normalize())<0));}), 'All six columns carry arrows and particles toward Earth');
  await seek(16);
  check(await page.evaluate(()=>{const m=window.__singleCirculationDebug.model;return m.flows.filter(f=>f.kind==='sink').every(f=>f.curve.getPoint(0).length()>6.4&&f.curve.getPoint(1).length()<5.15&&f.curve.getPoints(100).every(p=>p.length()>=5.119&&p.length()<=6.451))&&m.loops.every(l=>l.flows.every((f,i)=>f.curve.getPoint(1).distanceTo(l.flows[(i+1)%4].curve.getPoint(0))<1e-6&&f.curve.getTangent(1).dot(l.flows[(i+1)%4].curve.getTangent(0))>.995));}), 'Polar air starts aloft and descends to the surface in smooth closed loops');
  const paused=await snapshot();await page.waitForTimeout(250);check(paused===await snapshot(),'Pause freezes polar air masses, arrows and particles');
  await page.locator('#single-demo-play').click();await page.waitForTimeout(300);check(paused!==await snapshot(),'Continue animates the polar effects');await page.locator('#single-demo-play').click();
  await page.locator('#tog-paths').click();await page.waitForTimeout(140);
  check(await page.evaluate(()=>window.__singleCirculationDebug.model.descentColumns.every(c=>!c.beam.visible&&c.arrows.every(a=>!a.helper.visible))),'Path switch hides columns and arrows');await page.locator('#tog-paths').click();
  await page.locator('#tog-particles').click();await page.waitForTimeout(140);
  check(await page.evaluate(()=>{const m=window.__singleCirculationDebug.model;return m.polarAccumulations.every(c=>!c.group.visible)&&m.descentColumns.every(c=>!c.particles.visible);}), 'Particle switch hides polar clouds and descending particles');await page.locator('#tog-particles').click();
  await seek(10);const fixed=await snapshot();await seek(16);await seek(10);check(fixed===await snapshot(),'Seeking reproduces polar motion deterministically');
  for(const [width,height] of [[1366,900],[390,844]]){
    await page.setViewportSize({width,height});await seek(10);await page.waitForTimeout(400);await page.screenshot({path:join(out,`${width}-focus.png`)});
    const framing=await page.evaluate(()=>{const m=window.__singleCirculationDebug.model,d=window.__threeCellDebug,cloud=m.polarAccumulations[0],flow=m.flows.find(f=>f.h===1&&f.kind==='sink');const project=p=>{const v=m.root.localToWorld(p.clone()).project(d.camera);return{x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};};const a=project(flow.curve.getPoint(0)),b=project(flow.curve.getPoint(1)),c=project(cloud.center.clone().addScaledVector(cloud.across,-.85)),e=project(cloud.center.clone().addScaledVector(cloud.across,.85));return{active:m.cameraActive,column:Math.hypot(a.x-b.x,a.y-b.y),cloud:Math.hypot(c.x-e.x,c.y-e.y)};});
    console.log('Focus framing',width,framing);check(framing.active&&framing.column>45&&framing.cloud>60,`${width} focused air mass and descent are visibly separated`);
    await seek(16);await page.waitForTimeout(400);await page.screenshot({path:join(out,`${width}-complete.png`)});
    const buffer=await page.locator('#scene-container canvas').screenshot();
    const pixels=await page.evaluate(async src=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;let blue=0;for(let i=0;i<data.length;i+=4)if(data[i+2]>70&&data[i+2]>data[i]*1.2)blue++;return blue;},'data:image/png;base64,'+buffer.toString('base64'));
    check(pixels>1000,`${width} canvas contains rendered blue pixels`);
  }
  await page.evaluate(()=>window.__threeCellDebug.transitionToStep(2));await page.waitForTimeout(450);
  check(await page.evaluate(()=>!window.__singleCirculationDebug.model.root.visible),'Leaving the single-cell lesson hides its polar effects');
  check(errors.length===0,'No browser or shader errors');
}finally{await writeFile(join(out,'checks.json'),JSON.stringify({checks,errors},null,2));await browser.close();}
