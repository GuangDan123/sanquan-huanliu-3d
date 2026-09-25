// 临时分析（修正版）：每条色带在屏幕上"真正可见"的范围
// 关键：色带用 DoubleSide + depthTest，只要相机→该点的线段不穿过地球（半径 5）就可见，
//       不需要"法线朝向相机"这一条（球外面的色带近侧段会露在地球轮廓之外）。
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
// 线段 CAM→P 到地心的最近距离（正确写法：沿 CAM→P 参数化）
const minDistToCenter = (P) => {
  const d = sub(P, CAM);
  const t = Math.max(0, Math.min(1, -dot(CAM, d) / dot(d, d)));
  return Math.hypot(CAM[0] + d[0] * t, CAM[1] + d[1] * t, CAM[2] + d[2] * t);
};
const D = Math.PI / 180, az = Math.atan2(CAM[2], CAM[0]);
const lat2 = (lat) => lat * D;
const ringPt = (lat, th) => {
  const phi = lat2(lat);
  return [R_BELT * Math.cos(phi) * Math.cos(th), R_BELT * Math.sin(phi), R_BELT * Math.cos(phi) * Math.sin(th)];
};
console.log('纬度   可见点数/1440   可见 y 范围          近点(正对相机)坐标      近点是否可见');
for (const lat of [85, 60, 30, 0, -30, -60, -85]) {
  let n = 0, ymin = 1e9, ymax = -1e9;
  for (let i = 0; i < 1440; i++) {
    const th = i / 1440 * 2 * Math.PI;
    const P = ringPt(lat, th);
    if (minDistToCenter(P) < R_EARTH) continue;
    const s = project(P); n++;
    ymin = Math.min(ymin, s.y); ymax = Math.max(ymax, s.y);
  }
  const near = project(ringPt(lat, az));
  const nearVis = minDistToCenter(ringPt(lat, az)) >= R_EARTH;
  console.log(`${String(lat).padStart(4)}°  ${String(n).padStart(4)}/1440     ` +
    `${n ? ymin.toFixed(0) + ' ~ ' + ymax.toFixed(0) : '—'}        (${near.x.toFixed(0)}, ${near.y.toFixed(0)})        ${nearVis ? '✔ 可见' : '✘ 被地球挡住'}`);
}
console.log('\n各色带"可见弧"中央的坐标（沿可见弧等分取点）：');
for (const lat of [85, 60, 30, 0, -30, -60, -85]) {
  const vis = [];
  for (let i = 0; i < 1440; i++) {
    const th = i / 1440 * 2 * Math.PI;
    const P = ringPt(lat, th);
    if (minDistToCenter(P) < R_EARTH) continue;
    vis.push({ th, ...project(P) });
  }
  if (!vis.length) { console.log(`  ${String(lat).padStart(4)}° 无可见部分`); continue; }
  const mid = vis[Math.floor(vis.length / 2)];
  console.log(`  ${String(lat).padStart(4)}° 可见弧 ${vis.length} 点，中点 (${mid.x.toFixed(0)}, ${mid.y.toFixed(0)})，` +
    `lon偏移 ${(((mid.th - az) * 180 / Math.PI + 540) % 360 - 180).toFixed(0)}°`);
}
