# Sky Travel J&M — SEO & Conversion Audit (August 2026)

Interactive version: https://claude.ai/code/artifact/ac4a6016-8539-420d-91f1-a1399f15a610

Prepared for Doris Pérez, Sky Travel J&M. Baseline: ~2 organic leads/month. Target: 10+ organic leads/month.

**Methodology.** Grounded in a direct read of this repository's source — every title tag, meta description, H1, schema block, redirect rule, and word count cited below was extracted from the actual deployed files. Live-domain fetching (skytraveljm.com) was blocked by network policy during this audit, so a few findings that a live crawl would normally confirm (whether legacy `.html` URLs still return 200, live PageSpeed/CWV scores, current Google Business Profile status) are flagged as "verify in GSC/PSI" rather than asserted as fact — see the checklist in Section 15.

## Snapshot

- 4 live pages compete for the exact phrase "Medjugorje pilgrimage": `/medjugorje`, `/medjugorje2026`, `/peregrinacion-medjugorje-2026-2027`, `/peregrinacion-medjugorje-roma`.
- 6 real, linked pages are missing from `sitemap.xml`: `/france`, `/france-es`, `/peregrinacion-medjugorje-roma`, `/peregrinacion-medjugorje-roma-es`, `/testimony/testimonials`, `/guidelines`.
- Only 4 of 20 blog posts are actually about pilgrimages; 16 are parenting/marriage-discernment reflections unrelated to travel intent.
- The homepage's first screen (a 100vh video hero) has zero words of headline copy — the H1 sits below it.

## 1. Technical SEO Audit

**What's already right (don't re-fix this):**
- `robots.txt` is clean and correct: explicit allows for major crawlers, sensible disallows for utility pages, correct sitemap reference.
- Canonical tags present and correct on every page checked.
- hreflang (en/es/x-default) implemented systematically and correctly sitewide — rare to see done this well on a small agency site.
- Schema markup is sophisticated: TravelAgency (with real NAP), TouristTrip, Offer, Event, FAQPage, BreadcrumbList, Review/AggregateRating.
- 80 explicit 301 rules in `netlify.toml` methodically consolidate legacy `.html` and case-variant URLs — active maintenance, not neglect.
- Alt text present on effectively every image sampled.
- Long-lived cache headers correctly configured for images/CSS/JS.

**Critical**
1. **Four pages target "Medjugorje pilgrimage."** `/medjugorje` (legacy, 2,841 words, still uses unoptimized `/images/`), `/medjugorje2026` (current, only 1,229 words), `/peregrinacion-medjugorje-2026-2027` (built as a Google Ads landing page per `netlify.toml` comments, but fully indexable and already ranking organically), `/peregrinacion-medjugorje-roma` (Medjugorje+Rome+Assisi). Google's live index already shows this split — both the old `Medjugorje.html` title ("Pilgrimage of Peace - Medjugorje 2025") and the new `/medjugorje2026` title surface separately. **Fix:** consolidate to `/medjugorje2026` as the single canonical Medjugorje-only page (merge in the legacy page's depth, then 301 `/medjugorje` → `/medjugorje2026`); keep `/peregrinacion-medjugorje-roma` since it's a genuinely distinct itinerary; set `/peregrinacion-medjugorje-2026-2027` to `noindex,follow` since it's explicitly an ads-only landing page.
2. **Six real pages missing from sitemap.xml**, including `/france` (1,658 words, featured on the homepage at €4,880) and `/peregrinacion-medjugorje-roma` (featured at $4,100). Add all six with hreflang pairs matching the existing pattern — ~20 minutes of work.

**High**
3. **Contact info and testimonials are JS-injected, not in the static HTML.** `contact.html`'s real content lives in `components/contact-section.html`, loaded into an empty container div by `page-init.min.js`; the raw page carries ~47 words. `testimony/testimonials.html` has ~65 words of static text behind an AggregateRating schema claiming 127 reviews (likely sourced at runtime via the Notion client in `package.json`). Verify via Rich Results Test / URL Inspection that this renders for Googlebot; a schema claiming 127 reviews with no matching visible text is a rich-result suppression risk.
4. **`SantuariosMarianos.html` has zero H1 tags**; `about.html`'s hero H1 is literally empty (`<h1></h1><p></p>`).

