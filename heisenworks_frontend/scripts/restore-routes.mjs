// Regenerates the route copies from the single source of truth in pages/.
//
//   pages/<name>.html   -> edit these
//   <name>.html         -> generated, COMMITTED (production serves /team from team.html)
//   <name>/index.html   -> generated, COMMITTED (/team/ and Live Server)
//
// The production host serves heisenworks_frontend/ as static files, so these copies must stay in git.
// Never edit them by hand: edit pages/, run this script, commit all of it.
//
//   node scripts/restore-routes.mjs           write the copies
//   node scripts/restore-routes.mjs --check   exit 1 if any copy is missing or stale
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['contact', 'pricing', 'privacy', 'reviews', 'services', 'team', 'terms', 'work'];
const REDIRECTS = { studio: '/team', faq: '/pricing' };   // mirrors server.mjs
const CHECK = process.argv.includes('--check');

const redirectHtml = (to) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Redirecting to ${to}...</title>
  <meta http-equiv="refresh" content="0; url=${to}" />
  <link rel="canonical" href="https://heisenworks.in${to}" />
</head>
<body>
  <script>location.replace('${to}');</script>
  <p>Redirecting to <a href="${to}">${to}</a>...</p>
</body>
</html>
`;

const outputs = [];   // [absolute path, content]
for (const name of PAGES) {
  const src = path.join(WEB_ROOT, 'pages', name + '.html');
  if (!fs.existsSync(src)) {
    console.error('Source missing:', src);
    process.exitCode = 1;
    continue;
  }
  const content = fs.readFileSync(src, 'utf8');
  outputs.push([path.join(WEB_ROOT, name + '.html'), content]);
  outputs.push([path.join(WEB_ROOT, name, 'index.html'), content]);
}
for (const [name, to] of Object.entries(REDIRECTS)) {
  const content = redirectHtml(to);
  outputs.push([path.join(WEB_ROOT, name + '.html'), content]);
  outputs.push([path.join(WEB_ROOT, name, 'index.html'), content]);
}

let stale = 0;
for (const [file, content] of outputs) {
  const rel = path.relative(WEB_ROOT, file).split(path.sep).join('/');
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (CHECK) {
    if (current !== content) { stale++; console.error(`[STALE] ${rel}`); }
    continue;
  }
  if (current === content) continue;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  console.log(`[WROTE] ${rel}`);
}

if (CHECK) {
  if (stale) { console.error(`${stale} route copies out of date. Run: node scripts/restore-routes.mjs`); process.exit(1); }
  console.log('Route copies are in sync with pages/.');
} else {
  console.log(`Route copies in sync (${outputs.length} files).`);
}
