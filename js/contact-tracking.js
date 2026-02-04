/**
 * ============================================
 * SKY TRAVEL JM - CONTACT TRACKING & FORM HANDLER
 * ============================================
 *
 * This script handles:
 * 1. GA4 event tracking for contact method clicks
 * 2. Lead capture form validation and submission
 * 3. Netlify function integration for Notion database
 * 4. Toast notifications for user feedback
 *
 * REQUIREMENTS:
 * - GA4 must be loaded in <head> with gtag() function available
 * - Form must have id="contact-form"
 * - Netlify function at /.netlify/functions/contact-lead
 *
 * GA4 EVENTS TRACKED:
 * - contact_click: When user clicks any contact card (sms/call/whatsapp/email)
 * - contact_form_submit: When form is submitted (before API call)
 * - contact_form_success: When lead is saved successfully
 * - contact_form_error: When there's an error saving the lead
 *
 * Last updated: 2026-01-27
 * ============================================
 */

(function() {
    'use strict';

    // ============================================
    // LANGUAGE DETECTION & STRINGS
    // ============================================

    var lang = (document.documentElement.lang || 'en').toLowerCase();
    var isSpanish = lang.indexOf('es') === 0;

    var strings = isSpanish ? {
        firstNameRequired: 'El nombre es requerido',
        lastNameRequired: 'El apellido es requerido',
        emailRequired: 'El correo electrónico es requerido',
        emailInvalid: 'Ingresa un correo electrónico válido',
        phoneRequired: 'El teléfono es requerido',
        phoneInvalid: 'Ingresa un número de teléfono válido',
        contactMethodRequired: 'Selecciona un medio de contacto',
        pilgrimageRequired: 'La peregrinación de interés es requerida',
        pilgrimageMinLength: 'Ingresa al menos 2 caracteres',
        consentRequired: 'Debes aceptar ser contactado',
        submitting: 'Enviando...',
        successToast: '¡Gracias! Tu consulta ha sido enviada. Te contactaremos pronto.',
        errorToast: 'Hubo un error al enviar tu consulta. Por favor, intenta de nuevo.'
    } : {
        firstNameRequired: 'First name is required',
        lastNameRequired: 'Last name is required',
        emailRequired: 'Email is required',
        emailInvalid: 'Please enter a valid email address',
        phoneRequired: 'Phone number is required',
        phoneInvalid: 'Please enter a valid phone number',
        contactMethodRequired: 'Please select a contact method',
        pilgrimageRequired: 'Pilgrimage of interest is required',
        pilgrimageMinLength: 'Please enter at least 2 characters',
        consentRequired: 'You must agree to be contacted',
        submitting: 'Submitting...',
        successToast: 'Thank you! Your inquiry has been submitted. We will contact you soon.',
        errorToast: 'There was an error submitting your inquiry. Please try again.'
    };

    // ============================================
    // TOAST NOTIFICATION SYSTEM
    // ============================================

    /**
     * Creates and displays a toast notification
     * @param {string} message - The message to display
     * @param {string} type - 'success' or 'error'
     */
    function showToast(message, type) {
        // Create container if it doesn't exist
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;';
            document.body.appendChild(container);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        // Inline styles for the toast
        const bgColor = type === 'success'
            ? 'linear-gradient(135deg, #c8a97e 0%, #b69268 100%)'
            : 'linear-gradient(135deg, #c41e3a 0%, #a01830 100%)';

        toast.style.cssText = `
            padding: 1rem 1.5rem;
            border-radius: 10px;
            color: #fff;
            font-size: 0.95rem;
            font-weight: 500;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            max-width: 350px;
            opacity: 1;
            background: ${bgColor};
            animation: slideIn 0.3s ease-out;
        `;

        container.appendChild(toast);

        // Auto-remove after 7 seconds
        setTimeout(function() {
            toast.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(function() {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }

    // Add CSS animations for toast
    function addToastStyles() {
        if (document.getElementById('toast-styles')) return;

        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // ============================================
    // GA4 EVENT TRACKING
    // ============================================

    /**
     * Safely sends a GA4 event
     * @param {string} eventName - The event name
     * @param {object} params - Event parameters
     */
    function trackEvent(eventName, params) {
        if (typeof gtag === 'function') {
            gtag('event', eventName, params);
        } else {
            console.warn('GA4 gtag() not available. Event not tracked:', eventName, params);
        }
    }

    /**
     * Tracks contact method clicks (sms, call, whatsapp, email)
     */
    function setupContactClickTracking() {
        const contactMethods = [
            { selector: '.sms-contact-link', method: 'sms' },
            { selector: '.call-contact-link', method: 'call' },
            { selector: '.whatsapp-contact-link', method: 'whatsapp' },
            { selector: '.email-contact-link', method: 'email' }
        ];

        contactMethods.forEach(function(item) {
            const links = document.querySelectorAll(item.selector);
            links.forEach(function(link) {
                link.addEventListener('click', function() {
                    trackEvent('contact_click', {
                        method: item.method,
                        page: window.location.pathname,
                        event_category: 'engagement'
                    });
                });
            });
        });
    }

    // ============================================
    // UTM PARAMETER PARSING
    // ============================================

    /**
     * Extracts UTM parameters from the current URL
     * @returns {object} UTM parameters
     */
    function getUTMParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            utm_source: params.get('utm_source') || '',
            utm_medium: params.get('utm_medium') || '',
            utm_campaign: params.get('utm_campaign') || ''
        };
    }

    // ============================================
    // FORM VALIDATION
    // ============================================

    /**
     * Validates email format
     * @param {string} email - Email address to validate
     * @returns {boolean} Whether email is valid
     */
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validates phone number (basic check)
     * @param {string} phone - Phone number to validate
     * @returns {boolean} Whether phone is valid
     */
    function isValidPhone(phone) {
        // At least 7 digits, can include +, -, (), spaces
        const cleaned = phone.replace(/[\s\-\(\)]/g, '');
        return /^\+?\d{7,15}$/.test(cleaned);
    }

    /**
     * Shows an error for a specific field
     * @param {string} fieldId - The field ID
     * @param {string} message - Error message
     */
    function showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorEl = document.getElementById(fieldId + '-error');

        if (field) {
            field.classList.add('error');
        }
        if (errorEl) {
            errorEl.textContent = message;
        }
    }

    /**
     * Clears error for a specific field
     * @param {string} fieldId - The field ID
     */
    function clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        const errorEl = document.getElementById(fieldId + '-error');

        if (field) {
            field.classList.remove('error');
        }
        if (errorEl) {
            errorEl.textContent = '';
        }
    }

    /**
     * Clears all form errors
     */
    function clearAllErrors() {
        const fields = ['firstName', 'lastName', 'email', 'phone', 'preferredContact', 'pilgrimageInterest', 'consentContact'];
        fields.forEach(clearFieldError);
    }

    /**
     * Validates the entire form
     * @param {FormData} formData - Form data object
     * @returns {object} { isValid: boolean, errors: object }
     */
    function validateForm(formData) {
        const errors = {};

        // First Name
        const firstName = (formData.get('firstName') || '').trim();
        if (!firstName) {
            errors.firstName = strings.firstNameRequired;
        }

        // Last Name
        const lastName = (formData.get('lastName') || '').trim();
        if (!lastName) {
            errors.lastName = strings.lastNameRequired;
        }

        // Email
        const email = (formData.get('email') || '').trim();
        if (!email) {
            errors.email = strings.emailRequired;
        } else if (!isValidEmail(email)) {
            errors.email = strings.emailInvalid;
        }

        // Phone
        const phone = (formData.get('phone') || '').trim();
        if (!phone) {
            errors.phone = strings.phoneRequired;
        } else if (!isValidPhone(phone)) {
            errors.phone = strings.phoneInvalid;
        }

        // Preferred Contact
        const preferredContact = formData.get('preferredContact') || '';
        if (!preferredContact) {
            errors.preferredContact = strings.contactMethodRequired;
        }

        // Pilgrimage Interest (min 2 chars after trim)
        const pilgrimageInterest = (formData.get('pilgrimageInterest') || '').trim();
        if (!pilgrimageInterest) {
            errors.pilgrimageInterest = strings.pilgrimageRequired;
        } else if (pilgrimageInterest.length < 2) {
            errors.pilgrimageInterest = strings.pilgrimageMinLength;
        }

        // Consent Contact (checkbox)
        const consentContact = formData.get('consentContact');
        if (!consentContact) {
            errors.consentContact = strings.consentRequired;
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors: errors
        };
    }

    // ============================================
    // FORM SUBMISSION HANDLER
    // ============================================

    /**
     * Handles form submission
     * @param {Event} e - Submit event
     */
    async function handleFormSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const submitBtn = document.getElementById('submit-btn');
        const originalBtnText = submitBtn.textContent;

        // Clear previous errors
        clearAllErrors();

        // Get form data
        const formData = new FormData(form);

        // Check honeypot (anti-bot)
        const honeypot = formData.get('website');
        if (honeypot) {
            // Silently reject - don't show error to bots
            console.log('Bot detected via honeypot');
            return;
        }

        // Validate form
        const validation = validateForm(formData);

        if (!validation.isValid) {
            // Show errors
            Object.keys(validation.errors).forEach(function(fieldId) {
                showFieldError(fieldId, validation.errors[fieldId]);
            });

            // Focus first error field
            const firstErrorField = Object.keys(validation.errors)[0];
            const firstField = document.getElementById(firstErrorField);
            if (firstField) {
                firstField.focus();
            }

            return;
        }

        // Get values for tracking
        const preferredContact = formData.get('preferredContact');
        const pilgrimageInterest = (formData.get('pilgrimageInterest') || '').trim().substring(0, 80);

        // Fire GA4 contact_form_submit event
        trackEvent('contact_form_submit', {
            preferred_contact: preferredContact,
            pilgrimage_interest: pilgrimageInterest,
            page: window.location.pathname,
            event_category: 'engagement'
        });

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = strings.submitting;

        // Prepare data for API
        const utmParams = getUTMParams();
        const payload = {
            firstName: (formData.get('firstName') || '').trim(),
            lastName: (formData.get('lastName') || '').trim(),
            email: (formData.get('email') || '').trim(),
            phone: (formData.get('phone') || '').trim(),
            preferredContact: preferredContact,
            pilgrimageInterest: (formData.get('pilgrimageInterest') || '').trim(),
            message: (formData.get('message') || '').trim(),
            consentContact: !!formData.get('consentContact'),
            consentMarketing: !!formData.get('consentMarketing'),
            website: formData.get('website') || '',
            sourcePage: window.location.pathname,
            utmSource: utmParams.utm_source,
            utmMedium: utmParams.utm_medium,
            utmCampaign: utmParams.utm_campaign
        };

        try {
            const response = await fetch('/.netlify/functions/contact-lead', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Fire GA4 success event
                trackEvent('contact_form_success', {
                    page: window.location.pathname,
                    event_category: 'conversion'
                });

                // Show success toast
                showToast(strings.successToast, 'success');

                // Reset form
                form.reset();
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Form submission error:', error);

            // Fire GA4 error event
            const errorMessage = (error.message || 'Unknown error').substring(0, 100);
            trackEvent('contact_form_error', {
                error_message: errorMessage,
                page: window.location.pathname,
                event_category: 'error'
            });

            // Show error toast
            showToast(strings.errorToast, 'error');
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }

    // ============================================
    // REAL-TIME VALIDATION (clear errors on input)
    // ============================================

    function setupRealTimeValidation() {
        const fields = ['firstName', 'lastName', 'email', 'phone', 'preferredContact', 'pilgrimageInterest'];

        fields.forEach(function(fieldId) {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', function() {
                    clearFieldError(fieldId);
                });
                field.addEventListener('change', function() {
                    clearFieldError(fieldId);
                });
            }
        });

        // Special handling for consent checkbox
        const consentCheckbox = document.getElementById('consentContact');
        if (consentCheckbox) {
            consentCheckbox.addEventListener('change', function() {
                clearFieldError('consentContact');
            });
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Sets up all tracking and form handlers once the form is available
     */
    function setupAll() {
        // Setup contact click tracking
        setupContactClickTracking();

        // Setup form handling
        const form = document.getElementById('contact-form');
        if (form && !form.dataset.trackingInitialized) {
            form.dataset.trackingInitialized = 'true';
            form.addEventListener('submit', handleFormSubmit);
            setupRealTimeValidation();
        }
    }

    /**
     * Main initialization function
     * Handles both static and dynamically loaded contact sections
     */
    function init() {
        // Add toast styles immediately
        addToastStyles();

        // Check if form already exists (static load)
        const form = document.getElementById('contact-form');
        if (form) {
            setupAll();
        } else {
            // Form doesn't exist yet - watch for dynamic component loading
            const observer = new MutationObserver(function(mutations) {
                const form = document.getElementById('contact-form');
                if (form && !form.dataset.trackingInitialized) {
                    setupAll();
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    // Expose global function for manual initialization (if needed)
    window.initContactTracking = setupAll;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
