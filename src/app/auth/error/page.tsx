'use client'

import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'

export default function AuthErrorPage() {
  const params = useSearchParams()
  const message = params.get('message') || 'Something went wrong during authentication.'
  const router = useRouter()

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>⚠️</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Authentication failed</h1>
        <p style={{
          fontSize: 14, color: 'var(--text-2)', marginBottom: 24, lineHeight: 1.6,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '12px 16px',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {decodeURIComponent(message)}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => router.push('/auth/login')}>Try again</button>
          <button className="btn btn-ghost" onClick={() => router.push('/')}>Go home</button>
        </div>
      </div>
    </div>
  )
}
