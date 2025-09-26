/**
 * Simple Testimonials Display - Test Version
 * File: testimony/js/simple-testimonials.js
 * Shows sample testimonials while GitHub Issues are being set up
 */

document.addEventListener('DOMContentLoaded', function() {
    // Sample testimonials data (replace with GitHub API later)
    const sampleTestimonials = [
        {
            id: 1,
            name: "María González",
            location: "Miami, FL",
            pilgrimage: "Holy Land 2024",
            text: "Sky Travel J&M creó un viaje profundamente espiritual para nosotros. Cada detalle fue perfecto, desde los sitios sagrados hasta las cómodas acomodaciones. Su experiencia y pasión por las peregrinaciones católicas brillan, haciendo nuestra experiencia inolvidable.",
            date: "2024-11-15",
            approved: true
        },
        {
            id: 2,
            name: "John Matthews",
            location: "Fort Lauderdale, FL",
            pilgrimage: "Rome & Vatican 2024",
            text: "Our pilgrimage with Sky Travel J&M exceeded all expectations! The itinerary was thoughtfully designed, allowing us to connect deeply with our faith. Their attention to detail and knowledge made this a truly enriching journey.",
            date: "2024-10-20",
            approved: true
        },
        {
            id: 3,
            name: "Carmen Rodríguez", 
            location: "Barcelona, España",
            pilgrimage: "Camino de Santiago 2024",
            text: "Una experiencia transformadora. El equipo de Sky Travel nos guió con profesionalismo y un profundo entendimiento espiritual. Cada paso del Camino fue una bendición gracias a su cuidadosa planificación.",
            date: "2024-09-10",
            approved: true
        },
        {
            id: 4,
            name: "Michael O'Connor",
            location: "Dublin, Ireland", 
            pilgrimage: "Medjugorje 2024",
            text: "The spiritual guidance and local knowledge provided by Sky Travel made our pilgrimage to Medjugorje deeply meaningful. Every moment felt sacred, and the logistics were flawlessly handled.",
            date: "2024-08-15",
            approved: true
        },
        {
            id: 5,
            name: "Isabella Santos",
            location: "São Paulo, Brasil",
            pilgrimage: "Fátima 2024", 
            text: "Nuestra peregrinación a Fátima fue más que un viaje, fue una renovación espiritual. Sky Travel entendió perfectamente nuestras necesidades espirituales y culturales. Altamente recomendado.",
            date: "2024-07-25",
            approved: true
        },
        {
            id: 6,
            name: "Robert Taylor",
            location: "Toronto, Canada",
            pilgrimage: "Holy Land 2023",
            text: "Walking in the footsteps of Jesus was made possible by Sky Travel's expertise. Their deep knowledge of the sacred sites and seamless coordination made this a once-in-a-lifetime spiritual experience.",
            date: "2023-12-05",
            approved: true
        }
    ];

    let currentPage = 0;
    const testimonialsPerPage = 3;
    let currentLanguage = document.documentElement.lang || 'en';
    
    // DOM elements
    const loadingElement = document.getElementById('testimonials-loading');
    const containerElement = document.getElementById('testimonials-container');
    const loadMoreBtn = document.getElementById('load-more-btn');

    // Initialize testimonials display
    function initTestimonials() {
        // Hide loading
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }

        // Show initial testimonials
        displayTestimonials();
        
        // Set up load more button
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', loadMoreTestimonials);
            updateLoadMoreButton();
        }
    }

    // Display testimonials for current page
    function displayTestimonials() {
        if (!containerElement) return;

        const startIndex = currentPage * testimonialsPerPage;
        const endIndex = startIndex + testimonialsPerPage;
        const testimonialsToShow = sampleTestimonials.slice(startIndex, endIndex);

        testimonialsToShow.forEach(testimonial => {
            const testimonialCard = createTestimonialCard(testimonial);
            containerElement.appendChild(testimonialCard);
        });

        updateLoadMoreButton();
    }

    // Create individual testimonial card
    function createTestimonialCard(testimonial) {
        const card = document.createElement('div');
        card.className = 'testimonial-card';
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';

        // Get first letter for avatar
        const firstLetter = testimonial.name.charAt(0).toUpperCase();

        card.innerHTML = `
            <div class="testimonial-content">
                <p class="testimonial-text">"${testimonial.text}"</p>
                <div class="testimonial-author">
                    <div class="author-avatar">${firstLetter}</div>
                    <div class="author-info">
                        <h4>${testimonial.name}</h4>
                        <p class="author-location">${testimonial.location}</p>
                        <p class="pilgrimage-info">${testimonial.pilgrimage}</p>
                    </div>
                </div>
            </div>
        `;

        // Animate card appearance
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100);

        return card;
    }

    // Load more testimonials
    function loadMoreTestimonials() {
        currentPage++;
        displayTestimonials();
    }

    // Update load more button visibility
    function updateLoadMoreButton() {
        if (!loadMoreBtn) return;

        const totalShown = (currentPage + 1) * testimonialsPerPage;
        const hasMore = totalShown < sampleTestimonials.length;

        if (hasMore) {
            loadMoreBtn.classList.remove('hidden');
        } else {
            loadMoreBtn.classList.add('hidden');
        }
    }

    // Show empty state if no testimonials
    function showEmptyState() {
        if (!containerElement) return;

        const emptyText = currentLanguage === 'es' 
            ? 'Aún no hay testimonios disponibles.' 
            : 'No testimonials available yet.';

        containerElement.innerHTML = `
            <div class="testimonials-empty">
                <h3>${emptyText}</h3>
                <p>${currentLanguage === 'es' 
                    ? 'Sé el primero en compartir tu experiencia de peregrinación.'
                    : 'Be the first to share your pilgrimage experience.'
                }</p>
            </div>
        `;
    }

    // Initialize when DOM is ready
    initTestimonials();
});