// 验收：第三步中「气压带标签是否贴在模型色带的可见段上」——用真实渲染（射线检测）判定。
//
// 判据：
//   ① 标签中心与该色带"可见部分"的屏幕距离 ≤ 12px（色带不可见时豁免并标注）
//   ② 标签两两不重叠，且不与纬度/风带标签重叠（真实 DOM 矩形）
//   ③ 全部标签在视口内
//
// 用法：node tools/verify-belt-labels.mjs [页面URL]
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const rawUrl = process.argv[2] || 'http://127.0.0.1:8123/%E4%B8%89%E5%9C%88%E7%8E%AF%E6%B5%813D%E4%BA%A4%E4%BA%92%E5%BC%8F%E6%95%99%E5%AD%A6%E5%B9%B3%E5%8F%B0.html';
const url = rawUrl.includes('?') ? rawUrl : rawUrl + '?state=none';
const outDir = resolve('.verify-belt');
const PORT = 9600 + (process.pid % 250);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

await mkdir(outDir, { recursive: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--force-device-scale-factor=1',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(outDir, 'profile')}`,
  '--window-size=1600,1000', 'about:blank'
], { stdio: 'ignore' });
const cleanup = async (c) => { try { ws?.close(); } catch {} try { chrome.kill('SIGKILL'); } catch {} await sleep(200); process.exit(c); };

let target = null;
for (let i = 0; i < 40 && !target; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }); if (r.ok) target = await r.json(); } catch {}
  if (!target) await sleep(400);
}
if (!target) { console.error('✘ CDP 未就绪'); await cleanup(2); }

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
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });

let ready = false;
for (let i = 0; i < 60 && !ready; i++) {
  await sleep(500);
  try { ready = await evaluate('!!(window.__threeCellDebug && window.__threeCellDebug.camera)'); } catch {}
}
if (!ready) { console.error('✘ 页面调试钩子未就绪'); await cleanup(2); }

// 关弹窗 → 切到第 3 步 → 打开气压带
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

// ── 多视角复测：标签随相机每帧重算，各视角都要"贴带 + 不重叠 + 不出视口" ──
const VIEWS = process.argv[3] === 'one' ? ['reset'] : ['reset', 'side', 'front', 'top'];
let fail = 0;
const check = (ok, msg) => { console.log((ok ? '  ✔ ' : '  ✘ ') + msg); if (!ok) fail++; };

const measure = async () => {
  const belts = await evaluate('JSON.stringify(window.__threeCellDebug.beltVisibility())').then(JSON.parse);
  const press = await evaluate(`JSON.stringify(window.__threeCellDebug.pressureLabels.map(pl => {
    const r = pl.obj.element.getBoundingClientRect();
    const cs = getComputedStyle(pl.obj.element);
    return { lat: pl.data.lat, text: pl.obj.element.textContent.trim(),
      visible: pl.obj.visible && r.width > 0 && cs.display !== 'none' && Number(cs.opacity) > 0.05,
      x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      cx: +(r.left + r.width / 2).toFixed(1), cy: +(r.top + r.height / 2).toFixed(1) };
  }))`).then(JSON.parse);
  const dom = await evaluate(`(() => {
    const pick = (sel) => [...document.querySelectorAll(sel)].map(el => {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      return { text: (el.textContent || '').trim(),
        visible: r.width > 0 && r.height > 0 && cs.display !== 'none' && Number(cs.opacity) > 0.05,
        x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        cx: +(r.left + r.width / 2).toFixed(1), cy: +(r.top + r.height / 2).toFixed(1) };
    });
    return { viewport: { w: innerWidth, h: innerHeight }, labels: pick('.lat-label, .pressure-label') };
  })()`);
  return { belts, press, dom };
};

for (const view of VIEWS) {
  await evaluate(`window.__threeCellDebug.setView('${view}')`);
  await sleep(2200);   // 视角动画 800ms + 稳定
  const { belts, press, dom } = await measure();
  console.log(`\n########## 视角 ${view}（相机 ${await evaluate('JSON.stringify([+window.__threeCellDebug.camera.position.x.toFixed(1),+window.__threeCellDebug.camera.position.y.toFixed(1),+window.__threeCellDebug.camera.position.z.toFixed(1)])')}） ##########`);
  console.log('色带可见情况：' + belts.map(b => `${b.lat}°:${b.visible}点/${b.yRange ? b.yRange.join('~') : '不可见'}`).join('  '));

  console.log('判据 1：标签"脚下"是否就是本色带的可见段');
  for (const p of press.filter(p => p.visible)) {
    const belt = belts.find(b => b.lat === p.lat);
    if (!belt || !belt.visible) {
      console.log(`  · ${String(p.lat).padStart(4)}° 色带不可见 → 免检：「${p.text}」(${p.cx}, ${p.cy})`);
      continue;
    }
    const under = belt.pts.filter(([x]) => Math.abs(x - p.cx) <= p.w / 2);
    if (!under.length) { check(false, `${String(p.lat).padStart(4)}° 「${p.text}」脚下没有可见色带`); continue; }
    const ys = under.map(([, y]) => y);
    const lo = Math.min(...ys), hi = Math.max(...ys);
    check(p.cy >= lo - 6 && p.cy <= hi + 6,
      `${String(p.lat).padStart(4)}° 「${p.text}」y=${p.cy} ∈ 脚下色带 ${lo.toFixed(0)}~${hi.toFixed(0)}（${under.length} 点）`);
  }

  const vis = dom.labels.filter(l => l.visible);
  const ov = [];
  for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
    const a = vis[i], b = vis[j];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 2 && oy > 2) ov.push(`${a.text} × ${b.text} ${Math.round(ox)}×${Math.round(oy)}px`);
  }
  check(ov.length === 0, ov.length ? '标签重叠：\n      ' + ov.join('\n      ') : `判据 2：${vis.length} 个可见标签零重叠`);
  const oob = vis.filter(l => l.x < 0 || l.y < 0 || l.x + l.w > dom.viewport.w || l.y + l.h > dom.viewport.h);
  check(oob.length === 0, oob.length ? '判据 3：出视口 → ' + oob.map(l => l.text).join('、') : '判据 3：全部在视口内');
}

console.log(fail === 0 ? '\n✔ 全部通过' : `\n✘ ${fail} 项未通过`);
await cleanup(fail === 0 ? 0 : 1);
