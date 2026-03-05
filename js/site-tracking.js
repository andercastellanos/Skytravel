/**
 * Sky Travel JM — Site-wide GA4 conversion tracking
 * Handles whatsapp_click and contact_form_success via event delegation.
 * Loaded normally (not injected) so listeners are always active.
 */
(function () {
  'use strict';

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function getPageContext() {
    var pathname = window.location.pathname;
    var pagePath = pathname === '/' ? 'home' : pathname.replace(/^\//, '');
    var language = pathname.indexOf('-es') !== -1 || pathname.endsWith('-es') ? 'es' : 'en';
    return {
      page_path: pagePath,
      page_name: pagePath,
      page_language: language,
      page_type: 'site-wide'
    };
  }

  function fireGtagEvent(eventName, extra) {
    if (typeof gtag !== 'function') return;
    var payload = Object.assign(getPageContext(), extra || {});
    gtag('event', eventName, payload);
  }

  function isLikelyValidLeadForm(form) {
    if (!form) return false;
    if (typeof form.checkValidity === 'function' && !form.checkValidity()) return false;

    var requiredIds = ['firstName', 'lastName', 'email', 'phone', 'preferredContact', 'pilgrimageInterest'];
    for (var i = 0; i < requiredIds.length; i++) {
      var field = form.querySelector('#' + requiredIds[i]);
      if (!field || !String(field.value || '').trim()) return false;
    }

    var emailField = form.querySelector('#email');
    var emailValue = String(emailField.value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) return false;

    var phoneField = form.querySelector('#phone');
    var cleanedPhone = String(phoneField.value || '').replace(/[\s\-\(\)]/g, '');
    if (!/^\+?\d{7,15}$/.test(cleanedPhone)) return false;

    var pilgrimageField = form.querySelector('#pilgrimageInterest');
    if (String(pilgrimageField.value || '').trim().length < 2) return false;

    var consentField = form.querySelector('#consentContact');
    if (!consentField || !consentField.checked) return false;

    var honeypotField = form.querySelector('#website');
    if (honeypotField && String(honeypotField.value || '').trim()) return false;

    return true;
  }

  // ─── WhatsApp click tracking ─────────────────────────────────────────────────

  var lastWhatsAppFired = 0;

  document.addEventListener('click', function (e) {
    var now = Date.now();
    var el = e.target.closest('[data-event="whatsapp_click"]');
    var section;

    if (el) {
      section = el.dataset.section || 'unknown';
    } else {
      el = e.target.closest('a[href^="https://wa.me/"]');
      if (el) {
        section = 'unknown';
      }
    }

    if (!el) return;
    if (now - lastWhatsAppFired < 500) return;

    lastWhatsAppFired = now;
    fireGtagEvent('whatsapp_click', { section: section });
  });

  // ─── Form submit tracking ────────────────────────────────────────────────────

  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'contact-form') return;
    if (window.__skyTravelHasInlineWhatsappTracking === true) return;
    if (!isLikelyValidLeadForm(e.target)) return;

    fireGtagEvent('form_submit', { section: 'contact-form' });
    fireGtagEvent('contact_form_success', { section: 'contact-form' });
    console.log('[SkyTravel Tracking] contact_form_success fired', window.location.pathname);
  });

  // ─── Public API ──────────────────────────────────────────────────────────────

  window.SkyTravelTracking = { fireEvent: fireGtagEvent };

})();
