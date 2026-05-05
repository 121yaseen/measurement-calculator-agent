import type { ChatChunk } from './types'

/**
 * Calls /api/chat with the given messages and yields text chunks as they stream.
 * Accepts the OpenAI messages array format directly.
 */
export async function* streamChat(
  messages: { role: string; content: string | object[] }[],
): AsyncGenerator<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'openclaw', messages, stream: true }),
  })

  if (!res.ok || !res.body) {
    throw new Error(`Request failed: ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') return
      try {
        const chunk: ChatChunk = JSON.parse(payload)
        const text = chunk.choices[0]?.delta?.content
        if (text) yield text
      } catch {
        // malformed chunk — skip
      }
    }
  }
}
