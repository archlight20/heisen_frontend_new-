// HeisenWorks homepage: hero, Lenis smooth scroll, reveals, portfolio previews, nav (ES module).
import Lenis from "lenis";

// Reset scroll on load
window.scrollTo(0, 0);

// 1. Lenis Smooth Scrolling
const lenis = new Lenis({
  smoothWheel: true,
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
});
function raf(time) {
  if (!document.hidden) {
    lenis.raf(time);
  }
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// 2. Scroll Lock Model
let scrollEnabled = true;
function stopScroll() {
  if (!scrollEnabled) return;
  scrollEnabled = false;
  lenis.stop();
  document.documentElement.style.position = "relative";
  document.documentElement.style.overflow = "hidden";
  document.documentElement.style.height = "100%";
}
function startScroll() {
  if (scrollEnabled) return;
  scrollEnabled = true;
  lenis.start();
  document.documentElement.style.removeProperty("position");
  document.documentElement.style.removeProperty("overflow");
  document.documentElement.style.removeProperty("height");
}
// Shared with js/main.js so modals lock Lenis scrolling the same way
window.HW_scrollLock = { stop: stopScroll, start: startScroll };

// Smooth scroll to id helper
window.scrollToTarget = function (id) {
  let el = document.getElementById(id);
  if (!el && (id === "studio" || id === "about")) el = document.getElementById("about");
  if (!el && (id === "work" || id === "works")) el = document.getElementById("works");
  if (!el && (id === "review" || id === "reviews")) el = document.getElementById("reviews");
  if (!el && id === "partners") el = document.getElementById("hero-partners");
  if (!el && id === "careers") el = document.getElementById("about");
  if (!el && id === "contact") {
    window.openRequestModal();
    return;
  }
  if (!el) return;
  setTimeout(() => {
    const top = el.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({ top, behavior: "smooth" });
  }, 50);
};

// Notice dialog helper
window.showNotice = function (title, msg) {
  alert(`${title}\n\n${msg}`);
};

// 3. Adaptive Grid scale-up (>1920px)
function applyAdaptiveGrid() {
  const FONT_BASE = 16,
    baseWidth = 1920,
    coef = 0.6666;
  const w = window.innerWidth;
  const widthReduction = ((baseWidth - w) / baseWidth) * 100;
  const size = FONT_BASE - (FONT_BASE * (widthReduction * coef)) / 100;
  if (size > FONT_BASE) {
    document.documentElement.style.fontSize = size + "px";
  } else {
    document.documentElement.style.removeProperty("font-size");
  }
}
applyAdaptiveGrid();
window.addEventListener("resize", applyAdaptiveGrid);

// 4. Live Clock
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  const meridiem = hours >= 12 ? "pm" : "am";
  const displayHours = hours % 12 || 12;
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const timeStr = `${displayHours}:${minutes}${meridiem}`;

  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const dateStr = `${day} ${month}, ${year}`;

  const timeEl = document.getElementById("live-time");
  const dateEl = document.getElementById("live-date");
  const navClockEl = document.getElementById("nav-menu-clock");
  if (timeEl) timeEl.textContent = timeStr;
  if (dateEl) dateEl.textContent = dateStr;
  if (navClockEl) navClockEl.textContent = `Local time — ${timeStr}`;
}
updateClock();
setInterval(updateStudioClockSafe, 1000);
// Carousel auto-rotation timer (Issue 16)
setInterval(() => {
  if (typeof setSlide === 'function' && typeof currentSlide === 'number') {
    setSlide(currentSlide + 1, 1);
  }
}, 4500);

