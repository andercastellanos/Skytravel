'use strict';

/* ============================================================
   experience-generator.js
   Client-side JS for the experience/gallery page creator form.
   Handles dynamic rows, validation, HTML generation & ZIP download.
   ============================================================ */

// --------------- Utility helpers ---------------

function translateText(text, from, to) {
  if (!text.trim()) return Promise.resolve('');
  var placeholders = [];
  var protected_ = text.replace(/\d+\s*[×x]\s*[€$]?\s*[\d.,]+|[€$]\s?[\d.,]+[\d]|[A-Z]{3}\s?[\d.,]+[\d]|\d[\d.,]+\d/gi, function(match) {
    placeholders.push(match);
    return '{{P' + (placeholders.length - 1) + '}}';
  });
  var langPair = from + '|' + to;
  return fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(protected_) + '&langpair=' + langPair + '&de=info@skytraveljm.com')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var result = protected_;
      if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
        result = data.responseData.translatedText;
      }
      for (var i = 0; i < placeholders.length; i++) {
        result = result.replace('{{P' + i + '}}', placeholders[i]);
        result = result.replace('{{p' + i + '}}', placeholders[i]);
        result = result.replace('{{ P' + i + ' }}', placeholders[i]);
      }
      return result;
    })
    .catch(function() { return text; });
}

async function autoPopulateAllFields() {
  var pairs = [['en', 'es'], ['es', 'en']];
  var promises = [];
  for (var p = 0; p < pairs.length; p++) {
    var srcLang = pairs[p][0];
    var dstLang = pairs[p][1];
    var srcSuffix = '-' + srcLang;
    var dstSuffix = '-' + dstLang;
    document.querySelectorAll('.lang-field.lang-' + srcLang + ' input, .lang-field.lang-' + srcLang + ' textarea').forEach(function(srcEl) {
      var srcId = srcEl.id || '';
      if (!srcId.endsWith(srcSuffix)) return;
      var dstId = srcId.slice(0, -srcSuffix.length) + dstSuffix;
      var dstEl = document.getElementById(dstId);
      if (dstEl && !dstEl.value.trim() && srcEl.value.trim()) {
        promises.push(translateText(srcEl.value, srcLang, dstLang).then(function(translated) { dstEl.value = translated; }));
      }
    });
    document.querySelectorAll('.dynamic-card').forEach(function(card) {
      card.querySelectorAll('.lang-field.lang-' + srcLang + ' input, .lang-field.lang-' + srcLang + ' textarea').forEach(function(srcEl) {
        var cls = Array.from(srcEl.classList).find(function(c) { return c.endsWith(srcSuffix); });
        if (!cls) return;
        var dstCls = cls.slice(0, -srcSuffix.length) + dstSuffix;
        var dstEl = card.querySelector('.' + dstCls);
        if (dstEl && !dstEl.value.trim() && srcEl.value.trim()) {
          promises.push(translateText(srcEl.value, srcLang, dstLang).then(function(translated) { dstEl.value = translated; }));
        }
      });
    });
  }
  await Promise.all(promises);
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showToast(msg, isError = true) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#c41e3a' : '#27ae60';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function currentLang() {
  var active = document.querySelector('.lang-toggle .lang-btn.active');
  return active ? active.dataset.lang : 'en';
}

function countRows(containerId) {
  return document.querySelectorAll('#' + containerId + ' .dynamic-card').length;
}

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function switchToLang(lang) {
  document.querySelectorAll('.lang-toggle .lang-btn').forEach(function(b) { b.classList.remove('active'); });
  var target = document.querySelector('.lang-toggle .lang-btn[data-lang="' + lang + '"]');
  if (target) target.classList.add('active');
  document.querySelectorAll('.lang-field').forEach(function(el) {
    el.style.display = el.classList.contains('lang-' + lang) ? '' : 'none';
  });
}

// --------------- LIMITS ---------------

const LIMITS = { descriptionBlocks: 10, itinerary: 10, galleryImages: 50, links: 10, faq: 10 };

// --------------- Dynamic row management ---------------

function addDescriptionBlock() {
  if (countRows('description-blocks-list') >= LIMITS.descriptionBlocks) {
    showToast('M\u00e1ximo ' + LIMITS.descriptionBlocks + ' bloques de descripci\u00f3n permitidos');
    return;
  }
  var lang = currentLang();
  var enD = lang === 'en' ? '' : 'display:none';
  var esD = lang === 'es' ? '' : 'display:none';
  var n = countRows('description-blocks-list') + 1;
  const html = `<div class="dynamic-card">
  <button type="button" class="remove-row-btn">&times;</button>
  <div class="form-row">
    <div class="form-group lang-field lang-en" style="${enD}">
      <label>Encabezado h2 ${n} (EN) <small>(opcional)</small></label>
      <input type="text" class="form-input desc-heading-en" placeholder="Section heading">
    </div>
    <div class="form-group lang-field lang-es" style="${esD}">
      <label>Encabezado h2 ${n} (ES) <small>(opcional)</small></label>
      <input type="text" class="form-input desc-heading-es" placeholder="Encabezado de secci\u00f3n">
    </div>
  </div>
  <div class="form-row">
    <div class="form-group full-width lang-field lang-en" style="${enD}">
      <label>P\u00e1rrafo ${n} (EN)</label>
      <textarea class="form-input desc-text-en" rows="3"></textarea>
      <span class="field-hint">Escriba el texto normalmente. Las palabras que coincidan con los Enlaces Internos se convertir\u00e1n en links autom\u00e1ticamente.</span>
    </div>
    <div class="form-group full-width lang-field lang-es" style="${esD}">
      <label>P\u00e1rrafo ${n} (ES)</label>
      <textarea class="form-input desc-text-es" rows="3"></textarea>
      <span class="field-hint">Escriba el texto normalmente. Las palabras que coincidan con los Enlaces Internos se convertir\u00e1n en links autom\u00e1ticamente.</span>
    </div>
  </div>
</div>`;
  document.getElementById('description-blocks-list').insertAdjacentHTML('beforeend', html);
}

function addInternalLink() {
  if (countRows('internal-links-list') >= LIMITS.links) {
    showToast('M\u00e1ximo ' + LIMITS.links + ' enlaces internos permitidos');
    return;
  }
  var lang = currentLang();
  var enD = lang === 'en' ? '' : 'display:none';
  var esD = lang === 'es' ? '' : 'display:none';
  const html = `<div class="dynamic-card">
  <button type="button" class="remove-row-btn">&times;</button>
  <div class="form-row">
    <div class="form-group"><label>URL</label><input type="text" class="form-input link-url" placeholder="/experiences/medjugorje2024"></div>
    <div class="form-group lang-field lang-en" style="${enD}"><label>Texto en el p\u00e1rrafo</label><input type="text" class="form-input link-label-en" placeholder="Medjugorje 2024"></div>
    <div class="form-group lang-field lang-es" style="${esD}"><label>Texto en el p\u00e1rrafo</label><input type="text" class="form-input link-label-es" placeholder="Medjugorje 2024"></div>
  </div>
</div>`;
  document.getElementById('internal-links-list').insertAdjacentHTML('beforeend', html);
}

