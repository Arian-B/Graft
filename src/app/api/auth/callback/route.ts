import { NextRequest, NextResponse } from 'next/server'
import { createUserClient } from '@/lib/supabase'

/**
 * GET /api/auth/callback
 *
 * Handles the OAuth redirect from Supabase Auth (GitHub OAuth).
 * Supabase sends the user back here after authentication.
 * We exchange the code for a session and redirect to the dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?message=missing_code`)
  }

  const db = createUserClient()

  const { error } = await db.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[Graft Auth] OAuth callback error:', error.message)
    return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
