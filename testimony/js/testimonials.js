/**
 * =============================================================================
 * 📄 TESTIMONIALS DISPLAY LOGIC (Updated - No Inline Styles)
 * 🌐 File: testimony/js/testimonials.js
 * 📝 Purpose: Paginate testimonials generated directly into the HTML
 * 🔗 Used on: testimonials.html and testimonios.html
 * =============================================================================
 */

class TestimonialsDisplay {
  constructor() {
    // Configuration
    this.config = {
      testimonialsPerPage: 60, // All verified testimonials are pre-rendered in HTML, grouped by destination
      autoLoadMore: false,
      scrollThreshold: 300, // Pixels from bottom to trigger load more
    };

    // State management
    this.state = {
      allTestimonials: [],
      currentPage: 1,
      loading: false,
      language: this.detectPageLanguage(),
    };

    // DOM elements (will be found during init)
    this.elements = {};

    // Initialize when DOM is ready
    this.init();
  }

  /**
   * Initialize the testimonials system
   */
  init() {
    try {
      console.log("🚀 Initializing testimonials display...");

      // Find DOM elements
      this.findElements();

      // Set up event listeners
      this.setupEventListeners();

      this.loadTestimonials();

      console.log("✅ Testimonials system initialized");
    } catch (error) {
      console.error("❌ Error initializing testimonials:", error);
      this.showError();
    }
  }

  /**
   * Find all necessary DOM elements
   */
  findElements() {
    // Main container for testimonials
    this.elements.container =
      document.querySelector("#testimonials-container") ||
      document.querySelector(".simple-testimonials-grid") ||
      document.querySelector(".testimonials-grid") ||
      document.querySelector(".testimonials-wrapper");

    // Load more button
    this.elements.loadMoreBtn =
      document.querySelector("#load-more-btn") ||
      document.querySelector(".load-more-testimonials");

    // Status elements
    this.elements.loadingIndicator =
      document.querySelector(".testimonials-loading") ||
      document.querySelector("#loading-testimonials");
    this.elements.errorMessage =
      document.querySelector(".testimonials-error") ||
      document.querySelector("#error-testimonials");
    // Count display
    this.elements.countDisplay = document.querySelector(".testimonials-count");

    // If container doesn't exist, create it
    if (!this.elements.container) {
      this.elements.container = this.createTestimonialsContainer();
    }

    console.log("📍 Found DOM elements:", Object.keys(this.elements).length);
  }

  /**
   * Create testimonials container if it doesn't exist
   */
  createTestimonialsContainer() {
    const section =
      document.querySelector(".testimonials-section .container") ||
      document.querySelector(".testimonials-section") ||
      document.body;

    const container = document.createElement("div");
    container.className = "simple-testimonials-grid";
    container.id = "testimonials-container";

    section.appendChild(container);
    return container;
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Load more button
    if (this.elements.loadMoreBtn) {
      this.elements.loadMoreBtn.addEventListener("click", () => {
        this.loadMoreTestimonials();
      });
    }

    // Auto-load more on scroll
    if (this.config.autoLoadMore) {
      window.addEventListener("scroll", this.handleScroll.bind(this));
    }

    // Refresh button (if exists)
    const refreshBtn = document.querySelector("#refresh-testimonials");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
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
      return htmlLang.startsWith("es") ? "es" : "en";
    }

    // Check URL for Spanish indicators
    const url = window.location.href.toLowerCase();
    if (
      url.includes("-es.html") ||
      url.includes("/es/") ||
      url.includes("testimonio")
    ) {
      return "es";
    }

