'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageList } from '@/components/MessageList'
import { InputBar } from '@/components/InputBar'
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

  // PDF: prepend extracted text to the user message
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
      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setStreaming(true)

      try {
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content:
            m.role === 'user'
              ? buildOpenAIContent(m.content, m.attachment)
              : m.content,
        }))

        for await (const chunk of streamChat(history)) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m,
            ),
          )
        }
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err instanceof Error ? err.message : String(err)}` }
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
    <div className="flex h-full flex-col">
      <header className="border-b border-gray-200 px-4 py-3">
        <h1 className="text-base font-semibold">OpenClaw Chat</h1>
      </header>
      <MessageList messages={messages} streaming={streaming} />
      <div ref={bottomRef} />
      <InputBar onSend={handleSend} disabled={streaming} />
    </div>
  )
}
