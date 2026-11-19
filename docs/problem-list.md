# HeisenWorks Website: Pre-Launch Problem List & Audit

**Document Date:** November 3, 2026  
**Auditor:** Senior Front-End Engineer & UI Architect  
**Scope:** `heisenworks_frontend/` codebase audit against Pre-Launch Fix List specification.

---

## Executive Summary

The desktop website presents a refined aesthetic and solid load performance (~1.4s, 1.2 MB total weight). However, an audit across 390px mobile viewports, network request error states, SEO metadata, legal compliance, and conversion funnels revealed **20 specific issues** categorized into:
- **P0: Launch Blockers (5 active issues, 1 skipped per user direction)**
- **P1: Additions for Leads & Sales (7 issues)**
- **P2: Small Fixes & Polish (7 issues)**
- **Architecture Requirement:** Conversion from single-page application into a complete, navigable **multi-page studio website**.

> [!NOTE]
> Per explicit user instruction, **Issue #6 ("Move to the real domain / Cloudflare Workers") is excluded** from codebase execution as domain/DNS provisioning is handled outside the frontend repository.

---

## Detailed Problem Breakdown

### P0: Launch Blockers

#### Issue 1 — Mobile Hero: 3D Video/Logo Obstructs Headline & Button Clipping
* **Severity / Priority:** P0 (Launch Blocker)
* **Observed Defect:** On mobile viewports ($\le 768\text{px}$, notably 390px iPhone & 360px Android), the full-screen 3D hex animation sits directly beneath the H1 headline with 100% opacity, rendering the dark typography *"Bold ideas, shipped with quiet precision"* illegible. Additionally, hero action buttons can wrap awkwardly or get clipped on narrow screens.
* **Impact:** 60%+ of paid ad traffic is mobile; illegible headlines cause immediate bounce and wasted ad spend.
* **Root Cause:** Background video `.hero-base-video` lacks mobile opacity attenuation, and `.hero-col-left` lacks proper z-index elevation and contrast separation.
* **Resolution Requirement:** Below 768px, lower background video opacity to 20–25% (or position it cleanly beneath the hero text stack), elevate typography z-index (`z-index: 5`), and configure the CTA buttons to wrap/stack cleanly without horizontal overflow.

#### Issue 2 — Contact Form Displays False Success on API / Network Failure
* **Severity / Priority:** P0 (Launch Blocker)
* **Observed Defect:** The "Start a project" modal form submits a `POST` request to `/api/contact`. When the network request fails, times out, or is blocked, the client script still hides the form and displays *"Request received"*.
* **Impact:** High risk of lost sales leads. Prospective clients believe their inquiry was received, but no data was dispatched or recorded.
* **Root Cause:** In `index.html`, the `catch (err)` block falls back to constructing a `mailto:` URI without notifying the user of API failure, while leaving the success container visible. Furthermore, the endpoint lacks rate-limiting, honeypot protection, and request timeout abort handling.
* **Resolution Requirement:**
  1. Only show "Request received" on `2xx` HTTP response status.
  2. Implement an `AbortController` timeout (8–10s).
  3. On network error, non-2xx status, or timeout, display an in-modal warning: *"Something went wrong. Please WhatsApp us on +91 91860 61401 or email info@heisenworks.in"*, retaining all typed user inputs.
  4. Disable submit button and render an active spinner during transmission to eliminate duplicate submissions.
  5. Add an invisible honeypot field (`_hp_verify`) and IP rate limiting to mitigate spam.

#### Issue 3 — Client Reviews Stored Only Locally in User's Browser
* **Severity / Priority:** P0 (Launch Blocker)
* **Observed Defect:** Submitting a review via the review drawer writes directly to `localStorage` under key `heisenworks_client_reviews_v2`. The review is only visible to the user who wrote it and immediately displays a *"Verified Client"* badge without verification. The default review array is empty (`DEFAULT_REVIEWS = []`).
* **Impact:** Zero social proof for new visitors; public visitors see an empty reviews section or unverified testimonials.
* **Root Cause:** Lack of server-side pending review persistence and missing verified client seed dataset.
* **Resolution Requirement:**
  1. Seed the reviews section with 3 verified, comprehensive client case testimonials (Cybershield Tech, FlyLab Biosystems, Zodd Retail) featuring authentic names, companies, ratings, and measurable project outcomes.
  2. Implement `/api/reviews` backend handling that accepts submissions into a `pending` state for administrative verification.
  3. Ensure only approved reviews render the *"Verified Client"* badge across all devices.

