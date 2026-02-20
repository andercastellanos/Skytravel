#!/bin/bash
# SEO Fixes Verification Script
# Tests redirects, canonical tags, hreflang tags, sitemap consistency
# Usage:
#   bash scripts/verify-seo-fixes.sh              # production mode (tests live URLs)
#   bash scripts/verify-seo-fixes.sh local        # local mode (skips live URL tests)
#   bash scripts/verify-seo-fixes.sh --help       # show help

# Show help
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  cat <<'EOF'
SEO Fixes Verification Script

USAGE:
  bash scripts/verify-seo-fixes.sh [MODE]

MODES:
  (none)       Production mode - tests live URLs on skytraveljm.com
  local        Local mode - skips live URL tests, validates local files only
  -h, --help   Show this help message

CHECKS PERFORMED:
  1. Live redirect tests (301 status codes) - production only
  1.5. Redirect loop detection - production only
  2. Canonical tag validation
  3. Hreflang tag consistency
  4. netlify.toml structure
  5. Sitemap URL consistency
  5.5. Internal link analysis

EXIT CODES:
  0 - All checks passed (warnings allowed)
  1 - One or more critical failures

EXAMPLES:
  # Before deployment - validate local files
  bash scripts/verify-seo-fixes.sh local

  # After deployment - full production test
  bash scripts/verify-seo-fixes.sh

  # Continuous Integration
  bash scripts/verify-seo-fixes.sh local && git push

EOF
  exit 0
fi

BASE_URL="https://www.skytraveljm.com"
MODE="${1:-production}"

# Color functions
green() { printf "\033[32m✅ %s\033[0m\n" "$1"; }
red()   { printf "\033[31m❌ %s\033[0m\n" "$1"; }
yellow(){ printf "\033[33m⚠️  %s\033[0m\n" "$1"; }
blue()  { printf "\033[34mℹ️  %s\033[0m\n" "$1"; }

# Counters
PASS=0
FAIL=0
WARN=0

# Check dependencies
if [ "$MODE" = "production" ] && ! command -v curl &> /dev/null; then
  red "ERROR: curl is not installed. Install with: brew install curl (macOS) or apt-get install curl (Linux)"
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -d "$PROJECT_DIR" ]; then
  red "ERROR: Could not determine project directory"
  exit 1
fi

if [ ! -f "${PROJECT_DIR}/netlify.toml" ]; then
  red "ERROR: netlify.toml not found at ${PROJECT_DIR}/netlify.toml"
  red "Are you running this script from the correct directory?"
  exit 1
fi

if [ ! -f "${PROJECT_DIR}/sitemap.xml" ]; then
  yellow "WARNING: sitemap.xml not found at ${PROJECT_DIR}/sitemap.xml"
  WARN=$((WARN + 1))
fi

echo "=============================================="
echo " SEO Fixes Verification Report"
echo " Mode: $(echo "$MODE" | tr '[:lower:]' '[:upper:]')"
echo " Generated: $(date '+%Y-%m-%d %H:%M')"
echo "=============================================="
echo ""

if [ "$MODE" = "local" ]; then
  blue "Running in LOCAL mode - skipping live URL tests"
  blue "Deploy to production and run without 'local' flag to test redirects"
  echo ""
fi

if [ "$MODE" = "production" ]; then
# ─────────────────────────────────────────────────
# 1. TEST LIVE REDIRECTS
# ─────────────────────────────────────────────────
echo "## 1. Redirect Tests (Production)"
echo "──────────────────────────────────────────────"

test_redirect() {
  local from="$1"
  local expected_to="$2"

  # Get HTTP status and Location header
  response=$(curl --max-time 10 -s -o /dev/null -w "%{http_code} %{redirect_url}" -L --max-redirs 0 "${BASE_URL}${from}" 2>/dev/null)
  status=$(echo "$response" | awk '{print $1}')
  location=$(echo "$response" | awk '{print $2}')

  if [ "$status" = "301" ]; then
    # Check if redirect goes to expected destination (compare against full URL)
    local expected_full="${BASE_URL}${expected_to}"
    if [ "$location" = "$expected_full" ] || [ "$location" = "${expected_full}/" ]; then
      green "${from} → 301 → ${expected_to} (OK)"
      PASS=$((PASS + 1))
    else
      red "${from} → 301 → ${location} (Expected: ${expected_to})"
      FAIL=$((FAIL + 1))
    fi
  elif [ "$status" = "200" ]; then
    yellow "${from} → 200 (No redirect, served directly)"
    WARN=$((WARN + 1))
  elif [ "$status" = "404" ]; then
    red "${from} → 404 (NOT FOUND)"
    FAIL=$((FAIL + 1))
  elif [ "$status" = "000" ]; then
    red "${from} → TIMEOUT (server did not respond within 10s)"
    FAIL=$((FAIL + 1))
  else
    red "${from} → ${status} (Unexpected status)"
    FAIL=$((FAIL + 1))
  fi
}

