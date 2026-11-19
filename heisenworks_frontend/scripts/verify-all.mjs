import http from 'node:http';

async function fetchUrl(urlPath, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 8080,
      path: urlPath,
      method: method,
      headers: {
        'Accept': '*/*'
      }
    };
    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('=== MULTI-PAGE & API ROUTING VERIFICATION ===');
  
  const pages = [
    '/',
    '/studio',
    '/work',
    '/services',
    '/pricing',
    '/reviews',
    '/team',
    '/contact',
    '/privacy',
    '/terms'
  ];

  let passed = 0;
  let failed = 0;

  for (const page of pages) {
    try {
      const res = await fetchUrl(page);
      if (page === '/studio') {
        if (res.status === 301 && res.headers['location'] === '/team') {
          console.log(`[PASS] Page /studio -> HTTP 301 Redirect to /team`);
          passed++;
        } else {
          console.error(`[FAIL] Page /studio -> Expected 301 to /team, got ${res.status}`);
          failed++;
        }
      } else if (res.status === 200) {
        console.log(`[PASS] Page ${page} -> HTTP 200 (${res.body.length} bytes)`);
        passed++;
      } else {
        console.error(`[FAIL] Page ${page} -> HTTP ${res.status}`);
        failed++;
      }
    } catch (e) {
      console.error(`[FAIL] Page ${page} -> ${e.message}`);
      failed++;
    }
  }

  const assets = [
    '/sitemap.xml',
    '/robots.txt',
    '/favicon.ico',
    '/css/shared.css',
    '/js/main.js',
    '/js/vendor/lenis.mjs',
    '/assets/images/og/og-image.jpg',
    '/assets/images/hero/hex-hero-poster.jpg',
    '/assets/images/logos/heisenworks-logo.png',
    '/assets/images/logos/heisenworks-logo-amber.png',
    '/assets/images/logos/heisenworks-logo-light.png',
    '/assets/images/team/fahad-malik.jpg',
    '/assets/images/team/kritanshu.png',
    '/assets/images/team/piyush.jpg',
    '/assets/images/team/uttam-singh.jpg',
    '/assets/images/team/mohd-naved-khan.png',
    '/assets/images/team/kanishk-sharma.png',
    '/assets/videos/heisenworks-hero-loop.mp4',
    '/assets/videos/cyberrange-ctf-preview.mp4',
    '/assets/videos/flywire-neural-preview.mp4',
    '/assets/videos/offgrid-survival-preview.mp4',
    '/assets/videos/zod-living-walkthrough.mp4'
  ];

  for (const asset of assets) {
    try {
      const res = await fetchUrl(asset, 'HEAD');
      if (res.status === 200) {
        console.log(`[PASS] Asset ${asset} -> HTTP 200 (${res.headers['content-type']}, ${res.headers['content-length'] || '?'} bytes)`);
        passed++;
      } else {
        console.error(`[FAIL] Asset ${asset} -> HTTP ${res.status}`);
        failed++;
      }
    } catch (e) {
      console.error(`[FAIL] Asset ${asset} -> ${e.message}`);
      failed++;
    }
  }

  // Security: ensure internal scripts/ cannot be served over HTTP
  const blockedRes = await fetchUrl('/scripts/server.mjs');
  if (blockedRes.status === 403) {
    console.log('[PASS] Security /scripts/server.mjs -> HTTP 403 Forbidden');
    passed++;
  } else {
    console.error(`[FAIL] Security /scripts/server.mjs -> Expected 403, got ${blockedRes.status}`);
    failed++;
  }

  // Test API Endpoints
  console.log('\n--- Testing API Endpoints ---');

  // Contact API Success
  const contactRes = await fetchUrl('/api/contact', 'POST', JSON.stringify({
    name: 'Test Client',
    email: 'client@example.com',
    project: 'Testing contact inquiry'
  }));
  if (contactRes.status === 200) {
    console.log('[PASS] POST /api/contact -> HTTP 200');
    passed++;
  } else {
    console.error(`[FAIL] POST /api/contact -> HTTP ${contactRes.status}`);
    failed++;
  }

  // Contact API Honeypot rejection
  const spamRes = await fetchUrl('/api/contact', 'POST', JSON.stringify({
    name: 'Spam Bot',
    email: 'bot@spam.com',
    _hp_verify: 'bot-fill-hidden-field'
  }));
  if (spamRes.status === 400) {
    console.log('[PASS] POST /api/contact (honeypot) -> HTTP 400 Rejected');
    passed++;
  } else {
    console.error(`[FAIL] POST /api/contact (honeypot) -> HTTP ${spamRes.status}`);
    failed++;
  }

  // Reviews API GET
  const reviewsGet = await fetchUrl('/api/reviews');
  if (reviewsGet.status === 200 && reviewsGet.body.includes('Cybershield')) {
    console.log('[PASS] GET /api/reviews -> HTTP 200 (Contains seed verified reviews)');
    passed++;
  } else {
    console.error(`[FAIL] GET /api/reviews -> HTTP ${reviewsGet.status}`);
    failed++;
  }

  // Reviews API POST (pending submission)
  const reviewsPost = await fetchUrl('/api/reviews', 'POST', JSON.stringify({
    name: 'Elena Rostova',
    company: 'FlyLab Avionics',
    rating: 5,
    reviewText: 'Exceptional real-time WebGL performance.'
  }));
  if (reviewsPost.status === 200 && reviewsPost.body.includes('submitted for moderation')) {
    console.log('[PASS] POST /api/reviews -> HTTP 200 (Pending submission)');
    passed++;
  } else {
    console.error(`[FAIL] POST /api/reviews -> HTTP ${reviewsPost.status}`);
    failed++;
  }

  // SEO & Security Audits
  console.log('\n--- Testing SEO & Security Hardening ---');

  // Custom 404 Page Check
  const notFoundRes = await fetchUrl('/non-existent-dimension-test-404');
  if (notFoundRes.status === 404 && notFoundRes.body.includes('404 Error')) {
    console.log('[PASS] Custom 404 Page -> HTTP 404 (Rendered branded 404.html template)');
    passed++;
  } else {
    console.error(`[FAIL] Custom 404 Page -> Expected 404 with template, got ${notFoundRes.status}`);
    failed++;
  }

  // Security Headers Check (HSTS, CSP, X-Frame-Options)
  const homeHeaders = await fetchUrl('/');
  if (homeHeaders.headers['strict-transport-security'] &&
      homeHeaders.headers['content-security-policy'] &&
      homeHeaders.headers['x-frame-options'] === 'DENY' &&
      homeHeaders.headers['x-content-type-options'] === 'nosniff') {
    console.log('[PASS] Security Headers -> HSTS, CSP, X-Frame-Options, X-Content-Type-Options verified');
    passed++;
  } else {
    console.error(`[FAIL] Security Headers -> Missing expected headers on /:`, homeHeaders.headers);
    failed++;
  }

  // Structured Data (JSON-LD) Check on Homepage
  if (homeHeaders.body.includes('application/ld+json') && homeHeaders.body.includes('"@type": "Organization"')) {
    console.log('[PASS] Structured Data -> JSON-LD Organization schema verified on homepage');
    passed++;
  } else {
    console.error(`[FAIL] Structured Data -> Missing JSON-LD on /`);
    failed++;
  }

  console.log(`\nVerification Complete: ${passed} Passed, ${failed} Failed.`);
}

runTests();

