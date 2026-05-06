import { createReadStream, existsSync } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'

export const runtime = 'nodejs'

const UPLOADS_DIR = '/openclaw-state/workspace/uploads'

export async function GET(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params

  // Prevent path traversal
  if (filename.includes('/') || filename.includes('..')) {
    return new Response('Not found', { status: 404 })
  }

  const filepath = join(UPLOADS_DIR, filename)

  if (!existsSync(filepath)) {
    return new Response('Not found', { status: 404 })
  }

  const stream = createReadStream(filepath)
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  })
}
