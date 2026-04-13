/**
 * Payment Plan Component for Sky Travel
 *
 * Generates a payment plan section with clickable links to /pay or /pagar.
 *
 * Usage:
 *   <div id="payment-plan-container"
 *     data-trip="Medjugorje 2026"
 *     data-deposit="499"
 *     data-option-a-count="6"
 *     data-option-a-price="250"
 *     data-option-b-count="3"
 *     data-option-b-price="500"
 *     data-currency="€"
 *     data-lang="en">
 *   </div>
 *   <script src="js/payment-plan.js"></script>
 */
(function () {
    var container = document.getElementById('payment-plan-container');
    if (!container) return;

    var trip = container.getAttribute('data-trip') || '';
    var deposit = container.getAttribute('data-deposit') || '499';
    var aCount = container.getAttribute('data-option-a-count') || '6';
    var aPrice = container.getAttribute('data-option-a-price') || '250';
    var bCount = container.getAttribute('data-option-b-count') || '3';
    var bPrice = container.getAttribute('data-option-b-price') || '500';
    var currency = container.getAttribute('data-currency') || '€';
    var lang = container.getAttribute('data-lang') || 'en';

    var payPage = lang === 'es' ? '/pagar' : '/pay';
    var tripParam = encodeURIComponent(trip);
    var payUrl = payPage + '?trip=' + tripParam;

    var isEs = lang === 'es';
    var t = {
        heading: isEs ? 'Plan de Pagos' : 'Payment Plan',
        intro: isEs
            ? 'Sabemos que una peregrinaci\u00f3n es una inversi\u00f3n importante. Por eso ofrecemos un plan de pagos claro y c\u00f3modo. Haz clic en cualquier opci\u00f3n para elegir tu m\u00e9todo de pago.'
            : 'We know that a pilgrimage is an important investment. That\u2019s why we offer a clear and flexible payment plan. Click any option below to choose your payment method.',
        deposit: isEs ? 'Dep\u00f3sito: ' + currency + deposit + ' hoy para reservar' : 'Deposit: ' + currency + deposit + ' today to reserve your spot',
        depositCta: ' \u2192',
        optionA: isEs ? 'Opci\u00f3n A' : 'Option A',
        optionB: isEs ? 'Opci\u00f3n B' : 'Option B',
        dates: isEs
            ? 'Fechas: De acuerdo con el cronograma de pagos correspondiente a cada salida.'
            : 'Dates: According to the payment schedule corresponding to each departure.',
        monthly: isEs ? 'Pagos mensuales' : 'Monthly payments',
        quarterly: isEs ? 'Pagos trimestrales' : 'Quarterly payments',
        cta: isEs ? 'Elegir Pago \u2192' : 'Choose Payment \u2192',
        memo: isEs
            ? 'Incluye tu nombre completo y "' + trip + '" en el memo'
            : 'Include your full name and "' + trip + '" in the memo'
    };

    var hoverIn = "this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(200,169,126,0.2)';this.style.borderColor='#c8a97e'";
    var hoverOut = "this.style.transform='none';this.style.boxShadow='none';this.style.borderColor='#e0e0e0'";
    var depositHoverIn = "this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(200,169,126,0.4)'";
    var depositHoverOut = "this.style.transform='none';this.style.boxShadow='0 4px 15px rgba(200,169,126,0.3)'";

    var html = ''
        + '<section style="padding: 3rem 1rem; max-width: 900px; margin: 0 auto;">'
        + '  <h2 style="text-align: center; margin-bottom: 0.75rem; color: #333;">' + t.heading + '</h2>'
        + '  <p style="text-align: center; color: #555; font-size: 1.05rem; line-height: 1.6; max-width: 600px; margin: 0 auto 1.5rem;">' + t.intro + '</p>'
        + '  <div style="text-align: center; margin-bottom: 2rem;">'
        + '    <a href="' + payUrl + '" style="display: inline-block; background: linear-gradient(135deg, #c8a97e 0%, #d4b896 100%); color: white; padding: 0.75rem 2rem; border-radius: 25px; font-size: 1.05rem; font-weight: 600; box-shadow: 0 4px 15px rgba(200,169,126,0.3); text-decoration: none; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="' + depositHoverIn + '" onmouseout="' + depositHoverOut + '">' + t.deposit + t.depositCta + '</a>'
        + '  </div>'
        + '  <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">'
        + '    <a href="' + payUrl + '" style="flex: 1; min-width: 250px; border: 1px solid #e0e0e0; border-radius: 12px; padding: 1.5rem; text-align: center; background: #fafafa; text-decoration: none; color: inherit; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;" onmouseover="' + hoverIn + '" onmouseout="' + hoverOut + '">'
        + '      <h3 style="color: #c8a97e; font-size: 1.2rem; margin-bottom: 0.75rem;">' + t.optionA + '</h3>'
        + '      <p style="font-size: 1.8rem; font-weight: 700; color: #333; margin: 0.5rem 0;">' + aCount + ' \u00d7 ' + currency + aPrice + '</p>'
        + '      <p style="color: #555; font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.5rem;">' + t.dates + '</p>'
        + '      <p style="color: #888; font-size: 0.9rem; font-style: italic; margin-bottom: 0.75rem;">' + t.monthly + '</p>'
        + '      <p style="color: #c8a97e; font-size: 0.85rem; font-weight: 600;">' + t.cta + '</p>'
        + '    </a>'
        + '    <a href="' + payUrl + '" style="flex: 1; min-width: 250px; border: 1px solid #e0e0e0; border-radius: 12px; padding: 1.5rem; text-align: center; background: #fafafa; text-decoration: none; color: inherit; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;" onmouseover="' + hoverIn + '" onmouseout="' + hoverOut + '">'
        + '      <h3 style="color: #c8a97e; font-size: 1.2rem; margin-bottom: 0.75rem;">' + t.optionB + '</h3>'
        + '      <p style="font-size: 1.8rem; font-weight: 700; color: #333; margin: 0.5rem 0;">' + bCount + ' \u00d7 ' + currency + bPrice + '</p>'
        + '      <p style="color: #555; font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.5rem;">' + t.dates + '</p>'
        + '      <p style="color: #888; font-size: 0.9rem; font-style: italic; margin-bottom: 0.75rem;">' + t.quarterly + '</p>'
        + '      <p style="color: #c8a97e; font-size: 0.85rem; font-weight: 600;">' + t.cta + '</p>'
        + '    </a>'
        + '  </div>'
        + '</section>';

    container.innerHTML = html;
})();
