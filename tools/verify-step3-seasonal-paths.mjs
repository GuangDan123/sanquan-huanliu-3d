import { chromium } from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const out=resolve('output/step3-seasonal-paths');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}}),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(name,ok,evidence)=>{checks.push({name,ok:!!ok,evidence});if(!ok)throw Error(name);};
async function phase(elapsed){
  await page.evaluate(elapsed=>new Promise(resolve=>{
    const state=window.__threeCellDebug.STATE;
    state.seasonalElapsed=elapsed;state.seasonalRunning=true;
    requestAnimationFrame(()=>resolve());
  }),elapsed);
  await page.click('#season-shift-toggle');
  await page.waitForTimeout(100);
}
async function measure(){
  return page.evaluate(()=>{
    const d=window.__threeCellDebug,s=window.__threeStepSchematicDebug.schematic,shift=d.STATE.seasonalShift;
    const latitude=p=>Math.asin(Math.max(-1,Math.min(1,p.y/p.length())))*180/Math.PI;
    // Independent piecewise expectation: nonpolar anchors migrate equally,
    // whereas each polar interval spans its moving 60° edge and a fixed pole.
    const expected=lat=>lat>=60?lat+shift*(90-lat)/30:lat<=-60?lat+shift*(90+lat)/30:lat+shift;
    const transform=p=>{
      const lat=expected(latitude(p))*Math.PI/180,r=p.length(),lon=Math.atan2(p.z,p.x);
      return d.makeVector3(r*Math.cos(lat)*Math.cos(lon),r*Math.sin(lat),r*Math.cos(lat)*Math.sin(lon));
    };
    const flows=s.flows.map(f=>{
      const points=f.curve.getPoints(200),lats=points.map(latitude);
      let pathError=0,ribbonError=0,maxShell=0;
      points.forEach((p,i)=>{
        pathError=Math.max(pathError,p.distanceTo(transform(f.baseCurve.getPoint(i/200))));
        maxShell=Math.max(maxShell,(p.x*p.x+p.z*p.z)/(7*1.06)**2+p.y*p.y/49);
      });
      const center=f.ribbon.geometry.attributes.center;
      for(let i=0;i<=100;i++)ribbonError=Math.max(ribbonError,d.makeVector3(center.getX(i*9),center.getY(i*9),center.getZ(i*9)).distanceTo(f.curve.getPoint(i/100)));
      const centerSeam=d.makeVector3(center.getX(0),center.getY(0),center.getZ(0)).distanceTo(d.makeVector3(center.getX(center.count-1),center.getY(center.count-1),center.getZ(center.count-1)));
      return {kind:f.kind,h:f.h,pathError,ribbonError,centerSeam,maxShell,minRadius:Math.min(...points.map(p=>p.length())),minLat:Math.min(...lats),maxLat:Math.max(...lats),span:Math.max(...lats)-Math.min(...lats),leftMeridian:points.every(p=>p.x<0&&p.z>0)};
    });
    const belts=d.pressureBeltMeshes.map(m=>{
      const a=m.geometry.attributes.position,b=m.userData.seasonBase;let error=0;
      for(let i=0;i<a.count;i++)error=Math.max(error,Math.abs(latitude(d.makeVector3(a.getX(i),a.getY(i),a.getZ(i)))-expected(latitude(d.makeVector3(b[i*3],b[i*3+1],b[i*3+2])))));
      return error;
    });
    const arrows=s.arrows.map(({flow,arrows})=>Math.max(...arrows.map(a=>{
      const positions=a.mesh.geometry.attributes.position,i=positions.count-1,p=flow.curve.getPointAt(a.phase);
      return Math.hypot(positions.getX(i)-p.x,positions.getY(i)-p.y,positions.getZ(i)-p.z-.035);
    })));
    const axis=d.makeVector3(0,1,0).applyQuaternion(s.root.quaternion);
    return {shift,flows,belts,arrows,axis:axis.toArray(),quaternion:s.root.quaternion.toArray(),running:d.STATE.seasonalRunning};
  });
}
try{
  await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=guided');
  await page.waitForFunction(()=>window.__threeCellDebug&&document.getElementById('loading-screen').classList.contains('hidden'));
  await page.waitForTimeout(1100);
  await page.evaluate(()=>window.__threeCellDebug.transitionToStep(2));
  await page.waitForTimeout(500);
  const initial=await measure();
  const phases=[];
  for(const elapsed of [2,4,6,8,10,12,14,16]){
    await phase(elapsed);const state=await measure();phases.push(state);
    check(`季节进度${elapsed}秒：六圈与气压带共用纬度位置，极地不翻转`,state.flows.length===6&&state.flows.every(f=>f.pathError<1e-8&&f.ribbonError<1e-5&&f.centerSeam<1e-5&&f.minRadius>5.3&&f.maxShell<1&&f.leftMeridian)&&state.belts.every(e=>e<.001)&&state.arrows.every(e=>e<1e-5)&&Math.abs(state.axis[1]-1)<1e-8,state);
    if(elapsed===4||elapsed===12)await page.screenshot({path:resolve(out,elapsed===4?'summer.png':'winter.png')});
  }
  const polar=(s,h)=>s.flows.find(f=>f.kind==='schematic-polar'&&f.h===h).span;
  check('夏季北半球极地环流收缩、南半球极地环流扩张；冬季反向伸缩',polar(phases[1],1)<polar(initial,1)&&polar(phases[1],-1)>polar(initial,-1)&&polar(phases[5],1)>polar(initial,1)&&polar(phases[5],-1)<polar(initial,-1));
  await phase(4);const paused=await measure();await page.waitForTimeout(350);const held=await measure();
  check('暂停后所有路径位置保持稳定',held.shift===paused.shift&&held.flows.every((f,i)=>f.minLat===paused.flows[i].minLat&&f.maxLat===paused.flows[i].maxLat));
  await page.evaluate(()=>window.__threeCellDebug.setView('front'));await page.waitForTimeout(1000);
  const front=await measure();check('换视角保持地轴及迁移位置',front.shift===paused.shift&&Math.abs(front.axis[1]-1)<1e-8);
  await page.click('#reset-globe-view');await page.waitForTimeout(1100);const reset=await measure();
  check('复位同时恢复环流、气压带与风带初始位置',reset.shift===0&&!reset.running&&reset.flows.every((f,i)=>Math.abs(f.span-initial.flows[i].span)<1e-8)&&reset.belts.every(e=>e<.001)&&Math.abs(reset.axis[1]-1)<1e-8,reset);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);await phase(12);
  await page.screenshot({path:resolve(out,'mobile-winter.png')});const mobile=await measure();
  check('手机冬季路径和箭头保持一致',mobile.flows.every(f=>f.pathError<1e-8&&f.ribbonError<1e-5)&&mobile.arrows.every(e=>e<1e-5));
  await page.evaluate(()=>window.__threeCellDebug.transitionToStep(3));await page.waitForTimeout(100);
  await page.evaluate(()=>window.__threeCellDebug.transitionToStep(2));await page.waitForTimeout(400);
  check('离开并返回第三步恢复春秋分',(await measure()).shift===0);
  check('浏览器无运行错误',errors.length===0,errors);
}finally{
  await writeFile(resolve(out,'report.json'),JSON.stringify({checks,errors},null,2));
  console.log(JSON.stringify(checks.map(({name,ok})=>({name,ok})),null,2));
  await browser.close();
}
