/**
 * =============================================================================
 * 📄 DEBUG VERSION - NETLIFY FUNCTION WITH ENHANCED LOGGING
 * 🌐 File: testimony/netlify/functions/submit-testimony.js
 * 📝 Purpose: Enhanced error logging to debug 502 issues
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
    console.log('🚀 Function started');
    console.log('📋 Request method:', event.httpMethod);
    console.log('📋 Request headers:', JSON.stringify(event.headers, null, 2));
    
    // Environment variable check with detailed logging
    console.log('🔍 Environment Variables Check:');
    console.log('- GITHUB_TOKEN:', CONFIG.github.token ? 'SET' : 'MISSING');
    console.log('- CLOUDINARY_CLOUD_NAME:', CONFIG.cloudinary.cloudName ? 'SET' : 'MISSING');
    console.log('- CLOUDINARY_API_KEY:', CONFIG.cloudinary.apiKey ? 'SET' : 'MISSING');
    console.log('- CLOUDINARY_API_SECRET:', CONFIG.cloudinary.apiSecret ? 'SET' : 'MISSING');

    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        console.log('✅ Handling OPTIONS request');
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        console.log('❌ Invalid method:', event.httpMethod);
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                error: 'Method not allowed. Only POST requests accepted.'
            })
        };
    }

    try {
        console.log('📝 Processing POST request');
        console.log('📋 Body length:', event.body ? event.body.length : 0);

        // Parse request body
        let requestData;
        try {
            requestData = JSON.parse(event.body);
            console.log('✅ JSON parsed successfully');
            console.log('📋 Request data keys:', Object.keys(requestData));
            console.log('📋 Has photo:', !!requestData.photo);
            if (requestData.photo) {
                console.log('📋 Photo size (base64):', requestData.photo.data ? requestData.photo.data.length : 0);
                console.log('📋 Photo type:', requestData.photo.type);
            }
        } catch (error) {
            console.error('❌ JSON parse error:', error.message);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Invalid JSON in request body' 
                })
            };
        }

        // Validate submission
        console.log('🔍 Validating submission...');
        const validation = validateSubmission(requestData);
        if (!validation.valid) {
            console.log('❌ Validation failed:', validation.error);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: validation.error 
                })
            };
        }
        console.log('✅ Validation passed');

        console.log(`📝 Processing testimony from: ${requestData.name}`);

        // Upload media to Cloudinary if provided
        let mediaUrl = null;
        if (requestData.photo && requestData.photo.data) {
            try {
                console.log('📸 Starting Cloudinary upload...');
                console.log('📋 Photo details:', {
                    type: requestData.photo.type,
                    name: requestData.photo.name,
                    size: requestData.photo.size,
                    dataLength: requestData.photo.data.length
                });
                
                mediaUrl = await uploadToCloudinary(requestData.photo);
                console.log('✅ Media uploaded successfully:', mediaUrl);
            } catch (error) {
                console.error('❌ Media upload failed:', error.message);
                console.error('❌ Media upload stack:', error.stack);
                // Continue without media - don't fail entire submission
                console.log('⚠️ Continuing without media upload...');
            }
        } else {
            console.log('ℹ️ No photo to upload');
        }

        // Create GitHub Issue
        console.log('📝 Creating GitHub issue data...');
        const issueData = createIssueData(requestData, mediaUrl);
        console.log('📋 Issue data created, title:', issueData.title);
        
        console.log('📤 Creating GitHub issue...');
        const githubResponse = await postIssueToGitHub(issueData);
        
        console.log('✅ GitHub issue created successfully:', githubResponse.html_url);

        // Return success response
        const successResponse = {
            success: true,
            message: 'Testimony submitted successfully',
            issueUrl: githubResponse.html_url,
            issueNumber: githubResponse.number,
            mediaUrl: mediaUrl
        };
        
        console.log('🎉 Function completed successfully');
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(successResponse)
        };

    } catch (error) {
        console.error('❌ CRITICAL ERROR in function:', error.message);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error. Please try again later.',
                details: error.message
            })
        };
    }
};

/**
 * Validate form submission data
 */
