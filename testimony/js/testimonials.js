/**
 * =============================================================================
 * 📄 TESTIMONIALS DISPLAY LOGIC (Updated - No Inline Styles)
 * 🌐 File: testimony/js/testimonials.js
 * 📝 Purpose: Display testimonials with filtering, pagination, and search
 * 🔗 Used on: testimonials.html and testimonios.html
 * 🔗 Requires: github-api.js (must be loaded first)
 * =============================================================================
 */

class TestimonialsDisplay {
    constructor() {
        // Configuration
        this.config = {
            testimonialsPerPage: 9,    // Show 9 testimonials per page (3x3 grid)
            autoLoadMore: true,        // Load more on scroll
            scrollThreshold: 300       // Pixels from bottom to trigger load more
        };

        // State management
        this.state = {
            allTestimonials: [],       // All fetched testimonials
            filteredTestimonials: [],  // After filters applied
            displayedTestimonials: [], // Currently shown on page
            currentPage: 1,
            loading: false,
            language: this.detectPageLanguage(),
            filters: {
                destination: 'all',
                search: ''
            }
        };

        // DOM elements (will be found during init)
        this.elements = {};
        
        // Initialize when DOM is ready
        this.init();
    }

    /**
     * Initialize the testimonials system
     */
    async init() {
        try {
            console.log('🚀 Initializing testimonials display...');
            
            // Find DOM elements
            this.findElements();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Show loading state
            this.showLoading();
            
            // Fetch and display testimonials
            await this.loadTestimonials();
            
            console.log('✅ Testimonials system initialized');
            
        } catch (error) {
            console.error('❌ Error initializing testimonials:', error);
            this.showError();
        }
    }

    /**
     * Find all necessary DOM elements
     */
    findElements() {
        // Main container for testimonials
        this.elements.container = document.querySelector('.testimonials-grid') || 
                                  document.querySelector('.testimonials-wrapper') ||
                                  document.querySelector('#testimonials-container');
        
        // Filter controls
        this.elements.destinationFilter = document.querySelector('#destination-filter') ||
                                         document.querySelector('[data-filter="destination"]');
        this.elements.searchInput = document.querySelector('#search-testimonials') ||
                                   document.querySelector('[data-search="testimonials"]');
        
        // Load more button
        this.elements.loadMoreBtn = document.querySelector('#load-more-btn') ||
                                   document.querySelector('.load-more-testimonials');
        
        // Status elements
        this.elements.loadingIndicator = document.querySelector('.testimonials-loading') ||
                                        document.querySelector('#loading-testimonials');
        this.elements.errorMessage = document.querySelector('.testimonials-error') ||
                                    document.querySelector('#error-testimonials');
        this.elements.emptyMessage = document.querySelector('.testimonials-empty') ||
                                    document.querySelector('#empty-testimonials');
        
        // Count display
        this.elements.countDisplay = document.querySelector('.testimonials-count');
        
        // If container doesn't exist, create it
        if (!this.elements.container) {
            this.elements.container = this.createTestimonialsContainer();
        }

        console.log('📍 Found DOM elements:', Object.keys(this.elements).length);
    }

