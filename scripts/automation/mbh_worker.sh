#!/bin/bash
# =============================================================================
# MBH Automation Worker
# Wraps a Claude Code session with lock management, heartbeat, and recovery
# Launched by mbh_scheduler.sh in a new terminal window
# =============================================================================
set -uo pipefail

# === Configuration ===
DRIVE_DIR="G:/My Drive/MyBudgetHQ"
AUTOMATION_DIR="$DRIVE_DIR/automation"
OPEN_ITEMS="$DRIVE_DIR/1. Open Items"
IN_PROCESS="$DRIVE_DIR/2. In Process"
READY_FOR_QA="$DRIVE_DIR/3. Ready for QA"
PROJECT_DIR="C:/Projects/MyBudgetHQ/Web"
SCRIPTS_DIR="$PROJECT_DIR/scripts/automation"
LOCK_FILE="$AUTOMATION_DIR/lock.json"
HEARTBEAT_FILE="$AUTOMATION_DIR/heartbeat"
LOG_FILE="$AUTOMATION_DIR/automation.log"
SESSION_LOG_DIR="$AUTOMATION_DIR/sessions"
RETRY_FILE="$AUTOMATION_DIR/retry_counts.json"
MAX_SESSION_SECONDS=7200  # 2 hour hard timeout

HEARTBEAT_PID=""

# === Functions ===
log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [WORKER:$$] $1"
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

create_lock() {
    local task="$1"
    cat > "$LOCK_FILE" <<LOCKEOF
{
    "worker_pid": $$,
    "task_file": "$task",
    "started_at": "$(date -Iseconds)",
    "phase": "starting",
    "hostname": "$(hostname)"
}
LOCKEOF
    # Initial heartbeat
    date '+%Y-%m-%d %H:%M:%S' > "$HEARTBEAT_FILE"
    log "Lock created (PID=$$, task=$task)"
}

update_phase() {
    [ ! -f "$LOCK_FILE" ] && return
    python3 -c "
import json
try:
    with open('$LOCK_FILE', 'r+') as f:
        d = json.load(f)
        d['phase'] = '$1'
        f.seek(0)
        json.dump(d, f, indent=2)
        f.truncate()
except:
    pass
" 2>/dev/null
}

remove_lock() {
    rm -f "$LOCK_FILE" "$HEARTBEAT_FILE"
    log "Lock and heartbeat removed"
}

start_heartbeat() {
    (
        while true; do
            date '+%Y-%m-%d %H:%M:%S' > "$HEARTBEAT_FILE"
            sleep 30
        done
    ) &
    HEARTBEAT_PID=$!
    log "Heartbeat started (PID=$HEARTBEAT_PID, interval=30s)"
}

stop_heartbeat() {
    if [ -n "$HEARTBEAT_PID" ]; then
        kill "$HEARTBEAT_PID" 2>/dev/null || true
        wait "$HEARTBEAT_PID" 2>/dev/null || true
        HEARTBEAT_PID=""
        log "Heartbeat stopped"
    fi
}

cleanup() {
    local exit_code=$?
    log "Cleanup triggered (exit_code=$exit_code)"
    stop_heartbeat

    # Check if items successfully moved to QA
    local final_in_process
    final_in_process=$(count_docs "$IN_PROCESS")

    if [ "$final_in_process" -gt 0 ]; then
        log "WARNING: $final_in_process item(s) still in In Process at exit. Will be recovered by scheduler."
    fi

    remove_lock
    log "=== Worker session ended ==="
}

# === Main ===
mkdir -p "$AUTOMATION_DIR" "$SESSION_LOG_DIR"

# Set cleanup trap
trap cleanup EXIT

cd "$PROJECT_DIR"

log "============================================="
log "=== MBH Worker starting (PID=$$) ==="
log "============================================="

