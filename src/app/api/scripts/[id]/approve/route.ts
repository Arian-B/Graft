import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, createAdminClient, extractToken } from '@/lib/supabase'

/**
 * POST /api/scripts/[id]/approve
 * Admin or owner approves a script — status: pending_review → live
 * The script will appear in the Companion sync for ALL team members on next poll.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminDb = createAdminClient()

  // Fetch script to get team_id
  const { data: script } = await adminDb
    .from('scripts')
    .select('id, name, team_id, status')
    .eq('id', params.id)
    .single()

  if (!script) return NextResponse.json({ error: 'Script not found' }, { status: 404 })

  if (script.status !== 'pending_review') {
    return NextResponse.json(
      { error: `Script must be in 'pending_review' to approve. Current status: '${script.status}'` },
      { status: 400 }
    )
  }

  // Verify caller is admin or owner of the team
  const { data: membership } = await adminDb
    .from('team_members')
    .select('role')
    .eq('team_id', script.team_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json(
      { error: 'Only team admins and owners can approve scripts' },
      { status: 403 }
    )
  }

  const { error } = await adminDb
    .from('scripts')
    .update({
      status:           'live',
      rejection_reason: null,
      reviewed_by:      user.id,
      reviewed_at:      new Date().toISOString(),
    })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    message: `"${script.name}" is now LIVE. All team Companions will receive it within 30 seconds.`,
  })
}
