import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const out=resolve('output/landsea-continuity');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}}),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(name,ok,evidence)=>{checks.push({name,ok:!!ok,evidence});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
async function settle(){await page.waitForTimeout(600);}
async function stage(node,progress=1){await page.evaluate(({node,progress})=>{const d=window.__landSeaDebug;d.formation.node=node;d.action('replay');d.formation.progress=progress;window.__threeCellDebug.STATE.playing=false;},{node,progress});await settle();}
async function shot(name){await page.screenshot({path:resolve(out,name+'.png')});}
async function snapshot(){return page.evaluate(()=>{
 const d=window.__landSeaDebug,dbg=window.__threeCellDebug,aux=document.getElementById('landsea-formation');
 const r=el=>{const a=el.getBoundingClientRect();return {left:a.left,right:a.right,top:a.top,bottom:a.bottom,width:a.width,height:a.height};};
 return {month:d.state.month,shift:d.state.entryShift,season:d.state.entrySeason,style:dbg.earthGroup.userData.surfaceStyle,framing:dbg.getSceneFraming(),aux:r(aux),auxParent:aux.parentElement.id,panel:r(document.getElementById('step-panel')),legend:!document.getElementById('landsea-legend').hidden,labels:d.labels.filter(o=>o.visible).map(o=>({text:o.element.textContent,rect:r(o.element)})),centers:d.labels.filter(o=>o.element.classList.contains('landsea-center')).map(o=>o.element.textContent),nodeButtons:[...document.querySelectorAll('#step-node-dock [id*="-formation-"]')].filter(el=>getComputedStyle(el).display!=='none').map(el=>el.id),node:d.formation.node,progress:d.formation.progress};
 });}
try{
 await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href);
 await page.waitForFunction(()=>window.__landSeaDebug&&document.getElementById('loading-screen').classList.contains('hidden'));
 await page.evaluate(()=>{document.getElementById('welcome-modal').classList.remove('show');const d=window.__threeCellDebug;d.transitionToStep(2);d.STATE.seasonalShift=8;d.transitionToStep(3);});await settle();
 let s=await snapshot();check('第三步夏季衔接7月并保留偏移',s.month===7&&s.shift===8,s);check('进入仍为均匀地表',s.style==='smooth');check('辅助图默认折叠且推导板可见',await page.locator('#landsea-aux').evaluate(el=>!el.open)&&await page.locator('#landsea-story').isVisible(),s.aux);await shot('summer-entry');
 check('连续播放界面只保留从头重播，不显示节点操作及播放模式',s.nodeButtons.length===1&&s.nodeButtons[0]==='landsea-formation-restart'&&await page.locator('#landsea-formation-mode').count()===0,s.nodeButtons);
 await stage(0,.5);check('桥接中海陆逐渐显现',await page.evaluate(()=>{const m=window.__landSeaDebug.group.getObjectByName('landsea-geography-bridge');return m.visible&&m.material.opacity===.5&&m.scale.x===window.__threeCellDebug.earthGroup.userData.surfaceMesh.scale.x;}));await shot('summer-bridge');
 await stage(0);s=await snapshot();check('桥接完成后加入海陆',s.style==='textured');
 await stage(1);s=await snapshot();check('温度节点不混用气压色标',!s.legend);await shot('summer-heat');
 await stage(3,.5);s=await snapshot();check('气压出现时同步显示高低压推导',!s.legend&&await page.locator('#ls-story-column').textContent().then(t=>t.includes('L 热低压')));await shot('summer-pressure');
 await stage(5);await shot('summer-wind');
 await page.click('#landsea-switch-view');await settle();s=await snapshot();check('结果模式不显示机制节点按钮',s.nodeButtons.length===0,s.nodeButtons);check('夏季气压中心字母与名称一致',s.centers.every(t=>t.startsWith(t.includes('高压')?'H':'L')),s.centers);await shot('summer-result');
 await page.click('#landsea-compare-month');await settle();s=await snapshot();check('结果可直接切换冬季',s.month===1&&s.nodeButtons.length===0);
 await page.click('#landsea-switch-view');await stage(2);await page.click('#landsea-switch-view');s=await snapshot();check('气柱节点切换结果不污染H/L',s.centers.every(t=>t.startsWith(t.includes('高压')?'H':'L')),s.centers);await shot('winter-result');
 await page.click('#landsea-aux>summary');await page.click('#landsea-thermal>summary');await page.click('#landsea-plan>summary');await settle();await shot('desktop-aux-expanded');
 for(const width of [760,390]){
  await page.setViewportSize({width,height:width===390?844:900});await settle();s=await snapshot();check(`${width}辅助图进入面板，不覆盖地球`,s.auxParent==='sp-body',s);check(`${width}隐藏次要等压线数字`,!s.labels.some(l=>/^\d/.test(l.text)),s.labels);await shot(width+'-result');
 }
 await page.click('#landsea-switch-view');await stage(2);await shot('390-column');
 await page.evaluate(()=>window.__threeCellDebug.transitionToStep(4));await settle();check('第五步无浏览器错误',errors.length===0,errors);
 await page.evaluate(()=>{const d=window.__threeCellDebug;d.transitionToStep(2);d.STATE.seasonalShift=-8;d.transitionToStep(3);});await settle();s=await snapshot();check('第三步冬季衔接1月',s.month===1&&s.shift===-8);await shot('390-winter-entry');
 await page.evaluate(()=>{const d=window.__threeCellDebug;d.transitionToStep(2);d.STATE.seasonalShift=0;d.transitionToStep(3);});await settle();s=await snapshot();check('春秋分保留起点并明确提示选定月份',s.shift===0&&s.season==='equinox'&&await page.locator('#landsea-formation-question').textContent().then(t=>t.includes('春秋分')),s);
 await page.setViewportSize({width:1366,height:768});
 for(const month of [1,7]){
  await page.evaluate(month=>{const d=window.__landSeaDebug;d.setMonth(month);window.__threeCellDebug.STATE.speed=8;window.landSeaPlaybackObserved={nodes:[],stoppedEarly:false};d.action('restart');const observe=()=>{const f=d.formation,o=window.landSeaPlaybackObserved;if(!o.nodes.includes(f.node))o.nodes.push(f.node);if(!window.__threeCellDebug.STATE.playing){o.stoppedEarly=f.node!==5||f.progress!==1;return;}requestAnimationFrame(observe);};requestAnimationFrame(observe);},month);
  await page.waitForFunction(()=>{const f=window.__landSeaDebug.formation;return f.node===5&&f.progress===1&&!window.__threeCellDebug.STATE.playing;},null,{timeout:20000});
  const observed=await page.evaluate(()=>window.landSeaPlaybackObserved);
  const geometry=await page.evaluate(()=>{
   const d=window.__landSeaDebug,group=d.group.getObjectByName('landsea-band-reference'),mesh=group.children.find(m=>m.userData.latitude===(d.state.month===1?60:30)),p=mesh.geometry.attributes.position;
   const width=lon=>{const i=(lon+180)/2*6;return Math.hypot(p.getX(i)-p.getX(i+1),p.getY(i)-p.getY(i+1),p.getZ(i)-p.getZ(i+1));};
   const teaching=d.group.getObjectByName('landsea-teaching-focus'),arrows=[];teaching.traverse(o=>{if(o.name==='landsea-teaching-direction'&&o.parent.visible&&o.visible)arrows.push(o);});
   return{landWidth:width(100),oceanWidth:width(-100),arrows:arrows.length,radiusError:Math.max(...arrows.map(o=>{const p=o.geometry.attributes.position;let e=0;for(let i=0;i<p.count;i++)e=Math.max(e,Math.abs(Math.hypot(p.getX(i),p.getY(i),p.getZ(i))-5.20));return e;}))};
  });
  check(`${month}月一次播放自动经过全部六个阶段，中间不停顿`,observed.nodes.length===6&&!observed.stoppedEarly,observed);
  check(`${month}月总进度完成且可重新播放`,await page.locator('#landsea-formation-progress').evaluate(el=>el.value===1)&&await page.locator('#landsea-play').textContent()==='重新播放');
  check(`${month}月大陆打断目标气压带，海洋保留`,geometry.landWidth<1e-6&&geometry.oceanWidth>.1,geometry);
  check(`${month}月风场箭头贴合球面`,geometry.arrows>0&&geometry.radiusError<1e-5,geometry);
  const time=await page.evaluate(()=>window.__landSeaDebug.mechanism().time);await settle();check(`${month}月完成暂停后时间保持`,time===await page.evaluate(()=>window.__landSeaDebug.mechanism().time));
  await page.evaluate(()=>window.__threeCellDebug.STATE.speed=1);
  await page.click('#landsea-play');await page.waitForFunction(()=>window.__landSeaDebug.formation.node===0&&window.__landSeaDebug.formation.progress>.1&&window.__landSeaDebug.formation.progress<1);
  await page.click('#landsea-play');const paused=await page.evaluate(()=>({node:window.__landSeaDebug.formation.node,progress:window.__landSeaDebug.formation.progress,time:window.__landSeaDebug.mechanism().time}));await settle();const held=await page.evaluate(()=>({node:window.__landSeaDebug.formation.node,progress:window.__landSeaDebug.formation.progress,time:window.__landSeaDebug.mechanism().time}));check(`${month}月重播后可中途暂停查看，进度及场景保持`,JSON.stringify(paused)===JSON.stringify(held)&&paused.progress<1,{paused,held});
  await page.click('#landsea-play');await page.waitForFunction(p=>window.__landSeaDebug.formation.progress>p,paused.progress);check(`${month}月从暂停处继续播放`,await page.evaluate(()=>window.__threeCellDebug.STATE.playing));
  await page.click('#landsea-formation-restart');check(`${month}月从头重播回到首阶段`,await page.evaluate(()=>window.__landSeaDebug.formation.node===0&&window.__landSeaDebug.formation.progress<.5&&window.__threeCellDebug.STATE.playing));
  await page.click('#landsea-play');
 }
 check('所有过程无浏览器错误',errors.length===0,errors);
}finally{await writeFile(resolve(out,'report.json'),JSON.stringify({checks,errors},null,2));await browser.close();}
if(checks.some(c=>!c.ok)||errors.length)process.exitCode=1;