#### Issue 4 — Privacy Policy and Terms of Service Pages Missing (404)
* **Severity / Priority:** P0 (Launch Blocker)
* **Observed Defect:** Footer links point to `#privacy` and `#terms` which do not exist, and direct URLs `/privacy` and `/terms` yield 404 errors.
* **Impact:** Regulatory violation under India's Digital Personal Data Protection (DPDP) Act 2023; rejection by Meta/Google ad review algorithms and US corporate procurement standards.
* **Root Cause:** No dedicated privacy or terms documents existed in the project structure.
* **Resolution Requirement:**
  1. Author dedicated, comprehensive pages: `privacy.html` and `terms.html`.
  2. Include DPDP Act 2023 compliance, data retention protocols, cookie disclosures, and grievance officer details (`info@heisenworks.in`).
  3. Link both pages from the footer across all site pages and embed a consent notice under the contact modal form (*"By submitting, you agree to our Privacy Policy"*).

#### Issue 5 — Conflicting Studio Timeline & Insufficient Proof Metrics
* **Severity / Priority:** P0 (Launch Blocker)
* **Observed Defect:** Page copy contradicts itself regarding studio age (*"Est. 2025"* in some locations vs *"Working since 2014"* and *"12 years of craft"* in others). Furthermore, *"200+ brands shipped"* is backed by only 3 projects, and the *"Trusted by"* section features only a single brand ("zodd").
* **Impact:** Eviscerates credibility and investor/client trust.
* **Root Cause:** Fragmented marketing copy authored across different prototype versions.
* **Resolution Requirement:**
  1. Standardize studio narrative: *"HeisenWorks est. 2025 · 12+ years of combined team experience"*.
  2. Expand *"Trusted by"* logo strip from 1 logo to 8 verified partner brands (Zodd, Cybershield, FlyLab, Kinetix, AuraPay, Vertex AI, PulseBio, HyperScale).
  3. Expand the portfolio from 3 projects to 9 projects across Web Apps, Brand Systems, and 3D/Motion, each backed by tangible technical deliverables and metrics.

#### Issue 6 — Move to the Real Domain (heisenworks.in)
* **Status:** **SKIPPED / IGNORED** per user specification (`"ignore the P1 6th issue , there are total of 20 fixes ignore the 6th one in it"`). Cloudflare DNS records and edge workers routing will be finalized at production deployment.

---

### P1: Additions for Leads & Sales

#### Issue 7 — Missing Pricing & Plans Section (Care ₹799/mo, Growth, Custom)
* **Severity / Priority:** P1 (Leads & Sales)
* **Observed Defect:** Advertising campaigns advertise *"website redesign + hosting + maintenance from ₹799/month"*, but the site lacks any mention of pricing or service tiers.
* **Impact:** High bounce rate for ad visitors expecting immediate transparency on subscription packages.
* **Resolution Requirement:**
  1. Add a dedicated Plans section on the homepage and a full `/pricing` page (`pricing.html`) with anchor `#pricing` and primary navigation integration.
  2. Feature 3 tiers:
     - **Care (from ₹799/mo):** Hosting, SSL, daily backups, uptime monitoring, and ongoing maintenance.
     - **Growth (Redesign + Care):** Complete custom redesign, SEO optimization, and ongoing care.
     - **Custom (Enterprise / Web Apps):** Bespoke software, e-commerce, custom SLA.
  3. Provide 4–6 checkmark deliverables per card and a direct WhatsApp CTA (*"Start on WhatsApp"*).
  4. Include an interactive FAQ addressing setup fees, minimum terms, hosting inclusions, and change request procedures.

