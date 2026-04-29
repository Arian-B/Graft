import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, createAdminClient, extractToken } from '@/lib/supabase'

// DELETE /api/teams/[id]/keys/[keyId] — revoke a specific API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; keyId: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminDb = createAdminClient()

  // Only owners and admins can revoke keys
  const { data: membership } = await adminDb
    .from('team_members')
    .select('role')
    .eq('team_id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Only team owners and admins can revoke API keys' }, { status: 403 })
  }

  // Verify key belongs to this team before deleting
  const { data: keyRecord } = await adminDb
    .from('team_api_keys')
    .select('id')
    .eq('id', params.keyId)
    .eq('team_id', params.id)
    .single()

  if (!keyRecord) return NextResponse.json({ error: 'Key not found' }, { status: 404 })

  const { error } = await adminDb
    .from('team_api_keys')
    .delete()
    .eq('id', params.keyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, message: 'API key revoked. The companion will disconnect on its next sync.' })
}
