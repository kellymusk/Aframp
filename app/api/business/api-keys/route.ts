import { NextResponse } from 'next/server'
import { fetchApiKeys, createApiKey, revokeApiKey } from '@/lib/business/api-keys'

export async function GET() {
  const keys = await fetchApiKeys()
  return NextResponse.json(keys)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const result = await createApiKey({ name: name.trim() })
  return NextResponse.json(result, { status: 201 })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  await revokeApiKey(id)
  return NextResponse.json({ success: true })
}
