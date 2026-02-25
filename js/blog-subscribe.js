/**
 * ============================================
 * SKY TRAVEL JM - BLOG SUBSCRIBE FORM HANDLER
 * ============================================
 *
 * Handles:
 * 1. Client-side validation for blog subscription form
 * 2. Submission to /.netlify/functions/blog-subscribe
 * 3. Toast notifications for user feedback
 * 4. GA4 event tracking
 * 5. MutationObserver for dynamically loaded form
 *
 * GA4 EVENTS:
 * - blog_subscribe_submit
 * - blog_subscribe_success
 * - blog_subscribe_error
 *
 * Last updated: 2026-02-24
 * ============================================
 */

(function () {
    'use strict';

    // ============================================
    // LANGUAGE DETECTION & STRINGS
    // ============================================

    var lang = (document.documentElement.lang || 'en').toLowerCase();
    var isSpanish = lang.indexOf('es') === 0;

    var strings = isSpanish ? {
        nameRequired: 'El nombre es requerido',
        emailRequired: 'El correo electrónico es requerido',
        emailInvalid: 'Ingresa un correo electrónico válido',
        phoneRequired: 'El teléfono es requerido',
        phoneInvalid: 'Ingresa un número de teléfono válido',
        notificationRequired: 'Selecciona una preferencia de notificación',
        consentRequired: 'Debes aceptar recibir notificaciones',
        submitting: 'Enviando...',
        successToast: '¡Gracias por suscribirte! Te notificaremos sobre nuevas publicaciones.',
        errorToast: 'Hubo un error al procesar tu suscripción. Por favor, intenta de nuevo.'
    } : {
        nameRequired: 'Name is required',
        emailRequired: 'Email is required',
        emailInvalid: 'Please enter a valid email address',
        phoneRequired: 'Phone number is required',
        phoneInvalid: 'Please enter a valid phone number',
        notificationRequired: 'Please select a notification preference',
        consentRequired: 'You must agree to receive notifications',
        submitting: 'Submitting...',
        successToast: 'Thank you for subscribing! We\'ll notify you about new posts.',
        errorToast: 'There was an error processing your subscription. Please try again.'
    };

    // ============================================
    // TOAST NOTIFICATION SYSTEM
    // ============================================

    function showToast(message, type) {
        var container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;';
            document.body.appendChild(container);
        }

        var toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.textContent = message;

        var bgColor = type === 'success'
            ? 'linear-gradient(135deg, #c8a97e 0%, #b69268 100%)'
            : 'linear-gradient(135deg, #c41e3a 0%, #a01830 100%)';

        toast.style.cssText =
            'padding:1rem 1.5rem;border-radius:10px;color:#fff;font-size:0.95rem;font-weight:500;' +
            'box-shadow:0 4px 20px rgba(0,0,0,0.2);max-width:350px;opacity:1;background:' + bgColor + ';' +
            'animation:slideIn 0.3s ease-out;';

        container.appendChild(toast);

        setTimeout(function () {
            toast.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 5000);
    }

    function addToastStyles() {
        if (document.getElementById('bs-toast-styles')) return;
        var style = document.createElement('style');
        style.id = 'bs-toast-styles';
        style.textContent =
            '@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}' +
            '@keyframes slideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}';
        document.head.appendChild(style);
    }

    // ============================================
    // GA4 EVENT TRACKING
    // ============================================

    function trackEvent(eventName, params) {
        if (typeof gtag === 'function') {
            gtag('event', eventName, params);
        }
    }

    // ============================================
    // FORM VALIDATION
    // ============================================

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidPhone(phone) {
        var cleaned = phone.replace(/[\s\-\(\)]/g, '');
        return /^\+?\d{7,15}$/.test(cleaned);
    }

    function showFieldError(fieldId, message) {
        var field = document.getElementById(fieldId);
        var errorEl = document.getElementById(fieldId + '-error');
        if (field) field.classList.add('bs-error');
        if (errorEl) errorEl.textContent = message;
    }

    function clearFieldError(fieldId) {
        var field = document.getElementById(fieldId);
        var errorEl = document.getElementById(fieldId + '-error');
        if (field) field.classList.remove('bs-error');
        if (errorEl) errorEl.textContent = '';
    }

    function clearAllErrors() {
        var fields = ['bs-name', 'bs-email', 'bs-phone', 'bs-notificationPref', 'bs-consentSubscribe'];
        fields.forEach(clearFieldError);
    }

    function validateForm(formData) {
        var errors = {};

        var name = (formData.get('name') || '').trim();
        if (!name) errors['bs-name'] = strings.nameRequired;

        var notificationPref = formData.get('notificationPref') || '';
        if (!notificationPref) errors['bs-notificationPref'] = strings.notificationRequired;

        // Conditional validation based on notification preference
        var email = (formData.get('email') || '').trim();
        var phone = (formData.get('phone') || '').trim();

        if (notificationPref === 'Correo') {
            // Email selected — email is required
            if (!email) {
                errors['bs-email'] = strings.emailRequired;
            } else if (!isValidEmail(email)) {
                errors['bs-email'] = strings.emailInvalid;
            }
            // Phone optional — validate format only if provided
            if (phone && !isValidPhone(phone)) {
                errors['bs-phone'] = strings.phoneInvalid;
            }
        } else if (notificationPref === 'WhatsApp') {
            // WhatsApp selected — phone is required
            if (!phone) {
                errors['bs-phone'] = strings.phoneRequired;
            } else if (!isValidPhone(phone)) {
                errors['bs-phone'] = strings.phoneInvalid;
            }
            // Email optional — validate format only if provided
            if (email && !isValidEmail(email)) {
                errors['bs-email'] = strings.emailInvalid;
            }
        } else {
            // No preference selected yet — validate both if filled
            if (email && !isValidEmail(email)) {
                errors['bs-email'] = strings.emailInvalid;
            }
            if (phone && !isValidPhone(phone)) {
                errors['bs-phone'] = strings.phoneInvalid;
            }
        }

        var consent = formData.get('consentSubscribe');
        if (!consent) errors['bs-consentSubscribe'] = strings.consentRequired;

        return {
            isValid: Object.keys(errors).length === 0,
            errors: errors
        };
    }

    // ============================================
    // FORM SUBMISSION HANDLER
    // ============================================

    async function handleFormSubmit(e) {
        e.preventDefault();

        var form = e.target;
        var submitBtn = document.getElementById('bs-submit-btn');
        var originalBtnText = submitBtn.textContent;

        clearAllErrors();

        var formData = new FormData(form);

        // Honeypot check
        if (formData.get('website')) {
            return;
        }

        // Validate
        var validation = validateForm(formData);
        if (!validation.isValid) {
            Object.keys(validation.errors).forEach(function (fieldId) {
                showFieldError(fieldId, validation.errors[fieldId]);
            });
            var firstField = document.getElementById(Object.keys(validation.errors)[0]);
            if (firstField && firstField.focus) firstField.focus();
            return;
        }

        // GA4: submit event
        trackEvent('blog_subscribe_submit', {
            notification_pref: formData.get('notificationPref'),
            page: window.location.pathname,
            event_category: 'engagement'
        });

        // Disable button
        submitBtn.disabled = true;
        submitBtn.textContent = strings.submitting;

        var rawPhone = (formData.get('phone') || '').trim();
        var countryCode = formData.get('countryCode') || '+1';
        var fullPhone = rawPhone ? countryCode + ' ' + rawPhone : '';

        var payload = {
            name: (formData.get('name') || '').trim(),
            email: (formData.get('email') || '').trim(),
            phone: fullPhone,
            notificationPref: formData.get('notificationPref'),
            consentSubscribe: !!formData.get('consentSubscribe'),
            website: formData.get('website') || '',
            sourcePage: window.location.pathname
        };

        try {
            var response = await fetch('/.netlify/functions/blog-subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            var result = await response.json();

            if (response.ok && result.success) {
                trackEvent('blog_subscribe_success', {
                    page: window.location.pathname,
                    event_category: 'conversion'
                });
                showToast(strings.successToast, 'success');
                form.reset();
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            var errorMsg = (error.message || 'Unknown error').substring(0, 100);
            trackEvent('blog_subscribe_error', {
                error_message: errorMsg,
                page: window.location.pathname,
                event_category: 'error'
            });
            showToast(strings.errorToast, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }

    // ============================================
    // REAL-TIME VALIDATION
    // ============================================

    function updateConditionalFields() {
        var pref = document.getElementById('bs-notificationPref');
        if (!pref) return;

        var emailGroup = document.getElementById('bs-email-group');
        var phoneGroup = document.getElementById('bs-phone-group');
        var val = pref.value;

        if (emailGroup) {
            emailGroup.style.display = val === 'Correo' ? '' : 'none';
        }
        if (phoneGroup) {
            phoneGroup.style.display = val === 'WhatsApp' ? '' : 'none';
        }

        // Clear errors and values on the hidden field
        if (val === 'Correo') {
            clearFieldError('bs-phone');
        } else if (val === 'WhatsApp') {
            clearFieldError('bs-email');
        } else {
            clearFieldError('bs-email');
            clearFieldError('bs-phone');
        }
    }

    function setupRealTimeValidation() {
        var fields = ['bs-name', 'bs-email', 'bs-phone', 'bs-notificationPref'];
        fields.forEach(function (fieldId) {
            var field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', function () { clearFieldError(fieldId); });
                field.addEventListener('change', function () { clearFieldError(fieldId); });
            }
        });

        // Country code dropdown clears phone errors too
        var countryCodeSelect = document.getElementById('bs-countryCode');
        if (countryCodeSelect) {
            countryCodeSelect.addEventListener('change', function () { clearFieldError('bs-phone'); });
        }

        // Notification preference toggles required fields
        var notifPref = document.getElementById('bs-notificationPref');
        if (notifPref) {
            notifPref.addEventListener('change', updateConditionalFields);
        }

        var consentCheckbox = document.getElementById('bs-consentSubscribe');
        if (consentCheckbox) {
            consentCheckbox.addEventListener('change', function () {
                clearFieldError('bs-consentSubscribe');
            });
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function setupAll() {
        var form = document.getElementById('blog-subscribe-form');
        if (form && !form.dataset.bsInitialized) {
            form.dataset.bsInitialized = 'true';
            form.addEventListener('submit', handleFormSubmit);
            setupRealTimeValidation();
        }
    }

    function init() {
        addToastStyles();

        var form = document.getElementById('blog-subscribe-form');
        if (form) {
            setupAll();
        } else {
            var observer = new MutationObserver(function () {
                var f = document.getElementById('blog-subscribe-form');
                if (f && !f.dataset.bsInitialized) {
                    setupAll();
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    window.initBlogSubscribe = setupAll;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
