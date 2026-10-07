#!/usr/bin/env python3
"""
SEO Batch 1 — Medjugorje consolidation + structured-data cleanup.

Run from the repo root:  python3 scripts/seo-batch1.py
Idempotent where practical; prints a report of every change.

What it does
 1. netlify.toml: 301 /medjugorje2026(-es) and the old ads landing pages to
    /medjugorje(-es); retargets every rule that pointed at them (no chains);
    adds X-Robots-Tag noindex for /components/*.
 2. Deletes the four consolidated page files.
 3. Rewrites every internal link / JSON-LD URL to the final URL.
 4. /medjugorje-es and /medjugorje: data-backed title, meta, H1; next departure
    only; apparition wording aligned with the 2024 Vatican note; hreflang es/en/x-default.
 5. JSON-LD cleanup sitewide: AggregateRating/Review removed, $0 offers removed,
    phone and street address corrected, fake SearchAction removed, hidden About FAQ removed.
 6. Small verified defects (broken links, duplicate titles, missing H1, € meta).
 7. Internal links from the new blog posts to the Medjugorje page.
 8. Regenerates sitemap.xml from the pages' own canonical + hreflang tags.
"""
import json, os, re, subprocess, sys, glob, datetime

ROOT = os.getcwd()
TODAY = "2026-10-06"
SITE = "https://www.skytraveljm.com"
OFFICIAL_PHONE = "+1-305-645-2625"
report = []

def log(msg): report.append(msg)

def read(p):
    with open(p, encoding="utf-8") as f: return f.read()

def write(p, s):
    with open(p, "w", encoding="utf-8") as f: f.write(s)

def sub_exact(s, old, new, path, label, count_expected=None):
    n = s.count(old)
    if n == 0:
        log(f"  ! NOT FOUND in {path}: {label}")
        return s
    if count_expected is not None and n != count_expected:
        log(f"  ! {path}: {label} found {n}x (expected {count_expected})")
    log(f"  - {path}: {label} ({n}x)")
    return s.replace(old, new)

def sub_re(s, pattern, repl, path, label, flags=re.S):
    new, n = re.subn(pattern, repl, s, flags=flags)
    log(f"  {'-' if n else '!'} {path}: {label} ({n}x)")
    return new

# ---------------------------------------------------------------- 1. netlify.toml
log("1. netlify.toml")
toml = read("netlify.toml")
FINAL = {
    "/medjugorje2026": "/medjugorje",
    "/medjugorje2026-es": "/medjugorje-es",
    "/peregrinacion-medjugorje-2026-2027": "/medjugorje",
    "/peregrinacion-medjugorje-2026-2027-es": "/medjugorje-es",
}
block_re = re.compile(
    r'\[\[redirects\]\]\s*\n(?:\s*\n)?(\s*)from = "([^"]+)"\s*\n\s*to = "([^"]+)"\s*\n\s*status = (\d+)(\s*\n\s*force = (?:true|false))?')

def fix_block(m):
    indent, frm, to, status, force = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
    if frm in ("/medjugorje2026", "/medjugorje2026-es") and status == "200":
        log(f"  - rewrite {frm} (200) -> 301 {FINAL[frm]}")
        return f'[[redirects]]\n{indent}from = "{frm}"\n{indent}to = "{FINAL[frm]}"\n{indent}status = 301\n{indent}force = true'
    if to in FINAL:
        log(f"  - retarget {frm}: {to} -> {FINAL[to]}")
        return f'[[redirects]]\n{indent}from = "{frm}"\n{indent}to = "{FINAL[to]}"\n{indent}status = {status}' + (force or "")
    return m.group(0)

toml = block_re.sub(fix_block, toml)

if 'from = "/peregrinacion-medjugorje-2026-2027"\n' not in toml:
    ads_rules = '''
# ========================================================================
# RETIRED GOOGLE ADS LANDING PAGES (consolidated into /medjugorje, Sep 2026)
# ========================================================================

[[redirects]]
  from = "/peregrinacion-medjugorje-2026-2027"
  to = "/medjugorje"
  status = 301
  force = true

[[redirects]]
  from = "/peregrinacion-medjugorje-2026-2027-es"
  to = "/medjugorje-es"
  status = 301
  force = true
'''
    toml = toml.rstrip() + "\n" + ads_rules
    log("  - added 301s for the two ads landing pages")

if 'for = "/components/*"' not in toml:
    hdr = '''
# Component fragments are fetched by JS; never index them.
[[headers]]
  for = "/components/*"
  [headers.values]
    X-Robots-Tag = "noindex"
'''
    toml = toml.replace("# Hidden receipt page redirect", hdr.strip() + "\n\n# Hidden receipt page redirect", 1)
    log("  - added X-Robots-Tag noindex header for /components/*")