# GSC-reported failing URLs (critical)
echo ""
echo "### GSC Critical URLs"
test_redirect "/about-es.html" "/about-es"
test_redirect "/contact.html" "/contact"
test_redirect "/SantuariosMarianos.html" "/santuariosmarianos"

echo ""
echo "### Destination Pages (Capitalized)"
test_redirect "/Medjugorje.html" "/medjugorje"
test_redirect "/Medjugorje-es.html" "/medjugorje-es"
test_redirect "/Medjugorje2026.html" "/medjugorje2026"
test_redirect "/Medjugorje2026-es.html" "/medjugorje2026-es"
test_redirect "/Italy.html" "/italy"
test_redirect "/Italy-es.html" "/italy-es"
test_redirect "/TierraSanta2026.html" "/tierrasanta2026"
test_redirect "/TierraSanta2026-es.html" "/tierrasanta2026-es"
test_redirect "/SantuariosMarianos-es.html" "/santuariosmarianos-es"

echo ""
echo "### Core Pages"
test_redirect "/index.html" "/"
test_redirect "/index-es.html" "/index-es"
test_redirect "/experiences.html" "/experiences"
test_redirect "/experiences-es.html" "/experiences-es"

echo ""
echo "### Pages WITHOUT redirects in netlify.toml"
# These pages exist but have no redirect rules
for page in about about-es contact-es blog blog-es guidelines guidelines-es France France-es Mariana2026 Mariana2026-es peregrinacion-medjugorje-2026-2027 peregrinacion-medjugorje-2026-2027-es; do
  response=$(curl --max-time 10 -s -o /dev/null -w "%{http_code}" "${BASE_URL}/${page}.html" 2>/dev/null)
  if [ "$response" = "301" ]; then
    green "/${page}.html → 301 (has redirect)"
    PASS=$((PASS + 1))
  elif [ "$response" = "200" ]; then
    yellow "/${page}.html → 200 (NO REDIRECT - serves .html directly)"
    WARN=$((WARN + 1))
  elif [ "$response" = "000" ]; then
    red "/${page}.html → TIMEOUT"
    FAIL=$((FAIL + 1))
  else
    red "/${page}.html → ${response}"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "### Final destination loads (HTTP 200)"
for page in about about-es contact contact-es medjugorje medjugorje-es medjugorje2026 medjugorje2026-es tierrasanta2026 tierrasanta2026-es italy italy-es santuariosmarianos santuariosmarianos-es; do
  response=$(curl --max-time 10 -s -o /dev/null -w "%{http_code}" "${BASE_URL}/${page}" 2>/dev/null)
  if [ "$response" = "200" ]; then
    green "/${page} → 200 (OK)"
    PASS=$((PASS + 1))
  else
    red "/${page} → ${response} (FAILED)"
    FAIL=$((FAIL + 1))
  fi
done

# ─────────────────────────────────────────────────
# 1.5. REDIRECT LOOP DETECTION
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 1.5. Redirect Loop Detection"
echo "──────────────────────────────────────────────"
echo "Testing critical paths for redirect loops..."
echo ""

test_redirect_loop() {
  local url="$1"
  local label="$2"

  # Follow redirects but limit to 5 hops
  response=$(curl --max-time 10 -s -o /dev/null -w "%{http_code}" -L --max-redirs 5 "${BASE_URL}${url}" 2>/dev/null)

  if [ "$response" = "000" ] || [ -z "$response" ]; then
    red "${label}: Redirect loop or timeout detected!"
    FAIL=$((FAIL + 1))
  elif [ "$response" = "200" ]; then
    green "${label}: Resolves successfully (no loops)"
    PASS=$((PASS + 1))
  else
    yellow "${label}: ${response} (unusual status)"
    WARN=$((WARN + 1))
  fi
}

