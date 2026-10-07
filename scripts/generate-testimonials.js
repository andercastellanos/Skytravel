const fs = require('fs');
const path = require('path');

/**
 * Generates the verified testimonials into static HTML.
 *
 *  1. testimony/testimonios.html (es) and testimony/testimonials.html (en):
 *     every verified testimonial, grouped by destination (H2 per group,
 *     link to the destination page, card id="testimonio-<issue number>").
 *  2. Trip pages (Medjugorje, Medjugorje-Roma, Italy, Mariana, Santuarios):
 *     the testimonials that match that trip, between
 *     GENERATED_TRIP_TESTIMONIALS markers.
 *
 * Source: open GitHub issues labeled "testimony" + "verified".
 * Local runs without network access: ISSUES_FILE=/path/issues.json
 */

const OWNER = 'andercastellanos';
const REPO = 'Skytravel';
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/issues`;
const ROOT = path.join(__dirname, '..');

const PAGES = [
  { path: path.join(ROOT, 'testimony', 'testimonios.html'), language: 'es' },
  { path: path.join(ROOT, 'testimony', 'testimonials.html'), language: 'en' },
];
const START_MARKER = '<!-- GENERATED_TESTIMONIALS_START -->';
const END_MARKER = '<!-- GENERATED_TESTIMONIALS_END -->';
const TRIP_START = '<!-- GENERATED_TRIP_TESTIMONIALS_START -->';
const TRIP_END = '<!-- GENERATED_TRIP_TESTIMONIALS_END -->';

const ALLOWED_MEDIA_HOSTS = [
  'imgur.com',
  'i.imgur.com',
  'github.com',
  'user-images.githubusercontent.com',
  'raw.githubusercontent.com',
  'res.cloudinary.com',
  'cloudinary.com',
];

// Destination groups, in display order. A testimonial belongs to the first
// group whose pattern matches its trip label (primary group) and is tagged
// with every group that matches (used to pick testimonials for trip pages).
const GROUPS = [
  {
    key: 'medjugorje',
    pattern: /medjug/i,
    es: {
      title: 'Testimonios de peregrinos a Medjugorje',
      intro: 'Conozca nuestra <a href="/medjugorje-es">peregrinación a Medjugorje</a>.',
      href: '/medjugorje-es',
    },
    en: {
      title: 'Medjugorje pilgrim testimonials',
      intro: 'See our <a href="/medjugorje">Medjugorje pilgrimage</a>.',
      href: '/medjugorje',
    },
  },
  {
    key: 'mariana',
    pattern: /(mariana|f[aá]tima|lourdes|covadonga|garabandal|pilar)/i,
    es: {
      title: 'Testimonios de la peregrinación mariana: Fátima, Lourdes y más',
      intro: 'Vea la <a href="/mariana2026-es">peregrinación mariana</a> y nuestra peregrinación a los <a href="/santuariosmarianos-es">santuarios marianos de Fátima y Lourdes</a>.',
      href: '/mariana2026-es',
    },
    en: {
      title: 'Marian pilgrimage testimonials: Fatima, Lourdes and more',
      intro: 'See the <a href="/mariana2026">Marian pilgrimage</a> and our pilgrimage to the <a href="/santuariosmarianos">Marian shrines of Fatima and Lourdes</a>.',
      href: '/mariana2026',
    },
  },
  {
    key: 'italia',
    pattern: /(italia|italy|roma|rome|jubileo|jubilee|as[ií]s|assisi)/i,
    es: {
      title: 'Testimonios de peregrinos a Roma e Italia',
      intro: 'Conozca nuestra <a href="/peregrinacion-medjugorje-roma-es">peregrinación a Medjugorje, Roma y Asís</a> y la <a href="/italy-es">peregrinación a Italia</a>.',
      href: '/italy-es',
    },
    en: {
      title: 'Rome and Italy pilgrim testimonials',
      intro: 'See our <a href="/peregrinacion-medjugorje-roma">pilgrimage to Medjugorje, Rome and Assisi</a> and the <a href="/italy">Italy pilgrimage</a>.',
      href: '/italy',
    },
  },
  {
    key: 'tierrasanta',
    pattern: /(tierra santa|holy land)/i,
    es: {
      title: 'Testimonios de peregrinos a Tierra Santa',
      intro: 'Conozca nuestra <a href="/tierrasanta2026-es">peregrinación a Tierra Santa</a>.',
      href: '/tierrasanta2026-es',
    },
    en: {
      title: 'Holy Land pilgrim testimonials',
      intro: 'See our <a href="/tierrasanta2026">Holy Land pilgrimage</a>.',
      href: '/tierrasanta2026',
    },
  },
];
const OTHER_GROUP = {
  key: 'otras',
  es: { title: 'Otras peregrinaciones', intro: 'Vea todas nuestras <a href="/experiences-es">experiencias de peregrinación</a>.', href: '/experiences-es' },
  en: { title: 'Other pilgrimages', intro: 'See all our <a href="/experiences">pilgrimage experiences</a>.', href: '/experiences' },
};

// Trip pages that show their matching testimonials.
const TRIP_PAGES = [
  { file: 'peregrinaciones-2025/Medjugorje-es.html', language: 'es', tags: ['medjugorje'], limit: 6, title: 'Testimonios de peregrinos a Medjugorje' },
  { file: 'peregrinaciones-2025/Medjugorje.html', language: 'en', tags: ['medjugorje'], limit: 6, title: 'Medjugorje pilgrim testimonials' },
  { file: 'peregrinaciones-2026/peregrinacion-medjugorje-roma-es.html', language: 'es', tags: ['medjugorje', 'italia'], limit: 4, title: 'Testimonios de peregrinos a Medjugorje, Roma e Italia' },
  { file: 'peregrinaciones-2026/peregrinacion-medjugorje-roma.html', language: 'en', tags: ['medjugorje', 'italia'], limit: 4, title: 'Medjugorje, Rome and Italy pilgrim testimonials' },
  { file: 'peregrinaciones-2025/Italy-es.html', language: 'es', tags: ['italia'], limit: 4, title: 'Testimonios de peregrinos a Roma e Italia' },
  { file: 'peregrinaciones-2025/Italy.html', language: 'en', tags: ['italia'], limit: 4, title: 'Rome and Italy pilgrim testimonials' },
  { file: 'peregrinaciones-2026/Mariana2026-es.html', language: 'es', tags: ['mariana'], limit: 4, title: 'Testimonios de la peregrinación mariana' },
  { file: 'peregrinaciones-2026/Mariana2026.html', language: 'en', tags: ['mariana'], limit: 4, title: 'Marian pilgrimage testimonials' },
  { file: 'peregrinaciones-2026/SantuariosMarianos-es.html', language: 'es', tags: ['mariana'], limit: 4, title: 'Testimonios de peregrinos a Fátima y Lourdes' },
  { file: 'peregrinaciones-2026/SantuariosMarianos.html', language: 'en', tags: ['mariana'], limit: 4, title: 'Fatima and Lourdes pilgrim testimonials' },
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseFrontMatter(body) {
  const match = body.match(/(?:^|\n)---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!match) return { metadata: {}, content: body };

  const metadata = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*?)\s*$/);
    if (!field) continue;
    let value = field[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).replace(/\\"/g, '"');
    }
    metadata[field[1]] = value;
  }

  return { metadata, content: body.slice(match.index + match[0].length) };
}

function cleanContent(content) {
  return content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^[\t ]*https?:\/\/\S+[\t ]*\r?$/gim, '')
    .replace(/\*\*Email:\*\*.*$/gim, '')
    .replace(/^\s*Email:\s*\S+@\S+\s*$/gim, '')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '')
    // Tool attribution footers appended to issue bodies by automated edits
    .replace(/^\s*_?(?:Generated|Edited|Updated) (?:by|with) \[?Claude(?: Code)?\]?(?:\([^)]*\))?_?\s*$/gim, '')
    .replace(/^\s*---\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function tagsFor(trip) {
  return GROUPS.filter((group) => group.pattern.test(trip)).map((group) => group.key);
}

function parseIssue(issue) {
  if (issue.pull_request) return null;
  const labels = (issue.labels || []).map((label) => (typeof label === 'string' ? label : label.name));
  if (!labels.includes('verified')) return null;

  const { metadata, content } = parseFrontMatter(issue.body || '');
  const testimonial = cleanContent(content);
  if (!testimonial) return null;

  const titleName = issue.title.match(/^Testimonio de\s+(.+?)\s*[-–]/i)
    || issue.title.match(/^Testimony (?:of|from)\s+(.+?)\s*[-–]/i);
  const name = String(metadata.name || (titleName ? titleName[1] : '') || issue.user?.login || 'Anonymous').trim();
  const trip = String(metadata.trip || 'Pilgrimage Experience').trim();
  const destination = (trip.match(/^(.+?)\s*\(/) || [])[1] || trip.split(/[-,]/)[0] || 'Unknown';
  const tags = tagsFor(trip);

  return {
    id: issue.number,
    name,
    trip,
    destination: destination.trim(),
    tags,
    group: tags[0] || OTHER_GROUP.key,
    content: testimonial,
    date: issue.created_at,
    url: issue.html_url,
    media: extractMedia(issue.body || ''),
  };
}

function extractMedia(body) {
  const media = [];
  const pattern = /(?:-\s*)?(?:url|src):\s*["']?(https?:\/\/[^\s"']+)/gi;
  for (const match of body.matchAll(pattern)) {
    const url = match[1].replace(/[),]+$/, '');
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (ALLOWED_MEDIA_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
        if (!media.some((item) => item === url)) media.push(url);
      }
    } catch {
      // Ignore malformed media URLs.
    }
  }
  return media;
}

function formatContent(content) {
  return content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function getMediaType(mediaUrl) {
  const mediaUrlObject = new URL(mediaUrl);
  const pathname = mediaUrlObject.pathname.toLowerCase();

  if (/\.(mp3|wav|ogg|m4a|aac|flac|opus)$/.test(pathname)) {
    return 'audio';
  }
  if (pathname.includes('/video/upload/') || /\.(mp4|webm|ogv|mov|m4v|avi|mkv)$/.test(pathname)) {
    return 'video';
  }
  return 'image';
}

function getCloudinaryPoster(mediaUrl) {
  const posterUrl = new URL(mediaUrl);
  if (!(posterUrl.hostname === 'cloudinary.com' || posterUrl.hostname.endsWith('.cloudinary.com')) || !posterUrl.pathname.includes('/video/upload/')) {
    return '';
  }

  posterUrl.pathname = posterUrl.pathname
    .replace('/video/upload/', '/video/upload/so_0/')
    .replace(/(?:\.[^/.]+)?$/, '.jpg');
  return posterUrl.href;
}

function renderMedia(mediaUrl, language) {
  const mediaType = getMediaType(mediaUrl);
  const fallbackText = language === 'es'
    ? `Tu navegador no soporta la reproducción de ${mediaType === 'video' ? 'video' : 'audio'}.`
    : `Your browser does not support ${mediaType} playback.`;

  if (mediaType === 'video') {
    const poster = getCloudinaryPoster(mediaUrl);
    const posterAttribute = poster ? ` poster="${escapeHtml(poster)}"` : '';
    return `<video class="testimonial-media-video" src="${escapeHtml(mediaUrl)}" controls playsinline${posterAttribute} preload="metadata" referrerpolicy="no-referrer">${fallbackText}</video>`;
  }

  if (mediaType === 'audio') {
    return `<audio class="testimonial-media-audio" src="${escapeHtml(mediaUrl)}" controls preload="metadata" referrerpolicy="no-referrer">${fallbackText}</audio>`;
  }

  const altText = language === 'es' ? 'Multimedia del testimonio' : 'Testimonial media';
  return `<img class="testimonial-media-img" src="${escapeHtml(mediaUrl)}" alt="${altText}" loading="lazy" referrerpolicy="no-referrer">`;
}

function formatDate(date, language) {
  const locale = language === 'es' ? 'es-ES' : 'en-US';
  return new Date(date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function groupConfig(key) {
  return GROUPS.find((group) => group.key === key) || OTHER_GROUP;
}

function renderCard(testimonial, language) {
  const media = testimonial.media.length
    ? `\n        <div class="testimonial-media-grid">${testimonial.media.map((url) => renderMedia(url, language)).join('')}</div>`
    : '';
  const tripHref = groupConfig(testimonial.group)[language].href;

  return `                <div class="testimonial-card" id="testimonio-${testimonial.id}" data-generated-testimonial data-testimonial-id="${testimonial.id}">
                    <div class="testimonial-content">
                        <div class="testimonial-header">
                            <div class="testimonial-author">${escapeHtml(testimonial.name)}</div>
                            <div class="testimonial-trip"><a href="${tripHref}">${escapeHtml(testimonial.trip)}</a></div>
                        </div>
                        <div class="testimonial-body">
                            ${formatContent(testimonial.content)}
                        </div>${media}
                        <div class="testimonial-footer">
                            <span class="testimonial-date">${formatDate(testimonial.date, language)}</span>
                        </div>
                    </div>
                </div>`;
}

function renderGroups(testimonials, language) {
  const order = [...GROUPS.map((group) => group.key), OTHER_GROUP.key];
  const sections = [];
  if (language === 'en') {
    sections.push('                <p class="testimonial-language-note">Most testimonials are shown in their original language (Spanish).</p>');
  }
  for (const key of order) {
    const items = testimonials.filter((testimonial) => testimonial.group === key);
    if (!items.length) continue;
    const config = groupConfig(key)[language];
    sections.push(`                <section class="testimonial-group" id="grupo-${key}" aria-labelledby="grupo-${key}-titulo">
                <h2 class="testimonial-group-title" id="grupo-${key}-titulo">${config.title}</h2>
                <p class="testimonial-group-intro">${config.intro}</p>
                <div class="simple-testimonials-grid">
