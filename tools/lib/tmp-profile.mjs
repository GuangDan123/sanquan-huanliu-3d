// 验收脚本共用的 Chrome 临时配置目录。
// 浏览器缓存放在系统临时目录，避免每次验收都在项目里留下几十 MB 的 profile。
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let sequence = 0;
const created = new Set();
let cleaned = false;

export function tmpProfile(label = 'geo3d-chrome') {
  const dir = join(tmpdir(), `${label}-${process.pid}-${++sequence}`);
  mkdirSync(dir, { recursive: true });
  created.add(dir);
  return dir;
}

function cleanup() {
  if (cleaned) return;
  cleaned = true;
  for (const dir of created) {
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 80 });
    } catch {
      // Chrome 可能尚未完全退出；临时目录留给系统清理，不影响项目工作区。
    }
  }
}

process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(130);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(143);
});