    return "en"; // Default to English
  }

  /**
   * Use the testimonial cards already rendered in the page.
   */
  loadTestimonials() {
    this.state.allTestimonials = [
      ...this.elements.container.querySelectorAll(".testimonial-card"),
    ];
    this.state.currentPage = 1;

    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.classList.add("hidden");
    }

    this.displayTestimonials();
  }

  /**
   * Display testimonials on the page
   */
  displayTestimonials() {
    const visibleCount =
      this.state.currentPage * this.config.testimonialsPerPage;
    const cards = this.state.allTestimonials;

    cards.forEach((card, index) => {
      card.classList.toggle("hidden", index >= visibleCount);
    });

    // Hide destination groups whose cards are all hidden (no empty headings).
    this.elements.container
      .querySelectorAll(".testimonial-group")
      .forEach((group) => {
        const hasVisible = group.querySelector(".testimonial-card:not(.hidden)");
        group.classList.toggle("hidden", !hasVisible);
      });

    this.updateLoadMoreButton();
    this.updateCount();

    requestAnimationFrame(() => this.attachReadMoreToggles(this.elements.container));
  }

  /**
   * Load more testimonials (pagination)
   */
  loadMoreTestimonials() {
    if (this.state.loading) return;

    const hasMorePages =
      this.state.currentPage * this.config.testimonialsPerPage <
      this.state.allTestimonials.length;

    if (!hasMorePages) {
      console.log("📄 No more testimonials to load");
      return;
    }

    this.state.currentPage++;
    this.displayTestimonials();

    console.log(`📖 Loaded page ${this.state.currentPage}`);
  }

  /**
   * Update load more button visibility
   */
  updateLoadMoreButton() {
    if (!this.elements.loadMoreBtn) return;

    const hasMorePages =
      this.state.currentPage * this.config.testimonialsPerPage <
      this.state.allTestimonials.length;

    if (hasMorePages) {
      this.elements.loadMoreBtn.classList.remove("hidden");
      const remaining =
        this.state.allTestimonials.length -
        this.state.currentPage * this.config.testimonialsPerPage;
      const loadMoreText =
        this.state.language === "es"
          ? `Ver más testimonios (${remaining} restantes)`
          : `View more testimonials (${remaining} remaining)`;
      this.elements.loadMoreBtn.textContent = loadMoreText;
    } else {
      this.elements.loadMoreBtn.classList.add("hidden");
    }
  }

  /**
   * Update testimonials count display
   */
  updateCount() {
    if (!this.elements.countDisplay) return;

    const total = this.state.allTestimonials.length;
    const shown = Math.min(
      this.state.currentPage * this.config.testimonialsPerPage,
      total,
    );

    const countText =
      this.state.language === "es"
        ? `Mostrando ${shown} de ${total} testimonios`
        : `Showing ${shown} of ${total} testimonials`;

    this.elements.countDisplay.textContent = countText;
  }

  refreshTestimonials() {
    this.loadTestimonials();
  }
  /**
   * Show loading state
   */
 showLoading() {
  this.state.loading = true;

  if (this.elements.loadingIndicator) {
    this.elements.loadingIndicator.classList.remove("hidden");
    return;
  }

  let loading = this.elements.container.querySelector(
    ".testimonials-loading",
  );

  if (!loading) {
    loading = document.createElement("div");
    loading.className = "testimonials-loading";
    loading.innerHTML = `
      <div class="loading-spinner"></div>
      <p>
        ${this.state.language === "es"
          ? "Cargando testimonios..."
          : "Loading testimonials..."}
      </p>
    `;

    this.elements.container.appendChild(loading);
  }

  // Importante: permite que hideLoading() lo oculte después
  this.elements.loadingIndicator = loading;
}
  /**
   * Hide loading state
   */
  hideLoading() {
    this.state.loading = false;

    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.classList.add("hidden");
    }
  }

  /**
   * Show error state
   */
  showError() {
  const errorMessage =
    this.state.language === "es"
      ? "Error cargando testimonios. Por favor intenta de nuevo más tarde."
      : "Error loading testimonials. Please try again later.";

  if (this.elements.errorMessage) {
    this.elements.errorMessage.textContent = errorMessage;
    this.elements.errorMessage.classList.remove("hidden");
  } else {
    let error = this.elements.container.querySelector(".testimonials-error");

    if (!error) {
      error = document.createElement("div");
      error.className = "testimonials-error";
      this.elements.container.appendChild(error);
    }

    error.innerHTML = `
      <p>❌ ${errorMessage}</p>
      <button onclick="location.reload()" class="elegant-button">
        ${this.state.language === "es" ? "Intentar de Nuevo" : "Try Again"}
      </button>
    `;
  }

  this.hideLoading();
}

  /**
   * Attach read more/less toggles to testimonial bodies that overflow
   */
  attachReadMoreToggles(root = document) {
    const bodies = root.querySelectorAll(".testimonial-body");
    bodies.forEach((body) => {
      // Hidden cards cannot be measured until pagination makes them visible.
      if (!body.getClientRects().length) return;

      const wasExpanded = body.classList.contains("is-expanded");
      body.classList.add("is-expanded");
      const full = body.scrollHeight;
      body.classList.remove("is-expanded");
      const clamped = body.clientHeight;
      body.classList.toggle("is-expanded", wasExpanded);

      const needsToggle = full > clamped + 8;
      let btn = body.nextElementSibling?.classList?.contains("read-more-btn")
        ? body.nextElementSibling
        : null;

      if (needsToggle && !btn) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "read-more-btn";
        btn.addEventListener("click", () => {
          const expanded = body.classList.toggle("is-expanded");
          this.updateReadMoreButton(btn, expanded);
        });
        body.insertAdjacentElement("afterend", btn);
      }

      if (btn) this.updateReadMoreButton(btn, wasExpanded);
    });
  }

  updateReadMoreButton(button, expanded) {
    button.textContent = expanded
      ? this.state.language === "es" ? "Leer menos" : "Read less"
      : this.state.language === "es" ? "Leer m\u00e1s" : "Read more";
    button.setAttribute("aria-expanded", String(expanded));
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.TestimonialsApp = new TestimonialsDisplay();
});

// Export for module environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = TestimonialsDisplay;
}
