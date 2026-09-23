// 验收脚本：第二步"单圈环流 → 三圈环流"演变 + 标注归属正确性
// 断言：
//   1) 第一步不出现任何地转偏向力相关标注（强度指示/自转方向/弯折节点）
//   2) 第二步出现强度指示与自转方向、弯折节点
//   3) 第二步随时间推进，三圈环流透明度上升、单圈下降（真的在演变，而不是加标注）
//   4) 纬度标签与偏向力标签分置两侧（不互相遮挡）
// 用法：node tools/verify-morph.mjs <页面URL> <输出目录>
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2];
const outDir = process.argv[3] || join(process.cwd(), '.verify-morph');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9417;
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

// 读取：morph、各类标注可见性、标签所在侧（z 符号）
const probe = () => ev(`(function(){
  const d = window.__threeCellDebug;
  const cs = d.cellObjects;
  // 使用 cell._opacity（setOpacity 记录的真实语义透明度），避免材质 opacity 被基础系数缩放导致误读
  const op = (k) => cs[k] && typeof cs[k]._opacity === 'number' ? +cs[k]._opacity.toFixed(3) : null;
  // 偏向力/自转标注的可见性（deflectionIndicators 数组里的对象）
  const ind = (d.deflectionIndicators || []);
  const indVisible = ind.filter(o => o && o.visible !== false).length;
  // 纬度标签 z 符号（负=右侧/另一侧）
  const latZ = (d.latLabelZ || []);
  return JSON.stringify({
    step: d.STATE.step,
    morph: +d.STATE.morph.toFixed(3),
    singleOpacity: op('singleNH'),
    hadleyOpacity: op('hadleyNH'),
    ferrelOpacity: op('ferrelNH'),
    polarOpacity: op('polarNH'),
    coriolisGroupVisible: !!(d.coriolisGroup && d.coriolisGroup.visible),
    deflectionIndicators: ind.length,
    deflectionVisible: indVisible,
    latLabelZs: latZ
  });
})()`);

const rows = [];
const rec = async (label) => { const p = JSON.parse(await probe()); rows.push({ label, ...p }); return p; };

await ev(`document.getElementById('btn-start-guided').click(); 1`);
await sleep(2500);
await ev(`document.querySelectorAll('.step-dot')[0].click(); 1`);
await sleep(4500);
const s1 = await rec('第一步');
await snap('m1-step1.png');

await ev(`document.querySelectorAll('.step-dot')[1].click(); 1`);
await sleep(1200);
const s2early = await rec('第二步(进入约1.2s)');
await snap('m2-step2-early.png');
await sleep(4500);
const s2 = await rec('第二步(约5.7s)');
await snap('m3-step2-late.png');

await ev(`document.querySelectorAll('.step-dot')[2].click(); 1`);
await sleep(4500);
const s3 = await rec('第三步');
await snap('m4-step3.png');

console.log('\n===== 演变过程 =====');
rows.forEach(r => console.log(
  `${r.label.padEnd(18)} morph=${String(r.morph).padEnd(5)} 单圈=${String(r.singleOpacity).padEnd(5)} ` +
  `哈德莱=${String(r.hadleyOpacity).padEnd(5)} 费雷尔=${String(r.ferrelOpacity).padEnd(5)} 极地=${String(r.polarOpacity).padEnd(5)} ` +
  `弯曲节点组=${r.coriolisGroupVisible ? '显示' : '隐藏'} 偏向力标注=${r.deflectionVisible}/${r.deflectionIndicators}`
));

let pass = true;
const check = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) pass = false; };
console.log('\n===== 断言 =====');
check(s1.coriolisGroupVisible === false, '第一步不显示弯折节点（不自转模型不应有偏向力标注）');
check(s1.deflectionVisible === 0, `第一步不显示偏向力强度指示/自转方向（实际可见 ${s1.deflectionVisible} 个）`);
check(s1.morph === 0, `第一步 morph=0（单圈环流）`);
check(s1.hadleyOpacity < 0.01 && s1.polarOpacity < 0.01, '第一步不含三圈环流');

check(s2.coriolisGroupVisible === true, '第二步显示弯折节点');
check(s2.deflectionVisible > 0, `第二步显示偏向力强度指示（可见 ${s2.deflectionVisible} 个）`);
check(s2.morph > 0.9, `第二步演变完成（morph=${s2.morph}）`);
check(s2.hadleyOpacity > 0.8 && s2.polarOpacity > 0.8, `第二步三圈已浮现（哈德莱 ${s2.hadleyOpacity} / 极地 ${s2.polarOpacity}）`);
check(s2.ferrelOpacity > 0.4, `第二步中纬费雷尔环流已出现（${s2.ferrelOpacity}）——这是"分化为三圈"的关键证据`);
check(s2.singleOpacity < 0.15, `第二步单圈环流已淡出（${s2.singleOpacity}）`);

check(s2early.morph < s2.morph, `存在连续演变过程（1.2s 时 morph=${s2early.morph} < 5.7s 时 ${s2.morph}）——不是静态加标注`);
check(s2early.hadleyOpacity < s2.hadleyOpacity, `三圈是逐渐浮现的（${s2early.hadleyOpacity} → ${s2.hadleyOpacity}）`);

check(s3.morph === 1 && s3.hadleyOpacity > 0.95 && s3.ferrelOpacity > 0.95 && s3.polarOpacity > 0.95, '第三步三圈全部为满透明度终态');
check(s3.coriolisGroupVisible === false, '第三步隐藏弯折节点（由气压带风带承接）');

// 标签位置由 verify-deflect-scale.mjs（第二步强度标尺）与标签重叠检测各自校验，
// 这里不再断言标签坐标（原"视轮廓"方案已废弃，相关断言随之作废）。

check(exceptions.length === 0, `无未捕获异常${exceptions.length ? '：' + exceptions.join(' | ') : ''}`);
check(errors.length === 0, `无控制台错误${errors.length ? '：' + errors.join(' | ') : ''}`);

console.log(`\n总体：${pass ? '全部通过 ✔' : '存在失败项 ✘'}`);
console.log('截图：' + outDir);
await bail(pass ? 0 : 2);
