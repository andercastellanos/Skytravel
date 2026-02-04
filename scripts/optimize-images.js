#!/usr/bin/env node

/**
 * Image Optimization Script for Sky Travel JM
 *
 * Converts images to WebP format with responsive sizes.
 * Accepts: JPG, JPEG, PNG, WebP, AVIF as input
 * Outputs: WebP only (wide browser support)
 *
 * Usage: npm run optimize-images
 *
 * Input:  ./images/original/
 * Output: ./images/optimized/
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  inputDir: path.join(__dirname, '..', 'images', 'original'),
  outputDir: path.join(__dirname, '..', 'images', 'optimized'),

  // Supported input formats (including AVIF)
  supportedFormats: ['.jpg', '.jpeg', '.png', '.webp', '.avif'],

  // Output sizes
  sizes: [
    { name: 'desktop', width: 1200 },
    { name: 'mobile', width: 800 }
  ],

  // WebP settings (excellent browser support)
  webp: {
    quality: 85,
    effort: 6  // 0-6, higher = slower but better compression
  }
};

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

/**
 * Convert filename to SEO-friendly slug
 * "Jerusalem Photo.jpg" -> "jerusalem-photo"
 */
function toSlug(filename) {
  const nameWithoutExt = path.parse(filename).name;
  return nameWithoutExt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove accents
    .replace(/[^a-z0-9]+/g, '-')       // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')           // Trim leading/trailing hyphens
    .replace(/-+/g, '-');              // Collapse multiple hyphens
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Calculate compression percentage
 */
function compressionPercent(original, compressed) {
  return ((1 - compressed / original) * 100).toFixed(1);
}

/**
 * Get file size
 */
function getFileSize(filepath) {
  try {
    return fs.statSync(filepath).size;
  } catch {
    return 0;
  }
}

/**
 * Process a single image
 */
async function processImage(inputPath, filename) {
  const slug = toSlug(filename);
  const originalSize = getFileSize(inputPath);

  console.log(`\n${colors.bright}${colors.blue}Processing:${colors.reset} ${filename}`);
  console.log(`${colors.dim}Original size: ${formatBytes(originalSize)}${colors.reset}`);

  // Get image metadata to check dimensions
  const metadata = await sharp(inputPath).metadata();
  const originalWidth = metadata.width;

  const results = [];

  for (const size of CONFIG.sizes) {
    // Don't upscale images smaller than target
    const targetWidth = Math.min(size.width, originalWidth);
    const wasDownscaled = targetWidth < size.width;

    // Generate WebP
    const webpFilename = `${slug}-${size.name}-${targetWidth}.webp`;
    const webpPath = path.join(CONFIG.outputDir, webpFilename);

    await sharp(inputPath)
      .resize(targetWidth, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp(CONFIG.webp)
      .toFile(webpPath);

    const webpSize = getFileSize(webpPath);

    // Log results
    const sizeLabel = wasDownscaled
      ? `${size.name} (${targetWidth}px - original was smaller)`
      : `${size.name} (${targetWidth}px)`;

    console.log(`  ${colors.cyan}${sizeLabel}:${colors.reset}`);
    console.log(`    ${colors.green}WebP:${colors.reset} ${formatBytes(webpSize)} ${colors.dim}(-${compressionPercent(originalSize, webpSize)}%)${colors.reset}`);

    results.push({
      size: size.name,
      width: targetWidth,
      webp: { filename: webpFilename, size: webpSize }
    });
  }

  return { filename, slug, originalSize, results };
}

/**
 * Main execution
 */
async function main() {
  console.log(`\n${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║     Sky Travel JM - Image Optimization Script              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║     WebP with Responsive Sizes                             ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  // Ensure directories exist
  if (!fs.existsSync(CONFIG.inputDir)) {
    fs.mkdirSync(CONFIG.inputDir, { recursive: true });
    console.log(`${colors.yellow}Created input directory: ${CONFIG.inputDir}${colors.reset}`);
  }

  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    console.log(`${colors.yellow}Created output directory: ${CONFIG.outputDir}${colors.reset}`);
  }

  // Get list of images to process
  const files = fs.readdirSync(CONFIG.inputDir).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return CONFIG.supportedFormats.includes(ext);
  });

  if (files.length === 0) {
    console.log(`${colors.yellow}No images found in ${CONFIG.inputDir}${colors.reset}`);
    console.log(`\n${colors.dim}Supported formats: ${CONFIG.supportedFormats.join(', ')}${colors.reset}`);
    console.log(`${colors.dim}Drop your images into the input directory and run again.${colors.reset}\n`);
    return;
  }

  console.log(`${colors.green}Found ${files.length} image(s) to process${colors.reset}`);
  console.log(`${colors.dim}Input:  ${CONFIG.inputDir}${colors.reset}`);
  console.log(`${colors.dim}Output: ${CONFIG.outputDir}${colors.reset}`);

  // Process all images
  const allResults = [];
  let totalOriginal = 0;
  let totalWebp = 0;

  for (const file of files) {
    try {
      const inputPath = path.join(CONFIG.inputDir, file);
      const result = await processImage(inputPath, file);
      allResults.push(result);

      totalOriginal += result.originalSize;
      for (const r of result.results) {
        totalWebp += r.webp.size;
      }
    } catch (error) {
      console.error(`${colors.red}Error processing ${file}: ${error.message}${colors.reset}`);
    }
  }

  // Summary
  console.log(`\n${colors.bright}${colors.green}════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.green}                    OPTIMIZATION COMPLETE                    ${colors.reset}`);
  console.log(`${colors.bright}${colors.green}════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`\n${colors.bright}Summary:${colors.reset}`);
  console.log(`  Images processed: ${allResults.length}`);
  console.log(`  Files generated:  ${allResults.length * CONFIG.sizes.length} (${CONFIG.sizes.length} sizes)`);
  console.log(`\n${colors.bright}Total File Sizes:${colors.reset}`);
  console.log(`  Original:   ${formatBytes(totalOriginal)}`);
  console.log(`  ${colors.green}WebP total: ${formatBytes(totalWebp)} ${colors.dim}(-${compressionPercent(totalOriginal, totalWebp)}% savings)${colors.reset}`);

  // Generate example HTML
  if (allResults.length > 0) {
    const example = allResults[0];
    const desktop = example.results.find(r => r.size === 'desktop');
    const mobile = example.results.find(r => r.size === 'mobile');

    console.log(`\n${colors.bright}${colors.cyan}Example HTML <picture> tag:${colors.reset}\n`);

    console.log(`<picture>`);
    console.log(`  <source`);
    console.log(`    type="image/webp"`);
    console.log(`    srcset="images/optimized/${mobile.webp.filename} 800w,`);
    console.log(`            images/optimized/${desktop.webp.filename} 1200w"`);
    console.log(`    sizes="(max-width: 768px) 100vw, 1200px">`);
    console.log(`  <img`);
    console.log(`    src="images/optimized/${desktop.webp.filename}"`);
    console.log(`    alt="Descriptive alt text here"`);
    console.log(`    width="${desktop.width}"`);
    console.log(`    height="auto"`);
    console.log(`    loading="lazy"`);
    console.log(`    decoding="async">`);
    console.log(`</picture>`);
  }

  console.log(`\n${colors.dim}Output directory: ${CONFIG.outputDir}${colors.reset}\n`);
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
