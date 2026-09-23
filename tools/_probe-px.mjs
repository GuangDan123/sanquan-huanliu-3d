// 临时：在指定视角下，对若干屏幕像素打印"从前到后"的命中清单，查清遮挡物。
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const outDir = resolve('.probe-px');
const url = 'http://127.0.0.1:8123/' + encodeURIComponent('三圈环流3D交互式教学平台.html') + '?state=none';
const PORT = 9900 + (process.pid % 40);
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
for (let i = 0; i < 6; i++) { const b = await evaluate(`(() => { ['welcome-modal','step-notification','video-modal'].forEach(id => document.getElementById(id)?.classList.remove('show')); return ['welcome-modal','step-notification','video-modal'].filter(id => document.getElementById(id)?.classList.contains('show')); })()`); if (!b.length) break; await sleep(500); }

for (const [view, pts] of [['side', [[800, 139.6], [800, 142.7], [800, 860.4], [800, 857.3]]], ['front', [[800, 139.6]]]]) {
  await evaluate(`window.__threeCellDebug.setView('${view}')`);
  await sleep(2300);
  console.log(`\n=== ${view} ===`);
  for (const [x, y] of pts) {
    const r = JSON.parse(await evaluate(`JSON.stringify(window.__threeCellDebug.rayReport(${x}, ${y}, 5))`));
    console.log(`  像素(${x},${y}):  ${r.map(h => `${h.what}[${h.geo}/${h.mat}/${h.color}/op${h.op}] dist=${h.dist} r=${h.r}`).join('\n              → ')}`);
  }
}
try { ws.close(); } catch {} try { chrome.kill('SIGKILL'); } catch {}
await sleep(200); process.exit(0);
