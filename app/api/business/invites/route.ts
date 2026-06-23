import { NextResponse } from 'next/server'
import { fetchMembers, createInvite, cancelInvite } from '@/lib/business/team-invites'

export async function GET() {
  const members = await fetchMembers()
  return NextResponse.json(members)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { email, name, role } = body

  if (!email || !name || !role) {
    return NextResponse.json({ error: 'email, name, and role are required' }, { status: 400 })
  }

  if (role !== 'admin' && role !== 'member') {
    return NextResponse.json({ error: 'role must be admin or member' }, { status: 400 })
  }

  const member = await createInvite({ email, name, role })
  return NextResponse.json(member, { status: 201 })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  await cancelInvite(id)
  return NextResponse.json({ success: true })
}
