import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, createAdminClient, extractToken } from '@/lib/supabase'

/**
 * POST /api/teams/[id]/invite
 * Invite someone by their GitHub username.
 *
 * Case A — user already in Graft: add to team_members directly.
 * Case B — user not in Graft yet: store a pending invite in team_invites.
 *          When they first log in, /api/me auto-accepts it.
 *
 * Body: { github_username: string, role?: "admin" | "member" }
 *
 * GET /api/teams/[id]/invite
 * List pending invites for this team.
 *
 * DELETE /api/teams/[id]/invite?username=github_username
 * Cancel a pending invite.
 */

// ── Helper: check caller is owner or admin ────────────────────────────────────
async function requireAdminRole(db: any, teamId: string, userId: string) {
  const { data } = await db
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single()
  return data?.role === 'owner' || data?.role === 'admin'
}

// ── GET — list pending invites ────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = await requireAdminRole(db, params.id, user.id)
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: invites, error } = await db
    .from('team_invites')
    .select('id, github_username, role, created_at')
    .eq('team_id', params.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invites: invites || [] })
}

// ── POST — invite by GitHub username ─────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db       = createUserClient(token)
  const adminDb  = createAdminClient()

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = await requireAdminRole(db, params.id, user.id)
  if (!isAdmin) return NextResponse.json({ error: 'Only team admins and owners can invite members' }, { status: 403 })

  const body = await request.json()
  const github_username: string = (body.github_username || '').trim().replace(/^@/, '')
  const role: string = body.role || 'member'

  if (!github_username) {
    return NextResponse.json({ error: 'github_username is required' }, { status: 400 })
  }
  if (!['admin', 'member'].includes(role)) {
    return NextResponse.json({ error: 'role must be admin or member' }, { status: 400 })
  }

  // Don't invite yourself
  if (user.user_metadata?.user_name?.toLowerCase() === github_username.toLowerCase()) {
    return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 })
  }

  // ── Always store pending invite for the inbox model ─────────────
  const adminDb = createAdminClient()
  
  // Check if already a member
  // (We need to check team_members but wait, we only have github_username, not user.id
  // but if they try to invite someone, it goes to team_invites. If the user is already in team_members, 
  // maybe we don't know easily without searching auth.users first. Let's do a quick lookup)
  const { data: existingUsers } = await adminDb.auth.admin.listUsers()
  const match = existingUsers?.users?.find(
    (u: any) => u.user_metadata?.user_name?.toLowerCase() === github_username.toLowerCase()
  )

  if (match) {
    const { data: existing } = await db
      .from('team_members')
      .select('id')
      .eq('team_id', params.id)
      .eq('user_id', match.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: `@${github_username} is already a member of this team` }, { status: 409 })
    }
  }

  const { error: inviteError } = await adminDb
    .from('team_invites')
    .upsert(
      { team_id: params.id, github_username: github_username.toLowerCase(), role, invited_by: user.id },
      { onConflict: 'team_id,github_username' }
    )

  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 })

  return NextResponse.json({
    status: 'pending',
    message: match 
       ? `Invite sent! @${github_username} will see it in their Graft inbox.`
       : `@${github_username} hasn't signed up yet. They will receive the invite when they login.`,
    role,
  })
}

// ── DELETE — cancel a pending invite ─────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = await requireAdminRole(db, params.id, user.id)
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const username = new URL(request.url).searchParams.get('username')
  if (!username) return NextResponse.json({ error: 'username query param required' }, { status: 400 })

  const adminDb = createAdminClient()
  const { error } = await adminDb
    .from('team_invites')
    .delete()
    .eq('team_id', params.id)
    .eq('github_username', username.toLowerCase())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
