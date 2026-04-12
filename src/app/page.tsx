'use client'

import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function LandingPage() {
  const { user, loading, signInWithGitHub } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,10,10,0.8)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 24px',
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28,
              background: 'linear-gradient(135deg, var(--orange), var(--orange-dark))',
              borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 14, color: 'white',
            }}>G</div>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>Graft</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={signInWithGitHub}>
            Sign in with GitHub →
          </button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <main style={{ flex: 1 }}>
        <section style={{
          maxWidth: 1100, margin: '0 auto', padding: '100px 24px 80px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        }}>

          {/* Eyebrow badge */}
          <div className="badge badge-orange" style={{ marginBottom: 24, fontSize: 12, padding: '5px 14px' }}>
            <span className="dot dot-pulse" />
            Private extension platform for dev teams
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(42px, 6vw, 72px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            marginBottom: 24,
            maxWidth: 740,
          }}>
            Deploy browser scripts{' '}
            <span style={{
              background: 'linear-gradient(90deg, var(--orange), #fb923c)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              to your whole team.
            </span>
          </h1>

          {/* Subheadline */}
          <p style={{
            fontSize: 18, color: 'var(--text-2)', lineHeight: 1.7,
            maxWidth: 560, marginBottom: 40,
          }}>
            Write a browser automation in Graft's editor. Hit deploy.
            Every teammate's browser gets it automatically within 30 seconds —
            no Chrome Web Store, no IT tickets, no zip files.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={signInWithGitHub}
              style={{ padding: '13px 28px', fontSize: 15 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Get started free
            </button>
            <a href="#how-it-works" className="btn btn-ghost btn-lg" style={{ padding: '13px 28px', fontSize: 15 }}>
              How it works ↓
            </a>
          </div>

          {/* Social proof */}
          <p style={{ marginTop: 32, fontSize: 13, color: 'var(--text-muted)' }}>
            Works with GitHub, Jira, Notion, or any internal web tool
          </p>
        </section>

        {/* ── How It Works ─────────────────────────────────────── */}
        <section id="how-it-works" style={{
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          padding: '80px 24px',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>
                How Graft works
              </h2>
              <p style={{ fontSize: 16, color: 'var(--text-2)' }}>
                Three steps. No DevOps required.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24,
            }}>
              {[
                {
                  step: '01', icon: '✏️',
                  title: 'Write',
                  desc: 'Write your browser script in our Monaco-powered editor. Target specific URLs using Chrome match patterns.',
                  detail: '*://github.com/* or *://jira.company.com/*',
                },
                {
                  step: '02', icon: '🚀',
                  title: 'Deploy',
                  desc: 'Hit deploy. Graft versions and stores your code. No bundling, no build steps, no config files to write.',
                  detail: 'Every deploy creates an immutable version snapshot',
                },
                {
                  step: '03', icon: '⚡',
                  title: 'Propagate',
                  desc: 'Every teammate with the Graft Companion installed gets the update within 30 seconds. Automatically.',
                  detail: 'install companion once · updates forever after',
                },
              ].map(({ step, icon, title, desc, detail }) => (
                <div key={step} className="graft-card" style={{ padding: 28 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--orange)',
                    letterSpacing: '0.1em', marginBottom: 16,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    STEP {step}
                  </div>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 16 }}>{desc}</p>
                  <code style={{
                    fontSize: 11, color: 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono, monospace',
                    background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: 4,
                  }}>
                    {detail}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────── */}
        <section style={{ padding: '80px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>
                Everything your team needs
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
            }}>
              {[
                { icon: '🔐', title: 'Private by default', desc: 'Scripts are only pushed to browsers with your team\'s API key. Nothing public, nothing shared.' },
                { icon: '📝', title: 'Version control', desc: 'Every deploy is an immutable snapshot. Roll back to any previous version in one click.' },
                { icon: '⚙️', title: 'Remote config', desc: 'Update feature flags and settings without redeploying. Changes propagate in 30 seconds.' },
                { icon: '📊', title: 'Analytics', desc: 'See how often scripts fire, on which pages, and catch errors across the team\'s browsers.' },
                { icon: '👥', title: 'Team management', desc: 'Invite teammates, assign roles, and generate API keys for the Companion extension.' },
                { icon: '🔄', title: 'Auto-sync', desc: 'The Companion polls silently in the background. Teammates never have to manually update.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{
                  padding: '20px 22px',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  transition: 'border-color 0.2s, background 0.2s',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────── */}
        <section style={{
          borderTop: '1px solid var(--border)',
          padding: '80px 24px',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}>
              Stop emailing zip files.
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-2)', marginBottom: 32, lineHeight: 1.6 }}>
              Give your team the browser environment they deserve.
              Set up in 5 minutes, free forever.
            </p>
            <button
              className="btn btn-primary btn-lg"
              onClick={signInWithGitHub}
              style={{ padding: '14px 32px', fontSize: 16 }}
            >
              Start deploying for free →
            </button>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, color: 'var(--text-muted)',
      }}>
        Built with Graft · For developers, by developers
      </footer>
    </div>
  )
}
