#!/bin/bash
# =============================================================================
# MBH Automation Scheduler
# Called every 10 minutes by Windows Task Scheduler
# Checks if work is available and launches a worker if no active session exists
# =============================================================================
set -uo pipefail

# === Configuration ===
DRIVE_DIR="G:/My Drive/MyBudgetHQ"
AUTOMATION_DIR="$DRIVE_DIR/automation"
OPEN_ITEMS="$DRIVE_DIR/1. Open Items"
IN_PROCESS="$DRIVE_DIR/2. In Process"
PROJECT_DIR="C:/Projects/MyBudgetHQ/Web"
SCRIPTS_DIR="$PROJECT_DIR/scripts/automation"
LOCK_FILE="$AUTOMATION_DIR/lock.json"
HEARTBEAT_FILE="$AUTOMATION_DIR/heartbeat"
LOG_FILE="$AUTOMATION_DIR/automation.log"
MAX_LOG_LINES=2000
STALE_HEARTBEAT_SECONDS=900   # 15 minutes = probably stuck
DEAD_HEARTBEAT_SECONDS=3600   # 60 minutes = definitely stuck
DRY_RUN="${MBH_DRY_RUN:-false}"  # Set MBH_DRY_RUN=true to test without launching

# === Functions ===
log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [SCHEDULER] $1"
    echo "$msg" >> "$LOG_FILE"
    echo "$msg"
}

count_docs() {
    local dir="$1"
    local count=0
    for f in "$dir"/*.docx "$dir"/*.txt "$dir"/*.gdoc; do
        [ -f "$f" ] && count=$((count + 1))
    done
    echo "$count"
}

is_pid_alive() {
    local pid="$1"
    [ -z "$pid" ] && return 1
    [ "$pid" = "0" ] && return 1
    # Use kill -0 (works with MSYS/bash PIDs from $$)
    kill -0 "$pid" 2>/dev/null
}

get_heartbeat_age() {
    if [ ! -f "$HEARTBEAT_FILE" ]; then
        echo "999999"
        return
    fi
    local now
    now=$(date +%s)
    local beat
    beat=$(stat -c %Y "$HEARTBEAT_FILE" 2>/dev/null || echo "0")
    echo $(( now - beat ))
}

read_lock_field() {
    local field="$1"
    python3 -c "
import json, sys
try:
    with open('$LOCK_FILE') as f:
        print(json.load(f).get('$field', ''))
except:
    print('')
" 2>/dev/null
}

# === Main ===
mkdir -p "$AUTOMATION_DIR"

# Trim log if too long
if [ -f "$LOG_FILE" ]; then
    line_count=$(wc -l < "$LOG_FILE" 2>/dev/null || echo 0)
    if [ "$line_count" -gt "$MAX_LOG_LINES" ]; then
        tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
        log "Log trimmed to 1000 lines"
    fi
fi

log "--- Scheduler check ---"

# === Check Lock ===
if [ -f "$LOCK_FILE" ]; then
    WORKER_PID=$(read_lock_field "worker_pid")
    TASK=$(read_lock_field "task_file")
    STARTED=$(read_lock_field "started_at")

    log "Lock found: PID=$WORKER_PID, task=$TASK, started=$STARTED"

    if is_pid_alive "$WORKER_PID"; then
        # Primary gate: PID is alive = worker is active. Do not launch another.
        # Check lock age for monitoring (how long has this session been running?)
        LOCK_AGE=0
        if [ -n "$STARTED" ]; then
            LOCK_EPOCH=$(date -d "$STARTED" +%s 2>/dev/null || echo "0")
            NOW_EPOCH=$(date +%s)
            LOCK_AGE=$(( NOW_EPOCH - LOCK_EPOCH ))
        fi

        if [ "$LOCK_AGE" -gt "$DEAD_HEARTBEAT_SECONDS" ]; then
            log "WARNING: Worker PID=$WORKER_PID has been running for ${LOCK_AGE}s. Still alive, monitoring."
        fi

        log "Active worker (PID=$WORKER_PID, running for ${LOCK_AGE}s). Skipping."
        exit 0
    else
        log "STALE LOCK: Worker PID=$WORKER_PID is dead. Recovering..."
        bash "$SCRIPTS_DIR/mbh_recover.sh" --auto
    fi
fi

# === No active worker - check for work ===
OPEN_COUNT=$(count_docs "$OPEN_ITEMS")
IN_PROCESS_COUNT=$(count_docs "$IN_PROCESS")

log "Pipeline: Open=$OPEN_COUNT, InProcess=$IN_PROCESS_COUNT"

launch_worker() {
    if [ "$DRY_RUN" = "true" ]; then
        log "DRY RUN: Would launch worker (MBH_DRY_RUN=true)"
        return 0
    fi
    mintty -t "MBH-Automation" -e bash -l -c "$SCRIPTS_DIR/mbh_worker.sh" &
    log "Worker launched in new terminal"
}

if [ "$OPEN_COUNT" -gt 0 ]; then
    log "Work available ($OPEN_COUNT items). Launching worker..."
    launch_worker

elif [ "$IN_PROCESS_COUNT" -gt 0 ]; then
    # Check if any items are old enough to consider stuck.
    # Fresh items (< STALE_HEARTBEAT_SECONDS) are likely being worked on
    # by a manual Claude session that doesn't create a lock file.
    has_stale=false
    for f in "$IN_PROCESS"/*.docx "$IN_PROCESS"/*.txt "$IN_PROCESS"/*.gdoc; do
        [ -f "$f" ] || continue
        file_age=$(( $(date +%s) - $(stat -c %Y "$f" 2>/dev/null || echo "0") ))
        if [ "$file_age" -gt "$STALE_HEARTBEAT_SECONDS" ]; then
            has_stale=true
            break
        fi
    done

    if [ "$has_stale" = true ]; then
        log "Stale items in In Process with no active worker. Recovering..."
        bash "$SCRIPTS_DIR/mbh_recover.sh" --auto
        # Re-check after recovery
        OPEN_COUNT=$(count_docs "$OPEN_ITEMS")
        if [ "$OPEN_COUNT" -gt 0 ]; then
            log "Recovered $OPEN_COUNT item(s). Launching worker..."
            launch_worker
        else
            log "Recovery found nothing actionable."
        fi
    else
        log "Items in In Process are fresh (< ${STALE_HEARTBEAT_SECONDS}s). Likely manual session. Skipping."
    fi
else
    log "Nothing to do. Pipeline is clear."
fi

log "--- Scheduler check complete ---"
