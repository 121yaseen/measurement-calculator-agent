import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

const UPLOADS_DIR = '/openclaw-state/workspace/uploads'

// Docker-internal base URL — openclaw container reaches Next.js at this address.
// Set AGENT_FILE_BASE_URL in docker-compose to override (e.g. http://nextjs:3000).
const AGENT_FILE_BASE_URL = process.env.AGENT_FILE_BASE_URL ?? 'http://localhost:3000'

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return Response.json({ error: 'Only PDF files are accepted' }, { status: 400 })
  }

  await mkdir(UPLOADS_DIR, { recursive: true })

  const filename = `${randomUUID()}.pdf`
  const filepath = join(UPLOADS_DIR, filename)

  await writeFile(filepath, Buffer.from(await file.arrayBuffer()))

  // HTTP URL: accessible by the openclaw container via Docker-internal DNS.
  // The browser tool and PDF tool both support http:// URLs.
  const agentUrl = `${AGENT_FILE_BASE_URL}/api/files/${filename}`

  return Response.json({ agentUrl, agentPath: filepath, originalName: file.name })
}
