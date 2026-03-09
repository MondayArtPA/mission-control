#!/bin/zsh
set -euo pipefail

PROJECT_DIR="/Users/Openclaw/.openclaw/workspace/mission-control"
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"

cd "$PROJECT_DIR"

# Stop any stale Mission Control Next processes first
pkill -f 'mission-control/node_modules/.bin/next' 2>/dev/null || true
sleep 1

# Clean + build for a fresh, reliable production start
npm run build >> "$LOG_DIR/build.log" 2>&1

# Start production server
exec npm run start >> "$LOG_DIR/runtime.log" 2>&1
