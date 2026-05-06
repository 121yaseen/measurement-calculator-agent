import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

// Both containers mount the uploads named volume here.
// This path is inside the openclaw workspace, which is on openclaw's allowed-reads list.
const UPLOADS_DIR = '/openclaw-state/workspace/uploads'

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

  // The path is the same in both the nextjs and openclaw containers
  return Response.json({ agentPath: filepath, originalName: file.name })
}
