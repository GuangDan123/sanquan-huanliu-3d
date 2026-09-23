// 截图 + 真实 DOM 量测：在无头 Chrome 中打开作品页，切到指定步骤，
// 读取所有标签的 getBoundingClientRect（真实像素），并截图。
//
// 用法：node tools/shot-step.mjs <页面URL> <步骤(0|1|2)> <输出目录>
//   例：node tools/shot-step.mjs http://127.0.0.1:8123/xxx.html 2 .shots
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const rawUrl = process.argv[2];
// 页面支持 ?state=guided 跳过欢迎弹窗（弹窗会遮住整个场景）
const url = rawUrl.includes('?') ? rawUrl : rawUrl + '?state=guided';
const step = Number(process.argv[3] ?? 2);
const outDir = resolve(process.argv[4] || '.shots');
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

// ── 等待 CDP 就绪并新建标签页 ──
let target = null;
for (let i = 0; i < 40 && !target; i++) {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
    if (r.ok) target = await r.json();
  } catch {}
  if (!target) await sleep(400);
}
if (!target) { console.error('✘ CDP 未就绪，无法新建标签页'); await cleanup(2); }

// ── 连接页面 WebSocket ──
ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
const events = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve: res, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : res(msg.result);
  } else if (msg.method) {
    events.push(msg);
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

const evaluate = async (expr, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });

// ── 等待页面初始化 ──
let ready = false;
for (let i = 0; i < 60 && !ready; i++) {
  await sleep(500);
  try { ready = await evaluate('!!(window.__threeCellDebug && window.__threeCellDebug.camera)'); } catch {}
}
if (!ready) console.error('⚠ 页面调试钩子未就绪，仍继续尝试截图');

// ── 关闭欢迎弹窗（否则遮住整个场景）──
await evaluate(`(() => {
  const w = document.getElementById('welcome-modal');
  if (w && w.classList.contains('show')) {
    document.getElementById('btn-start-guided')?.click() ?? w.classList.remove('show');
  }
  w?.classList.remove('show');
  return true;
})()`);
await sleep(1500);

// ── 切到目标步骤 ──
await evaluate(`(() => {
  const dot = document.querySelector('.step-dot[data-step="${step}"]');
  if (dot) dot.click();
  // 关闭可能弹出的引导通知，避免遮挡
  const n = document.getElementById('step-notification');
  if (n) n.classList.remove('show');
  return true;
})()`);

// 步骤切换带过渡动画，多等一会儿让标签朝向/显隐稳定
await sleep(4500);

// 确保气压带/风带标签处于开启状态（第 3 步）
if (step >= 2) {
  const on = await evaluate(`!!document.getElementById('tog-pressure')?.classList.contains('active')`);
  if (!on) { await evaluate(`document.getElementById('tog-pressure').click()`); await sleep(2500); }
}

// ── 截图前再次清理遮挡层（欢迎弹窗可能在初始化后才弹出）──
for (let i = 0; i < 6; i++) {
  const blocked = await evaluate(`(() => {
    ['welcome-modal', 'step-notification', 'video-modal'].forEach(id => {
      document.getElementById(id)?.classList.remove('show');
    });
    return ['welcome-modal', 'step-notification', 'video-modal']
      .filter(id => document.getElementById(id)?.classList.contains('show'));
  })()`);
  if (blocked.length === 0) break;
  await sleep(500);
}

// ── 真实 DOM 量测 ──
const dom = await evaluate(`(() => {
  const pick = (sel, cls) => [...document.querySelectorAll(sel)].map(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      text: (el.textContent || '').trim(),
      cls,
      visible: r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05,
      x: +r.left.toFixed(1), y: +r.top.toFixed(1),
      w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      cx: +(r.left + r.width / 2).toFixed(1), cy: +(r.top + r.height / 2).toFixed(1)
    };
  });
  const all = [
    ...pick('.lat-label, .pressure-label', 'label'),
  ];
  return {
    viewport: { w: innerWidth, h: innerHeight },
    items: all,
    stepPill: document.querySelector('.step-dot.active')?.dataset.step ?? null
  };
})()`);

console.log(`视口 ${dom.viewport.w}x${dom.viewport.h}  当前步骤 ${dom.stepPill}`);
const vis = dom.items.filter(i => i.visible);
console.log(`标签总数 ${dom.items.length}，可见 ${vis.length}`);
const byRow = vis.slice().sort((a, b) => a.cy - b.cy);
const pad = (s, n) => String(s).padEnd(n, ' ');
console.log('\n' + pad('标签', 22) + pad('左', 8) + pad('上', 8) + pad('宽', 6) + pad('高', 6) + '中心x/中心y');
console.log('-'.repeat(72));
for (const i of byRow) {
  console.log(pad(i.text.slice(0, 20), 22) + pad(i.x, 8) + pad(i.y, 8) + pad(i.w, 6) + pad(i.h, 6) + i.cx + ' / ' + i.cy);
}

// ── 重叠检测（真实像素）──
const ov = [];
for (let i = 0; i < vis.length; i++) {
  for (let j = i + 1; j < vis.length; j++) {
    const a = vis[i], b = vis[j];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 2 && oy > 2) ov.push(`${a.text} × ${b.text}  ${Math.round(ox)}×${Math.round(oy)}px`);
  }
}
console.log('\n真实像素重叠：' + (ov.length ? '\n  ' + ov.join('\n  ') : '✔ 无'));

await writeFile(join(outDir, `dom-step${step}.json`), JSON.stringify(dom, null, 2), 'utf8');

// ── 截图 ──
await sleep(1200);   // 等遮罩淡出动画（0.4s）彻底结束
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
await writeFile(join(outDir, `step${step}.png`), Buffer.from(shot.data, 'base64'));
console.log(`\n✔ 截图: ${join(outDir, `step${step}.png`)}`);

await cleanup(0);
