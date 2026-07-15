#!/usr/bin/env node

/**
 * Generate PWA icons from SVG using sharp.
 * Run this script once to generate the icon files in public/:
 *   node scripts/generate-icons.js
 *
 * Icons generated:
 *   - icon-192x192.png (standard app icon)
 *   - icon-512x512.png (splash screen icon)
 *   - icon-maskable-192x192.png (adaptive icon for Android 12+)
 *   - icon-maskable-512x512.png (adaptive icon for Android 12+)
 *   - apple-icon.png (180x180, for iOS)
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const APP_DIR = path.join(__dirname, '..', 'app');

// Ensure directories exist
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// SVG monogram icon (DE for DigiERP) — simple centered text on dark background
const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0566d9"/>
  <text
    x="256"
    y="256"
    font-size="280"
    font-weight="600"
    font-family="Arial, sans-serif"
    text-anchor="middle"
    dominant-baseline="central"
    fill="#ffffff"
  >DE</text>
</svg>
`;

const iconSvgBuffer = Buffer.from(iconSvg);

async function generateIcons() {
  try {
    console.log('Generating PWA icons...');

    // Standard icons
    await sharp(iconSvgBuffer)
      .resize(192, 192, { fit: 'cover' })
      .png()
      .toFile(path.join(PUBLIC_DIR, 'icon-192x192.png'));
    console.log('✓ icon-192x192.png');

    await sharp(iconSvgBuffer)
      .resize(512, 512, { fit: 'cover' })
      .png()
      .toFile(path.join(PUBLIC_DIR, 'icon-512x512.png'));
    console.log('✓ icon-512x512.png');

    // Maskable icons (with padding for adaptive display)
    const maskableSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <circle cx="256" cy="256" r="256" fill="#0566d9"/>
      <text
        x="256"
        y="256"
        font-size="280"
        font-weight="600"
        font-family="Arial, sans-serif"
        text-anchor="middle"
        dominant-baseline="central"
        fill="#ffffff"
      >DE</text>
    </svg>
    `;

    const maskableSvgBuffer = Buffer.from(maskableSvg);

    await sharp(maskableSvgBuffer)
      .resize(192, 192, { fit: 'cover' })
      .png()
      .toFile(path.join(PUBLIC_DIR, 'icon-maskable-192x192.png'));
    console.log('✓ icon-maskable-192x192.png');

    await sharp(maskableSvgBuffer)
      .resize(512, 512, { fit: 'cover' })
      .png()
      .toFile(path.join(PUBLIC_DIR, 'icon-maskable-512x512.png'));
    console.log('✓ icon-maskable-512x512.png');

    // Apple touch icon
    await sharp(iconSvgBuffer)
      .resize(180, 180, { fit: 'cover' })
      .png()
      .toFile(path.join(APP_DIR, 'apple-icon.png'));
    console.log('✓ apple-icon.png');

    // App icon (for favicon, in app/ so Next auto-links it)
    await sharp(iconSvgBuffer)
      .resize(192, 192, { fit: 'cover' })
      .png()
      .toFile(path.join(APP_DIR, 'icon.png'));
    console.log('✓ icon.png');

    console.log('\nAll icons generated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
