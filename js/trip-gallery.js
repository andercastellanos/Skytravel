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
    fileTooLarge: isEN ? 'File too large (photos: 10MB, videos: 100MB)' : 'Archivo muy grande (fotos: 10MB, videos: 100MB)',
    tooManyFiles: isEN ? 'Maximum 15 files per session' : 'Máximo 15 archivos por sesión',
    invalidType: isEN ? 'Only JPG, PNG, WebP, MP4, MOV allowed' : 'Solo se permiten JPG, PNG, WebP, MP4, MOV',
    selectedCount: isEN ? '{n} photos selected' : '{n} fotos seleccionadas',
    loading: isEN ? 'Loading gallery...' : 'Cargando galería...',
    adminPrompt: isEN ? 'Enter employee code:' : 'Ingresa el código de empleado:',
    adminOn: isEN ? 'Admin mode enabled' : 'Modo administrador activado',
    adminOff: isEN ? 'Admin mode disabled' : 'Modo administrador desactivado',
    adminWrong: isEN ? 'Incorrect code' : 'Código incorrecto',
    deleteConfirm: isEN ? 'Delete this photo?' : '¿Eliminar esta foto?',
    deleteSuccess: isEN ? 'Photo deleted' : 'Foto eliminada',
    deleteError: isEN ? 'Error deleting photo' : 'Error al eliminar la foto',
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
let adminMode = false;

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
    grid.innerHTML = photos.map((photo, i) => {
        const isVid = photo.resourceType === 'video';
        const media = isVid
            ? `<video src="${photo.thumbnail}" muted playsinline preload="metadata"></video><span class="gallery-play-icon">▶</span>`
            : `<img src="${photo.thumbnail}" alt="" loading="lazy">`;
        return `<div class="gallery-photo-item${isVid ? ' is-video' : ''}" data-index="${i}">
            ${media}
            <a href="${photo.url}" download class="gallery-photo-download" onclick="event.stopPropagation();">⬇</a>
            ${adminMode ? `<button type="button" class="gallery-photo-delete" data-index="${i}" data-public-id="${photo.publicId}" onclick="event.stopPropagation();">🗑</button>` : ''}
        </div>`;
    }).join('');

    // Click handlers for lightbox
    grid.querySelectorAll('.gallery-photo-item').forEach(item => {
        item.addEventListener('click', () => {
            openLightbox(parseInt(item.dataset.index));
        });
    });

    // Delete handlers (admin mode)
    if (adminMode) {
        grid.querySelectorAll('.gallery-photo-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                deletePhoto(btn.dataset.publicId, parseInt(btn.dataset.index));
            });
        });
    }
}

// --- Upload panel toggle ---
function toggleUploadPanel() {
    const panel = document.getElementById('upload-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// --- File selection + validation ---
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILES = Infinity;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];

function isVideo(typeOrUrl) {
    if (typeOrUrl.startsWith('video/')) return true;
    return /\.(mp4|mov|webm)$/i.test(typeOrUrl);
}

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
        const maxSize = VIDEO_TYPES.includes(file.type) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
        if (file.size > maxSize) {
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

// --- Upload directly to Cloudinary (unsigned preset) ---
const CLOUDINARY_CLOUD = 'disfxqaof';
const CLOUDINARY_PRESET = 'gallery_unsigned';

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
            const form = new FormData();
            form.append('file', file);
            form.append('upload_preset', CLOUDINARY_PRESET);
            form.append('folder', 'trip-galleries/' + currentTripCode);

            const uploadType = VIDEO_TYPES.includes(file.type) ? 'video' : 'image';
            const res = await fetch(
                'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD + '/' + uploadType + '/upload',
                { method: 'POST', body: form }
            );

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
    if (uploaded > 0) {
        document.getElementById('upload-panel').style.display = 'none';
    }
}

// --- Admin mode (employee delete) ---
function toggleAdmin() {
    const btn = document.getElementById('admin-toggle-btn');
    if (adminMode) {
        adminMode = false;
        btn.textContent = '🔒';
        btn.classList.remove('active');
        showToast(T.adminOff, false);
        renderGallery();
        return;
    }
    const code = prompt(T.adminPrompt);
    if (!code) return;

    fetch('/.netlify/functions/verify-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code })
    }).then(res => {
        if (res.ok) {
            adminMode = true;
            btn.textContent = '🔓';
            btn.classList.add('active');
            showToast(T.adminOn, false);
            renderGallery();
        } else {
            showToast(T.adminWrong);
        }
    }).catch(() => showToast(T.adminWrong));
}

async function deletePhoto(publicId, index) {
    if (!confirm(T.deleteConfirm)) return;

    const photo = photos[index];
    try {
        const res = await fetch('/.netlify/functions/gallery-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicId: publicId, resourceType: photo ? photo.resourceType : 'image' })
        });

        if (!res.ok) throw new Error('Delete failed');

        photos.splice(index, 1);
        renderGallery();
        showToast(T.deleteSuccess, false);
    } catch (err) {
        showToast(T.deleteError);
    }
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
    const vid = document.getElementById('lightbox-video');
    if (vid) vid.pause();
}

function updateLightbox() {
    const photo = photos[lightboxIndex];
    if (!photo) return;
    const imgEl = document.getElementById('lightbox-img');
    const vidEl = document.getElementById('lightbox-video');
    const isVid = photo.resourceType === 'video';

    if (isVid) {
        imgEl.style.display = 'none';
        vidEl.style.display = 'block';
        vidEl.src = photo.url;
        vidEl.load();
    } else {
        vidEl.style.display = 'none';
        vidEl.pause();
        imgEl.style.display = 'block';
        imgEl.src = photo.url;
    }

    document.getElementById('lightbox-download').href = photo.url;

    const delBtn = document.getElementById('lightbox-delete');
    if (delBtn) {
        delBtn.style.display = adminMode ? 'inline-block' : 'none';
    }
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

    // Admin mode toggle
    document.getElementById('admin-toggle-btn').addEventListener('click', toggleAdmin);

    // Lightbox delete
    document.getElementById('lightbox-delete').addEventListener('click', () => {
        const photo = photos[lightboxIndex];
        if (photo) {
            closeLightbox();
            deletePhoto(photo.publicId, lightboxIndex);
        }
    });

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
