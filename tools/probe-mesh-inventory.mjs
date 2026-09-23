// 探针10：第三步/第二步逐 Mesh 量测真实渲染贡献（colorWrite=false，不扰动透明排序）。
// 列出每个渲染对象的类型/透明度/混合模式/世界坐标/屏幕足迹，找"半透明大箭头"。
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const rawUrl = process.argv[2];
const url = rawUrl.includes('?') ? rawUrl : rawUrl + '?state=guided';
const outDir = resolve('.shots-probe10');
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

// 完整走用户路径：第一步 → 第二步 → 第三步
await evaluate(`document.querySelector('.step-dot[data-step="1"]')?.click();
  document.getElementById('step-notification')?.classList.remove('show'); true;`);
await sleep(8000);
await evaluate(`document.querySelector('.step-dot[data-step="2"]')?.click();
  document.getElementById('step-notification')?.classList.remove('show'); true;`);
await sleep(6000);
await evaluate(`window.__threeCellDebug.STATE.playing = false; true;`);
await sleep(800);

const report = await evaluate(`(async () => {
  const dbg = window.__threeCellDebug;
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
  const matsOf = (o) => !o.material ? [] : (Array.isArray(o.material) ? o.material : [o.material]);
  const describe = (o) => {
    const m = matsOf(o)[0];
    const wp = o.getWorldPosition(new o.position.constructor());
    return {
      type: o.type,
      geo: o.geometry?.type || '',
      op: m ? +(+m.opacity).toFixed(2) : null,
      transparent: m ? !!m.transparent : null,
      additive: m ? !!(m.blending === 2) : null,  // THREE.AdditiveBlending === 2
      color: m && m.color ? '#' + m.color.getHexString() : '',
      wp: [wp.x, wp.y, wp.z].map(v => +v.toFixed(1))
    };
  };

  const scene = dbg.scene || (() => { let x = dbg.crossSectionRoot; while (x.parent) x = x.parent; return x; })();
  // 收集所有可见 Mesh，只量测半透明/加法混合材质的（嫌疑范围 = "半透明箭头"）
  const meshes = [];
  scene.traverse(o => {
    if (o.type !== 'Mesh' || !o.visible) return;
    const ms = matsOf(o);
    if (!ms.length) return;
    if (ms.some(m => m.transparent || m.blending === 2)) meshes.push(o);
  });
  console.error('候选半透明 Mesh 数：' + meshes.length);

  const baseline = await capFrame();
  const rows = [];
  for (const o of meshes) {
    const mats = matsOf(o);
    const saved = mats.map(m => m.colorWrite);
    mats.forEach(m => { m.colorWrite = false; });
    const frame = await capFrame();
    mats.forEach((m, i) => { m.colorWrite = saved[i]; });
    const d = diffFrames(baseline, frame);
    if (d.n > 30) rows.push({ ...describe(o), n: d.n, box: d.box });
  }
  rows.sort((a, b) => b.n - a.n);
  return rows;
})()`);

console.log('对象类型 | 几何 | 颜色 | opacity | transparent | additive | 世界坐标 | diff像素 | 屏幕足迹');
for (const r of report) {
  const h = r.box ? r.box[3] - r.box[1] : 0;
  const semi = r.op !== null && r.op < 0.6;
  const flag = semi && r.n > 800 ? ' ← ★ 半透明且贡献大' : '';
  console.log(`${r.type} | ${r.geo} | ${r.color} | ${r.op} | ${r.transparent} | ${r.additive} | ${JSON.stringify(r.wp)} | ${r.n} | ${JSON.stringify(r.box)}${flag}`);
}

await cleanup(0);
