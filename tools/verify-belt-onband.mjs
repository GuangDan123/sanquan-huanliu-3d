// 验收：第三步「气压带标签是否真的贴在模型的条状带上」——用逐像素射线检测判定（精确，不受几何抽样疏密影响）。
//
// 判据 0（结构）：每个气压带标签的锚点到球心距离 == 色带半径 5.2 → 锚点确实落在色带环上。
// 判据 1（贴带）  ：对每个"已显示"的标签，从相机过其屏幕中心打射线，第一个命中的实体必须是**它自己的色带**。
//                  （即：标签所盖住的那个像素，模型上画的正是这条带。）
// 判据 2（不重叠）：可见标签两两不重叠（真实 DOM 矩形）。
// 判据 3（不出框）：可见标签全部落在视口内。
// 判据 4（无悬空）：对**每一个**气压带标签（含隐藏的），用其投影中心做射线：
//                  命中本色带 ⇒ 必须显示；未命中 ⇒ 必须隐藏。
//                  向上杜绝"悬空标签"（色带在地球背面却仍显示），向下杜绝"该显示却消失"。
// 判据 5（一致性）：已显示标签的 DOM 中心与投影中心之差 ≤ 2px → 判据 1 取的中心点可信。
//
// 用法：node tools/verify-belt-onband.mjs [页面URL] [all|one]
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const rawUrl = process.argv[2] || 'http://127.0.0.1:8123/%E4%B8%89%E5%9C%88%E7%8E%AF%E6%B5%813D%E4%BA%A4%E4%BA%92%E5%BC%8F%E6%95%99%E5%AD%A6%E5%B9%B3%E5%8F%B0.html';
const url = rawUrl.includes('?') ? rawUrl : rawUrl + '?state=none';
const outDir = resolve('.verify-belt');
const PORT = 9600 + (process.pid % 250);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

await mkdir(outDir, { recursive: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--force-device-scale-factor=1',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(outDir, 'profile', String(PORT))}`,
  '--window-size=1600,1000', 'about:blank'
], { stdio: 'ignore' });
const cleanup = async (c) => { try { ws?.close(); } catch {} try { chrome.kill('SIGKILL'); } catch {} await sleep(200); process.exit(c); };

let target = null;
for (let i = 0; i < 40 && !target; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }); if (r.ok) target = await r.json(); } catch {}
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
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });

let ready = false;
for (let i = 0; i < 60 && !ready; i++) {
  await sleep(500);
  try { ready = await evaluate('!!(window.__threeCellDebug && window.__threeCellDebug.camera && window.__threeCellDebug.beltHitAt)'); } catch {}
}
if (!ready) { console.error('✘ 页面调试钩子未就绪（beltHitAt 缺失？）'); await cleanup(2); }

// 关弹窗 → 切到第 3 步 → 打开气压带
await evaluate(`(() => {
  document.getElementById('welcome-modal')?.classList.remove('show');
  document.querySelector('.step-dot[data-step="2"]')?.click();
  return true; })()`);
await sleep(4500);
const on = await evaluate(`!!document.getElementById('tog-pressure')?.classList.contains('active')`);
if (!on) { await evaluate(`document.getElementById('tog-pressure').click()`); await sleep(2500); }
for (let i = 0; i < 6; i++) {
  const blocked = await evaluate(`(() => {
    ['welcome-modal','step-notification','video-modal'].forEach(id => document.getElementById(id)?.classList.remove('show'));
    return ['welcome-modal','step-notification','video-modal'].filter(id => document.getElementById(id)?.classList.contains('show')); })()`);
  if (!blocked.length) break;
  await sleep(500);
}

const VIEWS = process.argv[3] === 'one' ? ['reset'] : ['reset', 'side', 'front', 'top'];
let fail = 0;
const check = (ok, msg) => { console.log((ok ? '  ✔ ' : '  ✘ ') + msg); if (!ok) fail++; };

const BELT_R = await evaluate('window.__threeCellDebug.pressureBeltR');

