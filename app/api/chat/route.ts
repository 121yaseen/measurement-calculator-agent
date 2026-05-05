import { SYSTEM_PROMPT } from '@/lib/systemPrompt'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json()

  // Prepend system prompt; if one is already present (e.g. from a future multi-agent setup), keep it
  const messages = Array.isArray(body.messages) ? body.messages : []
  const hasSystemMessage = messages.length > 0 && messages[0].role === 'system'

  const messagesWithSystem = hasSystemMessage
    ? messages
    : [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]

  const upstream = await fetch(
    `${process.env.OPENCLAW_BASE_URL}/v1/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENCLAW_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, messages: messagesWithSystem }),
    },
  )

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
