# SkyTravelJM front-end notes (Lighthouse perf, CSS/JS workflow) — Feb 2026

## Current perf fixes in prod pages
- `TierraSanta2026.html` and `TierraSanta2026-es.html` are the first pages piloting the perf/accessibility changes. Scores improved to ~96–97 Performance (LCP ~2.2s). Plan is to roll the same pattern to all pages.
  - Keep EN/ES parity: whenever an EN page is optimized, mirror the same head/preload/lazy strategy on its ES counterpart (structure identical, only text changes). Both language versions are equally important.
  - Preload responsive hero image; first slide eager with `fetchpriority="high"`.
  - Inline critical slideshow visibility CSS to avoid FOUC while components CSS loads async.
  - `css/components.css` loaded via `preload` + `onload` with `<noscript>` fallback.
  - Contrast color raised to `#9a7b4f` for tabs/headings to satisfy Lighthouse contrast.
  - Slick ARIA issue addressed in `js/page-init.js` (now also minified) by setting `tabindex/aria-hidden` on slides and disabling Slick’s default accessibility to prevent focus on hidden slides.
- Hosting on Netlify: cache headers set in `netlify.toml` (images 1 year immutable; CSS/JS 1 month). No .htaccess needed.
- Font Awesome removed; inline SVG icons used in footers (`components/footer*.html`) to cut unused CSS/font bytes.

- **Hero vs secondary slides:** In the slideshow, the first image is the hero/LCP target and must be eager, preloaded, and high priority. All remaining slides stay `loading="lazy"` and are non-critical.
- Language parity: EN/ES page pairs share the same structure and optimization pattern; keep both versions aligned (head tags, preload strategy, slideshow setup) while only the copy changes.
- Contact component: when embedded via `page-init.js`, its CSS is injected into `<head>`; when opened standalone it links `contact-section.css` plus parent `style.css`. Production pages already load `style.min.css`; standalone link is just for authoring preview.

## Bilingual architecture (EN/ES)
The site is fully bilingual. Every page exists as an EN/ES pair (e.g. `TierraSanta2026.html` / `TierraSanta2026-es.html`) and both versions are equally important — never ship a change to one without mirroring it on the other.

### How language is wired
- **`<html lang="…">`** — each page declares `lang="en"` or `lang="es"`. This is the single source of truth that `page-init.js` reads to decide which component variant to fetch (e.g. `footer.html` vs `footer-es.html`, `contact-section.html` vs `contact-section-es.html`).
- **`hreflang` tags** — both pages carry `<link rel="alternate" hreflang="en" …>` and `hreflang="es"` plus `hreflang="x-default"` pointing to the EN page, so search engines serve the right version.
- **Structured data** — each page has its own `ld+json` blocks with localized text; keep them in sync when content changes.

### Language switcher (`js/elegant-language-switcher.js`)
- **Desktop** (>768px): enhances the static `.language-switcher` links inside the nav with a smooth page-transition animation.
- **Mobile** (<=768px): dynamically builds a `.mobile-language-switcher` dropdown (button + options menu) and inserts it before `.menu-toggle`. Includes ARIA attributes (`aria-haspopup`, `aria-expanded`, `role="menuitem"`), escape-key close, and outside-click close.
- **Responsive**: listens for window resize; tears down and rebuilds the mobile switcher when crossing the 768px breakpoint.
- **Markup in HTML**: each page has a `.language-switcher` div with `.lang-option` links (one marked `.active-lang`). The JS reads these to build the mobile version, so keep them accurate when adding new pages.
- **CSS lives in `style.css`** — `.language-switcher`, `.mobile-language-switcher`, `.mobile-lang-toggle`, and related responsive rules. These classes are in the PurgeCSS safelist (`purgecss.config.cjs`) because they're created dynamically by JS.
- **XSS protection**: user-facing text from the DOM is escaped via `escapeHtml()` before injection.
- Minified as `js/elegant-language-switcher.min.js`; both TierraSanta pages already reference the `.min.js` version with `defer`.

