// 验收脚本：第三步标签分工布置
//   要求 1) 气压带标签位于大气层附近   2) 纬度标签位于地球左侧   3) 风带标签不变
//   另外校验：标签不出视口、同类与跨类之间无重叠（含你截图那种堆叠）
// 用法：node tools/verify-label-layout.mjs <页面URL> <输出目录>
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2];
const outDir = process.argv[3] || join(process.cwd(), '.verify-layout');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9425;
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

// 逐类读取：世界半径、屏幕位置、可见性、矩形；并做重叠检测
const probe = () => ev(`(function(){
  try {
    const d = window.__threeCellDebug, cam = d.camera, R = d.earthRadius, ATM = d.atmosphereRadius;
    const V = d.makeVector3;
    const W = innerWidth, H = innerHeight;
    const cx = W / 2, cy = H / 2;
    const groups = { lat: d.latLabels, pressure: d.pressureLabels, vertical: d.verticalLabels };
    const items = [];
    Object.entries(groups).forEach(([kind, arr]) => {
      (arr || []).forEach(l => {
        const o = l.obj;
        if (!o || !o.visible) return;
        const e = o.matrixWorld.elements;
        const wp = new V(e[12], e[13], e[14]);
        const radius = Math.hypot(wp.x, wp.y, wp.z);
        const ndc = wp.clone().project(cam);
        const sx = (ndc.x*0.5+0.5)*W, sy = (-ndc.y*0.5+0.5)*H;
        const el = o.element;
        let rect = null;
        if (el) { const b = el.getBoundingClientRect(); if (b.width > 1) rect = { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; }
        items.push({ kind, text: (el ? el.textContent : '').slice(0, 16), radius: +radius.toFixed(2), sx: +sx.toFixed(0), sy: +sy.toFixed(0),
          onScreen: sx >= 0 && sx <= W && sy >= 0 && sy <= H, rect });
      });
    });
    // 重叠检测（仅屏幕内且有矩形的）
    const vis = items.filter(i => i.onScreen && i.rect);
    const overlaps = [];
    for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
      const a = vis[i].rect, b = vis[j].rect;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 0 && oy > 0) overlaps.push({ a: vis[i].kind + ':' + vis[i].text, b: vis[j].kind + ':' + vis[j].text, area: Math.round(ox * oy) });
    }
    return JSON.stringify({ step: d.STATE.step, R, ATM, viewport: [W, H], items, overlaps });
  } catch (e) { return JSON.stringify({ error: String(e && e.message || e) }); }
})()`);

await ev(`document.getElementById('btn-start-guided').click(); 1`);
await sleep(2500);
await ev(`document.querySelectorAll('.step-dot')[2].click(); 1`);
await sleep(6000);
const s3 = JSON.parse(await probe());
await snap('layout-step3.png');

await ev(`document.querySelector('[data-view="side"]').click(); 1`);
await sleep(2500);
const s3side = JSON.parse(await probe());
await snap('layout-step3-side.png');

const report = (t, m) => {
  if (m.error) { console.log(`\n=== ${t} ===  测量失败：${m.error}`); return; }
  console.log(`\n=== ${t}  视口 ${m.viewport.join('x')}  地球半径=${m.R}  大气层=${m.ATM} ===`);
  ['lat', 'pressure', 'vertical'].forEach(k => {
    const list = m.items.filter(i => i.kind === k);
    if (!list.length) return;
    console.log(`  [${k}] ${list.length} 个`);
    list.forEach(i => console.log(`     ${String(i.text).padEnd(18)} 半径=${String(i.radius).padEnd(5)} 屏幕(${i.sx},${i.sy}) ${i.onScreen ? '视口内' : '视口外✘'}`));
  });
  console.log(`  重叠 ${m.overlaps.length} 对`);
  m.overlaps.forEach(o => console.log(`     ⚠ ${o.area}px²  ${o.a} × ${o.b}`));
};
report('第三步 · 默认视角', s3);
report('第三步 · 侧视', s3side);

let pass = true;
const check = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) pass = false; };

const lat = s3.items.filter(i => i.kind === 'lat' && i.rect);
const pres = s3.items.filter(i => i.kind === 'pressure' && i.rect);
const R = s3.R, ATM = s3.ATM;

console.log('\n===== 断言 =====');
// 1) 气压带标签在大气层附近（球面之外，且不明显超出大气层）
const presRadii = [...new Set(pres.map(i => i.radius))];
check(presRadii.length > 0 && presRadii.every(r => r > R && r <= ATM + 1.0), `气压带标签位于大气层(${ATM})附近（球面 ${R} 之外）：${presRadii.join('/')}`);

// 2) 非极点纬度标签在地球左侧（极点标签在球面顶端，x 必然居中）
const latNonPolar = lat.filter(i => Math.abs(i.sy - Math.min(...lat.map(l => l.sy))) > 30);
const latCenters = latNonPolar.map(i => i.rect.x + i.rect.w / 2);
const latLeft = latCenters.filter(x => x < s3.viewport[0] / 2).length;
check(latNonPolar.length > 0 && latLeft === latNonPolar.length, `非极点纬度标签全部位于画面左半侧（${latLeft}/${latNonPolar.length}，中心 x=${latCenters.map(v => v.toFixed(0)).join('/')}，画面中心 ${s3.viewport[0] / 2}）`);

// 3) 风带标签半径未被改动（仅数值可能因避让极地标签而略调，这里只校验档位一致）
const windLike = pres.filter(i => /信风|西风|东风/.test(i.text));
const windRadii = [...new Set(windLike.map(i => i.radius))];
check(windRadii.length === 1 && Math.abs(windRadii[0] - (R + 0.55)) < 0.05, `风带标签保持同一半径、位置关系不变：${windRadii.join('/')}`);

// 4) 气压带标签与纬度标签分置两侧（方位角差约 90°）
const latGroup = lat.length ? { x: lat.reduce((a, i) => a + i.sx, 0) / lat.length, y: lat.reduce((a, i) => a + i.sy, 0) / lat.length } : null;
const presGroup = pres.length ? { x: pres.reduce((a, i) => a + i.sx, 0) / pres.length, y: pres.reduce((a, i) => a + i.sy, 0) / pres.length } : null;
check(latGroup && presGroup && Math.hypot(latGroup.x - presGroup.x, latGroup.y - presGroup.y) > 200,
  `纬度标签与气压带/风带标签分置两侧（屏幕间距 ${latGroup && presGroup ? Math.round(Math.hypot(latGroup.x - presGroup.x, latGroup.y - presGroup.y)) : '—'}px）`);

check(s3.overlaps.length === 0, `默认视角无标签重叠（${s3.overlaps.length} 对）`);
check(s3side.overlaps.length === 0, `侧视无标签重叠（${s3side.overlaps.length} 对）`);
check(s3.items.every(i => i.onScreen) && s3side.items.every(i => i.onScreen), '全部标签都在视口内');
check(exceptions.length === 0, `无未捕获异常${exceptions.length ? '：' + exceptions.join(' | ') : ''}`);
check(errors.length === 0, `无控制台错误${errors.length ? '：' + errors.join(' | ') : ''}`);

console.log(`\n总体：${pass ? '全部通过 ✔' : '存在失败项 ✘'}`);
console.log('截图：' + outDir);
await bail(pass ? 0 : 2);
