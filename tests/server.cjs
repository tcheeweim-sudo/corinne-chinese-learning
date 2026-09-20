// Local-only server; also exercises the GitHub Pages project subdirectory.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const prefix = '/corinne-chinese-learning/';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
http.createServer((req, res) => {
  let route;
  try { route = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end(); }
  if (!route.startsWith(prefix)) { res.writeHead(302, { Location: prefix }); return res.end(); }
  const file = path.resolve(root, route.slice(prefix.length) || 'index.html');
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, data) => {
    res.writeHead(error ? 404 : 200, { 'Content-Type': types[path.extname(file)] || 'text/plain', 'Cache-Control': 'no-cache' });
    res.end(error ? 'Not found' : data);
  });
}).listen(8000, '127.0.0.1', () => console.log(`http://127.0.0.1:8000${prefix}`));
