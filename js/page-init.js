/**
 * page-init.js — Shared page initialization
 *
 * Handles: shared analytics, floating WhatsApp, tabs, contact, footer and slideshows.
 * Include with: <script src="js/page-init.js" defer></script>
 */
(function () {
    'use strict';

    /* ---------- Configuration ---------- */
    var CONTACT_VERSION    = '20260128';
    var BLOG_SUB_VERSION   = '20260224';
    var FOOTER_VERSION     = '20260204a';

    /* ---------- Base path (auto-detected from script src) ---------- */
    var basePath = (function () {
        var el = document.currentScript || document.querySelector('script[src*="page-init"]');
        if (!el) return '';
        return el.getAttribute('src').replace(/js\/page-init(\.min)?\.js.*$/, '');
    })();

    /* ---------- Helpers ---------- */

    function ready(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    function loadScript(url) {
        return new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = url;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    function loadCSS(url, dataAttr, dataVal) {
        if (dataAttr && document.querySelector('link[' + dataAttr + '="' + dataVal + '"]')) {
            return;
        }
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        if (dataAttr) link.setAttribute(dataAttr, dataVal);
        document.head.appendChild(link);
    }

    /* ---------- Tabs (plain JS — no jQuery needed) ---------- */

    function initTabs() {
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.tab-button');
            if (!btn) return;

            var container = btn.closest('.tab-container');
            if (!container) return;

            var targetTab = btn.getAttribute('data-tab');

            container.querySelectorAll('.tab-button').forEach(function (b) {
                b.classList.remove('active');
            });
            container.querySelectorAll('.tab-pane').forEach(function (p) {
                p.classList.remove('active');
            });

            btn.classList.add('active');
            var pane = container.querySelector('#' + targetTab);
            if (pane) pane.classList.add('active');
        });
    }

    /* ---------- Blog Subscribe Section Loader ---------- */

    function loadBlogSubscribeSection() {
        var container = document.getElementById('blog-subscribe-container');
        if (!container) return;

        var lang = (document.documentElement.lang || 'en').toLowerCase();
        var isSpanish = lang.indexOf('es') === 0;

        var htmlFile = basePath + 'components/blog-subscribe-section' + (isSpanish ? '-es' : '') + '.html?v=' + BLOG_SUB_VERSION;
        var cssHref  = basePath + 'components/blog-subscribe-section.css?v=' + BLOG_SUB_VERSION;
        var dataComp = isSpanish ? 'blog-subscribe-section-es' : 'blog-subscribe-section';

        fetch(htmlFile, { cache: 'no-store' })
            .then(function (r) { return r.text(); })
            .then(function (html) {
                var doc = new DOMParser().parseFromString(html, 'text/html');

                var link = doc.querySelector('link[data-component="' + dataComp + '"]');
                if (link) {
                    link.remove();
                    if (!document.querySelector('link[data-component="' + dataComp + '"]')) {
                        link.href = cssHref;
                        document.head.appendChild(link);
                    }
                }

                container.innerHTML = doc.body ? doc.body.innerHTML : html;
            })
            .catch(function (err) { console.error('Error loading blog subscribe section:', err); });
    }

    /* ---------- Contact Section Loader ---------- */

    function loadContactSection() {
        var container = document.getElementById('contact-section-container');
        if (!container) return;

        var lang = (document.documentElement.lang || 'en').toLowerCase();
        var isSpanish = lang.indexOf('es') === 0;

        var htmlFile = basePath + 'components/contact-section' + (isSpanish ? '-es' : '') + '.html?v=' + CONTACT_VERSION;
        var cssHref  = basePath + 'components/contact-section.css?v=' + CONTACT_VERSION;
        var dataComp = isSpanish ? 'contact-section-es' : 'contact-section';

        fetch(htmlFile, { cache: 'no-store' })
            .then(function (r) { return r.text(); })
            .then(function (html) {
                var doc = new DOMParser().parseFromString(html, 'text/html');

                var link = doc.querySelector('link[data-component="' + dataComp + '"]');
                if (link) {
                    link.remove();
                    if (!document.querySelector('link[data-component="' + dataComp + '"]')) {
                        link.href = cssHref;
                        document.head.appendChild(link);
                    }
                }

                container.innerHTML = doc.body ? doc.body.innerHTML : html;
            })
            .catch(function (err) { console.error('Error loading contact section:', err); });
    }

    /* ---------- Footer Loader ---------- */

    function loadFooter() {
        var container = document.getElementById('footer-container');
        if (!container) return;

        var lang = (document.documentElement.lang || 'en').toLowerCase();
        var isSpanish = lang.indexOf('es') === 0;

        var cssHref  = basePath + 'components/footer.css?v=' + FOOTER_VERSION;
        var htmlHref = basePath + 'components/footer' + (isSpanish ? '-es' : '') + '.html?v=' + FOOTER_VERSION;

        loadCSS(cssHref, 'data-component', 'site-footer');

        fetch(htmlHref, { cache: 'no-store' })
            .then(function (r) { return r.text(); })
            .then(function (html) {
                var doc = new DOMParser().parseFromString(html, 'text/html');
                // Footer fragments place the link in <head>; body holds the footer markup we need.
                container.innerHTML = doc.body ? doc.body.innerHTML : html.replace(/<link[^>]*>/gi, '');
            })
            .catch(function (err) { console.error('[footer] load error:', err); });
    }

    /* ---------- Slideshow (loads jQuery + Slick only when needed) ---------- */

    function initSlideshow() {
        if (!document.querySelector('.slideshow')) return;

        loadCSS('https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.8.1/slick.min.css');
        loadCSS('https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.8.1/slick-theme.min.css');

        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js')
            .then(function () {
                return loadScript('https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.8.1/slick.min.js');
            })
            .then(function () {
                var $slideshows = jQuery('.slideshow');

                // Prevent focusable hidden slides (ARIA issue) by managing tabindex manually
                $slideshows.on('init setPosition', function (event, slick) {
                    slick.$slides.attr('tabindex', '-1').attr('aria-hidden', 'true');
                    slick.$slides.filter('.slick-active').attr('tabindex', '0').attr('aria-hidden', 'false');
                });

                $slideshows.slick({
                    slidesToShow: 1,
                    slidesToScroll: 1,
                    arrows: true,
                    fade: true,
                    swipe: true,
                    touchMove: true,
                    adaptiveHeight: false,
                    autoplay: true,
                    autoplaySpeed: 3000,
                    dots: true,
                    accessibility: false
                });
            })
            .catch(function (err) { console.error('[slideshow] load error:', err); });
    }

    var tripWhatsAppMessages = {
        "/peregrinacion_bajo_el_manto_de_maria": "Hello, Sky Travel J&M. I’m interested in the Under Mary’s Mantle 2027 pilgrimage (Fátima, Lourdes and Garabandal). Could you send me dates and price? I’m writing from (city, state or country): ",
        "/medjugorje": "Hello, Sky Travel J&M. I’m interested in the Medjugorje 2027 pilgrimage. Could you send me dates and price? I’m writing from (city, state or country): ",
        "/tierrasanta2026": "Hello, Sky Travel J&M. I’m interested in the Holy Land & Medjugorje pilgrimage (September–October 2027). Could you send me dates and price? I’m writing from (city, state or country): ",
        "/tierrasanta2026-es": "Hola, Sky Travel J&M. Me interesa la peregrinación a Tierra Santa y Medjugorje de septiembre–octubre 2027. ¿Me pueden enviar fechas y precio? Escribo desde (ciudad, estado o país): ",
        "/peregrinacion_mexico_cancun_2027": "Hello, Sky Travel J&M. I’m interested in the Guadalupe, Mexico & Cancún 2027 pilgrimage. Could you send me dates and price? I’m writing from (city, state or country): ",
        "/peregrinacion_mexico_cancun_2027-es": "Hola, Sky Travel J&M. Me interesa la peregrinación a Guadalupe, México y Cancún 2027. ¿Me pueden enviar fechas y precio? Escribo desde (ciudad, estado o país): ",
        "/peregrinacion-tierrasanta-2027-es": "Hola, Sky Travel J&M. Me interesa la peregrinación a Tierra Santa y Medjugorje de marzo–abril 2027. ¿Me pueden enviar fechas y precio? Escribo desde (ciudad, estado o país): ",
        "/peregrinacion_bajo_el_manto_de_maria-es": "Hola, Sky Travel J&M. Me interesa la peregrinación Bajo el Manto de María 2027 (Fátima, Lourdes y Garabandal). ¿Me pueden enviar fechas y precio? Escribo desde (ciudad, estado o país): ",
        "/medjugorje-es": "Hola, Sky Travel J&M. Me interesa la peregrinación a Medjugorje 2027. ¿Me pueden enviar fechas y precio? Escribo desde (ciudad, estado o país): ",
        "/peregrinacion-tierrasanta-2027": "Hello, Sky Travel J&M. I’m interested in the Holy Land & Medjugorje pilgrimage (March–April 2027). Could you send me dates and price? I’m writing from (city, state or country): "
    };

    /* ---------- Shared analytics and floating WhatsApp ---------- */

    function ensureSiteTracking() {
        if (window.SkyTravelTracking) return Promise.resolve();
        return loadScript(basePath + 'js/site-tracking.js?v=20261101');
    }

    function initFloatingWhatsApp() {
        var path = window.location.pathname.toLowerCase().replace(/\/$/, '').replace(/\.html$/, '');
        var internalPage = /\/(recibo|estado|pagar|pay|empleados|cumpleanos|crear-destino|crear-experiencia|trip-gallery|galeria-viaje)(-es)?$/.test(path);
        var noindex = Array.prototype.some.call(document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]'), function (meta) {
            return /\bnoindex\b/i.test(meta.content);
        });
        if (internalPage || noindex || document.querySelector('.stjm-wa-float')) return;

        var isSpanish = (document.documentElement.lang || 'en').toLowerCase().indexOf('es') === 0;
        var label = isSpanish ? 'Escríbenos por WhatsApp' : 'Message us on WhatsApp';
        var tripPath = path.replace(/^\/peregrinaciones-2027\//, '/');
        var message = tripWhatsAppMessages[tripPath] || (isSpanish
            ? 'Hola, vengo de la página web de Sky Travel J&M. Me interesa información sobre sus peregrinaciones. Escribo desde (ciudad, estado o país): '
            : "Hello, I'm coming from the Sky Travel J&M website. I'd like information about your pilgrimages. I'm writing from (city, state or country): ");

        if (!document.getElementById('stjm-wa-float-css')) {
            var style = document.createElement('style');
            style.id = 'stjm-wa-float-css';
            style.textContent = `
                .stjm-wa-float {
                    position: fixed;
                    right: calc(20px + env(safe-area-inset-right, 0px));
                    bottom: calc(20px + env(safe-area-inset-bottom, 0px) + var(--stjm-wa-offset, 0px));
                    z-index: 900;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                    width: 56px;
                    height: 56px;
                    border: 0;
                    border-radius: 50%;
                    background: #128C7E;
                    color: #fff;
                    text-decoration: none;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, .18);
                    transition: transform 160ms ease, box-shadow 160ms ease;
                }
                .stjm-wa-float:hover, .stjm-wa-float:focus-visible {
                    color: #fff;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, .22);
                }
                .stjm-wa-float:focus-visible {
                    outline: 3px solid #fff;
                    outline-offset: 3px;
                    box-shadow: 0 0 0 7px #222, 0 6px 20px rgba(0, 0, 0, .22);
                }
                .stjm-wa-float[data-hidden] { visibility: hidden; pointer-events: none; }
                .stjm-wa-float svg { width: 28px; height: 32px; fill: currentColor; }
                .stjm-wa-float span { display: none; }
                @media (min-width: 769px) {
                    .stjm-wa-float { width: 60px; height: 60px; }
                }
                @media (min-width: 769px) and (hover: hover) {
                    .stjm-wa-float span {
                        display: block;
                        position: absolute;
                        right: calc(100% + 12px);
                        padding: 9px 14px;
                        border-radius: 999px;
                        background: #fff;
                        color: #222;
                        font: 500 14px/1.4 system-ui, sans-serif;
                        white-space: nowrap;
                        box-shadow: 0 2px 12px rgba(0, 0, 0, .12);
                        opacity: 0;
                        visibility: hidden;
                        transform: translateX(4px);
                        transition: opacity 160ms ease, transform 160ms ease, visibility 160ms;
                        pointer-events: none;
                    }
                    .stjm-wa-float:hover span, .stjm-wa-float:focus-visible span {
                        opacity: 1; visibility: visible; transform: translateX(0);
                    }
                }
                @media (prefers-reduced-motion: reduce) {
                    .stjm-wa-float, .stjm-wa-float span { transition: none; transform: none; }
                    .stjm-wa-float:hover, .stjm-wa-float:focus-visible { transform: none; }
                }
            `;
            document.head.appendChild(style);
        }

        var button = document.createElement('a');
        button.className = 'stjm-wa-float';
        button.href = 'https://wa.me/13056452625?text=' + encodeURIComponent(message);
        button.target = '_blank';
        button.rel = 'noopener';
        button.dataset.section = 'floating_button';
        button.setAttribute('aria-label', label);
        // The same official WhatsApp glyph used by components/footer.html.
        button.innerHTML = "<svg focusable=\"false\" aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 448 512\" fill=\"currentColor\"><path d=\"M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.7 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z\"/></svg>";
        var pill = document.createElement('span');
        pill.setAttribute('aria-hidden', 'true');
        pill.textContent = label;
        button.appendChild(pill);
        document.body.appendChild(button);

        var scheduled = false;
        function updatePosition() {
            scheduled = false;
            var hidden = document.body.classList.contains('nav-menu-open');
            // Leave footer links completely unobstructed while the footer is in view.
            document.querySelectorAll('footer').forEach(function (footer) {
                var rect = footer.getBoundingClientRect();
                if (rect.height && rect.top < window.innerHeight && rect.bottom > 0) hidden = true;
            });

            button.style.setProperty('--stjm-wa-offset', '0px');
            var origin = button.getBoundingClientRect();
            var offset = 0;
            // Move above the language suggestion, toasts, submit and back-to-top controls.
            document.querySelectorAll('#toast-container, .toast-container, button[type="submit"], input[type="submit"], .scroll-to-top.visible, [data-lang-suggest]').forEach(function (element) {
                if (window.getComputedStyle(element).visibility === 'hidden') return;
                var rect = element.getBoundingClientRect();
                if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= window.innerHeight) return;
                if (rect.left < origin.right + 8 && rect.right > origin.left - 8 &&
                    rect.bottom > origin.top - offset - 8 && rect.top < origin.bottom) {
                    offset = Math.max(offset, origin.bottom - rect.top + 12);
                }
            });
            button.style.setProperty('--stjm-wa-offset', offset + 'px');
            if (origin.top - offset < 12) hidden = true;
            button.toggleAttribute('data-hidden', hidden);
        }
        function schedulePosition() {
            if (scheduled) return;
            scheduled = true;
            window.requestAnimationFrame(updatePosition);
        }
        window.addEventListener('scroll', schedulePosition, { passive: true });
        window.addEventListener('resize', schedulePosition);
        document.addEventListener('load', schedulePosition, true);
        new MutationObserver(schedulePosition).observe(document.body, { attributes: true, attributeFilter: ['class'] });
        new MutationObserver(schedulePosition).observe(document.body, { childList: true, subtree: true });
        updatePosition();
    }

    /* ---------- Boot ---------- */

    ready(function () {
        ensureSiteTracking().then(initFloatingWhatsApp).catch(function (err) {
            console.error('[tracking] load error:', err);
            initFloatingWhatsApp();
        });
        initTabs();
        loadBlogSubscribeSection();
        loadContactSection();
        loadFooter();
        initSlideshow();
    });
})();
