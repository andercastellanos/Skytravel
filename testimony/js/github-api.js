/**
 * =============================================================================
 * 📄 GITHUB TESTIMONIALS API (Simplified + Fixed)
 * 🌐 File: testimony/js/github-api.js
 * 📝 Purpose: Fetch & parse GitHub Issues into testimonials for the site
 * ⛳ Labels used: testimony (all), verified (approved), needs-review (pending)
 * =============================================================================
 */

class GitHubAPI {
    constructor() {
        // GitHub repository configuration
        this.config = {
            owner: 'andercastellanos',
            repo: 'Skytravel',
            apiBase: 'https://api.github.com',
            // We fetch issues with the "testimony" label and then filter by verified in-app
            label: 'testimony',

            // 🔑 Optional (rate-limit boost). If you later expose a token via <meta> or window var, it will be used.
            token: (window.GITHUB_TOKEN || null),

            labels: {
                testimony: 'testimony',
                verified: 'verified',
                needsReview: 'needs-review'
            },

            // Allow media from these hosts
            allowedImageHosts: [
                'imgur.com',
                'i.imgur.com',
                'github.com',
                'user-images.githubusercontent.com',
                'raw.githubusercontent.com',
                // Cloudinary
                'res.cloudinary.com',
                'cloudinary.com'
            ]
        };

        // Cache to reduce API calls
        this.cache = {
            testimonials: null,
            lastFetch: null,
            cacheDuration: 5 * 60 * 1000 // 5 minutes
        };

        // Dev-like hosts → shorter cache
        this.isDevelopment =
            location.hostname === 'localhost' ||
            location.hostname === '127.0.0.1' ||
            location.hostname.includes('github.io') ||
            location.hostname.includes('netlify.app');

        if (this.isDevelopment) {
            this.cache.cacheDuration = 30 * 1000; // 30 seconds in dev
            console.log('🔧 GitHub API in development mode — shorter cache duration');
        }
    }

    /**
     * Fetch testimonials from GitHub Issues
     * @param {boolean} forceRefresh - bypass cache
     * @param {boolean} includeUnverified - include unverified items
     */
    async fetchTestimonials(forceRefresh = false, includeUnverified = false) {
        try {
            if (!forceRefresh && this.isCacheValid()) {
                console.log('🔄 Using cached testimonials');
                return this.filterByVerificationStatus(this.cache.testimonials, includeUnverified);
            }

            console.log('🌐 Fetching fresh testimonials from GitHub...');
            const url = `${this.config.apiBase}/repos/${this.config.owner}/${this.config.repo}/issues`;
            const params = new URLSearchParams({
                state: 'open',
                labels: this.config.label,
                sort: 'created',
                direction: 'desc',
                per_page: 100
            });

            const headers = {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Sky-Travel-Website/1.0'
            };
            if (this.config.token) {
                headers['Authorization'] = `token ${this.config.token}`;
                console.log('🔑 Using GitHub token for authentication');
            }

            const response = await fetch(`${url}?${params}`, { headers });
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            const issues = await response.json();
            console.log(`✅ Fetched ${issues.length} issues from GitHub`);

            const testimonials = this.parseIssues(issues);
            this.cache.testimonials = testimonials;
            this.cache.lastFetch = Date.now();

            console.log(`🎉 Processed ${testimonials.length} valid testimonials`);
            return this.filterByVerificationStatus(testimonials, includeUnverified);
        } catch (err) {
            console.error('❌ Error fetching testimonials:', err);
            if (this.cache.testimonials) {
                console.log('📋 Using cached testimonials due to error');
                return this.filterByVerificationStatus(this.cache.testimonials, includeUnverified);
            }
            return [];
        }
    }

    /**
     * Only verified testimonials for public UI (unless includeUnverified)
     */
    filterByVerificationStatus(testimonials, includeUnverified = false) {
        if (includeUnverified) return testimonials;
        return testimonials.filter(t => t.verified === true);
    }

    /**
     * Convert raw issues → parsed testimonials (ignores PRs)
     */
    parseIssues(issues) {
        return issues
            .filter(it => !it.pull_request)
            .map(issue => this.parseIssueBody(issue))
            .filter(Boolean);
    }

