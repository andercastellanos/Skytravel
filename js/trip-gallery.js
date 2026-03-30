'use strict';

/* ============================================
   Trip Photo Gallery — Frontend Logic
   ============================================ */

// --- Language detection ---
const LANG = document.body.dataset.lang || 'es';
const isEN = LANG === 'en';

// --- Translations ---
const T = {
    photoCount: isEN ? '{n} photos shared' : '{n} fotos compartidas',
    uploading: isEN ? 'Uploading {n} of {total}...' : 'Subiendo {n} de {total}...',
    uploadSuccess: isEN ? 'Photos uploaded successfully!' : '¡Fotos subidas correctamente!',
    uploadError: isEN ? 'Error uploading photos' : 'Error al subir las fotos',
    invalidCode: isEN ? 'Invalid trip code' : 'Código de viaje inválido',
    fileTooLarge: isEN ? 'File too large (max 10MB)' : 'Archivo muy grande (máx. 10MB)',
    tooManyFiles: isEN ? 'Maximum 15 photos per session' : 'Máximo 15 fotos por sesión',
    invalidType: isEN ? 'Only JPG, PNG, WebP allowed' : 'Solo se permiten JPG, PNG, WebP',
    selectedCount: isEN ? '{n} photos selected' : '{n} fotos seleccionadas',
    loading: isEN ? 'Loading gallery...' : 'Cargando galería...',
};

// --- Toast helper ---
function showToast(msg, isError = true) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.background = isError ? '#c41e3a' : '#27ae60';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// --- State ---
let currentTripCode = '';
let photos = [];
let selectedFiles = [];
let lightboxIndex = 0;

// --- Access code handling ---
function handleAccess() {
    const code = document.getElementById('trip-code').value.trim().toLowerCase();
    if (!code) {
        showToast(T.invalidCode);
        return;
    }
    currentTripCode = code;
    document.getElementById('access-screen').style.display = 'none';
    document.getElementById('gallery-screen').style.display = 'block';

    // Set trip title from code (format: "medjugorje-marzo-2026" → "Medjugorje Marzo 2026")
    const title = code.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    document.getElementById('trip-title').textContent = title;

    loadGallery();
}

// --- Load gallery from Cloudinary ---
async function loadGallery() {
    try {
        const res = await fetch(`/.netlify/functions/gallery-list?tripCode=${encodeURIComponent(currentTripCode)}`);
        const data = await res.json();

        if (!res.ok) {
            // If 404 or no photos, show empty state — that's fine, trip might be new
            photos = [];
        } else {
            photos = data.photos || [];
        }

        renderGallery();
    } catch (err) {
        photos = [];
        renderGallery();
    }
}

// --- Render gallery grid ---
function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    const empty = document.getElementById('empty-state');
    const count = document.getElementById('photo-count');

    count.textContent = T.photoCount.replace('{n}', photos.length);

    if (photos.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    grid.innerHTML = photos.map((photo, i) => `
        <div class="gallery-photo-item" data-index="${i}">
            <img src="${photo.thumbnail}" alt="" loading="lazy">
            <a href="${photo.url}" download class="gallery-photo-download" onclick="event.stopPropagation();">⬇</a>
        </div>
    `).join('');

    // Click handlers for lightbox
    grid.querySelectorAll('.gallery-photo-item').forEach(item => {
        item.addEventListener('click', () => {
            openLightbox(parseInt(item.dataset.index));
        });
    });
}

