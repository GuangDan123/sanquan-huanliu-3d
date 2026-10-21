import { chromium } from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const out=resolve('artifacts/step3-clearance-20261018');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}}),checks=[],errors=[];
page.on('pageerror',error=>errors.push(error.message));
const check=(name,ok,evidence)=>checks.push({name,ok:!!ok,evidence});
async function measure(){
  return page.evaluate(()=>{
    const d=window.__threeCellDebug,s=window.__threeStepSchematicDebug.schematic,camera=d.camera;
    const center=d.earthGroup.position.clone().project(camera),cx=(center.x+1)*innerWidth/2,cy=(1-center.y)*innerHeight/2;
    const distance=camera.position.distanceTo(d.earthGroup.position),focal=innerHeight/(2*Math.tan(camera.fov*Math.PI/360))*camera.zoom;
    const earthRadius=focal*(d.earthRadius*1.005)/Math.sqrt(distance**2-(d.earthRadius*1.005)**2);
    const outerRadius=focal*7.56/Math.sqrt(distance**2-7.56**2);
    const paths=s.flows.map(flow=>{
      let minGap=Infinity,maxScreenRadius=0,maxStep=0,minWorldRadius=Infinity,maxWorldRadius=0;
      const points=flow.curve.getPoints(1000);
      for(let i=0;i<points.length;i++){
        if(i)maxStep=Math.max(maxStep,points[i].distanceTo(points[i-1]));
        const world=s.root.localToWorld(points[i].clone()),worldRadius=world.distanceTo(d.earthGroup.position);
        minWorldRadius=Math.min(minWorldRadius,worldRadius);maxWorldRadius=Math.max(maxWorldRadius,worldRadius);
        const p=world.project(camera),x=(p.x+1)*innerWidth/2,y=(1-p.y)*innerHeight/2;
        const radius=Math.hypot(x-cx,y-cy);minGap=Math.min(minGap,radius-earthRadius);maxScreenRadius=Math.max(maxScreenRadius,radius);
      }
      const seam=(geometry,stride)=>{
        const a=geometry.attributes.position;
        return Math.max(...Array.from({length:stride},(_,j)=>Math.hypot(a.getX(j)-a.getX(a.count-stride+j),a.getY(j)-a.getY(a.count-stride+j),a.getZ(j)-a.getZ(a.count-stride+j))));
      };
      return {kind:flow.kind,hemisphere:flow.h,minGap,normalizedGap:(minWorldRadius-d.earthRadius)/d.earthRadius,minWorldRadius,maxWorldRadius,maxScreenRadius,outerRadius,maxStep,
        ribbonSeam:seam(flow.ribbon.geometry,9),tubeSeam:seam(flow.tubes[0].geometry,5)};
    });
    const all=[...d.latLabels,...d.pressureLabels,...d.windLabels].filter(l=>l.obj.visible).map(l=>{
      const r=l.obj.element.getBoundingClientRect();
      return {text:l.obj.element.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom,callout:l.obj.element.classList.contains('third-step-callout')};
    });
    const callouts=all.filter(l=>l.callout),overlaps=[];
    for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
      const a=all[i],b=all[j];
      if((a.callout||b.callout)&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)overlaps.push([a.text,b.text]);
    }
    return {paths,callouts,overlaps,earth:{cx,cy,radius:earthRadius},viewport:{width:innerWidth,height:innerHeight}};
  });
}
async function verifyView(name){
  const state=await measure();
  check(`${name}六条环流的空间路径不进入地表且不越出大气外缘`,state.paths.length===6&&state.paths.every(p=>p.minWorldRadius>5.3&&p.maxWorldRadius<7.3),state.paths);
  check(`${name}路径连续、闭合缝和流带接缝重合`,state.paths.every(p=>p.maxStep<.04&&p.ribbonSeam<1e-5&&p.tubeSeam<1e-5),state.paths);
  const {cx,cy,radius}=state.earth;
  check(`${name}极地标签不遮地球、不互相重叠且位于视口内`,!state.overlaps.length&&state.callouts.every(l=>
    l.left>=0&&l.right<=state.viewport.width&&l.top>=0&&l.bottom<=state.viewport.height&&
    Math.hypot(Math.max(l.left-cx,0,cx-l.right),Math.max(l.top-cy,0,cy-l.bottom))>radius),state);
  await page.screenshot({path:resolve(out,name+'.png')});
  return state;
}
try{
  await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=guided');
  await page.waitForFunction(()=>window.__threeCellDebug&&document.getElementById('loading-screen').classList.contains('hidden'));
  for(const step of [1,2]){await page.evaluate(step=>window.__threeCellDebug.transitionToStep(step),step);await page.waitForTimeout(1100);}
  await page.evaluate(()=>window.__threeCellDebug.hideTeachingIntro());
  const initial=await verifyView('desktop-default');
  const north=initial.paths.find(p=>p.kind==='schematic-hadley'&&p.hemisphere>0),south=initial.paths.find(p=>p.kind==='schematic-hadley'&&p.hemisphere<0);
  check('北半球低纬圈与球面的最小间距不小于南半球基准',north.normalizedGap>=south.normalizedGap-.01,{north,south});
  for(const [view,name] of [['front','desktop-front'],['side','desktop-side'],['top','desktop-north-pole']]){
    await page.evaluate(view=>window.__threeCellDebug.setView(view),view);await page.waitForTimeout(1050);await verifyView(name);
  }
  await page.evaluate(()=>{
    const d=window.__threeCellDebug,distance=d.camera.position.distanceTo(d.cameraTarget);
    d.camera.position.copy(d.cameraTarget).add(d.makeVector3(.001,-distance,.001));d.camera.lookAt(d.cameraTarget);
  });
  await page.waitForTimeout(500);await verifyView('desktop-south-pole');
  await page.evaluate(()=>window.__threeCellDebug.setView('reset'));await page.waitForTimeout(1050);await verifyView('desktop-oblique');
  await page.click('#season-shift-toggle');await page.waitForTimeout(1700);await verifyView('desktop-seasonal');await page.click('#season-shift-toggle');
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(600);await verifyView('mobile-oblique');
  await page.evaluate(()=>window.__threeCellDebug.setView('top'));await page.waitForTimeout(1050);await verifyView('mobile-north-pole');
  await page.setViewportSize({width:1366,height:768});
  await page.evaluate(()=>window.__threeCellDebug.transitionToStep(1));await page.waitForTimeout(1200);
  check('返回第二步后移除第三步标签偏移和引线',await page.evaluate(()=>document.querySelectorAll('.third-step-callout').length===0&&document.querySelector('#third-step-label-leaders').hidden));
  check('浏览器无运行时错误',errors.length===0,errors);
  await writeFile(resolve(out,'report.json'),JSON.stringify({checks,errors},null,2));
  console.log(JSON.stringify(checks.map(({name,ok})=>({name,ok})),null,2));
  if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await browser.close();}
