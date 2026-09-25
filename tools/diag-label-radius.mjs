// 计算"标签放在世界半径 r 处时，在屏幕上距地球中心的像素距离"
// 用于确定标签应放在多远处才不会压在地球/环流圈上。
// 用法：node tools/diag-label-radius.mjs

const W = 1600, H = 1000;          // 画布尺寸
const FOV = 50;                    // 相机 fov
const R = 5;                       // 地球半径
const POSITIONS = [
  { name: '俯视',  cam: [0, 18, 0.01] },
  { name: '侧视',  cam: [16, 0, 0] },
  { name: '平视',  cam: [0, 0, 16] },
  { name: '默认',  cam: [8, 6, 12] }
];

const f = (H / 2) / Math.tan(FOV * Math.PI / 360); // 焦距（像素）

function screenRadius(cam, r) {
  // 观察方向：相机看向原点
  const d = Math.hypot(...cam);
  const n = cam.map(v => v / d);               // 单位视线方向（原点→相机）
  // 在该方向上、距原点 r 的点 P = n*r ；其屏幕距中心距离
  // 相机坐标系：z 轴沿 -n，先算 P 在相机坐标系中的横向分量
  // P = n*r 与视线方向共线 → 横向分量 = 0
  // 因此在 n 方向上取点没有意义，取"与视线垂直方向"上的半径 r 的点：
  // 该点 P = r * u（u ⟂ n），相机到 P 的深度 = d（因为 P ⟂ n 时 P 在过原点且垂直视线的平面上）
  const depth = d;
  return (r * f) / depth;
}

console.log(`画布 ${W}x${H}  fov=${FOV}°  焦距=${f.toFixed(1)}px\n`);
for (const p of POSITIONS) {
  const d = Math.hypot(...p.cam);
  const globePx = screenRadius(p.cam, R);
  // 地球在屏幕上的角半径（更准确：对球体求切线）
  const globeAng = Math.asin(R / d);
  const globeTangentPx = f * Math.tan(globeAng);
  console.log(`${p.name} 相机距离=${d.toFixed(2)}  地球屏幕半径≈${globeTangentPx.toFixed(0)}px`);
  for (const r of [6.5, 7.0, 7.4, 8.0, 9.0, 10.0, 11.0, 12.0]) {
    const px = screenRadius(p.cam, r);
    const outside = px > globeTangentPx ? '外侧 ✔' : '内侧 ✘';
    console.log(`   标签半径 r=${r}  →  屏距 ${px.toFixed(0)}px  (地球 ${globeTangentPx.toFixed(0)}px)  ${outside}`);
  }
  console.log('');
}
