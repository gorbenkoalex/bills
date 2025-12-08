import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

const rootDir = process.cwd();
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

function resolvePath(requestUrl) {
  const { pathname } = url.parse(requestUrl);
  const safePath = pathname === '/' ? '/index.html' : decodeURI(pathname || '/');
  const resolved = path.join(rootDir, safePath);

  if (!resolved.startsWith(rootDir)) {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }

  return resolved;
}

async function serveFile(filePath, res) {
  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      return serveFile(path.join(filePath, 'index.html'), res);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const body = await readFile(filePath);

    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
    res.end(body);
  } catch (error) {
    const status = error?.statusCode === 403 ? 403 : 404;
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end(status === 403 ? 'Forbidden' : 'Not found');
  }
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('Bad request');
    return;
  }

  const filePath = resolvePath(req.url);
  serveFile(filePath, res);
});

server.listen(port, () => {
  console.log(`Local dev server running at http://localhost:${port}`);
  console.log('Press Ctrl+C to stop.');
});
