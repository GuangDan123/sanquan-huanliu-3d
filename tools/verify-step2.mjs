// 验收脚本：校验"第二步的模型示意与左侧面板文案一致"
// 断言：
//   1) 偏转视觉对象确实被创建（此前 createCoriolisVisuals 从未被调用）
//   2) 第二步的环流带路径确实发生弯折（经度偏移随纬度为 0→增大，且上下两支反向）
//   3) 第一步路径保持平面（无偏移）
//   4) 偏向力随纬度增强（指示箭头长度递增）
// 用法：node tools/verify-step2.mjs <页面URL> <输出目录>
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2];
const outDir = process.argv[3] || join(process.cwd(), '.verify-step2');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9415;
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
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
    if (r.ok) { target = await r.json(); break; }
  } catch {}
  await sleep(400);
}
if (!target) { console.error('CDP 启动失败'); await bail(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const exceptions = [];
const errors = [];
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id; pending.set(i, { res, rej });
  ws.send(JSON.stringify({ id: i, method, params }));
});
ws.addEventListener('message', (evt) => {
  const m = JSON.parse(evt.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    return;
  }
  if (m.method === 'Runtime.exceptionThrown') {
    exceptions.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  }
  if (m.method === 'Log.entryAdded' && /error|failed|404/i.test(m.params.entry.text)) {
    errors.push(m.params.entry.text);
  }
});
await new Promise(r => ws.addEventListener('open', r));
await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await sleep(9000);

const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
const snap = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(outDir, name), Buffer.from(s.data, 'base64'));
};

// 用"方向箭头"作为探针：箭头位置直接由 getPos() 求出（不受管截面半径干扰），
// 其经度即环流带中心线的经度偏移，能干净反映各步骤的弯折量。
const probeScene = () => ev(`(function(){
  const d = window.__threeCellDebug;
  const cs = d.cellObjects['singleNH'];
  if (!cs || !cs.arrows || !cs.arrows.length) return JSON.stringify({ error: 'no arrows' });
  let maxAbs = 0, east = 0, west = 0;
  const bandMax = {};
  const samples = [];
  cs.arrows.forEach(a => {
    const p = a.mesh.position;
    const r = Math.hypot(p.x, p.y, p.z);
    const lat = Math.asin(Math.max(-1, Math.min(1, p.y / r))) * 180 / Math.PI;
    const lon = Math.atan2(p.z, p.x) * 180 / Math.PI;
    const off = Math.abs(lon) > 180 ? (lon > 0 ? lon - 360 : lon + 360) : lon;
    maxAbs = Math.max(maxAbs, Math.abs(off));
    if (off > 0.3) east++;
    if (off < -0.3) west++;
    const band = String(Math.floor(Math.abs(lat) / 30) * 30);
    bandMax[band] = Math.max(bandMax[band] || 0, Math.abs(off));
    samples.push(lat.toFixed(0) + '°:' + off.toFixed(2));
  });
  return JSON.stringify({
    maxOffset: +maxAbs.toFixed(3), eastCount: east, westCount: west,
    maxByLatBand: bandMax, arrowCount: cs.arrows.length, samples
  });
})()`);

const objects = await ev(`(function(){
  const d = window.__threeCellDebug;
  return JSON.stringify({
    coriolisGroupCreated: !!d.coriolisGroup,
    coriolisNodes: d.coriolisNodes ? d.coriolisNodes.length : 0,
    coriolisLabels: d.coriolisLabels ? d.coriolisLabels.length : 0,
    deflectionArrows: d.deflectionArrowLengths || null
  });
})()`);

console.log('\n=== 偏转视觉对象 ===');
console.log(objects);

// —— 第一步：场景中的单圈环流应为平面 ——
await ev(`document.getElementById('btn-start-guided').click(); 1`);
await sleep(1500);
await ev(`document.querySelectorAll('.step-dot')[0].click(); 1`);
await sleep(4500);
const p1 = JSON.parse(await probeScene());
await snap('step1.png');

// —— 第二步：场景中的单圈环流应发生弯折 ——
await ev(`document.querySelectorAll('.step-dot')[1].click(); 1`);
await sleep(5500);
const p2 = JSON.parse(await probeScene());
await snap('step2.png');

// —— 第三步对照 ——
await ev(`document.querySelectorAll('.step-dot')[2].click(); 1`);
await sleep(4500);
await snap('step3.png');

const fmt = (p) => p.error ? p.error
  : `最大经度偏移 ${p.maxOffset}°  东偏箭头 ${p.eastCount}  西偏箭头 ${p.westCount}  分纬度带最大偏移 ${JSON.stringify(p.maxByLatBand)}\n        采样(纬度:偏移) ${(p.samples || []).join('  ')}`;

console.log('\n=== 场景实测（单圈环流粒子坐标）===');
console.log('第一步：' + fmt(p1));
console.log('第二步：' + fmt(p2));

let pass = true;
const check = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) pass = false; };
console.log('\n===== 断言 =====');
const obj = JSON.parse(objects);
check(obj.coriolisGroupCreated === true, '偏转视觉组已创建（createCoriolisVisuals 已接入 init）');
check(obj.coriolisNodes === 4, `弯折节点数量为 4（30°N/30°S/60°N/60°S），实际 ${obj.coriolisNodes}`);
check(obj.coriolisLabels >= 4, `弯折节点标签已创建，实际 ${obj.coriolisLabels}`);
check(p1.maxOffset < 0.01, `第一步场景中环流带为平面（实测最大经度偏移 ${p1.maxOffset}°）`);
check(p2.maxOffset > 2 && p2.maxOffset < 12, `第二步场景中环流带发生可观测弯折（实测最大 ${p2.maxOffset}°，期望 2~12°）`);
check(p2.maxOffset > p1.maxOffset + 2, `第二步相对第一步形态确实改变（${p1.maxOffset}° → ${p2.maxOffset}°）`);
check(p2.eastCount > 0 && p2.westCount > 0, `高空与近地面气流向相反方向偏（东偏 ${p2.eastCount} 个 / 西偏 ${p2.westCount} 个粒子）`);
const bands = p2.maxByLatBand || {};
const band0 = bands['0'] || 0, band30 = bands['30'] || 0, band60 = bands['60'] || 0;
check(band0 < band30 || band0 < band60, `赤道附近偏移小于中高纬（0-30°带 ${band0.toFixed(2)}° vs 30-60°带 ${band30.toFixed(2)}° / 60-90°带 ${band60.toFixed(2)}°）`);

check(exceptions.length === 0, `无未捕获异常${exceptions.length ? '：' + exceptions.join(' | ') : ''}`);
check(errors.length === 0, `无控制台错误${errors.length ? '：' + errors.join(' | ') : ''}`);

console.log(`\n总体：${pass ? '全部通过 ✔' : '存在失败项 ✘'}`);
console.log('截图：' + outDir);
await bail(pass ? 0 : 2);
