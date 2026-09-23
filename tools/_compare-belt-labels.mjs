// 临时分析：对比最终候选方案（标签中心到自己色带的距离、压到别人色带的点数、重叠）
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
const minD = (P) => {
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
// 各色带可见色带面点集
const ALL = [
  { lat: 85, half: 4, n: '85N' }, { lat: 60, half: 2.5, n: '60N' }, { lat: 30, half: 2.5, n: '30N' },
  { lat: 0, half: 2.5, n: 'EQ' }, { lat: -30, half: 2.5, n: '30S' }, { lat: -60, half: 2.5, n: '60S' },
  { lat: -85, half: 4, n: '85S' }
];
const rib = {};
for (const b of ALL) {
  const pts = [];
  for (let li = 0; li <= 10; li++) {
    const lat = b.lat - b.half + 2 * b.half * li / 10, phi = lat * D;
    for (let i = 0; i < 720; i++) {
      const th = i / 720 * 2 * Math.PI;
      const P = [R_BELT * Math.cos(phi) * Math.cos(th), R_BELT * Math.sin(phi), R_BELT * Math.cos(phi) * Math.sin(th)];
      if (minD(P) < R_EARTH) continue;
      pts.push(project(P));
    }
  }
  rib[b.n] = { pts, visible: pts.length > 0 };
}
const distToRibbon = (n, c) => rib[n].pts.reduce((m, p) => Math.min(m, Math.hypot(p.x - c.x, p.y - c.y)), 1e9);
const foreignCover = (n, box) => Object.entries(rib).filter(([k, v]) => k !== n &&
  v.pts.some(p => p.x > box[0] && p.x < box[0] + box[2] && p.y > box[1] && p.y < box[1] + box[3])).map(([k]) => k);

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

const run = (tag, cfg) => {
  console.log(`\n===== ${tag} =====`);
  const pts = {}, boxes = {};
  for (const k of KEYS) {
    const o = cfg[k] || {};
    pts[k] = anchor(LATOF[k], o.dLon || 0, o.dx || 0, o.dy || 0);
    boxes[k] = boxOf(pts[k], W[Math.abs(LATOF[k])]);
  }
  for (const k of KEYS) {
    const own = rib[k];
    const ov = [];
    for (const [n, o] of Object.entries(obstacles)) if (hit(boxes[k], o)) ov.push('「' + n + '」');
    for (const k2 of KEYS) if (KEYS.indexOf(k2) > KEYS.indexOf(k) && hit(boxes[k], boxes[k2])) ov.push(k2);
    const d = own.visible ? distToRibbon(k, pts[k]).toFixed(1) : '—';
    console.log(`  ${k.padEnd(4)} (${pts[k].x.toFixed(0).padStart(4)},${pts[k].y.toFixed(0).padStart(4)})  离本色带 ${String(d).padStart(5)}px  ` +
      `压到:${foreignCover(k, boxes[k]).join('/') || '无'}  重叠:${ov.join(' ') || '无'}`);
  }
};
run('X1  30S dLon=30 / 85S dy=-0.5', { '30S': { dLon: 30 }, '85S': { dy: -0.5 } });
run('X2  30S dLon=30 / 85S dx=-1.6', { '30S': { dLon: 30 }, '85S': { dx: -1.6 } });
run('X3  30S dLon=25 + 60S dLon=-15 / 85S dy=-0.5', { '30S': { dLon: 25 }, '60S': { dLon: -15 }, '85S': { dy: -0.5 } });
run('X4  30S dLon=20 + 60S dLon=-25 / 85S dy=-0.5', { '30S': { dLon: 20 }, '60S': { dLon: -25 }, '85S': { dy: -0.5 } });
run('X5  30S dLon=20 / 85S dx=-1.6', { '30S': { dLon: 20 }, '85S': { dx: -1.6 } });
run('X6  30S dLon=25 / 85S dx=-1.6', { '30S': { dLon: 25 }, '85S': { dx: -1.6 } });
