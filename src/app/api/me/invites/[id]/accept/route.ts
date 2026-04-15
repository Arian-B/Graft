import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, createAdminClient, extractToken } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)
  const adminDb = createAdminClient()

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find the exact invite in team_invites 
  const { data: invite, error: findError } = await adminDb
    .from('team_invites')
    .select('*')
    .eq('id', params.id)
    .single()

  if (findError || !invite) {
    return NextResponse.json({ error: 'Invite not found or already accepted' }, { status: 404 })
  }

  // Double check it belongs to the logged in user
  const githubUsername = user.user_metadata?.user_name?.toLowerCase()
  if (invite.github_username !== githubUsername) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Insert into team_members
  const { error: insertError } = await adminDb
    .from('team_members')
    .insert({
      team_id: invite.team_id,
      user_id: user.id,
      role: invite.role,
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Clean up the invite
  await adminDb.from('team_invites').delete().eq('id', params.id)

  return NextResponse.json({ success: true, message: 'Invite accepted!' })
}
