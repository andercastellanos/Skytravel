/**
 * =============================================================================
 * 📄 NETLIFY SERVERLESS FUNCTION - TESTIMONY SUBMISSION (SIGNATURE FIXED)
 * 🌐 File: netlify/functions/submit-testimony.js
 * 📝 Purpose: Receive form submissions → Upload to Cloudinary → Create GitHub Issues
 * 🔗 Called by: testimony-form.js from enviar-testimonio.html & submit-testimonial.html
 * =============================================================================
 */

import crypto from "crypto";

// ---------- CORS Headers ----------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ---------- Constants ----------
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = /^image\/(jpe?g|png|gif|webp)$/i;

/**
 * Main Netlify function handler (ES Module export)
 */
export const handler = async (event) => {
  console.log('🚀 Function started');
  console.log('📋 Request method:', event.httpMethod);
  
  try {
    // Environment variable check with detailed logging
    console.log('🔍 Environment Variables Check:');
    console.log('- GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? 'SET' : 'MISSING');
    console.log('- CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING');
    console.log('- CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING');
    console.log('- CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING');

    // 1) Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
      console.log('✅ Handling OPTIONS request');
      return { 
        statusCode: 204, 
        headers: corsHeaders, 
        body: "" 
      };
    }

    // 2) Only allow POST requests
    if (event.httpMethod !== "POST") {
      console.log('❌ Invalid method:', event.httpMethod);
      return {
        statusCode: 405,
        headers: { ...corsHeaders, "Allow": "POST, OPTIONS" },
        body: JSON.stringify({ error: "Method Not Allowed. Use POST." }),
      };
    }

    // 3) Validate request body
    if (!event.body) {
      console.log('❌ Missing request body');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing request body" }),
      };
    }

    // 4) Parse and validate data
    console.log('📝 Processing POST request');
    console.log('📋 Body length:', event.body ? event.body.length : 0);
    
    let data;
    try {
      data = JSON.parse(event.body);
      console.log('✅ JSON parsed successfully');
      console.log('📋 Request data keys:', Object.keys(data));
      console.log('📋 Has photo:', !!data.photo);
      if (data.photo) {
        console.log('📋 Photo size (base64):', data.photo.data ? data.photo.data.length : 0);
        console.log('📋 Photo type:', data.photo.type);
      }
    } catch (error) {
      console.error('❌ JSON parse error:', error.message);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid JSON in request body" }),
      };
    }

    const { name, trip, testimony, language, email, photo } = data;

    // Basic validation
    console.log('🔍 Validating submission...');
    if (!name || !trip || !testimony) {
      console.log('❌ Missing required fields');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing required fields: name, trip, testimony" }),
      };
    }

    // File validation
    if (photo) {
      console.log('📋 Photo details:', {
        type: photo.type,
        name: photo.name,
        size: photo.size,
        dataLength: photo.data ? photo.data.length : 0
      });

      if (photo.size > MAX_FILE_SIZE) {
        console.log('❌ File too large:', photo.size);
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Image too large. Maximum size: 5MB" }),
        };
      }

      if (!ALLOWED_IMAGE_TYPES.test(photo.type)) {
        console.log('❌ Unsupported image type:', photo.type);
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Unsupported image type. Use JPG, PNG, GIF, or WebP" }),
        };
      }
    }

    console.log('✅ Data validation passed');
    console.log(`📝 Processing testimony from: ${name}`);

    // 5) Upload photo to Cloudinary if provided
    let mediaUrl = null;
    let imageWarning = false;
    
    if (photo?.data && photo?.type) {
      console.log('📸 Starting Cloudinary upload...');
      
      try {
        mediaUrl = await uploadToCloudinary({
          base64: photo.data,
          mime: photo.type,
          fileName: photo.name || "testimony.jpg",
        });
        console.log('✅ Media uploaded successfully:', mediaUrl);
      } catch (error) {
        console.error('❌ Cloudinary upload failed:', error.message);
        console.error('❌ Cloudinary upload stack:', error.stack);
        console.log('⚠️ Continuing without media upload...');
        imageWarning = true;
        // Continue without image rather than failing completely
      }
    } else {
      console.log('ℹ️ No photo to upload');
    }

    // 6) Create GitHub issue
    console.log('🐙 Creating GitHub issue...');
    const { issueUrl, issueNumber } = await createGithubIssue({
      name,
      trip,
      testimony,
      language,
      email,
      mediaUrl,
    });
    console.log('✅ GitHub issue created successfully:', issueUrl);

    // 7) Return success response (201 for resource created)
    const successResponse = {
      success: true,
      issueUrl,
      issueNumber,
      mediaUrl,
      imageWarning,
      message: "Testimony submitted successfully"
    };
    
    console.log('🎉 Function completed successfully');
    return {
      statusCode: 201, // Resource created
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(successResponse),
    };

  } catch (error) {
    console.error("❌ CRITICAL ERROR in function:", error.message);
    console.error("❌ Error stack:", error.stack);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Server error occurred",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
    };
  }
};