test_redirect_loop "/about-es" "About (Spanish)"
test_redirect_loop "/contact" "Contact (English)"
test_redirect_loop "/medjugorje" "Medjugorje"
test_redirect_loop "/medjugorje2026" "Medjugorje 2026"
test_redirect_loop "/tierrasanta2026" "Holy Land 2026"
test_redirect_loop "/santuariosmarianos" "Marian Sanctuaries"
test_redirect_loop "/italy" "Italy"
test_redirect_loop "/peregrinacion-medjugorje-2026-2027" "Ads Landing (EN)"
test_redirect_loop "/peregrinacion-medjugorje-2026-2027-es" "Ads Landing (ES)"

else
  echo "## 1. Redirect Tests - SKIPPED (local mode)"
  echo "## 1.5. Redirect Loop Detection - SKIPPED (local mode)"
  echo ""
fi

# ─────────────────────────────────────────────────
# 2. VALIDATE CANONICAL TAGS IN HTML FILES
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 2. Canonical Tag Validation"
echo "──────────────────────────────────────────────"

check_canonical() {
  local file="$1"
  local expected_canonical="$2"
  local filepath="${PROJECT_DIR}/${file}"

  if [ ! -f "$filepath" ]; then
    red "File not found: ${file}"
    FAIL=$((FAIL + 1))
    return
  fi

  echo ""
  echo "Checking: ${file}"

  # Extract canonical
  canonical=$(grep -o 'rel="canonical" href="[^"]*"' "$filepath" | sed 's/rel="canonical" href="//;s/"$//')

  if [ -z "$canonical" ]; then
    red "  No canonical tag found"
    FAIL=$((FAIL + 1))
    return
  fi

  # Check if canonical matches expected
  if [ "$canonical" = "${BASE_URL}${expected_canonical}" ]; then
    green "  Canonical: ${canonical}"
    PASS=$((PASS + 1))
  else
    red "  Canonical: ${canonical} (Expected: ${BASE_URL}${expected_canonical})"
    FAIL=$((FAIL + 1))
  fi

  # Check no .html extension
  if echo "$canonical" | grep -q '\.html'; then
    red "  Has .html extension!"
    FAIL=$((FAIL + 1))
  else
    green "  No .html extension"
    PASS=$((PASS + 1))
  fi

  # Check no trailing slash (except homepage)
  if echo "$canonical" | grep -q '[^/]/$'; then
    red "  Has trailing slash"
    FAIL=$((FAIL + 1))
  else
    green "  No trailing slash"
    PASS=$((PASS + 1))
  fi
}

check_canonical "about.html" "/about"
check_canonical "about-es.html" "/about-es"
check_canonical "contact.html" "/contact"
check_canonical "contact-es.html" "/contact-es"
check_canonical "Medjugorje.html" "/medjugorje"
check_canonical "Medjugorje-es.html" "/medjugorje-es"
check_canonical "Medjugorje2026.html" "/medjugorje2026"
check_canonical "Medjugorje2026-es.html" "/medjugorje2026-es"
check_canonical "SantuariosMarianos.html" "/santuariosmarianos"
check_canonical "SantuariosMarianos-es.html" "/santuariosmarianos-es"
check_canonical "TierraSanta2026.html" "/tierrasanta2026"
check_canonical "TierraSanta2026-es.html" "/tierrasanta2026-es"
check_canonical "Italy.html" "/italy"
check_canonical "Italy-es.html" "/italy-es"
check_canonical "France.html" "/france"
check_canonical "France-es.html" "/france-es"
check_canonical "Mariana2026.html" "/mariana2026"
check_canonical "Mariana2026-es.html" "/mariana2026-es"
check_canonical "blog.html" "/blog"
check_canonical "blog-es.html" "/blog-es"
check_canonical "guidelines.html" "/guidelines"
check_canonical "guidelines-es.html" "/guidelines-es"
check_canonical "peregrinacion-medjugorje-2026-2027.html" "/peregrinacion-medjugorje-2026-2027"
check_canonical "peregrinacion-medjugorje-2026-2027-es.html" "/peregrinacion-medjugorje-2026-2027-es"

# ─────────────────────────────────────────────────
# 3. VALIDATE HREFLANG CONSISTENCY
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 3. Hreflang Tag Validation"
echo "──────────────────────────────────────────────"

