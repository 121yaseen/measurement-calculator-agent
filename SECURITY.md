# Security Considerations

This document outlines the security thinking behind this prototype. The goal is not to claim enterprise-grade security, but to show that the major risks are understood and that the prototype has a clear security model with a realistic path to hardening.

---

## Context

This system processes user-uploaded manufacturing drawings — PDFs and images that may contain confidential customer or supplier IP, proprietary dimensions, tolerances, and design specifications. The input is untrusted. The output influences real downstream decisions. Both of these facts shape how security needs to be approached.

---

## Assets to protect

| Asset | Why it matters |
|---|---|
| Uploaded drawings | May contain confidential customer/supplier IP and proprietary manufacturing data |
| Extracted measurements | Incorrect or tampered results can cause failures in downstream fabrication or costing workflows |
| OpenAI API key | Exposure leads to billing abuse and unauthorized model access |
| OpenClaw gateway token | Protects internal agent access from being called directly |
| Chat history | May contain sensitive drawing context and user-provided clarifications |

---

## What the prototype already does right

**OpenClaw is not exposed to the host network.** The gateway runs inside the Docker network only. The only entry point from outside is the Next.js app on port 3000.

**Token authentication between Next.js and OpenClaw.** All requests from the Next.js backend to the OpenClaw gateway require a bearer token. The token is held server-side only and never sent to the browser.

**UUID filenames for uploads.** Uploaded files are stored with randomly generated UUIDs, not the original filename. This prevents filename-based attacks and makes URLs unpredictable.

**Path traversal protection.** The `/api/files/[filename]` route rejects any filename containing `/` or `..`.

**Secrets kept out of git.** `.env` files are in `.gitignore` and excluded from the Docker build context via `.dockerignore`. No credentials have been committed.

**Non-root Next.js container.** The production Next.js image runs under a dedicated non-root user.

**Human-in-the-loop by design.** The system prompt requires the agent to expose uncertainty, ask for confirmation at key steps, and never present a fabricated or unvalidated measurement as exact. This is a safety property, not just a UX one — a wrong measurement in a manufacturing workflow has real consequences.

---

## Known gaps and what would be fixed for production

**System prompt can be overridden from the client.**
The `/api/chat` route currently preserves a client-supplied `system` message if one is present. A user calling the API directly could replace the trusted server-side prompt entirely. The fix is to always enforce the server-side system prompt and strip any `system`, `developer`, or `tool` messages from the client before forwarding to OpenClaw.

**Arbitrary request fields are forwarded to OpenClaw.**
The chat proxy currently passes most of the client request body upstream. A client could inject unexpected parameters to alter model behaviour. The fix is to build a strict allowlist of fields on the server side — model, stream setting, temperature, and messages only.

**No authentication or rate limiting.**
Any user who can reach the app can call the AI and upload files. For a public deployment this would enable billing abuse, disk exhaustion, and denial of service. The fix is user authentication and per-user or per-IP rate limits on `/api/chat` and `/api/upload`.

**File validation relies on the browser-provided MIME type.**
The upload route checks `file.type === 'application/pdf'`, which the client controls. The fix is server-side magic byte validation (`%PDF-` prefix check), an explicit file size cap, and image dimension limits for image inputs.

**Uploaded files are retained indefinitely.**
Files accumulate in the Docker volume with no cleanup. Confidential drawings persist longer than necessary and the volume grows without bound. The fix is an automatic TTL-based deletion policy (e.g. 24 hours) and `Cache-Control: no-store` on file responses.

**Prompt injection from uploaded documents.**
Uploaded PDFs and images may contain text that instructs the agent to ignore its system prompt, reveal secrets, or change its behaviour. The fix is to explicitly mark all extracted document content as untrusted in the system prompt, and to wrap extracted text in clear data-boundary markers before it enters the model context.

**OpenClaw container runs as root.**
The OpenClaw Dockerfile does not define a non-root user. If a dependency or tool is compromised, it has root privileges inside the container. The fix is a dedicated non-root user and removing the `chmod 777` on the uploads directory in favour of aligned UID/GID between containers.

**Tool restrictions are prompt-based only.**
The agent is instructed not to use the browser tool or access unrelated files, but instructions are not a hard boundary. A prompt injection in an uploaded drawing could attempt to override them. The fix is to restrict tools by OpenClaw configuration — not by prompt alone — and to log every tool call.

**Missing HTTP security headers.**
The app does not currently set `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, or a Content Security Policy. These would be added in `next.config.ts` for any public deployment.

---

## What production hardening looks like

In priority order:

1. Always enforce the server-side system prompt — strip all client-supplied system messages
2. Whitelist the fields forwarded to OpenClaw — no pass-through of arbitrary request body fields
3. Add authentication and per-user rate limiting
4. Validate uploaded files server-side — magic bytes, size cap, dimension limits
5. Add automatic file deletion after a configurable TTL
6. Add explicit prompt-injection handling in the system prompt and data-boundary markers around extracted document text
7. Run OpenClaw as a non-root user with least-privilege volume permissions
8. Restrict agent tools by configuration, not only by prompt instruction
9. Add HTTP security headers
10. Add structured audit logs for uploads, chat calls, tool invocations, and validation failures

The human-in-the-loop validation loop built into the agent prompt is kept as a core safety feature throughout — not just a UX choice. In a manufacturing context, the risk of a user trusting an uncertain AI-generated measurement without understanding its confidence level is at least as important as the technical attack surface.