/**
 * Upload photo to Cloudinary with correct signature - FIXED VERSION
 */
async function uploadToCloudinary({ base64, mime, fileName }) {
  console.log('📸 Starting Cloudinary upload process...');
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // Validate environment variables
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Missing Cloudinary environment variables');
  }

  const folder = "sky-travel-testimonies"; // Match your existing folder
  const timestamp = Math.floor(Date.now() / 1000);
  
  console.log('📋 Generated timestamp:', timestamp);
  console.log('📋 Using folder:', folder);

  // Create signature - ONLY sign folder and timestamp (this is the fix!)
  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");
  
  console.log('🔐 Signature string to sign:', `folder=${folder}&timestamp=${timestamp}`);
  console.log('🔐 Signature generated successfully');

  // Build form data
  const form = new URLSearchParams();
  form.append("file", `data:${mime};base64,${base64}`);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);
  
  // Remove file extension for public_id
  const publicId = fileName.replace(/\.[^.]+$/, "");
  form.append("public_id", publicId);

  console.log('📋 Upload data prepared, making request to Cloudinary...');

  // Upload to Cloudinary
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  
  const response = await fetch(uploadUrl, {
    method: "POST",
    body: form,
  });

  console.log('📋 Cloudinary response status:', response.status);

  const result = await response.json();
  
  if (!response.ok) {
    console.error('❌ Cloudinary error response:', result);
    throw new Error(result.error?.message || `Cloudinary upload failed: ${response.statusText}`);
  }

  console.log('✅ Cloudinary upload successful');
  return result.secure_url;
}

/**
 * Create GitHub issue with YAML frontmatter
 */
async function createGithubIssue({ name, trip, testimony, language, email, mediaUrl }) {
  console.log('📝 Creating GitHub issue data...');
  
  const token = process.env.GITHUB_TOKEN;
  const owner = "andercastellanos";
  const repo = "Skytravel";

  if (!token) {
    throw new Error('Missing GitHub token');
  }

  // Helper to trim and escape YAML strings
  const yamlString = (str = "") => escapeYaml(str.trim());

  // Build YAML frontmatter with photos array if image exists
  const photosBlock = mediaUrl
    ? `photos:\n  - url: "${mediaUrl}"\n    alt: "Testimony Photo"\n`
    : "";

  const issueBody = 
    `---\n` +
    `name: "${yamlString(name)}"\n` +
    `trip: "${yamlString(trip)}"\n` +
    `language: "${language || "es"}"\n` +
    `featured: false\n` +
    `verified: false\n` +
    `rating: "5"\n` +
    `tags: "pilgrimage, faith, testimony"\n` +
    photosBlock +
    `---\n\n` +
    `${testimony.trim()}\n\n` +
    (mediaUrl ? `![Testimony Photo](${mediaUrl})\n\n` : '') +
    (email ? `---\n**Email:** ${email.trim()}\n` : "");

  const issueData = {
    title: `Testimonio de ${name.trim()} - ${trip.trim()}`,
    body: issueBody,
    labels: ["testimony", "needs-review"],
  };

  console.log('📋 Issue data created, title:', issueData.title);
  console.log('📤 Creating GitHub issue...');

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
        "User-Agent": "Sky-Travel-Netlify-Function/1.0"
      },
      body: JSON.stringify(issueData),
    }
  );

  console.log('📋 GitHub API response status:', response.status);

  const result = await response.json();
  
  if (!response.ok) {
    console.error('❌ GitHub API error:', result);
    throw new Error(result.message || `GitHub API failed: ${response.statusText}`);
  }

  console.log('✅ GitHub issue created successfully');
  return {
    issueUrl: result.html_url,
    issueNumber: result.number
  };
}

/**
 * Helper function to escape YAML special characters
 */
function escapeYaml(str = "") {
  return String(str).replace(/"/g, '\\"');
}