function validateSubmission(data) {
    console.log('🔍 Starting validation...');
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
        console.log('🔍 Validating photo data...');
        if (!data.photo.data || !data.photo.type) {
            return { valid: false, error: 'Invalid file data' };
        }

        // Allow both images and videos (optimized for web)
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm'
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
        console.log('📋 Photo size check:', {
            sizeBytes: sizeBytes,
            sizeMB: (sizeBytes / 1024 / 1024).toFixed(2),
            maxSizeMB: 25
        });
        
        if (sizeBytes > maxSize) {
            return { valid: false, error: 'File too large. Maximum size: 25MB' };
        }
    }

    console.log('✅ Validation completed successfully');
    return { valid: true };
}

/**
 * Upload file to Cloudinary with enhanced error handling
 */
function uploadToCloudinary(fileData) {
    return new Promise((resolve, reject) => {
        console.log('📸 Starting Cloudinary upload process...');
        
        try {
            // Generate timestamp for signature
            const timestamp = Math.round((new Date()).getTime() / 1000);
            console.log('📋 Generated timestamp:', timestamp);
            
            // Determine resource type based on file type
            const resourceType = fileData.type.startsWith('video/') ? 'video' : 'image';
            console.log('📋 Resource type:', resourceType);
            
            // Create parameters for signature
            const params = {
                timestamp: timestamp,
                resource_type: resourceType,
                folder: 'sky-travel-testimonies'
            };
            
            // Generate signature
            console.log('🔐 Generating Cloudinary signature...');
            const signature = generateCloudinarySignature(params, CONFIG.cloudinary.apiSecret);
            console.log('✅ Signature generated');
            
            // Prepare upload data
            const uploadData = querystring.stringify({
                file: `data:${fileData.type};base64,${fileData.data}`,
                api_key: CONFIG.cloudinary.apiKey,
                timestamp: timestamp,
                signature: signature,
                resource_type: resourceType,
                folder: 'sky-travel-testimonies'
            });

            console.log('📋 Upload data prepared, size:', uploadData.length);

            const options = {
                hostname: 'api.cloudinary.com',
                port: 443,
                path: `/v1_1/${CONFIG.cloudinary.cloudName}/${resourceType}/upload`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(uploadData)
                },
                timeout: 30000 // 30 second timeout
            };

            console.log('🌐 Making request to Cloudinary...');
            const req = https.request(options, (res) => {
                console.log('📋 Cloudinary response status:', res.statusCode);
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    console.log('📋 Cloudinary response received');
                    try {
                        const response = JSON.parse(data);
                        console.log('📋 Cloudinary response parsed');
                        
                        if (response.secure_url) {
                            console.log('✅ Cloudinary upload successful:', response.secure_url);
                            resolve(response.secure_url);
                        } else {
                            console.error('❌ Cloudinary upload failed:', response);
                            reject(new Error(response.error?.message || 'Cloudinary upload failed'));
                        }
                    } catch (error) {
                        console.error('❌ Failed to parse Cloudinary response:', error.message);
                        console.error('❌ Raw response:', data);
                        reject(new Error('Invalid Cloudinary response'));
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ Cloudinary request error:', error.message);
                reject(error);
            });

            req.on('timeout', () => {
                console.error('❌ Cloudinary request timeout');
                req.destroy();
                reject(new Error('Cloudinary upload timeout'));
            });

            console.log('📤 Sending data to Cloudinary...');
            req.write(uploadData);
            req.end();
            
        } catch (error) {
            console.error('❌ Cloudinary upload setup error:', error.message);
            reject(error);
        }
    });
}

/**
 * Generate Cloudinary signature
 */