function updateStudioClockSafe() {
  try {
    const parts = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).formatToParts(new Date());
    let day = '', month = '', year = '', hour = '', minute = '', period = '';
    for (const p of parts) {
      if (p.type === 'day') day = p.value;
      if (p.type === 'month') month = p.value;
      if (p.type === 'year') year = p.value;
      if (p.type === 'hour') hour = p.value;
      if (p.type === 'minute') minute = p.value;
      if (p.type === 'dayPeriod') period = p.value.toLowerCase();
    }
    const timeStr = `${hour}:${minute}${period} IST`;
    const dateStr = `${day} ${month}, ${year}`;
    const timeEl = document.getElementById("live-time");
    const dateEl = document.getElementById("live-date");
    const navClockEl = document.getElementById("nav-menu-clock");
    if (timeEl) timeEl.textContent = timeStr;
    if (dateEl) dateEl.textContent = dateStr;
    if (navClockEl) navClockEl.textContent = `Studio time (IST) — ${timeStr}`;
  } catch (e) { }
}

// 5. Liquid Cursor Reveal — brush-reveals hero poster image over the video base
const heroVideo = document.getElementById("hero-base-video");
const heroLiquidWrap = document.getElementById("hero-liquid");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

// Hero video loads AFTER the page has rendered so its 2.3 MB doesn't compete with CSS, fonts and JS.
// The poster image is shown until then. Skipped for Data Saver / reduced-motion visitors.
if (heroVideo) {
  heroVideo.loop = true;
  const conn = navigator.connection || {};
  const skipVideo = prefersReducedMotion || conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType || "");
  let videoRequested = false;
  const loadHeroVideo = () => {
    if (videoRequested || skipVideo || !heroVideo.dataset.src) return;
    videoRequested = true;
    heroVideo.src = heroVideo.dataset.src;
    heroVideo.load();
    heroVideo.play().catch(() => { });
  };
  const whenIdle = (fn) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 300));
  const afterLoad = (fn) => (document.readyState === "complete" ? fn() : window.addEventListener("load", fn, { once: true }));
  // Video is the hero backdrop on both desktop and mobile, start it as soon as the page has loaded
  afterLoad(() => whenIdle(loadHeroVideo));
}

// Centre the hex under the HEISENWORKS watermark on wide screens, shrinking it only as much as needed
// to keep a 32px gap from the end of the headline. If that would need more than ~32% shrink, keep the
// right-aligned layout instead. Measured from the real text width, so font changes stay safe.
const HERO_MIN_CENTER_WIDTH = 1280;
const HEX_HALF_WIDTH = 0.172;      // hex spans 33%–66.6% of the frame width (measured across the loop)
const HERO_TEXT_GAP = 32;
const HERO_MIN_SCALE = 0.68;
function layoutHeroVideo() {
  const home = document.getElementById("home");
  if (!home || !heroVideo || !heroLiquidWrap) return;
  home.classList.remove("hero-video-centered");
  heroVideo.style.removeProperty("--hero-video-scale");
  if (window.innerWidth < HERO_MIN_CENTER_WIDTH) return;

  // Right edge of the actual text glyphs (headline lines, rating line, buttons)
  let textRight = 0;
  const range = document.createRange();
  document.querySelectorAll(".hero-h1 .hero-line, #hero-rating-label").forEach((el) => {
    range.selectNodeContents(el);
    textRight = Math.max(textRight, range.getBoundingClientRect().right);
  });
  ["hero-ctas"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) Array.from(el.children).forEach((c) => { textRight = Math.max(textRight, c.getBoundingClientRect().right); });
  });

  const wrap = heroLiquidWrap.getBoundingClientRect();
  const frameW = Math.max(wrap.width, (wrap.height * 16) / 9);   // object-fit: cover of a 16:9 frame
  const centerX = wrap.left + wrap.width / 2;
  const scale = Math.min(1, (centerX - textRight - HERO_TEXT_GAP) / (HEX_HALF_WIDTH * frameW));
  if (!(scale >= HERO_MIN_SCALE)) return;                          // would shrink too much: keep right layout
  heroVideo.style.setProperty("--hero-video-scale", scale.toFixed(3));
  home.classList.add("hero-video-centered");
}
layoutHeroVideo();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutHeroVideo);
let heroLayoutTimer;
window.addEventListener("resize", () => { clearTimeout(heroLayoutTimer); heroLayoutTimer = setTimeout(layoutHeroVideo, 120); });

