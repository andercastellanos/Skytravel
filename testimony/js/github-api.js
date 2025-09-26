/**
 * =============================================================================
 * 📄 UPDATED GITHUB API CONFIGURATION (SIMPLIFIED)
 * 🌐 File: testimony/js/github-api.js (UPDATE THE CONSTRUCTOR SECTION)
 * 📝 Purpose: Simplified configuration for your 3-label system
 * =============================================================================
 */

class GitHubAPI {
    constructor() {
        // GitHub repository configuration
        this.config = {
            owner: 'andercastellanos',        // Your GitHub username
            repo: 'Skytravel',               // Your repository name
            apiBase: 'https://api.github.com',
            label: 'testimony',              // Only fetch issues with this label
            
            // 🔑 Optional: Add GitHub Personal Access Token for higher rate limits
            // For production, add this as environment variable or keep as null for public repos
            token: null, // Will work without token for public repos
            
            // 🎯 Simplified labels for your system
            labels: {
                testimony: 'testimony',       // All testimonials
                verified: 'verified',        // Approved testimonials
                needsReview: 'needs-review'  // Pending approval
            },
            
            // 🎯 Enhanced configuration for media handling
            allowedImageHosts: [
                'imgur.com',
                'i.imgur.com',
                'github.com',
                'user-images.githubusercontent.com',
                'raw.githubusercontent.com'
            ]
        };
        
        // Cache for API responses (avoid hitting rate limits)
        this.cache = {
            testimonials: null,
            lastFetch: null,
            cacheDuration: 5 * 60 * 1000 // 5 minutes in production
        };
        
        // Development mode detection
        this.isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.includes('github.io') ||
                           window.location.hostname.includes('netlify.app');
        
        if (this.isDevelopment) {
            this.cache.cacheDuration = 30 * 1000; // 30 seconds for development
            console.log('🔧 GitHub API in development mode - shorter cache duration');
        }
    }

    /**
     * Fetch all testimonials from GitHub Issues (UPDATED FILTERING)
     * Only fetches verified testimonials for public display
     */
    async fetchTestimonials(forceRefresh = false, includeUnverified = false) {
        try {
            // Check cache first
            if (!forceRefresh && this.isCacheValid()) {
                console.log('🔄 Using cached testimonials');
                return this.filterByVerificationStatus(this.cache.testimonials, includeUnverified);
            }

            console.log('🌐 Fetching fresh testimonials from GitHub...');
            
            // Build GitHub API URL
            const url = `${this.config.apiBase}/repos/${this.config.owner}/${this.config.repo}/issues`;
            const params = new URLSearchParams({
                state: 'open',      // Only open issues
                labels: this.config.label,
                sort: 'created',
                direction: 'desc',  // Newest first
                per_page: 100       // Get lots at once
            });

            // Build headers
            const headers = {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Sky-Travel-Website/1.0'
            };
            
            // Add authentication if token is provided
            if (this.config.token) {
                headers['Authorization'] = `token ${this.config.token}`;
                console.log('🔑 Using GitHub token for authentication');
            }

            // Fetch from GitHub API
            const response = await fetch(`${url}?${params}`, { headers });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            const issues = await response.json();
            console.log(`✅ Fetched ${issues.length} issues from GitHub`);

            // Parse each issue into a testimonial object
            const testimonials = this.parseIssues(issues);
            
            // Update cache
            this.cache.testimonials = testimonials;
            this.cache.lastFetch = Date.now();

            console.log(`🎉 Processed ${testimonials.length} valid testimonials`);
            
            // Return filtered results based on verification status
            return this.filterByVerificationStatus(testimonials, includeUnverified);

        } catch (error) {
            console.error('❌ Error fetching testimonials:', error);
            
            // Return cached data if available
            if (this.cache.testimonials) {
                console.log('📋 Using cached testimonials due to error');
                return this.filterByVerificationStatus(this.cache.testimonials, includeUnverified);
            }
            
            return [];
        }
    }

    /**
     * Filter testimonials by verification status
     * @param {Array} testimonials - All testimonials
     * @param {boolean} includeUnverified - Whether to include unverified testimonials
     * @returns {Array} Filtered testimonials
     */
    filterByVerificationStatus(testimonials, includeUnverified = false) {
        if (includeUnverified) {
            return testimonials; // Return all testimonials
        }
        
        // Only return verified testimonials for public display
        return testimonials.filter(testimonial => testimonial.verified === true);
    }

