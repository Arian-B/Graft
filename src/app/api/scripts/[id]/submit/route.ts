import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, createAdminClient, extractToken } from '@/lib/supabase'

/**
 * POST /api/scripts/[id]/submit
 * Script owner submits their tested script for admin/owner review.
 * Status: testing → pending_review
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
  const { data: script } = await adminDb
    .from('scripts')
    .select('id, owner_id, status, name')
    .eq('id', params.id)
    .single()

  if (!script) return NextResponse.json({ error: 'Script not found' }, { status: 404 })
  if (script.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!['draft', 'testing', 'rejected'].includes(script.status)) {
    return NextResponse.json(
      { error: `Cannot submit a script with status '${script.status}'` },
      { status: 400 }
    )
  }

  const { error } = await adminDb
    .from('scripts')
    .update({ status: 'pending_review', rejection_reason: null })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    message: `"${script.name}" is now pending review. A team admin or owner will approve it.`,
  })
}