write("netlify.toml", toml)

# ---------------------------------------------------------------- 2. delete consolidated files
log("2. delete consolidated page files")
for f in ["peregrinaciones-2026/Medjugorje2026.html", "peregrinaciones-2026/Medjugorje2026-es.html",
          "peregrinacion-medjugorje-2026-2027.html", "peregrinacion-medjugorje-2026-2027-es.html"]:
    if os.path.exists(f):
        subprocess.run(["git", "rm", "-q", f], check=True)
        log(f"  - git rm {f}")

# ---------------------------------------------------------------- helpers over all pages
def html_files():
    out = []
    for f in glob.glob("**/*.html", recursive=True):
        if f.startswith(("node_modules", ".git")): continue
        out.append(f)
    return sorted(out)

# ---------------------------------------------------------------- 3. internal links
log("3. internal links and JSON-LD URLs -> final URLs")
link_re = re.compile(r'href="((?:https://www\.skytraveljm\.com)?(?:\.\./)*/?)(medjugorje2026|peregrinacion-medjugorje-2026-2027)(-es)?(\.html)?(#[^"]*)?"')
abs_re = re.compile(r'https://www\.skytraveljm\.com/(medjugorje2026|peregrinacion-medjugorje-2026-2027)(-es)?(?=["#?\s<\\])')
for f in html_files():
    s = read(f)
    def lr(m):
        es = m.group(3) or ""
        return f'href="/medjugorje{es}{m.group(5) or ""}"'
    s2, n1 = link_re.subn(lr, s)
    s2, n2 = abs_re.subn(lambda m: f"{SITE}/medjugorje{m.group(2) or ''}", s2)
    if n1 or n2:
        write(f, s2); log(f"  - {f}: {n1} href(s), {n2} absolute URL(s)")

# ---------------------------------------------------------------- 4. Medjugorje pillar pages
log("4. Medjugorje pillar pages")
ES, EN = "peregrinaciones-2025/Medjugorje-es.html", "peregrinaciones-2025/Medjugorje.html"
s = read(ES)
s = sub_re(s, r"<title>.*?</title>", "<title>Peregrinación a Medjugorje desde Miami y Bogotá | Sky Travel J&amp;M</title>", ES, "title")
s = sub_re(s, r'(<meta name="description"\s+content=")[^"]*(")',
           r"\1Peregrinación católica a Medjugorje con Misa diaria, guía bilingüe y acompañamiento espiritual. Salidas cada año desde Miami (Estados Unidos) y Bogotá (Colombia).\2", ES, "meta description")
s = sub_re(s, r'(<meta property="og:title" content=")[^"]*(")', r"\1Peregrinación a Medjugorje desde Miami y Bogotá\2", ES, "og:title")
s = sub_re(s, r'(<meta name="twitter:title" content=")[^"]*(")', r"\1Peregrinación a Medjugorje desde Miami y Bogotá\2", ES, "twitter:title")
s = sub_exact(s, "<h1>Peregrinación a Medjugorje (Católica)</h1>", "<h1>Peregrinación a Medjugorje desde Miami y Bogotá</h1>", ES, "H1")
s = sub_re(s, r"<h3>29 de marzo al 6 de abril de 2026</h3>\s*<h3>17 al 25 de septiembre de 2026</h3>\s*<h3>17 al 25 de octubre de 2026</h3>",
           "<h3>Próxima salida: 17 al 25 de octubre de 2026</h3>", ES, "past departures removed")
s = sub_exact(s, "Colina sagrada donde Nuestra Señora se apareció por primera vez a los videntes católicos en 1981",
              "Colina donde los videntes reportaron la primera aparición de Nuestra Señora en 1981", ES, "doctrine: place schema")
s = sub_exact(s, "donde la Virgen María se apareció por primera vez en 1981 y continúa apareciendo.",
              "donde, desde 1981, seis videntes reportan apariciones de la Virgen María.", ES, "doctrine: FAQ schema")
s = sub_re(s, r"donde la Virgen María se apareció por primera vez el 24 de junio de 1981 y continúa\s+apareciendo a videntes católicos\.",
           "donde, desde el 24 de junio de 1981, seis videntes reportan apariciones de la Virgen María. En septiembre de 2024, el Dicasterio para la Doctrina de la Fe otorgó el nihil obstat a la experiencia espiritual de Medjugorje, sin declarar sobrenaturales las apariciones.",
           ES, "doctrine: intro + 2024 note")
