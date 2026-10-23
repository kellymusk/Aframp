/**
 * CI image size budget check.
 *
 * Fails if any image in `public/` exceeds its per-format budget, which
 * prevents accidentally committing unconverted PNGs that would bloat the
 * initial page load.
 *
 * Budgets (uncompressed bytes):
 *   - WebP / AVIF : 200 KB
 *   - PNG icons   : 60 KB  (icon-192x192, icon-512x512 — must stay PNG for PWA)
 *   - PNG others  : 30 KB  (any other PNG should have been converted to WebP)
 *
 * Run:  node scripts/check-image-budget.mjs
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const PUBLIC_DIR = path.join(ROOT, 'public')

// Budgets in bytes
const BUDGETS = {
  webp: 200 * 1024, // 200 KB — generous since WebP is already compressed
  avif: 200 * 1024, // 200 KB
  // PNG icons are required by the PWA manifest spec
  pngIcon: 60 * 1024, // 60 KB  (icon-192x192.png ≈ 12 KB, icon-512x512.png ≈ 49 KB)
  // Any remaining PNGs should have been converted; keep a tight budget
  png: 30 * 1024, // 30 KB  — trips if a large unconverted PNG is committed
}

/**
 * Recursively collect every image file under `dir`.
 * @param {string} dir
 * @returns {{ file: string; relPath: string }[]}
 */
function collectImages(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectImages(full))
    } else if (/\.(png|webp|avif|jpg|jpeg|gif|svg)$/i.test(entry.name)) {
      results.push({ file: full, relPath: path.relative(ROOT, full) })
    }
  }
  return results
}

/**
 * Return the budget in bytes for a given file path.
 * @param {string} relPath  e.g. "public/landing/hero-coins.webp"
 * @returns {number}
 */
function budgetFor(relPath) {
  const ext = path.extname(relPath).toLowerCase()
  if (ext === '.webp') return BUDGETS.webp
  if (ext === '.avif') return BUDGETS.avif
  if (ext === '.png') {
    // PWA icons are expected to be larger
    const basename = path.basename(relPath)
    if (/^icon-\d+x\d+\.png$/i.test(basename)) return BUDGETS.pngIcon
    return BUDGETS.png
  }
  // jpg/jpeg/gif/svg — no budget enforced here
  return Infinity
}

const images = collectImages(PUBLIC_DIR)
let passed = 0
let failed = 0

console.log('Image size budget check')
console.log('='.repeat(60))

for (const { file, relPath } of images) {
  const bytes = fs.statSync(file).size
  const budget = budgetFor(relPath)

  // Skip PNGs that have a WebP sibling — they are legacy fallbacks and the
  // WebP version will be checked instead.
  if (path.extname(file).toLowerCase() === '.png') {
    const webpSibling = file.replace(/\.png$/i, '.webp')
    if (fs.existsSync(webpSibling)) {
      console.log(`skip  ${relPath}  (superseded by ${path.basename(webpSibling)})`)
      continue
    }
  }
  if (budget === Infinity) continue // skip types without a budget

  const kb = (bytes / 1024).toFixed(1)
  const budgetKb = (budget / 1024).toFixed(0)

  if (bytes > budget) {
    console.error(`FAIL  ${relPath}  ${kb} KB  (budget: ${budgetKb} KB)`)
    failed++
  } else {
    console.log(`OK    ${relPath}  ${kb} KB  (budget: ${budgetKb} KB)`)
    passed++
  }
}

console.log('='.repeat(60))
console.log(`${passed} passed, ${failed} failed`)

if (failed > 0) {
  console.error(
    '\nImage budget exceeded. Convert large PNGs to WebP (run: node scripts/convert-images.mjs) ' +
      'and update component src paths.'
  )
  process.exit(1)
}