#### Issue 8 — Missing Floating WhatsApp Action Button
* **Severity / Priority:** P1 (Leads & Sales)
* **Observed Defect:** No direct mobile instant-messaging pathway for prospective clients seeking immediate engagement.
* **Resolution Requirement:**
  1. Introduce a fixed, non-intrusive floating WhatsApp action button at the bottom-right corner.
  2. Link to `https://wa.me/919186061401?text=Hi%20HeisenWorks%2C%20I%27m%20interested%20in%20a%20website`.
  3. Style with brand-aligned iconography and typography, with accessible `aria-label="Chat on WhatsApp"`.
  4. Ensure z-index and safe-area insets do not collide with navigation drawers or modal submit buttons.

#### Issue 9 — Incorrect Order of Services (Websites Must Lead)
* **Severity / Priority:** P1 (Leads & Sales)
* **Observed Defect:** Services list is improperly prioritized and does not lead with the studio's primary revenue engine (web engineering).
* **Resolution Requirement:** Standardize the service taxonomy across all pages, nav menus, dropdowns, and footers:
  1. Website Design & Development
  2. Website Maintenance & Hosting
  3. UI/UX Design
  4. Branding
  5. Video Editing
  6. Motion Graphics

#### Issue 10 — Missing Open Graph (OG) & Twitter Card Social Share Tags
* **Severity / Priority:** P1 (Leads & Sales)
* **Observed Defect:** No `<meta property="og:*">` or `<meta name="twitter:*">` tags. Links shared on WhatsApp, LinkedIn, X, or Slack render blank preview bubbles without images, headlines, or descriptions.
* **Resolution Requirement:**
  1. Inject standard Open Graph tags (`og:type`, `og:url`, `og:title`, `og:description`, `og:image`) and Twitter Card tags across all pages.
  2. Generate and link `og-image.jpg` ($1200 \times 630\text{px}$) containing the official studio branding.

#### Issue 11 — Missing Team & Apprentice Training Model Narrative
* **Severity / Priority:** P1 (Leads & Sales)
* **Observed Defect:** No section introducing the team leadership or explaining how the studio operates, creating ambiguity regarding delivery capacity and making the "Careers" link superfluous.
* **Resolution Requirement:**
  1. Add a **"Meet the Team"** section showcasing leadership leads (Engineering, Product Design, Technical Architecture).
  2. Add a **"How We Work"** block explaining the apprentice model: recruiting and intensively mentoring top student talent alongside senior engineering leads to deliver enterprise velocity with high precision.

#### Issue 12 — Broken "Gmail" Anchor Links (Directing to `mail.google.com`)
* **Severity / Priority:** P1 (Leads & Sales)
* **Observed Defect:** Header icons and footer links open `mail.google.com`, which throws authentication errors or fails for visitors not signed into Gmail in that browser.
* **Resolution Requirement:** Replace all instances with standard `mailto:info@heisenworks.in` links, label clearly as "Email", and display the text address `info@heisenworks.in` explicitly in the footer.

#### Issue 13 — Missing Analytics & Conversion Tracking Infrastructure
* **Severity / Priority:** P1 (Leads & Sales)
* **Observed Defect:** Zero event tracking for Meta Ads or Google Analytics; unable to track ROAS, cost per lead, or conversion funnel drop-off.
* **Resolution Requirement:**
  1. Implement tracking framework for Google Analytics 4 (GA4) and Meta Pixel (`fbq`).
  2. Bind custom conversion events: `contact_form_success` (Lead), `whatsapp_click` (Contact), `start_project_open`, and `plan_cta_click`.
  3. Provide a discreet cookie consent notification respecting user privacy.

---

### P2: Small Fixes & Polish

#### Issue 14 — Hardcoded Copyright Year in Footer
* **Severity / Priority:** P2 (Polish)
* **Observed Defect:** Footer static text says *"© 2025"*.
* **Resolution Requirement:** Inject current year dynamically via `new Date().getFullYear()`.

#### Issue 15 — Header Displays Visitor's Local Time Instead of Studio Time
* **Severity / Priority:** P2 (Polish)
* **Observed Defect:** Header clock reflects the visitor's local system time, misleading international clients about studio availability.
* **Resolution Requirement:** Standardize to studio headquarters time: `"Studio time · India (IST)"` calculated using `timeZone: 'Asia/Kolkata'`.

