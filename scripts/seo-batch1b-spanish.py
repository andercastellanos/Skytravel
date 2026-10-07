#!/usr/bin/env python3
"""
SEO Batch 1b — Spanish-first.

 1. hreflang x-default -> the Spanish URL on every bilingual pair (EN and ES pages).
 2. Spanish pages link to Spanish pages: nav/logo/content links that pointed to the
    English version of a page now point to its Spanish version (language switchers untouched).
 3. Missing H1s on Spanish (and matching English) pages.
 4. /index-es: Spanish-first title, meta, H1.
Run from repo root, then re-run scripts/seo-batch1.py to regenerate the sitemap.
"""
import re, glob

SITE = "https://www.skytraveljm.com"
UTILITY = {"recibo.html", "estado.html", "empleados.html", "crear-destino.html", "crear-experiencia.html",
           "cumpleanos.html", "pagar.html", "pay.html", "galeria-viaje.html", "trip-gallery.html"}
files = sorted(f for f in glob.glob("**/*.html", recursive=True)
               if not f.startswith(("components/", "node_modules")) and f not in UTILITY)
read = lambda p: open(p, encoding="utf-8").read()
def write(p, s): open(p, "w", encoding="utf-8").write(s)
ALT = re.compile(r'<link rel="alternate" hreflang="(en|es|x-default)" href="([^"]+)"\s*/?>')

# ---------------------------------------------------------------- 1. x-default -> Spanish
print("1. x-default -> Spanish URL")
pairs = {}  # English path -> Spanish path
for f in files:
    s = read(f)
    alts = {k: v for k, v in ALT.findall(s)}
    if "en" in alts and "es" in alts:
        pairs[alts["en"].replace(SITE, "") or "/"] = alts["es"].replace(SITE, "")
        es_url = alts["es"]
        if alts.get("x-default") != es_url:
            if "x-default" in alts:
                s = re.sub(r'(<link rel="alternate" hreflang="x-default" href=")[^"]+(")', r"\g<1>" + es_url + r"\2", s)
            else:
                s = re.sub(r'(<link rel="alternate" hreflang="es" href="[^"]+"\s*/?>)',
                           r'\1\n    <link rel="alternate" hreflang="x-default" href="' + es_url + '">', s, count=1)
            write(f, s); print(f"  - {f}: x-default -> {es_url.replace(SITE, '')}")

# ---------------------------------------------------------------- 2. Spanish pages link to Spanish pages
print("2. Spanish pages: internal links to English pages -> Spanish equivalents")
def is_spanish(f, s):
    m = re.search(r"<html[^>]*lang=\"([^\"]*)\"", s[:800])
    return bool(m and m.group(1).startswith("es"))

def norm(h):
    p = h.replace(SITE, "")
    frag = ""
    if "#" in p: p, frag = p.split("#", 1); frag = "#" + frag
    if p.startswith("../"): p = "/" + re.sub(r"^(\.\./)+", "", p)
    if not p.startswith("/"): p = "/" + p
    p = p.rstrip("/") or "/"
    if p.endswith(".html"): p = p[:-5]
    return p, frag

A_TAG = re.compile(r"<a\b[^>]*>.*?</a>", re.S)
for f in files:
    s = read(f)
    if not is_spanish(f, s): continue
    head, body = s.split("</head>", 1) if "</head>" in s else ("", s)
    # protect language switchers
    protected = []
    def protect(m): protected.append(m.group(0)); return f"\x00{len(protected)-1}\x00"
    body2 = re.sub(r'<div class="language-switcher".*?</div>', protect, body, flags=re.S)
    n = 0
    def fix_a(m):
        nonlocal_n = 0
        tag = m.group(0)
        if "lang" in tag.split(">")[0] or re.search(r">\s*(EN|English)\s*<", tag): return tag
        hm = re.search(r'href="([^"]+)"', tag)
        if not hm: return tag
        h = hm.group(1)
        if h.startswith(("mailto:", "tel:", "sms:", "#", "javascript:")) or (h.startswith("http") and SITE not in h): return tag
        p, frag = norm(h)
        if p in pairs and pairs[p] != p:
            fix_a.count += 1
            return tag.replace(f'href="{h}"', f'href="{pairs[p]}{frag}"', 1)
        return tag
    fix_a.count = 0
    body2 = A_TAG.sub(fix_a, body2)
    body2 = re.sub(r"\x00(\d+)\x00", lambda m: protected[int(m.group(1))], body2)
    if fix_a.count:
        write(f, head + "</head>" + body2 if head else body2)
        print(f"  - {f}: {fix_a.count} link(s)")

