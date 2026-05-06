'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageList } from '@/components/MessageList'
import { InputBar } from '@/components/InputBar'
import { CanvasPanel } from '@/components/CanvasPanel'
import { streamChat } from '@/lib/streamChat'
import type { Attachment, Message } from '@/lib/types'

type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }

function buildOpenAIContent(text: string, attachment?: Attachment): string | ContentPart[] {
  if (!attachment) return text

  if (attachment.type === 'image') {
    const parts: ContentPart[] = [{ type: 'image_url', image_url: { url: attachment.data } }]
    if (text) parts.push({ type: 'text', text })
    return parts
  }

  if (attachment.type === 'pdf') {
    // If the raw file was saved to the shared volume, give the agent the path so it can
    // use its PDF tool to access the full vector data (lines, arcs, dimensions).
    // The extracted text is included as supplementary context only.
    const pathNote = attachment.agentPath
      ? `The original PDF is available at: ${attachment.agentPath}\nPlease use your PDF tool to read it directly for precise geometric analysis.`
      : ''
    const parts = [pathNote, attachment.data, text].filter(Boolean).join('\n\n')
    return parts.trim()
  }

  return text
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
      setMessages((prev) => [...prev, userMsg])
      setStreaming(true)

      // assistantId is null until the first chunk arrives — avoids an empty bubble
      // appearing alongside the streaming dots
      let assistantId: string | null = null

      try {
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.role === 'user' ? buildOpenAIContent(m.content, m.attachment) : m.content,
        }))

        for await (const chunk of streamChat(history)) {
          if (assistantId === null) {
            assistantId = crypto.randomUUID()
            setMessages((prev) => [...prev, { id: assistantId!, role: 'assistant', content: chunk }])
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
            )
          }
        }
      } catch (err) {
        const errText = `error: ${err instanceof Error ? err.message : String(err)}`
        if (assistantId === null) {
          setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: errText }])
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: errText } : m)),
          )
        }
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
