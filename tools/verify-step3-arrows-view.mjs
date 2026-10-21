import { chromium } from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const out=resolve('artifacts/step3-arrows-view-20261018');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}}),checks=[],errors=[];
page.on('pageerror',error=>errors.push(error.message));
const check=(name,ok,evidence)=>checks.push({name,ok:!!ok,evidence});
try{
  await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=guided');
  await page.waitForFunction(()=>window.__threeCellDebug&&document.getElementById('loading-screen').classList.contains('hidden'));
  for(const step of [1,2]){await page.evaluate(step=>window.__threeCellDebug.transitionToStep(step),step);await page.waitForTimeout(1100);}
  await page.evaluate(()=>window.__threeCellDebug.hideTeachingIntro());
  const arrows=await page.evaluate(()=>{
    const s=window.__threeStepSchematicDebug.schematic,phases=s.arrows.flatMap(entry=>entry.arrows.map(a=>a.phase));
    const paths=s.arrows.map(entry=>entry.flow.curve.getPoints(1600));
    const results=s.arrows.map(entry=>({kind:entry.flow.kind,hemisphere:entry.flow.h,maxDistance:0,tipDistance:0}));
    for(let step=0;step<120;step++){
      s.arrows.forEach(entry=>entry.arrows.forEach((a,i)=>a.phase=(step/120+i/3)%1));
      window.__thirdStepSchematic.update(0);
      s.arrows.forEach((entry,i)=>entry.arrows.forEach(a=>{
        const positions=a.mesh.geometry.attributes.position;
        for(let v=0;v<positions.count;v++){
          // Remove the drawing offset before checking the arrow against its path.
          const x=positions.getX(v),y=positions.getY(v),z=positions.getZ(v)-.035;let nearest=Infinity;
          for(const p of paths[i])nearest=Math.min(nearest,(x-p.x)**2+(y-p.y)**2+(z-p.z)**2);
          results[i].maxDistance=Math.max(results[i].maxDistance,Math.sqrt(nearest));
        }
        const tip=entry.flow.curve.getPointAt(a.phase),v=positions.count-1;
        results[i].tipDistance=Math.max(results[i].tipDistance,Math.hypot(positions.getX(v)-tip.x,positions.getY(v)-tip.y));
      }));
    }
    let i=0;s.arrows.forEach(entry=>entry.arrows.forEach(a=>a.phase=phases[i++]));window.__thirdStepSchematic.update(0);
    return results;
  });
  check('十二个箭头整周期贴合曲线，尖端不越出路径，宽度限制在流带内',arrows.length===6&&arrows.every(a=>a.maxDistance<.095&&a.tipDistance<1e-5),arrows);
  const geometry=await page.evaluate(()=>window.__threeStepSchematicDebug.schematic.flows.map(flow=>{
    const points=flow.curve.getPoints(1000),radii=points.map(p=>p.length());
    return {kind:flow.kind,hemisphere:flow.h,minRadius:Math.min(...radii),maxRadius:Math.max(...radii),closure:points[0].distanceTo(points.at(-1)),maxStep:Math.max(...points.slice(1).map((p,i)=>p.distanceTo(points[i])))};
  }));
  check('六圈处于地表与大气之间并保持连续闭合',geometry.every(p=>p.minRadius>5.3&&p.maxRadius<7.2&&p.closure<1e-8&&p.maxStep<.04),geometry);
  const views=[];
  for(const [view,name] of [['front','front'],['reset','oblique'],['side','side'],['top','north-pole']]){
    await page.evaluate(view=>window.__threeCellDebug.setView(view),view);await page.waitForTimeout(1050);
    views.push(await page.evaluate(name=>{
      const s=window.__threeStepSchematicDebug.schematic,d=window.__threeCellDebug;
      const axis=d.makeVector3(0,1,0).applyQuaternion(s.root.quaternion);
      const samples=s.flows.map(f=>s.root.localToWorld(f.curve.getPoint(.5)).project(d.camera).toArray());
      return {name,axis:axis.toArray(),scale:s.root.scale.toArray(),samples};
    },name));
    await page.screenshot({path:resolve(out,`${name}.png`)});
  }
  // Horizontal camera changes share the same facing meridian; tilting toward
  // the pole is what changes the section's projected latitude and depth.
  check('切换视角时环流保持地轴方向和真实尺寸，随地球产生透视变化',views.every(v=>Math.abs(v.axis[1]-1)<1e-8&&v.scale.every(n=>n===1))&&views[0].samples.some((p,i)=>Math.abs(p[1]-views.at(-1).samples[i][1])>.05),views);
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>window.__threeCellDebug.setView('reset'));await page.waitForTimeout(1100);
  await page.screenshot({path:resolve(out,'mobile-oblique.png')});
  check('浏览器无运行时错误',errors.length===0,errors);
  await writeFile(resolve(out,'report.json'),JSON.stringify({checks,errors},null,2));
  console.log(JSON.stringify(checks,null,2));
  if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await browser.close();}