// 5b. Soft amber brush — cursor trail over the hero video
(function liquidAura() {
  if (prefersReducedMotion) return;

  const container = document.getElementById("hero-liquid");
  const canvas    = document.getElementById("hero-canvas");
  if (!container || !canvas) return;

  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Brush dimensions (CSS px)
  const BRUSH_RADIUS   = 100;   // Soft brush head following the cursor
  const TRAIL_LIFESPAN = 1300;  // Trail persistence in ms
  const BRUSH_RGB      = "222, 128, 58";   // Brand amber

  let cw = 0, ch = 0;
  let rect = { left: 0, top: 0 };

  // Pre-rendered offscreen sprite for high-performance trail rendering
  const trailCvs = document.createElement("canvas");
  const trailCtx = trailCvs.getContext("2d");

  function buildSprites() {
    const r = Math.ceil(BRUSH_RADIUS * 0.7 * dpr);
    trailCvs.width  = r * 2;
    trailCvs.height = r * 2;
    trailCtx.clearRect(0, 0, r * 2, r * 2);
    const g = trailCtx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0,   `rgba(${BRUSH_RGB}, 0.30)`);
    g.addColorStop(0.5, `rgba(${BRUSH_RGB}, 0.14)`);
    g.addColorStop(1,   `rgba(${BRUSH_RGB}, 0)`);
    trailCtx.fillStyle = g;
    trailCtx.fillRect(0, 0, r * 2, r * 2);
  }

  function resize() {
    rect = container.getBoundingClientRect();
    cw = Math.round(rect.width  * dpr);
    ch = Math.round(rect.height * dpr);
    if (!cw || !ch) return;
    canvas.width  = cw;
    canvas.height = ch;
    canvas.style.width  = rect.width  + "px";
    canvas.style.height = rect.height + "px";
    buildSprites();
  }

  resize();
  new ResizeObserver(resize).observe(container);

  // Motion state
  let targetX = -1000, targetY = -1000;
  let headX = -1000, headY = -1000;
  let isInside = false;
  let trailPoints = [];
  let lastMoveTime = 0;
  let focalAlpha = 0;
  let isTicking = false;

  function schedule() {
    if (!isTicking) {
      isTicking = true;
      requestAnimationFrame(tick);
    }
  }

  function tick() {
    if (document.hidden) {
      isTicking = false;
      return;
    }

    const now = performance.now();

    // Prune expired trail points
    while (trailPoints.length > 0 && now - trailPoints[0].time > TRAIL_LIFESPAN) {
      trailPoints.shift();
    }

    // Focal alpha: fade in when active, fade out when idle
    const timeSinceMove = now - lastMoveTime;
    if (isInside && timeSinceMove < 1600) {
      focalAlpha = Math.min(focalAlpha + 0.08, 1);
    } else {
      focalAlpha = Math.max(focalAlpha - 0.02, 0);
    }

    // Stop rAF when completely settled and invisible
    if (focalAlpha <= 0 && trailPoints.length === 0) {
      ctx.clearRect(0, 0, cw, ch);
      isTicking = false;
      return;
    }

    ctx.clearRect(0, 0, cw, ch);

    // 1. Trail: soft amber stamps that fade out behind the cursor
    if (trailPoints.length > 0) {
      const r = trailCvs.width / 2;
      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < trailPoints.length; i++) {
        const pt = trailPoints[i];
        ctx.globalAlpha = Math.max(0, 1 - (now - pt.time) / TRAIL_LIFESPAN);
        ctx.drawImage(trailCvs, pt.x - r, pt.y - r);
      }
      ctx.globalAlpha = 1;
    }

    // 2. Brush head: a soft amber glow that eases toward the cursor (no outline)
    if (focalAlpha > 0) {
      headX += (targetX - headX) * 0.22;
      headY += (targetY - headY) * 0.22;
      const headR = BRUSH_RADIUS * dpr;
      const grad = ctx.createRadialGradient(headX, headY, 0, headX, headY, headR);
      grad.addColorStop(0,    `rgba(${BRUSH_RGB}, 0.55)`);
      grad.addColorStop(0.45, `rgba(${BRUSH_RGB}, 0.26)`);
      grad.addColorStop(1,    `rgba(${BRUSH_RGB}, 0)`);
      ctx.globalAlpha = focalAlpha;
      ctx.fillStyle = grad;
      ctx.fillRect(headX - headR, headY - headR, headR * 2, headR * 2);
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(tick);
  }

  let lastX = null, lastY = null;

  window.addEventListener("pointermove", function (e) {
    rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top)  * dpr;
    const pad = BRUSH_RADIUS * dpr;

    // Check if pointer is near or inside the hero
    if (x < -pad || x > cw + pad || y < -pad || y > ch + pad) {
      isInside = false;
      lastX = null;
      lastY = null;
      return;
    }

    isInside = true;
    targetX = x;
    targetY = y;
    lastMoveTime = performance.now();

    // If starting fresh, snap core and aura to avoid flying across screen
    if (headX < -500) {
      headX = x;
      headY = y;
    }

    // Interpolate points into trail
    if (lastX !== null && lastY !== null) {
      const dx = x - lastX;
      const dy = y - lastY;
      const dist = Math.hypot(dx, dy);
      const step = Math.max(16 * dpr, 1);
      const n = Math.min(Math.ceil(dist / step), 24);
      const now = performance.now();

      for (let i = 1; i <= n; i++) {
        trailPoints.push({
          x: lastX + dx * (i / n),
          y: lastY + dy * (i / n),
          time: now,
        });
      }
    } else {
      trailPoints.push({ x, y, time: performance.now() });
    }

    lastX = x;
    lastY = y;
    schedule();
  }, { passive: true });

  window.addEventListener("pointerleave", function () {
    isInside = false;
    lastX = null;
    lastY = null;
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && focalAlpha > 0) schedule();
  });
}());

