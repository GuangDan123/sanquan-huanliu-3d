// 数值诊断：检查单圈环流路径在偏转后的经度偏移、半径与"是否闭合/自交"
// 用法：node tools/diag-path.mjs
// 该脚本独立复现 src 中的路径公式（不依赖浏览器），便于快速迭代形状参数。

const R = 5;
const surfaceAlt = 0.35;
const upperAlt = 1.8;
const altMid = (surfaceAlt + upperAlt) / 2;
const altRange = (upperAlt - surfaceAlt) / 2;
const riseLat = 2.5, sinkLat = 90, hemisphere = 1;
const deg = Math.PI / 180;

function makePos(coriolisDeg, variant) {
  const latAt = (t) => (riseLat + (sinkLat - riseLat) * 0.5 * (1 - Math.cos(t * Math.PI * 2))) * hemisphere;
  const altAt = (t) => altMid + altRange * Math.sin(t * Math.PI * 2);

  return (t) => {
    const angle = t * Math.PI * 2;
    const lat = latAt(t);
    const alt = altAt(t);
    const h = 1e-4;
    const dLatDt = (latAt((t + h) % 1) - lat) / h;

    const horizontalWeight = Math.sin(angle) ** 2;
    const latWeight = Math.sin(Math.abs(lat) * deg);

    let shift;
    if (variant === 'A') {
      // 当前实现：偏移只随 ∂lat/∂t（竖直段为零）
      shift = coriolisDeg * latWeight * horizontalWeight * dLatDt * hemisphere;
    } else {
      // 备选 B：按"水平气流"判定偏移方向，用 cos(angle) 显式表示向极地/向赤道
      //   cos(angle) > 0 → 向极地（高空，东偏）；< 0 → 向赤道（近地面，西偏）
      shift = coriolisDeg * latWeight * horizontalWeight * Math.cos(angle) * hemisphere;
    }

    const phi = (90 - lat) * deg;
    const theta = shift * deg;
    const r = R + alt;
    return { x: r * Math.sin(phi) * Math.cos(theta), y: r * Math.cos(phi), z: r * Math.sin(phi) * Math.sin(theta), shift, lat, alt };
  };
}

for (const variant of ['A', 'B']) {
  for (const cor of [4, 8, 20]) {
    const f = makePos(cor, variant);
    const N = 48;
    let maxShift = 0, maxShiftT = 0;
    const rows = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const p = f(t);
      if (Math.abs(p.shift) > maxShift) { maxShift = Math.abs(p.shift); maxShiftT = t; }
      rows.push(p);
    }
    // 相邻采样点的位移差（判断是否有突跳/尖角）
    let maxJump = 0, maxJumpT = 0;
    for (let i = 0; i < rows.length; i++) {
      const a = rows[i], b = rows[(i + 1) % rows.length];
      const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      if (d > maxJump) { maxJump = d; maxJumpT = i / N; }
    }
    const closed = Math.hypot(rows[0].x - rows[N].x, rows[0].y - rows[N].y, rows[0].z - rows[N].z);
    console.log(`变体${variant} 偏转=${cor}°  最大偏移=${maxShift.toFixed(2)}°(t=${maxShiftT.toFixed(2)})  相邻最大跨度=${maxJump.toFixed(2)}  闭合误差=${closed.toFixed(4)}  半径范围=${Math.min(...rows.map(r=>Math.hypot(r.x,r.y,r.z))).toFixed(2)}~${Math.max(...rows.map(r=>Math.hypot(r.x,r.y,r.z))).toFixed(2)}`);
  }
  console.log('');
}

// 打印变体A/B 在偏转 20° 下沿路径的偏移曲线，直观看波形
for (const variant of ['A', 'B']) {
  const f = makePos(20, variant);
  const vals = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    vals.push(`${t.toFixed(2)}:${f(t).shift.toFixed(1)}`);
  }
  console.log(`变体${variant} 偏移曲线(偏转20°):`);
  console.log('  ' + vals.join(' '));
}
