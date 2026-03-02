#!/bin/bash
# =============================================================================
# MBH Recovery Script
# Moves stuck In Process items back to Open Items for reprocessing
# Respects retry limits to prevent infinite loops on broken items
# Usage: mbh_recover.sh [--auto]   (--auto suppresses confirmation prompts)
# =============================================================================
set -uo pipefail

DRIVE_DIR="G:/My Drive/MyBudgetHQ"
AUTOMATION_DIR="$DRIVE_DIR/automation"
OPEN_ITEMS="$DRIVE_DIR/1. Open Items"
IN_PROCESS="$DRIVE_DIR/2. In Process"
READY_FOR_QA="$DRIVE_DIR/3. Ready for QA"
LOCK_FILE="$AUTOMATION_DIR/lock.json"
HEARTBEAT_FILE="$AUTOMATION_DIR/heartbeat"
LOG_FILE="$AUTOMATION_DIR/automation.log"
RETRY_FILE="$AUTOMATION_DIR/retry_counts.json"
MAX_RETRIES=5
MIN_IN_PROCESS_AGE=${MIN_IN_PROCESS_AGE:-10800}  # 3 hours — skip items newer than this
AUTO_MODE=false

[ "${1:-}" = "--auto" ] && AUTO_MODE=true

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [RECOVER] $1"
    echo "$msg" >> "$LOG_FILE"
    echo "$msg"
}

get_retry_count() {
    local fname="$1"
    python3 -c "
import json, os
try:
    with open('$RETRY_FILE') as f:
        d = json.load(f)
    print(d.get('$fname', 0))
except:
    print(0)
" 2>/dev/null
}

increment_retry() {
    local fname="$1"
    python3 -c "
import json, os
rf = '$RETRY_FILE'
try:
    with open(rf) as f:
        d = json.load(f)
except:
    d = {}
d['$fname'] = d.get('$fname', 0) + 1
with open(rf, 'w') as f:
    json.dump(d, f, indent=2)
print(d['$fname'])
" 2>/dev/null
}

log "=== Recovery started ==="

# Count items in In Process
recovered=0
quarantined=0
total=0

skipped=0

for f in "$IN_PROCESS"/*.docx "$IN_PROCESS"/*.txt "$IN_PROCESS"/*.gdoc; do
    [ -f "$f" ] || continue
    total=$((total + 1))
    fname=$(basename "$f")

    # --- Layer 1: File age guard ---
    # If the file was recently moved to In Process, it's likely being actively
    # worked on (manual Claude session or automation in progress). Skip it.
    file_mod=$(stat -c %Y "$f" 2>/dev/null || echo "0")
    file_age=$(( $(date +%s) - file_mod ))
    if [ "$file_age" -lt "$MIN_IN_PROCESS_AGE" ]; then
        log "SKIP (fresh): '$fname' is $(( file_age / 60 ))min old (min=$(( MIN_IN_PROCESS_AGE / 60 ))min). Likely active work."
        skipped=$((skipped + 1))
        continue
    fi

    # --- Layer 2: Ready-for-QA dedup check ---
    # If the same file already exists in Ready for QA, the task was completed.
    # Clean up the orphan in In Process rather than recovering it.
    if [ -f "$READY_FOR_QA/$fname" ]; then
        log "SKIP (completed): '$fname' already in Ready for QA. Removing orphan from In Process."
        rm -f "$f"
        skipped=$((skipped + 1))
        continue
    fi

    # --- Existing retry/quarantine logic ---
    retries=$(get_retry_count "$fname")

    if [ "$retries" -ge "$MAX_RETRIES" ]; then
        log "QUARANTINED: '$fname' has failed $retries times (max=$MAX_RETRIES). Leaving in In Process for manual review."
        quarantined=$((quarantined + 1))
        continue
    fi

    new_retries=$(increment_retry "$fname")

    if [ "$AUTO_MODE" = true ]; then
        mv "$f" "$OPEN_ITEMS/"
        log "Recovered: '$fname' -> Open Items (attempt $new_retries/$MAX_RETRIES)"
        recovered=$((recovered + 1))
    else
        echo "Move '$fname' back to Open Items? (attempt $new_retries/$MAX_RETRIES) [y/N] "
        read -r answer
        if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
            mv "$f" "$OPEN_ITEMS/"
            log "Recovered: '$fname' -> Open Items (attempt $new_retries/$MAX_RETRIES)"
            recovered=$((recovered + 1))
        else
            log "Skipped: '$fname' (user declined)"
        fi
    fi
done

# Clear stale lock and heartbeat
if [ -f "$LOCK_FILE" ]; then
    rm -f "$LOCK_FILE"
    log "Stale lock removed"
fi
if [ -f "$HEARTBEAT_FILE" ]; then
    rm -f "$HEARTBEAT_FILE"
    log "Stale heartbeat removed"
fi

log "Recovery complete: $recovered recovered, $quarantined quarantined, $skipped skipped, $total total"

if [ $total -eq 0 ]; then
    log "Nothing to recover (In Process was empty)"
fi
