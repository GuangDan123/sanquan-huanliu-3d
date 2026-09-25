// 验收脚本：检测"地转偏向力"相关标签之间是否重叠（矩形相交即判为重叠）
// 直接在页面里读取各标签 DOM 的实际位置与尺寸，最贴近真实观感。
// 用法：node tools/verify-label-overlap.mjs <页面URL> <输出目录>
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2];
const outDir = process.argv[3] || join(process.cwd(), '.verify-overlap');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9421;
const profile = join(outDir, 'chrome-profile');
await mkdir(outDir, { recursive: true });
await rm(profile, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1600,1000', 'about:blank'
], { stdio: 'ignore' });
const bail = async (c) => { try { chrome.kill('SIGKILL'); } catch {} await sleep(300); process.exit(c); };

let target = null;
for (let i = 0; i < 30; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
    if (r.ok) { target = await r.json(); break; } } catch {}
  await sleep(400);
}
if (!target) { console.error('CDP 启动失败'); await bail(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map(); const exceptions = []; const errors = [];
const send = (m, p = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Log.entryAdded' && /error|failed|404/i.test(m.params.entry.text)) errors.push(m.params.entry.text);
});
await new Promise(r => ws.addEventListener('open', r));
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await sleep(9000);

const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.value;
const snap = async (n) => { const s = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(outDir, n), Buffer.from(s.data, 'base64')); };

// 读取所有"可见"的 coriolis / lat / pressure 标签的屏幕矩形，并两两求交
const checkOverlap = () => ev(`(function(){
  try {
    const d = window.__threeCellDebug;
    const items = [];
    const collect = (arr, kind) => arr.forEach(l => {
      const el = l.obj && l.obj.element;
      if (!el) return;
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return;
      // 元素是否位于可见父级（CSS2D 会把隐藏对象的 element 也留在 DOM 中，用 offsetParent 判断）
      if (el.offsetParent === null && st.position !== 'fixed') return;
      if (!l.obj.visible) return;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      // 视口外的标签虽然在 DOM 中，但用户看不到，不计入重叠判定
      if (r.right < 0 || r.bottom < 0 || r.left > window.innerWidth || r.top > window.innerHeight) return;
      items.push({ kind, text: (el.textContent || '').slice(0, 20), x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
    });
    collect(d.latLabels || [], 'lat');
    collect(d.pressureLabels || [], 'pressure');
    collect(d.coriolisLabels || [], 'coriolis');
    // coriolis 强度标签（deflectionIndicators 里的 CSS2DObject）
    (d.deflectionIndicators || []).forEach(o => {
      const el = o && o.element;
      if (!el || !o.visible) return;
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      if (r.right < 0 || r.bottom < 0 || r.left > window.innerWidth || r.top > window.innerHeight) return;
      items.push({ kind: 'deflect', text: (el.textContent || '').slice(0, 20), x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
    });

    const overlaps = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox > 0 && oy > 0) {
          overlaps.push({ a: a.kind + ':' + a.text, b: b.kind + ':' + b.text, area: +(ox * oy).toFixed(0), ox: +ox.toFixed(1), oy: +oy.toFixed(1) });
        }
      }
    }
    return JSON.stringify({ step: d.STATE.step, total: items.length, items, overlaps });
  } catch (e) { return JSON.stringify({ error: String(e && e.message || e) }); }
})()`);

await ev(`document.getElementById('btn-start-guided').click(); 1`);
await sleep(2500);
await ev(`document.querySelectorAll('.step-dot')[1].click(); 1`);
await sleep(6000);
const m1 = JSON.parse(await checkOverlap());
await snap('o1-step2-default.png');

await ev(`document.querySelector('[data-view="front"]').click(); 1`);
await sleep(2500);
const m2 = JSON.parse(await checkOverlap());
await snap('o2-step2-front.png');

await ev(`document.querySelector('[data-view="top"]').click(); 1`);
await sleep(2500);
const m3 = JSON.parse(await checkOverlap());
await snap('o3-step2-top.png');

const report = (name, m) => {
  if (m.error) { console.log(`\n=== ${name} ===  测量失败：${m.error}`); return [{ area: 1, a: m.error, b: '' }]; }
  console.log(`\n=== ${name}  可见标签 ${m.total} 个，重叠 ${m.overlaps.length} 对 ===`);
  m.items.forEach(i => console.log(`  [${i.kind}] ${i.text}  @(${i.x},${i.y}) ${i.w}x${i.h}`));
  m.overlaps.forEach(o => console.log(`  ⚠ 重叠 ${o.area}px²  ${o.a}  ×  ${o.b}`));
  return m.overlaps;
};
const ov1 = report('默认斜视 · 第二步', m1);
const ov2 = report('平视 · 第二步', m2);
const ov3 = report('俯视 · 第二步', m3);

let pass = true;
const check = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) pass = false; };
console.log('\n===== 断言 =====');
check(ov1.length === 0, `默认视角无标签重叠（${ov1.length} 对）`);
check(ov2.length === 0, `平视无标签重叠（${ov2.length} 对）`);
check(ov3.length === 0, `俯视无标签重叠（${ov3.length} 对）`);
check(exceptions.length === 0, `无未捕获异常${exceptions.length ? '：' + exceptions.join(' | ') : ''}`);
check(errors.length === 0, `无控制台错误${errors.length ? '：' + errors.join(' | ') : ''}`);

console.log(`\n总体：${pass ? '全部通过 ✔' : '存在失败项 ✘'}`);
console.log('截图：' + outDir);
await bail(pass ? 0 : 2);
