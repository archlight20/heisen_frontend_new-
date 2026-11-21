// Homepage reviews: stacked Google review cards, hero rating, review links.
(function () {
  // ============================================================================
  // 1. TWEAKABLE CONFIGURATION
  // ============================================================================
  const CONFIG = {
    SCROLL_PER_CARD_VH: 85,  // Scroll duration per card transition (vh)
    HOLD_VH: 35,             // Hold duration after card lands (vh)
    PEEK_HEIGHT_DESKTOP: 16, // Top peek sliver height per card on desktop (px)
    PEEK_HEIGHT_MOBILE: 13,  // Top peek sliver height on mobile (px)
    SCALE_STEP: 0.035,       // Scale reduction per step in the stack
    TILT_DESKTOP: 15,        // rotateX angle for incoming card on desktop (deg)
    TILT_MOBILE: 9,          // rotateX angle for incoming card on mobile (deg)
    ROTATE_Y: 0,             // rotateY tilt angle
    LERP_FACTOR: 0.10,       // Lerp smoothing factor per frame (0.08 - 0.12)
    MAX_SLIVERS_DESKTOP: 4,  // Maximum visible slivers before fading to 0
    MAX_SLIVERS_MOBILE: 3    // Maximum visible slivers on mobile
  };

  // Google reviews come from the fixed list in js/google-reviews.js (no API call).
  const AVATAR_PALETTE = ["#b15f2c", "#0958d9", "#135200", "#722ed1", "#d46b08", "#c41d7f", "#08979c", "#eb2f96"];

  function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeHttpsUrl(url) {
    return typeof url === "string" && /^https:\/\//i.test(url) ? url : "";
  }

  function googleReviewToCard(r, i) {
    const name = r.author || "Google user";
    return {
      name,
      initial: (name.trim().charAt(0) || "G").toUpperCase(),
      avatarColor: AVATAR_PALETTE[i % AVATAR_PALETTE.length],
      photo: safeHttpsUrl(r.authorPhoto),
      authorUrl: safeHttpsUrl(r.authorUrl),
      reviewUrl: safeHttpsUrl(r.reviewUrl),
      rating: Math.max(1, Math.min(5, Number(r.rating) || 5)),
      status: "Google review" + (r.relativeTime ? " · " + r.relativeTime : ""),
      date: r.relativeTime || "",
      text: r.text || "",
      tag: "Posted on Google"
    };
  }

  function generateCardHTML(rev, i, total) {
    const nextStep = i + 1;
    let starsSvg = "";
    for (let s = 1; s <= 5; s++) {
      const fill = s <= rev.rating ? "#F4B400" : "#D1D0CD";
      starsSvg += `<svg width="18" height="18" viewBox="0 0 24 24" fill="${fill}" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>`;
    }

    const safeName = escapeHtml(rev.name);
    const safeInitial = escapeHtml(rev.initial || safeName.charAt(0).toUpperCase() || "U");
    const safeColor = escapeHtml(rev.avatarColor || "#b15f2c");
    const safeStatus = escapeHtml(rev.status || "Google review");
    const safeDate = escapeHtml(rev.date || "");
    const safeText = escapeHtml(rev.text || "");
    const safeTag = escapeHtml(rev.tag || "Posted on Google");
    const safePhoto = escapeHtml(rev.photo || "");
    const safeAuthorUrl = escapeHtml(rev.authorUrl || "");
    const safeReviewUrl = escapeHtml(rev.reviewUrl || "");

    return `
    <article class="reviews-card" data-index="${i}" aria-label="Review by ${safeName}">
      <div class="reviews-sliver-accent" style="background-color: ${safeColor};"></div>
      <div class="reviews-sliver-name" aria-hidden="true">${safeName}</div>
      <div class="reviews-card-panel">
        <div class="reviews-panel-top">
          <div class="reviews-avatar-circle" style="background-color: ${safeColor};">
            ${safePhoto ? `<img src="${safePhoto}" alt="" width="52" height="52" loading="lazy" referrerpolicy="no-referrer" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />` : `<span>${safeInitial}</span>`}
          </div>
          <div class="reviews-reviewer-info">
            <h3 class="reviews-reviewer-name">${safeAuthorUrl ? `<a href="${safeAuthorUrl}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">${safeName}</a>` : safeName}</h3>
            <p class="reviews-reviewer-status">${safeStatus}</p>
          </div>
        </div>
        <div class="reviews-panel-bottom">
          <div class="reviews-badge">
            <span>Google</span>
          </div>
        </div>
      </div>
      <div class="reviews-card-content">
        <div class="reviews-content-top">
          <div class="reviews-stars" aria-label="${rev.rating} out of 5 stars">
            ${starsSvg}
          </div>
          <time class="reviews-date">${safeDate}</time>
        </div>
        <blockquote class="reviews-text-wrap">
          <p class="reviews-text">“${safeText}”</p>
        </blockquote>
        <div class="reviews-content-bottom">
          ${safeReviewUrl ? `<a class="reviews-tag" href="${safeReviewUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none;">${safeTag} ↗</a>` : `<span class="reviews-tag">${safeTag}</span>`}
          <button type="button" class="reviews-arrow-btn" data-step-to="${nextStep}" aria-label="Next review">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8H13M13 8L8.5 3.5M13 8L8.5 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </article>`;
  }

  const reviewsSection = document.getElementById("reviews");
  const pinWrapper = document.getElementById("reviews-pin");
  const cardsStack = document.getElementById("reviews-cards-stack");
  const reviewsHeader = document.getElementById("reviews-header");

  if (!reviewsSection || !pinWrapper || !cardsStack) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let cards = [];
  let TOTAL_TRANSITIONS = 0;
  let TOTAL_STEPS = 0;
  let isVisible = false;
  let smoothProgress = 0;
  let targetProgress = 0;
  let animationFrameId = null;

  function getIsMobile() {
    return window.innerWidth <= 760;
  }

  function easePower3Out(t) {
    const clamped = Math.max(0, Math.min(1, t));
    return 1 - Math.pow(1 - clamped, 3);
  }

  function updateTargetProgress() {
    const rect = pinWrapper.getBoundingClientRect();
    const maxScroll = pinWrapper.offsetHeight - window.innerHeight;
    if (maxScroll <= 0) return;
    const scrolled = -rect.top;
    targetProgress = Math.max(0, Math.min(1, scrolled / maxScroll));
  }

  function render(progress) {
    if (prefersReducedMotion) return;
    const isMobile = getIsMobile();
    const tiltAngle = isMobile ? CONFIG.TILT_MOBILE : CONFIG.TILT_DESKTOP;
    const peekHeight = isMobile ? CONFIG.PEEK_HEIGHT_MOBILE : CONFIG.PEEK_HEIGHT_DESKTOP;
    const maxSlivers = isMobile ? CONFIG.MAX_SLIVERS_MOBILE : CONFIG.MAX_SLIVERS_DESKTOP;

    const u = progress * TOTAL_STEPS;

    if (reviewsHeader) {
      reviewsHeader.style.opacity = "1";
      reviewsHeader.style.transform = "none";
      reviewsHeader.style.pointerEvents = "auto";
    }

    cards.forEach((card, i) => {
      const textWrap = card.querySelector(".reviews-text-wrap");
      const content = card.querySelector(".reviews-card-content");

      if (i === 0) {
        const d = u;
        const shiftY = - (d * peekHeight);
        const scale = Math.max(0.75, 1 - d * CONFIG.SCALE_STEP);

        card.style.transform = `translate3d(0, ${shiftY.toFixed(1)}px, 0) scale(${scale.toFixed(3)}) rotateX(0deg)`;
        card.style.boxShadow = `0 40px 60px -30px rgba(0, 0, 0, 0.25)`;

        if (d <= maxSlivers - 0.5) {
          card.style.opacity = "1";
          card.style.pointerEvents = "auto";
        } else if (d <= maxSlivers + 0.5) {
          const fadeProgress = (d - (maxSlivers - 0.5));
          card.style.opacity = Math.max(0, 1 - fadeProgress).toFixed(3);
          card.style.pointerEvents = "none";
        } else {
          card.style.opacity = "0";
          card.style.pointerEvents = "none";
        }

        if (u >= 0.8) {
          card.classList.add("is-stacked");
        } else {
          card.classList.remove("is-stacked");
        }

        if (content) content.style.opacity = "1";
        if (textWrap) {
          textWrap.style.opacity = "1";
          textWrap.style.filter = "none";
        }
      } else {
        const k = i - 1;

        if (u < k) {
          if (u < k - 0.25) {
            card.style.transform = `translate3d(0, 105vh, 0) scale(1.03) rotateX(${tiltAngle}deg)`;
            card.style.opacity = "0";
            card.style.pointerEvents = "none";
          } else {
            const preFade = (u - (k - 0.25)) / 0.25;
            card.style.transform = `translate3d(0, 95vh, 0) scale(1.03) rotateX(${tiltAngle}deg)`;
            card.style.opacity = (preFade * 0.15).toFixed(3);
            card.style.pointerEvents = "none";
          }
          card.classList.remove("is-stacked");
          if (textWrap) {
            textWrap.style.opacity = "0.12";
            textWrap.style.filter = "blur(2.5px)";
          }
          if (content) content.style.opacity = "1";
        } else if (u >= k && u < k + 1) {
          const t = u - k;
          const e = easePower3Out(t);

          const currentTiltX = (1 - e) * tiltAngle;
          const currentY = (1 - e) * (isMobile ? 85 : 95);
          const currentScale = 1 + (1 - e) * 0.03;
          const shadowY = 20 + 20 * e;
          const shadowBlur = 30 + 30 * e;
          const shadowSpread = -(15 + 15 * e);
          const shadowAlpha = 0.15 + 0.10 * e;

          card.style.transform = `translate3d(0, ${currentY.toFixed(2)}vh, 0) scale(${currentScale.toFixed(3)}) rotateX(${currentTiltX.toFixed(2)}deg)`;
          card.style.boxShadow = `0 ${shadowY.toFixed(1)}px ${shadowBlur.toFixed(1)}px ${shadowSpread.toFixed(1)}px rgba(0,0,0,${shadowAlpha.toFixed(2)})`;
          card.style.opacity = "1";
          card.style.pointerEvents = "auto";
          card.classList.remove("is-stacked");
          if (content) content.style.opacity = "1";

          if (textWrap) {
            if (t < 0.65) {
              textWrap.style.opacity = "0.12";
              textWrap.style.filter = "blur(2.5px)";
            } else {
              const textProgress = (t - 0.65) / 0.35;
              const easedText = easePower3Out(textProgress);
              const textOpacity = 0.12 + 0.88 * easedText;
              const textBlur = 2.5 * (1 - easedText);
              textWrap.style.opacity = textOpacity.toFixed(3);
              textWrap.style.filter = `blur(${textBlur.toFixed(2)}px)`;
            }
          }
        } else {
          const d = u - (k + 1);
          const shiftY = - (d * peekHeight);
          const scale = Math.max(0.75, 1 - d * CONFIG.SCALE_STEP);

          card.style.transform = `translate3d(0, ${shiftY.toFixed(1)}px, 0) scale(${scale.toFixed(3)}) rotateX(0deg)`;
          card.style.boxShadow = `0 40px 60px -30px rgba(0, 0, 0, 0.25)`;

          if (d <= maxSlivers - 0.5) {
            card.style.opacity = "1";
            card.style.pointerEvents = "auto";
          } else if (d <= maxSlivers + 0.5) {
            const fadeProgress = (d - (maxSlivers - 0.5));
            card.style.opacity = Math.max(0, 1 - fadeProgress).toFixed(3);
            card.style.pointerEvents = "none";
          } else {
            card.style.opacity = "0";
            card.style.pointerEvents = "none";
          }

          if (d >= 0.8) {
            card.classList.add("is-stacked");
          } else {
            card.classList.remove("is-stacked");
          }
          if (content) content.style.opacity = "1";

          if (textWrap) {
            textWrap.style.opacity = "1";
            textWrap.style.filter = "none";
          }
        }
      }
    });
  }

  function tick() {
    if (!isVisible) return;
    updateTargetProgress();
    const diff = targetProgress - smoothProgress;
    smoothProgress += diff * CONFIG.LERP_FACTOR;

    render(smoothProgress);

    animationFrameId = requestAnimationFrame(tick);
  }

  function scrollToStep(stepIndex) {
    const rect = pinWrapper.getBoundingClientRect();
    const wrapperTop = window.scrollY + rect.top;
    const maxScroll = pinWrapper.offsetHeight - window.innerHeight;
    let targetStep = stepIndex;

    if (targetStep >= cards.length) {
      const targetY = wrapperTop + maxScroll + 40;
      window.scrollTo({ top: targetY, behavior: "smooth" });
      return;
    }

    const progressRatio = targetStep / TOTAL_STEPS;
    const targetY = wrapperTop + progressRatio * maxScroll;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  }

  function setupCardListeners() {
    cards.forEach((card, index) => {
      const arrowBtn = card.querySelector(".reviews-arrow-btn");
      if (arrowBtn) {
        arrowBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          scrollToStep(index + 1);
        });
      }

      card.addEventListener("click", () => {
        if (card.classList.contains("is-stacked")) {
          scrollToStep(index);
        }
      });
    });
  }

  function buildCardsStack(reviewList) {
    // Enforce: if greater than 8, show latest 8 cards only
    let listToRender = reviewList;
    if (listToRender.length > 8) {
      listToRender = listToRender.slice(-8);
    }

    if (listToRender.length === 0) {
      cardsStack.innerHTML = `
      <article class="reviews-card reviews-empty-card" data-index="0" aria-label="No reviews yet" style="transform: none; opacity: 1; pointer-events: auto;">
        <div class="reviews-card-panel">
          <div class="reviews-panel-top">
            <div class="reviews-avatar-circle" style="background-color: #b15f2c;">
              <span>★</span>
            </div>
            <div class="reviews-reviewer-info">
              <h3 class="reviews-reviewer-name">Client Reviews</h3>
              <p class="reviews-reviewer-status">Google Reviews</p>
            </div>
          </div>
          <div class="reviews-panel-bottom">
            <div class="reviews-badge">
              <span>Reviews</span>
            </div>
          </div>
        </div>
        <div class="reviews-card-content" style="display: flex; flex-direction: column; justify-content: center;">
          <div class="reviews-content-top">
            <div class="reviews-stars" aria-label="5 out of 5 stars">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#F4B400" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#F4B400" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#F4B400" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#F4B400" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#F4B400" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
            </div>
          </div>
          <blockquote class="reviews-text-wrap" style="margin: 1.25rem 0;">
            <p class="reviews-text" style="font-size: 1.15rem; color: #111;">Worked with us? Share your experience on Google.</p>
          </blockquote>
          <div class="reviews-content-bottom">
            <a class="pill-btn pill-btn-dark" href="${escapeHtml(window.HW_GOOGLE_WRITE_REVIEW_URL || "https://search.google.com/local/writereview?placeid=ChIJFdG7apNjTAwRyG-Czax4ie4")}" target="_blank" rel="noopener noreferrer" data-google-review-link aria-label="Review us on Google (opens in a new tab)">
              <span class="pill-inner has-arrow">
                <span>Review us on Google</span>
                <span class="pill-badge">
                  <svg class="svg-icon arrow-icon-upright" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M7 17 17 7M8 7h9v9" />
                  </svg>
                </span>
              </span>
            </a>
          </div>
        </div>
      </article>`;
      cards = Array.from(cardsStack.querySelectorAll(".reviews-card"));
      pinWrapper.style.height = "auto";
      pinWrapper.style.minHeight = "75vh";
      TOTAL_TRANSITIONS = 0;
      TOTAL_STEPS = 1;
      return;
    }

    cardsStack.innerHTML = listToRender.map((r, i) => generateCardHTML(r, i, listToRender.length)).join("");
    cards = Array.from(cardsStack.querySelectorAll(".reviews-card"));
    TOTAL_TRANSITIONS = Math.max(0, cards.length - 1);
    TOTAL_STEPS = TOTAL_TRANSITIONS + (CONFIG.HOLD_VH / CONFIG.SCROLL_PER_CARD_VH);

    // Adjust pinWrapper track height to match cards count
    if (cards.length <= 1) {
      pinWrapper.style.height = "auto";
      pinWrapper.style.minHeight = "85vh";
    } else {
      pinWrapper.style.height = `${(cards.length - 1) * CONFIG.SCROLL_PER_CARD_VH + CONFIG.HOLD_VH}vh`;
    }

    setupCardListeners();
    updateTargetProgress();
    render(smoothProgress);

    if (window.__lenis && typeof window.__lenis.resize === "function") {
      window.__lenis.resize();
    }
  }

  // Intersection Observer
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!isVisible) {
            isVisible = true;
            updateTargetProgress();
            smoothProgress = targetProgress;
            animationFrameId = requestAnimationFrame(tick);
          }
        } else {
          isVisible = false;
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
        }
      });
    },
    { rootMargin: "250px 0px" }
  );

  observer.observe(reviewsSection);

  window.addEventListener("resize", () => {
    updateTargetProgress();
    render(smoothProgress);
  });

  // Public API on window
  window.jumpToReviewStep = scrollToStep;

  function renderGooglePill(place) {
    const pill = document.getElementById("reviews-google-pill");
    if (!pill || !place || typeof place.rating !== "number") return;
    const ratingEl = pill.querySelector(".reviews-google-rating");
    const countEl = pill.querySelector(".reviews-google-count");
    if (ratingEl) ratingEl.textContent = place.rating.toFixed(1);
    if (countEl) countEl.textContent = place.totalReviews + " review" + (place.totalReviews === 1 ? "" : "s");
    const href = safeHttpsUrl(place.mapsUrl);
    if (href) pill.href = href;
    pill.hidden = false;
  }

  // Hero rating line uses the same Google data as this section; no number is shown without data
  function renderHeroRating(place) {
    const stars = document.getElementById("hero-rating-stars");
    const label = document.getElementById("hero-rating-label");
    if (!stars || !label) return;
    if (typeof place.rating !== "number" || !place.totalReviews) return;
    const n = place.totalReviews;
    label.textContent = `Rated ${place.rating.toFixed(1)} on Google · ${n} review${n === 1 ? "" : "s"}`;
    stars.setAttribute("aria-hidden", "true");
    stars.hidden = false;
  }

  function loadGoogleReviews() {
    const data = window.HW_GOOGLE_REVIEWS || {};
    const place = data.place || {};
    if (place.writeReviewUrl) window.HW_GOOGLE_WRITE_REVIEW_URL = place.writeReviewUrl;
    // Review buttons are plain links; keep their target in sync with the data
    const writeUrl = safeHttpsUrl(place.writeReviewUrl);
    if (writeUrl) document.querySelectorAll("[data-google-review-link]").forEach((a) => { a.href = writeUrl; });
    renderHeroRating(place);
    renderGooglePill(place);
    const list = (data.reviews || []).map((r) => Object.assign({}, r, { relativeTime: r.relativeTime || r.date }));
    buildCardsStack(list.map(googleReviewToCard));
  }

  loadGoogleReviews();
  smoothProgress = targetProgress;
  render(smoothProgress);
})();
