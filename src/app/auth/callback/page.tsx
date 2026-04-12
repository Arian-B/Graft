'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/auth'

/**
 * /auth/callback — Client-side OAuth callback handler
 *
 * Supabase redirects here after GitHub OAuth completes.
 * The browser client exchanges the code for a session and stores it
 * in localStorage automatically. Then we redirect to the dashboard.
 *
 * This MUST be client-side. If the session exchange happens server-side,
 * the browser never receives the session and the user appears logged out.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const supabase = getSupabaseBrowser()

    // Supabase puts the auth code in the URL as ?code=xxx
    const code = new URLSearchParams(window.location.search).get('code')
    const error = new URLSearchParams(window.location.search).get('error')
    const errorDescription = new URLSearchParams(window.location.search).get('error_description')

    if (error) {
      setErrorMsg(errorDescription || error)
      setStatus('error')
      return
    }

    if (!code) {
      // No code in URL — might be an implicit flow redirect with hash
      // Supabase browser client auto-handles this
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          router.replace('/dashboard')
        } else {
          setErrorMsg('No auth code or session found in callback URL.')
          setStatus('error')
        }
      })
      return
    }

    // Exchange code for session — browser client stores it in localStorage
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.error('[Graft Auth] Code exchange failed:', error.message)
        setErrorMsg(error.message)
        setStatus('error')
        return
      }
      // Session is now stored; redirect to dashboard
      router.replace('/dashboard')
    })
  }, [router])

  if (status === 'error') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24,
      }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Authentication failed</h1>
        <p style={{
          fontSize: 13, color: 'var(--text-2)', background: 'var(--bg-surface)',
          border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px',
          fontFamily: 'JetBrains Mono, monospace', maxWidth: 400, textAlign: 'center',
        }}>
          {errorMsg}
        </p>
        <button className="btn btn-primary" onClick={() => router.push('/')}>
          Back to home
        </button>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid var(--border)',
        borderTopColor: 'var(--orange)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Completing sign in...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