// 6. PageLoader Animation & Entrance Gating
let ready = false;

const loader = document.getElementById("page-loader");
const loaderFill = document.getElementById("loader-fill-bar");
const loaderCounter = document.getElementById("loader-counter");

// Brand intro, first visit of a browser session only.
// Hides when BOTH: at least LOADER_MIN_MS since the page opened AND the page has loaded
// (window "load", or the hero video can play). Always hides by LOADER_MAX_MS, then fades out.
// js/intro-gate.js (in <head>) already decided whether to skip it: return visit or reduced motion.
const LOADER_DURATION_MS = 2000;
const LOADER_FADE_MS = 500;
const htmlEl = document.documentElement;
stopScroll();

let loaderDone = false;
const loaderStartTime = performance.now();

function finishLoader() {
  if (loaderDone) return;
  loaderDone = true;
  if (loaderFill) loaderFill.style.width = "100%";
  if (loaderCounter) loaderCounter.textContent = "100";
  if (loader) loader.classList.add("loader-exit");
  setTimeout(() => {
    ready = true;
    htmlEl.classList.remove("hw-intro-active");
    startScroll();
    if (loader) {
      loader.style.display = "none";
      loader.style.visibility = "hidden";
    }
    triggerHeroReveals();
  }, LOADER_FADE_MS);
}

function animateLoader(now) {
  if (loaderDone) return;
  const elapsed = (now || performance.now()) - loaderStartTime;
  const progress = Math.min(Math.floor((elapsed / LOADER_DURATION_MS) * 100), 100);
  if (loaderFill) loaderFill.style.width = `${progress}%`;
  if (loaderCounter) loaderCounter.textContent = String(progress).padStart(3, "0");
  if (progress >= 100) {
    finishLoader();
  } else {
    requestAnimationFrame(animateLoader);
  }
}

