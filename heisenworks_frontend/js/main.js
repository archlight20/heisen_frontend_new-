/**
 * HeisenWorks Shared Client Engine
 * - Dynamic Asia/Kolkata IST Studio Clock
 * - Extensible Analytics Event Bus (window.HW_Analytics)
 * - Hardened Contact Request Modal with 10s Timeout & Failure Fallback
 * - Review Submission Pipeline to /api/reviews
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
      document.body.style.overflow = 'hidden';
      window.HW_Analytics.track('nav_menu_open');
    }
  };
  window.closeNavMenu = function () {
    if (navMenu) {
      navMenu.classList.remove('open');
      document.body.style.overflow = '';
    }
  };

  // 5. CONTACT REQUEST MODAL & HARDENED SUBMISSION
  const requestModal = document.getElementById('request-modal');
  const modalFormState = document.getElementById('modal-form-state');
  const modalSuccessState = document.getElementById('modal-success-state');
  const modalErrorBanner = document.getElementById('modal-error-banner');
  const projectForm = document.getElementById('project-request-form');
  const submitBtn = document.getElementById('modal-submit-btn');
  const submitText = document.getElementById('modal-submit-text');

  window.openRequestModal = function (prefillContext) {
    if (requestModal) {
      requestModal.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (modalErrorBanner) modalErrorBanner.style.display = 'none';
      if (prefillContext && projectForm) {
        const projInput = document.getElementById('req-project');
        if (projInput && !projInput.value) {
          projInput.value = `Regarding ${prefillContext}: `;
        }
      }
      window.HW_Analytics.track('contact_modal_open', { context: prefillContext || 'general' });
    }
  };

  window.closeRequestModal = function () {
    if (requestModal) {
      requestModal.classList.remove('open');
      document.body.style.overflow = '';
      setTimeout(() => {
        if (modalFormState) modalFormState.style.display = 'block';
        if (modalSuccessState) modalSuccessState.style.display = 'none';
        if (modalErrorBanner) modalErrorBanner.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.textContent = 'Send request';
      }, 300);
    }
  };

  if (requestModal) {
    requestModal.addEventListener('click', (e) => {
      if (e.target === requestModal) window.closeRequestModal();
    });
  }

  // Escape key closes modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeRequestModal();
      window.closeNavMenu();
      if (typeof window.closeReviewModal === 'function') window.closeReviewModal();
    }
  });

  // Contact form submission logic
  if (projectForm) {
    projectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (modalErrorBanner) modalErrorBanner.style.display = 'none';

      const nameVal = document.getElementById('req-name')?.value || '';
      const emailVal = document.getElementById('req-email')?.value || '';
      const projVal = document.getElementById('req-project')?.value || '';
      const hpVal = document.getElementById('req-hp')?.value || '';

      // Honeypot check
      if (hpVal && hpVal.trim() !== '') {
        console.warn('Spam detected via honeypot.');
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      if (submitText) submitText.textContent = 'Transmitting…';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameVal,
            email: emailVal,
            project: projVal,
            _hp_verify: hpVal
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`HTTP error code ${res.status}`);
        }

        const data = await res.json();
        if (data.ok || data.success) {
          // Success State
          if (modalFormState) modalFormState.style.display = 'none';
          if (modalSuccessState) modalSuccessState.style.display = 'flex';
          projectForm.reset();
          window.HW_Analytics.track('contact_submit_success', { name: nameVal });
        } else {
          throw new Error(data.error || 'Server rejected submission');
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('Contact submission error:', err);
        // Do NOT claim success! Preserve inputs and reveal error fallback
        if (modalErrorBanner) {
          modalErrorBanner.style.display = 'block';
        }
        window.HW_Analytics.track('contact_submit_error', { error: err.message });
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.textContent = 'Send request';
      }
    });
  }

  // 6. REVIEW MODAL & SUBMISSION
  const reviewModal = document.getElementById('review-modal');
  const reviewFormState = document.getElementById('review-form-state');
  const reviewSuccessState = document.getElementById('review-success-state');
  const clientReviewForm = document.getElementById('client-review-form');
  const reviewSubmitBtn = document.getElementById('review-submit-btn');
  const reviewSubmitText = document.getElementById('review-submit-text');

  window.openReviewModal = function () {
    if (reviewModal) {
      reviewModal.classList.add('open');
      document.body.style.overflow = 'hidden';
      window.HW_Analytics.track('review_modal_open');
    }
  };

  window.closeReviewModal = function () {
    if (reviewModal) {
      reviewModal.classList.remove('open');
      document.body.style.overflow = '';
      setTimeout(() => {
        if (reviewFormState) reviewFormState.style.display = 'block';
        if (reviewSuccessState) reviewSuccessState.style.display = 'none';
        if (reviewSubmitBtn) reviewSubmitBtn.disabled = false;
        if (reviewSubmitText) reviewSubmitText.textContent = 'Post review';
      }, 300);
    }
  };

  if (reviewModal) {
    reviewModal.addEventListener('click', (e) => {
      if (e.target === reviewModal) window.closeReviewModal();
    });
  }

  if (clientReviewForm) {
    clientReviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameVal = document.getElementById('review-name')?.value || '';
      const tagVal = document.getElementById('review-tag')?.value || '';
      const textVal = document.getElementById('review-desc')?.value || '';
      const starsVal = document.getElementById('review-stars-val')?.value || '5';
      const hpVal = document.getElementById('review-hp')?.value || '';

      if (hpVal && hpVal.trim() !== '') return;

      if (reviewSubmitBtn) reviewSubmitBtn.disabled = true;
      if (reviewSubmitText) reviewSubmitText.textContent = 'Submitting…';

      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameVal,
            company: tagVal,
            role: 'Client',
            rating: parseInt(starsVal, 10),
            reviewText: textVal,
            _hp_verify: hpVal
          })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          if (reviewFormState) reviewFormState.style.display = 'none';
          if (reviewSuccessState) reviewSuccessState.style.display = 'flex';
          clientReviewForm.reset();
          window.HW_Analytics.track('review_submitted', { name: nameVal });
        } else {
          alert('Could not submit review. Please try again or reach out on WhatsApp.');
        }
      } catch (err) {
        console.error('Review submit error:', err);
        alert('Connection error. Please try again or message us on WhatsApp.');
      } finally {
        if (reviewSubmitBtn) reviewSubmitBtn.disabled = false;
        if (reviewSubmitText) reviewSubmitText.textContent = 'Post review';
      }
    });
  }

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

