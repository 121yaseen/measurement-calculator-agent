# OpenClaw Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Next.js chat interface that streams responses from the OpenClaw AI gateway with support for image and PDF file uploads.

**Architecture:** The browser calls `/api/chat` on its own origin; a Next.js API route injects the `Authorization` header and streams the response from `http://localhost:18789/v1/chat/completions`. PDF text is extracted client-side via `pdfjs-dist`; images are base64-encoded client-side. No AI SDK — raw `fetch` + SSE parsing.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, `react-markdown`, `remark-gfm`, `pdfjs-dist`

---

## Task 1: Scaffold the project and install dependencies

**Files:**
- Create: all scaffold files in `/Users/muhammedyaseen/Development/openclaw-chat/`

- [ ] **Step 1: Run create-next-app into the existing directory**

```bash
cd /Users/muhammedyaseen/Development/openclaw-chat
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --yes
```

Expected: Next.js project scaffolded. A few files created: `package.json`, `next.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`.

- [ ] **Step 2: Install runtime dependencies**

```bash
cd /Users/muhammedyaseen/Development/openclaw-chat
npm install react-markdown remark-gfm pdfjs-dist
```

Expected: packages added to `node_modules` and `package.json`.

- [ ] **Step 3: Verify dev server starts**

```bash
cd /Users/muhammedyaseen/Development/openclaw-chat
npm run dev
```

Expected: `▲ Next.js` ready on `http://localhost:3000`. Ctrl+C to stop.

- [ ] **Step 4: Commit scaffold**

```bash
cd /Users/muhammedyaseen/Development/openclaw-chat
git init
git add .
git commit -m "chore: scaffold Next.js project with dependencies"
```

---

## Task 2: Environment config and proxy API route

**Files:**
- Create: `.env.local`
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: Create `.env.local`**

```
OPENCLAW_TOKEN=ac7b2d94487bbab318ee693973f099cd900c45967f74b02a
OPENCLAW_BASE_URL=http://localhost:18789
```

Do NOT commit this file (`.gitignore` already excludes `.env*.local`).

- [ ] **Step 2: Create `app/api/chat/route.ts`**

```ts
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
```

- [ ] **Step 3: Verify the proxy with curl**

Start `npm run dev` in one terminal, then in another:

```bash
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"openclaw","messages":[{"role":"user","content":"say hi briefly"}],"max_tokens":30}' | head -5
```

Expected: JSON response with `choices[0].message.content` containing a short greeting.

- [ ] **Step 4: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: add openclaw proxy API route"
```

---

## Task 3: Shared types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create `lib/types.ts`**

```ts
export type AttachmentType = 'image' | 'pdf'

export interface Attachment {
  type: AttachmentType
  name: string
  /** base64 data URL for images; extracted plain text for PDFs */
  data: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachment?: Attachment
}

/** Shape of one chunk from the OpenAI SSE stream */
export interface ChatChunk {
  choices: { delta: { content?: string }; finish_reason: string | null }[]
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared types"
```

---

## Task 4: PDF text extraction utility

**Files:**
- Create: `lib/pdfExtract.ts`

- [ ] **Step 1: Create `lib/pdfExtract.ts`**

```ts
import * as pdfjs from 'pdfjs-dist'

// Use CDN worker to avoid webpack bundling issues with the binary worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`

export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const pageTexts: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pageTexts.push(text)
  }

  return `[PDF: ${file.name}]\n${pageTexts.join('\n\n')}`
}
```

- [ ] **Step 2: Manual smoke test**

Start dev server, open browser console at `http://localhost:3000`, paste:

```js
const { extractPdfText } = await import('/lib/pdfExtract.ts') // won't work directly; just confirm no build error
```

Instead, build to check for type errors:

```bash
npm run build 2>&1 | grep -E "error|Error"
```

Expected: no TypeScript errors referencing `pdfExtract.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/pdfExtract.ts
git commit -m "feat: add client-side PDF text extraction"
```

---

## Task 5: SSE stream parser

**Files:**
- Create: `lib/streamChat.ts`

- [ ] **Step 1: Create `lib/streamChat.ts`**

```ts
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
```

- [ ] **Step 2: Verify no type errors**

```bash
cd /Users/muhammedyaseen/Development/openclaw-chat
npx tsc --noEmit 2>&1 | grep -E "error TS"
```

Expected: no output (zero errors).

