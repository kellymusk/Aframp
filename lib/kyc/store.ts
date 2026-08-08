import { eq } from 'drizzle-orm'
import type { KycSubmission } from '@/types/kyc'
import { db, hasDatabase } from '@/db/client'
import { kycSubmissions } from '@/db/schema'

// In-memory fallback used only when DATABASE_URL is not configured
// (local development). Production must set DATABASE_URL.
const memoryStore = new Map<string, KycSubmission>()

export async function getKycSubmission(id: string): Promise<KycSubmission | undefined> {
  if (hasDatabase && db) {
    const [row] = await db.select().from(kycSubmissions).where(eq(kycSubmissions.id, id))
    return row ? (row.data as KycSubmission) : undefined
  }
  return memoryStore.get(id)
}

export async function setKycSubmission(id: string, submission: KycSubmission): Promise<void> {
  if (hasDatabase && db) {
    await db
      .insert(kycSubmissions)
      .values({ id, data: submission })
      .onConflictDoUpdate({
        target: kycSubmissions.id,
        set: { data: submission, updatedAt: new Date() },
      })
    return
  }
  memoryStore.set(id, submission)
}
