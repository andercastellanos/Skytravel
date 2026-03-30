exports.handler = async (event) => {
    // Only GET
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const tripCode = event.queryStringParameters?.tripCode;

        if (!tripCode) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing tripCode parameter' }) };
        }

        // Validate trip code format
        if (!/^[a-z0-9-]+$/.test(tripCode)) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid trip code format' }) };
        }

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME_GALLERY;
        const apiKey = process.env.CLOUDINARY_API_KEY_GALLERY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET_GALLERY;

        if (!cloudName || !apiKey || !apiSecret) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Cloudinary not configured' }) };
        }

        const folder = `trip-galleries/${tripCode}`;

        // Use Cloudinary Admin API to list resources in a folder
        // Auth: Basic auth with api_key:api_secret
        const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload?prefix=${encodeURIComponent(folder)}&max_results=500&type=upload`,
            {
                headers: {
                    'Authorization': `Basic ${auth}`
                }
            }
        );

        const result = await response.json();

        if (!response.ok) {
            console.error('Cloudinary list error:', result);
            return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load gallery' }) };
        }

        // Transform Cloudinary response to our format
        const photos = (result.resources || []).map(resource => {
            // Generate thumbnail URL using Cloudinary transformations
            // c_fill = crop to fill, w_400 h_533 = 3:4 aspect ratio at 400px width
            const thumbnailUrl = resource.secure_url.replace('/upload/', '/upload/c_fill,w_400,h_533,q_80/');

            return {
                url: resource.secure_url,
                thumbnail: thumbnailUrl,
                publicId: resource.public_id,
                uploadedAt: resource.created_at
            };
        });

        // Sort newest first
        photos.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

        return {
            statusCode: 200,
            headers: {
                'Cache-Control': 'public, max-age=30'
            },
            body: JSON.stringify({
                success: true,
                tripCode,
                photos
            })
        };
    } catch (err) {
        console.error('Gallery list error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
    }
};
