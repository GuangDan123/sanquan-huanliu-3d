// 临时分析：为拥挤的相邻气压带标签寻找"仍落在色带环上"的错开量
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
const D = Math.PI / 180;
const az = Math.atan2(CAM[2], CAM[0]);
const THETA = -az - Math.PI / 2;
const l2w = (l) => [l[0] * Math.cos(THETA) + l[2] * Math.sin(THETA), l[1], -l[0] * Math.sin(THETA) + l[2] * Math.cos(THETA)];
const anchorLocal = (lat, dLon = 0, dx = 0) => {
  const phi = lat * D, t = dLon * D, r = R_BELT;
  return [r * Math.cos(phi) * Math.sin(t) + dx, r * Math.sin(phi), -r * Math.cos(phi) * Math.cos(t)];
};
const pos = (lat, dLon = 0, dx = 0) => project(l2w(anchorLocal(lat, dLon, dx)));

// 实测（DOM）障碍框：标题 → [l,t,w,h]
const obstacles = {
  '90°S 南极': [766.5, 800.5, 67, 23],
  '90°N 北极': [765.2, 76.9, 69.6, 23],
  '60°S': [607.4, 763.1, 41.8, 23],
  '60°N': [559.6, 139.5, 44.3, 23],
  '30°S': [467.7, 654.5, 41.8, 23],
  '30°N': [420.3, 297.9, 44.3, 23],
  '0° 赤道': [388.5, 488.5, 54.2, 23],
  '极地东风带S': [991.6, 790.1, 87, 25],
  '盛行西风带S': [1094.5, 716.2, 87, 25]
};
const box = (c, w = 108, h = 23) => [c.x - w / 2, c.y - h / 2, w, h];
const overlap = (a, b) => {
  const ox = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
  const oy = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  return ox > 2 && oy > 2 ? `${Math.round(ox)}×${Math.round(oy)}` : null;
};
const report = (name, lat, dLon, dx) => {
  const c = pos(lat, dLon, dx);
  const b = box(c);
  const hits = Object.entries(obstacles).map(([k, v]) => [k, overlap(b, v)]).filter(([, v]) => v);
  console.log(`  ${name} dLon=${String(dLon).padStart(4)} dx=${String(dx).padStart(5)} → 中心(${c.x.toFixed(0)}, ${c.y.toFixed(0)})  ` +
    (hits.length ? '✘ ' + hits.map(([k, v]) => `${k} ${v}`).join('; ') : '✔ 无碰撞'));
};

console.log('【副极地低气压带 60°S】沿纬圈错开（仍是环上的点）');
for (const dLon of [0, -20, -30, -40, -50, -60]) report('60°S', -60, dLon, 0);
console.log('【极地高气压带 85°S】横向微调（环太小，容不下 97px 宽的标签）');
for (const dx of [0, 1.0, 1.3, -1.3, -1.5]) report('85°S', -85, 0, dx);
console.log('【副热带高气压带 30°S】（保持贴在可见色带上，优先不动）');
report('30°S', -30, 0, 0);
console.log('【极地高气压带 85°N】（默认视角检查）');
report('85°N', 85, 0, 0);
for (const dx of [-1.3, 1.3]) report('85°N', 85, 0, dx);
console.log('\n对照：7 个标签全部零错开时的相邻间距');
const lats = [85, 60, 30, 0, -30, -60, -85];
const ys = lats.map(l => pos(l).y);
for (let i = 1; i < lats.length; i++) console.log(`  ${lats[i - 1]}° → ${lats[i]}°  Δy=${(ys[i] - ys[i - 1]).toFixed(1)}px`);