    /**
     * Parse a single issue body (YAML front matter + markdown content)
     */
    parseIssueBody(issue) {
        const body = issue.body || '';

        // Label-based status
        const isVerified = issue.labels?.some(l => l.name === this.config.labels.verified) || false;
        const needsReview = issue.labels?.some(l => l.name === this.config.labels.needsReview) || false;

        // Split YAML front matter
        const yamlMatch = body.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
        if (!yamlMatch) {
            console.warn(`⚠️ Issue #${issue.number} missing YAML front matter`);
            return this.createFallbackTestimonial(issue, isVerified, needsReview);
        }

        const yamlSection = yamlMatch[1];
        const contentSection = (yamlMatch[2] || '').trim();

        const metadata = this.parseSimpleYAML(yamlSection);
        const media = this.extractMediaFromYAML(yamlSection); // Parse media from YAML
        const photos = media.length > 0 ? media : this.extractPhotos(contentSection); // Fallback to markdown photos

        const cleanContent = contentSection
            .replace(/!\[.*?\]\(.*?\)/g, '')   // strip images
            .replace(/<!--[\s\S]*?-->/g, '')   // strip comments
            .replace(/^name:\s*".*?"$/gim, '') // Remove individual YAML fields that might leak
            .replace(/^trip:\s*".*?"$/gim, '')
            .replace(/^language:\s*".*?"$/gim, '')
            .replace(/^featured:\s*(true|false)$/gim, '')
            .replace(/^verified:\s*(true|false)$/gim, '')
            .replace(/^rating:\s*".*?"$/gim, '')
            .replace(/^tags:\s*".*?"$/gim, '')
            .replace(/---\s*\*\*Email:\*\*.*$/gim, '') // Remove email lines like "---**Email:** email@example.com"
            .replace(/\*\*Email:\*\*.*$/gim, '') // Remove email lines like "**Email:** email@example.com"
            .replace(/^\s*Email:\s*\S+@\S+\.\S+\s*$/gim, '') // Remove standalone email lines
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '') // Remove any remaining email addresses
            .replace(/^\s*---\s*$/gm, '') // Remove standalone separator lines
            .replace(/\n{3,}/g, '\n\n') // Replace multiple consecutive newlines with just two
            .trim();

        if (!metadata.name || !cleanContent) {
            console.warn(`⚠️ Issue #${issue.number} missing required fields`);
            return null;
        }

