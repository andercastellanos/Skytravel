#!/bin/bash
# ============================================
# Sky Travel JM — SEO & Structure Validation Script
# ============================================
# Validates city/destination pages against the Medjugorje2026.html reference:
#   HTML structure, meta tags, canonical, hreflang (20+ variants),
#   Open Graph, Twitter cards, JSON-LD structured data,
#   image performance, sitemap, netlify.toml redirects, live URLs
#
# Usage:
#   bash scripts/verify-experience-seo.sh              # validate all pages + live URL tests
#   bash scripts/verify-experience-seo.sh local        # local-only (skip live URL tests)
#   bash scripts/verify-experience-seo.sh single FILE  # validate a single page
#   bash scripts/verify-experience-seo.sh --help       # show help

# Show help
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  cat <<'EOF'
Sky Travel JM — SEO & Structure Validation Script

USAGE:
  bash scripts/verify-experience-seo.sh [MODE] [FILE]

MODES:
  (none)        Validate all pages + live URL tests
  local         Validate all pages (skip live URL tests)
  single FILE   Validate a single page
  -h, --help    Show this help message

CHECKS PERFORMED:
  1. Page inventory (EN/ES pairs exist)
  2. HTML structure (.destination-header, .slideshow, .header-text, tabs, FAQ)
  3. No legacy elements (.page-header, .slideshow-container, .slide-caption)
  4. Meta tags (title, description, robots, geo)
  5. First slide performance (loading="eager", fetchpriority="high")
  6. Image optimization (width/height, srcset, lazy loading)
  7. Canonical tag validation (extensionless)
  8. Hreflang pair consistency (EN <-> ES + 20 country variants + x-default)
  9. Open Graph tags (type, title, description, url, image, locale)
  10. Twitter Card tags (card, title, description, image)
  11. JSON-LD structured data (WebPage, TravelAgency, TouristTrip, Event, FAQPage)
  12. CSS/JS dependencies (style.css, components.css, FOUC prevention)
  13. Sitemap cross-reference
  14. Netlify.toml redirect coverage
  15. Live URL tests (production mode only)

EXIT CODES:
  0 - All checks passed (warnings allowed)
  1 - One or more critical failures

EXAMPLES:
  bash scripts/verify-experience-seo.sh local
  bash scripts/verify-experience-seo.sh single Medjugorje2026.html
  bash scripts/verify-experience-seo.sh

EOF
  exit 0
fi

BASE_URL="https://www.skytraveljm.com"
MODE="${1:-production}"
SINGLE_FILE="$2"

# Color functions
green() { printf "\033[32m  PASS  %s\033[0m\n" "$1"; }
red()   { printf "\033[31m  FAIL  %s\033[0m\n" "$1"; }
yellow(){ printf "\033[33m  WARN  %s\033[0m\n" "$1"; }
blue()  { printf "\033[34m  INFO  %s\033[0m\n" "$1"; }

# Counters
PASS=0
FAIL=0
WARN=0

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -d "$PROJECT_DIR" ]; then
  red "Could not determine project directory"
  exit 1
fi

# ─────────────────────────────────────────────────
# PAGE INVENTORY — EN/ES pairs
# Format: EN_FILE|EN_CANONICAL|ES_FILE|ES_CANONICAL
# ─────────────────────────────────────────────────

# City pages (new format — root level, following Medjugorje2026 reference)
CITY_PAIRS=(
  "Medjugorje2026.html|/medjugorje2026|Medjugorje2026-es.html|/medjugorje2026-es"
  "TierraSanta2026.html|/tierrasanta2026|TierraSanta2026-es.html|/tierrasanta2026-es"
  "Mariana2026.html|/mariana2026|Mariana2026-es.html|/mariana2026-es"
  "peregrinacion-medjugorje-2026-2027.html|/peregrinacion-medjugorje-2026-2027|peregrinacion-medjugorje-2026-2027-es.html|/peregrinacion-medjugorje-2026-2027-es"
  "peregrinacion-tierrasanta-2027.html|/peregrinacion-tierrasanta-2027|peregrinacion-tierrasanta-2027-es.html|/peregrinacion-tierrasanta-2027-es"
)

