// 问题修复专项回归：实际点击、气流方向、暂停、图层、性能、小屏、焦点及失败启动。
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
const url=process.argv[2]||'http://127.0.0.1:8123/';
const out=resolve(process.argv[3]||'.verify-review-fixes');await mkdir(out,{recursive:true});
const report={browser:'',checks:[],errors:[],screenshots:[]};
const check=(ok,name,evidence)=>{report.checks.push({ok,name,evidence});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
async function browser(disableGL=false){
 const port=10000+process.pid%1000+(disableGL?1000:0);
 const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check',...(disableGL?['--disable-webgl']:[]),`--remote-debugging-port=${port}`,`--user-data-dir=${join(out,disableGL?'profile-no-gl':'profile-main')}`,'about:blank'],{stdio:'ignore',windowsHide:true});
 let ws;
 try{
  let tab;for(let i=0;i<50;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'});if(r.ok){tab=await r.json();break;}}catch{}await sleep(200);}if(!tab)throw Error('浏览器未启动');
  ws=new WebSocket(tab.webSocketDebuggerUrl);let id=0;const pending=new Map();
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);});await new Promise(r=>ws.addEventListener('open',r));
  const send=(method,params={})=>new Promise((resolve,reject)=>{const k=++id;pending.set(k,{resolve,reject});ws.send(JSON.stringify({id:k,method,params}));});
  const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const viewport=async(width,height)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await sleep(300);};
  const navigate=async(q='')=>{await send('Page.navigate',{url:new URL(q,url).href});for(let i=0;i<70;i++){const ready=await ev(disableGL?"document.getElementById('loading-screen')?.classList.contains('failed')":"!!window.__lessonDebug&&document.getElementById('loading-screen').classList.contains('hidden')");if(ready){if(!disableGL)await sleep(1900);return;}await sleep(200);}throw Error('页面未就绪');};
  const hit=async s=>ev(`(()=>{const e=document.querySelector(${JSON.stringify(s)}),r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return{ok:r.width>0&&r.height>0&&x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&e.contains(document.elementFromPoint(x,y)),x,y,rect:r.toJSON()}})()`);
  const click=async(s,scroll=false)=>{if(scroll)await ev(`document.querySelector(${JSON.stringify(s)}).scrollIntoView({block:'nearest',inline:'nearest'})`);const h=await hit(s);if(!h.ok)throw Error(`按钮无法点击 ${s}: ${JSON.stringify(h)}`);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:h.x,y:h.y});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:h.x,y:h.y});};
  const key=async k=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:k,code:k==='Tab'?'Tab':'Key'+k.toUpperCase(),windowsVirtualKeyCode:k==='Tab'?9:k.toUpperCase().charCodeAt(0)});await send('Input.dispatchKeyEvent',{type:'keyUp',key:k,code:k==='Tab'?'Tab':'Key'+k.toUpperCase(),windowsVirtualKeyCode:k==='Tab'?9:k.toUpperCase().charCodeAt(0)});};
  const select=(s,v)=>ev(`(()=>{const e=document.querySelector(${JSON.stringify(s)});e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(out,name),Buffer.from(r.data,'base64'));report.screenshots.push(name);};
  await send('Runtime.enable');await send('Page.enable');report.browser=(await send('Browser.getVersion')).product;await viewport(1366,768);
  if(disableGL){
   await navigate('?state=guided');check(await ev("document.querySelector('#loading-screen.failed[role=alert]')!==null&&getComputedStyle(document.querySelector('.progress-bar')).display==='none'&&getComputedStyle(document.getElementById('loading-percent')).display==='none'&&document.getElementById('loading-retry').textContent==='重新加载'"),'WebGL不可用显示错误，退出进度展示并提供重试');
   check((await hit('#loading-retry')).ok,'重试按钮真实可点击');await shot('webgl-error.png');return;
  }
  await navigate();await click('#btn-start-guided');await sleep(650);await click('#sn-continue');await sleep(500);
  check(await ev('window.__threeCellDebug.STATE.step===0&&window.__threeCellDebug.STATE.singleDemo.elapsed>0'),'欢迎引导阅读后播放第一步，不跳过单圈');
  await navigate('?state=guided');await sleep(1800);await click('#teacher-toggle');await sleep(400);await click('#tc-play');await sleep(400);
  check(await ev('window.__threeCellDebug.STATE.singleDemo.running&&window.__threeCellDebug.STATE.singleDemo.elapsed>0'),'教师播放可启动第一步');
  await click('#single-demo-play');const paused=await ev('window.__threeCellDebug.STATE.singleDemo.elapsed');await sleep(250);
  check(await ev('window.__threeCellDebug.STATE.singleDemo.elapsed')===paused,'局部暂停冻结第一步');await click('#tc-play');await sleep(350);
  check(await ev('window.__threeCellDebug.STATE.singleDemo.elapsed')>paused,'教师播放继续局部暂停的第一步');await click('#tc-pause');const t=await ev('window.__threeCellDebug.STATE.singleDemo.elapsed');await sleep(250);
  check(await ev('window.__threeCellDebug.STATE.singleDemo.elapsed')===t,'教师暂停冻结第一步');
  // 用实际路径独立验证四种运动及端点连续性，两半球一致。
  const geometry=await ev(`(()=>{const d=window.__threeCellDebug,point=(t,h)=>d.getSingleDropPosition(t,0,h,0),r=p=>p.length(),lat=p=>Math.asin(p.y/r(p))*180/Math.PI;return[1,-1].map(h=>{const a=point(.08,h),b=point(.081,h),c=point(.3,h),e=point(.301,h),f=point(.58,h),g=point(.581,h),j=point(.8,h),k=point(.801,h);return{h,rise:r(b)-r(a),upperLat:(lat(e)-lat(c))*h,upperHeight:r(e)-r(c),sink:r(g)-r(f),sinkLat:lat(f),returnLat:(lat(k)-lat(j))*h,returnHeight:r(k)-r(j),closed:point(0,h).distanceTo(point(1,h)),jumps:[.16,.5,.66].map(t=>point(t-.000001,h).distanceTo(point(t+.000001,h)))}})})()`);
  check(geometry.every(x=>x.rise>0&&x.upperLat>0&&Math.abs(x.upperHeight)<1e-8&&x.sink<0&&Math.abs(x.sinkLat*x.h-90)<1e-6&&x.returnLat<0&&Math.abs(x.returnHeight)<1e-8&&x.closed<1e-8&&x.jumps.every(j=>j<1e-4)),'两半球上升、高空输送、极地下沉、近地面回流连续且方向正确',geometry);
  await ev('window.__threeCellDebug.STATE.singleDemo.elapsed=6.2;window.__threeCellDebug.STATE.singleDemo.node=2');await sleep(100);
  const focused=await ev(`(()=>{const d=window.__threeCellDebug;return['singleNH','singleSH'].flatMap(key=>d.cellObjects[key].arrows.filter(a=>a.mesh.children[0].material.opacity>.9).map(a=>{const p=d.getSingleDropPosition(a.phase,0,d.cellObjects[key].hemisphere,0),q=d.getSingleDropPosition(a.phase+.0001,0,d.cellObjects[key].hemisphere,0);return{lat:Math.asin(p.y/p.length())*180/Math.PI,radial:q.length()-p.length()}}))})()`);
  check(focused.length>0&&focused.every(a=>Math.abs(Math.abs(a.lat)-90)<1e-6&&a.radial<0),'下沉阶段高亮实际极地径向下沉箭头',focused);await shot('polar-descent.png');
  await navigate('?state=explore');await sleep(1800);await ev('window.__threeCellDebug.transitionToStep(2)');await click('#tog-labels');await sleep(150);
  check(await ev("[...window.__threeCellDebug.latLabels,...window.__threeCellDebug.pressureLabels,...window.__threeCellDebug.windLabels].every(l=>!l.obj.visible)"),'关闭标注隐藏全部纬度、气压带及风带文字');
  check(await ev('window.__threeCellDebug.STATE.showPressure&&window.__threeCellDebug.beltVisibility().some(b=>b.visible>0)'),'标注关闭后保留气压带图形');
  await click('#tog-pressure');await click('#tog-pressure');await sleep(100);check(await ev('window.__threeCellDebug.pressureLabels.every(l=>!l.obj.visible)'),'切换气压带不会绕过标注关闭状态');await click('#tog-labels');await sleep(100);check(await ev('window.__threeCellDebug.pressureLabels.some(l=>l.obj.visible)&&window.__threeCellDebug.windLabels.some(l=>l.obj.visible)'),'重新开启标注恢复对应文字');
  await click('#teacher-toggle');await sleep(400);await click('#tc-pause');await click('#btn-mode');
  const counts=()=>ev("Object.values(window.__threeCellDebug.cellObjects).map(c=>({active:c.activeParticleCount,draw:c.particles.geometry.drawRange.count,stripe:c.tubes[0].mesh.material.uniforms.uLowPerf.value,size:c.particles.material.size}))");
  await select('#density-select','dense');const full=await counts();await click('#perf-toggle');const low=await counts();
  check(low.every((x,i)=>x.draw===Math.floor(full[i].draw*.4)&&x.active===x.draw&&x.stripe===0&&x.size>full[i].size),'暂停时省电立即减少绘制和更新量、关闭条纹并调整大小',{full,low});
  await select('#density-select','sparse');const sparse=await counts();check(sparse.every((x,i)=>x.draw===Math.floor(full[i].draw*.5*.4)),'稀疏密度与省电叠加');await click('#perf-toggle');const restored=await counts();check(restored.every((x,i)=>x.draw===Math.floor(full[i].draw*.5)&&x.stripe===1),'退出省电恢复当前密度和条纹');
  await ev("document.getElementById('speed-slider').value=20;document.getElementById('speed-slider').dispatchEvent(new Event('input'));document.getElementById('coriolis-slider').value=45;document.getElementById('coriolis-slider').dispatchEvent(new Event('input'));document.getElementById('rotation-slider').value=20;document.getElementById('rotation-slider').dispatchEvent(new Event('input'))");await click('#tc-lock-view');await click('#perf-toggle');await click('#projection-toggle');await key('r');await sleep(1300);
  check(await ev("(()=>{const s=window.__threeCellDebug.STATE;return s.step===0&&s.mode==='guided'&&s.speed===1&&s.coriolisDeflection===12&&s.density==='medium'&&!s.lowPerf&&!s.viewLocked&&s.playing&&s.earthRotationSpeed===.0004&&!document.body.classList.contains('projection')&&document.getElementById('speed-slider').value==='10'&&document.getElementById('rotation-slider').value==='2'&&document.getElementById('density-select').value==='medium'&&document.getElementById('coriolis-slider').value==='12'})()"),'重置恢复默认步骤、参数、解锁、播放和投屏省电状态');
  check((await counts()).every((x,i)=>x.draw===Math.floor(full[i].draw*.75)&&x.stripe===1),'重置恢复默认中等粒子密度');
  for(const [w,h] of [[360,640],[390,844],[844,390]]){
   await viewport(w,h);await navigate('?state=explore');await sleep(1800);
   if(w<=600){const p=await ev("({panel:document.getElementById('step-panel').getBoundingClientRect().toJSON(),control:document.getElementById('control-panel').getBoundingClientRect().toJSON()})");check(p.panel.bottom<p.control.top,`${w}×${h}讲解面板与底部控制无重叠`,p);}
   await click('#mechanism-demo-play');await sleep(200);check(await ev('window.__threeCellDebug.STATE.mechanismDemo.elapsed>0'),`${w}×${h}实际点击三维过程播放`);await shot(`main-${w}x${h}.png`);
   await click('#lesson-open');check(await ev('document.getElementById("lesson-body").clientHeight>100'),`${w}×${h}课堂正文保留可阅读空间`);
   await click('#lesson-play');await sleep(200);check(await ev('window.__lessonDebug.state.elapsed>0'),`${w}×${h}课堂播放实际推进`);await click('#lesson-replay');await click('#lesson-next');check(await ev("window.__lessonDebug.state.tab==='wind'"),`${w}×${h}重播和下一主题实际可点击`);await shot(`lesson-${w}x${h}.png`);
   if(w<=600)check(await ev("document.getElementById('lesson-canvas').clientWidth===960&&document.querySelector('.lesson-visual').scrollWidth>document.querySelector('.lesson-visual').clientWidth"),`${w}×${h}图示保留原文字尺寸并可横向浏览`);
   if(w<=600){await click('[data-lesson-tab="quiz"]',true);check(await ev("window.__lessonDebug.state.tab==='quiz'"),`${w}×${h}主题横向滚动可达练习`);}
   await click('#lesson-close');await click('#teacher-toggle');await sleep(400);check((await hit('#tc-lock-view')).ok&&(await hit('#tc-demo')).ok,`${w}×${h}教师锁定与演示按钮可达`);
   await click('#tc-lock-view');check(await ev('window.__threeCellDebug.STATE.viewLocked'),`${w}×${h}教师锁定实际生效`);await shot(`teacher-${w}x${h}.png`);
  }
  await viewport(1366,768);await navigate('?state=explore');await sleep(1800);const focuses=[];
  for(let i=0;i<18;i++){await key('Tab');focuses.push(await ev("({id:document.activeElement.id,visible:getComputedStyle(document.activeElement).visibility,hiddenRegion:!!document.activeElement.closest('#welcome-modal,#video-modal,#teacher-bar,#diagram-panel.closed')})"));}
  check(focuses.every(x=>x.visible==='visible'&&!x.hiddenRegion),'Tab跳过隐藏欢迎页、教师栏、视频及关闭练习',focuses);
  await click('#teacher-toggle');await sleep(400);await ev("document.getElementById('tc-play').focus()");await click('#teacher-toggle');await sleep(400);await key('Tab');check(await ev("!document.activeElement.closest('#teacher-bar')"),'收起教师栏后Tab不进入隐藏控件');
 }finally{ws?.close();chrome.kill();}
}
try{await browser();await browser(true);check(report.errors.length===0,'正常及失败启动均无未捕获异常',report.errors);}catch(e){report.errors.push(String(e));check(false,'专项执行',String(e));}
report.passed=report.errors.length===0&&report.checks.every(x=>x.ok);await writeFile(join(out,'check.json'),JSON.stringify(report,null,2));console.log(`专项回归：${report.passed?'通过':'未通过'}；${report.checks.filter(x=>x.ok).length}/${report.checks.length}`);process.exitCode=report.passed?0:1;