- [ ] **Step 3: Commit**

```bash
git add lib/streamChat.ts
git commit -m "feat: add SSE stream parser for openclaw chat"
```

---

## Task 6: InputBar component

**Files:**
- Create: `components/InputBar.tsx`

- [ ] **Step 1: Create `components/InputBar.tsx`**

```tsx
'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import type { Attachment } from '@/lib/types'
import { extractPdfText } from '@/lib/pdfExtract'

interface Props {
  onSend: (text: string, attachment?: Attachment) => void
  disabled: boolean
}

export function InputBar({ onSend, disabled }: Props) {
  const [text, setText] = useState('')
  const [attachment, setAttachment] = useState<Attachment | undefined>()
  const [loadingFile, setLoadingFile] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setLoadingFile(true)
    try {
      if (file.type === 'application/pdf') {
        const data = await extractPdfText(file)
        setAttachment({ type: 'pdf', name: file.name, data })
      } else {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        setAttachment({ type: 'image', name: file.name, data })
      }
    } finally {
      setLoadingFile(false)
    }
  }

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed && !attachment) return
    onSend(trimmed, attachment)
    setText('')
    setAttachment(undefined)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {attachment && (
        <div className="mb-2 flex items-center gap-2 rounded bg-gray-100 px-3 py-1 text-sm text-gray-700">
          <span>{attachment.type === 'pdf' ? '📄' : '🖼️'} {attachment.name}</span>
          <button
            className="ml-auto text-gray-400 hover:text-gray-600"
            onClick={() => setAttachment(undefined)}
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="Message OpenClaw… (Shift+Enter for newline)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
        />
        <div className="flex flex-col gap-2">
          <button
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || loadingFile}
            title="Attach file"
          >
            {loadingFile ? '…' : '📎'}
          </button>
          <button
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSend}
            disabled={disabled || loadingFile || (!text.trim() && !attachment)}
          >
            Send
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify no type errors**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/InputBar.tsx
git commit -m "feat: add InputBar component with file attach"
```

---

## Task 7: MessageList component

**Files:**
- Create: `components/MessageList.tsx`

- [ ] **Step 1: Create `components/MessageList.tsx`**

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '@/lib/types'

interface Props {
  messages: Message[]
  streaming: boolean
}

export function MessageList({ messages, streaming }: Props) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            {msg.attachment?.type === 'image' && (
              <img
                src={msg.attachment.data}
                alt={msg.attachment.name}
                className="mb-2 max-h-48 rounded-lg object-contain"
              />
            )}
            {msg.attachment?.type === 'pdf' && (
              <div className="mb-2 text-xs opacity-70">📄 {msg.attachment.name}</div>
            )}
            {msg.role === 'assistant' ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className="prose prose-sm max-w-none"
              >
                {msg.content}
              </ReactMarkdown>
            ) : (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            )}
          </div>
        </div>
      ))}
      {streaming && (
        <div className="flex justify-start">
          <div className="rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-400">
            ●●●
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify no type errors**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/MessageList.tsx
git commit -m "feat: add MessageList component with markdown rendering"
```

---

## Task 8: Chat page

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Replace `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body {
  height: 100%;
}
```

- [ ] **Step 2: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OpenClaw Chat',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-white text-gray-900 antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Replace `app/page.tsx`**

```tsx
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
```

- [ ] **Step 4: Verify type check passes**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/layout.tsx app/globals.css
git commit -m "feat: add chat page with streaming and file upload"
```

---

## Task 9: End-to-end smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:3000`. Confirm the chat UI renders with header, empty message area, and input bar.

- [ ] **Step 2: Test text chat**

Type "What is 2 + 2?" and press Enter. Confirm:
- User bubble appears on the right
- A `●●●` loading indicator appears
- Assistant response streams in on the left with the answer

- [ ] **Step 3: Test image upload**

Click the 📎 button and attach any `.png` or `.jpg` file. Type "Describe this image." and send. Confirm:
- The image thumbnail appears in the input bar before sending
- User bubble shows the image above the message text
- Assistant response describes the image

- [ ] **Step 4: Test PDF upload**

Click 📎 and attach a PDF file. Type "Summarize this." and send. Confirm:
- `📄 filename.pdf` tag appears in the user bubble
- Assistant response summarizes the PDF content

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: verified end-to-end smoke test"
```
