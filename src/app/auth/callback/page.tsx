'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/auth'
import { AlertTriangle } from 'lucide-react'

/**
 * /auth/callback — Client-side OAuth callback handler
 *
 * Supabase redirect auth flows (like signInWithOAuth) typically bring the
 * user back to this URL. The Supabase client automatically looks at the URL
 * hash/query parms, extracts the auth token, and persists the session.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    // Check if we already have a session, if yes, redirect to dashboard.
    // If there's an error in the URL (e.g., ?error=access_denied), we show it.
    const supabase = getSupabaseBrowser()

    // Parms can be in hash or query
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const searchParams = new URLSearchParams(window.location.search)

    const urlError = hashParams.get('error_description') || searchParams.get('error_description')
      || hashParams.get('error') || searchParams.get('error')

    if (urlError) {
      setErrorMsg(decodeURIComponent(urlError.replace(/\+/g, ' ')))
      return
    }

    // Try picking up the session
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setErrorMsg(error.message)
      } else if (data.session) {
        // Successfully logged in via link
        router.replace('/dashboard')
      } else {
        // No session found, and no explicit error. Give the client a sec
        // to process URL fragements just in case onAuthStateChange picks it up.
        // Or if nothing happens, we send them back to login.
        const hash = window.location.hash
        if (!hash || !hash.includes('access_token')) {
          router.replace('/auth/login')
        }
      }
    })

    // Listen for auth state change which triggers when token is parsed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.replace('/dashboard')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  if (errorMsg) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <AlertTriangle size={48} color="var(--red)" strokeWidth={1.5} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Authentication failed</h1>
          <p style={{
            fontSize: 13, color: 'var(--text-2)', background: 'var(--bg-surface)',
            border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px',
            fontFamily: 'JetBrains Mono, monospace', maxWidth: 400, textAlign: 'center',
          }}>
            {errorMsg}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => router.push('/')}>
          Back to home
        </button>
      </div>
    )
  }

  // Loading state while auth token is parsing from URL
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24,
    }}>
      <div className="spinner" style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid var(--border)', borderTopColor: 'var(--primary)',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 500 }}>
        Authenticating...
      </p>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
