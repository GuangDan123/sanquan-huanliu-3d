// 诊断：算出"地转偏向力强度标签"的屏幕坐标，判断为何不可见
// 用法：node tools/diag-deflect-pos.mjs <页面URL>
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2];
const dir = join(process.cwd(), '.diag-deflect');
await mkdir(dir, { recursive: true });
await rm(join(dir, 'profile'), { recursive: true, force: true });
const PORT = 9422;
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
await send('Runtime.enable'); await send('Page.enable');
await sleep(8000);
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.value;

await ev(`document.getElementById('btn-start-guided').click(); 1`);
await sleep(2500);
await ev(`document.querySelectorAll('.step-dot')[1].click(); 1`);
await sleep(6000);

console.log(await ev(`(function(){
  const d = window.__threeCellDebug, cam = d.camera;
  const W = innerWidth, H = innerHeight;
  const V = d.makeVector3;
  const rows = [];
  const first = (d.deflectionIndicators || []).find(o => o && o.element);
  if (first) {
    let o = first, chain = [];
    while (o) {
      chain.push((o.type || '?') + '(' + (o.name || '') + ') scale=' + o.scale.toArray().map(v=>v.toFixed(2)).join(',') + ' pos=' + o.position.toArray().map(v=>v.toFixed(2)).join(','));
      o = o.parent;
    }
    rows.push('标签父级链:');
    chain.forEach(c => rows.push('   ' + c));
  }
  d.labelWorldPositions.filter(p => p.kind === 'deflect').forEach(l => {
    const p = new V(l.x, l.y, l.z);
    const ndc = p.project(cam);
    const sx = (ndc.x*0.5+0.5)*W, sy = (-ndc.y*0.5+0.5)*H;
    const inside = sx>=0 && sx<=W && sy>=0 && sy<=H;
    rows.push(l.text.padEnd(18) + ' 世界(' + l.x + ',' + l.y + ',' + l.z + ')  屏幕(' + sx.toFixed(0) + ',' + sy.toFixed(0) + ')  ' + (inside?'视口内':'视口外✘'));
  });
  return '视口 ' + W + 'x' + H + '  相机 ' + cam.position.toArray().map(v=>v.toFixed(1)).join(',') + '\\n' + rows.join('\\n');
})()`));
await bail(0);