s = sub_re(s, r"al lugar sagrado donde Nuestra Señora continúa\s+apareciendo\.", "al santuario mariano de la Reina de la Paz.", ES, "doctrine: subtitle")
s = sub_re(s, r"Sube la colina sagrada donde Nuestra Señora se apareció por primera vez a los\s+videntes en 1981\.",
           "Sube la colina donde los videntes reportaron la primera aparición de Nuestra Señora en 1981.", ES, "doctrine: tab 1")
s = sub_re(s, r"Este es el lugar exacto donde la Virgen María se apareció por primera vez a seis\s+jóvenes videntes el 25 de junio de 1981\.",
           "Este es el lugar donde seis jóvenes videntes reportaron haber visto a la Virgen María el 25 de junio de 1981.", ES, "doctrine: tab 2")
write(ES, s)

s = read(EN)
s = sub_re(s, r"<title>.*?</title>", "<title>Medjugorje Pilgrimage from Miami &amp; Bogotá | Sky Travel J&amp;M</title>", EN, "title")
s = sub_re(s, r'(<meta name="description" content=")[^"]*(")',
           r"\1Catholic pilgrimage to Medjugorje with daily Mass, a bilingual guide and spiritual accompaniment. Departures every year from Miami (United States) and Bogotá (Colombia).\2", EN, "meta description")
s = sub_re(s, r'(<meta property="og:title" content=")[^"]*(")', r"\1Medjugorje Pilgrimage from Miami &amp; Bogotá\2", EN, "og:title")
s = sub_re(s, r'(<meta name="twitter:title" content=")[^"]*(")', r"\1Medjugorje Pilgrimage from Miami &amp; Bogotá\2", EN, "twitter:title")
s = sub_exact(s, "<h1>Medjugorje Pilgrimage (Catholic)</h1>", "<h1>Medjugorje Pilgrimage from Miami and Bogotá</h1>", EN, "H1")
s = sub_re(s, r"<h3>March 29 to April 6, 2026</h3>\s*<h3>September 17 to 25, 2026</h3>\s*<h3>October 17 to 25, 2026</h3>",
           "<h3>Next departure: October 17 to 25, 2026</h3>", EN, "past departures removed")
s = sub_exact(s, "Sacred hill where Our Lady first appeared to Catholic visionaries in 1981",
              "Hill where the visionaries reported Our Lady's first apparition in 1981", EN, "doctrine: place schema")
s = sub_exact(s, "where the Virgin Mary first appeared in 1981 and continues to appear.",
              "where, since 1981, six visionaries have reported apparitions of the Virgin Mary.", EN, "doctrine: FAQ schema")
s = sub_exact(s, "where the Virgin Mary first appeared on June 24, 1981 and continues to appear to Catholic visionaries.",
              "where, since June 24, 1981, six visionaries have reported apparitions of the Virgin Mary. In September 2024 the Vatican's Dicastery for the Doctrine of the Faith granted a nihil obstat to the spiritual experience of Medjugorje, without declaring the apparitions supernatural.",
              EN, "doctrine: intro + 2024 note")
s = sub_exact(s, "to the sacred place where Our Lady continues to appear.", "to the Marian shrine of the Queen of Peace.", EN, "doctrine: subtitle")
s = sub_exact(s, "Climb the sacred hill where Our Lady first appeared to the visionaries in 1981.",
              "Climb the hill where the visionaries reported Our Lady's first apparition in 1981.", EN, "doctrine: tab 1")
s = sub_exact(s, "This is the exact location where the Virgin Mary first appeared to six young visionaries on June 25, 1981.",
              "This is where six young visionaries reported seeing the Virgin Mary on June 25, 1981.", EN, "doctrine: tab 2")
s = sub_exact(s, "where the Virgin first appeared in 1981", "where the visionaries reported the first apparition in 1981", EN, "doctrine: FAQ answer")
write(EN, s)

# ---------------------------------------------------------------- hreflang: drop redundant es-XX tags
log("   hreflang: keep es / en / x-default only")
for f in html_files():
    s = read(f)
    s2, n = re.subn(r'[ \t]*<link rel="alternate" hreflang="es-[A-Z]{2}"[^>]*>\r?\n', "", s)
    if n: write(f, s2); log(f"  - {f}: removed {n} regional es-XX tags")

