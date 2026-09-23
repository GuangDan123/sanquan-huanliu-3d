// 探针8：决定性实验 —— 单圈箭头组"隐藏后画面有差异"到底是
//   (a) 材质 opacity=0 却仍在渲染（shader/状态异常），还是
//   (b) 隐藏对象改变透明排序，扰动其他半透明物造成的假阳性。
// 方法：对同一组箭头用三种隐藏方式分别 diff 基准帧：
//   A. obj.visible = false        （从渲染列表移除 —— 会改变排序）
//   B. material.colorWrite=false  （仍在列表中照常排序，但不写颜色）
//   C. material.visible = false   （材质级剔除，提交阶段跳过 —— 排序同样受影响，作对照）
// 若 B≈0 而 A 很大 → (b) 假阳性；若 B 也很大 → (a) 真渲染。
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const rawUrl = process.argv[2];
const url = rawUrl.includes('?') ? rawUrl : rawUrl + '?state=guided';
const outDir = resolve('.shots-probe8');
const PORT = 9500 + (process.pid % 400);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = join(outDir, `chrome-profile-${PORT}`);

await rm(outDir, { recursive: true, force: true });
await mkdir(profile, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--force-device-scale-factor=1',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1600,1000', 'about:blank'
], { stdio: 'ignore' });

let ws;
const cleanup = async (code) => {
  try { ws?.close(); } catch {}
  try { chrome.kill('SIGKILL'); } catch {}
  await sleep(200);
  process.exit(code);
};

let target = null;
for (let i = 0; i < 40 && !target; i++) {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
    if (r.ok) target = await r.json();
  } catch {}
  if (!target) await sleep(400);
}
if (!target) { console.error('✘ CDP 未就绪'); await cleanup(2); }

ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve: res, reject: rej } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
  }
});
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++seq;
  pending.set(id, { resolve: res, reject: rej });
  ws.send(JSON.stringify({ id, method, params }));
});
await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true });
  ws.addEventListener('error', rej, { once: true });
});

const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });

let ready = false;
for (let i = 0; i < 60 && !ready; i++) {
  await sleep(500);
  try { ready = await evaluate('!!(window.__threeCellDebug && window.__threeCellDebug.camera)'); } catch {}
}
if (!ready) { console.error('✘ 页面调试钩子未就绪'); await cleanup(2); }

await evaluate(`(() => {
  const w = document.getElementById('welcome-modal');
  w?.classList.remove('show');
  document.getElementById('btn-start-guided')?.click();
  return true;
})()`);
await sleep(1500);

await evaluate(`document.querySelector('.step-dot[data-step="1"]')?.click();
  document.getElementById('step-notification')?.classList.remove('show'); true;`);
await sleep(8000);
await evaluate(`document.querySelector('.step-dot[data-step="2"]')?.click();
  document.getElementById('step-notification')?.classList.remove('show'); true;`);
await sleep(5000);
await evaluate(`window.__threeCellDebug.STATE.playing = false; true;`);
await sleep(800);

const results = await evaluate(`(async () => {
  const dbg = window.__threeCellDebug;
  const csr = dbg.crossSectionRoot;
  const canvas = document.querySelector('canvas');
  const cap = document.createElement('canvas');
  cap.width = canvas.width; cap.height = canvas.height;
  const capCtx = cap.getContext('2d', { willReadFrequently: true });
  const capFrame = async () => {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    capCtx.drawImage(canvas, 0, 0);
    return capCtx.getImageData(0, 0, cap.width, cap.height).data;
  };
  const diffFrames = (da, db) => {
    let n = 0, minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
    const w = cap.width;
    for (let i = 0; i < da.length; i += 4) {
      if (Math.abs(da[i]-db[i]) > 8 || Math.abs(da[i+1]-db[i+1]) > 8 || Math.abs(da[i+2]-db[i+2]) > 8) {
        n++;
        const px = (i/4) % w, py = (i/4) / w | 0;
        if (px<minX)minX=px; if(px>maxX)maxX=px;
        if (py<minY)minY=py; if(py>maxY)maxY=py;
      }
    }
    return { n, box: maxX < 0 ? null : [minX, minY, maxX, maxY].map(v => Math.round(v)) };
  };

  const singleGroup = csr.children[0];
  // 取所有箭头组（与探针7 同口径：cell.group 下 type=Group 的直接子级）
  const arrowUnits = [];
  singleGroup.traverse(o => {
    if (o.type === 'Group' && o.parent && o.parent.type === 'Group'
        && o.children.length === 2
        && o.children.every(c => c.type === 'Mesh' && c.geometry && c.geometry.type === 'ConeGeometry')) {
      arrowUnits.push(o);
    }
  });

  const baseline = await capFrame();

  // A: obj.visible=false（改变排序）
  arrowUnits.forEach(o => { o.visible = false; });
  const frameA = await capFrame();
  arrowUnits.forEach(o => { o.visible = true; });

  // B: material.colorWrite=false（不改变排序）
  const mats = [];
  arrowUnits.forEach(o => o.children.forEach(c => { mats.push(c.material); }));
  mats.forEach(m => { m._cw = m.colorWrite; m.colorWrite = false; });
  const frameB = await capFrame();
  mats.forEach(m => { m.colorWrite = m._cw; });

  // C: material.visible=false（材质级剔除）
  mats.forEach(m => { m._vis = m.visible; m.visible = false; });
  const frameC = await capFrame();
  mats.forEach(m => { m.visible = m._vis; });

  // 复核基准静止性
  const baseline2 = await capFrame();

  return {
    arrows: arrowUnits.length,
    A: diffFrames(baseline, frameA),
    B: diffFrames(baseline, frameB),
    C: diffFrames(baseline, frameC),
    noise: diffFrames(baseline, baseline2).n
  };
})()`);

console.log(`箭头组数量: ${results.arrows}`);
console.log(`基准噪声(noise): ${results.noise}`);
console.log(`A. obj.visible=false   → diff=${JSON.stringify(results.A)}`);
console.log(`B. colorWrite=false    → diff=${JSON.stringify(results.B)}`);
console.log(`C. material.visible=false → diff=${JSON.stringify(results.C)}`);
console.log('');
if (results.B.n < 30 && results.A.n > 100) {
  console.log('结论：A 大 B 小 → 假阳性！箭头并未渲染，diff 来自透明排序扰动。');
} else if (results.B.n > 100) {
  console.log('结论：B 也很大 → 箭头材质确实在渲染（opacity=0 未生效于渲染管线）。');
} else {
  console.log('结论：A/B/C 都很小 → 箭头不可见，此前 diff 来自其他噪声。');
}

await cleanup(0);
