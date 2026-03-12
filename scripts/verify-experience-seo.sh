#!/bin/bash
# Experience Pages SEO & Structure Validation Script
# Validates: HTML structure, canonical tags, hreflang pairs, inline CSS removal,
#            first-slide performance, sitemap presence, netlify.toml redirects
#
# Usage:
#   bash scripts/verify-experience-seo.sh              # validate all experience pages
#   bash scripts/verify-experience-seo.sh local        # local-only (skip live URL tests)
#   bash scripts/verify-experience-seo.sh single FILE  # validate a single page
#   bash scripts/verify-experience-seo.sh --help       # show help

# Show help
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  cat <<'EOF'
Experience Pages SEO & Structure Validation Script

USAGE:
  bash scripts/verify-experience-seo.sh [MODE] [FILE]

MODES:
  (none)        Validate all experience pages + live URL tests
  local         Validate all experience pages (skip live URL tests)
  single FILE   Validate a single page (e.g., experiences/medjugorje2024.html)
  -h, --help    Show this help message

CHECKS PERFORMED:
  1. HTML structure (.destination-header pattern)
  2. No legacy elements (.page-header, .slideshow-container, .slide-caption)
  3. No conflicting inline CSS
  4. First slide performance (loading="eager", fetchpriority="high")
  5. Canonical tag validation
  6. Hreflang pair consistency (EN <-> ES)
  7. Page inventory (EN/ES pairs exist)
  8. Sitemap cross-reference
  9. Netlify.toml redirect coverage
  10. Live URL tests (production mode only)

EXIT CODES:
  0 - All checks passed (warnings allowed)
  1 - One or more critical failures

EXAMPLES:
  # Validate all after refactoring
  bash scripts/verify-experience-seo.sh local

  # Validate a newly generated page
  bash scripts/verify-experience-seo.sh single experiences/new-destination.html

  # Full production test
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

echo "=============================================="
echo " Experience Pages SEO & Structure Report"
echo " Mode: $(echo "$MODE" | tr '[:lower:]' '[:upper:]')"
echo " Generated: $(date '+%Y-%m-%d %H:%M')"
echo "=============================================="
echo ""

# ─────────────────────────────────────────────────
# HELPER: Validate a single HTML file structure
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

  # 1. Check .destination-header exists
  if grep -q 'class="destination-header"' "$filepath"; then
    green "${file}: has .destination-header"
    PASS=$((PASS + 1))
  else
    red "${file}: missing .destination-header"
    FAIL=$((FAIL + 1))
  fi

  # 2. Check .slideshow inside destination-header
  if grep -q 'class="slideshow"' "$filepath"; then
    green "${file}: has .slideshow"
    PASS=$((PASS + 1))
  else
    red "${file}: missing .slideshow"
    FAIL=$((FAIL + 1))
  fi

  # 3. Check .header-content > .header-text exists
  if grep -q 'class="header-text"' "$filepath"; then
    green "${file}: has .header-text"
    PASS=$((PASS + 1))
  else
    red "${file}: missing .header-text (should be inside .header-content)"
    FAIL=$((FAIL + 1))
  fi

  # 4. Check NO legacy .page-header
  if grep -q 'class="page-header"' "$filepath"; then
    red "${file}: still has legacy .page-header"
    FAIL=$((FAIL + 1))
  else
    green "${file}: no legacy .page-header"
    PASS=$((PASS + 1))
  fi

  # 5. Check NO .slideshow-container
  if grep -q 'class="slideshow-container"' "$filepath"; then
    red "${file}: still has .slideshow-container"
    FAIL=$((FAIL + 1))
  else
    green "${file}: no .slideshow-container"
    PASS=$((PASS + 1))
  fi

  # 6. Check NO .slide-caption
  if grep -q 'class="slide-caption"' "$filepath"; then
    red "${file}: still has .slide-caption elements"
    FAIL=$((FAIL + 1))
  else
    green "${file}: no .slide-caption"
    PASS=$((PASS + 1))
  fi

  # 7. Check first slide has loading="eager" and fetchpriority="high"
  first_slide_img=$(grep -A2 'class="slide"' "$filepath" | grep '<img' | head -1)
  if echo "$first_slide_img" | grep -q 'loading="eager"'; then
    green "${file}: first slide has loading=\"eager\""
    PASS=$((PASS + 1))
  else
    red "${file}: first slide missing loading=\"eager\""
    FAIL=$((FAIL + 1))
  fi

  if echo "$first_slide_img" | grep -q 'fetchpriority="high"'; then
    green "${file}: first slide has fetchpriority=\"high\""
    PASS=$((PASS + 1))
  else
    red "${file}: first slide missing fetchpriority=\"high\""
    FAIL=$((FAIL + 1))
  fi

  # 8. Check no conflicting inline CSS
  if grep -q '\.slideshow-container' "$filepath" | grep -v '^--'; then
    red "${file}: inline CSS still references .slideshow-container"
    FAIL=$((FAIL + 1))
  elif grep -q '\.page-header' "$filepath" | grep -v '^--'; then
    red "${file}: inline CSS still references .page-header"
    FAIL=$((FAIL + 1))
  else
    green "${file}: no conflicting inline CSS"
    PASS=$((PASS + 1))
  fi

  # 9. Check .image-thumbnails exists
  if grep -q 'class="image-thumbnails"' "$filepath"; then
    green "${file}: has .image-thumbnails"
    PASS=$((PASS + 1))
  else
    yellow "${file}: no .image-thumbnails (may be intentional)"
    WARN=$((WARN + 1))
  fi

  # 10. Check FOUC prevention inline style exists
  if grep -q '\.slideshow \.slide:first-child' "$filepath"; then
    green "${file}: has FOUC prevention CSS"
    PASS=$((PASS + 1))
  else
    yellow "${file}: missing FOUC prevention inline CSS"
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
# HELPER: Validate hreflang pair
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
    green "hreflang: EN(${en_file}) -> ES(${es_canonical})"
    PASS=$((PASS + 1))
  else
    red "hreflang: EN(${en_file}) missing ES alternate"
    FAIL=$((FAIL + 1))
  fi

  # ES should reference EN
  if grep -q "hreflang=\"en\" href=\"${BASE_URL}${en_canonical}\"" "$es_path"; then
    green "hreflang: ES(${es_file}) -> EN(${en_canonical})"
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

  # Check extensionless hreflang URLs
  en_html=$(grep 'hreflang=' "$en_path" | grep -c '\.html')
  es_html=$(grep 'hreflang=' "$es_path" | grep -c '\.html')
  if [ "$en_html" -eq 0 ] && [ "$es_html" -eq 0 ]; then
    green "hreflang: all URLs extensionless"
    PASS=$((PASS + 1))
  else
    red "hreflang: some URLs have .html (EN: ${en_html}, ES: ${es_html})"
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
echo "Total pairs: ${#EXPERIENCE_PAIRS[@]}"

