import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, createAdminClient, extractToken } from '@/lib/supabase'
import type { UpdateScriptBody } from '@/lib/types'

// GET /api/scripts/[id] — Get script details with current version
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

  const { data: script, error } = await adminDb
    .from('scripts')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !script) return NextResponse.json({ error: 'Script not found' }, { status: 404 })

  // Verify access
  const { data: membership } = await adminDb
    .from('team_members')
    .select('id')
    .eq('team_id', script.team_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch current version
  let currentVersion = null
  if (script.current_version_id) {
    const { data: version } = await adminDb
      .from('script_versions')
      .select('*')
      .eq('id', script.current_version_id)
      .single()
    currentVersion = version
  }

  // Fetch version count
  const { count } = await adminDb
    .from('script_versions')
    .select('*', { count: 'exact', head: true })
    .eq('script_id', params.id)

  return NextResponse.json({
    script: {
      ...script,
      current_version: currentVersion,
      version_count: count ?? 0,
    }
  })
}

// PUT /api/scripts/[id] — Update script metadata (not code — use /deploy for that)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: UpdateScriptBody = await request.json().catch(() => ({})) as UpdateScriptBody

  const updates: Partial<UpdateScriptBody> = {}
  if (body.name !== undefined)         updates.name = body.name.trim()
  if (body.description !== undefined)  updates.description = body.description
  if (body.target_urls !== undefined)  updates.target_urls = body.target_urls
  if (body.is_active !== undefined)    updates.is_active = body.is_active
  if (body.remote_config !== undefined) updates.remote_config = body.remote_config

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const adminDb = createAdminClient()

  // Verify access before updates
  const { data: existing } = await adminDb
    .from('scripts')
    .select('team_id')
    .eq('id', params.id)
    .single()
  
  if (!existing) return NextResponse.json({ error: 'Script not found' }, { status: 404 })

  const { data: membership } = await adminDb
    .from('team_members')
    .select('id')
    .eq('team_id', existing.team_id)
    .eq('user_id', user.id)
    .single()
  
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: script, error } = await adminDb
    .from('scripts')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ script })
}

// DELETE /api/scripts/[id] — Delete a script and all its versions
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminDb = createAdminClient()

  // Verify ownership before delete
  const { data: existing } = await adminDb
    .from('scripts')
    .select('team_id, owner_id')
    .eq('id', params.id)
    .single()
  
  if (!existing) return NextResponse.json({ error: 'Script not found' }, { status: 404 })

  if (existing.owner_id !== user.id) {
     return NextResponse.json({ error: 'Only owner can delete' }, { status: 403 })
  }

  const { error } = await adminDb
    .from('scripts')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
