import { chromium } from '../artifacts/sequence-runtime/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = resolve('artifacts/step3-seasonal-20261018');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const checks = [];
const check = (name, ok, evidence = null) => checks.push({ name, ok: Boolean(ok), evidence });
async function checkCellGap(){
  const result=await page.evaluate(()=>{
    const s=window.__threeStepSchematicDebug.schematic;
    const flow=(kind,h)=>s.flows.find(f=>f.kind===kind&&f.h===h);
    const points=f=>Array.from({length:600},(_,i)=>f.curve.getPoint(i/600));
    const closest=(a,b)=>{
      const pa=points(a),pb=points(b);let best={distance:Infinity};
      for(let i=0;i<pa.length;i++)for(let j=0;j<pb.length;j++){
        const distance=pa[i].distanceTo(pb[j]);
        if(distance<best.distance)best={distance,ta:i/pa.length,tb:j/pb.length};
      }
      return best;
    };
    return [1,-1].map(h=>{
      const ferrel=flow('schematic-ferrel',h),polar=flow('schematic-polar',h),hit=closest(ferrel,polar);
      const edgeGap=hit.distance-ferrel.ribbonWidth(ferrel.kind,hit.ta)/2-polar.ribbonWidth(polar.kind,hit.tb)/2;
      return {h,distance:+hit.distance.toFixed(4),edgeGap:+edgeGap.toFixed(4)};
    });
  });
  check('第三步中纬与高纬环流贴近但不重叠',result.every(item=>item.distance>=.52&&item.edgeGap>=.03&&item.edgeGap<=.14),result);
}
async function checkRenderedPaths(viewport) {
  const screenshot=await page.locator('#scene-container canvas').screenshot();
  const result=await page.evaluate(async bytes=>{
    const bitmap=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'}));
    const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();
    const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
    const s=window.__threeStepSchematicDebug.schematic,camera=window.__threeCellDebug.camera;
    return s.flows.map(flow=>{
      let visible=0;
      for(let i=0;i<64;i++){
        const p=s.root.localToWorld(flow.curve.getPoint(i/64)).project(camera);
        const x=Math.round((p.x+1)*canvas.width/2),y=Math.round((1-p.y)*canvas.height/2);
        let bright=false;
        for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){
          if(x+dx<0||x+dx>=canvas.width||y+dy<0||y+dy>=canvas.height)continue;
          const offset=((y+dy)*canvas.width+x+dx)*4;
          if(Math.max(data[offset],data[offset+1],data[offset+2])>150)bright=true;
        }
        if(bright)visible++;
      }
      return {kind:flow.kind,hemisphere:flow.h,visibleSamples:visible};
    });
  },Array.from(screenshot));
  check(`${viewport}画布像素显示六条环流路径`,result.every(f=>f.visibleSamples>24),result);
}

