# OpenClaw Chat — Design Spec
_Date: 2026-05-06_

## Overview

A local Next.js web chat interface for the OpenClaw personal AI gateway. Runs alongside the already-running `openclaw-gateway` on the same machine. Single user, no auth UI, no deployment for now.

## Context

- OpenClaw gateway: `http://localhost:18789`
- OpenAI-compatible endpoint: `POST http://localhost:18789/v1/chat/completions`
- Auth: Bearer token (stored in `.env.local`, never in browser JS)
- Model: `openclaw` (routes to configured agent — currently `openai-codex/gpt-5.5`)
- The `/v1/chat/completions` endpoint was enabled via `openclaw config set gateway.http.endpoints.chatCompletions.enabled true`

## Architecture

**Stack:** Next.js App Router, TypeScript, Tailwind CSS

**CORS solution:** Next.js Middleware (`middleware.ts`) intercepts requests to `/v1/:path*`, injects `Authorization: Bearer <token>` from the server-side env var `OPENCLAW_TOKEN`, and rewrites to `http://localhost:18789/v1/:path*`. Browser calls its own origin — no CORS issue, token never in client JS.

**No API routes, no AI SDK.** The chat page is a client component that calls `/v1/chat/completions` with native `fetch` and reads the SSE stream via `ReadableStream`.

## Components

### `app/page.tsx` — Chat page (client component)
- Owns message state: `Message[]` with `role`, `content`, and optional `attachments`
- Handles file selection, streaming fetch, and render

### `components/MessageList.tsx`
- Renders the conversation history
- User messages: right-aligned bubble
- Assistant messages: left-aligned bubble with `react-markdown` + `remark-gfm` for markdown

### `components/InputBar.tsx`
- Text input + file attach button + send button
- Accepts `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp` files
- Shows attached file name/thumbnail before sending

### `lib/pdfExtract.ts`
- Client-side PDF text extraction using `pdfjs-dist`
- Returns plain string: `[PDF: filename.pdf]\n<extracted text>`

### `lib/streamChat.ts`
- Wraps the `fetch` + SSE parsing into an async generator
- Yields string chunks as they arrive from the `text/event-stream` response

## Data Flow

```
User types + optionally attaches file
  → InputBar calls onSend(text, file?)
    → file? → image: toBase64DataURL | pdf: pdfExtract()
    → build OpenAI messages array (user content as array of text + image_url parts, or text with PDF content prepended)
    → fetch POST /v1/chat/completions with stream: true
    → ReadableStream → SSE chunks → append to assistant message in state
    → react-markdown renders final content
```

## Message Format

**Image attachment:**
```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "user message" },
    { "type": "image_url", "image_url": { "url": "data:image/png;base64,..." } }
  ]
}
```

**PDF attachment:**
```json
{
  "role": "user",
  "content": "[PDF: report.pdf]\n<extracted text>\n\nuser message"
}
```

## File Handling

| Type | Client processing | Sent as |
|------|-------------------|---------|
| Images (png/jpg/webp) | `FileReader.readAsDataURL` → base64 | `image_url` content part |
| PDF | `pdfjs-dist` text extraction | Prepended plain text in message |

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `next` | Framework |
| `react-markdown` | Markdown rendering in assistant bubbles |
| `remark-gfm` | Tables, strikethrough etc. in markdown |
| `pdfjs-dist` | Client-side PDF text extraction |
| `tailwindcss` | Styling |

## Out of Scope

- Multi-session / conversation persistence
- Deployment / making openclaw publicly accessible
- Auth UI / login flow
- Voice, canvas, or other openclaw features
- File types beyond images and PDF
