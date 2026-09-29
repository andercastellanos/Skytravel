const fs = require('fs');
const path = require('path');

const OWNER = 'andercastellanos';
const REPO = 'Skytravel';
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/issues`;
const PAGES = [
  { path: path.join(__dirname, '..', 'testimony', 'testimonios.html'), language: 'es' },
  { path: path.join(__dirname, '..', 'testimony', 'testimonials.html'), language: 'en' },
];
const START_MARKER = '<!-- GENERATED_TESTIMONIALS_START -->';
const END_MARKER = '<!-- GENERATED_TESTIMONIALS_END -->';
const ALLOWED_MEDIA_HOSTS = [
  'imgur.com',
  'i.imgur.com',
  'github.com',
  'user-images.githubusercontent.com',
  'raw.githubusercontent.com',
  'res.cloudinary.com',
  'cloudinary.com',
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
    .replace(/^\s*---\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseIssue(issue) {
  if (issue.pull_request) return null;
  const labels = (issue.labels || []).map((label) => label.name);
  if (!labels.includes('verified')) return null;

  const { metadata, content } = parseFrontMatter(issue.body || '');
  const testimonial = cleanContent(content);
  if (!testimonial) return null;

  const titleName = issue.title.match(/^Testimonio de\s+(.+?)\s*[-–]/i)
    || issue.title.match(/^Testimony (?:of|from)\s+(.+?)\s*[-–]/i);
  const name = String(metadata.name || (titleName ? titleName[1] : '') || issue.user?.login || 'Anonymous').trim();
  const trip = String(metadata.trip || 'Pilgrimage Experience').trim();
  const destination = (trip.match(/^(.+?)\s*\(/) || [])[1] || trip.split(/[-,]/)[0] || 'Unknown';

  return {
    id: issue.number,
    name,
    trip,
    destination: destination.trim(),
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

function renderCard(testimonial, language) {
  const media = testimonial.media.length
    ? `\n        <div class="testimonial-media-grid">${testimonial.media.map((url) => renderMedia(url, language)).join('')}</div>`
    : '';
  const locale = language === 'es' ? 'es-ES' : 'en-US';
  const date = new Date(testimonial.date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

  return `                <div class="testimonial-card" data-generated-testimonial data-testimonial-id="${testimonial.id}">
                    <div class="testimonial-content">
                        <div class="testimonial-header">
                            <div class="testimonial-author">${escapeHtml(testimonial.name)}</div>
                            <div class="testimonial-trip">${escapeHtml(testimonial.trip)}</div>
                        </div>
                        <div class="testimonial-body">
                            ${formatContent(testimonial.content)}
                        </div>${media}
                        <div class="testimonial-footer">
                            <span class="testimonial-date">${date}</span>
                        </div>
                    </div>
                </div>`;
}

async function fetchVerifiedIssues() {
  const params = new URLSearchParams({ state: 'open', labels: 'testimony', sort: 'created', direction: 'desc', per_page: '100' });
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Skytravel-testimonial-generator',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const response = await fetch(`${API_URL}?${params}`, { headers });
  if (!response.ok) throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  return (await response.json()).map(parseIssue).filter(Boolean);
}

function updatePage(filePath, testimonials, language) {
  const html = fs.readFileSync(filePath, 'utf8');
  const start = html.indexOf(START_MARKER);
  const end = html.indexOf(END_MARKER);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Missing testimonial generation markers in ${filePath}`);
  }

  const generated = testimonials.map((testimonial) => renderCard(testimonial, language)).join('\n\n');
  const replacement = `${START_MARKER}\n${generated}\n                ${END_MARKER}`;
  let updated = `${html.slice(0, start)}${replacement}${html.slice(end + END_MARKER.length)}`;
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

async function main() {
  const testimonials = await fetchVerifiedIssues();
  if (testimonials.length === 0) throw new Error('No verified testimonials were returned; refusing to erase published content.');
  for (const page of PAGES) updatePage(page.path, testimonials, page.language);
  console.log(`Generated ${testimonials.length} verified testimonials in ${PAGES.length} pages.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