// Run the loading banner animation on every page load
requestAnimationFrame(animateLoader);
setTimeout(finishLoader, LOADER_DURATION_MS + 200);

// Hero Reveals Gated on Ready
function triggerHeroReveals() {
  // Header: delay 150ms
  setTimeout(() => {
    const header = document.getElementById("header");
    if (header) header.classList.add("entered");
  }, 150);

  // Hero eyebrow: delay 200ms
  setTimeout(() => {
    const eyebrow = document.getElementById("hero-eyebrow");
    if (eyebrow) eyebrow.classList.add("entered");
  }, 200);

  // Hero H1 lines: delay 250ms with 120ms stagger
  const lines = document.querySelectorAll(".hero-line");
  lines.forEach((line, idx) => {
    setTimeout(
      () => {
        line.classList.add("entered");
      },
      250 + idx * 120,
    );
  });

  // Watermark: delay 300ms
  setTimeout(() => {
    const wm = document.getElementById("hero-watermark");
    if (wm) wm.classList.add("entered");
  }, 300);

  // HeroCard: delay 400ms
  setTimeout(() => {
    const card = document.getElementById("hero-card-container");
    if (card) card.classList.add("entered");
  }, 400);

  // Partners: delay 550ms
  setTimeout(() => {
    const partners = document.getElementById("hero-partners");
    if (partners) partners.classList.add("entered");
  }, 550);

  // Rating: delay 650ms
  setTimeout(() => {
    const rating = document.getElementById("hero-rating");
    if (rating) rating.classList.add("entered");
  }, 650);

  // CTAs: delay 750ms
  setTimeout(() => {
    const ctas = document.getElementById("hero-ctas");
    if (ctas) ctas.classList.add("entered");
  }, 750);

  // Status bar: delay 900ms
  setTimeout(() => {
    const status = document.getElementById("hero-status");
    if (status) status.classList.add("entered");
  }, 900);
}

// 7. HeroCard Carousel (Issue 16: real featured items & auto-timer)
const carouselItems = [
  { caption: "Enterprise SOC", title: "CyberRange Telemetry" },
  { caption: "Care Retainer", title: "Active Maintenance $10/mo" },
  { caption: "Omnichannel Commerce", title: "Zodd Retail Experience" },
];
let currentSlide = 0;
const captionEl = document.getElementById("carousel-caption");
const titleEl = document.getElementById("carousel-title");
const slideEl = document.getElementById("carousel-slide");
const dashes = document.querySelectorAll("#carousel-dashes .hero-dash");
const prevBtn = document.getElementById("carousel-prev");
const nextBtn = document.getElementById("carousel-next");
const cardClickZone = document.getElementById("hero-carousel-card");

function setSlide(index, direction = 1) {
  if (!slideEl) return;
  const total = carouselItems.length;
  currentSlide = (index + total) % total;

  // Animate outgoing
  slideEl.style.opacity = "0";
  slideEl.style.transform = `translateY(${direction * 14}px)`;

  setTimeout(() => {
    const item = carouselItems[currentSlide];
    if (captionEl) captionEl.textContent = item.caption;
    if (titleEl) titleEl.textContent = item.title;

    dashes.forEach((dash, idx) => {
      dash.className = `hero-dash ${idx === currentSlide ? "active" : "inactive"}`;
    });

    // Animate incoming
    slideEl.style.transform = `translateY(${-direction * 14}px)`;
    void slideEl.offsetWidth; // force reflow
    slideEl.style.opacity = "1";
    slideEl.style.transform = "translateY(0)";
  }, 200);
}

