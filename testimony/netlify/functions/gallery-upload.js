const crypto = require('crypto');

exports.handler = async (event) => {
    // Only POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { tripCode, photo } = body;

        if (!tripCode || !photo || !photo.data || !photo.type) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
        }

        // Validate trip code format (lowercase, hyphens, numbers only)
        if (!/^[a-z0-9-]+$/.test(tripCode)) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid trip code format' }) };
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(photo.type)) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid file type' }) };
        }

        // Check base64 size (~10MB limit: base64 is ~33% larger than binary)
        if (photo.data.length > 14 * 1024 * 1024) {
            return { statusCode: 400, body: JSON.stringify({ error: 'File too large' }) };
        }

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME_GALLERY;
        const apiKey = process.env.CLOUDINARY_API_KEY_GALLERY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET_GALLERY;

        if (!cloudName || !apiKey || !apiSecret) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Cloudinary not configured' }) };
        }

        const timestamp = String(Math.round(Date.now() / 1000));
        const folder = `trip-galleries/${tripCode}`;
        const publicId = `img_${Date.now()}`;

        // Generate signature (params sorted alphabetically + api_secret)
        const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(toSign).digest('hex');

        const dataUri = `data:${photo.type};base64,${photo.data}`;

        const formData = new FormData();
        formData.append('file', dataUri);
        formData.append('folder', folder);
        formData.append('public_id', publicId);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        formData.append('api_key', apiKey);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: 'POST', body: formData }
        );

        const result = await response.json();

        if (!response.ok) {
            console.error('Cloudinary error:', result);
            return { statusCode: 500, body: JSON.stringify({ error: result.error?.message || 'Upload failed' }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                url: result.secure_url,
                publicId: result.public_id
            })
        };
    } catch (err) {
        console.error('Gallery upload error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
    }
};
