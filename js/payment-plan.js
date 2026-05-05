/**
 * Payment Plan Component for Sky Travel
 *
 * Generates a payment plan section with clickable links to /pay or /pagar.
 * Supports any number of payment options via data-options JSON attribute,
 * or legacy data-option-a/b/c attributes for backward compatibility.
 *
 * Usage (new - dynamic options):
 *   <div id="payment-plan-container"
 *     data-trip="Medjugorje 2026"
 *     data-deposit="499"
 *     data-options='[{"count":"6","price":"250"},{"count":"3","price":"500"}]'
 *     data-currency="€"
 *     data-lang="en">
 *   </div>
 *
 * Usage (legacy - fixed options):
 *   <div id="payment-plan-container"
 *     data-trip="Medjugorje 2026"
 *     data-deposit="499"
 *     data-option-a-count="6" data-option-a-price="250"
 *     data-option-b-count="3" data-option-b-price="500"
 *     data-currency="€"
 *     data-lang="en">
 *   </div>
 */
(function () {
    var container = document.getElementById('payment-plan-container');
    if (!container) return;

    var trip = container.getAttribute('data-trip') || '';
    var deposit = container.getAttribute('data-deposit') || '499';
    var depositText = container.getAttribute('data-deposit-text') || '';
    var customIntro = container.getAttribute('data-intro') || '';
    var currency = container.getAttribute('data-currency') || '\u20ac';
    var lang = container.getAttribute('data-lang') || 'en';
    var isEs = lang === 'es';
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // Resolve options: prefer data-options JSON, fallback to legacy attributes
    var options = [];
    var optionsAttr = container.getAttribute('data-options');
    if (optionsAttr) {
        try { options = JSON.parse(optionsAttr); } catch (e) { options = []; }
    }
    if (!options.length) {
        // Legacy fallback
        var aCount = container.getAttribute('data-option-a-count');
        var aPrice = container.getAttribute('data-option-a-price');
        if (aCount && aPrice) options.push({ count: aCount, price: aPrice });
        var bCount = container.getAttribute('data-option-b-count');
        var bPrice = container.getAttribute('data-option-b-price');
        if (bCount && bPrice) options.push({ count: bCount, price: bPrice });
        var cCount = container.getAttribute('data-option-c-count');
        var cPrice = container.getAttribute('data-option-c-price');
        if (cCount && cPrice) options.push({ count: cCount, price: cPrice });
    }

    var payPage = isEs ? '/pagar' : '/pay';
    var payUrl = payPage + '?trip=' + encodeURIComponent(trip);

    function formatPrice(value) {
        if (value === null || value === undefined || value === '') return value;
        var str = String(value);
        var parts = str.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }

    var t = {
        heading: isEs ? 'Plan de Pagos' : 'Payment Plan',
        intro: customIntro || (isEs
            ? 'Sabemos que una peregrinaci\u00f3n es una inversi\u00f3n importante. Por eso ofrecemos un plan de pagos claro y c\u00f3modo. Haz clic en cualquier opci\u00f3n para elegir tu m\u00e9todo de pago.'
            : 'We know that a pilgrimage is an important investment. That\u2019s why we offer a clear and flexible payment plan. Click any option below to choose your payment method.'),
        deposit: depositText || (isEs ? 'Dep\u00f3sito: ' + currency + formatPrice(deposit) + ' hoy para reservar' : 'Deposit: ' + currency + formatPrice(deposit) + ' today to reserve your spot'),
        dates: isEs
            ? 'Fechas: De acuerdo con el cronograma de pagos correspondiente a cada salida.'
            : 'Dates: According to the payment schedule corresponding to each departure.',
        cta: isEs ? 'Elegir Pago \u2192' : 'Choose Payment \u2192'
    };

    var hoverIn = "this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(200,169,126,0.2)';this.style.borderColor='#c8a97e'";
    var hoverOut = "this.style.transform='none';this.style.boxShadow='none';this.style.borderColor='#e0e0e0'";
    var depositHoverIn = "this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(200,169,126,0.4)'";
    var depositHoverOut = "this.style.transform='none';this.style.boxShadow='0 4px 15px rgba(200,169,126,0.3)'";
    var cardStyle = 'flex: 1; min-width: 250px; border: 1px solid #e0e0e0; border-radius: 12px; padding: 1.5rem; text-align: center; background: #fafafa; text-decoration: none; color: inherit; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;';

    function buildCard(opt, index) {
        var label = (isEs ? (opt.labelES || '') : (opt.labelEN || ''));
        if (!label) label = (isEs ? 'Opci\u00f3n ' : 'Option ') + letters[index];
        var desc = (isEs ? (opt.descES || '') : (opt.descEN || ''));
        if (!desc) desc = t.dates;
        var schedule = (isEs ? (opt.scheduleES || '') : (opt.scheduleEN || ''));
        // Use structured count×price if available, otherwise show raw price text
        var priceDisplay;
        if (opt.count && opt.price) {
            priceDisplay = opt.count + ' \u00d7 ' + currency + formatPrice(opt.price);
        } else {
            priceDisplay = (isEs ? (opt.priceTextES || opt.priceTextEN || '') : (opt.priceTextEN || opt.priceTextES || ''));
        }
        var scheduleHtml = schedule ? '      <p style="color: #888; font-size: 0.9rem; font-style: italic; margin-bottom: 0.75rem;">' + schedule + '</p>' : '';
        return ''
            + '    <a href="' + payUrl + '" style="' + cardStyle + '" onmouseover="' + hoverIn + '" onmouseout="' + hoverOut + '">'
            + '      <h3 style="color: #c8a97e; font-size: 1.2rem; margin-bottom: 0.75rem;">' + label + '</h3>'
            + '      <p style="font-size: 1.8rem; font-weight: 700; color: #333; margin: 0.5rem 0;">' + priceDisplay + '</p>'
            + '      <p style="color: #555; font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.5rem;">' + desc + '</p>'
            + scheduleHtml
            + '      <p style="color: #c8a97e; font-size: 0.85rem; font-weight: 600;">' + t.cta + '</p>'
            + '    </a>';
    }

    var html = ''
        + '<section style="padding: 3rem 1rem; max-width: 900px; margin: 0 auto;">'
        + '  <h2 style="text-align: center; margin-bottom: 0.75rem; color: #333;">' + t.heading + '</h2>'
        + '  <p style="text-align: center; color: #555; font-size: 1.05rem; line-height: 1.6; max-width: 600px; margin: 0 auto 1.5rem;">' + t.intro + '</p>'
        + '  <div style="text-align: center; margin-bottom: 2rem;">'
        + '    <a href="' + payUrl + '" style="display: inline-block; background: linear-gradient(135deg, #c8a97e 0%, #d4b896 100%); color: white; padding: 0.75rem 2rem; border-radius: 25px; font-size: 1.05rem; font-weight: 600; box-shadow: 0 4px 15px rgba(200,169,126,0.3); text-decoration: none; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="' + depositHoverIn + '" onmouseout="' + depositHoverOut + '">' + t.deposit + ' \u2192</a>'
        + '  </div>'
        + '  <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">';

    for (var i = 0; i < options.length; i++) {
        html += buildCard(options[i], i);
    }

    html += ''
        + '  </div>'
        + '</section>';

    container.innerHTML = html;
})();
