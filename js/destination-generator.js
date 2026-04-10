'use strict';

/* ============================================================
   destination-generator.js
   Client-side JS for the destination page creator form.
   Handles dynamic rows, validation, HTML generation & ZIP download.
   ============================================================ */

// --------------- Utility helpers ---------------

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

function formatDateEN(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDateES(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// --------------- Auto-generated SEO ---------------
// Follows the exact patterns from Medjugorje2026.html and TierraSanta2026.html

function extractYear(dateStr) {
  if (!dateStr) return '';
  return dateStr.split('-')[0];
}

function extractDaysNumber(durationLabel) {
  const m = durationLabel.match(/(\d+)/);
  return m ? m[1] : '';
}

function extractFirstPrice(pricingCards) {
  if (!pricingCards || pricingCards.length === 0) return '';
  // Extract price from first card's EN text, e.g., "€1,999 per person" → "€1,999"
  const text = pricingCards[0].textEN || '';
  const m = text.match(/[€$]\s?[\d,]+/);
  return m ? m[0] : '';
}

function generateSEO(data) {
  const nameEN  = data.destinationNameEN || '';
  const nameES  = data.destinationNameES || nameEN;
  const typeEN  = data.eventTypeEN || 'Pilgrimage';
  const typeES  = data.eventTypeES || 'Peregrinación';
  const themeEN = data.tripThemeEN || '';
  const themeES = data.tripThemeES || '';
  const year    = extractYear(data.startDate);
  const days    = extractDaysNumber(data.durationEN);
  const price   = extractFirstPrice(data.pricing);
  const durEN   = data.durationEN || '';
  const durES   = data.durationES || '';

  // First 3 journey location names for OG description
  const locationsEN = (data.journey || []).slice(0, 3).map(j => j.nameEN).filter(Boolean);
  const locationsES = (data.journey || []).slice(0, 3).map(j => j.nameES).filter(Boolean);
  const locsJoinEN  = locationsEN.length > 1
    ? locationsEN.slice(0, -1).join(', ') + ' and ' + locationsEN[locationsEN.length - 1]
    : locationsEN.join('');
  const locsJoinES  = locationsES.length > 1
    ? locationsES.slice(0, -1).join(', ') + ' e ' + locationsES[locationsES.length - 1]
    : locationsES.join('');

  // Page Title:
  //   EN: "Medjugorje Pilgrimage 2026 | Holy Week · From Any Country · €1,999 All Inclusive"
  //   ES: "Peregrinación a Medjugorje 2026 | Semana Santa · Desde Cualquier País · €1,999 Todo Incluido"
  const themePartEN = themeEN ? themeEN + ' · ' : '';
  const themePartES = themeES ? themeES + ' · ' : '';
  const priceTag = price ? ' · ' + price + ' All Inclusive' : '';
  const priceTagES = price ? ' · ' + price + ' Todo Incluido' : '';
  data.pageTitleEN = nameEN + ' ' + typeEN + ' ' + year + ' | ' + themePartEN + 'From Any Country' + priceTag;
  data.pageTitleES = typeES + ' a ' + nameES + ' ' + year + ' | ' + themePartES + 'Desde Cualquier País' + priceTagES;

  // Meta Description:
  //   EN: "Holy Week Pilgrimage 2026–2027 to Medjugorje. Departures from South America, United States and Europe. Bilingual guide, daily Mass. From €1,999 all inclusive."
  //   ES: "Peregrinación Semana Santa 2026–2027 a Medjugorje. Salidas desde Sur América, Estados Unidos y Europa. Guía bilingüe, Misa diaria. Desde €1,999 todo incluido."
  const themeDescEN = themeEN ? themeEN + ' ' : '';
  const themeDescES = themeES ? themeES + ' ' : '';
  const priceDesc = price ? ' From ' + price + ' all inclusive.' : '';
  const priceDescES = price ? ' Desde ' + price + ' todo incluido.' : '';
  data.metaDescEN = themeDescEN + typeEN + ' ' + year + ' to ' + nameEN + '. Departures from South America, United States and Europe. Bilingual guide, daily Mass.' + priceDesc;
  data.metaDescES = typeES + ' ' + themeDescES + year + ' a ' + nameES + '. Salidas desde Sur América, Estados Unidos y Europa. Guía bilingüe, Misa diaria.' + priceDescES;

  // OG Title:
  //   EN: "Holy Week in Medjugorje 2026 | Catholic Pilgrimage"
  //   ES: "Semana Santa en Medjugorje 2026 | Peregrinación Católica"
  const ogThemeEN = themeEN || typeEN;
  const ogThemeES = themeES || typeES;
  data.ogTitleEN = ogThemeEN + ' in ' + nameEN + ' ' + year + ' | Catholic ' + typeEN;
  data.ogTitleES = ogThemeES + ' en ' + nameES + ' ' + year + ' | ' + typeES + ' Católica';

  // OG Description:
  //   EN: "8-day pilgrimage: Apparition Hill, Cross Mountain and St. James Church. Departures from South America, United States, Europe and any part of the world."
  //   ES: "Peregrinación de 8 días: Colina de las Apariciones, Monte de la Cruz e Iglesia de Santiago. Salidas desde Sur América, Estados Unidos, Europa y cualquier parte del mundo."
  const locsPartEN = locsJoinEN ? ': ' + locsJoinEN + '.' : '.';
  const locsPartES = locsJoinES ? ': ' + locsJoinES + '.' : '.';
  data.ogDescEN = days + '-day ' + typeEN.toLowerCase() + locsPartEN + ' Departures from South America, United States, Europe and any part of the world.';
  data.ogDescES = typeES + ' de ' + days + ' días' + locsPartES + ' Salidas desde Sur América, Estados Unidos, Europa y cualquier parte del mundo.';

  // Twitter Description:
  //   EN: "Join a week of prayer and spiritual renewal in Medjugorje."
  //   ES: "Vive una semana de oración y renovación espiritual en Medjugorje."
  const twThemeEN = themeEN ? themeEN.toLowerCase() + ' ' + typeEN.toLowerCase() : typeEN.toLowerCase();
  const twThemeES = themeES ? typeES.toLowerCase() + ' de ' + themeES : typeES.toLowerCase();
  data.twitterDescEN = 'Join a ' + twThemeEN + ' of prayer and spiritual renewal in ' + nameEN + '.';
  data.twitterDescES = 'Vive una ' + twThemeES + ' de oración y renovación espiritual en ' + nameES + '.';

  // OG Image Alt:
  //   EN: "Statue of the Virgin Mary in Medjugorje during Holy Week"
  //   ES: "Estatua de la Virgen María en Medjugorje durante Semana Santa"
  data.ogImageAltEN = nameEN + ' Catholic ' + typeEN.toLowerCase() + ' ' + year;
  data.ogImageAltES = typeES + ' católica a ' + nameES + ' ' + year;

  // OG Image: fall back to first slide's 1200w if no explicit filename
  if (!data.ogImageFilename && data.slides && data.slides.length > 0) {
    data.ogImageFilename = data.slides[0].file1200;
  }
}

// --------------- Language toggle helper ---------------

function currentLang() {
  var active = document.querySelector('.lang-toggle .lang-btn.active');
  return active ? active.dataset.lang : 'en';
}

// --------------- Dynamic row management ---------------

const LIMITS = {
  altDates:  3,
  slides:   15,
  pricing:   4,
  journey:   6,
  links:    10,
  faq:      10
};

function countRows(containerId) {
  return document.querySelectorAll('#' + containerId + ' .dynamic-card').length;
}

function updateSlideHints() {
  const cards = document.querySelectorAll('#slideshow-images-list .dynamic-card');
  cards.forEach((card, i) => {
    const hint = card.querySelector('.field-hint');
    if (hint) hint.style.display = i === 0 ? 'block' : 'none';
  });
}

// --- Alternate Date ---
function addAlternateDate() {
  if (countRows('alternate-dates-list') >= LIMITS.altDates) {
    showToast('Maximum ' + LIMITS.altDates + ' alternate dates allowed');
    return;
  }
  var lang = currentLang();
  var enD = lang === 'en' ? '' : 'display:none';
  var esD = lang === 'es' ? '' : 'display:none';
  const html = `<div class="dynamic-card">
  <button type="button" class="remove-row-btn">&times;</button>
  <div class="form-row">
    <div class="form-group lang-field lang-en" style="${enD}">
      <label>Date Label</label>
      <input type="text" class="form-input alt-date-en" placeholder="September 17 to 25, 2026">
    </div>
    <div class="form-group lang-field lang-es" style="${esD}">
      <label>Etiqueta de Fecha</label>
      <input type="text" class="form-input alt-date-es" placeholder="17 al 25 de septiembre de 2026">
    </div>
  </div>
</div>`;
  document.getElementById('alternate-dates-list').insertAdjacentHTML('beforeend', html);
}

// --- Slideshow Image ---
function addSlide() {
  if (countRows('slideshow-images-list') >= LIMITS.slides) {
    showToast('Maximum ' + LIMITS.slides + ' slideshow images allowed');
    return;
  }
  var lang = currentLang();
  var enD = lang === 'en' ? '' : 'display:none';
  var esD = lang === 'es' ? '' : 'display:none';
  const html = `<div class="dynamic-card">
  <button type="button" class="remove-row-btn">&times;</button>
  <p class="field-hint" style="display:none;">Primera imagen: loading="eager", fetchpriority="high"</p>
  <div class="form-row">
    <div class="form-group"><label>Filename 800w</label><input type="text" class="form-input slide-file-800" placeholder="image-800.webp"></div>
    <div class="form-group"><label>Filename 1200w</label><input type="text" class="form-input slide-file-1200" placeholder="image-1200.webp"></div>
  </div>
  <div class="form-row">
    <div class="form-group lang-field lang-en" style="${enD}"><label>Alt</label><input type="text" class="form-input slide-alt-en"></div>
    <div class="form-group lang-field lang-es" style="${esD}"><label>Texto Alternativo</label><input type="text" class="form-input slide-alt-es"></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Width</label><input type="number" class="form-input slide-width" value="1200"></div>
    <div class="form-group"><label>Height</label><input type="number" class="form-input slide-height" value="800"></div>
  </div>
</div>`;
  document.getElementById('slideshow-images-list').insertAdjacentHTML('beforeend', html);
  updateSlideHints();
}

// --- Pricing Card ---
function addPricingCard() {
  if (countRows('pricing-cards-list') >= LIMITS.pricing) {
    showToast('Maximum ' + LIMITS.pricing + ' pricing cards allowed');
    return;
  }
  var lang = currentLang();
  var enD = lang === 'en' ? '' : 'display:none';
  var esD = lang === 'es' ? '' : 'display:none';
  const html = `<div class="dynamic-card">
  <button type="button" class="remove-row-btn">&times;</button>
  <div class="form-row">
    <div class="form-group lang-field lang-en" style="${enD}"><label>Card Title</label><input type="text" class="form-input price-title-en"></div>
    <div class="form-group lang-field lang-es" style="${esD}"><label>T\u00edtulo de la Tarjeta</label><input type="text" class="form-input price-title-es"></div>
  </div>
  <div class="form-row">
    <div class="form-group lang-field lang-en" style="${enD}"><label>Price Text</label><input type="text" class="form-input price-text-en" placeholder="\u20AC1,999 per person"></div>
    <div class="form-group lang-field lang-es" style="${esD}"><label>Texto del Precio</label><input type="text" class="form-input price-text-es" placeholder="\u20AC1,999 por persona"></div>
  </div>
  <div class="form-row">
    <div class="form-group lang-field lang-en" style="${enD}"><label>Bullets (one per line)</label><textarea class="form-input price-bullets-en" rows="3"></textarea></div>
    <div class="form-group lang-field lang-es" style="${esD}"><label>Vi\u00f1etas (una por l\u00ednea)</label><textarea class="form-input price-bullets-es" rows="3"></textarea></div>
  </div>
</div>`;
  document.getElementById('pricing-cards-list').insertAdjacentHTML('beforeend', html);
}

// --- Journey Tab ---
function addJourneyTab() {
  if (countRows('journey-tabs-list') >= LIMITS.journey) {
    showToast('Maximum ' + LIMITS.journey + ' journey tabs allowed');
    return;
  }
  var lang = currentLang();
  var enD = lang === 'en' ? '' : 'display:none';
  var esD = lang === 'es' ? '' : 'display:none';
  const html = `<div class="dynamic-card">
  <button type="button" class="remove-row-btn">&times;</button>
  <div class="form-row">
    <div class="form-group lang-field lang-en" style="${enD}"><label>Location Name</label><input type="text" class="form-input journey-name-en"></div>
    <div class="form-group lang-field lang-es" style="${esD}"><label>Nombre de la Ubicaci\u00f3n</label><input type="text" class="form-input journey-name-es"></div>
  </div>
  <h4 style="color:#c8a97e; margin:12px 0 8px;">Experience Tab</h4>
  <div class="form-row">
    <div class="form-group lang-field lang-en" style="${enD}"><label>Experience Heading</label><input type="text" class="form-input journey-exp-heading-en"></div>
    <div class="form-group lang-field lang-es" style="${esD}"><label>T\u00edtulo Experiencia</label><input type="text" class="form-input journey-exp-heading-es"></div>
  </div>
  <div class="form-row"><div class="form-group full-width lang-field lang-en" style="${enD}"><label>Experience Paragraph 1</label><textarea class="form-input journey-exp-p1-en" rows="3"></textarea></div><div class="form-group full-width lang-field lang-es" style="${esD}"><label>P\u00e1rrafo Experiencia 1</label><textarea class="form-input journey-exp-p1-es" rows="3"></textarea></div></div>
  <div class="form-row"><div class="form-group full-width lang-field lang-en" style="${enD}"><label>Experience Paragraph 2</label><textarea class="form-input journey-exp-p2-en" rows="3"></textarea></div><div class="form-group full-width lang-field lang-es" style="${esD}"><label>P\u00e1rrafo Experiencia 2</label><textarea class="form-input journey-exp-p2-es" rows="3"></textarea></div></div>
  <h4 style="color:#c8a97e; margin:12px 0 8px;">History Tab</h4>
  <div class="form-row">
    <div class="form-group lang-field lang-en" style="${enD}"><label>History Heading</label><input type="text" class="form-input journey-hist-heading-en"></div>
    <div class="form-group lang-field lang-es" style="${esD}"><label>T\u00edtulo Historia</label><input type="text" class="form-input journey-hist-heading-es"></div>
  </div>
  <div class="form-row"><div class="form-group full-width lang-field lang-en" style="${enD}"><label>History Paragraph 1</label><textarea class="form-input journey-hist-p1-en" rows="3"></textarea></div><div class="form-group full-width lang-field lang-es" style="${esD}"><label>P\u00e1rrafo Historia 1</label><textarea class="form-input journey-hist-p1-es" rows="3"></textarea></div></div>
  <div class="form-row"><div class="form-group full-width lang-field lang-en" style="${enD}"><label>History Paragraph 2</label><textarea class="form-input journey-hist-p2-en" rows="3"></textarea></div><div class="form-group full-width lang-field lang-es" style="${esD}"><label>P\u00e1rrafo Historia 2</label><textarea class="form-input journey-hist-p2-es" rows="3"></textarea></div></div>
</div>`;
  document.getElementById('journey-tabs-list').insertAdjacentHTML('beforeend', html);
}

// --- Internal Link ---
function addInternalLink() {
  if (countRows('internal-links-list') >= LIMITS.links) {
    showToast('Maximum ' + LIMITS.links + ' internal links allowed');
    return;
  }
  const html = `<div class="dynamic-card">
  <button type="button" class="remove-row-btn">&times;</button>
  <div class="form-row">
    <div class="form-group"><label>URL</label><input type="text" class="form-input link-url" placeholder="/experiences/medjugorje2024"></div>
    <div class="form-group"><label>Label</label><input type="text" class="form-input link-label" placeholder="2024"></div>
  </div>
</div>`;
  document.getElementById('internal-links-list').insertAdjacentHTML('beforeend', html);
}

// --- FAQ ---
function addFaq() {
  if (countRows('faq-list') >= LIMITS.faq) {
    showToast('Maximum ' + LIMITS.faq + ' FAQ items allowed');
    return;
  }
  var lang = currentLang();
  var enD = lang === 'en' ? '' : 'display:none';
  var esD = lang === 'es' ? '' : 'display:none';
  const html = `<div class="dynamic-card">
  <button type="button" class="remove-row-btn">&times;</button>
  <div class="form-row">
    <div class="form-group lang-field lang-en" style="${enD}"><label>Question</label><input type="text" class="form-input faq-q-en"></div>
    <div class="form-group lang-field lang-es" style="${esD}"><label>Pregunta</label><input type="text" class="form-input faq-q-es"></div>
  </div>
  <div class="form-row">
    <div class="form-group lang-field lang-en" style="${enD}"><label>Answer</label><textarea class="form-input faq-a-en" rows="3"></textarea></div>
    <div class="form-group lang-field lang-es" style="${esD}"><label>Respuesta</label><textarea class="form-input faq-a-es" rows="3"></textarea></div>
  </div>
</div>`;
  document.getElementById('faq-list').insertAdjacentHTML('beforeend', html);
}

// --------------- Data collection ---------------

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function collectFormData() {
  const data = {};

  // Core fields
  data.destinationNameEN = val('destination-name-en');
  data.destinationNameES = val('destination-name-es');
  data.slug              = val('url-slug');
  data.imageFolder       = val('image-folder');
  data.tripThemeEN       = val('trip-theme-en');
  data.tripThemeES       = val('trip-theme-es');
  data.h1EN              = val('h1-en');
  data.h1ES              = val('h1-es');
  data.subheadingEN      = val('subheading-en');
  data.subheadingES      = val('subheading-es');
  data.ogImageFilename   = val('og-image-filename');

  // Overview
  data.overviewP1EN       = val('overview-p1-en');
  data.overviewP1ES       = val('overview-p1-es');
  data.overviewHeadingEN  = val('overview-heading-en');
  data.overviewHeadingES  = val('overview-heading-es');
  data.overviewP2EN       = val('overview-p2-en');
  data.overviewP2ES       = val('overview-p2-es');

  // Dates
  data.startDate      = val('start-date');
  data.endDate        = val('end-date');
  data.eventTypeEN    = val('event-type-en');
  data.eventTypeES    = val('event-type-es');
  data.durationEN     = val('duration-en');
  data.durationES     = val('duration-es');

  // JSON-LD extras
  data.validFrom          = val('valid-from');
  data.validThrough       = val('valid-through');
  data.locationName       = val('location-name');
  data.locationCountry    = val('location-country');
  data.sameAs             = val('same-as');
  // Derived values for JSON-LD (no separate form fields)
  data.datePublished      = data.startDate || '';
  data.dateModified       = new Date().toISOString().split('T')[0];

  // Payment plan
  data.paymentIntroEN     = val('payment-intro-en');
  data.paymentIntroES     = val('payment-intro-es');
  data.depositTextEN      = val('deposit-text-en');
  data.depositTextES      = val('deposit-text-es');
  data.optionALabelEN     = val('option-a-label-en');
  data.optionALabelES     = val('option-a-label-es');
  data.optionAPriceEN     = val('option-a-price-en');
  data.optionAPriceES     = val('option-a-price-es');
  data.optionADescEN      = val('option-a-desc-en');
  data.optionADescES      = val('option-a-desc-es');
  data.optionBLabelEN     = val('option-b-label-en');
  data.optionBLabelES     = val('option-b-label-es');
  data.optionBPriceEN     = val('option-b-price-en');
  data.optionBPriceES     = val('option-b-price-es');
  data.optionBDescEN      = val('option-b-desc-en');
  data.optionBDescES      = val('option-b-desc-es');

  // Internal links section text
  data.internalHeadingEN  = val('internal-heading-en');
  data.internalHeadingES  = val('internal-heading-es');
  data.internalIntroEN    = val('internal-intro-en');
  data.internalIntroES    = val('internal-intro-es');

  // Dynamic sections
  data.altDates = [];
  document.querySelectorAll('#alternate-dates-list .dynamic-card').forEach(card => {
    const en = card.querySelector('.alt-date-en').value.trim();
    const es = card.querySelector('.alt-date-es').value.trim();
    if (en || es) data.altDates.push({ en, es });
  });

  data.slides = [];
  document.querySelectorAll('#slideshow-images-list .dynamic-card').forEach(card => {
    const file800  = card.querySelector('.slide-file-800').value.trim();
    const file1200 = card.querySelector('.slide-file-1200').value.trim();
    const altEN    = card.querySelector('.slide-alt-en').value.trim();
    const altES    = card.querySelector('.slide-alt-es').value.trim();
    const width    = card.querySelector('.slide-width').value.trim() || '1200';
    const height   = card.querySelector('.slide-height').value.trim() || '800';
    if (file800 || file1200) data.slides.push({ file800, file1200, altEN, altES, width, height });
  });

  data.pricing = [];
  document.querySelectorAll('#pricing-cards-list .dynamic-card').forEach(card => {
    const titleEN   = card.querySelector('.price-title-en').value.trim();
    const titleES   = card.querySelector('.price-title-es').value.trim();
    const textEN    = card.querySelector('.price-text-en').value.trim();
    const textES    = card.querySelector('.price-text-es').value.trim();
    const bulletsEN = card.querySelector('.price-bullets-en').value.trim();
    const bulletsES = card.querySelector('.price-bullets-es').value.trim();
    if (titleEN || titleES) {
      data.pricing.push({
        titleEN, titleES, textEN, textES,
        bulletsEN: bulletsEN ? bulletsEN.split('\n').filter(b => b.trim()) : [],
        bulletsES: bulletsES ? bulletsES.split('\n').filter(b => b.trim()) : []
      });
    }
  });

  data.journey = [];
  document.querySelectorAll('#journey-tabs-list .dynamic-card').forEach(card => {
    const nameEN         = card.querySelector('.journey-name-en').value.trim();
    const nameES         = card.querySelector('.journey-name-es').value.trim();
    const expHeadingEN   = card.querySelector('.journey-exp-heading-en').value.trim();
    const expHeadingES   = card.querySelector('.journey-exp-heading-es').value.trim();
    const expP1EN        = card.querySelector('.journey-exp-p1-en').value.trim();
    const expP1ES        = card.querySelector('.journey-exp-p1-es').value.trim();
    const expP2EN        = card.querySelector('.journey-exp-p2-en').value.trim();
    const expP2ES        = card.querySelector('.journey-exp-p2-es').value.trim();
    const histHeadingEN  = card.querySelector('.journey-hist-heading-en').value.trim();
    const histHeadingES  = card.querySelector('.journey-hist-heading-es').value.trim();
    const histP1EN       = card.querySelector('.journey-hist-p1-en').value.trim();
    const histP1ES       = card.querySelector('.journey-hist-p1-es').value.trim();
    const histP2EN       = card.querySelector('.journey-hist-p2-en').value.trim();
    const histP2ES       = card.querySelector('.journey-hist-p2-es').value.trim();
    if (nameEN || nameES) {
      data.journey.push({
        nameEN, nameES,
        expHeadingEN, expHeadingES, expP1EN, expP1ES, expP2EN, expP2ES,
        histHeadingEN, histHeadingES, histP1EN, histP1ES, histP2EN, histP2ES
      });
    }
  });

  data.links = [];
  document.querySelectorAll('#internal-links-list .dynamic-card').forEach(card => {
    const url   = card.querySelector('.link-url').value.trim();
    const label = card.querySelector('.link-label').value.trim();
    if (url && label) data.links.push({ url, label });
  });

  data.faqs = [];
  document.querySelectorAll('#faq-list .dynamic-card').forEach(card => {
    const qEN = card.querySelector('.faq-q-en').value.trim();
    const qES = card.querySelector('.faq-q-es').value.trim();
    const aEN = card.querySelector('.faq-a-en').value.trim();
    const aES = card.querySelector('.faq-a-es').value.trim();
    if (qEN || qES) data.faqs.push({ qEN, qES, aEN, aES });
  });

  // Auto-generate all SEO fields from content
  generateSEO(data);

  return data;
}

// --------------- Validation ---------------

function validate(data) {
  const checks = [
    [data.destinationNameEN, 'destination-name-en', 'Destination Name EN is required'],
    [data.slug,              'url-slug',            'URL Slug is required'],
    [data.eventTypeEN,       'event-type-en',       'Event Type EN is required'],
    [data.startDate,         'start-date',          'Start Date is required'],
    [data.durationEN,        'duration-en',         'Duration Label EN is required'],
    [data.h1EN,              'h1-en',               'H1 Heading EN is required'],
    [data.h1ES,              'h1-es',               'H1 Heading ES is required'],
  ];

  for (const [value, id, msg] of checks) {
    if (!value) {
      showToast(msg);
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
  }

  if (data.slides.length === 0) {
    showToast('At least 1 slideshow image is required');
    document.getElementById('slideshow-images-list').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }

  return true;
}

// --------------- JSON-LD generation ---------------

function buildJsonLd(data, lang) {
  const isEN     = lang === 'en';
  const slug     = data.slug;
  const baseUrl  = 'https://www.skytraveljm.com';
  const pageUrl  = baseUrl + '/' + slug + (isEN ? '' : '-es');

  // WebPage
  const webPage = {
    '@type': 'WebPage',
    '@id': baseUrl + '/' + slug + '#webpage',
    'url': pageUrl,
    'name': isEN ? data.pageTitleEN : data.pageTitleES,
    'inLanguage': lang,
    'description': isEN ? data.metaDescEN : data.metaDescES,
    'datePublished': data.datePublished || '',
    'dateModified': data.dateModified || '',
    'isPartOf': { '@type': 'WebSite', '@id': baseUrl + '#website' }
  };

  // TravelAgency
  const sameAsArr = data.sameAs ? data.sameAs.split('\n').map(s => s.trim()).filter(Boolean) : [];
  const travelAgency = {
    '@type': 'TravelAgency',
    '@id': baseUrl + '#organization',
    'name': 'Sky Travel JM',
    'url': baseUrl,
    ...(sameAsArr.length > 0 ? { 'sameAs': sameAsArr } : {}),
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': 'Miami',
      'addressRegion': 'FL',
      'addressCountry': 'US'
    },
    'areaServed': [
      { '@type': 'Country', 'name': 'Colombia' },
      { '@type': 'Country', 'name': 'United States' },
      { '@type': 'Country', 'name': 'Spain' },
      { '@type': 'Country', 'name': 'Mexico' },
      { '@type': 'Country', 'name': 'Argentina' },
      { '@type': 'Country', 'name': 'Peru' },
      { '@type': 'Country', 'name': 'Venezuela' },
      { '@type': 'Country', 'name': 'Chile' },
      { '@type': 'Country', 'name': 'Ecuador' },
      { '@type': 'Country', 'name': 'Bolivia' },
      { '@type': 'Country', 'name': 'Paraguay' },
      { '@type': 'Country', 'name': 'Uruguay' },
      { '@type': 'Country', 'name': 'Guatemala' },
      { '@type': 'Country', 'name': 'Costa Rica' },
      { '@type': 'Country', 'name': 'Panama' },
      { '@type': 'Country', 'name': 'Honduras' },
      { '@type': 'Country', 'name': 'El Salvador' },
      { '@type': 'Country', 'name': 'Nicaragua' },
      { '@type': 'Country', 'name': 'Dominican Republic' },
      { '@type': 'Country', 'name': 'Puerto Rico' }
    ]
  };

  // TouristTrip images (first 3 slides)
  const tripImages = data.slides.slice(0, 3).map(s =>
    baseUrl + '/imagesWebp/' + data.imageFolder + '/' + s.file1200
  );

  // Offers from pricing cards
  const tripOffers = data.pricing.map(p => {
    const priceNum = parseInt((isEN ? p.textEN : p.textES).replace(/[^0-9]/g, ''));
    return {
      '@type': 'Offer',
      'name': isEN ? p.titleEN : p.titleES,
      'price': isNaN(priceNum) ? '0' : String(priceNum),
      'priceCurrency': 'EUR',
      'validFrom': data.validFrom || '',
      'availability': 'https://schema.org/InStock',
      'url': baseUrl + '/' + slug + (isEN ? '' : '-es'),
      'validThrough': data.validThrough || ''
    };
  });

  const touristTrip = {
    '@type': 'TouristTrip',
    '@id': baseUrl + '/' + slug + '#trip',
    'name': isEN ? data.pageTitleEN : data.pageTitleES,
    'mainEntityOfPage': { '@id': baseUrl + '/' + slug + '#webpage' },
    'description': isEN ? data.metaDescEN : data.metaDescES,
    'provider': { '@id': baseUrl + '#organization' },
    'image': tripImages,
    'touristType': 'Catholic pilgrims',
    'availableLanguage': ['English', 'Spanish'],
    'offers': tripOffers
  };

  // Event
  const firstPrice = data.pricing.length > 0
    ? parseInt((isEN ? data.pricing[0].textEN : data.pricing[0].textES).replace(/[^0-9]/g, ''))
    : 0;

  const event = {
    '@type': 'Event',
    '@id': baseUrl + '/' + slug + '#event',
    'name': isEN ? data.pageTitleEN : data.pageTitleES,
    'startDate': data.startDate,
    'endDate': data.endDate,
    'eventStatus': 'https://schema.org/EventScheduled',
    'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
    'location': {
      '@type': 'Place',
      'name': data.locationName || data.destinationNameEN,
      'address': {
        '@type': 'PostalAddress',
        'addressLocality': data.locationName || data.destinationNameEN,
        'addressCountry': data.locationCountry || ''
      }
    },
    'organizer': { '@id': baseUrl + '#organization' },
    'offers': {
      '@type': 'Offer',
      'price': isNaN(firstPrice) ? '0' : String(firstPrice),
      'priceCurrency': 'EUR',
      'validFrom': data.validFrom || '',
      'availability': 'https://schema.org/InStock',
      'url': baseUrl + '/' + slug + (isEN ? '' : '-es'),
      'validThrough': data.validThrough || ''
    }
  };

  // FAQPage
  const faqPage = {
    '@type': 'FAQPage',
    '@id': baseUrl + '/' + slug + '#faq',
    'inLanguage': lang,
    'mainEntity': data.faqs.map(f => ({
      '@type': 'Question',
      'name': isEN ? f.qEN : f.qES,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': isEN ? f.aEN : f.aES
      }
    }))
  };

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [webPage, travelAgency, touristTrip, event, faqPage]
  }, null, 2);
}

