/**
 * Sky Travel J&M — single owner of WhatsApp and contact-link GA4 events.
 * page-init.js loads this on pages without a static script tag.
 * Contact form outcomes belong exclusively to contact-tracking.js.
 */
(function () {
  'use strict';

  // A static tag and the shared loader may both request this file.
  if (window.SkyTravelTracking) return;

  var language = (document.documentElement.lang || 'en').toLowerCase().split('-')[0];
  var isSpanish = language === 'es';
  var alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  var issuedRefs = Object.create(null);
  var tripNames = {
    '/medjugorje': {
      es: 'Peregrinación a Medjugorje 2027',
      en: 'Medjugorje 2027 pilgrimage'
    },
    '/peregrinacion-tierrasanta-2027': {
      es: 'Peregrinación a Tierra Santa y Medjugorje (marzo–abril 2027)',
      en: 'Holy Land & Medjugorje pilgrimage (March–April 2027)'
    },
    '/tierrasanta2026': {
      es: 'Peregrinación a Tierra Santa y Medjugorje (septiembre–octubre 2027)',
      en: 'Holy Land & Medjugorje pilgrimage (September–October 2027)'
    },
    '/peregrinacion_bajo_el_manto_de_maria': {
      es: 'Peregrinación Bajo el Manto de María 2027',
      en: 'Under Mary’s Mantle 2027 pilgrimage'
    },
    '/peregrinacion_mexico_cancun_2027': {
      es: 'Peregrinación a Guadalupe, México y Cancún 2027',
      en: 'Guadalupe, Mexico & Cancún 2027 pilgrimage'
    }
  };

  function matchesHost(host, domain) {
    return host === domain || host.endsWith('.' + domain);
  }

  function isOwnHost(host) {
    return matchesHost(host, 'skytraveljm.com') || host === window.location.hostname ||
      /^deploy-preview-\d+--[^.]+\.netlify\.app$/.test(host);
  }

  function detectSource() {
    var utmSource = new URLSearchParams(window.location.search).get('utm_source');
    if (utmSource) {
      var aliases = {
        facebook: 'Facebook', fb: 'Facebook', instagram: 'Instagram', ig: 'Instagram',
        whatsapp: 'WhatsApp', wa: 'WhatsApp', email: 'Email', newsletter: 'Email'
      };
      return aliases[utmSource.toLowerCase()] || utmSource;
    }

    var host = '';
    try { host = new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, ''); } catch (e) {}
    if (!host || isOwnHost(host)) return isSpanish ? 'directo' : 'direct';
    // Gemini has to precede the broader Google match.
    if (/^gemini\.google\.[a-z.]+$/.test(host)) return 'Gemini';
    if (/(^|\.)google\.[a-z.]+$/.test(host)) return 'Google';
    if (matchesHost(host, 'bing.com')) return 'Bing';
    if (/(^|\.)yahoo\.[a-z.]+$/.test(host)) return 'Yahoo';
    if (matchesHost(host, 'duckduckgo.com')) return 'DuckDuckGo';
    if (matchesHost(host, 'chatgpt.com') || host === 'chat.openai.com') return 'ChatGPT';
    if (matchesHost(host, 'perplexity.ai')) return 'Perplexity';
    if (host === 'copilot.microsoft.com') return 'Copilot';
    if (matchesHost(host, 'claude.ai')) return 'Claude';
    if (matchesHost(host, 'facebook.com') || host === 'fb.me') return 'Facebook';
    if (matchesHost(host, 'instagram.com')) return 'Instagram';
    if (matchesHost(host, 'tiktok.com')) return 'TikTok';
    if (matchesHost(host, 'youtube.com')) return 'YouTube';
    if (matchesHost(host, 'centromedjugorje.org')) return 'Centro Medjugorje';
    if (matchesHost(host, 'wa.me') || matchesHost(host, 'whatsapp.com')) return 'WhatsApp';
    return host;
  }

  function firstVisitContext() {
    var source;
    var landing;
    try {
      source = sessionStorage.getItem('stjm_src');
      landing = sessionStorage.getItem('stjm_landing_path');
    } catch (e) {}
    // Capture on the first page, even if the visitor only contacts us on a later page.
    source = source || detectSource();
    landing = landing || window.location.pathname;
    try {
      sessionStorage.setItem('stjm_src', source);
      sessionStorage.setItem('stjm_landing_path', landing);
    } catch (e) {}
    return { source_label: source, landing_path: landing };
  }

  var visit = firstVisitContext();

  function fireGtagEvent(eventName, extra) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, Object.assign({
      page_path: window.location.pathname,
      page_language: language
    }, extra || {}));
  }

  function newLeadReference() {
    var bytes = new Uint8Array(5);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    // The alphabet has 32 characters, so byte modulo 32 has no sampling bias.
    var code = Array.from(bytes, function (byte) { return alphabet[byte % alphabet.length]; }).join('');
    // Keep refs distinct on this page even if the random generator repeats a value.
    while (issuedRefs[code]) {
      var chars = code.split('');
      for (var index = chars.length - 1; index >= 0; index--) {
        var next = (alphabet.indexOf(chars[index]) + 1) % alphabet.length;
        chars[index] = alphabet[next];
        if (next) break;
      }
      code = chars.join('');
    }
    issuedRefs[code] = true;
    return code;
  }

  function clipText(text, limit) {
    // Never leave half of an emoji/surrogate pair for encodeURIComponent to reject.
    return text.slice(0, Math.max(0, limit)).replace(/[\uD800-\uDBFF]$/, '');
  }

  function clipPageLabel(text, limit) {
    if (text.length <= limit) return text;
    // Reserve the ellipsis and use clipText to avoid splitting a surrogate pair.
    var prefix = clipText(text, limit - 1);
    if (/\S/.test(text.charAt(prefix.length))) {
      var boundary = prefix.search(/\s+\S*$/);
      prefix = boundary === -1 ? '' : prefix.slice(0, boundary);
    }
    return prefix.trimEnd() + '…';
  }

  function pageDetails() {
    var path = window.location.pathname.toLowerCase().replace(/\/$/, '').replace(/\.html$/, '')
      .replace(/^\/peregrinaciones-2027\//, '/').replace(/-es$/, '');
    var trip = tripNames[path];
    return {
      trip: trip ? trip[isSpanish ? 'es' : 'en'] : '',
      label: trip ? trip[isSpanish ? 'es' : 'en'] : clipPageLabel(document.title.split(' | ')[0].trim(), 90),
      link: window.location.hostname.replace(/^www\./, '') + window.location.pathname,
      blog: window.location.pathname.indexOf('/blog/') === 0
    };
  }

  function buildMessage(page, code) {
    var intro;
    if (page.trip) {
      intro = isSpanish
        ? 'Hola, Sky Travel J&M. Me interesa la ' + page.trip.replace(/^Peregrinación/, 'peregrinación') + '. ¿Me pueden enviar fechas y precio?'
        : "Hello, Sky Travel J&M. I'm interested in the " + page.trip + '. Could you send me dates and price?';
    } else if (page.blog) {
      intro = isSpanish
        ? 'Hola, Sky Travel J&M. Leí su artículo «' + page.label + '» y me gustaría recibir información sobre sus peregrinaciones.'
        : 'Hello, Sky Travel J&M. I read your article "' + page.label + '" and I\'d like information about your pilgrimages.';
    } else {
      intro = isSpanish
        ? 'Hola, Sky Travel J&M. Me gustaría recibir información sobre sus peregrinaciones.'
        : "Hello, Sky Travel J&M. I'd like information about your pilgrimages.";
    }
    var pageLine = (isSpanish ? 'Página: ' : 'Page: ') + (page.blog ? '' : page.label + ' — ') + page.link;
    var ending = isSpanish ? 'Escribo desde (ciudad, estado o país): ' : "I'm writing from (city, state or country): ";
    var sourcePrefix = isSpanish ? ' · Los encontré en: ' : ' · Found you on: ';
    var base = intro + '\n(' + pageLine;
    var suffix = ' · Ref. ' + code + ')\n' + ending;
    var source = visit.source_label;
    var attribution = '';
    if (source !== 'direct' && source !== 'directo') {
      // Unknown campaign source values are kept as written; bound only their message display
      // if an unusually long value would push the complete message beyond 499 characters.
      var budget = Math.max(0, 499 - base.length - suffix.length - sourcePrefix.length);
      attribution = sourcePrefix + (source.length > budget ? clipText(source, budget - 1) + '…' : source);
    }
    return base + attribution + suffix;
  }

  function handleLinkActivation(event) {
    // Modern browsers use auxclick for middle-click, not a second primary click.
    if ((event.type === 'auxclick' && event.button !== 1) ||
        (event.type === 'click' && event.button !== 0)) return;
    var link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;

    var url = new URL(link.href, window.location.href);
    // Share links (wa.me/?text=...) and other phone numbers are not leads.
    if (url.protocol === 'https:' && url.hostname === 'wa.me' &&
        /^\/13056452625\/?$/.test(url.pathname)) {
      var page = pageDetails();
      var reference = newLeadReference();
      // Rewrite synchronously; normal, keyboard, Ctrl/Cmd and middle clicks all use this href.
      link.href = 'https://wa.me/13056452625?text=' + encodeURIComponent(buildMessage(page, reference));
      fireGtagEvent('whatsapp_click', {
        section: link.dataset.section || (link.classList.contains('stjm-wa-float') ? 'floating_button' : 'unknown'),
        page_label: clipText(page.label, 100),
        lead_ref: reference,
        source_label: visit.source_label,
        landing_path: visit.landing_path
      });
      return;
    }

    if (event.type !== 'click') return;
    var method = { 'tel:': 'call', 'sms:': 'sms', 'mailto:': 'email' }[url.protocol];
    if (method) fireGtagEvent('contact_click', { method: method });
  }

  document.addEventListener('click', handleLinkActivation);
  document.addEventListener('auxclick', handleLinkActivation);
  window.SkyTravelTracking = { fireEvent: fireGtagEvent };
})();
