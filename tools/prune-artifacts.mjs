// 清理验收产物中的浏览器缓存与过量截图。
// 默认只预览；加 --apply 才实际删除。文档中直接引用的截图始终保留。
//
// 用法：
//   node tools/prune-artifacts.mjs
//   node tools/prune-artifacts.mjs --apply
//   node tools/prune-artifacts.mjs --apply --keep=6
import { readdir, readFile, stat, rm, writeFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const artifactsDir = join(root, 'artifacts');
const apply = process.argv.includes('--apply');
const keepArg = process.argv.find((arg) => arg.startsWith('--keep='));
const baseKeep = Math.max(1, Number(keepArg?.split('=')[1]) || 6);
const imageExt = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const junkExt = new Set(['.tflite', '.pma', '.crdownload', '.log']);
const junkDirNames = new Set([
  'Default',
  'GPUCache',
  'ShaderCache',
  'GrShaderCache',
  'GraphiteDawnCache',
  'Crashpad',
  'optimization_guide_model_store'
]);
const toPosix = (value) => value.split(sep).join('/');
const tracked = new Set();
try {
  const listed = execFileSync('git', ['ls-files', '-z', '--', 'artifacts'], { cwd: root, encoding: 'utf8' });
  for (const rel of listed.split('\0')) if (rel) tracked.add(join(root, rel));
} catch {
  // 非 Git 环境下仍可清理未跟踪缓存。
}
const trackedFiles = [...tracked];
const containsTracked = (dir) => trackedFiles.some((file) => file.startsWith(dir + sep));

async function walk(dir) {
  const files = [];
  const dirs = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      dirs.push(full);
      const nested = await walk(full);
      files.push(...nested.files);
      dirs.push(...nested.dirs);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return { files, dirs };
}

async function collectReferencedImages() {
  const refs = new Set();
  const files = [join(root, 'README.md')];
  const docsEntries = await readdir(join(root, 'docs'), { withFileTypes: true });
  for (const entry of docsEntries) {
    if (entry.isFile() && entry.name.endsWith('.md')) files.push(join(root, 'docs', entry.name));
  }
  const pattern = /artifacts\/[^\s)`"'<>]+?\.(?:png|jpe?g|webp)/gi;
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const match of text.match(pattern) || []) refs.add(match);
  }
  return refs;
}

function score(file, rel, refs) {
  let value = 0;
  if (refs.has(rel)) value += 1000;
  if (/\/(final|verified)\//i.test(`/${rel}`)) value += 60;
  if (/1366|1080|1600|1920|desktop/i.test(file)) value += 20;
  if (/390|760|844|mobile|small/i.test(file)) value += 15;
  if (/step3|ferrel|pressure|formation|classroom|single/i.test(file)) value += 10;
  return value;
}

const refs = await collectReferencedImages();
const topEntries = await readdir(artifactsDir, { withFileTypes: true });
const report = {
  apply,
  keepPerDirectory: baseKeep,
  referencedImages: refs.size,
  directories: [],
  deletedFiles: 0,
  deletedBytes: 0,
  keptImages: 0,
  keptImageBytes: 0
};

for (const entry of topEntries) {
  if (!entry.isDirectory() || entry.name === 'sequence-runtime') continue;
  const dir = join(artifactsDir, entry.name);
  const { files, dirs } = await walk(dir);
  const junkDirs = dirs.filter((path) => {
    const name = path.split(sep).pop();
    const isJunk = name.startsWith('profile') || name.startsWith('chrome-profile-') || junkDirNames.has(name);
    return isJunk && !containsTracked(path);
  });
  const junkDirPrefixes = junkDirs.map((path) => path + sep);
  const inJunkDir = (file) => junkDirPrefixes.some((prefix) => file.startsWith(prefix));
  const infoByFile = new Map();
  for (const file of files) infoByFile.set(file, await stat(file));

  const junkFiles = files.filter((file) => junkExt.has(extname(file).toLowerCase()) && !inJunkDir(file) && !tracked.has(file));
  const candidates = [];
  for (const file of files) {
    if (inJunkDir(file)) continue;
    const ext = extname(file).toLowerCase();
    if (!imageExt.has(ext)) continue;
    const info = infoByFile.get(file);
    const rel = toPosix(relative(root, file));
    candidates.push({ file, rel, size: info.size, mtime: info.mtimeMs, score: score(file, rel, refs) });
  }

  const quota = /20261019|step3/.test(entry.name) ? Math.max(baseKeep, 8) : baseKeep;
  candidates.sort((a, b) => b.score - a.score || b.mtime - a.mtime);
  const forced = candidates.filter((item) => refs.has(item.rel));
  const forcedSet = new Set(forced.map((item) => item.file));
  const kept = [...forced];
  for (const item of candidates) {
    if (kept.length >= quota) break;
    if (!forcedSet.has(item.file)) kept.push(item);
  }
  const keptSet = new Set(kept.map((item) => item.file));
  const removeImages = candidates.filter((item) => !keptSet.has(item.file) && !tracked.has(item.file));
  const removeSet = new Set([...junkFiles, ...removeImages.map((item) => item.file)]);
  const deletedBytes = [...removeSet].reduce((sum, file) => sum + (infoByFile.get(file)?.size || 0), 0)
    + files.filter(inJunkDir).reduce((sum, file) => sum + (infoByFile.get(file)?.size || 0), 0);

  const row = {
    name: entry.name,
    quota,
    imagesBefore: candidates.length,
    imagesKept: kept.length,
    imagesRemoved: removeImages.length,
    junkDirsRemoved: junkDirs.length,
    junkFilesRemoved: junkFiles.length,
    bytesRemovedApprox: deletedBytes,
    kept: kept.map((item) => item.rel)
  };
  report.directories.push(row);
  report.deletedFiles += removeSet.size;
  report.deletedBytes += deletedBytes;
  report.keptImages += kept.length;
  report.keptImageBytes += kept.reduce((sum, item) => sum + item.size, 0);

  if (apply) {
    for (const file of removeSet) await rm(file, { force: true });
    for (const path of junkDirs.sort((a, b) => b.length - a.length)) {
      await rm(path, { recursive: true, force: true });
    }

    const remainingDirs = dirs.sort((a, b) => b.length - a.length);
    for (const path of remainingDirs) {
      try {
        const left = await readdir(path);
        if (!left.length) await rm(path, { recursive: true, force: true });
      } catch {
        // 目录已随缓存目录一起删除。
      }
    }
    try {
      const left = await readdir(dir);
      if (!left.length) await rm(dir, { recursive: true, force: true });
    } catch {
      // 顶层目录已不存在。
    }
  }
}

report.directories.sort((a, b) => b.bytesRemovedApprox - a.bytesRemovedApprox);
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);
console.log(`${apply ? '已执行' : '预览'}：${report.directories.length} 个验收目录，文档引用截图 ${refs.size} 张`);
console.log(`保留图片 ${report.keptImages} 张 / ${mb(report.keptImageBytes)} MB；可删除 ${report.deletedFiles} 个文件 / 约 ${mb(report.deletedBytes)} MB`);
for (const row of report.directories.slice(0, 15)) {
  console.log(`  ${row.name}: 图片 ${row.imagesBefore}→${row.imagesKept}，缓存目录 ${row.junkDirsRemoved}，约 ${mb(row.bytesRemovedApprox)} MB`);
}

if (apply) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  await writeFile(join(artifactsDir, `prune-report-${stamp}.json`), JSON.stringify(report, null, 2), 'utf8');
  console.log('清理报告：artifacts/prune-report-*.json');
}