// --------------- HTML generation ---------------

function generateHTML(data, lang) {
  const isEN    = lang === 'en';
  const slug    = data.slug;
  const baseUrl = 'https://www.skytraveljm.com';
  const pageUrl = baseUrl + '/' + slug + (isEN ? '' : '-es');
  const esUrl   = baseUrl + '/' + slug + '-es';
  const enUrl   = baseUrl + '/' + slug;

  // --- <head> ---

  const pageTitle   = isEN ? data.pageTitleEN : data.pageTitleES;
  const metaDesc    = isEN ? data.metaDescEN : data.metaDescES;
  const ogTitle     = isEN ? (data.ogTitleEN || pageTitle) : (data.ogTitleES || pageTitle);
  const ogDesc      = isEN ? (data.ogDescEN || metaDesc) : (data.ogDescES || metaDesc);
  const ogImageAlt  = isEN ? data.ogImageAltEN : data.ogImageAltES;
  const twitterDesc = isEN ? (data.twitterDescEN || ogDesc) : (data.twitterDescES || ogDesc);
  const ogLocale    = isEN ? 'en_US' : 'es_ES';

  const ogAlternateLocales = isEN
    ? ['es_ES', 'es_CO', 'es_MX', 'es_AR', 'es_PE', 'es_CL', 'es_VE']
    : ['en_US', 'es_CO', 'es_MX', 'es_AR', 'es_PE', 'es_CL', 'es_VE'];

  const ogAlternateHtml = ogAlternateLocales.map(l =>
    `    <meta property="og:locale:alternate" content="${l}">`
  ).join('\n');

  const firstSlide = data.slides[0] || {};

  // Hreflang block (same 23 entries for both EN and ES)
  const hreflangEsLocales = [
    'es', 'es-US', 'es-CO', 'es-MX', 'es-ES', 'es-AR', 'es-PE', 'es-VE',
    'es-CL', 'es-EC', 'es-GT', 'es-CR', 'es-PA', 'es-BO', 'es-PY', 'es-UY',
    'es-HN', 'es-SV', 'es-NI', 'es-DO', 'es-PR'
  ];
  const hreflangHtml = hreflangEsLocales.map(h =>
    `    <link rel="alternate" hreflang="${h}" href="${esUrl}">`
  ).join('\n') + '\n' +
    `    <link rel="alternate" hreflang="en" href="${enUrl}">\n` +
    `    <link rel="alternate" hreflang="x-default" href="${enUrl}">`;

  // JSON-LD
  const jsonLd = buildJsonLd(data, lang);

  // --- Slideshow ---
  const slidesHtml = data.slides.map((s, i) => {
    const alt       = esc(isEN ? s.altEN : s.altES);
    const loadAttr  = i === 0 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
    return `                <div class="slide">
                    <img srcset="imagesWebp/${esc(data.imageFolder)}/${esc(s.file800)} 800w, imagesWebp/${esc(data.imageFolder)}/${esc(s.file1200)} 1200w"
                        sizes="(max-width: 768px) 100vw, 1200px"
                        src="imagesWebp/${esc(data.imageFolder)}/${esc(s.file1200)}"
                        alt="${alt}"
                        width="${esc(s.width)}" height="${esc(s.height)}"
                        ${loadAttr} decoding="async">
                </div>`;
  }).join('\n');

  // --- Trip dates ---
  let dateRangeEN = '';
  let dateRangeES = '';
  if (data.startDate && data.endDate) {
    dateRangeEN = formatDateEN(data.startDate) + ' to ' + formatDateEN(data.endDate);
    dateRangeES = formatDateES(data.startDate) + ' al ' + formatDateES(data.endDate);
  }
  const dateRange = isEN ? dateRangeEN : dateRangeES;

  const dateLabelLine = isEN
    ? `Travel Date \u2013 ${esc(data.eventTypeEN)} \u2022 (${esc(data.durationEN)})`
    : `Fecha de Viaje \u2013 ${esc(data.eventTypeES)} \u2022 (${esc(data.durationES)})`;

  let altDatesHtml = '';
  if (data.altDates.length > 0) {
    const altIntro = isEN
      ? `We also offer additional dates to experience ${esc(data.destinationNameEN)}`
      : `Tambi\u00E9n ofrecemos fechas adicionales para experimentar ${esc(data.destinationNameES)}`;
    altDatesHtml = `\n                <br>\n                <h4>${altIntro}</h4>`;
    data.altDates.forEach(ad => {
      const label = esc(isEN ? ad.en : ad.es);
      altDatesHtml += `\n                <h4>${label}</h4>`;
    });
  }

  // --- Pricing cards ---
  const pricingHtml = data.pricing.map(p => {
    const title   = esc(isEN ? p.titleEN : p.titleES);
    const text    = esc(isEN ? p.textEN : p.textES);
    const bullets = isEN ? p.bulletsEN : p.bulletsES;
    const bulletsLi = bullets.map(b => `                        <li>${esc(b)}</li>`).join('\n');
    return `                <div class="highlight-card">
                    <h3>${title}</h3>
                    <p>${text}</p>
                    <ul class="highlight-list">
${bulletsLi}
                    </ul>
                </div>`;
  }).join('\n');

  // --- Journey tabs ---
  const journeyHtml = data.journey.map(j => {
    const name       = esc(isEN ? j.nameEN : j.nameES);
    const tabId      = slugify(j.nameEN || j.nameES);
    const expLabel   = isEN ? 'Experience' : 'Experiencia';
    const histLabel  = isEN ? 'History' : 'Historia';
    const expHead    = esc(isEN ? j.expHeadingEN : j.expHeadingES);
    const expP1      = esc(isEN ? j.expP1EN : j.expP1ES);
    const expP2      = esc(isEN ? j.expP2EN : j.expP2ES);
    const histHead   = esc(isEN ? j.histHeadingEN : j.histHeadingES);
    const histP1     = esc(isEN ? j.histP1EN : j.histP1ES);
    const histP2     = esc(isEN ? j.histP2EN : j.histP2ES);

    return `                <div class="info-section">
                    <h3 style="color: #1f1f1f;">${name}</h3>
                    <div class="tab-container">
                        <div class="tab-buttons">
                            <button class="tab-button active" data-tab="${tabId}-experience">${expLabel}</button>
                            <button class="tab-button" data-tab="${tabId}-history">${histLabel}</button>
                        </div>
                        <div class="tab-content">
                            <div class="tab-pane active" id="${tabId}-experience">
                                <h3 style="color: #1f1f1f;">${expHead}</h3>
                                <p>${expP1}</p>
                                <p>${expP2}</p>
                            </div>
                            <div class="tab-pane" id="${tabId}-history">
                                <h3 style="color: #1f1f1f;">${histHead}</h3>
                                <p>${histP1}</p>
                                <p>${histP2}</p>
                            </div>
                        </div>
                    </div>
                </div>`;
  }).join('\n\n');

  // --- Internal links section ---
  let internalLinksSection = '';
  if (data.links.length > 0 || (isEN ? data.internalIntroEN : data.internalIntroES)) {
    const heading  = esc(isEN ? data.internalHeadingEN : data.internalHeadingES);
    const intro    = isEN ? data.internalIntroEN : data.internalIntroES;
    const linkTags = data.links.map(l =>
      `<a href="${esc(l.url)}" class="internal-link">${esc(l.label)}</a>`
    ).join(', ');

    let linksParaHtml = '';
    if (data.links.length > 0) {
      linksParaHtml = `\n                <p class="internal-links-paragraph">${linkTags}</p>`;
    }

    internalLinksSection = `
        <!-- Internal Linking Section -->
        <section class="internal-links">
            <div class="internal-links-container">
                <h2 class="internal-links-heading">${heading}</h2>
                <p class="internal-links-paragraph">${esc(intro)}</p>${linksParaHtml}
            </div>
        </section>`;
  }

  // --- FAQ ---
  const faqLang = isEN ? 'en' : 'es';
  const faqHeading = isEN ? 'Frequently Asked Questions' : 'Preguntas Frecuentes';
  const faqItemsHtml = data.faqs.map((f, i) => {
    const openAttr = i === 0 ? ' open' : '';
    const expanded = i === 0 ? 'true' : 'false';
    const q = esc(isEN ? f.qEN : f.qES);
    const a = esc(isEN ? f.aEN : f.aES);
    return `            <details${openAttr} class="faq-item" role="group"
                style="margin-bottom: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem;">
                <summary role="button" aria-expanded="${expanded}" aria-controls="faq-${faqLang}-${i + 1}"
                    style="cursor: pointer; font-weight: 600; color: #333; font-size: 1.1rem;">${q}</summary>
                <div id="faq-${faqLang}-${i + 1}" class="faq-content" style="margin-top: 1rem; color: #555; line-height: 1.6;">${a}</div>
            </details>`;
  }).join('\n');

  // --- Navigation ---
  let navHtml;
  if (isEN) {
    navHtml = `                <a href="/" class="logo">
                    <img src="imagesWebp/Logo.webp" alt="Sky Travel - Luxury Spiritual Pilgrimage Travel Agency Logo"
                        class="logo-image" width="200" height="200" style="width: 100px; height: auto;" loading="eager"
                        decoding="async">
                </a>
                <div class="nav-links" id="nav-links">
                    <a href="/#featured" class="nav-item">Destinations</a>
                    <a href="experiences" class="nav-item">Experiences</a>
                    <a href="blog" class="nav-item">Blog</a>
                    <a href="about" class="nav-item">About</a>
                    <a href="testimony/testimonials" class="nav-item">Testimonials</a>
                    <a href="contact" class="nav-item">Contact</a>
                    <div class="language-switcher">
                        <a href="${enUrl}" class="lang-option active-lang">EN</a>
                        <span class="lang-separator">|</span>
                        <a href="${esUrl}" class="lang-option">ES</a>
                    </div>
                </div>
                <button type="button" class="menu-toggle" aria-label="Toggle navigation" aria-expanded="false"
                    aria-controls="nav-links">
                    \u2630
                </button>`;
  } else {
    navHtml = `                <a href="/index-es" class="logo">
                    <img src="imagesWebp/Logo.webp" alt="Sky Travel - Logo de Agencia de Peregrinaciones Espirituales"
                        class="logo-image" width="200" height="200" style="width: 100px; height: auto;" loading="eager"
                        decoding="async">
                </a>
                <div class="nav-links" id="nav-links">
                    <a href="/index-es#featured" class="nav-item">Destinos</a>
                    <a href="experiences-es" class="nav-item">Experiencias</a>
                    <a href="blog-es" class="nav-item">Blog</a>
                    <a href="about-es" class="nav-item">Sobre Nosotros</a>
                    <a href="testimony/testimonios" class="nav-item">Testimonios</a>
                    <a href="contact-es" class="nav-item">Contacto</a>
                    <div class="language-switcher">
                        <a href="${enUrl}" class="lang-option">EN</a>
                        <span class="lang-separator">|</span>
                        <a href="${esUrl}" class="lang-option active-lang">ES</a>
                    </div>
                </div>
                <button type="button" class="menu-toggle" aria-label="Alternar navegaci\u00F3n" aria-expanded="false"
                    aria-controls="nav-links">
                    \u2630
                </button>`;
  }

  const skipText     = isEN ? 'Skip to main content' : 'Ir al contenido principal';
  const navAriaLabel = isEN ? 'Main navigation' : 'Navegaci\u00F3n principal';
  const journeyTitle = isEN ? 'Journey Details' : 'Detalles del Recorrido';
  const paymentTitle = isEN ? 'Payment Plan' : 'Plan de Pagos';

  // Payment plan section
  const paymentIntro  = esc(isEN ? data.paymentIntroEN : data.paymentIntroES);
  const depositText   = esc(isEN ? data.depositTextEN : data.depositTextES);
  const optALabel     = esc(isEN ? data.optionALabelEN : data.optionALabelES);
  const optAPrice     = esc(isEN ? data.optionAPriceEN : data.optionAPriceES);
  const optADesc      = esc(isEN ? data.optionADescEN : data.optionADescES);
  const optBLabel     = esc(isEN ? data.optionBLabelEN : data.optionBLabelES);
  const optBPrice     = esc(isEN ? data.optionBPriceEN : data.optionBPriceES);
  const optBDesc      = esc(isEN ? data.optionBDescEN : data.optionBDescES);

  // Overview
  const overviewP1      = esc(isEN ? data.overviewP1EN : data.overviewP1ES);
  const overviewHeading = esc(isEN ? data.overviewHeadingEN : data.overviewHeadingES);
  const overviewP2      = esc(isEN ? data.overviewP2EN : data.overviewP2ES);

  // H1 / subheading
  const h1         = esc(isEN ? data.h1EN : data.h1ES);
  const subheading = esc(isEN ? data.subheadingEN : data.subheadingES);

  // --- Assemble full HTML ---
  return `<!DOCTYPE html>
<html lang="${lang}">

<head>
    <!-- Basic Meta Tags -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Google Site Verification -->
    <meta name="google-site-verification" content="b7kIWNJg3tO3n75FyCzLnPWhzz1t8MWMuugQQ43va-E">

    <title>${esc(pageTitle)}</title>
    <meta name="description" content="${esc(metaDesc)}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="geo.region" content="US-FL">
    <meta name="geo.placename" content="Miami">
    <meta name="geo.position" content="25.7617;-80.1918">
    <meta name="ICBM" content="25.7617, -80.1918">
    <link rel="canonical" href="${pageUrl}">

    <!-- Hreflang: Country-specific variants for global Spanish-speaking markets -->
${hreflangHtml}

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="${esc(ogTitle)}">
    <meta property="og:description" content="${esc(ogDesc)}">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:site_name" content="Sky Travel">
    <meta property="og:locale" content="${ogLocale}">
${ogAlternateHtml}
    <meta property="og:image" content="${baseUrl}/imagesWebp/${esc(data.imageFolder)}/${esc(data.ogImageFilename)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${esc(ogImageAlt)}">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(ogTitle)}">
    <meta name="twitter:description" content="${esc(twitterDesc)}">
    <meta name="twitter:image" content="${baseUrl}/imagesWebp/${esc(data.imageFolder)}/${esc(data.ogImageFilename)}">

    <!-- Preconnect / Preload -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" href="style.css" as="style">
    <link rel="preload" as="image" href="imagesWebp/${esc(data.imageFolder)}/${esc(firstSlide.file1200)}"
        imagesrcset="imagesWebp/${esc(data.imageFolder)}/${esc(firstSlide.file800)} 800w, imagesWebp/${esc(data.imageFolder)}/${esc(firstSlide.file1200)} 1200w"
        imagesizes="(max-width: 768px) 100vw, 1200px">

    <link rel="stylesheet" href="style.css">
    <!-- Critical slideshow visibility to avoid FOUC while components.css loads asynchronously -->
    <style>
        .slideshow .slide { display: none; }
        .slideshow .slide:first-child { display: block; }
        .slideshow.slick-initialized .slide { display: block; }
    </style>
    <link rel="preload" href="css/components.css" as="style" onload="this.rel='stylesheet'">
    <noscript>
        <link rel="stylesheet" href="css/components.css">
    </noscript>
    <style>
        /* Accessibility: Skip link */
        .skip-link {
            position: absolute;
            left: -9999px;
            z-index: 9999;
            padding: 10px 20px;
            background: #000;
            color: #fff;
            text-decoration: none;
        }

        .skip-link:focus {
            position: fixed;
            top: 10px;
            left: 10px;
        }

        /* Internal links styling */
        .internal-link {
            color: #6b4a1f;
            text-decoration: none;
            font-weight: 500;
        }

        .internal-link:hover,
        .internal-link:focus {
            text-decoration: underline;
        }

        /* Internal links section styling */
        .internal-links {
            padding: 2rem 0;
            background-color: #f8f9fa;
            text-align: center;
        }

        /* Internal links container styling */
        .internal-links-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 0 1rem;
        }

        .internal-links-heading {
            margin-bottom: 1rem;
            color: #333;
        }

        .internal-links-paragraph {
            font-size: 1.1rem;
            line-height: 1.6;
            color: #555;
        }

        /* Elegant Tab Styling */
        .tab-container {
            margin-top: 1rem;
        }

        .tab-buttons {
            display: flex;
            border-bottom: 2px solid #f0f0f0;
            margin-bottom: 1.5rem;
        }

        .tab-button {
            background: none;
            border: none;
            padding: 0.8rem 1.5rem;
            cursor: pointer;
            font-size: 1rem;
            color: #4a4a4a;
            border-bottom: 3px solid transparent;
            transition: all 0.3s ease;
            font-weight: 500;
        }

        .tab-button:hover {
            color: #c8a97e;
            background-color: #fafafa;
        }

        .tab-button.active {
            color: #6b4a1f;
            border-bottom-color: #6b4a1f;
            font-weight: 600;
        }

        .tab-content {
            position: relative;
        }

        .tab-pane {
            display: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .tab-pane.active {
            display: block;
            opacity: 1;
        }

        .tab-pane p {
            line-height: 1.7;
            margin-bottom: 1.2rem;
            color: #555;
        }

        /* Enhanced trip dates styling */
        .trip-dates {
            text-align: center;
            margin: 2rem 0;
            padding: 1.5rem;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 8px;
            border-left: 4px solid #c8a97e;
        }

        .trip-dates h3 {
            color: #333;
            margin: 0;
            font-size: 1.3rem;
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        /* Mobile responsive tabs */
        @media (max-width: 768px) {
            .tab-button {
                padding: 0.6rem 1rem;
                font-size: 0.9rem;
            }
        }
    </style>

    <!-- JSON-LD: WebPage + TouristTrip + Event + FAQ -->
    <script type="application/ld+json">
${jsonLd}
    </script>

    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-6FM6Y5W6ZM"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', 'G-6FM6Y5W6ZM');
    </script>
</head>

<body>
    <!-- Skip to main content link for accessibility -->
    <a href="#main-content" class="skip-link">${skipText}</a>

    <!-- Navigation Bar -->
    <header>
        <div class="nav-container">
            <nav aria-label="${navAriaLabel}">
${navHtml}
            </nav>
        </div>
    </header>

    <main id="main-content">

        <!-- Destination header with image carousel -->
        <div class="destination-header">
            <div class="slideshow">
${slidesHtml}
            </div>

            <div class="header-content">
                <div class="header-text">
                    <h1>${h1}</h1>
                    <p>${subheading}</p>
                </div>
            </div>
        </div>

        <!-- Trip Details Section -->
        <section class="trip-details">
            <p>${overviewP1}</p>

            <h2>${overviewHeading}</h2>
            <p>${overviewP2}</p>
            <div class="trip-dates">
                <h3>${dateLabelLine}</h3>
                <h3>${esc(dateRange)}</h3>${altDatesHtml}
            </div>
            <div class="highlights">
${pricingHtml}
            </div>
        </section>

        <!-- Detailed Information Section -->
        <section class="destination-info">
            <h2>${journeyTitle}</h2>
            <div class="info-container">
${journeyHtml}
            </div>
        </section>
${internalLinksSection}

        <!-- ${paymentTitle} Section -->
        <section style="padding: 3rem 1rem; max-width: 900px; margin: 0 auto;">
            <h2 style="text-align: center; margin-bottom: 0.75rem; color: #333;">${paymentTitle}</h2>
            <p style="text-align: center; color: #555; font-size: 1.05rem; line-height: 1.6; max-width: 600px; margin: 0 auto 1.5rem;">${paymentIntro}</p>
            <div style="text-align: center; margin-bottom: 2rem;">
                <span style="display: inline-block; background: linear-gradient(135deg, #c8a97e 0%, #d4b896 100%); color: white; padding: 0.75rem 2rem; border-radius: 25px; font-size: 1.05rem; font-weight: 600; box-shadow: 0 4px 15px rgba(200,169,126,0.3);">${depositText}</span>
            </div>
            <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 250px; border: 1px solid #e0e0e0; border-radius: 12px; padding: 1.5rem; text-align: center; background: #fafafa;">
                    <h3 style="color: #c8a97e; font-size: 1.2rem; margin-bottom: 0.75rem;">${optALabel}</h3>
                    <p style="font-size: 1.8rem; font-weight: 700; color: #333; margin: 0.5rem 0;">${optAPrice}</p>
                    <p style="color: #555; font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.5rem;">${optADesc}</p>
                </div>
                <div style="flex: 1; min-width: 250px; border: 1px solid #e0e0e0; border-radius: 12px; padding: 1.5rem; text-align: center; background: #fafafa;">
                    <h3 style="color: #c8a97e; font-size: 1.2rem; margin-bottom: 0.75rem;">${optBLabel}</h3>
                    <p style="font-size: 1.8rem; font-weight: 700; color: #333; margin: 0.5rem 0;">${optBPrice}</p>
                    <p style="color: #555; font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.5rem;">${optBDesc}</p>
                </div>
            </div>
        </section>

        <!-- FAQ Section -->
        <section class="faq-section" id="faq" aria-labelledby="faq-heading"
            style="padding: 3rem 1rem; max-width: 900px; margin: 0 auto;">
            <h2 id="faq-heading" style="text-align: center; margin-bottom: 2rem; color: #333;">${faqHeading}</h2>
${faqItemsHtml}
        </section>

        <!-- Contact Section -->
        <div id="contact-section-container"></div>

    </main>

    <div id="footer-container"></div>
    <script src="js/navigation.min.js" defer></script>
    <script src="js/elegant-language-switcher.min.js" defer></script>
    <script src="js/site-tracking.js" defer></script>
    <script src="js/contact-tracking.min.js" defer></script>
    <script src="js/page-init.min.js?v=20260204c" defer></script>
</body>

</html>
`;
}

