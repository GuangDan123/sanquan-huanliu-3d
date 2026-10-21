import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const out=resolve('output/landsea-camera');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
async function pose(){return page.evaluate(()=>{const d=__threeCellDebug,c=d.camera;return {position:c.position.toArray(),up:c.up.toArray(),quaternion:c.quaternion.toArray(),target:d.cameraTarget.toArray()};});}
const difference=(a,b)=>Math.max(...Object.keys(a).flatMap(k=>a[k].map((v,i)=>Math.abs(v-b[k][i]))));
async function stage(node,progress){await page.evaluate(({node,progress})=>{Object.assign(__landSeaDebug.formation,{view:'mechanism',node,progress});__threeCellDebug.STATE.playing=false;},{node,progress});await page.waitForTimeout(180);}
try{
 await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=guided');
 await page.waitForFunction(()=>__threeCellDebug?.TEACHING_INTRO.open&&document.getElementById('loading-screen').classList.contains('hidden'));
 await page.click('#teaching-intro-play');await page.waitForTimeout(600);await page.evaluate(()=>__threeCellDebug.transitionToStep(3));
 for(const month of [1,7]){
  await stage(0,0);await page.evaluate(m=>__landSeaDebug.setMonth(m),month);await page.waitForTimeout(200);const normal=await pose();
  await stage(1,.05);const early=await pose();await stage(1,.12);const middle=await pose();await stage(1,.7);const side=await pose();
  check(`${month}月镜头随冷热阶段平滑转向`,difference(normal,early)>0&&difference(normal,early)<difference(normal,middle)&&difference(normal,middle)<difference(normal,side));
  await page.screenshot({path:resolve(out,month+'-heat-side.png')});
  const geometry=await page.evaluate(()=>{const c=__threeCellDebug.camera,columns=__landSeaDebug.group.getObjectByName('landsea-teaching-focus').children.filter(o=>o.name==='landsea-air-column');return columns.map(column=>{const V=c.position.constructor,base=column.localToWorld(new V(0,0,0)),top=column.localToWorld(new V(0,column.userData.height,0)),axis=top.clone().sub(base).normalize(),toCamera=c.position.clone().sub(base).normalize(),project=p=>p.project(c);return {foreshortening:Math.abs(axis.dot(toCamera)),base:project(base).toArray(),top:project(top).toArray()};});});
  check(`${month}月两根气柱均从侧面可见`,geometry.every(c=>c.foreshortening<.35&&Math.abs(c.top[0])<1&&Math.abs(c.top[1])<1),geometry);
  await page.waitForTimeout(250);check(`${month}月暂停时镜头冻结`,difference(side,await pose())<1e-10);
  await stage(2,.75);check(`${month}月高空输送保持相同侧向视角`,difference(side,await pose())<1e-10);await page.screenshot({path:resolve(out,month+'-transfer-side.png')});
  await stage(3,.05);const returning=await pose();check(`${month}月进入大陆气压中心时平滑转回`,difference(normal,returning)>0&&difference(normal,returning)<difference(normal,side));
  await stage(3,.3);check(`${month}月恢复原位置、朝向和观察中心`,difference(normal,await pose())<1e-8);await page.screenshot({path:resolve(out,month+'-normal-restored.png')});
  await stage(2,.5);await page.click('#landsea-switch-view');await page.waitForTimeout(200);check(`${month}月中途查看结果恢复正常视角`,difference(normal,await pose())<1e-8&&!await page.evaluate(()=>__landSeaDebug.columnCamera.active));
  await page.click('#landsea-switch-view');await page.waitForTimeout(200);
  await page.locator('#scene-container canvas').dispatchEvent('pointerdown',{pointerId:1,pointerType:'mouse',clientX:1100,clientY:500,button:0});
  check(`${month}月手动观察接管镜头`,await page.evaluate(()=>__landSeaDebug.columnCamera.manual&&!__landSeaDebug.columnCamera.active));
  await stage(3,.3);check(`${month}月手动观察后仍恢复正常视角`,difference(normal,await pose())<1e-8);
  await stage(1,.7);await page.evaluate(()=>__threeCellDebug.STATE.viewLocked=true);const locked=await pose();await stage(2,.5);check(`${month}月锁定视角时不自动转动`,difference(locked,await pose())<1e-10);await page.evaluate(()=>__threeCellDebug.STATE.viewLocked=false);
  await stage(0,0);await page.evaluate(()=>{__threeCellDebug.STATE.speed=4;__landSeaDebug.formation.continuous=true;__landSeaDebug.action('restart');});
  await page.waitForFunction(()=>__landSeaDebug.formation.node===2&&__landSeaDebug.formation.progress>.3,null,{timeout:20000});
  check(`${month}月真实连续播放自动进入侧向视角`,await page.evaluate(()=>__landSeaDebug.columnCamera.active));
  await page.waitForFunction(()=>__landSeaDebug.formation.node===3&&__landSeaDebug.formation.progress>.3,null,{timeout:12000});
  await page.evaluate(()=>{__threeCellDebug.STATE.playing=false;__threeCellDebug.STATE.speed=1;});
  check(`${month}月真实连续播放自动恢复正常视角`,difference(normal,await pose())<1e-8);
 }
 await stage(2,.5);await page.evaluate(()=>__threeCellDebug.transitionToStep(2));
 check('退出第四步清理镜头状态并恢复竖直方向',await page.evaluate(()=>!__landSeaDebug.columnCamera.saved&&__threeCellDebug.camera.up.y===1));
 check('浏览器无异常',errors.length===0,errors);
}finally{await writeFile(resolve(out,'report.json'),JSON.stringify({checks,errors},null,2));await browser.close();}
if(errors.length||checks.some(c=>!c.ok))process.exitCode=1;
