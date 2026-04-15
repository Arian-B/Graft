import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, createAdminClient, extractToken } from '@/lib/supabase'

// GET /api/scripts/[id]/versions — Get full version history for a script
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

  // Get the current version ID to mark which is live
  const { data: script } = await adminDb
    .from('scripts')
    .select('current_version_id')
    .eq('id', params.id)
    .single()

  const { data: versions, error } = await adminDb
    .from('script_versions')
    .select('id, version_number, deployed_by, deployed_at')  // code excluded for performance
    .eq('script_id', params.id)
    .order('version_number', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enriched = (versions || []).map(v => ({
    ...v,
    is_current: v.id === script?.current_version_id,
  }))

  return NextResponse.json({ versions: enriched })
}
