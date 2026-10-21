import { tmpProfile } from './lib/tmp-profile.mjs';
// 量测第三步（三圈成型）三条环流示意的取色分布：每个采样点的纬度、相对高度、调色板进度与颜色。
// 用法：node tools/_probe-step3-colors.mjs http://127.0.0.1:8130/ 输出目录 [宽] [高]
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2];
const outDir = resolve(process.argv[3] || '.probe-colors');
const VW = Number(process.argv[4] || 1080), VH = Number(process.argv[5] || 858);
const ZOOM = Number(process.argv[6] || 5);
const PORT = 9400 + (process.pid % 200);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = join(outDir, `chrome-${PORT}`);

await rm(outDir, { recursive: true, force: true });
await mkdir(profile, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--force-device-scale-factor=1',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${tmpProfile()}`,
  `--window-size=${VW},${VH}`, 'about:blank'
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
    const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
    if (r.ok) target = await r.json();
  } catch {}
  if (!target) await sleep(400);
}
if (!target) { console.error('CDP 未就绪'); await cleanup(2); }

ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve: res, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : res(msg.result);
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
await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });

let ready = false;
for (let i = 0; i < 60 && !ready; i++) {
  await sleep(500);
  try { ready = await evaluate('!!window.__threeCellDebug'); } catch {}
}
if (!ready) { console.error('页面钩子未就绪'); await cleanup(2); }

await evaluate(`(() => { document.getElementById('btn-start-guided')?.click(); document.getElementById('welcome-modal')?.classList.remove('show'); return true; })()`);
await sleep(1200);
await evaluate(`(() => { document.querySelector('.step-dot[data-step="2"]')?.click(); document.getElementById('step-notification')?.classList.remove('show'); return true; })()`);
await sleep(6000);
for (let i = 0; i < 8; i++) {
  await evaluate(`(() => { ['welcome-modal','step-notification','video-modal'].forEach(id => document.getElementById(id)?.classList.remove('show')); return document.querySelectorAll('#welcome-modal.show,#step-notification.show').length; })()`);
  await sleep(400);
}

// 切到侧视并放大，贴近用户截图里的观察角度，便于人工核对取色效果。
await evaluate(`(() => { document.querySelector('[data-view="side"]')?.click(); return true; })()`);
await sleep(1600);
for (let i = 0; i < ZOOM; i++) {
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: Math.round(VW * .55), y: Math.round(VH * .42), deltaX: 0, deltaY: -200 });
  await sleep(160);
}
await sleep(900);

const data = await evaluate(`(() => {
  const dbg = window.__threeStepSchematicDebug;
  if (!dbg) return { error: 'no hook' };
  const rgb = h => [h >> 16 & 255, h >> 8 & 255, h & 255];
  const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const out = [];
  for (const f of dbg.schematic.flows) {
    if (f.h !== 1) continue;
    const pal = f.thermalPalette.map(rgb);
    const samples = [];
    let minA = Infinity, maxA = -Infinity;
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const p = f.curve.getPoint(t);
      const lat = Math.abs(Math.atan2(p.y, -p.x) * 180 / Math.PI);
      samples.push({ t, lat, p });
    }
    const latMin = Math.min(...samples.map(s => s.lat)), latMax = Math.max(...samples.map(s => s.lat));
    const inner = Math.min(...samples.map(s => Math.hypot(s.p.x, s.p.y)));
    const outer = Math.max(...samples.map(s => Math.hypot(s.p.x, s.p.y)));
    // 调色板进度：与 shader 的四段线性插值一致
    const colorAt = (u) => {
      const s = Math.min(2.999, Math.max(0, u * 3)), i = Math.min(2, Math.floor(s)), k = s - i;
      return pal[i].map((v, j) => v + (pal[i + 1][j] - v) * k);
    };
    for (const s of samples) {
      s.alt = (Math.hypot(s.p.x, s.p.y) - inner) / (outer - inner);
      s.latN = (s.lat - latMin) / (latMax - latMin || 1);
      s.u = f.thermalProgress(f.kind, s.p, s.t, f.curve);
    }
    const pick = (score) => samples.reduce((a, b) => (score(b) < score(a) ? b : a));
    const pts = [
      ['上升端·近地面', pick(s => s.latN + s.alt)],
      ['上升端·高空',   pick(s => s.latN + (1 - s.alt))],
      ['下沉端·高空',   pick(s => (1 - s.latN) + (1 - s.alt))],
      ['下沉端·近地面', pick(s => (1 - s.latN) + s.alt)]
    ];
    out.push({
      kind: f.kind, latMin: +latMin.toFixed(1), latMax: +latMax.toFixed(1),
      stages: pts.map(([label, s]) => ({ label, lat: +s.lat.toFixed(1), alt: +s.alt.toFixed(2), u: +s.u.toFixed(2), color: hex(colorAt(s.u)) })),
      midAloft: (() => { const s = samples.reduce((a, b) => (Math.abs(b.latN - .5) + (1 - b.alt) < Math.abs(a.latN - .5) + (1 - a.alt) ? b : a)); return { lat: +s.lat.toFixed(1), u: +s.u.toFixed(2), color: hex(colorAt(s.u)) }; })()
    });
  }
  return out;
})()`);

if (data?.error) { console.error(data.error); await cleanup(3); }
console.log(JSON.stringify(data, null, 2));

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
await writeFile(join(outDir, 'step3.png'), Buffer.from(shot.data, 'base64'));
console.log('截图:', join(outDir, 'step3.png'));

await cleanup(0);
