const crypto = require('crypto');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const OWNER = 'andercastellanos';
const REPO  = 'Skytravel';

exports.handler = async (event) => {
  console.log('🚀 Function started');

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const data = JSON.parse(event.body || '{}');

    // Normalize incoming data to support both ES and EN keys
    const norm = (v) => (typeof v === 'string' ? v.trim() : v || '');
    const name = norm(data.name ?? data.nombre);
    const trip = norm(data.trip ?? data.viaje);
    const testimony = norm(data.testimony ?? data.testimonio);
    const email = norm(data.email ?? data.correo);
    const language = norm(data.language ?? data.idioma) || 'es';

    // Support both `media` and `photos`
    const mediaArr = Array.isArray(data.media) ? data.media
                   : Array.isArray(data.photos) ? data.photos
                   : [];
    const mediaUrls = mediaArr
      .map(m => (m?.secure_url || m?.url || m))
      .filter(Boolean);

    if (!name || !trip || !testimony) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ success:false, error: 'Missing required fields: name, trip, testimony' }) };
    }

    // Environment variable checks
    const enableCreate = process.env.ENABLE_GH_CREATE === 'true';
    const token = process.env.GITHUB_TOKEN;

    // Dry-run mode when ENABLE_GH_CREATE is not true
    if (!enableCreate) {
      const esc = (s='') => String(s).replace(/"/g,'\\"');
      const mediaBlock = mediaUrls.length ? `media:\n${mediaUrls.map(u => `  - url: "${u}"`).join('\n')}\n` : '';
      const fingerprint = crypto.createHash('sha1').update(`${name}${trip}${testimony}${mediaUrls.join(',')}`).digest('hex');

      const issueBody =
`---
name: "${esc(name)}"
trip: "${esc(trip)}"
language: "${esc(language)}"
featured: false
verified: false
rating: "5"
tags: "pilgrimage, faith, testimony"
fingerprint: "${fingerprint}"
${mediaBlock}---
${(testimony || '').trim()}

${mediaUrls.join('\n')}
${email ? `\n---\n**Email:** ${esc(email)}\n` : ''}`;

      const payload = { title: `Testimonio de ${esc(name)} - ${esc(trip)}`, body: issueBody, labels: ['testimony','needs-review'] };
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ success:true, dryRun:true, issuePayload: payload }) };
    }

    // Check for GitHub token when creation is enabled
    if (!token) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ success:false, error: 'Missing GITHUB_TOKEN' }) };
    }

    // Idempotency fingerprint including media URLs
    const fingerprint = crypto.createHash('sha1').update(`${name}${trip}${testimony}${mediaUrls.join(',')}`).digest('hex');

    // Search for existing issue with same fingerprint
    const q = encodeURIComponent(`repo:${OWNER}/${REPO} in:body label:testimony fingerprint: "${fingerprint}"`);
    const sr = await fetch(`https://api.github.com/search/issues?q=${q}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'Sky-Travel-Netlify-Function/1.0' },
    });
    const sj = await sr.json().catch(() => ({}));
    if (sr.ok && sj.total_count > 0) {
      const hit = sj.items[0];
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ success:true, alreadyExists:true, issueUrl: hit.html_url, issueNumber: hit.number }) };
    }

    // Prepare issue content
    const esc = (s='') => String(s).replace(/"/g,'\\"');
    const mediaBlock = mediaUrls.length ? `media:\n${mediaUrls.map(u => `  - url: "${u}"`).join('\n')}\n` : '';

    const issueBody =
`---
name: "${esc(name)}"
trip: "${esc(trip)}"
language: "${esc(language)}"
featured: false
verified: false
rating: "5"
tags: "pilgrimage, faith, testimony"
fingerprint: "${fingerprint}"
${mediaBlock}---
${(testimony || '').trim()}

${mediaUrls.join('\n')}
${email ? `\n---\n**Email:** ${esc(email)}\n` : ''}`;

    const payload = { title: `Testimonio de ${esc(name)} - ${esc(trip)}`, body: issueBody, labels: ['testimony','needs-review'] };

    // Create GitHub issue
    console.log('🐙 Creating GitHub issue…');
    const cr = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/issues`, {
      method: 'POST',
      headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json', 'User-Agent': 'Sky-Travel-Netlify-Function/1.0' },
      body: JSON.stringify(payload),
    });

    console.log(`📋 GitHub API response status: ${cr.status}`);

    const cj = await cr.json().catch(()=>({}));
    if (!cr.ok) {
      return { statusCode: cr.status, headers: CORS, body: JSON.stringify({ success:false, error: cj?.message || 'GitHub API error' }) };
    }

    return { statusCode: 201, headers: CORS, body: JSON.stringify({ success:true, issueUrl: cj.html_url, issueNumber: cj.number }) };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success:false, error: e.message || 'Server error' }) };
  }
};