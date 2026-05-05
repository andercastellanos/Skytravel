const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const PREFIX = 'trip-galleries/';

function tripCodeFromResource(r) {
    const af = r.asset_folder || r.folder || '';
    if (af && af.startsWith(PREFIX)) {
        const sub = af.slice(PREFIX.length).split('/')[0];
        if (sub) return sub;
    }
    const pid = r.public_id || '';
    if (pid.startsWith(PREFIX)) {
        const rest = pid.slice(PREFIX.length);
        const slash = rest.indexOf('/');
        if (slash !== -1) return rest.slice(0, slash);
    }
    return null;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };

    try {
        const { code } = JSON.parse(event.body || '{}');
        if (!code || code !== process.env.EMPLOYEE_PORTAL_CODE) {
            return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ ok: false, error: 'Unauthorized' }) };
        }

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME_GALLERY;
        const apiKey = process.env.CLOUDINARY_API_KEY_GALLERY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET_GALLERY;
        if (!cloudName || !apiKey || !apiSecret) {
            return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Cloudinary not configured' }) };
        }

        const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
        const baseUrl = `https://api.cloudinary.com/v1_1/${cloudName}`;
        const basicHeaders = { 'Authorization': `Basic ${auth}` };
        const jsonHeaders = { ...basicHeaders, 'Content-Type': 'application/json' };
        const codes = new Set();

        // List images by public_id prefix (covers fixed-folders mode)
        const prefRes = await fetch(`${baseUrl}/resources/image/upload?prefix=${encodeURIComponent(PREFIX)}&max_results=500`, { headers: basicHeaders });
        if (prefRes.ok) {
            const prefData = await prefRes.json();
            (prefData.resources || []).forEach(r => {
                const c = tripCodeFromResource(r);
                if (c) codes.add(c);
            });
        }

        // Search by asset_folder (covers dynamic-folders mode)
        const searchAfRes = await fetch(`${baseUrl}/resources/search`, {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify({ expression: `asset_folder:${PREFIX}*`, max_results: 500 })
        });
        if (searchAfRes.ok) {
            const searchAfData = await searchAfRes.json();
            (searchAfData.resources || []).forEach(r => {
                const c = tripCodeFromResource(r);
                if (c) codes.add(c);
            });
        }

        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
            body: JSON.stringify({ ok: true, folders: [...codes].sort() })
        };
    } catch (err) {
        console.error('gallery-folders error:', err);
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Internal server error' }) };
    }
};
