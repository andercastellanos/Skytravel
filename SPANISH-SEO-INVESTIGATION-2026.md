# Sky Travel J&M — Spanish SEO Investigation (August 2026)

Interactive version: https://claude.ai/code/artifact/597725f4-de92-4ea0-b866-3fab72d16ae2

**Scope.** Research only — no website files were modified. English pages were consulted only to confirm hreflang relationships and to determine which language's file actually contains a given bug; every recommendation below concerns the Spanish-language URLs only.

**Headline finding.** Sky Travel J&M already has near-complete bilingual parity — all 30 Spanish pages found have a confirmed English counterpart via hreflang, and Spanish content is often *deeper* than its English counterpart (Medjugorje-es: 3,084 words vs. Medjugorje: 2,841). The problem isn't missing Spanish content — it's that several Spanish pages compete with each other for the same keyword, one has a bare technical bug (missing canonical), and the market's #1 trust signal in Spanish (sacerdote/priest accompaniment) is underused on the current highest-value pages.

## Fase 1 — Inventario de la Web en Español

**Cobertura bilingüe:** 30 páginas en español confirmadas, cada una con contraparte en inglés vía hreflang — 16 páginas raíz, 13 galerías en `/es/experiences/`, 10 entradas de blog (mezcladas sin sufijo `-es` dentro de `/blog/`), 3 páginas de testimonios/formularios. No hay huecos de traducción en las páginas comerciales principales.

**Páginas comerciales principales:**

| URL en español | Contraparte EN | H1 actual | Canonical | Palabras |
|---|---|---|---|---|
| `/index-es` | `/` | "Descubre peregrinaciones católicas que transforman tu fe" | ✓ | 228 |
| `/medjugorje-es` | `/medjugorje` (legado) | "Peregrinación a Medjugorje (Católica)" | ✓ | 3,084 |
| `/medjugorje2026-es` | `/medjugorje2026` (actual) | "Peregrinación a Medjugorje 2026 – Semana Santa" | ✓ | 1,411 |
| `/peregrinacion-medjugorje-2026-2027-es` | `/peregrinacion-medjugorje-2026-2027` (Ads) | "Peregrinación a Medjugorje 2026 - 2027" | ✓ | 1,492 |
| `/peregrinacion-medjugorje-roma-es` | `/peregrinacion-medjugorje-roma` | "Peregrinación a Medjugorje, Roma y Asís 2026" | **falta** | 1,968 |
| `/tierrasanta2026-es` | `/tierrasanta2026` | "…Viaje de Fe de 18 Días" | ✓ | 3,008 |
| `/peregrinacion-tierrasanta-2027-es` | `/peregrinacion-tierrasanta-2027` | Mismo patrón, 2027 | ✓ | 3,200 |
| `/santuariosmarianos-es` | `/santuariosmarianos` | **ninguno** | ✓ | 1,400 |
| `/mariana2026-es` | `/mariana2026` | "Peregrinación Mariana 2026" | ✓ | 2,755 |
| `/france-es` | `/france` | "Peregrinación a Francia – Tierra de Gracia" | ✓ | 1,736 |
| `/italy-es` | `/italy` | "Peregrinación de la Esperanza" (fechada Jubileo 2025) | ✓ | 1,162 |

**Páginas de soporte:** `/about-es` (H1 vacío, independiente del bug en inglés), `/contact-es` (contenido real inyectado por JS, 45 palabras estáticas), `/experiences-es` (correcta — la versión EN tiene el bug de idioma, no esta), `/blog-es` (índice correcto), `/guidelines-es` (huérfana, cero enlaces entrantes), `/testimony/testimonios` y `/testimony/enviar-testimonio` (fuera del sitemap).

**Hallazgos técnicos (lado español, verificados en código):**

