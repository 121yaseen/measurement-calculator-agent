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

The project ships as a fully self-contained Docker stack. A single `docker compose up --build` starts both the openclaw AI gateway and the Next.js web UI with no host dependencies beyond Docker. The two containers share a named volume for uploaded files, communicate over a Docker-internal network, and the gateway is protected by a shared token that only the backend holds. The foundation is deliberately minimal — the architecture is designed to grow, and the most significant capabilities are yet to be built.

---

### The core vision: an agent that thinks, draws, and talks

The current agent communicates entirely through text. The long-term vision is fundamentally different: **an agent that uses the canvas as a first-class communication channel** — one that shows its working visually at every step, invites the user to intervene directly on the drawing, and builds dynamic interfaces on the fly when it needs input. Chat becomes the conversation; the canvas becomes the shared workspace.

The key insight driving this is that engineering drawing analysis is inherently a visual, iterative, and collaborative task. Text alone is the wrong medium. The agent should be able to say "I think the boundary is here" and *draw it*, ask "is this the right profile?" and *highlight it*, and present "here are the three candidate scales" as *an interactive picker on the canvas* rather than a paragraph. The goal is to give the agent the best possible tools so that it can make the best possible decisions — and then get out of its way.

---

### Agent intelligence — skills and prompt architecture

The agent currently operates from a single monolithic system prompt. This works but does not scale. The planned architecture replaces it with a **skill file system**: small, composable instruction modules that the agent selects and loads based on the current situation.

**Planned skills:**

- **User persona skill** — the agent reads the user's background from the first few messages (engineer, estimator, fabricator, student) and adapts its language, level of technical detail, and question style accordingly. An experienced CNC programmer gets terse precision; a non-expert gets explained assumptions.

- **Clarification and questioning skill** — a dedicated skill that defines exactly when the agent should pause versus proceed, how to frame ambiguous-point questions as tight numbered choices rather than open-ended requests, how to order questions by impact (the one whose answer changes the result the most comes first), and how to close a clarification loop without asking the same thing twice.

- **Visual communication skill** — this is the most important planned skill. It teaches the agent to express its state visually rather than in prose. At every major step the agent emits structured output — SVG paths, bounding boxes, annotated regions, confidence heat maps — that the canvas renders in real time. Instead of writing "I identified the outer boundary and two internal slots", the agent draws the boundary in green, outlines the slots in orange, and marks the uncertain fillet radius with a pulsing question-mark annotation. The user sees exactly what the agent sees. Ambiguities become visible objects, not sentences.

- **Intervention skill** — instructs the agent to treat every canvas state as an invitation for the user to intervene. At any point the user can redraw a boundary, move a dimension label, or mark a region as excluded. The agent reads these corrections as structured input and updates its working state accordingly, rather than requiring the user to describe corrections in text.

- **Prompt refinement** — continuous improvement of the agent's core self-understanding: its task, its constraints, what precision means in this context, and how to communicate uncertainty without being unhelpfully vague.

---

### Tool ecosystem — giving the agent real capabilities

Beyond skills, the agent needs **purpose-built tools** it can call when the situation demands. The planned tool layer is where the most significant engineering work lies.

**Canvas rendering tools:**

- `render_boundary(svg_path, colour, label)` — draws a detected profile boundary as an SVG overlay on the original drawing in the canvas panel, with a label and confidence indicator
- `render_dimension(point_a, point_b, value, unit)` — places a dimension line between two points on the canvas, matching engineering drawing conventions
- `render_annotation(region, type, message)` — marks a region of the drawing with a typed annotation: `uncertain`, `excluded`, `hole`, `fillet`, `confirmed`
- `render_vector(paths)` — renders the full extracted vector representation of a profile, letting the user visually compare it against the original before the agent uses it for calculation
- `clear_canvas()` / `reset_to_original()` — canvas state management tools the agent calls when moving between steps

**Generative UI tools:**