# Experience pages (legacy format — under experiences/ and es/experiences/)
EXPERIENCE_PAIRS=(
  "experiences/medjugorje2024.html|/experiences/medjugorje2024|es/experiences/medjugorje-2024-es.html|/es/experiences/medjugorje-2024-es"
  "experiences/medjugorje2023.html|/experiences/medjugorje2023|es/experiences/medjugorje-2023-es.html|/es/experiences/medjugorje-2023-es"
  "experiences/medjugorje2022.html|/experiences/medjugorje2022|es/experiences/medjugorje-2022-es.html|/es/experiences/medjugorje-2022-es"
  "experiences/medjugorje2019.html|/experiences/medjugorje2019|es/experiences/medjugorje-2019-es.html|/es/experiences/medjugorje-2019-es"
  "experiences/medjugorje2017.html|/experiences/medjugorje2017|es/experiences/medjugorje-2017-es.html|/es/experiences/medjugorje-2017-es"
  "experiences/tierrasanta2021.html|/experiences/tierrasanta2021|es/experiences/tierra-santa-2021-es.html|/es/experiences/tierra-santa-2021-es"
  "experiences/tierrasanta2019.html|/experiences/tierrasanta2019|es/experiences/tierra-santa-2019-es.html|/es/experiences/tierra-santa-2019-es"
  "experiences/tierrasanta2018.html|/experiences/tierrasanta2018|es/experiences/tierra-santa-2018-es.html|/es/experiences/tierra-santa-2018-es"
  "experiences/tierrasanta2017.html|/experiences/tierrasanta2017|es/experiences/tierra-santa-2017-es.html|/es/experiences/tierra-santa-2017-es"
  "experiences/tierrasanta2016.html|/experiences/tierrasanta2016|es/experiences/tierra-santa-2016-es.html|/es/experiences/tierra-santa-2016-es"
  "experiences/tierra-santa-2022.html|/experiences/tierra-santa-2022|es/experiences/tierra-santa-2022-es.html|/es/experiences/tierra-santa-2022-es"
  "experiences/catholic-pilgrimage-rome-jubilee-2025.html|/experiences/catholic-pilgrimage-rome-jubilee-2025|es/experiences/peregrinacion-catolica-roma-jubileo-2025.html|/es/experiences/peregrinacion-catolica-roma-jubileo-2025"
  "experiences/catholic-sanctuaries-2025.html|/experiences/catholic-sanctuaries-2025|es/experiences/santuarios-catolicos-2025-es.html|/es/experiences/santuarios-catolicos-2025-es"
)

# Combine both arrays
ALL_PAIRS=("${CITY_PAIRS[@]}" "${EXPERIENCE_PAIRS[@]}")

# Required hreflang country variants (from Medjugorje2026 reference)
HREFLANG_VARIANTS=(es es-US es-CO es-MX es-ES es-AR es-PE es-VE es-CL es-EC es-GT es-CR es-PA es-BO es-PY es-UY es-HN es-SV es-NI es-DO es-PR en x-default)

echo "=============================================="
echo " Sky Travel JM — SEO & Structure Report"
echo " Mode: $(echo "$MODE" | tr '[:lower:]' '[:upper:]')"
echo " Generated: $(date '+%Y-%m-%d %H:%M')"
echo "=============================================="
echo ""

