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
const port=15000+process.pid%1000;
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

 await send('Runtime.enable');await send('Page.enable');await viewport(1600,1000);await nav(new URL('?state=explore',url).href);await click('#lesson-open');await click('[data-lesson-tab="section"]');
 check(await ev("getComputedStyle(document.getElementById('demo-overlay')).display==='none'"),'课堂打开后背景模式浮层不遮挡教材图示');
 const select=async(s,value)=>ev('(()=>{const e=document.querySelector('+JSON.stringify(s)+');e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event("change",{bubbles:true}))})()');
 await select('#teaching-section-mode','blank');await ev("document.getElementById('section-label').value='副热带高气压带';document.querySelector('[data-draw-kind=section][data-draw-tool=label]').click();document.getElementById('lesson-canvas').scrollIntoView({block:'center'})");
 await click('#lesson-canvas');check(await ev("window.__teachingDebug.download().section.some(s=>s.tool==='label'&&s.text==='副热带高气压带')"),'自填文字点击放入剖面，无候选答案');
 await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:out});await ev("document.getElementById('section-image').click()");await sleep(500);check(await ev('window.__teachingDebug.section().strokes')===1,'图示下载保留文字作答');await shot('section-label.png');
 await click('[data-lesson-tab="climate"]');await select('#lesson-climate','med');await select('#teaching-site','south');await ev("document.getElementById('teaching-climate-chart').scrollIntoView({block:'center'})");await shot('climate-materials.png');
 check(await ev("document.getElementById('teaching-climate-chart').getBoundingClientRect().top>=document.getElementById('lesson-body').getBoundingClientRect().top"),'气温降水资料滚动后完整可读');
 await click('[data-lesson-tab="monsoon"]');await select('#teaching-monsoon-view','compare');check(await ev("getComputedStyle(document.getElementById('lesson-playbar')).display==='none'&&document.getElementById('lesson-add-surface').hidden"),'气压对照页实际隐藏播放与不适用选项');await shot('pressure-maps.png');
 await select('#teaching-monsoon-view','monsoon');check(await ev("getComputedStyle(document.getElementById('lesson-playbar')).display!=='none'&&!document.getElementById('lesson-add-surface').hidden"),'返回季风恢复控制');
 await click('[data-lesson-tab="quiz"]');await ev("document.getElementById('teaching-evidence').click();document.getElementById('teaching-worksheet').click()");await sleep(500);
 await click('#lesson-close');await viewport(390,844);await click('#lesson-open');await click('[data-lesson-tab="section"]');await select('#teaching-section-mode','blank');await ev("document.querySelector('[data-draw-kind=section][data-draw-tool=arrow]').click();document.getElementById('lesson-canvas').scrollIntoView({block:'center'})");
 const before=await ev('window.__teachingDebug.section().strokes');const point=await ev("(()=>{const r=document.querySelector('.lesson-visual').getBoundingClientRect();return{x:r.x+80,y:Math.min(r.bottom-35,innerHeight-170)}})()");
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y}]});await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+35,y:point.y-40}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 check(await ev('window.__teachingDebug.section().strokes')===before+1,'模拟触摸在手机尺寸图中记录箭头');await shot('touch-drawing.png');
 check(report.errors.length===0,'材料及模拟触摸无未捕获异常',report.errors);
}catch(e){report.errors.push(String(e));check(false,'检查执行',String(e));}finally{report.passed=report.errors.length===0&&report.checks.every(x=>x.ok);await writeFile(join(out,'check.json'),JSON.stringify(report,null,2));ws?.close();chrome.kill();}
console.log(`教学材料复核：${report.passed?'通过':'未通过'}；${report.checks.filter(x=>x.ok).length}/${report.checks.length}`);process.exitCode=report.passed?0:1;
