'use client'

import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { signInWithGitHub, loading } = useAuth()
  const router = useRouter()

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      background: 'radial-gradient(ellipse at top, rgba(249,115,22,0.05) 0%, transparent 60%)',
    }}>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>

        {/* Logo */}
        <div style={{
          width: 52, height: 52,
          background: 'linear-gradient(135deg, var(--orange), var(--orange-dark))',
          borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 22, color: 'white',
          margin: '0 auto 24px',
          boxShadow: '0 8px 32px var(--orange-glow)',
        }}>
          G
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
          Sign in to Graft
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 32, lineHeight: 1.6 }}>
          Your private browser extension platform.<br/>
          Sign in to start deploying to your team.
        </p>

        <div className="graft-card" style={{ padding: 24 }}>
          <button
            className="btn btn-primary"
            onClick={signInWithGitHub}
            disabled={loading}
            style={{ width: '100%', padding: '11px 20px', fontSize: 15, justifyContent: 'center' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16, lineHeight: 1.5 }}>
            By signing in, you agree to our terms of service.
            We only request your GitHub username and email.
          </p>
        </div>

        <button
          onClick={() => router.push('/')}
          style={{ marginTop: 20, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}
        >
          ← Back to home
        </button>
      </div>
    </div>
  )
}
