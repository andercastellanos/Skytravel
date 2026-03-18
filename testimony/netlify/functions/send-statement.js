/**
 * ============================================
 * SKY TRAVEL JM - SEND STATEMENT NETLIFY FUNCTION
 * ============================================
 *
 * Sends a branded account statement (estado de cuenta) email
 * with PDF attachment to the customer. BCC to manager.
 *
 * ENV VARS: RESEND_API_KEY, FROM_EMAIL, NOTIFICATION_EMAIL
 *
 * Last updated: 2026-03-06
 * ============================================
 */

const { Resend } = require('resend');
const { jsPDF } = require('jspdf');

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Formats YYYY-MM-DD date into month + year string
 */
function formatDate(dateStr, isSpanish) {
    const months = isSpanish
        ? ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
        : ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const month = months[parseInt(parts[1], 10) - 1];
    const year = parts[0];
    return isSpanish
        ? `${month} de ${year}`
        : `${month} ${year}`;
}

/**
 * Formats a number with commas and 2 decimal places (e.g. 4718 -> "4,718.00")
 */
function formatMoney(num) {
    var parts = num.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
}

/**
 * Builds the branded account statement HTML email
 */
function buildStatementEmail(body) {
    const isSpanish = (body.lang || 'es').toLowerCase().startsWith('es');
    const cur = body.currency || '$';

    const text = isSpanish ? {
        subject: 'Estado de Cuenta — Sky Travel J&M',
        title: 'Estado de Cuenta',
        greeting: 'Hola',
        message: 'Te enviamos tu estado de cuenta correspondiente al mes de {date}. Adjuntamos el documento en formato PDF para su respectivo registro.',
        pilgrimsLabel: 'Peregrinos',
        servicesTitle: 'Servicios',
        descriptionLabel: 'Descripción',
        qtyLabel: 'Cantidad',
        unitPriceLabel: 'Valor Unitario',
        rowTotalLabel: 'Valor Total',
        grandTotalLabel: 'VALOR TOTAL',
        paymentPlanTitle: 'Plan de Pagos',
        valueLabel: 'Valor',
        statusLabel: 'Estado',
        statusPaid: 'Pagado',
        statusPending: 'Pendiente',
        balanceTitle: 'Balance',
        balanceTotalLabel: 'Valor Total',
        balancePaidLabel: 'Valor Abonado',
        balancePendingLabel: 'Valor Pendiente',
        balanceRefundLabel: 'Valor Pendiente Devolución',
        closing: 'Gracias por su confianza.',
        teamName: 'Equipo de Sky Travel J&M',
        phone: 'Teléfono',
        website: 'Sitio Web',
        license: 'Licencia de Vendedor de Viajes (FDACS) No. ST45413'
    } : {
        subject: 'Account Statement — Sky Travel J&M',
        title: 'Account Statement',
        greeting: 'Hello',
        message: 'We are sending you your account statement for {date}. The document is attached in PDF format for your records.',
        pilgrimsLabel: 'Pilgrims',
        servicesTitle: 'Services',
        descriptionLabel: 'Description',
        qtyLabel: 'Quantity',
        unitPriceLabel: 'Unit Price',
        rowTotalLabel: 'Total',
        grandTotalLabel: 'GRAND TOTAL',
        paymentPlanTitle: 'Payment Plan',
        valueLabel: 'Value',
        statusLabel: 'Status',
        statusPaid: 'Paid',
        statusPending: 'Pending',
        balanceTitle: 'Balance',
        balanceTotalLabel: 'Total Value',
        balancePaidLabel: 'Amount Paid',
        balancePendingLabel: 'Amount Pending',
        balanceRefundLabel: 'Refund Amount Due',
        closing: 'Thank you for your trust.',
        teamName: 'The Sky Travel J&M Team',
        phone: 'Phone',
        website: 'Website',
        license: 'FDACS Seller of Travel License No. ST45413'
    };

    // Build pilgrims bullet list
    const pilgrimsList = (body.pilgrims || []).filter(p => p.trim()).map(p =>
        `<li style="color:#333;font-size:14px;margin:4px 0;">${p}</li>`
    ).join('');

    const pilgrimsSection = pilgrimsList
        ? `<div style="margin:16px 0 20px 0;">
            <p style="color:#2c3e50;font-size:15px;font-weight:600;margin:0 0 8px 0;">${text.pilgrimsLabel}:</p>
            <ul style="margin:0;padding-left:20px;">${pilgrimsList}</ul>
           </div>`
        : '';

    // Build services table rows
    const serviceRows = (body.services || []).map(item => {
        const qty = parseFloat(item.qty || 0);
        const unitPrice = parseFloat(item.unitPrice || 0);
        const rowTotal = qty * unitPrice;
        return `<tr>
            <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#333;word-wrap:break-word;overflow-wrap:break-word;">${item.description || ''}</td>
            <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#333;text-align:center;">${qty}</td>
            <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#333;text-align:right;">${cur}${formatMoney(unitPrice)}</td>
            <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#333;text-align:right;">${cur}${formatMoney(rowTotal)}</td>
        </tr>`;
    }).join('');

    const grandTotal = (body.services || []).reduce((sum, item) => {
        return sum + (parseFloat(item.qty || 0) * parseFloat(item.unitPrice || 0));
    }, 0);

    // Build payment plan table rows
    const paymentRows = (body.paymentPlan || []).map(item => {
        const statusText = item.status === 'Pagado'
            ? (isSpanish ? text.statusPaid : text.statusPaid)
            : (isSpanish ? text.statusPending : text.statusPending);
        const statusColor = item.status === 'Pagado' ? '#27ae60' : '#e67e22';
        return `<tr>
            <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#333;word-wrap:break-word;overflow-wrap:break-word;">${item.description || ''}</td>
            <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#333;text-align:right;">${cur}${formatMoney(parseFloat(item.value || 0))}</td>
            <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:${statusColor};font-weight:600;text-align:center;">${statusText}</td>
        </tr>`;
    }).join('');

    // Calculate balance
    const paidTotal = (body.paymentPlan || [])
        .filter(item => item.status === 'Pagado')
        .reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
    const diff = grandTotal - paidTotal;
    const pendingTotal = diff > 0 ? diff : 0;
    const refundAmount = diff < 0 ? Math.abs(diff) : 0;

    return {
        subject: text.subject,
        html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#faf8f5;">
        <!-- Header with logo -->
        <div style="padding:30px;text-align:center;">
            <img src="https://www.skytraveljm.com/images/Logo.jpg" alt="Sky Travel J&amp;M" style="max-width:160px;height:auto;" />
        </div>

        <!-- Body -->
        <div style="padding:30px;background:#ffffff;">
            <h1 style="color:#2c3e50;font-size:22px;margin:0 0 20px 0;text-align:center;">${text.title}</h1>

            <p style="color:#333;font-size:15px;margin:0 0 6px 0;">${text.greeting} ${body.customerName},</p>
            <p style="color:#333;font-size:15px;margin:0 0 20px 0;line-height:1.5;">${text.message.replace('{date}', formatDate(body.date, isSpanish))}</p>

            ${pilgrimsSection}

            <!-- Services Table -->
            <p style="color:#2c3e50;font-size:15px;font-weight:600;margin:20px 0 8px 0;">${text.servicesTitle}:</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:4px;table-layout:fixed;">
                <colgroup>
                    <col style="width:40%;">
                    <col style="width:15%;">
                    <col style="width:22%;">
                    <col style="width:23%;">
                </colgroup>
                <thead>
                    <tr>
                        <th style="padding:10px 12px;background:#c8a97e;color:#ffffff;font-size:13px;font-weight:600;text-align:left;border:1px solid #c8a97e;">${text.descriptionLabel}</th>
                        <th style="padding:10px 12px;background:#c8a97e;color:#ffffff;font-size:13px;font-weight:600;text-align:center;border:1px solid #c8a97e;">${text.qtyLabel}</th>
                        <th style="padding:10px 12px;background:#c8a97e;color:#ffffff;font-size:13px;font-weight:600;text-align:right;border:1px solid #c8a97e;">${text.unitPriceLabel}</th>
                        <th style="padding:10px 12px;background:#c8a97e;color:#ffffff;font-size:13px;font-weight:600;text-align:right;border:1px solid #c8a97e;">${text.rowTotalLabel}</th>
                    </tr>
                </thead>
                <tbody>
                    ${serviceRows}
                </tbody>
            </table>
            <div style="text-align:right;padding:12px 12px;background:#faf6f0;border:1px solid #e0d6c8;border-top:2px solid #c8a97e;margin-bottom:24px;">
                <span style="color:#2c3e50;font-size:15px;font-weight:700;">${text.grandTotalLabel}: ${cur}${formatMoney(grandTotal)}</span>
            </div>

            <!-- Payment Plan Table -->
            ${paymentRows ? `
            <p style="color:#2c3e50;font-size:15px;font-weight:600;margin:20px 0 8px 0;">${text.paymentPlanTitle}:</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px;table-layout:fixed;">
                <colgroup>
                    <col style="width:45%;">
                    <col style="width:30%;">
                    <col style="width:25%;">
                </colgroup>
                <thead>
                    <tr>
                        <th style="padding:10px 12px;background:#c8a97e;color:#ffffff;font-size:13px;font-weight:600;text-align:left;border:1px solid #c8a97e;">${text.descriptionLabel}</th>
                        <th style="padding:10px 12px;background:#c8a97e;color:#ffffff;font-size:13px;font-weight:600;text-align:right;border:1px solid #c8a97e;">${text.valueLabel}</th>
                        <th style="padding:10px 12px;background:#c8a97e;color:#ffffff;font-size:13px;font-weight:600;text-align:center;border:1px solid #c8a97e;">${text.statusLabel}</th>
                    </tr>
                </thead>
                <tbody>
                    ${paymentRows}
                </tbody>
            </table>
            ` : ''}

            <!-- Balance -->
            <p style="color:#2c3e50;font-size:15px;font-weight:600;margin:20px 0 8px 0;">${text.balanceTitle}:</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                <tr>
                    <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#333;font-weight:600;">${text.balanceTotalLabel}</td>
                    <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#333;text-align:right;font-weight:600;">${cur}${formatMoney(grandTotal)}</td>
                </tr>
                <tr>
                    <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#27ae60;font-weight:600;">${text.balancePaidLabel}</td>
                    <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#27ae60;text-align:right;font-weight:600;">${cur}${formatMoney(paidTotal)}</td>
                </tr>
                <tr>
                    <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#e67e22;font-weight:600;">${text.balancePendingLabel}</td>
                    <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#e67e22;text-align:right;font-weight:600;">${cur}${formatMoney(pendingTotal)}</td>
                </tr>
                ${refundAmount > 0 ? `<tr>
                    <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#c41e3a;font-weight:600;">${text.balanceRefundLabel}</td>
                    <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#c41e3a;text-align:right;font-weight:600;">${cur}${formatMoney(refundAmount)}</td>
                </tr>` : ''}
            </table>

            <p style="color:#2c3e50;font-size:15px;margin:24px 0 4px 0;">${text.closing}</p>
            <p style="color:#c8a97e;font-weight:600;font-size:15px;margin:0;">${text.teamName}</p>
        </div>

        <!-- Footer -->
        <div style="border-top:3px solid #c8a97e;padding:20px 30px;text-align:center;background:#faf8f5;">
            <p style="color:#666;font-size:13px;margin:2px 0;">1000 Brickell Ave Ste 715</p>
            <p style="color:#666;font-size:13px;margin:2px 0;">Miami, FL 33131</p>
            <p style="color:#666;font-size:13px;margin:8px 0 2px 0;">${text.license}</p>
            <p style="color:#666;font-size:13px;margin:8px 0 2px 0;">Email: info@skytraveljm.com</p>
            <p style="color:#666;font-size:13px;margin:2px 0;">${text.phone}: +1 (239) 355-4007</p>
            <p style="color:#666;font-size:13px;margin:2px 0;">${text.website}: <a href="https://www.skytraveljm.com" style="color:#c8a97e;">skytraveljm.com</a></p>
            <div style="margin-top:12px;">
                <a href="https://www.facebook.com/skytraveljm" style="text-decoration:none;margin:0 6px;"><img src="https://www.skytraveljm.com/images/email/facebook-gold.png" alt="" width="24" height="24" style="vertical-align:middle;" /></a>
                <a href="https://www.instagram.com/skytraveljm" style="text-decoration:none;margin:0 6px;"><img src="https://www.skytraveljm.com/images/email/instagram-gold.png" alt="" width="24" height="24" style="vertical-align:middle;" /></a>
                <a href="https://www.linkedin.com/company/skytraveljym" style="text-decoration:none;margin:0 6px;"><img src="https://www.skytraveljm.com/images/email/linkedin-gold.png" alt="" width="24" height="24" style="vertical-align:middle;" /></a>
                <a href="https://wa.me/12393554007" style="text-decoration:none;margin:0 6px;"><img src="https://www.skytraveljm.com/images/email/whatsapp-gold.png" alt="" width="24" height="24" style="vertical-align:middle;" /></a>
                <a href="https://www.tiktok.com/@skytraveljm" style="text-decoration:none;margin:0 6px;"><img src="https://www.skytraveljm.com/images/email/tiktok-gold.png" alt="" width="24" height="24" style="vertical-align:middle;" /></a>
            </div>
        </div>
    </div>`
    };
}

/**
 * Fetches the company logo as a base64 data URI for use in jsPDF
 */
async function fetchLogoBase64() {
    try {
        const response = await fetch('https://www.skytraveljm.com/images/Logo.jpg');
        if (!response.ok) return null;
        const buffer = Buffer.from(await response.arrayBuffer());
        return 'data:image/jpeg;base64,' + buffer.toString('base64');
    } catch (e) {
        console.error('Failed to fetch logo for PDF:', e.message);
        return null;
    }
}

/**
 * Generates a branded account statement PDF from form data
 * Returns a Buffer containing the PDF bytes
 */
function generateStatementPdf(body, logoDataUri) {
    const isSpanish = (body.lang || 'es').toLowerCase().startsWith('es');
    const cur = body.currency || '$';

    const text = isSpanish ? {
        title: 'Estado de Cuenta',
        pilgrimsLabel: 'Peregrinos',
        servicesTitle: 'Servicios',
        descriptionLabel: 'Descripción',
        qtyLabel: 'Cantidad',
        unitPriceLabel: 'Valor Unitario',
        rowTotalLabel: 'Valor Total',
        grandTotalLabel: 'VALOR TOTAL',
        paymentPlanTitle: 'Plan de Pagos',
        valueLabel: 'Valor',
        statusLabel: 'Estado',
        statusPaid: 'Pagado',
        statusPending: 'Pendiente',
        balanceTitle: 'Balance',
        balanceTotalLabel: 'Valor Total',
        balancePaidLabel: 'Valor Abonado',
        balancePendingLabel: 'Valor Pendiente',
        balanceRefundLabel: 'Valor Pendiente Devolución',
        greeting: 'Cliente',
        dateLabel: 'Fecha',
        closing: 'Gracias por su confianza.',
        license: 'Licencia de Vendedor de Viajes (FDACS) No. ST45413'
    } : {
        title: 'Account Statement',
        pilgrimsLabel: 'Pilgrims',
        servicesTitle: 'Services',
        descriptionLabel: 'Description',
        qtyLabel: 'Quantity',
        unitPriceLabel: 'Unit Price',
        rowTotalLabel: 'Total',
        grandTotalLabel: 'GRAND TOTAL',
        paymentPlanTitle: 'Payment Plan',
        valueLabel: 'Value',
        statusLabel: 'Status',
        statusPaid: 'Paid',
        statusPending: 'Pending',
        balanceTitle: 'Balance',
        balanceTotalLabel: 'Total Value',
        balancePaidLabel: 'Amount Paid',
        balancePendingLabel: 'Amount Pending',
        balanceRefundLabel: 'Refund Amount Due',
        greeting: 'Customer',
        dateLabel: 'Date',
        closing: 'Thank you for your trust.',
        license: 'FDACS Seller of Travel License No. ST45413'
    };

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    // Colors
    const gold = [200, 169, 126];
    const dark = [44, 62, 80];
    const gray = [102, 102, 102];
    const textColor = [51, 51, 51];
    const green = [39, 174, 96];
    const orange = [230, 126, 34];

    let y = 40;

    // Helper: check if we need a new page
    function checkPage(needed) {
        if (y + needed > pageHeight - 100) {
            doc.addPage();
            y = 40;
        }
    }

    // --- Logo ---
    if (logoDataUri) {
        doc.addImage(logoDataUri, 'JPEG', (pageWidth - 80) / 2, y, 80, 80);
        y += 95;
    }

    // --- Title ---
    doc.setFontSize(20);
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.text(text.title, pageWidth / 2, y, { align: 'center' });
    y += 20;

    // --- Gold separator ---
    doc.setDrawColor(...gold);
    doc.setLineWidth(2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 20;

    // --- Date ---
    doc.setFontSize(11);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.text(text.dateLabel + ': ', margin, y);
    const dateWidth = doc.getTextWidth(text.dateLabel + ': ');
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(body.date, isSpanish), margin + dateWidth, y);
    y += 24;

    // --- Pilgrims ---
    const pilgrims = (body.pilgrims || []).filter(p => p.trim());
    if (pilgrims.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...dark);
        doc.text(text.pilgrimsLabel + ':', margin, y);
        y += 16;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...textColor);
        pilgrims.forEach(p => {
            checkPage(16);
            doc.text('•  ' + p, margin + 10, y);
            y += 14;
        });
        y += 10;
    }

    // --- Services Table ---
    checkPage(60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.text(text.servicesTitle + ':', margin, y);
    y += 14;

    const rowHeight = 22;
    const svcCol1 = margin;
    const svcCol2 = 280;
    const svcCol3 = 370;
    const svcCol4 = pageWidth - margin;

    // Header
    doc.setFillColor(...gold);
    doc.rect(svcCol1, y, contentWidth, 24, 'F');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(text.descriptionLabel, svcCol1 + 8, y + 16);
    doc.text(text.qtyLabel, svcCol2 + 8, y + 16, { align: 'center' });
    doc.text(text.unitPriceLabel, svcCol3 + 8, y + 16);
    doc.text(text.rowTotalLabel, svcCol4 - 8, y + 16, { align: 'right' });
    y += 24;

    // Rows
    const validServices = (body.services || []).filter(item =>
        item.description && item.description.trim() && parseFloat(item.qty) > 0 && parseFloat(item.unitPrice) > 0
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const descColWidth = svcCol2 - svcCol1 - 16;
    validServices.forEach((item, i) => {
        const descLines = doc.splitTextToSize(item.description || '', descColWidth);
        const lineHeight = 14;
        const actualRowHeight = Math.max(rowHeight, descLines.length * lineHeight + 8);
        checkPage(actualRowHeight);
        doc.setFillColor(i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 245 : 255);
        doc.rect(svcCol1, y, contentWidth, actualRowHeight, 'F');
        doc.setTextColor(...textColor);
        const qty = parseFloat(item.qty || 0);
        const unitPrice = parseFloat(item.unitPrice || 0);
        const rowTotal = qty * unitPrice;
        doc.text(descLines, svcCol1 + 8, y + 15);
        const midY = y + actualRowHeight / 2 + 4;
        doc.text(String(qty), svcCol2 + 8, midY, { align: 'center' });
        doc.text(cur + formatMoney(unitPrice), svcCol3 + 8, midY);
        doc.text(cur + formatMoney(rowTotal), svcCol4 - 8, midY, { align: 'right' });
        y += actualRowHeight;
    });

    // Grand total
    const grandTotal = validServices.reduce((sum, item) => sum + (parseFloat(item.qty || 0) * parseFloat(item.unitPrice || 0)), 0);
    doc.setDrawColor(...gold);
    doc.setLineWidth(2);
    doc.line(svcCol1, y, pageWidth - margin, y);
    y += 4;
    doc.setFillColor(250, 246, 240);
    doc.rect(svcCol1, y, contentWidth, 24, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...dark);
    doc.text(text.grandTotalLabel + ': ' + cur + formatMoney(grandTotal), svcCol4 - 8, y + 16, { align: 'right' });
    y += 38;

    // --- Payment Plan ---
    const paymentPlan = (body.paymentPlan || []).filter(item => item.description && item.description.trim());
    if (paymentPlan.length > 0) {
        checkPage(60);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...dark);
        doc.text(text.paymentPlanTitle + ':', margin, y);
        y += 14;

        // Header
        doc.setFillColor(...gold);
        doc.rect(margin, y, contentWidth, 24, 'F');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(text.descriptionLabel, margin + 8, y + 16);
        doc.text(text.valueLabel, 360, y + 16, { align: 'right' });
        doc.text(text.statusLabel, pageWidth - margin - 8, y + 16, { align: 'right' });
        y += 24;

        doc.setFontSize(10);
        paymentPlan.forEach((item, i) => {
            checkPage(rowHeight);
            doc.setFillColor(i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 245 : 255);
            doc.rect(margin, y, contentWidth, rowHeight, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...textColor);
            doc.text(item.description || '', margin + 8, y + 15);
            doc.text(cur + formatMoney(parseFloat(item.value || 0)), 360, y + 15, { align: 'right' });
            const isPaid = item.status === 'Pagado';
            doc.setTextColor(...(isPaid ? green : orange));
            doc.setFont('helvetica', 'bold');
            doc.text(isPaid ? text.statusPaid : text.statusPending, pageWidth - margin - 8, y + 15, { align: 'right' });
            y += rowHeight;
        });
        y += 14;
    }

    // --- Balance ---
    const paidTotal = (body.paymentPlan || [])
        .filter(item => item.status === 'Pagado')
        .reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
    const pdfDiff = grandTotal - paidTotal;
    const pendingTotal = pdfDiff > 0 ? pdfDiff : 0;
    const refundAmount = pdfDiff < 0 ? Math.abs(pdfDiff) : 0;

    checkPage(80);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.text(text.balanceTitle + ':', margin, y);
    y += 14;

    const red = [196, 30, 58];
    const balanceRows = [
        { label: text.balanceTotalLabel, value: grandTotal, color: dark },
        { label: text.balancePaidLabel, value: paidTotal, color: green },
        { label: text.balancePendingLabel, value: pendingTotal, color: orange }
    ];
    if (refundAmount > 0) {
        balanceRows.push({ label: text.balanceRefundLabel, value: refundAmount, color: red });
    }
    balanceRows.forEach((row, i) => {
        doc.setFillColor(i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 245 : 255);
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...row.color);
        doc.text(row.label, margin + 8, y + 15);
        doc.text(cur + formatMoney(row.value), pageWidth - margin - 8, y + 15, { align: 'right' });
        y += rowHeight;
    });
    y += 24;

    // --- Closing ---
    checkPage(40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...textColor);
    doc.text(text.closing, margin, y);
    y += 18;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...gold);
    doc.text('Sky Travel J&M', margin, y);

    // --- Footer ---
    const footerY = pageHeight - 80;
    doc.setDrawColor(...gold);
    doc.setLineWidth(2);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text('1000 Brickell Ave Ste 715, Miami, FL 33131', pageWidth / 2, footerY + 14, { align: 'center' });
    doc.text('Email: info@skytraveljm.com  |  Phone: +1 (239) 355-4007  |  skytraveljm.com', pageWidth / 2, footerY + 26, { align: 'center' });
    doc.text(text.license, pageWidth / 2, footerY + 38, { align: 'center' });

    const arrayBuffer = doc.output('arraybuffer');
    return Buffer.from(arrayBuffer);
}

exports.handler = async (event, context) => {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    // POST only
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');

        // Validate required fields
        if (!body.customerName || !body.customerName.trim()) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'Customer name is required' })
            };
        }

        if (!body.email || !isValidEmail(body.email.trim())) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'Valid email is required' })
            };
        }

        if (!body.date) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'Date is required' })
            };
        }

        // Validate at least one service item
        if (!body.services || !Array.isArray(body.services) || body.services.length === 0) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'At least one service item is required' })
            };
        }

        const validServices = body.services.filter(item =>
            item.description && item.description.trim() && parseFloat(item.qty) > 0 && parseFloat(item.unitPrice) > 0
        );
        if (validServices.length === 0) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'At least one valid service item is required' })
            };
        }

        // Validate PDF if provided (base64 ~2.67MB = ~2MB file)
        if (body.pdfBase64 && body.pdfBase64.length > 2800000) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'PDF file is too large (max 2MB)' })
            };
        }

        // Check env vars
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.error('RESEND_API_KEY not set');
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'Server configuration error' })
            };
        }

        const resend = new Resend(apiKey);
        const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
        const notificationEmail = process.env.NOTIFICATION_EMAIL || 'info@skytraveljm.com';

        // Build email
        const { subject, html } = buildStatementEmail({ ...body, services: validServices });

        // Prepare email options
        const emailOptions = {
            from: fromEmail,
            to: body.email.trim(),
            bcc: notificationEmail,
            subject: subject,
            html: html
        };

        // Attach uploaded PDF, or generate one from form data
        if (body.pdfBase64) {
            const pdfFilename = body.pdfFilename || 'estado-de-cuenta.pdf';
            emailOptions.attachments = [{
                filename: pdfFilename,
                content: Buffer.from(body.pdfBase64, 'base64')
            }];
        } else {
            const logoDataUri = await fetchLogoBase64();
            const generatedPdf = generateStatementPdf({ ...body, services: validServices }, logoDataUri);
            const isSpanish = (body.lang || 'es').toLowerCase().startsWith('es');
            emailOptions.attachments = [{
                filename: isSpanish ? 'Estado-de-Cuenta-SkyTravel.pdf' : 'Statement-SkyTravel.pdf',
                content: generatedPdf
            }];
        }

        const result = await resend.emails.send(emailOptions);
        console.log('Statement email sent:', result);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ success: true, message: 'Statement sent successfully' })
        };

    } catch (error) {
        console.error('Error sending statement:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'Failed to send statement' })
        };
    }
};
