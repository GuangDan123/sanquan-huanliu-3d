import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

const out=resolve(process.argv[2]||'artifacts/pressure-closeups-20261013');await mkdir(out,{recursive:true});
const report={checks:[],errors:[],views:[]},check=(ok,name,evidence)=>{report.checks.push({ok,name,evidence});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',error=>report.errors.push(String(error)));
const seek=async time=>{await page.evaluate(t=>window.__circulationSequenceDebug.seek(t),time);await page.waitForTimeout(180);};
const pixels=()=>new Promise(resolve=>requestAnimationFrame(()=>{
 const canvas=document.querySelector('#scene-container canvas'),gl=canvas.getContext('webgl2')||canvas.getContext('webgl'),data=new Uint8Array(4);let visible=0,samples=0;
 const frame=window.__threeCellDebug.getSceneFraming();
 for(let y=frame.top+30;y<frame.top+frame.availableH-15;y+=16)for(let x=frame.left+10;x<frame.left+frame.availableW-10;x+=16){gl.readPixels(Math.round(x*canvas.width/innerWidth),Math.round((innerHeight-y)*canvas.height/innerHeight),1,1,gl.RGBA,gl.UNSIGNED_BYTE,data);samples++;if(Math.max(data[0],data[1],data[2])>45)visible++;}
 resolve({visible,samples});
}));
try{
 await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=explore');await page.waitForFunction(()=>window.__circulationSequenceDebug&&document.getElementById('loading-screen').classList.contains('hidden'));
 await seek(40);
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return s.bands.every(b=>b.mesh.material.uniforms.uColor.value.getHex()===(Math.abs(b.lat)<10?0xffd447:Math.abs(b.lat)<45?0x72d44a:Math.abs(b.lat)<80?0x329bff:0xb986ff));}),'All seven pressure belts use yellow, green, blue and purple by latitude');
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return s.bands.every((b,i)=>b.mesh.material.uniforms.uColor.value.equals(window.__threeCellDebug.pressureBeltMeshes[i].material.color)&&Math.abs(b.mesh.material.uniforms.uOpacity.value-.92)<1e-8&&b.mesh.material.blending===1);}), 'Formation pressure belts match the third-step colors with clearly visible solid fill');
 check(await page.evaluate(()=>window.__circulationSequenceDebug.sequence.bands.every(b=>{const a=b.mesh.geometry.attributes.position,lat=[];for(let i=0;i<9;i++)lat.push(Math.asin(a.getY(i)/Math.hypot(a.getX(i),a.getY(i),a.getZ(i)))*180/Math.PI);return Math.abs(Math.max(...lat)-Math.min(...lat)-(Math.abs(b.lat)>80?8:5))<1e-4;})), 'Pressure belts use the reference width of five degrees and eight degrees at the poles');
 check(await page.evaluate(()=>{const labels=window.__circulationSequenceDebug.sequence.labels.filter(l=>l.pressure);return labels.every(l=>l.obj.element.textContent.includes(l.obj.element.textContent.includes('高')?'↓':'↑'))&&labels.filter(l=>l.obj.visible).every(l=>getComputedStyle(l.obj.element).borderTopStyle==='solid'&&getComputedStyle(l.obj.element).backgroundColor!=='rgba(0, 0, 0, 0)');}), 'Pressure names have contrasting backgrounds, colored borders and ascent/descent arrows');
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return s.flows.filter(f=>['equator-rise','sink','ferrel-sink','subpolar-rise','polar-rise','polar-sink'].includes(f.kind)).every(f=>Math.abs(f.curve.getPoint(1).length()-f.curve.getPoint(0).length())>1.1&&Math.abs(Math.abs(f.sourceCurve.getPoint(1).length()-f.sourceCurve.getPoint(0).length())-1.37)<1e-6)&&s.flows.every(f=>f.curve.getPoints(30).every(p=>p.length()+.35<s.atmosphere.geometry.parameters.radius));}),'Raised ascent and descent routes retain their height around the rounded corners and remain inside the atmosphere');
 check(await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;return s.annotations.length===22&&[1,-1].every(h=>['equator-rise','sink','subpolar-rise','polar-sink','trade','west','polar-east'].every(kind=>s.annotations.some(n=>n.h===h&&n.kind===kind&&n.detail.length>40)));}),'Both hemispheres have anchored explanations for pressure formation, vertical motion and wind direction');
 check(await page.evaluate(()=>{const n=window.__circulationSequenceDebug.sequence.annotations;return n.find(n=>n.kind==='trade'&&n.h===1).detail.includes('东北信风')&&n.find(n=>n.kind==='trade'&&n.h===-1).detail.includes('东南信风')&&n.find(n=>n.kind==='west'&&n.h===-1).detail.includes('西北风');}),'Northern and southern hemisphere wind explanations have the correct deflection and wind names');
 for(const [width,height] of [[1366,768],[1600,1000],[760,800],[390,844]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>window.__circulationSequenceDebug.cameraMode('ride'));
  for(const time of [2,8,17,28.5,32,40]){
   await seek(time);await page.screenshot({path:join(out,`${width}-${time}.png`)});
   const view=await page.evaluate(()=>{
    const d=window.__circulationSequenceDebug,s=d.sequence,f=s.flows.find(f=>f.h===1&&f.kind===d.route(d.elapsed()).kind),c=window.__threeCellDebug.camera,frame=window.__threeCellDebug.getSceneFraming(),rects=s.annotations.filter(n=>!n.el.hidden&&!n.label.hidden).map(n=>{const r=n.label.getBoundingClientRect();return {kind:n.kind,left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:n.label.scrollWidth>n.label.clientWidth+1};}),current=s.annotations.find(n=>n.el.classList.contains('is-current')&&!n.el.hidden),p=f.curve.getPoints(32).map(p=>{const q=s.root.localToWorld(p).project(c);return {x:(q.x+1)*innerWidth/2,y:(1-q.y)*innerHeight/2};});
    return {time:d.elapsed(),kind:f.kind,eye:c.position.distanceTo(s.root.localToWorld(d.route(d.elapsed()).point.clone())),routeSpan:Math.hypot(Math.max(...p.map(p=>p.x))-Math.min(...p.map(p=>p.x)),Math.max(...p.map(p=>p.y))-Math.min(...p.map(p=>p.y))),frame,rects,current:current?{kind:current.kind,visible:!current.label.hidden,markerVisible:current.button.getClientRects().length>0,markerLabel:current.button.getAttribute('aria-label'),leaderHidden:current.leader.hidden,text:current.caption}:null};
   });report.views.push({width,height,...view});
   check(view.rects.every(r=>r.left>=view.frame.left&&r.right<=width-10&&r.top>=98&&r.bottom<=view.frame.top+view.frame.availableH&&!r.overflow),`${width}: position explanations stay readable and within the scene at ${time}s`,view.rects);
   check(view.rects.every((a,i)=>view.rects.slice(i+1).every(b=>a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top)),`${width}: explanation labels do not overlap at ${time}s`);
   if(time!==40){check(!!view.current&&(view.current.visible||view.current.markerVisible&&view.current.markerLabel&&view.current.leaderHidden),`${width}: the current explanation fits or leaves an accessible marker when space is limited at ${time}s`,view.current);check(view.routeSpan>=35,`${width}: close-up shows a clearly enlarged vertical path at ${time}s`,view.routeSpan);}
   if(time===2||time===40){const p=await page.evaluate(pixels);check(p.visible>p.samples*.12,`${width}: the canvas contains visible Earth and airflow pixels at ${time}s`,p);}
  }
  check(await page.evaluate(()=>window.__circulationSequenceDebug.sequence.labels.filter(l=>l.pressure&&l.obj.visible).every(l=>{const r=l.obj.element.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})),`${width}: completed pressure names remain fully inside the viewport`);
  check(await page.evaluate(()=>{const p=document.getElementById('step-panel').getBoundingClientRect(),b=document.getElementById('mechanism-next').getBoundingClientRect();return b.top>=p.top&&b.bottom<=p.bottom&&b.left>=p.left&&b.right<=p.right;}),`${width}: next-step button is fully visible inside the teaching panel`);
 }
 await page.setViewportSize({width:1366,height:768});await seek(17);
 const marker=page.locator('.sequence-note[data-kind="sink"][data-hemisphere="1"] .sequence-note-marker');await marker.click();
 check(await page.evaluate(()=>document.getElementById('sequence-explanation').open&&document.getElementById('sequence-explanation-title').textContent.includes('30°空气下沉')&&document.getElementById('sequence-explanation-text').textContent.includes('空气柱')),'Clicking the actual sinking position pauses and opens its mass-and-pressure explanation');await page.screenshot({path:join(out,'clicked-sinking-explanation.png')});await page.click('#sequence-close');
 for(const [kind,a,b,increases] of [['equator-rise',.5,3.5,false],['sink',15.5,18.5,true],['subpolar-rise',27.2,29.8,false],['polar-sink',31.2,32.8,true]]){
  await seek(a);const before=await page.evaluate(k=>window.__circulationSequenceDebug.sequence.pressureCues.find(c=>c.h===1&&c.kind===k).mesh.geometry.drawRange.count,kind);await seek(b);const after=await page.evaluate(k=>window.__circulationSequenceDebug.sequence.pressureCues.find(c=>c.h===1&&c.kind===k).mesh.geometry.drawRange.count,kind);check(increases?after>before:after<before,`${kind}: local near-surface air mass changes in the correct pressure-forming direction`);
 }
 await seek(40);await page.click('#mechanism-next');check(await page.evaluate(()=>document.getElementById('sequence-annotations').hidden&&window.__threeCellDebug.pressureBeltMeshes.every((b,i)=>b.material.color.getHex()===[0xffd447,0x72d44a,0x72d44a,0x329bff,0x329bff,0xb986ff,0xb986ff][i])),'Leaving the formation view hides its explanations and keeps the pressure palette in the completed model');
 check(report.errors.length===0,'No browser errors',report.errors);
}catch(error){report.errors.push(String(error));console.error(error);}finally{await writeFile(join(out,'details-check.json'),JSON.stringify(report,null,2));await browser.close();}
process.exitCode=report.errors.length||report.checks.some(c=>!c.ok)?1:0;
