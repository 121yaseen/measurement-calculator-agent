#!/bin/sh
set -e

STATE_DIR="${OPENCLAW_STATE_DIR:-/openclaw-state}"
CONFIG="$STATE_DIR/openclaw.json"

mkdir -p "$STATE_DIR" "$STATE_DIR/workspace"

# The shared uploads volume is created by Docker as root.
# chmod 777 so the nextjs container (uid 1001) can write uploaded PDFs here.
# Path must stay inside /openclaw-state/workspace — that is the only directory
# openclaw's PDF tool is allowed to read from by default.
mkdir -p /openclaw-state/workspace/uploads && chmod 777 /openclaw-state/workspace/uploads

# Write config on first boot only — subsequent starts reuse the persisted volume
if [ ! -f "$CONFIG" ]; then
  echo "[openclaw] First boot — writing initial config..."
  node - << 'NODESCRIPT'
const fs = require('fs');
const dir = process.env.OPENCLAW_STATE_DIR || '/openclaw-state';
const cfg = {
  agents: {
    defaults: {
      workspace: dir + '/workspace',
      model: { primary: 'openai/gpt-5.5' }
    }
  },
  gateway: {
    mode: 'local',
    bind: 'lan',
    port: 18789,
    auth: { mode: 'token' },
    http: { endpoints: { chatCompletions: { enabled: true } } }
  }
};
fs.writeFileSync(dir + '/openclaw.json', JSON.stringify(cfg, null, 2));
console.log('[openclaw] Config written.');
NODESCRIPT
fi

# Write TOOLS.md so the agent knows browser is unavailable in this environment.
# This file is read each session and prevents the agent from wasting turns
# trying file:// / localhost browser navigation that Docker always blocks.
TOOLS_MD="$STATE_DIR/workspace/TOOLS.md"
cat > "$TOOLS_MD" << 'TOOLS'
# Tool Conventions

## Browser tool
The browser tool is NOT available in this environment. Do not attempt to use it —
all navigation will be blocked regardless of URL or target. Do not retry with
file://, http://127.0.0.1, or any other variant.

## Analyzing PDFs and engineering drawings
Use the `pdf` tool with the HTTP URL provided in the user message.
The pdf tool will fetch the file and render pages as images for visual analysis.
TOOLS

echo "[openclaw] Starting gateway on :18789..."
exec openclaw gateway run \
  --bind lan \
  --port "${OPENCLAW_GATEWAY_PORT:-18789}" \
  --auth token \
  --token "${OPENCLAW_GATEWAY_TOKEN}"