function addFaq() {
  if (countRows('faq-list') >= LIMITS.faq) {
    showToast('M\u00e1ximo ' + LIMITS.faq + ' preguntas frecuentes permitidas');
    return;
  }
  var lang = currentLang();
  var enD = lang === 'en' ? '' : 'display:none';
  var esD = lang === 'es' ? '' : 'display:none';
  var n = countRows('faq-list') + 1;
  const html = `<div class="dynamic-card">
  <button type="button" class="remove-row-btn">&times;</button>
  <div class="form-row">
    <div class="form-group lang-field lang-en" style="${enD}">
      <label>Pregunta ${n} (EN)</label>
      <input type="text" class="form-input faq-question-en" placeholder="When did this pilgrimage take place?">
    </div>
    <div class="form-group lang-field lang-es" style="${esD}">
      <label>Pregunta ${n} (ES)</label>
      <input type="text" class="form-input faq-question-es" placeholder="\u00bfCu\u00e1ndo se realiz\u00f3 esta peregrinaci\u00f3n?">
    </div>
  </div>
  <div class="form-row">
    <div class="form-group full-width lang-field lang-en" style="${enD}">
      <label>Respuesta ${n} (EN)</label>
      <textarea class="form-input faq-answer-en" rows="3"></textarea>
    </div>
    <div class="form-group full-width lang-field lang-es" style="${esD}">
      <label>Respuesta ${n} (ES)</label>
      <textarea class="form-input faq-answer-es" rows="3"></textarea>
    </div>
  </div>
</div>`;
  document.getElementById('faq-list').insertAdjacentHTML('beforeend', html);
}

function addItineraryItem() {
  if (countRows('itinerary-list') >= LIMITS.itinerary) {
    showToast('M\u00e1ximo ' + LIMITS.itinerary + ' elementos de itinerario permitidos');
    return;
  }
  var lang = currentLang();
  var enD = lang === 'en' ? '' : 'display:none';
  var esD = lang === 'es' ? '' : 'display:none';
  const html = `<div class="dynamic-card">
  <button type="button" class="remove-row-btn">&times;</button>
  <div class="form-row">
    <div class="form-group lang-field lang-en" style="${enD}">
      <label>Nombre (EN)</label>
      <input type="text" class="form-input itin-name-en" placeholder="Apparition Hill">
    </div>
    <div class="form-group lang-field lang-es" style="${esD}">
      <label>Nombre (ES)</label>
      <input type="text" class="form-input itin-name-es" placeholder="Colina de las Apariciones">
    </div>
  </div>
  <div class="form-row">
    <div class="form-group lang-field lang-en" style="${enD}">
      <label>Descripci\u00f3n (EN)</label>
      <input type="text" class="form-input itin-desc-en" placeholder="Sacred site where...">
    </div>
    <div class="form-group lang-field lang-es" style="${esD}">
      <label>Descripci\u00f3n (ES)</label>
      <input type="text" class="form-input itin-desc-es" placeholder="Sitio sagrado donde...">
    </div>
  </div>
</div>`;
  document.getElementById('itinerary-list').insertAdjacentHTML('beforeend', html);
}

function addGalleryImage() {
  if (countRows('gallery-images-list') >= LIMITS.galleryImages) {
    showToast('M\u00e1ximo ' + LIMITS.galleryImages + ' im\u00e1genes de galer\u00eda permitidas');
    return;
  }
  var lang = currentLang();
  var enD = lang === 'en' ? '' : 'display:none';
  var esD = lang === 'es' ? '' : 'display:none';
  const html = `<div class="dynamic-card">
  <button type="button" class="remove-row-btn">&times;</button>
  <div class="form-row">
    <div class="form-group">
      <label>Nombre de Archivo</label>
      <input type="text" class="form-input gallery-filename" placeholder="image2.JPG">
    </div>
  </div>
  <div class="form-row">
    <div class="form-group lang-field lang-en" style="${enD}">
      <label>Alt Text (EN)</label>
      <input type="text" class="form-input gallery-alt-en" placeholder="Pilgrimage Image">
    </div>
    <div class="form-group lang-field lang-es" style="${esD}">
      <label>Alt Text (ES)</label>
      <input type="text" class="form-input gallery-alt-es" placeholder="Imagen de la Peregrinaci\u00f3n">
    </div>
  </div>
  <div class="form-row">
    <div class="form-group lang-field lang-en" style="${enD}">
      <label>Pie de Foto (EN)</label>
      <input type="text" class="form-input gallery-caption-en" placeholder="Spiritual journey of faith">
    </div>
    <div class="form-group lang-field lang-es" style="${esD}">
      <label>Pie de Foto (ES)</label>
      <input type="text" class="form-input gallery-caption-es" placeholder="Camino espiritual de fe">
    </div>
  </div>
</div>`;
  document.getElementById('gallery-images-list').insertAdjacentHTML('beforeend', html);
}

// --------------- collectFormData ---------------

