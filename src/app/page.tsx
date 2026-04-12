export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#f4f4f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        gap: '16px',
        textAlign: 'center',
        padding: '32px',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          fontWeight: 800,
          color: 'white',
          marginBottom: 8,
        }}
      >
        G
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>
        Graft
      </h1>

      <p style={{ fontSize: 16, color: '#71717a', maxWidth: 480, lineHeight: 1.6 }}>
        Private browser extension deployment for dev teams.
        Write a script. Hit deploy. Your whole team has it — instantly.
      </p>

      <div
        style={{
          marginTop: 16,
          display: 'flex',
          gap: 8,
          background: '#111111',
          border: '1px solid #1f1f1f',
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: 12,
          color: '#52525b',
          fontFamily: 'monospace',
        }}
      >
        🚧 &nbsp; Backend complete — Frontend coming next
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          'POST /api/scripts',
          'POST /api/scripts/[id]/deploy',
          'GET  /api/companion/sync',
          'POST /api/analytics',
          'GET  /api/scripts/[id]/versions',
          'POST /api/scripts/[id]/rollback',
        ].map(route => (
          <span
            key={route}
            style={{
              background: '#111',
              border: '1px solid #1f1f1f',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 11,
              fontFamily: 'monospace',
              color: '#a1a1aa',
            }}
          >
            {route}
          </span>
        ))}
      </div>
    </main>
  )
}
