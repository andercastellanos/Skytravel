const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const origin = 'https://www.skytraveljm.com';
const excluded = new Set(['node_modules', '.git', '.netlify', '.claude', '.vscode']);
function filesIn(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (excluded.has(entry.name)) return [];
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? filesIn(file) : [file];
  });
}
const files = filesIn(root);
const published = new Set(files.map(file => '/' + path.relative(root, file).split(path.sep).join('/')));
const redirects = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8')
  .split('[[redirects]]').slice(1).map(block => ({
    from: block.match(/from\s*=\s*"([^"]+)"/)?.[1],
    to: block.match(/to\s*=\s*"([^"]+)"/)?.[1],
    status: Number(block.match(/status\s*=\s*(\d+)/)?.[1]),
  }));
function exists(urlPath, visited = new Set()) {
  if (visited.has(urlPath)) return false;
  visited.add(urlPath);
  const rule = redirects.find(rule => rule.from === urlPath);
  // A rewrite serves a physical file even if that file has a public redirect.
  if (rule) return rule.status === 200 ? published.has(rule.to) : exists(rule.to, visited);
  return published.has(urlPath) || published.has(urlPath + '.html') ||
    published.has(urlPath.replace(/\/$/, '') + '/index.html');
}
const broken = new Map();
let checked = 0;
for (const file of files.filter(file => file.endsWith('.html'))) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  const html = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const canonical = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1];
  const baseHref = html.match(/<base\b[^>]*href=["']([^"']+)/i)?.[1];
  const pageUrl = new URL(canonical || '/' + relative.replace(/\.html$/, ''), origin);
  // Component fragments are inserted into pages; their links must be root-relative.
  const base = baseHref ? new URL(baseHref, pageUrl) : pageUrl;
  for (const match of html.matchAll(/<(?:a|area)\b[^>]*\bhref\s*=\s*["']([^"']*)["']/gi)) {
    const href = match[1].replace(/&amp;/g, '&').trim();
    if (!href || href.startsWith('#') || href.includes('${')) continue;
    let url;
    try { url = new URL(href, base); } catch { continue; }
    if (!['www.skytraveljm.com', 'skytraveljm.com'].includes(url.hostname)) continue;
    checked++;
    if (!exists(decodeURIComponent(url.pathname))) {
      const key = url.pathname;
      if (!broken.has(key)) broken.set(key, []);
      broken.get(key).push({ file: relative, href });
    }
  }
}
console.log(`Checked ${checked} internal links: ${broken.size} missing destinations.`);
for (const [destination, sources] of broken) {
  console.log(destination);
  for (const source of sources) console.log(`  ${source.file}: ${source.href}`);
}
const invalidRedirects = redirects.filter(rule => !exists(rule.from));
console.log(`Checked ${redirects.length} redirect/rewrite rules: ${invalidRedirects.length} invalid destinations or loops.`);
for (const rule of invalidRedirects) console.log(`  ${rule.from} -> ${rule.to}`);
process.exitCode = broken.size || invalidRedirects.length ? 1 : 0;
