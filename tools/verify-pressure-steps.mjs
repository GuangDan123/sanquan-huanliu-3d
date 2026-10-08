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
const port=13000+process.pid%1000;
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
 await send('Runtime.enable');await send('Page.enable');await viewport(1366,768);await nav(new URL('?state=explore',url).href);await speed();await click('#lesson-open');
 check((await state()).pressureStep===0&&(await state()).elapsed===0&&await ev("document.getElementById('lesson-step-prev').disabled&&!document.getElementById('lesson-step-next').disabled"),'初始下一步可点击，无需先重播');
 await shot('initial.png');
 await click('#lesson-step-next');await sleep(250);check((await state()).pressureStep===0&&(await state()).running&&(await state()).elapsed>0,'直接点击下一步从第一步开始播放');
 await ev("document.getElementById('lesson-step-next').click()");check((await state()).pressureStep===0&&await ev("document.getElementById('lesson-step-next').disabled"),'播放期间连续点击不会跳过当前步骤');
 await click('#lesson-play');const paused=await state(),frozen=await pixels();await sleep(300);
 check(!paused.running&&paused.elapsed>0&&(await state()).elapsed===paused.elapsed&&await pixels()===frozen,'本步中途暂停冻结时间和图像');
 await click('#lesson-step-next');check((await state()).pressureStep===0&&(await state()).running&&(await state()).elapsed>=paused.elapsed,'暂停后下一步继续当前步骤，保留进度');await waitStopped();const first=await state(),firstImage=await pixels();await sleep(500);
 check(first.elapsed===2.4&&first.pressureStep===0&&!first.complete&&first.phase.startsWith('①')&&(await state()).elapsed===2.4&&await pixels()===firstImage,'第一步播完停住，保持完整推动箭头');await shot('step1.png');
 await click('#lesson-step-next');await waitStopped();const second=await state(),secondImage=await pixels();await sleep(500);
 check(second.pressureStep===1&&second.elapsed===5.2&&!second.complete&&second.phase.startsWith('②')&&(await state()).elapsed===5.2&&secondImage!==firstImage&&await pixels()===secondImage,'第二步播完停住，等待教师加入摩擦');await shot('step2.png');
 await click('#lesson-step-next');await waitStopped();const third=await state(),thirdImage=await pixels();
 check(third.pressureStep===2&&third.complete&&third.elapsed===8&&third.phase.startsWith('③')&&thirdImage!==secondImage&&await ev("document.getElementById('lesson-step-next').disabled"),'第三步完整结束，禁止继续越界');await shot('step3.png');
 await click('#lesson-step-prev');check((await state()).pressureStep===1&&!(await state()).running&&!(await state()).complete&&await pixels()===secondImage,'上一步回到偏转完成画面，清除摩擦');
 await click('#lesson-step-prev');check((await state()).pressureStep===0&&await pixels()===firstImage,'再次回退保留第一步完整画面');
 await click('#lesson-step-next');await sleep(150);await click('#lesson-step-replay');check((await state()).pressureStep===1&&(await state()).elapsed<2.9&&(await state()).running,'重播本步只重演偏转，保留前一步');await waitStopped();
 await click('#lesson-reveal');check(await ev("!document.getElementById('lesson-explanation').hidden"),'分步操作后解释仍可展开');
 await click('#lesson-replay');await sleep(150);check((await state()).pressureStep===0&&(await state()).elapsed<.7&&!(await state()).complete,'从头重播回到第一步');await waitStopped();
 await click('[data-lesson-tab="wind"]');await click('#lesson-play');await sleep(150);check((await state()).tab==='wind'&&(await state()).running,'其他主题继续正常播放');await click('[data-lesson-tab="pressure"]');check((await state()).elapsed===0&&(await state()).pressureStep===0&&!(await state()).running,'重入风成因清除步骤并等待预测');
 await click('#lesson-close');await click('#projection-toggle');await click('#lesson-open');await shot('projection.png');check(await ev("document.getElementById('lesson-step-status').textContent.includes('1 / 3')"),'投屏模式保留步骤提示');await click('#lesson-close');await click('#projection-toggle');
 for(const [w,h] of [[390,844],[360,640],[844,390]]){
  await viewport(w,h);await click('#lesson-open');await click('#lesson-step-next');await waitStopped();await click('#lesson-step-next');await waitStopped();await click('#lesson-step-prev');await click('#lesson-step-replay');await waitStopped();await click('#lesson-replay');await waitStopped();
  check((await state()).pressureStep===0&&(await state()).elapsed===2.4,`${w}×${h}播放、下一步、回退、本步与从头重播实际可点击`);await shot(`${w}x${h}.png`);await click('#lesson-close');
 }
 await viewport(1366,768);await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});const local=pathToFileURL(resolve('三圈环流3D交互式教学平台.html'));local.searchParams.set('state','explore');await nav(local.href);await speed();await click('#lesson-open');await click('#lesson-step-next');await waitStopped();await click('#lesson-step-next');await waitStopped();check((await state()).pressureStep===1&&(await state()).elapsed===5.2,'断网双击入口直接点击下一步可分步播放');
 check(report.errors.length===0,'全部操作无未捕获异常',report.errors);
}catch(e){report.errors.push(String(e));check(false,'检查执行',String(e));}finally{report.passed=report.errors.length===0&&report.checks.every(x=>x.ok);await writeFile(join(out,'check.json'),JSON.stringify(report,null,2));ws?.close();chrome.kill();}
console.log(`教师分步操作：${report.passed?'通过':'未通过'}；${report.checks.filter(x=>x.ok).length}/${report.checks.length}`);process.exitCode=report.passed?0:1;