### Components that auto-detect language
`page-init.js` checks `document.documentElement.lang` and loads the correct variant:
- Footer → `components/footer.html` or `components/footer-es.html`
- Contact section → `components/contact-section.html` or `components/contact-section-es.html`

When adding a new bilingual page, ensure `<html lang="…">` is set correctly — everything else follows automatically.

## Rollout guide for other pages (repeatable steps)
1) **CSS**: Ensure `style.css` is up to date → run PurgeCSS (`node_modules/.bin/purgecss --config purgecss.config.cjs --output .purgecss-out`) → minify to `style.min.css` (same script used before). Keep `style.css` in repo.
2) **Swap links** in the target HTML:
   - Replace `<link rel="preload" href="style.css" as="style">` with `style.min.css`.
   - Replace `<link rel="stylesheet" href="style.css">` with `style.min.css`.
3) **Components CSS** (optional async load): preload `css/components.css` with onload swap + `<noscript>` fallback, and keep the tiny inline slideshow visibility CSS if the page uses `.slideshow`.
4) **JS**: Point `<script>` tags to the `.min.js` versions (`navigation.min.js`, `elegant-language-switcher.min.js`, `contact-tracking.min.js`, `page-init.min.js`) with `defer`.
5) **Contrast/ARIA**: If the page uses tabs/slideshow headings, ensure the #9a7b4f color and the Slick ARIA fix from `js/page-init.js` are present (already in minified bundle).
6) **Cache**: Netlify headers already set in `netlify.toml` (images 1 year immutable; CSS/JS 1 month) — no per-page work needed.
7) **Verify**: Run Lighthouse (mobile) on the page; check LCP, FCP, contrast, and ARIA hidden focus. If clean, proceed to next page.

## Build/minification workflow
- Source of truth: `style.css` (keep for editing + PurgeCSS input). **Do not delete.**
- Purged/minified CSS: `style.min.css` generated via `node_modules/.bin/purgecss --config purgecss.config.cjs` then simple minify script.
- Minified JS outputs:
  - `js/navigation.min.js`
  - `js/elegant-language-switcher.min.js`
  - `js/contact-tracking.min.js`
  - `js/page-init.min.js`
- The two TierraSanta pages are already wired to `style.min.css` and `.min.js` files; other pages still point to `style.css`/unminified JS. Swap if desired, but keep `style.css` in repo.
- Purge safelist lives in `purgecss.config.cjs` (includes dynamic classes for tabs, nav, language switcher, sliders, toasts, testimonials, etc.).

## Outstanding optional items
- If rolling site-wide: update all HTML to use `style.min.css` and the `.min.js` files.
- Image sizing: responsive `sizes/srcset` could be tightened for galleries to reduce overfetch without lowering quality.

## Quick reminders
- Critical inline CSS in heads keeps first slide visible pre-Slick init; don’t remove unless you inline critical CSS another way.
- Keep `style.css` under version control; regenerate `style.min.css` after edits.

## Rest of Website Optimization
- Apply the “TierraSanta pattern” to remaining pages (e.g., Medjugorje2026/en & es):
  1) Swap head links to preload + load `style.min.css` (instead of `style.css`).
  2) Use the same slideshow rules: first slide is hero/LCP (eager + fetchpriority=high + preload); other slides stay `loading="lazy"`.
  3) Inline the tiny slideshow visibility CSS; load `css/components.css` via preload/onload + `<noscript>` fallback.
  4) Point scripts to `.min.js` versions (`navigation`, `elegant-language-switcher`, `contact-tracking`, `page-init`) with `defer`.
  5) Maintain EN/ES parity—structure identical, only copy differs.
- Current directive: **do not edit `style.css` and do not introduce new classes/styles**. Reuse existing styles and the current `style.min.css`. If a future change truly requires new styles, revisit PurgeCSS/minify after updating `style.css`.
