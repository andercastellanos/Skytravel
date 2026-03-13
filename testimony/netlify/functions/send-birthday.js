/**
 * ============================================
 * SKY TRAVEL JM - SEND BIRTHDAY GREETING NETLIFY FUNCTION
 * ============================================
 *
 * Sends a branded birthday greeting email with an image
 * hosted on Cloudinary (public URL) so it renders on all
 * email clients including Gmail web/desktop.
 *
 * ENV VARS: RESEND_API_KEY, FROM_EMAIL, NOTIFICATION_EMAIL,
 *           CLOUDINARY_CLOUD_NAME_BIRTHDAY, CLOUDINARY_API_KEY_BIRTHDAY, CLOUDINARY_API_SECRET_BIRTHDAY
 *
 * Last updated: 2026-03-10
 * ============================================
 */

const { Resend } = require('resend');
const crypto = require('crypto');

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Uploads a base64 image to Cloudinary and returns the public URL.
 * Uses Cloudinary's REST API with signed upload — no SDK needed.
 */
async function uploadToCloudinary(base64Data, mimeType) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME_BIRTHDAY;
    const apiKey = process.env.CLOUDINARY_API_KEY_BIRTHDAY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET_BIRTHDAY;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary environment variables not configured');
    }

    const timestamp = String(Math.round(Date.now() / 1000));
    const folder = 'birthday-greetings';

    // Generate signature (params sorted alphabetically + api_secret)
    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    const dataUri = `data:${mimeType};base64,${base64Data}`;

    const formData = new FormData();
    formData.append('file', dataUri);
    formData.append('folder', folder);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('api_key', apiKey);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error?.message || 'Cloudinary upload failed');
    }

    return result.secure_url;
}

/**
 * Builds the branded birthday greeting HTML email
 */
function buildBirthdayEmail(body) {
    const isSpanish = (body.lang || 'es').toLowerCase().startsWith('es');
    const hasImage = !!body.imageUrl;

    const text = isSpanish ? {
        subject: '¡Feliz Cumpleaños! — Sky Travel J&M',
        title: '¡Feliz Cumpleaños, {name}!',
        closing: 'Con cariño,',
        teamName: 'Equipo de Sky Travel J&M',
        phone: 'Teléfono',
        website: 'Sitio Web',
        license: 'Licencia de Vendedor de Viajes (FDACS) No. ST45413'
    } : {
        subject: 'Happy Birthday! — Sky Travel J&M',
        title: 'Happy Birthday, {name}!',
        closing: 'With love,',
        teamName: 'The Sky Travel J&M Team',
        phone: 'Phone',
        website: 'Website',
        license: 'FDACS Seller of Travel License No. ST45413'
    };

    const imageHtml = hasImage
        ? `<div style="text-align:center;margin:24px 0;">
            <img src="${body.imageUrl}" alt="" style="max-width:100%;height:auto;border-radius:12px;" />
           </div>`
        : '';

    // Convert newlines in message to <br> tags for email rendering
    const formattedMessage = (body.message || '').replace(/\n/g, '<br>');

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
            <h1 style="color:#2c3e50;font-size:22px;margin:0 0 20px 0;text-align:center;">${text.title.replace('{name}', body.name)}</h1>

            <p style="color:#333;font-size:15px;margin:0 0 20px 0;line-height:1.6;">${formattedMessage}</p>

            ${imageHtml}

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
        if (!body.name || !body.name.trim()) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'Name is required' })
            };
        }

        if (!body.email || !isValidEmail(body.email.trim())) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'Valid email is required' })
            };
        }

        if (!body.message || !body.message.trim()) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'Message is required' })
            };
        }

        // Validate image if provided (base64 ~2.8MB ≈ ~2MB file)
        if (body.imageBase64 && body.imageBase64.length > 2800000) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'Image file is too large (max 2MB)' })
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

        // Upload image to Cloudinary if provided
        let imageUrl = null;
        if (body.imageBase64) {
            const mimeType = body.imageMimeType || 'image/jpeg';
            imageUrl = await uploadToCloudinary(body.imageBase64, mimeType);
        }

        // Build email
        const { subject, html } = buildBirthdayEmail({ ...body, imageUrl });

        // Prepare email options
        const emailOptions = {
            from: fromEmail,
            to: body.email.trim(),
            bcc: notificationEmail,
            subject: subject,
            html: html
        };

        const result = await resend.emails.send(emailOptions);
        console.log('Birthday email sent:', result);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ success: true, message: 'Birthday greeting sent successfully' })
        };

    } catch (error) {
        console.error('Error sending birthday greeting:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'Failed to send birthday greeting' })
        };
    }
};
