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
