// Tells Bing and the other IndexNow engines which pages changed, so ChatGPT and Copilot see updates within days.
// Run daily by .github/workflows/indexnow.yml. ALL=true sends every URL in sitemap.xml. DRY_RUN=1 prints without sending.
const fs = require('fs');
const { execSync } = require('child_process');
const HOST = 'www.skytraveljm.com';
const fail = (m) => { console.error(m); process.exit(1); };
const keyFile = fs.readdirSync('.').find((f) => /^[a-f0-9]{32}\.txt$/.test(f) && fs.readFileSync(f, 'utf8').trim() === f.slice(0, 32));
if (!keyFile) fail('No IndexNow key file at the repo root');
const KEY = keyFile.slice(0, 32);

function canonical(file) {
  const page = fs.readFileSync(file, 'utf8');
  if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(page)) return null;
  const m = page.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i);
  return m ? m[1] : null;
}

let urls;
if (process.env.ALL === 'true') {
  urls = [...fs.readFileSync('sitemap.xml', 'utf8').matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
} else {
  // Pages that differ between main now and main 25 hours ago (covers merges and the testimonial bot).
  const since = process.env.SINCE || '25 hours ago';
  const base = execSync(`git rev-list -1 --first-parent --before="${since}" HEAD`, { encoding: 'utf8' }).trim();
  const changed = base ? execSync(`git diff --name-only ${base} HEAD -- "*.html"`, { encoding: 'utf8' }).split('\n').filter(Boolean) : [];
  urls = changed.filter((f) => fs.existsSync(f) && !f.startsWith('components/')).map(canonical).filter(Boolean);
}
urls = [...new Set(urls)].filter((u) => { try { return new URL(u).host === HOST; } catch { return false; } }).slice(0, 10000);
if (!urls.length) { console.log('No changed pages to send.'); process.exit(0); }
console.log(`${urls.length} URL(s):\n${urls.join('\n')}`);
if (process.env.DRY_RUN) process.exit(0);

(async () => {
  const live = await fetch(`https://${HOST}/${KEY}.txt`).then((r) => (r.ok ? r.text() : '')).catch(() => '');
  if (live.trim() !== KEY) fail(`The key file is not live at https://${HOST}/${KEY}.txt yet`);
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
  });
  if (![200, 202].includes(res.status)) fail(`IndexNow answered ${res.status}: ${await res.text()}`);
  console.log(`IndexNow accepted ${urls.length} URL(s) (HTTP ${res.status}).`);
})();
