import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, createAdminClient, extractToken } from '@/lib/supabase'
import { generateApiKey, hashApiKey, getKeyPrefix } from '@/lib/api-key'

// GET /api/teams/[id]/keys — list API keys for a team
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminDb = createAdminClient()

  // Verify user is a member of this team
  const { data: membership } = await adminDb
    .from('team_members')
    .select('role')
    .eq('team_id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: keys, error } = await adminDb
    .from('team_api_keys')
    .select('id, key_prefix, created_at, last_used_at')
    .eq('team_id', params.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ keys: keys || [] })
}

// POST /api/teams/[id]/keys — generate a new API key (returns full key ONCE)
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

  // Only owners and admins can generate keys
  const { data: membership } = await adminDb
    .from('team_members')
    .select('role')
    .eq('team_id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Only team owners and admins can generate API keys' }, { status: 403 })
  }

  const fullKey  = generateApiKey()
  const keyHash  = hashApiKey(fullKey)
  const prefix   = getKeyPrefix(fullKey) // first 16 chars, safe to display

  // Insert only the columns that definitely exist
  const { data: keyRecord, error } = await adminDb
    .from('team_api_keys')
    .insert({
      team_id:    params.id,
      key_hash:   keyHash,
      key_prefix: prefix,
    })
    .select('id, key_prefix, created_at, last_used_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return the full key ONCE — never stored, cannot be recovered
  return NextResponse.json({
    key:    fullKey,
    prefix, // for immediate display in the modal
    record: { ...keyRecord, key_prefix: prefix },
    warning: 'Copy this key now. It will never be shown again.',
  }, { status: 201 })
}
