// 播放态连拍：第三步动画进行中截多张，检查鬼影是否仅动画中出现
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const rawUrl = process.argv[2];
const url = rawUrl.includes('?') ? rawUrl : rawUrl + '?state=guided';
const outDir = resolve('.shots-playing');
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
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(outDir, name + '.png'), Buffer.from(r.data, 'base64'));
  console.log('✔ ' + name + '.png');
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

// 第一步看一眼（播放态）
await sleep(4000);
await shot('step1-playing');

// 第二步：等 morph 推进完成后播放态连拍
await evaluate(`document.querySelector('.step-dot[data-step="1"]')?.click();
  document.getElementById('step-notification')?.classList.remove('show'); true;`);
await sleep(15000);
await shot('step2-playing-a');
await sleep(2500);
await shot('step2-playing-b');

// 第三步：进入后播放态连拍
await evaluate(`document.querySelector('.step-dot[data-step="2"]')?.click();
  document.getElementById('step-notification')?.classList.remove('show'); true;`);
await sleep(6000);
await shot('step3-playing-a');
await sleep(2500);
await shot('step3-playing-b');
await sleep(2500);
await shot('step3-playing-c');

console.log('连拍完成');
await cleanup(0);
