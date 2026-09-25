// 快速检查：北极自转方向指示是否可见、位置是否落在视口内
// 用法：node tools/check-rotation.mjs <页面URL>
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2];
const dir = join(process.cwd(), '.chk-rot');
await mkdir(dir, { recursive: true });
await rm(join(dir, 'profile'), { recursive: true, force: true });
const PORT = 9424;
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(dir, 'profile')}`,
  '--window-size=1600,1000', 'about:blank'
], { stdio: 'ignore' });
const bail = async (c) => { try { chrome.kill('SIGKILL'); } catch {} await sleep(300); process.exit(c); };
let target = null;
for (let i = 0; i < 30; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
    if (r.ok) { target = await r.json(); break; } } catch {}
  await sleep(400);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } });
await new Promise(r => ws.addEventListener('open', r));
await send('Runtime.enable');
await sleep(8000);
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true })).result?.value;

await ev(`document.getElementById('btn-start-guided').click(); 1`);
await sleep(2500);
await ev(`document.querySelectorAll('.step-dot')[1].click(); 1`);
await sleep(6000);

console.log(await ev(`(function(){
  const d = window.__threeCellDebug, cam = d.camera;
  const V = d.makeVector3;
  const W = innerWidth, H = innerHeight;
  const o = d.deflectionIndicators[0];
  const e = o.matrixWorld.elements;
  const wp = new V(e[12], e[13], e[14]);
  const ndc = wp.clone().project(cam);
  const sx = (ndc.x*0.5+0.5)*W, sy = (-ndc.y*0.5+0.5)*H;
  const inView = sx>=0 && sx<=W && sy>=0 && sy<=H;
  return '视口 ' + W + 'x' + H + '\\n' +
    '自转指示: visible=' + o.visible + ' 世界=(' + e[12].toFixed(2) + ',' + e[13].toFixed(2) + ',' + e[14].toFixed(2) + ')' +
    ' 屏幕=(' + sx.toFixed(0) + ',' + sy.toFixed(0) + ') 视口' + (inView ? '内 ✔' : '外 ✘');
})()`));
await bail(0);
