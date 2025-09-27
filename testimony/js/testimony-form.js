/**
 * =============================================================================
 * 📄 TESTIMONY FORM SUBMISSION HANDLER (Updated - No Inline Styles)
 * 🌐 File: testimony/js/testimony-form.js
 * 📝 Purpose: Handle internal testimony form submission → Netlify function → GitHub Issues
 * 🔗 Used on: submit-testimonial.html and enviar-testimonio.html
 * 🔗 Flow: Form validation → Photo upload → Netlify function → GitHub Issue creation
 * =============================================================================
 */

class TestimonyFormHandler {
    constructor() {
        // Configuration
        this.config = {
            netlifyFunction: '/.netlify/functions/submit-testimony', // Netlify serverless function
            maxFileSize: 5 * 1024 * 1024, // 5MB max file size
            allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
            imgurClientId: null // Will be set by serverless function
        };

        // State management
        this.state = {
            submitting: false,
            photoFile: null,
            photoPreview: null,
            language: this.detectPageLanguage()
        };

        // DOM elements
        this.elements = {};

        // Initialize when DOM is ready
        this.init();
    }

    /**
     * Initialize the form handler
     */
    init() {
        try {
            console.log('🚀 Initializing testimony form handler...');
            
            // Find DOM elements
            this.findElements();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Setup form validation
            this.setupValidation();
            
            console.log('✅ Testimony form handler initialized');
            
        } catch (error) {
            console.error('❌ Error initializing form handler:', error);
        }
    }

    /**
     * Find all necessary DOM elements
     */
    findElements() {
        // Main form
        this.elements.form = document.querySelector('#testimony-form') ||
                           document.querySelector('.testimony-form') ||
                           document.querySelector('form[class*="testimony"]');

        if (!this.elements.form) {
            console.warn('⚠️ Testimony form not found on this page');
            return;
        }

        // Form fields
        this.elements.nameInput = this.elements.form.querySelector('#nombre, #name');
        this.elements.tripInput = this.elements.form.querySelector('#viaje, #trip');
        this.elements.testimonyInput = this.elements.form.querySelector('#testimonio, #testimony');
        this.elements.emailInput = this.elements.form.querySelector('#email');
        this.elements.photoInput = this.elements.form.querySelector('#foto, #photo');
        this.elements.consentCheckbox = this.elements.form.querySelector('#consent');

        // Buttons and status
        this.elements.submitBtn = this.elements.form.querySelector('.submit-btn, [type="submit"]');
        this.elements.btnText = this.elements.submitBtn?.querySelector('.btn-text');
        this.elements.btnLoading = this.elements.submitBtn?.querySelector('.btn-loading');

        // Messages
        this.elements.successMessage = document.querySelector('#success-message, .success-message');
        this.elements.errorMessage = document.querySelector('#error-message, .error-message');

        // Photo preview
        this.elements.photoPreview = document.querySelector('#photo-preview, .photo-preview');

        console.log('📍 Found form elements:', Object.keys(this.elements).length);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        if (!this.elements.form) return;

        // Main form submission
        this.elements.form.addEventListener('submit', this.handleFormSubmit.bind(this));

        // Photo input change
        if (this.elements.photoInput) {
            this.elements.photoInput.addEventListener('change', this.handlePhotoSelect.bind(this));
        }

        // Real-time validation
        [this.elements.nameInput, this.elements.tripInput, this.elements.testimonyInput].forEach(input => {
            if (input) {
                input.addEventListener('blur', this.validateField.bind(this));
                input.addEventListener('input', this.clearFieldError.bind(this));
            }
        });

        // Consent checkbox
        if (this.elements.consentCheckbox) {
            this.elements.consentCheckbox.addEventListener('change', this.updateSubmitButton.bind(this));
        }

        console.log('🔗 Event listeners set up');
    }

    /**
     * Set up form validation rules
     */
    setupValidation() {
        this.validationRules = {
            name: {
                required: true,
                minLength: 2,
                maxLength: 100,
                pattern: /^[a-zA-Z\s\u00C0-\u017F.-]+$/ // Letters, spaces, accents, dots, hyphens
            },
            trip: {
                required: true,
                minLength: 5,
                maxLength: 200
            },
            testimony: {
                required: true,
                minLength: 50,
                maxLength: 2000
            },
            email: {
                required: false,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            }
        };
    }

    /**
     * Detect page language
     */
    detectPageLanguage() {
        const htmlLang = document.documentElement.lang;
        if (htmlLang) {
            return htmlLang.startsWith('es') ? 'es' : 'en';
        }

        const url = window.location.href.toLowerCase();
        if (url.includes('-es.html') || url.includes('/es/') || url.includes('enviar')) {
            return 'es';
        }

        return 'en';
    }