**Medium**
5. `peregrinacion-medjugorje-roma.html` title says "$4,100 All Inclusive," its meta description says "From €2,285 all inclusive" — reconcile.
6. 154MB of unoptimized originals still sit in the deployed `/images/` folder (a 20MB PNG, an 8.4MB JPG among them); current destination pages correctly use the 30MB `/imagesWebp/` versions, but the legacy `/medjugorje` page still references 8 raw files. Clean up once that page is retired.
7. The homepage's 100vh video hero has no static poster doing LCP duty — the largest visible element on load depends on a third-party YouTube iframe. Set an explicit WebP poster as fallback and run PageSpeed Insights to confirm.

## 2. Google Search Visibility

Live search confirms skytraveljm.com is indexed and surfaces for branded/destination queries — a real foundation. The gap isn't "Google doesn't know you exist," it's "Google can't tell which page to trust" on head terms.

**Should be ranking, probably isn't:** "Catholic pilgrimage travel agency," "Medjugorje pilgrimage" (split 4 ways), "Catholic pilgrimages from Miami," "Holy Land Catholic pilgrimage" (split 2 ways), "Fatima pilgrimage" / "Lourdes pilgrimage" (no dedicated pages — only bundled), "Rome Vatican pilgrimage" / "Assisi pilgrimage" (only inside a 2025-dated Italy page and a Medjugorje+Rome combo), "peregrinaciones católicas desde Miami."

**Additional high-intent searches worth targeting:** "Medjugorje pilgrimage packages 2027," "Catholic group travel for parishes," "traveling to Medjugorje with a priest," "is it safe to travel to Medjugorje," "best Catholic pilgrimage for first-timers," "IATA accredited Catholic pilgrimage agency."

**Topical authority read:** Medjugorje and Holy Land have real depth (multiple pages, 1,200–3,000 words, rich schema). Fátima, Lourdes, Rome, and Assisi each have at most a shared or dated page — Google has far less evidence of authority there, which is why they're unlikely to surface for destination-specific searches despite being real offerings.

## 3. Keyword Opportunity Map

**Transactional (bottom funnel):** Medjugorje pilgrimage 2026 → `/medjugorje2026` (Critical) · Holy Land pilgrimage tour 2026 → `/tierrasanta2026` (Critical) · Catholic pilgrimage tours from Miami → new page/homepage (High) · Fatima and Lourdes pilgrimage package → new dedicated page (High) · Medjugorje Rome Assisi pilgrimage → `/peregrinacion-medjugorje-roma` (High) · Parish pilgrimage trip planning → new page (Medium)

**Commercial investigation (middle funnel):** Medjugorje pilgrimage cost (High) · Fatima vs Lourdes vs Medjugorje (High) · Best Catholic pilgrimage company (Medium) · Catholic pilgrimage packages with airfare included (Medium) · Small group Catholic pilgrimage (Low)

**Informational (top funnel):** How to prepare for a Catholic pilgrimage — repurpose `/guidelines` (High) · Is Medjugorje safe to visit (High) · What happens on a Catholic pilgrimage (Medium) · Best time to visit Medjugorje (Medium) · What to pack for a Catholic pilgrimage (Low-Medium) · Spiritual benefits of pilgrimage (Low)

**Local:** Catholic travel agency Miami (Critical) · Catholic pilgrimage Miami (Critical) · Peregrinaciones católicas Miami (Critical) · Catholic tours Miami parishes (Medium) · Agencia de viajes católica Miami (High)

**Keyword gap vs. competitors:** 206 Tours and Catholic Journeys rank on head terms partly because each trip variant (mini-stay, standard, extended, combo) gets its own non-overlapping page — more pages, but each owns a distinct long-tail phrase instead of competing with siblings. That's the opposite of the current Medjugorje cluster.

## 4. Competitor Analysis

