// Run with: node scripts/crop-portraits.js
// Crops character portraits from public/title-bg.png
// Adjust the REGIONS object if characters are in different positions

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT  = join(__dirname, '../public/title-bg.png');
const OUTDIR = join(__dirname, '../public');

// Get dimensions first so we can calculate fractional regions
const metadata = await sharp(INPUT).metadata();
const { width: W, height: H } = metadata;
console.log(`Image dimensions: ${W}x${H}`);

// ─── Adjust these fractions if the crop is off ───────────────────────────────
// Each entry: [leftFrac, topFrac, rightFrac, bottomFrac]  (0–1 of image size)
// Defaults assume 4 characters spread across the lower-left 3/4 of the image.
const REGIONS = {
  ben:   [0.03, 0.18, 0.25, 0.88],
  linda: [0.25, 0.18, 0.48, 0.88],
  miles: [0.48, 0.18, 0.70, 0.88],
  ocean: [0.70, 0.18, 0.90, 0.88],
};
// ─────────────────────────────────────────────────────────────────────────────

const PORTRAIT_W = 220;
const PORTRAIT_H = 300;

for (const [name, [l, t, r, b]] of Object.entries(REGIONS)) {
  const left   = Math.round(l * W);
  const top    = Math.round(t * H);
  const width  = Math.round((r - l) * W);
  const height = Math.round((b - t) * H);

  const outPath = join(OUTDIR, `${name}-portrait.png`);

  await sharp(INPUT)
    .extract({ left, top, width, height })
    .resize(PORTRAIT_W, PORTRAIT_H, { fit: 'cover', position: 'centre' })
    .toFile(outPath);

  console.log(`✓ ${name}-portrait.png  (source: ${left},${top} ${width}×${height})`);
}

console.log('\nDone! Portraits saved to public/');
console.log('If they look wrong, edit the REGIONS fractions in scripts/crop-portraits.js');
