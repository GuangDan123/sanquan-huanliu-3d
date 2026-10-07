// 浏览器功能验收：node tools/verify-acceptance.mjs [URL] [截图/报告目录]
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
const url=process.argv[2]||'http://127.0.0.1:8123/';
const out=resolve(process.argv[3]||'artifacts/acceptance');
await mkdir(out,{recursive:true});
const port=9700+process.pid%200;
const chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
  '--headless=new','--no-first-run','--no-default-browser-check',
  `--remote-debugging-port=${port}`,`--user-data-dir=${join(out,`profile-${process.pid}`)}`,'about:blank'
],{stdio:'ignore',windowsHide:true});
let ws;
const report={browser:'',checks:[],errors:[],screenshots:[]};
const check=(ok,name,evidence)=>{report.checks.push({ok,name,evidence});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
try {
  let tab;
  for(let i=0;i<40;i++){
    try{const r=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'});if(r.ok){tab=await r.json();break;}}catch{}
    await sleep(250);
  }
  if(!tab)throw new Error('Chrome 未启动');
  ws=new WebSocket(tab.webSocketDebuggerUrl);let id=0;const pending=new Map();
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);});
  await new Promise(r=>ws.addEventListener('open',r));
  const send=(method,params={})=>new Promise((resolve,reject)=>{const k=++id;pending.set(k,{resolve,reject});ws.send(JSON.stringify({id:k,method,params}));});
  const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const click=async selector=>{await ev(`document.querySelector(${JSON.stringify(selector)}).click()`);};
  const snap=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(out,name),Buffer.from(r.data,'base64'));report.screenshots.push(name);};
  const ready=async step=>{for(let i=0;i<60;i++){if(await ev(`!!window.__threeCellDebug && window.__threeCellDebug.STATE.step===${step} && document.getElementById('loading-screen').classList.contains('hidden')`))return true;await sleep(200);}return false;};
  const setViewport=async(w,h)=>{await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:false});await sleep(250);};
  await send('Runtime.enable');await send('Page.enable');
  report.browser=(await send('Browser.getVersion')).product;
  await setViewport(1366,768);
  const start=new URL(url);start.searchParams.set('state','explore');await send('Page.navigate',{url:start.href});
  check(await ready(1),'成品HTTP入口与第二步初始化');await sleep(3800);
  const state=()=>ev('window.__threeCellDebug.getDiagnostics()');
  check((await state()).mechanismStage===0,'第二步从首环节开始');
  check(await ev("getComputedStyle(document.getElementById('mechanism-explanation')).display==='none'"),'解释初始收起');
  await click('#mechanism-reveal');
  check(await ev("getComputedStyle(document.getElementById('mechanism-explanation')).display!=='none'"),'点击展开解释');
  await click('#mechanism-reveal');
  check(await ev("(()=>{const b=document.getElementById('mechanism-demo-play').getBoundingClientRect(),p=document.getElementById('step-panel').getBoundingClientRect();return b.top>=p.top&&b.bottom<=p.bottom&&document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)===document.getElementById('mechanism-demo-play');})()"),'偏转过程播放按钮可见且可点击');
  const initial=await state();
  check(initial.mechanismDemo.elapsed===0&&!initial.mechanismDemo.running&&initial.coriolisDemo.every(p=>p.referenceVisible&&Math.abs(p.longitude)<1e-8&&!p.forceVisible),'偏转环节等待预测，气团从经线起点出发');await snap('coriolis-ready.png');
  const comparison=()=>ev("document.getElementById('coriolis-comparison').toDataURL()");const comparisonInitial=await comparison();
  const playHit=await ev("(()=>{const r=document.getElementById('mechanism-demo-play').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...playHit});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...playHit});
  await sleep(1800);const early=await state();
  check(early.mechanismDemo.running&&early.mechanismDemo.elapsed>0&&early.coriolisDemo.every(p=>p.longitude>0),'真实点击播放，气团开始向东偏离经线',early.coriolisDemo);
  await sleep(3400);await click('#mechanism-demo-play');const middle=await state();
  check(middle.coriolisDemo.every((p,i)=>p.longitude>early.coriolisDemo[i].longitude&&p.position[1]*p.hemisphere>early.coriolisDemo[i].position[1]*p.hemisphere),'随向极运动逐渐积累东向偏移',middle.coriolisDemo);await snap('coriolis-deflection.png');
  const comparisonPaused=await comparison();check(comparisonPaused!==comparisonInitial,'俯视对照图随实际过程更新');
  const forceCheck=middle.coriolisDemo.map(p=>{const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),len=Math.hypot(...p.position),r=p.position.map(x=>x/len),v=p.velocity,f=p.force,cross=[v[1]*r[2]-v[2]*r[1],v[2]*r[0]-v[0]*r[2],v[0]*r[1]-v[1]*r[0]];return {hemisphere:p.hemisphere,perpendicular:dot(f,v),horizontal:dot(f,r),correctSide:dot(f,cross)*p.hemisphere,forceVisible:p.forceVisible};});
  check(forceCheck.every(p=>Math.abs(p.perpendicular)<1e-6&&Math.abs(p.horizontal)<1e-6&&p.correctSide>.99&&p.forceVisible),'偏向箭头垂直于瞬时水平气流：北右南左，不向下压',forceCheck);
  await sleep(400);const frozen=await state();
  check(frozen.mechanismDemo.elapsed===middle.mechanismDemo.elapsed&&JSON.stringify(frozen.coriolisDemo)===JSON.stringify(middle.coriolisDemo),'局部暂停冻结气团位置与偏向箭头');
  check(await comparison()===comparisonPaused,'暂停同步冻结俯视对照图');
  await click('#mechanism-reveal');check((await state()).mechanismDemo.elapsed===middle.mechanismDemo.elapsed,'展开解释保留偏转过程进度');await click('#mechanism-reveal');
  await click('[data-view="side"]');await sleep(1100);await snap('coriolis-side.png');
  await click('[data-view="front"]');await sleep(1100);await snap('coriolis-front.png');
  check(await ev("window.__threeCellDebug.mechanismLabels.filter(x=>x.obj.visible).every(x=>{const r=x.obj.element.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})"),'两半球偏转标注留在视口');
  await click('#tog-paths');await sleep(120);check(await ev('!window.__threeCellDebug.mechanismGroups[0].visible&&window.__threeCellDebug.mechanismLabels.every(x=>!x.obj.visible)'),'偏转轨迹图层关闭时标注同步隐藏');await click('#tog-paths');
  await click('#tog-particles');await sleep(120);check(await ev("window.__threeCellDebug.mechanismGroups[0].children.filter(x=>x.isPoints||x.isMesh&&x.geometry.type==='SphereGeometry').every(x=>!x.visible)"),'偏转过程粒子开关控制气团与示踪');await click('#tog-particles');
  await click('#tc-play');await sleep(350);await click('#tc-pause');const teacherPaused=await state();await sleep(350);
  check((await state()).mechanismDemo.elapsed===teacherPaused.mechanismDemo.elapsed&&teacherPaused.mechanismDemo.elapsed>middle.mechanismDemo.elapsed,'教师继续及暂停同步控制偏转过程');
  await click('#mechanism-demo-play');await sleep(5700);const done=await state();
  check(done.mechanismDemo.complete&&done.mechanismStage===0&&done.visibleGroups.length===0&&done.coriolisDemo.every(p=>Math.abs(p.longitude-24)<1e-6),'完成偏转停留首环节，两半球获得东向分量且不出现完整圈',done.coriolisDemo);await snap('coriolis-complete.png');
  await click('#mechanism-demo-replay');await sleep(300);await click('#mechanism-demo-play');const restarted=await state();
  check(restarted.mechanismDemo.elapsed<1&&!restarted.mechanismDemo.complete&&restarted.coriolisDemo.every(p=>p.longitude<1),'偏转重播清除旧轨迹，从低纬重新出发');
  await ev("(()=>{const s=document.getElementById('coriolis-slider');s.value=0;s.dispatchEvent(new Event('input',{bubbles:true}));})()");
  await click('#mechanism-demo-replay');await sleep(1000);await click('#mechanism-demo-play');const noForce=await state();
  check(noForce.coriolisDemo.every(p=>Math.abs(p.longitude)<1e-8&&!p.forceVisible),'弯曲为0时沿参考经线运动，关闭偏向箭头',noForce.coriolisDemo);
  await ev("(()=>{const s=document.getElementById('coriolis-slider');s.value=12;s.dispatchEvent(new Event('input',{bubbles:true}));})()");
  for(let i=0;i<4;i++){
    if(i)await click('#mechanism-next');await sleep(200);
    const d=await state();
    const expected=[[],[],['hadleyNH'],['hadleyNH','ferrelNH','polarNH']][i];
    check(d.mechanismStage===i&&JSON.stringify(d.visibleGroups)===JSON.stringify(expected),`环节${i+1}逐段呈现`,d.visibleGroups);
    if(i===1){
      await sleep(350);const waiting=await state();
      check(waiting.mechanismDemo.elapsed===0&&!waiting.mechanismDemo.running&&waiting.visibleGroups.length===0,'30°环节等待预测，不提前显示完整圈');
      check(await ev("(()=>{const b=document.getElementById('mechanism-demo-play').getBoundingClientRect(),p=document.getElementById('step-panel').getBoundingClientRect();return b.top>=p.top&&b.bottom<=p.bottom;})()"),'30°播放按钮直接可见');
      await ev("document.getElementById('mechanism-demo-play').scrollIntoView({block:'nearest'})");
      const hit=await ev("(()=>{const e=document.getElementById('mechanism-demo-play'),r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
      await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...hit});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...hit});
      await sleep(3000);const buildup=await state();
      check(buildup.mechanismDemo.phase===1&&buildup.visibleGroups.length===0,'气流先汇入积聚，哈德莱圈尚未出现',buildup.mechanismDemo);await snap('30-buildup.png');
      const tracerPosition=()=>ev("Array.from(window.__threeCellDebug.mechanismGroups[1].children.find(x=>x.userData.kind==='upper').userData.tracer.geometry.attributes.position.array.slice(0,3))");
      const movingBefore=await tracerPosition();await sleep(180);const movingAfter=await tracerPosition();
      check(JSON.stringify(movingBefore)!==JSON.stringify(movingAfter),'高空气流示踪沿实际路径移动',{movingBefore,movingAfter});
      await click('#mechanism-demo-play');const paused=await state();await sleep(450);const pausedAfter=await state();
      check(pausedAfter.mechanismDemo.elapsed===paused.mechanismDemo.elapsed&&!pausedAfter.playing,'过程按钮暂停冻结时间');
      await click('#mechanism-demo-play');await sleep(2700);const sinking=await state();
      const paths=await ev("window.__threeCellDebug.mechanismGroups[1].children.filter(x=>x.userData.kind).map(x=>({kind:x.userData.kind,visible:x.visible,drawn:x.geometry.drawRange.count,total:x.geometry.index.count}))");
      check(sinking.mechanismDemo.phase===2&&paths.some(x=>x.kind==='sink'&&x.drawn>0&&x.drawn<x.total)&&paths.filter(x=>x.kind==='trade'||x.kind==='westerly').every(x=>!x.visible),'下沉路径逐段展开，近地面分流尚未出现',{demo:sinking.mechanismDemo,paths});await snap('30-sinking.png');
      await click('#tc-pause');const globalPaused=await state();await sleep(350);
      check((await state()).mechanismDemo.elapsed===globalPaused.mechanismDemo.elapsed,'教师暂停同步冻结过程');await click('#tc-play');
      await sleep(3000);const splitting=await state();
      check(splitting.mechanismDemo.phase===3&&splitting.visibleGroups.length===0,'到达地面后再分流，完整圈仍未出现',splitting.mechanismDemo);await snap('30-split.png');
      await sleep(4600);const complete=await state();
      check(complete.mechanismDemo.complete&&complete.mechanismStage===1&&JSON.stringify(complete.visibleGroups)===JSON.stringify(['hadleyNH']),'过程完成归纳哈德莱圈，停留当前环节',complete.mechanismDemo);await snap('30-complete.png');
      await click('#mechanism-demo-replay');await sleep(400);const replay=await state();
      check(replay.mechanismDemo.elapsed<1&&replay.mechanismDemo.running&&!replay.mechanismDemo.complete&&replay.visibleGroups.length===0,'从头重播清除高压与完整圈');
      await click('#tc-pause');await click('#mechanism-prev');await click('#mechanism-next');const reenter=await state();
      check(reenter.mechanismDemo.elapsed===0&&!reenter.mechanismDemo.running,'回退后重入30°过程重新等待预测');await click('#tc-play');
    }
    if(i===2){
      check(d.mechanismDemo.elapsed===0&&!d.mechanismDemo.running&&!d.visibleGroups.includes('polarNH'),'60°环节等待预测，不提前显示高纬完整圈');
      await click('#mechanism-demo-play');await sleep(1500);await click('#mechanism-demo-play');const converging=await state();
      check(converging.mechanismDemo.phase===1&&await ev("window.__threeCellDebug.mechanismGroups[2].children.filter(x=>x.userData.kind==='rise').every(x=>!x.visible)"),'60°先辐合，抬升尚未出现');await snap('60-converging.png');
      const front=await ev("document.getElementById('polar-front').toDataURL()");await sleep(300);
      check((await state()).mechanismDemo.elapsed===converging.mechanismDemo.elapsed&&await ev("document.getElementById('polar-front').toDataURL()")===front,'60°暂停冻结三维过程与局部剖面');
      await click('#mechanism-demo-play');await sleep(3800);await click('#mechanism-demo-play');const lifting=await state();
      check(lifting.mechanismDemo.phase===2&&!lifting.visibleGroups.includes('polarNH')&&await ev("window.__threeCellDebug.mechanismGroups[2].children.filter(x=>x.userData.kind==='rise').every(x=>x.visible&&x.geometry.drawRange.count>0&&x.geometry.drawRange.count<x.geometry.index.count)"),'辐合后逐段抬升，高纬完整圈留到归纳');await snap('60-lifting.png');
      await click('#mechanism-demo-play');await sleep(5200);const complete60=await state();
      check(complete60.mechanismDemo.complete&&complete60.mechanismStage===2&&complete60.visibleGroups.includes('polarNH'),'60°过程归纳低压与高纬圈，停留当前环节');await snap('60-complete.png');
      await click('#mechanism-demo-replay');await sleep(250);await click('#mechanism-demo-play');
      check((await state()).mechanismDemo.elapsed<1&&!(await state()).visibleGroups.includes('polarNH'),'60°重播清除完成态');
    }
    await snap(`stage${i+1}.png`);
  }
  await sleep(10000);check((await state()).mechanismStage===3,'播放10秒不会自动推进环节');
  await click('#mechanism-prev');check((await state()).mechanismStage===2,'上一环节回退');
  await click('#tc-pause');const before=await state();await sleep(400);const after=await state();
  check(!after.playing&&JSON.stringify(before.sampleHadley)===JSON.stringify(after.sampleHadley),'暂停冻结粒子');await click('#tc-play');
  await click('#tog-paths');await sleep(100);
  check(await ev('!window.__threeCellDebug.mechanismGroups[2].visible && window.__threeCellDebug.mechanismLabels.every(x=>!x.obj.visible)'),'关闭路径同步隐藏机制标注');await click('#tog-paths');
  const flow=await ev(`(()=>{const d=window.__threeCellDebug,out=[];for(const group of d.mechanismGroups)for(const m of group.children){if(!m.userData.kind)continue;const c=m.geometry.parameters.path,p=c.getPoint(.7),t=c.getTangent(.7).normalize();const east=d.makeVector3(p.z,0,-p.x).normalize();const north=d.makeVector3(0,1,0).addScaledVector(p.clone().normalize(),-p.y/p.length()).normalize();out.push({kind:m.userData.kind,hemisphere:m.userData.hemisphere,east:t.dot(east),north:t.dot(north),radial:t.dot(p.clone().normalize())});}return out;})()`);
  check(flow.every(f=>f.kind==='sink'?f.radial<-.9:f.kind==='rise'?f.radial>.9:['upper','westerly'].includes(f.kind)?f.east>0&&f.north*f.hemisphere>0:f.east<0&&f.north*f.hemisphere<0),'两半球高空/信风/西风/极地东风及垂直箭头方向',flow);
  const bend=async value=>ev(`(()=>{const slider=document.getElementById('coriolis-slider');slider.value=${value};slider.dispatchEvent(new Event('input',{bubbles:true}));const p=window.__threeCellDebug.mechanismGroups[0].children.find(x=>x.userData.kind==='upper').geometry.parameters.path.getPoint(1);return Math.atan2(p.z,p.x)*180/Math.PI;})()`);
  const zero=await bend(0),bent=await bend(24);check(Math.abs(zero)<1e-6&&bent< -30&&(await state()).mechanismStage===2,'示意弯曲响应且不推进环节',{zero,bent});await bend(12);
  await bend(24);await click('.step-dot[data-step="0"]');await click('.step-dot[data-step="1"]');
  check(await ev("(()=>{const d=window.__threeCellDebug,p=d.mechanismGroups[0].children.find(x=>x.userData.kind==='upper').geometry.parameters.path.getPoint(1);return Math.abs(Math.atan2(p.z,p.x)*180/Math.PI+48)<1e-6&&d.STATE.coriolisDeflection===24;})()"),'环节重入保留示意弯曲参数与实际箭头一致');
  await bend(12);await click('#mechanism-next');await click('#mechanism-next');
  const frame=()=>ev(`(()=>{const d=window.__threeCellDebug,center=d.earthGroup.getWorldPosition(d.makeVector3(0,0,0)),p=center.clone().project(d.camera);return {distance:d.camera.position.distanceTo(center),center:{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2},labels:d.mechanismLabels.filter(x=>x.obj.visible).map(x=>({text:x.obj.element.textContent,...x.obj.element.getBoundingClientRect().toJSON()}))};})()`);
  for(const view of ['side','front','reset','top']){
    await click(`[data-view="${view}"]`);await sleep(1100);const f=await frame();
    check(f.distance>16&&f.center.x>300&&f.center.x<1200&&f.labels.every(x=>x.left>=0&&x.top>=0&&x.right<=1366&&x.bottom<=768),`${view}视角取景安全`,f);
    await snap(`view-${view}.png`);
  }
  await click('[data-view="side"]');await sleep(1000);await click('#mechanism-reveal');await sleep(650);await snap('mechanism-ready.png');
  await click('#mechanism-next');await click('#mechanism-next');check((await state()).step===2,'环节归纳进入第三步');
  await click('#diagram-toggle');await sleep(1200);await click('#diagram-check');
  check(await ev("document.getElementById('diagram-panel').getBoundingClientRect().bottom<=document.getElementById('control-panel').getBoundingClientRect().top"),'桌面练习不遮挡底部控制');
  const hint=()=>ev("document.getElementById('diagram-hint').textContent");
  check((await hint()).includes('未完成 13')&&!(await hint()).includes('全部正确'),'空卷统计13处未完成',await hint());
  await click('.drag-label[data-label-key="pressure-0"]');await click('.drop-zone[data-zone-id="p0"]');await click('#diagram-check');
  check((await hint()).includes('正确 1 / 13')&&(await hint()).includes('未完成 12')&&!(await hint()).includes('全部正确'),'单题正确不误判完成',await hint());
  await click('.drag-label[data-label-key="pressure-60"]');await click('.drop-zone[data-zone-id="p30N"]');await click('#diagram-check');
  check((await hint()).includes('错误 1')&&await ev("document.querySelector('[data-zone-id=p30N]').textContent.includes('副极地低气压带')"),'错误统计并保留所填文字',await hint());
  await click('.drag-label[data-label-key="pressure-30"]');await click('.drop-zone[data-zone-id="p30N"]');
  await click('#diagram-close');await click('#diagram-toggle');await sleep(1200);
  check(await ev("document.querySelector('[data-zone-id=p30N]').dataset.placed==='pressure-30'&&document.querySelector('[data-zone-id=p0]').dataset.placed==='pressure-0'"),'面板关闭重开保留答案');
  const zones=await ev("Array.from(document.querySelectorAll('.drop-zone'),x=>({id:x.dataset.zoneId,answer:x.dataset.answer}))");
  for(const z of zones){await click(`.drag-label[data-label-key="${z.answer}"]`);await click(`.drop-zone[data-zone-id="${z.id}"]`);}
  await click('#diagram-check');
  check((await hint()).includes('正确 13 / 13')&&(await hint()).includes('全部正确')&&await ev("Array.from(document.querySelectorAll('.drag-label')).every(x=>getComputedStyle(x).display!=='none')"),'重复标签可完成13处全部正确',await hint());
  await ev("document.getElementById('diagram-hint').scrollIntoView({block:'nearest'})");await snap('diagram-complete.png');
  await click('#diagram-reset');await click('.drag-label[data-label-key="pressure-30"]');
  await ev("document.querySelector('[data-zone-id=p30N]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))");
  const drag=await ev(`(()=>{const dt=new DataTransfer();dt.setData('text/plain','pressure-30');document.querySelector('[data-zone-id=p30S]').dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:dt}));return ['p30N','p30S'].every(id=>document.querySelector('[data-zone-id='+id+']').dataset.placed==='pressure-30');})()`);
  check(drag,'键盘与拖拽放置可复用同一标签');
  await click('#diagram-reset');await click('#diagram-close');await click('#diagram-toggle');await sleep(1000);await click('#diagram-check');
  check((await hint()).includes('未完成 13'),'重置清除保存的答案');
  await setViewport(760,800);await sleep(400);
  const small=await ev(`(()=>{const p=document.getElementById('diagram-panel').getBoundingClientRect(),c=document.getElementById('control-panel').getBoundingClientRect();return {panel:p.toJSON(),control:c.toJSON()};})()`);
  check(small.panel.bottom<=small.control.top+2,'小屏练习不遮挡底部控制',small);await snap('small-diagram.png');
  await click('#diagram-close');await sleep(400);
  check(await ev("document.getElementById('diagram-panel').getBoundingClientRect().top>=innerHeight"),'小屏关闭抽屉完全移出视口');
  await click('.step-dot[data-step="1"]');await sleep(250);
  check((await state()).mechanismStage===0&&await ev("document.getElementById('mechanism-explanation').hidden"),'重新进入第二步重置环节及解释');
  check(await ev("(()=>{const r=document.getElementById('coriolis-comparison').getBoundingClientRect(),p=document.getElementById('step-panel').getBoundingClientRect(),c=document.getElementById('control-panel').getBoundingClientRect();return r.left>=p.right&&r.right<=innerWidth&&r.top>=0&&r.bottom<c.top&&!document.getElementById('coriolis-comparison').hidden;})()"),'小屏俯视对照图可见，不覆盖教学面板与底部控制');
  check(await ev("(()=>{const b=document.getElementById('mechanism-demo-play').getBoundingClientRect(),p=document.getElementById('step-panel').getBoundingClientRect();return b.top>=p.top&&b.bottom<=p.bottom;})()"),'小屏偏转播放按钮直接可见');await snap('small-coriolis.png');
  await click('#mechanism-next');await click('#mechanism-next');await sleep(400);const f=await frame();
  check(f.labels.every(x=>x.left>=0&&x.top>=0&&x.right<=760&&x.bottom<=800),'760px机制标注留在视口',f);await snap('small-mechanism.png');
  await setViewport(1366,768);await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  const local=pathToFileURL(resolve('三圈环流3D交互式教学平台.html'));local.searchParams.set('state','explore');await send('Page.navigate',{url:local.href});
  check(await ready(1),'断网file入口初始化');await sleep(300);
  await click('.step-dot[data-step="0"]');const a=await ev('window.__threeCellDebug.earthGroup.rotation.y');await sleep(500);const b=await ev('window.__threeCellDebug.earthGroup.rotation.y');
  check(a===b,'第一步符合无自转假设',{a,b});
  await click('.step-dot[data-step="1"]');await click('#mechanism-next');await click('#mechanism-next');await snap('offline-mechanism.png');
  check(report.errors.length===0,'全过程无未捕获页面异常',report.errors);
} catch(error){report.errors.push(String(error));check(false,'验收脚本执行',String(error));}
finally {
  report.passed=report.errors.length===0&&report.checks.every(x=>x.ok);
  await writeFile(join(out,'check.json'),JSON.stringify(report,null,2));
  ws?.close();chrome.kill();
}
console.log(`验收：${report.passed?'通过':'未通过'}；${report.checks.filter(x=>x.ok).length}/${report.checks.length}，报告 ${join(out,'check.json')}`);
process.exitCode=report.passed?0:1;