check_hreflang() {
  local en_file="$1"
  local es_file="$2"
  local en_canonical="$3"
  local es_canonical="$4"

  local en_path="${PROJECT_DIR}/${en_file}"
  local es_path="${PROJECT_DIR}/${es_file}"

  echo ""
  echo "Checking: ${en_file} ↔ ${es_file}"

  if [ ! -f "$en_path" ] || [ ! -f "$es_path" ]; then
    red "  File(s) not found"
    FAIL=$((FAIL + 1))
    return
  fi

  # EN page should have ES alternate
  en_has_es=$(grep -c "hreflang=\"es\" href=\"${BASE_URL}${es_canonical}\"" "$en_path" 2>/dev/null)
  if [ "$en_has_es" -gt 0 ]; then
    green "  EN page has ES alternate: ${es_canonical}"
    PASS=$((PASS + 1))
  else
    actual=$(grep 'hreflang="es"' "$en_path" | head -1)
    red "  EN page missing/wrong ES alternate (found: ${actual})"
    FAIL=$((FAIL + 1))
  fi

  # ES page should have EN alternate
  es_has_en=$(grep -c "hreflang=\"en\" href=\"${BASE_URL}${en_canonical}\"" "$es_path" 2>/dev/null)
  if [ "$es_has_en" -gt 0 ]; then
    green "  ES page has EN alternate: ${en_canonical}"
    PASS=$((PASS + 1))
  else
    actual=$(grep 'hreflang="en"' "$es_path" | head -1)
    red "  ES page missing/wrong EN alternate (found: ${actual})"
    FAIL=$((FAIL + 1))
  fi

  # Both should have x-default
  en_has_xdefault=$(grep -c 'hreflang="x-default"' "$en_path" 2>/dev/null)
  es_has_xdefault=$(grep -c 'hreflang="x-default"' "$es_path" 2>/dev/null)
  if [ "$en_has_xdefault" -gt 0 ] && [ "$es_has_xdefault" -gt 0 ]; then
    green "  Both have x-default"
    PASS=$((PASS + 1))
  else
    red "  Missing x-default (EN: ${en_has_xdefault}, ES: ${es_has_xdefault})"
    FAIL=$((FAIL + 1))
  fi

  # Check all hreflang URLs are extensionless
  en_html_hreflang=$(grep 'hreflang=' "$en_path" | grep -c '\.html')
  es_html_hreflang=$(grep 'hreflang=' "$es_path" | grep -c '\.html')
  if [ "$en_html_hreflang" -eq 0 ] && [ "$es_html_hreflang" -eq 0 ]; then
    green "  All hreflang URLs extensionless"
    PASS=$((PASS + 1))
  else
    red "  Some hreflang URLs have .html (EN: ${en_html_hreflang}, ES: ${es_html_hreflang})"
    FAIL=$((FAIL + 1))
  fi
}

check_hreflang "about.html" "about-es.html" "/about" "/about-es"
check_hreflang "contact.html" "contact-es.html" "/contact" "/contact-es"
check_hreflang "Medjugorje.html" "Medjugorje-es.html" "/medjugorje" "/medjugorje-es"
check_hreflang "Medjugorje2026.html" "Medjugorje2026-es.html" "/medjugorje2026" "/medjugorje2026-es"
check_hreflang "SantuariosMarianos.html" "SantuariosMarianos-es.html" "/santuariosmarianos" "/santuariosmarianos-es"
check_hreflang "TierraSanta2026.html" "TierraSanta2026-es.html" "/tierrasanta2026" "/tierrasanta2026-es"
check_hreflang "Italy.html" "Italy-es.html" "/italy" "/italy-es"
check_hreflang "France.html" "France-es.html" "/france" "/france-es"
check_hreflang "Mariana2026.html" "Mariana2026-es.html" "/mariana2026" "/mariana2026-es"
check_hreflang "blog.html" "blog-es.html" "/blog" "/blog-es"
check_hreflang "guidelines.html" "guidelines-es.html" "/guidelines" "/guidelines-es"
check_hreflang "peregrinacion-medjugorje-2026-2027.html" "peregrinacion-medjugorje-2026-2027-es.html" "/peregrinacion-medjugorje-2026-2027" "/peregrinacion-medjugorje-2026-2027-es"

# ─────────────────────────────────────────────────
# 4. VERIFY NETLIFY.TOML
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 4. netlify.toml Health"
echo "──────────────────────────────────────────────"

TOML_FILE="${PROJECT_DIR}/netlify.toml"

# Check all redirects have required fields
redirect_count=$(grep -c 'from = "' "$TOML_FILE")
status_count=$(grep -c 'status = 301' "$TOML_FILE")
force_count=$(grep -c 'force = true' "$TOML_FILE")