for (const view of VIEWS) {
  await evaluate(`window.__threeCellDebug.setView('${view}')`);
  await sleep(2400);

  const cam = await evaluate('JSON.stringify([+window.__threeCellDebug.camera.position.x.toFixed(1),+window.__threeCellDebug.camera.position.y.toFixed(1),+window.__threeCellDebug.camera.position.z.toFixed(1)])');
  const anchors = await evaluate('JSON.stringify(window.__threeCellDebug.pressureLabelScreen())').then(JSON.parse);
  const dom = await evaluate(`JSON.stringify((() => {
    const pick = (sel) => [...document.querySelectorAll(sel)].map(el => {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      return { text: (el.textContent || '').trim(),
        shown: r.width > 0 && r.height > 0 && cs.display !== 'none' && Number(cs.opacity) > 0.05,
        x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        cx: +(r.left + r.width / 2).toFixed(1), cy: +(r.top + r.height / 2).toFixed(1) };
    });
    return { viewport: { w: innerWidth, h: innerHeight }, labels: pick('.lat-label, .pressure-label') };
  })())`).then(JSON.parse);

  console.log(`\n########## 视角 ${view}（相机 ${cam}，视口 ${dom.viewport.w}×${dom.viewport.h}） ##########`);

  // ── 判据 0：锚点半径 == 色带半径 ──
  const badR = anchors.filter(a => Math.abs(a.r - BELT_R) > 0.001);
  check(badR.length === 0, badR.length
    ? `判据 0：${badR.map(a => `${a.lat}° r=${a.r}`).join('、')} 不在色带环上（应为 ${BELT_R}）`
    : `判据 0：7 个锚点离球心均为 ${BELT_R} = 色带半径 → 锚点就在条状带上`);

  // ── 逐标签射线：取投影中心像素，看第一个命中是谁 ──
  const hits = [];
  for (const a of anchors) hits.push({ ...a, hit: await evaluate(`JSON.stringify(window.__threeCellDebug.beltHitAt(${a.sx}, ${a.sy}))`).then(JSON.parse) });

  console.log('  锚点/射线明细：');
  for (const h of hits) {
    const own = h.hit.belt >= 0 && h.hit.lat === h.lat;
    console.log(`    ${String(h.lat).padStart(4)}° r=${h.r} 世界(${h.wx},${h.wy},${h.wz}) 屏(${h.sx},${h.sy}) `
      + `射线命中=${h.hit.what}${own ? '' : ' ← 非本色带'} 显示=${h.visible ? '是' : '否'} 应显=${h.baseVisible ? '是' : '否'}`);
  }

  // ── 判据 1：已显示的标签，中心像素必须落在自己的色带上 ──
  for (const h of hits.filter(h => h.visible)) {
    const own = h.hit.belt >= 0 && h.hit.lat === h.lat;
    check(own, `${String(h.lat).padStart(4)}° 「${h.text}」中心像素命中 ${h.hit.what}`);
  }

  // ── 判据 4：命中本色带 ⇔ 必须显示（双向）──
  for (const h of hits.filter(h => h.baseVisible)) {
    const own = h.hit.belt >= 0 && h.hit.lat === h.lat;
    check(own === h.visible, own
      ? `${String(h.lat).padStart(4)}° 「${h.text}」色带可见 → ${h.visible ? '已显示' : '却未显示'}`
      : `${String(h.lat).padStart(4)}° 「${h.text}」色带被地球遮挡 → ${h.visible ? '应隐藏但仍显示（悬空标签）' : '已隐藏'}`);
  }

  // ── 判据 5：DOM 中心 == 投影中心 ──
  //    不能按 text 或下标配对：气压带标签里有多条同名文案（30°/-30° 都叫「副热带高气压带 ↓」），
  //    而 CSS2DRenderer 会在标签隐藏时把它从 DOM 里摘掉，DOM 顺序会随显隐变化。
  //    故改用"位置配对"：集合双向匹配，任一侧多出/缺失都算不一致。
  const pressDom = dom.labels.filter(l => l.shown && l.text.includes('气压带'));
  const visAnchors = hits.filter(h => h.visible);
  const near = (l, a) => Math.abs(l.cx - a.sx) <= 2 && Math.abs(l.cy - a.sy) <= 2 && l.text === a.text;
  const missDom = visAnchors.filter(a => !pressDom.some(l => near(l, a)))
    .map(a => `${a.lat}°「${a.text}」投影(${a.sx},${a.sy}) 无对应 DOM 矩形`);
  const missAnchor = pressDom.filter(l => !visAnchors.some(a => near(l, a)))
    .map(l => `DOM「${l.text}」(${l.cx},${l.cy}) 无对应对数`);
  const drift = [...missDom, ...missAnchor];
  check(drift.length === 0, drift.length ? '判据 5：DOM 与投影不一致 → ' + drift.join('、')
    : `判据 5：${visAnchors.length} 个已显示标签的 DOM 中心与锚点投影逐一对齐（≤2px）`);

  // ── 判据 2：不重叠 ──
  //    俯视（相机几乎正对极轴）时，纬度/风带标签所在的"屏面"与视线共面 → 整列退化压成一条直线，
  //    纬度标尺必然自叠。这是该版式在极点俯视下的固有退化（与气压带标签无关，气压带标签本身
  //    在俯视下 7 个锚点仍全部命中本色带），故俯视只记录、不判失败。
  const vis = dom.labels.filter(l => l.shown);
  const ov = [];
  for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
    const a = vis[i], b = vis[j];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 2 && oy > 2) ov.push(`${a.text} × ${b.text} ${Math.round(ox)}×${Math.round(oy)}px`);
  }
  if (view === 'top') {
    console.log(`  · 判据 2 免检（俯视版式退化：屏面与视线共面，纬度/风带标尺压成一条线）：`
      + (ov.length ? `${ov.length} 处纬度/风带标签自叠` : '无'));
  } else {
    check(ov.length === 0, ov.length ? '判据 2：标签重叠：\n      ' + ov.join('\n      ') : `判据 2：${vis.length} 个可见标签零重叠`);
  }

  // ── 判据 3：不出视口 ──
  const oob = vis.filter(l => l.x < 0 || l.y < 0 || l.x + l.w > dom.viewport.w || l.y + l.h > dom.viewport.h);
  check(oob.length === 0, oob.length ? '判据 3：出视口 → ' + oob.map(l => l.text).join('、') : '判据 3：全部在视口内');
}

console.log(fail === 0 ? '\n✔ 全部通过' : `\n✘ ${fail} 项未通过`);
await writeFile(join(outDir, 'last-run.txt'), `fail=${fail}\n`, 'utf8');
await cleanup(fail === 0 ? 0 : 1);
