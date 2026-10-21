import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const out=resolve('artifacts/heating-focus-20261017');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[],samples=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=guided');
 await page.waitForFunction(()=>window.__singleCirculationDebug);await page.waitForTimeout(2300);
 await page.evaluate(()=>document.getElementById('teaching-intro-play').click());
 for(const width of [1366,390]){
  await page.setViewportSize({width,height:width===390?844:900});
  for(const time of [1.9,2.3,3,4,5.2]){
   await page.evaluate(t=>window.__singleCirculationDebug.seek(t),time);await page.waitForTimeout(250);
   const data=await page.evaluate(()=>{const m=window.__singleCirculationDebug.model,d=window.__threeCellDebug;return {heat:Object.values(m.heatZone).map(mesh=>({visible:mesh.visible,radius:mesh.geometry?.parameters?.radius,spread:mesh.material.uniforms?.uSpread.value})),labels:m.notes.filter(n=>!n.el.hidden&&!n.label.hidden).map(n=>({text:n.label.textContent,rect:n.label.getBoundingClientRect().toJSON()})),notes:m.notes.slice(0,1).map(n=>({placement:n.annotationPlacement,anchor:[n.el.style.left,n.el.style.top],hidden:n.el.hidden,labelHidden:n.label.hidden})),sun:d.getSunDiagnostics()};});
   assert(data.sun.arrowTargets.every(a=>Number.isFinite(a.clearancePixels)&&Math.abs(a.clearancePixels-12)<.1&&a.screenGap<.1),'Solar arrows stay 12 pixels from the atmosphere as the camera moves');
   assert(data.heat.every(h=>h.radius>6.7),'Heat follows the atmosphere outside Earth');
   assert(data.labels.filter(l=>l.text==='受热上升').length<=1,'Only one ascent caption');
   if(time===3||time===4){
    assert(data.labels.some(l=>l.text==='受热上升'),'A compact ascent caption remains visible');
    const clear=await page.evaluate(()=>{const m=window.__singleCirculationDebug.model,camera=window.__threeCellDebug.camera,rect=m.notes[0].label.getBoundingClientRect();const covered=p=>{const v=m.root.localToWorld(p.clone()).project(camera),x=(v.x+1)*innerWidth/2,y=(1-v.y)*innerHeight/2;return x>rect.left-6&&x<rect.right+6&&y>rect.top-6&&y<rect.bottom+6;};return m.flows.filter(f=>f.index===0).every(f=>Array.from({length:61},(_,i)=>f.curve.getPoint(i/60*f.progress)).every(p=>!covered(p)));});
    assert(clear,'Ascent caption leaves both airflow branches unobstructed');
   }
   samples.push({width,time,...data});await page.screenshot({path:join(out,`${width}-${time}.png`)});
  }
 }
 const spreads=samples.filter(s=>s.width===1366&&s.time<=2.3).map(s=>s.heat[0].spread);assert(spreads[1]>spreads[0],'Heat spreads outward as sunlight arrives');
 await writeFile(join(out,'checks.json'),JSON.stringify({errors,samples},null,2));console.log(`PASS ${samples.length} desktop/mobile frames: arrows aligned, curved heating spreads, compact captions clear of airflow`);
 if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
