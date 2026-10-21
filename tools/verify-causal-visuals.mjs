import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const out=resolve('output/teaching-improvements');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async name=>page.screenshot({path:resolve(out,name+'.png')});
async function step(n){await page.evaluate(n=>window.__threeCellDebug.transitionToStep(n),n);await page.waitForTimeout(200);const play=page.locator('#teaching-intro-play');if(await play.isVisible())await play.click();await page.evaluate(()=>{const s=window.__threeCellDebug.STATE;s.playing=false;s.singleDemo.running=false;s.mechanismDemo.running=false;});}
async function seek(e){await page.evaluate(e=>window.__circulationSequenceDebug.seek(e),e);await page.waitForTimeout(150);}
try{
 await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=guided');
 await page.waitForFunction(()=>window.__threeCellDebug?.TEACHING_INTRO.open&&document.getElementById('loading-screen').classList.contains('hidden'));
 await page.locator('#teaching-intro-play').click();
 await step(1);await seek(7);await shot('s2-deflection');
 check('播放画面保留原经线、前进与偏向箭头',await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return s.reference.visible&&s.velocity.visible&&s.force.visible;}));
 check('偏向力在水平面内且垂直前进方向',await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,v=s.velocity.position.clone().set(0,1,0).applyQuaternion(s.velocity.quaternion),f=s.force.position.clone().set(0,1,0).applyQuaternion(s.force.quaternion),r=s.force.position.clone().normalize();return Math.abs(v.dot(f))<1e-8&&Math.abs(r.dot(f))<1e-8;}));
 const frozen=await page.locator('#causal-visual canvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(200);
 check('暂停时局部图解完全冻结',frozen===await page.locator('#causal-visual canvas').evaluate(c=>c.toDataURL()));
 await seek(18);await shot('s2-subsidence');await seek(28.5);await shot('s2-front');
 check('局部锋面只演示暖空气抬升',await page.evaluate(()=>{const f=window.__circulationSequenceDebug.sequence.flows;return f.find(f=>f.h===1&&f.kind==='subpolar-rise').group.visible&&!f.find(f=>f.h===1&&f.kind==='polar-rise').group.visible;}));
 await seek(40);await shot('s2-mean');
 check('归纳时恢复两半球完整三圈',await page.evaluate(()=>window.__circulationSequenceDebug.sequence.flows.every(f=>f.group.visible)));
 await step(2);await shot('s3-equinox');
 await page.locator('#season-shift-toggle').click();
 await page.waitForFunction(()=>window.__threeCellDebug.STATE.seasonalShift>7.2);await page.locator('#season-shift-toggle').click();await shot('s3-summer');
 const summer=await page.evaluate(()=>window.__causalVisualsDebug.state());
 check('夏季固定地点受副热带高压影响',summer.season.control==='副热带高压',summer);
 await page.locator('#season-shift-toggle').click();await page.waitForFunction(()=>window.__threeCellDebug.STATE.seasonalShift< -7.2,null,{timeout:15000});await page.locator('#season-shift-toggle').click();await shot('s3-winter');
 const winter=await page.evaluate(()=>window.__causalVisualsDebug.state());
 check('冬季同一纬度改受西风带影响',winter.season.control==='西风带',winter);
 check('地球观察点保持37°N，直射纬度跨赤道',Math.abs(summer.markers[1].lat-37)<1e-8&&Math.abs(winter.markers[1].lat-37)<1e-8&&summer.markers[0].lat>20&&winter.markers[0].lat< -20);
 await step(3);
 check('高空质量转移全程守恒（两柱加途中共48份）',await page.evaluate(()=>[true,false].every(w=>Array.from({length:201},(_,i)=>window.__causalVisualsDebug.massBudget(i/200,w)).every(b=>b.land+b.sea+b.inTransit===48))));
 for(const month of [1,7]){
  await page.evaluate(m=>window.__landSeaDebug.setMonth(m),month);
  for(const [node,progress,label]of [[1,1,'heat'],[2,.7,'transfer'],[2,1,'mass'],[3,1,'pressure']]){
   await page.evaluate(({node,progress})=>{Object.assign(window.__landSeaDebug.formation,{node,progress});window.__threeCellDebug.STATE.playing=false;},{node,progress});await page.waitForTimeout(150);await shot('s4-'+month+'-'+label);
   const snap=await page.evaluate(()=>{const d=window.__landSeaDebug,columns=d.group.getObjectByName('landsea-teaching-focus').children.filter(o=>o.name==='landsea-air-column');return {budget:window.__causalVisualsDebug.state().budget,columns:columns.map(c=>c.userData)};});
   check(`${month}月${label}：球面与剖面空气量一致`,snap.budget.land===snap.columns[0].particleCount&&snap.budget.sea===snap.columns[1].particleCount,snap);
   if(node===1)check(`${month}月：柱高已改变，质量仍相同`,snap.budget.land===24&&snap.budget.sea===24&&snap.columns[0].height!==snap.columns[1].height);
  }
 }
 await step(4);check('第五步隐藏前三维步骤的局部浮层',!await page.locator('#causal-visual').isVisible());
 await page.evaluate(()=>{const d=window.__monsoonClimateDebug;d.setOption('site','mumbai');d.setOption('month',7);});
 const texts=[];
 for(const [key,progress,label]of [['lift',.2,'warm'],['lift',.6,'cooling'],['lift',.9,'cloud'],['rain',1,'rain']]){
  await page.evaluate(({key,progress})=>{const c=document.getElementById('climate-formation-canvas'),ctx=c.getContext('2d');window.__climateTextTrace=[];ctx.fillText=function(...args){window.__climateTextTrace.push(String(args[0]));CanvasRenderingContext2D.prototype.fillText.apply(this,args);};const d=window.__monsoonClimateDebug;Object.assign(d.formation,{node:d.stages().findIndex(s=>s.key===key),progress});window.__threeCellDebug.STATE.playing=false;},{key,progress});
  await page.waitForTimeout(200);await page.locator('#climate-formation-canvas').screenshot({path:resolve(out,'s5-'+label+'.png')});texts.push(await page.evaluate(()=>window.__climateTextTrace));
 }
 check('抬升初期尚未凝结，后期才形成云',texts[0].includes('尚未凝结')&&!texts[0].includes('凝结 → 云')&&texts[2].includes('凝结 → 云'),texts);
 check('迎风坡、背风坡和主要雨区同时可辨',texts[3].includes('迎风坡')&&texts[3].includes('背风坡')&&texts[3].includes('迎风坡降水较多'));
 check('被追踪气团上升时同步冷却，雨线全部在山峰迎风侧',await page.evaluate(()=>{const d=window.__causalVisualsDebug,a=d.parcel(.2),b=d.parcel(.8);return b.y<a.y&&b.cooling>a.cooling&&Array.from({length:10},(_,j)=>d.rainX(j)).every(x=>x>430&&x<610);}));
 check('气候图突出当前月份并区分气温解释',(await page.locator('#mc-process-statistics').textContent()).includes('当前7月')&&(await page.locator('#mc-process-statistics').textContent()).includes('太阳辐射'));
 await shot('s5-screen');
 await step(0);await page.evaluate(()=>window.__singleCirculationDebug.seek(7));await page.waitForTimeout(150);await shot('s1-upper');
 check('第一步高空阶段显示同高度气压比较',await page.locator('#causal-visual').isVisible());
 await page.evaluate(()=>window.__singleCirculationDebug.seek(16));await page.waitForTimeout(150);await shot('s1-complete');
 for(const width of [1366,760,390]){
  await page.setViewportSize({width,height:width===390?844:900});await step(1);await seek(7);
  if(width<=760){await page.locator('#causal-visual').evaluate(el=>el.open=false);await shot('s2-width-'+width+'-collapsed');await page.locator('#causal-visual summary').click();}
  await shot('s2-width-'+width);
  check(`${width}宽图解可展开且不越出视口`,await page.locator('#causal-visual').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&el.open;}));
 }
 await page.setViewportSize({width:1366,height:900});await step(1);
 await page.evaluate(()=>{window.__threeCellDebug.STATE.speed=16;window.__circulationSequenceDebug.seek(0,true);});
 await page.waitForFunction(()=>window.__circulationSequenceDebug.elapsed()===40,null,{timeout:25000});
 check('第二步实际连续播放至40秒并保留完整三圈',await page.evaluate(()=>window.__circulationSequenceDebug.sequence.flows.every(f=>f.group.visible)));
 await step(4);await page.evaluate(()=>{const d=window.__monsoonClimateDebug;d.setOption('site','mumbai');d.setOption('month',7);d.formation.continuous=true;d.action('restart');});
 await page.waitForFunction(()=>{const d=window.__monsoonClimateDebug;return d.formation.node===d.stages().length-1&&d.formation.progress===1;},null,{timeout:25000});
 check('第五步实际连续完成跨赤道、冷却、凝结和降雨',!await page.evaluate(()=>window.__threeCellDebug.STATE.playing));
 check('浏览器无异常',errors.length===0,errors);
}finally{await writeFile(resolve(out,'report.json'),JSON.stringify({checks,errors},null,2));await browser.close();}
if(errors.length||checks.some(c=>!c.ok))process.exitCode=1;
