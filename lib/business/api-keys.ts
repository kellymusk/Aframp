import { randomBytes } from 'crypto'

export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  maskedKey: string
  createdAt: string
  lastUsedAt: string | null
  status: 'active' | 'revoked'
}

export interface CreateApiKeyInput {
  name: string
}

export interface CreateApiKeyResult {
  key: ApiKey
  rawSecret: string
}

function generateKey(): { rawSecret: string; prefix: string; masked: string } {
  // crypto.randomBytes is a CSPRNG — Math.random() is predictable and must
  // never be used to derive secrets.
  const raw = 'afr_' + randomBytes(30).toString('base64url').slice(0, 40)
  const prefix = raw.slice(0, 12)
  const masked = prefix + '…' + raw.slice(-4)
  return { rawSecret: raw, prefix, masked }
}

// In-memory fallback used only when DATABASE_URL is not configured
// (local development). Production must set DATABASE_URL.
let memoryKeys: ApiKey[] = [
  {
    id: 'key-1',
    name: 'Production',
    keyPrefix: 'afr_prod_ab12',
    maskedKey: 'afr_prod_ab12…x9k2',
    createdAt: '2026-05-15T08:00:00Z',
    lastUsedAt: '2026-05-28T14:32:00Z',
    status: 'active',
  },
  {
    id: 'key-2',
    name: 'Staging',
    keyPrefix: 'afr_stag_cd34',
    maskedKey: 'afr_stag_cd34…m7p1',
    createdAt: '2026-05-18T10:30:00Z',
    lastUsedAt: '2026-05-27T09:12:00Z',
    status: 'active',
  },
  {
    id: 'key-3',
    name: 'Development (old)',
    keyPrefix: 'afr_dev_ef56',
    maskedKey: 'afr_dev_ef56…r3t8',
    createdAt: '2026-04-01T12:00:00Z',
    lastUsedAt: '2026-05-20T11:45:00Z',
    status: 'revoked',
  },
]
let nextId = 4

function toApiKey(row: typeof apiKeysTable.$inferSelect): ApiKey {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    maskedKey: row.maskedKey,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    status: row.status as ApiKey['status'],
  }
}

export async function fetchApiKeys(): Promise<ApiKey[]> {
  if (hasDatabase && db) {
    const rows = await db.select().from(apiKeysTable).orderBy(desc(apiKeysTable.createdAt))
    return rows.map(toApiKey)
  }
  await new Promise((r) => setTimeout(r, 200))
  return [...memoryKeys]
}

export async function createApiKey(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
  const { rawSecret, prefix, masked } = generateKey()

  if (hasDatabase && db) {
    const id = crypto.randomUUID()
    const [row] = await db
      .insert(apiKeysTable)
      .values({ id, name: input.name, keyPrefix: prefix, maskedKey: masked, status: 'active' })
      .returning()
    return { key: toApiKey(row), rawSecret }
  }

  await new Promise((r) => setTimeout(r, 300))
  const newKey: ApiKey = {
    id: `key-${nextId++}`,
    name: input.name,
    keyPrefix: prefix,
    maskedKey: masked,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    status: 'active',
  }
  memoryKeys = [newKey, ...memoryKeys]
  return { key: newKey, rawSecret }
}

export async function revokeApiKey(id: string): Promise<void> {
  if (hasDatabase && db) {
    await db.update(apiKeysTable).set({ status: 'revoked' }).where(eq(apiKeysTable.id, id))
    return
  }
  await new Promise((r) => setTimeout(r, 200))
  memoryKeys = memoryKeys.map((k) => (k.id === id ? { ...k, status: 'revoked' as const } : k))
}