echo "Total redirect rules: ${redirect_count}"

if [ "$redirect_count" -eq "$status_count" ]; then
  green "All redirects have status = 301"
  PASS=$((PASS + 1))
else
  red "Mismatch: ${redirect_count} redirects but ${status_count} have status=301"
  FAIL=$((FAIL + 1))
fi

if [ "$redirect_count" -eq "$force_count" ]; then
  green "All redirects have force = true"
  PASS=$((PASS + 1))
else
  red "Mismatch: ${redirect_count} redirects but ${force_count} have force=true"
  FAIL=$((FAIL + 1))
fi

# Check for duplicates
dup_count=$(grep 'from = "' "$TOML_FILE" | sort | uniq -d | wc -l | tr -d ' ')
if [ "$dup_count" -eq 0 ]; then
  green "No duplicate redirect rules"
  PASS=$((PASS + 1))
else
  red "${dup_count} duplicate redirect rules found"
  FAIL=$((FAIL + 1))
fi

# Check coverage of key pages
echo ""
echo "### Redirect Coverage"
for page in about about-es contact contact-es blog blog-es guidelines guidelines-es France France-es Mariana2026 Mariana2026-es peregrinacion-medjugorje-2026-2027 peregrinacion-medjugorje-2026-2027-es; do
  if grep -q "from = \"/${page}.html\"" "$TOML_FILE" 2>/dev/null; then
    green "/${page}.html has redirect"
    PASS=$((PASS + 1))
  else
    yellow "/${page}.html — NO redirect rule in netlify.toml"
    WARN=$((WARN + 1))
  fi
done

# ─────────────────────────────────────────────────
# 5. CROSS-REFERENCE WITH SITEMAP
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 5. Sitemap Consistency"
echo "──────────────────────────────────────────────"

SITEMAP_FILE="${PROJECT_DIR}/sitemap.xml"

if [ -f "$SITEMAP_FILE" ]; then
  # Check for .html in sitemap URLs
  html_in_sitemap=$(grep '<loc>' "$SITEMAP_FILE" | grep -c '\.html')
  total_sitemap=$(grep -c '<loc>' "$SITEMAP_FILE")

  echo "Total URLs in sitemap: ${total_sitemap}"

  if [ "$html_in_sitemap" -eq 0 ]; then
    green "All sitemap <loc> URLs are extensionless"
    PASS=$((PASS + 1))
  else
    red "${html_in_sitemap} sitemap URLs still have .html extension:"
    grep '<loc>' "$SITEMAP_FILE" | grep '\.html' | sed 's/.*<loc>//;s/<\/loc>.*//' | while read -r url; do
      echo "    - ${url}"
    done
    FAIL=$((FAIL + 1))
  fi

  # Check .html in hreflang within sitemap
  html_in_sitemap_hreflang=$(grep 'xhtml:link' "$SITEMAP_FILE" | grep -c '\.html')
  if [ "$html_in_sitemap_hreflang" -eq 0 ]; then
    green "All sitemap hreflang URLs are extensionless"
    PASS=$((PASS + 1))
  else
    red "${html_in_sitemap_hreflang} sitemap hreflang URLs have .html extension"
    FAIL=$((FAIL + 1))
  fi
else
  yellow "Sitemap file not found - skipping sitemap checks"
fi

# ─────────────────────────────────────────────────
# 5.5. INTERNAL LINK ANALYSIS (PREVENT FUTURE ERRORS)
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "## 5.5. Internal Link Analysis"
echo "──────────────────────────────────────────────"
echo "Checking for internal links that use .html extensions..."
echo "(These can cause 'Page with redirect' errors in GSC)"
echo ""

html_links_count=0
html_links_files=()

