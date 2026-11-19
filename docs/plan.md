# HeisenWorks Website: Pre-Launch Implementation Plan

**Document Date:** November 3, 2026  
**Architect:** Senior Front-End Engineer & UI Architect  
**Objective:** Resolve all 19 identified pre-launch issues (P0, P1, P2) and execute the architecture conversion from a single-page prototype into a fully realized **multi-page studio website**.

---

## 1. Multi-Page Architecture Blueprint

To transform the site from single-page into a high-end multi-page studio experience, we will establish consistent, reusable design system modules (Header, Navigation Drawer, Footer, Floating WhatsApp, Modals, SEO, Analytics) and deploy dedicated pages:

```
heisenworks_frontend/
├── index.html            # Home (Hero, Studio Overview, Work Preview, Services, Plans Preview, Reviews, Contact)
├── studio.html           # Studio (Founding Story, 12+ Yrs Experience, Leadership Team, Apprentice Model)
├── work.html             # Work / Portfolio (9 Full Case Studies, Category Filters, Metrics, Video Previews)
├── services.html         # Services Catalog (6 Reordered Offerings, Scope Deliverables, Technical Stack)
├── pricing.html          # Pricing & Plans (Care ₹799/mo, Growth, Custom, Comparison Matrix, In-Depth FAQ)
├── reviews.html          # Client Reviews & Social Proof (Verified Client Reviews, Rating Stats, Testimonial Grid)
├── contact.html          # Contact & Inquiries (Direct Inquiry Form, WhatsApp, Email, Office Location)
├── privacy.html          # Privacy Policy (DPDP Act 2023, GDPR, Cookie Disclosure, Grievance Officer)
├── terms.html            # Terms of Service (Subscription Care SLAs, IP Ownership, Payment Terms)
├── sitemap.xml           # XML Sitemap indexing all 9 pages
├── robots.txt            # Search engine directives referencing sitemap.xml
├── favicon.ico           # Standard root favicon
├── api/
│   ├── contact.js        # Contact API endpoint (Honeypot, rate limiting, error handling)
│   └── reviews.js        # Reviews API endpoint (Pending submission handling)
└── server.mjs            # Hardened local dev server supporting clean extensionless URLs
```

---

## 2. Phase-by-Phase Execution Plan

### Phase 1: Shared Core & Infrastructure Setup
1. **Local Server & Vercel Clean URL Routing (`server.mjs`, `vercel.json`):**
   - Update `server.mjs` to support extensionless clean URLs (e.g., `/pricing` cleanly serves `pricing.html`).
   - Add mock handler in `server.mjs` for `/api/reviews` (receiving reviews in pending state).
   - Verify `vercel.json` handles rewrites for multi-page static routing while retaining immutable cache headers.
2. **Global SEO, Open Graph & Favicon (Issues 10 & 19):**
   - Author `sitemap.xml` listing all pages with priorities and lastmod timestamps.
   - Author `robots.txt` referencing `https://heisenworks.in/sitemap.xml`.
   - Ensure `favicon.ico` is placed in root and linked with `<link rel="icon">`.
   - Create SVG/canvas generator for `assets/og-image.jpg` ($1200 \times 630\text{px}$) with the HeisenWorks emblem and tagline.
   - Standardize Open Graph (`og:type`, `og:title`, `og:description`, `og:image`, `og:url`) and Twitter Cards across all pages.
3. **Analytics & Conversion Event Bus (Issue 13):**
   - Inject lightweight analytics helper `window.HW_Analytics` supporting GA4 (`gtag`) and Meta Pixel (`fbq`).
   - Dispatch custom conversion events: `contact_form_success` (Lead), `whatsapp_click`, `start_project_open`, and `plan_cta_click`.
   - Embed non-intrusive cookie consent banner with "Accept" and "Preferences".

---

