/**
 * =============================================================================
 * 📄 NETLIFY SERVERLESS FUNCTION - TESTIMONY SUBMISSION (CLOUDINARY VERSION)
 * 🌐 File: netlify/functions/submit-testimony.js
 * 📝 Purpose: Receive form submissions → Upload to Cloudinary → Create GitHub Issues
 * 🔗 Called by: testimony-form.js from enviar-testimonio.html & submit-testimonial.html
 * =============================================================================
 */

const https = require('https');
const crypto = require('crypto');
const querystring = require('querystring');

// Configuration - Set these as Netlify environment variables
const CONFIG = {
    github: {
        owner: 'andercastellanos',
        repo: 'Skytravel',
        token: process.env.GITHUB_TOKEN,
        apiBase: 'https://api.github.com'
    },
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET
    }
};

/**
 * Main Netlify function handler
 */
exports.handler = async (event, context) => {
    // Environment variable sanity check
    if (!CONFIG.github.token) console.error('❌ Missing GITHUB_TOKEN');
    ['cloudName','apiKey','apiSecret'].forEach(k => {
        if (!CONFIG.cloudinary[k]) console.error(`❌ Missing CLOUDINARY_${k.toUpperCase()}`);
    });

    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                error: 'Method not allowed. Only POST requests accepted.' 
            })
        };
    }

    try {
        console.log('📥 Received testimony submission');

        // Parse request body
        const requestData = JSON.parse(event.body);
        
        // Validate required fields
        const validation = validateSubmission(requestData);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: validation.error 
                })
            };
        }

        console.log('✅ Submission validation passed');

        // Upload media if provided
        let mediaUrl = null;
        let mediaType = null;
        if (requestData.photo) {
            console.log('📸 Uploading media to Cloudinary...');
            const uploadResult = await uploadPhoto(requestData.photo);
            mediaUrl = uploadResult.url;
            mediaType = uploadResult.type;
            console.log('✅ Media uploaded:', mediaUrl);
        }

        // Create GitHub issue
        console.log('🐙 Creating GitHub issue...');
        const issueUrl = await createGitHubIssue(requestData, mediaUrl, mediaType);
        console.log('✅ GitHub issue created:', issueUrl);

        // Return success response
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Testimony submitted successfully',
                issueUrl: issueUrl,
                mediaUrl: mediaUrl
            })
        };

    } catch (error) {
        console.error('❌ Error processing submission:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error. Please try again later.',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};

/**
 * Validate form submission data
 */
function validateSubmission(data) {
    const required = ['name', 'trip', 'testimony', 'language'];
    
    for (const field of required) {
        if (!data[field] || typeof data[field] !== 'string' || data[field].trim().length === 0) {
            return {
                valid: false,
                error: `Missing or empty required field: ${field}`
            };
        }
    }

    // Validate field lengths
    if (data.name.length > 100) {
        return { valid: false, error: 'Name too long (max 100 characters)' };
    }

    if (data.trip.length > 200) {
        return { valid: false, error: 'Trip information too long (max 200 characters)' };
    }

    if (data.testimony.length < 50) {
        return { valid: false, error: 'Testimony too short (minimum 50 characters)' };
    }

    if (data.testimony.length > 2000) {
        return { valid: false, error: 'Testimony too long (max 2000 characters)' };
    }

    // Validate email if provided
    if (data.email && data.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            return { valid: false, error: 'Invalid email format' };
        }
    }

    // Validate media file if provided
    if (data.photo) {
        if (!data.photo.data || !data.photo.type) {
            return { valid: false, error: 'Invalid file data' };
        }

        // Allow both images and videos (optimized for web)
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm'  // Trimmed to lighter web formats
        ];
        if (!allowedTypes.includes(data.photo.type)) {
            return { 
                valid: false, 
                error: 'Invalid file format. Only JPG, PNG, GIF, WebP, MP4, WebM allowed' 
            };
        }

        // Check base64 data size (approximate file size) - increased to 25MB for videos
        const sizeBytes = (data.photo.data.length * 3/4) - 2;
        const maxSize = 25 * 1024 * 1024; // 25MB
        if (sizeBytes > maxSize) {
            return { valid: false, error: 'File too large. Maximum 25MB allowed' };
        }
    }

    return { valid: true };
}

/**
 * Upload media to Cloudinary
 */
async function uploadPhoto(file) {
    const uploaded = await uploadToCloudinary(file);
    return { url: uploaded.url, type: uploaded.type };
}

/**
 * Upload file to Cloudinary with auto-detection (image/video)
 */