1. **CRÍTICO — Cuatro URLs compiten por "peregrinación a Medjugorje":** `/medjugorje-es` (legado, 26 menciones de "sacerdote", la página de mayor confianza del sitio), `/medjugorje2026-es` (actual, apenas 1,411 palabras), `/peregrinacion-medjugorje-2026-2027-es` (Ads, indexable), `/peregrinacion-medjugorje-roma-es` (combo). `/index-es` enlaza tanto a `/medjugorje-es` como a `/medjugorje2026-es`, repartiendo autoridad entre ambas.
2. **CRÍTICO — `/peregrinacion-medjugorje-roma-es` no tiene etiqueta canonical.** Su contraparte en inglés sí la tiene — bug propio de este archivo. La misma página también tiene título ("$4,100 Todo Incluido") y meta descripción ("Desde €2,285") con precio/moneda inconsistentes, de forma independiente al bug equivalente en inglés.
3. **ALTO — Conflicto de x-default entre sitemap.xml y la página en vivo** para el par Medjugorje legado: el sitemap dice que el x-default es la versión en inglés; la propia página `medjugorje-es.html` declara en su `<head>` que su x-default es ella misma.
4. **MEDIO — Implementación de hreflang inconsistente:** algunas páginas declaran 20 variantes regionales (es-US, es-CO, es-MX...); otras solo `es` genérico. No es un error, pero revela decisiones página por página sin política de sitio.
5. **MEDIO — Cobertura incompleta del sitemap:** faltan `/france-es`, `/peregrinacion-medjugorje-roma-es`, `/guidelines-es`, `/testimony/testimonios`, `/testimony/enviar-testimonio`, y 11 de 13 galerías en `/es/experiences/`.

**Lo que ya funciona (no tocar):** hreflang correctamente recíproco en todas las páginas revisadas; redacción nativa en español, no traducción literal; WhatsApp con mensaje pre-escrito natural en español; contenido en español igual o más profundo que su par en inglés.

## Fase 2 — Investigación de Keywords en Español

**Patrón validado más importante:** el acompañamiento sacerdotal ("peregrinación con sacerdote") es el trust signal dominante del mercado hispanohablante — usado explícitamente por Neptuno, Halcón Viajes y Galasam (20,000+ peregrinos desde 1995, acreditación IATA). Las páginas actuales más importantes de Sky Travel casi no lo mencionan.

**Otros patrones validados:** calendario litúrgico como modificador de búsqueda ("Cuaresma 2026", "Semana Santa 2026" — Sky Travel ya usa "Semana Santa" bien, "Cuaresma" es un hueco real); ciudad/país de origen nombrado explícitamente ("desde Bogotá", "desde el Aeropuerto El Dorado" — Sky Travel dice "Sur América" de forma genérica); costo con cifra real (rango de mercado: $1,574–$6,290 USD según duración e inclusiones); nomenclatura de rutas establecida ("Ruta de San Pablo", "Ruta del Padre Pío", "Santuarios Marianos").

**Por origen geográfico:** Miami/Florida — casi sin competencia comercial en español, solo resultados institucionales. Colombia — mercado con competencia real y establecida desde Bogotá; Sky Travel ya opera ahí, solo necesita reforzar la mención. Latinoamérica en general — sin patrones distintos a Colombia encontrados; tratar como una audiencia, no fragmentar por país.

**Sobre geo-páginas:** ninguna keyword geográfica por sí sola justifica una URL nueva — el criterio es reforzar contenido en las páginas de producto existentes, no crear páginas doorway.

## Fase 3 — SERP y Competencia en Español

| Competidor | Posicionamiento | Ventaja de Sky Travel |
|---|---|---|
| Caminos de Gracia (caminosdegracia.com) | "USA · español", el competidor más comparable encontrado | Sky Travel tiene base bilingüe real, oficina en Miami, IATA — no evidenciado en los resultados de Caminos de Gracia |
| Galasam / peregrinaciones.com.ec (Ecuador) | IATA, 20,000+ peregrinos desde 1995, sacerdote permanente | Credenciales similares en Sky Travel, pero no repetidas en páginas de producto en español |
| Peregrinación Católica (México) | 30+ años, coordina para residentes de Miami sin tener oficina ahí | Sky Travel sí tiene oficina real en Miami — ventaja no comunicada con fuerza hoy |
| Gente Mayorista, Abctur, Verne Trip (Colombia) | Salida directa desde Bogotá/El Dorado | Sky Travel compite en confianza de marca EE.UU., no en precio local |
| Peregrinaciones.com, Haya, Éxodo, Peregrino.travel (España) | 40+ años, alta autoridad de dominio | Ninguno está construido para el comprador bilingüe de Miami/EE.UU./Colombia |