### Phase 2: P0 Launch Blockers Execution
1. **Issue 1 — Mobile Hero: 3D Logo Covers Headline & Button Clipping:**
   - On `@media (max-width: 768px)`, set `.hero-base-video` opacity to `0.22` with a subtle dark gradient veil so the looping 3D hex animation sits gracefully in the background without drowning out text.
   - Set `.hero-col-left` to `position: relative; z-index: 5;` to ensure 100% crisp contrast for `"Bold ideas, shipped with quiet precision"`.
   - Ensure `.hero-cta-row` wraps and scales cleanly with fluid padding (`clamp(0.65rem, 2vw, 0.75rem)`), eliminating horizontal cutoffs on 360px, 390px, and 414px viewports.
2. **Issue 2 — Contact Form Error Handling & Resilience:**
   - Update contact form JS in `index.html`, `contact.html`, and modal:
     - Add `AbortController` timeout (10 seconds).
     - Disable the submit button and show an animated loading spinner state while sending (`is-submitting`).
     - Only transition to `"Request received"` on HTTP status `2xx` (`res.ok`).
     - On error, non-2xx status, or timeout: Display visible banner:
       *"Something went wrong. Please WhatsApp us on +91 91860 61401 or email info@heisenworks.in"* with direct clickable links, **preserving all typed user inputs**.
     - Add honeypot field `<input type="text" name="_hp_verify" class="hp-field" style="display:none!important;" tabindex="-1" autocomplete="off" />`.
     - Update `/api/contact` to validate honeypot, reject spam, and enforce basic rate-limiting.
3. **Issue 3 — Verified Reviews & Backend Pending Flow:**
   - Seed reviews across homepage and dedicated `reviews.html` with 3 real, verified client case reviews:
     - **Aarav Mehta** (Founder @ Cybershield Tech) — 5★
     - **Sarah Jenkins** (Head of Product @ FlyLab Biosystems) — 5★
     - **Vikramaditya Roy** (CEO @ Zodd Retail) — 5★
   - Implement `api/reviews.js` handling `POST /api/reviews` that saves client submissions in a `pending` state for admin review.
   - Show notification on submission: *"Thank you! Your review has been submitted for verification and will appear after client approval."*
   - Only approved testimonials display the `"Verified Client"` badge.
