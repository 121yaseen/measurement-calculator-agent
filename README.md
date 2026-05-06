# openclaw-chat — Engineering Drawing Area & Perimeter Calculator

A chat interface that lets engineers upload PDF or image engineering drawings and get precise, step-by-step area and perimeter calculations from an AI agent. The AI works interactively — it asks clarifying questions before calculating, shows its reasoning, and validates results with the user at each step.

---

## What it does

- Upload a PDF or image of an engineering drawing via the chat input
- The AI agent (powered by openclaw + OpenAI) analyses the drawing, extracts dimensions, identifies the target profile, and calculates area and perimeter with full working shown
- The agent follows a structured 9-step workflow: intake → shape detection → unit extraction → dimension table → geometry decomposition → calculation → cross-check → validation checkpoints → final result
- Supports PDFs (vector or raster), PNGs, JPGs, WEBPs, and TIFFs
- Light-themed two-panel layout: chat on the left (40 %), canvas placeholder on the right (60 %)

---

## Architecture

```
Browser
  │  HTTPS
  ▼
Next.js app (port 3000)
  ├── /api/chat      – proxies chat messages to the openclaw gateway
  ├── /api/upload    – saves uploaded PDFs to the shared volume
  └── /api/files/[filename] – serves uploaded files over HTTP to the agent
        │
        │ Docker-internal HTTP (http://nextjs:3000)
        ▼
openclaw gateway (port 18789, token-authenticated)
  └── AI agent – uses the PDF tool to fetch and render uploaded files
        │
        │ OpenAI API
        ▼
      gpt-4.1 (or configured model)
```

**Key design decisions:**

- **Shared Docker volume** — both containers mount the same `uploads` volume at `/openclaw-state/workspace/uploads`. The Next.js app writes uploaded files there; the openclaw agent reads them via its `pdf` tool using an HTTP URL served by the Next.js app. No base64 encoding or in-memory transfer needed.
- **Token auth** — all requests from the Next.js backend to the openclaw gateway are authenticated with a shared `OPENCLAW_TOKEN`. The token is never exposed to the browser.
- **System prompt injected server-side** — the engineering-drawing agent instructions are added in `POST /api/chat` before forwarding to the gateway, so they cannot be overridden or inspected from the client.
- **Path traversal protection** — `/api/files/[filename]` rejects any filename containing `/` or `..`.

---

## Prerequisites

- Docker and Docker Compose (v2)
- An OpenAI API key (used by the openclaw agent for `gpt-4.1` completions)

No local Node.js install is needed to run the production stack.

---

## Setup

### 1. Clone and configure environment

```bash
git clone <repo-url>
cd openclaw-chat
cp .env.example .env
```

Edit `.env` and fill in both values:

```env
# Shared auth token — generate with: openssl rand -hex 24
OPENCLAW_TOKEN=your-random-secret-here

# OpenAI key from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...
```

### 2. Start the stack

```bash
docker compose up --build
```

This builds two images:
- **`openclaw`** — the openclaw gateway (runs the AI agent, exposes port 18789 internally)
- **`nextjs`** — the Next.js frontend (exposed on port 3000)

First boot takes a few minutes while npm packages are installed. Subsequent starts are much faster because Docker layer caching and named volumes persist state.

### 3. Open the app

```
http://localhost:3000
```

Upload a PDF or image and start chatting with the agent.

---

## Local development (without Docker)

Requires Node.js ≥ 22.12 and a locally running openclaw gateway.

```bash
npm install
```

Set up your environment variables:

```bash
cp .env.example .env.local
# Edit .env.local — set OPENCLAW_BASE_URL to your local gateway address
```

Start the dev server:

```bash
npm run dev
```

> **Note:** PDF uploads in local dev write to `/openclaw-state/workspace/uploads` on the host. Create that directory or change `UPLOADS_DIR` in `app/api/upload/route.ts` if you want a different path.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENCLAW_TOKEN` | Yes | Shared secret between Next.js and the openclaw gateway. Generate with `openssl rand -hex 24`. |
| `OPENAI_API_KEY` | Yes | OpenAI API key. Used by the openclaw agent for AI completions. |
| `OPENCLAW_BASE_URL` | Docker only | Internal URL of the openclaw gateway. Set to `http://openclaw:18789` in `docker-compose.yml`. |
| `AGENT_FILE_BASE_URL` | Docker only | Base URL used to build the HTTP file reference passed to the agent. Set to `http://nextjs:3000` in `docker-compose.yml`. |