# ─────────────────────────────────────────────────
# HELPER: Validate HTML structure
# ─────────────────────────────────────────────────
validate_structure() {
  local file="$1"
  local filepath="${PROJECT_DIR}/${file}"

  if [ ! -f "$filepath" ]; then
    red "${file}: File not found"
    FAIL=$((FAIL + 1))
    return
  fi

  echo ""
  echo "--- ${file} ---"

  # .destination-header
  if grep -q 'class="destination-header"' "$filepath"; then
    green "${file}: has .destination-header"
    PASS=$((PASS + 1))
  else
    red "${file}: missing .destination-header"
    FAIL=$((FAIL + 1))
  fi

  # .slideshow
  if grep -q 'class="slideshow"' "$filepath"; then
    green "${file}: has .slideshow"
    PASS=$((PASS + 1))
  else
    red "${file}: missing .slideshow"
    FAIL=$((FAIL + 1))
  fi

  # .header-text
  if grep -q 'class="header-text"' "$filepath"; then
    green "${file}: has .header-text"
    PASS=$((PASS + 1))
  else
    red "${file}: missing .header-text"
    FAIL=$((FAIL + 1))
  fi

  # No legacy elements
  if grep -q 'class="page-header"' "$filepath"; then
    red "${file}: still has legacy .page-header"
    FAIL=$((FAIL + 1))
  else
    green "${file}: no legacy .page-header"
    PASS=$((PASS + 1))
  fi

  if grep -q 'class="slideshow-container"' "$filepath"; then
    red "${file}: still has .slideshow-container"
    FAIL=$((FAIL + 1))
  else
    green "${file}: no .slideshow-container"
    PASS=$((PASS + 1))
  fi

  if grep -q 'class="slide-caption"' "$filepath"; then
    red "${file}: still has .slide-caption"
    FAIL=$((FAIL + 1))
  else
    green "${file}: no .slide-caption"
    PASS=$((PASS + 1))
  fi

  # .trip-details section
  if grep -q 'class="trip-details"' "$filepath"; then
    green "${file}: has .trip-details"
    PASS=$((PASS + 1))
  else
    yellow "${file}: missing .trip-details"
    WARN=$((WARN + 1))
  fi

  # .highlight-card (pricing cards)
  if grep -q 'class="highlight-card"' "$filepath"; then
    green "${file}: has .highlight-card pricing"
    PASS=$((PASS + 1))
  else
    yellow "${file}: no .highlight-card pricing cards"
    WARN=$((WARN + 1))
  fi

  # Tab system (destination-info)
  if grep -q 'class="tab-container"' "$filepath"; then
    green "${file}: has tab system"
    PASS=$((PASS + 1))
  else
    yellow "${file}: no tab system (.tab-container)"
    WARN=$((WARN + 1))
  fi

  # FAQ section
  if grep -q 'class="faq-section"' "$filepath"; then
    green "${file}: has .faq-section"
    PASS=$((PASS + 1))
  else
    yellow "${file}: no .faq-section"
    WARN=$((WARN + 1))
  fi

  # FOUC prevention CSS
  if grep -q '\.slideshow \.slide:first-child' "$filepath"; then
    green "${file}: has FOUC prevention CSS"
    PASS=$((PASS + 1))
  else
    yellow "${file}: missing FOUC prevention inline CSS"
    WARN=$((WARN + 1))
  fi

  # .image-thumbnails
  if grep -q 'class="image-thumbnails"' "$filepath"; then
    green "${file}: has .image-thumbnails"
    PASS=$((PASS + 1))
  else
    yellow "${file}: no .image-thumbnails (may be intentional)"
    WARN=$((WARN + 1))
  fi
}

# ─────────────────────────────────────────────────
# HELPER: Validate meta tags
# ─────────────────────────────────────────────────
validate_meta() {
  local file="$1"
  local filepath="${PROJECT_DIR}/${file}"

  if [ ! -f "$filepath" ]; then return; fi

  echo ""
  echo "--- ${file}: Meta Tags ---"

  # <title> tag exists and is non-empty
  if grep -q '<title>.\+</title>' "$filepath"; then
    green "${file}: has <title>"
    PASS=$((PASS + 1))
  else
    red "${file}: missing or empty <title>"
    FAIL=$((FAIL + 1))
  fi

  # meta description
  if grep -q 'name="description"' "$filepath"; then
    green "${file}: has meta description"
    PASS=$((PASS + 1))
  else
    red "${file}: missing meta description"
    FAIL=$((FAIL + 1))
  fi

  # robots
  if grep -q 'name="robots"' "$filepath"; then
    green "${file}: has robots meta"
    PASS=$((PASS + 1))
  else
    red "${file}: missing robots meta"
    FAIL=$((FAIL + 1))
  fi

  # geo tags
  if grep -q 'name="geo.region"' "$filepath"; then
    green "${file}: has geo tags"
    PASS=$((PASS + 1))
  else
    yellow "${file}: missing geo tags (geo.region)"
    WARN=$((WARN + 1))
  fi

  # google-site-verification
  if grep -q 'name="google-site-verification"' "$filepath"; then
    green "${file}: has google-site-verification"
    PASS=$((PASS + 1))
  else
    yellow "${file}: missing google-site-verification"
    WARN=$((WARN + 1))
  fi
}

