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
            'Notification Preference': {
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