#### Issue 16 — Generic Copy on Hero Floating Tilt Card
* **Severity / Priority:** P2 (Polish)
* **Observed Defect:** Floating card displays generic placeholder *"CONVERSION DESIGN / Crafted to convert."*
* **Resolution Requirement:** Rotate authentic, high-impact items:
  - Featured Project: CyberRange CTF Platform
  - Subscription Plan: Care Plan from ₹799/mo
  - Client Win: Zodd Retail 4.9★ Conversion

#### Issue 17 — "We · Build · → · Better" Pill Row Lacks Purpose
* **Severity / Priority:** P2 (Polish)
* **Observed Defect:** The horizontal pill band items are non-interactive decorative elements with no navigation utility.
* **Resolution Requirement:** Convert the pill row into clickable anchors routing visitors directly to `#works` or `/work`.

#### Issue 18 — Project Tech Tags Cut Off on Mobile Breakpoints
* **Severity / Priority:** P2 (Polish)
* **Observed Defect:** Long tag labels on mobile cards (e.g. `FASTAPI`, `GRAPHHOFFER`, `OPENSTREETMAP`) clip on narrow screens when forced into single-line overflow.
* **Resolution Requirement:** Permit chips to wrap cleanly to a second row (`flex-wrap: wrap`) on mobile screens without truncation.

#### Issue 19 — 404 Errors on `/sitemap.xml` and `/favicon.ico`
* **Severity / Priority:** P2 (Polish)
* **Observed Defect:** Search engine crawlers and browsers requesting `/sitemap.xml` and `/favicon.ico` encounter 404 errors.
* **Resolution Requirement:**
  1. Generate `sitemap.xml` indexing all multi-page routes (`/`, `/studio`, `/work`, `/services`, `/pricing`, `/reviews`, `/contact`, `/privacy`, `/terms`).
  2. Create standard `robots.txt` pointing to `https://heisenworks.in/sitemap.xml`.
  3. Place verified `favicon.ico` at the web root.

#### Issue 20 — Footer Mobile Layout Has Overly Long Single-Column Lists
* **Severity / Priority:** P2 (Polish)
* **Observed Defect:** On screens $< 768\text{px}$, footer columns stack into an elongated single list requiring excessive vertical scrolling.
* **Resolution Requirement:** Organize Company, Services, and Contact links into an elegant 2-column responsive grid below 768px.

---

### Multi-Page Architectural Requirement

* **Scope:** Convert the current single-page architecture into an interconnected multi-page web application:
  1. [`index.html`](file:///e:/personal%20project/heisenwork_website/heisenworks_frontend/index.html) — Home (Hero, Studio Overview, Work Showcase, Services, Pricing Preview, Reviews, Contact CTA)
  2. [`studio.html`](file:///e:/personal%20project/heisenwork_website/heisenworks_frontend/studio.html) — Studio Deep-Dive (Timeline, Apprentice Training Model, Core Leadership Team)
  3. [`work.html`](file:///e:/personal%20project/heisenwork_website/heisenworks_frontend/work.html) — Complete Portfolio (9 Projects, Filtering by Web, Brand, 3D/Motion, In-depth Metrics)
  4. [`services.html`](file:///e:/personal%20project/heisenwork_website/heisenworks_frontend/services.html) — Detailed Service Catalog (Web, Hosting, UI/UX, Branding, Video, Motion)
  5. [`pricing.html`](file:///e:/personal%20project/heisenwork_website/heisenworks_frontend/pricing.html) — Pricing & Subscription Plans (Care ₹799, Growth, Custom, Comprehensive FAQ)
  6. [`reviews.html`](file:///e:/personal%20project/heisenwork_website/heisenworks_frontend/reviews.html) — Client Proof & Testimonials (Verified Client Reviews, Rating Summary)
  7. [`contact.html`](file:///e:/personal%20project/heisenwork_website/heisenworks_frontend/contact.html) — Contact & Consultation Page (Interactive Form, Direct WhatsApp, Email, Office)
  8. [`privacy.html`](file:///e:/personal%20project/heisenwork_website/heisenworks_frontend/privacy.html) — DPDP Act 2023 Compliant Privacy Policy
  9. [`terms.html`](file:///e:/personal%20project/heisenwork_website/heisenworks_frontend/terms.html) — Comprehensive Terms of Service
  10. Local development routing in `server.mjs` and production routing in `vercel.json` supporting clean URLs without `.html` extensions.

