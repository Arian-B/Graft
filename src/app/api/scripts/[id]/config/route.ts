import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, createAdminClient, extractToken } from '@/lib/supabase'
import type { UpdateConfigBody } from '@/lib/types'

// GET /api/scripts/[id]/config — Get the remote config for a script
// This is also what the Companion checks to apply live config changes
// without requiring a full redeploy.
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
    .select('id, remote_config, updated_at')
    .eq('id', params.id)
    .single()

  if (error || !script) return NextResponse.json({ error: 'Script not found' }, { status: 404 })

  return NextResponse.json({ config: script.remote_config, updated_at: script.updated_at })
}

// PUT /api/scripts/[id]/config — Update the remote config for a script
// Changes take effect on the next Companion sync (within 30 seconds).
// No new version is created — config is separate from code.
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: UpdateConfigBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.config || typeof body.config !== 'object' || Array.isArray(body.config)) {
    return NextResponse.json({ error: 'config must be a JSON object' }, { status: 400 })
  }

  const adminDb = createAdminClient()

  // Verify access or ownership before update via adminDb
  const { data: scriptCheck } = await adminDb
    .from('scripts')
    .select('team_id')
    .eq('id', params.id)
    .single()
  
  if (scriptCheck) {
     const { data: membership } = await adminDb
       .from('team_members')
       .select('id')
       .eq('team_id', scriptCheck.team_id)
       .eq('user_id', user.id)
       .single()
     if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: script, error } = await adminDb
    .from('scripts')
    .update({ remote_config: body.config })
    .eq('id', params.id)
    .select('id, remote_config, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    config: script.remote_config,
    updated_at: script.updated_at,
    message: 'Config updated. Changes will propagate to all Companions within 30 seconds.',
  })
}