    /**
     * Create testimonials container if it doesn't exist
     */
    createTestimonialsContainer() {
        const section = document.querySelector('.testimonials-section .container') ||
                       document.querySelector('.testimonials-section') ||
                       document.body;
        
        const container = document.createElement('div');
        container.className = 'testimonials-grid';
        container.id = 'testimonials-container';
        
        section.appendChild(container);
        return container;
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Destination filter
        if (this.elements.destinationFilter) {
            this.elements.destinationFilter.addEventListener('change', (e) => {
                this.state.filters.destination = e.target.value;
                this.applyFilters();
            });
        }

        // Search input
        if (this.elements.searchInput) {
            // Debounced search
            let searchTimeout;
            this.elements.searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.state.filters.search = e.target.value.trim();
                    this.applyFilters();
                }, 300);
            });
        }

        // Load more button
        if (this.elements.loadMoreBtn) {
            this.elements.loadMoreBtn.addEventListener('click', () => {
                this.loadMoreTestimonials();
            });
        }

        // Auto-load more on scroll
        if (this.config.autoLoadMore) {
            window.addEventListener('scroll', this.handleScroll.bind(this));
        }

        // Refresh button (if exists)
        const refreshBtn = document.querySelector('#refresh-testimonials');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshTestimonials();
            });
        }
    }

    /**
     * Handle scroll for auto-loading more testimonials
     */
    handleScroll() {
        if (this.state.loading) return;

        const scrollPosition = window.innerHeight + window.scrollY;
        const documentHeight = document.documentElement.scrollHeight;
        const threshold = this.config.scrollThreshold;

        if (scrollPosition >= documentHeight - threshold) {
            this.loadMoreTestimonials();
        }
    }

    /**
     * Detect page language from HTML lang attribute or URL
     */
    detectPageLanguage() {
        // Check HTML lang attribute
        const htmlLang = document.documentElement.lang;
        if (htmlLang) {
            return htmlLang.startsWith('es') ? 'es' : 'en';
        }

        // Check URL for Spanish indicators
        const url = window.location.href.toLowerCase();
        if (url.includes('-es.html') || url.includes('/es/') || url.includes('testimonio')) {
            return 'es';
        }

        return 'en'; // Default to English
    }

    /**
     * Load testimonials from GitHub
     */
    async loadTestimonials() {
        try {
            // Fetch testimonials from GitHub API
            this.state.allTestimonials = await window.GitHubTestimonials.fetchTestimonials();
            
            // Filter by page language
            this.state.allTestimonials = this.state.allTestimonials.filter(
                t => t.language === this.state.language
            );

            console.log(`📋 Loaded ${this.state.allTestimonials.length} testimonials for language: ${this.state.language}`);
            
            // Set up destination filter options
            await this.setupDestinationFilter();
            
            // Apply initial filters and display
            this.applyFilters();
            
            // Hide loading state
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Error loading testimonials:', error);
            this.showError();
        }
    }

    /**
     * Set up destination filter dropdown options
     */
    async setupDestinationFilter() {
        if (!this.elements.destinationFilter) return;

        // Get unique destinations
        const destinations = [...new Set(
            this.state.allTestimonials.map(t => t.destination)
        )].filter(d => d && d !== 'Unknown').sort();

        // Create options
        const allText = this.state.language === 'es' ? 'Todos los Destinos' : 'All Destinations';
        this.elements.destinationFilter.innerHTML = `
            <option value="all">${allText}</option>
            ${destinations.map(dest => `<option value="${dest}">${dest}</option>`).join('')}
        `;
    }

    /**
     * Apply current filters to testimonials
     */
    applyFilters() {
        let filtered = [...this.state.allTestimonials];

        // Filter by destination
        if (this.state.filters.destination && this.state.filters.destination !== 'all') {
            filtered = filtered.filter(t => t.destination === this.state.filters.destination);
        }

        // Filter by search term
        if (this.state.filters.search) {
            const searchTerm = this.state.filters.search.toLowerCase();
            filtered = filtered.filter(t => {
                const searchableText = [
                    t.name,
                    t.trip,
                    t.content,
                    t.destination
                ].join(' ').toLowerCase();
                
                return searchableText.includes(searchTerm);
            });
        }

        // Sort testimonials (featured first, then by date)
        filtered.sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return new Date(b.date) - new Date(a.date);
        });

        this.state.filteredTestimonials = filtered;
        this.state.currentPage = 1;
        
        // Reset display and show first page
        this.displayTestimonials(true);
        
        // Update count
        this.updateCount();
        
        console.log(`🔍 Applied filters: ${filtered.length} testimonials match criteria`);
    }

    /**
     * Display testimonials on the page
     * @param {boolean} reset - Whether to reset the display (for new filters)
     */
    displayTestimonials(reset = false) {
        if (reset) {
            this.state.displayedTestimonials = [];
            this.elements.container.innerHTML = '';
        }

        const startIndex = (this.state.currentPage - 1) * this.config.testimonialsPerPage;
        const endIndex = startIndex + this.config.testimonialsPerPage;
        const testimonialsToShow = this.state.filteredTestimonials.slice(startIndex, endIndex);

        if (testimonialsToShow.length === 0 && reset) {
            this.showEmpty();
            return;
        }

        this.hideEmpty();

        // Create HTML for new testimonials
        testimonialsToShow.forEach(testimonial => {
            const card = this.createTestimonialCard(testimonial);
            this.elements.container.appendChild(card);
            this.state.displayedTestimonials.push(testimonial);
        });

        // Update load more button
        this.updateLoadMoreButton();

        console.log(`📺 Displayed ${testimonialsToShow.length} testimonials (page ${this.state.currentPage})`);
    }

    /**
     * Create HTML card for a single testimonial
     */
    createTestimonialCard(testimonial) {
        const card = document.createElement('div');
        card.className = `testimonial-card${testimonial.featured ? ' featured' : ''}`;
        
        // Format date
        const dateStr = testimonial.date.toLocaleDateString(
            this.state.language === 'es' ? 'es-ES' : 'en-US',
            { year: 'numeric', month: 'long', day: 'numeric' }
        );

        // Truncate content for preview
        const maxLength = 200;
        const truncatedContent = testimonial.content.length > maxLength 
            ? testimonial.content.substring(0, maxLength) + '...'
            : testimonial.content;
        // Generate photos HTML for all photos in the array
        let photosHtml = '';
        if (Array.isArray(testimonial.photos) && testimonial.photos.length > 0) {
            const photoTags = testimonial.photos.map(photo => {
                let imageUrl = null;
                let imageAlt = 'Foto del testimonio';

                if (typeof photo === 'string') {
                    // Handle string format: photos = ["https://..."]
                    imageUrl = photo;
                } else if (photo && typeof photo === 'object') {
                    // Handle object format: photos = [{ url: "https://...", alt: "..." }]
                    imageUrl = photo.url || photo.src || null;
                    imageAlt = photo.alt || imageAlt;
                }

                return imageUrl ? `<img src="${imageUrl}" alt="${this.escapeHtml(imageAlt)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'">` : '';
            }).filter(img => img !== ''); // Remove empty strings

            if (photoTags.length > 0) {
                photosHtml = `<div class="testimonial-photos">${photoTags.join('')}</div>`;
            }
        }

        card.innerHTML = `
            <div class="testimonial-content">
                <div class="testimonial-header">
                    <div class="testimonial-author">${this.escapeHtml(testimonial.name)}</div>
                    <div class="testimonial-trip">${this.escapeHtml(testimonial.trip)}</div>
                </div>
                <div class="testimonial-text">
                    <p>${this.escapeHtml(truncatedContent)}</p>
                </div>
                ${photosHtml}
                <div class="testimonial-footer">
                    <span class="testimonial-date">${dateStr}</span>
                    ${testimonial.featured ? '<span class="testimonial-featured">⭐</span>' : ''}
                </div>
            </div>
        `;

        // Add click handler to expand/modal (optional)
        card.addEventListener('click', () => {
            this.openTestimonialModal(testimonial);
        });

        return card;
    }

    /**
     * Open testimonial in modal (optional feature)
     */
    openTestimonialModal(testimonial) {
        // This is optional - you can implement a modal if desired
        console.log('📖 Opening testimonial modal for:', testimonial.name);
        
        // For now, just scroll to top or could open GitHub link
        // window.open(testimonial.url, '_blank');
    }

    /**
     * Load more testimonials (pagination)
     */
    loadMoreTestimonials() {
        if (this.state.loading) return;
        
        const hasMorePages = (this.state.currentPage * this.config.testimonialsPerPage) 
                            < this.state.filteredTestimonials.length;
        
        if (!hasMorePages) {
            console.log('📄 No more testimonials to load');
            return;
        }

        this.state.currentPage++;
        this.displayTestimonials(false);
        
        console.log(`📖 Loaded page ${this.state.currentPage}`);
    }

    /**
     * Update load more button visibility
     */
    updateLoadMoreButton() {
        if (!this.elements.loadMoreBtn) return;

        const hasMorePages = (this.state.currentPage * this.config.testimonialsPerPage) 
                            < this.state.filteredTestimonials.length;

        if (hasMorePages) {
            this.elements.loadMoreBtn.classList.remove('hidden');
            const remaining = this.state.filteredTestimonials.length - 
                            (this.state.currentPage * this.config.testimonialsPerPage);
            const loadMoreText = this.state.language === 'es' 
                ? `Cargar Más (${remaining} restantes)`
                : `Load More (${remaining} remaining)`;
            this.elements.loadMoreBtn.textContent = loadMoreText;
        } else {
            this.elements.loadMoreBtn.classList.add('hidden');
        }
    }

    /**
     * Update testimonials count display
     */
    updateCount() {
        if (!this.elements.countDisplay) return;

        const total = this.state.filteredTestimonials.length;
        const shown = Math.min(
            this.state.currentPage * this.config.testimonialsPerPage,
            total
        );

        const countText = this.state.language === 'es'
            ? `Mostrando ${shown} de ${total} testimonios`
            : `Showing ${shown} of ${total} testimonials`;
            
        this.elements.countDisplay.textContent = countText;
    }

    /**
     * Refresh testimonials (force reload from GitHub)
     */
    async refreshTestimonials() {
        console.log('🔄 Refreshing testimonials...');
        this.showLoading();
        
        try {
            // Force refresh from GitHub
            this.state.allTestimonials = await window.GitHubTestimonials.fetchTestimonials(true);
            
            // Filter by language
            this.state.allTestimonials = this.state.allTestimonials.filter(
                t => t.language === this.state.language
            );
            
            // Reapply filters
            this.applyFilters();
            this.hideLoading();
            
            console.log('✅ Testimonials refreshed');
            
        } catch (error) {
            console.error('❌ Error refreshing testimonials:', error);
            this.showError();
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.state.loading = true;
        
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.classList.remove('hidden');
        } else {
            // Create inline loading message
            this.elements.container.innerHTML = `
                <div class="testimonials-loading">
                    <div class="loading-spinner"></div>
                    <p>${this.state.language === 'es' ? 'Cargando testimonios...' : 'Loading testimonials...'}</p>
                </div>
            `;
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.state.loading = false;
        
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.classList.add('hidden');
        }
    }

    /**
     * Show error state
     */
    showError() {
        const errorMessage = this.state.language === 'es'
            ? 'Error cargando testimonios. Por favor intenta de nuevo más tarde.'
            : 'Error loading testimonials. Please try again later.';

        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = errorMessage;
            this.elements.errorMessage.classList.remove('hidden');
        } else {
            this.elements.container.innerHTML = `
                <div class="testimonials-error">
                    <p>❌ ${errorMessage}</p>
                    <button onclick="location.reload()" class="elegant-button">
                        ${this.state.language === 'es' ? 'Intentar de Nuevo' : 'Try Again'}
                    </button>
                </div>
            `;
        }

        this.hideLoading();
    }

    /**
     * Show empty state (no testimonials match filters)
     */
    showEmpty() {
        const emptyMessage = this.state.language === 'es'
            ? 'No se encontraron testimonios que coincidan con los filtros seleccionados.'
            : 'No testimonials found matching the selected filters.';

        if (this.elements.emptyMessage) {
            this.elements.emptyMessage.textContent = emptyMessage;
            this.elements.emptyMessage.classList.remove('hidden');
        } else {
            this.elements.container.innerHTML = `
                <div class="testimonials-empty">
                    <p>📝 ${emptyMessage}</p>
                </div>
            `;
        }
    }

    /**
     * Hide empty state
     */
    hideEmpty() {
        if (this.elements.emptyMessage) {
            this.elements.emptyMessage.classList.add('hidden');
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Make sure GitHub API is available
    if (typeof window.GitHubTestimonials === 'undefined') {
        console.error('❌ GitHubTestimonials not available. Make sure github-api.js is loaded first.');
        return;
    }
    
    // Create global instance
    window.TestimonialsApp = new TestimonialsDisplay();
});

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestimonialsDisplay;
}