// --------------- Generate & ZIP download ---------------

function handleGenerate() {
  const data = collectFormData();
  if (!validate(data)) return;

  const enHtml = generateHTML(data, 'en');
  const esHtml = generateHTML(data, 'es');

  // Derive filename: capitalize first letter of slug
  const fileBase = data.slug.charAt(0).toUpperCase() + data.slug.slice(1);

  const zip = new JSZip();
  zip.file(fileBase + '.html', enHtml);
  zip.file(fileBase + '-es.html', esHtml);

  zip.generateAsync({ type: 'blob' }).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileBase + '-pages.zip';
    a.click();
    URL.revokeObjectURL(url);
    showToast('P\u00E1ginas generadas correctamente', false);
  }).catch(err => {
    showToast('Error generating ZIP: ' + err.message);
  });
}

// --------------- Init ---------------

document.addEventListener('DOMContentLoaded', () => {
  // Add initial rows for each dynamic section
  addAlternateDate();
  addSlide();
  addPricingCard();
  addJourneyTab();
  addInternalLink();
  addFaq();

  // Button listeners
  document.getElementById('add-alt-date-btn').addEventListener('click', addAlternateDate);
  document.getElementById('add-slide-btn').addEventListener('click', addSlide);
  document.getElementById('add-pricing-btn').addEventListener('click', addPricingCard);
  document.getElementById('add-journey-btn').addEventListener('click', addJourneyTab);
  document.getElementById('add-link-btn').addEventListener('click', addInternalLink);
  document.getElementById('add-faq-btn').addEventListener('click', addFaq);

  // Generate button
  document.getElementById('generate-btn').addEventListener('click', handleGenerate);

  // Delegate remove buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-row-btn')) {
      e.target.closest('.dynamic-card').remove();
      updateSlideHints();
    }
  });
});
