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
  echo "startup.sh: package.json not found from $ROOT" >>/tmp/app-startup.log
  exit 1
fi

if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi

npm run dev >>/tmp/app-startup.log 2>&1 &
