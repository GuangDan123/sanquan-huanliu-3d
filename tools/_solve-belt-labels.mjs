// 临时分析：在"标签贴在**自己色带的可见段**上"的前提下，求解南半球三个标签的落点
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(here, '..', 'src', 'index.src.html'), 'utf8');
const R_EARTH = parseFloat(SRC.match(/earth:\s*\{\s*radius:\s*([\d.]+)/)[1]);
const R_BELT = R_EARTH + 0.2;
const CAM = [8, 6, 12], FOV = 50, VW = 1600, VH = 1000;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const norm = (a) => mul(a, 1 / Math.hypot(...a));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const F = norm(sub([0, 0, 0], CAM)), R = norm(cross(F, [0, 1, 0])), U = cross(R, F);
const TH = Math.tan(FOV * Math.PI / 360);
const project = (p) => {
  const v = sub(p, CAM), z = dot(v, F);
  return { x: ((dot(v, R) / z) / (TH * VW / VH) + 1) / 2 * VW, y: (1 - (dot(v, U) / z) / TH) / 2 * VH };
};
const minDistToCenter = (P) => {
  const d = sub(P, CAM);
  const t = Math.max(0, Math.min(1, -dot(CAM, d) / dot(d, d)));
  return Math.hypot(CAM[0] + d[0] * t, CAM[1] + d[1] * t, CAM[2] + d[2] * t);
};
const D = Math.PI / 180, az = Math.atan2(CAM[2], CAM[0]), THETA = -az - Math.PI / 2;
const l2w = (l) => [l[0] * Math.cos(THETA) + l[2] * Math.sin(THETA), l[1], -l[0] * Math.sin(THETA) + l[2] * Math.cos(THETA)];
const anchor = (lat, dLon = 0, dx = 0, dy = 0) => {
  const phi = lat * D, t = dLon * D, r = R_BELT;
  return project(l2w([r * Math.cos(phi) * Math.sin(t) + dx, r * Math.sin(phi) + dy, -r * Math.cos(phi) * Math.cos(t)]));
};

// 各色带的可见色带面（含宽度）：返回投影点集 + 该带的"近侧厚带"
const BELTS = [
  { lat: 30, half: 2.5, n: '30N' }, { lat: 0, half: 2.5, n: 'EQ' }, { lat: -30, half: 2.5, n: '30S' },
  { lat: -60, half: 2.5, n: '60S' }, { lat: -85, half: 4, n: '85S' }
];
const ribbons = {};
for (const b of BELTS) {
  const pts = [];
  for (let li = 0; li <= 12; li++) {
    const lat = b.lat - b.half + 2 * b.half * li / 12, phi = lat * D;
    for (let i = 0; i < 720; i++) {
      const th = i / 720 * 2 * Math.PI;
      const P = [R_BELT * Math.cos(phi) * Math.cos(th), R_BELT * Math.sin(phi), R_BELT * Math.cos(phi) * Math.sin(th)];
      if (minDistToCenter(P) < R_EARTH) continue;
      pts.push(project(P));
    }
  }
  ribbons[b.n] = { ...b, pts };
}
// 某点附近是否有该带的可见色带面（距离 ≤ tol）
const nearRibbon = (n, pt, tol = 12) => ribbons[n].pts.some(p => Math.hypot(p.x - pt.x, p.y - pt.y) <= tol);
const coversRibbon = (n, box) => ribbons[n].pts.some(p =>
  p.x > box[0] && p.x < box[0] + box[2] && p.y > box[1] && p.y < box[1] + box[3]);

const obstacles = {
  '90°N北极': [765.2, 76.9, 69.6, 23], '90°S南极': [766.5, 800.5, 67, 23],
  '60°N': [559.6, 139.5, 44.3, 23], '60°S': [607.4, 763.1, 41.8, 23],
  '30°N': [420.3, 297.9, 44.3, 23], '30°S': [467.7, 654.5, 41.8, 23], '0°赤道': [388.5, 488.5, 54.2, 23],
  '极地东风带75': [1063.7, 92.1, 87, 25], '盛行西风带45': [1167.5, 209.5, 87, 25],
  '东北信风带15': [1203.8, 392.2, 87, 25], '东南信风带-15': [1173, 576.2, 87, 25],
  '盛行西风带-45': [1094.5, 716.2, 87, 25], '极地东风带-75': [991.6, 790.1, 87, 25]
};
const W = { 85: 96.8, 60: 107.8, 30: 107.8, 0: 96.8 };
const boxOf = (c, w) => [c.x - w / 2, c.y - 11.5, w, 23];
const hit = (a, b) => {
  const ox = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
  const oy = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  return ox > 2 && oy > 2;
};
const KEYS = ['85N', '60N', '30N', 'EQ', '30S', '60S', '85S'];
const LATOF = { '85N': 85, '60N': 60, '30N': 30, EQ: 0, '30S': -30, '60S': -60, '85S': -85 };
const OWN = { '30N': '30N', EQ: 'EQ', '30S': '30S', '60S': '60S', '85S': '85S' };

const evalCfg = (cfg) => {
  const pts = {}, boxes = {};
  for (const k of KEYS) {
    const o = cfg[k] || {};
    pts[k] = anchor(LATOF[k], o.dLon || 0, o.dx || 0, o.dy || 0);
    boxes[k] = boxOf(pts[k], W[Math.abs(LATOF[k])]);
  }
  const bad = [];
  for (const k of KEYS) {
    const b = boxes[k];
    for (const [n, o] of Object.entries(obstacles)) if (hit(b, o)) bad.push(`${k}×「${n}」`);
    for (const k2 of KEYS) if (KEYS.indexOf(k2) > KEYS.indexOf(k) && hit(b, boxes[k2])) bad.push(`${k}×${k2}`);
    if (b[0] < 4 || b[0] + b[2] > VW - 4 || b[1] < 4 || b[1] + b[3] > VH - 4) bad.push(`${k} 出视口`);
  }
  // 相邻拥挤的三条带：标签必须贴在自己色带的可见面上，且不压别人的可见色带
  for (const k of ['30S', '60S', '85S']) {
    if (!nearRibbon(OWN[k], pts[k], 14)) bad.push(`${k} 不在自己色带可见面上`);
    for (const n of ['30S', '60S']) if (n !== OWN[k] && coversRibbon(n, boxes[k])) bad.push(`${k} 压住色带 ${n}`);
  }
  return { pts, boxes, bad };
};

const show = (tag, cfg) => {
  const { pts, bad } = evalCfg(cfg);
  console.log(`\n【${tag}】` + (bad.length ? '\n   ✘ ' + bad.join('； ') : ' ✔ 通过'));
  for (const k of ['30S', '60S', '85S']) console.log(`   ${k.padEnd(4)} (${pts[k].x.toFixed(0)}, ${pts[k].y.toFixed(0)})`);
};

show('当前实现（60S dLon=45 / 85S dx=-2.0）', { '60S': { dLon: 45 }, '85S': { dx: -2.0 } });
show('参考：全零错开', {});

console.log('\n===== 搜索（30S、60S 沿纬圈；85S 横向/纵向外移）=====');
const out = [];
for (const d30 of [0, 20, -20, 30, -30, 40, -40, 50, -50]) {
  for (const d60 of [0, 20, -20, 30, -30, 40, -40, 50, -50]) {
    for (const dx of [0, 1.4, -1.4, 2.0, -2.0, 2.6, -2.6]) {
      for (const dy of [0, -0.6, -1.2]) {
        const cfg = { '30S': { dLon: d30 }, '60S': { dLon: d60 }, '85S': { dx, dy } };
        const { bad, pts, boxes } = evalCfg(cfg);
        // 只保留：无标签重叠、不出视口、30S/60S 贴在自己色带上
        const hard = bad.filter(m => !m.includes('压住色带') && !m.includes('不在自己色带'));
        if (hard.length) continue;
        if (!nearRibbon('30S', pts['30S'], 14) || !nearRibbon('60S', pts['60S'], 14)) continue;
        // 扣分：压到别的色带（点数越多越差）、偏移量越大越差
        const wrong = (OWN['30S'] !== '60S' && coversRibbon('60S', boxes['30S']) ? 1 : 0) +
          (coversRibbon('30S', boxes['60S']) ? 1 : 0) + (coversRibbon('30S', boxes['85S']) ? 1 : 0);
        const cost = wrong * 100 + Math.abs(d30) + Math.abs(d60) * 1.5 + Math.abs(dx) * 12 + Math.abs(dy) * 15;
        out.push({ d30, d60, dx, dy, wrong, cost, pts });
      }
    }
  }
}
out.sort((a, b) => a.cost - b.cost);
for (const o of out.slice(0, 10)) {
  console.log(`  30S dLon=${String(o.d30).padStart(4)} → (${o.pts['30S'].x.toFixed(0)},${o.pts['30S'].y.toFixed(0)})  ` +
    `60S dLon=${String(o.d60).padStart(4)} → (${o.pts['60S'].x.toFixed(0)},${o.pts['60S'].y.toFixed(0)})  ` +
    `85S dx=${String(o.dx).padStart(5)} dy=${String(o.dy).padStart(4)} → (${o.pts['85S'].x.toFixed(0)},${o.pts['85S'].y.toFixed(0)})  压错带=${o.wrong}`);
}
console.log(`共 ${out.length} 组可行`);
