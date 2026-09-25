// 探针9：第三步逐组量测真实渲染贡献（colorWrite=false 方式，不扰动透明排序）。
// 找出屏幕足迹纵贯北极→赤道→南极（box 高度 > 500px）的组 = 用户看到的"半透明大箭头"。
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const rawUrl = process.argv[2];
const url = rawUrl.includes('?') ? rawUrl : rawUrl + '?state=guided';
const outDir = resolve('.shots-probe9');
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

// 完整走用户路径：第一步 → 第二步（等 morph 推进完成）→ 第三步
await evaluate(`document.querySelector('.step-dot[data-step="1"]')?.click();
  document.getElementById('step-notification')?.classList.remove('show'); true;`);
await sleep(8000);
await evaluate(`document.querySelector('.step-dot[data-step="2"]')?.click();
  document.getElementById('step-notification')?.classList.remove('show'); true;`);
await sleep(6000);
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
  // 收集对象子树内所有 Mesh/Points/Line 的材质，colorWrite 开关
  const collectMats = (root) => {
    const mats = [];
    root.traverse(o => {
      if (!o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.push(m));
    });
    return mats;
  };
  const measure = async (name, root) => {
    const mats = collectMats(root);
    const saved = mats.map(m => m.colorWrite);
    mats.forEach(m => { m.colorWrite = false; });
    const frame = await capFrame();
    mats.forEach((m, i) => { m.colorWrite = saved[i]; });
    const d = diffFrames(baseline, frame);
    return { name, mats: mats.length, ...d };
  };

  const singleGroup = csr.children[0];
  const hadley = csr.children[1], ferrel = csr.children[2], polar = csr.children[3];
  const coriolis = csr.children[4];

  const baseline = await capFrame();

  const out = [];
  out.push(await measure('singleCellGroup(整组)', singleGroup));
  out.push(await measure('singleNH', singleGroup.children[0]));
  out.push(await measure('singleSH', singleGroup.children[1]));
  out.push(await measure('hadleyNH', hadley.children[0]));
  out.push(await measure('hadleySH', hadley.children[1]));
  out.push(await measure('ferrelNH', ferrel.children[0]));
  out.push(await measure('ferrelSH', ferrel.children[1]));
  out.push(await measure('polarNH', polar.children[0]));
  out.push(await measure('polarSH', polar.children[1]));
  if (coriolis) out.push(await measure('coriolisGroup', coriolis));

  // 三圈组的白色边框锥（MeshBasicMaterial BackSide white op0.18）单独量测
  const outlineOnly = [];
  [hadley, ferrel, polar].forEach(g => g.traverse(o => {
    if (o.type === 'Mesh' && o.geometry.type === 'ConeGeometry'
        && o.material && o.material.color
        && o.material.color.getHexString() === 'ffffff') outlineOnly.push(o);
  }));
  {
    const mats = [];
    outlineOnly.forEach(o => mats.push(o.material));
    const saved = mats.map(m => m.colorWrite);
    mats.forEach(m => { m.colorWrite = false; });
    const frame = await capFrame();
    mats.forEach((m, i) => { m.colorWrite = saved[i]; });
    out.push({ name: '三圈白色边框锥×' + outlineOnly.length, mats: mats.length, ...diffFrames(baseline, frame) });
  }

  // scene 下极点指示物（rotGroup：position.y≈±6 的 Group）
  const scene = (() => { let x = csr; while (x.parent) x = x.parent; return x; })();
  const poleStuff = scene.children.filter(g => g.type === 'Group' && Math.abs(Math.abs(g.position.y || 0) - 6) < 0.8);
  if (poleStuff.length) {
    const mats = [];
    poleStuff.forEach(g => g.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.push(m)); }));
    const saved = mats.map(m => m.colorWrite);
    mats.forEach(m => { m.colorWrite = false; });
    const frame = await capFrame();
    mats.forEach((m, i) => { m.colorWrite = saved[i]; });
    out.push({ name: '极点指示物×' + poleStuff.length, mats: mats.length, ...diffFrames(baseline, frame) });
  }

  return out;
})()`);

console.log('组名 | 材质数 | diff像素数 | 屏幕足迹 [x0,y0 → x1,y1]');
for (const r of results) {
  const h = r.box ? r.box[3] - r.box[1] : 0;
  const flag = r.box && h > 500 ? ' ← ★ 纵贯整个经圈！' : '';
  console.log(`${r.name} | ${r.mats} | ${r.n} | ${JSON.stringify(r.box)}${flag}`);
}

await cleanup(0);
