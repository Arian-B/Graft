import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, extractToken } from '@/lib/supabase'
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

  const { data: script, error } = await db
    .from('scripts')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !script) return NextResponse.json({ error: 'Script not found' }, { status: 404 })

  // Fetch current version
  let currentVersion = null
  if (script.current_version_id) {
    const { data: version } = await db
      .from('script_versions')
      .select('*')
      .eq('id', script.current_version_id)
      .single()
    currentVersion = version
  }

  // Fetch version count
  const { count } = await db
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

  const { data: script, error } = await db
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

  // RLS handles owner/admin check
  const { error } = await db
    .from('scripts')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