    /**
     * Handle main form submission
     */
    async handleFormSubmit(event) {
        event.preventDefault();
        
        if (this.state.submitting) return;

        console.log('📤 Starting form submission...');

        try {
            // Clear previous messages
            this.hideMessages();

            // Validate form
            if (!this.validateForm()) {
                console.log('❌ Form validation failed');
                return;
            }

            // Start submission process
            this.setSubmittingState(true);

            // Prepare form data
            const formData = await this.prepareFormData();

            // Submit to Netlify function
            const response = await this.submitToNetlify(formData);

            if (response.success) {
                if (response.imageWarning) {
                    this.showMessage(
                        'Testimony submitted successfully! Image upload failed but will be processed later.',
                        'warning'
                    );
                } else {
                    this.showMessage('Testimony submitted successfully!', 'success');
                }
                this.resetForm();
                console.log('✅ Testimony submitted successfully');
            } else {
                throw new Error(response.error || 'Submission failed');
            }

        } catch (error) {
            console.error('❌ Submission error:', error);
            this.showError(error.message);
        } finally {
            this.setSubmittingState(false);
        }
    }

    /**
     * Validate entire form
     */
    validateForm() {
        let isValid = true;

        // Validate required fields
        const fields = [
            { element: this.elements.nameInput, name: 'name' },
            { element: this.elements.tripInput, name: 'trip' },
            { element: this.elements.testimonyInput, name: 'testimony' }
        ];

        fields.forEach(field => {
            if (field.element && !this.validateField({ target: field.element })) {
                isValid = false;
            }
        });

        // Validate email if provided
        if (this.elements.emailInput && this.elements.emailInput.value.trim()) {
            if (!this.validateField({ target: this.elements.emailInput })) {
                isValid = false;
            }
        }

        // Validate consent checkbox
        if (this.elements.consentCheckbox && !this.elements.consentCheckbox.checked) {
            this.showFieldError(this.elements.consentCheckbox, 
                this.state.language === 'es' 
                    ? 'Debes aceptar los términos para continuar'
                    : 'You must accept the terms to continue'
            );
            isValid = false;
        }

        // Validate photo if provided
        if (this.state.photoFile && !this.validatePhoto(this.state.photoFile)) {
            isValid = false;
        }

        return isValid;
    }

    /**
     * Validate individual field
     */
    validateField(event) {
        const input = event.target;
        const value = input.value.trim();
        const fieldName = this.getFieldName(input);
        const rules = this.validationRules[fieldName];

        if (!rules) return true;

        // Clear previous error
        this.clearFieldError(event);

        // Required validation
        if (rules.required && !value) {
            this.showFieldError(input, this.getErrorMessage(fieldName, 'required'));
            return false;
        }

        // Skip other validations if field is empty and not required
        if (!value && !rules.required) return true;

        // Length validations
        if (rules.minLength && value.length < rules.minLength) {
            this.showFieldError(input, this.getErrorMessage(fieldName, 'minLength', rules.minLength));
            return false;
        }

        if (rules.maxLength && value.length > rules.maxLength) {
            this.showFieldError(input, this.getErrorMessage(fieldName, 'maxLength', rules.maxLength));
            return false;
        }

        // Pattern validation
        if (rules.pattern && !rules.pattern.test(value)) {
            this.showFieldError(input, this.getErrorMessage(fieldName, 'pattern'));
            return false;
        }

        return true;
    }

    /**
     * Get field name from input element
     */
    getFieldName(input) {
        const id = input.id.toLowerCase();
        if (id.includes('name') || id.includes('nombre')) return 'name';
        if (id.includes('trip') || id.includes('viaje')) return 'trip';
        if (id.includes('testimony') || id.includes('testimonio')) return 'testimony';
        if (id.includes('email')) return 'email';
        return 'unknown';
    }

    /**
     * Get localized error message
     */
    getErrorMessage(fieldName, errorType, param = null) {
        const messages = {
            es: {
                name: {
                    required: 'El nombre es obligatorio',
                    minLength: `El nombre debe tener al menos ${param} caracteres`,
                    maxLength: `El nombre no puede exceder ${param} caracteres`,
                    pattern: 'El nombre contiene caracteres no válidos'
                },
                trip: {
                    required: 'La información del viaje es obligatoria',
                    minLength: `La información del viaje debe tener al menos ${param} caracteres`,
                    maxLength: `La información del viaje no puede exceder ${param} caracteres`
                },
                testimony: {
                    required: 'El testimonio es obligatorio',
                    minLength: `El testimonio debe tener al menos ${param} caracteres`,
                    maxLength: `El testimonio no puede exceder ${param} caracteres`
                },
                email: {
                    pattern: 'Por favor ingresa un email válido'
                }
            },
            en: {
                name: {
                    required: 'Name is required',
                    minLength: `Name must be at least ${param} characters`,
                    maxLength: `Name cannot exceed ${param} characters`,
                    pattern: 'Name contains invalid characters'
                },
                trip: {
                    required: 'Trip information is required',
                    minLength: `Trip information must be at least ${param} characters`,
                    maxLength: `Trip information cannot exceed ${param} characters`
                },
                testimony: {
                    required: 'Testimony is required',
                    minLength: `Testimony must be at least ${param} characters`,
                    maxLength: `Testimony cannot exceed ${param} characters`
                },
                email: {
                    pattern: 'Please enter a valid email address'
                }
            }
        };

        return messages[this.state.language]?.[fieldName]?.[errorType] || 'Invalid input';
    }

