import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import zlib from 'node:zlib'

/**
 * Budgets the JavaScript each App Router page adds on top of what every page
 * already loads: the framework runtime (rootMainFiles + polyfills) and the
 * layouts the page renders inside. Those shared chunks are paid once and
 * cached, so counting them against every route would make any budget
 * meaningless. Chunks loaded later via next/dynamic are not counted either.
 */
const ROOT = process.cwd()
const NEXT_DIR = path.join(ROOT, '.next')
const BUILD_MANIFEST_PATH = path.join(NEXT_DIR, 'build-manifest.json')
const APP_BUILD_MANIFEST_PATH = path.join(NEXT_DIR, 'app-build-manifest.json')
const THRESHOLD_BYTES = 40 * 1024

function readJson(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Bundle manifest not found at ${file}. Run \`npm run build:analyze\` first.`)
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

const gzipCache = new Map()
function gzippedSize(file) {
  if (!gzipCache.has(file)) {
    const absolute = path.join(NEXT_DIR, file)
    gzipCache.set(
      file,
      fs.existsSync(absolute) ? zlib.gzipSync(fs.readFileSync(absolute)).length : 0
    )
  }
  return gzipCache.get(file)
}

/** '/(app)/admin/users/page' → ['/layout', '/(app)/layout', '/(app)/admin/layout', ...] */
function layoutEntries(pageEntry) {
  const segments = pageEntry.split('/').slice(1, -1)
  const layouts = ['/layout']
  let current = ''
  for (const segment of segments) {
    current += `/${segment}`
    layouts.push(`${current}/layout`)
  }
  return layouts
}

/**
 * Next <= 15: `.next/app-build-manifest.json` maps each page and layout entry
 * to its JS files.
 */
function appPagesFromBuildManifest() {
  return readJson(APP_BUILD_MANIFEST_PATH).pages ?? {}
}

/** Recursively collect `page_client-reference-manifest.js` files under `dir`. */
function findClientManifests(dir) {
  const found = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) found.push(...findClientManifests(full))
    else if (entry.name === 'page_client-reference-manifest.js') found.push(full)
  }
  return found
}

/**
 * Next 16 no longer writes app-build-manifest.json. Each page's client
 * reference manifest lists every client module it loads (its layouts
 * included) with the chunks those modules need. A layout's files are the
 * chunks shared by every page beneath it, which matches the old per-layout
 * entries closely enough for a budget.
 */
function appPagesFromClientManifests() {
  const serverAppDir = path.join(NEXT_DIR, 'server', 'app')
  if (!fs.existsSync(serverAppDir)) {
    throw new Error(`No App Router output at ${serverAppDir}. Run \`npm run build:analyze\` first.`)
  }

  const pages = {}
  for (const file of findClientManifests(serverAppDir)) {
    const sandbox = { self: {} }
    sandbox.globalThis = sandbox.self
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox)
    const manifests = sandbox.self.__RSC_MANIFEST ?? {}
    for (const [entry, manifest] of Object.entries(manifests)) {
      const files = new Set()
      for (const mod of Object.values(manifest.clientModules ?? {})) {
        for (const chunk of mod.chunks ?? []) {
          if (typeof chunk === 'string' && chunk.endsWith('.js')) files.add(chunk)
        }
      }
      pages[entry] = [...files]
    }
  }

  const pageEntries = Object.keys(pages)
  for (const entry of pageEntries) {
    for (const layout of layoutEntries(entry)) {
      if (pages[layout]) continue
      const prefix = layout.replace(/\/layout$/, '/')
      const under = pageEntries.filter((page) => page.startsWith(prefix === '/' ? '/' : prefix))
      if (under.length < 2) {
        // With a single page beneath it, "shared" would be the page's whole
        // bundle; count only the layout's own chunk for that segment.
        const segment = layout.replace(/\/layout$/, '')
        pages[layout] = (pages[under[0]] ?? []).filter((file) =>
          file.startsWith(`static/chunks/app${segment}/layout-`)
        )
        continue
      }
      const sets = under.map((page) => new Set(pages[page]))
      pages[layout] = [...sets[0]].filter((file) => sets.every((set) => set.has(file)))
    }
  }
  return pages
}

function routeStats() {
  const buildManifest = readJson(BUILD_MANIFEST_PATH)
  const appPages = fs.existsSync(APP_BUILD_MANIFEST_PATH)
    ? appPagesFromBuildManifest()
    : appPagesFromClientManifests()
  const runtime = new Set([
    ...(buildManifest.rootMainFiles ?? []),
    ...(buildManifest.polyfillFiles ?? []),
  ])

  const results = []
  for (const [entry, files] of Object.entries(appPages)) {
    if (!entry.endsWith('/page') || !Array.isArray(files)) continue

    const shared = new Set(runtime)
    for (const layout of layoutEntries(entry)) {
      for (const file of appPages[layout] ?? []) shared.add(file)
    }

    const routeFiles = files.filter((file) => file.endsWith('.js') && !shared.has(file))
    const gzippedBytes = routeFiles.reduce((total, file) => total + gzippedSize(file), 0)
    results.push({ route: entry.replace(/\/page$/, '') || '/', gzippedBytes })
  }

  return results.sort((a, b) => b.gzippedBytes - a.gzippedBytes)
}

const stats = routeStats()

if (stats.length === 0) {
  console.log('No app route entries found in .next/app-build-manifest.json.')
  process.exit(0)
}

const failures = stats.filter((entry) => entry.gzippedBytes > THRESHOLD_BYTES)

for (const entry of stats) {
  const sizeKb = (entry.gzippedBytes / 1024).toFixed(2)
  const status = entry.gzippedBytes > THRESHOLD_BYTES ? 'FAIL' : 'OK'
  console.log(`${status} ${entry.route}: ${sizeKb} KB gzipped`)
}

if (failures.length > 0) {
  console.error(
    `\nBundle budget exceeded for ${failures.length} route(s). Maximum route-specific JS is ${THRESHOLD_BYTES / 1024} KB gzipped.`
  )
  for (const entry of failures) {
    console.error(`- ${entry.route}: ${(entry.gzippedBytes / 1024).toFixed(2)} KB gzipped`)
  }
  process.exit(1)
}

console.log(
  `\nAll routes are within the ${THRESHOLD_BYTES / 1024} KB gzipped route-specific budget.`
)