# ─────────────────────────────────────────────────
# HELPER: Validate image performance
# ─────────────────────────────────────────────────
validate_images() {
  local file="$1"
  local filepath="${PROJECT_DIR}/${file}"

  if [ ! -f "$filepath" ]; then return; fi

  echo ""
  echo "--- ${file}: Image Performance ---"

  # First slide: loading="eager" + fetchpriority="high"
  first_slide_img=$(grep -A2 'class="slide"' "$filepath" | grep '<img' | head -1)
  if [ -n "$first_slide_img" ]; then
    if echo "$first_slide_img" | grep -q 'loading="eager"'; then
      green "${file}: first slide loading=\"eager\""
      PASS=$((PASS + 1))
    else
      red "${file}: first slide missing loading=\"eager\""
      FAIL=$((FAIL + 1))
    fi

    if echo "$first_slide_img" | grep -q 'fetchpriority="high"'; then
      green "${file}: first slide fetchpriority=\"high\""
      PASS=$((PASS + 1))
    else
      red "${file}: first slide missing fetchpriority=\"high\""
      FAIL=$((FAIL + 1))
    fi
  else
    red "${file}: no slide images found"
    FAIL=$((FAIL + 1))
  fi

  # Check images have width/height attributes (CLS prevention)
  img_count=$(grep -c '<img ' "$filepath" 2>/dev/null || echo "0")
  img_with_dims=$(grep '<img ' "$filepath" | grep -c 'width="' 2>/dev/null || echo "0")
  if [ "$img_count" -gt 0 ] && [ "$img_with_dims" -eq "$img_count" ]; then
    green "${file}: all ${img_count} images have width/height"
    PASS=$((PASS + 1))
  elif [ "$img_count" -gt 0 ]; then
    yellow "${file}: ${img_with_dims}/${img_count} images have width/height"
    WARN=$((WARN + 1))
  fi

  # Check srcset usage
  srcset_count=$(grep -c 'srcset=' "$filepath" 2>/dev/null || echo "0")
  if [ "$srcset_count" -gt 0 ]; then
    green "${file}: has responsive srcset (${srcset_count} images)"
    PASS=$((PASS + 1))
  else
    yellow "${file}: no srcset found — images may not be responsive"
    WARN=$((WARN + 1))
  fi

  # Check lazy loading on non-first slides
  lazy_count=$(grep '<img ' "$filepath" | grep -c 'loading="lazy"' 2>/dev/null || echo "0")
  if [ "$lazy_count" -gt 0 ]; then
    green "${file}: ${lazy_count} images with lazy loading"
    PASS=$((PASS + 1))
  else
    yellow "${file}: no lazy-loaded images"
    WARN=$((WARN + 1))
  fi

  # Hero image preload
  if grep -q 'rel="preload" as="image"' "$filepath"; then
    green "${file}: has hero image preload"
    PASS=$((PASS + 1))
  else
    yellow "${file}: no hero image preload"
    WARN=$((WARN + 1))
  fi
}

# ─────────────────────────────────────────────────
# HELPER: Validate canonical tag
# ─────────────────────────────────────────────────
validate_canonical() {
  local file="$1"
  local expected="$2"
  local filepath="${PROJECT_DIR}/${file}"

  if [ ! -f "$filepath" ]; then return; fi

  canonical=$(grep -o 'rel="canonical" href="[^"]*"' "$filepath" | sed 's/rel="canonical" href="//;s/"$//')

  if [ -z "$canonical" ]; then
    red "${file}: no canonical tag"
    FAIL=$((FAIL + 1))
    return
  fi

  if [ "$canonical" = "${BASE_URL}${expected}" ]; then
    green "${file}: canonical OK (${expected})"
    PASS=$((PASS + 1))
  else
    red "${file}: canonical mismatch (got: ${canonical}, expected: ${BASE_URL}${expected})"
    FAIL=$((FAIL + 1))
  fi

  if echo "$canonical" | grep -q '\.html'; then
    red "${file}: canonical has .html extension"
    FAIL=$((FAIL + 1))
  fi
}

