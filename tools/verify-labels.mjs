// 验收脚本：标签是否落在地球"视轮廓外侧"（不遮挡地球与环流圈）
// 判据：把标签的世界坐标投影到屏幕，其到屏幕中心的像素距离
//       必须大于地球球体的投影半径（切线半径）。
// 用法：node tools/verify-labels.mjs <页面URL> <输出目录>
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2];
const outDir = process.argv[3] || join(process.cwd(), '.verify-labels');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9418;
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

// 让页面用真实相机计算：标签世界坐标 → 屏幕像素距中心距离，并与地球投影（切线）半径比较
const measure = () => ev(`(function(){
  try {
    const d = window.__threeCellDebug;
    if (!d) return JSON.stringify({ error: 'no debug hook' });
    const cam = d.camera, R = d.earthRadius;
    if (!cam) return JSON.stringify({ error: 'no camera' });
    if (typeof d.makeVector3 !== 'function') return JSON.stringify({ error: 'no makeVector3' });
    const w = window.innerWidth, h = window.innerHeight;
    const f = (h / 2) / Math.tan(cam.fov * Math.PI / 360);
    const camDist = cam.position.length();
    const globePx = f * Math.tan(Math.asin(Math.min(1, R / camDist)));
    const cx = w / 2, cy = h / 2;
    const V = d.makeVector3;
    const out = [];
    d.labelWorldPositions.forEach(l => {
      const v = new V(l.x, l.y, l.z);
      const ndc = v.project(cam);
      const sx = (ndc.x * 0.5 + 0.5) * w;
      const sy = (-ndc.y * 0.5 + 0.5) * h;
      const dist = Math.hypot(sx - cx, sy - cy);
      out.push({ kind: l.kind, text: l.text, dist: +dist.toFixed(0), outside: dist > globePx, sx: +sx.toFixed(0), sy: +sy.toFixed(0), wx: l.x, wy: l.y, wz: l.z });
    });
    return JSON.stringify({
      globePx: +globePx.toFixed(0), camDist: +camDist.toFixed(2),
      camPos: [+cam.position.x.toFixed(2), +cam.position.y.toFixed(2), +cam.position.z.toFixed(2)],
      w, h, labels: out
    });
  } catch (e) { return JSON.stringify({ error: String(e && e.message || e) }); }
})()`);

await ev(`document.getElementById('btn-start-guided').click(); 1`);
await sleep(2500);
await ev(`document.querySelectorAll('.step-dot')[1].click(); 1`);
await sleep(6000);
const m1 = JSON.parse(await measure());
await snap('l1-step2-default.png');

// 切到侧视再看一次（轮廓位置会随相机变化）
await ev(`document.querySelector('[data-view="side"]').click(); 1`);
await sleep(2500);
const m2 = JSON.parse(await measure());
await snap('l2-step2-side.png');

// 第三步（气压带标签开启）
await ev(`document.querySelectorAll('.step-dot')[2].click(); 1`);
await sleep(5000);
const m3 = JSON.parse(await measure());
await snap('l3-step3.png');

const report = (name, m) => {
  if (m.error) { console.log(`\n=== ${name} ===  测量失败：${m.error}`); return [{ text: m.error }]; }
  console.log(`\n=== ${name}  地球投影半径=${m.globePx}px  相机距离=${m.camDist}  位置=${(m.camPos || []).join(',')} ===`);
  const bad = m.labels.filter(l => !l.outside);
  m.labels.forEach(l => console.log(`  ${l.outside ? '外侧 ✔' : '内侧 ✘'} ${String(l.dist).padStart(4)}px  @(${l.sx},${l.sy})  世界(${l.wx},${l.wy},${l.wz})  [${l.kind}] ${l.text}`));
  return bad;
};
const bad1 = report('默认视角 · 第二步', m1);
const bad2 = report('侧视 · 第二步', m2);
const bad3 = report('第三步（含气压带标签）', m3);

let pass = true;
const check = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) pass = false; };
console.log('\n===== 断言 =====');
check(bad1.length === 0, `默认视角下所有标签都在地球轮廓外侧（越界 ${bad1.length} 个：${bad1.map(b => b.text).join('/') || '无'}）`);
check(bad2.length === 0, `侧视下所有标签都在外侧（越界 ${bad2.length} 个：${bad2.map(b => b.text).join('/') || '无'}）`);
check(bad3.length === 0, `第三步含气压带标签时仍全部在外侧（越界 ${bad3.length} 个：${bad3.map(b => b.text).join('/') || '无'}）`);
check(exceptions.length === 0, `无未捕获异常${exceptions.length ? '：' + exceptions.join(' | ') : ''}`);
check(errors.length === 0, `无控制台错误${errors.length ? '：' + errors.join(' | ') : ''}`);

console.log(`\n总体：${pass ? '全部通过 ✔' : '存在失败项 ✘'}`);
console.log('截图：' + outDir);
await bail(pass ? 0 : 2);
