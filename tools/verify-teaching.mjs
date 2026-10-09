// 实际点击复核教师分步操作、阶段边界、小屏及离线入口。
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {setTimeout as sleep} from 'node:timers/promises';
const url=process.argv[2]||'http://127.0.0.1:8149/';
const out=resolve(process.argv[3]||'.verify-pressure-steps');await mkdir(out,{recursive:true});
const report={checks:[],errors:[],screenshots:[]};
const check=(ok,name,evidence)=>{report.checks.push({ok,name,evidence});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const port=14000+process.pid%1000;
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,`--user-data-dir=${join(out,'profile')}`,'about:blank'],{stdio:'ignore',windowsHide:true});let ws;
try{
 let tab;for(let i=0;i<60;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'});if(r.ok){tab=await r.json();break;}}catch{}await sleep(200);}if(!tab)throw Error('浏览器未启动');
 ws=new WebSocket(tab.webSocketDebuggerUrl);let id=0;const pending=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);});await new Promise(r=>ws.addEventListener('open',r));
 const send=(method,params={})=>new Promise((resolve,reject)=>{const k=++id;pending.set(k,{resolve,reject});ws.send(JSON.stringify({id:k,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const click=async s=>{const p=await ev(`(()=>{const e=document.querySelector(${JSON.stringify(s)}),r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return{ok:!e.disabled&&x>=0&&x<innerWidth&&y>=0&&y<innerHeight&&e.contains(document.elementFromPoint(x,y)),x,y}})()`);if(!p.ok)throw Error('按钮不可点击 '+s);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:p.x,y:p.y});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:p.x,y:p.y});};
 const state=()=>ev('window.__lessonDebug.diagnostics()');
 const pixels=()=>ev("document.getElementById('lesson-canvas').toDataURL()");
 const viewport=async(width,height)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await sleep(300);};
 const nav=async link=>{await send('Page.navigate',{url:link});for(let i=0;i<70;i++){if(await ev("!!window.__lessonDebug&&document.getElementById('loading-screen').classList.contains('hidden')")){await sleep(1800);return;}await sleep(200);}throw Error('初始化未完成');};
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(out,name),Buffer.from(r.data,'base64'));report.screenshots.push(name);};
 const speed=async()=>ev("document.getElementById('speed-slider').value=20;document.getElementById('speed-slider').dispatchEvent(new Event('input',{bubbles:true}))");
 const waitStopped=async()=>{for(let i=0;i<70;i++){if(!(await state()).running)return;await sleep(100);}throw Error('步骤未自动暂停');};

 await send('Runtime.enable');await send('Page.enable');await viewport(1600,1000);await nav(new URL('?state=explore',url).href);await speed();await click('#lesson-open');
 const forces=await ev('(()=>{const f=window.__teachingDebug.force;return [0,1,2].flatMap(step=>[0,.25,.5,.75,1].map(p=>({step,p,...f(step,p)})))})()');
 check(forces.every(f=>Math.abs(f.velocity[0]*f.coriolis[0]+f.velocity[1]*f.coriolis[1])<1e-8),'全部受力采样偏向力垂直瞬时风向',forces);
 check(forces.filter(f=>f.step===2&&f.p>0).every(f=>f.velocity[0]*f.friction[0]+f.velocity[1]*f.friction[1]<0&&Math.abs(f.velocity[0]*f.friction[1]-f.velocity[1]*f.friction[0])<1e-8),'摩擦力与风向相反');
 const upper=forces.find(f=>f.step===1&&f.p===1),surface=forces.find(f=>f.step===2&&f.p===1);
 check(Math.abs(upper.velocity[1])<1e-8&&surface.velocity[1]<0&&Math.hypot(...surface.velocity)<Math.hypot(...upper.velocity),'高空平行等压线，近地面减速并斜穿向低压');
 check([upper,surface].every(f=>Math.hypot(f.gradient[0]+f.coriolis[0]+f.friction[0],f.gradient[1]+f.coriolis[1]+f.friction[1])<1e-8),'理想稳定状态受力平衡');
 await click('#lesson-step-next');await waitStopped();await click('#lesson-step-next');await waitStopped();await click('#lesson-step-next');await waitStopped();await shot('pressure-compare.png');
 await click('#lesson-close');await click('#projection-toggle');await click('#lesson-open');
 check(await ev("getComputedStyle(document.querySelector('.lesson-question')).display!=='none'&&document.querySelector('.lesson-question').getBoundingClientRect().width>0"),'投屏保留先预测问题');await shot('projection.png');await click('#lesson-close');await click('#projection-toggle');
 await ev('window.__threeCellDebug.transitionToStep(0)');await sleep(1000);
 check(await ev("document.getElementById('step-panel').textContent.includes('太阳直射赤道')"),'单圈常驻模型假设完整');
 const waitDemo=async kind=>{for(let i=0;i<90;i++){if(!await ev('window.__threeCellDebug.STATE.'+(kind==='single'?'singleDemo':'mechanismDemo')+'.running'))return;await sleep(100)}throw Error('三维节点未停止')};
 await click('#single-node-next');await waitDemo('single');const first=await ev('({...window.__threeCellDebug.STATE.singleDemo})');await sleep(250);
 check(first.node===0&&first.elapsed===2.3&&!first.complete&&await ev('window.__threeCellDebug.STATE.singleDemo.elapsed')===2.3,'单圈第一节点自动停住，不进入高空输送');
 await click('#single-node-next');await waitDemo('single');await click('#single-node-prev');check(await ev('window.__threeCellDebug.STATE.singleDemo.node===0&&!window.__threeCellDebug.STATE.singleDemo.running'),'单圈回退恢复上一步');await click('#single-node-replay');await waitDemo('single');
 for(let i=1;i<4;i++){await click('#single-node-next');await waitDemo('single');check(await ev('window.__threeCellDebug.STATE.singleDemo.node')===i,'单圈节点'+(i+1)+'实际点击与停顿')};await shot('single-nodes.png');
 for(const stage of [0,1,2]){await ev('window.__threeCellDebug.transitionToStep(1)');await sleep(650);await ev('window.__threeCellDebug.setMechanismStage('+stage+')');await sleep(150);const nodes=await ev("window.__teachingDebug.nodes('mechanism')");
  for(let i=0;i<nodes.length;i++){await click('#mechanism-node-next');await waitDemo('mechanism');const d=await ev('({...window.__threeCellDebug.STATE.mechanismDemo})');check(d.node===i&&d.elapsed===nodes[i].end&&!d.running,'机制'+stage+'节点'+(i+1)+'停在预期终点',d)}
  await click('#mechanism-node-prev');await click('#mechanism-node-replay');await waitDemo('mechanism');await shot('mechanism-'+stage+'.png');
 }
 await click('#lesson-open');await click('[data-lesson-tab="section"]');
 const select=async(s,value)=>ev('(()=>{const e=document.querySelector('+JSON.stringify(s)+');e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event("change",{bubbles:true}))})()');
 await select('#teaching-section-mode','blank');check((await state()).phase.includes('不显示参考答案'),'空白剖面不提前显示成因答案');
 const stroke=async(canvas)=>{const p=await ev('(()=>{const r=document.querySelector('+JSON.stringify(canvas)+').getBoundingClientRect();return{x:r.x+r.width*.35,y:r.y+r.height*.7,tx:r.x+r.width*.35,ty:r.y+r.height*.35}})()');await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,x:p.x,y:p.y});await send('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,x:p.tx,y:p.ty});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:p.tx,y:p.ty});};
 await ev("document.getElementById('lesson-canvas').scrollIntoView({block:'center'})");await stroke('#lesson-canvas');check(await ev('window.__teachingDebug.section().strokes')===1,'鼠标拖动实际记录作图');
 await ev("document.getElementById('section-undo').scrollIntoView({block:'center'})");await click('#section-undo');check(await ev('window.__teachingDebug.section().strokes')===0,'作图撤销');await ev("document.getElementById('lesson-canvas').scrollIntoView({block:'center'})");await stroke('#lesson-canvas');
 const sectionImage=await pixels();await select('#teaching-section-mode','names');check(await pixels()!==sectionImage,'隐藏名称剖面显示参考路径与箭头');await select('#teaching-section-mode','arrows');await select('#teaching-section-mode','blank');
 await ev("document.getElementById('section-check').scrollIntoView({block:'center'})");await click('#section-check');check(await ev("!document.getElementById('section-rubric').hidden&&window.__teachingDebug.section().automaticScore===false"),'自由作图按依据核对，不伪造自动评分');await shot('section-drawing.png');
 await click('[data-lesson-tab="monsoon"]');await select('#teaching-monsoon-view','compare');await click('#teaching-pressure-reference');
 check(await ev("document.getElementById('lesson-playbar').hidden&&document.getElementById('lesson-explanation').textContent.includes('1月')&&document.getElementById('lesson-explanation').textContent.includes('7月')"),'1月7月对照与理想气压带参考');await shot('pressure-maps.png');
 await select('#teaching-monsoon-view','monsoon');await select('#lesson-region','south');await select('#lesson-monsoon-season','summer');await click('#lesson-add-surface');await sleep(500);await click('#lesson-play');check((await state()).surface==='real'&&(await state()).phase.includes('跨赤道'),'南亚夏季跨赤道背景与推导');await shot('south-monsoon.png');
 await click('[data-lesson-tab="season"]');await select('#teaching-site','south');await click('[data-season="summer"]');await waitStopped();
 check(await ev("document.getElementById('teaching-site-heading').textContent.includes('冬季')"),'南半球固定地点7月判断为冬季');await click('#teaching-site-reveal');check(await ev("document.getElementById('teaching-site-answer').textContent.includes('西风')"),'固定地点解释控制带与水汽');await shot('season-site.png');
 await click('[data-lesson-tab="climate"]');await select('#lesson-climate','med');await select('#teaching-site','south');await click('[data-climate-season="summer"]');await click('#lesson-play');await waitStopped();
 check((await state()).phase.includes('冬季')&&await ev("document.getElementById('teaching-site-heading').textContent.includes('冬季')"),'南半球7月气候解释与固定地点一致');await shot('climate-chart.png');
 await click('[data-lesson-tab="quiz"]');check((await state()).quiz.total===17,'分层练习新增高空风、海陆带状分布、南半球月份题');await select('#teaching-quiz-level','transfer');
 check(await ev("[...document.querySelectorAll('.lesson-grid article')].filter(e=>!e.hidden).length===6"),'迁移层筛选任务');
 await ev("document.getElementById('teaching-wind-task').scrollIntoView({block:'center'})");await stroke('#teaching-wind-task');check(await ev('window.__teachingDebug.download().wind.length')===1,'陌生气压图可作图并保留作答');await shot('wind-task.png');
 const evidence=await ev('window.__teachingDebug.download()');check(evidence.section.length===1&&evidence.wind.length===1&&evidence.quiz.total===17,'作答导出包含两类作图与练习记录');
 await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:out});await ev("document.getElementById('teaching-evidence').click();document.getElementById('teaching-worksheet').click()");await sleep(500);
 await click('[data-route="one"]');check(await ev("document.querySelector('[data-lesson-tab=monsoon]').hidden&&!document.querySelector('[data-lesson-tab=section]').hidden"),'第一课时路线聚焦形成分布');await click('[data-route="two"]');check((await state()).tab==='season'&&await ev("document.querySelector('[data-lesson-tab=pressure]').hidden"),'第二课时路线从季节移动开始');await click('[data-route="all"]');
 await click('#lesson-close');
 for(const [w,h] of [[1366,768],[390,844],[844,390]]){await viewport(w,h);await click('#lesson-open');await click('[data-lesson-tab="pressure"]');await click('#lesson-step-next');await waitStopped();check((await state()).elapsed===2.4,w+'×'+h+'关键控制可点击');await click('[data-lesson-tab="section"]');await select('#teaching-section-mode','blank');await ev("document.getElementById('lesson-canvas').scrollIntoView({block:'center'})");await stroke('#lesson-canvas');check(await ev('window.__teachingDebug.section().strokes')>0,w+'×'+h+'独立作图正常');await shot('layout-'+w+'.png');await click('#lesson-close');}
 await viewport(1366,768);await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});const local=pathToFileURL(resolve('三圈环流3D交互式教学平台.html'));local.searchParams.set('state','explore');await nav(local.href);await click('#lesson-open');await click('[data-lesson-tab="monsoon"]');await select('#teaching-monsoon-view','compare');check(await ev("document.querySelector('#lesson-body .model-assumptions').textContent.includes('海陆')"),'断网双击教材气压对照正常');
 check(report.errors.length===0,'全部教学操作无未捕获异常',report.errors);
}catch(e){report.errors.push(String(e));check(false,'检查执行',String(e));}finally{report.passed=report.errors.length===0&&report.checks.every(x=>x.ok);await writeFile(join(out,'check.json'),JSON.stringify(report,null,2));ws?.close();chrome.kill();}
console.log(`教学改进验收：${report.passed?'通过':'未通过'}；${report.checks.filter(x=>x.ok).length}/${report.checks.length}`);process.exitCode=report.passed?0:1;
