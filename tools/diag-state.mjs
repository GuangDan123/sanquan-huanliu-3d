// 快速定位：打印 STATE 关键值与直接调用路径函数的返回
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2];
const outDir = join(process.cwd(), '.diag2');
await mkdir(outDir, { recursive: true });
await rm(join(outDir, 'profile'), { recursive: true, force: true });
const PORT = 9416;
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(outDir, 'profile')}`,
  '--window-size=1280,800', 'about:blank'
], { stdio: 'ignore' });
const bail = async (c) => { try { chrome.kill('SIGKILL'); } catch {} await sleep(300); process.exit(c); };

let target = null;
for (let i = 0; i < 30; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
    if (r.ok) { target = await r.json(); break; } } catch {}
  await sleep(400);
}
if (!target) { console.error('CDP 失败'); await bail(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } });
await new Promise(r => ws.addEventListener('open', r));
await send('Runtime.enable');
await sleep(8000);
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.value;

await ev(`document.getElementById('btn-start-guided').click(); 1`);
await sleep(1500);
await ev(`document.querySelectorAll('.step-dot')[1].click(); 1`);
await sleep(6000);

console.log(await ev(`JSON.stringify({
  step: window.__threeCellDebug.STATE.step,
  coriolisDeflection: window.__threeCellDebug.STATE.coriolisDeflection,
  transitionCoriolis: window.__threeCellDebug.STATE.transitionCoriolis,
  transitioning: window.__threeCellDebug.STATE.stepTransitioning,
  playing: window.__threeCellDebug.STATE.playing
})`));

// 直接调用路径函数，检查偏移公式是否产生非零值
console.log('路径函数采样：' + await ev(`(function(){
  const f = window.__threeCellDebug.getSingleDropPosition;
  const cor = window.__threeCellDebug.STATE.coriolisDeflection;
  const out = [];
  for (let i = 1; i <= 6; i++) {
    const t = i / 8;
    const p = f(t, 0, 1, cor, 2.5, 90);
    out.push('t=' + t.toFixed(2) + ' lon=' + (Math.atan2(p.z, p.x) * 180 / Math.PI).toFixed(2));
  }
  return out.join('  ') + '  | cor=' + cor;
})()`));

// 检查箭头对象实际坐标
console.log('箭头坐标：' + await ev(`(function(){
  const cs = window.__threeCellDebug.cellObjects['singleNH'];
  return cs.arrows.map(a => a.phase.toFixed(2) + ':' + (Math.atan2(a.mesh.position.z, a.mesh.position.x) * 180 / Math.PI).toFixed(2)).join('  ');
})()`));

console.log('曲线 coriolisDeg：' + await ev(`(function(){
  const cs = window.__threeCellDebug.cellObjects['singleNH'];
  return cs.tubes.map(t => t.baseLon).join(',');
})()`));

await bail(0);