---

## Project structure

```
openclaw-chat/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # Proxy to openclaw gateway; injects system prompt
│   │   ├── upload/route.ts        # Saves uploaded PDFs to the shared volume
│   │   └── files/[filename]/      # Serves uploaded files to the agent over HTTP
│   ├── globals.css                # CSS variables and global styles
│   ├── layout.tsx
│   └── page.tsx                   # Main chat page (40/60 split layout)
├── components/
│   ├── CanvasPanel.tsx            # Right-hand canvas placeholder
│   ├── InputBar.tsx               # Chat input with file attachment
│   └── MessageList.tsx            # Renders chat messages with Markdown support
├── lib/
│   ├── pdfExtract.ts              # Client-side PDF text extraction (preview only)
│   ├── streamChat.ts              # SSE stream reader for chat responses
│   ├── systemPrompt.ts            # Engineering drawing agent system prompt
│   └── types.ts                   # Shared TypeScript types
├── public/
│   └── pdf.worker.min.mjs         # pdf.js worker (served locally, no CDN needed)
├── Dockerfile                     # Multi-stage Next.js production image
├── Dockerfile.openclaw            # openclaw gateway image
├── docker-compose.yml             # Orchestrates both containers + shared volumes
├── docker-entrypoint.sh           # First-boot config writer for the openclaw container
├── next.config.ts                 # Next.js config (standalone output)
└── .env.example                   # Environment variable template
```

---

## How the file upload flow works

1. User picks a PDF in the browser
2. `InputBar` POSTs the raw file to `/api/upload`
3. `/api/upload` saves it to `/openclaw-state/workspace/uploads/<uuid>.pdf` on the shared volume and returns an HTTP URL (`http://nextjs:3000/api/files/<uuid>.pdf`)
4. The client also extracts lightweight text via `pdfExtract.ts` (pdf.js) for the chat preview bubble
5. When the user sends the message, the HTTP URL is included in the user message content
6. The agent calls its `pdf` tool with that URL, which fetches and renders the file page by page as images for visual analysis

---

## Security notes

- `.env` and `.env.local` are in `.gitignore` and have never been committed
- The openclaw gateway is not exposed to the host network — it only listens on the Docker-internal bridge
- All gateway requests require the `OPENCLAW_TOKEN` bearer token, which only the Next.js backend holds
- File serving (`/api/files/`) validates filenames to prevent path traversal
- The `AGENT_FILE_BASE_URL` is a Docker-internal address (`http://nextjs:3000`) — it is not reachable from outside the Docker network
- Uploaded files are stored under `/openclaw-state/workspace/uploads/` with UUID filenames

---

## Limitations

- The canvas panel (right side) is a placeholder — it currently shows an empty state. Rendered drawing overlays are not yet implemented.
- The agent model is hardcoded to `openai/gpt-5.5` in the first-boot config. To change it, edit `docker-entrypoint.sh` before the first `docker compose up`.
- Uploaded files are not deleted automatically. Volume storage grows over time.
- File uploads are PDF-only via the UI. Image files (PNG, JPG, WEBP) can be attached and are sent as base64 data URLs rather than server-side uploads.

---

## Future plans

### What's already in place

The project ships as a fully self-contained Docker stack. A single `docker compose up --build` starts both the openclaw AI gateway and the Next.js web UI with no host dependencies beyond Docker. The two containers share a named volume for uploaded files, communicate over a Docker-internal network, and the gateway is protected by a token that only the backend holds. The stack is production-ready in the sense that it can be deployed on any host that runs Docker Compose.

---

### Agent capabilities — skills and visual communication

The agent today operates from a single long system prompt. The next step is to break this into **skill files** — small, composable instruction modules that the agent loads per-situation. Planned skills include:

- **User persona skill** — instructs the agent on how to read the user's background (engineer, estimator, fabricator) from early messages and adjust its language, level of detail, and question style accordingly
- **Clarification skill** — defines exactly when to pause and ask versus when to proceed, how to frame ambiguous-point questions as short numbered choices rather than open-ended prompts, and how to prioritise the highest-impact question first
- **Visual communication skill** — instructs the agent to produce structured output (JSON or SVG annotations) that the canvas panel can render: highlighted boundary overlays, dimension callouts, detected hole/slot markers, and uncertainty regions drawn directly on top of the original drawing
- **Prompt improvement** — ongoing work to tighten the agent's self-understanding of its task, reduce unnecessary hedging on clear drawings, and improve the quality of intermediate state descriptions it passes back to the UI

---

### Canvas panel — interactive rendering and drawing

The right-hand canvas is currently a placeholder. The full vision:

- **Rendered state output** — after each agent turn the canvas shows the current working state: the detected outer boundary drawn as an SVG overlay on the original image, internal cutouts marked, dimension labels placed, and uncertain regions highlighted in a distinct colour
- **Vector extraction display** — when the agent extracts a vector representation of the profile from a raster drawing it renders that vector so the user can visually verify it before the agent proceeds to calculate
- **User annotation** — users can draw directly on the canvas to correct or clarify: redraw a boundary the agent got wrong, mark which hole to include or exclude, or add a missing dimension by clicking two points and typing a value
- **Generative UI** — using generative UI tools the agent can dynamically render structured input widgets inside the canvas when it needs data: a unit selector, a scale picker, a dimension-confirmation table that the user edits in place rather than typing corrections in prose

---

### Result export

Once a calculation is complete, users will be able to download the result as:

- **PDF report** — the original drawing image, the detected boundary overlay, the dimension table, the full calculation trace, confidence levels, and the final area and perimeter result in a single shareable document
- **CSV** — a flat row of extracted dimensions, area, perimeter, unit, and confidence for downstream use in costing or estimation tools

---

### Authentication, sessions, and chat history

The current build has no user concept. Planned additions:

- **Authentication** — user accounts with login so calculations are tied to a specific user
- **Session and chat history** — each conversation is persisted; users can return to a previous calculation, review the agent's reasoning, or continue from where they left off
- **UI upgrades** — conversation list sidebar, session naming, and the ability to fork a conversation from any point to explore a different interpretation of the same drawing

---

### Security hardening

Several security improvements are planned beyond what is currently in place:

- **Prompt injection protection** — server-side detection and rejection of user messages that attempt to override the system prompt or escape the agent's role
- **File validation** — strict MIME type and magic-byte checks on upload; file size limits; image dimension caps to prevent oversized raster files from being passed to the agent
- **Rate limiting** — per-IP throttling on `/api/upload` and `/api/chat` to prevent abuse and runaway API costs
- **Periodic file deletion** — uploaded files are deleted automatically after a configurable TTL (e.g. 24 hours) so the volume does not grow unbounded and user data is not retained longer than needed
- **Agent sandboxing** — ensure the openclaw gateway is inaccessible from outside the Docker network under all deployment configurations, with network policy rules to enforce this explicitly

---

### Observability

- **Agent turn logging** — structured logs for every agent turn: which tool was called, what the agent's intermediate reasoning was, how long each step took, and what the agent returned
- **Tracing** — distributed traces that connect a user message through the Next.js proxy to the openclaw gateway and back, making it easy to debug why the agent asked a particular question or produced an unexpected decomposition
- **Cost tracking** — token usage per session surfaced in the UI so users and operators can see the cost of each calculation

---

## Built with

- [Next.js 16](https://nextjs.org) (App Router, standalone output)
- [openclaw](https://openclaw.dev) — AI agent gateway
- [OpenAI API](https://platform.openai.com) — gpt-4.1 for completions
- [pdf.js](https://mozilla.github.io/pdf.js/) — client-side PDF text extraction
- [react-markdown](https://github.com/remarkjs/react-markdown) + [remark-gfm](https://github.com/remarkjs/remark-gfm) — Markdown rendering in chat
- Docker + Docker Compose — containerised deployment
