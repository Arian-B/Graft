import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, createAdminClient, extractToken } from '@/lib/supabase'

/**
 * GET /api/me
 *
 * Returns the currently authenticated user's profile.
 * Includes: Supabase user object + all teams they belong to + role in each + pending inbox invites.
 */
export async function GET(request: NextRequest) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const githubUsername = user.user_metadata?.user_name?.toLowerCase()

  let pendingInvites = []
  const adminDb = createAdminClient()
  if (githubUsername) {
    const { data: pending } = await adminDb
      .from('team_invites')
      .select('id, team_id, role, created_at, invited_by, teams(name)')
      .eq('github_username', githubUsername)
    
    if (pending) {
      pendingInvites = pending
    }
  }

  // Fetch all team memberships with team details in one query using adminDb
  const { data: memberships, error } = await adminDb
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
    invites: pendingInvites,
  })
}