- `show_selector(title, options)` — renders an interactive choice widget on the canvas (e.g. "Which profile should I measure?" with the two candidates highlighted and clickable)
- `show_dimension_table(rows)` — renders the extracted dimension table as an editable grid on the canvas; the user corrects values in place and the agent reads the result
- `show_scale_picker(detected_candidates)` — presents detected scale candidates as a visual comparison the user picks from
- `request_freehand_input(prompt)` — activates the drawing tools and prompts the user to draw something: a missing boundary segment, a clarifying region, a point pair for a missing dimension

**User drawing tools (canvas-side):**

- Freehand draw, polyline, rectangle, circle, and arc tools for the user to sketch corrections or additions directly on the drawing
- Click-to-measure: the user clicks two points and enters a dimension value, which the agent ingests as a confirmed measurement
- Region selection: the user drags to select a sub-region of the drawing and tells the agent to focus only on that area

The underlying principle is that **the agent should know what tools exist and always choose the best one for the situation**. A well-tooled agent rarely needs to fall back to describing things in text when it could just show them.

---

### Canvas panel — the shared workspace

With the tool layer in place, the canvas transforms from a placeholder into the primary workspace:

- **Live state rendering** — the canvas updates after every agent turn, always showing the current working state: confirmed boundaries, detected features, open questions, and dimension callouts
- **Step-by-step visual trace** — the user can scrub back through the agent's steps and see exactly how it arrived at each intermediate state, not just the final result
- **Bidirectional interaction** — the user draws, the agent reads; the agent renders, the user corrects. The canvas is a shared surface, not a read-only display
- **Overlay management** — multiple layers (original image, detected boundary, dimension annotations, uncertainty markers, user corrections) that can be toggled independently

---

### Result export

Once a calculation is complete:

- **PDF report** — the original drawing, the final boundary overlay, the dimension table, the full step-by-step calculation trace, confidence levels, and the area and perimeter result in a single shareable engineering document
- **CSV** — extracted dimensions, area, perimeter, unit, and confidence as a flat row for downstream use in costing, estimation, or fabrication tools

---

### Authentication, sessions, and chat history

The current build has no user concept. Planned additions:

- **Authentication** — user accounts so calculations and sessions are tied to a specific user
- **Persistent sessions** — each conversation is stored; users return to a previous job, review the agent's full reasoning trace, or continue from any point
- **Session management UI** — conversation list, session naming, the ability to duplicate a session and explore a different interpretation of the same drawing
- **Annotation persistence** — user drawings and corrections on the canvas are saved as part of the session, not lost on refresh

---

### Security hardening

Several significant security improvements are needed before this is production-ready:

- **Prompt injection protection** — server-side detection and rejection of user messages that attempt to override the system prompt or escape the agent's engineering role
- **User input validation** — sanitisation and length limits on all text inputs before they reach the agent
- **File validation** — strict MIME type and magic-byte verification on upload; file size and image dimension limits to prevent oversized files from being passed to the agent
- **Rate limiting** — per-IP throttling on `/api/upload` and `/api/chat` to prevent abuse and runaway API costs
- **Periodic file deletion** — uploaded files purged automatically after a configurable TTL so the volume does not grow unbounded and user data is not retained longer than necessary
- **Agent sandboxing** — explicit network policy rules ensuring the openclaw gateway is unreachable from outside the Docker network under all deployment configurations, with no public port exposure

---

### Observability

- **Agent turn logging** — structured logs for every agent turn: tool called, inputs, outputs, reasoning summary, duration, and token count
- **Distributed tracing** — traces that span from the browser through the Next.js proxy to the openclaw gateway, making it straightforward to diagnose unexpected agent behaviour
- **Cost tracking** — per-session token usage surfaced in the UI so both users and operators have visibility into calculation cost

---

## Built with

- [Next.js 16](https://nextjs.org) (App Router, standalone output)
- [openclaw](https://openclaw.dev) — AI agent gateway
- [OpenAI API](https://platform.openai.com) — gpt-4.1 for completions
- [pdf.js](https://mozilla.github.io/pdf.js/) — client-side PDF text extraction
- [react-markdown](https://github.com/remarkjs/react-markdown) + [remark-gfm](https://github.com/remarkjs/remark-gfm) — Markdown rendering in chat
- Docker + Docker Compose — containerised deployment
