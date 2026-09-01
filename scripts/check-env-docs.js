#!/usr/bin/env node
/**
 * Keeps `.env.example` and the README's "Environment Variables" table in
 * sync (#487).
 *
 * `.env.example` is the source of truth: each variable there must be
 * preceded by `@type`, `@required`/`@optional`, and `@example` tag comments
 * (`@default` too, for optional variables). This script parses those tags
 * and either:
 *
 *   - checks that the README table (between the
 *     `<!-- ENV_VARS_TABLE:START -->` / `<!-- ENV_VARS_TABLE:END -->`
 *     markers) matches exactly what `.env.example` says — the default, and
 *     what CI runs, so the two files can't silently drift apart; or
 *   - regenerates that table in place, with `--write` (`npm run docs:env`).
 *
 * Usage:
 *   node scripts/check-env-docs.js           # check (exit 1 on mismatch)
 *   node scripts/check-env-docs.js --write    # regenerate README's table
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const ENV_EXAMPLE_PATH = path.join(ROOT, '.env.example')
const README_PATH = path.join(ROOT, 'README.md')

const START_MARKER = '<!-- ENV_VARS_TABLE:START -->'
const END_MARKER = '<!-- ENV_VARS_TABLE:END -->'

const REQUIRED_TAGS = ['type', 'example']

/**
 * Parse `.env.example` into an ordered list of documented variables.
 * Throws with a descriptive message if a variable is missing a required tag,
 * or is missing the required/optional tag entirely.
 */
function parseEnvExample(contents) {
  const lines = contents.split('\n')
  const vars = []
  let pendingTags = {}
  let sawAnyTag = false

  const varLine = /^#?\s*([A-Z][A-Z0-9_]*)=(.*)$/
  const tagLine = /^#\s*@(\w+)(?:\s+(.*))?$/

  for (const line of lines) {
    const tagMatch = line.match(tagLine)
    if (tagMatch) {
      const [, tag, value] = tagMatch
      if (tag === 'required' || tag === 'optional') {
        pendingTags.required = tag === 'required'
      } else {
        pendingTags[tag] = (value ?? '').trim()
      }
      sawAnyTag = true
      continue
    }

    const varMatch = line.match(varLine)
    if (varMatch && sawAnyTag) {
      const [, name] = varMatch
      for (const required of REQUIRED_TAGS) {
        if (!(required in pendingTags)) {
          throw new Error(`${name} is missing @${required} in .env.example`)
        }
      }
      if (pendingTags.required === undefined) {
        throw new Error(`${name} is missing @required or @optional in .env.example`)
      }
      if (!pendingTags.required && !('default' in pendingTags)) {
        throw new Error(`${name} is @optional but missing @default in .env.example`)
      }
      vars.push({
        name,
        type: pendingTags.type,
        required: pendingTags.required,
        default: pendingTags.default,
        example: pendingTags.example,
      })
      pendingTags = {}
      sawAnyTag = false
      continue
    }

    // A blank line or plain prose comment between an @tag block and its
    // variable would silently detach them — fail loudly instead of parsing
    // a variable with stale/wrong tags.
    if (sawAnyTag && line.trim() !== '' && !line.trim().startsWith('#')) {
      throw new Error(`unexpected non-comment line between @tags and a variable: "${line}"`)
    }
  }

  return vars
}

/** Render the parsed variables as the markdown table that belongs in the README. */
function renderTable(vars) {
  const header = '| Variable | Type | Required | Default | Example |'
  const divider = '| --- | --- | --- | --- | --- |'
  const rows = vars.map((v) => {
    const required = v.required ? 'Yes' : 'No'
    const def = v.required ? '—' : `\`${v.default}\``
    return `| \`${v.name}\` | ${v.type} | ${required} | ${def} | \`${v.example}\` |`
  })
  return [header, divider, ...rows].join('\n')
}

function readReadmeTable(readme) {
  const start = readme.indexOf(START_MARKER)
  const end = readme.indexOf(END_MARKER)
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `README.md is missing the ${START_MARKER} / ${END_MARKER} markers around the Environment Variables table`
    )
  }
  return { start, end, current: readme.slice(start + START_MARKER.length, end).trim() }
}

function main() {
  const write = process.argv.includes('--write')

  const envExample = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf8')
  const vars = parseEnvExample(envExample)
  const table = renderTable(vars)

  const readme = fs.readFileSync(README_PATH, 'utf8')
  const { start, end, current } = readReadmeTable(readme)

  if (write) {
    const before = readme.slice(0, start + START_MARKER.length)
    const after = readme.slice(end)
    const updated = `${before}\n\n${table}\n\n${after}`
    fs.writeFileSync(README_PATH, updated)
    console.log(`Wrote ${vars.length} variable(s) to README.md's Environment Variables table.`)
    return
  }

  if (current !== table) {
    console.error('README.md\'s Environment Variables table is out of sync with .env.example.')
    console.error('Run `npm run docs:env` to regenerate it, then commit the change.\n')
    console.error('Expected:\n' + table + '\n')
    console.error('Found:\n' + current + '\n')
    process.exitCode = 1
    return
  }

  console.log(`.env.example and README.md agree on ${vars.length} variable(s).`)
}

try {
  main()
} catch (err) {
  console.error(err.message)
  process.exitCode = 1
}
