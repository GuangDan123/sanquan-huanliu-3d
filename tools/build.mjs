// 构建脚本：把 src/index.src.html 组装为根目录下"自包含、可直接双击运行"的作品本体。
//
// 为什么必须内联运行库：
//   Chrome 禁止 file:// 页面加载 file:// 的 ES 模块
//   （Access to script ... from origin 'null' has been blocked by CORS policy）。
//   因此若要保证"双击即用 + 断网可用"，Three.js 运行库与地球纹理必须内联进同一个 HTML。
//
// 用法：node tools/build.mjs
import { readFile, writeFile, stat } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src', 'index.src.html');
const OUT = join(ROOT, '三圈环流3D交互式教学平台.html');

const CORE = join(ROOT, 'libs', 'three', 'three.module.js');
const ADDONS = [
  join(ROOT, 'libs', 'three', 'controls', 'OrbitControls.js'),
  join(ROOT, 'libs', 'three', 'renderers', 'CSS2DRenderer.js')
];
const TEXTURE = join(ROOT, 'assets', 'textures', 'earth_tex.js');

const read = (p) => readFile(p, 'utf8');

// 去掉模块内部的裸标识符 import 语句（其依赖已按顺序前置内联，处于同一模块作用域）
function stripBareImports(code, file) {
  const patterns = [
    /^import\s*\{[\s\S]*?\}\s*from\s*['"]three['"];?[ \t]*\r?\n?/m,
    /^import\s*\*\s*as\s+\w+\s*from\s*['"]three['"];?[ \t]*\r?\n?/m
  ];
  let out = code;
  for (const re of patterns) out = out.replace(re, '');
  if (/^\s*import\b/m.test(out)) {
    throw new Error(`${file}: 仍存在未处理的 import 语句，请检查构建脚本`);
  }
  return out;
}

// 去掉 export 关键字（内联进同一模块后无需再导出）。
// replaceWith 用于把"剥离"变成"改写"：核心模块置空，addon 改写成 IIFE 的 return。
// 注意：$1 必须由 replace 的替换串来展开，不能用模板字符串拼接（那样只会得到字面量 "$1"）。
function stripExports(code, file, replaceWith) {
  const out = code.replace(/^export\s*\{([\s\S]*?)\};?[ \t]*\r?\n?/m, (m, names) =>
    replaceWith === undefined ? '' : replaceWith.replace('$NAMES', names)
  );
  if (/^\s*export\b/m.test(out)) {
    throw new Error(`${file}: 仍存在未处理的 export 语句，请检查构建脚本`);
  }
  if (replaceWith !== undefined && !out.includes('return {')) {
    throw new Error(`${file}: export 改写为 return 失败，请检查替换逻辑`);
  }
  return out;
}

// 解析 `export { A, B as C, ... };` 中的导出名列表
function parseExportNames(code, file) {
  const m = code.match(/^export\s*\{([\s\S]*?)\};?[ \t]*\r?\n?/m);
  if (!m) throw new Error(`${file}: 未找到 export 语句，无法生成 THREE 命名空间`);
  return m[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.split(/\s+as\s+/).pop().trim());
}

// 构造 `const THREE = { ... };`：把核心模块的顶层绑定收集成命名空间对象。
// 全篇业务代码使用 THREE.Xxx 形式，因此这一层是必需的。
function buildThreeNamespace(names, file) {
  const body = names.map((n) => `\t${/^[A-Za-z_$][\w$]*$/.test(n) ? n : JSON.stringify(n)}`).join(',\n');
  if (names.length < 100) throw new Error(`${file}: 导出名称数量异常（${names.length}），请检查解析逻辑`);
  return `const THREE = {\n${body}\n};`;
}

// 防御性转义：避免库代码中出现 </script 截断内联脚本
const guardScriptTag = (code) => code.replace(/<\/script/gi, '<\\/script');

const main = async () => {
  const t0 = Date.now();
  const html = await read(SRC);

  // Three.js 核心：直接内联。库内部声明了 Vector3 / Matrix4 等顶层标识符，
  // 剥离 export 语句后它们成为本模块作用域的可用绑定；
  // 同时用导出名列表重建 THREE 命名空间对象，供业务代码的 THREE.Xxx 写法使用。
  const coreRaw = await read(CORE);
  const coreNames = parseExportNames(coreRaw, CORE);
  const core = guardScriptTag(stripExports(coreRaw, CORE));
  const threeNamespace = buildThreeNamespace(coreNames, CORE);

  // addon：用 IIFE 包起来隔离作用域，避免与核心的同名顶层声明冲突（重名会直接报语法错误）。
  // 末尾 export {A, B} 改写为 return {A, B}，在模块作用域取值后再挂到 THREE 上，
  // 这样业务代码里的 THREE.CSS2DObject / THREE.OrbitControls 等写法都能取到。
  const addonParts = [];
  for (const f of ADDONS) {
    const name = f.split(/[\\/]/).pop().replace(/\.js$/, '');
    let code = stripBareImports(guardScriptTag(await read(f)), f);
    code = stripExports(code, f, 'return {$NAMES};');
    addonParts.push(
      `/* ===== Three.js addon: ${name} (MIT License) ===== */\n` +
      `Object.assign(THREE, (() => {\n${code}\n})());`
    );
  }

  const runtime = [
    '/* ===== Three.js r152 core (MIT License, https://threejs.org) ===== */',
    core,
    threeNamespace,
    ...addonParts
  ].join('\n');

  // 纹理文件形如：var EARTH_TEXTURE_B64='data:image/jpeg;base64,...';
  const texRaw = (await read(TEXTURE)).trim();
  const m = texRaw.match(/^var\s+EARTH_TEXTURE_B64\s*=\s*'([\s\S]*)';?$/);
  if (!m) throw new Error('无法解析 assets/textures/earth_tex.js 中的 EARTH_TEXTURE_B64');
  const earth = `var EARTH_TEXTURE_B64 = '${m[1]}';`;

  let out = html;
  for (const [token, payload] of [['{{THREE_RUNTIME}}', runtime], ['{{EARTH_TEXTURE}}', earth]]) {
    if (!out.includes(token)) throw new Error(`源码中未找到占位符 ${token}`);
    out = out.replace(token, () => guardScriptTag(payload)); // 函数形式，避免 $& 等替换模式误伤
  }

  // 把业务代码整体包进 IIFE：Three.js 内部存在 smoothstep / lerp / clamp 等顶层函数，
  // 业务代码里也有同名实现，同处一个模块作用域会直接报 "Identifier has already been declared"。
  // 放在两个占位符之后包装，可让运行库与纹理数据留在模块作用域供业务代码引用。
  const END = '/* ==== 应用代码结束标记';
  const tail = out.lastIndexOf(END);
  if (tail < 0) throw new Error('源码中未找到应用代码结束标记');
  out = out.slice(0, tail) + '})();\n' + out.slice(tail);

  const scriptOpen = '<script type="module">';
  const bodyStart = out.indexOf(scriptOpen);
  if (bodyStart < 0) throw new Error('未找到 module 脚本起始标签');
  const insertAt = bodyStart + scriptOpen.length;
  out = out.slice(0, insertAt) + '\n(() => {\n' + out.slice(insertAt);

  await writeFile(OUT, out, 'utf8');

  const size = (await stat(OUT)).size;
  const kb = (n) => (n / 1024).toFixed(1) + ' KB';
  console.log('✔ 构建完成:', OUT.replace(ROOT + '\\', ''));
  console.log(`  运行库: ${kb(Buffer.byteLength(runtime))}（Three.js core + OrbitControls + CSS2DRenderer）`);
  console.log(`  纹理  : ${kb(Buffer.byteLength(earth))}`);
  console.log(`  产物  : ${kb(size)}，自包含单文件，零外部请求，${Date.now() - t0} ms`);
};

main().catch((e) => {
  console.error('✘ 构建失败:', e.message);
  process.exit(1);
});
