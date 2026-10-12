/*
 * serve.mjs - a tiny static file server for CelCamp Phoenix (no dependencies).
 *
 *   node serve.mjs [port]      ->  http://localhost:8080/
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.argv[2] || process.env.PORT || 8080);
const types = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.gif': 'image/gif', '.jpg': 'image/jpeg',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.3dm': 'application/xml', '.dat': 'text/plain', '.gz': 'application/gzip',
    '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
};

createServer((req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(root, path));
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403); res.end(); return; }
    let st;
    try { st = statSync(file); } catch { res.writeHead(404); res.end('Not found'); return; }
    if (st.isDirectory()) { res.writeHead(302, { Location: path + '/' }); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
    createReadStream(file).pipe(res);
}).listen(port, () => console.log('CelCamp Phoenix: http://localhost:' + port + '/'));
