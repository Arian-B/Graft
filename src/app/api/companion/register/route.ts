import { NextRequest, NextResponse } from 'next/server'
import { createUserClient, createAdminClient, extractToken } from '@/lib/supabase'

/**
 * GET /api/companion/register?companion_id=xxx
 *
 * Called from the /link-browser page (which the Companion popup opens).
 * The user is already logged into Graft in that browser tab, so we have
 * their auth token. We store the link: this companion_id belongs to this user.
 *
 * After this, the sync endpoint can return 'testing' scripts to this browser.
 */
export async function GET(request: NextRequest) {
  const token = extractToken(request)
  if (!token) {
    return NextResponse.redirect(
      new URL('/auth/login', request.url)
    )
  }

  const db = createUserClient(token)
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const companion_id = new URL(request.url).searchParams.get('companion_id')
  if (!companion_id || companion_id.length < 8) {
    return NextResponse.json({ error: 'Valid companion_id is required' }, { status: 400 })
  }

  const adminDb = createAdminClient()

  // Upsert: safe to call multiple times (re-linking same browser)
  const { error } = await adminDb
    .from('companion_registrations')
    .upsert(
      { user_id: user.id, companion_id },
      { onConflict: 'user_id,companion_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    github_username: user.user_metadata?.user_name,
    message: 'Browser linked. You can now test scripts on this browser before deploying to your team.',
  })
}

/**
 * DELETE /api/companion/register?companion_id=xxx
 * Unlink a browser from dev testing mode.
 */
export async function DELETE(request: NextRequest) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createUserClient(token)
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companion_id = new URL(request.url).searchParams.get('companion_id')
  if (!companion_id) return NextResponse.json({ error: 'companion_id required' }, { status: 400 })

  const adminDb = createAdminClient()
  await adminDb
    .from('companion_registrations')
    .delete()
    .eq('user_id', user.id)
    .eq('companion_id', companion_id)

  return NextResponse.json({ success: true })
}
