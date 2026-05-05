export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json()

  const upstream = await fetch(
    `${process.env.OPENCLAW_BASE_URL}/v1/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENCLAW_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
