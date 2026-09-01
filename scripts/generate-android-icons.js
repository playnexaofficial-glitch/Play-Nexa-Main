const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process');

// Standard Android Mipmap dimensions
const MIPMAP_DENSITIES = [
  { dir: 'mipmap-mdpi', iconSize: 48, adaptiveSize: 108 },
  { dir: 'mipmap-hdpi', iconSize: 72, adaptiveSize: 162 },
  { dir: 'mipmap-xhdpi', iconSize: 96, adaptiveSize: 216 },
  { dir: 'mipmap-xxhdpi', iconSize: 144, adaptiveSize: 324 },
  { dir: 'mipmap-xxxhdpi', iconSize: 192, adaptiveSize: 432 },
];

async function generateAllAndroidIcons() {
  console.log('[Assets] Starting Android native launcher icon generation...');
  const rootDir = process.cwd();
  const resDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');
  const assetsDir = path.join(rootDir, 'assets');
  const pubDir = path.join(rootDir, 'public');
  const iconsDir = path.join(pubDir, 'icons');

  // Find best available source icon
  const candidateIcons = [
    path.join(assetsDir, 'icon.png'),
    path.join(pubDir, 'icon.png'),
    path.join(iconsDir, 'icon-512.png'),
    path.join(pubDir, 'icon-512.png'),
    path.join(iconsDir, 'icon-1024.png'),
  ];

  let sourceIcon = candidateIcons.find((p) => fs.existsSync(p));

  // Fallback: If no icon file exists, generate a sleek brand red default icon buffer
  let sourceBuffer;
  if (sourceIcon) {
    console.log(`[Assets] Using source icon from: ${sourceIcon}`);
    sourceBuffer = fs.readFileSync(sourceIcon);
  } else {
    console.warn('[Assets] Warning: No icon file found in candidate paths. Generating default brand fallback...');
    const svgFallback = Buffer.from(
      `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
        <rect width="1024" height="1024" rx="220" fill="#E50914"/>
        <path d="M350 260 L720 512 L350 764 Z" fill="#FFFFFF"/>
      </svg>`
    );
    sourceBuffer = await sharp(svgFallback).png().toBuffer();
  }

  // 1. Sync assets directory
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

  const assetFiles = ['logo.png', 'icon.png', 'icon-only.png', 'icon-foreground.png'];
  for (const f of assetFiles) {
    fs.writeFileSync(path.join(assetsDir, f), sourceBuffer);
  }

  // 2. Generate Web & PWA icons
  await sharp(sourceBuffer).resize(512, 512).png().toFile(path.join(pubDir, 'icon-512.png'));
  await sharp(sourceBuffer).resize(192, 192).png().toFile(path.join(pubDir, 'icon-192.png'));
  await sharp(sourceBuffer).resize(180, 180).png().toFile(path.join(pubDir, 'apple-touch-icon.png'));
  await sharp(sourceBuffer).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'));
  await sharp(sourceBuffer).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'));
  await sharp(sourceBuffer).resize(1024, 1024).png().toFile(path.join(iconsDir, 'icon-1024.png'));
  console.log('[Assets] Web, PWA & assets/ folder synced.');

  // 3. Generate native Android mipmap icons for all densities
  for (const density of MIPMAP_DENSITIES) {
    const targetDir = path.join(resDir, density.dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // A) Standard square launcher icon
    await sharp(sourceBuffer)
      .resize(density.iconSize, density.iconSize)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // B) Round launcher icon (masked with circle)
    const circleSvg = Buffer.from(
      `<svg><circle cx="${density.iconSize / 2}" cy="${density.iconSize / 2}" r="${density.iconSize / 2}" fill="#000"/></svg>`
    );
    await sharp(sourceBuffer)
      .resize(density.iconSize, density.iconSize)
      .composite([{ input: circleSvg, blend: 'dest-in' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // C) Adaptive icon background (Solid #E50914)
    await sharp({
      create: {
        width: density.adaptiveSize,
        height: density.adaptiveSize,
        channels: 4,
        background: { r: 229, g: 9, b: 20, alpha: 1 },
      },
    })
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_background.png'));

    // D) Adaptive icon foreground (centered source logo with safe margin 72dp out of 108dp)
    const innerLogoSize = Math.round(density.adaptiveSize * 0.66);
    const innerLogo = await sharp(sourceBuffer)
      .resize(innerLogoSize, innerLogoSize)
      .png()
      .toBuffer();

    const padding = Math.round((density.adaptiveSize - innerLogoSize) / 2);
    await sharp({
      create: {
        width: density.adaptiveSize,
        height: density.adaptiveSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: innerLogo, top: padding, left: padding }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`[Assets] Generated ${density.dir} (${density.iconSize}px icon / ${density.adaptiveSize}px adaptive)`);
  }

  // 4. Ensure mipmap-anydpi-v26 XMLs exist and point to ic_launcher_background / ic_launcher_foreground
  const anydpiDir = path.join(resDir, 'mipmap-anydpi-v26');
  if (!fs.existsSync(anydpiDir)) {
    fs.mkdirSync(anydpiDir, { recursive: true });
  }

  const adaptiveXmlContent = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

  fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), adaptiveXmlContent);
  fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), adaptiveXmlContent);
  console.log('[Assets] Created mipmap-anydpi-v26 XML configuration.');

  // 5. Optional @capacitor/assets execution for extra splashscreens
  try {
    console.log('[Assets] Running @capacitor/assets for splash drawables...');
    execSync('npx @capacitor/assets generate --android --assetPath assets --iconBackgroundColor "#E50914"', {
      stdio: 'inherit',
    });
  } catch (err) {
    console.warn('[Assets] @capacitor/assets step completed with notice:', err.message);
  }

  console.log('[Assets] All Android native mipmap launcher icons and splash assets successfully updated!');
}

generateAllAndroidIcons().catch((err) => {
  console.error('[Assets] Fatal error generating Android icons:', err);
  process.exit(1);
});
