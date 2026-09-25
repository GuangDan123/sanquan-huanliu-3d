// 验收脚本：第二步"地转偏向力强度标尺"面板
// 断言：
//   1) 第一步不显示该面板，第二步显示，第三步隐藏
//   2) 面板行数 = 档位数，且百分比单调递增（0% → 最高）
//   3) 三维场景中不再存在偏向力文字标签（改由面板承担，避免重叠）
//   4) 面板各行之间无重叠（含小视口 931x686）
// 用法：node tools/verify-deflect-scale.mjs <页面URL> <输出目录>
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2];
const outDir = process.argv[3] || join(process.cwd(), '.verify-scale');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9423;
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
await send('Emulation.setDeviceMetricsOverride', { width: 931, height: 686, deviceScaleFactor: 1, mobile: false });
await sleep(9000);

const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.value;
const snap = async (n) => { const s = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(outDir, n), Buffer.from(s.data, 'base64')); };

const probe = () => ev(`(function(){
  const panel = document.getElementById('deflect-scale');
  const rows = [...document.querySelectorAll('#deflect-scale .ds-row')].map(r => {
    const b = r.getBoundingClientRect();
    return { text: r.textContent.trim(), x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
  });
  // 三维场景里是否还有偏向力内容（应只剩"自转方向"这 1 个指示组）
  const d = window.__threeCellDebug;
  const sceneLabels = (d.deflectionIndicators || []).filter(o => o && o.element).length;
  const sceneObjects = (d.deflectionIndicators || []).length;
  // 面板行两两求交
  const ov = [];
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 0 && oy > 0) ov.push(a.text + ' × ' + b.text);
  }
  const cs = panel ? getComputedStyle(panel) : null;
  return JSON.stringify({
    step: d.STATE.step,
    panelVisible: !!(cs && cs.display !== 'none'),
    panelRect: panel ? (r => ({ x: +r.x.toFixed(0), y: +r.y.toFixed(0), w: +r.width.toFixed(0), h: +r.height.toFixed(0) }))(panel.getBoundingClientRect()) : null,
    rows, overlaps: ov, sceneLabels, sceneObjects,
    viewport: [innerWidth, innerHeight]
  });
})()`);

await ev(`document.getElementById('btn-start-guided').click(); 1`);
await sleep(2500);
await ev(`document.querySelectorAll('.step-dot')[0].click(); 1`);
await sleep(4500);
const s1 = JSON.parse(await probe());

await ev(`document.querySelectorAll('.step-dot')[1].click(); 1`);
await sleep(6000);
const s2 = JSON.parse(await probe());
await snap('scale-step2-931x686.png');

await ev(`document.querySelectorAll('.step-dot')[2].click(); 1`);
await sleep(5000);
const s3 = JSON.parse(await probe());

const show = (t, m) => {
  console.log(`\n=== ${t}  视口 ${m.viewport.join('x')} ===`);
  console.log(`  面板可见=${m.panelVisible}  尺寸=${m.panelRect ? m.panelRect.w + 'x' + m.panelRect.h : '—'}  三维文字标签=${m.sceneLabels}`);
  m.rows.forEach(r => console.log(`   ${String(r.text).padEnd(22)} @(${r.x},${r.y}) ${r.w}x${r.h}`));
  console.log(`  行间重叠=${m.overlaps.length} 对`);
};
show('第一步', s1); show('第二步', s2); show('第三步', s3);

let pass = true;
const check = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) pass = false; };
console.log('\n===== 断言 =====');
check(s1.panelVisible === false, '第一步不显示强度标尺（地球不自转模型不应有偏向力内容）');
check(s2.panelVisible === true, '第二步显示强度标尺');
check(s3.panelVisible === false, '第三步隐藏强度标尺（由气压带风带承接）');

const pcts = s2.rows.map(r => parseInt((r.text.match(/(\d+)%/) || [])[1] ?? '-1', 10));
check(s2.rows.length >= 4, `标尺包含多档（实际 ${s2.rows.length} 档）`);
check(pcts.every((v, i) => i === 0 || v > pcts[i - 1]), `强度百分比随纬度单调递增：${pcts.join(' → ')}%`);
check(pcts[0] === 0, `第一档（赤道）为 0%：${pcts[0]}%`);

check(s2.sceneLabels === 0, `三维场景中已无偏向力文字标签（实际 ${s2.sceneLabels} 个）`);
check(s2.sceneObjects === 1, `三维场景中只保留"北极自转方向"1 个指示（实际 ${s2.sceneObjects} 个）——大气层附近那排强度条已去除`);
check(s2.overlaps.length === 0, `标尺各行无重叠（${s2.overlaps.length} 对）`);
check(s2.panelRect && s2.panelRect.y > 0 && s2.panelRect.y + s2.panelRect.h < s2.viewport[1], '标尺完整落在视口内');

check(exceptions.length === 0, `无未捕获异常${exceptions.length ? '：' + exceptions.join(' | ') : ''}`);
check(errors.length === 0, `无控制台错误${errors.length ? '：' + errors.join(' | ') : ''}`);

console.log(`\n总体：${pass ? '全部通过 ✔' : '存在失败项 ✘'}`);
console.log('截图：' + outDir);
await bail(pass ? 0 : 2);
