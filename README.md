# HeisenWorks Website

Official marketing and studio website for **HeisenWorks** (`heisenworks.in`), built with plain HTML5, CSS3, vanilla JavaScript, and one Cloudflare Worker (`worker.js`) for the lead form.

## Editing pages (single source of truth)

Edit `heisenworks_frontend/pages/*.html`, never the root `<page>.html` or `<page>/index.html` files.
Those are generated copies, and they MUST be committed: the production host serves `heisenworks_frontend/` as static files, so `/team` only resolves because `team.html` exists.
After editing a page, run `node heisenworks_frontend/scripts/restore-routes.mjs`, then commit `pages/` and the regenerated copies together. `--check` fails if any copy is stale.

## Folder Structure

```text
heisenwork_website/
├── .gitignore                        # Git ignore rules (node_modules, .env, OS, test artifacts)
├── README.md                         # Project documentation & conventions
├── lib/
│   ├── lead.js                       # Lead validation, rate limit, Resend email (shared by prod + dev)
│   └── *.test.mjs                    # node --test "lib/*.test.mjs"
├── worker.js                         # Cloudflare Worker: POST /api/contact -> lib/lead.js, everything else -> static assets
├── wrangler.json                     # Worker config: assets dir, 404 page
├── docs/                             # Internal planning notes, checklists, & PDFs (not served publicly)
│   ├── plan.md
│   ├── problem-list.md
│   └── pre-launch-fix-list.pdf
├── archive/                          # Unused, duplicated, & legacy files (preserved, not served publicly)
│   ├── unused-assets/                # Brand extras, raw photos, QA screenshots, unused videos
│   ├── duplicates/                   # Archived duplicate copies
│   └── old-versions/                 # Superseded pages, old sitemap, uncompressed video master
└── heisenworks_frontend/             # Public static web root
    ├── index.html                    # Homepage
    ├── 404.html                      # Branded custom 404 error page (robots: noindex, follow)
    ├── favicon.ico                   # Browser favicon (domain root)
    ├── robots.txt                    # Search engine directives (domain root)
    ├── sitemap.xml                   # XML sitemap (domain root)
    ├── pages/                        # Subpages (served via generated root copies; see Editing pages)
    │   ├── contact.html
    │   ├── pricing.html
    │   ├── privacy.html
    │   ├── reviews.html
    │   ├── services.html
    │   ├── team.html
    │   ├── terms.html
    │   └── work.html
    ├── css/
    │   └── shared.css                # Shared design tokens, layout, navbar, footer, & components
    ├── js/
    │   ├── main.js                   # Client-side navigation, forms, modals, & interactions
    │   └── vendor/
    │       └── lenis.mjs             # Vendored smooth-scrolling library
    ├── assets/
    │   ├── images/
    │   │   ├── hero/                 # Hero poster imagery
    │   │   ├── logos/                # Brand logos (dark, light, amber)
    │   │   ├── og/                   # Open Graph / social sharing preview image
    │   │   └── team/                 # Founder & core team portraits
    │   └── videos/                   # Web-optimized H.264 MP4 hero & project hover videos
    └── scripts/                      # Local dev tooling (not deployed: listed in .assetsignore)
        ├── server.mjs                # Local Node.js multi-page & API dev server
        ├── templates.mjs             # Shared page template reference/generator
        └── verify-all.mjs            # Automated routing, asset, & API test suite
```

## Naming Conventions

- **Lowercase with hyphens (`kebab-case`)** for all files and folders (e.g., `zod-living-walkthrough.mp4`, `fahad-malik.jpg`).
- **No spaces, special characters, or vague suffixes** (`final`, `copy`, `raw`, `new`, `test2`).
- **Descriptive, SEO-friendly media names** grouped by role (`assets/images/team/`, `assets/images/logos/`, `assets/videos/`).
- **Single source of truth per page**: Subpages live in `heisenworks_frontend/pages/<slug>.html` and are mapped to root clean URL paths (`/<slug>` and `/<slug>/index.html`) via `scripts/restore-routes.mjs` so that **VS Code Live Server (port 5500)**, **Cloudflare (production)**, and local Node dev servers work seamlessly without `Cannot GET /<route>` errors.

## Local Development & Verification

Requires **Node.js 18+**.

```bash
# Start local development server at http://127.0.0.1:8080
node heisenworks_frontend/scripts/server.mjs

# In another terminal, run the full verification suite (40 checks)
node heisenworks_frontend/scripts/verify-all.mjs
```

## Notes on Media & Deployment

- Hover preview videos in `heisenworks_frontend/assets/videos/` are web-optimized muted H.264 MP4s with `+faststart` enabled for instant streaming (`zod-living-walkthrough.mp4` is delivered in Full HD 1080p with dead audio stripped and moov atom positioned at byte 0 for zero-latency playback).
- Production is a Cloudflare Worker with static assets (`wrangler.json`): `heisenworks_frontend/_headers` sets security and cache headers, `heisenworks_frontend/.assetsignore` keeps dev files (`scripts/`, `pages/`, dotfolders) off the live site, unknown URLs get `404.html`, `/studio` and `/faq` redirect via generated stub pages, and `worker.js` serves the lead form.
