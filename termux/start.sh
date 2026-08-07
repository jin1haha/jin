#!/data/data/com.termux/files/usr/bin/bash
# Keeps JIN's local server alive: wake-lock + auto-restart loop.
# Safe to run more than once; it dedupes itself below.

cd "$(dirname "$0")"

# Don't start a second copy if one's already running.
if pgrep -f "termux/server.py" > /dev/null; then
  echo "JIN server already running."
  exit 0
fi

# Stop Android from pausing Termux's CPU while this runs.
termux-wake-lock

LOG="$HOME/.jin-server.log"
echo "$(date) — JIN server starting" >> "$LOG"

# Auto-restart loop: if the server ever dies (crash, python update, etc.)
# it comes back up within a second instead of staying dead.
while true; do
  python server.py >> "$LOG" 2>&1
  echo "$(date) — JIN server stopped, restarting in 1s" >> "$LOG"
  sleep 1
done
