const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4'
};

const server = http.createServer((req, res) => {
  // Parse request URL
  let filePath = req.url === '/' ? '/index.html' : req.url;
  
  // Strip query parameters (like ?nocache=...)
  filePath = filePath.split('?')[0];
  
  const absolutePath = path.join(__dirname, filePath);
  const ext = path.extname(absolutePath).toLowerCase();
  
  // Guard against directory traversal
  if (!absolutePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(absolutePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    });
    fs.createReadStream(absolutePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Local static server is running at http://localhost:${PORT}/`);
});
