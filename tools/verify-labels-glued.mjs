// 验证：气压带/风带标签锚定到地球模型（earthGroup 子对象）后，
// 在 重置/俯视/侧视 三个视角下截图 —— 标签应随球面联动，不再停在屏幕固定位置。
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const rawUrl = process.argv[2];
const url = rawUrl.includes('?') ? rawUrl : rawUrl + '?state=guided';
const outDir = resolve('.shots-glued');
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

// 走到第三步
await evaluate(`document.querySelector('.step-dot[data-step="1"]')?.click();
  document.getElementById('step-notification')?.classList.remove('show'); true;`);
await sleep(8000);
await evaluate(`document.querySelector('.step-dot[data-step="2"]')?.click();
  document.getElementById('step-notification')?.classList.remove('show'); true;`);
await sleep(6000);
await evaluate(`window.__threeCellDebug.STATE.playing = false; true;`);
await sleep(600);

const shot = async (name) => {
  const img = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(outDir, `${name}.png`), Buffer.from(img.data, 'base64'));
  console.log(`✔ ${name}.png`);
};

// 标签世界坐标采样（验证联动：同一标签在不同视角下屏幕位置应不同、且世界坐标随 earthGroup 旋转）
const sampleLabels = () => evaluate(`(() => {
  const out = [];
  document.querySelectorAll('.pressure-label, .lat-label').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > 0) out.push({ t: el.textContent.slice(0, 6), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) });
  });
  return out;
})()`);

await evaluate(`window.__threeCellDebug.setView('reset'); true;`);
await sleep(900);
await shot('step3-reset');
const resetPos = await sampleLabels();

await evaluate(`window.__threeCellDebug.setView('top'); true;`);
await sleep(900);
await shot('step3-top');
const topPos = await sampleLabels();

await evaluate(`window.__threeCellDebug.setView('side'); true;`);
await sleep(900);
await shot('step3-side');
const sidePos = await sampleLabels();

// 对比：气压带标签（pressure-label）屏幕位置应随视角明显变化（=贴球联动）
const pick = (arr, t) => arr.find(o => o.t.startsWith(t));
for (const key of ['赤道低', '副热带', '极地高']) {
  const a = pick(resetPos, key), b = pick(topPos, key), c = pick(sidePos, key);
  if (!a || !b || !c) { console.log(`${key}: 有视角下不可见（被遮挡剔除）reset=${!!a} top=${!!b} side=${!!c}`); continue; }
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  console.log(`${key}: reset(${a.x},${a.y}) top(${b.x},${b.y}) side(${c.x},${c.y}) → reset↔top 移动 ${Math.round(d)}px ${d > 60 ? '✔ 随球联动' : '⚠ 几乎没动'}`);
}

await cleanup(0);