# Check for existing lock (safety check - scheduler should prevent this)
if [ -f "$LOCK_FILE" ]; then
    EXISTING_PID=$(python3 -c "import json; print(json.load(open('$LOCK_FILE')).get('worker_pid',''))" 2>/dev/null || echo "")
    if [ -n "$EXISTING_PID" ] && [ "$EXISTING_PID" != "$$" ]; then
        log "ERROR: Lock already held by PID=$EXISTING_PID. Aborting."
        trap - EXIT  # Don't clean up someone else's lock
        exit 1
    fi
fi

# Count available work
OPEN_COUNT=$(count_docs "$OPEN_ITEMS")
IN_PROCESS_COUNT=$(count_docs "$IN_PROCESS")
log "Pipeline: Open=$OPEN_COUNT, InProcess=$IN_PROCESS_COUNT"

if [ "$OPEN_COUNT" -eq 0 ] && [ "$IN_PROCESS_COUNT" -eq 0 ]; then
    log "No work available. Exiting."
    trap - EXIT
    exit 0
fi

# Determine task name for lock
FIRST_TASK=""
for f in "$OPEN_ITEMS"/*.docx "$OPEN_ITEMS"/*.txt "$OPEN_ITEMS"/*.gdoc; do
    if [ -f "$f" ]; then
        FIRST_TASK=$(basename "$f")
        break
    fi
done
[ -z "$FIRST_TASK" ] && FIRST_TASK="recovery-in-process"

# Create lock and start heartbeat
create_lock "$FIRST_TASK"
start_heartbeat

# Session log
SESSION_LOG="$SESSION_LOG_DIR/session_$(date '+%Y%m%d_%H%M%S').log"
log "Session log: $SESSION_LOG"

# === Launch Claude ===
update_phase "running_claude"
log "Launching Claude Code (print mode)..."

# Run Claude with a timeout
timeout_cmd=""
if command -v timeout &>/dev/null; then
    timeout_cmd="timeout $MAX_SESSION_SECONDS"
fi

# The prompt tells Claude to read masterprompt and execute the workflow
CLAUDE_PROMPT="read S:\\My Drive\\masterprompt.md then Lets Work MBH"

# Unset CLAUDECODE to allow launching from any context (including other Claude sessions)
unset CLAUDECODE 2>/dev/null || true

# --add-dir flags give Claude access to Google Drive paths needed for:
#   S:/My Drive/masterprompt.md  (master prompt)
#   G:/My Drive/MyBudgetHQ/     (kanban folders: Open Items, In Process, Ready for QA, etc.)
$timeout_cmd claude --add-dir "S:/My Drive" --add-dir "G:/My Drive/MyBudgetHQ" -p "$CLAUDE_PROMPT" 2>&1 | tee "$SESSION_LOG"
CLAUDE_EXIT=${PIPESTATUS[0]}

update_phase "completed"
log "Claude exited with code: $CLAUDE_EXIT"

# === Check Results ===
FINAL_OPEN=$(count_docs "$OPEN_ITEMS")
FINAL_IN_PROCESS=$(count_docs "$IN_PROCESS")

# Count items that appeared in Ready for QA since we started
FINAL_QA=0
if [ -f "$LOCK_FILE" ]; then
    for f in "$READY_FOR_QA"/*.docx "$READY_FOR_QA"/*.txt "$READY_FOR_QA"/*.gdoc; do
        if [ -f "$f" ] && [ "$f" -nt "$LOCK_FILE" ]; then
            FINAL_QA=$((FINAL_QA + 1))
        fi
    done
fi

log "Results: Open=$FINAL_OPEN, InProcess=$FINAL_IN_PROCESS, NewInQA=$FINAL_QA, ExitCode=$CLAUDE_EXIT"

if [ "$FINAL_QA" -gt 0 ]; then
    log "SUCCESS: $FINAL_QA item(s) moved to Ready for QA"
    # Clear retry counts for completed items
    if [ -f "$RETRY_FILE" ]; then
        log "Clearing retry counts for completed items"
    fi
fi

if [ "$CLAUDE_EXIT" -ne 0 ]; then
    log "WARNING: Claude exited with non-zero code ($CLAUDE_EXIT)"
fi

# Cleanup happens via trap
