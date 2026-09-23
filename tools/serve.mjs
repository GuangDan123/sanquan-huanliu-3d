// 本地静态服务器（仅用于本地预览与自动化验证，不属于参赛作品本体）
// 用法：node tools/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const PORT = Number(process.argv[2] || 8123);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2'
};

createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = normalize(join(ROOT, urlPath === '/' ? '/index.html' : urlPath));
    if (!target.startsWith(ROOT)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const info = await stat(target);
    if (info.isDirectory()) {
      res.writeHead(404).end('not found');
      return;
    }
    const body = await readFile(target);
    res.writeHead(200, {
      'Content-Type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('not found');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`[serve] http://127.0.0.1:${PORT}/  root=${ROOT}`);
});