    /**
     * Enhanced issue parsing for simplified label system
     */
    parseIssueBody(issue) {
        const body = issue.body || '';
        
        // Check if testimonial is verified (has 'verified' label)
        const isVerified = issue.labels.some(label => 
            label.name === this.config.labels.verified
        );
        
        // Check if testimonial needs review (has 'needs-review' label)
        const needsReview = issue.labels.some(label => 
            label.name === this.config.labels.needsReview
        );
        
        // Split YAML front matter from content
        const yamlMatch = body.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
        
        if (!yamlMatch) {
            console.warn(`⚠️ Issue #${issue.number} missing YAML front matter`);
            return this.createFallbackTestimonial(issue, isVerified, needsReview);
        }

        const yamlSection = yamlMatch[1];
        const contentSection = yamlMatch[2].trim();

        // Parse YAML manually
        const metadata = this.parseSimpleYAML(yamlSection);
        
        // Extract media URLs from content
        const photos = this.extractPhotos(contentSection);
        
        // Clean content (remove image markdown)
        const cleanContent = contentSection
            .replace(/!\[.*?\]\(.*?\)/g, '')     // Remove images
            .replace(/<!--.*?-->/g, '')          // Remove comments
            .trim();

        // Validate required fields
        if (!metadata.name || !cleanContent) {
            console.warn(`⚠️ Issue #${issue.number} missing required fields`);
            return null;
        }

        return {
            id: issue.number,
            name: metadata.name || 'Anonymous',
            trip: metadata.trip || 'Pilgrimage Experience',
            content: cleanContent,
            photos: photos,
            date: new Date(issue.created_at),
            url: issue.html_url,
            
            // Enhanced metadata with verification status
            destination: this.extractDestination(metadata.trip || ''),
            language: metadata.language || this.detectLanguage(cleanContent),
            verified: isVerified,  // Based on GitHub label
            needsReview: needsReview,  // Based on GitHub label
            
            // Additional fields
            tripDate: this.extractTripDate(metadata.trip || ''),
            rating: this.parseRating(metadata.rating),
            tags: this.parseTags(metadata.tags || '')
        };
    }

    /**
     * Create fallback testimonial with verification status
     */
    createFallbackTestimonial(issue, isVerified, needsReview) {
        const content = issue.body || '';
        const photos = this.extractPhotos(content);
        const cleanContent = content
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/<!--.*?-->/g, '')
            .trim();
        
        return {
            id: issue.number,
            name: issue.user?.login || 'Anonymous',
            trip: 'Pilgrimage Experience',
            content: cleanContent,
            photos: photos,
            date: new Date(issue.created_at),
            url: issue.html_url,
            destination: 'Unknown',
            language: this.detectLanguage(cleanContent),
            verified: isVerified,
            needsReview: needsReview,
            tags: []
        };
    }

    /**
     * Get testimonials for admin review (includes unverified)
     * @returns {Promise<Array>} All testimonials including unverified
     */
    async getTestimonialsForReview() {
        return await this.fetchTestimonials(false, true); // Include unverified
    }

    /**
     * Get only verified testimonials for public display
     * @returns {Promise<Array>} Only verified testimonials
     */
    async getVerifiedTestimonials() {
        return await this.fetchTestimonials(false, false); // Only verified
    }

    /**
     * Filter testimonials by criteria (UPDATED)
     */
    async filterTestimonials(filters = {}) {
        // Get testimonials based on admin status
        const includeUnverified = filters.includeUnverified || false;
        const testimonials = await this.fetchTestimonials(false, includeUnverified);
        
        return testimonials.filter(testimonial => {
            // Filter by language
            if (filters.language && testimonial.language !== filters.language) {
                return false;
            }
            
            // Filter by destination
            if (filters.destination && testimonial.destination !== filters.destination) {
                return false;
            }
            
            // Filter by verification status
            if (filters.verified !== undefined && testimonial.verified !== filters.verified) {
                return false;
            }
            
            // Filter by review status
            if (filters.needsReview !== undefined && testimonial.needsReview !== filters.needsReview) {
                return false;
            }
            
            // Search in content
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const searchableText = [
                    testimonial.name,
                    testimonial.trip,
                    testimonial.content,
                    testimonial.destination
                ].join(' ').toLowerCase();
                
                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }
            
            return true;
        });
    }

    /**
     * Get API status information
     * @returns {Object} API status
     */
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

// Create global instance
window.GitHubTestimonials = new GitHubAPI();

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitHubAPI;
}