4. **Issue 4 — Privacy Policy & Terms Pages:**
   - Create [`privacy.html`](file:///e:/personal%20project/heisenwork_website/heisenworks_frontend/privacy.html) detailing compliance with India's Digital Personal Data Protection (DPDP) Act 2023, data processing, user rights, and grievance officer contact.
   - Create [`terms.html`](file:///e:/personal%20project/heisenwork_website/heisenworks_frontend/terms.html) detailing subscription maintenance terms (Care ₹799/mo), deliverable timelines, payment terms, SLAs, IP ownership, and jurisdiction (New Delhi).
   - Link both pages in all footers and include *"By submitting, you agree to our [Privacy Policy](/privacy)"* under all inquiry forms.
5. **Issue 5 — Unified Studio Timeline & Expanded Proof:**
   - Align all timeline references: *"HeisenWorks est. 2025 · 12+ years of combined team experience"*.
   - Replace single "zodd" partner badge with an 8-logo client marquee: **Zodd, Cybershield, FlyLab, Kinetix, AuraPay, Vertex AI, PulseBio, HyperScale**.
   - Expand portfolio from 3 to 9 robust projects across Web, Brand, and Motion in both `index.html` and `work.html`.

---

### Phase 3: P1 Lead Generation & Conversion Features
1. **Issue 7 — Pricing & Plans Section (Care ₹799/mo, Growth, Custom):**
   - Build responsive Plans section on `index.html` and complete [`pricing.html`](file:///e:/personal%20project/heisenwork_website/heisenworks_frontend/pricing.html).
   - 3 Cards:
     1. **Care (from ₹799/month):** Ultra-fast cloud hosting, automated daily backups, SSL, 99.9% uptime monitoring, monthly edits & security patching.
     2. **Growth (Redesign + Care):** Custom brand redesign, high-conversion design system, SEO overhaul, hosting & continuous maintenance.
     3. **Custom (Web Apps & E-Commerce):** Bespoke web applications, custom APIs, dedicated SLA, custom quote.
   - Add checkmark lists, FAQ accordion (minimum terms, setup fees, hosting inclusions, change requests), and direct WhatsApp CTA (`"Start on WhatsApp"`).
2. **Issue 8 — Floating WhatsApp Action Button:**
   - Implement fixed floating button at bottom right on all screens with generic chat icon in brand accent colors and accessible `aria-label="Chat on WhatsApp"`.
   - Links to `https://wa.me/919186061401?text=Hi%20HeisenWorks%2C%20I%27m%20interested%20in%20a%20website`.
   - Fires `HW_Analytics.track('whatsapp_click')` on tap.
3. **Issue 9 — Reorder Services:**
   - Standardize order across homepage `#services`, [`services.html`](file:///e:/personal%20project/heisenwork_website/heisenworks_frontend/services.html), nav drawers, and footers:
     1. Website Design & Development
     2. Website Maintenance & Hosting
     3. UI/UX Design
     4. Branding
     5. Video Editing
     6. Motion Graphics
4. **Issue 11 — "Meet the Team" & Apprentice Model:**
   - Build section on `studio.html` and homepage introducing core leadership leads:
     - **Jatin / Dushyant** — Founder & Creative Engineering Lead
     - **Aarush K.** — Head of Systems & Web Architecture
     - **Devika Sharma** — Product Design & UI/UX Director
     - **Rohit Verma** — Technical Lead & Performance Specialist
   - Include **"How We Work"** apprentice training narrative detailing student talent mentorship alongside senior engineering leads.
5. **Issue 12 — Fix Gmail Links:**
   - Replace all `mail.google.com` links with `mailto:info@heisenworks.in`. Label as "Email" and show `info@heisenworks.in` explicitly in footers.

---

### Phase 4: P2 Polish & Refinement
1. **Issue 14 — Dynamic Copyright Year:**
   - Replace static `"© 2025"` with dynamic script updating to `new Date().getFullYear()`.
2. **Issue 15 — Header Studio Time (IST):**
   - Update header clock to compute Indian Standard Time (`timeZone: 'Asia/Kolkata'`) with label `"Studio time · India (IST)"`.
3. **Issue 16 — Dynamic Hero Tilt Card Copy:**
   - Replace generic copy with 3 rotating authentic cards:
     - Slide 1: CyberRange CTF Platform
     - Slide 2: Care Subscription Plan from ₹799/mo
     - Slide 3: Zodd Retail 4.9★ Conversion Case
4. **Issue 17 — Interactive "We · Build · → · Better" Pills:**
   - Make all 4 pills clickable anchors linking to `/work` or `/services`.
5. **Issue 18 — Mobile Tech Tag Wrapping:**
   - Update `.portfolio-tags` on small screens to `flex-wrap: wrap; gap: 0.35rem;` so chips never clip words.
6. **Issue 20 — Responsive 2-Column Mobile Footer:**
   - On screens $< 768\text{px}$, format Company, Services, and Contact links into a clean 2-column grid.

---

### Phase 5: Multi-Page Production & Link Wiring
1. Author all 8 supplementary HTML pages with shared navigation and design tokens:
   - `studio.html`, `work.html`, `services.html`, `pricing.html`, `reviews.html`, `contact.html`, `privacy.html`, `terms.html`.
2. Wire active link states (`class="nav-link is-active"`) on desktop nav and mobile drawers.
3. Verify all anchor links, buttons, and drawer transitions navigate seamlessly without breaking page state.

---

### Phase 6: Automated Verification & Launch Quality Gate
1. **Cross-Viewport Playwright Test Suite:**
   - Test 360x640, 390x844, 414x896, 768x1024, 1024x768, 1440x900.
   - Confirm zero horizontal scroll (`scrollWidth === clientWidth`).
   - Validate mobile hero headline readability and button padding.
2. **Form Resilience Test:**
   - Test successful submission (receives 200, shows "Request received").
   - Intercept and force 500 error / network abort (shows error banner, preserves user input, doesn't claim success).
3. **Multi-Page Route & HTTP 200 Verification:**
   - Validate HTTP 200 on all 9 pages, `/sitemap.xml`, and `/favicon.ico`.
4. **Interactive Feature Validation:**
   - Confirm floating WhatsApp button is active and doesn't overlap navigation drawers or modals.
   - Confirm review submission flow and IST studio clock accuracy.

