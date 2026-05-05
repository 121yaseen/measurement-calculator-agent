'use client'

export function CanvasPanel() {
  return (
    <div
      className="dot-grid relative flex flex-col"
      style={{
        height: '100%',
        overflow: 'hidden',
        borderLeft: '1px solid var(--border)',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Canvas
        </span>
        <div style={{ flex: 1 }} />
        {/* Status dot */}
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border-2)' }} />
      </div>

      {/* Empty state */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        {/* Crosshair */}
        <div style={{ position: 'relative', width: 44, height: 44, marginBottom: 8 }}>
          <div style={{
            position: 'absolute', top: '50%', left: 0, right: 0,
            height: 1, background: 'var(--border)', transform: 'translateY(-50%)',
          }} />
          <div style={{
            position: 'absolute', left: '50%', top: 0, bottom: 0,
            width: 1, background: 'var(--border)', transform: 'translateX(-50%)',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--amber-dim)',
            border: '1.5px solid var(--amber-border)',
            transform: 'translate(-50%, -50%)',
          }} />
        </div>

        <span style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          nothing here yet
        </span>
        <span style={{ color: 'var(--text-dim)', fontSize: '11px', maxWidth: '180px', lineHeight: 1.6 }}>
          rendered content will appear here
        </span>
      </div>
    </div>
  )
}