${items.map((testimonial) => renderCard(testimonial, language)).join('\n\n')}
                </div>
                </section>`);
  }
  return sections.join('\n\n');
}

function renderTripBlock(testimonials, page) {
  const es = page.language === 'es';
  const listPath = es ? '/testimony/testimonios' : '/testimony/testimonials';
  const items = testimonials
    .map((testimonial) => ({ testimonial, score: testimonial.tags.filter((tag) => page.tags.includes(tag)).length }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.testimonial.date) - new Date(a.testimonial.date))
    .slice(0, page.limit)
    .map((item) => item.testimonial);
  if (!items.length) return '';

  const readFull = es ? 'Leer testimonio completo' : 'Read full testimonial';
  const cards = items.map((testimonial) => `            <figure class="trip-testimonial">
              <blockquote class="trip-testimonial-text">
                ${formatContent(testimonial.content)}
              </blockquote>
              <figcaption class="trip-testimonial-author"><strong>${escapeHtml(testimonial.name)}</strong> · ${escapeHtml(testimonial.trip)}</figcaption>
              <a class="trip-testimonial-link" href="${listPath}#testimonio-${testimonial.id}">${readFull}</a>
            </figure>`).join('\n');
  const note = es ? '' : '\n          <p class="trip-testimonials-note">Testimonials are shown in their original language (Spanish).</p>';
  const more = es ? 'Ver todos los testimonios de nuestros peregrinos' : 'See all testimonials from our pilgrims';

  return `
      <section class="trip-testimonials" aria-labelledby="trip-testimonials-title">
        <div class="trip-testimonials-container">
          <h2 id="trip-testimonials-title">${escapeHtml(page.title)}</h2>${note}
          <div class="trip-testimonials-grid">
