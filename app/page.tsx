'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageList } from '@/components/MessageList'
import { InputBar } from '@/components/InputBar'
import { CanvasPanel } from '@/components/CanvasPanel'
import { streamChat } from '@/lib/streamChat'
import type { Attachment, Message } from '@/lib/types'

function buildOpenAIContent(
  text: string,
  attachment?: Attachment,
): string | { type: string; text?: string; image_url?: { url: string } }[] {
  if (!attachment) return text

  if (attachment.type === 'image') {
    const parts: { type: string; text?: string; image_url?: { url: string } }[] = [
      { type: 'image_url', image_url: { url: attachment.data } },
    ]
    if (text) parts.push({ type: 'text', text })
    return parts
  }

  return `${attachment.data}\n\n${text}`.trim()
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const handleSend = useCallback(
    async (text: string, attachment?: Attachment) => {
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        attachment,
      }
      const assistantId = crypto.randomUUID()
      const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '' }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setStreaming(true)

      try {
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.role === 'user' ? buildOpenAIContent(m.content, m.attachment) : m.content,
        }))

        for await (const chunk of streamChat(history)) {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
          )
        }
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `error: ${err instanceof Error ? err.message : String(err)}` }
              : m,
          ),
        )
      } finally {
        setStreaming(false)
      }
    },
    [messages],
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', height: '100%', overflow: 'hidden' }}>
      {/* ── Left: Chat ── */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}>
          <span style={{ color: 'var(--amber)', fontSize: '8px' }}>●</span>
          <span style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 500, letterSpacing: '0.02em' }}>
            openclaw
          </span>
          <span style={{ color: 'var(--border-2)', fontSize: '11px' }}>/</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
            engineering drawing agent
          </span>
          <div style={{ flex: 1 }} />
        </header>

        {/* Messages */}
        <MessageList messages={messages} streaming={streaming} />
        <div ref={bottomRef} />

        {/* Input */}
        <InputBar onSend={handleSend} disabled={streaming} />
      </div>

      {/* ── Right: Canvas ── */}
      <CanvasPanel />
    </div>
  )
}