if (prevBtn) {
  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setSlide(currentSlide - 1, -1);
  });
}
if (nextBtn) {
  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setSlide(currentSlide + 1, 1);
  });
}
if (cardClickZone) {
  cardClickZone.addEventListener("click", (e) => {
    if (
      e.target.closest("#carousel-prev") ||
      e.target.closest("#carousel-next")
    )
      return;
    setSlide(currentSlide + 1, 1);
  });
}

// 8. Word Reveal for About Statement
const statementEl = document.getElementById("about-statement");
if (statementEl) {
  const rawText = statementEl.textContent.trim();
  const mutedPart =
    "digital products, brand systems, and the strategy that holds them together.";
  const normalPart = "We partner with ambitious teams to ship ";

  statementEl.innerHTML = "";

  const normalWords = normalPart.trim().split(/\s+/);
  const mutedWords = mutedPart.trim().split(/\s+/);

  let wordIndex = 0;
  normalWords.forEach((word) => {
    const span = document.createElement("span");
    span.className = "word-reveal-word";
    span.textContent = word + "\u00A0";
    span.style.transitionDelay = `${wordIndex * 35}ms`;
    statementEl.appendChild(span);
    wordIndex++;
  });

  mutedWords.forEach((word) => {
    const span = document.createElement("span");
    span.className = "word-reveal-word";
    span.style.color = "#8d8d8d";
    span.textContent = word + "\u00A0";
    span.style.transitionDelay = `${wordIndex * 35}ms`;
    statementEl.appendChild(span);
    wordIndex++;
  });

  const wordObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          statementEl
            .querySelectorAll(".word-reveal-word")
            .forEach((w) => w.classList.add("entered"));
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 },
  );
  wordObserver.observe(statementEl);
}

// 9. Scroll-based Intersection Observer for other sections
const scrollRevealObserver = new IntersectionObserver(
  (entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("entered");
        // Also trigger any nested line reveals
        entry.target
          .querySelectorAll(".scroll-reveal-line, .line-reveal-inner")
          .forEach((l) => l.classList.add("entered"));
        obs.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.05 },
);

document
  .querySelectorAll(
    ".scroll-reveal, .scroll-reveal-line, .line-reveal-clip, .portfolio-h2, .services-h2, .stats-h2, .footer-cta-h2",
  )
  .forEach((el) => {
    scrollRevealObserver.observe(el);
  });

// 10. Stats Scroll Count-Up Trigger
// Trigger from start: "top bottom" to end: "center center"
const statsGrid = document.getElementById("stats-grid");
const counters = document.querySelectorAll(".stat-counter");
let statsCompleted = false;

function handleStatsCount() {
  if (statsCompleted || !statsGrid) return;
  const rect = statsGrid.getBoundingClientRect();
  const winH = window.innerHeight;

  // start: top bottom => rect.top === winH
  // end: center center => rect.top + rect.height/2 === winH/2
  const startY = winH;
  const endY = winH / 2 - rect.height / 2;
  const currentY = rect.top;

  let progress = 0;
  if (currentY <= startY) {
    progress = (startY - currentY) / (startY - endY);
    progress = Math.min(1, Math.max(0, progress));
  }

  counters.forEach((counter) => {
    const target = parseInt(counter.getAttribute("data-target"), 10) || 0;
    const currentVal = Math.round(progress * target);
    counter.textContent = currentVal;
  });

  if (progress >= 1) {
    statsCompleted = true;
    window.removeEventListener("scroll", handleStatsCount);
  }
}
window.addEventListener("scroll", handleStatsCount, { passive: true });
handleStatsCount();

// 11. NavMenu Overlay Controls
const navMenu = document.getElementById("nav-menu");
window.openNavMenu = function () {
  if (!navMenu) return;
  navMenu.classList.add("open");
  document.body.classList.add("nav-menu-open");
  stopScroll();
};
window.closeNavMenu = function () {
  if (!navMenu) return;
  navMenu.classList.remove("open");
  document.body.classList.remove("nav-menu-open");
  startScroll();
};
window.navMenuSelect = function (id) {
  window.closeNavMenu();
  if (id === "contact") {
    setTimeout(() => window.openRequestModal(), 200);
  } else {
    setTimeout(() => window.scrollToTarget(id), 200);
  }
};

