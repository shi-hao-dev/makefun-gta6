import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const publicRoot = fileURLToPath(new URL('./game/', import.meta.url));
const port = Number(process.env.PORT || 8080);
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json' };
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    const file = resolve(publicRoot, '.' + (path.endsWith('/') ? path + 'index.html' : path));
    if (!file.startsWith(resolve(publicRoot) + sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    res.end(data);
  } catch { res.writeHead(404).end('Missing file'); }
}).listen(port, '127.0.0.1', () => console.log(`Solmar Bay: http://127.0.0.1:${port}`));
