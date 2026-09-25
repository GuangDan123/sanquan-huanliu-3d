// 临时探针：在 side/front/reset 视角下，扫描极冠锚点纬度 82~89，
// 看"锚点像素的第一个命中"到底是不是极冠本身，并打印该像素的命中清单（查清遮挡物是谁）。
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const outDir = resolve('.probe-polar');
const url = 'http://127.0.0.1:8123/' + encodeURIComponent('三圈环流3D交互式教学平台.html') + '?state=none';
const PORT = 9950 + (process.pid % 40);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
await mkdir(outDir, { recursive: true });
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--force-device-scale-factor=1', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${join(outDir, 'profile')}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });

let target = null;
for (let i = 0; i < 40 && !target; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }); if (r.ok) target = await r.json(); } catch {}
  if (!target) await sleep(400);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const evaluate = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });
let ready = false;
for (let i = 0; i < 60 && !ready; i++) { await sleep(500); try { ready = await evaluate('!!(window.__threeCellDebug && window.__threeCellDebug.rayReport)'); } catch {} }
await evaluate(`(() => { document.getElementById('welcome-modal')?.classList.remove('show'); document.querySelector('.step-dot[data-step="2"]')?.click(); return true; })()`);
await sleep(4500);
if (!await evaluate(`!!document.getElementById('tog-pressure')?.classList.contains('active')`)) { await evaluate(`document.getElementById('tog-pressure').click()`); await sleep(2500); }
for (let i = 0; i < 6; i++) {
  const b = await evaluate(`(() => { ['welcome-modal','step-notification','video-modal'].forEach(id => document.getElementById(id)?.classList.remove('show')); return ['welcome-modal','step-notification','video-modal'].filter(id => document.getElementById(id)?.classList.contains('show')); })()`);
  if (!b.length) break; await sleep(500);
}

// 在页面里直接算出"纬度 φ、经度偏移 dLon"锚点的屏幕坐标并做射线，避免反复改源码
const probe = `(function (lat, dLon) {
  const D = window.__threeCellDebug;
  const cam = D.camera, R = D.pressureBeltR;
  const ph = lat * Math.PI / 180, t = dLon * Math.PI / 180;
  // 复刻 beltAnchorPos + labelGroup 的朝向
  const az = Math.atan2(cam.position.z, cam.position.x);
  const rot = -az - Math.PI / 2;
  const lx = R * Math.cos(ph) * Math.sin(t), ly = R * Math.sin(ph), lz = -R * Math.cos(ph) * Math.cos(t);
  const wx = lx * Math.cos(rot) + lz * Math.sin(rot), wy = ly, wz = -lx * Math.sin(rot) + lz * Math.cos(rot);
  const v = D.makeVector3(wx, wy, wz);
  const p = v.clone().project(cam);
  const sx = (p.x + 1) / 2 * innerWidth, sy = (1 - p.y) / 2 * innerHeight;
  return JSON.stringify({ sx: +sx.toFixed(1), sy: +sy.toFixed(1), wx: +wx.toFixed(2), wy: +wy.toFixed(2), wz: +wz.toFixed(2), hits: D.rayReport(sx, sy, 4) });
})`;

for (const view of ['reset', 'side', 'front', 'top']) {
  await evaluate(`window.__threeCellDebug.setView('${view}')`);
  await sleep(2300);
  console.log(`\n===== ${view}（相机 ${await evaluate('JSON.stringify([+window.__threeCellDebug.camera.position.x.toFixed(1),+window.__threeCellDebug.camera.position.y.toFixed(1),+window.__threeCellDebug.camera.position.z.toFixed(1)])')}） =====`);
  for (const dLon of [0]) {
    for (const lat of [80, 82, 84, 85, 86, 87, 88, 89]) {
      const r = JSON.parse(await evaluate(`${probe}(${lat}, ${dLon})`));
      const first = r.hits[0] || { what: 'none' };
      console.log(`  lat=${lat} dLon=${dLon} 屏(${r.sx},${r.sy}) 第一命中=${first.what}  链=${r.hits.map(h => h.what + '@r' + h.r).join(' → ')}`);
    }
  }
}

try { ws.close(); } catch {} try { chrome.kill('SIGKILL'); } catch {}
await sleep(200); process.exit(0);
