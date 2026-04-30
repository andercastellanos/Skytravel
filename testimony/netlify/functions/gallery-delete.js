const crypto = require('crypto');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { publicId, resourceType } = body;

        if (!publicId) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing publicId' }) };
        }

        const resType = resourceType === 'video' ? 'video' : 'image';

        // Ensure the publicId is within the trip-galleries folder (security check)
        if (!publicId.startsWith('trip-galleries/')) {
            return { statusCode: 403, body: JSON.stringify({ error: 'Cannot delete resources outside trip-galleries' }) };
        }

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME_GALLERY;
        const apiKey = process.env.CLOUDINARY_API_KEY_GALLERY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET_GALLERY;

        if (!cloudName || !apiKey || !apiSecret) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Cloudinary not configured' }) };
        }

        const timestamp = String(Math.round(Date.now() / 1000));

        // Generate signature for destroy API
        const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(toSign).digest('hex');

        const params = new URLSearchParams();
        params.append('public_id', publicId);
        params.append('timestamp', timestamp);
        params.append('signature', signature);
        params.append('api_key', apiKey);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/${resType}/destroy`,
            { method: 'POST', body: params }
        );

        const result = await response.json();

        if (result.result !== 'ok') {
            console.error('Cloudinary delete error:', result);
            return { statusCode: 500, body: JSON.stringify({ error: 'Delete failed' }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };
    } catch (err) {
        console.error('Gallery delete error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
    }
};
