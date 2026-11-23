/**
 * HeisenWorks Shared Client Engine
 * - Dynamic Asia/Kolkata IST Studio Clock
 * - Extensible Analytics Event Bus (window.HW_Analytics)
 * - "Start a project" lead modal: locked plan chip, email via /api/contact + WhatsApp hand-off
 * - "Leave a review" → Google write-review page (no on-site review form)
 * - Navigation Drawer & Cookie Notice Management
 */

(function () {
  'use strict';

  // 1. EXTENSIBLE ANALYTICS BUS
  window.HW_Analytics = {
    track: function (eventName, properties) {
      const payload = {
        event: eventName,
        properties: properties || {},
        timestamp: new Date().toISOString(),
        url: window.location.pathname
      };
      if (window.__HW_DEBUG__) {
        console.log('[HW Analytics]:', payload);
      }
      // Dispatch custom DOM event
      window.dispatchEvent(new CustomEvent('hw:analytics', { detail: payload }));
      if (typeof window.plausible === 'function') {
        window.plausible(eventName, { props: properties });
      }
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, properties);
      }
    }
  };

  // 2. LIVE ASIA/KOLKATA (IST) STUDIO CLOCK
  function updateStudioClock() {
    try {
      const formatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const parts = formatter.formatToParts(new Date());
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

      const timeEls = document.querySelectorAll('.clock-time, #live-time');
      const dateEls = document.querySelectorAll('.clock-date, #live-date');
      const navClock = document.getElementById('nav-menu-clock');

      timeEls.forEach(el => el.textContent = timeStr);
      dateEls.forEach(el => el.textContent = dateStr);
      if (navClock) navClock.textContent = `Studio time (IST) — ${timeStr}`;
    } catch (e) {
      console.warn('Clock update error:', e);
    }
  }
  updateStudioClock();
  setInterval(updateStudioClock, 1000);

  // 3. DYNAMIC FOOTER YEAR
  const yearEls = document.querySelectorAll('#footer-year, .current-year');
  const currentYear = new Date().getFullYear();
  yearEls.forEach(el => el.textContent = currentYear);

  // 3.1 HEADER SCROLL EFFECT (Seamless transparent over hero, frosted glass on scroll)
  const headerEl = document.getElementById('header');
  function handleHeaderScroll() {
    if (!headerEl) return;
    if (window.scrollY > 40) {
      headerEl.classList.add('scrolled');
    } else {
      headerEl.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', handleHeaderScroll, { passive: true });
  handleHeaderScroll();

  // 4. NAVIGATION DRAWER CONTROLS
  const navMenu = document.getElementById('nav-menu');
  window.openNavMenu = function () {
    if (navMenu) {
      navMenu.classList.add('open');
      document.body.classList.add('nav-menu-open');
      document.body.style.overflow = 'hidden';
      window.HW_Analytics.track('nav_menu_open');
    }
  };
  window.closeNavMenu = function () {
    if (navMenu) {
      navMenu.classList.remove('open');
      document.body.classList.remove('nav-menu-open');
      document.body.style.overflow = '';
    }
  };

  // 5. "START A PROJECT" MODAL — lead capture (email via /api/contact + WhatsApp)
  //    window.openRequestModal()                         → generic: shows a "Service" select
  //    window.openRequestModal({ plan: {...} }, trigger)   → from a pricing card: plan is locked
  //      plan = { id, name, price: "Starting from ₹1,699 one-time", currency: "INR" }
  const requestModal = document.getElementById('request-modal');
  (function setupLeadModal() {
    if (!requestModal) return;
    const panel = requestModal.querySelector('.modal-panel');
    const formState = document.getElementById('modal-form-state');
    const successState = document.getElementById('modal-success-state');
    if (!panel || !formState || !successState) return;

    const WA_NUMBER = '919186061401';
    const SERVICES = ['Premium Website', 'Landing Page', 'Graphic Design', 'Active Care', 'AI Automation', 'Custom Architecture', 'Not sure yet'];
    const PLACEHOLDERS = {
      website: "What's the website for? Pages you need, sites you like, and your timeline.",
      landing: 'What is the page for (ads, launch)? Which level, and by when?',
      graphic: 'What do you need designed? Posts, ads, logo... and by when?',
      care: 'Do you already have a website? Share the link and what you need looked after.',
      automation: 'What repetitive work should we automate? Tools you use today (WhatsApp, Sheets, CRM...).',
      custom: 'What are you building? Scope, users, timeline and budget range.',
      _default: 'A few words about your project, timeline, and budget.'
    };
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const HEX_ICON = '<svg class="lead-chip-hex" viewBox="0 0 16 18" aria-hidden="true"><path d="M8 0.8 15 4.8v8.4L8 17.2 1 13.2V4.8z" fill="currentColor"/></svg>';

    let currentPlan = null;
    let lastTrigger = null;
    let sending = false;
    let isOpen = false;

    const esc = (s) => String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const track = (name, data) => { if (window.HW_Analytics) window.HW_Analytics.track(name, data); };

    // UTM params: keep the first-touch values for the session
    function utmParams() {
      const keys = ['utm_source', 'utm_medium', 'utm_campaign'];
      const out = {};
      let stored = {};
      try { stored = JSON.parse(sessionStorage.getItem('hw_utm') || '{}') || {}; } catch (e) { stored = {}; }
      const qs = new URLSearchParams(location.search);
      keys.forEach((k) => { out[k] = (qs.get(k) || stored[k] || '').slice(0, 100); });
      try { if (keys.some((k) => qs.get(k))) sessionStorage.setItem('hw_utm', JSON.stringify(out)); } catch (e) {}
      return out;
    }
    utmParams();

    function normalizePhone(raw) {
      let s = String(raw || '').replace(/[\s().-]/g, '');
      if (s.startsWith('00')) s = '+' + s.slice(2);
      if (/^0\d{10}$/.test(s)) s = s.slice(1);   // same rule as lib/lead.js normalizePhone
      if (/^\d{10}$/.test(s)) s = '+91' + s;
      return /^\+[1-9]\d{6,14}$/.test(s) ? s : null;
    }

    function isMobile() {
      return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 900);
    }

    function field(id, label, control, extra) {
      return `<div class="form-field" data-field="${id}">
          <label class="form-label" for="lead-${id}">${label}</label>
          ${control}${extra || ''}
          <p class="lead-field-error" id="lead-${id}-error" hidden></p>
        </div>`;
    }

    function renderForm(plan) {
      const heading = plan ? `Let's build your ${esc(plan.name)}.` : "Tell us what you're building.";
      const chip = plan
        ? `<p class="lead-chip" aria-label="Selected plan: ${esc(plan.name)}, ${esc(plan.price)}">${HEX_ICON}<span><strong>${esc(plan.name)}</strong> · ${esc(plan.price)}</span></p>`
        : '';
      const serviceField = plan ? '' : field('service', 'Service',
        `<select id="lead-service" name="service" class="form-input form-select lead-select" required aria-describedby="lead-service-error">
            <option value="" selected disabled>Choose a service</option>
            ${SERVICES.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
          </select>`);
      const placeholder = (plan && PLACEHOLDERS[plan.id]) || PLACEHOLDERS._default;

      formState.innerHTML = `
        <div class="modal-header">
          <div class="modal-eyebrow"><span class="modal-eyebrow-dot"></span><span>Start a project</span></div>
          <h2 class="modal-h2" id="lead-modal-title">${heading}</h2>
          ${chip}
        </div>
        <form class="modal-form" id="project-request-form" novalidate>
          <div class="lead-hp" aria-hidden="true">
            <label for="req-hp">Leave this field empty</label>
            <input type="text" name="_hp_verify" id="req-hp" tabindex="-1" autocomplete="off" />
          </div>
          <input type="hidden" name="planId" value="${esc(plan ? plan.id : '')}" />
          <input type="hidden" name="planName" value="${esc(plan ? plan.name : '')}" />
          <input type="hidden" name="priceShown" value="${esc(plan ? plan.price : '')}" />
          <input type="hidden" name="currency" value="${esc(plan ? plan.currency : '')}" />
          <input type="hidden" name="pageUrl" value="" />
          <input type="hidden" name="utm_source" value="" />
          <input type="hidden" name="utm_medium" value="" />
          <input type="hidden" name="utm_campaign" value="" />
          <input type="hidden" name="timestamp" value="" />
          ${serviceField}
          ${field('name', 'Name', '<input type="text" id="lead-name" name="name" class="form-input" placeholder="Your name" autocomplete="name" maxlength="100" required aria-describedby="lead-name-error" />')}
          ${field('email', 'Email', '<input type="email" id="lead-email" name="email" class="form-input" placeholder="you@company.com" autocomplete="email" maxlength="254" required aria-describedby="lead-email-error" />')}
          ${field('whatsapp', 'WhatsApp number', '<input type="tel" id="lead-whatsapp" name="whatsapp" class="form-input" value="+91 " placeholder="+91 98765 43210" autocomplete="tel" inputmode="tel" maxlength="20" required aria-describedby="lead-whatsapp-hint lead-whatsapp-error" />',
            '<p class="lead-field-hint" id="lead-whatsapp-hint">Include your country code, e.g. +91 or +1.</p>')}
          ${field('project', 'Project', `<textarea id="lead-project" name="project" rows="4" class="form-textarea" maxlength="3000" placeholder="${esc(placeholder)}" aria-describedby="lead-project-error"></textarea>`)}
          <div class="modal-bottom-row">
            <span class="modal-note">We reply within 24 hours.</span>
            <p class="form-privacy-note" style="width:100%; margin-top:0.5rem;">We treat your data confidentially under the DPDP Act 2023. No spam, ever. Read our <a href="/privacy" target="_blank">Privacy Policy</a>.</p>
            <button type="submit" class="pill-btn pill-btn-dark" id="modal-submit-btn">
              <span class="pill-inner has-arrow">
                <span id="modal-submit-text">Send request</span>
                <span class="pill-badge">
                  <svg class="svg-icon arrow-icon-upright" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
                </span>
              </span>
            </button>
          </div>
        </form>`;

      const form = formState.querySelector('form');
      form.addEventListener('submit', onSubmit);
      form.addEventListener('input', (e) => {
        const wrap = e.target.closest('[data-field]');
        if (wrap && wrap.classList.contains('has-error')) setError(wrap.dataset.field, '');
      });
      form.addEventListener('change', (e) => {
        const wrap = e.target.closest('[data-field]');
        if (wrap && wrap.classList.contains('has-error')) setError(wrap.dataset.field, '');
      });
    }

    function setError(name, message) {
      const wrap = formState.querySelector(`[data-field="${name}"]`);
      if (!wrap) return;
      const control = wrap.querySelector('input, select, textarea');
      const err = wrap.querySelector('.lead-field-error');
      wrap.classList.toggle('has-error', !!message);
      if (control) {
        if (message) control.setAttribute('aria-invalid', 'true');
        else control.removeAttribute('aria-invalid');
      }
      if (err) { err.textContent = message || ''; err.hidden = !message; }
    }

    function readValues(form) {
      const fd = new FormData(form);
      const get = (k) => String(fd.get(k) || '');
      return {
        service: get('service'), name: get('name').trim(), email: get('email').trim(),
        whatsappRaw: get('whatsapp'), project: get('project').trim(), hp: get('_hp_verify')
      };
    }

    function validate(v) {
      const errors = {};
      if (!currentPlan && !v.service) errors.service = 'Please choose a service.';
      if (!v.name) errors.name = 'Please enter your name.';
      if (!v.email) errors.email = 'Please enter your email.';
      else if (!EMAIL_RE.test(v.email)) errors.email = 'Please enter a valid email address, like you@company.com.';
      const digits = v.whatsappRaw.replace(/[^\d]/g, '');
      if (!digits || v.whatsappRaw.replace(/\s/g, '') === '+91') errors.whatsapp = 'Please enter your WhatsApp number.';
      else if (!normalizePhone(v.whatsappRaw)) errors.whatsapp = 'Please enter a valid number with country code, e.g. +91 98765 43210.';
      return errors;
    }

    function buildLead(form, v) {
      const utm = utmParams();
      const plan = currentPlan;
      const lead = {
        name: v.name,
        email: v.email,
        whatsapp: normalizePhone(v.whatsappRaw),
        project: v.project,
        service: plan ? '' : v.service,
        planId: plan ? plan.id : '',
        planName: plan ? plan.name : v.service,
        priceShown: plan ? plan.price : '',
        currency: plan ? plan.currency : (function () { try { return localStorage.getItem('hw_currency') || ''; } catch (e) { return ''; } })(),
        pageUrl: location.href.slice(0, 500),
        utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign,
        timestamp: new Date().toISOString(),
        _hp_verify: v.hp
      };
      // Mirror into the hidden fields so the form always reflects what is sent
      ['planId', 'planName', 'priceShown', 'currency', 'pageUrl', 'utm_source', 'utm_medium', 'utm_campaign', 'timestamp'].forEach((k) => {
        if (form.elements[k]) form.elements[k].value = lead[k] || '';
      });
      return lead;
    }

    function whatsappMessage(lead) {
      const interest = lead.planName ? lead.planName + (lead.priceShown ? ` (${lead.priceShown})` : '') : 'a project';
      return [
        `Hi HeisenWorks! I'm ${lead.name}.`,
        `I'm interested in: ${interest}.`,
        `Project: ${lead.project || '-'}`,
        `Email: ${lead.email}`
      ].join('\n');
    }

    function whatsappUrl(lead) {
      return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(whatsappMessage(lead))}`;
    }

    function sendEmail(lead) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 12000) : null;
      return fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
        keepalive: true,               // survives the same-tab WhatsApp redirect on mobile
        signal: controller ? controller.signal : undefined
      })
        .then((res) => res.json().catch(() => ({})).then((data) => res.ok && (data.ok || data.success)))
        .catch(() => false)
        .finally(() => { if (timer) clearTimeout(timer); });
    }

    function setSending(on) {
      sending = on;
      const btn = document.getElementById('modal-submit-btn');
      const txt = document.getElementById('modal-submit-text');
      if (btn) { btn.disabled = on; btn.setAttribute('aria-busy', on ? 'true' : 'false'); }
      if (txt) txt.textContent = on ? 'Sending…' : 'Send request';
    }

    function showResult(lead, waUrl, emailOk) {
      const first = esc((lead.name || '').split(/\s+/)[0] || 'there');
      successState.innerHTML = `
        ${emailOk ? `<div class="lead-check" aria-hidden="true">
          <svg viewBox="0 0 52 52"><circle class="lead-check-circle" cx="26" cy="26" r="24" fill="none" /><path class="lead-check-mark" fill="none" d="M15.5 27.5 22.5 34.5 37 19" /></svg>
        </div>` : ''}
        <h2 class="success-h2 modal-h2 lead-success-h2" id="lead-success-title" tabindex="-1">${emailOk ? `Thanks, ${first}! We've got your request.` : `Thanks, ${first}! One more step.`}</h2>
        ${emailOk
          ? '<p class="success-desc lead-success-line">A copy is on its way to our inbox.</p>'
          : '<p class="lead-email-failed" role="alert">Couldn\'t send by email. Please continue on WhatsApp or write to <a href="mailto:info@heisenworks.in">info@heisenworks.in</a>.</p>'}
        <a class="pill-btn pill-btn-dark lead-wa-btn" href="${esc(waUrl)}" target="_blank" rel="noopener noreferrer">
          <span class="pill-inner no-arrow"><span>Open WhatsApp chat</span></span>
        </a>
        <p class="modal-note lead-reply-note">We reply within 24 hours.</p>
        <p class="form-privacy-note">We treat your data confidentially under the DPDP Act 2023. No spam, ever. Read our <a href="/privacy" target="_blank">Privacy Policy</a>.</p>`;
      formState.style.display = 'none';
      successState.style.display = 'flex';
      requestModal.setAttribute('aria-labelledby', 'lead-success-title');
      const h = document.getElementById('lead-success-title');
      if (h && isOpen) h.focus({ preventScroll: true });
    }

    function onSubmit(e) {
      e.preventDefault();
      if (sending) return;
      const form = e.currentTarget;
      const v = readValues(form);

      // Honeypot: quietly stop bots without sending anything
      if (v.hp.trim() !== '') { console.warn('Spam honeypot triggered'); return; }

      const errors = validate(v);
      ['service', 'name', 'email', 'whatsapp', 'project'].forEach((k) => setError(k, errors[k] || ''));
      const firstInvalid = ['service', 'name', 'email', 'whatsapp'].find((k) => errors[k]);
      if (firstInvalid) {
        const el = document.getElementById(`lead-${firstInvalid}`);
        if (el) el.focus();
        return;
      }

      const lead = buildLead(form, v);
      const waUrl = whatsappUrl(lead);
      const mobile = isMobile();
      setSending(true);

      // Desktop: open WhatsApp synchronously inside the submit handler (before any await) so popup blockers allow it.
      if (!mobile) {
        try {
          const w = window.open(waUrl, '_blank');
          if (w) w.opener = null;
        } catch (err) { /* blocked: the success screen offers the button */ }
      }

      // Send the email in the background
      const emailRequest = sendEmail(lead);

      // Mobile: the request has started (keepalive), now hand over to WhatsApp in the same tab.
      if (mobile) window.location.href = waUrl;

      emailRequest.then((ok) => {
        showResult(lead, waUrl, ok);
        track(ok ? 'contact_submit_success' : 'contact_submit_error', { plan: lead.planId || lead.planName || 'general' });
      }).finally(() => setSending(false));
    }

    // ---------------------------------------------------------------- open / close
    function focusables() {
      return Array.from(panel.querySelectorAll('a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter((el) => el.offsetParent !== null && !el.closest('.lead-hp'));
    }

    function lockScroll(on) {
      if (window.HW_scrollLock) { on ? window.HW_scrollLock.stop() : window.HW_scrollLock.start(); return; }
      document.body.style.overflow = on ? 'hidden' : '';
      if (window.__lenis) { try { on ? window.__lenis.stop() : window.__lenis.start(); } catch (e) {} }
    }

    window.openRequestModal = function (arg, trigger) {
      const plan = arg && typeof arg === 'object' && arg.plan ? arg.plan : null;
      currentPlan = plan;
      lastTrigger = trigger || (document.activeElement !== document.body ? document.activeElement : null);
      sending = false;
      renderForm(plan);
      formState.style.display = 'block';
      successState.style.display = 'none';
      successState.innerHTML = '';
      requestModal.removeAttribute('aria-label');
      requestModal.setAttribute('aria-labelledby', 'lead-modal-title');
      requestModal.classList.add('open');
      isOpen = true;
      lockScroll(true);
      setTimeout(() => {
        const first = document.getElementById(plan ? 'lead-name' : 'lead-service');
        if (first) first.focus({ preventScroll: true });
      }, 80);
      track('contact_modal_open', { plan: plan ? plan.id : (typeof arg === 'string' ? arg : 'general') });
    };

    window.closeRequestModal = function () {
      if (!isOpen) return;
      isOpen = false;
      requestModal.classList.remove('open');
      lockScroll(false);
      const back = lastTrigger;
      lastTrigger = null;
      if (back && document.contains(back) && typeof back.focus === 'function') {
        setTimeout(() => back.focus({ preventScroll: true }), 0);
      }
    };

    requestModal.addEventListener('click', (e) => {
      if (e.target === requestModal) window.closeRequestModal();
    });

    // Focus trap
    requestModal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || !isOpen) return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  })();

  // Escape closes any open overlay
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (typeof window.closeRequestModal === 'function') window.closeRequestModal();
      if (typeof window.closeNavMenu === 'function') window.closeNavMenu();
      if (typeof window.closeReviewModal === 'function') window.closeReviewModal();
    }
  });

  // 6. REVIEWS ARE LEFT ON GOOGLE
  // There is no on-site review form any more. Pages whose "Leave a review" buttons still call
  // window.openReviewModal() get Google's write-review page in a new tab.
  window.openReviewModal = function () {
    const url = window.HW_GOOGLE_WRITE_REVIEW_URL ||
      (window.HW_GOOGLE_REVIEWS && window.HW_GOOGLE_REVIEWS.place && window.HW_GOOGLE_REVIEWS.place.writeReviewUrl) ||
      'https://search.google.com/local/writereview?placeid=ChIJFdG7apNjTAwRyG-Czax4ie4';
    window.open(url, '_blank', 'noopener');
    if (window.HW_Analytics) window.HW_Analytics.track('google_review_click');
  };

  // 7. FLOATING WHATSAPP TRACKING
  const waBtn = document.querySelector('.floating-whatsapp-btn');
  if (waBtn) {
    waBtn.addEventListener('click', () => {
      window.HW_Analytics.track('whatsapp_click', { placement: 'floating_button' });
    });
  }

  // 8. COOKIE CONSENT BANNER
  const cookieBanner = document.getElementById('cookie-banner');
  if (cookieBanner) {
    const consent = localStorage.getItem('hw_cookie_consent');
    if (!consent) {
      setTimeout(() => cookieBanner.classList.add('show'), 2000);
    }
  }
  window.acceptCookies = function () {
    localStorage.setItem('hw_cookie_consent', 'accepted');
    if (cookieBanner) cookieBanner.classList.remove('show');
    window.HW_Analytics.track('cookie_consent_accepted');
  };
  window.dismissCookies = function () {
    localStorage.setItem('hw_cookie_consent', 'dismissed');
    if (cookieBanner) cookieBanner.classList.remove('show');
  };

})();

