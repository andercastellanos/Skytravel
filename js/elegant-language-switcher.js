/**
 * Elegant Language Switcher for Sky Travel
 * Version: 1.0.0
 * Author: Sky Travel Development Team
 */

class ElegantLanguageSwitcher {
    constructor(options = {}) {
        // Configuration
        this.config = {
            languages: {
                en: { name: 'EN', label: 'English', default: true },
                es: { name: 'ES', label: 'Español' }
            },
            storageKey: 'skytravel-preferred-lang',
            debug: false,
            ...options
        };
        
        // State
        this.currentLang = this.detectCurrentLanguage();
        this.isSwitching = false;
        
        // Cached elements
        this.elements = {
            mobileSwitcher: null,
            mobileToggle: null,
            desktopSwitcher: null
        };
        
        // Bound event handlers (for cleanup)
        this.boundHandlers = {
            toggleClick: this.handleToggleClick.bind(this),
            documentClick: this.handleDocumentClick.bind(this),
            escapeKey: this.handleEscapeKey.bind(this)
        };
        
        // Initialize
        this.init();
    }

    detectCurrentLanguage() {
        const path = window.location.pathname;
        // Check if current page is Spanish version
        if (path.includes('-es.html') || path.includes('/es/')) {
            return 'es';
        }
        return 'en';
    }

