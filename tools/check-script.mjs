// 从 HTML 中抽取 <script type="module"> 并调用 node --check 做语法校验。
// 注意：当前环境禁止管道捕获子进程输出，因此只依据退出码判定，stdout/stderr 继承到当前终端。
import { readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const htmlPath = process.argv[2];
const html = await readFile(htmlPath, 'utf8');
const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!m) {
  console.error('未找到 module 脚本');
  process.exit(1);
}
const tmp = join(process.cwd(), '.tmp-module-check.mjs');
await writeFile(tmp, m[1], 'utf8');
const r = spawnSync(process.execPath, ['--check', tmp], { stdio: 'inherit' });
await rm(tmp, { force: true });
if (r.status === 0) {
  console.log(`module 脚本语法 OK（${m[1].length} 字符）`);
} else {
  console.error(`module 脚本语法检查失败，退出码 ${r.status}`);
  process.exit(1);
}
