import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, createAdminClient, extractToken } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const githubUsername = user.user_metadata?.user_name?.toLowerCase()

  // ── Auto-accept any pending invites for this GitHub username ─────────────
  if (githubUsername) {
    const adminDb = createAdminClient()

    const { data: pending } = await adminDb
      .from('team_invites')
      .select('team_id, role')
      .eq('github_username', githubUsername)

    if (pending && pending.length > 0) {
      // Insert into team_members for each pending invite
      await adminDb.from('team_members').insert(
        pending.map((inv: any) => ({
          team_id: inv.team_id,
          user_id: user.id,
          role:    inv.role,
        }))
      )
      // Delete the accepted invites
      await adminDb
        .from('team_invites')
        .delete()
        .eq('github_username', githubUsername)
    }
  }

  // ── Fetch all team memberships ────────────────────────────────────────────
  const { data: memberships, error } = await db
    .from('team_members')
    .select('role, joined_at, teams(*)')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const teams = (memberships || []).map((m: any) => ({
    ...m.teams,
    role:      m.role,
    joined_at: m.joined_at,
  }))

  return NextResponse.json({
    user: {
      id:              user.id,
      email:           user.email,
      name:            user.user_metadata?.full_name || user.user_metadata?.user_name,
      avatar_url:      user.user_metadata?.avatar_url,
      github_username: user.user_metadata?.user_name,
      created_at:      user.created_at,
    },
    teams,
  })
}

/**
 * GET /api/me
 *
 * Returns the currently authenticated user's profile.
 * Includes: Supabase user object + all teams they belong to + role in each.
 *
 * This is the "bootstrap" call — the frontend calls this once on load
 * to hydrate all session state.
 */
export async function GET(request: NextRequest) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch all team memberships with team details in one query
  const { data: memberships, error } = await db
    .from('team_members')
    .select('role, joined_at, teams(*)')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const teams = (memberships || []).map((m: any) => ({
    ...m.teams,
    role: m.role,
    joined_at: m.joined_at,
  }))

  return NextResponse.json({
    user: {
      id:         user.id,
      email:      user.email,
      name:       user.user_metadata?.full_name || user.user_metadata?.user_name,
      avatar_url: user.user_metadata?.avatar_url,
      github_username: user.user_metadata?.user_name,
      created_at: user.created_at,
    },
    teams,
  })
}
