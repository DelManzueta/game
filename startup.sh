#!/bin/sh
# Restart contract: always run from the directory that owns package.json.
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Sandbox layouts sometimes place the app under /workspace/game while the
# script is copied elsewhere — prefer a directory that actually has package.json.
if [ ! -f package.json ] && [ -f /workspace/game/package.json ]; then
  cd /workspace/game
elif [ ! -f package.json ] && [ -f /workspace/package.json ]; then
  cd /workspace
fi

if [ ! -f package.json ]; then
  echo "startup.sh: package.json not found from $ROOT" >&2
  exit 1
fi

if command -v curl >/dev/null 2>&1 && curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  echo "Already running on http://127.0.0.1:8080/"
  exit 0
fi

if [ ! -d node_modules ]; then
  echo "startup.sh: run npm ci (or npm install) first." >&2
  exit 1
fi

LOG="${TMPDIR:-/tmp}/studio-empire-dev.log"
# Git Bash on Windows may not have /tmp writable the same way — fall back to repo.
if ! touch "$LOG" 2>/dev/null; then
  LOG="$ROOT/.dev-server.log"
fi

echo "Starting Studio Empire → http://127.0.0.1:8080/"
echo "Log: $LOG"
npm run dev >>"$LOG" 2>&1 &
echo "PID $!"
