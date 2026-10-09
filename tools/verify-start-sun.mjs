// 复核无预设的首次打开、太阳遮挡、箭头间距，以及不同视角和窗口尺寸。
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {setTimeout as sleep} from 'node:timers/promises';
const url=process.argv[2]||'http://127.0.0.1:8123/';
const out=resolve(process.argv[3]||'.verify-start-sun');await mkdir(out,{recursive:true});
const report={checks:[],errors:[],screenshots:[]};
const check=(ok,name,evidence)=>{report.checks.push({ok,name,evidence});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const port=12000+process.pid%1000;
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,`--user-data-dir=${join(out,'profile')}`,'about:blank'],{stdio:'ignore',windowsHide:true});let ws;
try{
 let tab;for(let i=0;i<60;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'});if(r.ok){tab=await r.json();break;}}catch{}await sleep(200);}if(!tab)throw Error('浏览器未启动');
 ws=new WebSocket(tab.webSocketDebuggerUrl);let id=0;const pending=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);});await new Promise(r=>ws.addEventListener('open',r));
 const send=(method,params={})=>new Promise((resolve,reject)=>{const k=++id;pending.set(k,{resolve,reject});ws.send(JSON.stringify({id:k,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const click=async s=>{const point=await ev(`(()=>{const e=document.querySelector(${JSON.stringify(s)}),r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return{ok:e.contains(document.elementFromPoint(x,y)),x,y}})()`);if(!point.ok)throw Error('点击目标被遮挡 '+s);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:point.x,y:point.y});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:point.x,y:point.y});};
 const viewport=async(width,height)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await sleep(400);};
 const nav=async link=>{await send('Page.navigate',{url:link});for(let i=0;i<70;i++){if(await ev("!!window.__lessonDebug&&document.getElementById('loading-screen').classList.contains('hidden')")){await sleep(700);return;}await sleep(200);}throw Error('初始化未完成');};
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(out,name),Buffer.from(r.data,'base64'));report.screenshots.push(name);return r.data;};
 const panel=()=>ev("(()=>{const p=document.getElementById('step-panel').getBoundingClientRect(),b=document.getElementById('single-demo-play').getBoundingClientRect();return{body:document.getElementById('sp-body').textContent,button:!!document.getElementById('single-demo-play'),height:p.height,buttonVisible:b.top>=p.top&&b.bottom<=p.bottom,step:window.__threeCellDebug.STATE.step}})()");
 await send('Runtime.enable');await send('Page.enable');await viewport(1920,1080);
 await nav(url);const initial=await panel();check(initial.step===0&&initial.button&&initial.buttonVisible&&initial.body.includes('预测')&&initial.height>300,'无URL参数首次打开已展开单圈提示与播放区',initial);
 await click('#btn-start-free');await sleep(500);const free=await panel();check(free.step===0&&free.buttonVisible&&free.body.length>100,'欢迎页自由探索保留展开的第一步提示');await ev('window.__threeCellDebug.STATE.playing=false');await shot('initial-free.png');
 // 用实际渲染像素确认虚线有空隙、且亮段朝地球移动。
 await sleep(180);
 check(await ev(`(()=>{const d=window.__threeCellDebug,g=d.earthGroup.parent.children.find(g=>g.children?.some(o=>o.geometry?.type==='CircleGeometry'));return !g.children.some(o=>o.userData.sunTraveler)&&g.children.filter(o=>o.isMesh&&o.geometry.attributes.position.count===3).length===6})()`),'太阳射线仅保留六个固定三角尖端，无移动三角箭头');
 const radiationBefore=await ev('window.__threeCellDebug.getSunDiagnostics().arrowTargets');
 check(radiationBefore.length===6&&radiationBefore.every(a=>a.radiation.enabled&&!a.radiation.solidLineVisible),'红黄蓝六条太阳辐射均显示流动虚线');
 const flowA=await shot('radiation-paused-a.png');
 const normalStarted=Date.now();await ev('window.__threeCellDebug.STATE.playing=true');await sleep(600);await ev('window.__threeCellDebug.STATE.playing=false');const normalDuration=(Date.now()-normalStarted)/1000;await sleep(150);
 const radiationAfter=await ev('window.__threeCellDebug.getSunDiagnostics().arrowTargets');const flowB=await shot('radiation-paused-b.png');
 const redBefore=radiationBefore.filter(a=>a.radiation),redAfter=radiationAfter.filter(a=>a.radiation);
 const movement=await ev(`(async()=>{
   const images=await Promise.all(${JSON.stringify([flowA,flowB])}.map(data=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i);i.src='data:image/png;base64,'+data})));
   const pixels=images.map(i=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);return ctx.getImageData(0,0,c.width,c.height).data});
   return ${JSON.stringify(redBefore)}.map((a,index)=>{
     const r=a.radiation,b=${JSON.stringify(redAfter)}[index].radiation,dx=r.screenEnd[0]-r.screenStart[0],dy=r.screenEnd[1]-r.screenStart[1],length=Math.hypot(dx,dy);
     const masks=pixels.map(data=>{const mask=[];for(let d=length*.32;d<length*.75;d++){
       const x=Math.round(r.screenStart[0]+dx*d/length),y=Math.round(r.screenStart[1]+dy*d/length),i=(y*images[0].width+x)*4;
       const lit=Math.abs(a.lat)===10?data[i]>140&&data[i]>data[i+1]*1.8&&data[i]>data[i+2]*1.5:Math.abs(a.lat)<40?data[i]>140&&data[i+1]>120&&data[i]>data[i+2]*1.8:data[i+2]>130&&data[i+2]>data[i]*1.6;
       mask.push(lit?1:0);
     }return mask});
     const shift=Math.round(((b.phase-r.phase+1)%1)*24);let compared=0,matched=0;
     for(let i=0;i<masks[0].length-shift;i++){compared++;if(masks[0][i]===masks[1][i+shift])matched++;}
     return {lat:a.lat,lit:masks[0].reduce((sum,x)=>sum+x,0)/masks[0].length,shift,agreement:matched/compared,changed:masks[0].filter((x,i)=>x!==masks[1][i]).length};
   });
 })()`);
 check(movement.length===6&&movement.every(x=>x.lit>.3&&x.lit<.8),'实际六条箭杆交替显示亮段与空隙',movement);
 check(movement.every(x=>x.shift>1&&x.shift<20&&x.agreement>.85&&x.changed>20),'六条虚线像素沿太阳到地球方向流动',movement);
 const normalRate=(redAfter[0].radiation.phase-redBefore[0].radiation.phase+1)%1/normalDuration;
 check(normalRate>.35&&normalRate<.65,'默认流动速度降至每秒约半个周期，约12像素',normalRate);
 const widths=await ev(`(async()=>{
   const img=await new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i);i.src='data:image/png;base64,'+${JSON.stringify(flowB)}});
   const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;
   return ${JSON.stringify(redAfter)}.map(a=>{
     const {screenStart:s,screenEnd:e}=a.radiation,dx=e[0]-s[0],dy=e[1]-s[1],length=Math.hypot(dx,dy);
     const lit=(x,y)=>{x=Math.round(x);y=Math.round(y);const i=(y*c.width+x)*4;return Math.abs(a.lat)===10?data[i]>140&&data[i]>data[i+1]*1.8&&data[i]>data[i+2]*1.5:Math.abs(a.lat)<40?data[i]>140&&data[i+1]>120&&data[i]>data[i+2]*1.8:data[i+2]>130&&data[i+2]>data[i]*1.6;};
     const sample=(from,to)=>{const w=[];for(let d=length*from;d<length*to;d+=2){const x=s[0]+dx*d/length,y=s[1]+dy*d/length;if(!lit(x,y))continue;let n=0;for(let offset=-10;offset<=10;offset+=.25)if(lit(x-dy/length*offset,y+dx/length*offset))n+=.25;w.push(n);}w.sort((a,b)=>a-b);return w[Math.floor(w.length/2)]||0;};
     return {lat:a.lat,sun:sample(.25,.4),earth:sample(.7,.85)};
   });
 })()`);
 check(widths.length===6&&widths.every(w=>w.sun>0&&w.earth>w.sun*1.25),'六条箭杆实际像素宽度均由太阳端向地球端增大',widths);
 const phasePaused=redAfter.map(a=>a.radiation.phase);await sleep(250);
 check(JSON.stringify(phasePaused)===JSON.stringify((await ev('window.__threeCellDebug.getSunDiagnostics().arrowTargets')).filter(a=>a.radiation).map(a=>a.radiation.phase)),'教师暂停冻结太阳辐射流动');
 const fastStarted=Date.now();await ev("document.getElementById('speed-slider').value=20;document.getElementById('speed-slider').dispatchEvent(new Event('input',{bubbles:true}));window.__threeCellDebug.STATE.playing=true");await sleep(300);await ev('window.__threeCellDebug.STATE.playing=false');const fastDuration=(Date.now()-fastStarted)/1000;
 const fast=await ev('window.__threeCellDebug.getSunDiagnostics().arrowTargets.filter(a=>a.radiation).map(a=>a.radiation.phase)');
 check(fast.every((phase,i)=>((phase-phasePaused[i]+1)%1/fastDuration)/normalRate>1.6&&((phase-phasePaused[i]+1)%1/fastDuration)/normalRate<2.4),'速度调节同步作用于辐射流动');
 await ev('window.__threeCellDebug.transitionToStep(1)');await sleep(150);
 check((await ev('window.__threeCellDebug.getSunDiagnostics().arrowTargets')).filter(a=>a.radiation).every(a=>!a.radiation.enabled&&a.radiation.solidLineVisible),'切入三圈机制后恢复原箭杆样式');
 await ev('window.__threeCellDebug.transitionToStep(0)');await sleep(150);await click('#single-demo-play');await sleep(120);await click('#single-demo-play');
 const localPaused=await ev('window.__threeCellDebug.getSunDiagnostics().arrowTargets.filter(a=>a.radiation).map(a=>a.radiation.phase)');await sleep(180);
 check(JSON.stringify(localPaused)===JSON.stringify(await ev('window.__threeCellDebug.getSunDiagnostics().arrowTargets.filter(a=>a.radiation).map(a=>a.radiation.phase)')),'单圈局部暂停同时冻结辐射流动');
 // 保存太阳像素范围，随后截图对比箭头开启/关闭，圆盘内部应无连接线差异。
 const sunInfo=await ev(`(()=>{const d=window.__threeCellDebug,scene=d.earthGroup.parent,group=scene.children.find(g=>g.children?.some(o=>o.geometry?.type==='CircleGeometry')),core=group.children.find(o=>o.geometry?.type==='CircleGeometry'&&o.geometry.parameters.radius===d.getSunDiagnostics().radius),p=core.getWorldPosition(d.makeVector3(0,0,0)).project(d.camera),rim=core.localToWorld(d.makeVector3(core.geometry.parameters.radius,0,0)).project(d.camera);window.__sunCheckGroup=group;return{cx:(p.x+1)*innerWidth/2,cy:(1-p.y)*innerHeight/2,radius:Math.hypot((rim.x-p.x)*innerWidth/2,(rim.y-p.y)*innerHeight/2),depthWrite:core.material.depthWrite}})()`);
 report.sunPixels=sunInfo;check(sunInfo.depthWrite,'太阳圆盘写入深度，遮挡后方线段');const linesOn=await shot('sun-lines-on.png');await ev("window.__sunCheckGroup.children.forEach(o=>{if(o.isLine||o.geometry?.type==='CylinderGeometry'||o.geometry?.type==='BufferGeometry')o.visible=false;})");await sleep(100);const linesOff=await shot('sun-lines-off.png');
 const occlusion=await ev(`(async()=>{const images=await Promise.all(${JSON.stringify([linesOn,linesOff])}.map(data=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.src='data:image/png;base64,'+data})));const pixels=images.map(img=>{const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,c.width,c.height).data});const {cx,cy,radius}=${JSON.stringify(sunInfo)};let tested=0,changed=0;for(let y=Math.ceil(cy-radius+3);y<cy+radius-3;y++)for(let x=Math.ceil(cx-radius+3);x<cx+radius-3;x++){if(Math.hypot(x-cx,y-cy)>radius-3)continue;tested++;const i=(y*images[0].width+x)*4;if([0,1,2].some(k=>pixels[0][i+k]!==pixels[1][i+k]))changed++}return{tested,changed}})()`);
 check(occlusion.tested>1000&&occlusion.changed===0,'太阳内部像素不受后方连接线影响',occlusion);
 await nav(url);await click('#btn-start-guided');await sleep(700);await click('#sn-continue');await sleep(400);check((await panel()).step===0&&await ev('window.__threeCellDebug.STATE.singleDemo.elapsed>0'),'首次引导从展开的单圈过程开始');
 await ev('window.__threeCellDebug.STATE.playing=false');
 for(const [width,height] of [[1920,1080],[1366,768],[760,800],[390,844]]){
  await viewport(width,height);
  for(const view of ['side','front','reset','top']){
   await ev(`window.__threeCellDebug.setView(${JSON.stringify(view)})`);await sleep(950);
   const d=await ev(`(()=>{const debug=window.__threeCellDebug,d=debug.getSunDiagnostics();d.arrowTargets.forEach(a=>{const p=debug.makeVector3(...a.target).project(debug.camera);const shortenedLength=Math.hypot(((p.x+1)/2-d.screen.x)*innerWidth,((1-p.y)/2-d.screen.y)*innerHeight);a.expectedClearance=Math.min(28,(shortenedLength+a.clearancePixels)*.15)});return d})()`);
   check(d.arrowTargets.every(a=>a.screenGap<.01&&a.clearancePixels>0&&Math.abs(a.clearancePixels-a.expectedClearance)<.01),`${width}×${height} ${view}箭头留出适应窗口的间距`,d.arrowTargets.map(a=>({lat:a.lat,gap:a.clearancePixels,expected:a.expectedClearance,tipError:a.screenGap})));
   const triangles=await ev(`(()=>{const d=window.__threeCellDebug,group=d.earthGroup.parent.children.find(g=>g.children?.some(o=>o.geometry?.type==='CircleGeometry'));return group.children.filter(o=>o.userData.sunEndpoint||o.userData.sunTraveler).map(o=>{const p=o.geometry.attributes.position,points=[0,1,2].map(i=>{const v=d.makeVector3(p.getX(i),p.getY(i),p.getZ(i));o.localToWorld(v);v.project(d.camera);return [(v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2]});const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);return {endpoint:!!o.userData.sunEndpoint,base:dist(points[0],points[1]),left:dist(points[0],points[2]),right:dist(points[1],points[2])}})})()`);
   check(triangles.length===6&&triangles.every(t=>t.endpoint&&Math.abs(t.left-t.right)<.01&&Math.abs(t.base-18)<.01),`${width}×${height} ${view}仅六个固定等腰三角尖端，地球端加粗保留`,triangles);
   if(view==='side')await shot(`${width}-side.png`);
  }
 }
 await viewport(1366,768);await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await nav(pathToFileURL(resolve('三圈环流3D交互式教学平台.html')).href);check((await panel()).buttonVisible,'断网双击入口第一步提示完整');await click('#btn-start-free');await shot('offline-initial.png');
 check((await ev('window.__threeCellDebug.getSunDiagnostics().arrowTargets')).every(a=>a.radiation.enabled),'断网单文件入口六条虚线可用');
 check(report.errors.length===0,'首次打开及视角调整无未捕获异常',report.errors);
}catch(e){report.errors.push(String(e));check(false,'检查执行',String(e));}finally{report.passed=report.errors.length===0&&report.checks.every(x=>x.ok);await writeFile(join(out,'check.json'),JSON.stringify(report,null,2));ws?.close();chrome.kill();}
console.log(`首次打开与太阳复核：${report.passed?'通过':'未通过'}；${report.checks.filter(x=>x.ok).length}/${report.checks.length}`);process.exitCode=report.passed?0:1;
