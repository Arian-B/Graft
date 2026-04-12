import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, extractToken } from '@/lib/supabase'
import type { RollbackBody } from '@/lib/types'

// POST /api/scripts/[id]/rollback — Roll back to a previous version
// Sets current_version_id to an older version WITHOUT creating a new version row.
// The code that was at that version becomes what the Companion picks up next sync.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)

  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: RollbackBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { version_number } = body
  if (!version_number || typeof version_number !== 'number') {
    return NextResponse.json({ error: 'version_number is required' }, { status: 400 })
  }

  // Find the specific version
  const { data: targetVersion, error: versionError } = await db
    .from('script_versions')
    .select('id, version_number')
    .eq('script_id', params.id)
    .eq('version_number', version_number)
    .single()

  if (versionError || !targetVersion) {
    return NextResponse.json(
      { error: `Version ${version_number} not found for this script` },
      { status: 404 }
    )
  }

  // Update the pointer — no new version row created
  const { error: updateError } = await db
    .from('scripts')
    .update({ current_version_id: targetVersion.id })
    .eq('id', params.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    active_version: version_number,
    message: `Rolled back to v${version_number}. Companion extensions will sync within 30 seconds.`,
  })
}
