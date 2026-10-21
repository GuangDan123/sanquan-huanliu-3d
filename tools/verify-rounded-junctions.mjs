import {chromium} from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const out=resolve(process.argv[2]||'artifacts/rounded-corners-20261013/accepted/junctions');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href+'?state=explore');await page.waitForFunction(()=>window.__circulationSequenceDebug&&document.getElementById('loading-screen').classList.contains('hidden'));
await page.waitForTimeout(800);
const evidence=await page.evaluate(()=>{const s=window.__circulationSequenceDebug.sequence;
 const joints=[];
 for(const h of [1,-1])for(const [cell,kinds] of Object.entries(s.cells)){
  const flows=kinds.map(kind=>s.flows.find(f=>f.kind===kind&&f.h===h));
  flows.forEach((f,i)=>{const n=flows[(i+1)%flows.length],ta=f.curve.roundedJoins.tail,tb=n.curve.roundedJoins.head;
   joints.push({h,cell,from:f.kind,to:n.kind,rounded:ta!==undefined,gap:f.curve.getPoint(1).distanceTo(n.curve.getPoint(0)),tangentDot:f.curve.getTangent(1).dot(n.curve.getTangent(0)),entryDot:ta===undefined?1:f.curve.getTangent(ta-.0005).dot(f.curve.getTangent(ta+.0005)),exitDot:tb===undefined?1:n.curve.getTangent(tb-.0005).dot(n.curve.getTangent(tb+.0005)),trimmed:ta===undefined?0:f.sourceCurve.getPoint(1).distanceTo(f.curve.getPoint(1))});
  });
 }
 const separations=[1,-1].flatMap(h=>[['sink','ferrel-sink'],['subpolar-rise','polar-rise']].map(([a,b])=>{const f=s.flows.find(f=>f.h===h&&f.kind===a),g=s.flows.find(f=>f.h===h&&f.kind===b);return {h,a,b,min:Math.min(...Array.from({length:501},(_,i)=>f.curve.getPoint(i/500)).map(p=>Math.min(...g.curve.getPoints(500).map(q=>p.distanceTo(q)))))};}));
 const extents=s.flows.map(f=>({h:f.h,kind:f.kind,min:Math.min(...f.curve.getPoints(300).map(p=>p.length())),max:Math.max(...f.curve.getPoints(300).map(p=>p.length())),span:Math.abs(f.curve.getPoint(1).length()-f.curve.getPoint(0).length())}));
 return {joints,separations,extents};});
const checks=[];const check=(ok,name)=>{checks.push({ok,name});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
check(evidence.joints.every(j=>j.gap<1e-6&&j.tangentDot>.999),'All 26 junctions close with matching airflow tangents');
check(evidence.joints.filter(j=>j.rounded).every(j=>j.trimmed>.015&&j.entryDot>.995&&j.exitDot>.995),'Rounded corners have visible curvature and join the original paths smoothly');
check(evidence.joints.filter(j=>j.rounded).length>=22,'Every sharp bend in both hemispheres has been rounded');
check(evidence.extents.every(f=>f.min>=5.079&&f.max<=6.451),'Rounded routes stay above the surface and inside the atmosphere');
check(evidence.extents.filter(f=>['equator-rise','sink','ferrel-sink','subpolar-rise','polar-rise','polar-sink'].includes(f.kind)).every(f=>f.span>1.1),'Raised ascent and descent remain clearly longer than the original height');
check(evidence.separations.every(p=>p.min>.2),'Adjacent independent circulation cells keep a visible gap after rounding');
for(const [time,view] of [[2,'equator'],[17,'30-descent'],[29,'60-uplift'],[32,'polar'],[40,'complete']]){await page.evaluate(t=>window.__circulationSequenceDebug.seek(t),time);await page.waitForTimeout(250);await page.screenshot({path:join(out,view+'.png')});}
check(errors.length===0,'No browser errors');
await writeFile(join(out,'check.json'),JSON.stringify({checks,errors,evidence},null,2));await browser.close();process.exitCode=checks.some(c=>!c.ok)||errors.length?1:0;
