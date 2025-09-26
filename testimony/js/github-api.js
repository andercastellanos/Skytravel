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
        const photos = this.extractPhotos(contentSection); // ⬅️ array of URL strings

        const cleanContent = contentSection
            .replace(/!\[.*?\]\(.*?\)/g, '')   // strip images
            .replace(/<!--[\s\S]*?-->/g, '')   // strip comments
            .trim();

        if (!metadata.name || !cleanContent) {
            console.warn(`⚠️ Issue #${issue.number} missing required fields`);
            return null;
        }

        return {
            id: issue.number,
            name: metadata.name || 'Anonymous',
            trip: metadata.trip || 'Pilgrimage Experience',
            content: cleanContent,
            photos, // array<string>
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
            .trim();

        return {
            id: issue.number,
            name: issue.user?.login || 'Anonymous',
            trip: 'Pilgrimage Experience',
            content: cleanContent,
            photos,
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
    extractPhotos(markdown) {
        const urls = [];
        const rx = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
        let m;
        while ((m = rx.exec(markdown)) !== null) {
            const url = m[1];
            try {
                const host = new URL(url).hostname.replace(/^www\./, '');
                if (this.config.allowedImageHosts.some(allowed => host.endsWith(allowed))) {
                    urls.push(url);
                }
            } catch {
                // ignore invalid URLs
            }
        }
        return urls;
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
            if (filters.language && t.language !== filters.language) return false;
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
