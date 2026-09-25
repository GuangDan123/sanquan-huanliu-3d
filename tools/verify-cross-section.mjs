// 环流剖面（环流圈）屏幕锚定验收：确认"重启后环流圈停在地球屏幕左侧"。
//
// 判据（在真实页面里用真实相机矩阵量测，非纸面推导）：
//   1) 剖面所在经圈（环流带鼓出方向）投影落在视口中心**左侧**；
//   2) 该点在地球前方（视线不被地球挡住）→ 不会被球体吞掉；
//   3) 四种预设视角（重置/侧视/平视/俯视）下均成立 → 拖动/切视角也不会跑到右边。
//
// 用法：node tools/verify-cross-section.mjs [页面URL]
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2] || 'http://127.0.0.1:8123/%E4%B8%89%E5%9C%88%E7%8E%AF%E6%B5%813D%E4%BA%A4%E4%BA%92%E5%BC%8F%E6%95%99%E5%AD%A6%E5%B9%B3%E5%8F%B0.html?state=none';
const PORT = 9600 + (process.pid % 300);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = resolve('.verify-cross');
await mkdir(join(outDir, 'profile'), { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--force-device-scale-factor=1',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(outDir, 'profile')}`,
  '--window-size=1600,1000', 'about:blank'
], { stdio: 'ignore' });

let ws;
const cleanup = async (code) => {
  try { ws?.close(); } catch {}
  try { chrome.kill('SIGKILL'); } catch {}
  await sleep(200);
  process.exit(code);
};

let target = null;
for (let i = 0; i < 40 && !target; i++) {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
    if (r.ok) target = await r.json();
  } catch {}
  if (!target) await sleep(400);
}
if (!target) { console.error('✘ CDP 未就绪'); await cleanup(2); }

ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { resolve: res, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : res(m.result);
  }
});
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++seq;
  pending.set(id, { resolve: res, reject: rej });
  ws.send(JSON.stringify({ id, method, params }));
});
await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true });
  ws.addEventListener('error', rej, { once: true });
});
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });

let ready = false;
for (let i = 0; i < 60 && !ready; i++) {
  await sleep(500);
  try { ready = await evaluate('!!(window.__threeCellDebug && window.__threeCellDebug.crossSectionRoot && window.__threeCellDebug.setView)'); } catch {}
}
if (!ready) { console.error('✘ 页面调试钩子未就绪'); await cleanup(2); }
await evaluate(`document.getElementById('welcome-modal')?.classList.remove('show')`);

// 在真实页面里量测：把一个环流带路径点（纬度约 46°，环流带的"鼓出"处）转成屏幕坐标
const measure = `(() => {
  const dbg = window.__threeCellDebug;
  const R = dbg.earthRadius;
  const cam = dbg.camera;
  const root = dbg.crossSectionRoot;
  const vp = { w: innerWidth, h: innerHeight };
  const project = (p) => {
    const v = p.clone().project(cam);            // → NDC
    return { x: (v.x + 1) / 2 * vp.w, y: (1 - v.y) / 2 * vp.h };
  };
  const centerX = +project(dbg.makeVector3(0, 0, 0)).x.toFixed(1);   // 球心在屏幕上的 x
  // 环流带在纬度约 46° 处向外鼓出最远（t=0.25 高空段 / t=0.75 近地面段）
  const pts = [];
  [0.25, 0.75].forEach(t => {
    const local = dbg.getSingleDropPosition(t, 0, 1, 0, 2.5, 90);
    const world = root.localToWorld(local.clone());
    const sp = project(world);
    // 视线遮挡：相机→该点线段离球心最近距离 < R 即被地球挡住
    const dir = cam.position.clone().sub(world);
    const tt = Math.max(0, Math.min(1, -world.clone().dot(dir) / dir.lengthSq()));
    const closest = world.clone().addScaledVector(dir, tt);
    pts.push({
      t,
      radius: +world.length().toFixed(2),
      x: +sp.x.toFixed(1), y: +sp.y.toFixed(1),
      occluded: closest.length() < R
    });
  });
  return {
    vp,
    camera: { x: +cam.position.x.toFixed(2), y: +cam.position.y.toFixed(2), z: +cam.position.z.toFixed(2) },
    rotationDeg: +(root.rotation.y * 180 / Math.PI).toFixed(2),
    centerX,
    pts
  };
})()`;

console.log('视角'.padEnd(10) + '相机位置'.padEnd(26) + '剖面旋转'.padEnd(12) + '环流带鼓出点屏幕x（视口中心 x）'.padEnd(34) + '离球心'.padEnd(10) + '被遮挡');
console.log('-'.repeat(104));

const views = [['reset', '重置(默认)'], ['side', '侧视'], ['front', '平视'], ['top', '俯视']];
const fails = [];
for (const [view, label] of views) {
  await evaluate(`window.__threeCellDebug.setView('${view}')`);
  await sleep(1600);          // 等视角动画（800ms）结束 + 若干帧更新朝向
  const m = await evaluate(measure);
  for (const p of m.pts) {
    const left = p.x < m.centerX;
    const ok = left && !p.occluded;
    if (!ok) fails.push(`${label} t=${p.t}: 屏幕x=${p.x}（中心=${m.centerX}）left=${left} occluded=${p.occluded}`);
    const tag = `${p.x}（中心 ${m.centerX}）${left ? ' ←左侧' : ' →右侧!'}${p.occluded ? ' 被遮挡!' : ''}`;
    console.log(
      (p.t === m.pts[0].t ? label : '').padEnd(10) +
      (p.t === m.pts[0].t ? `(${m.camera.x}, ${m.camera.y}, ${m.camera.z})`.padEnd(26) : ''.padEnd(26)) +
      (p.t === m.pts[0].t ? `${m.rotationDeg}°`.padEnd(12) : ''.padEnd(12)) +
      tag.padEnd(34) + String(p.radius).padEnd(10) + (p.occluded ? '是' : '否')
    );
  }
}

console.log('');
if (fails.length) {
  console.log('✘ 未通过：');
  for (const f of fails) console.log('   ' + f);
  await cleanup(1);
} else {
  console.log('✔ 全部通过：四种视角下环流带都停在地球屏幕左侧，且未被球体遮挡。');
  await cleanup(0);
}
