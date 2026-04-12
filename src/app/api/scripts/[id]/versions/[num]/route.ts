import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, extractToken } from '@/lib/supabase'

/**
 * GET /api/scripts/[id]/versions/[num]
 *
 * Returns the full code for a specific version number.
 * The versions list endpoint deliberately excludes code for performance.
 * Use this to preview or diff a specific historical version.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; num: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const versionNumber = parseInt(params.num, 10)
  if (isNaN(versionNumber) || versionNumber < 1) {
    return NextResponse.json({ error: 'Invalid version number' }, { status: 400 })
  }

  // RLS: user must be a team member of the script's team
  const { data: version, error } = await db
    .from('script_versions')
    .select('id, version_number, code, deployed_by, deployed_at, script_id')
    .eq('script_id', params.id)
    .eq('version_number', versionNumber)
    .single()

  if (error || !version) {
    return NextResponse.json(
      { error: `Version ${versionNumber} not found for this script` },
      { status: 404 }
    )
  }

  // Check if this is the currently deployed version
  const { data: script } = await db
    .from('scripts')
    .select('current_version_id')
    .eq('id', params.id)
    .single()

  return NextResponse.json({
    version: {
      ...version,
      is_current: script?.current_version_id === version.id,
    },
  })
}
