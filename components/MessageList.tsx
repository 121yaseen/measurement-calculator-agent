import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '@/lib/types'

interface Props {
  messages: Message[]
  streaming: boolean
}

export function MessageList({ messages, streaming }: Props) {
  return (
    <div
      style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
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
          style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}
        >
          {msg.role === 'assistant' && (
            <div style={{ marginRight: '10px', marginTop: '3px', flexShrink: 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', marginTop: '6px' }} />
            </div>
          )}

          <div
            style={{
              maxWidth: '78%',
              borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
              padding: '10px 14px',
              ...(msg.role === 'user'
                ? {
                    background: 'var(--surface-2)',
                    border: '1px solid var(--amber-border)',
                    color: 'var(--text)',
                  }
                : {
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }),
            }}
          >
            {msg.attachment?.type === 'image' && (
              <img
                src={msg.attachment.data}
                alt={msg.attachment.name}
                style={{ maxHeight: '200px', borderRadius: '6px', marginBottom: '8px', display: 'block', objectFit: 'contain' }}
              />
            )}
            {msg.attachment?.type === 'pdf' && (
              <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--amber)', fontSize: '11px' }}>
                <span>◫</span>
                <span>{msg.attachment.name}</span>
              </div>
            )}

            {msg.role === 'assistant' ? (
              <div className="prose prose-sm">{
                msg.content
                  ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  : <span style={{ color: 'var(--text-dim)' }}>_</span>
              }</div>
            ) : (
              <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{msg.content}</p>
            )}
          </div>
        </div>
      ))}

      {streaming && (
        <div className="msg-in" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '2px 12px 12px 12px' }}>
            <span className="dot" style={{ animationDelay: '0ms' }} />
            <span className="dot" style={{ animationDelay: '160ms' }} />
            <span className="dot" style={{ animationDelay: '320ms' }} />
          </div>
        </div>
      )}
    </div>
  )
}
