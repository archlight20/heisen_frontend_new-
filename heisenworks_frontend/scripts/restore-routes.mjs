import fs from 'node:fs';
import path from 'node:path';

const WEB_ROOT = path.resolve('e:/personal project/heisenwork_website/heisenworks_frontend');
const PAGES = ['contact', 'pricing', 'privacy', 'reviews', 'services', 'team', 'terms', 'work'];

for (const name of PAGES) {
  const src = path.join(WEB_ROOT, 'pages', name + '.html');
  if (!fs.existsSync(src)) {
    console.error('Source missing:', src);
    continue;
  }
  const content = fs.readFileSync(src, 'utf8');

  // 1. Root .html file (e.g. team.html)
  fs.writeFileSync(path.join(WEB_ROOT, name + '.html'), content, 'utf8');

  // 2. Directory index file (e.g. team/index.html)
  const dir = path.join(WEB_ROOT, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), content, 'utf8');

  console.log(`[RESTORED] /${name} -> both ${name}.html and ${name}/index.html`);
}

// Studio redirect to /team (handles Live Server / static hosts without server-side redirects)
const studioHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Redirecting to /team...</title>
  <meta http-equiv="refresh" content="0; url=/team" />
  <link rel="canonical" href="https://heisenworks.in/team" />
</head>
<body>
  <script>location.replace('/team');</script>
  <p>Redirecting to <a href="/team">/team</a>...</p>
</body>
</html>
`;
fs.writeFileSync(path.join(WEB_ROOT, 'studio.html'), studioHtml, 'utf8');
const studioDir = path.join(WEB_ROOT, 'studio');
fs.mkdirSync(studioDir, { recursive: true });
fs.writeFileSync(path.join(studioDir, 'index.html'), studioHtml, 'utf8');
console.log('[RESTORED] /studio redirect -> studio.html and studio/index.html');
