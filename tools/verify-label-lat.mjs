// 验收脚本：校验纬度(左)/气压带(中)/风带(右) 三列标签的纬度位置是否正确
//
// 判据：
//   1) 气压带、风带标签在屏幕上与左侧纬度标尺严格等高（等效纬度 ≈ 名义纬度）
//   2) 横向分置：纬度在左、气压带在中、风带在右
//   3) 风带标签（最右列）离球心距离 > 地球半径（不会被遮挡判定误判隐藏）
//   4) 标签框两两不重叠（按字号估算外接框，等效替代需要浏览器的 DOM 量测）
//
// 用法：node tools/verify-label-lat.mjs
const D = Math.PI / 180;

// ── 布局参数（与 src/index.src.html 保持一致）──
const R_EARTH = 5;
const LABEL_R_LAT = R_EARTH + 0.6;        // 5.6  纬度标尺弧半径（高度基准）
const LABEL_X_MID = -0.45;                // 气压带标签（中列）
const LABEL_X_MID_POLE = -1.95;           // 气压带标签 ±85° 档
const LABEL_X_WIND_ARC = 3.4;             // 风带标签（右列）弧横向半径
const LABEL_X_WIND_BASE = 3.0;            // 风带标签（右列）整体外移量

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pressureLabelX = (lat) => {
  const t = clamp((Math.abs(lat) - 60) / 25, 0, 1);
  return LABEL_X_MID + (LABEL_X_MID_POLE - LABEL_X_MID) * t;
};
const windLabelX = (lat) => -(LABEL_X_WIND_ARC * Math.cos(lat * D) + LABEL_X_WIND_BASE);

const labelY = (lat) => LABEL_R_LAT * Math.sin(lat * D);
const bandPos = (x, lat) => [x, labelY(lat), 0];

// ── 相机（与页面一致：PerspectiveCamera(50, w/h)，position(8,6,12)，target 原点）──
const W = 1600, H = 1000, FOV = 50;
const camPos = [8, 6, 12];
const az = Math.atan2(camPos[2], camPos[0]);

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

const camZ = norm(sub(camPos, [0, 0, 0]));
const camX = norm(cross([0, 1, 0], camZ));
const camY = cross(camZ, camX);
const f = H / 2 / Math.tan(FOV * D / 2);   // 像素焦距

function project(p) {
  const rel = sub(p, camPos);
  const depth = -dot(rel, camZ);
  return { sx: W / 2 + f * (dot(rel, camX) / depth), sy: H / 2 - f * (dot(rel, camY) / depth), depth };
}

// 屏面内局部坐标 → 世界坐标（local +X = 屏幕左、+Y = 屏幕上；组旋转 -az-π/2）
function worldFromLocal(x, y) {
  const left = [-Math.sin(az), 0, Math.cos(az)];
  return [left[0] * x, y, left[2] * x];
}

// 纬度标尺曲线（左侧纬度标签所在曲线）：纬度 → 屏幕 y
const rulerScreenY = (lat) => project(worldFromLocal(LABEL_R_LAT * Math.cos(lat * D), labelY(lat))).sy;
function rulerLatAt(screenY) {
  const s = [];
  for (let lat = -90; lat <= 90; lat += 0.25) s.push([lat, rulerScreenY(lat)]);
  for (let i = 0; i < s.length - 1; i++) {
    const [l0, y0] = s[i], [l1, y1] = s[i + 1];
    if ((screenY - y0) * (screenY - y1) <= 0) {
      const t = Math.abs(y1 - y0) < 1e-9 ? 0 : (screenY - y0) / (y1 - y0);
      return l0 + (l1 - l0) * t;
    }
  }
  return NaN;
}

// 球面"轮廓读数"：地球轮廓上的纬度线在屏幕上对应的 y
// （取球心深度处 y = R·sin(lat) 的点 —— 这是学生读地球外轮廓纬度的方式；
//   近表面点因透视放大并不适合作为纬度读数的参照）
const sphereScreenY = (lat) => project(worldFromLocal(0, R_EARTH * Math.sin(lat * D))).sy;
function sphereLatAt(screenY) {
  const s = [];
  for (let lat = -90; lat <= 90; lat += 0.25) s.push([lat, sphereScreenY(lat)]);
  for (let i = 0; i < s.length - 1; i++) {
    const [l0, y0] = s[i], [l1, y1] = s[i + 1];
    if ((screenY - y0) * (screenY - y1) <= 0) {
      const t = Math.abs(y1 - y0) < 1e-9 ? 0 : (screenY - y0) / (y1 - y0);
      return l0 + (l1 - l0) * t;
    }
  }
  return NaN;
}

