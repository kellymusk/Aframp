/**
 * Applies every .sql file in db/migrations against DATABASE_URL, in
 * filename order, tracking what has already run in a `_migrations` table
 * so re-runs are a no-op. Usage: `npm run db:migrate`.
 */
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import postgres from 'postgres'

const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations')

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is not set — cannot run migrations.')
    process.exit(1)
  }

  const sql = postgres(connectionString, { max: 1 })

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        name        TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `

    const applied = new Set((await sql`SELECT name FROM _migrations`).map((row) => row.name))

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((file) => file.endsWith('.sql'))
      .sort()

    for (const file of files) {
      if (applied.has(file)) {
        console.warn(`skip:  ${file} (already applied)`)
        continue
      }

      const contents = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8')
      console.warn(`apply: ${file}`)
      await sql.unsafe(contents)
      await sql`INSERT INTO _migrations (name) VALUES (${file})`
    }

    console.warn('Migrations complete.')
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
