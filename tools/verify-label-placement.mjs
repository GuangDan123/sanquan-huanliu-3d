// 验收脚本：确认"纬度标签回到原位置、地转偏向力标签移入大气层外围"
// 用法：node tools/verify-label-placement.mjs <页面URL> <输出目录>
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2];
const outDir = process.argv[3] || join(process.cwd(), '.verify-place');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9419;
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

// 读取三类标签的世界半径
const probe = () => ev(`(function(){
  try {
    const d = window.__threeCellDebug;
    const pos = d.labelWorldPositions;
    const radiusOf = (kind) => pos.filter(p => p.kind === kind).map(p => +Math.hypot(p.x, p.y, p.z).toFixed(2));
    const ind = (d.deflectionIndicators || []);
    // 偏转指示组的中心半径
    const indR = ind.filter(o => o.isObject3D && o.type === 'Group' && typeof o.position.length === 'function')
      .map(o => +o.position.length().toFixed(2));
    return JSON.stringify({
      step: d.STATE.step,
      earthRadius: d.earthRadius,
      atmosphereRadius: d.atmosphereRadius,
      latLabelRadii: radiusOf('lat'),
      pressureRadii: radiusOf('pressure'),
      verticalRadii: radiusOf('vertical'),
      deflectGroupRadii: indR.slice(0, 8),
      deflectLabelCount: ind.filter(o => !!o.element).length
    });
  } catch (e) { return JSON.stringify({ error: String(e && e.message || e) }); }
})()`);

await ev(`document.getElementById('btn-start-guided').click(); 1`);
await sleep(2500);
const s1 = JSON.parse(await probe());
await ev(`document.querySelectorAll('.step-dot')[1].click(); 1`);
await sleep(6000);
const s2 = JSON.parse(await probe());
await snap('p1-step2.png');
await ev(`document.querySelectorAll('.step-dot')[2].click(); 1`);
await sleep(5000);
const s3 = JSON.parse(await probe());
await snap('p2-step3.png');

const show = (t, m) => {
  if (m.error) return console.log(`${t}: 测量失败 ${m.error}`);
  console.log(`\n=== ${t} ===  地球半径=${m.earthRadius}  大气层半径=${m.atmosphereRadius}`);
  console.log(`  纬度标签半径    : ${m.latLabelRadii.join(', ')}`);
  console.log(`  气压带标签半径  : ${m.pressureRadii.join(', ')}`);
  console.log(`  垂直运动标签半径: ${m.verticalRadii.join(', ')}`);
  console.log(`  偏向力指示组半径: ${m.deflectGroupRadii.join(', ')}   标签数=${m.deflectLabelCount}`);
};
show('第一步', s1); show('第二步', s2); show('第三步', s3);

let pass = true;
const check = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) pass = false; };
console.log('\n===== 断言 =====');
const R = s2.earthRadius, ATM = s2.atmosphereRadius;

// 纬度标签：回到原位置（半径 = R + 0.6 = 5.6）
const latOk = s2.latLabelRadii.length > 0 && s2.latLabelRadii.every(r => Math.abs(r - (R + 0.6)) < 0.02);
check(latOk, `纬度标签已回到原位置（半径应为 ${(R + 0.6).toFixed(2)}，实测 ${s2.latLabelRadii.join('/')}）`);

// 气压带标签：原位置（R + 0.35）；风带标签：原位置（R + 0.15）
const prOk = s2.pressureRadii.length > 0 &&
  s2.pressureRadii.every(r => Math.abs(r - (R + 0.35)) < 0.02 || Math.abs(r - (R + 0.15)) < 0.02);
check(prOk, `气压带/风带标签维持原位置（应为 ${(R + 0.35).toFixed(2)} 或 ${(R + 0.15).toFixed(2)}，实测 ${[...new Set(s2.pressureRadii)].join('/')}）`);

// 垂直运动标签：贴合大气层外缘（仅第一步显示，位置恒定，用第一步测量）
const vOk = s1.verticalRadii.length > 0 && s1.verticalRadii.every(r => Math.abs(r - ATM) < 0.05);
check(vOk, `垂直运动标签已贴合大气层外缘（半径应为 ${ATM}，实测 ${s1.verticalRadii.join('/')}）`);

// 偏向力指示：应位于大气层外围
const dr = s2.deflectGroupRadii.filter(r => r > 0);
const defOk = dr.length >= 5 && dr.every(r => r > ATM);
check(defOk, `偏向力指示已移入大气层外围（大气层=${ATM}，实测 ${dr.join('/')}）`);

// 相机固定，两类标签半径差应约为 1.85，确保不再互相压住
check(Math.min(...dr) > Math.max(...s2.pressureRadii) + 1.0, `偏向力标签明显位于其他标签之外（最近 ${Math.min(...dr)} > 最远 ${Math.max(...s2.pressureRadii)}）`);

check(exceptions.length === 0, `无未捕获异常${exceptions.length ? '：' + exceptions.join(' | ') : ''}`);
check(errors.length === 0, `无控制台错误${errors.length ? '：' + errors.join(' | ') : ''}`);

console.log(`\n总体：${pass ? '全部通过 ✔' : '存在失败项 ✘'}`);
console.log('截图：' + outDir);
await bail(pass ? 0 : 2);
