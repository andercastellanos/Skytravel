# Image Optimization Script

Converts images to WebP format with responsive sizes for optimal web performance.

## Quick Start

```bash
npm run optimize-images
```

## Workflow

1. **Drop** your source images into `images/original/`
2. **Run** `npm run optimize-images`
3. **Find** optimized WebP files in `images/optimized/`

## Input / Output

| Input Formats | Output Format |
|---------------|---------------|
| `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif` | `.webp` |

## Generated Sizes

| Size | Width | Use Case |
|------|-------|----------|
| Desktop | 1200px | Screens > 768px |
| Mobile | 800px | Screens <= 768px |

Images smaller than target width will not be upscaled.

## File Naming

Input files are converted to SEO-friendly slugs:

```
Input:  "Jerusalem Temple Photo.jpg"
Output: "jerusalem-temple-photo-desktop-1200.webp"
        "jerusalem-temple-photo-mobile-800.webp"
```

## Example HTML Usage

### Basic `<picture>` Tag

```html
<picture>
  <source
    type="image/webp"
    srcset="images/optimized/medjugorje-virgin-mobile-800.webp 800w,
            images/optimized/medjugorje-virgin-desktop-1200.webp 1200w"
    sizes="(max-width: 768px) 100vw, 1200px">
  <img
    src="images/optimized/medjugorje-virgin-desktop-1200.webp"
    alt="Virgin Mary statue in Medjugorje"
    width="1200"
    height="800"
    loading="lazy"
    decoding="async">
</picture>
```

### Hero Image (Above the Fold)

For hero images, use `loading="eager"` and add preload in `<head>`:

```html
<!-- In <head> - BEFORE CSS links -->
<link rel="preload" as="image" type="image/webp"
      href="images/optimized/hero-desktop-1200.webp"
      media="(min-width: 769px)">
<link rel="preload" as="image" type="image/webp"
      href="images/optimized/hero-mobile-800.webp"
      media="(max-width: 768px)">

<!-- In <body> -->
<picture>
  <source
    type="image/webp"
    srcset="images/optimized/hero-mobile-800.webp 800w,
            images/optimized/hero-desktop-1200.webp 1200w"
    sizes="(max-width: 768px) 100vw, 1200px">
  <img
    src="images/optimized/hero-desktop-1200.webp"
    alt="Hero image description"
    width="1200"
    height="600"
    loading="eager"
    decoding="async">
</picture>
```

## Quality Settings

| Setting | Value | Notes |
|---------|-------|-------|
| Quality | 85 | Balance of quality and file size |
| Effort | 6 | Maximum compression (0-6 scale) |

## Troubleshooting

### "No images found"
- Ensure images are in `images/original/` (not a subfolder)
- Check file extensions are supported

### "sharp" errors
Run `npm install` to ensure dependencies are installed.

### Images look blurry
The script maintains aspect ratio. If output looks blurry, your source image may be too small. Use higher resolution source images.

## Directory Structure

```
Skytravel/
├── images/
│   ├── original/     <- Drop source images here
│   └── optimized/    <- Optimized WebP output
├── scripts/
│   ├── optimize-images.js
│   └── optimize-images.md   <- This file
└── package.json
```
