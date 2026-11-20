/**
 * italia-2027-contacto.js — Trip-specific wording for the Italy 2027 cultural trip.
 *
 * Loaded ONLY by:
 *   peregrinaciones-2027/roma-cinque-costa-amalfitana-es.html
 *   peregrinaciones-2027/roma-cinque-costa-amalfitana.html
 *
 * The contact section, footer and floating WhatsApp button are injected by
 * page-init.js and are shared by every page. Instead of changing those shared
 * files, this script waits for them to appear on this page and swaps the
 * pilgrimage wording for trip wording. Field names/ids are NOT changed, so
 * contact-tracking.js, GA4 events and the Notion lead function work as before.
 * If this script fails or is removed, the page simply shows the default text.
 */
(function () {
    'use strict';

    var isSpanish = (document.documentElement.lang || 'en').toLowerCase().indexOf('es') === 0;

    var t = isSpanish ? {
        heading: '¿Listo para su viaje a Italia en grupo?',
        subheading: 'Escríbanos y le ayudamos a planificarlo desde su ciudad.',
        label: 'Viaje de interés',
        placeholder: 'Ej: Viaje a Italia en grupo 2027',
        value: 'Viaje a Italia en grupo 2027',
        marketing: 'Deseo recibir ofertas y noticias sobre futuros viajes',
        whatsapp: 'Hola, Sky Travel J&M. Me interesa el Viaje a Italia en grupo 2027 (5 al 19 de julio). ¿Me pueden dar más información? Escribo desde (ciudad, estado o país): ',
        mailSubject: 'Consulta: Viaje a Italia en grupo 2027',
        mailBody: '¡Hola!\n\nMe interesa el Viaje a Italia en grupo 2027 (5 al 19 de julio). Por favor, envíenme más información.\n\n¡Gracias!',
        oldError: 'La peregrinación de interés es requerida',
        newError: 'El viaje de interés es requerido'
    } : {
        heading: 'Ready for your Italy group tour?',
        subheading: "Contact us and we'll help you plan it from your city.",
        label: 'Trip of interest',
        placeholder: 'e.g., Italy Group Tour 2027',
        value: 'Italy Group Tour 2027',
        marketing: 'I would like to receive offers and news about future trips',
        whatsapp: "Hello, Sky Travel J&M. I'm interested in the Italy Group Tour 2027 (July 5–19). Could you send me more information? I'm writing from (city, state or country): ",
        mailSubject: 'Inquiry: Italy Group Tour 2027',
        mailBody: "Hello!\n\nI'm interested in the Italy Group Tour 2027 (July 5–19). Please send me more information.\n\nThank you!",
        oldError: 'Pilgrimage of interest is required',
        newError: 'Trip of interest is required'
    };

    var waHref = 'https://wa.me/13056452625?text=' + encodeURIComponent(t.whatsapp);
    var mailHref = 'mailto:info@skytraveljm.com?subject=' + encodeURIComponent(t.mailSubject) +
        '&body=' + encodeURIComponent(t.mailBody);

    function setText(el, text) {
        if (el && el.textContent !== text) el.textContent = text;
    }

    // Replace the text of a <label> but keep its child elements (e.g. the "*" span).
    function setLabelText(label, text) {
        if (!label) return;
        var first = label.firstChild;
        if (first && first.nodeType === 3) {
            if (first.nodeValue.trim() !== text) first.nodeValue = text + ' ';
        }
    }

    function patch() {
        // Contact section
        var section = document.querySelector('#contact-section-container .contact-section');
        if (section) {
            var heading = section.querySelector('#contact-heading');
            setText(heading, t.heading);
            if (heading && heading.nextElementSibling && heading.nextElementSibling.tagName === 'P') {
                setText(heading.nextElementSibling, t.subheading);
            }

            setLabelText(section.querySelector('label[for="pilgrimageInterest"]'), t.label);

            var input = section.querySelector('#pilgrimageInterest');
            if (input && !input.dataset.tripPatched) {
                input.dataset.tripPatched = 'true';
                input.placeholder = t.placeholder;
                if (!input.value) input.value = t.value; // editable; tags the lead in Notion
            }

            setLabelText(section.querySelector('label[for="consentMarketing"]'), t.marketing);

            var err = section.querySelector('#pilgrimageInterest-error');
            if (err && err.textContent === t.oldError) err.textContent = t.newError;

            var mail = section.querySelector('a[href^="mailto:info@skytraveljm.com"]');
            if (mail && mail.getAttribute('href') !== mailHref) mail.setAttribute('href', mailHref);
        }

        // Every WhatsApp link that carries the generic "peregrinaciones/pilgrimages" message:
        // contact card, footer icon and floating button.
        // Also the plain key-facts link, which has no preset message.
        var links = document.querySelectorAll('a[href^="https://wa.me/13056452625"]');
        for (var i = 0; i < links.length; i++) {
            var href = links[i].getAttribute('href');
            if (href !== waHref && (href === 'https://wa.me/13056452625' ||
                    /peregrinaciones|pilgrimages/i.test(decodeURIComponent(href)))) {
                links[i].setAttribute('href', waHref);
            }
        }
    }

    var scheduled = false;
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        (window.requestAnimationFrame || setTimeout)(function () {
            scheduled = false;
            try { patch(); } catch (e) { /* never break the page */ }
        });
    }

    function start() {
        schedule();
        // The components load asynchronously; validation errors are written later too.
        new MutationObserver(schedule).observe(document.body, {
            childList: true, subtree: true, characterData: true
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
