import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, extractToken } from '@/lib/supabase'

// POST /api/teams/[id]/members — Add a member by user_id
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { user_id, role = 'member' } = body

  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  if (!['owner', 'admin', 'member'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role. Must be owner, admin, or member' }, { status: 400 })
  }

  // RLS handles authorization (only owners/admins can insert)
  const { data: member, error } = await db
    .from('team_members')
    .insert({ team_id: params.id, user_id, role })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'User is already a member of this team' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ member }, { status: 201 })
}

// DELETE /api/teams/[id]/members — Remove a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get('user_id')

  if (!user_id) {
    return NextResponse.json({ error: 'user_id query param is required' }, { status: 400 })
  }

  // RLS handles authorization (owners/admins only)
  const { error } = await db
    .from('team_members')
    .delete()
    .eq('team_id', params.id)
    .eq('user_id', user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
