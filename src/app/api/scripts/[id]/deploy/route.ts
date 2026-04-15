import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, createAdminClient, extractToken } from '@/lib/supabase'
import type { DeployScriptBody } from '@/lib/types'

// POST /api/scripts/[id]/deploy — Deploy a new version of a script
// This is the core action. Every deploy creates an immutable version snapshot.
// The Companion extension will receive the new code on its next sync poll.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: DeployScriptBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { code } = body
  if (!code?.trim()) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
  }

  const adminDb = createAdminClient()

  // Verify the script exists and user has access
  const { data: script, error: scriptError } = await adminDb
    .from('scripts')
    .select('id, current_version_id, team_id')
    .eq('id', params.id)
    .single()

  if (scriptError || !script) {
    return NextResponse.json({ error: 'Script not found' }, { status: 404 })
  }

  // Manual membership check to bypass RLS recursion
  const { data: membership } = await adminDb
    .from('team_members')
    .select('role')
    .eq('team_id', script.team_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get the current max version number
  const { data: maxVersionRow } = await adminDb
    .from('script_versions')
    .select('version_number')
    .eq('script_id', params.id)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = (maxVersionRow?.version_number ?? 0) + 1

  // Create the new version (append-only, immutable)
  const { data: version, error: versionError } = await adminDb
    .from('script_versions')
    .insert({
      script_id: params.id,
      version_number: nextVersion,
      code: code.trim(),
      deployed_by: user.id,
    })
    .select()
    .single()

  if (versionError) {
    return NextResponse.json({ error: versionError.message }, { status: 500 })
  }

  // Point the script at the new version
  const { error: updateError } = await adminDb
    .from('scripts')
    .update({ current_version_id: version.id, status: 'live' })
    .eq('id', params.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    version,
    message: `Deployed as v${nextVersion}. Companion extensions will sync within 30 seconds.`,
  }, { status: 201 })
}