function uploadToCloudinary(file) {
    return new Promise((resolve, reject) => {
        // Check if Cloudinary is configured
        if (!CONFIG.cloudinary.cloudName || !CONFIG.cloudinary.apiKey || !CONFIG.cloudinary.apiSecret) {
            return reject(new Error('Cloudinary environment variables not set'));
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const toSign = `timestamp=${timestamp}`;
        const signature = crypto
            .createHash('sha1')
            .update(toSign + CONFIG.cloudinary.apiSecret)
            .digest('hex');

        const payload = querystring.stringify({
            file: `data:${file.type};base64,${file.data}`,
            api_key: CONFIG.cloudinary.apiKey,
            timestamp,
            signature
        });

        const options = {
            hostname: 'api.cloudinary.com',
            port: 443,
            path: `/v1_1/${CONFIG.cloudinary.cloudName}/auto/upload`, // 'auto' detects image vs video
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    
                    if (res.statusCode >= 200 && res.statusCode < 300 && response.secure_url) {
                        resolve({ 
                            url: response.secure_url, 
                            type: response.resource_type || 'image' // 'image' or 'video'
                        });
                    } else {
                        reject(new Error(
                            response.error?.message || 
                            `Cloudinary upload failed (${res.statusCode})`
                        ));
                    }
                } catch (error) {
                    reject(new Error('Invalid Cloudinary response'));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(payload);
        req.end();
    });
}

/**
 * Create GitHub issue with YAML front matter format
 */
async function createGitHubIssue(formData, mediaUrl, mediaType) {
    // Prepare YAML front matter
    const yamlData = {
        name: formData.name.trim(),
        trip: formData.trip.trim(),
        language: formData.language,
        featured: false,
        verified: false,
        rating: "5",
        tags: "pilgrimage, faith, testimony"
    };

    // Create issue body with YAML front matter
    let issueBody = '---\n';
    Object.entries(yamlData).forEach(([key, value]) => {
        issueBody += `${key}: "${value}"\n`;
    });
    issueBody += '---\n\n';

    // Add testimony content
    issueBody += formData.testimony.trim();

    // Add media if available
    if (mediaUrl) {
        issueBody += '\n\n## Media del Testimonio\n\n';
        
        if (mediaType === 'video' || /\.(mp4|webm)(\?|$)/i.test(mediaUrl)) {
            // For videos, include as a link with better poster thumbnail
            issueBody += `**Video del Testimonio:** [Ver Video](${mediaUrl})\n\n`;
            
            // Generate reliable first-frame poster thumbnail using Cloudinary
            const poster = mediaUrl
                .replace('/upload/', '/upload/so_1,w_400,h_300,c_fill,f_jpg/')
                .replace(/(\.mp4|\.webm)(\?.*)?$/i, '.jpg$2');
            
            issueBody += `[![Video thumbnail](${poster})](${mediaUrl})\n`;
        } else {
            // For images, embed directly
            issueBody += `![Foto del Testimonio](${mediaUrl})\n`;
        }
    }

    // Add metadata
    issueBody += '\n\n---\n';
    issueBody += `**Enviado:** ${new Date().toLocaleDateString('es-ES')}\n`;
    if (formData.email && formData.email.trim()) {
        issueBody += `**Email de contacto:** ${formData.email.trim()}\n`;
    }

    // Prepare GitHub API request
    const issueData = {
        title: `[${formData.language === 'es' ? 'Testimonio' : 'Testimony'}] ${formData.name} - ${formData.trip}`,
        body: issueBody,
        labels: ['testimony', 'needs-review'],
        assignees: ['andercastellanos', 'jandrearuiz'] // add Andrea
    };

    // Robust GitHub API call with retry logic
    function postIssue(issueData) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(issueData);
            const options = {
                hostname: 'api.github.com',
                port: 443,
                path: `/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/issues`,
                method: 'POST',
                headers: {
                    'Authorization': `token ${CONFIG.github.token}`,
                    'User-Agent': 'Sky-Travel-Netlify-Function/1.0',
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (c) => data += c);
                res.on('end', () => {
                    let json = {};
                    try { json = JSON.parse(data || '{}'); } catch {}
                    if (res.statusCode === 201 && json.html_url) return resolve(json.html_url);
                    const err = new Error(json.message || `GitHub API error: ${res.statusCode}`);
                    err.status = res.statusCode; 
                    err.body = json;
                    reject(err);
                });
            });
            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }

    // Try creating issue with retry logic for assignee errors
    try {
        return await postIssue(issueData);
    } catch (e) {
        if (e.status === 422) {
            console.warn('Retrying with only andercastellanos', e.body);
            issueData.assignees = ['andercastellanos'];
            try {
                return await postIssue(issueData);
            } catch (e2) {
                if (e2.status === 422) {
                    console.warn('Retrying with no assignees', e2.body);
                    delete issueData.assignees;
                    return await postIssue(issueData);
                }
                throw e2;
            }
        }
        throw e;
    }
}