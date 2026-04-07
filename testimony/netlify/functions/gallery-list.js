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
        const headers = { 'Authorization': `Basic ${auth}` };
        const baseUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources`;
        const qs = `prefix=${encodeURIComponent(folder)}&max_results=500&type=upload`;

        // Fetch images and videos in parallel
        const [imgRes, vidRes] = await Promise.all([
            fetch(`${baseUrl}/image/upload?${qs}`, { headers }),
            fetch(`${baseUrl}/video/upload?${qs}`, { headers })
        ]);

        const imgData = await imgRes.json();
        const vidData = await vidRes.json();

        if (!imgRes.ok && !vidRes.ok) {
            console.error('Cloudinary list error:', imgData, vidData);
            return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load gallery' }) };
        }

        // Transform Cloudinary response to our format
        const imageItems = (imgData.resources || []).map(resource => {
            const thumbnailUrl = resource.secure_url.replace('/upload/', '/upload/c_fill,w_400,h_533,q_80/');
            return {
                url: resource.secure_url,
                thumbnail: thumbnailUrl,
                publicId: resource.public_id,
                resourceType: 'image',
                uploadedAt: resource.created_at
            };
        });

        const videoItems = (vidData.resources || []).map(resource => {
            // For videos, generate a thumbnail poster and use a smaller video for the grid
            const posterUrl = resource.secure_url.replace('/video/upload/', '/video/upload/c_fill,w_400,h_533,so_0/').replace(/\.\w+$/, '.jpg');
            return {
                url: resource.secure_url,
                thumbnail: resource.secure_url,
                poster: posterUrl,
                publicId: resource.public_id,
                resourceType: 'video',
                uploadedAt: resource.created_at
            };
        });

        const photos = [...imageItems, ...videoItems];

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
