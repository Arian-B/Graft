import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, createAdminClient, extractToken } from '@/lib/supabase'
import type { CreateTeamBody } from '@/lib/types'

// GET /api/teams — List all teams the authenticated user belongs to
export async function GET(request: NextRequest) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminDb = createAdminClient()
  const { data: memberships, error } = await adminDb
    .from('team_members')
    .select('role, teams(*)')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const teams = (memberships || []).map((m: any) => ({
    ...m.teams,
    role: m.role,
  }))

  return NextResponse.json({ teams })
}

// POST /api/teams — Create a new team
export async function POST(request: NextRequest) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: CreateTeamBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, slug } = body
  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: 'slug must be lowercase alphanumeric with hyphens only' },
      { status: 400 }
    )
  }

  // Create the team using admin client to completely bypass RLS policy checks
  const adminDb = createAdminClient()
  const { data: team, error: teamError } = await adminDb
    .from('teams')
    .insert({ name: name.trim(), slug: slug.trim(), owner_id: user.id })
    .select()
    .single()

  if (teamError) {
    if (teamError.code === '23505') {
      return NextResponse.json({ error: 'Team slug already taken' }, { status: 409 })
    }
    return NextResponse.json({ error: teamError.message }, { status: 500 })
  }

  // Auto-add creator as owner in team_members already using admin client
  const { error: memberError } = await adminDb
    .from('team_members')
    .insert({ team_id: team.id, user_id: user.id, role: 'owner' })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  return NextResponse.json({ team }, { status: 201 })
}
