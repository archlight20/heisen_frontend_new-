import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_ROOT = path.resolve(__dirname);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; media-src 'self'; connect-src 'self';"
};

const server = http.createServer((req, res) => {
  // CORS Preflight handler
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Allow': 'GET, HEAD, POST, OPTIONS',
      ...SECURITY_HEADERS
    });
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const pathname = urlObj.pathname;

  // Local development mock API endpoint for contact form submissions
  if (pathname === '/api/contact' || pathname === '/contact') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 1e6) { // 1MB payload limit
          req.destroy();
        }
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          console.log('[Contact Form Submission Received]:', parsed);
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            ...SECURITY_HEADERS
          });
          res.end(JSON.stringify({ success: true, message: 'Inquiry received successfully' }));
        } catch {
          res.writeHead(400, {
            'Content-Type': 'application/json; charset=utf-8',
            ...SECURITY_HEADERS
          });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
        }
      });
      return;
    } else {
      res.writeHead(405, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
      res.end('Method Not Allowed');
      return;
    }
  }

  // Only allow GET and HEAD for static file serving
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
    res.end('Method Not Allowed');
    return;
  }

  // Safe URI decoding with error handling
  let reqPath;
  try {
    reqPath = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
    res.end('Bad Request');
    return;
  }
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  // Normalize path and prevent directory traversal
  const normalizedRelPath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.resolve(WEB_ROOT, '.' + normalizedRelPath);

  // Strict containment check: ensure target path is inside WEB_ROOT
  if (!filePath.startsWith(WEB_ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
    res.end('403 Forbidden');
    return;
  }

  // Prevent serving server.mjs itself, test files, or hidden dotfiles
  const basename = path.basename(filePath);
  if (basename === 'server.mjs' || basename.startsWith('.')) {
    res.writeHead(403, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const range = req.headers.range;

    // Hardened HTTP Range handling for video streaming
    if (range && (ext === '.mp4' || ext === '.webm')) {
      const parts = range.replace(/bytes=/, '').split('-');
      let start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;

      // Suffix range: bytes=-500
      if (isNaN(start)) {
        start = stats.size - parseInt(parts[1], 10);
        end = stats.size - 1;
      }

      // Validate range bounds
      if (isNaN(start) || isNaN(end) || start < 0 || end >= stats.size || start > end) {
        res.writeHead(416, {
          'Content-Range': `bytes */${stats.size}`,
          ...SECURITY_HEADERS
        });
        res.end();
        return;
      }

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });

      file.on('error', () => {
        if (!res.headersSent) {
          res.writeHead(500, SECURITY_HEADERS);
        }
        res.end();
      });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        ...SECURITY_HEADERS
      });

      if (req.method === 'HEAD') {
        res.end();
      } else {
        file.pipe(res);
      }
    } else {
      res.writeHead(200, {
        'Content-Length': stats.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        ...SECURITY_HEADERS
      });

      if (req.method === 'HEAD') {
        res.end();
      } else {
        const file = fs.createReadStream(filePath);
        file.on('error', () => {
          if (!res.headersSent) {
            res.writeHead(500, SECURITY_HEADERS);
          }
          res.end();
        });
        file.pipe(res);
      }
    }
  });
});

server.listen(8080, '127.0.0.1', () => {
  console.log('Secure server running at http://127.0.0.1:8080');
});
