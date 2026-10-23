/**
 * Convert all large PNGs in public/ to WebP using sharp.
 *
 * Skips:
 *   - PWA icon PNGs (icon-*x*.png) — required by the manifest spec
 *   - Files that already have a matching .webp sibling
 *
 * Usage:
 *   node scripts/convert-images.mjs
 *
 * After running, update component src paths from .png -> .webp.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const ROOT = process.cwd()
const PUBLIC_DIR = path.join(ROOT, 'public')
const QUALITY = 85 // WebP quality (0-100); 85 is a good balance of size/quality
const EFFORT = 6 // WebP compression effort (0-6); higher = smaller file but slower

function collectPngs(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectPngs(full))
    } else if (entry.name.toLowerCase().endsWith('.png')) {
      results.push(full)
    }
  }
  return results
}

async function main() {
  const pngs = collectPngs(PUBLIC_DIR)
  let converted = 0
  let skipped = 0

  for (const pngPath of pngs) {
    const basename = path.basename(pngPath)

    // Skip PWA icons — they must stay as PNG for the Web App Manifest
    if (/^icon-\d+x\d+\.png$/i.test(basename)) {
      console.log(`skip  ${path.relative(ROOT, pngPath)}  (PWA icon, must stay PNG)`)
      skipped++
      continue
    }

    const webpPath = pngPath.replace(/\.png$/i, '.webp')

    // Skip if WebP already exists and is newer than the PNG
    if (fs.existsSync(webpPath)) {
      const pngMtime = fs.statSync(pngPath).mtimeMs
      const webpMtime = fs.statSync(webpPath).mtimeMs
      if (webpMtime >= pngMtime) {
        console.log(`skip  ${path.relative(ROOT, pngPath)}  (WebP already up to date)`)
        skipped++
        continue
      }
    }

    try {
      await sharp(pngPath).webp({ quality: QUALITY, effort: EFFORT }).toFile(webpPath)

      const pngSize = fs.statSync(pngPath).size
      const webpSize = fs.statSync(webpPath).size
      const savings = (((pngSize - webpSize) / pngSize) * 100).toFixed(1)

      console.log(
        `✓  ${path.relative(ROOT, pngPath)} → ${path.basename(webpPath)}` +
          `  ${(pngSize / 1024).toFixed(0)} KB → ${(webpSize / 1024).toFixed(0)} KB  (${savings}% saved)`
      )
      converted++
    } catch (err) {
      console.error(`✗  ${path.relative(ROOT, pngPath)}: ${err.message}`)
    }
  }

  console.log(`\nDone. ${converted} converted, ${skipped} skipped.`)
  if (converted > 0) {
    console.log(
      '\nNext step: update component src paths from .png → .webp and run:\n' +
        '  node scripts/check-image-budget.mjs'
    )
  }
}

main()
