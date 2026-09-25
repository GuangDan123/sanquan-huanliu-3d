// 诊断：量出各类标签"原始半径"下在屏幕上的位置，用于确定既保留原有朝向、又不被球体遮挡的半径
// 用法：node tools/diag-label-screen.mjs <页面URL>
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2];
const dir = join(process.cwd(), '.diag-label');
await mkdir(dir, { recursive: true });
await rm(join(dir, 'profile'), { recursive: true, force: true });
const PORT = 9420;
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
await sleep(2000);
await ev(`document.querySelectorAll('.step-dot')[2].click(); 1`);
await sleep(6000);

// 对每个纬度求"刚好落在球体轮廓外侧"所需的最小半径
console.log(await ev(`(function(){
  const d = window.__threeCellDebug, cam = d.camera, R = d.earthRadius;
  const w = innerWidth, h = innerHeight;
  const f = (h/2)/Math.tan(cam.fov*Math.PI/360);
  const dist = cam.position.length();
  const globePx = f*Math.tan(Math.asin(Math.min(1,R/dist)));
  const cx=w/2, cy=h/2;
  const V = d.makeVector3;
  const rows = [];
  [0, 15, 30, 45, 60, 75, 85, 90].forEach(lat => {
    let need = null;
    for (let r = 7.0; r <= 11.0; r += 0.05) {
      const phi = (90-lat)*Math.PI/180;
      const rho = r*Math.sin(phi), y = r*Math.cos(phi);
      const p = new V(0, y, -rho);      // 原朝向：世界 -Z 侧
      const ndc = p.project(cam);
      const sx = (ndc.x*0.5+0.5)*w, sy = (-ndc.y*0.5+0.5)*h;
      if (Math.hypot(sx-cx, sy-cy) > globePx + 6) { need = r; break; }
    }
    rows.push('纬度 ' + String(lat).padStart(2) + '°  需要的半径 = ' + (need ? need.toFixed(2) : '>11'));
  });
  return '地球投影半径=' + globePx.toFixed(0) + 'px  相机=' + cam.position.toArray().join(',') + '\\n' + rows.join('\\n');
})()`));
await bail(0);
