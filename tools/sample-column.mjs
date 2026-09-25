// 从截图里按列采样真实像素颜色，输出"颜色分段"（起始 y / 结束 y / 颜色 / 高度）。
// 用途：像素级证明"某标签确实压在对应色带上"——标签左右两侧露出的色带像素应该与色带定义色一致。
//
// 用法：node tools/sample-column.mjs <图片路径> <x> [y0] [y1] [容差]
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const imgArg = resolve(process.argv[2]);
const col = Number(process.argv[3] ?? 800);
const y0 = Number(process.argv[4] ?? 0);
const y1 = Number(process.argv[5] ?? 1000);
const tol = Number(process.argv[6] ?? 28);
const PORT = 9700 + (process.pid % 200);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = join(dirname(imgArg), '.sample');
const imgUrl = pathToFileURL(imgArg).href;

await mkdir(outDir, { recursive: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
  '--allow-file-access-from-files', '--hide-scrollbars', '--force-device-scale-factor=1',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(outDir, 'profile')}`,
  '--window-size=900,900', 'about:blank'
], { stdio: 'ignore' });
const cleanup = async (c) => { try { ws?.close(); } catch {} try { chrome.kill('SIGKILL'); } catch {} await sleep(150); process.exit(c); };

let target = null;
for (let i = 0; i < 40 && !target; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }); if (r.ok) target = await r.json(); } catch {}
  if (!target) await sleep(400);
}
if (!target) { console.error('✘ CDP 未就绪'); await cleanup(2); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
});
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
await send('Page.enable'); await send('Runtime.enable');

const htmlPath = join(outDir, 'sample.html');
await writeFile(htmlPath, `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0">
<img id="im" src="${imgUrl}"><script>
window.__ready = false;
document.getElementById('im').onload = () => {
  const im = document.getElementById('im');
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const d = g.getImageData(${col}, ${y0}, 1, ${y1 - y0}).data;
  const px = []; for (let i = 0; i < ${y1 - y0}; i++) px.push([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
  window.__col = px; window.__size = [im.naturalWidth, im.naturalHeight]; window.__ready = true;
};
</script></body></html>`);
await send('Page.navigate', { url: pathToFileURL(htmlPath).href });
let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  await sleep(300);
  try { const r = await send('Runtime.evaluate', { expression: 'window.__ready', returnByValue: true }); ready = !!r.result.value; } catch {}
}
const r = await send('Runtime.evaluate', { expression: 'JSON.stringify({px:window.__col,size:window.__size})', returnByValue: true });
const { px, size } = JSON.parse(r.result.value);
console.log(`图片 ${size[0]}x${size[1]}，采样列 x=${col}，y ∈ [${y0}, ${y1})`);

const hex = (p) => '#' + p.map(v => v.toString(16).padStart(2, '0')).join('');
const same = (a, b) => Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol && Math.abs(a[2] - b[2]) <= tol;
const runs = [];
for (let i = 0; i < px.length; i++) {
  const last = runs[runs.length - 1];
  if (last && same(last.color, px[i])) { last.end = y0 + i; last.n++; }
  else runs.push({ start: y0 + i, end: y0 + i, color: px[i], n: 1 });
}
// 合并相邻的极小过渡段（抗锯齿），只保留 ≥3px 的分段
const merged = runs.filter(r => r.n >= 3);
for (const s of merged) {
  console.log(`  y ${String(s.start).padStart(4)} → ${String(s.end).padStart(4)}  (${String(s.n).padStart(3)}px)  ${hex(s.color)}`);
}
await cleanup(0);