// 12. "Start a project" modal: open/close, focus trap and submit live in js/main.js
const requestModal = document.getElementById("request-modal");

// Escape key listener for all overlays
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (requestModal && requestModal.classList.contains("open")) {
      window.closeRequestModal();
    } else if (navMenu && navMenu.classList.contains("open")) {
      window.closeNavMenu();
    }
  }
});

// 12.1 Reviews are left on Google: review buttons are plain links (no on-site review form)

// 13. Portfolio Video Preview & Play/Pause Controls (Desktop Hover + Mobile Tap)
const previewPlayTimeouts = new Map();

function startPortfolioPreview(card, video) {
  if (!video) return;

  // Clear any pending timer for this card
  if (previewPlayTimeouts.has(card)) {
    clearTimeout(previewPlayTimeouts.get(card));
    previewPlayTimeouts.delete(card);
  }

  // 1. Immediately activate smooth height-shrink transition and pause button state
  card.classList.add("is-previewing");
  const btn = card.querySelector(".portfolio-play-btn");
  if (btn) btn.setAttribute("aria-label", "Pause video preview");

  video.muted = true;
  video.playsInline = true;

  // 2. Delay video playback by 0.5s so the user experiences the card smoothly getting shorter first
  const timer = setTimeout(() => {
    if (card.classList.contains("is-previewing")) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => { });
      }
    }
    previewPlayTimeouts.delete(card);
  }, 500);

  previewPlayTimeouts.set(card, timer);
}

function stopPortfolioPreview(card, video) {
  if (!video) return;

  // Clear any pending play timer
  if (previewPlayTimeouts.has(card)) {
    clearTimeout(previewPlayTimeouts.get(card));
    previewPlayTimeouts.delete(card);
  }

  // 1. Instantly trigger stretch transition back to idle
  card.classList.remove("is-previewing");
  const btn = card.querySelector(".portfolio-play-btn");
  if (btn) btn.setAttribute("aria-label", "Play video preview");

  // 2. Pause and reset video
  video.pause();
  video.currentTime = 0;
}

document.querySelectorAll(".portfolio-card").forEach((card) => {
  const video = card.querySelector(".portfolio-preview-video");
  const playBtn = card.querySelector(".portfolio-play-btn");
  const videoPreview = card.querySelector(".portfolio-video-preview");
  if (!video) return;

  video.muted = true;
  video.playsInline = true;

  // Play/Pause button click (touch on mobile & click on desktop)
  if (playBtn) {
    playBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isPlaying = card.classList.contains("is-previewing") && !video.paused;
      if (isPlaying) {
        stopPortfolioPreview(card, video);
      } else {
        // Stop any other active cards so only one video plays at a time
        document.querySelectorAll(".portfolio-card.is-previewing").forEach((other) => {
          if (other !== card) {
            const otherVideo = other.querySelector(".portfolio-preview-video");
            stopPortfolioPreview(other, otherVideo);
          }
        });
        startPortfolioPreview(card, video);
      }
    });
  }

  // Tapping/clicking the playing preview video pauses it
  if (videoPreview) {
    videoPreview.addEventListener("click", (e) => {
      e.stopPropagation();
      if (card.classList.contains("is-previewing")) {
        stopPortfolioPreview(card, video);
      }
    });
  }

  // Desktop fine pointer hover preview
  card.addEventListener("mouseenter", () => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      startPortfolioPreview(card, video);
    }
  });

  card.addEventListener("mouseleave", () => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      stopPortfolioPreview(card, video);
    }
  });

  // Ensure video restarts smoothly on loop
  video.addEventListener("ended", () => {
    video.currentTime = 0;
    video.play().catch(() => { });
  });
});
