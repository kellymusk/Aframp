import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const ROOT = process.cwd()
const BUILD_MANIFEST_PATH = path.join(ROOT, '.next', 'build-manifest.json')
const THRESHOLD_BYTES = 20 * 1024

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function gzippedSize(buffer) {
  return zlib.gzipSync(buffer).length
}

function routeStats() {
  if (!fs.existsSync(BUILD_MANIFEST_PATH)) {
    throw new Error(`Bundle manifest not found at ${BUILD_MANIFEST_PATH}. Run \`npm run build:analyze\` first.`)
  }

  const manifest = readJson(BUILD_MANIFEST_PATH)
  const pageEntries = manifest.pages ?? {}
  const results = []

  for (const [route, files] of Object.entries(pageEntries)) {
    if (!Array.isArray(files) || files.length === 0) continue

    let totalBytes = 0
    let gzippedBytes = 0
    for (const file of files) {
      const absolute = path.join(ROOT, '.next', file)
      if (!fs.existsSync(absolute)) continue
      const contents = fs.readFileSync(absolute)
      totalBytes += contents.length
      gzippedBytes += gzippedSize(contents)
    }

    results.push({ route, totalBytes, gzippedBytes })
  }

  return results.sort((a, b) => b.gzippedBytes - a.gzippedBytes)
}

const stats = routeStats()
const failures = stats.filter((entry) => entry.gzippedBytes > THRESHOLD_BYTES)

if (stats.length === 0) {
  console.log('No route bundle entries found in .next/build-manifest.json.')
  process.exit(0)
}

for (const entry of stats) {
  const sizeKb = (entry.gzippedBytes / 1024).toFixed(2)
  const status = entry.gzippedBytes > THRESHOLD_BYTES ? 'FAIL' : 'OK'
  console.log(`${status} ${entry.route}: ${sizeKb} KB gzipped`)
}

if (failures.length > 0) {
  console.error(
    `\nBundle budget exceeded for ${failures.length} route(s). Maximum allowed gzipped size is ${THRESHOLD_BYTES / 1024} KB.`
  )
  for (const entry of failures) {
    console.error(`- ${entry.route}: ${(entry.gzippedBytes / 1024).toFixed(2)} KB gzipped`)
  }
  process.exit(1)
}

console.log(`\nAll route bundles are within the ${THRESHOLD_BYTES / 1024} KB gzipped budget.`)
