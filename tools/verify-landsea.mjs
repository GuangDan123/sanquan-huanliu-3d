// 第四步浏览器验收：离线成品、冬夏切换、地理位置、图层、暂停和步骤回退。
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {setTimeout as sleep} from 'node:timers/promises';
const out=resolve(process.argv[2]||'artifacts/landsea-step4-20261009');await mkdir(out,{recursive:true});
const report={checks:[],errors:[]},port=14000+process.pid%1000;
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,`--user-data-dir=${join(out,'profile')}`,'about:blank'],{stdio:'ignore',windowsHide:true});
let ws;
const check=(ok,name,evidence)=>{report.checks.push({ok,name,evidence});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
try{
 let tab;for(let i=0;i<60;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'});if(r.ok){tab=await r.json();break;}}catch{}await sleep(200);}if(!tab)throw Error('浏览器未启动');
 ws=new WebSocket(tab.webSocketDebuggerUrl);let id=0;const pending=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')report.errors.push(m.params.entry);});await new Promise(r=>ws.addEventListener('open',r));
 const send=(method,params={})=>new Promise((resolve,reject)=>{const k=++id;pending.set(k,{resolve,reject});ws.send(JSON.stringify({id:k,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(out,name),Buffer.from(r.data,'base64'));};
 const click=async selector=>{await ev(`(()=>{let p=document.querySelector(${JSON.stringify(selector)})?.parentElement;while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement;}})()`);await ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest'})`);check(await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})()`),'控件可见且可点击 '+selector);await ev(`document.querySelector(${JSON.stringify(selector)}).click()`);await sleep(200);};
 await send('Runtime.enable');await send('Log.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 await send('Page.navigate',{url:pathToFileURL(resolve('三圈环流3D交互式教学平台.html')).href+'?state=landsea'});
 for(let i=0;i<80;i++){if(await ev('window.__threeCellDebug?.STATE.step===3'))break;await sleep(200);}await sleep(900);
 check(await ev("window.__threeCellDebug.STATE.step===3&&document.querySelectorAll('.step-dot').length===5&&document.getElementById('sp-tag').textContent==='STEP 4 / 5'"),'离线直接进入第四步，五个主步骤与面板同步');
 await ev("document.getElementById('landsea-formation-view').value='result';document.getElementById('landsea-formation-view').dispatchEvent(new Event('change'))");
 await ev('window.__threeCellDebug.STATE.playing=false');await shot('january-asia.png');
 const january=await ev('({centers:window.__landSeaDebug.centers(),asia:window.__landSeaDebug.pressureAt(50,95),pacific:window.__landSeaDebug.pressureAt(52,-170)})');
 check(january.asia>1028&&january.pacific<1000,'1月亚洲高压与阿留申低压',january);
 check(await ev("window.__threeCellDebug.getDiagnostics().visibleGroups.length===0&&!window.__threeCellDebug.getSunDiagnostics().arrowTargets.some(a=>a.radiation.enabled)&&window.__landSeaDebug.group.visible"),'第四步显示海陆球面并隐藏三圈');
 check(await ev("window.__landSeaDebug.labels.filter(o=>o.element.classList.contains('landsea-center')).every(o=>{const p=o.position,r=Math.hypot(p.x,p.y,p.z);return Math.abs(r-5.18)<.01})"),'气压中心固定在地球地理坐标');
 await click('[data-landsea-month="7"]');await shot('july-asia.png');
 const july=await ev('({month:window.__landSeaDebug.state.month,asia:window.__landSeaDebug.pressureAt(28,75),pacific:window.__landSeaDebug.pressureAt(32,-155),text:document.getElementById("sp-body").textContent})');
 check(july.month===7&&july.asia<1000&&july.pacific>1028&&july.text.includes('海洋流向大陆低压'),'7月大陆热低压、海洋高压与海洋来风',july);
 check(await ev('window.__landSeaDebug.travelers.length>=6'),'季风曲线与流动箭头已创建');
 check(await ev('window.__landSeaDebug.travelers.every(({curve})=>[0,.25,.5,.75,1].every(t=>Math.abs(curve.getPoint(t).length()-5.19)<.001))'),'跨赤道与季风路径全程贴球面，不穿入地球');
 const paused=await ev('window.__landSeaDebug.state.phase');await sleep(300);check(paused===await ev('window.__landSeaDebug.state.phase'),'暂停冻结近地面气流');
 await click('#landsea-play');await sleep(350);check(paused!==await ev('window.__landSeaDebug.state.phase'),'播放恢复气流');await click('#landsea-play');
 await ev("document.getElementById('landsea-surface').value='ideal';document.getElementById('landsea-surface').dispatchEvent(new Event('change'))");
 check(await ev("Math.abs(window.__landSeaDebug.pressureAt(30,0)-window.__landSeaDebug.pressureAt(30,110))<1e-8&&window.__landSeaDebug.travelers.length===0"),'理想地表按纬度连续分布，无区域季风');await shot('ideal-belts.png');
 await ev("document.getElementById('landsea-surface').value='real';document.getElementById('landsea-surface').dispatchEvent(new Event('change'))");await click('#landsea-reference');check(await ev('window.__landSeaDebug.state.reference&&window.__landSeaDebug.group.children[3].visible'),'理想气压带参考叠加');
 await click('#tog-pressure');check(await ev('!window.__landSeaDebug.group.children[0].visible&&!window.__landSeaDebug.group.children[1].visible'),'气压场图层可隐藏');await click('#tog-pressure');
 await click('#tog-labels');check(await ev('window.__landSeaDebug.labels.every(o=>!o.visible)'),'标注图层可隐藏');await click('#tog-labels');
 await click('#tog-paths');check(await ev('!window.__landSeaDebug.group.children[2].visible'),'气流路径可隐藏');await click('#tog-paths');
 await click('#tog-legend');check(await ev('document.getElementById("landsea-legend").hidden'),'图例可隐藏');await click('#tog-legend');
 await click('#landsea-related');check(await ev('window.__lessonDebug.state.open&&window.__lessonDebug.state.tab==="monsoon"'),'第四步连接冬夏读图练习');await click('#teaching-to-landsea');check(await ev('!window.__lessonDebug.state.open&&window.__threeCellDebug.STATE.step===3&&window.__landSeaDebug.state.month===7'),'读图练习返回第四步并保留月份');
 await click('#landsea-prev');check(await ev('window.__threeCellDebug.STATE.step===2&&window.__threeCellDebug.getDiagnostics().visibleGroups.length===3&&!window.__landSeaDebug.group.visible&&!document.body.classList.contains("landsea-active")'),'回到第三步恢复三个圈和气压带');await shot('return-step3.png');
 await click('[data-step="3"]');await ev('window.__landSeaDebug.focus("pacific")');await sleep(250);await shot('july-pacific.png');
 for(const [width,height]of[[1366,768],[760,800],[390,844]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await sleep(450);await ev('window.__landSeaDebug.focus("asia")');await sleep(200);
  check(await ev('(()=>{const c=document.getElementById("control-panel").getBoundingClientRect(),b=document.querySelector(".step-dot:last-child").getBoundingClientRect(),p=document.getElementById("step-panel").getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.bottom<=innerHeight&&p.right<=innerWidth&&c.right<=innerWidth})()'),`${width}×${height} 第四步导航和面板在窗口内`);await shot(`${width}-july.png`);
 }
 check(report.errors.length===0,'无脚本或WebGL错误',report.errors);
}catch(e){report.errors.push(String(e));check(false,'验收执行',String(e));}finally{report.passed=report.errors.length===0&&report.checks.every(x=>x.ok);await writeFile(join(out,'check.json'),JSON.stringify(report,null,2));ws?.close();chrome.kill();}
console.log(`海陆第四步验收：${report.passed?'通过':'未通过'}；${report.checks.filter(x=>x.ok).length}/${report.checks.length}`);process.exitCode=report.passed?0:1;
