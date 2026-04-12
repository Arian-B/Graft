import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, extractToken } from '@/lib/supabase'

// GET /api/teams/[id] — Get team details + members
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS ensures user can only see teams they belong to
  const { data: team, error } = await db
    .from('teams')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const { data: members } = await db
    .from('team_members')
    .select('id, user_id, role, joined_at')
    .eq('team_id', params.id)

  return NextResponse.json({ team, members: members || [] })
}

// PUT /api/teams/[id] — Update team name (owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { name } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  // RLS only allows owner to update
  const { data: team, error } = await db
    .from('teams')
    .update({ name: name.trim() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ team })
}

// DELETE /api/teams/[id] — Delete team (owner only, cascades everything)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS only allows owner to delete
  const { error } = await db
    .from('teams')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
