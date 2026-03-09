#!/bin/zsh
set -euo pipefail

PROJECT_DIR="/Users/Openclaw/.openclaw/workspace/mission-control"
LOG_DIR="$PROJECT_DIR/logs"
HEALTH_URL="http://localhost:3000"
START_SCRIPT="$PROJECT_DIR/scripts/start-production.sh"
LAUNCHD_LABEL="com.artistuta.mission-control"

mkdir -p "$LOG_DIR"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "$HEALTH_URL" || echo "000")

if [ "$STATUS" = "200" ]; then
  echo "[$TIMESTAMP] OK - Mission Control healthy (HTTP $STATUS)" >> "$LOG_DIR/healthcheck.log"
  exit 0
fi

echo "[$TIMESTAMP] FAIL - Mission Control unhealthy (HTTP $STATUS), restarting..." >> "$LOG_DIR/healthcheck.log"

launchctl kickstart -k "gui/$(id -u)/$LAUNCHD_LABEL" >> "$LOG_DIR/healthcheck.log" 2>&1 || {
  echo "[$TIMESTAMP] WARN - launchctl kickstart failed, running start script directly" >> "$LOG_DIR/healthcheck.log"
  "$START_SCRIPT" >> "$LOG_DIR/healthcheck.log" 2>&1 &
}

sleep 5
RECHECK=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "$HEALTH_URL" || echo "000")
echo "[$TIMESTAMP] RECHECK - HTTP $RECHECK" >> "$LOG_DIR/healthcheck.log"
