# Sky Travel J&M website: rules for every engineer and coding agent

Static HTML/CSS/JS on Netlify, deployed from `main`. Bilingual (ES/EN). Spanish-speaking Catholic
pilgrims across the whole U.S. are the main audience. More front-end notes: `.claude/claudepleaseread.md`.

## 1. Clean URLs (enforced: the deploy fails if broken)

**No public URL ends in `.html`.** The files are `.html`, but visitors and Google only ever see clean URLs.

For every new page (always as an ES + EN pair):

1. Pick the clean URLs: lowercase, hyphens (not underscores), the words people search for.
   ES ends in `-es`. Leave the year out if the trip repeats every year.
   Example: `/camino-de-santiago-es` and `/camino-de-santiago`.
2. `netlify.toml`:
   - 200 rewrite with `force = true`: `/my-trip-es` → `/peregrinaciones-2027/my-trip-es.html`
   - 301 redirects to the clean URL from the `.html` path **and** from the extensionless file path
     (`/peregrinaciones-2027/my-trip-es.html` and `/peregrinaciones-2027/my-trip-es`).
   - Copy the Camino de Santiago block as the pattern.
3. Use **only** the clean URL in: canonical, hreflang (es, en, x-default → ES page), og:url,
   JSON-LD `url` / `@id`, the language switcher, internal links and `sitemap.xml`.
4. If the page has a trip-specific WhatsApp message or GA4 trip name, add the clean path to
   `tripWhatsAppMessages` in `js/page-init.js` **and** `js/page-init.min.js`, and to `tripNames` in
   `js/site-tracking.js` (that one strips `-es`, so ES and EN need separate keys when their slugs differ).
   Bump the `?v=` on the page's `<script>` tags so browsers fetch the new file.
5. Check before pushing: `npm run check:urls` and `npm run check:links`.
   Netlify runs `scripts/check-clean-urls.js` as the build command. If it fails, the deploy
   (production or Deploy Preview) stops and the log says exactly what to fix.
6. After merge: request indexing for the new URLs in Google Search Console and Bing Webmaster Tools.

Changing an existing page's URL: keep 301s from every old URL, update every reference above, and
request indexing for the new URLs. Expect Google to take days to weeks to move the ranking over.

## 2. Trip-page content rules

- Spanish first. Every change goes on the ES page and its EN twin in the same commit.
- Never change or add prices, currency, or nights text without the owner (Doris).
- Never imply Miami-only departures: pilgrims join from any U.S. city or country.
- Don't invent trip facts. Open questions go to Doris in a separate list.
- No new navigation items, hubs or sections without the owner's OK.
- Structured data must match the visible text. FAQPage JSON-LD mirrors the visible FAQs exactly.

## 3. Code rules

- Preserve each file's line endings (some are CRLF, some LF) so diffs show only real edits.
- Don't edit shared components (`components/*`) for one page. For page-specific wording in the
  injected contact form, footer or WhatsApp button, use a page-only script like
  `js/italia-2027-contacto.js`.
- Don't add new CSS classes. Reuse `style.css` / `style.min.css` (see `.claude/claudepleaseread.md`).
- IndexNow already runs daily (`scripts/indexnow.js`) and `robots.txt` needs no changes.
- Big or risky changes go through a PR and a Netlify Deploy Preview check before merging to `main`.
