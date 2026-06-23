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

let members: TeamMember[] = [
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

export async function fetchMembers(): Promise<TeamMember[]> {
  await new Promise((r) => setTimeout(r, 200))
  return [...members]
}

export async function createInvite(input: CreateInviteInput): Promise<TeamMember> {
  await new Promise((r) => setTimeout(r, 300))
  const newMember: TeamMember = {
    id: `mem-${nextId++}`,
    email: input.email,
    name: input.name,
    role: input.role,
    status: 'pending',
    invitedAt: new Date().toISOString(),
  }
  members = [newMember, ...members]
  return newMember
}

export async function cancelInvite(id: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 200))
  members = members.map((m) => (m.id === id ? { ...m, status: 'cancelled' as const } : m))
}

export async function removeMember(id: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 200))
  members = members.filter((m) => m.id !== id)
}
