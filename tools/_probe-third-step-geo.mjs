import { tmpProfile } from './lib/tmp-profile.mjs';
// 量测第三步（三圈成型）三条环流示意圈相对地球半径的真实位置
// 用法：node tools/_probe-third-step-geo.mjs http://127.0.0.1:8127/ 输出目录
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2];
const outDir = resolve(process.argv[3] || '.probe-third');
const VW = Number(process.argv[4] || 1080), VH = Number(process.argv[5] || 858);
const PORT = 9700 + (process.pid % 200);
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

const geo = await evaluate(`(() => {
  const dbg = window.__threeStepSchematicDebug;
  const S = window.__threeCellDebug;
  if (!dbg || !S) return { error: 'no hook' };
  const R = S.earthRadius;
  const center = S.earthGroup.position.clone();
  const out = { R, center: center.toArray(), cam: S.camera.position.toArray(), camDist: +S.camera.position.distanceTo(center).toFixed(3), fov: S.camera.fov, flows: [] };
  for (const f of dbg.schematic.flows) {
    let minR = Infinity, maxR = -Infinity, maxPoint = null;
    for (let i = 0; i < 360; i++) {
      const p = S.makeVector3(0,0,0).copy(f.curve.getPoint(i / 360));
      f.group.localToWorld(p);
      const r = p.distanceTo(center);
      if (r < minR) minR = r;
      if (r > maxR) { maxR = r; maxPoint = p; }
    }
    const ndc = S.makeVector3(0,0,0).copy(maxPoint).project(S.camera);
    out.flows.push({
      kind: f.kind,
      minR: +minR.toFixed(3), maxR: +maxR.toFixed(3),
      minAlt: +(minR - R).toFixed(3), maxAlt: +(maxR - R).toFixed(3),
      altRatio: +((maxR - R) / R).toFixed(3),
      maxPointWorld: maxPoint.toArray().map(v => +v.toFixed(2)),
      screenX: +((ndc.x + 1) / 2 * innerWidth).toFixed(1),
      screenY: +((1 - ndc.y) / 2 * innerHeight).toFixed(1)
    });
  }
  // 地球轮廓屏幕半径：用切线近似（球心投影 + 球半径对应的像素）
  const d = S.camera.position.distanceTo(center);
  const focal = innerHeight / (2 * Math.tan(S.camera.fov / 2 * Math.PI / 180));
  out.focalPx = +focal.toFixed(1);
  out.silhouettePx = +(R * focal / Math.sqrt(d * d - R * R)).toFixed(1);
  out.centerPx = (() => { const c = S.makeVector3(0,0,0).copy(center).project(S.camera); return [+((c.x + 1) / 2 * innerWidth).toFixed(1), +((1 - c.y) / 2 * innerHeight).toFixed(1)]; })();
  return out;
})()`);

console.log(JSON.stringify(geo, null, 2));

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
await writeFile(join(outDir, 'step3.png'), Buffer.from(shot.data, 'base64'));
console.log('截图:', join(outDir, 'step3.png'));

await cleanup(0);