# ─────────────────────────────────────────────────
# 2. HTML STRUCTURE VALIDATION
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 2. HTML Structure Validation"
echo "----------------------------------------------"

for pair in "${EXPERIENCE_PAIRS[@]}"; do
  IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"
  validate_structure "$en_file"
  validate_structure "$es_file"
done

# ─────────────────────────────────────────────────
# 3. CANONICAL TAG VALIDATION
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 3. Canonical Tag Validation"
echo "----------------------------------------------"

for pair in "${EXPERIENCE_PAIRS[@]}"; do
  IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"
  validate_canonical "$en_file" "$en_canon"
  validate_canonical "$es_file" "$es_canon"
done

# ─────────────────────────────────────────────────
# 4. HREFLANG PAIR VALIDATION
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 4. Hreflang Pair Validation"
echo "----------------------------------------------"

for pair in "${EXPERIENCE_PAIRS[@]}"; do
  IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"
  echo ""
  echo "Pair: ${en_file} <-> ${es_file}"
  validate_hreflang "$en_file" "$es_file" "$en_canon" "$es_canon"
done

# ─────────────────────────────────────────────────
# 5. SITEMAP CROSS-REFERENCE
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 5. Sitemap Cross-Reference"
echo "----------------------------------------------"

SITEMAP_FILE="${PROJECT_DIR}/sitemap.xml"

if [ -f "$SITEMAP_FILE" ]; then
  for pair in "${EXPERIENCE_PAIRS[@]}"; do
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
# 6. NETLIFY.TOML REDIRECT COVERAGE
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 6. Netlify.toml Redirect Coverage"
echo "----------------------------------------------"

TOML_FILE="${PROJECT_DIR}/netlify.toml"

if [ -f "$TOML_FILE" ]; then
  for pair in "${EXPERIENCE_PAIRS[@]}"; do
    IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"

    # Check EN .html redirect
    en_html_path="/${en_file}"
    if grep -q "from = \"${en_html_path}\"" "$TOML_FILE"; then
      green "Redirect: ${en_html_path} -> ${en_canon}"
      PASS=$((PASS + 1))
    else
      yellow "No redirect rule for ${en_html_path}"
      WARN=$((WARN + 1))
    fi

    # Check ES .html redirect
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
# 7. LIVE URL TESTS (production mode only)
# ─────────────────────────────────────────────────
if [ "$MODE" = "production" ]; then
  echo ""
  echo ""
  echo "## 7. Live URL Tests"
  echo "----------------------------------------------"

  for pair in "${EXPERIENCE_PAIRS[@]}"; do
    IFS='|' read -r en_file en_canon es_file es_canon <<< "$pair"

    # Test EN canonical URL returns 200
    response=$(curl --max-time 10 -s -o /dev/null -w "%{http_code}" "${BASE_URL}${en_canon}" 2>/dev/null)
    if [ "$response" = "200" ]; then
      green "${en_canon} -> 200"
      PASS=$((PASS + 1))
    else
      red "${en_canon} -> ${response}"
      FAIL=$((FAIL + 1))
    fi

    # Test ES canonical URL returns 200
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
  echo "## 7. Live URL Tests - SKIPPED (${MODE} mode)"
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
  echo "Experience pages are ready for production."
  echo ""
  echo "Also run the site-wide SEO check:"
  echo "  bash scripts/verify-seo-fixes.sh local"
else
  echo "Fix the failures above, then re-run:"
  echo "  bash scripts/verify-experience-seo.sh local"
fi

echo ""

# Exit code for CI/CD
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