${cards}
          </div>
          <p class="trip-testimonials-more"><a href="${listPath}">${more}</a></p>
        </div>
      </section>
      `;
}

async function fetchIssues() {
  if (process.env.ISSUES_FILE) {
    return JSON.parse(fs.readFileSync(process.env.ISSUES_FILE, 'utf8'));
  }
  const params = new URLSearchParams({ state: 'open', labels: 'testimony', sort: 'created', direction: 'desc', per_page: '100' });
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Skytravel-testimonial-generator',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const response = await fetch(`${API_URL}?${params}`, { headers });
  if (!response.ok) throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  return response.json();
}

async function fetchVerifiedTestimonials() {
  const issues = await fetchIssues();
  return issues
    .filter((issue) => issue.state === undefined || issue.state === 'open')
    .map(parseIssue)
    .filter(Boolean)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function replaceBetween(html, start, end, replacement, filePath) {
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`Missing markers ${start} / ${end} in ${filePath}`);
  }
  return `${html.slice(0, startIndex)}${start}${replacement}${html.slice(endIndex)}`;
}

function updateTestimonialsPage(filePath, testimonials, language) {
  const html = fs.readFileSync(filePath, 'utf8');
  const generated = renderGroups(testimonials, language);
  let updated = replaceBetween(html, START_MARKER, END_MARKER, `\n${generated}\n                `, filePath);

  const legacyStart = updated.indexOf('\n<!-- <div class="testimonial-card"');
  const legacyEnd = updated.indexOf('<!-- ...existing code... -->');
  if (legacyStart !== -1 && legacyEnd > legacyStart) {
    updated = `${updated.slice(0, legacyStart)}\n${updated.slice(legacyEnd + '<!-- ...existing code... -->'.length)}`;
  }
  const generatedEnd = updated.indexOf(END_MARKER);
  const legacyContentStart = updated.indexOf('<!-- Testimonials will be loaded here by JavaScript -->', generatedEnd);
  const containerEnd = updated.indexOf('\n            </div>', legacyContentStart);
  if (generatedEnd !== -1 && legacyContentStart > generatedEnd && containerEnd > legacyContentStart) {
    updated = `${updated.slice(0, generatedEnd + END_MARKER.length)}${updated.slice(containerEnd)}`;
  }
  if (updated !== html) fs.writeFileSync(filePath, updated);
}

function updateTripPage(page, testimonials) {
  const filePath = path.join(ROOT, page.file);
  if (!fs.existsSync(filePath)) {
    console.warn(`Skipping missing trip page ${page.file}`);
    return;
  }
  const html = fs.readFileSync(filePath, 'utf8');
  if (!html.includes(TRIP_START)) {
    console.warn(`Skipping ${page.file}: no trip testimonial markers`);
    return;
  }
  const updated = replaceBetween(html, TRIP_START, TRIP_END, renderTripBlock(testimonials, page), filePath);
  if (updated !== html) fs.writeFileSync(filePath, updated);
}

async function main() {
  const testimonials = await fetchVerifiedTestimonials();
  if (testimonials.length === 0) throw new Error('No verified testimonials were returned; refusing to erase published content.');
  for (const page of PAGES) updateTestimonialsPage(page.path, testimonials, page.language);
  for (const page of TRIP_PAGES) updateTripPage(page, testimonials);
  console.log(`Generated ${testimonials.length} verified testimonials in ${PAGES.length} testimonial pages and ${TRIP_PAGES.length} trip pages.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { parseIssue, tagsFor, renderTripBlock, renderGroups };
