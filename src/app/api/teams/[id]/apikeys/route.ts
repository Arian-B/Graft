import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, extractToken } from '@/lib/supabase'
import { generateApiKey, hashApiKey, getKeyPrefix } from '@/lib/api-key'
import type { CreateApiKeyBody } from '@/lib/types'

// GET /api/teams/[id]/apikeys — List API keys for a team (no full keys, prefix only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS: only owners/admins can see keys
  const { data: keys, error } = await db
    .from('team_api_keys')
    .select('id, key_prefix, label, created_at, last_used_at')
    .eq('team_id', params.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ keys: keys || [] })
}

// POST /api/teams/[id]/apikeys — Generate a new API key
// The full key is returned ONCE in the response. It is never stored.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: CreateApiKeyBody = await request.json().catch(() => ({})) as CreateApiKeyBody
  const label = body.label?.trim() || 'Default Key'

  const fullKey = generateApiKey()
  const keyHash = hashApiKey(fullKey)
  const keyPrefix = getKeyPrefix(fullKey)

  const { data: keyRecord, error } = await db
    .from('team_api_keys')
    .insert({
      team_id: params.id,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      label,
      created_by: user.id,
    })
    .select('id, key_prefix, label, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return the FULL key in the response — this is the only time it's accessible
  return NextResponse.json({
    id: keyRecord.id,
    key: fullKey,        // ← Show this to the user ONCE
    key_prefix: keyRecord.key_prefix,
    label: keyRecord.label,
    created_at: keyRecord.created_at,
  }, { status: 201 })
}

// DELETE /api/teams/[id]/apikeys — Revoke an API key by id
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
  const keyId = searchParams.get('key_id')

  if (!keyId) {
    return NextResponse.json({ error: 'key_id query param is required' }, { status: 400 })
  }

  const { error } = await db
    .from('team_api_keys')
    .delete()
    .eq('id', keyId)
    .eq('team_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, message: 'API key revoked' })
}