// --- Upload panel toggle ---
function toggleUploadPanel() {
    const panel = document.getElementById('upload-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// --- File selection + validation ---
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 15;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function handleFiles(files) {
    const remaining = MAX_FILES - selectedFiles.length;
    const newFiles = Array.from(files).slice(0, remaining);

    if (files.length > remaining) {
        showToast(T.tooManyFiles);
    }

    for (const file of newFiles) {
        if (!ALLOWED_TYPES.includes(file.type)) {
            showToast(T.invalidType);
            continue;
        }
        if (file.size > MAX_FILE_SIZE) {
            showToast(T.fileTooLarge);
            continue;
        }
        selectedFiles.push(file);
    }

    renderPreview();
}

function renderPreview() {
    const preview = document.getElementById('upload-preview');
    const actions = document.getElementById('upload-actions');
    const countEl = document.getElementById('selected-count');

    if (selectedFiles.length === 0) {
        preview.innerHTML = '';
        actions.style.display = 'none';
        return;
    }

    actions.style.display = 'flex';
    countEl.textContent = T.selectedCount.replace('{n}', selectedFiles.length);

    preview.innerHTML = selectedFiles.map((file, i) => {
        const url = URL.createObjectURL(file);
        return `<div class="upload-preview-item">
            <img src="${url}" alt="">
            <button type="button" class="upload-preview-remove" data-index="${i}">&times;</button>
        </div>`;
    }).join('');

    preview.querySelectorAll('.upload-preview-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedFiles.splice(parseInt(btn.dataset.index), 1);
            renderPreview();
        });
    });
}

// --- Upload to Cloudinary via Netlify function ---
async function handleUpload() {
    if (selectedFiles.length === 0) return;

    const uploadBtn = document.getElementById('upload-btn');
    const progress = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    uploadBtn.disabled = true;
    progress.style.display = 'block';

    let uploaded = 0;
    const total = selectedFiles.length;

    for (const file of selectedFiles) {
        progressText.textContent = T.uploading.replace('{n}', uploaded + 1).replace('{total}', total);
        progressBar.style.setProperty('--progress', ((uploaded / total) * 100) + '%');

        try {
            const base64 = await fileToBase64(file);
            const res = await fetch('/.netlify/functions/gallery-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tripCode: currentTripCode,
                    photo: { data: base64, type: file.type }
                })
            });

            if (!res.ok) throw new Error('Upload failed');
            uploaded++;
        } catch (err) {
            console.error('Upload error:', err);
        }
    }

    progressBar.style.setProperty('--progress', '100%');

    if (uploaded > 0) {
        showToast(T.uploadSuccess, false);
        selectedFiles = [];
        renderPreview();
        await loadGallery();
    } else {
        showToast(T.uploadError);
    }

    uploadBtn.disabled = false;
    progress.style.display = 'none';
    // Close upload panel after successful upload
    if (uploaded > 0) {
        document.getElementById('upload-panel').style.display = 'none';
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// --- Lightbox ---
function openLightbox(index) {
    lightboxIndex = index;
    const lightbox = document.getElementById('lightbox');
    lightbox.style.display = 'flex';
    updateLightbox();
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
    document.body.style.overflow = '';
}

function updateLightbox() {
    const photo = photos[lightboxIndex];
    if (!photo) return;
    document.getElementById('lightbox-img').src = photo.url;
    document.getElementById('lightbox-download').href = photo.url;
}

function lightboxPrev() {
    lightboxIndex = (lightboxIndex - 1 + photos.length) % photos.length;
    updateLightbox();
}

function lightboxNext() {
    lightboxIndex = (lightboxIndex + 1) % photos.length;
    updateLightbox();
}

// --- Drag and drop ---
function setupDropzone() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
        fileInput.value = '';
    });
}

// --- Keyboard support for lightbox ---
document.addEventListener('keydown', (e) => {
    const lightbox = document.getElementById('lightbox');
    if (lightbox.style.display === 'none') return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lightboxPrev();
    if (e.key === 'ArrowRight') lightboxNext();
});

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    // Access code
    document.getElementById('access-btn').addEventListener('click', handleAccess);
    document.getElementById('trip-code').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAccess();
    });

    // Upload panel toggle
    document.getElementById('upload-toggle-btn').addEventListener('click', toggleUploadPanel);

    // Upload button
    document.getElementById('upload-btn').addEventListener('click', handleUpload);

    // Dropzone
    setupDropzone();

    // Lightbox
    document.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    document.querySelector('.lightbox-prev').addEventListener('click', lightboxPrev);
    document.querySelector('.lightbox-next').addEventListener('click', lightboxNext);
    document.querySelector('.lightbox-overlay').addEventListener('click', closeLightbox);

    // Check URL hash for trip code (e.g., /galeria-viaje#medjugorje-marzo-2026)
    const hash = window.location.hash.slice(1);
    if (hash) {
        document.getElementById('trip-code').value = hash;
        handleAccess();
    }
});
