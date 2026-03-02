/**
 * ============================================
 * SKY TRAVEL JM - CONTACT LEAD NETLIFY FUNCTION
 * ============================================
 *
 * This serverless function saves lead capture form submissions to Notion.
 *
 * SETUP INSTRUCTIONS:
 *
 * 1. CREATE NOTION INTEGRATION:
 *    - Go to https://www.notion.so/my-integrations
 *    - Click "New integration"
 *    - Name it "Sky Travel Lead Capture"
 *    - Select your workspace
 *    - Copy the "Internal Integration Token" (starts with "secret_")
 *
 * 2. CREATE NOTION DATABASE:
 *    - Create a new database in Notion with these properties:
 *      - Name (title) - already exists by default
 *      - Email (email type)
 *      - Phone (rich_text)
 *      - Preferred Contact (select) - options: WhatsApp, Texto (SMS), Llamada, Correo
 *      - Pilgrimage Interest (rich_text)
 *      - Message (rich_text)
 *      - Consent Contact (checkbox)
 *      - Consent Marketing (checkbox)
 *      - Source Page (rich_text)
 *      - Submitted At (date)
 *      - UTM Source (rich_text)
 *      - UTM Medium (rich_text)
 *      - UTM Campaign (rich_text)
 *    - Click "..." menu > "Add connections" > select your integration
 *    - Copy the database ID from the URL (the 32-character string before the "?")
 *
 * 3. SET ENVIRONMENT VARIABLES (Netlify Dashboard):
 *    - Go to Site settings > Environment variables
 *    - Add: NOTION_API_KEY = your integration token (secret_...)
 *    - Add: NOTION_DATABASE_ID = your database ID (32 chars)
 *
 * 4. LOCAL DEVELOPMENT:
 *    - Create .env file in project root with same variables
 *    - Run: netlify dev
 *
 * 5. VERIFY IN GA4 DEBUGVIEW:
 *    - Open Chrome DevTools > Network tab
 *    - Submit form and verify events are sent
 *    - Or use GA4 DebugView in real-time
 *
 * Last updated: 2026-01-27
 * ============================================
 */

const { Client } = require('@notionhq/client');
const { Resend } = require('resend');

// CORS headers for cross-origin requests
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/**
 * Validates required fields
 * @param {object} body - Request body
 * @returns {object} { isValid: boolean, missingFields: string[] }
 */