for file in "${PROJECT_DIR}"/*.html; do
  if [ -f "$file" ]; then
    basename_file=$(basename "$file")
    # Look for href= with .html but exclude external links (http/https)
    count=$(grep -o 'href="[^"]*\.html"' "$file" | grep -v 'http' | wc -l | tr -d ' ')

    if [ "$count" -gt 0 ]; then
      html_links_count=$((html_links_count + count))
      html_links_files+=("$basename_file")
      yellow "  ${basename_file}: ${count} internal .html link(s) found"

      # Show first 3 examples
      grep -o 'href="[^"]*\.html"' "$file" | grep -v 'http' | head -3 | while read -r link; do
        echo "    └─ ${link}"
      done
    fi
  fi
done

echo ""
if [ "$html_links_count" -eq 0 ]; then
  green "No internal .html links found - excellent!"
  PASS=$((PASS + 1))
elif [ "$html_links_count" -lt 20 ]; then
  yellow "${html_links_count} internal .html links found in ${#html_links_files[@]} file(s)"
  echo "   These work (Netlify redirects) but may cause GSC warnings"
  WARN=$((WARN + 1))
else
  yellow "${html_links_count} internal .html links found in ${#html_links_files[@]} file(s)"
  echo "   Recommendation: Update internal links to extensionless URLs"
  echo "   This prevents 'Page with redirect' errors in Google Search Console"
  WARN=$((WARN + 1))
fi

# Offer to generate fix script
if [ "$html_links_count" -gt 0 ]; then
  echo ""
  echo "  To see a detailed report, run:"
  echo "  bash scripts/fix-internal-links.sh"
  echo ""
fi

# ─────────────────────────────────────────────────
# 6. SUMMARY & RECOMMENDATIONS
# ─────────────────────────────────────────────────
echo ""
echo ""
echo "=============================================="
echo " SUMMARY"
echo "=============================================="
echo ""
echo "  ✅ Passed:   ${PASS}"
echo "  ❌ Failed:   ${FAIL}"
echo "  ⚠️  Warnings: ${WARN}"
echo ""

if [ "$FAIL" -eq 0 ] && [ "$WARN" -eq 0 ]; then
  green "Perfect! All checks passed with no warnings."
  STATUS="excellent"
elif [ "$FAIL" -eq 0 ]; then
  yellow "All critical checks passed (${WARN} non-critical warnings)"
  STATUS="good"
else
  red "${FAIL} critical issue(s) need immediate attention."
  STATUS="needs-work"
fi

echo ""
echo "=============================================="
echo " NEXT STEPS"
echo "=============================================="
echo ""

if [ "$MODE" = "local" ]; then
  if [ "$STATUS" = "excellent" ] || [ "$STATUS" = "good" ]; then
    echo "Ready to deploy!"
    echo ""
    echo "1. Push changes: git push origin main"
    echo "2. Wait for Netlify deployment (~2 min)"
    echo "3. Run: bash scripts/verify-seo-fixes.sh"
    echo "4. Request validation in Google Search Console"
  else
    echo "Fix issues before deploying:"
    echo ""
    echo "1. Address all failures above"
    echo "2. Re-run: bash scripts/verify-seo-fixes.sh local"
    echo "3. Once all clear, push to production"
  fi
else
  if [ "$STATUS" = "excellent" ] || [ "$STATUS" = "good" ]; then
    echo "Production site is healthy!"
    echo ""
    echo "1. Go to Google Search Console"
    echo "2. Navigate to Pages > Indexing issues"
    echo "3. Click 'Validate Fix' for any errors"
    echo "4. Monitor for 7-14 days"
    echo ""
    echo "Expected: GSC errors should clear within 1-2 weeks"
  else
    echo "Production issues detected:"
    echo ""
    echo "1. Fix all failures immediately"
    echo "2. Deploy fixes to production"
    echo "3. Re-run this script to verify"
  fi
fi

echo ""
echo "=============================================="
echo " PREVENTING FUTURE GSC ERRORS"
echo "=============================================="
echo ""
echo "Why 'Page with redirect' errors happen:"
echo "  - Google finds .html URLs through internal links"
echo "  - External backlinks point to .html versions"
echo "  - Old sitemap versions cached by Google"
echo ""
echo "Prevention checklist:"
echo "  - Use extensionless URLs in all internal links"
echo "  - Keep sitemap.xml updated with extensionless URLs only"
echo "  - Monitor GSC weekly for new indexing issues"
echo "  - Run this script before every deployment"
echo ""

if [ "$html_links_count" -gt 0 ]; then
  echo "ACTION NEEDED: You have ${html_links_count} internal .html links"
  echo "   These can trigger 'Page with redirect' warnings in GSC"
  echo ""
  echo "   To fix: Update internal links to extensionless URLs"
  echo "   Example: href=\"contact.html\" -> href=\"contact\""
  echo ""
fi

echo "For more help, run: bash scripts/verify-seo-fixes.sh --help"
echo ""

# Exit code for CI/CD integration
if [ "$FAIL" -gt 0 ]; then
  exit 1
else
  exit 0
fi