**Hallazgo clave:** en tres búsquedas dedicadas a "Miami + peregrinación católica + español", ninguna agencia de peregrinaciones con base en Miami apareció de forma consistente — los resultados relevantes fueron casi todos institucionales (Arquidiócesis, directorios de iglesias). Esta ausencia de competencia comercial directa es la oportunidad individual más clara de la investigación.

## Fase 4 — Mapa de Keywords a Páginas Existentes (resumen — tabla completa en el artefacto)

- **`/medjugorje2026-es`** → keyword primaria "peregrinación a Medjugorje 2026 / Semana Santa Medjugorje". Vacíos: solo 1,411 palabras, casi sin mención de "sacerdote", sin Bogotá/Colombia explícitos. Acción: **Expandir** (absorber contenido de `/medjugorje-es`), luego consolidar.
- **`/medjugorje-es`** (legado) → **Consolidar**: fusionar su contenido de confianza (26 menciones de "sacerdote") hacia `/medjugorje2026-es`, luego redirigir. No es un simple 301 — es rescatar el ángulo de confianza más fuerte del sitio antes de archivarlo.
- **`/santuariosmarianos-es`** → única página (junto con `/mariana2026-es`) que toca Fátima o Lourdes; sin H1 ni FAQ schema. Acción: **Optimizar** primero.
- **`/tierrasanta2026-es`** → la página más fuerte del sitio en español. Acción: **Mantener**, solo reforzar "sacerdote" y ciudades de salida.
- **`/peregrinacion-medjugorje-roma-es`** → itinerario genuinamente distinto. Acción: **Optimizar** (canonical, precio/moneda, sitemap).
- **`/peregrinacion-medjugorje-2026-2027-es`** → landing de Ads indexable organicamente. Acción: **Evaluar noindex** tras verificar campañas activas.
- **`/about-es`** → H1 vacío pero ya tiene menciones de licencia/IATA que faltan en páginas de producto. Acción: **Optimizar** primero, luego replicar ese contenido de confianza.
- **`/guidelines-es`** → huérfana. Acción: **Optimizar + enlazar** desde cada página de destino.

## Fase 5 — Páginas Genuinamente Faltantes

Después de mapear las 30 páginas existentes, la mayoría de las intenciones de búsqueda del brief ya tienen una página que puede ganarlas con optimización — no con una URL nueva ("desde Miami", "desde Colombia", "agencia católica Miami" → todas resueltas optimizando `/index-es`, `/about-es` o la página de producto correspondiente).

**Solo dos intenciones están genuinamente descubiertas:**
1. **Viajes religiosos para grupos parroquiales** — página nueva justificada. Ningún producto actual está construido para un sacerdote o coordinador de parroquia organizando un grupo. Recomendado: `/peregrinaciones-para-parroquias-es`, sin contraparte en inglés por ahora (decisión de negocio separada, fuera de este alcance).
2. **Peregrinaciones católicas con sacerdote** — no como página separada, sino como ángulo de contenido/FAQ reforzado en todas las páginas de producto existentes.

## Fase 6 — Estrategia de Contenido en Español (primeros 6 meses)

| Mes | Artículo | Keyword | Página que apoya | Prioridad |
|---|---|---|---|---|
| 1 | ¿Cuánto Cuesta una Peregrinación a Medjugorje o Tierra Santa? | cuánto cuesta una peregrinación | /medjugorje2026-es, /tierrasanta2026-es | Crítica |
| 1 | Peregrinar con un Sacerdote: Por Qué Importa el Acompañamiento Espiritual | peregrinación con sacerdote | Todas las páginas de producto | Crítica |
| 2 | Cuaresma vs. Semana Santa en Medjugorje: ¿Cuándo Viajar? | Cuaresma Medjugorje | /medjugorje2026-es | Alta |
| 2 | Fátima vs. Lourdes: Guía para tu Primera Peregrinación Mariana | Fátima vs Lourdes | /mariana2026-es, /santuariosmarianos-es | Alta |
| 3 | Peregrinar desde Colombia: Documentos, Visas y Qué Esperar | peregrinación desde Colombia requisitos | /medjugorje2026-es, /tierrasanta2026-es | Alta — ángulo exclusivo LatAm |
| 3 | Guía de Preparación para tu Primera Peregrinación Católica | primera peregrinación católica guía | Reutilizar /guidelines-es | Alta |
| 4 | Cómo Organizar una Peregrinación para tu Parroquia | peregrinación para parroquias | Nueva página de grupos | Alta |
| 5 | ¿Es Segura Medjugorje? Lo Que Debes Saber Antes de Viajar | es segura Medjugorje | /medjugorje2026-es | Media |
| 6 | Qué Incluye una Peregrinación Todo Incluido con Sky Travel | peregrinación todo incluido qué incluye | Todas | Media |

