// 验收脚本 3：完整走查引导流程（含关闭第一步弹窗后再逐步切换），
// 断言"仅第一步弹出引导弹窗，第二、三步无弹窗且气流持续流动"。
// 依赖页面内 window.__threeCellDebug.getDiagnostics()
// 用法：node tools/verify-steps.mjs <页面URL> <输出目录>
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2];
const outDir = process.argv[3] || join(process.cwd(), '.verify-step');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9413;
const profile = join(outDir, 'chrome-profile');

await mkdir(outDir, { recursive: true });
await rm(profile, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1440,900', 'about:blank'
], { stdio: 'ignore' });

const bail = async (code) => { try { chrome.kill('SIGKILL'); } catch {} await sleep(300); process.exit(code); };

let target = null;
for (let i = 0; i < 30; i++) {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
    if (res.ok) { target = await res.json(); break; }
  } catch {}
  await sleep(400);
}
if (!target) { console.error('CDP 启动失败'); await bail(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const consoleLogs = [];
const exceptions = [];
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const msgId = ++id;
  pending.set(msgId, { resolve, reject });
  ws.send(JSON.stringify({ id: msgId, method, params }));
});
ws.addEventListener('message', (evt) => {
  const m = JSON.parse(evt.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    return;
  }
  if (m.method === 'Runtime.consoleAPICalled') {
    consoleLogs.push(`[${m.params.type}] ${(m.params.args || []).map(a => a.value ?? a.description ?? a.type).join(' ')}`);
  }
  if (m.method === 'Runtime.exceptionThrown') {
    exceptions.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  }
});
await new Promise(r => ws.addEventListener('open', r));
await send('Runtime.enable');
await send('Page.enable');
await sleep(8000);

const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
const snap = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(outDir, name), Buffer.from(s.data, 'base64'));
};

const diag = async () => JSON.parse(await ev('JSON.stringify(window.__threeCellDebug.getDiagnostics())'));
// 判断气流是否在动：连续两次采样粒子首点位置是否有变化
const flowing = async (key) => {
  const a = await ev(`JSON.stringify(window.__threeCellDebug.cellObjects['${key}']?.particles?.geometry.attributes.position.array.slice(0,3))`);
  await sleep(600);
  const b = await ev(`JSON.stringify(window.__threeCellDebug.cellObjects['${key}']?.particles?.geometry.attributes.position.array.slice(0,3))`);
  return a !== b;
};

const rows = [];
const record = async (label, flowKey) => {
  const d = await diag();
  const moving = flowKey ? await flowing(flowKey) : null;
  rows.push({ label, ...d, moving });
  return d;
};

// ---- 1) 点击"开始引导学习"（仍在第一步） ----
await ev(`document.getElementById('btn-start-guided').click(); 1`);
await sleep(2200);
await record('① 开始引导学习（第一步）', 'singleNH');
await snap('01-step1-modal.png');

// ---- 2) 点"继续"，自动进入第二步 ----
await ev(`document.getElementById('sn-continue').click(); 1`);
await sleep(4000);
await record('② 点继续 → 第二步', 'singleNH');
await snap('02-step2.png');

// ---- 3) 切第三步 ----
await ev(`document.querySelectorAll('.step-dot')[2].click(); 1`);
await sleep(4200);
await record('③ 切到第三步', 'polarNH');
await snap('03-step3.png');

// ---- 4) 回退到第二步（验证来回切换不再弹窗） ----
await ev(`document.querySelectorAll('.step-dot')[1].click(); 1`);
await sleep(4200);
await record('④ 回退到第二步', 'singleNH');
await snap('04-step2-again.png');

const fmt = (r) => [
  r.label.padEnd(24),
  `step=${r.step}`,
  `mode=${r.mode}`,
  `modal=${r.modalShown ? '显示' : '不显示'}`,
  `playing=${r.playing}`,
  `流动=${r.moving === null ? '—' : (r.moving ? '是' : '否')}`,
  `气压带=${r.showPressure}`,
  `可见组=${r.visibleGroups.join('+') || '无'}`
].join('  ');

console.log('\n===== 引导流程走查 =====');
rows.forEach(r => console.log(fmt(r)));

let pass = true;
const check = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) pass = false; };
console.log('\n===== 断言 =====');
const [r1, r2, r3, r4] = rows;
check(r1.step === 0 && r1.modalShown === true, '第一步弹出引导弹窗');
check(r1.playing === false, '第一步弹窗打开时气流暂停（等待阅读）');
check(r2.step === 1, '点"继续"后进入第二步');
check(r2.modalShown === false, '第二步不弹出引导弹窗');
check(r2.playing === true, '第二步气流处于播放状态');
check(r2.moving === true, '第二步粒子确实在推进（单圈带已有流动感）');
check(r2.visibleGroups.includes('singleNH'), '第二步单圈环流带仍在场（演变过程中）');
check(r2.visibleGroups.includes('hadleyNH') && r2.visibleGroups.includes('polarNH'), '第二步三圈环流随演变浮现');
check(r3.step === 2, '步骤点可切到第三步');
check(r3.modalShown === false, '第三步不弹出引导弹窗');
check(r3.playing === true, '第三步气流处于播放状态');
check(r3.moving === true, '第三步粒子确实在推进');
check(r3.visibleGroups.includes('hadleyNH') && r3.visibleGroups.includes('ferrelNH') && r3.visibleGroups.includes('polarNH'), '第三步三圈环流全部可见');
check(r3.showPressure === true, '第三步自动开启气压带图层');
check(r4.step === 1 && r4.modalShown === false, '回退到第二步同样不弹窗');
check(r4.moving === true, '回退后气流仍在流动');
check(exceptions.length === 0, `无未捕获异常${exceptions.length ? '：' + exceptions.join(' | ') : ''}`);
check(consoleLogs.filter(l => /error|failed|404/i.test(l)).length === 0, '控制台无错误 / 无 404');

console.log(`\n总体：${pass ? '全部通过 ✔' : '存在失败项 ✘'}`);
console.log('控制台输出：' + (consoleLogs.join(' ; ') || '(无)'));
console.log('截图目录：' + outDir);

await bail(pass ? 0 : 2);
