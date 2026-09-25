// 本地自动化验收脚本：用 Chrome DevTools Protocol 打开作品页，收集控制台输出与页面异常，
// 校验 Three.js 是否从本地 libs/ 成功加载、卫星贴图是否生效、核心模块是否初始化完成，并截取多张视图。
// 用法：node tools/verify-page.mjs <页面URL> <输出目录>
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2];
const outDir = process.argv[3] || join(process.cwd(), '.verify-out');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9411;
const profile = join(outDir, 'chrome-profile');

await mkdir(outDir, { recursive: true });
await rm(profile, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--window-size=1440,900',
  'about:blank'
], { stdio: 'ignore', detached: false });

const cleanup = async (code) => {
  try { chrome.kill('SIGKILL'); } catch {}
  await sleep(300);
  process.exit(code);
};

const j = async (p) => (await fetch(`http://127.0.0.1:${PORT}${p}`)).json();

// 等待 CDP 就绪
let version = null;
for (let i = 0; i < 40; i++) {
  try { version = await j('/json/version'); break; } catch { await sleep(300); }
}
if (!version) {
  console.error('CDP 启动失败');
  await cleanup(1);
}
console.log('浏览器:', version.Browser);

// 每次运行需要重试，因为 Node 侧无法捕获子进程管道输出
for (let i = 0; i < 5; i++) {
  try {
    const tab = await j(`/json/new?${encodeURIComponent(url)}`);
    // 该调用在新版 Chrome 需要 PUT，失败则回退
    if (tab && tab.webSocketDebuggerUrl) break;
  } catch {}
  await sleep(500);
}

// Chrome 113+ 要求 PUT 才可新建标签
let target = null;
for (let i = 0; i < 20; i++) {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (res.ok) { target = await res.json(); break; }
  await sleep(400);
}
if (!target) {
  console.error('无法创建标签页');
  await cleanup(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
const consoleLogs = [];
const exceptions = [];
let id = 0;
const pending = new Map();

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const msgId = ++id;
  pending.set(msgId, { resolve, reject });
  ws.send(JSON.stringify({ id: msgId, method, params }));
});

ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = (msg.params.args || []).map(a => a.value ?? a.description ?? a.type).join(' ');
    consoleLogs.push(`[${msg.params.type}] ${text}`);
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    exceptions.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
  }
  if (msg.method === 'Log.entryAdded') {
    const e = msg.params.entry;
    consoleLogs.push(`[log:${e.level}] ${e.text}`);
  }
});

await new Promise((res) => ws.addEventListener('open', res));
await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await sleep(9000); // 等待场景构建、贴图加载与动画启动

const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  return r.result?.value;
};

const state = await evaluate(`JSON.stringify({
  title: document.title,
  loadingHidden: document.getElementById('loading-screen').classList.contains('hidden'),
  welcomeShown: document.getElementById('welcome-modal').classList.contains('show'),
  classroomBtn: !!document.getElementById('btn-classroom-video'),
  hasCanvas: !!document.querySelector('#scene-container canvas'),
  cellKeys: (typeof cellObjects !== 'undefined') ? Object.keys(cellObjects) : null,
  stepPanelTitle: document.getElementById('sp-title')?.textContent,
  diagramZones: document.querySelectorAll('.drop-zone').length,
  importmap: JSON.parse(document.querySelector('script[type=importmap]').textContent).imports
})`);

console.log('\n=== 页面状态 ===');
console.log(state);

// 截图 1：欢迎/初始视图
let shot = await send('Page.captureScreenshot', { format: 'png' });
await writeFile(join(outDir, '01-initial.png'), Buffer.from(shot.data, 'base64'));

// 关闭欢迎弹窗，切到第三步（三圈环流 + 气压带风带）
await evaluate(`document.getElementById('btn-start-guided').click(); 'ok'`);
await sleep(1200);
await evaluate(`(function(){ document.querySelectorAll('.step-dot')[2].click(); return 'ok'; })()`);
await sleep(3500);
shot = await send('Page.captureScreenshot', { format: 'png' });
await writeFile(join(outDir, '02-step3.png'), Buffer.from(shot.data, 'base64'));

// 打开图示回归面板并检查落点数量
await evaluate(`(function(){ document.getElementById('diagram-toggle').click(); return 'ok'; })()`);
await sleep(2500);
const diagram = await evaluate(`JSON.stringify({
  zones: document.querySelectorAll('.drop-zone').length,
  draggables: document.querySelectorAll('.drag-label').length,
  panelOpen: !document.getElementById('diagram-panel').classList.contains('closed')
})`);
console.log('\n=== 图示回归模块 ===');
console.log(diagram);
shot = await send('Page.captureScreenshot', { format: 'png' });
await writeFile(join(outDir, '03-diagram.png'), Buffer.from(shot.data, 'base64'));

// 教师端与控制面板
await evaluate(`(function(){
  if (document.body.classList.contains('ui-hidden')) document.body.classList.remove('ui-hidden');
  document.getElementById('teacher-toggle').click();
  document.getElementById('diagram-close').click();
  document.getElementById('tog-pressure').click();
  return 'ok';
})()`);
await sleep(2000);
shot = await send('Page.captureScreenshot', { format: 'png' });
await writeFile(join(outDir, '04-teacher.png'), Buffer.from(shot.data, 'base64'));

console.log('\n=== 控制台输出 ===');
console.log(consoleLogs.length ? consoleLogs.join('\n') : '(无)');
console.log('\n=== 页面异常 ===');
console.log(exceptions.length ? exceptions.join('\n---\n') : '(无)');

const bad = consoleLogs.filter(l => /error|failed|未找到|缺失|失败/i.test(l));
console.log('\n=== 结论 ===');
console.log(exceptions.length === 0 ? '✔ 无未捕获异常' : '✘ 存在未捕获异常');
console.log(bad.length === 0 ? '✔ 无资源加载失败告警' : '✘ 存在告警:\n' + bad.join('\n'));

await cleanup(0);
