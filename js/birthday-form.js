/**
 * ============================================
 * SKY TRAVEL JM - BIRTHDAY FORM HANDLER
 * ============================================
 *
 * Client-side handler for the hidden /cumpleanos page.
 * Handles bilingual toggle, image upload with preview,
 * form validation, and submission to Netlify function.
 *
 * Last updated: 2026-03-09
 * ============================================
 */

(function() {
    'use strict';

    // ============================================
    // BILINGUAL TRANSLATIONS
    // ============================================

    var translations = {
        es: {
            pageTitle: 'Felicitación de Cumpleaños',
            recipientName: 'Nombre del Destinatario',
            recipientEmail: 'Correo Electrónico del Destinatario',
            message: 'Mensaje Personalizado',
            imageUpload: 'Subir Imagen',
            imageHint: 'JPG, PNG, WebP o GIF — máximo 2MB',
            submit: 'Enviar Felicitación',
            submitting: 'Enviando...',
            successToast: '¡Felicitación enviada exitosamente!',
            errorToast: 'Error al enviar la felicitación. Intente de nuevo.',
            nameRequired: 'El nombre del destinatario es requerido',
            emailRequired: 'El correo electrónico es requerido',
            emailInvalid: 'Correo electrónico inválido',
            messageRequired: 'El mensaje es requerido',
            imageInvalidType: 'Solo se aceptan imágenes (JPG, PNG, WebP, GIF)',
            imageTooLarge: 'La imagen excede 2MB',
            defaultMessage: '¡Te deseamos un maravilloso día lleno de bendiciones, alegría y momentos especiales!\n\nQue este nuevo año de vida esté lleno de viajes increíbles y experiencias inolvidables.\n\n¡Feliz Cumpleaños!'
        },
        en: {
            pageTitle: 'Birthday Greeting',
            recipientName: 'Recipient Name',
            recipientEmail: 'Recipient Email',
            message: 'Custom Message',
            imageUpload: 'Upload Image',
            imageHint: 'JPG, PNG, WebP, or GIF — max 2MB',
            submit: 'Send Greeting',
            submitting: 'Sending...',
            successToast: 'Birthday greeting sent successfully!',
            errorToast: 'Error sending greeting. Please try again.',
            nameRequired: 'Recipient name is required',
            emailRequired: 'Email is required',
            emailInvalid: 'Invalid email address',
            messageRequired: 'Message is required',
            imageInvalidType: 'Only image files are accepted (JPG, PNG, WebP, GIF)',
            imageTooLarge: 'Image exceeds 2MB',
            defaultMessage: 'Wishing you a wonderful day filled with blessings, joy, and special moments!\n\nMay this new year of life be full of incredible travels and unforgettable experiences.\n\nHappy Birthday!'
        }
    };

    var currentLang = 'es';
    var imageBase64 = null;
    var imageMimeType = null;

    // ============================================
    // TOAST NOTIFICATION
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
        toast.textContent = message;

        var bgColor = type === 'success'
            ? 'linear-gradient(135deg, #c8a97e 0%, #b69268 100%)'
            : 'linear-gradient(135deg, #c41e3a 0%, #a01830 100%)';

        toast.style.cssText = 'padding:1rem 1.5rem;border-radius:10px;color:#fff;font-size:0.95rem;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,0.2);max-width:350px;opacity:1;background:' + bgColor + ';animation:slideIn 0.3s ease-out;';

        container.appendChild(toast);

        setTimeout(function() {
            toast.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(function() {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 5000);
    }

    function addToastStyles() {
        if (document.getElementById('toast-styles')) return;
        var style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = '@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes slideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}';
        document.head.appendChild(style);
    }

    // ============================================
    // LANGUAGE SWITCHER
    // ============================================

    function switchLanguage(lang) {
        currentLang = lang;
        var t = translations[lang];

        // Update toggle buttons active state
        document.querySelectorAll('.lang-btn').forEach(function(btn) {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        // Update all translatable elements
        var els = document.querySelectorAll('[data-i18n]');
        els.forEach(function(el) {
            var key = el.getAttribute('data-i18n');
            if (t[key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = t[key];
                } else {
                    el.textContent = t[key];
                }
            }
        });

        // Update labels
        var labels = document.querySelectorAll('[data-i18n-label]');
        labels.forEach(function(label) {
            var key = label.getAttribute('data-i18n-label');
            if (t[key]) label.textContent = t[key];
        });

        // Update submit button
        var submitBtn = document.getElementById('submit-btn');
        if (submitBtn && !submitBtn.disabled) {
            submitBtn.textContent = t.submit;
        }

        // Update image hint
        var imageHint = document.getElementById('image-hint');
        if (imageHint) imageHint.textContent = t.imageHint;

        // Update default message if textarea still has the default
        var textarea = document.getElementById('birthday-message');
        if (textarea) {
            var otherLang = lang === 'es' ? 'en' : 'es';
            var otherDefault = translations[otherLang].defaultMessage;
            if (textarea.value === otherDefault || textarea.value === '') {
                textarea.value = t.defaultMessage;
            }
        }
    }

    // ============================================
    // IMAGE UPLOAD HANDLER
    // ============================================

    var allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    function handleImageSelect(e) {
        var file = e.target.files[0];
        var t = translations[currentLang];
        var preview = document.getElementById('image-preview');

        if (!file) {
            imageBase64 = null;
            imageMimeType = null;
            preview.style.display = 'none';
            preview.src = '';
            return;
        }

        // Validate type
        if (allowedTypes.indexOf(file.type) === -1) {
            showToast(t.imageInvalidType, 'error');
            e.target.value = '';
            imageBase64 = null;
            imageMimeType = null;
            preview.style.display = 'none';
            preview.src = '';
            return;
        }

        // Validate size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            showToast(t.imageTooLarge, 'error');
            e.target.value = '';
            imageBase64 = null;
            imageMimeType = null;
            preview.style.display = 'none';
            preview.src = '';
            return;
        }

        imageMimeType = file.type;

        // Read as base64 for submission + preview
        var reader = new FileReader();
        reader.onload = function(evt) {
            var result = evt.target.result;
            imageBase64 = result.split(',')[1];

            // Show preview
            preview.src = result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    // ============================================
    // FORM VALIDATION
    // ============================================

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validateForm() {
        var t = translations[currentLang];
        var errors = [];

        var name = document.getElementById('recipient-name').value.trim();
        if (!name) errors.push(t.nameRequired);

        var email = document.getElementById('recipient-email').value.trim();
        if (!email) {
            errors.push(t.emailRequired);
        } else if (!isValidEmail(email)) {
            errors.push(t.emailInvalid);
        }

        var message = document.getElementById('birthday-message').value.trim();
        if (!message) errors.push(t.messageRequired);

        return errors;
    }

    // ============================================
    // FORM SUBMISSION
    // ============================================

    async function handleSubmit(e) {
        e.preventDefault();

        var t = translations[currentLang];
        var errors = validateForm();

        if (errors.length > 0) {
            showToast(errors[0], 'error');
            return;
        }

        var submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = t.submitting;

        var payload = {
            name: document.getElementById('recipient-name').value.trim(),
            email: document.getElementById('recipient-email').value.trim(),
            message: document.getElementById('birthday-message').value.trim(),
            lang: currentLang
        };

        if (imageBase64) {
            payload.imageBase64 = imageBase64;
            payload.imageMimeType = imageMimeType;
        }

        try {
            var response = await fetch('/.netlify/functions/send-birthday', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            var result = await response.json();

            if (response.ok && result.success) {
                showToast(t.successToast, 'success');

                // Reset form
                document.getElementById('birthday-form').reset();
                imageBase64 = null;
                imageMimeType = null;
                document.getElementById('image-preview').style.display = 'none';
                document.getElementById('image-preview').src = '';

                // Re-fill default message
                document.getElementById('birthday-message').value = t.defaultMessage;
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Birthday submission error:', error);
            showToast(t.errorToast, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = t.submit;
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        addToastStyles();

        // Language toggle
        document.querySelectorAll('.lang-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                switchLanguage(btn.dataset.lang);
            });
        });

        // Image input
        var imageInput = document.getElementById('image-upload');
        if (imageInput) imageInput.addEventListener('change', handleImageSelect);

        // Form submission
        var form = document.getElementById('birthday-form');
        if (form) form.addEventListener('submit', handleSubmit);

        // Set default message
        var textarea = document.getElementById('birthday-message');
        if (textarea && !textarea.value) {
            textarea.value = translations[currentLang].defaultMessage;
        }

        // Set initial language
        switchLanguage('es');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
