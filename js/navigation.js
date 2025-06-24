/**
 * SkyTravel - Unified Navigation JavaScript
 * Version: 2.1.0 - Production-Ready with Senior-Level Optimizations
 * Fixes mobile menu toggle conflicts and provides clean event handling
 */

$(document).ready(function() {
    // Initialize navigation when DOM is ready
    initializeNavigation();
});

// Cached DOM elements for performance
let $navContainer, $navLinks, $menuToggle, $mobileLangSwitcher, $body, $nav;
let scrollTicking = false;
const DEBUG_MODE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

function initializeNavigation() {
    // Cache DOM elements once
    cacheDOMElements();
    
    // Clean up any existing handlers to prevent duplicates
    cleanupHandlers();
    
    // Set up all navigation functionality
    setupMobileMenu();
    setupScrollEffects();
    setupClickOutside();
    setupKeyboardNavigation();
    
    // Initialize proper ARIA states
    initializeAriaStates();
    
    debugLog('SkyTravel Navigation initialized with accessibility features');
}

function cacheDOMElements() {
    $navContainer = $('.nav-container');
    $navLinks = $('.nav-links');
    $menuToggle = $('.menu-toggle');
    $mobileLangSwitcher = $('.mobile-language-switcher');
    $body = $('body');
    $nav = $('nav');
}

function cleanupHandlers() {
    // Remove any existing handlers to prevent duplicates
    $menuToggle.off('click.navigation');
    $navLinks.find('a').off('click.navigation');
    $(document).off('click.navigation keydown.navigation');
    $(window).off('scroll.navigation resize.navigation');
}

function setupMobileMenu() {
    // Ensure we have required elements
    if (!$menuToggle.length || !$navLinks.length) {
        debugLog('Required navigation elements not found');
        return;
    }

    // Single, unified mobile menu toggle handler
    $menuToggle.on('click.navigation', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle the active class
        $navLinks.toggleClass('active');
        
        // Update aria-expanded for accessibility
        const isExpanded = $navLinks.hasClass('active');
        $menuToggle.attr('aria-expanded', isExpanded.toString());
        
        // Add visual state class to button
        $menuToggle.toggleClass('menu-open', isExpanded);
        
        // Adjust z-index and visibility when menu opens/closes
        if (isExpanded) {
            openNavigation();
        } else {
            closeNavigation();
        }
        
        debugLog(`Navigation menu ${isExpanded ? 'opened' : 'closed'}`);
    });
}

function openNavigation() {
    // Set higher z-index for nav menu
    $navContainer.css('z-index', '1001').addClass('nav-menu-open');
    
    // Hide mobile language switcher when menu is open to prevent overlap
    if ($mobileLangSwitcher.length) {
        $mobileLangSwitcher.css('visibility', 'hidden');
    }
    
    // Prevent body scroll when menu is open
    $body.addClass('nav-menu-open');
    
    // Focus first nav link for accessibility (ARIA best practice)
    setTimeout(() => {
        $navLinks.find('a').first().focus();
    }, 100);
}

function closeNavigation() {
    // Reset states
    $navLinks.removeClass('active');
    $menuToggle.attr('aria-expanded', 'false').removeClass('menu-open');
    
    // Reset z-index and visibility
    $navContainer.css('z-index', '1000').removeClass('nav-menu-open');
    
    if ($mobileLangSwitcher.length) {
        $mobileLangSwitcher.css('visibility', 'visible');
    }
    
    // Re-enable body scroll
    $body.removeClass('nav-menu-open');
}

function setupScrollEffects() {
    // Optimized scroll handler using requestAnimationFrame
    $(window).on('scroll.navigation', function() {
        if (!scrollTicking) {
            window.requestAnimationFrame(handleScroll);
            scrollTicking = true;
        }
    });
}