    /**
     * Show field error
     */
    showFieldError(input, message) {
        input.classList.add('error');
        
        // Remove existing error message
        const existingError = input.parentElement.querySelector('.field-error');
        if (existingError) existingError.remove();

        // Add new error message
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        input.parentElement.appendChild(errorElement);
    }

    /**
     * Clear field error
     */
    clearFieldError(event) {
        const input = event.target;
        input.classList.remove('error');
        
        const errorElement = input.parentElement.querySelector('.field-error');
        if (errorElement) errorElement.remove();
    }

    /**
     * Handle photo selection
     */
    handlePhotoSelect(event) {
        const file = event.target.files[0];
        
        if (!file) {
            this.clearPhoto();
            return;
        }

        if (!this.validatePhoto(file)) {
            event.target.value = ''; // Clear invalid selection
            return;
        }

        this.state.photoFile = file;
        this.showPhotoPreview(file);
        
        console.log('📸 Photo selected:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }

    /**
     * Validate photo file
     */
    validatePhoto(file) {
        // Check file size
        if (file.size > this.config.maxFileSize) {
            const maxMB = this.config.maxFileSize / 1024 / 1024;
            const message = this.state.language === 'es'
                ? `La imagen es muy grande. Máximo ${maxMB}MB`
                : `Image too large. Maximum ${maxMB}MB`;
            
            this.showError(message);
            return false;
        }

        // Check file type
        if (!this.config.allowedImageTypes.includes(file.type)) {
            const message = this.state.language === 'es'
                ? 'Formato de imagen no válido. Solo JPG, PNG, GIF, WebP'
                : 'Invalid image format. Only JPG, PNG, GIF, WebP allowed';
            
            this.showError(message);
            return false;
        }

        return true;
    }

    /**
     * Show photo preview
     */
    showPhotoPreview(file) {
        if (!this.elements.photoPreview) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.elements.photoPreview.innerHTML = `
                <div class="photo-preview-container">
                    <img src="${e.target.result}" alt="Preview" class="photo-preview-image">
                    <button type="button" class="photo-remove-btn" onclick="testimonyForm.clearPhoto()">
                        ❌
                    </button>
                    <div class="photo-info">
                        ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)
                    </div>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    }

    /**
     * Clear photo selection
     */
    clearPhoto() {
        this.state.photoFile = null;
        if (this.elements.photoInput) this.elements.photoInput.value = '';
        if (this.elements.photoPreview) this.elements.photoPreview.innerHTML = '';
    }

    /**
     * Prepare form data for submission
     */
    async prepareFormData() {
        const formData = {
            // Basic testimony data
            name: this.elements.nameInput?.value.trim() || '',
            trip: this.elements.tripInput?.value.trim() || '',
            testimony: this.elements.testimonyInput?.value.trim() || '',
            email: this.elements.emailInput?.value.trim() || '',
            language: this.state.language,
            
            // Metadata
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer || 'direct'
        };

        // Add photo data if present
        if (this.state.photoFile) {
            formData.photo = {
                name: this.state.photoFile.name,
                size: this.state.photoFile.size,
                type: this.state.photoFile.type,
                data: await this.fileToBase64(this.state.photoFile)
            };
        }

        return formData;
    }

    /**
     * Convert file to base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
            reader.onerror = error => reject(error);
        });
    }

    /**
     * Submit to Netlify function
     */
    async submitToNetlify(formData) {
        const response = await fetch(this.config.netlifyFunction, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Set submitting state
     */
    setSubmittingState(submitting) {
        this.state.submitting = submitting;

        if (this.elements.submitBtn) {
            this.elements.submitBtn.disabled = submitting;
            
            if (this.elements.btnText) {
                if (submitting) {
                    this.elements.btnText.classList.add('hidden');
                } else {
                    this.elements.btnText.classList.remove('hidden');
                }
            }
            
            if (this.elements.btnLoading) {
                if (submitting) {
                    this.elements.btnLoading.classList.remove('hidden');
                } else {
                    this.elements.btnLoading.classList.add('hidden');
                }
            }
        }

        // Disable form fields during submission
        const inputs = this.elements.form.querySelectorAll('input, textarea, button');
        inputs.forEach(input => {
            if (submitting) {
                input.disabled = true;
            } else {
                input.disabled = false;
            }
        });
    }

    /**
     * Update submit button state based on form validity
     */
    updateSubmitButton() {
        if (!this.elements.submitBtn) return;

        const hasRequiredFields = this.elements.nameInput?.value.trim() &&
                                 this.elements.tripInput?.value.trim() &&
                                 this.elements.testimonyInput?.value.trim();
        
        const hasConsent = this.elements.consentCheckbox?.checked;

        this.elements.submitBtn.disabled = !(hasRequiredFields && hasConsent) || this.state.submitting;
    }

    /**
     * Show message with type
     */
    showMessage(messageText, type = 'success') {
        this.hideMessages();
        
        const messageElement = document.createElement('div');
        messageElement.className = `form-message ${type}`;
        
        let iconAndTitle;
        if (type === 'warning') {
            iconAndTitle = this.state.language === 'es' 
                ? '<h3>⚠️ Advertencia</h3>' 
                : '<h3>⚠️ Warning</h3>';
        } else if (type === 'success') {
            iconAndTitle = this.state.language === 'es' 
                ? '<h3>✅ ¡Éxito!</h3>' 
                : '<h3>✅ Success!</h3>';
        } else {
            iconAndTitle = '<h3>ℹ️ Info</h3>';
        }
        
        messageElement.innerHTML = `${iconAndTitle}<p>${messageText}</p>`;
        this.elements.form.parentElement.insertBefore(messageElement, this.elements.form);
        
        // Scroll to message
        setTimeout(() => {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }

    /**
     * Show success message
     */
    showSuccess() {
        this.hideMessages();
        
        if (this.elements.successMessage) {
            this.elements.successMessage.classList.remove('hidden');
        } else {
            // Create inline success message
            const message = document.createElement('div');
            message.className = 'form-message success';
            message.innerHTML = this.state.language === 'es'
                ? '<h3>¡Testimonio Enviado!</h3><p>Gracias por compartir tu experiencia. Tu testimonio será revisado dentro de 2-3 días hábiles.</p>'
                : '<h3>Testimony Submitted!</h3><p>Thank you for sharing your experience. Your testimony will be reviewed within 2-3 business days.</p>';
            
            this.elements.form.parentElement.insertBefore(message, this.elements.form);
        }

        // Scroll to success message
        setTimeout(() => {
            const successElement = this.elements.successMessage || 
                                  document.querySelector('.form-message.success');
            if (successElement) {
                successElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }

    /**
     * Show error message
     */
    showError(errorText) {
        this.hideMessages();
        
        const defaultError = this.state.language === 'es'
            ? 'Error enviando testimonio. Por favor intenta de nuevo.'
            : 'Error submitting testimony. Please try again.';

        if (this.elements.errorMessage) {
            const errorParagraph = this.elements.errorMessage.querySelector('p');
            if (errorParagraph) {
                errorParagraph.textContent = errorText || defaultError;
            }
            this.elements.errorMessage.classList.remove('hidden');
        } else {
            // Create inline error message
            const message = document.createElement('div');
            message.className = 'form-message error';
            message.innerHTML = `
                <h3>❌ ${this.state.language === 'es' ? 'Error' : 'Error'}</h3>
                <p>${errorText || defaultError}</p>
            `;
            
            this.elements.form.parentElement.insertBefore(message, this.elements.form);
        }
    }

    /**
     * Hide all messages
     */
    hideMessages() {
        if (this.elements.successMessage) {
            this.elements.successMessage.classList.add('hidden');
        }
        
        if (this.elements.errorMessage) {
            this.elements.errorMessage.classList.add('hidden');
        }

        // Remove inline messages
        const inlineMessages = document.querySelectorAll('.form-message');
        inlineMessages.forEach(msg => msg.remove());
    }

    /**
     * Reset form after successful submission
     */
    resetForm() {
        if (this.elements.form) {
            this.elements.form.reset();
        }
        
        this.clearPhoto();
        this.state.photoFile = null;
        
        // Clear any remaining error states
        const errorInputs = this.elements.form.querySelectorAll('.error');
        errorInputs.forEach(input => input.classList.remove('error'));
        
        const errorMessages = this.elements.form.querySelectorAll('.field-error');
        errorMessages.forEach(msg => msg.remove());
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance
    window.testimonyForm = new TestimonyFormHandler();
});

// Export for module environments  
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestimonyFormHandler;
}