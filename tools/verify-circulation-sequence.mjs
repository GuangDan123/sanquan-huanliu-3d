import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const out=resolve(process.argv[2]||'artifacts/continuous-formation-20261012');await mkdir(out,{recursive:true});
const report={checks:[],errors:[],shots:[]},port=28000+process.pid%1000;
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,`--user-data-dir=${join(out,'profile-'+process.pid)}`,'about:blank'],{stdio:'ignore',windowsHide:true});
let tab;for(let i=0;i<100;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'});if(r.ok){tab=await r.json();break;}}catch{}await sleep(100);}if(!tab){chrome.kill();throw Error('Chrome startup timeout');}
const ws=new WebSocket(tab.webSocketDebuggerUrl);let messageId=0;const pending=new Map();
ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);});await new Promise(r=>ws.addEventListener('open',r));
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++messageId;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async(fn,arg)=>{const expression=typeof fn==='string'?fn:`(${fn.toString()})(${JSON.stringify(arg)??''})`;const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const page={evaluate,waitForTimeout:sleep,
 async setViewportSize({width,height}){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});},
 async goto(url){await send('Page.navigate',{url});},
 async waitForFunction(fn){for(let i=0;i<150;i++){if(await evaluate(fn))return;await sleep(100);}throw Error('Page condition timed out');},
 async screenshot({path}){const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(path,Buffer.from(r.data,'base64'));},
 locator(selector){return{async isVisible(){return evaluate(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight;},selector);}};},
 async click(selector){
  const p=await evaluate(s=>{const e=document.querySelector(s);e.scrollIntoView({block:'nearest',inline:'nearest'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return{x,y,hit:e.contains(document.elementFromPoint(x,y)),disabled:e.disabled};},selector);
  if(!p.hit||p.disabled)throw Error('Control unavailable: '+selector+' '+JSON.stringify(p));
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,x:p.x,y:p.y});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:p.x,y:p.y});
 }
};
await send('Runtime.enable');await send('Page.enable');await page.setViewportSize({width:1366,height:768});
const check=(ok,name,evidence)=>{report.checks.push({ok,name,evidence});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async name=>{await page.screenshot({path:join(out,name+'.png')});report.shots.push(name+'.png');};
const seek=async time=>{await page.evaluate(t=>window.__circulationSequenceDebug.seek(t),time);await page.waitForTimeout(80);};
const canvasPoint=()=>page.evaluate(()=>{const f=window.__threeCellDebug.getSceneFraming();for(let dy=.35;dy<.9;dy+=.1)for(let dx=.35;dx<.9;dx+=.1){const x=f.left+f.availableW*dx,y=f.top+f.availableH*dy;if([-28,0,28].every(ox=>[-28,0,28].every(oy=>document.elementFromPoint(x+ox,y+oy)?.tagName==='CANVAS')))return {x,y};}throw Error('No clear canvas drag point');});
const motionSnapshot=()=>page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return JSON.stringify({time:window.__circulationSequenceDebug.elapsed(),earth:window.__threeCellDebug.earthGroup.rotation.y,arrows:s.arrowLoops.flatMap(l=>l.arrows.map(a=>a.helper.position.toArray())),clouds:[...s.accumulations,s.equatorAir].map(c=>Array.from(c.particles.geometry.attributes.position.array)),columns:[...s.descentColumns,...s.ascentColumns].flatMap(c=>c.arrows.map(a=>a.t))});});
const routeFraming=()=>{
 const d=window.__circulationSequenceDebug,s=d.sequence,c=window.__threeCellDebug.camera,f=s.flows.find(f=>f.h===1&&f.kind===d.route(d.elapsed()).kind),panel=document.getElementById('step-panel').getBoundingClientRect(),control=document.getElementById('control-panel').getBoundingClientRect();
 const left=innerWidth<=600?16:panel.right+16,bottom=innerWidth<=600?panel.top-12:control.top-50;
 const points=f.curve.getPoints(32).map(p=>{const world=s.root.localToWorld(p.clone()),ndc=world.clone().project(c);return{x:(ndc.x+1)/2*innerWidth,y:(1-ndc.y)/2*innerHeight,z:ndc.z,clear:world.clone().sub(s.root.position).dot(c.position.clone().sub(world))>0};});
 const span=Math.hypot(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)));
 return s.cameraActive&&c.position.distanceTo(s.root.localToWorld(d.route(d.elapsed()).point.clone()))>1.5&&span>10&&points.every(p=>p.x>left&&p.x<innerWidth-24&&p.y>98&&p.y<bottom&&p.z>-1&&p.z<1&&p.clear);
};
try{
 await page.goto(pathToFileURL(resolve('三圈环流3D交互式教学平台.html')).href+'?state=explore');
 await page.waitForFunction(()=>window.__circulationSequenceDebug&&document.getElementById('loading-screen').classList.contains('hidden'));
 await page.waitForTimeout(900);
 check(await page.evaluate(()=>window.__threeCellDebug.STATE.step===1),'Offline artifact opens second step');await shot('initial');
 check(await page.evaluate(()=>window.__circulationSequenceDebug.sequence.cameraMode==='ride'),'Demonstration defaults to following the airflow');
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,a=s.flows.find(f=>f.kind==='equator-rise'&&f.h===1),b=s.flows.find(f=>f.kind==='equator-rise'&&f.h===-1),lat=p=>Math.asin(p.y/p.length())*180/Math.PI;return Array.from({length:31},(_,i)=>{const t=.25+i/60,p=a.curve.getPoint(t),q=b.curve.getPoint(t);return Math.abs(Math.atan2(p.z,p.x)-Math.atan2(q.z,q.x))<1e-6&&Math.abs(lat(p)-2)<1e-6&&Math.abs(lat(q)+2)<1e-6&&p.distanceTo(q)>.35&&p.distanceTo(q)<.46;}).every(Boolean);}), 'Equatorial rises share one longitude and stay two degrees either side of the equator');
 await page.click('#sequence-camera-toggle');
 for(const time of [4,8,11.9,12,14.5,17,19,23,25.1,28,33,40]){await seek(time);await shot('time-'+String(time).replace('.','-'));}
 for(const [time,cell] of [[23,'hadley'],[33,'polar'],[40,'ferrel']]){
  await seek(time);
  check(await page.evaluate(cell=>{const s=window.__circulationSequenceDebug.sequence,e=window.__circulationSequenceDebug.elapsed(),kinds=s.cells[cell],visibleKinds=new Set([...kinds,...s.cells.hadley,'ferrel-sink',...(e>=30?s.cells.ferrel:[]),...(e>=38?s.cells.polar:[])]);return s.activeCell===cell&&s.flows.filter(f=>f.group.visible).length===s.flows.filter(f=>visibleKinds.has(f.kind)&&e>f.start).length&&[1,-1].every(h=>{const flows=kinds.map(k=>s.flows.find(f=>f.kind===k&&f.h===h));return flows.every((f,i)=>f.curve.getPoint(1).distanceTo(flows[(i+1)%flows.length].curve.getPoint(0))<1e-6&&f.ribbon.geometry.drawRange.count===4800&&f.tubes[0].geometry.drawRange.count===2400);});},cell),cell+' loops close at every junction while retaining earlier airflow');
 }
 for(const time of [33,37.9,38,39,40]){
  await seek(time);
  check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return [1,-1].every(h=>s.cells.polar.every(kind=>{const f=s.flows.find(f=>f.h===h&&f.kind===kind);return f.group.visible&&f.ribbon.visible&&f.particles.visible&&f.ribbon.geometry.drawRange.count===4800&&f.tubes[0].geometry.drawRange.count===2400&&f.ribbon.material.uniforms.uOpacity.value>.25;}));}),'Completed polar circulation stays visible through the final return and completion at '+time+'s');
 }
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return [1,-1].every(h=>{const get=k=>s.flows.find(f=>f.kind===k&&f.h===h);return get('west').start===get('polar-east').start&&get('subpolar-rise').start===27&&get('polar-upper').start===get('ferrel-upper').start&&get('polar-upper').start===30&&get('polar-upper').end===get('ferrel-upper').end&&get('polar-upper').end===33;});}),'Mid-latitude and high-latitude upper branches begin and finish together after the shared uplift');
 for(const time of [30.1,31,32,33]){
  await seek(time);await shot('simultaneous-'+String(time).replace('.','-'));
  check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return [1,-1].every(h=>{const f=k=>s.flows.find(f=>f.kind===k&&f.h===h),mid=f('ferrel-upper'),polar=f('polar-upper');return mid.group.visible&&polar.group.visible&&mid.ribbon.geometry.drawRange.count===polar.ribbon.geometry.drawRange.count&&mid.ribbon.material.uniforms.uOpacity.value===polar.ribbon.material.uniforms.uOpacity.value;});}),'Both upper branches are simultaneously revealed at equal brightness at '+time+'s');
 }
 await seek(40);
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return [1,-1].every(h=>Object.values(s.cells).every(kinds=>{const flows=kinds.map(kind=>s.flows.find(f=>f.h===h&&f.kind===kind));return flows.every((f,i)=>f.group.visible&&f.ribbon.material.uniforms.uOpacity.value===.85&&f.curve.getPoint(1).distanceTo(flows[(i+1)%flows.length].curve.getPoint(0))<1e-6);}));}),'The final frame contains all three closed circulation cells at equal brightness in both hemispheres');
 for(const time of [30,30.1,32,33.1,35,37.9,38,40]){
  await seek(time);
  check(await page.evaluate(()=>{const d=window.__circulationSequenceDebug,s=d.sequence,e=d.elapsed();return [1,-1].every(h=>s.cells.ferrel.every(kind=>{const f=s.flows.find(f=>f.h===h&&f.kind===kind);return e<=f.start?!f.group.visible:f.group.visible&&f.ribbon.visible&&f.particles.visible&&f.ribbon.geometry.drawRange.count>=Math.floor(Math.min(1,(e-f.start)/(f.end-f.start))*100)*48&&f.ribbon.material.uniforms.uOpacity.value>.25;}));}),'Mid-latitude airflow stays visible through polar formation at '+time+'s');
 }
 for(const time of [23.1,25.1,28,33,39,40]){
  await seek(time);
  check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return [1,-1].every(h=>s.cells.hadley.every(kind=>{const f=s.flows.find(f=>f.h===h&&f.kind===kind);return f.group.visible&&f.ribbon.visible&&f.particles.visible&&f.ribbon.geometry.drawRange.count===4800&&f.ribbon.material.uniforms.uOpacity.value>.25;}));}),'Formed low-latitude airflow remains completely drawn and moving at '+time+'s');
 }
 check(await page.evaluate(()=>{const seq=window.__circulationSequenceDebug.sequence,r=seq.atmosphere.geometry.parameters.radius;return seq.flows.filter(f=>f.group.visible).every(f=>Array.from({length:101},(_,i)=>f.curve.getPoint(i/100).y*f.h).every(y=>y>=-1e-6))&&seq.atmosphere.visible&&r===7.05&&seq.atmosphere.material.depthWrite===false&&seq.flows.every(f=>Array.from(f.ribbon.geometry.attributes.position.array).every((v,i,a)=>i%3!==0||Math.hypot(v,a[i+1],a[i+2])+.1<r)); }),'Transparent atmosphere encloses the entire circulation, including the wide upper ribbons');
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,lat=p=>Math.abs(Math.asin(p.y/p.length())*180/Math.PI);return s.flows.every(f=>f.owners.length===1)&&[1,-1].every(h=>{const get=k=>s.flows.find(f=>f.h===h&&f.kind===k),pairs=[['sink','ferrel-sink'],['subpolar-rise','polar-rise']];return pairs.every(([a,b])=>{const f=get(a),g=get(b),lo=Math.max(f.curve.roundedJoins.head||0,g.curve.roundedJoins.head||0)+.01,hi=Math.min(f.curve.roundedJoins.tail||1,g.curve.roundedJoins.tail||1)-.01;return hi>lo&&Array.from({length:41},(_,i)=>{const t=lo+(hi-lo)*i/40,p=f.curve.getPoint(t),q=g.curve.getPoint(t);return Math.abs(lat(q)-lat(p)-4)<1e-6&&Math.abs(Math.atan2(p.z,p.x)-Math.atan2(q.z,q.x))<1e-6&&p.distanceTo(q)>.3&&p.distanceTo(q)<.46;}).every(Boolean);});});}),'Independent adjacent straight branches share longitude and have four degrees of latitude separation between the rounded ends');
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return [1,-1].every(h=>{const f=k=>s.flows.find(f=>f.kind===k&&f.h===h),low=s.thermalColors.hadley,mid=s.thermalColors.ferrel,polar=s.thermalColors.polar;return low.warm===0xffb52e&&low.cold===0xb6dc45&&mid.warm===low.cold&&mid.cold===0x16c8b5&&polar.cold===0x2586ff&&f('upper').sourceColor.getHex()===low.warm&&f('upper').endColor.getHex()===low.cold&&f('trade').sourceColor.getHex()===low.cold&&f('trade').endColor.getHex()===low.warm&&f('west').sourceColor.getHex()===mid.warm&&f('west').endColor.getHex()===mid.cold&&f('ferrel-upper').sourceColor.getHex()===mid.cold&&f('ferrel-upper').endColor.getHex()===mid.warm&&s.cells.polar.every(k=>(f(k).sharedColor||f(k).sourceColor).getHex()===polar.cold&&(f(k).sharedColor||f(k).endColor).getHex()===polar.cold);});}),'Mid-latitude teal stays distinct from polar blue in both hemispheres while preserving thermal direction');
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,lat=p=>Math.abs(Math.asin(p.y/p.length())*180/Math.PI);return s.flows.every(f=>{const a=f.ribbon.geometry.attributes.thermalMix,start=lat(f.curve.getPoint(0)),end=lat(f.curve.getPoint(1));return Array.from({length:101},(_,i)=>{const expected=['upper','trade','west','ferrel-upper'].includes(f.kind)?Math.max(0,Math.min(1,(lat(f.curve.getPoint(i/100))-start)/(end-start))):i/100;return Math.abs(a.getX(i*9)-expected)<1e-6;}).every(Boolean);});}),'Thermal gradients follow latitude through rounded routes and preserve warm/cold endpoints');
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return s.flows.every(f=>{const colors=f.tubes[0].geometry.attributes.color,first=colors.array.slice(6,9),last=colors.array.slice(502*3,502*3+3),u=f.ribbon.material.uniforms;return first.every((v,i)=>Math.abs(v-f.sourceColor.toArray()[i])<1e-6)&&last.every((v,i)=>Math.abs(v-f.endColor.toArray()[i])<1e-6)&&u.uColor.value.equals(f.sourceColor)&&u.uEndColor.value.equals(f.endColor)&&f.tubes[0].geometry.parameters.radius===.025&&u.uWidth.value>=1.1;})&&[1,-1].every(h=>Object.values(s.cells).every(kinds=>kinds.every((kind,i)=>{const f=k=>s.flows.find(f=>f.h===h&&f.kind===k);return f(kind).endColor.equals(f(kinds[(i+1)%kinds.length]).sourceColor);})));}),'Ribbon and core colors stay continuous around each independent cell');
 await seek(25.1);
 for(const time of [8,17,23,28.5,32,40]){
  await seek(time);
  check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,e=window.__circulationSequenceDebug.elapsed(),lat=p=>Math.abs(Math.asin(p.y/p.length())*180/Math.PI);return s.arrowLoops.every(loop=>loop.arrows.every(a=>{if(!a.helper.visible)return true;const f=a.flow,p=f.curve.getPoint(a.t),start=lat(f.curve.getPoint(0)),end=lat(f.curve.getPoint(1)),mix=['upper','trade','west','ferrel-upper'].includes(f.kind)?Math.max(0,Math.min(1,(lat(p)-start)/(end-start))):a.t,color=f.sourceColor.clone().lerp(f.endColor,mix),direction=f.curve.getTangent(a.t).normalize(),actual=direction.clone().set(0,1,0).applyQuaternion(a.helper.quaternion);return f.group.visible&&a.t<=Math.min(1,(e-f.start)/(f.end-f.start))+1e-6&&actual.dot(direction)>.99999&&a.helper.cone.material.color.equals(color)&&a.helper.line.material.color.equals(color)&&a.helper.position.clone().addScaledVector(direction,.34).distanceTo(p)<1e-6;}));}),'Moving arrows follow the visible rounded route direction and match local thermal color at '+time+'s');
 }
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return s.arrowLoops.length===6&&s.arrowLoops.every(loop=>loop.arrows.length==={hadley:4,ferrel:3,polar:2}[loop.cell]&&loop.arrows.every(a=>a.helper.visible));}),'Completed three cells have a restrained set of visible flowing arrows in both hemispheres');
 check(await page.evaluate(()=>{
  const d=window.__circulationSequenceDebug,loops=d.sequence.arrowLoops.filter(l=>l.cell==='ferrel');let previous=null,visible=0;
  for(let step=0;step<=200;step++){
   d.seek(23+step*.05);
   const samples=loops.flatMap(loop=>loop.arrows.map(a=>{const index=loop.flows.indexOf(a.flow),lengths=a.flow.curve.getLengths(),n=a.t*(lengths.length-1),i=Math.floor(n),local=lengths[i]+(lengths[Math.min(i+1,lengths.length-1)]-lengths[i])*(n-i);return {distance:loop.flows.slice(0,index).reduce((sum,f)=>sum+f.curve.getLength(),0)+local,total:loop.flows.reduce((sum,f)=>sum+f.curve.getLength(),0),visible:a.helper.visible};}));
   if(previous&&samples.some((a,i)=>Math.abs((a.distance-previous[i].distance+a.total)%a.total-.0225)>1e-4))return false;
   visible+=samples.filter(a=>a.visible).length;previous=samples;
  }
  return visible>200;
 }),'Every middle-cell arrow advances only forward through formation, including reveal boundaries and loop wrap');
 await seek(40);
 await shot('flow-arrows-complete');await seek(37);
 const arrowState=()=>window.__circulationSequenceDebug.sequence.arrowLoops.flatMap(l=>l.arrows.map(a=>({position:a.helper.position.toArray(),direction:a.helper.quaternion.toArray(),color:a.helper.cone.material.color.toArray(),kind:a.flow.kind,t:a.t,visible:a.helper.visible})));
 const beforeArrows=await page.evaluate(arrowState);await page.click('#mechanism-demo-play');await page.waitForTimeout(450);
 check(JSON.stringify(await page.evaluate(arrowState))!==JSON.stringify(beforeArrows),'Arrows move while the circulation demonstration plays');
 await page.click('#mechanism-reveal');const pausedArrows=await page.evaluate(arrowState);await page.waitForTimeout(250);
 check(JSON.stringify(await page.evaluate(arrowState))===JSON.stringify(pausedArrows),'Pausing freezes arrow position, direction and color');await page.click('#sequence-close');
 await seek(25.1);
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,camera=window.__threeCellDebug.camera;return [1,-1].every(h=>{const f=s.flows.find(f=>f.kind==='west'&&f.h===h),p=f.curve.getPoint(.25),lat=Math.asin(p.y/p.length())*180/Math.PI,world=s.root.localToWorld(p.clone()),normal=world.clone().sub(s.root.position);return f.group.visible&&f.ribbon.geometry.drawRange.count>0&&Math.abs(lat)>30&&Math.abs(lat)<60&&normal.dot(camera.position.clone().sub(world))>0;});}),'25.1s: 30–60 surface airflow is drawn on the visible face in both hemispheres');
 await seek(28);
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return [1,-1].every(h=>{const f=kind=>s.flows.find(f=>f.h===h&&f.kind===kind),rise=f('subpolar-rise'),polar=f('polar-rise'),lat=p=>Math.abs(Math.asin(p.y/p.length())*180/Math.PI);return rise.group.visible&&polar.group.visible&&f('west').group.visible&&f('polar-east').group.visible&&f('west').curve.getPoint(1).distanceTo(rise.curve.getPoint(0))<1e-6&&f('polar-east').curve.getPoint(1).distanceTo(polar.curve.getPoint(0))<1e-6&&Math.abs(lat(rise.sourceCurve.getPoint(0))-58)<1e-6&&Math.abs(lat(polar.sourceCurve.getPoint(0))-62)<1e-6;});}),'Each stream joins its own rounded ascent near the 60° belt');
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return [1,-1].every(h=>{const rise=s.flows.find(f=>f.kind==='subpolar-rise'&&f.h===h),warm=s.flows.find(f=>f.kind==='west'&&f.h===h),points=Array.from({length:41},(_,i)=>rise.curve.getPoint(.25+i*.0125)),lat=p=>Math.abs(Math.asin(p.y/p.length())*180/Math.PI);return rise.sourceColor.equals(warm.endColor)&&points.every((p,i)=>i===0||p.length()>points[i-1].length()&&lat(p)>lat(points[i-1]))&&Math.abs(lat(rise.curve.getPoint(.5))-64)<1e-6&&Math.abs(lat(rise.sourceCurve.getPoint(1))-70)<1e-6&&s.fronts.find(f=>f.h===h).mesh.visible;});}),'Mid-latitude airflow preserves its sloping climb between the rounded junctions');
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return [1,-1].every(h=>{const f=k=>s.flows.find(f=>f.kind===k&&f.h===h);return [['subpolar-rise','ferrel-upper'],['polar-rise','polar-upper']].every(([a,b])=>{const start=f(a).curve.getPoint(0),end=f(a).curve.getPoint(1);return end.length()-start.length()>1.1&&end.clone().normalize().angleTo(start.clone().normalize())>Math.PI/24&&end.distanceTo(f(b).curve.getPoint(0))<1e-6;});});}),'Each raised sloping ascent joins its own upper return through a continuous rounded bend');
 for(const time of [26.9,27.5,28.5,29.5,30]){
  await seek(time);await shot('uplift-'+String(time).replace('.','-'));
  check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,e=window.__circulationSequenceDebug.elapsed();return [1,-1].every(h=>{const f=s.flows.find(f=>f.kind==='subpolar-rise'&&f.h===h),progress=Math.max(0,Math.min(1,(e-27)/3));return f.group.visible===(progress>0)&&f.ribbon.geometry.drawRange.count===Math.floor(progress*100)*48;});}),'Uplift is revealed progressively after the two surface streams meet at '+time+'s');
 }
 for(const time of [0,2,4,15,17,19,27,28.5,30,31,32,33]){
  await seek(time);
  check(await page.evaluate(t=>window.__circulationSequenceDebug.sequence.bands.every(b=>{const expected=t>b.start;const positions=b.mesh.geometry.attributes.position;return b.mesh.visible===expected&&(!expected||b.mesh.material.uniforms.uOpacity.value>0)&&positions.count===161*9;}),time),'Pressure bands follow vertical-motion progress at '+time+'s');
 }
 await seek(28.5);await page.click('#mechanism-reveal');
 const pressureFrozen=await page.evaluate(()=>JSON.stringify({fronts:window.__circulationSequenceDebug.sequence.fronts.map(f=>f.mesh.material.opacity),bands:window.__circulationSequenceDebug.sequence.bands.map(b=>b.mesh.material.uniforms.uOpacity.value),flows:window.__circulationSequenceDebug.sequence.flows.filter(f=>f.group.visible).map(f=>Array.from(f.particles.geometry.attributes.position.array))}));await page.waitForTimeout(200);
 check(await page.evaluate(p=>JSON.stringify({fronts:window.__circulationSequenceDebug.sequence.fronts.map(f=>f.mesh.material.opacity),bands:window.__circulationSequenceDebug.sequence.bands.map(b=>b.mesh.material.uniforms.uOpacity.value),flows:window.__circulationSequenceDebug.sequence.flows.filter(f=>f.group.visible).map(f=>Array.from(f.particles.geometry.attributes.position.array))})===p,pressureFrozen),'Pause freezes the cold-air mass, rising streams and forming pressure bands together');await page.click('#sequence-close');
 await seek(33);await page.click('#tog-pressure');await page.waitForTimeout(100);
 check(await page.evaluate(()=>window.__circulationSequenceDebug.sequence.bands.every(b=>!b.mesh.visible)&&window.__circulationSequenceDebug.sequence.labels.filter(l=>l.pressure).every(l=>!l.obj.visible)),'Pressure toggle hides complete bands and their names');await page.click('#tog-pressure');
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,c=s.upperCurve,p=c.getPoint(1),v=c.getTangent(1),lat=Math.asin(p.y/p.length())*180/Math.PI,east=p.clone().set(-p.z,0,p.x).normalize().negate();return Math.abs(lat-28)<.01&&Math.abs(lat-30)<=2.01&&v.dot(east)>.999;}),'Upper wind reaches the slightly inset 30N boundary tangent to the eastward parallel');
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,p=s.upperCurve.getPoint(.5),v=s.upperCurve.getTangent(.5),r=p.clone().normalize(),f=v.clone().cross(r).normalize();return Math.abs(f.dot(v))<1e-8&&Math.abs(f.dot(r))<1e-8;}),'Coriolis direction is perpendicular to velocity and horizontal');
 await seek(11.8);await page.click('#mechanism-demo-play');await page.waitForTimeout(900);
 check(await page.evaluate(()=>window.__threeCellDebug.STATE.mechanismStage===1&&window.__threeCellDebug.STATE.playing),'Playback crosses first formation boundary without stopping');
 await page.click('#mechanism-demo-play');const frozen=await page.evaluate(()=>window.__circulationSequenceDebug.elapsed());await page.waitForTimeout(400);
 check(await page.evaluate(e=>window.__circulationSequenceDebug.elapsed()===e&&document.getElementById('sequence-explanation').open,frozen),'Pause freezes time and opens the current explanation');await shot('paused-explanation');
 const pointsBefore=await page.evaluate(()=>Array.from(window.__circulationSequenceDebug.sequence.flows[1].particles.geometry.attributes.position.array));await page.waitForTimeout(250);
 check(await page.evaluate(p=>JSON.stringify(Array.from(window.__circulationSequenceDebug.sequence.flows[1].particles.geometry.attributes.position.array))===JSON.stringify(p),pointsBefore),'All flow particles freeze while paused');
 await page.click('#sequence-continue');await page.waitForTimeout(300);check(await page.evaluate(e=>window.__circulationSequenceDebug.elapsed()>e&&!document.getElementById('sequence-explanation').open,frozen),'Continue resumes from the paused position');
 await seek(22.8);await page.click('#mechanism-demo-play');await page.waitForTimeout(600);check(await page.evaluate(()=>window.__threeCellDebug.STATE.mechanismStage===2&&window.__threeCellDebug.STATE.playing),'Playback crosses second formation boundary');
 await seek(32.8);await page.click('#mechanism-demo-play');await page.waitForTimeout(600);check(await page.evaluate(()=>window.__threeCellDebug.STATE.mechanismStage===3&&window.__threeCellDebug.STATE.playing),'Playback crosses third formation boundary');
 await seek(39.8);await page.click('#mechanism-demo-play');await page.waitForTimeout(600);check(await page.evaluate(()=>window.__threeCellDebug.STATE.mechanismDemo.complete&&!window.__threeCellDebug.STATE.playing&&window.__threeCellDebug.STATE.step===1),'Completion stays in second step');
 const completedPose=await page.evaluate(()=>({earth:window.__threeCellDebug.earthGroup.rotation.y,arrows:window.__circulationSequenceDebug.sequence.arrowLoops.flatMap(l=>l.arrows.map(a=>a.helper.position.toArray())),time:window.__circulationSequenceDebug.elapsed(),root:window.__circulationSequenceDebug.sequence.root.rotation.y}));await page.waitForTimeout(450);
 check(await page.evaluate(p=>{const d=window.__circulationSequenceDebug;return d.elapsed()===40&&window.__threeCellDebug.earthGroup.rotation.y>p.earth&&d.sequence.root.rotation.y===p.root&&JSON.stringify(d.sequence.arrowLoops.flatMap(l=>l.arrows.map(a=>a.helper.position.toArray())))!==JSON.stringify(p.arrows);},completedPose),'After automatic completion the arrows keep flowing and Earth keeps rotating, with timeline and cell orientation fixed');
 await shot('completed-still-moving');await page.click('#mechanism-demo-play');
 const completedPause=await page.evaluate(()=>({earth:window.__threeCellDebug.earthGroup.rotation.y,ambient:window.__circulationSequenceDebug.sequence.ambientElapsed,arrows:window.__circulationSequenceDebug.sequence.arrowLoops.flatMap(l=>l.arrows.map(a=>a.helper.position.toArray()))}));await page.waitForTimeout(300);
 check(await page.evaluate(p=>document.getElementById('sequence-explanation').open&&window.__threeCellDebug.earthGroup.rotation.y===p.earth&&window.__circulationSequenceDebug.sequence.ambientElapsed===p.ambient&&JSON.stringify(window.__circulationSequenceDebug.sequence.arrowLoops.flatMap(l=>l.arrows.map(a=>a.helper.position.toArray())))===JSON.stringify(p.arrows),completedPause),'Pause after completion freezes arrows and Earth together');await page.click('#sequence-continue');await page.waitForTimeout(300);
 check(await page.evaluate(p=>window.__circulationSequenceDebug.elapsed()===40&&window.__circulationSequenceDebug.sequence.ambientElapsed>p.ambient&&window.__threeCellDebug.earthGroup.rotation.y>p.earth&&!document.getElementById('sequence-explanation').open,completedPause),'Continue after completion resumes motion without restarting the formation');
 await page.click('#mechanism-demo-replay');await page.waitForTimeout(200);check(await page.evaluate(()=>window.__threeCellDebug.STATE.mechanismStage===0&&window.__circulationSequenceDebug.elapsed()<1&&window.__threeCellDebug.STATE.playing),'Replay restarts all four stages');
 check(await page.evaluate(()=>window.__circulationSequenceDebug.sequence.ambientElapsed===0),'Replay resets completed-motion time');
 await seek(0);await page.evaluate(()=>window.__threeCellDebug.STATE.speed=20);await page.click('#mechanism-demo-play');await page.waitForFunction(()=>window.__threeCellDebug.STATE.mechanismDemo.complete);
 check(await page.evaluate(()=>window.__circulationSequenceDebug.elapsed()===40),'One uninterrupted play reaches all four stages');await page.evaluate(()=>window.__threeCellDebug.STATE.speed=1);
 for(const time of [8,14,17,21,25,29,36]){await seek(time);await page.click('#mechanism-reveal');check(await page.evaluate(()=>document.getElementById('sequence-explanation-title').textContent===window.__circulationSequenceDebug.phase().title),'Explanation matches time '+time);await page.click('#sequence-close');}
 await seek(17);await page.click('#teacher-toggle');await page.waitForTimeout(350);await page.click('#tc-play');await page.waitForTimeout(250);await page.click('#tc-pause');
 check(await page.evaluate(()=>document.getElementById('sequence-explanation').open&&!window.__threeCellDebug.STATE.playing),'Teacher pause also freezes and explains the current process');await page.click('#sequence-close');await page.click('#teacher-toggle');await page.waitForTimeout(350);
 const rangePoint=await page.evaluate(()=>{const r=document.getElementById('sequence-timeline').getBoundingClientRect();return{x:r.x+r.width*.45,y:r.y+r.height/2};});
 await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,...rangePoint});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...rangePoint});
 check(await page.evaluate(()=>Math.abs(window.__circulationSequenceDebug.elapsed()-18)<1&&!window.__threeCellDebug.STATE.playing),'Pointer scrubbing moves the shared clock and pauses');
 await seek(8);await page.evaluate(()=>{window.__threeCellDebug.STATE.showPaths=false;window.__threeCellDebug.STATE.showParticles=false;});await page.waitForTimeout(100);
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return s.flows.every(f=>!f.group.visible)&&s.arrowLoops.every(l=>l.arrows.every(a=>!a.helper.visible));}),'Hiding paths and particles removes flow visuals and arrows');await page.evaluate(()=>{window.__threeCellDebug.STATE.showPaths=true;window.__threeCellDebug.STATE.showParticles=true;});
 await seek(8);await page.click('#mechanism-demo-play');await page.click('#lesson-open');await page.waitForTimeout(150);
 check(await page.evaluate(()=>window.__lessonDebug.state.open&&!document.getElementById('sequence-explanation').open),'Opening a classroom topic pauses without an unrelated explanation');await page.click('#lesson-close');
 for(const [width,height] of [[1600,1000],[760,800],[390,844]]){
   await page.setViewportSize({width,height});await seek(33);await page.waitForTimeout(900);await shot(width+'-pressure-bands');
   check(await page.evaluate(()=>{const labels=window.__circulationSequenceDebug.sequence.labels.filter(l=>l.pressure&&l.obj.visible).map(l=>l.obj.element.getBoundingClientRect());return labels.length===7&&labels.every((a,i)=>labels.slice(i+1).every(b=>a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top));}),width+' seven pressure names visible without mutual overlap');
   check(await page.locator('#mechanism-demo-play').isVisible(),width+' play control visible');
   check(await page.locator('#sequence-timeline').isVisible(),width+' timeline visible without scrolling');
   check(await page.locator('#mechanism-next').isVisible(),width+' next-step control remains visible below the circulation palette');
   await page.click('#mechanism-reveal');await shot(width+'-explanation');
   check(await page.evaluate(()=>{const r=document.getElementById('sequence-explanation').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}),width+' explanation stays within viewport');await page.click('#sequence-close');
 }
 await page.setViewportSize({width:1366,height:768});await seek(8);await page.click('#sequence-camera-toggle');
 for(const time of [2,8,13,17,25,29,32,34,36,37.5,39,40]){
   await seek(time);await shot('ride-'+String(time).replace('.','-'));
   check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence,c=window.__threeCellDebug.camera,v=c.position.clone().sub(s.root.position),forward=c.getWorldDirection(c.position.clone());return s.cameraActive&&v.length()>5.29&&c.position.distanceTo(s.ridePose.eye)<1e-6&&forward.dot(s.ridePose.target.clone().sub(c.position).normalize())>.999;}),'Camera follows the flow while framing the route at '+time+'s');
   check(await page.evaluate(routeFraming),'Entire current airflow segment fits in the usable view without Earth occlusion at '+time+'s');
 }
 check(await page.evaluate(()=>{const d=window.__circulationSequenceDebug;return [4,12,15,19,23,27,30,33,35,37,38].every(e=>d.route(e-.00001).point.distanceTo(d.route(e+.00001).point)<.001);}), 'First-person route stays continuous across all mechanism boundaries');
 check(await page.evaluate(()=>{const frames=window.__circulationSequenceDebug.sequence.rideFrames;return frames.every((f,i)=>i===0||f.rotation.angleTo(frames[i-1].rotation)<.3);}), 'Camera turns smoothly across route and circulation changes');
 await seek(8);const reproduciblePose=await page.evaluate(()=>JSON.stringify({p:window.__threeCellDebug.camera.position.toArray(),q:window.__threeCellDebug.camera.quaternion.toArray()}));await seek(17);await seek(8);
 check(await page.evaluate(p=>JSON.stringify({p:window.__threeCellDebug.camera.position.toArray(),q:window.__threeCellDebug.camera.quaternion.toArray()})===p,reproduciblePose),'Scrubbing back reproduces the same first-person camera pose');
 await seek(8);await page.click('#mechanism-demo-play');await page.waitForTimeout(300);const movingEye=await page.evaluate(()=>window.__threeCellDebug.camera.position.toArray());await page.waitForTimeout(300);
 check(await page.evaluate(p=>window.__threeCellDebug.camera.position.distanceTo(window.__threeCellDebug.makeVector3(...p))>.01,movingEye),'Camera physically moves while the airflow plays');
 await page.click('#mechanism-demo-play');const cameraFrozen=await page.evaluate(()=>({p:window.__threeCellDebug.camera.position.toArray(),q:window.__threeCellDebug.camera.quaternion.toArray(),root:window.__circulationSequenceDebug.sequence.root.rotation.y}));await page.waitForTimeout(350);
 check(await page.evaluate(p=>JSON.stringify({p:window.__threeCellDebug.camera.position.toArray(),q:window.__threeCellDebug.camera.quaternion.toArray(),root:window.__circulationSequenceDebug.sequence.root.rotation.y})===JSON.stringify(p),cameraFrozen),'Pause freezes camera position, orientation and world frame');await page.click('#sequence-continue');await page.waitForTimeout(200);await seek(8);
 for(const [width,height] of [[1600,1000],[760,800],[390,844]]){
  await page.setViewportSize({width,height});
  for(const time of [8,17,25,29,33,39]){await seek(time);await page.waitForTimeout(150);await shot(width+'-ride-'+time);check(await page.evaluate(routeFraming),width+' current route and vertical movement remain fully visible at '+time+'s');}
  check(await page.locator('#sequence-camera-toggle').isVisible(),width+' camera mode control remains visible');
 }
 await page.setViewportSize({width:1366,height:768});await seek(8);await page.click('#sequence-camera-toggle');
 check(await page.evaluate(()=>!window.__circulationSequenceDebug.sequence.cameraActive&&window.__threeCellDebug.camera.fov===50),'Overview restores the orbit camera and lens');
 await page.click('#sequence-camera-toggle');
 for(const [time,playing] of [[18.2,false],[25,true],[29,false],[40,false]]){
  await page.evaluate(t=>window.__circulationSequenceDebug.seek(t[0],t[1]),[time,playing]);await page.waitForTimeout(100);
  if(!playing)await page.click('#mechanism-reveal');
  const frozenMotion=!playing?await motionSnapshot():null;
  const before=await page.evaluate(()=>({p:window.__threeCellDebug.camera.position.toArray(),root:window.__circulationSequenceDebug.sequence.root.rotation.y,time:window.__circulationSequenceDebug.elapsed()}));
  const point=await canvasPoint();await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,...point});
  check(await page.evaluate(p=>{const d=window.__circulationSequenceDebug,c=window.__threeCellDebug.camera;return d.sequence.freeView&&!d.sequence.cameraActive&&d.sequence.cameraMode==='overview'&&c.position.distanceTo(window.__threeCellDebug.makeVector3(...p.p))<.1;},before),'Dragging takes over the current camera without restoring an earlier view at '+time+'s');
  for(let i=1;i<=8;i++){await send('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,x:point.x-i*24,y:point.y+i*8});await page.waitForTimeout(15);}
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',buttons:0,x:point.x-192,y:point.y+64});await page.waitForTimeout(400);
  check(await page.evaluate(p=>{const d=window.__circulationSequenceDebug,c=window.__threeCellDebug.camera;return c.position.distanceTo(window.__threeCellDebug.makeVector3(...p.p))>1&&Math.abs(d.sequence.root.rotation.y-p.root)<1e-9&&window.__threeCellDebug.STATE.playing===p.playing&&(p.playing?d.elapsed()>p.time:d.elapsed()===p.time);},{...before,playing}),'Free orbit changes the viewing angle while preserving model orientation and playback state at '+time+'s');
  if(!playing){check(await page.evaluate(()=>document.getElementById('sequence-explanation').open&&!document.getElementById('sequence-explanation').matches(':modal'))&&await motionSnapshot()===frozenMotion,'Dragging with the explanation open keeps all airflow and Earth rotation frozen at '+time+'s');await page.click('#sequence-close');}
  await shot('free-orbit-'+time);
  await page.click('#sequence-camera-toggle');await page.waitForTimeout(100);
  check(await page.evaluate(()=>window.__circulationSequenceDebug.sequence.cameraActive&&!window.__circulationSequenceDebug.sequence.freeView),'Following can resume after free orbit at '+time+'s');
 }
 const wheelBefore=await page.evaluate(()=>({p:window.__threeCellDebug.camera.position.toArray(),root:window.__circulationSequenceDebug.sequence.root.rotation.y}));
 await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:980,y:380,deltaX:0,deltaY:-180});await page.waitForTimeout(250);
 check(await page.evaluate(p=>{const d=window.__circulationSequenceDebug;return d.sequence.freeView&&!d.sequence.cameraActive&&Math.abs(d.sequence.root.rotation.y-p.root)<1e-9&&window.__threeCellDebug.camera.position.distanceTo(window.__threeCellDebug.makeVector3(...p.p))>.1&&d.elapsed()===40;},wheelBefore),'Wheel zoom takes over the current view after completion without changing the animation');
 await page.click('#sequence-camera-toggle');await page.setViewportSize({width:390,height:844});await seek(29);await page.waitForTimeout(200);
 await page.click('#mechanism-reveal');const touchFrozen=await motionSnapshot();
 const touchBefore=await page.evaluate(()=>({p:window.__threeCellDebug.camera.position.toArray(),root:window.__circulationSequenceDebug.sequence.root.rotation.y}));
 const touchPoint=await canvasPoint();await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...touchPoint,id:1}]});
 for(let i=1;i<=6;i++){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchPoint.x-i*15,y:touchPoint.y+i*5,id:1}]});await page.waitForTimeout(20);}
 await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);
 check(await page.evaluate(p=>{const d=window.__circulationSequenceDebug;return d.sequence.freeView&&!d.sequence.cameraActive&&Math.abs(d.sequence.root.rotation.y-p.root)<1e-9&&window.__threeCellDebug.camera.position.distanceTo(window.__threeCellDebug.makeVector3(...p.p))>1;},touchBefore),'Touch dragging freely orbits the fixed circulation model on mobile');await shot('390-free-orbit');
 check(await page.evaluate(()=>document.getElementById('sequence-explanation').open)&&await motionSnapshot()===touchFrozen,'Touch dragging with the explanation open preserves the pause');await page.click('#sequence-close');
 await page.setViewportSize({width:1366,height:768});await seek(40);await page.click('#mechanism-next');
 check(await page.evaluate(()=>window.__threeCellDebug.STATE.step===2&&!window.__circulationSequenceDebug.sequence.root.visible),'Third step restores existing completed circulation');await shot('third-step');
 check(await page.evaluate(()=>window.__threeCellDebug.camera.fov===50),'Leaving free observation restores the regular camera lens');
 await page.evaluate(()=>window.__threeCellDebug.transitionToStep(0));check(await page.evaluate(()=>window.__threeCellDebug.STATE.step===0&&!window.__circulationSequenceDebug.sequence.root.visible),'First step remains available');
 check(report.errors.length===0,'No browser errors',report.errors);
}catch(error){report.errors.push(String(error));console.error(error);}finally{await writeFile(join(out,'check.json'),JSON.stringify(report,null,2));ws.close();chrome.kill();}
process.exitCode=report.errors.length||report.checks.some(c=>!c.ok)?1:0;
