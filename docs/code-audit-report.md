# HeisenWorks code review and repo audit (2026-11-23)

## Part 1: Review of the uncommitted change

What this change does: it renamed the WhatsApp card label on `/contact` from "WhatsApp (Instant Reply)" to "WhatsApp" in `pages/contact.html` and both generated copies.

Looks good. Ship. All three copies match (`restore-routes.mjs --check` passes). It has since been committed (fa3da9a).

## Part 2: Whole repo audit

What this repo does: it is the marketing site of the studio HeisenWorks. It has 9 static pages plus a 404 page, served by a Cloudflare Worker (`worker.js`). The Worker also answers `POST /api/contact`, which validates a lead and emails it through Resend (`lib/lead.js`).

Assumed load: a small business site, a handful to a few hundred visitors a day, and a few leads a day.

Evidence (live probes on heisenworks.in, 2026-11-23): `POST /api/contact '{}'` → 422 (working); CSP and HSTS present; `/scripts/server.mjs`, `/.impeccable/config.json`, `/.vscode/settings.json` and `/pages/team` all answered 200; `/no-such-page` answered 404 with an empty body.

| # | Finding | Status |
|---|---------|--------|
| 1 | Wrong addresses show a blank page | Fixed |
| 2 | Internal files are public | Fixed |
| 3 | Pages Function is dead code; docs describe Pages | Fixed |
| 4 | Typos use up the rate limit | Fixed |
| 5 | Indian numbers with a leading 0 rejected | Fixed |
| 6 | Guard for a missing ASSETS binding | Fixed |
| 7 | Every page committed twice | Not done (see below) |
| 8 | 2.1 MB of unused photos deployed | Fixed |
| 9 | Comment points at deleted `vercel.json` | Fixed |

### Must fix

1. **Wrong addresses show a blank white page** (`wrangler.json`)
   - **What this is:** `wrangler.json` tells Cloudflare which folder of static files to serve.
   - **Problem:** It did not say what to do when a file is missing, so Cloudflare answered with an empty 404. The custom `404.html` was never shown.
   - **Fix (done):** Added `"not_found_handling": "404-page"` inside `"assets"`.
   - **If we skip it:** Every broken link shows a blank page with no menu.

2. **Internal files are public** (`heisenworks_frontend/`)
   - **What this is:** Cloudflare publishes every file in `heisenworks_frontend/`.
   - **Problem:** Dev files were live: `/scripts/*.mjs`, `/.impeccable/`, `/.vscode/`, and the page sources under `/pages/`. No secret leaked, but any file dropped there later (a `.env`, say) would go public.
   - **Fix (done):** Added `heisenworks_frontend/.assetsignore` listing `scripts/`, `pages/`, `.impeccable/`, `.vscode/`, `.playwright-mcp/`.
   - **If we skip it:** Tooling stays readable, search engines index duplicate `/pages/...` URLs, and a future mistake leaks a secret.

### Should fix

3. **The Pages Function was dead code** (`functions/api/contact.js`, `lib/contact-function.test.mjs`, README, `.env.example`)
   - **What this is:** Two files served the lead form: one for Cloudflare Pages, one for the Worker.
   - **Problem:** A Worker deploy ignores `functions/`, so that file and its tests never ran in production. The docs still said "Pages Function".
   - **Fix (done):** Deleted both files. Moved the `CF-Connecting-IP` rate-limit test and the no-CORS check into `lib/worker.test.mjs`. README, `.env.example` and the `lib/lead.js` header now say Worker.
   - **If we skip it:** The next person edits the dead file and production does not change.

4. **A visitor who mistypes was locked out for 10 minutes** (`lib/lead.js`, `handleLead`)
   - **What this is:** The rate limit allows 5 leads per 10 minutes from one IP address.
   - **Problem:** It counted requests before checking the fields. Five failed tries on `/contact` meant the sixth, correct try got "Too many requests".
   - **Fix (done):** The rate limit now runs after validation, so only valid leads (the ones that send email) count. Test: `invalid attempts do not use up the rate limit`.
   - **If we skip it:** Real customers are turned away at the worst moment.

5. **Indian numbers written with a leading 0 were rejected** (`lib/lead.js` and `js/main.js`, `normalizePhone`)
   - **What this is:** `normalizePhone` turns the typed number into `+91…` form.
   - **Problem:** `09876543210` (11 digits, no `+`) became `null`, so the form said the number was invalid.
   - **Fix (done):** Both copies now drop one leading 0 from an 11-digit number before adding `+91`. Test: `normalizePhone accepts an Indian number written with a leading 0`. The two copies must keep changing together.
   - **If we skip it:** Some local leads give up at the phone field.

### Nice to have

6. **A guard for a case that cannot happen** (`worker.js`)
   - **Fix (done):** Removed the `if (env.ASSETS ...)` check and the fallback 404, plus its test. `wrangler.json` always provides `ASSETS`.

7. **Every page is committed twice** (`scripts/restore-routes.mjs`, the `<page>/index.html` files)
   - **Problem:** On the Worker, `/team` is served from `team.html`. The `team/index.html` copy only makes `/team/` a duplicate URL. That is about 5,000 generated lines.
   - **Not done:** VS Code Live Server opens `/team` through `team/index.html`, so deleting the copies would break that local workflow. Do it only if Live Server is no longer used. Then stop writing `<name>/index.html` in `restore-routes.mjs` and delete the 9 folders.

8. **2.1 MB of unused photos were deployed** (`assets/images/team/`)
   - **Fix (done):** Moved the 7 unused originals (`fahad-malik.jpg`, `kanishk-sharma.png`, `kritanshu.png`, `mohd-naved-khan.png`, `piyush.jpg`, `uttam-singh.jpg`, `vipul-raw.jpeg`) to `archive/unused-assets/raw-team-photos/`. `verify-all.mjs` now checks the `.webp` files the pages actually load.

9. **A comment pointed at the deleted `vercel.json`** (`scripts/restore-routes.mjs:18`)
   - **Fix (done):** Now reads `// mirrors server.mjs`.

Left out: the `archive/` folder (73 MB, kept on purpose per the README), and the `_headers` rules not reaching `/api/contact` JSON responses (no concrete harm).

Kept on purpose: the in-memory rate limit in `lib/lead.js` is marked `shortcut:` and is fine at this load.

## Verification (2026-11-23, local)

- `node --test "lib/*.test.mjs"`: 20/20 pass (2 new tests watched failing first).
- `restore-routes.mjs --check`: in sync.
- `verify-all.mjs` against the dev server: 44 passed, 0 failed.
- Real Chrome (Playwright): `/`, `/team`, `/team/`, `/work`, `/services`, `/pricing`, `/reviews`, `/contact`, `/privacy`, `/terms` load with no page errors; `/studio` and `/faq` redirect; unknown URL gives 404; no broken images on `/team`.
- Modal lead with `09876543210` and `/contact` lead with `098765 43210` both reached a fake Resend endpoint as `+919876543210`.

## After deploy, check on production

1. `https://heisenworks.in/no-such-page` shows the branded 404 page.
2. `https://heisenworks.in/scripts/server.mjs`, `/.impeccable/config.json` and `/pages/team` return 404.
3. `curl -XPOST https://heisenworks.in/api/contact -d '{}'` still returns 422.

Not checked: the Cloudflare dashboard; `.assetsignore` and `not_found_handling` were not run through `wrangler` locally (it is not installed), so items 1 and 2 above are the real test.
