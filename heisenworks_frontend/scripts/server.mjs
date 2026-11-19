import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; media-src 'self' blob:; connect-src 'self';"
};

// Seed reviews for fallback or API querying
const SEED_REVIEWS = [
  {
    id: "rev-01",
    name: "Vikramaditya Sharma",
    role: "Head of Product",
    company: "Cybershield Technologies",
    rating: 5,
    text: "HeisenWorks re-engineered our enterprise security operations center in 4 weeks. Their motion work and crisp dark-mode interface transformed how tier-1 analysts monitor zero-day telemetry. Flawless execution.",
    verified: true,
    date: "October 2026",
    avatar: "VS"
  },
  {
    id: "rev-02",
    name: "Dr. Elena Rostova",
    role: "Principal Systems Architect",
    company: "FlyLab Avionics",
    rating: 5,
    text: "The telemetry visualization HUD HeisenWorks delivered handles 60fps WebGL rendering under real-time sensor load. Their engineering discipline and obsessive design attention made our pre-flight dashboard an industry benchmark.",
    verified: true,
    date: "September 2026",
    avatar: "ER"
  },
  {
    id: "rev-03",
    name: "Kabir Mehta",
    role: "Co-Founder & CEO",
    company: "Zodd Apparel",
    rating: 5,
    text: "Our conversion rate jumped 38% within two weeks of launching our flagship e-commerce redesign with HeisenWorks. Fast, responsive, and completely custom without cookie-cutter templates.",
    verified: true,
    date: "August 2026",
    avatar: "KM"
  }
];

const pendingReviews = [];

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

  // API: Contact Form Submission
  if (pathname === '/api/contact') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 1e6) req.destroy();
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          // Honeypot check
          if (parsed._hp_verify && parsed._hp_verify.trim() !== '') {
            res.writeHead(400, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
            res.end(JSON.stringify({ ok: false, error: 'Spam detected' }));
            return;
          }
          if (!parsed.name || !parsed.email) {
            res.writeHead(422, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
            res.end(JSON.stringify({ ok: false, error: 'Name and email are required' }));
            return;
          }
          console.log('[Contact Form Submission Received]:', parsed);
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            ...SECURITY_HEADERS
          });
          res.end(JSON.stringify({
            ok: true,
            success: true,
            message: 'Thank you for reaching out. We have received your inquiry and will reply within one business day.'
          }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
          res.end(JSON.stringify({ ok: false, error: 'Invalid JSON payload' }));
        }
      });
      return;
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
      res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
      return;
    }
  }

  // API: Reviews Endpoint
  if (pathname === '/api/reviews') {
    if (req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        ...SECURITY_HEADERS
      });
      res.end(JSON.stringify({
        ok: true,
        reviews: SEED_REVIEWS
      }));
      return;
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 1e6) req.destroy();
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          if (parsed._hp_verify && parsed._hp_verify.trim() !== '') {
            res.writeHead(400, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
            res.end(JSON.stringify({ ok: false, error: 'Spam detected' }));
            return;
          }
          if (!parsed.name || !parsed.reviewText) {
            res.writeHead(422, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
            res.end(JSON.stringify({ ok: false, error: 'Name and review text are required' }));
            return;
          }
          const newEntry = {
            id: `rev-${Date.now()}`,
            name: parsed.name.trim(),
            company: (parsed.company || 'Private Client').trim(),
            role: (parsed.role || 'Client').trim(),
            rating: Math.min(5, Math.max(1, parseInt(parsed.rating, 10) || 5)),
            text: parsed.reviewText.trim(),
            verified: false, // Must be verified by admin
            status: 'pending',
            date: 'Just now'
          };
          pendingReviews.push(newEntry);
          console.log('[New Review Submitted for Verification]:', newEntry);
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            ...SECURITY_HEADERS
          });
          res.end(JSON.stringify({
            ok: true,
            success: true,
            message: 'Thank you! Your review has been submitted for moderation and will appear once verified.',
            item: newEntry
          }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
          res.end(JSON.stringify({ ok: false, error: 'Invalid JSON payload' }));
        }
      });
      return;
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
      res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
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
  console.log('Secure multi-page server running at http://127.0.0.1:8080');
});
