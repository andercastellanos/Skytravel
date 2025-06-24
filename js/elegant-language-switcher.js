/**
 * SkyTravel - Elegant Language Switcher (Improved)
 * Fixes mobile navigation conflicts with engineering best practices
 */
(function ($) {
  'use strict';

  // Singleton guard - prevent double initialization
  if (window.languageSwitcherInitialized) return;
  window.languageSwitcherInitialized = true;

  // Cache frequently used selectors
  const $body = $('body');
  const $document = $(document);

  function init() {
    enhanceDesktopSwitcher();
    // Only create mobile switcher on mobile devices
    if (window.matchMedia('(max-width: 768px)').matches) {
      buildMobileSwitcher();
    }
  }

  /* ================= Desktop Language Switcher ================= */
  function enhanceDesktopSwitcher() {
    $('.language-switcher a').on('click', function (e) {
      e.preventDefault();
      const url = $(this).attr('href');
      
      // Add smooth transition effect
      $body.addClass('page-transitioning');
      setTimeout(() => (window.location.href = url), 200);
    });
  }

  /* ================= Mobile Language Switcher ================= */
  function buildMobileSwitcher() {
    // Remove any existing mobile switcher to prevent duplicates
    $('.mobile-language-switcher').remove();

    // Detect current language and build options array
    const currentLang = $('.language-switcher .active-lang, .language-switcher .lang-option.active').text().trim() || 'EN';
    const langOptions = $('.language-switcher .lang-option').map(function () {
      return {
        lang: escapeHtml($(this).text().trim()),
        url: escapeHtml($(this).attr('href')),
        active: $(this).hasClass('active-lang') || $(this).hasClass('active'),
      };
    }).get();

    // Only proceed if we have language options
    if (!langOptions.length) return;

    // Create and append mobile switcher
    const $dropdown = $(generateMobileHTML(currentLang, langOptions));
    $body.append($dropdown);
    bindMobileEvents($dropdown);
  }

  function generateMobileHTML(current, options) {
    const optionsHTML = options
      .map(option => `<a href="${option.url}" class="${option.active ? 'active' : ''}" role="menuitem">${option.lang}</a>`)
      .join('');

    return `
      <div class="mobile-language-switcher">
        <button class="mobile-lang-toggle" type="button" aria-haspopup="true" aria-expanded="false">
          <span class="current-lang">${escapeHtml(current)}</span>
          <span class="toggle-arrow">▼</span>
        </button>
        <div class="mobile-lang-options" role="menu">
          ${optionsHTML}
        </div>
      </div>`;
  }

  function bindMobileEvents($root) {
    const $toggle = $root.find('.mobile-lang-toggle');
    const $options = $root.find('.mobile-lang-options');
    const $arrow = $toggle.find('.toggle-arrow');

    // Toggle dropdown when button is clicked
    $toggle.on('click', function (e) {
      e.stopPropagation();
      
      const isOpen = $options.is(':visible');
      const willOpen = !isOpen;
      
      // Toggle visibility
      $options.toggle();
      
      // Update ARIA and visual states
      $(this)
        .attr('aria-expanded', willOpen.toString())
        .toggleClass('active', willOpen);
        
      // Rotate arrow with CSS instead of text change
      $arrow.toggleClass('rotated', willOpen);
    });

    // Handle language selection
    $options.find('a').on('click', function (e) {
      e.preventDefault();
      
      const targetUrl = $(this).attr('href');
      const selectedLang = $(this).text().trim();
      
      // Update current language display
      $toggle.find('.current-lang').text(selectedLang);
      
      // Close dropdown with proper cleanup
      closeDropdown($toggle, $options, $arrow);
      
      // Add transition effect and navigate
      $body.addClass('page-transitioning');
      setTimeout(() => (window.location.href = targetUrl), 200);
    });

    // Close dropdown when clicking outside
    $document.on('click', function (e) {
      if (!$(e.target).closest('.mobile-language-switcher').length) {
        closeDropdown($toggle, $options, $arrow);
      }
    });

    // Close dropdown on escape key
    $document.on('keydown', function (e) {
      if (e.key === 'Escape' && $options.is(':visible')) {
        closeDropdown($toggle, $options, $arrow);
        $toggle.focus(); // Return focus to button
      }
    });
  }

  function closeDropdown($toggle, $options, $arrow) {
    $options.hide();
    $toggle
      .attr('aria-expanded', 'false')
      .removeClass('active');
    $arrow.removeClass('rotated');
  }

  // XSS protection - escape HTML characters
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  // Initialize when DOM is ready
  $(document).ready(init);

  // Re-initialize on window resize (mobile/desktop switch)
  let resizeTimer;
  $(window).on('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      // Remove existing mobile switcher
      $('.mobile-language-switcher').remove();
      // Rebuild if now on mobile
      if (window.matchMedia('(max-width: 768px)').matches) {
        buildMobileSwitcher();
      }
    }, 250);
  });

})(jQuery);