    init() {
        try {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
            } else {
                this.initializeComponents();
            }
        } catch (error) {
            this.log('Initialization failed:', error);
        }
    }

    initializeComponents() {
        this.createMobileSwitcher();
        this.enhanceDesktopSwitcher();
        this.setupEventListeners();
        this.cacheElements();
        
        // Set document language attribute
        document.documentElement.lang = this.currentLang;
        
        this.log('Language switcher initialized for:', this.currentLang);
    }

    createMobileSwitcher() {
        // Check if mobile switcher already exists
        if (document.querySelector('.mobile-language-switcher')) {
            return;
        }

        const mobileSwitcher = document.createElement('div');
        mobileSwitcher.className = 'mobile-language-switcher';
        mobileSwitcher.setAttribute('role', 'navigation');
        mobileSwitcher.setAttribute('aria-label', 'Language selection');
        
        mobileSwitcher.innerHTML = `
            <button class="mobile-lang-toggle" aria-label="Change language" aria-expanded="false">
                <span class="mobile-lang-current">
                    <span class="mobile-lang-flag ${this.currentLang}"></span>
                    ${this.config.languages[this.currentLang].name}
                </span>
            </button>
            <div class="mobile-lang-menu" role="menu">
                ${Object.entries(this.config.languages).map(([code, lang]) => `
                    <a href="#" 
                       class="mobile-lang-option ${code === this.currentLang ? 'active' : ''}" 
                       data-lang="${code}"
                       role="menuitem"
                       aria-label="Switch to ${lang.label}">
                        <span class="mobile-lang-flag ${code}"></span>
                        ${lang.name}
                    </a>
                `).join('')}
            </div>
        `;

        document.body.appendChild(mobileSwitcher);
    }

    enhanceDesktopSwitcher() {
        const desktopSwitcher = document.querySelector('.nav-links .language-switcher');
        if (!desktopSwitcher) return;

        // Add click handlers to existing desktop switcher
        const langOptions = desktopSwitcher.querySelectorAll('.lang-option');
        langOptions.forEach(option => {
            // Determine language from the link href or text content
            const href = option.getAttribute('href') || '';
            let targetLang = 'en';
            
            if (href.includes('-es.html') || href.includes('/es/') || 
                option.textContent.toLowerCase().includes('es')) {
                targetLang = 'es';
            }
            
            option.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchLanguage(targetLang);
            });
        });
    }

    setupEventListeners() {
        // Mobile switcher toggle
        const mobileToggle = document.querySelector('.mobile-lang-toggle');
        const mobileSwitcher = document.querySelector('.mobile-language-switcher');
        
        if (mobileToggle && mobileSwitcher) {
            mobileToggle.addEventListener('click', this.boundHandlers.toggleClick);

            // Mobile language options
            const mobileOptions = document.querySelectorAll('.mobile-lang-option');
            mobileOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetLang = option.getAttribute('data-lang');
                    if (targetLang !== this.currentLang) {
                        this.switchLanguage(targetLang);
                    }
                    this.closeMobileMenu();
                });
            });

            // Close mobile switcher when clicking outside
            document.addEventListener('click', this.boundHandlers.documentClick);

            // Handle escape key
            document.addEventListener('keydown', this.boundHandlers.escapeKey);
        }
    }

    handleToggleClick(e) {
        e.stopPropagation();
        const mobileSwitcher = document.querySelector('.mobile-language-switcher');
        const mobileToggle = document.querySelector('.mobile-lang-toggle');
        
        if (mobileSwitcher && mobileToggle) {
            const isOpen = mobileSwitcher.classList.toggle('open');
            mobileToggle.setAttribute('aria-expanded', isOpen.toString());
        }
    }

    handleDocumentClick(e) {
        const mobileSwitcher = document.querySelector('.mobile-language-switcher');
        if (mobileSwitcher && !mobileSwitcher.contains(e.target)) {
            this.closeMobileMenu();
        }
    }

    handleEscapeKey(e) {
        if (e.key === 'Escape') {
            this.closeMobileMenu();
            const mobileToggle = document.querySelector('.mobile-lang-toggle');
            if (mobileToggle) {
                mobileToggle.focus();
            }
        }
    }

    closeMobileMenu() {
        const mobileSwitcher = document.querySelector('.mobile-language-switcher');
        const mobileToggle = document.querySelector('.mobile-lang-toggle');
        
        if (mobileSwitcher && mobileToggle) {
            mobileSwitcher.classList.remove('open');
            mobileToggle.setAttribute('aria-expanded', 'false');
        }
    }

    switchLanguage(targetLang) {
        if (targetLang === this.currentLang || this.isSwitching) {
            return;
        }

        this.isSwitching = true;
        
        try {
            this.log(`Switching from ${this.currentLang} to ${targetLang}`);

            // Store language preference
            localStorage.setItem(this.config.storageKey, targetLang);

            // Show loading state
            this.showLoadingState();

            // Determine target URL
            const currentPath = window.location.pathname;
            const targetPath = this.getTargetPath(currentPath, targetLang);
            
            this.log(`Current path: ${currentPath}`);
            this.log(`Target path: ${targetPath}`);
            
            // Small delay for better UX
            setTimeout(() => {
                this.smoothRedirect(targetPath);
            }, 150);
            
        } catch (error) {
            this.log('Language switch failed:', error);
            this.hideLoadingState();
            this.isSwitching = false;
        }
    }

    getTargetPath(currentPath, targetLang) {
        // Handle index page special case
        if (currentPath === '/' || currentPath === '/index.html') {
            return targetLang === 'es' ? '/index-es.html' : '/index.html';
        }
        
        if (targetLang === 'es') {
            // Switch to Spanish
            if (currentPath.includes('-es.html')) {
                return currentPath; // Already Spanish
            } else {
                // Convert English to Spanish
                return currentPath.replace('.html', '-es.html');
            }
        } else {
            // Switch to English
            if (currentPath.includes('-es.html')) {
                // Convert Spanish to English
                return currentPath.replace('-es.html', '.html');
            } else {
                return currentPath; // Already English
            }
        }
    }

    smoothRedirect(path) {
        // Add smooth transition
        document.body.style.transition = 'opacity 0.3s ease';
        document.body.style.opacity = '0.7';
        
        // Redirect
        window.location.href = path;
    }

    showLoadingState() {
        const mobileSwitcher = document.querySelector('.mobile-language-switcher');
        if (mobileSwitcher) {
            mobileSwitcher.style.opacity = '0.6';
            mobileSwitcher.style.pointerEvents = 'none';
        }
        
        // Add loading cursor
        document.body.style.cursor = 'wait';
        
        // Disable desktop switcher
        const desktopOptions = document.querySelectorAll('.language-switcher .lang-option');
        desktopOptions.forEach(option => {
            option.style.pointerEvents = 'none';
            option.style.opacity = '0.6';
        });
    }

    hideLoadingState() {
        const mobileSwitcher = document.querySelector('.mobile-language-switcher');
        if (mobileSwitcher) {
            mobileSwitcher.style.opacity = '1';
            mobileSwitcher.style.pointerEvents = 'auto';
        }
        
        document.body.style.cursor = 'default';
        
        // Re-enable desktop switcher
        const desktopOptions = document.querySelectorAll('.language-switcher .lang-option');
        desktopOptions.forEach(option => {
            option.style.pointerEvents = 'auto';
            option.style.opacity = '1';
        });
    }

    cacheElements() {
        this.elements.mobileSwitcher = document.querySelector('.mobile-language-switcher');
        this.elements.mobileToggle = document.querySelector('.mobile-lang-toggle');
        this.elements.desktopSwitcher = document.querySelector('.nav-links .language-switcher');
    }

    log(message, ...args) {
        if (this.config.debug) {
            console.log(`[LangSwitcher] ${message}`, ...args);
        }
    }

    // Cleanup method for SPA or dynamic content
    destroy() {
        // Remove event listeners
        const mobileToggle = document.querySelector('.mobile-lang-toggle');
        if (mobileToggle) {
            mobileToggle.removeEventListener('click', this.boundHandlers.toggleClick);
        }
        
        document.removeEventListener('click', this.boundHandlers.documentClick);
        document.removeEventListener('keydown', this.boundHandlers.escapeKey);
        
        // Remove created elements
        const mobileSwitcher = document.querySelector('.mobile-language-switcher');
        if (mobileSwitcher) {
            mobileSwitcher.remove();
        }
        
        // Clear references
        this.elements = {};
        this.isSwitching = false;
    }
}