        return {
            id: issue.number,
            name: this.getDisplayName(issue, metadata),
            trip: metadata.trip || 'Pilgrimage Experience',
            content: cleanContent,
            media: photos, // array of media objects with url/alt
            photos: photos, // keep for backward compatibility
            date: new Date(issue.created_at),
            url: issue.html_url,

            // Derived / additional
            destination: this.extractDestination(metadata.trip || ''),
            language: metadata.language || this.detectLanguage(cleanContent),
            verified: isVerified,
            needsReview: needsReview,
            tripDate: this.extractTripDate(metadata.trip || ''),
            rating: this.parseRating(metadata.rating),
            tags: this.parseTags(metadata.tags || '')
        };
    }

    /**
     * Fallback parsing when no YAML front matter
     */
    createFallbackTestimonial(issue, isVerified, needsReview) {
        const content = issue.body || '';
        const photos = this.extractPhotos(content);
        const cleanContent = content
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/^name:\s*".*?"$/gim, '') // Remove individual YAML fields that might leak
            .replace(/^trip:\s*".*?"$/gim, '')
            .replace(/^language:\s*".*?"$/gim, '')
            .replace(/^featured:\s*(true|false)$/gim, '')
            .replace(/^verified:\s*(true|false)$/gim, '')
            .replace(/^rating:\s*".*?"$/gim, '')
            .replace(/^tags:\s*".*?"$/gim, '')
            .replace(/---\s*\*\*Email:\*\*.*$/gim, '') // Remove email lines like "---**Email:** email@example.com"
            .replace(/\*\*Email:\*\*.*$/gim, '') // Remove email lines like "**Email:** email@example.com"
            .replace(/^\s*Email:\s*\S+@\S+\.\S+\s*$/gim, '') // Remove standalone email lines
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '') // Remove any remaining email addresses
            .replace(/^\s*---\s*$/gm, '') // Remove standalone separator lines
            .replace(/\n{3,}/g, '\n\n') // Replace multiple consecutive newlines with just two
            .trim();

        // Parse any YAML front-matter that might exist even in fallback cases
        const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
        let meta = {};
        if (fmMatch) {
            fmMatch[1].split('\n').forEach(line => {
                const m = line.match(/^\s*([a-zA-Z0-9_]+)\s*:\s*"(.*)"\s*$/);
                if (m) meta[m[1]] = m[2];
            });
        }

        return {
            id: issue.number,
            name: this.getDisplayName(issue, meta),
            trip: 'Pilgrimage Experience',
            content: cleanContent,
            media: photos, // array of media objects with url/alt
            photos: photos, // keep for backward compatibility
            date: new Date(issue.created_at),
            url: issue.html_url,
            destination: 'Unknown',
            language: this.detectLanguage(cleanContent),
            verified: isVerified,
            needsReview: needsReview,
            tags: []
        };
    }

    // ---------- Helpers ----------

    // Choose best display name for a testimony
    getDisplayName(issue, meta) {
        if (meta?.name && String(meta.name).trim()) return String(meta.name).trim();
        // Fallback: try to parse from title like "Testimonio de NAME - ..." or "Testimony from NAME - ..."
        const m =
            /^Testimonio de\s+(.+?)\s*[-–]/i.exec(issue.title) ||
            /^Testimony (of|from)\s+(.+?)\s*[-–]/i.exec(issue.title);
        if (m) return (m[2] || m[1]).replace(/^of\s+/i,'').trim();
        return (issue.user?.name || issue.user?.login || 'Anonymous').trim();
    }

    // Cache validity
    isCacheValid() {
        if (!this.cache.lastFetch) return false;
        return (Date.now() - this.cache.lastFetch) < this.cache.cacheDuration;
    }

    // Very small YAML (key: value) parser for our front matter
    parseSimpleYAML(yamlText) {
        const lines = yamlText.split(/\r?\n/);
        const obj = {};
        for (const line of lines) {
            const m = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)\s*$/);
            if (!m) continue;
            let [, key, val] = m;
            val = (val || '').trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            obj[key] = val;
        }
        return obj;
    }

    // Extract image URLs from markdown (returns array<string>)
    /**
 * Extract photo URLs from markdown content
 * FIXED: Ensures consistent object format with url and alt properties
 * @param {string} content - Markdown content to parse
 * @returns {Array} Array of photo objects with url and alt properties
 */
extractPhotos(content) {
    const photos = [];
    
    // Regex to match markdown images: ![alt](url)
    const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
    let match;
    
    while ((match = imgRegex.exec(content)) !== null) {
        const altText = match[1] || 'Testimony photo';
        const imageUrl = match[2];
        
        // Only include images from allowed hosts for security
        const isAllowedHost = this.config.allowedImageHosts.some(host => 
            imageUrl.toLowerCase().includes(host.toLowerCase())
        );
        
        if (isAllowedHost) {
            photos.push({ 
                url: imageUrl, 
                alt: altText || 'Testimony photo' 
            });
        } else {
            console.warn(`⚠️ Skipping image from non-allowed host: ${imageUrl}`);
        }
    }
    
    // Additional fallback: look for HTML img tags
    const htmlImgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'][^>]*)?>/gi;
    
    while ((match = htmlImgRegex.exec(content)) !== null) {
        const imageUrl = match[1];
        const altText = match[2] || 'Testimony photo';
        
        // Check if it's from allowed hosts and not already added
        const isAllowedHost = this.config.allowedImageHosts.some(host => 
            imageUrl.toLowerCase().includes(host.toLowerCase())
        );
        
        const alreadyExists = photos.some(photo => photo.url === imageUrl);
        
        if (isAllowedHost && !alreadyExists) {
            photos.push({ 
                url: imageUrl, 
                alt: altText 
            });
        }
    }
    
    // Cloudinary-specific extraction (if you're using Cloudinary)
    const cloudinaryRegex = /(https?:\/\/res\.cloudinary\.com\/[^\s)]+)/g;
    
    while ((match = cloudinaryRegex.exec(content)) !== null) {
        const imageUrl = match[1];
        const alreadyExists = photos.some(photo => photo.url === imageUrl);
        
        if (!alreadyExists) {
            photos.push({ 
                url: imageUrl, 
                alt: 'Testimony photo' 
            });
        }
    }
    
    console.log(`📸 Extracted ${photos.length} photos from content`);
    return photos;
}

