'use client'

export function CanvasPanel() {
  return (
    <div
      className="dot-grid relative flex flex-col"
      style={{
        background: 'var(--bg)',
        borderLeft: '1px solid var(--border)',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--surface)',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Canvas
        </span>
        <div style={{ flex: 1 }} />
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
          gap: '10px',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        {/* Amber crosshair */}
        <div style={{ position: 'relative', width: 40, height: 40, marginBottom: 8 }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'var(--border-2)', transform: 'translateY(-50%)' }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border-2)', transform: 'translateX(-50%)' }} />
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: 8, height: 8,
            borderRadius: '50%',
            background: 'var(--amber-dim)',
            border: '1px solid var(--amber-border)',
            transform: 'translate(-50%, -50%)',
          }} />
        </div>

        <span style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          nothing here yet
        </span>
        <span style={{ color: 'var(--text-dim)', fontSize: '11px', maxWidth: '160px', lineHeight: 1.5 }}>
          rendered content will appear here
        </span>
      </div>
    </div>
  )
}
