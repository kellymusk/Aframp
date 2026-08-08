import { desc, eq } from 'drizzle-orm'
import { db, hasDatabase } from '@/db/client'
import { teamInvites as teamInvitesTable } from '@/db/schema'

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

export interface TeamMember {
  id: string
  email: string
  name: string
  role: 'admin' | 'member'
  status: InviteStatus
  invitedAt: string
  acceptedAt?: string
}

export interface CreateInviteInput {
  email: string
  name: string
  role: 'admin' | 'member'
}

// In-memory fallback used only when DATABASE_URL is not configured
// (local development). Production must set DATABASE_URL.
let memoryMembers: TeamMember[] = [
  {
    id: 'mem-1',
    email: 'alice@example.com',
    name: 'Alice Johnson',
    role: 'admin',
    status: 'accepted',
    invitedAt: '2026-05-20T10:00:00Z',
    acceptedAt: '2026-05-20T12:30:00Z',
  },
  {
    id: 'mem-2',
    email: 'bob@example.com',
    name: 'Bob Smith',
    role: 'member',
    status: 'accepted',
    invitedAt: '2026-05-22T08:00:00Z',
    acceptedAt: '2026-05-23T09:15:00Z',
  },
  {
    id: 'mem-3',
    email: 'carol@example.com',
    name: 'Carol Davis',
    role: 'member',
    status: 'pending',
    invitedAt: '2026-05-25T14:00:00Z',
  },
  {
    id: 'mem-4',
    email: 'dave@example.com',
    name: 'Dave Wilson',
    role: 'admin',
    status: 'pending',
    invitedAt: '2026-05-27T16:00:00Z',
  },
]
let nextId = 5

function toTeamMember(row: typeof teamInvitesTable.$inferSelect): TeamMember {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as TeamMember['role'],
    status: row.status as InviteStatus,
    invitedAt: row.invitedAt.toISOString(),
    acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : undefined,
  }
}

export async function fetchMembers(): Promise<TeamMember[]> {
  if (hasDatabase && db) {
    const rows = await db
      .select()
      .from(teamInvitesTable)
      .orderBy(desc(teamInvitesTable.invitedAt))
    return rows.map(toTeamMember)
  }
  await new Promise((r) => setTimeout(r, 200))
  return [...memoryMembers]
}

export async function createInvite(input: CreateInviteInput): Promise<TeamMember> {
  if (hasDatabase && db) {
    const id = crypto.randomUUID()
    const [row] = await db
      .insert(teamInvitesTable)
      .values({ id, email: input.email, name: input.name, role: input.role, status: 'pending' })
      .returning()
    return toTeamMember(row)
  }

  await new Promise((r) => setTimeout(r, 300))
  const newMember: TeamMember = {
    id: `mem-${nextId++}`,
    email: input.email,
    name: input.name,
    role: input.role,
    status: 'pending',
    invitedAt: new Date().toISOString(),
  }
  memoryMembers = [newMember, ...memoryMembers]
  return newMember
}

export async function cancelInvite(id: string): Promise<void> {
  if (hasDatabase && db) {
    await db.update(teamInvitesTable).set({ status: 'cancelled' }).where(eq(teamInvitesTable.id, id))
    return
  }
  await new Promise((r) => setTimeout(r, 200))
  memoryMembers = memoryMembers.map((m) => (m.id === id ? { ...m, status: 'cancelled' as const } : m))
}

export async function removeMember(id: string): Promise<void> {
  if (hasDatabase && db) {
    await db.delete(teamInvitesTable).where(eq(teamInvitesTable.id, id))
    return
  }
  await new Promise((r) => setTimeout(r, 200))
  memoryMembers = memoryMembers.filter((m) => m.id !== id)
}
