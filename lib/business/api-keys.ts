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
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let raw = 'afr_'
  for (let i = 0; i < 40; i++) {
    raw += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  const prefix = raw.slice(0, 12)
  const masked = prefix + '…' + raw.slice(-4)
  return { rawSecret: raw, prefix, masked }
}

let keys: ApiKey[] = [
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

export async function fetchApiKeys(): Promise<ApiKey[]> {
  await new Promise((r) => setTimeout(r, 200))
  return [...keys]
}

export async function createApiKey(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
  await new Promise((r) => setTimeout(r, 300))
  const { rawSecret, prefix, masked } = generateKey()
  const newKey: ApiKey = {
    id: `key-${nextId++}`,
    name: input.name,
    keyPrefix: prefix,
    maskedKey: masked,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    status: 'active',
  }
  keys = [newKey, ...keys]
  return { key: newKey, rawSecret }
}

export async function revokeApiKey(id: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 200))
  keys = keys.map((k) => (k.id === id ? { ...k, status: 'revoked' as const } : k))
}
