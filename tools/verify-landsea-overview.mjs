import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const out=resolve('output/landsea-overview');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=name=>page.screenshot({path:resolve(out,name+'.png')});
async function stage(node,progress=1){await page.evaluate(({node,progress})=>{Object.assign(window.__landSeaDebug.formation,{node,progress,view:'mechanism'});window.__threeCellDebug.STATE.playing=false;},{node,progress});await page.waitForTimeout(250);}
async function snapshot(){return page.evaluate(()=>{const d=window.__landSeaDebug,g=d.group,story=g.getObjectByName('landsea-teaching-focus');return {camera:window.__threeCellDebug.camera.position.toArray(),story:story.visible,pressure:g.children[0].visible,opacity:g.children[0].material.opacity,contours:g.children[1].visible,wind:g.children[2].visible,windOpacity:g.children[2].children[1].material.opacity,labels:d.labels.filter(o=>o.visible).map(o=>({text:o.element.textContent,opacity:o.element.style.opacity})),storyLabels:story.children.filter(o=>o.isCSS2DObject&&o.visible).length,frame:window.__threeCellDebug.getSceneFraming()};});}
try{
 await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=guided');
 await page.waitForFunction(()=>window.__threeCellDebug?.TEACHING_INTRO.open&&document.getElementById('loading-screen').classList.contains('hidden'));
 await page.click('#teaching-intro-play');await page.evaluate(()=>window.__threeCellDebug.transitionToStep(3));
 for(const month of [1,7]){
  await page.evaluate(m=>window.__landSeaDebug.setMonth(m),month);
  await stage(5);await shot(month+'-wind');
  check(`${month}月虚线推动方向与连续实线风向有独立箭头`,await page.evaluate(()=>{const g=window.__landSeaDebug.group,s=g.getObjectByName('landsea-main-wind'),f=g.getObjectByName('landsea-pressure-drive'),line=s.children[0].geometry.attributes.position,a=s.children[1].geometry.attributes.position,point=(attr,i)=>s.position.clone().fromBufferAttribute(attr,i),start=point(a,0).add(point(a,1)).multiplyScalar(.5),end=point(a,a.count-1);let radiusError=0;for(let i=0;i<a.count;i++)radiusError=Math.max(radiusError,Math.abs(point(a,i).length()-5.2));return f.children[0].material.type==='LineDashedMaterial'&&s.children.filter(o=>o.name==='landsea-teaching-direction').length===1&&start.distanceTo(point(line,0))<.005&&end.distanceTo(point(line,line.count-1))<.005&&radiusError<1e-5&&s.children.filter(o=>o.geometry?.type==='SphereGeometry').length<=4;}));
  let previous=-1;
  for(const progress of [0,.25,.5,.75,1]){
   await stage(6,progress);const snap=await snapshot();await shot(month+'-overview-'+progress);
   check(`${month}月归纳进度${progress}：全球图层连续渐显`,snap.opacity>previous&&Math.abs(snap.windOpacity/.95-snap.opacity/.38)<1e-6,snap);previous=snap.opacity;
   if(progress===.5){await page.waitForTimeout(300);const paused=await snapshot();check(`${month}月归纳暂停冻结画面`,JSON.stringify(snap)===JSON.stringify(paused),{snap,paused});}
  }
  const final=await snapshot();check(`${month}月动画终态已是完整结果图`,!final.story&&final.storyLabels===0&&final.pressure&&final.contours&&final.wind&&final.labels.some(o=>o.text.includes('亚洲'))&&final.labels.some(o=>o.text.includes('澳大利亚')),final);
  const size=Math.round(Math.min(final.frame.availableW,final.frame.availableH)*.78),clip={x:Math.round(final.frame.centerX-size/2),y:Math.round(final.frame.centerY-size/2),width:size,height:size};
  const before=await page.screenshot({clip,path:resolve(out,month+'-final-globe.png')});await page.click('#landsea-switch-view');await page.waitForTimeout(300);
  const result=await snapshot(),after=await page.screenshot({clip,path:resolve(out,month+'-result-globe.png')});
  check(`${month}月终态切换结果对照时图层与相机一致`,JSON.stringify(final)===JSON.stringify(result),{final,result});
  check(`${month}月终态切换结果对照时地球像素一致`,before.equals(after));
  await page.click('#landsea-switch-view');await page.waitForTimeout(250);
  const returned=await snapshot();check(`${month}月返回形成过程保持最终画面`,JSON.stringify(final)===JSON.stringify(returned),{final,returned});
  await page.selectOption('#landsea-stage','5');await page.waitForTimeout(250);const local=await snapshot();
  check(`${month}月回看局部阶段清除全球图层`,local.story&&!local.pressure&&!local.wind);
  await page.evaluate(()=>{const d=window.__landSeaDebug;d.formation.continuous=true;window.__threeCellDebug.STATE.speed=16;d.action('restart');});
  await page.waitForFunction(()=>{const d=window.__landSeaDebug;return d.formation.node===d.stages().length-1&&d.formation.progress===1&&!window.__threeCellDebug.STATE.playing;},null,{timeout:40000});
  check(`${month}月连续播放自动到达完整结果图`,!(await snapshot()).story&&(await snapshot()).pressure);
  await page.evaluate(()=>window.__threeCellDebug.STATE.speed=1);
 }
 for(const width of [1366,760,390]){
  await page.setViewportSize({width,height:width===390?844:900});await stage(5);await shot(width+'-wind');await stage(6);await shot(width+'-final');
  check(`${width}宽完整图可见且无残留机制标签`,(await snapshot()).pressure&&(await snapshot()).storyLabels===0);
 }
 check('浏览器无运行错误',errors.length===0,errors);
}finally{await writeFile(resolve(out,'report.json'),JSON.stringify({checks,errors},null,2));await browser.close();}
if(errors.length||checks.some(c=>!c.ok))process.exitCode=1;
