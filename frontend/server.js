import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 8080);

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp']
]);

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const requestedPath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filePath = safePath(requestedPath);

  if (!filePath) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  const served = await serveFile(filePath, res);
  if (!served) await serveFile(path.join(distDir, 'index.html'), res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`chama-resolve-web listening on http://0.0.0.0:${port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use.`);
    process.exit(1);
  }

  throw error;
});

function safePath(requestedPath) {
  const normalizedPath = path.normalize(path.join(distDir, requestedPath));
  return normalizedPath.startsWith(distDir) ? normalizedPath : '';
}

async function serveFile(filePath, res) {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return false;

    const extension = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes.get(extension) || 'application/octet-stream',
      'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
    });
    createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

function sendText(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}
