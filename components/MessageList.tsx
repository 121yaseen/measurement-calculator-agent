import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '@/lib/types'

interface Props {
  messages: Message[]
  streaming: boolean
}

function PdfFileCard({ name }: { name: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 10px',
      borderRadius: '8px',
      background: 'rgba(255,255,255,0.6)',
      border: '1px solid var(--border)',
      marginBottom: '8px',
    }}>
      {/* PDF icon badge */}
      <div style={{
        width: 36, height: 36, borderRadius: '6px',
        background: '#fee2e2',
        border: '1px solid #fecaca',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '12px', fontWeight: 500,
          color: 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
          PDF Document
        </div>
      </div>
      <div style={{
        fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em',
        color: '#dc2626', background: '#fee2e2',
        padding: '2px 6px', borderRadius: '4px', flexShrink: 0,
      }}>
        PDF
      </div>
    </div>
  )
}

function ImageCard({ src, name }: { src: string; name: string }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <img
        src={src}
        alt={name}
        style={{
          maxHeight: '200px', maxWidth: '100%',
          borderRadius: '8px', display: 'block',
          objectFit: 'contain',
          border: '1px solid var(--border)',
        }}
      />
      <div style={{
        marginTop: '5px', fontSize: '11px', color: 'var(--text-muted)',
        display: 'flex', alignItems: 'center', gap: '5px',
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        {name}
      </div>
    </div>
  )
}

export function MessageList({ messages, streaming }: Props) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {messages.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
            <div style={{ fontSize: '22px', marginBottom: '10px', opacity: 0.5 }}>◈</div>
            <div style={{ fontSize: '12px', letterSpacing: '0.1em' }}>start a conversation</div>
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className="msg-in"
          style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
        >
          {msg.role === 'assistant' && (
            <div style={{ marginRight: '10px', flexShrink: 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', marginTop: '14px' }} />
            </div>
          )}

          <div style={{
            maxWidth: '78%',
            borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
            padding: '10px 14px',
            ...(msg.role === 'user'
              ? { background: 'var(--surface-2)', border: '1px solid var(--amber-border)', color: 'var(--text)' }
              : { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }),
          }}>

            {/* File attachment display */}
            {msg.attachment?.type === 'image' && (
              <ImageCard src={msg.attachment.data} name={msg.attachment.name} />
            )}
            {msg.attachment?.type === 'pdf' && (
              <PdfFileCard name={msg.attachment.name} />
            )}

            {/* Message text */}
            {msg.role === 'assistant' ? (
              <div className="prose prose-sm">
                {msg.content
                  ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  : <span style={{ color: 'var(--text-dim)' }}>_</span>
                }
              </div>
            ) : (
              msg.content && (
                <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{msg.content}</p>
              )
            )}
          </div>
        </div>
      ))}

      {streaming && (
        <div className="msg-in" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }} />
          <div style={{
            display: 'flex', gap: '5px', alignItems: 'center',
            padding: '10px 14px', border: '1px solid var(--border)',
            borderRadius: '2px 12px 12px 12px',
          }}>
            <span className="dot" style={{ animationDelay: '0ms' }} />
            <span className="dot" style={{ animationDelay: '160ms' }} />
            <span className="dot" style={{ animationDelay: '320ms' }} />
          </div>
        </div>
      )}
    </div>
  )
}
