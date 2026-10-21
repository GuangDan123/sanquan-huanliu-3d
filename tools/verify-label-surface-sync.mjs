import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';

const output=resolve('output/label-surface-sync');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}});
const errors=[],checks=[];
page.on('pageerror',error=>errors.push(String(error)));
const check=(ok,name)=>{checks.push({ok,name});console.log(`${ok?'PASS':'FAIL'} ${name}`);assert.ok(ok,name);};
const inspect=()=>page.evaluate(()=>{
  const d=window.__threeCellDebug,camera=d.camera,center=d.earthGroup.position;
  const yaw=-Math.atan2(camera.position.z-center.z,camera.position.x-center.x)-Math.PI/2;
  const radius=d.pressureBeltR;
  let maxAnchorError=0,maxPixelError=0,visible=0;
  for(const {obj,data} of d.latLabels){
    const phi=data.lat*Math.PI/180,lon=42*Math.PI/180;
    const x=radius*Math.cos(phi)*Math.sin(lon),y=radius*Math.sin(phi),z=-radius*Math.cos(phi)*Math.cos(lon);
    const expected=d.makeVector3(x*Math.cos(yaw)+z*Math.sin(yaw),y,-x*Math.sin(yaw)+z*Math.cos(yaw)).add(center);
    maxAnchorError=Math.max(maxAnchorError,obj.getWorldPosition(d.makeVector3()).distanceTo(expected));
    if(!obj.visible||obj.element.style.display==='none')continue;
    visible++;
    const ndc=expected.project(camera),rect=obj.element.getBoundingClientRect();
    maxPixelError=Math.max(maxPixelError,Math.hypot(rect.x+rect.width/2-(ndc.x+1)*innerWidth/2,rect.y+rect.height/2-(1-ndc.y)*innerHeight/2));
  }
  const longitudes=(labels,target)=>labels.every(({obj})=>Math.abs(Math.atan2(obj.position.x,-obj.position.z)*180/Math.PI-target)<1e-8);
  const whiteWind=d.windLabels.every(({obj})=>{
    const style=getComputedStyle(obj.element);
    return style.backgroundColor==='rgb(255, 255, 255)'&&style.color==='rgb(17, 17, 17)'&&style.textShadow==='none';
  });
  return {maxAnchorError,maxPixelError,visible,swapped:longitudes(d.pressureLabels,-24)&&longitudes(d.windLabels,16),whiteWind};
});
const inspectCase=async name=>{
  const result=await inspect();
  check(result.maxAnchorError<1e-8&&result.maxPixelError<.05,`${name}: latitude labels match this frame's surface projection`);
  check(result.swapped&&result.whiteWind,`${name}: swapped longitudes and white wind labels`);
  return result;
};

try{
  await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=guided');
  await page.waitForFunction(()=>window.__threeCellDebug&&document.getElementById('loading-screen').classList.contains('hidden'));
  await page.waitForTimeout(1500);
  for(const step of [0,1,2]){
    await page.evaluate(step=>window.__threeCellDebug.transitionToStep(step),step);
    await page.waitForFunction(step=>window.__threeCellDebug.STATE.step===step,step);
    await page.waitForTimeout(700);
  }
  await page.evaluate(()=>window.__threeCellDebug.hideTeachingIntro());
  for(const view of ['reset','side','front','top']){
    await page.evaluate(view=>window.__threeCellDebug.setView(view),view);
    await page.waitForTimeout(1100);
    await inspectCase(view);
    await page.screenshot({path:join(output,`${view}.png`)});
  }
  await page.evaluate(()=>window.__threeCellDebug.setView('reset'));
  await page.waitForTimeout(1100);
  const monitor=page.evaluate(async()=>{
    const d=window.__threeCellDebug,results=[];
    for(let i=0;i<45;i++){
      await new Promise(requestAnimationFrame);
      const center=d.earthGroup.position,camera=d.camera;
      const yaw=-Math.atan2(camera.position.z-center.z,camera.position.x-center.x)-Math.PI/2;
      const group=d.latLabels[0].obj.parent.parent;
      results.push(Math.abs(Math.atan2(Math.sin(group.rotation.y-yaw),Math.cos(group.rotation.y-yaw))));
    }
    return Math.max(...results);
  });
  await page.mouse.move(1060,350);
  await page.mouse.down();
  await page.mouse.move(860,430,{steps:24});
  await page.mouse.up();
  check(await monitor<1e-8,'drag: label longitude is synchronized with the final camera pose');
  await page.waitForTimeout(300);
  await inspectCase('drag');
  await page.screenshot({path:join(output,'drag.png')});
  await page.mouse.wheel(0,-150);
  await page.waitForTimeout(600);
  await inspectCase('zoom');
  await page.click('#season-shift-toggle');
  await page.waitForTimeout(400);
  await inspectCase('seasonal shift');
  await page.click('#season-shift-toggle');
  await page.click('#tog-labels');
  await page.waitForTimeout(150);
  check(await page.evaluate(()=>window.__threeCellDebug.latLabels.every(({obj})=>!obj.visible)),'label switch hides latitude labels');
  await page.click('#tog-labels');
  await page.waitForTimeout(150);
  await inspectCase('labels restored');
  for(const step of [0,1]){
    await page.evaluate(step=>window.__threeCellDebug.transitionToStep(step),step);
    await page.waitForTimeout(900);
    check(await page.evaluate(()=>window.__threeCellDebug.latLabels.every(({obj})=>!obj.visible)),'step '+(step+1)+': teaching demonstration retains its label visibility');
  }
  check(errors.length===0,'no browser errors');
}finally{
  await writeFile(join(output,'report.json'),JSON.stringify({checks,errors},null,2));
  await browser.close();
}