/**
 * Extract media URLs from YAML front matter
 * @param {string} yamlContent - YAML front matter content
 * @returns {Array} Array of media objects with url and alt properties
 */
extractMediaFromYAML(yamlContent) {
    const media = [];

    // Simple regex to extract media block from YAML
    const mediaMatch = yamlContent.match(/media:\s*([\s\S]*?)(?=\n[a-zA-Z]|\n---|\n$|$)/);
    if (!mediaMatch) return media;

    const mediaSection = mediaMatch[1];

    // Parse lines starting with "- url:"
    const lines = mediaSection.split('\n');
    for (const line of lines) {
        const urlMatch = line.match(/^\s*-\s*url:\s*"([^"]+)"/);
        if (urlMatch) {
            const url = urlMatch[1];

            // Check if URL is from allowed hosts
            const isAllowedHost = this.config.allowedImageHosts.some(host =>
                url.toLowerCase().includes(host.toLowerCase())
            );

            if (isAllowedHost) {
                media.push({
                    url: url,
                    alt: 'Testimony media'
                });
            } else {
                console.warn(`⚠️ Skipping media from non-allowed host: ${url}`);
            }
        }
    }

    console.log(`📺 Extracted ${media.length} media items from YAML`);
    return media;
}

/**
 * Additional helper: Validate image URL
 * @param {string} url - Image URL to validate
 * @returns {boolean} Whether URL is from allowed host
 */
isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    // Check if URL is from allowed hosts
    return this.config.allowedImageHosts.some(host => 
        url.toLowerCase().includes(host.toLowerCase())
    );
}

    // Language guesser (very light heuristic)
    detectLanguage(text) {
        const t = (text || '').toLowerCase();
        const esHints = [' el ', ' la ', ' de ', ' y ', ' que ', ' con ', ' para ', ' experiencia ', ' viaje '];
        const hits = esHints.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
        return hits >= 2 ? 'es' : 'en';
    }

    // Destination guess from trip text
    extractDestination(trip) {
        if (!trip) return 'Unknown';
        const paren = trip.match(/^(.+?)\s*\(/);
        if (paren) return paren[1].trim();
        return trip.split(/[-,]/)[0].trim();
    }

    // Extract rough month/year from trip text
    extractTripDate(trip) {
        if (!trip) return null;
        const m = trip.match(/(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/i);
        if (m) return `${m[1]} ${m[2]}`;
        const y = trip.match(/\b(20\d{2})\b/);
        return y ? y[1] : null;
    }

    parseRating(val) {
        const n = parseFloat(val);
        return Number.isFinite(n) ? n : null;
    }

    parseTags(val) {
        if (!val) return [];
        return val.split(',').map(s => s.trim()).filter(Boolean);
    }

    // ---------- Public convenience methods ----------

    async getTestimonialsForReview() {
        return this.fetchTestimonials(false, true);
    }

    async getVerifiedTestimonials() {
        return this.fetchTestimonials(false, false);
    }

    async filterTestimonials(filters = {}) {
        const includeUnverified = !!filters.includeUnverified;
        const testimonials = await this.fetchTestimonials(false, includeUnverified);

        return testimonials.filter(t => {
            // NEW: Do NOT filter by language – show all. Language is used only for UI strings.
            // This ensures both English and Spanish pages display the same testimonials.
            // If needed in future, gate by a flag: if (!window.GitHubTestimonials?.config?.showAllLanguages) { ... }
            // if (filters.language && t.language !== filters.language) return false;
            if (filters.destination && t.destination !== filters.destination) return false;
            if (filters.verified !== undefined && t.verified !== filters.verified) return false;
            if (filters.needsReview !== undefined && t.needsReview !== filters.needsReview) return false;

            if (filters.search) {
                const s = filters.search.toLowerCase();
                const haystack = [t.name, t.trip, t.content, t.destination].join(' ').toLowerCase();
                if (!haystack.includes(s)) return false;
            }
            return true;
        });
    }

    getStatus() {
        return {
            isConfigured: !!(this.config.owner && this.config.repo),
            hasToken: !!this.config.token,
            cacheValid: this.isCacheValid(),
            lastFetch: this.cache.lastFetch,
            isDevelopment: this.isDevelopment,
            testimonialCount: this.cache.testimonials?.length || 0
        };
    }
}

// Expose globally
window.GitHubTestimonials = new GitHubAPI();

// CommonJS export (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitHubAPI;
}