# ─────────────────────────────────────────────────
# HELPER: Validate hreflang (full 20+ country variants)
# ─────────────────────────────────────────────────
validate_hreflang() {
  local en_file="$1"
  local es_file="$2"
  local en_canonical="$3"
  local es_canonical="$4"
  local en_path="${PROJECT_DIR}/${en_file}"
  local es_path="${PROJECT_DIR}/${es_file}"

  if [ ! -f "$en_path" ] || [ ! -f "$es_path" ]; then return; fi

  # EN should reference ES
  if grep -q "hreflang=\"es\" href=\"${BASE_URL}${es_canonical}\"" "$en_path"; then
    green "hreflang: EN(${en_file}) -> ES"
    PASS=$((PASS + 1))
  else
    red "hreflang: EN(${en_file}) missing ES alternate"
    FAIL=$((FAIL + 1))
  fi

  # ES should reference EN
  if grep -q "hreflang=\"en\" href=\"${BASE_URL}${en_canonical}\"" "$es_path"; then
    green "hreflang: ES(${es_file}) -> EN"
    PASS=$((PASS + 1))
  else
    red "hreflang: ES(${es_file}) missing EN alternate"
    FAIL=$((FAIL + 1))
  fi

  # Both should have x-default
  en_xdef=$(grep -c 'hreflang="x-default"' "$en_path" 2>/dev/null)
  es_xdef=$(grep -c 'hreflang="x-default"' "$es_path" 2>/dev/null)
  if [ "$en_xdef" -gt 0 ] && [ "$es_xdef" -gt 0 ]; then
    green "hreflang: both have x-default"
    PASS=$((PASS + 1))
  else
    red "hreflang: missing x-default (EN: ${en_xdef}, ES: ${es_xdef})"
    FAIL=$((FAIL + 1))
  fi

  # Extensionless hreflang URLs
  en_html=$(grep 'hreflang=' "$en_path" | grep -c '\.html')
  es_html=$(grep 'hreflang=' "$es_path" | grep -c '\.html')
  if [ "$en_html" -eq 0 ] && [ "$es_html" -eq 0 ]; then
    green "hreflang: all URLs extensionless"
    PASS=$((PASS + 1))
  else
    red "hreflang: some URLs have .html (EN: ${en_html}, ES: ${es_html})"
    FAIL=$((FAIL + 1))
  fi

  # Count hreflang variants (should be 23: 20 es-XX + es + en + x-default)
  en_hreflang_count=$(grep -c 'hreflang=' "$en_path" 2>/dev/null)
  es_hreflang_count=$(grep -c 'hreflang=' "$es_path" 2>/dev/null)
  if [ "$en_hreflang_count" -ge 23 ]; then
    green "hreflang: EN has ${en_hreflang_count} variants (23+ expected)"
    PASS=$((PASS + 1))
  else
    yellow "hreflang: EN has only ${en_hreflang_count} variants (23+ expected)"
    WARN=$((WARN + 1))
  fi
  if [ "$es_hreflang_count" -ge 23 ]; then
    green "hreflang: ES has ${es_hreflang_count} variants (23+ expected)"
    PASS=$((PASS + 1))
  else
    yellow "hreflang: ES has only ${es_hreflang_count} variants (23+ expected)"
    WARN=$((WARN + 1))
  fi
}

# ─────────────────────────────────────────────────
# HELPER: Validate Open Graph tags
# ─────────────────────────────────────────────────
validate_opengraph() {
  local file="$1"
  local filepath="${PROJECT_DIR}/${file}"

  if [ ! -f "$filepath" ]; then return; fi

  echo ""
  echo "--- ${file}: Open Graph ---"

  local og_tags=("og:type" "og:title" "og:description" "og:url" "og:site_name" "og:locale" "og:image" "og:image:width" "og:image:height" "og:image:alt")

  for tag in "${og_tags[@]}"; do
    if grep -q "property=\"${tag}\"" "$filepath"; then
      green "${file}: has ${tag}"
      PASS=$((PASS + 1))
    else
      red "${file}: missing ${tag}"
      FAIL=$((FAIL + 1))
    fi
  done

  # og:locale:alternate
  alt_count=$(grep -c 'property="og:locale:alternate"' "$filepath" 2>/dev/null)
  if [ "$alt_count" -gt 0 ]; then
    green "${file}: has ${alt_count} og:locale:alternate"
    PASS=$((PASS + 1))
  else
    red "${file}: missing og:locale:alternate"
    FAIL=$((FAIL + 1))
  fi
}

# ─────────────────────────────────────────────────
# HELPER: Validate Twitter Card tags
# ─────────────────────────────────────────────────
validate_twitter() {
  local file="$1"
  local filepath="${PROJECT_DIR}/${file}"

  if [ ! -f "$filepath" ]; then return; fi

  echo ""
  echo "--- ${file}: Twitter Card ---"

  local tw_tags=("twitter:card" "twitter:title" "twitter:description" "twitter:image")

  for tag in "${tw_tags[@]}"; do
    if grep -q "name=\"${tag}\"" "$filepath"; then
      green "${file}: has ${tag}"
      PASS=$((PASS + 1))
    else
      red "${file}: missing ${tag}"
      FAIL=$((FAIL + 1))
    fi
  done

  # Verify card type is summary_large_image
  if grep -q 'name="twitter:card" content="summary_large_image"' "$filepath"; then
    green "${file}: twitter:card = summary_large_image"
    PASS=$((PASS + 1))
  else
    yellow "${file}: twitter:card should be summary_large_image"
    WARN=$((WARN + 1))
  fi
}

