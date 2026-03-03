/**
 * ============================================
 * SKY TRAVEL JM - BLOG SUBSCRIBE NETLIFY FUNCTION
 * ============================================
 *
 * Saves blog subscription form submissions to a Notion database.
 *
 * NOTION DATABASE PROPERTIES:
 *   - Name (title)
 *   - Email (email)
 *   - Phone (rich_text)
 *   - Notification Preference (select: "WhatsApp", "Correo")
 *   - Submitted At (date)
 *   - Source Page (rich_text)
 *
 * ENVIRONMENT VARIABLES:
 *   - NOTION_API_KEY (existing)
 *   - NOTION_BLOG_DB_ID (new — fallback to hardcoded ID below)
 *
 * Last updated: 2026-02-24
 * ============================================
 */

const { Client } = require('@notionhq/client');
const { Resend } = require('resend');

const FALLBACK_DB_ID = '311dbf8a7fa0804c9ad2ed39878cab47';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/**
 * Validates required fields
 * Email and phone are conditionally required based on notificationPref:
 *   - "Correo" (Email) → email required
 *   - "WhatsApp" → phone required
 */
function validateRequiredFields(body) {
    const alwaysRequired = ['name', 'notificationPref', 'consentSubscribe'];

    const missingFields = alwaysRequired.filter(function (field) {
        var value = body[field];
        if (field === 'consentSubscribe') {
            return value !== true;
        }
        return !value || (typeof value === 'string' && value.trim() === '');
    });

    // Conditional: email required when preference is "Correo"
    if (body.notificationPref === 'Correo') {
        if (!body.email || (typeof body.email === 'string' && body.email.trim() === '')) {
            missingFields.push('email');
        }
    }

    // Conditional: phone required when preference is "WhatsApp"
    if (body.notificationPref === 'WhatsApp') {
        if (!body.phone || (typeof body.phone === 'string' && body.phone.trim() === '')) {
            missingFields.push('phone');
        }
    }

    return {
        isValid: missingFields.length === 0,
        missingFields: missingFields
    };
}

/**
 * Validates email format
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================
// EMAIL NOTIFICATIONS VIA RESEND
// ============================================

/**
 * Builds the manager notification email for a new blog subscriber
 * @param {object} body - Form submission data
 * @returns {string} HTML email content
 */
