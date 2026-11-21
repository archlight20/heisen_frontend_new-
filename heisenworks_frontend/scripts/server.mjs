import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_ROOT = path.resolve(__dirname, '..');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; media-src 'self' blob:; connect-src 'self' https://cloudflareinsights.com;"
};

// Reuse the real Vercel functions in /api (contact.js, reviews.js) so dev matches production.
const apiHandlers = {};
    function loadApiHandler(name) {
    if(!apiHandlers[name]) {
      const file = path.resolve(__dirname, '../../api', name + '.js');
      apiHandlers[name] = import(pathToFileURL(file).href).then((m) => m.default);
    }
return apiHandlers[name];
}
const loadReviewsHandler = () => loadApiHandler('reviews');

// Minimal Vercel-style res.status().json() shim for plain Node http responses
function vercelRes(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

const server = http.createServer((req, res) => {
  // CORS Preflight handler
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...SECURITY_HEADERS
    });
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const pathname = urlObj.pathname.replace(/\/+$/, '') || '/';

  // API: Contact / lead form (runs the real Vercel function, api/contact.js)
  if (pathname === '/api/contact') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      let parsed = {};
      try { parsed = body ? JSON.parse(body) : {}; } catch { parsed = body; }
      const vreq = Object.assign(req, { body: parsed, query: Object.fromEntries(urlObj.searchParams) });
      loadApiHandler('contact')
        .then((handler) => handler(vreq, vercelRes(res)))
        .catch((err) => {
          console.error('Contact handler failed:', err);
          if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
          res.end(JSON.stringify({ ok: false, error: 'Contact handler failed' }));
        });
    });
    return;
  }

  // API: Reviews Endpoint (live Google reviews via api/reviews.js)
  if (pathname === '/api/reviews') {
          const vreq = Object.assign(req, { query: Object.fromEntries(urlObj.searchParams) });
          loadReviewsHandler()
            .then((handler) => handler(vreq, vercelRes(res)))
            .catch((err) => {
              console.error('Reviews handler failed:', err);
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
              }
              res.end(JSON.stringify({ ok: false, error: 'Reviews handler failed', reviews: [] }));
            });
        return;
      }

  // Only allow GET and HEAD for static file serving
  if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
        res.end('Method Not Allowed');
        return;
      }

      let reqPath;
      try {
        reqPath = decodeURIComponent(urlObj.pathname);
      } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
        res.end('Bad Request');
        return;
      }

      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

      // 301 Redirect: /studio -> /team
      if (reqPath === '/studio' || reqPath === '/studio/' || reqPath === '/studio.html') {
        res.writeHead(301, {
          'Location': '/team',
          ...SECURITY_HEADERS
        });
        res.end();
        return;
      }

      // 301 Redirect: /faq -> /pricing
      if (reqPath === '/faq' || reqPath === '/faq/' || reqPath === '/faq.html') {
        res.writeHead(301, {
          'Location': '/pricing',
          ...SECURITY_HEADERS
        });
        res.end();
        return;
      }

      // Normalize path and prevent directory traversal
      let normalizedRelPath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
      let filePath = path.resolve(WEB_ROOT, '.' + normalizedRelPath);

      // Strict containment check: ensure target path is inside WEB_ROOT
      if (!filePath.startsWith(WEB_ROOT)) {
        res.writeHead(403, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
        res.end('403 Forbidden');
        return;
      }

      // Clean URLs & pages/ lookup support: /team, /team/, /team.html -> pages/team.html
      if (!fs.existsSync(filePath) || fs.statSync(filePath, { throwIfNoEntry: false })?.isDirectory()) {
        const cleanRel = reqPath.replace(/^\/+|\/+$/g, '').replace(/\.html$/i, '');
        const cleanPath = filePath.replace(/[/\\]+$/, '');
        const htmlCandidate = cleanPath + '.html';
        const indexCandidate = path.join(cleanPath, 'index.html');
        const pagesCandidate = cleanRel && !cleanRel.includes('/') ? path.join(WEB_ROOT, 'pages', cleanRel + '.html') : '';
        if (pagesCandidate && fs.existsSync(pagesCandidate) && fs.statSync(pagesCandidate).isFile()) {
          filePath = pagesCandidate;
        } else if (fs.existsSync(htmlCandidate) && fs.statSync(htmlCandidate).isFile()) {
          filePath = htmlCandidate;
        } else if (fs.existsSync(indexCandidate) && fs.statSync(indexCandidate).isFile()) {
          filePath = indexCandidate;
        }
      }

      // Prevent serving internal scripts/ tooling or hidden dotfiles
      const relToRoot = path.relative(WEB_ROOT, filePath).split(path.sep).join('/');
      const basename = path.basename(filePath);
      if (relToRoot.startsWith('scripts/') || basename === 'server.mjs' || basename.startsWith('.')) {
        res.writeHead(403, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
        res.end('403 Forbidden');
        return;
      }

      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          const notFoundPath = path.join(WEB_ROOT, '404.html');
          if (fs.existsSync(notFoundPath)) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS });
            fs.createReadStream(notFoundPath).pipe(res);
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
            res.end('Not Found');
          }
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';

          // Static asset caching headers (in dev no-cache; in production long cache for immutable media)
          const isDev = process.env.NODE_ENV !== 'production';
          const isMedia = /\.(mp4|webm|jpg|jpeg|png|webp|svg|ico)$/i.test(filePath);
          const cacheControl = !isDev && isMedia
            ? 'public, max-age=31536000, immutable'
            : 'no-cache';

          res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': stats.size,
            'Cache-Control': cacheControl,
            ...SECURITY_HEADERS
          });

          if (req.method === 'HEAD') {
            res.end();
            return;
          }

        const stream = fs.createReadStream(filePath);
        stream.on('error', () => {
          if (!res.headersSent) res.writeHead(500);
          res.end('Internal Server Error');
        });
        stream.pipe(res);
      });
    });

  const PORT = process.env.PORT || 8080;
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running at http://127.0.0.1:${PORT}/ (WEB_ROOT: ${WEB_ROOT})`);
  });
