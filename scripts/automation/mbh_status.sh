#!/bin/bash
# =============================================================================
# MBH Automation Status Dashboard
# Quick overview of the entire automation pipeline state
# =============================================================================

DRIVE_DIR="G:/My Drive/MyBudgetHQ"
AUTOMATION_DIR="$DRIVE_DIR/automation"
LOCK_FILE="$AUTOMATION_DIR/lock.json"
HEARTBEAT_FILE="$AUTOMATION_DIR/heartbeat"
LOG_FILE="$AUTOMATION_DIR/automation.log"
RETRY_FILE="$AUTOMATION_DIR/retry_counts.json"

echo "========================================"
echo "  MBH Automation Status Dashboard"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# === Lock Status ===
echo "--- Session Status ---"
if [ -f "$LOCK_FILE" ]; then
    WORKER_PID=$(python3 -c "import json; print(json.load(open('$LOCK_FILE')).get('worker_pid','?'))" 2>/dev/null || echo "?")
    TASK=$(python3 -c "import json; print(json.load(open('$LOCK_FILE')).get('task_file','?'))" 2>/dev/null || echo "?")
    PHASE=$(python3 -c "import json; print(json.load(open('$LOCK_FILE')).get('phase','?'))" 2>/dev/null || echo "?")
    STARTED=$(python3 -c "import json; print(json.load(open('$LOCK_FILE')).get('started_at','?'))" 2>/dev/null || echo "?")

    # Check if PID is alive (MSYS PID)
    PID_STATUS="DEAD"
    if kill -0 "$WORKER_PID" 2>/dev/null; then
        PID_STATUS="RUNNING"
    fi

    echo "  Lock:     ACTIVE"
    echo "  Worker:   PID=$WORKER_PID ($PID_STATUS)"
    echo "  Task:     $TASK"
    echo "  Phase:    $PHASE"
    echo "  Started:  $STARTED"

    if [ "$PID_STATUS" = "DEAD" ]; then
        echo "  ** WARNING: Worker process is dead! Lock is stale. **"
    fi
else
    echo "  Lock:     NONE (idle)"
fi
echo ""

# === Heartbeat ===
echo "--- Heartbeat ---"
if [ -f "$HEARTBEAT_FILE" ]; then
    BEAT=$(cat "$HEARTBEAT_FILE" 2>/dev/null || echo "unknown")
    NOW=$(date +%s)
    BEAT_EPOCH=$(stat -c %Y "$HEARTBEAT_FILE" 2>/dev/null || echo "0")
    AGE=$(( NOW - BEAT_EPOCH ))

    STATUS="HEALTHY"
    if [ "$AGE" -gt 900 ]; then
        STATUS="STALE (>15min)"
    fi
    if [ "$AGE" -gt 3600 ]; then
        STATUS="DEAD (>60min)"
    fi

    echo "  Last beat: $BEAT"
    echo "  Age:       ${AGE}s ($STATUS)"
else
    echo "  Heartbeat: NONE"
fi
echo ""

# === Pipeline Counts ===
echo "--- Pipeline ---"
for folder in "1. Open Items" "2. In Process" "3. Ready for QA" "4. Failed QA" "5. Passed QA"; do
    count=0
    for f in "$DRIVE_DIR/$folder"/*.docx "$DRIVE_DIR/$folder"/*.txt "$DRIVE_DIR/$folder"/*.gdoc; do
        [ -f "$f" ] && count=$((count + 1))
    done
    printf "  %-20s %d docs\n" "$folder:" "$count"
    if [ "$count" -gt 0 ] && [ "$count" -lt 10 ]; then
        for f in "$DRIVE_DIR/$folder"/*.docx "$DRIVE_DIR/$folder"/*.txt "$DRIVE_DIR/$folder"/*.gdoc; do
            [ -f "$f" ] && echo "    - $(basename "$f")"
        done
    fi
done
echo ""

# === Retry Counts ===
if [ -f "$RETRY_FILE" ]; then
    echo "--- Retry Counts ---"
    python3 -c "
import json
with open('$RETRY_FILE') as f:
    d = json.load(f)
for k, v in sorted(d.items()):
    status = ' (QUARANTINED)' if v >= 5 else ''
    print(f'  {k}: {v}/5{status}')
" 2>/dev/null
    echo ""
fi

# === Task Scheduler ===
echo "--- Task Scheduler ---"
if schtasks //query //tn "\\MyBudgetHQ\\MBH-Automation-Scheduler" //fo list 2>/dev/null | head -20; then
    true
else
    echo "  NOT INSTALLED"
    echo "  Run: powershell -ExecutionPolicy Bypass -File scripts/automation/install_scheduler.ps1"
fi
echo ""

# === Recent Log ===
echo "--- Recent Log (last 15 lines) ---"
if [ -f "$LOG_FILE" ]; then
    tail -n 15 "$LOG_FILE"
else
    echo "  No log file yet"
fi
