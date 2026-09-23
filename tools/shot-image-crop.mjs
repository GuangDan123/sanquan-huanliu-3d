// 对一张本地图片按指定区域放大截取（用于精读截图细节）。
// 用法：node tools/shot-image-crop.mjs <图片路径> <输出png> <x> <y> <w> <h> [scale]
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const imgArg = process.argv[2];
const outPng = resolve(process.argv[3]);
const x = Number(process.argv[4] || 0);
const y = Number(process.argv[5] || 0);
const w = Number(process.argv[6] || 400);
const h = Number(process.argv[7] || 400);
const scale = Number(process.argv[8] || 2);
const PORT = 9800 + (process.pid % 150);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const imgUrl = pathToFileURL(resolve(imgArg)).href;

await mkdir(dirname(outPng), { recursive: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
  '--allow-file-access-from-files', '--hide-scrollbars', '--force-device-scale-factor=1',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(dirname(outPng), 'profile-crop')}`,
  '--window-size=1600,1000', 'about:blank'
], { stdio: 'ignore' });

const cleanup = async (c) => { try { ws?.close(); } catch {} try { chrome.kill('SIGKILL'); } catch {} await sleep(150); process.exit(c); };

let target = null;
for (let i = 0; i < 40 && !target; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }); if (r.ok) target = await r.json(); } catch {}
  if (!target) await sleep(400);
}
if (!target) { console.error('✘ CDP 未就绪'); await cleanup(2); }

let ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
});
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
await send('Page.enable'); await send('Runtime.enable');

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#000;overflow:hidden}
  #im{position:absolute;transform-origin:0 0;image-rendering:auto}
</style></head><body>
<img id="im" src="${imgUrl}">
<script>
  const im=document.getElementById('im');
  im.onload=()=>{ im.style.transform='scale(${scale}) translate(${-x}px, ${-y}px)'; };
</script></body></html>`;

// 必须写成真实文件再用 Page.navigate 打开：data/about:blank 文档的 file:// 图片会被拒绝加载
const htmlPath = join(dirname(outPng), 'crop.html');
await writeFile(htmlPath, html);
await send('Emulation.setDeviceMetricsOverride', { width: Math.round(w * scale), height: Math.round(h * scale), deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: pathToFileURL(htmlPath).href });
await sleep(1800);

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
await writeFile(outPng, Buffer.from(shot.data, 'base64'));
console.log(`✔ 裁切 x=${x} y=${y} ${w}x${h} @${scale}x → ${outPng}`);
await cleanup(0);