# ─────────────────────────────────────────────────
# HELPER: Validate JSON-LD structured data
# ─────────────────────────────────────────────────
validate_jsonld() {
  local file="$1"
  local filepath="${PROJECT_DIR}/${file}"

  if [ ! -f "$filepath" ]; then return; fi

  echo ""
  echo "--- ${file}: JSON-LD ---"

  # Check JSON-LD script tag exists
  if ! grep -q 'application/ld+json' "$filepath"; then
    red "${file}: no JSON-LD structured data"
    FAIL=$((FAIL + 1))
    return
  fi

  green "${file}: has JSON-LD block"
  PASS=$((PASS + 1))

  # Check for @graph (multiple entities)
  if grep -q '"@graph"' "$filepath"; then
    green "${file}: uses @graph (multi-entity)"
    PASS=$((PASS + 1))
  else
    yellow "${file}: no @graph — single entity only"
    WARN=$((WARN + 1))
  fi

  # Required entity types
  local entities=("WebPage" "TravelAgency" "TouristTrip" "Event" "FAQPage")

  for entity in "${entities[@]}"; do
    if grep -q "\"@type\": \"${entity}\"" "$filepath" || grep -q "\"@type\":\"${entity}\"" "$filepath"; then
      green "${file}: JSON-LD has ${entity}"
      PASS=$((PASS + 1))
    else
      red "${file}: JSON-LD missing ${entity}"
      FAIL=$((FAIL + 1))
    fi
  done

  # Check offers exist
  if grep -q '"@type": "Offer"' "$filepath" || grep -q '"@type":"Offer"' "$filepath"; then
    green "${file}: JSON-LD has Offer(s)"
    PASS=$((PASS + 1))
  else
    yellow "${file}: JSON-LD missing Offer data"
    WARN=$((WARN + 1))
  fi
}

# ─────────────────────────────────────────────────
# HELPER: Validate CSS/JS dependencies
# ─────────────────────────────────────────────────
validate_dependencies() {
  local file="$1"
  local filepath="${PROJECT_DIR}/${file}"

  if [ ! -f "$filepath" ]; then return; fi

  echo ""
  echo "--- ${file}: Dependencies ---"

  # style.css preload
  if grep -q 'rel="preload" href="style.css"' "$filepath" || grep -q 'href="style.css"' "$filepath"; then
    green "${file}: loads style.css"
    PASS=$((PASS + 1))
  else
    red "${file}: missing style.css"
    FAIL=$((FAIL + 1))
  fi

  # components.css async loading
  if grep -q 'components.css' "$filepath"; then
    green "${file}: loads components.css"
    PASS=$((PASS + 1))
  else
    yellow "${file}: missing components.css"
    WARN=$((WARN + 1))
  fi

  # noscript fallback for components.css
  if grep -q '<noscript>' "$filepath"; then
    green "${file}: has <noscript> CSS fallback"
    PASS=$((PASS + 1))
  else
    yellow "${file}: missing <noscript> CSS fallback"
    WARN=$((WARN + 1))
  fi

  # page-init script
  if grep -q 'page-init' "$filepath"; then
    green "${file}: loads page-init.js"
    PASS=$((PASS + 1))
  else
    yellow "${file}: missing page-init.js"
    WARN=$((WARN + 1))
  fi

  # navigation script
  if grep -q 'navigation' "$filepath"; then
    green "${file}: loads navigation.js"
    PASS=$((PASS + 1))
  else
    yellow "${file}: missing navigation.js"
    WARN=$((WARN + 1))
  fi

  # No render-blocking scripts (all should be defer or async)
  blocking_scripts=$(grep '<script ' "$filepath" | grep -v 'defer' | grep -v 'async' | grep -v 'application/ld+json' | grep -c 'src=' 2>/dev/null || echo "0")
  if [ "$blocking_scripts" -eq 0 ]; then
    green "${file}: no render-blocking scripts"
    PASS=$((PASS + 1))
  else
    red "${file}: ${blocking_scripts} render-blocking script(s)"
    FAIL=$((FAIL + 1))
  fi
}

# ─────────────────────────────────────────────────
# SINGLE PAGE MODE
# ─────────────────────────────────────────────────
if [ "$MODE" = "single" ]; then
  if [ -z "$SINGLE_FILE" ]; then
    red "Usage: bash scripts/verify-experience-seo.sh single <filepath>"
    exit 1
  fi
  echo "Validating single page: ${SINGLE_FILE}"
  validate_structure "$SINGLE_FILE"
  validate_meta "$SINGLE_FILE"
  validate_images "$SINGLE_FILE"
  validate_opengraph "$SINGLE_FILE"
  validate_twitter "$SINGLE_FILE"
  validate_jsonld "$SINGLE_FILE"
  validate_dependencies "$SINGLE_FILE"

  echo ""
  echo "=============================================="
  echo " SUMMARY (Single Page)"
  echo "=============================================="
  echo "  PASS:     ${PASS}"
  echo "  FAIL:     ${FAIL}"
  echo "  WARN:     ${WARN}"
  echo ""
  [ "$FAIL" -gt 0 ] && exit 1 || exit 0
