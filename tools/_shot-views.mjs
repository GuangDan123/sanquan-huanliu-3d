// 临时：把第 3 步在若干预设视角下各截一张图，便于人眼核对"标签是否真的在色带上"。
// 用法：node tools/_shot-views.mjs [outDir] [view1,view2,...]
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const outDir = resolve(process.argv[2] || '.shots-views');
const VIEWS = (process.argv[3] || 'reset,side,front,top').split(',');
const url = 'http://127.0.0.1:8123/' + encodeURIComponent('三圈环流3D交互式教学平台.html') + '?state=none';
const PORT = 9800 + (process.pid % 150);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

await mkdir(outDir, { recursive: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--force-device-scale-factor=1',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(outDir, 'profile')}`,
  '--window-size=1600,1000', 'about:blank'
], { stdio: 'ignore' });

let target = null;
for (let i = 0; i < 40 && !target; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }); if (r.ok) target = await r.json(); } catch {}
  if (!target) await sleep(400);
}
if (!target) { console.error('CDP 未就绪'); chrome.kill('SIGKILL'); process.exit(2); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
});
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });

let ready = false;
for (let i = 0; i < 60 && !ready; i++) { await sleep(500); try { ready = await evaluate('!!(window.__threeCellDebug && window.__threeCellDebug.camera)'); } catch {} }
if (!ready) { console.error('调试钩子未就绪'); chrome.kill('SIGKILL'); process.exit(2); }

await evaluate(`(() => {
  document.getElementById('welcome-modal')?.classList.remove('show');
  document.querySelector('.step-dot[data-step="2"]')?.click();
  return true; })()`);
await sleep(4500);
const on = await evaluate(`!!document.getElementById('tog-pressure')?.classList.contains('active')`);
if (!on) { await evaluate(`document.getElementById('tog-pressure').click()`); await sleep(2500); }
for (let i = 0; i < 6; i++) {
  const blocked = await evaluate(`(() => {
    ['welcome-modal','step-notification','video-modal'].forEach(id => document.getElementById(id)?.classList.remove('show'));
    return ['welcome-modal','step-notification','video-modal'].filter(id => document.getElementById(id)?.classList.contains('show')); })()`);
  if (!blocked.length) break;
  await sleep(500);
}

for (const view of VIEWS) {
  if (view !== 'asis') { await evaluate(`window.__threeCellDebug.setView('${view}')`); await sleep(2400); }
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const f = join(outDir, `view-${view}.png`);
  await writeFile(f, Buffer.from(shot.data, 'base64'));
  console.log('✔ ' + f);
}

try { ws.close(); } catch {}
try { chrome.kill('SIGKILL'); } catch {}
await sleep(200);
process.exit(0);
