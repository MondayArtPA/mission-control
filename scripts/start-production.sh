#!/bin/zsh
set -uo pipefail

PROJECT_DIR="/Users/Openclaw/.openclaw/workspace/mission-control"
LOG_DIR="$PROJECT_DIR/logs"
PORT="${PORT:-3001}"
MAX_RETRIES=3
mkdir -p "$LOG_DIR"

cd "$PROJECT_DIR"

# Stop any stale Mission Control Next processes first
pkill -f 'mission-control/node_modules/.bin/next' 2>/dev/null || true
sleep 1

# Also kill anything holding our port
lsof -ti :"$PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

# Retry build up to MAX_RETRIES times (Next.js _document error is intermittent)
BUILD_OK=false
for i in $(seq 1 $MAX_RETRIES); do
  echo "$(date -Iseconds) [build] Attempt $i/$MAX_RETRIES — starting build..." >> "$LOG_DIR/build.log"
  if NODE_OPTIONS="--unhandled-rejections=warn" npm run build >> "$LOG_DIR/build.log" 2>&1; then
    echo "$(date -Iseconds) [build] Build succeeded on attempt $i" >> "$LOG_DIR/build.log"
    BUILD_OK=true
    break
  else
    echo "$(date -Iseconds) [build] Attempt $i failed" >> "$LOG_DIR/build.log"
    sleep 2
  fi
done

if [ "$BUILD_OK" = false ]; then
  echo "$(date -Iseconds) [build] All $MAX_RETRIES attempts FAILED — exiting" >> "$LOG_DIR/build.log"
  exit 1
fi

# Kill port again in case something grabbed it during build
lsof -ti :"$PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

# Start production server
exec npm run start >> "$LOG_DIR/runtime.log" 2>&1