// Enhanced jQuery mobile menu integration
function enhanceMobileMenu() {
    // Enhanced mobile menu toggle with language switcher awareness
    $('.menu-toggle').click(function() {
        $('.nav-links').toggleClass('active');
        
        // Ensure mobile language switcher remains accessible
        const mobileSwitcher = document.querySelector('.mobile-language-switcher');
        if (mobileSwitcher) {
            const isMenuActive = $('.nav-links').hasClass('active');
            mobileSwitcher.style.zIndex = isMenuActive ? '9999' : '10000';
        }
    });
    
    // Close menu when nav link is clicked
    $('.nav-links a:not(.lang-option)').click(function() {
        $('.nav-links').removeClass('active');
    });
    
    // Enhanced scroll effect
    let lastScrollTop = 0;
    $(window).scroll(function() {
        const scrollTop = $(window).scrollTop();
        const isScrolled = scrollTop > 50;
        
        // Update navigation background
        if (isScrolled) {
            $('.nav-container').addClass('scrolled');
            document.body.classList.add('scrolled');
        } else {
            $('.nav-container').removeClass('scrolled');
            document.body.classList.remove('scrolled');
        }
        
        // Hide/show mobile language switcher on scroll
        const mobileSwitcher = document.querySelector('.mobile-language-switcher');
        if (mobileSwitcher && scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down
            mobileSwitcher.style.transform = 'translateY(100px)';
        } else {
            // Scrolling up
            mobileSwitcher.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    });
}

// Initialize when DOM is ready
function initializeWhenReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
}

// Auto-initialize everything
initializeWhenReady(() => {
    // Initialize the elegant language switcher
    window.elegantLangSwitcher = new ElegantLanguageSwitcher({
        debug: false // Set to true during development
    });
    
    // Initialize jQuery features if available
    if (typeof jQuery !== 'undefined') {
        jQuery(enhanceMobileMenu);
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElegantLanguageSwitcher;
}