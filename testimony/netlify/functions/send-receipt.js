/**
 * ============================================
 * SKY TRAVEL JM - SEND RECEIPT NETLIFY FUNCTION
 * ============================================
 *
 * Sends a branded payment receipt email with PDF attachment to the customer.
 * BCC to manager so they get a copy.
 *
 * ENV VARS: RESEND_API_KEY, FROM_EMAIL, NOTIFICATION_EMAIL
 *
 * Last updated: 2026-03-04
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

function formatMoney(value) {
    return parseFloat(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Formats YYYY-MM-DD date into localized string
 */
function formatDate(dateStr, isSpanish) {
    const months = isSpanish
        ? ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
        : ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const day = parseInt(parts[2], 10);
    const month = months[parseInt(parts[1], 10) - 1];
    const year = parts[0];
    return isSpanish
        ? `${String(day).padStart(2, '0')} de ${month} de ${year}`
        : `${month} ${String(day).padStart(2, '0')}, ${year}`;
}

/**
 * Translates English method values to Spanish
 */
function translateMethod(method, isSpanish) {
    if (!isSpanish || !method) return method || '';
    const map = {
        'Zelle': 'Zelle',
        'Cash': 'Efectivo',
        'Credit Card': 'Tarjeta de Crédito',
        'Wire Transfer': 'Transferencia Bancaria',
        'Check': 'Cheque',
        'Deposit': 'Depósito'
    };
    return map[method] || method;
}

/**
 * Builds the branded receipt HTML email
 */