try {
  await page.goto(pathToFileURL(resolve('气压带与风带3D交互式教学平台.html')).href + '?state=guided');
  await page.waitForFunction(() => window.__threeCellDebug && document.getElementById('loading-screen').classList.contains('hidden'));
  await page.waitForTimeout(700);

  for (const step of [0, 1, 2]) {
    await page.evaluate(step => window.__threeCellDebug.transitionToStep(step), step);
    await page.waitForFunction(step => window.__threeCellDebug.STATE.step === step, step);
    await page.waitForTimeout(900);
    const state = await page.evaluate(() => ({ step: window.__threeCellDebug.STATE.step, entry: document.querySelector('#step-classroom-entry')?.textContent, panel: document.querySelector('#step-panel').innerText, view: document.querySelector('#step-panel').dataset.stepView }));
    check(`第${step + 1}步可进入且有课堂探究入口`, state.step === step && state.entry === '课堂探究入口', state);
    if (step === 0) {
      await page.click('#step-classroom-entry');
      await page.waitForTimeout(250);
      check('第一步入口打开对应课堂内容', await page.locator('#lesson-close').isVisible().catch(() => false), await page.locator('body').innerText());
      await page.evaluate(() => document.getElementById('lesson-close')?.click());
      await page.waitForTimeout(150);
    }
    if (step === 1) {
      await page.click('#step-classroom-entry');
      await page.waitForTimeout(250);
      check('第二步入口打开对应课堂内容', await page.locator('#lesson-close').isVisible().catch(() => false));
      await page.evaluate(() => document.getElementById('lesson-close')?.click());
      await page.waitForTimeout(150);
    }
    if (step === 2) {
      const schematic = await page.evaluate(() => {
        const d=window.__threeCellDebug,s=window.__threeStepSchematicDebug?.schematic;
        const visible=s?.flows?.filter(f=>f.group.visible&&f.ribbon.visible)||[];
        const hemispheres=visible.reduce((out,f)=>{const key=f.h>0?'north':'south';out[key]=(out[key]||0)+1;return out;},{});
        return { rootVisible: !!s?.root?.visible, rootX:s?.root?.position?.x,
          circles: visible.length, hemispheres,
          radii:visible.map(f=>{const ps=f.curve.getPoints(64),rs=ps.map(p=>p.length()),sectionR=ps.map(p=>Math.hypot(p.x,p.y));return {min:Math.round(Math.min(...rs)*100)/100,max:Math.round(Math.max(...rs)*100)/100,sectionThickness:Math.max(...sectionR)-Math.min(...sectionR)};}),
          thermalRanges:visible.map(f=>{const values=f.curve.getPoints(32).map((p,i)=>f.thermalProgress(f.kind,p,i/32,f.curve));return {min:Math.min(...values),max:Math.max(...values)};}),
          palettes: s?.arrows?.map(a=>({hemisphere:a.flow.h>0?'north':'south',kind:a.flow.kind,colors:a.palette.map(c=>c.getHexString())}))||[],
          arrows:s?.arrows?.map(a=>a.arrows.length)||[],
          pressureLabels:d.pressureLabels.filter(l=>l.obj.visible).length,windLabels:d.windLabels.filter(l=>l.obj.visible).length,
          panel: document.querySelector('#sp-body').innerText };
      });
      check('第三步南北半球各有三条冷暖渐变流带，完整位于地球与大气层之间', schematic.rootVisible && schematic.circles === 6 && schematic.hemispheres.north === 3 && schematic.hemispheres.south === 3 && schematic.radii.every(r=>r.min>5&&r.max<7.4&&r.sectionThickness>1) && schematic.thermalRanges.every(r=>r.max-r.min>.2) && schematic.palettes.length === 6 && schematic.palettes.every(p=>new Set(p.colors).size===4) && schematic.arrows.every(n=>n===2) && schematic.pressureLabels>0 && schematic.windLabels>0 && !schematic.panel.includes('低纬环流') && !schematic.panel.includes('本图条件'), schematic);
      const trajectories = await page.evaluate(() => {
        const flows=window.__threeStepSchematicDebug.schematic.flows;
        return flows.map(flow=>{
          const samples=Array.from({length:400},(_,i)=>{
            const t=i/400,p=flow.curve.getPoint(t);
            const referenceT=t=>flow.kind==='schematic-ferrel'?1-t:t;
            const diagram=flow.reference.spline.getPointAt(referenceT(t)),next=flow.reference.spline.getPointAt(referenceT((t+.0001)%1));
            const latitude=v=>Math.abs(Math.atan2(v.y,-v.x)*180/Math.PI);
            return {lat:latitude(diagram),r:p.length(),diagramR:diagram.length(),dr:next.length()-diagram.length(),dlat:latitude(next)-latitude(diagram),
              shell:(p.x*p.x+p.z*p.z)/(7*1.06)**2+p.y*p.y/49,
              thermal:flow.thermalProgress(flow.kind,p,t,flow.curve)};
          });
          const minLat=Math.min(...samples.map(p=>p.lat)),maxLat=Math.max(...samples.map(p=>p.lat));
          const minR=Math.min(...samples.map(p=>p.r)),maxR=Math.max(...samples.map(p=>p.r));
          const mean=(items,key)=>items.reduce((sum,p)=>sum+p[key],0)/items.length;
          const lower=samples.filter(p=>p.lat<minLat+.1),higher=samples.filter(p=>p.lat>maxLat-.1);
          const minDiagramR=Math.min(...samples.map(p=>p.diagramR)),maxDiagramR=Math.max(...samples.map(p=>p.diagramR));
          const surface=samples.filter(p=>p.diagramR<minDiagramR+.01),upper=samples.filter(p=>p.diagramR>maxDiagramR-.01);
          return {kind:flow.kind,hemisphere:flow.h,minLat,maxLat,minR,maxR,
            closure:flow.curve.getPoint(0).distanceTo(flow.curve.getPoint(1)),
            maxShell:Math.max(...samples.map(p=>p.shell)),
            lowRise:mean(lower,'dr'),highRise:mean(higher,'dr'),surfaceDirection:mean(surface,'dlat'),
            // 上升端/下沉端按纬度端取样：哈德莱与极地环流在低纬端上升，费雷尔环流在高纬端上升。
            lowEndThermal:mean(samples.filter(p=>p.lat<minLat+3),'thermal'),
            highEndThermal:mean(samples.filter(p=>p.lat>maxLat-3),'thermal')};
        });
      });
      check('六个参考轮廓分别闭合且始终处于地表与大气层之间', trajectories.every(f=>f.closure<1e-8&&f.minR>5.17&&f.maxShell<=1&&f.maxLat-f.minLat>24), trajectories);
      check('低纬和极地圈低纬端上升、高纬端下沉，中纬圈流向相反', trajectories.every(f=>{
        const direction=f.kind==='schematic-ferrel'?-1:1;
        return f.lowRise*direction>0&&f.highRise*direction<0&&f.surfaceDirection*direction<0;
      }), trajectories);
      // 颜色按"环流阶段"分布（用户 2026-10-19 定稿、同日二次修订）：
      // 进度 0 落在上升端、1 落在下沉端，只按纬度判定，两端正好分居纬度两端，可按纬度端直接核对。
      //   低纬：赤道橙红（上升）→ 30° 浅蓝（下沉）
      //   中纬：60° 深蓝（上升）→ 30° 浅蓝（下沉）
      //   极地：60° 深蓝（上升）→ 90° 紫（下沉）
      check('六个圈的取色进度从上升端 0 渐变到下沉端 1', trajectories.every(f=>{
        const riseAtHigh=f.kind==='schematic-ferrel';
        const rise=riseAtHigh?f.highEndThermal:f.lowEndThermal,sink=riseAtHigh?f.lowEndThermal:f.highEndThermal;
        return rise<.2&&sink>.85;
      }), trajectories.map(f=>({kind:f.kind,h:f.hemisphere,lowEndThermal:Math.round(f.lowEndThermal*100)/100,highEndThermal:Math.round(f.highEndThermal*100)/100})));
      const colorEnds = await page.evaluate(() => {
        return window.__threeStepSchematicDebug.schematic.arrows.map(({flow,palette,thermalProgress})=>{
          let lo=null,hi=null;
          for(let i=0;i<=400;i++){
            const t=i/400,p=flow.curve.getPoint(t);
            const diagram=flow.reference.spline.getPointAt(flow.kind==='schematic-ferrel'?1-t:t);
            const lat=Math.abs(Math.atan2(diagram.y,-diagram.x)*180/Math.PI);
            const u=thermalProgress(flow.kind,p,t,flow.curve);
            const s=Math.min(2.999,Math.max(0,u*3)),index=Math.min(2,Math.floor(s));
            const col=palette[index].clone().lerp(palette[index+1],s-index);
            const item={lat,u,hex:'#'+col.getHexString(),r:col.r,g:col.g,b:col.b,lum:.299*col.r+.587*col.g+.114*col.b};
            if(!lo||lat<lo.lat) lo=item;
            if(!hi||lat>hi.lat) hi=item;
          }
          return {kind:flow.kind,h:flow.h,low:lo,high:hi};
        });
      });
      const byKind=(kind,h)=>colorEnds.find(c=>c.kind===kind&&c.h===h);
      const pick=c=>({kind:c.kind,h:c.h,low:c.low.hex,high:c.high.hex,lowLum:+c.low.lum.toFixed(2),highLum:+c.high.lum.toFixed(2)});
      check('低纬圈赤道端取暖色、30° 下沉端取浅蓝', colorEnds.filter(c=>c.kind==='schematic-hadley').every(c=>c.low.r>c.low.b&&c.low.r>c.low.g&&c.high.g>c.high.r&&c.high.b>c.high.r), colorEnds.filter(c=>c.kind==='schematic-hadley').map(pick));
      check('中纬圈 60° 上升端取深蓝、30° 下沉端取浅蓝', colorEnds.filter(c=>c.kind==='schematic-ferrel').every(c=>c.low.b>c.low.r&&c.high.b>c.high.r&&c.low.lum-c.high.lum>.15), colorEnds.filter(c=>c.kind==='schematic-ferrel').map(pick));
      check('极地圈 60° 上升端取深蓝、90° 端取紫', colorEnds.filter(c=>c.kind==='schematic-polar').every(c=>c.low.b>c.low.g&&c.low.g>c.low.r&&c.high.r>c.high.g&&c.high.b>c.high.r), colorEnds.filter(c=>c.kind==='schematic-polar').map(pick));
      const sink30=[1,-1].map(h=>({h,hadley:byKind('schematic-hadley',h).high,ferrel:byKind('schematic-ferrel',h).low}));
      check('30° 处低纬和中纬环流下沉端衔接为浅蓝', sink30.every(v=>Math.abs(v.ferrel.lum-v.hadley.lum)<.02&&v.ferrel.b>v.ferrel.r&&v.hadley.b>v.hadley.r),
        sink30.map(v=>({h:v.h,hadley:v.hadley.hex,ferrel:v.ferrel.hex,delta:+(v.ferrel.lum-v.hadley.lum).toFixed(2)})));
      await checkCellGap();
      const motionBefore = await page.evaluate(() => ({ rotation: window.__threeCellDebug.earthGroup.rotation.y, phases: window.__threeStepSchematicDebug.schematic.arrows.map(x=>x.arrows[0].phase) }));
      await page.waitForTimeout(650);
      const motionAfter = await page.evaluate(() => ({ rotation: window.__threeCellDebug.earthGroup.rotation.y, phases: window.__threeStepSchematicDebug.schematic.arrows.map(x=>x.arrows[0].phase) }));
      check('第三步未播放季节移动时地球与三圈箭头持续运动', Math.abs(motionAfter.rotation-motionBefore.rotation)>0.0001 && motionAfter.phases.some((p,i)=>Number.isFinite(p)&&Math.abs(p-motionBefore.phases[i])>0.0001), {motionBefore,motionAfter});
      check('第三步提供第二步和第四步按钮', await page.locator('#step-back-second').isVisible() && await page.locator('#step-forward-fourth').isVisible());
      await page.click('#step-back-second');
      await page.waitForFunction(() => window.__threeCellDebug.STATE.step === 1);
      check('第二步按钮返回第二步', await page.evaluate(() => window.__threeCellDebug.STATE.step === 1));
      await page.evaluate(() => window.__threeCellDebug.transitionToStep(2));
      await page.waitForFunction(() => window.__threeCellDebug.STATE.step === 2);
      await page.waitForTimeout(400);
      await page.click('#step-forward-fourth');
      await page.waitForFunction(() => window.__threeCellDebug.STATE.step === 3);
      await page.waitForTimeout(250);
      check('第四步按钮进入第四步并收起第三步光带', await page.evaluate(() => window.__threeCellDebug.STATE.step === 3 && !window.__circulationSequenceDebug.sequence.root.visible));
      await page.evaluate(() => window.__threeCellDebug.transitionToStep(2));
      await page.waitForFunction(() => window.__threeCellDebug.STATE.step === 2);
      await page.waitForTimeout(500);
      await page.screenshot({ path: resolve(out, 'desktop-step3.png') });
      await checkRenderedPaths('桌面');
      const before = await page.evaluate(() => ({ pressure: Array.from(window.__threeCellDebug.pressureBeltMeshes[1].geometry.attributes.position.array.slice(0, 3)), wind: Array.from(window.__threeCellDebug.windArrowMeshes[0].geometry.attributes.position.array.slice(0, 3)) }));
      await page.click('#season-shift-toggle');
      await page.waitForTimeout(1200);
      const during = await page.evaluate(() => ({ running: window.__threeCellDebug.STATE.seasonalRunning, shift: window.__threeCellDebug.STATE.seasonalShift, labelY: window.__threeCellDebug.windLabels[0].obj.position.y, status: document.querySelector('#season-shift-status').textContent, pressure: Array.from(window.__threeCellDebug.pressureBeltMeshes[1].geometry.attributes.position.array.slice(0, 3)), wind: Array.from(window.__threeCellDebug.windArrowMeshes[0].geometry.attributes.position.array.slice(0, 3)) }));
      check('季节动画会同步移动气压带、风带和季节状态', during.running && Math.abs(during.shift) > 0.1 && JSON.stringify(before.pressure) !== JSON.stringify(during.pressure) && JSON.stringify(before.wind) !== JSON.stringify(during.wind) && during.status.length > 0, { before, during });
      await page.screenshot({ path: resolve(out, 'desktop-step3-moving.png') });
      await page.click('#season-shift-toggle');
      const paused = await page.evaluate(() => ({ running: window.__threeCellDebug.STATE.seasonalRunning, shift: window.__threeCellDebug.STATE.seasonalShift, elapsed: window.__threeCellDebug.STATE.seasonalElapsed, pressed: document.querySelector('#season-shift-toggle').getAttribute('aria-pressed') }));
      await page.waitForTimeout(250);
      const held = await page.evaluate(() => window.__threeCellDebug.STATE.seasonalShift);
      check('季节动画暂停后位置冻结且可无跳变续播', !paused.running && paused.pressed === 'false' && Math.abs(held - paused.shift) < 0.01, { paused, held });
      await page.click('#season-shift-toggle');
      await page.waitForTimeout(200);
      const resumed = await page.evaluate(() => ({ running: window.__threeCellDebug.STATE.seasonalRunning, shift: window.__threeCellDebug.STATE.seasonalShift, from: window.__threeCellDebug.STATE.seasonalElapsed }));
      check('季节动画可续播', resumed.running && Math.abs(resumed.shift - paused.shift) < 1.5, { paused, resumed });
      await page.evaluate(() => window.__threeCellDebug.transitionToStep(1));
      await page.waitForTimeout(1000);
      const reset = await page.evaluate(() => ({ running: window.__threeCellDebug.STATE.seasonalRunning, shift: window.__threeCellDebug.STATE.seasonalShift }));
      check('离开第三步后季节动画停止并归位', !reset.running && Math.abs(reset.shift) < 1e-6, reset);
      await page.evaluate(() => window.__threeCellDebug.transitionToStep(2));
      await page.waitForTimeout(1000);
      await page.evaluate(() => window.__threeCellDebug.hideTeachingIntro());
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);
      const mobile = await page.evaluate(() => {
        const p = document.querySelector('#step-panel').getBoundingClientRect();
        const b = document.querySelector('#step-classroom-entry').getBoundingClientRect();
        return { panel: { x: p.x, y: p.y, right: p.right, bottom: p.bottom }, button: { x: b.x, y: b.y, right: b.right, bottom: b.bottom }, viewport: { width: innerWidth, height: innerHeight }, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      check('手机第三步面板和入口在视口内且无横向溢出', mobile.panel.x >= 0 && mobile.panel.right <= mobile.viewport.width && mobile.button.x >= mobile.panel.x && mobile.button.right <= mobile.panel.right && mobile.button.bottom <= mobile.panel.bottom && !mobile.overflow, mobile);
      await page.screenshot({ path: resolve(out, 'mobile-step3.png') });
      await checkRenderedPaths('手机');
    }
  }

  check('浏览器无运行时错误', errors.length === 0, errors);
  const report = { checks, errors, browser: 'Chrome headless', screenshots: ['desktop-step3.png', 'desktop-step3-moving.png', 'mobile-step3.png'] };
  await writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (checks.some(item => !item.ok)) process.exitCode = 1;
} finally {
  await browser.close();
}
