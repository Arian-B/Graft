'use client'

import { useAuth } from '@/lib/auth'
import Navbar from '@/components/layout/Navbar'
import { motion, Variants } from 'framer-motion'
import Link from 'next/link'

export default function LandingPage() {
  const { user, signInWithGitHub } = useAuth()

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Global Nav ─────────────────────────────────────────────── */}
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <main style={{ flex: 1 }}>
        <motion.section 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          style={{
            maxWidth: 1100, margin: '0 auto', padding: '100px 24px 80px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          }}
        >

          {/* Landing Logo */}
          <motion.div variants={fadeUp} style={{ marginBottom: 32 }}>
            <img 
              src="/graft-landinglogo.png" 
              alt="Graft Logo" 
              style={{ width: '100%', maxWidth: 460, height: 'auto', objectFit: 'contain' }} 
            />
          </motion.div>

          {/* Eyebrow badge */}
          <motion.div variants={fadeUp} className="badge badge-primary" style={{ marginBottom: 24, fontSize: 12, padding: '5px 14px' }}>
            <span className="dot dot-pulse" />
            Private extension platform for dev teams
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={fadeUp} style={{
            fontSize: 'clamp(42px, 6vw, 72px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            marginBottom: 24,
            maxWidth: 740,
          }}>
            Deploy browser scripts{' '}
            <span style={{ color: 'var(--primary)' }}>
              to your whole team.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p variants={fadeUp} style={{
            fontSize: 18, color: 'var(--text-2)', lineHeight: 1.7,
            maxWidth: 560, marginBottom: 40,
          }}>
            Write a browser automation in Graft's editor. Hit deploy.
            Every teammate's browser gets it automatically within 30 seconds —
            no Chrome Web Store, no IT tickets, no zip files.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {user ? (
              <Link
                href="/dashboard"
                className="btn btn-primary btn-lg"
                style={{ padding: '13px 28px', fontSize: 15 }}
              >
                Build now →
              </Link>
            ) : (
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
            )}
            <a href="#how-it-works" className="btn btn-ghost btn-lg" style={{ padding: '13px 28px', fontSize: 15 }}>
              How it works ↓
            </a>
          </motion.div>

          {/* Social proof */}
          <motion.p variants={fadeUp} style={{ marginTop: 32, fontSize: 13, color: 'var(--text-muted)' }}>
            Works with GitHub, Jira, Notion, or any internal web tool
          </motion.p>
        </motion.section>

        {/* ── How It Works ─────────────────────────────────────── */}
        <section id="how-it-works" style={{
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          padding: '80px 24px',
        }}>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            style={{ maxWidth: 1100, margin: '0 auto' }}
          >
            <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 56 }}>
              <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>
                How Graft works
              </h2>
              <p style={{ fontSize: 16, color: 'var(--text-2)' }}>
                Three steps. No DevOps required.
              </p>
            </motion.div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24,
            }}>
              {[
                {
                  step: '01', 
                  icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
                  title: 'Write',
                  desc: 'Write your browser script in our Monaco-powered editor. Target specific URLs using Chrome match patterns.',
                  detail: '*://github.com/* or *://jira.company.com/*',
                },
                {
                  step: '02', 
                  icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
                  title: 'Deploy',
                  desc: 'Hit deploy. Graft versions and stores your code. No bundling, no build steps, no config files to write.',
                  detail: 'Every deploy creates an immutable version snapshot',
                },
                {
                  step: '03', 
                  icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>,
                  title: 'Propagate',
                  desc: 'Every teammate with the Graft Companion installed gets the update within 30 seconds. Automatically.',
                  detail: 'install companion once · updates forever after',
                },
              ].map(({ step, icon, title, desc, detail }) => (
                <motion.div key={step} variants={fadeUp} className="graft-card" style={{ padding: 28 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--primary)',
                    letterSpacing: '0.1em', marginBottom: 16,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    STEP {step}
                  </div>
                  <div style={{ color: 'var(--primary)', marginBottom: 16 }}>{icon}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 16 }}>{desc}</p>
                  <code style={{
                    fontSize: 11, color: 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono, monospace',
                    background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: 4,
                  }}>
                    {detail}
                  </code>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── Features ─────────────────────────────────────────── */}
        <section style={{ padding: '80px 24px' }}>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            style={{ maxWidth: 1100, margin: '0 auto' }}
          >
            <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 56 }}>
              <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>
                Everything your team needs
              </h2>
            </motion.div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
            }}>
              {[
                { 
                  icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>, 
                  title: 'Private by default', desc: 'Scripts are only pushed to browsers with your team\'s API key. Nothing public, nothing shared.' 
                },
                { 
                  icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"></path><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path><path d="M12 7v5l4 2"></path></svg>, 
                  title: 'Version control', desc: 'Every deploy is an immutable snapshot. Roll back to any previous version in one click.' 
                },
                { 
                  icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>, 
                  title: 'Remote config', desc: 'Update feature flags and settings without redeploying. Changes propagate in 30 seconds.' 
                },
                { 
                  icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>, 
                  title: 'Analytics', desc: 'See how often scripts fire, on which pages, and catch errors across the team\'s browsers.' 
                },
                { 
                  icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>, 
                  title: 'Team management', desc: 'Invite teammates, assign roles, and generate API keys for the Companion extension.' 
                },
                { 
                  icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>, 
                  title: 'Auto-sync', desc: 'The Companion polls silently in the background. Teammates never have to manually update.' 
                },
              ].map(({ icon, title, desc }) => (
                <motion.div key={title} variants={fadeUp} style={{
                  padding: '20px 22px',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  transition: 'border-color 0.2s, background 0.2s',
                }}>
                  <div style={{ color: 'var(--primary)', marginBottom: 12 }}>{icon}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────── */}
        <section style={{
          borderTop: '1px solid var(--border)',
          padding: '80px 24px',
          textAlign: 'center',
        }}>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            style={{ maxWidth: 560, margin: '0 auto' }}
          >
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}>
              Stop emailing zip files.
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-2)', marginBottom: 32, lineHeight: 1.6 }}>
              Give your team the browser environment they deserve.
              Set up in 5 minutes, free forever.
            </p>
            {user ? (
              <Link
                href="/dashboard"
                className="btn btn-primary btn-lg"
                style={{ padding: '14px 32px', fontSize: 16 }}
              >
                Build now →
              </Link>
            ) : (
              <button
                className="btn btn-primary btn-lg"
                onClick={signInWithGitHub}
                style={{ padding: '14px 32px', fontSize: 16 }}
              >
                Start deploying for free →
              </button>
            )}
          </motion.div>
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
