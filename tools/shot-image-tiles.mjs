// 把一张图片按 3x4 网格分块放大截取，便于精读图内文字与位置。
// 用法：node tools/shot-image-tiles.mjs <图片HTML路径 or file:// URL> <输出目录> [缩放]
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const fileArg = process.argv[2];
const outDir = resolve(process.argv[3] || '.tiles');
const scale = Number(process.argv[4] || 4);
const COLS = 3, ROWS = 3;
const PORT = 9700 + (process.pid % 200);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = fileArg.startsWith('file:') ? fileArg : pathToFileURL(resolve(fileArg)).href;

await mkdir(outDir, { recursive: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
  '--allow-file-access-from-files', '--hide-scrollbars', '--force-device-scale-factor=1',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(outDir, 'profile')}`,
  '--window-size=1700,1100', 'about:blank'
], { stdio: 'ignore' });

const cleanup = async (c) => { try { ws?.close(); } catch {} try { chrome.kill('SIGKILL'); } catch {} await sleep(150); process.exit(c); };

let target = null;
for (let i = 0; i < 40 && !target; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }); if (r.ok) target = await r.json(); } catch {}
  if (!target) await sleep(400);
}
if (!target) { console.error('✘ CDP 未就绪'); await cleanup(2); }

let ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
});
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1700, height: 1100, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });
await sleep(2500);

const size = await send('Runtime.evaluate', { expression: `(() => { const i = document.getElementById('im'); return { w: i.naturalWidth, h: i.naturalHeight }; })()`, returnByValue: true });
const { w, h } = size.result.value;
console.log(`原图 ${w}x${h}，切 ${COLS}x${ROWS}，放大 ${scale}x`);

const tw = Math.ceil(w / COLS), th = Math.ceil(h / ROWS);
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const clip = { x: c * tw, y: r * th, width: Math.min(tw, w - c * tw), height: Math.min(th, h - r * th), scale };
    const shot = await send('Page.captureScreenshot', { format: 'png', clip });
    const name = `tile-r${r}c${c}.png`;
    await writeFile(join(outDir, name), Buffer.from(shot.data, 'base64'));
    console.log(`  ${name}  原图区域 x=${clip.x}..${clip.x + clip.width}  y=${clip.y}..${clip.y + clip.height}`);
  }
}
console.log('✔ 完成');
await cleanup(0);