function validateRequiredFields(body) {
    const requiredFields = [
        'firstName',
        'lastName',
        'email',
        'phone',
        'preferredContact',
        'pilgrimageInterest',
        'consentContact'
    ];

    const missingFields = requiredFields.filter(field => {
        const value = body[field];
        if (field === 'consentContact') {
            return value !== true;
        }
        return !value || (typeof value === 'string' && value.trim() === '');
    });

    return {
        isValid: missingFields.length === 0,
        missingFields
    };
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ============================================
// EMAIL NOTIFICATIONS VIA RESEND
// ============================================

/**
 * Builds the manager notification email HTML
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
        ['Name', `${body.firstName} ${body.lastName}`],
        ['Email', body.email],
        ['Phone', body.phone],
        ['Preferred Contact', body.preferredContact],
        ['Pilgrimage Interest', body.pilgrimageInterest],
        ['Message', body.message || '—'],
        ['Source Page', body.sourcePage || '—'],
        ['UTM Source', body.utmSource || '—'],
        ['UTM Medium', body.utmMedium || '—'],
        ['UTM Campaign', body.utmCampaign || '—'],
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
        <h2 style="color:#2c3e50;margin-bottom:16px;">New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            ${tableRows}
        </table>
        <p style="color:#888;font-size:12px;">This is an automated notification from skytraveljm.com</p>
    </div>`;
}

/**
 * Builds the user thank-you email HTML (bilingual based on body.lang)
 * @param {object} body - Form submission data
 * @returns {string} HTML email content
 */
function buildUserThankYouEmail(body) {
    const isSpanish = (body.lang || 'en').toLowerCase().startsWith('es');

    const contactMethodEN = { 'Correo': 'Email', 'Llamada': 'Call', 'Texto (SMS)': 'Text (SMS)' };
    const preferredEN = contactMethodEN[body.preferredContact] || body.preferredContact;

    const text = isSpanish ? {
        greeting: `Hola ${body.firstName},`,
        thankYou: '¡Gracias por tu interés en nuestras peregrinaciones!',
        received: `Hemos recibido tu consulta sobre <strong>${body.pilgrimageInterest}</strong> y te contactaremos pronto a través de <strong>${body.preferredContact}</strong>.`,
        team: 'Nuestro equipo revisará tu información y se pondrá en contacto contigo lo antes posible.',
        closing: 'Que Dios te bendiga,',
        teamName: 'El Equipo de Sky Travel J&M',
        phone: 'Teléfono',
        website: 'Sitio Web'
    } : {
        greeting: `Hello ${body.firstName},`,
        thankYou: 'Thank you for your interest in our pilgrimages!',
        received: `We have received your inquiry about <strong>${body.pilgrimageInterest}</strong> and will contact you soon via <strong>${preferredEN}</strong>.`,
        team: 'Our team will review your information and get back to you as soon as possible.',
        closing: 'God bless,',
        teamName: 'The Sky Travel J&M Team',
        phone: 'Phone',
        website: 'Website'
    };

    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#faf8f5;">
        <!-- Header with logo -->
        <div style="padding:30px;text-align:center;">
            <img src="https://www.skytraveljm.com/images/Logo.jpg" alt="Sky Travel JM" style="max-width:160px;height:auto;" />
        </div>

        <!-- Body -->
        <div style="padding:30px;background:#ffffff;">
            <p style="color:#2c3e50;font-size:16px;margin-bottom:8px;">${text.greeting}</p>
            <p style="color:#2c3e50;font-size:16px;font-weight:600;margin-bottom:16px;">${text.thankYou}</p>
            <p style="color:#333;font-size:15px;line-height:1.6;">${text.received}</p>
            <p style="color:#333;font-size:15px;line-height:1.6;">${text.team}</p>
            <p style="color:#2c3e50;font-size:15px;margin-top:24px;margin-bottom:4px;">${text.closing}</p>
            <p style="color:#c8a97e;font-weight:600;font-size:15px;margin-top:0;">${text.teamName}</p>
        </div>

        <!-- Footer -->
        <div style="border-top:3px solid #c8a97e;padding:20px 30px;text-align:center;background:#faf8f5;">
            <p style="color:#666;font-size:13px;margin:4px 0;">Email: info@skytraveljm.com</p>
            <p style="color:#666;font-size:13px;margin:4px 0;">${text.phone}: +1 (239) 355-4007</p>
            <p style="color:#666;font-size:13px;margin:4px 0;">${text.website}: <a href="https://www.skytraveljm.com" style="color:#c8a97e;">skytraveljm.com</a></p>
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
        console.log('RESEND_API_KEY not set — skipping email notifications');
        return;
    }

    const resend = new Resend(apiKey);
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    const notificationEmail = process.env.NOTIFICATION_EMAIL || 'info@skytraveljm.com';

    const isSpanish = (body.lang || 'en').toLowerCase().startsWith('es');

    const managerEmail = resend.emails.send({
        from: fromEmail,
        to: notificationEmail,
        subject: `New Lead: ${body.firstName} ${body.lastName} — ${body.pilgrimageInterest}`,
        html: buildManagerEmail(body)
    });

    const userEmail = resend.emails.send({
        from: fromEmail,
        to: body.email,
        subject: isSpanish
            ? '¡Gracias por contactarnos! — Sky Travel JM'
            : 'Thank you for reaching out! — Sky Travel JM',
        html: buildUserThankYouEmail(body)
    });

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
 * Main handler function
 */
exports.handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };
    }

    try {
        // Parse request body
        const body = JSON.parse(event.body || '{}');

        // Check honeypot (anti-bot)
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
                    error: `Missing required fields: ${validation.missingFields.join(', ')}`
                })
            };
        }

        // Validate email format
        if (!isValidEmail(body.email)) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'Invalid email format' })
            };
        }

        // Check environment variables
        const notionApiKey = process.env.NOTION_API_KEY;
        const notionDatabaseId = process.env.NOTION_DATABASE_ID;

        if (!notionApiKey || !notionDatabaseId) {
            console.error('Missing Notion environment variables');
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'Server configuration error' })
            };
        }

        // Initialize Notion client
        const notion = new Client({ auth: notionApiKey });

        // Prepare page properties for Notion
        const pageProperties = {
            // Name (title) - combines first and last name
            'Name': {
                title: [
                    {
                        text: {
                            content: `${body.firstName.trim()} ${body.lastName.trim()}`
                        }
                    }
                ]
            },
            // Email (email type)
            'Email': {
                email: body.email.trim()
            },
            // Phone (rich_text)
            'Phone': {
                rich_text: [
                    {
                        text: {
                            content: body.phone.trim()
                        }
                    }
                ]
            },
            // Preferred Contact (select)
            'Preferred Contact': {
                select: {
                    name: body.preferredContact
                }
            },
            // Pilgrimage Interest (rich_text)
            'Pilgrimage Interest': {
                rich_text: [
                    {
                        text: {
                            content: body.pilgrimageInterest.trim().substring(0, 2000)
                        }
                    }
                ]
            },
            // Consent Contact (checkbox)
            'Consent Contact': {
                checkbox: body.consentContact === true
            },
            // Consent Marketing (checkbox)
            'Consent Marketing': {
                checkbox: body.consentMarketing === true
            },
            // Source Page (rich_text)
            'Source Page': {
                rich_text: [
                    {
                        text: {
                            content: body.sourcePage || ''
                        }
                    }
                ]
            },
            // Submitted At (date)
            'Submitted At': {
                date: {
                    start: new Date().toISOString()
                }
            }
        };

        // Add Message if provided (optional)
        if (body.message && body.message.trim()) {
            pageProperties['Message'] = {
                rich_text: [
                    {
                        text: {
                            content: body.message.trim().substring(0, 2000)
                        }
                    }
                ]
            };
        }

        // Add UTM parameters if provided (optional)
        if (body.utmSource) {
            pageProperties['UTM Source'] = {
                rich_text: [{ text: { content: body.utmSource.substring(0, 200) } }]
            };
        }
        if (body.utmMedium) {
            pageProperties['UTM Medium'] = {
                rich_text: [{ text: { content: body.utmMedium.substring(0, 200) } }]
            };
        }
        if (body.utmCampaign) {
            pageProperties['UTM Campaign'] = {
                rich_text: [{ text: { content: body.utmCampaign.substring(0, 200) } }]
            };
        }

        // Create page in Notion database
        const response = await notion.pages.create({
            parent: {
                database_id: notionDatabaseId
            },
            properties: pageProperties
        });

        console.log('Lead saved to Notion:', response.id);

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
                message: 'Lead saved successfully',
                id: response.id
            })
        };

    } catch (error) {
        console.error('Error saving lead:', error);

        // Handle specific Notion errors
        let errorMessage = 'Failed to save lead';
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
            body: JSON.stringify({
                success: false,
                error: errorMessage
            })
        };
    }
};
