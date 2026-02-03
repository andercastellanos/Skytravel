/**
 * SkyTravel - Unified Navigation JavaScript
 * Version: 3.0.0 - Vanilla JS (no jQuery dependency)
 * Fixes mobile menu toggle conflicts and provides clean event handling
 */

// Cached DOM elements for performance
var navContainer, navLinks, menuToggle, mobileLangSwitcher, nav;
var scrollTicking = false;
var DEBUG_MODE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

function initializeNavigation() {
    // Cache DOM elements once
    cacheDOMElements();

    // Set up all navigation functionality
    setupMobileMenu();
    setupScrollEffects();
    setupClickOutside();
    setupKeyboardNavigation();
    setupResize();

    // Initialize proper ARIA states
    initializeAriaStates();

    debugLog('SkyTravel Navigation initialized with accessibility features');
}

function cacheDOMElements() {
    navContainer = document.querySelector('.nav-container');
    navLinks = document.querySelector('.nav-links');
    menuToggle = document.querySelector('.menu-toggle');
    mobileLangSwitcher = document.querySelector('.mobile-language-switcher');
    nav = document.querySelector('nav');
}

function setupMobileMenu() {
    if (!menuToggle || !navLinks) {
        debugLog('Required navigation elements not found');
        return;
    }

    menuToggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        navLinks.classList.toggle('active');

        var isExpanded = navLinks.classList.contains('active');
        menuToggle.setAttribute('aria-expanded', String(isExpanded));

        menuToggle.classList.toggle('menu-open', isExpanded);

        if (isExpanded) {
            openNavigation();
        } else {
            closeNavigation();
        }

        debugLog('Navigation menu ' + (isExpanded ? 'opened' : 'closed'));
    });
}

function openNavigation() {
    if (navContainer) {
        navContainer.style.zIndex = '1001';
        navContainer.classList.add('nav-menu-open');
    }

    // Re-query in case it was created dynamically
    mobileLangSwitcher = document.querySelector('.mobile-language-switcher');
    if (mobileLangSwitcher) {
        mobileLangSwitcher.style.visibility = 'hidden';
    }

    document.body.classList.add('nav-menu-open');

    // Focus first nav link for accessibility
    setTimeout(function () {
        var firstLink = navLinks ? navLinks.querySelector('a') : null;
        if (firstLink) firstLink.focus();
    }, 100);
}

function closeNavigation() {
    if (navLinks) navLinks.classList.remove('active');
    if (menuToggle) {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.classList.remove('menu-open');
    }

    if (navContainer) {
        navContainer.style.zIndex = '1000';
        navContainer.classList.remove('nav-menu-open');
    }

    mobileLangSwitcher = document.querySelector('.mobile-language-switcher');
    if (mobileLangSwitcher) {
        mobileLangSwitcher.style.visibility = 'visible';
    }

    document.body.classList.remove('nav-menu-open');
}

function setupScrollEffects() {
    window.addEventListener('scroll', function () {
        if (!scrollTicking) {
            window.requestAnimationFrame(handleScroll);
            scrollTicking = true;
        }
    });
}

function handleScroll() {
    var scrollTop = window.scrollY;

    if (navContainer) {
        if (scrollTop > 50) {
            navContainer.classList.add('nav-scrolled');
            navContainer.style.background = 'rgba(255, 255, 255, 0.95)';
            document.body.classList.add('scrolled');
        } else {
            navContainer.classList.remove('nav-scrolled');
            navContainer.style.background = 'rgba(255, 255, 255, 0.95)';
            document.body.classList.remove('scrolled');
        }
    }

    scrollTicking = false;
}

function setupClickOutside() {
    document.addEventListener('click', function (event) {
        if (!navContainer || !navLinks) return;

        if (!navContainer.contains(event.target) && navLinks.classList.contains('active')) {
            closeNavigation();
        }
    });

    if (navLinks) {
        var links = navLinks.querySelectorAll('a');
        links.forEach(function (link) {
            link.addEventListener('click', function () {
                setTimeout(closeNavigation, 100);
            });
        });
    }
}

function setupKeyboardNavigation() {
    document.addEventListener('keydown', function (event) {
        if (!navLinks) return;

        switch (event.key) {
            case 'Escape':
                if (navLinks.classList.contains('active')) {
                    event.preventDefault();
                    closeNavigation();
                    if (menuToggle) menuToggle.focus();
                }
                break;

            case 'Tab':
                if (navLinks.classList.contains('active') && isMobileView()) {
                    trapFocusInNavigation(event);
                }
                break;
        }
    });
}

function trapFocusInNavigation(event) {
    if (!navContainer) return;

    var focusableElements = navContainer.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
    if (!focusableElements.length) return;

    var firstFocusable = focusableElements[0];
    var lastFocusable = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
            event.preventDefault();
            lastFocusable.focus();
        }
    } else {
        if (document.activeElement === lastFocusable) {
            event.preventDefault();
            firstFocusable.focus();
        }
    }
}

function initializeAriaStates() {
    if (menuToggle) {
        if (!menuToggle.getAttribute('aria-expanded')) {
            menuToggle.setAttribute('aria-expanded', 'false');
        }

        var navLinksId = (navLinks && navLinks.id) || 'nav-links';
        if (navLinks && !navLinks.id) {
            navLinks.id = navLinksId;
        }
        menuToggle.setAttribute('aria-controls', navLinksId);
    }

    if (nav && !nav.getAttribute('role')) {
        nav.setAttribute('role', 'navigation');
    }

    mobileLangSwitcher = document.querySelector('.mobile-language-switcher');
    if (mobileLangSwitcher) {
        mobileLangSwitcher.style.visibility = 'visible';
    }
}

function isMobileView() {
    return window.innerWidth <= 768;
}

function setupResize() {
    var resizeTimeout;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
            cacheDOMElements();

            if (!isMobileView() && navLinks && navLinks.classList.contains('active')) {
                closeNavigation();
            }

            initializeAriaStates();
        }, 250);
    });
}

function debugLog(message) {
    if (DEBUG_MODE) {
        console.log('[SkyTravel Nav] ' + message);
    }
}

// Export functions for potential external use
window.SkyTravelNavigation = {
    closeNavigation: closeNavigation,
    openNavigation: openNavigation,
    isMobileView: isMobileView,
    reinitialize: initializeNavigation
};

// Initialize on DOMContentLoaded (works with defer)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNavigation);
} else {
    initializeNavigation();
}
