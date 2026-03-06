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

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
 * Builds the branded receipt HTML email
 */
function buildReceiptEmail(body) {
    const isSpanish = (body.lang || 'es').toLowerCase().startsWith('es');

    const text = isSpanish ? {
        subject: 'Recibo de Pago — Sky Travel J&M',
        title: 'Recibo de Pago',
        customerLabel: 'Cliente',
        dateLabel: 'Fecha',
        descriptionLabel: 'Descripción',
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
            <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#333;text-align:center;">${item.method || ''}</td>
            <td style="padding:10px 12px;border:1px solid #e0d6c8;font-size:14px;color:#333;text-align:right;">$${parseFloat(item.amount || 0).toFixed(2)}</td>
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

        // Attach PDF if provided
        if (body.pdfBase64) {
            const pdfFilename = body.pdfFilename || 'receipt.pdf';
            emailOptions.attachments = [{
                filename: pdfFilename,
                content: Buffer.from(body.pdfBase64, 'base64')
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