function collectFormData() {
  const data = {};

  // Core fields
  data.experienceNameEN = val('experience-name-en');
  data.experienceNameES = val('experience-name-es');
  data.year             = val('experience-year');
  data.slugEN           = val('slug-en');
  data.slugES           = val('slug-es');
  data.imageFolder      = val('image-folder');
  data.heroBgPath       = val('hero-bg-path');

  // Hero
  data.heroSubtitleEN   = val('hero-subtitle-en');
  data.heroSubtitleES   = val('hero-subtitle-es');

  // SEO
  data.metaDescEN       = val('meta-desc-en');
  data.metaDescES       = val('meta-desc-es');
  data.keywordsEN       = val('keywords-en');
  data.keywordsES       = val('keywords-es');
  data.ogImageFilename  = val('og-image-filename');

  // Description blocks (h2 heading + paragraph)
  data.descriptionBlocks = [];
  document.querySelectorAll('#description-blocks-list .dynamic-card').forEach(card => {
    const headingEN = card.querySelector('.desc-heading-en').value.trim();
    const headingES = card.querySelector('.desc-heading-es').value.trim();
    const textEN = card.querySelector('.desc-text-en').value.trim();
    const textES = card.querySelector('.desc-text-es').value.trim();
    if (textEN || textES) data.descriptionBlocks.push({ headingEN, headingES, textEN, textES });
  });

  // CTA section
  data.includeCta = document.getElementById('include-cta') ? document.getElementById('include-cta').checked : false;
  data.ctaHeadingEN = val('cta-heading-en');
  data.ctaHeadingES = val('cta-heading-es');
  data.ctaTextEN = val('cta-text-en');
  data.ctaTextES = val('cta-text-es');

  // JSON-LD
  data.touristType = val('tourist-type');

  data.itinerary = [];
  document.querySelectorAll('#itinerary-list .dynamic-card').forEach(card => {
    const nameEN = card.querySelector('.itin-name-en').value.trim();
    const nameES = card.querySelector('.itin-name-es').value.trim();
    const descEN = card.querySelector('.itin-desc-en').value.trim();
    const descES = card.querySelector('.itin-desc-es').value.trim();
    if (nameEN || nameES) data.itinerary.push({ nameEN, nameES, descEN, descES });
  });

  // Gallery mode
  data.galleryMode = document.querySelector('input[name="gallery-mode"]:checked')
    ? document.querySelector('input[name="gallery-mode"]:checked').value
    : 'sequential';

  // Sequential fields
  data.seqPrefix       = val('seq-prefix');
  data.seqExtension    = val('seq-extension');
  data.seqStart        = parseInt(val('seq-start'), 10) || 1;
  data.seqEnd          = parseInt(val('seq-end'), 10) || 1;
  data.defaultCaptionEN = val('default-caption-en');
  data.defaultCaptionES = val('default-caption-es');
  data.defaultAltEN    = val('default-alt-en');
  data.defaultAltES    = val('default-alt-es');

  // Manual gallery images
  data.galleryImages = [];
  document.querySelectorAll('#gallery-images-list .dynamic-card').forEach(card => {
    const filename  = card.querySelector('.gallery-filename').value.trim();
    const altEN     = card.querySelector('.gallery-alt-en').value.trim();
    const altES     = card.querySelector('.gallery-alt-es').value.trim();
    const captionEN = card.querySelector('.gallery-caption-en').value.trim();
    const captionES = card.querySelector('.gallery-caption-es').value.trim();
    if (filename) data.galleryImages.push({ filename, altEN, altES, captionEN, captionES });
  });

  // Internal links
  data.internalHeadingEN = val('internal-heading-en');
  data.internalHeadingES = val('internal-heading-es');
  data.internalIntroEN   = val('internal-intro-en');
  data.internalIntroES   = val('internal-intro-es');
  data.links = [];
  document.querySelectorAll('#internal-links-list .dynamic-card').forEach(card => {
    const url     = card.querySelector('.link-url').value.trim();
    const labelEN = card.querySelector('.link-label-en').value.trim();
    const labelES = card.querySelector('.link-label-es').value.trim();
    if (url && (labelEN || labelES)) data.links.push({ url, labelEN, labelES });
  });

  // FAQs
  data.faqs = [];
  document.querySelectorAll('#faq-list .dynamic-card').forEach(card => {
    const questionEN = card.querySelector('.faq-question-en').value.trim();
    const questionES = card.querySelector('.faq-question-es').value.trim();
    const answerEN   = card.querySelector('.faq-answer-en').value.trim();
    const answerES   = card.querySelector('.faq-answer-es').value.trim();
    if ((questionEN || questionES) && (answerEN || answerES)) data.faqs.push({ questionEN, questionES, answerEN, answerES });
  });

  // Card info
  data.cardTitleEN    = val('card-title-en');
  data.cardTitleES    = val('card-title-es');
  data.cardDescEN     = val('card-desc-en');
  data.cardDescES     = val('card-desc-es');
  data.cardThumbnail  = val('card-thumbnail');

  // Thumbnail settings
  data.autoThumbnails  = document.getElementById('auto-thumbnails') ? document.getElementById('auto-thumbnails').checked : true;
  data.thumbnailCount  = parseInt(val('thumbnail-count'), 10) || 19;

  return data;
}

// --------------- resolveGalleryImages ---------------

function resolveGalleryImages(data) {
  if (data.galleryMode === 'sequential') {
    const images = [];
    for (let i = data.seqStart; i <= data.seqEnd; i++) {
      images.push({
        filename:  data.seqPrefix + i + data.seqExtension,
        altEN:     data.defaultAltEN || (data.experienceNameEN + ' Image ' + i),
        altES:     data.defaultAltES || ('Imagen ' + i + ' de ' + (data.experienceNameES || data.experienceNameEN)),
        captionEN: data.defaultCaptionEN || '',
        captionES: data.defaultCaptionES || ''
      });
    }
    return images;
  }
  // manual
  return data.galleryImages;
}

// --------------- validate ---------------

function validate(data) {
  const checks = [
    [data.experienceNameEN, 'experience-name-en', 'en', 'Nombre de Experiencia (EN) es requerido'],
    [data.year,             'experience-year',     null, 'A\u00f1o es requerido'],
    [data.slugEN,           'slug-en',             null, 'Slug EN es requerido'],
    [data.slugES,           'slug-es',             null, 'Slug ES es requerido'],
  ];

  for (const [value, id, lang, msg] of checks) {
    if (!value) {
      if (lang) switchToLang(lang);
      showToast(msg);
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
  }

  // Check at least 1 description block has text
  const hasDescText = (data.descriptionBlocks || []).some(b => b.textEN || b.textES);
  if (!hasDescText) {
    showToast('Se requiere al menos un bloque de descripci\u00f3n con texto');
    const descList = document.getElementById('description-blocks-list');
    if (descList) descList.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }

  // Check at least 1 image
  const images = resolveGalleryImages(data);
  if (!images || images.length === 0) {
    showToast('Se requiere al menos 1 imagen de galer\u00eda');
    const target = data.galleryMode === 'sequential'
      ? document.getElementById('gallery-seq-fields')
      : document.getElementById('gallery-images-list');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }

  return true;
}

// --------------- JSON-LD generation ---------------

function buildJsonLd(data, lang) {
  const isEN    = lang === 'en';
  const baseUrl = 'https://www.skytraveljm.com';
  const slugEN  = data.slugEN;
  const slugES  = data.slugES;
  const pageUrl = isEN
    ? baseUrl + '/experiences/' + slugEN
    : baseUrl + '/es/experiences/' + slugES;
  const images  = resolveGalleryImages(data);

  const nameEN = data.experienceNameEN || '';
  const nameES = data.experienceNameES || nameEN;
  const name   = isEN ? nameEN : nameES;
  const folder = data.imageFolder || '';

  const blocks = [];

  // 1. TouristTrip
  const touristTrip = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    '@id': pageUrl,
    'name': isEN
      ? nameEN + ' ' + data.year
      : nameES + ' ' + data.year,
    'image': images.slice(0, 5).map(img => baseUrl + '/experiences/images/' + folder + '/' + img.filename),
    'description': isEN ? (data.metaDescEN || '') : (data.metaDescES || ''),
    'provider': {
      '@type': 'TravelAgency',
      'name': 'Sky Travel',
      'url': baseUrl,
      'telephone': '+1-786-290-9114',
      'email': 'info@skytraveljm.com',
      'address': {
        '@type': 'PostalAddress',
        'addressLocality': 'Miami',
        'addressRegion': 'FL',
        'addressCountry': 'US'
      },
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': '4.9',
        'reviewCount': '127',
        'bestRating': '5',
        'worstRating': '1'
      }
    },
    'url': pageUrl,
    'inLanguage': lang,
    'touristType': data.touristType || (isEN ? 'Religious Pilgrims' : 'Peregrinos Religiosos'),
    'organizer': {
      '@type': 'TravelAgency',
      'name': 'Sky Travel',
      'telephone': '+1-786-290-9114',
      'email': 'info@skytraveljm.com'
    }
  };

  if (data.itinerary && data.itinerary.length > 0) {
    touristTrip.itinerary = {
      '@type': 'ItemList',
      'itemListElement': data.itinerary.map((item, idx) => ({
        '@type': 'ListItem',
        'position': idx + 1,
        'item': {
          '@type': 'Place',
          'name': isEN ? item.nameEN : item.nameES,
          'description': isEN ? item.descEN : item.descES
        }
      }))
    };
  }

  blocks.push(JSON.stringify(touristTrip, null, 4));

  // 2. BreadcrumbList
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': isEN ? 'Home' : 'Inicio',
        'item': isEN ? baseUrl : baseUrl + '/index-es'
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': isEN ? 'Experiences' : 'Experiencias',
        'item': isEN ? baseUrl + '/experiences' : baseUrl + '/experiences-es'
      },
      {
        '@type': 'ListItem',
        'position': 3,
        'name': name + ' ' + data.year,
        'item': pageUrl
      }
    ]
  };
  blocks.push(JSON.stringify(breadcrumb, null, 4));

  // 3. ImageGallery
  const first4 = images.slice(0, 4);
  const imageGallery = {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    'name': isEN
      ? nameEN + ' ' + data.year + ' Photo Gallery'
      : name + ' ' + data.year + ' Galer\u00eda Fotogr\u00e1fica',
    'url': pageUrl,
    'description': isEN
      ? 'Photo gallery of our ' + data.year + ' ' + nameEN + ' experience'
      : 'Galer\u00eda fotogr\u00e1fica de nuestra experiencia ' + nameES + ' ' + data.year,
    'mainEntity': first4.map(img => ({
      '@type': 'ImageObject',
      'contentUrl': baseUrl + '/experiences/images/' + folder + '/' + img.filename,
      'name': isEN ? (img.captionEN || img.altEN || '') : (img.captionES || img.altES || ''),
      'description': isEN ? (img.captionEN || '') : (img.captionES || '')
    }))
  };
  blocks.push(JSON.stringify(imageGallery, null, 4));

  // 4. FAQPage (if FAQs exist)
  if (data.faqs && data.faqs.length > 0) {
    const faqPage = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': pageUrl + '#faq',
      'mainEntity': data.faqs.map(faq => ({
        '@type': 'Question',
        'name': isEN ? faq.questionEN : faq.questionES,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': isEN ? faq.answerEN : faq.answerES
        }
      }))
    };
    blocks.push(JSON.stringify(faqPage, null, 4));
  }

  // 5. WebPage
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': pageUrl + '#webpage',
    'url': pageUrl,
    'name': isEN
      ? nameEN + ' ' + data.year + ' Photo Gallery | Sky Travel'
      : name + ' ' + data.year + ' | Sky Travel',
    'image': images.length > 0
      ? baseUrl + '/experiences/images/' + folder + '/' + images[0].filename
      : '',
    'inLanguage': lang,
    'isPartOf': {
      '@type': 'WebSite',
      'url': baseUrl
    },
    'about': {
      '@type': 'Event',
      'name': name + ' ' + data.year,
      'description': isEN ? (data.metaDescEN || '') : (data.metaDescES || '')
    }
  };
  blocks.push(JSON.stringify(webPage, null, 4));

  return blocks;
}

