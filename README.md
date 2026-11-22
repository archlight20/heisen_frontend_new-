# HeisenWorks Website

Official marketing and studio website for **HeisenWorks** (`heisenworks.in`), built with plain HTML5, CSS3, vanilla JavaScript, and Vercel Serverless Functions.

## Editing pages (single source of truth)

Edit only `heisenworks_frontend/pages/*.html`. Production (`vercel.json`) and `scripts/server.mjs` serve `pages/` directly.
The root `<page>.html` and `<page>/index.html` files exist only so VS Code Live Server can open clean URLs; they are generated and gitignored.
After editing a page, run `node heisenworks_frontend/scripts/restore-routes.mjs` (add `--check` to verify nothing is stale).

## Folder Structure

```text
heisenwork_website/
├── .gitignore                        # Git ignore rules (node_modules, .env, OS, test artifacts)
├── README.md                         # Project documentation & conventions
├── vercel.json                       # Vercel clean URLs, redirects (/studio -> /team), & caching
├── api/                              # Vercel Serverless Functions (single source of truth)
│   ├── contact.js                    # POST /api/contact inquiry handler with honeypot protection
│   └── reviews.js                    # GET/POST /api/reviews handler
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
    ├── pages/                        # Subpages (clean URLs routed via vercel.json & server.mjs)
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
    └── scripts/                      # Local dev tooling (blocked from HTTP serving)
        ├── server.mjs                # Local Node.js multi-page & API dev server
        ├── templates.mjs             # Shared page template reference/generator
        └── verify-all.mjs            # Automated routing, asset, & API test suite
```

## Naming Conventions

- **Lowercase with hyphens (`kebab-case`)** for all files and folders (e.g., `zod-living-walkthrough.mp4`, `fahad-malik.jpg`).
- **No spaces, special characters, or vague suffixes** (`final`, `copy`, `raw`, `new`, `test2`).
- **Descriptive, SEO-friendly media names** grouped by role (`assets/images/team/`, `assets/images/logos/`, `assets/videos/`).
- **Single source of truth per page**: Subpages live in `heisenworks_frontend/pages/<slug>.html` and are mapped to root clean URL paths (`/<slug>` and `/<slug>/index.html`) via `scripts/restore-routes.mjs` so that **VS Code Live Server (port 5500)**, **Vercel**, and local Node dev servers work seamlessly without `Cannot GET /<route>` errors.

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
- `vercel.json` handles `/studio` → `/team` 301 redirects, clean subpage rewrites into `heisenworks_frontend/pages/`, immutable media caching, and native Vercel `/api/*` routing.
