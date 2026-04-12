'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, apiFetch } from '@/lib/auth'

/**
 * /link-browser
 *
 * The Companion popup opens this page with ?companion_id=xxx in the URL.
 * The user is already logged into Graft in this browser, so we have their auth.
 * We call /api/companion/register to store the link: companion_id ↔ user_id.
 * After that, the developer can test scripts on their browser only.
 */
export default function LinkBrowserPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no_id'>('loading')
  const [username, setUsername] = useState('')

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/auth/login')
      return
    }

    const companionId = new URLSearchParams(window.location.search).get('companion_id')

    if (!companionId) {
      setStatus('no_id')
      return
    }

    apiFetch(`/api/companion/register?companion_id=${encodeURIComponent(companionId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setUsername(data.github_username || user.user_metadata?.user_name || '')
          setStatus('success')
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [user, loading])

  if (loading || status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 36, height: 36,
          border: '3px solid var(--border)', borderTopColor: 'var(--orange)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (status === 'no_id') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Missing companion ID</h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
            This page should be opened from the Graft Companion popup.
            Click "Link to Graft account" in the extension, not by visiting this URL directly.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Failed to link browser</h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24 }}>Something went wrong. Try again from the Companion popup.</p>
          <button className="btn btn-ghost" onClick={() => window.close()}>Close tab</button>
        </div>
      </div>
    )
  }

  // Success
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24,
      background: 'radial-gradient(ellipse at top, rgba(34,197,94,0.06) 0%, transparent 60%)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 440 }} className="fade-in">

        <div style={{
          width: 72, height: 72,
          background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, margin: '0 auto 24px',
        }}>
          ✓
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 10, color: '#4ade80' }}>
          Browser linked!
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 28 }}>
          <strong>@{username}</strong>, this browser is now registered for dev testing.
          When you mark a script as "testing" in Graft, <strong>only this browser</strong> will receive it.
          Your teammates see nothing until you approve and deploy.
        </p>

        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '16px 20px', textAlign: 'left', marginBottom: 24,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>What happens next:</p>
          {[
            'Write a script in the Graft editor',
            'Click "Test on my browser" (not Deploy)',
            'Navigate to the target URL in this browser',
            'See your script running — nobody else sees it',
            'When satisfied, click "Submit for review"',
            'Team owner approves → goes live to everyone',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '4px 0' }}>
              <span style={{
                background: 'var(--orange-glow)', color: 'var(--orange)',
                borderRadius: '50%', width: 20, height: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1,
              }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={() => window.close()}>Close tab</button>
          <a href="/dashboard" className="btn btn-primary">Go to dashboard →</a>
        </div>
      </div>
    </div>
  )
}
