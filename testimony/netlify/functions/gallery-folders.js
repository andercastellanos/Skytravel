const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const PREFIX = 'trip-galleries/';

function extractTripCode(publicId) {
    if (!publicId || !publicId.startsWith(PREFIX)) return null;
    const rest = publicId.slice(PREFIX.length);
    const slash = rest.indexOf('/');
    return slash === -1 ? null : rest.slice(0, slash);
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

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
        const headers = { 'Authorization': `Basic ${auth}` };
        const baseUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources`;
        const qs = `prefix=${encodeURIComponent(PREFIX)}&max_results=500&type=upload`;

        const [imgRes, vidRes] = await Promise.all([
            fetch(`${baseUrl}/image/upload?${qs}`, { headers }),
            fetch(`${baseUrl}/video/upload?${qs}`, { headers })
        ]);

        const imgData = await imgRes.json();
        const vidData = await vidRes.json();

        if (!imgRes.ok && !vidRes.ok) {
            console.error('Cloudinary list error:', imgData, vidData);
            return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Failed to load galleries' }) };
        }

        const codes = new Set();
        [...(imgData.resources || []), ...(vidData.resources || [])].forEach(r => {
            const code = extractTripCode(r.public_id);
            if (code) codes.add(code);
        });

        const folders = [...codes].sort();

        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
            body: JSON.stringify({ ok: true, folders })
        };
    } catch (err) {
        console.error('gallery-folders error:', err);
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Internal server error' }) };
    }
};