# ---------------------------------------------------------------- 5. JSON-LD cleanup
log("5. JSON-LD cleanup")
LD_RE = re.compile(r'(<script type="application/ld\+json">)(.*?)(</script>)', re.S)
BAD_PHONE = re.compile(r"\+?1?[-. ]?\(?786\)?[-. ]?290[-. ]?9114")
BAD_STREETS = {"Miami Metro Area", "Área Metropolitana de Miami"}
GOOD_ADDRESS = {"@type": "PostalAddress", "streetAddress": "1000 Brickell Ave Ste 715",
                "addressLocality": "Miami", "addressRegion": "FL", "postalCode": "33131", "addressCountry": "US"}

def clean(node, stats):
    if isinstance(node, dict):
        for k in ("aggregateRating", "review"):
            if k in node: del node[k]; stats[k] = stats.get(k, 0) + 1
        if isinstance(node.get("potentialAction"), dict) and node["potentialAction"].get("@type") == "SearchAction":
            del node["potentialAction"]; stats["searchaction"] = stats.get("searchaction", 0) + 1
        if isinstance(node.get("telephone"), str) and BAD_PHONE.search(node["telephone"]):
            node["telephone"] = OFFICIAL_PHONE; stats["phone"] = stats.get("phone", 0) + 1
        addr = node.get("address")
        if isinstance(addr, dict) and addr.get("streetAddress") in BAD_STREETS:
            node["address"] = dict(GOOD_ADDRESS); stats["address"] = stats.get("address", 0) + 1
        if isinstance(node.get("offers"), list):
            before = len(node["offers"])
            node["offers"] = [o for o in node["offers"] if not (isinstance(o, dict) and str(o.get("price")) in ("0", "0.0", "0.00"))]
            if len(node["offers"]) != before: stats["offer0"] = stats.get("offer0", 0) + before - len(node["offers"])
        for v in list(node.values()): clean(v, stats)
    elif isinstance(node, list):
        keep = []
        for v in node:
            if isinstance(v, dict) and v.get("@type") in ("AggregateRating", "Review"):
                stats["typed"] = stats.get("typed", 0) + 1; continue
            clean(v, stats); keep.append(v)
        node[:] = keep

bad_json = []
for f in html_files():
    s = read(f)
    def repl(m):
        raw = m.group(2)
        try:
            data = json.loads(raw)
        except Exception:
            bad_json.append(f); return m.group(0)
        if f in ("about.html", "about-es.html") and isinstance(data, dict) and data.get("@type") == "FAQPage":
            log(f"  - {f}: removed hidden FAQPage block"); return "<!--removed-hidden-faq-->"
        stats = {}
        clean(data, stats)
        if not stats: return m.group(0)
        log(f"  - {f}: {stats}")
        body = json.dumps(data, ensure_ascii=False, indent=2)
        body = body.replace("</", "<\\/")
        return f"{m.group(1)}\n{body}\n    {m.group(3)}"
    s2 = LD_RE.sub(repl, s)
    s2 = re.sub(r'[ \t]*<!-- FAQ Structured Data \((?:SEO METADATA - NOT VISIBLE ON PAGE|METADATOS SEO - NO VISIBLE EN LA PÁGINA)\) -->\s*<!--removed-hidden-faq-->\r?\n?', "", s2)
    if s2 != s: write(f, s2)
if bad_json: log(f"  ! JSON-LD not parseable (left untouched): {sorted(set(bad_json))}")

# ---------------------------------------------------------------- 6. small verified defects
log("6. small fixes")
for f in ["peregrinaciones-2026/peregrinacion-medjugorje-roma-es.html", "peregrinaciones-2026/peregrinacion-medjugorje-roma.html"]:
    s = read(f); write(f, sub_exact(s, "€2,285", "$4,100", f, "meta price € -> $4,100 (as in commit 060cd0e)"))
f = "blog/crecer-luchar-por-hijos.html"; write(f, sub_exact(read(f), '"/blog/grow-fight-for-children"', '"/blog/grow-fight-your-children"', f, "broken link"))
f = "blog/catholic-pilgrimage.html"; write(f, sub_re(read(f), r'href="([^"]*)/testimony/testimonies"', r'href="\1/testimony/testimonials"', f, "broken link"))
f = "blog/the-faith-of-parents-who-do-not-give-up.html"
write(f, sub_exact(read(f), "<title>The Best Gift We Can Give Our Children: Freedom</title>", "<title>The Faith of Parents Who Never Give Up | Sky Travel Blog</title>", f, "duplicate title"))
f = "experiences/medjugorje2026.html"; write(f, sub_exact(read(f), "Holy Week 2026 2026", "Holy Week 2026", f, "duplicated year"))
f = "peregrinaciones-2026/SantuariosMarianos-es.html"
write(f, sub_exact(read(f), "<h2>Peregrinación Mariana y Pasos de San Pablo: Fátima - Lourdes - Atenas y Crucero Islas Griegas</h2>",
                   "<h1>Santuarios Marianos: Fátima, Lourdes y Pasos de San Pablo con Crucero por las Islas Griegas</h1>", f, "missing H1"))
