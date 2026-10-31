/**
 * Sky Travel J&M — single owner of WhatsApp and contact-link GA4 events.
 * page-init.js loads this on pages without a static script tag.
 * Contact form outcomes belong exclusively to contact-tracking.js.
 */
(function () {
  'use strict';

  // A static tag and the shared loader may both request this file.
  if (window.SkyTravelTracking) return;

  function fireGtagEvent(eventName, extra) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, Object.assign({
      page_path: window.location.pathname,
      page_language: (document.documentElement.lang || 'en').toLowerCase().split('-')[0]
    }, extra || {}));
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;

    var url = new URL(link.href, window.location.href);
    // Share links (wa.me/?text=...) and other phone numbers are not leads.
    if (url.protocol === 'https:' && url.hostname === 'wa.me' &&
        /^\/13056452625\/?$/.test(url.pathname)) {
      fireGtagEvent('whatsapp_click', { section: link.dataset.section || 'unknown' });
      return;
    }

    var method = { 'tel:': 'call', 'sms:': 'sms', 'mailto:': 'email' }[url.protocol];
    if (method) fireGtagEvent('contact_click', { method: method });
  });

  window.SkyTravelTracking = { fireEvent: fireGtagEvent };
})();