// --------------- HTML generation ---------------

function generateHTML(data, lang) {
  const isEN    = lang === 'en';
  const prefix  = isEN ? '../' : '../../';
  const baseUrl = 'https://www.skytraveljm.com';
  const slugEN  = data.slugEN;
  const slugES  = data.slugES;
  const slug    = isEN ? slugEN : slugES;
  const pageUrl = isEN
    ? baseUrl + '/experiences/' + slugEN
    : baseUrl + '/es/experiences/' + slugES;

  const nameEN = data.experienceNameEN || '';
  const nameES = data.experienceNameES || nameEN;
  const name   = isEN ? nameEN : nameES;
  const folder = data.imageFolder || '';
  const ogImg  = data.ogImageFilename || '';
  const images = resolveGalleryImages(data);

  // Title
  const title = isEN
    ? esc(nameEN) + ' ' + esc(data.year) + ' Photo Gallery | Sky Travel'
    : 'Galer\u00eda Fotos ' + esc(nameES) + ' ' + esc(data.year) + ' | Sky Travel';

  // Meta description
  const metaDesc = isEN ? esc(data.metaDescEN || '') : esc(data.metaDescES || '');

  // Keywords
  const keywords = isEN ? esc(data.keywordsEN || '') : esc(data.keywordsES || '');

  // OG locale
  const ogLocale    = isEN ? 'en_US' : 'es_ES';
  const ogLocaleAlt = isEN ? 'es_ES' : 'en_US';

  // Hero bg
  const heroBg = data.heroBgPath || '';

  // Subtitle
  const subtitle = isEN ? (data.heroSubtitleEN || '') : (data.heroSubtitleES || '');

  // Thumbnail count
  const thumbCount = data.thumbnailCount || images.length;
  const thumbImages = data.autoThumbnails ? images.slice(0, thumbCount) : images.slice(0, thumbCount);

  // OG image URL
  const ogImageUrl = baseUrl + '/experiences/images/' + folder + '/' + ogImg;

  // First image for preload
  const firstImgFile = images.length > 0 ? images[0].filename : ogImg;
  const preloadImg = prefix + 'experiences/images/' + folder + '/' + firstImgFile;

  // JSON-LD
  const jsonLdBlocks = buildJsonLd(data, lang);

  // --------------- Build HTML string ---------------

  let html = '';

  // DOCTYPE + head
  html += '<!DOCTYPE html>\n';
  html += '<html lang="' + lang + '">\n';
  html += '<head>\n';
  html += '  <!-- Basic Meta Tags -->\n';
  html += '  <meta charset="UTF-8">\n';
  html += '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
  html += '\n';
  html += '  <!-- Google Site Verification -->\n';
  html += '  <meta name="google-site-verification" content="b7kIWNJg3tO3n75FyCzLnPWhzz1t8MWMuugQQ43va-E" />\n';
  html += '\n';

  // SEO meta
  html += '  <!-- SEO Meta Tags -->\n';
  html += '  <title>' + title + '</title>\n';
  html += '  <meta name="description" content="' + metaDesc + '">\n';
  html += '  <meta name="keywords" content="' + keywords + '">\n';
  html += '  <meta name="author" content="Sky Travel">\n';
  html += '  <meta name="robots" content="index, follow">\n';
  html += '\n';

  // Canonical
  html += '  <!-- Canonical URL -->\n';
  html += '  <link rel="canonical" href="' + pageUrl + '">\n';
  html += '\n';

  // Hreflang
  html += '  <!-- Language Alternatives -->\n';
  html += '  <link rel="alternate" hreflang="en" href="' + baseUrl + '/experiences/' + slugEN + '" />\n';
  html += '  <link rel="alternate" hreflang="es" href="' + baseUrl + '/es/experiences/' + slugES + '" />\n';
  html += '  <link rel="alternate" hreflang="x-default" href="' + baseUrl + '/experiences/' + slugEN + '" />\n';
  html += '\n';

  // OG tags
  html += '  <!-- Open Graph Tags -->\n';
  html += '  <meta property="og:type" content="website">\n';
  html += '  <meta property="og:title" content="' + title + '">\n';
  html += '  <meta property="og:description" content="' + metaDesc + '">\n';
  html += '  <meta property="og:url" content="' + pageUrl + '">\n';
  html += '  <meta property="og:site_name" content="Sky Travel">\n';
  html += '  <meta property="og:locale" content="' + ogLocale + '">\n';
  html += '  <meta property="og:locale:alternate" content="' + ogLocaleAlt + '">\n';
  html += '  <meta property="og:image" content="' + ogImageUrl + '">\n';
  html += '  <meta property="og:image:width" content="1200">\n';
  html += '  <meta property="og:image:height" content="630">\n';
  html += '  <meta property="og:image:alt" content="' + esc(name) + ' ' + esc(data.year) + ' Experience with Sky Travel">\n';
  html += '\n';

  // Twitter
  html += '  <!-- Twitter Card Tags -->\n';
  html += '  <meta name="twitter:card" content="summary_large_image">\n';
  html += '  <meta name="twitter:title" content="' + title + '">\n';
  html += '  <meta name="twitter:description" content="' + metaDesc + '">\n';
  html += '  <meta name="twitter:image" content="' + ogImageUrl + '">\n';
  html += '  <meta name="twitter:image:alt" content="' + esc(name) + ' ' + esc(data.year) + ' Experience">\n';
  html += '\n';

  // WhatsApp
  html += '  <!-- WhatsApp Optimization -->\n';
  html += '  <meta property="whatsapp:title" content="' + title + '">\n';
  html += '  <meta property="whatsapp:description" content="' + metaDesc + '">\n';
  html += '  <meta property="whatsapp:image" content="' + ogImageUrl + '">\n';
  html += '\n';

  // Instagram
  html += '  <!-- Instagram Specific -->\n';
  html += '  <meta property="instagram:image" content="' + ogImageUrl + '">\n';
  html += '  <meta property="instagram:title" content="' + title + '">\n';
  html += '\n';

  // Favicon
  html += '  <!-- Favicon -->\n';
  html += '  <link rel="icon" href="' + prefix + 'images/favicon/favicon.ico" type="image/x-icon">\n';
  html += '  <link rel="apple-touch-icon" sizes="180x180" href="' + prefix + 'images/favicon/apple-touch-icon.png">\n';
  html += '  <link rel="icon" type="image/png" sizes="32x32" href="' + prefix + 'images/favicon/favicon-32x32.png">\n';
  html += '  <link rel="icon" type="image/png" sizes="16x16" href="' + prefix + 'images/favicon/favicon-16x16.png">\n';
  html += '  <link rel="manifest" href="' + prefix + 'images/favicon/site.webmanifest">\n';
  html += '\n';

  // Performance
  html += '  <!-- Performance optimizations -->\n';
  html += '  <link rel="preconnect" href="https://fonts.googleapis.com">\n';
  html += '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n';
  html += '  <link rel="preload" href="' + prefix + 'style.css" as="style">\n';
  html += '  <link rel="preload" href="' + preloadImg + '" as="image">\n';
  html += '\n';

  // JSON-LD (separate script blocks)
  jsonLdBlocks.forEach((block, i) => {
    const labels = ['TouristTrip', 'Breadcrumb', 'ImageGallery', 'FAQPage', 'WebPage'];
    const label = labels[i] || 'Structured Data';
    html += '  <!-- ' + label + ' Structured Data -->\n';
    html += '  <script type="application/ld+json">\n';
    html += '  ' + block + '\n';
    html += '  </script>\n';
    html += '\n';
  });


  // Google Analytics
  html += '  <!-- Google Analytics -->\n';
  html += '  <script async src="https://www.googletagmanager.com/gtag/js?id=G-6FM6Y5W6ZM"></script>\n';
  html += '  <script>\n';
  html += '  window.dataLayer = window.dataLayer || [];\n';
  html += '  function gtag(){dataLayer.push(arguments);}\n';
  html += '  gtag(\'js\', new Date());\n';
  html += '  gtag(\'config\', \'G-6FM6Y5W6ZM\');\n';
  html += '  </script>\n';

  // Stylesheet
  html += '  <link rel="stylesheet" href="' + prefix + 'style.css">\n';

  // Critical slideshow CSS
  html += '  <!-- Critical slideshow visibility to avoid FOUC while components.css loads asynchronously -->\n';
  html += '  <style>\n';
  html += '    .slideshow .slide { display: none; }\n';
  html += '    .slideshow .slide:first-child { display: block; }\n';
  html += '    .slideshow.slick-initialized .slide { display: block; }\n';
  html += '  </style>\n';

  // Async components.css
  html += '  <link rel="preload" href="' + prefix + 'css/components.css" as="style" onload="this.rel=\'stylesheet\'">\n';
  html += '  <noscript><link rel="stylesheet" href="' + prefix + 'css/components.css"></noscript>\n';

  // Inline CSS
  html += '  <style>\n';
  html += '    .slideshow-container {\n';
  html += '        max-width: 800px;\n';
  html += '        margin: 0 auto 20px auto;\n';
  html += '        border: 1px solid #ddd;\n';
  html += '        box-shadow: 0 0 10px rgba(0,0,0,0.1);\n';
  html += '    }\n';
  html += '    \n';
  html += '    .slide {\n';
  html += '        position: relative;\n';
  html += '    }\n';
  html += '\n';
  html += '    .slide img {\n';
  html += '        width: 100%;\n';
  html += '        height: auto;\n';
  html += '        object-fit: cover;\n';
  html += '        display: block;\n';
  html += '    }\n';
  html += '\n';
  html += '    .slide-caption {\n';
  html += '        position: absolute;\n';
  html += '        bottom: 0;\n';
  html += '        left: 0;\n';
  html += '        right: 0;\n';
  html += '        background: rgba(0, 0, 0, 0.6);\n';
  html += '        color: white;\n';
  html += '        padding: 15px;\n';
  html += '    }\n';
  html += '\n';
  html += '    .slide-caption h3 {\n';
  html += '        margin: 0 0 5px 0;\n';
  html += '        font-size: 18px;\n';
  html += '    }\n';
  html += '\n';
  html += '    .slide-caption p {\n';
  html += '        margin: 0;\n';
  html += '        font-size: 14px;\n';
  html += '    }\n';
  html += '\n';
  html += '    .image-thumbnails {\n';
  html += '        max-width: 800px;\n';
  html += '        margin: 0 auto 40px auto;\n';
  html += '    }\n';
  html += '\n';
  html += '    .thumbnail {\n';
  html += '        padding: 5px;\n';
  html += '    }\n';
  html += '\n';
  html += '    .thumbnail img {\n';
  html += '        width: 100%;\n';
  html += '        height: 100%;\n';
  html += '        object-fit: cover;\n';
  html += '        cursor: pointer;\n';
  html += '        border: 2px solid transparent;\n';
  html += '        transition: border-color 0.3s ease;\n';
  html += '    }\n';
  html += '\n';
  html += '    .thumbnail.slick-current img {\n';
  html += '        border-color: #c8a97e;\n';
  html += '    }\n';
  html += '\n';
  html += '    .page-content {\n';
  html += '        max-width: 800px;\n';
  html += '        margin: 0 auto;\n';
  html += '        padding: 20px;\n';
  html += '    }\n';
  html += '\n';
  html += '    .back-link {\n';
  html += '        display: inline-block;\n';
  html += '        margin-bottom: 20px;\n';
  html += '        color: #333;\n';
  html += '        text-decoration: none;\n';
  html += '        font-weight: bold;\n';
  html += '    }\n';
  html += '\n';
  html += '    .back-link:hover {\n';
  html += '        color: #c8a97e;\n';
  html += '    }\n';
  html += '\n';
  html += '    .description {\n';
  html += '        margin-bottom: 30px;\n';
  html += '        line-height: 1.6;\n';
  html += '    }\n';
  html += '\n';
  html += '    .description h2 {\n';
  html += '        font-size: 1.8rem;\n';
  html += '        font-weight: 400;\n';
  html += '        color: #333;\n';
  html += '        margin-top: 2rem;\n';
  html += '        margin-bottom: 1rem;\n';
  html += '    }\n';
  html += '\n';
  html += '    .page-header {\n';
  html += '        margin-top: 90px;\n';
  html += '        padding: 4rem 2rem;\n';
  html += '        background: url(\'' + esc(heroBg) + '\') center/cover;\n';
  html += '        text-align: center;\n';
  html += '        color: white;\n';
  html += '        position: relative;\n';
  html += '    }\n';
  html += '\n';
  html += '    .page-header::before {\n';
  html += '        content: \'\';\n';
  html += '        position: absolute;\n';
  html += '        top: 0;\n';
  html += '        left: 0;\n';
  html += '        right: 0;\n';
  html += '        bottom: 0;\n';
  html += '        background: rgba(0, 0, 0, 0.5);\n';
  html += '    }\n';
  html += '\n';
  html += '    .header-content {\n';
  html += '        position: relative;\n';
  html += '        z-index: 1;\n';
  html += '    }\n';
  html += '\n';
  html += '    .header-content h1 {\n';
  html += '        font-size: 3rem;\n';
  html += '        font-weight: 300;\n';
  html += '        margin-bottom: 1rem;\n';
  html += '        letter-spacing: 2px;\n';
  html += '    }\n';
  html += '\n';
  html += '    /* Language switcher styles */\n';
  html += '    .language-switcher {\n';
  html += '      margin-left: 1.5rem;\n';
  html += '      display: flex;\n';
  html += '      align-items: center;\n';
  html += '    }\n';
  html += '\n';
  html += '    .lang-option {\n';
  html += '      text-decoration: none;\n';
  html += '      color: #333;\n';
  html += '      font-size: 0.9rem;\n';
  html += '      padding: 0.3rem 0.5rem;\n';
  html += '      transition: color 0.3s ease;\n';
  html += '    }\n';
  html += '\n';
  html += '    .lang-option:hover {\n';
  html += '      color: #c8a97e;\n';
  html += '    }\n';
  html += '\n';
  html += '    .lang-separator {\n';
  html += '      margin: 0 0.3rem;\n';
  html += '      color: #666;\n';
  html += '    }\n';
  html += '\n';
  html += '    .active-lang {\n';
  html += '      font-weight: bold;\n';
  html += '      color: #c8a97e;\n';
  html += '    }\n';
  html += '  </style>\n';

  // Close head
  html += '</head>\n';

  // --------------- Body ---------------

  html += '<body>\n';

  // Skip link
  if (isEN) {
    html += '  <a href="#main-content" class="skip-link">Skip to main content</a>\n';
  } else {
    html += '  <a href="#main-content" class="skip-link">Saltar al contenido principal</a>\n';
  }

  // SEO Hero Image (hidden visually, accessible to crawlers)
  const ogImage = data.ogImageFilename || (images.length > 0 ? images[0].filename : '');
  const imageFolder = data.imageFolder || '';
  if (ogImage) {
    html += '  <!-- SEO Hero Image (hidden visually, accessible to crawlers) -->\n';
    html += '  <img\n';
    html += '    src="' + prefix + 'experiences/images/' + esc(imageFolder) + '/' + esc(ogImage) + '"\n';
    html += '    alt="' + esc(isEN ? data.experienceNameEN : data.experienceNameES) + '"\n';
    html += '    width="1200" height="630" decoding="async"\n';
    html += '    style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;"\n';
    html += '  >\n';
  }

  // Navigation
  html += '  <!-- Navigation -->\n';
  html += '  <div class="nav-container">\n';
  html += '    <nav>\n';
  html += '      <a href="/" class="logo">\n';
  html += '        <img src="' + prefix + 'images/Logo.jpg" alt="Sky Travel" class="logo-image">\n';
  html += '      </a>\n';
  html += '      <div class="nav-links">\n';

  if (isEN) {
    html += '        <a href="/#featured">Destinations</a>\n';
    html += '        <a href="' + prefix + 'experiences">Experiences</a>\n';
    html += '        <a href="' + prefix + 'blog">Blog</a>\n';
    html += '        <a href="' + prefix + 'about">About</a>\n';
    html += '        <a href="' + prefix + 'contact">Contact</a>\n';
  } else {
    html += '        <a href="/index-es#featured">Destinos</a>\n';
    html += '        <a href="' + prefix + 'experiences-es">Experiencias</a>\n';
    html += '        <a href="' + prefix + 'blog-es">Blog</a>\n';
    html += '        <a href="' + prefix + 'about-es">Sobre Nosotros</a>\n';
    html += '        <a href="' + prefix + 'contact-es">Contacto</a>\n';
  }

  // Language switcher
  html += '        <div class="language-switcher">\n';
  if (isEN) {
    // EN page: EN is active, ES links to ES version
    html += '          <a href="../experiences/' + slugEN + '" class="lang-option active-lang">EN</a>\n';
    html += '          <span class="lang-separator">|</span>\n';
    html += '          <a href="../es/experiences/' + slugES + '" class="lang-option">ES</a>\n';
  } else {
    // ES page: ES is active, EN links to EN version
    html += '          <a href="../../experiences/' + slugEN + '" class="lang-option">EN</a>\n';
    html += '          <span class="lang-separator">|</span>\n';
    html += '          <a href="../experiences/' + slugES + '" class="lang-option active-lang">ES</a>\n';
  }
  html += '        </div>\n';

  html += '      </div>\n';
  html += '      <div class="menu-toggle">\u2630</div>\n';
  html += '    </nav>\n';
  html += '  </div>\n';
  html += '\n';

  // Main content
  html += '  <main id="main-content">\n';
  html += '\n';

  // Page header
  html += '  <!-- Page Header -->\n';
  html += '  <section class="page-header">\n';
  html += '    <div class="header-content">\n';
  html += '      <h1>' + esc(name) + ' ' + esc(data.year) + '</h1>\n';
  if (subtitle) {
    html += '      <p>' + esc(subtitle) + '</p>\n';
  }
  html += '    </div>\n';
  html += '  </section>\n';
  html += '\n';

  // Main content container
  html += '  <!-- Main Content -->\n';
  html += '  <div class="page-content">\n';

  // Back link
  if (isEN) {
    html += '    <a href="' + prefix + 'experiences" class="back-link">\u2190 Back to All Experiences</a>\n';
  } else {
    html += '    <a href="/experiences-es" class="back-link">\u2190 Volver a Todas las Experiencias</a>\n';
  }

  html += '    \n';

  // Description blocks (optional h2 + paragraph)
  html += '    <div class="description">\n';
  (data.descriptionBlocks || []).forEach(block => {
    const heading = esc(isEN ? block.headingEN : block.headingES);
    let text = esc(isEN ? block.textEN : block.textES);
    if (text && data.links && data.links.length > 0) {
      data.links.forEach(function(link) {
        var label = isEN ? (link.labelEN || link.labelES) : (link.labelES || link.labelEN);
        if (label) {
          var re = new RegExp(esc(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          var match = text.match(re);
          if (match) {
            text = text.replace(match[0], '<a href="' + esc(link.url) + '" class="internal-link" style="color: #c8a97e; text-decoration: none; font-weight: 500;">' + match[0] + '</a>');
          }
        }
      });
    }
    if (heading) html += '      <h2>' + heading + '</h2>\n';
    if (text) html += '      <p>' + text + '</p>\n';
  });
  html += '    </div>\n';
  html += '\n';

  // CTA section (optional)
  if (data.includeCta) {
    const ctaHeading = esc(isEN ? (data.ctaHeadingEN || 'Want to Know the Next Dates?') : (data.ctaHeadingES || '\u00bfDesea Saber las Pr\u00f3ximas Fechas?'));
    const ctaText = esc(isEN ? (data.ctaTextEN || 'Contact us directly via WhatsApp to learn about new destinations and departures.') : (data.ctaTextES || 'Cont\u00e1ctenos directamente por WhatsApp para conocer los nuevos destinos y salidas.'));
    html += '    <div class="cta-section" style="background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%); padding: 40px 30px; margin: 40px 0; text-align: center; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">\n';
    html += '      <h2 style="color:#333; margin-bottom:15px;">' + ctaHeading + '</h2>\n';
    html += '      <p style="font-size:1.1rem; color:#666; margin-bottom:25px;">' + ctaText + '</p>\n';
    html += '\n';
    html += '      <!-- WhatsApp -->\n';
    html += '      <a href="https://wa.me/17862909114"\n';
    html += '         target="_blank" rel="noopener noreferrer"\n';
    html += '         class="whatsapp-contact-link"\n';
    html += '         style="text-decoration: none;"\n';
    html += '         onmouseover="this.querySelector(\'.elegant-contact-item\').style.transform=\'translateY(-5px)\'; this.querySelector(\'.elegant-contact-item\').style.boxShadow=\'0 8px 25px rgba(200, 169, 126, 0.3)\';"\n';
    html += '         onmouseout="this.querySelector(\'.elegant-contact-item\').style.transform=\'translateY(0)\'; this.querySelector(\'.elegant-contact-item\').style.boxShadow=\'0 4px 15px rgba(200, 169, 126, 0.2)\';"\n';
    html += '      >\n';
    html += '        <div class="elegant-contact-item" style="max-width: 320px; margin: 0 auto; padding: 30px 25px; background: linear-gradient(135deg, #ffffff 0%, #fefdfb 100%); border: 2px solid #c8a97e; border-radius: 12px; box-shadow: 0 4px 15px rgba(200, 169, 126, 0.2); transition: all 0.4s ease; cursor: pointer;">\n';
    html += '          <div class="elegant-contact-icon whatsapp-icon" style="width: 70px; height: 70px; margin: 0 auto 20px; background: linear-gradient(135deg, #c8a97e 0%, #d4b896 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(200, 169, 126, 0.3);">\n';
    html += '            <!-- WhatsApp icon -->\n';
    html += '            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"\n';
    html += '                 fill="none" stroke="white" stroke-width="2.5"\n';
    html += '                 stroke-linecap="round" stroke-linejoin="round"\n';
    html += '                 style="width: 36px; height: 36px;">\n';
    html += '              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8\n';
    html += '                       8.5 8.5 0 0 1-7.6 4.7\n';
    html += '                       8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7\n';
    html += '                       a8.38 8.38 0 0 1-.9-3.8\n';
    html += '                       8.5 8.5 0 0 1 4.7-7.6\n';
    html += '                       8.38 8.38 0 0 1 3.8-.9h.5\n';
    html += '                       a8.48 8.48 0 0 1 8 8v.5z"/>\n';
    html += '            </svg>\n';
    html += '          </div>\n';
    html += '          <div class="elegant-contact-info">\n';
    html += '            <h3 style="color:#c8a97e; font-size:1.4rem; margin-bottom:8px; font-weight: 600; letter-spacing: 0.5px;">WhatsApp</h3>\n';
    html += '            <p style="color:#666; font-size:1.05rem; margin:0; font-weight: 400;">' + (isEN ? 'Send us a message' : 'Env\u00edenos un mensaje') + '</p>\n';
    html += '          </div>\n';
    html += '        </div>\n';
    html += '      </a>\n';
    html += '    </div>\n';
    html += '\n';
  }


  // Slideshow
  html += '    <!-- Slideshow with Slick Carousel -->\n';
  html += '    <div class="slideshow-container">\n';
  html += '      <div class="slideshow">\n';

  images.forEach(img => {
    const alt     = isEN ? (img.altEN || '') : (img.altES || '');
    const caption = isEN ? (img.captionEN || '') : (img.captionES || '');
    html += '        <div class="slide">\n';
    html += '          <img src="' + prefix + 'experiences/images/' + folder + '/' + esc(img.filename) + '" alt="' + esc(alt) + '">\n';
    html += '          <div class="slide-caption">\n';
    html += '            <h3>' + esc(name) + ' ' + esc(data.year) + '</h3>\n';
    html += '            <p>' + esc(caption) + '</p>\n';
    html += '          </div>\n';
    html += '        </div>\n';
  });

  html += '      </div>\n';
  html += '    </div>\n';
  html += '    \n';

  // Thumbnails
  html += '    <div class="image-thumbnails">\n';
  thumbImages.forEach((img, i) => {
    const thumbAlt = isEN ? ('Thumbnail ' + (i + 1)) : ('Miniatura ' + (i + 1));
    html += '      <div class="thumbnail"><img src="' + prefix + 'experiences/images/' + folder + '/' + esc(img.filename) + '" alt="' + esc(thumbAlt) + '"></div>\n';
  });
  html += '\n';
  html += '    </div>\n';

  // Close page-content
  html += '  </div>\n';
  html += '\n';

  // Internal links section (optional)
  var introText = esc(isEN ? (data.internalIntroEN || data.internalIntroES || '') : (data.internalIntroES || data.internalIntroEN || ''));
  if (introText || (data.links && data.links.length > 0)) {
    // Replace matching text with links automatically
    if (data.links && data.links.length > 0) {
      data.links.forEach(function(link) {
        var label = isEN ? (link.labelEN || link.labelES) : (link.labelES || link.labelEN);
        if (label) {
          var re = new RegExp(esc(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          var match = introText.match(re);
          if (match) {
            introText = introText.replace(match[0], '<a href="' + esc(link.url) + '" class="internal-link" style="color: #c8a97e; text-decoration: none; font-weight: 500;">' + match[0] + '</a>');
          }
        }
      });
    }
    var heading = esc(isEN ? (data.internalHeadingEN || data.internalHeadingES || '') : (data.internalHeadingES || data.internalHeadingEN || ''));
    html += '  <!-- Internal Linking Section -->\n';
    html += '  <div class="internal-links" style="padding: 2rem 0; background-color: #f8f9fa; text-align: center;">\n';
    html += '    <div class="internal-links-container" style="max-width: 800px; margin: 0 auto; padding: 0 1rem;">\n';
    if (heading) html += '      <h2 style="color:#333; margin-bottom:1rem;">' + heading + '</h2>\n';
    if (introText) html += '      <p class="internal-links-paragraph" style="font-size: 1.1rem; line-height: 1.6; color: #555;">' + introText + '</p>\n';
    html += '    </div>\n';
    html += '  </div>\n';
    html += '\n';
  }

  // FAQ section (optional)
  if (data.faqs && data.faqs.length > 0) {
    const faqHeading = isEN ? 'Frequently Asked Questions' : 'Preguntas Frecuentes';
    html += '  <!-- FAQ Section -->\n';
    html += '  <section class="faq-section" id="faq" aria-labelledby="faq-heading" style="padding: 3rem 1rem; max-width: 900px; margin: 0 auto;">\n';
    html += '    <h2 id="faq-heading" style="text-align: center; margin-bottom: 2rem; color: #333;">' + esc(faqHeading) + '</h2>\n';
    data.faqs.forEach((faq, i) => {
      const question = esc(isEN ? faq.questionEN : faq.questionES);
      const answer = esc(isEN ? faq.answerEN : faq.answerES);
      const openAttr = i === 0 ? ' open' : '';
      const faqId = 'faq-' + lang + '-' + (i + 1);
      html += '    <details' + openAttr + ' class="faq-item" style="margin-bottom: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem;">\n';
      html += '      <summary aria-controls="' + faqId + '" style="cursor: pointer; font-weight: 600; color: #333; font-size: 1.1rem;">' + question + '</summary>\n';
      html += '      <div id="' + faqId + '" class="faq-content" style="margin-top: 1rem; color: #555; line-height: 1.6;">' + answer + '</div>\n';
      html += '    </details>\n';
    });
    html += '  </section>\n';
    html += '\n';
  }

  // Contact section container
  html += '  <div id="contact-section-container"></div>\n';
  html += '  </main>\n';
  html += '\n';

  // Footer
  html += '  <div id="footer-container"></div>\n';
  html += '\n';

  // Scripts
  html += '  <!-- Load the unified navigation system first -->\n';
  html += '  <script src="' + prefix + 'js/navigation.min.js" defer></script>\n';
  html += '\n';
  html += '  <!-- Load the language switcher -->\n';
  html += '  <script src="' + prefix + 'js/elegant-language-switcher.min.js" defer></script>\n';
  html += '\n';
  html += '  <!-- Contact tracking and form handler -->\n';
  html += '  <script src="' + prefix + 'js/contact-tracking.min.js" defer></script>\n';
  html += '\n';
  html += '  <!-- Shared page init: tabs, contact, footer, conditional slideshow -->\n';
  html += '  <script src="' + prefix + 'js/page-init.min.js?v=20260204c" defer></script>\n';

  html += '</body>\n';
  html += '</html>';

  return html;
}

// --------------- handleDeploy ---------------

async function handleDeploy() {
  var btn = document.getElementById('deploy-btn');
  btn.disabled = true;
  btn.textContent = 'Traduciendo...';
  await autoPopulateAllFields();
  btn.textContent = 'Publicando...';
  const data = collectFormData();
  if (!validate(data)) { btn.disabled = false; btn.textContent = 'Publicar en el sitio'; return; }

  const enHtml = generateHTML(data, 'en');
  const esHtml = generateHTML(data, 'es');

  const folder    = data.imageFolder || '';
  const thumbnail = data.cardThumbnail || data.ogImageFilename || '';
  const slugEN    = data.slugEN;
  const slugES    = data.slugES;

  // Card HTML for EN landing page (experiences.html)
  const cardEN = '        <div class="gallery-item">\n'
    + '            <a href="experiences/' + esc(slugEN) + '">\n'
    + '                <img src="experiences/images/' + esc(folder) + '/' + esc(thumbnail) + '" alt="' + esc(data.cardTitleEN || data.experienceNameEN || '') + '" class="gallery-image">\n'
    + '                <div class="gallery-overlay">\n'
    + '                    <h3>' + esc(data.cardTitleEN || data.experienceNameEN || '') + '</h3>\n'
    + '                    <p>' + esc(data.cardDescEN || '') + '</p>\n'
    + '                </div>\n'
    + '            </a>\n'
    + '        </div>';

  // Card HTML for ES landing page (experiences-es.html)
  const cardES = '        <div class="gallery-item">\n'
    + '            <a href="es/experiences/' + esc(slugES) + '">\n'
    + '                <img src="experiences/images/' + esc(folder) + '/' + esc(thumbnail) + '" alt="' + esc(data.cardTitleES || data.experienceNameES || '') + '" class="gallery-image">\n'
    + '                <div class="gallery-overlay">\n'
    + '                    <h3>' + esc(data.cardTitleES || data.experienceNameES || '') + '</h3>\n'
    + '                    <p>' + esc(data.cardDescES || '') + '</p>\n'
    + '                </div>\n'
    + '            </a>\n'
    + '        </div>';

  try {
    const res = await fetch('/.netlify/functions/deploy-experience', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slugEN: slugEN,
        slugES: slugES,
        year: data.year,
        enHtml: enHtml,
        esHtml: esHtml,
        cardEN: cardEN,
        cardES: cardES,
        nameEN: data.experienceNameEN || '',
        nameES: data.experienceNameES || ''
      })
    });
    const result = await res.json();

    if (res.ok && result.success) {
      showToast(result.message || 'Experiencia publicada exitosamente', false);
    } else if (res.status === 409) {
      showToast(result.error || 'Esta experiencia ya existe en el sitio');
    } else {
      showToast('Error: ' + (result.error || 'Error desconocido'));
    }
  } catch (err) {
    showToast('Error de conexi\u00f3n: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Publicar en el sitio';
  }
}

// --------------- Init ---------------

document.addEventListener('DOMContentLoaded', () => {
  // Add initial rows
  addDescriptionBlock();
  addItineraryItem();
  addGalleryImage();

  // Button listeners
  document.getElementById('add-desc-block-btn').addEventListener('click', addDescriptionBlock);
  document.getElementById('add-itinerary-btn').addEventListener('click', addItineraryItem);
  document.getElementById('add-gallery-image-btn').addEventListener('click', addGalleryImage);
  document.getElementById('add-link-btn').addEventListener('click', addInternalLink);
  document.getElementById('add-faq-btn').addEventListener('click', addFaq);

  // Generate & deploy buttons
  document.getElementById('deploy-btn').addEventListener('click', handleDeploy);

  // Gallery mode radio toggle
  const radioSeq = document.getElementById('gallery-mode-seq');
  const radioManual = document.getElementById('gallery-mode-manual');
  const seqFields = document.getElementById('gallery-seq-fields');
  const manualFields = document.getElementById('gallery-manual-fields');

  function updateGalleryMode() {
    if (radioSeq && radioSeq.checked) {
      if (seqFields) seqFields.style.display = '';
      if (manualFields) manualFields.style.display = 'none';
    } else {
      if (seqFields) seqFields.style.display = 'none';
      if (manualFields) manualFields.style.display = '';
    }
  }

  if (radioSeq) radioSeq.addEventListener('change', updateGalleryMode);
  if (radioManual) radioManual.addEventListener('change', updateGalleryMode);
  updateGalleryMode();

  // Delegate remove buttons for dynamic cards
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-row-btn')) {
      e.target.closest('.dynamic-card').remove();
    }
  });
});