function buildReceiptEmail(body) {
    const isSpanish = (body.lang || 'es').toLowerCase().startsWith('es');
    const curr = body.currency || '$';

    const text = isSpanish ? {
        subject: 'Recibo de Pago — Sky Travel J&M',
        title: 'Recibo de Pago',
        customerLabel: 'Cliente',
        dateLabel: 'Fecha',
        descriptionLabel: 'Descripción',
        paymentDateLabel: 'Fecha de Pago',
        methodLabel: 'Método',
        amountLabel: 'Monto',
        totalLabel: 'Total',
        greeting: 'Hola',
        message: 'Te enviamos el recibo correspondiente al abono realizado el día {date}. Adjuntamos el recibo en formato PDF para su respectivo registro.',
        closing: 'Gracias por su confianza.',
        teamName: 'Equipo de Sky Travel J&M',
        phone: 'Teléfono',
        website: 'Sitio Web',
        license: 'Licencia de Vendedor de Viajes (FDACS) No. ST45413'
    } : {
        subject: 'Payment Receipt — Sky Travel J&M',
        title: 'Payment Receipt',
        customerLabel: 'Customer',
        dateLabel: 'Date',
        descriptionLabel: 'Description',
        paymentDateLabel: 'Payment Date',
        methodLabel: 'Method',
        amountLabel: 'Amount',
        totalLabel: 'Total',
        greeting: 'Hello',
        message: 'We are sending you the receipt for the payment made on {date}. The receipt is attached in PDF format for your records.',
        closing: 'Thank you for your trust.',
        teamName: 'The Sky Travel J&M Team',
        phone: 'Phone',
        website: 'Website',
        license: 'FDACS Seller of Travel License No. ST45413'
    };

    // Build line items rows
    const lineItemRows = (body.lineItems || []).map(item =>
        `<tr>
            <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#333;">${item.description || ''}</td>
            <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#333;text-align:center;">${item.paymentDate ? formatDate(item.paymentDate, isSpanish) : ''}</td>
            <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#333;text-align:center;">${translateMethod(item.method, isSpanish)}</td>
            <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#333;text-align:right;">${curr}${formatMoney(item.amount)}</td>
        </tr>`
    ).join('');

    const total = (body.lineItems || []).reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

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

            <!-- Line Items Table -->
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                <thead>
                    <tr>
                        <th style="padding:10px 12px;background:#c8a97e;color:#ffffff;font-size:13px;font-weight:600;text-align:left;border:1px solid #c8a97e;">${text.descriptionLabel}</th>
                        <th style="padding:10px 12px;background:#c8a97e;color:#ffffff;font-size:13px;font-weight:600;text-align:center;border:1px solid #c8a97e;">${text.paymentDateLabel}</th>
                        <th style="padding:10px 12px;background:#c8a97e;color:#ffffff;font-size:13px;font-weight:600;text-align:center;border:1px solid #c8a97e;">${text.methodLabel}</th>
                        <th style="padding:10px 12px;background:#c8a97e;color:#ffffff;font-size:13px;font-weight:600;text-align:right;border:1px solid #c8a97e;">${text.amountLabel}</th>
                    </tr>
                </thead>
                <tbody>
                    ${lineItemRows}
                </tbody>
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
 * Generates a branded receipt PDF from form data
 * Returns a Buffer containing the PDF bytes
 */
function generateReceiptPdf(body, logoDataUri) {
    const isSpanish = (body.lang || 'es').toLowerCase().startsWith('es');
    const curr = body.currency || '$';
    const text = isSpanish ? {
        title: 'Recibo de Pago',
        descriptionLabel: 'Descripción',
        paymentDateLabel: 'Fecha de Pago',
        methodLabel: 'Método',
        amountLabel: 'Monto',
        totalLabel: 'Total',
        greeting: 'Recibido de',
        dateLabel: 'Fecha',
        closing: 'Gracias por su confianza.',
        license: 'Licencia de Vendedor de Viajes (FDACS) No. ST45413'
    } : {
        title: 'Payment Receipt',
        descriptionLabel: 'Description',
        paymentDateLabel: 'Payment Date',
        methodLabel: 'Method',
        amountLabel: 'Amount',
        totalLabel: 'Total',
        greeting: 'Received from',
        dateLabel: 'Date',
        closing: 'Thank you for your trust.',
        license: 'FDACS Seller of Travel License No. ST45413'
    };

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    // Colors
    const gold = [200, 169, 126];
    const dark = [44, 62, 80];
    const gray = [102, 102, 102];
    const textColor = [51, 51, 51];

    let y = 40;

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

    // --- Customer & Date ---
    doc.setFontSize(11);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.text(text.greeting + ': ', margin, y);
    const greetingWidth = doc.getTextWidth(text.greeting + ': ');
    doc.setFont('helvetica', 'normal');
    doc.text(body.customerName, margin + greetingWidth, y);
    y += 18;
    doc.setFont('helvetica', 'bold');
    doc.text(text.dateLabel + ': ', margin, y);
    const dateWidth = doc.getTextWidth(text.dateLabel + ': ');
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(body.date, isSpanish), margin + dateWidth, y);
    y += 28;

    // --- Table ---
    const col1X = margin;
    const col2X = 240;
    const col3X = 350;
    const rowHeight = 22;

    // Header
    doc.setFillColor(...gold);
    doc.rect(col1X, y, contentWidth, 24, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(text.descriptionLabel, col1X + 8, y + 16);
    doc.text(text.paymentDateLabel, col2X + 8, y + 16);
    doc.text(text.methodLabel, col3X + 8, y + 16);
    doc.text(text.amountLabel, pageWidth - margin - 8, y + 16, { align: 'right' });
    y += 24;

    // Rows
    const validItems = (body.lineItems || []).filter(item =>
        item.description && item.description.trim() && parseFloat(item.amount) > 0
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    validItems.forEach((item, i) => {
        if (i % 2 === 0) {
            doc.setFillColor(250, 248, 245);
        } else {
            doc.setFillColor(255, 255, 255);
        }
        doc.rect(col1X, y, contentWidth, rowHeight, 'F');
        doc.setTextColor(...textColor);
        doc.text(item.description || '', col1X + 8, y + 15);
        doc.text(item.paymentDate ? formatDate(item.paymentDate, isSpanish) : '', col2X + 8, y + 15);
        doc.text(translateMethod(item.method, isSpanish), col3X + 8, y + 15);
        doc.text(curr + formatMoney(item.amount), pageWidth - margin - 8, y + 15, { align: 'right' });
        y += rowHeight;
    });

    // Table bottom border
    doc.setDrawColor(224, 214, 200);
    doc.setLineWidth(1);
    doc.line(col1X, y, pageWidth - margin, y);
    y += 14;

    // --- Total ---
    const total = validItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.text(text.totalLabel + ':', col2X + 8, y);
    doc.text(curr + formatMoney(total), pageWidth - margin - 8, y, { align: 'right' });
    y += 40;

    // --- Closing ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...textColor);
    doc.text(text.closing, margin, y);
    y += 18;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...gold);
    doc.text('Sky Travel J&M', margin, y);

    // --- Footer ---
    const footerY = doc.internal.pageSize.getHeight() - 80;
    doc.setDrawColor(...gold);
    doc.setLineWidth(2);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text('1000 Brickell Ave Ste 715, Miami, FL 33131', pageWidth / 2, footerY + 14, { align: 'center' });
    doc.text('Email: info@skytraveljm.com  |  Phone: +1 (239) 355-4007  |  skytraveljm.com', pageWidth / 2, footerY + 26, { align: 'center' });
    doc.text(text.license, pageWidth / 2, footerY + 38, { align: 'center' });

    // Return as Buffer
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

        // Validate at least one line item
        if (!body.lineItems || !Array.isArray(body.lineItems) || body.lineItems.length === 0) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'At least one line item is required' })
            };
        }

        const validItems = body.lineItems.filter(item =>
            item.description && item.description.trim() && parseFloat(item.amount) > 0
        );
        if (validItems.length === 0) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'At least one valid line item is required' })
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
        const { subject, html } = buildReceiptEmail({ ...body, lineItems: validItems });

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
            const pdfFilename = body.pdfFilename || 'receipt.pdf';
            emailOptions.attachments = [{
                filename: pdfFilename,
                content: Buffer.from(body.pdfBase64, 'base64')
            }];
        } else {
            const logoDataUri = await fetchLogoBase64();
            const generatedPdf = generateReceiptPdf({ ...body, lineItems: validItems }, logoDataUri);
            const isSpanish = (body.lang || 'es').toLowerCase().startsWith('es');
            emailOptions.attachments = [{
                filename: isSpanish ? 'Recibo-SkyTravel.pdf' : 'Receipt-SkyTravel.pdf',
                content: generatedPdf
            }];
        }

        const result = await resend.emails.send(emailOptions);
        console.log('Receipt email sent:', result);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ success: true, message: 'Receipt sent successfully' })
        };

    } catch (error) {
        console.error('Error sending receipt:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'Failed to send receipt' })
        };
    }
};
