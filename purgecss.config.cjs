module.exports = {
  content: [
    './*.html',
    './components/**/*.html',
    './blog/**/*.html',
    './experiences/**/*.html',
    './es/**/*.html',
    './testimony/**/*.html',
    './js/**/*.js',
    './testimony/js/**/*.js'
  ],
  css: ['./style.css'],
  safelist: {
    standard: [
      // Core state toggles
      'active', 'hidden', 'hide', 'show', 'visible',
      'menu-open', 'nav-menu-open', 'nav-scrolled', 'scrolled', 'page-transitioning',
      // Navigation & language switcher
      'active-lang', 'lang-option', 'mobile-language-switcher', 'mobile-lang-toggle',
      'mobile-lang-options', 'toggle-arrow', 'current-lang', 'rotated',
      // Sliders / carousels / tabs
      'slide', 'indicator', 'prev', 'next', 'prev-arrow', 'next-arrow',
      'tab-button', 'tab-pane', 'tab-content', 'tab-container',
      // Blog filters & galleries
      'filter-btn', 'gallery-item',
      // Testimonials
      'simple-testimonials-grid', 'testimonials-grid', 'testimonials-section',
      'testimonials-wrapper', 'testimonials-loading', 'testimonials-error',
      'testimonials-empty', 'testimonials-count', 'testimonial-card',
      'testimonial-body', 'featured', 'load-more-testimonials', 'loading-spinner',
      'read-more-btn', 'is-expanded',
      // Forms / toasts / status
      'form-message', 'field-error', 'error', 'error-message',
      'success', 'success-message', 'btn-loading', 'btn-text', 'submit-btn',
      'toast', 'toast-container', 'toast-close', 'toast-icon', 'toast-content',
      'toast-success', 'toast-warning', 'toast-error', 'toast-info',
      // Photo / media uploads
      'photo-input-status', 'photo-preview', 'photo-file-list', 'photo-grid',
      'photo-chip', 'photo-chip-img', 'photo-chip-meta', 'photo-chip-name',
      'photo-chip-size', 'photo-chip-remove',
      // Misc UI
      'reading-progress', 'scroll-to-top', 'scroll-top', 'copy-msg'
    ],
    greedy: [
      /^toast/,
      /^testimonials?/,
      /^testimonial/,
      /^mobile-lang/,
      /^photo-chip/
    ],
    deep: [
      /(nav|menu|lang|toast|testimonial|photo|modal|dropdown)[\\w-]*/
    ]
  }
};