function buildManagerEmail(body) {
    const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        dateStyle: 'medium',
        timeStyle: 'short'
    });

    const rows = [
        ['Name', body.name],
        ['Email', body.email || '—'],
        ['Phone', body.phone || '—'],
        ['Preferred Contact', body.notificationPref],
        ['Source Page', body.sourcePage || '—'],
        ['Submitted At', timestamp]
    ];

    const tableRows = rows.map(([label, value]) =>
        `<tr>
            <td style="padding:8px 12px;border:1px solid #ddd;background:#f5f5f5;font-weight:600;width:180px;">${label}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;">${value}</td>
        </tr>`
    ).join('');

    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#2c3e50;margin-bottom:16px;">New Blog Subscriber</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            ${tableRows}
        </table>
        <p style="color:#888;font-size:12px;">This is an automated notification from skytraveljm.com</p>
    </div>`;
}

/**
 * Builds the user thank-you email for blog subscription (bilingual)
 * @param {object} body - Form submission data
 * @returns {string} HTML email content
 */
function buildUserThankYouEmail(body) {
    const isSpanish = (body.lang || 'en').toLowerCase().startsWith('es');
    const firstName = body.name.trim().split(' ')[0];

    const notifMethodEN = { 'Correo': 'Email' };
    const notifEN = notifMethodEN[body.notificationPref] || body.notificationPref;

    const text = isSpanish ? {
        greeting: `Hola ${firstName},`,
        thankYou: '¡Gracias por suscribirte a nuestro blog!',
        body: 'Te notificaremos cuando publiquemos nuevos artículos sobre peregrinaciones, destinos sagrados, y guías de viaje espiritual.',
        notify: `Recibirás notificaciones a través de <strong>${body.notificationPref}</strong>.`,
        closing: 'Que Dios te bendiga,',
        teamName: 'Equipo de Sky Travel J&M',
        phone: 'Teléfono',
        website: 'Sitio Web'
    } : {
        greeting: `Hello ${firstName},`,
        thankYou: 'Thank you for subscribing to our blog!',
        body: 'We\'ll notify you when we publish new articles about pilgrimages, sacred destinations, and spiritual travel guides.',
        notify: `You\'ll receive notifications via <strong>${notifEN}</strong>.`,
        closing: 'God bless,',
        teamName: 'The Sky Travel J&M Team',
        phone: 'Phone',
        website: 'Website'
    };

    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#faf8f5;">
        <!-- Header with logo -->
        <div style="padding:30px;text-align:center;">
            <img src="https://www.skytraveljm.com/images/Logo.jpg" alt="Sky Travel J&amp;M" style="max-width:160px;height:auto;" />
        </div>

        <!-- Body -->
        <div style="padding:30px;background:#ffffff;">
            <p style="color:#2c3e50;font-size:16px;margin-bottom:8px;">${text.greeting}</p>
            <p style="color:#2c3e50;font-size:16px;font-weight:600;margin-bottom:16px;">${text.thankYou}</p>
            <p style="color:#333;font-size:15px;line-height:1.6;">${text.body}</p>
            <p style="color:#333;font-size:15px;line-height:1.6;">${text.notify}</p>
            <p style="color:#2c3e50;font-size:15px;margin-top:24px;margin-bottom:4px;">${text.closing}</p>
            <p style="color:#c8a97e;font-weight:600;font-size:15px;margin-top:0;">${text.teamName}</p>
        </div>

        <!-- Footer -->
        <div style="border-top:3px solid #c8a97e;padding:20px 30px;text-align:center;background:#faf8f5;">
            <p style="color:#666;font-size:13px;margin:2px 0;">Email: info@skytraveljm.com</p>
            <p style="color:#666;font-size:13px;margin:2px 0;">${text.phone}: +1 (239) 355-4007</p>
            <p style="color:#666;font-size:13px;margin:2px 0;">${text.website}: <a href="https://www.skytraveljm.com" style="color:#c8a97e;">skytraveljm.com</a></p>
            <div style="margin-top:12px;">
                <a href="https://www.facebook.com/skytraveljm" style="color:#c8a97e;text-decoration:none;margin:0 8px;">Facebook</a>
                <a href="https://www.instagram.com/skytraveljm" style="color:#c8a97e;text-decoration:none;margin:0 8px;">Instagram</a>
            </div>
        </div>
    </div>`;
}

/**
 * Sends manager notification and user thank-you emails via Resend (best-effort)
 * @param {object} body - Form submission data
 */
async function sendEmails(body) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.log('RESEND_API_KEY not set — skipping blog subscribe email notifications');
        return;
    }

    const resend = new Resend(apiKey);
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    const notificationEmail = process.env.NOTIFICATION_EMAIL || 'info@skytraveljm.com';

    const isSpanish = (body.lang || 'en').toLowerCase().startsWith('es');

    const managerEmail = resend.emails.send({
        from: fromEmail,
        to: notificationEmail,
        subject: `New Blog Subscriber: ${body.name}`,
        html: buildManagerEmail(body)
    });

    // Only send user thank-you if we have an email address
    const userEmail = body.email && body.email.trim()
        ? resend.emails.send({
            from: fromEmail,
            to: body.email,
            subject: isSpanish
                ? '¡Gracias por suscribirte! — Sky Travel J&M'
                : 'Thanks for subscribing! — Sky Travel J&M',
            html: buildUserThankYouEmail(body)
        })
        : Promise.resolve({ data: null, error: null });

    const results = await Promise.allSettled([managerEmail, userEmail]);

    results.forEach((result, i) => {
        const label = i === 0 ? 'Manager notification' : 'User thank-you';
        if (result.status === 'fulfilled') {
            console.log(`${label} email sent:`, result.value);
        } else {
            console.error(`${label} email failed:`, result.reason);
        }
    });
}

/**
 * Main handler
 */
exports.handler = async (event) => {
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

        // Honeypot check
        if (body.website) {
            console.log('Honeypot triggered - rejecting submission');
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'Invalid submission' })
            };
        }

        // Validate required fields
        const validation = validateRequiredFields(body);
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: 'Missing required fields: ' + validation.missingFields.join(', ')
                })
            };
        }

        // Validate email format (only if email is provided)
        if (body.email && body.email.trim() && !isValidEmail(body.email)) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'Invalid email format' })
            };
        }

        // Environment variables
        const notionApiKey = process.env.NOTION_API_KEY;
        const notionDatabaseId = process.env.NOTION_BLOG_DB_ID || FALLBACK_DB_ID;

        if (!notionApiKey) {
            console.error('Missing NOTION_API_KEY environment variable');
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'Server configuration error' })
            };
        }

        // Initialize Notion client
        const notion = new Client({ auth: notionApiKey });

        // Prepare Notion page properties
        const pageProperties = {
            'Name': {
                title: [{ text: { content: body.name.trim() } }]
            },
            'Email': {
                email: (body.email && body.email.trim()) ? body.email.trim() : null
            },
            'Phone': {
                rich_text: [{ text: { content: (body.phone || '').trim() } }]
            },
            'Preferred Contact': {
                select: { name: body.notificationPref }
            },
            'Submitted At': {
                date: { start: new Date().toISOString() }
            },
            'Source Page': {
                rich_text: [{ text: { content: body.sourcePage || '' } }]
            }
        };

        // Create page in Notion
        const response = await notion.pages.create({
            parent: { database_id: notionDatabaseId },
            properties: pageProperties
        });

        console.log('Blog subscription saved to Notion:', response.id);

        // Send email notifications (best-effort — failure does not break form)
        try {
            await sendEmails(body);
        } catch (emailError) {
            console.error('Email sending failed (non-blocking):', emailError);
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Subscription saved successfully',
                id: response.id
            })
        };

    } catch (error) {
        console.error('Error saving blog subscription:', error);

        var errorMessage = 'Failed to save subscription';
        if (error.code === 'validation_error') {
            errorMessage = 'Database validation error - check property names match';
        } else if (error.code === 'unauthorized') {
            errorMessage = 'Notion API key invalid or integration not connected to database';
        } else if (error.code === 'object_not_found') {
            errorMessage = 'Notion database not found - check database ID';
        }

        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: errorMessage })
        };
    }
};
