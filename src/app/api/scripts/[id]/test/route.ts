import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, createAdminClient, extractToken } from '@/lib/supabase'

/**
 * POST /api/scripts/[id]/test
 *
 * Saves code and marks the script as 'testing'.
 * The script will ONLY be delivered to the author's linked browser companion.
 * Nobody else on the team sees it.
 *
 * Body: { code: string }
 * Auth: must be the script owner
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

  // Fetch script and verify ownership
  const { data: script, error: scriptError } = await adminDb
    .from('scripts')
    .select('id, owner_id, team_id, current_version_id, status')
    .eq('id', params.id)
    .single()

  if (scriptError || !script) {
    return NextResponse.json({ error: 'Script not found' }, { status: 404 })
  }

  if (script.owner_id !== user.id) {
    return NextResponse.json(
      { error: 'Only the script owner can start a test deployment' },
      { status: 403 }
    )
  }

  // (Removed block preventing testing of live scripts so users can iterate)

  const body = await request.json()
  const code: string = (body.code || '').trim()
  if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 })

  // Check if developer has a registered browser
  const { data: registration } = await adminDb
    .from('companion_registrations')
    .select('companion_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!registration) {
    return NextResponse.json({
      error: 'No browser linked for testing. Open your Companion popup and click "Link to Graft account" first.',
      code: 'NO_BROWSER_LINKED',
    }, { status: 400 })
  }

  // Get next version number
  const { data: versions } = await adminDb
    .from('script_versions')
    .select('version_number')
    .eq('script_id', params.id)
    .order('version_number', { ascending: false })
    .limit(1)

  const nextVersion = ((versions?.[0]?.version_number) ?? 0) + 1

  // Create the test version
  const { data: newVersion, error: versionError } = await adminDb
    .from('script_versions')
    .insert({
      script_id:      params.id,
      version_number: nextVersion,
      code,
      deployed_by:    user.id,
    })
    .select('id, version_number')
    .single()

  if (versionError || !newVersion) {
    return NextResponse.json({ error: 'Failed to save test version' }, { status: 500 })
  }

  // Set status to 'testing' and point to new version
  const { error: updateError } = await adminDb
    .from('scripts')
    .update({
      status:             'testing',
      current_version_id: newVersion.id,
    })
    .eq('id', params.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({
    success:  true,
    message:  `Test v${nextVersion} is live on your browser. Navigate to a target URL to see it. Nobody else sees this.`,
    version:  newVersion.version_number,
    tip:      'Make changes and click "Test again" to update. Your browser gets the update in 30 seconds.',
  })
}
