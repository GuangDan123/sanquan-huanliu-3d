import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const out=resolve('output/landsea-globe');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
async function stage(node,progress=1){await page.evaluate(({node,progress})=>{const d=window.__landSeaDebug;d.formation.node=node;d.formation.progress=progress;window.__threeCellDebug.STATE.playing=false;}, {node,progress});await page.waitForTimeout(350);}
async function shot(name){await page.screenshot({path:resolve(out,name+'.png')});}
async function snap(){return page.evaluate(()=>{const d=window.__landSeaDebug,g=d.group.getObjectByName('landsea-teaching-focus');return {node:d.formation.node,progress:d.formation.progress,month:d.state.month,columns:g.children.filter(o=>o.name==='landsea-air-column').map(o=>({...o.userData,visible:o.visible})),notes:g.children.filter(o=>o.isCSS2DObject&&o.visible).map(o=>o.element.textContent),deflection:g.getObjectByName('landsea-main-wind').userData.deflection,pressure:g.children.filter(o=>o.name==='landsea-growing-pressure-center').map(o=>({visible:o.visible,opacity:o.children[0].material.opacity})),frame:window.__threeCellDebug.getSceneFraming()};});}
try{
 await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=guided');
 await page.waitForFunction(()=>window.__threeCellDebug?.TEACHING_INTRO.open&&document.getElementById('loading-screen').classList.contains('hidden'));
 await page.click('#teaching-intro-play');await page.evaluate(()=>window.__threeCellDebug.transitionToStep(3));
 check('主画面没有右侧解释板',!await page.locator('#landsea-formation').isVisible()&&await page.locator('#landsea-story').count()===0);
 for(const month of [1,7]){
  await page.evaluate(m=>window.__landSeaDebug.setMonth(m),month);
  await stage(0,0);await shot(month+'-entry');
  await stage(1,.3);const a=await snap();await stage(1);const heat=await snap();
  check(`${month}月地球气柱随冷热收缩或膨胀`,month===1?heat.columns[0].height<a.columns[0].height:heat.columns[0].height>a.columns[0].height,{a,heat});await shot(month+'-heat');
  await stage(2,.2);const before=await snap();await stage(2);const after=await snap();
  check(`${month}月高空输送改变大陆气柱粒子数`,month===1?after.columns[0].particleCount>before.columns[0].particleCount:after.columns[0].particleCount<before.columns[0].particleCount,{before,after});await shot(month+'-column');
  check(`${month}月高空流线在地球表面之外`,await page.evaluate(()=>{const a=window.__landSeaDebug.group.getObjectByName('landsea-upper-adjustment').children[0].geometry.attributes.position;let min=10;for(let i=0;i<a.count;i++)min=Math.min(min,Math.hypot(a.getX(i),a.getY(i),a.getZ(i)));return min>5.8;}));
  await stage(3,.2);const early=await snap();await stage(3);const late=await snap();check(`${month}月气压中心逐渐展开`,late.pressure[0].opacity>early.pressure[0].opacity);await shot(month+'-pressure');
  await stage(4);await shot(month+'-band');check(`${month}月大陆中断、海洋保留原气压带`,await page.evaluate(()=>{const d=window.__landSeaDebug,m=d.group.getObjectByName('landsea-band-reference').children.find(m=>m.userData.latitude===(d.state.month===1?60:30)),p=m.geometry.attributes.position,width=lon=>{const i=(lon+180)/2*6;return Math.hypot(p.getX(i)-p.getX(i+1),p.getY(i)-p.getY(i+1),p.getZ(i)-p.getZ(i+1));};return width(100)<1e-6&&width(-100)>.1;}));
  await stage(5,.25);const straight=await snap();await stage(5,.65);const bending=await snap();await stage(5);const final=await snap();
  check(`${month}月风向逐渐右偏`,straight.deflection<bending.deflection&&bending.deflection<final.deflection,{straight,bending,final});await shot(month+'-wind');
  check(`${month}月风向从同一起点向北半球右侧偏转`,await page.evaluate(()=>{const d=window.__landSeaDebug,g=d.group.getObjectByName('landsea-teaching-focus'),a=g.getObjectByName('landsea-pressure-drive').children[0].geometry.attributes.position,b=g.getObjectByName('landsea-main-wind').children[0].geometry.attributes.position,vec=i=>[a.getX(i),a.getY(i),a.getZ(i)],start=vec(0),other=[b.getX(0),b.getY(0),b.getZ(0)],lat=p=>Math.asin(p[1]/Math.hypot(...p))*180/Math.PI,finish=[b.getX(96),b.getY(96),b.getZ(96)];return Math.hypot(...start.map((n,i)=>n-other[i]))<1e-5&&(d.state.month===1?lat(finish)<lat(start):lat(finish)>lat(start));}));
  const preserved=await snap();await page.click(`[data-stage-month="${month===1?7:1}"]`);const switched=await snap();check('同阶段冬夏比较保留进度并暂停',preserved.node===switched.node&&preserved.progress===switched.progress&&await page.evaluate(()=>!window.__threeCellDebug.STATE.playing));
 }
 await page.selectOption('#landsea-stage','2');check('阶段回看停在当前阶段起点',await page.evaluate(()=>window.__landSeaDebug.formation.node===2&&window.__landSeaDebug.formation.progress===0&&!window.__threeCellDebug.STATE.playing));
 await page.locator('.teaching-settings > summary').click();await page.selectOption('#landsea-formation-mode','step');await page.evaluate(()=>{window.__threeCellDebug.STATE.speed=16;window.__landSeaDebug.action('restart');});
 await page.waitForFunction(()=>window.__landSeaDebug.formation.progress===1&&!window.__threeCellDebug.STATE.playing,null,{timeout:15000});check('逐段讲解在阶段末暂停',await page.evaluate(()=>window.__landSeaDebug.formation.node===0));
 await page.locator('.teaching-settings > summary').click();await page.selectOption('#landsea-formation-mode','continuous');await page.evaluate(()=>window.__landSeaDebug.action('restart'));
 await page.waitForFunction(()=>window.__landSeaDebug.formation.node===window.__landSeaDebug.stages().length-1&&window.__landSeaDebug.formation.progress===1&&!window.__threeCellDebug.STATE.playing,null,{timeout:40000});check('连续播放完成所有阶段',true);
 await page.evaluate(()=>window.__threeCellDebug.STATE.speed=1);await page.click('#landsea-switch-view');await page.waitForTimeout(350);check('结果对照仍可用且显示气压图例',!await page.locator('#landsea-legend').evaluate(el=>el.hidden));check('结果模式清除形成阶段浮动标签',await page.evaluate(()=>!window.__landSeaDebug.group.getObjectByName('landsea-teaching-focus').children.some(o=>o.isCSS2DObject&&o.visible)));await shot('result');await page.click('#landsea-switch-view');
 for(const width of [1920,1100,760,390]){await page.setViewportSize({width,height:width<600?844:900});await stage(2);await shot(width+'-column');check(`${width}宽无右侧解释板`,!await page.locator('#landsea-formation').isVisible());}
 await page.setViewportSize({width:1366,height:768});await stage(2,.7);await page.click('#landsea-play');await page.waitForTimeout(250);await page.click('#landsea-play');const paused=await snap();const particlePositions=await page.evaluate(()=>window.__landSeaDebug.group.getObjectByName('landsea-air-column').children.filter(o=>o.geometry?.type==='SphereGeometry').map(o=>o.position.toArray()));await page.waitForTimeout(350);check('暂停同时冻结形状、质量与风向',JSON.stringify(paused)===JSON.stringify(await snap()));
 check('暂停冻结全部气柱粒子',JSON.stringify(particlePositions)===JSON.stringify(await page.evaluate(()=>window.__landSeaDebug.group.getObjectByName('landsea-air-column').children.filter(o=>o.geometry?.type==='SphereGeometry').map(o=>o.position.toArray()))));await page.evaluate(()=>window.__threeCellDebug.transitionToStep(2));check('退出第四步关闭专用动画',await page.evaluate(()=>!window.__landSeaDebug.group.visible&&!document.body.classList.contains('landsea-story-mode')));
 check('浏览器无错误',errors.length===0,errors);
}finally{await writeFile(resolve(out,'report.json'),JSON.stringify({checks,errors},null,2));await browser.close();}
if(errors.length||checks.some(c=>!c.ok))process.exitCode=1;
