// 诊断脚本：分别在 http:// 与 file:// 下打开作品页，收集控制台错误与关键状态，
// 判断"双击打开（file://）是否可用"。用法：node tools/diagnose-open.mjs <httpURL> <fileURL>
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const [httpUrl, fileUrl] = process.argv.slice(2);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9414;
const outDir = join(process.cwd(), '.diag-out');
await mkdir(outDir, { recursive: true });
await rm(join(outDir, 'profile'), { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(outDir, 'profile')}`,
  '--window-size=1280,800', 'about:blank'
], { stdio: 'ignore' });
const bail = async (c) => { try { chrome.kill('SIGKILL'); } catch {} await sleep(300); process.exit(c); };

const openAndProbe = async (url, label) => {
  let target = null;
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
      if (r.ok) { target = await r.json(); break; }
    } catch {}
    await sleep(400);
  }
  if (!target) return { label, fatal: 'CDP 无法新建标签页' };

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const logs = [];
  const errors = [];
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id; pending.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id); pending.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
      return;
    }
    if (m.method === 'Runtime.consoleAPICalled') {
      logs.push(`[${m.params.type}] ${(m.params.args || []).map(a => a.value ?? a.description ?? a.type).join(' ')}`);
    }
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    }
    if (m.method === 'Log.entryAdded') {
      logs.push(`[log:${m.params.entry.level}] ${m.params.entry.text}`);
    }
  });
  await new Promise(r => ws.addEventListener('open', r));
  await send('Runtime.enable');
  await send('Log.enable');
  await sleep(7000);

  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.value;
  const state = await ev(`JSON.stringify({
    loadingHidden: document.getElementById('loading-screen').classList.contains('hidden'),
    percent: document.getElementById('loading-percent')?.textContent,
    hasCanvas: !!document.querySelector('#scene-container canvas'),
    debugHook: typeof window.__threeCellDebug,
    cellCount: window.__threeCellDebug ? window.__threeCellDebug.getDiagnostics().cellCount : null
  })`);

  await send('Page.enable');
  const s = await send('Page.captureScreenshot', { format: 'png' });
  const { writeFile } = await import('node:fs/promises');
  await writeFile(join(outDir, `${label}.png`), Buffer.from(s.data, 'base64'));

  await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`).catch(() => {});
  return { label, url: url.slice(0, 70), state: JSON.parse(state), errors, logs };
};

const results = [];
for (const [url, label] of [[httpUrl, 'http'], [fileUrl, 'file']]) {
  if (!url) continue;
  results.push(await openAndProbe(url, label));
}

for (const r of results) {
  console.log(`\n========== ${r.label}:// ==========`);
  if (r.fatal) { console.log('致命：' + r.fatal); continue; }
  console.log('状态:', JSON.stringify(r.state));
  console.log('未捕获异常:', r.errors.length ? '\n  ' + r.errors.join('\n  ') : '(无)');
  const bad = r.logs.filter(l => /error|failed|refused|blocked|cors/i.test(l));
  console.log('控制台(错误类):', bad.length ? '\n  ' + bad.join('\n  ') : '(无)');
  const other = r.logs.filter(l => !/error|failed|refused|blocked|cors/i.test(l));
  if (other.length) console.log('控制台(其他):', '\n  ' + other.join('\n  '));
}

console.log('\n截图目录: ' + outDir);
await bail(0);