# ---------------------------------------------------------------- 3. missing H1s
print("3. missing H1s")
ABOUT = {
    "about-es.html": ("<h1>Sobre Sky Travel J&amp;M: peregrinaciones católicas desde Miami</h1>",
                      "<p>Agencia de viajes católica en Miami desde 2015, acreditada por IATA e IATAN.</p>"),
    "about.html": ("<h1>About Sky Travel J&amp;M: Catholic Pilgrimages from Miami</h1>",
                   "<p>A Catholic travel agency in Miami since 2015, accredited by IATA and IATAN.</p>"),
}
for f, (h1, p) in ABOUT.items():
    s = read(f)
    s2, n = re.subn(r"<h1>\s*</h1>(\s*)<p>\s*</p>", h1 + r"\1" + p, s, count=1)
    if n: write(f, s2); print(f"  - {f}: H1 + intro filled")
    else: print(f"  ! {f}: empty H1 pattern not found")

def text(x): return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", x)).strip()
def tokens(x): return {w for w in re.findall(r"\w+", x.lower()) if len(w) > 3}
for f in files:
    if not f.startswith("blog/"): continue
    s = read(f)
    h1s = re.findall(r"<h1[^>]*>(.*?)</h1>", s, re.S)
    if h1s and text(h1s[0]): continue
    title = text(re.search(r"<title>(.*?)</title>", s, re.S).group(1)).split("|")[0].strip()
    body = s.split("</head>", 1)[-1]
    h2 = re.search(r"<h2([^>]*)>(.*?)</h2>", body, re.S)
    if h2 and len(tokens(text(h2.group(2))) & tokens(title)) >= max(2, len(tokens(title)) // 2):
        old = h2.group(0)
        s = s.replace(old, f"<h1{h2.group(1)}>{h2.group(2)}</h1>", 1)
        write(f, s); print(f"  - {f}: title H2 promoted to H1 ({text(h2.group(2))[:60]})")
        continue
    # otherwise: title shown in another element (e.g. a hero div) -> make that element an H1
    m = re.search(r'<(div|p|span)([^>]*class="[^"]*(?:title|hero|post-title|blog-title)[^"]*"[^>]*)>(.*?)</\1>', body, re.S)
    if m and len(tokens(text(m.group(3))) & tokens(title)) >= 2:
        old = m.group(0)
        s = s.replace(old, f"<h1{m.group(2)}>{m.group(3)}</h1>", 1)
        write(f, s); print(f"  - {f}: title element <{m.group(1)}> -> H1 ({text(m.group(3))[:60]})")
    else:
        print(f"  ! {f}: no title element found; left for manual review (title: {title[:60]})")

# ---------------------------------------------------------------- 4. /index-es Spanish-first
print("4. /index-es title, meta, H1")
f = "index-es.html"; s = read(f)
T = "Peregrinaciones Católicas desde Miami y Bogotá | Sky Travel J&amp;M"
D = ("Agencia de peregrinaciones católicas en Miami. Peregrinaciones a Medjugorje, Tierra Santa, "
     "Fátima y Lourdes con Misa diaria y acompañamiento espiritual. Salidas desde Miami y Bogotá.")
for pat, rep, label in [
    (r"<title>.*?</title>", f"<title>{T}</title>", "title"),
    (r'(<meta name="description"\s+content=")[^"]*(")', r"\g<1>" + D + r"\2", "meta description"),
    (r'(<meta property="og:title"\s+content=")[^"]*(")', r"\g<1>" + T + r"\2", "og:title"),
    (r'(<meta name="twitter:title"\s+content=")[^"]*(")', r"\g<1>" + T + r"\2", "twitter:title"),
    (r"<h1>Descubre peregrinaciones católicas que transforman tu fe con salidas desde Miami, Bogotá y otras ciudades\.</h1>",
     "<h1>Peregrinaciones católicas desde Miami y Bogotá</h1>", "H1"),
]:
    s, n = re.subn(pat, rep, s, count=1, flags=re.S)
    print(f"  {'-' if n else '!'} {label} ({n})")
write(f, s)
