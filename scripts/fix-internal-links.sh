#!/bin/bash
# Internal Links Fix Script
# Finds and lists internal .html links that should be updated
# Usage: bash scripts/fix-internal-links.sh

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=========================================="
echo " Internal .html Links Report"
echo "=========================================="
echo ""
echo "Scanning for internal links using .html extensions..."
echo ""

found_any=false

for file in "${PROJECT_DIR}"/*.html; do
  if [ -f "$file" ]; then
    basename_file=$(basename "$file")
    # Extract internal .html links (excluding external http/https)
    links=$(grep -o 'href="[^"]*\.html"' "$file" | grep -v 'http' | sort | uniq)

    if [ -n "$links" ]; then
      found_any=true
      echo "File: $basename_file"
      echo "─────────────────────────────────────"

      while IFS= read -r link; do
        # Extract just the filename
        clean=$(echo "$link" | sed 's/href="//;s/"//')
        suggested=$(echo "$clean" | sed 's/\.html$//')
        echo "  Current:   $link"
        echo "  Suggested: href=\"$suggested\""
        echo ""
      done <<< "$links"

      echo ""
    fi
  fi
done

if [ "$found_any" = false ]; then
  echo "No internal .html links found!"
  echo "Your site uses extensionless URLs consistently."
else
  echo "=========================================="
  echo " RECOMMENDATIONS"
  echo "=========================================="
  echo ""
  echo "These internal .html links work (Netlify redirects them)"
  echo "but can cause 'Page with redirect' warnings in GSC."
  echo ""
  echo "To fix:"
  echo "  1. Update links to extensionless URLs"
  echo "  2. Test locally: links still work via Netlify Pretty URLs"
  echo "  3. Deploy and verify with: bash scripts/verify-seo-fixes.sh"
  echo ""
  echo "Example fix:"
  echo "  <a href=\"contact.html\"> -> <a href=\"contact\">"
  echo "  <a href=\"about-es.html\"> -> <a href=\"about-es\">"
  echo ""
fi