function handleScroll() {
    const scrollTop = $(window).scrollTop();
    
    if (scrollTop > 50) {
        $navContainer.addClass('nav-scrolled');
        $navContainer.css('background', 'rgba(255, 255, 255, 0.95)');
        $body.addClass('scrolled');
    } else {
        $navContainer.removeClass('nav-scrolled');
        $navContainer.css('background', 'rgba(255, 255, 255, 0.95)');
        $body.removeClass('scrolled');
    }
    
    scrollTicking = false;
}

function setupClickOutside() {
    // Close menu when clicking outside navigation
    $(document).on('click.navigation', function(event) {
        const $target = $(event.target);
        
        // Check if click is outside navigation and menu is open
        if (!$target.closest($navContainer).length && $navLinks.hasClass('active')) {
            closeNavigation();
        }
    });
    
    // Close menu when navigation links are clicked
    $navLinks.find('a').on('click.navigation', function() {
        // Small delay to allow link navigation to start
        setTimeout(closeNavigation, 100);
    });
}

function setupKeyboardNavigation() {
    // Handle keyboard navigation
    $(document).on('keydown.navigation', function(event) {
        switch(event.key) {
            case 'Escape':
                if ($navLinks.hasClass('active')) {
                    event.preventDefault();
                    closeNavigation();
                    $menuToggle.focus(); // Return focus to toggle button
                }
                break;
                
            case 'Tab':
                // Trap focus within navigation when menu is open on mobile
                if ($navLinks.hasClass('active') && isMobileView()) {
                    trapFocusInNavigation(event);
                }
                break;
        }
    });
}

function trapFocusInNavigation(event) {
    const focusableElements = $navContainer.find('a, button, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusableElements.first();
    const lastFocusable = focusableElements.last();
    
    if (event.shiftKey) {
        // Shift + Tab (backwards)
        if (document.activeElement === firstFocusable[0]) {
            event.preventDefault();
            lastFocusable.focus();
        }
    } else {
        // Tab (forwards)
        if (document.activeElement === lastFocusable[0]) {
            event.preventDefault();
            firstFocusable.focus();
        }
    }
}

function initializeAriaStates() {
    // Set initial ARIA states
    if ($menuToggle.length) {
        // Ensure menu toggle has proper initial state
        if (!$menuToggle.attr('aria-expanded')) {
            $menuToggle.attr('aria-expanded', 'false');
        }
        
        // Add aria-controls for better accessibility
        const navLinksId = $navLinks.attr('id') || 'nav-links';
        if (!$navLinks.attr('id')) {
            $navLinks.attr('id', navLinksId);
        }
        $menuToggle.attr('aria-controls', navLinksId);
    }
    
    // Ensure navigation has proper role
    if ($nav.length && !$nav.attr('role')) {
        $nav.attr('role', 'navigation');
    }
    
    // Set initial visibility for mobile language switcher
    if ($mobileLangSwitcher.length) {
        $mobileLangSwitcher.css('visibility', 'visible');
    }
}

// Utility function to check if we're on mobile
function isMobileView() {
    return window.innerWidth <= 768;
}

// Handle window resize events
$(window).on('resize.navigation', function() {
    let resizeTimeout;
    clearTimeout(resizeTimeout);
    
    resizeTimeout = setTimeout(function() {
        // Re-cache elements in case DOM changed
        cacheDOMElements();
        
        // Close navigation menu if switching from mobile to desktop
        if (!isMobileView() && $navLinks.hasClass('active')) {
            closeNavigation();
        }
        
        // Reinitialize states after resize
        initializeAriaStates();
    }, 250);
});

// Debug logging function
function debugLog(message, ...args) {
    if (DEBUG_MODE) {
        console.log(`[SkyTravel Nav] ${message}`, ...args);
    }
}

// Export functions for potential external use
window.SkyTravelNavigation = {
    closeNavigation: closeNavigation,
    openNavigation: openNavigation,
    isMobileView: isMobileView,
    reinitialize: initializeNavigation
};