| Competitor | What they do better | Where Sky Travel can win |
|---|---|---|
| 206 Tours | Founded 1985, founder story on every page; one page per trip variant, not cannibalizing; destination blog hub | Native bilingual (they're EN-only) — LatAm/Spanish search is wide open |
| Catholic Journeys | Domain = exact-match category; hard price anchor in the title tag | Sky Travel's schema/hreflang is more technically sophisticated |
| Blue Heart Travel | Broad destination breadth (9+ countries) | Depth beats breadth for conversion — Sky Travel's per-destination content is already deeper on the destinations it specializes in |
| Peregrinaciones.com (Spain/LatAm) | 40+ years positioning, native Spanish-market authority | Not built for US/Miami-departure bilingual families — Sky Travel's unclaimed niche |
| Haya Peregrinaciones, Éxodo Peregrinaciones, Peregrino.travel | Strong Spanish-language topical clusters | None are Miami/US-departure focused |
| Local parishes (e.g. St. Joseph Miami Beach) self-organizing trips | Direct priest trust, zero marketing cost | Not really competitors — partnership targets (see Backlinks) |

Why they outrank Sky Travel today is mostly signal clarity, not content quality: one URL and years of consistent indexing beats four competing URLs. Fix the split and Sky Travel's per-page content is already competitive, and ahead on schema depth.

## 5. Individual Page Audit (highlights — full table in the artifact)

- **Homepage** — Strong schema, correct canonical/hreflang. H1 ("Discover Catholic pilgrimages that transform your faith") is good copy but invisible below a full-screen video with no overlay text.
- **`/medjugorje2026`** — Title is fine (80 chars). Content (1,229 words) is thinner than the legacy page it should replace (2,841 words) — backwards for your current bookable offer.
- **`/about`** — H1 is literally empty. ~525 words of generic copy; founding year (2015, per schema) and founder name (Doris Pérez, per footer) appear nowhere in the visible content. Rewritten H1: "Guiding Catholic Pilgrims Since 2015."
- **`/santuariosmarianos`** — No H1 at all.
- **`/tierrasanta2026`** — Strongest page on the site (richest schema: Review, Person, AggregateRating). Use as the template.
- **`/france`** — Good content, absent from sitemap.
- **`/italy`** — Framed entirely around "Jubilee Year 2025" — will read as expired after 2025; needs refresh or reframing as annual.
- **`/contact`, `/testimony/testimonials`** — Real content is JS-injected; static text is thin.
- **`/guidelines`** — Genuinely useful prep content, isolated with no inbound links from destination pages or blog.

## 6. Destination Landing Pages

The instinct to give major destinations their own URL is already correct (Medjugorje/Holy Land prove it). The gap: **Fátima, Lourdes, Rome/Vatican, and Assisi have never had that treatment** — only bundled inside SantuariosMarianos, Mariana2026, or Italy.html.

**Recommendation:** build dedicated `/fatima-pilgrimage` and `/lourdes-pilgrimage` pages (real standalone search demand), build `/rome-vatican-pilgrimage` and refresh Italy.html's dating, keep Assisi bundled unless a standalone departure exists.

**Ideal new-page structure** (1,800–2,500 words): SEO title → meta description → H1 → introduction → spiritual significance → major sites → sample itinerary → what's included → upcoming dates/price → testimonials → photo gallery → FAQ (schema-marked) → spiritual director info → WhatsApp + Request-Info CTAs (static HTML) → related pilgrimage links.

## 7. Content Strategy

**Critical finding:** 16 of 20 blog posts have nothing to do with pilgrimage travel ("The best gift for our children," "Ayuda adecuada... discernir el matrimonio," etc.) — sincere content, zero travel intent, zero connection to the funnel. Only the fasting/prayer-retreat-in-Medjugorje post (EN+ES) is on-topic. Stop publishing off-topic content on this domain; every future post should link to a destination page and answer a real pre-purchase question.

**12-month calendar (first 6 months, commercial-intent first):**

| Month | Article | Keyword | Links to | Priority |
|---|---|---|---|---|
| 1 | How Much Does a Catholic Pilgrimage Cost in 2026? | catholic pilgrimage cost | /medjugorje2026, /tierrasanta2026 | Critical |
| 1 | Is Medjugorje Safe to Visit? | is Medjugorje safe | /medjugorje2026 | Critical |
| 2 | Your First Catholic Pilgrimage: A Complete Guide (repurpose /guidelines) | first Catholic pilgrimage guide | homepage, all destinations | High |
| 2 | Fátima vs. Lourdes vs. Medjugorje | Fatima vs Lourdes vs Medjugorje | new Fátima/Lourdes pages | High |
| 3 | What to Pack for a Catholic Pilgrimage | what to pack pilgrimage | /guidelines | Medium |
| 3 | Best Time to Visit Medjugorje | best time to visit Medjugorje | /medjugorje2026 | Medium |
| 4 | What Actually Happens on a Catholic Pilgrimage | what happens on a Catholic pilgrimage | all destinations | Medium |
| 4 | Traveling with a Priest | traveling with a priest pilgrimage | About, all destinations | Medium |
| 5 | Planning a Parish Pilgrimage: A Guide for Priests | parish pilgrimage planning | new parish/group page | High |
| 5 | Peregrinar a Medjugorje: Guía Completa desde Miami | peregrinación a Medjugorje | /medjugorje2026-es | High |
| 6 | The Spiritual Benefits of Pilgrimage | spiritual benefits of pilgrimage | About, homepage | Low |

**Topic clusters:** Medjugorje hub (pilgrimage + cost + safety + best-time + prep) · Planning & Preparation hub (guidelines, packing, first-timer guide, cost comparisons) · Parish & Group Travel hub (underused, plays to bilingual Miami positioning).

## 8. Spanish SEO

Already better than it gets credit for: dedicated `-es` URLs, correct hreflang sitewide, natural (not machine-translated) Spanish copy. A real advantage over most US competitors.

**Gap:** Spanish titles/metas are translated from the English strategy rather than independently keyword-researched for how Spanish-speaking Catholics actually search. No EN/ES cannibalization detected — hreflang is implemented correctly.

**Additional Spanish opportunities:** "peregrinaciones católicas desde Miami" (unclaimed — no Spanish-market leader is Miami-departure focused), "agencia de viajes católica en Miami," "viajes religiosos para grupos parroquiales," "cuánto cuesta una peregrinación a Medjugorje," "peregrinación católica para principiantes."

## 9. Conversion Rate Optimization

**Critical:** The homepage's first screen (100vh video) has no headline, CTA, or trust signal — a visitor who doesn't scroll learns nothing. Fix: overlay H1/subhead/CTA directly on the hero.

**High:** Trust signals (IATA 10564573, FDACS ST45413) live only in 11px footer text — not near pricing or CTAs, where they'd matter most.

**Medium:** No persistent WhatsApp entry point beyond the shared contact-section component (typically once per page) despite it being the audience's preferred channel. Mixed currencies (€/$) across the homepage grid with no explanatory note.

**Already working, keep as-is:** Four equal contact methods (SMS/Call/WhatsApp/Email), a 4-field lead form with a 24-hour response promise, honeypot spam protection, transparent on-page pricing.

## 10. Homepage Redesign

Proposed order: Hero (H1/subhead/CTA overlaid on video) → Trust strip (IATA/FDACS/founding year/pilgrims served) → Upcoming departures (soonest-first) → Why Sky Travel J&M (4-icon row) → Featured destinations → Testimonials (static, real names/photos) → Meet our spiritual directors (new section) → FAQ → Lead capture + WhatsApp.

- **H1:** "Walk Where the Saints Walked"
- **Subhead:** "Catholic pilgrimages to Medjugorje, the Holy Land, Fátima, Lourdes and Rome — bilingual, all-inclusive, with daily Mass and a spiritual director on every trip. Departing from Miami and across Latin America."
- **Primary CTA:** "See Upcoming Pilgrimages"
- **Secondary CTA:** "Chat with Us on WhatsApp"

## 11. E-E-A-T & Trust

Credentials exist (IATA, FDACS, founded 2015, real Miami address, active social profiles) but aren't surfaced where trust decisions happen. Add: founder story to About's empty hero, a trust strip near every price/CTA, visible/crawlable review text backing the AggregateRating schema, and a "Meet Our Spiritual Directors" section that currently doesn't exist anywhere on the site.

## 12. Local SEO

Live GBP data wasn't accessible this session — action this checklist directly: category as Travel Agency/Tour Operator, description leading with "Catholic pilgrimage travel agency in Miami," explicit service-area listing for Spanish-speaking US/LatAm Catholics, real past-group photos, weekly departure-tied posts, active Google review requests after every trip.

**Local partnership/citation targets found during this research:** Archdiocese of Miami (miamiarch.org), The Florida Catholic (thefloridacatholic.org), National Shrine of Our Lady of Charity ("La Ermita," Miami), and parishes that self-organize trips (e.g. St. Joseph Catholic Parish, Miami Beach).

## 13. Backlink Strategy

Parishes that self-organize trips (offer to handle logistics for their next one) · diocesan media (pitch The Florida Catholic a trip recap) · traveling priests (ask their parish to link as "official group travel partner") · testimonial subjects (ask happy travelers to link back when they blog about the trip) · IATA/ARC and Catholic travel directories · Catholic podcasts/YouTube channels covering Marian apparitions.

## 14. Lead Generation Beyond SEO

Downloadable pilgrimage prep guide (repurpose `/guidelines`, email-gated) · departure alert list · WhatsApp broadcast opt-in · monthly virtual info night tied to a specific departure · retargeting pixel on destination pages (GA4 already installed).

## 15. GSC / GA4 Diagnostic Checklist

**Check now:** Coverage report for the 3 sitemap-missing pages · "Page with redirect"/duplicate-canonical status for legacy capitalized `.html` URLs (confirms or resolves the cannibalization finding) · Performance report filtered to "Medjugorje," compared across all 4 competing pages · Core Web Vitals / LCP element on homepage · Mobile usability · Rich Results status for FAQPage/Review/TouristTrip schema.

**Send back for a deeper pass:** 6-month GSC Performance export (queries + pages + clicks/impressions/CTR/position) · GA4 landing-page + conversion-event report for the same period · current GBP insights (views, calls, direction requests) · PageSpeed Insights run on homepage + top 2 destination pages · actual ad spend/results on the Google Ads landing page.

## Prioritized Action Plan

**First 7 days:** Add 6 missing URLs to sitemap.xml · fill empty H1s on About/SantuariosMarianos · fix the price/currency mismatch · noindex the ads-only Medjugorje landing page · pull GSC/GA4 exports.

**First 30 days:** Consolidate the 4-way Medjugorje cannibalization · rebuild the homepage hero · verify testimonials/contact render for Googlebot · add a persistent WhatsApp button · prune off-topic blog content and publish the first 2 commercial-intent articles · add a trust strip near pricing.

**Days 31–90:** Build dedicated Fátima and Lourdes pages · build a Rome/Vatican page and refresh Italy.html · publish months 2–4 of the content calendar · improve Google Business Profile · build a parish/group-pilgrimage page and start outreach · launch the WhatsApp broadcast list and prep-guide lead magnet.

**Months 4–6:** Execute backlink outreach (parishes, Florida Catholic, priest partnerships) · complete months 5–6 of content, including Spanish-specific keyword content · launch the first virtual info night.

**Months 6–12:** Push for page-1 presence on head terms using the now-consolidated pages · complete the remaining content calendar with review-driven content from finished trips · formalize 2–3 recurring parish partnerships.

## Top 10 Actions (fastest path to more qualified leads)

1. Consolidate the 4 Medjugorje pages into 1–2 — stops the site from competing with itself.
2. Fix the homepage's invisible-headline hero — a conversion fix, not just SEO.
3. Add the 6 missing pages to sitemap.xml — fastest fix on this list.
4. Fill the empty About H1 and add a real founder story.
5. Verify testimonials/contact actually render for Google.
6. Add a persistent WhatsApp button sitewide.
7. Stop off-topic blog content; start the commercial-intent calendar.
8. Build dedicated Fátima and Lourdes pages.
9. Surface IATA/FDACS/since-2015 trust signals next to every price and CTA.
10. Open parish partnership outreach (3–5 Miami parishes) — a parallel lead channel that also produces backlinks and testimonials.