function generateCloudinarySignature(params, apiSecret) {
    console.log('🔐 Generating signature with params:', params);
    
    // Sort parameters alphabetically
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');
    
    console.log('📋 Sorted params string:', sortedParams);
    
    // Create signature
    const signature = crypto
        .createHash('sha1')
        .update(sortedParams + apiSecret)
        .digest('hex');
        
    console.log('✅ Signature created');
    return signature;
}

/**
 * Create GitHub issue data
 */
function createIssueData(submissionData, mediaUrl) {
    console.log('📝 Creating GitHub issue data...');
    
    const currentDate = new Date().toLocaleDateString(
        submissionData.language === 'es' ? 'es-ES' : 'en-US'
    );

    // Build YAML front matter
    const yamlData = [
        '---',
        `name: "${submissionData.name.replace(/"/g, '\\"')}"`,
        `trip: "${submissionData.trip.replace(/"/g, '\\"')}"`,
        `language: "${submissionData.language}"`,
        'featured: false',
        'verified: false',
        'rating: "5"',
        'tags: "pilgrimage, faith, testimony"',
        '---',
        '',
        submissionData.testimony,
        ''
    ];

    // Add media section if media was uploaded
    if (mediaUrl) {
        const mediaLabel = submissionData.language === 'es' 
            ? 'Media del Testimonio' 
            : 'Testimony Media';
        
        const mediaType = submissionData.photo?.type?.startsWith('video/') ? 'Video' : 'Foto';
        
        yamlData.push(`## ${mediaLabel}`);
        yamlData.push(`![${mediaType} del Testimonio](${mediaUrl})`);
        yamlData.push('');
    }

    // Add metadata
    const sentLabel = submissionData.language === 'es' ? 'Enviado' : 'Submitted';
    const contactLabel = submissionData.language === 'es' ? 'Email de contacto' : 'Contact email';
    
    yamlData.push('---');
    yamlData.push(`**${sentLabel}:** ${currentDate}`);
    
    if (submissionData.email && submissionData.email.trim()) {
        yamlData.push(`**${contactLabel}:** ${submissionData.email}`);
    }

    const issueTitle = submissionData.language === 'es'
        ? `Testimonio de ${submissionData.name} - ${submissionData.trip}`
        : `Testimony from ${submissionData.name} - ${submissionData.trip}`;

    console.log('✅ GitHub issue data created');
    return {
        title: issueTitle,
        body: yamlData.join('\n'),
        labels: ['testimony', 'needs-review'],
        assignees: ['andercastellanos', 'jandrearuiz']
    };
}

/**
 * Post issue to GitHub
 */
function postIssueToGitHub(issueData) {
    return new Promise((resolve, reject) => {
        console.log('📤 Starting GitHub API request...');
        
        const postData = JSON.stringify(issueData);
        console.log('📋 GitHub payload size:', postData.length);
        
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
            },
            timeout: 15000 // 15 second timeout
        };

        const req = https.request(options, (res) => {
            console.log('📋 GitHub API response status:', res.statusCode);
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('📋 GitHub API response received');
                try {
                    const response = JSON.parse(data);
                    
                    if (res.statusCode === 201 && response.html_url) {
                        console.log('✅ GitHub issue created successfully');
                        resolve(response);
                    } else {
                        console.error('❌ GitHub API error:', response);
                        reject(new Error(response.message || `GitHub API error: ${res.statusCode}`));
                    }
                } catch (error) {
                    console.error('❌ Failed to parse GitHub response:', error.message);
                    console.error('❌ Raw response:', data);
                    reject(new Error('Invalid GitHub API response'));
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ GitHub request error:', error.message);
            reject(error);
        });

        req.on('timeout', () => {
            console.error('❌ GitHub request timeout');
            req.destroy();
            reject(new Error('GitHub API timeout'));
        });

        console.log('📤 Sending request to GitHub...');
        req.write(postData);
        req.end();
    });
}