// ── 三组标签（文本与源码一致，用于估算外接框）──
const mk = (group, lat, x, text, fs) => ({ group, lat, text, fs, local: bandPos(x, lat) });
const labels = [
  ...[0, 30, -30, 60, -60, 90, -90].map(lat =>
    mk('纬度', lat, LABEL_R_LAT * Math.cos(lat * D),
      ({ 0: '0° 赤道', 30: '30°N', '-30': '30°S', 60: '60°N', '-60': '60°S', 90: '90°N 北极', '-90': '90°S 南极' })[lat], 11)),
  ...[15, -15, 45, -45, 75, -75].map(lat =>
    mk('风带', lat, windLabelX(lat),
      ({ 15: '东北信风带', '-15': '东南信风带', 45: '盛行西风带', '-45': '盛行西风带', 75: '极地东风带', '-75': '极地东风带' })[lat], 13)),
  ...[[0, '赤道低气压带 ↑'], [30, '副热带高气压带 ↓'], [-30, '副热带高气压带 ↓'], [60, '副极地低气压带 ↑'], [-60, '副极地低气压带 ↑'], [85, '极地高气压带 ↓'], [-85, '极地高气压带 ↓']]
    .map(([lat, text]) => mk('气压带', lat, pressureLabelX(lat), text, 11))
];

for (const l of labels) {
  const p = project(worldFromLocal(l.local[0], l.local[1]));
  l.sx = p.sx; l.sy = p.sy;
  l.dist = Math.hypot(l.local[0], l.local[1]);      // 离球心距离（遮挡判定用）
  l.apparent = rulerLatAt(l.sy);                    // 等效纬度（对纬度标尺）
  l.sphere = sphereLatAt(l.sy);                     // 相对球面经线的纬度读数
  l.w = Math.round(l.fs * l.text.length * 1.02) + 22;  // 外接框（估算）
  l.h = Math.round(l.fs * 1.25) + 6;
}

// ── 输出 ──
const pad = (s, n) => String(s).padEnd(n, ' ');
const num = (v, n = 2) => (Number.isFinite(v) ? v.toFixed(n) : ' -- ');
console.log('相机 position(8,6,12) target(0,0,0) fov=50  视口 %dx%d（中心 %d,%d）\n', W, H, W / 2, H / 2);
console.log(pad('组', 8) + pad('名义纬度', 10) + pad('屏幕x', 9) + pad('屏幕y', 9) + pad('等效纬度', 10) + pad('轮廓读数', 10) + '离球心');
console.log('-'.repeat(72));
for (const l of labels) {
  console.log(pad(l.group, 8) + pad(l.lat, 10) + pad(num(l.sx, 0), 9) + pad(num(l.sy, 0), 9) +
    pad(num(l.apparent, 2), 10) + pad(num(l.sphere, 2), 10) + num(l.dist, 2));
}

console.log('\n横向分置（屏幕 x）：');
const gx = (g) => labels.filter(l => l.group === g).map(l => l.sx);
const rg = (a) => `${num(Math.min(...a), 0)} ~ ${num(Math.max(...a), 0)}`;
console.log(`  纬度组   ${rg(gx('纬度'))}   ← 左`);
console.log(`  气压带组 ${rg(gx('气压带'))}   ← 中`);
console.log(`  风带组   ${rg(gx('风带'))}   ← 右`);

console.log('\n标签框重叠检查（按字号估算外接框）：');
const overlaps = [];
for (let i = 0; i < labels.length; i++) {
  for (let j = i + 1; j < labels.length; j++) {
    const a = labels[i], b = labels[j];
    const ox = (a.w + b.w) / 2 - Math.abs(a.sx - b.sx);
    const oy = (a.h + b.h) / 2 - Math.abs(a.sy - b.sy);
    if (ox > 0 && oy > 0) overlaps.push(`${a.group}${a.lat}° × ${b.group}${b.lat}°  重叠 ${Math.round(ox)}×${Math.round(oy)} px`);
  }
}
console.log(overlaps.length ? overlaps.map(s => '  ✘ ' + s).join('\n') : '  ✔ 无重叠');

// ── 断言 ──
let fail = 0;
const check = (ok, msg) => { console.log((ok ? '  ✔ ' : '  ✘ ') + msg); if (!ok) fail++; };
console.log('\n断言：');
for (const l of labels.filter(l => l.group !== '纬度')) {
  const d = Math.abs(l.apparent - l.lat);
  check(d < 0.35, `${l.group} ${l.lat}° 与纬度标尺等高（偏差 ${num(d, 3)}°）`);
}
for (const l of labels.filter(l => l.group === '风带')) {
  check(l.dist > R_EARTH, `风带 ${l.lat}° 离球心 ${num(l.dist)} > ${R_EARTH}（位于视轮廓外侧，不会误判为被地球遮挡）`);
}
const latX = gx('纬度'), presX = gx('气压带'), windX = gx('风带');
check(Math.max(...latX) < Math.min(...presX), `纬度组整体在气压带组左侧（${num(Math.max(...latX), 0)} < ${num(Math.min(...presX), 0)}）`);
check(Math.max(...presX) < Math.min(...windX), `气压带组整体在风带组左侧（${num(Math.max(...presX), 0)} < ${num(Math.min(...windX), 0)}）`);
check(overlaps.length === 0, `标签框两两不重叠（${overlaps.length} 处重叠）`);

console.log(fail === 0 ? '\n✔ 全部通过' : `\n✘ ${fail} 项未通过`);
process.exit(fail === 0 ? 0 : 1);