fi

# ─────────────────────────────────────────────────
# 1. PAGE INVENTORY
# ─────────────────────────────────────────────────
echo "## 1. Page Inventory"
echo "----------------------------------------------"

echo ""
echo "City Pages (${#CITY_PAIRS[@]} pairs):"
for pair in "${CITY_PAIRS[@]}"; do
  IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"
  if [ -f "${PROJECT_DIR}/${en_file}" ]; then
    green "EN: ${en_file}"
    PASS=$((PASS + 1))
  else
    red "EN: ${en_file} — FILE MISSING"
    FAIL=$((FAIL + 1))
  fi
  if [ -f "${PROJECT_DIR}/${es_file}" ]; then
    green "ES: ${es_file}"
    PASS=$((PASS + 1))
  else
    red "ES: ${es_file} — FILE MISSING"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "Experience Pages (${#EXPERIENCE_PAIRS[@]} pairs):"
for pair in "${EXPERIENCE_PAIRS[@]}"; do
  IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"
  if [ -f "${PROJECT_DIR}/${en_file}" ]; then
    green "EN: ${en_file}"
    PASS=$((PASS + 1))
  else
    red "EN: ${en_file} — FILE MISSING"
    FAIL=$((FAIL + 1))
  fi
  if [ -f "${PROJECT_DIR}/${es_file}" ]; then
    green "ES: ${es_file}"
    PASS=$((PASS + 1))
  else
    red "ES: ${es_file} — FILE MISSING"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "Total: ${#ALL_PAIRS[@]} pairs (${#CITY_PAIRS[@]} city + ${#EXPERIENCE_PAIRS[@]} experience)"

# ─────────────────────────────────────────────────
# 2. HTML STRUCTURE VALIDATION
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 2. HTML Structure Validation"
echo "----------------------------------------------"

for pair in "${ALL_PAIRS[@]}"; do
  IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"
  validate_structure "$en_file"
  validate_structure "$es_file"
done

# ─────────────────────────────────────────────────
# 3. META TAGS VALIDATION
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 3. Meta Tags Validation"
echo "----------------------------------------------"

for pair in "${ALL_PAIRS[@]}"; do
  IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"
  validate_meta "$en_file"
  validate_meta "$es_file"
done

# ─────────────────────────────────────────────────
# 4. IMAGE PERFORMANCE
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 4. Image Performance"
echo "----------------------------------------------"

for pair in "${ALL_PAIRS[@]}"; do
  IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"
  validate_images "$en_file"
  validate_images "$es_file"
done

# ─────────────────────────────────────────────────
# 5. CANONICAL TAG VALIDATION
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 5. Canonical Tag Validation"
echo "----------------------------------------------"

for pair in "${ALL_PAIRS[@]}"; do
  IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"
  validate_canonical "$en_file" "$en_canon"
  validate_canonical "$es_file" "$es_canon"
done

# ─────────────────────────────────────────────────
# 6. HREFLANG PAIR VALIDATION
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 6. Hreflang Pair Validation"
echo "----------------------------------------------"

for pair in "${ALL_PAIRS[@]}"; do
  IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"
  echo ""
  echo "Pair: ${en_file} <-> ${es_file}"
  validate_hreflang "$en_file" "$es_file" "$en_canon" "$es_canon"
done

# ─────────────────────────────────────────────────
# 7. OPEN GRAPH VALIDATION
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 7. Open Graph Validation"
echo "----------------------------------------------"

for pair in "${ALL_PAIRS[@]}"; do
  IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"
  validate_opengraph "$en_file"
  validate_opengraph "$es_file"
done

# ─────────────────────────────────────────────────
# 8. TWITTER CARD VALIDATION
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 8. Twitter Card Validation"
echo "----------------------------------------------"

for pair in "${ALL_PAIRS[@]}"; do
  IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"
  validate_twitter "$en_file"
  validate_twitter "$es_file"
done

# ─────────────────────────────────────────────────
# 9. JSON-LD STRUCTURED DATA
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 9. JSON-LD Structured Data"
echo "----------------------------------------------"

for pair in "${ALL_PAIRS[@]}"; do
  IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"
  validate_jsonld "$en_file"
  validate_jsonld "$es_file"
done

# ─────────────────────────────────────────────────
# 10. CSS/JS DEPENDENCIES
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 10. CSS/JS Dependencies"
echo "----------------------------------------------"

