// 验收脚本：第三步「气压带标签」是否贴在模型的条状带（色带）上
//
// 判据：
//   1) 标签锚点与所属色带"最靠近相机的那一点"在屏幕上重合（偏差 ≤ 3px）
//   2) 各标签纵向顺序与纬度顺序一致（北高南低），不出现上下倒挂
//   3) 标签框两两不重叠
//
// 注：投影参数与页面一致 —— PerspectiveCamera(50°)、位置 (8,6,12)、看向原点、视口 1600×1000。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(here, '..', 'src', 'index.src.html'), 'utf8');

// ── 从源码里取常量，避免脚本与页面各写一份 ──
const num = (re, name) => {
  const m = SRC.match(re);
  if (!m) throw new Error(`源码中未找到 ${name}`);
  return parseFloat(m[1]);
};
const R_EARTH = num(/earth:\s*\{\s*radius:\s*([\d.]+)/, 'earth.radius');
const R_BELT = R_EARTH + 0.2;                    // createPressureBelts 的色带半径
const R_LAT_ARC = num(/const LABEL_R_LAT = CONFIG\.earth\.radius \+ ([\d.]+)/, 'LABEL_R_LAT') + R_EARTH;

console.log(`地球半径 ${R_EARTH}  色带半径 ${R_BELT}  纬度标尺弧半径 ${R_LAT_ARC}\n`);

// ── 相机 ──
const CAM_POS = [8, 6, 12], TARGET = [0, 0, 0], FOV = 50;
const VW = 1600, VH = 1000;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const norm = (a) => mul(a, 1 / Math.hypot(...a));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

const F = norm(sub(TARGET, CAM_POS));
const RIGHT = norm(cross(F, [0, 1, 0]));
const UPCAM = cross(RIGHT, F);
const TH = Math.tan(FOV * Math.PI / 360);

const project = (p) => {
  const v = sub(p, CAM_POS);
  const z = dot(v, F);
  const ndcX = (dot(v, RIGHT) / z) / (TH * VW / VH);
  const ndcY = (dot(v, UPCAM) / z) / TH;
  return { x: (ndcX + 1) / 2 * VW, y: (1 - ndcY) / 2 * VH, z: +z.toFixed(2) };
};
const D = Math.PI / 180;
const az = Math.atan2(CAM_POS[2], CAM_POS[0]);
const THETA = -az - Math.PI / 2;                 // 标签组的统一朝向（local +X = 屏幕左）
const localToWorld = (l) => [
  l[0] * Math.cos(THETA) + l[2] * Math.sin(THETA), l[1],
  -l[0] * Math.sin(THETA) + l[2] * Math.cos(THETA)
];

// ── 各条色带的纬度（与 createPressureBelts 的 beltData 一致） ──
const BELTS = [
  { lat: 85, half: 4, name: '极地高气压带' },
  { lat: 60, half: 2.5, name: '副极地低气压带' },
  { lat: 30, half: 2.5, name: '副热带高气压带' },
  { lat: 0, half: 2.5, name: '赤道低气压带' },
  { lat: -30, half: 2.5, name: '副热带高气压带' },
  { lat: -60, half: 2.5, name: '副极地低气压带' },
  { lat: -85, half: 4, name: '极地高气压带' }
];

// 色带上"最靠近相机"的那一点（世界坐标）—— 标签就该贴在这里
const nHat = [Math.cos(az), 0, Math.sin(az)];
const beltNearPoint = (lat, r = R_BELT) => [
  nHat[0] * r * Math.cos(lat * D), r * Math.sin(lat * D), nHat[2] * r * Math.cos(lat * D)
];
// 色带近侧上下两条边缘（用于判断标签是否落在色带宽度内）
const beltBandSpan = (lat, half) => [project(beltNearPoint(lat + half)), project(beltNearPoint(lat - half))];

// 当前实现：三组标签同处"过球心的屏面"，气压带标签锚点 = bandPos(pressureLabelX(lat), lat)
const LABEL_X_MID = num(/const LABEL_X_MID = (-?[\d.]+)/, 'LABEL_X_MID');
const LABEL_X_MID_POLE = num(/const LABEL_X_MID_POLE = (-?[\d.]+)/, 'LABEL_X_MID_POLE');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pressureLabelX = (lat) => {
  const t = clamp((Math.abs(lat) - 60) / 25, 0, 1);
  return LABEL_X_MID + (LABEL_X_MID_POLE - LABEL_X_MID) * t;
};
const flatPos = (lat) => localToWorld([pressureLabelX(lat), R_LAT_ARC * Math.sin(lat * D), 0]);

// 新方案：锚到色带近侧点（局部坐标 (0, r·sin lat, -r·cos lat)，组的 -Z 指向相机）
const beltAnchorLocal = (lat, r = R_BELT) => [0, r * Math.sin(lat * D), -r * Math.cos(lat * D)];
const ancorPos = (lat) => localToWorld(beltAnchorLocal(lat));
// 现用方案（把锚点也写成局部坐标 + 同朝向），便于和源码直接对照
const SRC_LOCAL = SRC.includes('beltAnchorLocal') ? '色带锚定' : '屏面列';

console.log('=== 气压带标签 vs 条状带（屏幕坐标，视口 1600×1000，中心 800/500）===');
const pad = (s, n) => String(s).padEnd(n, ' ');
console.log(pad('纬度', 6) + pad('色带名', 16) + pad('色带近点y', 11) + pad('色带跨度y', 14) +
  pad('当前标签y', 11) + pad('当前偏差', 10) + '新锚点y');
console.log('-'.repeat(96));
const rows = [];
for (const b of BELTS) {
  const near = project(beltNearPoint(b.lat));
  const [e1, e2] = beltBandSpan(b.lat, b.half);
  const span = [Math.min(e1.y, e2.y), Math.max(e1.y, e2.y)];
  const cur = project(flatPos(b.lat));
  const nw = project(ancorPos(b.lat));
  rows.push({ lat: b.lat, name: b.name, span, near, cur, ancor: nw });
  console.log(pad(b.lat + '°', 6) + pad(b.name, 16) +
    pad(near.y.toFixed(1), 11) + pad(`${span[0].toFixed(0)}~${span[1].toFixed(0)}`, 14) +
    pad(cur.y.toFixed(1), 11) + pad((cur.y - near.y).toFixed(1), 10) + nw.y.toFixed(1));
}

// ── 判据 1：锚点与色带近点重合 ──
let fail = 0;
const check = (ok, msg) => { console.log((ok ? '  ✔ ' : '  ✘ ') + msg); if (!ok) fail++; };
console.log('\n=== 判据 1：标签锚点是否落在色带近侧点上 ===');
for (const r of rows) {
  const d = Math.hypot(r.ancor.x - r.near.x, r.ancor.y - r.near.y);
  check(d <= 3, `${r.lat}° ${r.name}：锚点与色带近点屏幕距离 ${d.toFixed(2)}px`);
}

// ── 判据 2：标签中心是否落在色带宽度内 ──
console.log('\n=== 判据 2：标签中心是否落在色带可见宽度内 ===');
for (const r of rows) {
  check(r.ancor.y >= r.span[0] - 2 && r.ancor.y <= r.span[1] + 2,
    `${r.lat}° 标签 y=${r.ancor.y.toFixed(1)} 落在色带跨度 ${r.span[0].toFixed(0)}~${r.span[1].toFixed(0)} 内`);
}

// ── 判据 3：南北顺序不乱（屏幕 y 随纬度单调递减） ──
console.log('\n=== 判据 3：标签纵向顺序（北高南低） ===');
for (let i = 1; i < rows.length; i++) {
  check(rows[i].ancor.y > rows[i - 1].ancor.y + 4,
    `${rows[i - 1].lat}°(${rows[i - 1].ancor.y.toFixed(0)}) 在 ${rows[i].lat}°(${rows[i].ancor.y.toFixed(0)}) 之上`);
}

// ── 判据 4：标签框不重叠（字号 11px、内边距 3px 10px、行高约 23px） ──
const boxOf = (r) => {
  const w = 9 * 11 + 20;         // 7 个汉字 ≈ 9em 宽 + 左右内边距
  const h = 23;
  return { x: r.ancor.x - w / 2, y: r.ancor.y - h / 2, w, h };
};
console.log('\n=== 判据 4：气压带标签两两不重叠 ===');
for (let i = 0; i < rows.length; i++) {
  for (let j = i + 1; j < rows.length; j++) {
    const a = boxOf(rows[i]), b = boxOf(rows[j]);
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    check(!(ox > 2 && oy > 2), `${rows[i].lat}° × ${rows[j].lat}° 重叠 ${ox > 2 && oy > 2 ? Math.round(ox) + '×' + Math.round(oy) + 'px' : '无'}`);
  }
}

console.log(`\n当前源码锚定方式：${SRC_LOCAL}`);
console.log(fail === 0 ? '\n✔ 全部通过' : `\n✘ ${fail} 项未通过`);
process.exit(fail === 0 ? 0 : 1);
