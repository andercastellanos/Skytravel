#!/usr/bin/env node
/**
 * check-clean-urls.js — "Clean URL" rule for skytraveljm.com. Runs as the Netlify build
 * command, so a failure stops the deploy (production or Deploy Preview) and prints why.
 *
 * RULE: no public URL ends in ".html". Every page is served at a clean URL
 * (/slug and /slug-es), and only that clean URL may appear in:
 *   - sitemap.xml (<loc> and xhtml:link alternates)
 *   - canonical, hreflang alternates and og:url of every indexable page
 *   - JSON-LD "url" / "@id" values on www.skytraveljm.com
 * Also enforced:
 *   - every sitemap URL is actually served (file or netlify.toml 200 rewrite)
 *   - every clean URL rewritten (200) to a file in a folder has a 301 from that file's .html path
 * Internal <a href> links to ".html" pages only produce warnings.
 *
 * How to add a page correctly: see CLAUDE.md → "Clean URLs".
 * Run locally: node scripts/check-clean-urls.js
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ORIGIN = 'https://www.skytraveljm.com';
const SKIP_DIRS = new Set(['node_modules', '.git', '.netlify', '.claude', '.vscode', 'components', 'netlify', 'scripts', 'pdf']);

const errors = [];
const warnings = [];
const rel = f => path.relative(root, f).split(path.sep).join('/');

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (SKIP_DIRS.has(e.name)) return [];
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return htmlFiles(p);
    return e.name.endsWith('.html') ? [p] : [];
  });
}

// ---- netlify.toml redirects
const rules = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8').split('[[redirects]]').slice(1).map(b => ({
  from: b.match(/from\s*=\s*"([^"]+)"/)?.[1],
  to: b.match(/to\s*=\s*"([^"]+)"/)?.[1],
  status: Number(b.match(/status\s*=\s*(\d+)/)?.[1]),
}));

function served(urlPath, seen = new Set()) {
  if (seen.has(urlPath)) return false;
  seen.add(urlPath);
  const rule = rules.find(r => r.from === urlPath);
  if (rule) return rule.status === 200 ? fs.existsSync(path.join(root, rule.to)) : served(rule.to, seen);
  const p = urlPath.replace(/\/$/, '');
  return [p, p + '.html', p + '/index.html'].some(c => {
    const f = path.join(root, c);
    return f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile();
  });
}

const isHtmlUrl = u => /\.html?(?:[#?]|$)/i.test(u);
const ownUrl = u => u.startsWith(ORIGIN) || u.startsWith('/');

// ---- 1. sitemap.xml
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]);
const sitemapAlternates = [...sitemap.matchAll(/<xhtml:link[^>]+href="([^"]+)"/g)].map(m => m[1]);
for (const u of [...sitemapUrls, ...sitemapAlternates]) {
  if (isHtmlUrl(u)) errors.push(`sitemap.xml lists a .html URL: ${u}`);
  if (!u.startsWith(ORIGIN + '/')) errors.push(`sitemap.xml URL is not on ${ORIGIN}: ${u}`);
}
for (const u of new Set(sitemapUrls)) {
  if (!u.startsWith(ORIGIN)) continue;
  const p = new URL(u).pathname;
  if (!served(p)) errors.push(`sitemap.xml URL is not served by any file or netlify.toml rewrite: ${u}`);
}

// ---- 2. every 200 rewrite into a folder file needs a 301 from the .html path
for (const r of rules.filter(r => r.status === 200 && r.to && /\/[^/]+\/[^/]+\.html$/.test(r.to) && !r.from.includes('*'))) {
  const has301 = rules.some(x => x.from === r.to && x.status === 301);
  if (!has301) errors.push(`netlify.toml rewrites ${r.from} → ${r.to} but has no 301 from "${r.to}" to "${r.from}"`);
}

// ---- 3. indexable pages: canonical / hreflang / og:url / JSON-LD
for (const file of htmlFiles(root)) {
  const html = fs.readFileSync(file, 'utf8');
  if (/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html)) continue;
  const name = rel(file);
  const tagUrls = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    if (/rel="(canonical|alternate)"/i.test(tag) && (/rel="canonical"/i.test(tag) || /hreflang=/i.test(tag))) {
      const href = tag.match(/href="([^"]+)"/i)?.[1];
      if (href) tagUrls.push([/rel="canonical"/i.test(tag) ? 'canonical' : 'hreflang', href]);
    }
  }
  const og = html.match(/<meta[^>]+property="og:url"[^>]+content="([^"]+)"/i)?.[1];
  if (og) tagUrls.push(['og:url', og]);
  for (const [kind, u] of tagUrls) {
    if (ownUrl(u) && isHtmlUrl(u)) errors.push(`${name}: ${kind} uses a .html URL: ${u}`);
  }
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const u of m[1].matchAll(/"(?:url|@id|item)"\s*:\s*"([^"]+)"/g)) {
      if (u[1].startsWith(ORIGIN) && isHtmlUrl(u[1])) errors.push(`${name}: JSON-LD uses a .html URL: ${u[1]}`);
    }
  }
  // internal links: warning only
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)) {
    const u = m[1];
    if ((u.startsWith(ORIGIN) || (!/^[a-z]+:/i.test(u) && !u.startsWith('#'))) && isHtmlUrl(u)) {
      warnings.push(`${name}: link to .html URL ${u}`);
    }
  }
}

// ---- report
const bar = '='.repeat(78);
if (warnings.length) {
  console.log(`clean-url check: ${warnings.length} warning(s) — internal links that point at .html URLs (they still work via 301s; prefer the clean URL):`);
  [...new Set(warnings)].slice(0, 40).forEach(w => console.log('  ⚠ ' + w));
  if (warnings.length > 40) console.log(`  … and ${warnings.length - 40} more`);
}
if (errors.length) {
  console.error('\n' + bar);
  console.error(' ✖ DEPLOY BLOCKED: every public page must use a CLEAN URL (no ".html").');
  console.error(bar);
  [...new Set(errors)].forEach(e => console.error('  ✖ ' + e));
  console.error(`
 How to fix (see CLAUDE.md → "Clean URLs"):
   1. Pick clean URLs: /my-trip (EN) and /my-trip-es (ES) — lowercase, hyphens, no .html.
   2. netlify.toml: 200 rewrite  /my-trip-es → /folder/file-es.html  (force = true)
                    301 redirect /folder/file-es.html (and /folder/file-es) → /my-trip-es
   3. Use ONLY the clean URL in canonical, hreflang, og:url, JSON-LD url/@id,
      the language switcher, internal links and sitemap.xml.
   Run "node scripts/check-clean-urls.js" locally before pushing.
${bar}\n`);
  process.exit(1);
}
console.log(`✔ clean-url check passed: ${sitemapUrls.length} sitemap URLs, no .html in canonical/hreflang/og:url/JSON-LD/sitemap.`);
