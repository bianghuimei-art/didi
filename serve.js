// Zero-dependency static file server for the lingxi-mirror site root.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname);
const PORT = Number(process.env.PORT || 3081);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff'
};

const server = http.createServer((req, res) => {
  try {
    const raw = (req.url || '/').split('?')[0];
    // 遥测类同源接口本地无后端：静默 200，避免 404 噪音
    if (raw.startsWith('/kdg/') || raw.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{}'); return; }
    // 先按“原样 URL（含 %xx 编码文件名）”找，找不到再按解码名找
    let p = path.normalize(path.join(ROOT, raw));
    if (!(p.startsWith(ROOT) && fs.existsSync(p))) {
      try {
        const dec = decodeURIComponent(raw);
        const q = path.normalize(path.join(ROOT, dec));
        if (q.startsWith(ROOT) && fs.existsSync(q)) p = q;
      } catch (e) { /* keep raw p */ }
    }
    if (!p.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
    if (!fs.existsSync(p)) { res.writeHead(404); res.end('not found: ' + raw); return; }
    const ext = path.extname(p).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    if (/\.(png|webp|jpg|jpeg|gif|ico|woff2?)$/i.test(p)) {
      res.writeHead(200, { 'content-type': mime, 'cache-control': 'no-store' });
      fs.createReadStream(p).pipe(res);
    } else {
      const data = fs.readFileSync(p);
      res.writeHead(200, { 'content-type': mime, 'content-length': data.length, 'cache-control': 'no-store' });
      res.end(data);
    }
  } catch (e) {
    res.writeHead(500); res.end('error: ' + e.message);
  }
});
server.listen(PORT, '127.0.0.1', () => console.log('lingxi-mirror serving at http://127.0.0.1:' + PORT + '/'));