for pair in "${ALL_PAIRS[@]}"; do
  IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"
  validate_dependencies "$en_file"
  validate_dependencies "$es_file"
done

# ─────────────────────────────────────────────────
# 11. SITEMAP CROSS-REFERENCE
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 11. Sitemap Cross-Reference"
echo "----------------------------------------------"

SITEMAP_FILE="${PROJECT_DIR}/sitemap.xml"

if [ -f "$SITEMAP_FILE" ]; then
  for pair in "${ALL_PAIRS[@]}"; do
    IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"

    if grep -q "${BASE_URL}${en_canon}" "$SITEMAP_FILE"; then
      green "Sitemap: ${en_canon}"
      PASS=$((PASS + 1))
    else
      yellow "Sitemap: ${en_canon} — not in sitemap.xml"
      WARN=$((WARN + 1))
    fi

    if grep -q "${BASE_URL}${es_canon}" "$SITEMAP_FILE"; then
      green "Sitemap: ${es_canon}"
      PASS=$((PASS + 1))
    else
      yellow "Sitemap: ${es_canon} — not in sitemap.xml"
      WARN=$((WARN + 1))
    fi
  done
else
  yellow "sitemap.xml not found — skipping sitemap checks"
  WARN=$((WARN + 1))
fi

# ─────────────────────────────────────────────────
# 12. NETLIFY.TOML REDIRECT COVERAGE
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 12. Netlify.toml Redirect Coverage"
echo "----------------------------------------------"

TOML_FILE="${PROJECT_DIR}/netlify.toml"

if [ -f "$TOML_FILE" ]; then
  for pair in "${ALL_PAIRS[@]}"; do
    IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"

    en_html_path="/${en_file}"
    if grep -q "from = \"${en_html_path}\"" "$TOML_FILE"; then
      green "Redirect: ${en_html_path} -> ${en_canon}"
      PASS=$((PASS + 1))
    else
      yellow "No redirect rule for ${en_html_path}"
      WARN=$((WARN + 1))
    fi

    es_html_path="/${es_file}"
    if grep -q "from = \"${es_html_path}\"" "$TOML_FILE"; then
      green "Redirect: ${es_html_path} -> ${es_canon}"
      PASS=$((PASS + 1))
    else
      yellow "No redirect rule for ${es_html_path}"
      WARN=$((WARN + 1))
    fi
  done
else
  red "netlify.toml not found"
  FAIL=$((FAIL + 1))
fi

# ─────────────────────────────────────────────────
# 13. LIVE URL TESTS (production mode only)
# ─────────────────────────────────────────────────
if [ "$MODE" = "production" ]; then
  echo ""
  echo ""
  echo "## 13. Live URL Tests"
  echo "----------------------------------------------"

  for pair in "${ALL_PAIRS[@]}"; do
    IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"

    response=$(curl --max-time 10 -s -o /dev/null -w "%{http_code}" "${BASE_URL}${en_canon}" 2>/dev/null)
    if [ "$response" = "200" ]; then
      green "${en_canon} -> 200"
      PASS=$((PASS + 1))
    else
      red "${en_canon} -> ${response}"
      FAIL=$((FAIL + 1))
    fi

    response=$(curl --max-time 10 -s -o /dev/null -w "%{http_code}" "${BASE_URL}${es_canon}" 2>/dev/null)
    if [ "$response" = "200" ]; then
      green "${es_canon} -> 200"
      PASS=$((PASS + 1))
    else
      red "${es_canon} -> ${response}"
      FAIL=$((FAIL + 1))
    fi
  done
else
  echo ""
  echo "## 13. Live URL Tests - SKIPPED (${MODE} mode)"
fi

# ─────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "=============================================="
echo " SUMMARY"
echo "=============================================="
echo ""
echo "  PASS:     ${PASS}"
echo "  FAIL:     ${FAIL}"
echo "  WARN:     ${WARN}"
echo ""

if [ "$FAIL" -eq 0 ] && [ "$WARN" -eq 0 ]; then
  green "All checks passed!"
elif [ "$FAIL" -eq 0 ]; then
  yellow "All critical checks passed (${WARN} warnings)"
else
  red "${FAIL} critical issue(s) need attention"
fi

echo ""
echo "=============================================="
echo " NEXT STEPS"
echo "=============================================="
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo "All pages are ready for production."
  echo ""
  echo "To validate a single new page:"
  echo "  bash scripts/verify-experience-seo.sh single NewCity2026.html"
else
  echo "Fix the failures above, then re-run:"
  echo "  bash scripts/verify-experience-seo.sh local"
fi

echo ""

# Exit code for CI/CD
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
