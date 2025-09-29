/**
 * =============================================================================
 * 📄 TESTIMONY FORM SUBMISSION HANDLER (Updated - No Inline Styles)
 * 🌐 File: testimony/js/testimony-form.js
 * 📝 Purpose: Handle internal testimony form submission → Netlify function → GitHub Issues
 * 🔗 Used on: submit-testimonial.html and enviar-testimonio.html
 * 🔗 Flow: Form validation → Photo upload → Netlify function → GitHub Issue creation
 * =============================================================================
 */

const SUBMIT_URL = '/.netlify/functions/submit-testimony';

// Dev healthcheck
fetch('/.netlify/functions/submit-testimony', { method: 'OPTIONS' })
  .then(r => console.log('[healthcheck] function status', r.status))
  .catch(e => console.warn('[healthcheck] function unreachable', e));

class TestimonyFormHandler {
    constructor() {
        // Configuration
        this.config = {
            netlifyFunction: SUBMIT_URL, // Netlify serverless function
            maxFileSize: 100 * 1024 * 1024, // 100MB max file size
            allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
            imgurClientId: null // Will be set by serverless function
        };

        // Per-type file size limits
        this.config.maxImageSize = 10 * 1024 * 1024;   // 10MB for images
        this.config.maxVideoSize = 150 * 1024 * 1024;  // 150MB for videos
        this.config.maxAudioSize = 50 * 1024 * 1024;   // 50MB for audio

        // Cloudinary configuration
        this.config.cloudinary = {
            cloudName: 'dfdzphrfe',
            uploadPreset: 'skytravel_unsigned',
            folder: 'sky-travel-testimonies'
        };

        // State management
        this.state = {
            submitting: false,
            photoFiles: [],
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
            this.updatePhotoStatus();
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

        // Form fields - hardened selectors for both ES and EN
        this.elements.nameInput = this.elements.form.querySelector(
            '#nombre, #name, #full-name, [name="name"]'
        );
        this.elements.tripInput = this.elements.form.querySelector(
            '#viaje, #trip, #destination, [name="trip"]'
        );
        this.elements.testimonyInput = this.elements.form.querySelector(
            '#testimonio, #testimony, #testimonial, #story, [name="testimony"]'
        );
        this.elements.emailInput = this.elements.form.querySelector('#email');
        this.elements.photoInput = this.elements.form.querySelector(
            '#foto, #photo, #photos, [name="photos"]'
        );
        this.elements.photoStatus = this.elements.form.querySelector('#photo-status, .photo-input-status');
        this.elements.consentCheckbox = this.elements.form.querySelector('#consent');

        // Buttons and status
        this.elements.submitBtn = this.elements.form.querySelector('.submit-btn, [type="submit"]');
        this.elements.btnText = this.elements.submitBtn?.querySelector('.btn-text');
        this.elements.btnLoading = this.elements.submitBtn?.querySelector('.btn-loading');

        // Safety: never start disabled in case of a previous crash/refresh
        if (this.elements.submitBtn) this.elements.submitBtn.disabled = false;

        // Messages
        this.elements.successMessage = document.querySelector('#success-message, .success-message');
        this.elements.errorMessage = document.querySelector('#error-message, .error-message');

        // Photo preview
        this.elements.photoPreview = document.querySelector('#photo-preview, .photo-preview');

        console.log('📍 Found form elements:', Object.keys(this.elements).length);

        // Debug: Verify we found the critical inputs
        console.log('[form inputs found]', {
            name: !!this.elements.nameInput,
            trip: !!this.elements.tripInput,
            testimony: !!this.elements.testimonyInput,
            email: !!this.elements.emailInput,
            photo: !!this.elements.photoInput
        });
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

        // Consent checkbox - no longer disables submit button

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

            // Validate form BEFORE disabling button
            if (!this.validateForm()) {
                console.log('❌ Form validation failed');
                return; // submit button stays enabled
            }

            // Now we're submitting - disable button
            this.setSubmittingState(true);

            // Prepare form data
            const formData = await this.prepareFormData();

            // Submit to Netlify function
            const resp = await this.submitToNetlify(formData);

            if (resp.success || resp.ok === true) {
                // Elegant toast
                if (resp.imageWarning) {
                    this.showToast(
                        this.state.language === 'es'
                          ? '¡Testimonio enviado! La imagen no se subió; se procesará más tarde.'
                          : 'Testimony submitted! Image upload failed; it will be processed later.',
                        'warning'
                    );
                } else {
                    this.showToast(
                        this.state.language === 'es'
                          ? '¡Testimonio enviado con éxito! Gracias por compartir 💛'
                          : 'Testimony submitted successfully! Thank you for sharing 💛',
                        'success'
                    );
                }
                this.resetForm();
                console.log('✅ Testimony submitted successfully');
            } else {
                throw new Error(resp.error || 'Submission failed');
            }

        } catch (error) {
            console.error('❌ Submission error:', error);

            // If Netlify function failed with 405, try GitHub fallback
            if (error.message && error.message.includes('405')) {
                console.log('🔄 Netlify function not available, redirecting to GitHub Issues...');
                this.redirectToGitHubIssues();
                return;
            }

            // Toast for errors
            this.showToast(
              (this.state.language === 'es' ? 'Error al subir: ' : 'Upload error: ')
              + (error?.message || 'Unknown'),
              'error'
            );
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

        // Validate consent checkbox with robust selector
        const consentEl = document.querySelector('[name="consent"]') || document.querySelector('#consent');
        if (!consentEl?.checked) {
            this.showFieldError(consentEl,
                this.state.language === 'es'
                    ? 'Debes aceptar los términos para continuar'
                    : 'Please agree to publish your testimony.'
            );
            isValid = false;
        }

        // Validate photos if provided
        if (this.state.photoFiles && this.state.photoFiles.length) {
            this.state.photoFiles.forEach(file => {
                if (!this.validatePhoto(file)) {
                    isValid = false;
                }
            });
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
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        files.forEach(f => {
            console.log('[media] selected:', {
                name: f.name, type: f.type, sizeMB: (f.size/1024/1024).toFixed(2)
            });
        });
        const accepted = [];
        for (const f of files) {
            if (this.validatePhoto(f)) accepted.push(f);
        }
        // Append so mobile users can add one-by-one
        this.state.photoFiles.push(...accepted);
        this.renderPhotoPreview();
        this.renderSelectedFileNames();
        // allow re-picking the same file(s)
        event.target.value = '';
        this.updatePhotoStatus();        // ← add this
        accepted.forEach(f => {
            const t = this.getUiMediaType(f);
            const size = (f.size / 1024 / 1024).toFixed(2);
            const icon = t === 'video' ? '🎥' : t === 'audio' ? '🎵' : '📷';
            const label = this.state.language === 'es'
                ? (t === 'video' ? 'Video seleccionado' : t === 'audio' ? 'Audio seleccionado' : 'Imagen seleccionada')
                : (t === 'video' ? 'Video selected' : t === 'audio' ? 'Audio selected' : 'Image selected');
            console.log(`${icon} ${label}: ${f.name} (${size}MB)`);
        });
    }

    /**
     * Validate photo file
     */
    validatePhoto(file) {
        // Check file type first to determine resource type
        const rt = this.getCloudinaryResourceType(file);
        const cap = rt === 'image' ? this.config.maxImageSize
                 : rt === 'video' ? this.config.maxVideoSize
                 : this.config.maxAudioSize;

        // Check per-type file size
        if (file.size > cap) {
            const maxMB = (cap / 1024 / 1024).toFixed(0);
            const msg = this.state.language === 'es'
                ? `Archivo muy grande para ${rt}. Máximo ${maxMB}MB.`
                : `File too large for ${rt}. Maximum ${maxMB}MB.`;
            this.showError(msg);
            return false;
        }

        // Check file size against general limit
        if (file.size > this.config.maxFileSize) {
            const maxMB = this.config.maxFileSize / 1024 / 1024;
            const message = this.state.language === 'es'
                ? `El archivo es muy grande. Máximo ${maxMB}MB`
                : `File too large. Maximum ${maxMB}MB`;

            this.showError(message);
            return false;
        }

        // For images, check file type
        if (rt === 'image' && !this.config.allowedImageTypes.includes(file.type)) {
            const message = this.state.language === 'es'
                ? 'Formato de imagen no válido. Solo JPG, PNG, GIF, WebP'
                : 'Invalid image format. Only JPG, PNG, GIF, WebP allowed';

            this.showError(message);
            return false;
        }

        return true;
    }

    /**
     * Get Cloudinary resource type for file
     */
    getCloudinaryResourceType(file) {
        const t = (file.type || '').toLowerCase();
        if (t.startsWith('image/')) return 'image';
        if (t.startsWith('video/')) return 'video';
        if (t.startsWith('audio/')) return 'video'; // audio goes through /video pipeline for playback/transforms
        // Extension fallback (when type is empty)
        const name = (file.name || '').toLowerCase();
        if (/\.(mp4|mov|webm|avi|mkv)$/.test(name)) return 'video';
        if (/\.(mp3|wav|m4a|aac|ogg)$/.test(name)) return 'video';
        return 'raw';
    }

    /**
     * Get UI media type for display purposes (different from Cloudinary resource type)
     */
    getUiMediaType(file) {
        const type = (file.type || '').toLowerCase();
        const name = (file.name || '').toLowerCase();

        const ext = (name.split('.').pop() || '').split('?')[0];

        const isImage = type.startsWith('image/') || ['jpg','jpeg','png','gif','webp','svg','avif'].includes(ext);
        if (isImage) return 'image';

        const isAudio = type.startsWith('audio/') || ['mp3','wav','ogg','m4a','aac','flac'].includes(ext);
        if (isAudio) return 'audio';

        const isVideo = type.startsWith('video/') || ['mp4','webm','mov','avi','mkv','m4v'].includes(ext);
        if (isVideo) return 'video';

        return 'file';
    }

    /**
     * Upload file to Cloudinary using unsigned preset
     */
    async uploadToCloudinaryUnsigned(file) {
        const resourceType = this.getCloudinaryResourceType(file); // 'image' | 'video' | 'raw'
        // SAFEST: auto endpoint accepts images, videos, audio
        const autoUrl = `https://api.cloudinary.com/v1_1/${this.config.cloudinary.cloudName}/auto/upload`;
        const typedUrl = `https://api.cloudinary.com/v1_1/${this.config.cloudinary.cloudName}/${resourceType}/upload`;
        const url = autoUrl; // default to auto

        console.log('[upload] start', { url, typedUrl, resourceType, preset: this.config.cloudinary.uploadPreset, folder: this.config.cloudinary.folder });

        const form = new FormData();
        form.append('upload_preset', this.config.cloudinary.uploadPreset);
        form.append('folder', this.config.cloudinary.folder);
        form.append('file', file);

        const res = await fetch(url, { method: 'POST', body: form });
        let json;
        try {
            json = await res.json();
        } catch (e) {
            json = { parseError: String(e) };
        }
        if (!res.ok) {
            console.error('[upload] cloudinary error', { status: res.status, json });
            // fallback: if auto failed AND resourceType was not 'image', try the typed endpoint once
            if (url === autoUrl && resourceType !== 'image') {
                console.warn('[upload] retrying with typed endpoint', { typedUrl, resourceType });
                const res2 = await fetch(typedUrl, { method: 'POST', body: form });
                const j2 = await res2.json().catch(() => ({}));
                if (!res2.ok) {
                    console.error('[upload] typed endpoint also failed', { status: res2.status, j2 });
                    throw new Error(j2?.error?.message || `Cloudinary upload failed (${res2.status})`);
                }
                console.log('[upload] success via typed endpoint', j2);
                return j2;
            }
            throw new Error(json?.error?.message || `Cloudinary upload failed (${res.status})`);
        }
        console.log('[upload] success', { public_id: json.public_id, resource_type: json.resource_type, format: json.format, bytes: json.bytes });
        return json;
    }

    /**
     * Render photo preview
     */
    renderPhotoPreview() {
        if (!this.elements.photoPreview) return;
        if (!this.state.photoFiles.length) {
            this.elements.photoPreview.innerHTML = '';
            return;
        }
        const items = this.state.photoFiles.map((f, idx) => {
            const sizeMB = (f.size / 1024 / 1024).toFixed(2);
            return `
              <div class="photo-chip" data-idx="${idx}">
                <img class="photo-chip-img" alt="Preview ${this.escapeHtml(f.name)}">
                <div class="photo-chip-meta">
                  <span class="photo-chip-name">${this.escapeHtml(f.name)}</span>
                  <span class="photo-chip-size">${sizeMB}MB</span>
                </div>
                <button type="button" class="photo-chip-remove" aria-label="Remove photo" data-remove="${idx}">×</button>
              </div>
            `;
        }).join('');
        this.elements.photoPreview.innerHTML = `<div class="photo-grid">${items}</div>`;
        // load images
        const imgs = this.elements.photoPreview.querySelectorAll('.photo-chip-img');
        imgs.forEach((imgEl, i) => {
            const reader = new FileReader();
            reader.onload = e => { imgEl.src = e.target.result; };
            reader.readAsDataURL(this.state.photoFiles[i]);
        });
        // remove buttons
        this.elements.photoPreview.querySelectorAll('[data-remove]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = Number(e.currentTarget.getAttribute('data-remove'));
                this.state.photoFiles.splice(idx, 1);
                this.renderPhotoPreview();
                this.updatePhotoStatus();        // ← add this
            });
        });
    }

    /**
     * Clear photo selection
     */
    clearPhoto() {
        this.state.photoFiles = [];
        if (this.elements.photoInput) this.elements.photoInput.value = '';
        if (this.elements.photoPreview) this.elements.photoPreview.innerHTML = '';
        this.renderSelectedFileNames();
        this.updatePhotoStatus(); // ← add this
    }
    updatePhotoStatus() {
        if (!this.elements || !this.elements.photoStatus) return;
        const files = Array.isArray(this.state.photoFiles) ? this.state.photoFiles : [];
        if (!files.length) {
            this.elements.photoStatus.textContent = this.state.language === 'es'
                ? 'No hay archivos seleccionados'
                : 'No files selected';
            return;
        }

        let imgs = 0, vids = 0, auds = 0, bytes = 0;
        for (const f of files) {
            const t = this.getUiMediaType(f);
            if (t === 'image') imgs++;
            else if (t === 'video') vids++;
            else if (t === 'audio') auds++;
            bytes += f.size || 0;
        }
        const totalMB = (bytes / (1024 * 1024)).toFixed(2);

        const partsEn = [];
        if (imgs) partsEn.push(`${imgs} ${imgs === 1 ? 'image' : 'images'}`);
        if (vids) partsEn.push(`${vids} ${vids === 1 ? 'video' : 'videos'}`);
        if (auds) partsEn.push(`${auds} ${auds === 1 ? 'audio' : 'audios'}`);

        const partsEs = [];
        if (imgs) partsEs.push(`${imgs} ${imgs === 1 ? 'imagen' : 'imágenes'}`);
        if (vids) partsEs.push(`${vids} ${vids === 1 ? 'video' : 'videos'}`);
        if (auds) partsEs.push(`${auds} ${auds === 1 ? 'audio' : 'audios'}`);

        const summary = this.state.language === 'es'
            ? `${partsEs.join(', ')} seleccionados (${totalMB} MB)`
            : `${partsEn.join(', ')} selected (${totalMB} MB)`;

        this.elements.photoStatus.textContent = summary;
    }

    /**
     * Render selected file names and sizes
     */
    renderSelectedFileNames() {
        const fileListEl = this.elements.form?.querySelector('#photo-file-list');
        if (!fileListEl) return;

        const files = Array.isArray(this.state.photoFiles) ? this.state.photoFiles : [];

        if (!files.length) {
            fileListEl.innerHTML = '';
            return;
        }

        const items = files.map(file => {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            const t = this.getUiMediaType(file);
            const icon = t === 'video' ? '🎥' : t === 'audio' ? '🎵' : '📷';
            const label = this.state.language === 'es'
                ? (t === 'video' ? 'Video' : t === 'audio' ? 'Audio' : 'Imagen')
                : (t === 'video' ? 'Video' : t === 'audio' ? 'Audio' : 'Image');
            return `<li>${icon} ${label}: ${this.escapeHtml(file.name)} (${sizeMB} MB)</li>`;
        }).join('');

        fileListEl.innerHTML = items;
    }

    /**
     * Prepare form data for submission
     */
    async prepareFormData() {
        // If there are files, upload them first
        let uploadedAssets = [];
        if (this.state.photoFiles && this.state.photoFiles.length) {
            for (const f of this.state.photoFiles) {
                const uploaded = await this.uploadToCloudinaryUnsigned(f);
                uploadedAssets.push({
                    secure_url: uploaded.secure_url,
                    url: uploaded.secure_url,
                    public_id: uploaded.public_id,
                    resource_type: uploaded.resource_type,
                    format: uploaded.format,
                    bytes: uploaded.bytes,
                    duration: uploaded.duration || null
                });
            }
        }

        const formData = {
            name: this.elements.nameInput?.value.trim() || '',
            trip: this.elements.tripInput?.value.trim() || '',
            testimony: this.elements.testimonyInput?.value.trim() || '',
            email: this.elements.emailInput?.value.trim() || '',
            language: this.state.language,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer || 'direct',
            media: uploadedAssets
        };

        // Mirror ES keys to be future-proof
        formData.nombre = formData.name;
        formData.viaje = formData.trip;
        formData.testimonio = formData.testimony;
        formData.correo = formData.email;
        formData.idioma = formData.language;

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
        console.log('[submit] payload →', formData);

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
     * Fallback: Redirect to GitHub Issues when Netlify function is not available
     */
    async redirectToGitHubIssues() {
        try {
            const formData = await this.prepareFormData();
            const isSpanish = this.state.language === 'es';

            // GitHub repository URLs
            const githubUrl = isSpanish
                ? 'https://github.com/andercastellanos/Skytravel/issues/new?assignees=andercastellanos&labels=testimony&template=enviar-testimonio.yml'
                : 'https://github.com/andercastellanos/Skytravel/issues/new?assignees=andercastellanos&labels=testimony&template=submit-a-testimonial.yml';

            // Show user a message before redirecting
            this.showToast(
                isSpanish
                    ? 'Redirigiendo a GitHub para enviar tu testimonio...'
                    : 'Redirecting to GitHub to submit your testimony...',
                'info'
            );

            // Small delay then redirect
            setTimeout(() => {
                window.open(githubUrl, '_blank');

                // Show instructions
                this.showToast(
                    isSpanish
                        ? 'Por favor completa el formulario en la nueva pestaña de GitHub'
                        : 'Please complete the form in the new GitHub tab',
                    'info'
                );
            }, 1000);

        } catch (error) {
            console.error('❌ GitHub fallback error:', error);
            this.showToast(
                this.state.language === 'es'
                    ? 'Error al redirigir. Por favor contacta directamente.'
                    : 'Redirect error. Please contact directly.',
                'error'
            );
        }
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
     * Elegant toast (success / warning / error)
     * Creates a live-region, auto-dismisses, and allows manual close
     */
    showToast(message, type = 'success', opts = {}) {
        const { timeout = 4200 } = opts;

        // Ensure container
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-atomic', 'true');
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon" aria-hidden="true">
                ${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌'}
            </span>
            <div class="toast-content">${this.escapeHtml(message)}</div>
            <button class="toast-close" aria-label="${this.state.language === 'es' ? 'Cerrar notificación' : 'Close notification'}">×</button>
        `;

        // Close events
        toast.querySelector('.toast-close')?.addEventListener('click', () => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 200);
        });

        container.appendChild(toast);
        // enter animation
        requestAnimationFrame(() => toast.classList.add('show'));

        // auto-dismiss
        const id = setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 200);
        }, timeout);

        // Pause on hover
        toast.addEventListener('mouseenter', () => clearTimeout(id));
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
        this.state.photoFiles = [];
        
        // Clear any remaining error states
        const errorInputs = this.elements.form.querySelectorAll('.error');
        errorInputs.forEach(input => input.classList.remove('error'));
        
        const errorMessages = this.elements.form.querySelectorAll('.field-error');
        errorMessages.forEach(msg => msg.remove());
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(str = '') {
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
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