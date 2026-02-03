/**
 * page-init.js — Shared page initialization
 *
 * Handles: tabs, contact section, footer, and conditional slideshow loading.
 * Include with: <script src="js/page-init.js" defer></script>
 */
(function () {
    'use strict';

    /* ---------- Configuration ---------- */
    var CONTACT_VERSION = '20260128';
    var FOOTER_VERSION  = '20260131f';

    /* ---------- Base path (auto-detected from script src) ---------- */
    var basePath = (function () {
        var el = document.querySelector('script[src*="page-init.js"]');
        if (!el) return '';
        return el.getAttribute('src').replace(/js\/page-init\.js.*$/, '');
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

        var cssHref  = basePath + 'components/footer.css?v=' + FOOTER_VERSION;
        var htmlHref = basePath + 'components/footer.html?v=' + FOOTER_VERSION;
        var faHref   = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';

        loadCSS(cssHref, 'data-component', 'site-footer');
        loadCSS(faHref, 'data-component', 'site-footer-fa');

        fetch(htmlHref, { cache: 'no-store' })
            .then(function (r) { return r.text(); })
            .then(function (html) {
                container.innerHTML = html.replace(/<link[^>]*>/gi, '');
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
                jQuery('.slideshow').slick({
                    slidesToShow: 1,
                    slidesToScroll: 1,
                    arrows: true,
                    fade: true,
                    adaptiveHeight: false,
                    autoplay: true,
                    autoplaySpeed: 3000,
                    dots: true
                });
            })
            .catch(function (err) { console.error('[slideshow] load error:', err); });
    }

    /* ---------- Boot ---------- */

    ready(function () {
        initTabs();
        loadContactSection();
        loadFooter();
        initSlideshow();
    });
})();
