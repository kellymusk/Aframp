import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

/** True when a real Postgres connection is configured. */
export const hasDatabase = Boolean(connectionString)

let queryClient: postgres.Sql | undefined
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined

if (connectionString) {
  queryClient = postgres(connectionString, { max: 1 })
  dbInstance = drizzle(queryClient, { schema })
}

/**
 * Drizzle client for the app database. Only defined when DATABASE_URL is
 * set — callers must check `hasDatabase` (or handle `db` being undefined)
 * and fall back to in-memory storage otherwise, e.g. for local dev.
 */
export const db = dbInstance