f = "peregrinaciones-2026/SantuariosMarianos.html"
write(f, sub_exact(read(f), "<h2>Marian Pilgrimage & Steps of St. Paul: Fatima - Lourdes - Athens & Greek Islands Cruise</h2>",
                   "<h1>Marian Shrines: Fatima, Lourdes and the Steps of St. Paul with a Greek Islands Cruise</h1>", f, "missing H1"))

# ---------------------------------------------------------------- 7. blog -> Medjugorje links
log("7. blog posts -> /medjugorje(-es)")
LINKS = {
    "blog/guia-primera-peregrinacion-catolica.html": '<p>Si está preparando su primera peregrinación, un buen lugar para empezar es Medjugorje: conozca nuestra <a href="/medjugorje-es">peregrinación a Medjugorje con Misa diaria y acompañamiento espiritual</a>.</p>',
    "blog/first-catholic-pilgrimage-guide.html": '<p>If you are preparing for your first pilgrimage, Medjugorje is a good place to start: see our <a href="/medjugorje">Medjugorje pilgrimage with daily Mass and spiritual accompaniment</a>.</p>',
    "blog/por-que-acompanamiento-sacerdote-peregrinacion.html": '<p>Así vivimos este acompañamiento en nuestra <a href="/medjugorje-es">peregrinación a Medjugorje</a>, con Misa diaria durante todo el viaje.</p>',
    "blog/why-priest-accompaniment-pilgrimage.html": '<p>This is how we live that accompaniment on our <a href="/medjugorje">Medjugorje pilgrimage</a>, with daily Mass throughout the trip.</p>',
}
for f, para in LINKS.items():
    s = read(f)
    if para in s: continue
    i = s.find('<section class="faq-section"')
    j = s.rfind("</p>", 0, i)
    if i == -1 or j == -1: log(f"  ! {f}: insertion point not found"); continue
    s = s[:j + 4] + "\n            " + para + s[j + 4:]
    write(f, s); log(f"  - {f}: added contextual link")

# ---------------------------------------------------------------- 8. sitemap
log("8. sitemap.xml regenerated from page tags")
toml = read("netlify.toml")
rewrites = {to.lstrip("/"): frm for frm, to, st in re.findall(r'from = "([^"]+)"\s*\n\s*to = "([^"]+)"\s*\n\s*status = (\d+)', toml) if st == "200"}
changed_files = set(subprocess.run(["git", "diff", "--name-only"], capture_output=True, text=True).stdout.split())
def served(f):
    if f in rewrites: return rewrites[f]
    if f.startswith(("peregrinaciones-", "components/")): return None
    if f == "index.html": return "/"
    return "/" + f[:-5]
entries = {}
for f in html_files():
    path = served(f)
    if not path: continue
    s = read(f)
    robots = re.search(r'<meta\s+name="robots"\s+content="([^"]*)"', s, re.I)
    if robots and "noindex" in robots.group(1).lower(): continue
    can = re.search(r'<link\s+rel="canonical"\s+href="([^"]+)"', s)
    if not can: continue
    canon = can.group(1)
    if canon.rstrip("/") != (SITE + path).rstrip("/"): continue
    alts = {k: v for k, v in re.findall(r'<link rel="alternate" hreflang="(en|es|x-default)" href="([^"]+)"', s)}
    if f in changed_files: lm = TODAY
    else:
        lm = subprocess.run(["git", "log", "-1", "--format=%cs", "--", f], capture_output=True, text=True).stdout.strip() or TODAY
    entries[canon] = (lm, alts)
out = ['<?xml version="1.0" encoding="UTF-8"?>',
       '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
for loc in sorted(entries, key=lambda u: (u != SITE + "/", u)):
    lm, alts = entries[loc]
    out.append("  <url>")
    out.append(f"    <loc>{loc}</loc>")
    out.append(f"    <lastmod>{lm}</lastmod>")
    for lang in ("es", "en", "x-default"):
        if lang in alts and alts[lang] in entries:
            out.append(f'    <xhtml:link rel="alternate" hreflang="{lang}" href="{alts[lang]}"/>')
    out.append("  </url>")
out.append("</urlset>")
write("sitemap.xml", "\n".join(out) + "\n")
log(f"  - {len(entries)} URLs written")

print("\n".join(report))
