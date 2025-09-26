/**
 * =============================================================================
 * 📄 NETLIFY SERVERLESS FUNCTION - TESTIMONY SUBMISSION
 * 🌐 File: netlify/functions/submit-testimony.js
 * 📝 Purpose: Receive form submissions → Upload photos → Create GitHub Issues
 * 🔗 Called by: testimony-form.js from enviar-testimonio.html & submit-testimonial.html
 * =============================================================================
 */

const https = require('https');

// Configuration - Set these as Netlify environment variables
const CONFIG = {
    github: {
        owner: 'andercastellanos',
        repo: 'Skytravel', 
        token: process.env.GITHUB_TOKEN, // Set in Netlify environment variables
        apiBase: 'https://api.github.com'
    },
    imgur: {
        clientId: process.env.IMGUR_CLIENT_ID, // Optional: for photo uploads
        apiBase: 'https://api.imgur.com/3'
    }
};

/**
 * Main Netlify function handler
 */
exports.handler = async (event, context) => {
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

        // Upload photo if provided
        let photoUrl = null;
        if (requestData.photo) {
            console.log('📸 Uploading photo...');
            photoUrl = await uploadPhoto(requestData.photo);
            console.log('✅ Photo uploaded:', photoUrl);
        }

        // Create GitHub issue
        console.log('🐙 Creating GitHub issue...');
        const issueUrl = await createGitHubIssue(requestData, photoUrl);
        console.log('✅ GitHub issue created:', issueUrl);

        // Return success response
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Testimony submitted successfully',
                issueUrl: issueUrl
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

    // Validate photo if provided
    if (data.photo) {
        if (!data.photo.data || !data.photo.type) {
            return { valid: false, error: 'Invalid photo data' };
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(data.photo.type)) {
            return { valid: false, error: 'Invalid photo format. Only JPG, PNG, GIF, WebP allowed' };
        }

        // Check base64 data size (approximate file size)
        const sizeBytes = (data.photo.data.length * 3/4) - 2; // Rough base64 to bytes conversion
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (sizeBytes > maxSize) {
            return { valid: false, error: 'Photo too large. Maximum 5MB allowed' };
        }
    }

    return { valid: true };
}

/**
 * Upload photo to Imgur (or fallback to GitHub attachments)
 */
async function uploadPhoto(photoData) {
    // Try Imgur first if client ID is configured
    if (CONFIG.imgur.clientId) {
        try {
            return await uploadToImgur(photoData);
        } catch (error) {
            console.warn('⚠️ Imgur upload failed, using GitHub attachment method:', error.message);
        }
    }

    // Fallback: Create a GitHub issue comment with the image
    // For now, we'll return a placeholder and include the image in the issue body
    return 'data:' + photoData.type + ';base64,' + photoData.data;
}

/**
 * Upload photo to Imgur
 */
async function uploadToImgur(photoData) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            image: photoData.data,
            type: 'base64',
            name: photoData.name || 'testimony-photo'
        });

        const options = {
            hostname: 'api.imgur.com',
            port: 443,
            path: '/3/image',
            method: 'POST',
            headers: {
                'Authorization': `Client-ID ${CONFIG.imgur.clientId}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
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
                    
                    if (response.success) {
                        resolve(response.data.link);
                    } else {
                        reject(new Error(response.data?.error || 'Imgur upload failed'));
                    }
                } catch (error) {
                    reject(new Error('Invalid Imgur response'));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

function postIssueToGitHub(issueData) {
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
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let json = {};
        try { json = JSON.parse(data || '{}'); } catch {}
        if (res.statusCode === 201 && json.html_url) return resolve(json.html_url);

        const msg = json.message || `GitHub API error: ${res.statusCode}`;
        const err = new Error(msg);
        err.status = res.statusCode;
        err.body = json;
        return reject(err);
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}


/**
 * Create GitHub issue with YAML front matter format
 */
async function createGitHubIssue(formData, photoUrl) {
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

    // Add photo if available
    if (photoUrl) {
        issueBody += '\n\n## Foto del Viaje\n\n';
        if (photoUrl.startsWith('data:')) {
            // For base64 images, we'll include instructions for manual processing
            issueBody += '*[Foto enviada - procesamiento manual requerido]*\n\n';
            issueBody += `<!-- PHOTO_DATA: ${photoUrl.substring(0, 100)}... -->\n`;
        } else {
            // For uploaded images, include the URL
            issueBody += `![Foto del Testimonio](${photoUrl})\n`;
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
        assignees: ['andercastellanos', 'jandrearuiz']
    };
    

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

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    
                    if (res.statusCode === 201) {
                        resolve(response.html_url);
                    } else {
                        reject(new Error(response.message || `GitHub API error: ${res.statusCode}`));
                    }
                } catch (error) {
                    reject(new Error('Invalid GitHub API response'));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}