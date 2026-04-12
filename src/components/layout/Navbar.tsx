'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const { user, loading, signInWithGitHub, signOut } = useAuth()
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <nav style={{
      borderBottom: '1px solid var(--border)',
      background: 'rgba(10,10,10,0.8)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 32,
      }}>
        {/* Logo */}
        <Link href={user ? '/dashboard' : '/'} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 28, height: 28,
            background: 'linear-gradient(135deg, var(--orange), var(--orange-dark))',
            borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14, color: 'white',
          }}>
            G
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Graft
          </span>
        </Link>

        {/* Nav links (authenticated only) */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
            {[
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/team',      label: 'Team' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: isActive(href) ? 'var(--text)' : 'var(--text-2)',
                  textDecoration: 'none',
                  padding: '5px 10px',
                  borderRadius: 6,
                  background: isActive(href) ? 'var(--bg-elevated)' : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {loading ? (
            <div className="skeleton" style={{ width: 80, height: 32 }} />
          ) : user ? (
            <>
              <Link
                href="/profile"
                style={{
                  fontSize: 13, color: 'var(--text-2)',
                  display: 'flex', alignItems: 'center', gap: 8,
                  textDecoration: 'none',
                  padding: '3px 6px', borderRadius: 6,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {user.user_metadata?.avatar_url && (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt=""
                    style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border)' }}
                  />
                )}
                {user.user_metadata?.user_name || user.email}
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={signInWithGitHub}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Sign in with GitHub
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