**Clusters:** (1) Medjugorje en español — página + costo + Cuaresma/Semana Santa + seguridad. (2) Peregrinar desde Latinoamérica — documentos, visas, Bogotá — ángulo que el inglés no necesita. (3) Grupos parroquiales y sacerdotes.

## Fase 7 — SEO Local en Español

Contenido y publicaciones en español separadas en Google Business Profile (no asumir traducción automática); solicitud activa de reseñas en español; citas locales con parroquias hispanas identificadas (San Patricio, Inmaculada Concepción, San Agustín, Miami) y el Ministerio Hispano de la Arquidiócesis de Miami (activo — "Peregrinos de la Esperanza", 300 peregrinos de St. Michael the Archangel a La Ermita en 2025). Búsquedas objetivo ("peregrinaciones católicas Miami", "agencia de viajes católica Miami" en español) hoy dominadas por resultados institucionales, no comerciales — oportunidad validada, no hipotética.

## Fase 8 — Plan de Acción Priorizado

**Primeros 7 días:** agregar canonical faltante y corregir precio/moneda en `/peregrinacion-medjugorje-roma-es` · agregar H1 a `/santuariosmarianos-es` y llenar el H1 vacío de `/about-es` · agregar las 5 URLs faltantes al sitemap · resolver el conflicto de x-default en `medjugorje-es`.

**Primeros 30 días:** fusionar el contenido de confianza de `/medjugorje-es` hacia `/medjugorje2026-es` y luego redirigir · agregar mención explícita de Bogotá/Colombia y Miami en las páginas principales · reforzar "sacerdote/guía espiritual" en FAQ de cada página de producto · enlazar `/guidelines-es` desde cada destino · publicar los primeros 2 artículos del calendario.

**Días 31–90:** construir la página de peregrinaciones para parroquias/grupos · publicar meses 2–3 del calendario · evaluar noindex de la landing de Ads en español · reencuadrar la fecha de `/italy-es` · activar contenido y reseñas en español en GBP.

**Meses 4–6:** contacto con parroquias hispanas de Miami y el Ministerio Hispano de la Arquidiócesis · completar los clusters de contenido en español · vigilar posicionamiento frente a Caminos de Gracia y Galasam.

## Top 10 Acciones (ordenadas por capacidad de generar consultas calificadas)

1. Fusionar y consolidar el cluster de Medjugorje en español — rescatar el contenido de confianza antes de redirigir.
2. Reforzar "sacerdote / acompañamiento espiritual" en cada página de producto — el trust signal #1 validado, subutilizado hoy.
3. Corregir el canonical faltante y el precio/moneda en `/peregrinacion-medjugorje-roma-es`.
4. Nombrar Bogotá y Miami explícitamente en las páginas de producto.
5. Construir la página de peregrinaciones para parroquias/grupos — la única intención genuinamente descubierta.
6. Agregar H1 a `/santuariosmarianos-es` y llenar el H1 vacío de `/about-es`.
7. Publicar "¿Cuánto cuesta una peregrinación?" y "Peregrinar con un sacerdote" en español.
8. Agregar las URLs en español faltantes al sitemap.xml.
9. Activar Google Business Profile y solicitud de reseñas en español.
10. Iniciar relación con parroquias hispanas de Miami y el Ministerio Hispano de la Arquidiócesis.

---

**Nota metodológica.** Basado en lectura directa de los 30 archivos en español del repositorio — cada título, meta descripción, H1, canonical y bloque hreflang citado fue extraído del código real. Las páginas en inglés se consultaron únicamente para confirmar relaciones hreflang y ubicar en qué archivo reside cada bug; ningún archivo fue modificado. El acceso de rastreo en vivo (WebFetch) al dominio estuvo bloqueado por la política de red de esta sesión — confirmar posicionamiento SERP exacto en Google Search Console filtrando por consultas en español antes de implementar.
