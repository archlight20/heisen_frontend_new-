/* Homepage pricing: prices, currency toggle, plan tabs, social proof, plan-aware CTAs */
(function () {
  // ========================================================================
  // EDIT PRICES HERE. Fixed regional prices, not live conversions.
  // Use a number, "FILL_ME" (shows "Price on request"), or null.
  // ========================================================================
  const PRICING = {
    // Monthly plans
    care:       { INR: 799,  USD: 10, period: "/ month" },
    automation: { INR: 5999, USD: 70, period: "/ project" },
    custom:     { INR: null, USD: null },
    // One-time projects
    website:    { INR: 7999, USD: 100, period: "one-time" },
    landing:    { INR: 1699, USD: 20,  period: "one-time" },
    graphic:    { INR: 1699, USD: 20,  period: "one-time" },
  };

  // Update count and asOf every month with real numbers.
  // (The "Trending" badge and the pill hide themselves 45 days after asOf.)
  const SOCIAL_PROOF = {
    care: { count: 10, days: 30, asOf: "2026-11-20" },
  };
  const SOCIAL_PROOF_MAX_AGE_DAYS = 45;

  const CURRENCY_KEY = "hw_currency";
  const VIEW_KEY = "hw_plan_view";
  const ONE_TIME_HASH = "#one-time";

  const section = document.getElementById("pricing");
  if (!section) return;

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function track(name, data) { if (window.HW_Analytics) window.HW_Analytics.track(name, data); }
  function store(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

  // ---------------------------------------------------------------- Currency
  const radios = Array.from(section.querySelectorAll('.pr-toggle-opt[role="radio"]'));
  const priceBlocks = Array.from(section.querySelectorAll(".pr-price[data-plan]"));
  const formatters = {
    INR: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }),
    USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
  };
  const warned = {};

  function detectCurrency() {
    const saved = read(CURRENCY_KEY);
    if (saved === "INR" || saved === "USD") return saved;
    let tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    const lang = navigator.language || "";
    if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta" || /-IN$/i.test(lang)) return "INR";
    return "USD";
  }

  function writePrice(block, currency) {
    const plan = PRICING[block.dataset.plan];
    if (!plan) return;
    const value = plan[currency];
    const amountEl = block.querySelector("[data-price]");
    const periodEl = block.querySelector("[data-period]");
    const onRequest = typeof value !== "number";
    if (value === "FILL_ME" && !warned[block.dataset.plan + currency]) {
      warned[block.dataset.plan + currency] = true;
      console.warn('[pricing] ' + block.dataset.plan + '.' + currency + ' is "FILL_ME". Showing "Price on request".');
    }
    amountEl.textContent = onRequest ? "Price on request" : formatters[currency].format(value);
    amountEl.classList.toggle("is-request", onRequest);
    if (periodEl) {
      periodEl.textContent = plan.period || "";
      periodEl.hidden = onRequest || !plan.period;
    }
  }

  function applyCurrency(currency, animate) {
    section.dataset.currency = currency;
    radios.forEach(function (r) {
      const on = r.dataset.currency === currency;
      r.setAttribute("aria-checked", on ? "true" : "false");
      r.tabIndex = on ? 0 : -1;
    });
    if (!animate || reduceMotion) {
      priceBlocks.forEach(function (b) { writePrice(b, currency); });
      return;
    }
    const rows = priceBlocks.map(function (b) { return b.querySelector(".pr-amount-row"); });
    rows.forEach(function (row) { row.classList.add("is-switching"); });
    setTimeout(function () {
      priceBlocks.forEach(function (b) { writePrice(b, currency); });
      rows.forEach(function (row) { row.classList.remove("is-switching"); });
    }, 100);
  }

  function chooseCurrency(currency, focus) {
    if (section.dataset.currency === currency) return;
    store(CURRENCY_KEY, currency);
    applyCurrency(currency, true);
    if (focus) {
      const r = radios.find(function (x) { return x.dataset.currency === currency; });
      if (r) r.focus();
    }
    track("pricing_currency", { currency: currency });
  }

  radios.forEach(function (r, i) {
    r.addEventListener("click", function () { chooseCurrency(r.dataset.currency, false); });
    r.addEventListener("keydown", function (e) {
      let next = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = radios[(i + 1) % radios.length];
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = radios[(i - 1 + radios.length) % radios.length];
      else if (e.key === "Home") next = radios[0];
      else if (e.key === "End") next = radios[radios.length - 1];
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); chooseCurrency(r.dataset.currency, false); return; }
      if (next) { e.preventDefault(); chooseCurrency(next.dataset.currency, true); }
    });
  });

  // ------------------------------------------------------- Plan-type tabs
  const tabs = Array.from(section.querySelectorAll('.pr-tab[role="tab"]'));
  const views = section.querySelector(".pr-views");
  const panels = {};
  section.querySelectorAll('.pr-panel[role="tabpanel"]').forEach(function (p) { panels[p.dataset.view] = p; });
  let animTimer = null;

  function updateHash(view) {
    if (!window.history || !history.replaceState) return;
    const base = location.pathname + location.search;
    if (view === "onetime") {
      if (location.hash !== ONE_TIME_HASH) history.replaceState(null, "", base + ONE_TIME_HASH);
    } else if (location.hash === ONE_TIME_HASH) {
      history.replaceState(null, "", base);
    }
  }

  function setTabs(view) {
    tabs.forEach(function (t) {
      const on = t.dataset.view === view;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
    });
  }

  function showView(view, animate) {
    const current = section.dataset.view;
    const next = panels[view];
    if (!next) return;
    setTabs(view);
    section.dataset.view = view;
    if (current === view && !next.hidden) return;
    const prev = panels[current];

    clearTimeout(animTimer);
    if (!animate || reduceMotion || !prev || !views) {
      Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== view; panels[k].classList.remove("is-leaving", "is-entering"); });
      if (views) { views.style.height = ""; views.classList.remove("is-animating"); }
      return;
    }

    // Lock the current height, fade/slide the old panel out, then grow/shrink to the new one.
    Object.keys(panels).forEach(function (k) { panels[k].classList.remove("is-leaving", "is-entering"); });
    views.style.height = views.offsetHeight + "px";
    views.classList.add("is-animating");
    prev.classList.add("is-leaving");
    animTimer = setTimeout(function () {
      prev.hidden = true;
      prev.classList.remove("is-leaving");
      next.classList.add("is-entering");
      next.hidden = false;
      const styles = getComputedStyle(views);
      const target = next.offsetHeight + parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
      views.style.height = target + "px";
      void next.offsetWidth;               // commit the start state so the fade-in transitions
      next.classList.remove("is-entering");
      animTimer = setTimeout(function () {
        views.style.height = "";
        views.classList.remove("is-animating");
        if (window.__lenis && typeof window.__lenis.resize === "function") window.__lenis.resize();
      }, 260);
    }, 110);
  }

  function chooseView(view, opts) {
    opts = opts || {};
    showView(view, true);
    store(VIEW_KEY, view);
    updateHash(view);
    if (opts.focus) {
      const t = tabs.find(function (x) { return x.dataset.view === view; });
      if (t) t.focus();
    }
    track("pricing_view", { view: view });
  }

  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { chooseView(t.dataset.view); });
    t.addEventListener("keydown", function (e) {
      let next = null;
      if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else if (e.key === "End") next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); chooseView(next.dataset.view, { focus: true }); }
    });
  });

  function scrollToSection() {
    const top = section.getBoundingClientRect().top + window.pageYOffset - 72;
    if (window.__lenis && typeof window.__lenis.scrollTo === "function") {
      window.__lenis.scrollTo(top, { immediate: reduceMotion });
    } else {
      window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }

  section.querySelectorAll("[data-goto]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      chooseView(link.dataset.goto);
      scrollToSection();
    });
  });

  window.addEventListener("hashchange", function () {
    if (location.hash === ONE_TIME_HASH) showView("onetime", true);
  });

  // ---------------------------------------------------------- Social proof
  // Shows the badge + pill only while the numbers are fresh; never leaves an old number on the site.
  function applySocialProof(today) {
    Object.keys(SOCIAL_PROOF).forEach(function (id) {
      const p = SOCIAL_PROOF[id];
      const badge = section.querySelector('[data-social-badge="' + id + '"]');
      const pill = section.querySelector('[data-social-proof="' + id + '"]');
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.asOf || "");
      const asOf = m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
      const ageDays = asOf ? (today - asOf) / 86400000 : Infinity;
      const fresh = asOf && typeof p.count === "number" && p.count > 0 && ageDays <= SOCIAL_PROOF_MAX_AGE_DAYS;
      if (!fresh) {
        console.warn("Update social proof", { plan: id, asOf: p.asOf, ageDays: Math.floor(ageDays) });
      }
      if (pill) {
        pill.querySelector("[data-social-proof-text]").textContent =
          p.count + (p.count === 1 ? " business joined" : " businesses joined") + " in the last " + p.days + " days";
        pill.hidden = !fresh;
      }
      if (badge) badge.hidden = !fresh;
    });
  }
  window.HW_applySocialProof = applySocialProof;   // handy for testing a future date

  // ------------------------------------------- Card CTAs → Start-a-project modal
  // Names shown in the modal chip and heading ("Let's build your Graphic Design.")
  const PLAN_NAMES = {
    website: "Premium Website",
    landing: "Landing Page",
    graphic: "Graphic Design",
    care: "Active Care",
    automation: "AI Automation",
    custom: "Custom Architecture",
  };

  // The plan exactly as the card shows it right now (price in the active currency)
  function planFor(id) {
    const card = section.querySelector(".pr-card--" + id);
    const block = card && card.querySelector(".pr-price[data-plan]");
    let price = "Custom quote";
    if (block) {
      const amount = block.querySelector("[data-price]").textContent.trim();
      const periodEl = block.querySelector("[data-period]");
      const period = periodEl && !periodEl.hidden ? periodEl.textContent.trim() : "";
      price = amount === "Price on request" ? amount : "Starting from " + amount + (period ? " " + period : "");
    }
    return { id: id, name: PLAN_NAMES[id] || id, price: price, currency: section.dataset.currency };
  }
  window.HW_getPricingPlan = planFor;

  section.querySelectorAll("[data-lead-plan]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const plan = planFor(btn.dataset.leadPlan);
      if (typeof window.openRequestModal === "function") window.openRequestModal({ plan: plan }, btn);
      track("pricing_cta", { plan: plan.id, currency: plan.currency });
    });
  });

  // ------------------------------------------------------- Initial render
  // Markup ships INR + Monthly; correct both synchronously before paint.
  applyCurrency(detectCurrency(), false);
  applySocialProof(new Date());
  let initialView = "monthly";
  if (location.hash) {
    if (location.hash === ONE_TIME_HASH) initialView = "onetime";   // a hash wins over the stored choice
  } else {
    const savedView = read(VIEW_KEY);
    if (savedView === "monthly" || savedView === "onetime") initialView = savedView;
  }
  showView(initialView, false);
})();
