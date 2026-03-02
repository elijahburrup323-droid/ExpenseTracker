#!/bin/bash
# =============================================================================
# MBH Automation Pipeline Test
# Tests the plumbing: lock management, recovery, status, file movement
# Does NOT launch Claude - only tests the automation infrastructure
# =============================================================================
set -uo pipefail

DRIVE_DIR="G:/My Drive/MyBudgetHQ"
AUTOMATION_DIR="$DRIVE_DIR/automation"
OPEN_ITEMS="$DRIVE_DIR/1. Open Items"
IN_PROCESS="$DRIVE_DIR/2. In Process"
READY_FOR_QA="$DRIVE_DIR/3. Ready for QA"
SCRIPTS_DIR="C:/Projects/MyBudgetHQ/Web/scripts/automation"
LOCK_FILE="$AUTOMATION_DIR/lock.json"
HEARTBEAT_FILE="$AUTOMATION_DIR/heartbeat"
RETRY_FILE="$AUTOMATION_DIR/retry_counts.json"
LOG_FILE="$AUTOMATION_DIR/automation.log"
TEST_DOC="$OPEN_ITEMS/_TEST_automation_pipeline.txt"

PASS=0
FAIL=0
TESTS=0

assert() {
    local desc="$1"
    local result="$2"
    TESTS=$((TESTS + 1))
    if [ "$result" = "true" ]; then
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $desc"
        FAIL=$((FAIL + 1))
    fi
}

echo "========================================"
echo "  MBH Automation Pipeline Test"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# === Setup: Clean state ===
echo "--- Setup: Cleaning test state ---"
rm -f "$LOCK_FILE" "$HEARTBEAT_FILE"
rm -f "$TEST_DOC"
rm -f "$IN_PROCESS/_TEST_automation_pipeline.txt"
rm -f "$READY_FOR_QA/_TEST_automation_pipeline.txt"
# Clear retry counts for test file
if [ -f "$RETRY_FILE" ]; then
    python3 -c "
import json
with open('$RETRY_FILE', 'r+') as f:
    d = json.load(f)
    d.pop('_TEST_automation_pipeline.txt', None)
    f.seek(0); json.dump(d, f, indent=2); f.truncate()
" 2>/dev/null
fi
echo "  Clean state established"
echo ""

# === Test 1: Lock creation and reading ===
echo "--- Test 1: Lock Management ---"

# Create a lock
cat > "$LOCK_FILE" <<EOF
{
    "worker_pid": $$,
    "task_file": "test_task.docx",
    "started_at": "$(date -Iseconds)",
    "phase": "testing",
    "hostname": "$(hostname)"
}
EOF
date '+%Y-%m-%d %H:%M:%S' > "$HEARTBEAT_FILE"

assert "Lock file created" "$([ -f "$LOCK_FILE" ] && echo true || echo false)"
assert "Heartbeat file created" "$([ -f "$HEARTBEAT_FILE" ] && echo true || echo false)"

# Read lock fields
PID=$(python3 -c "import json; print(json.load(open('$LOCK_FILE'))['worker_pid'])" 2>/dev/null)
assert "Lock PID readable (got=$PID, expected=$$)" "$([ "$PID" = "$$" ] && echo true || echo false)"

TASK=$(python3 -c "import json; print(json.load(open('$LOCK_FILE'))['task_file'])" 2>/dev/null)
assert "Lock task readable (got=$TASK)" "$([ "$TASK" = "test_task.docx" ] && echo true || echo false)"

# Clean up
rm -f "$LOCK_FILE" "$HEARTBEAT_FILE"
assert "Lock cleanup successful" "$([ ! -f "$LOCK_FILE" ] && echo true || echo false)"
echo ""

# === Test 2: File movement (Open -> In Process -> QA) ===
echo "--- Test 2: File Movement Pipeline ---"

# Create test document
echo "This is a test document for automation pipeline testing." > "$TEST_DOC"
assert "Test doc created in Open Items" "$([ -f "$TEST_DOC" ] && echo true || echo false)"

# Simulate: move to In Process
mv "$TEST_DOC" "$IN_PROCESS/"
assert "Moved to In Process" "$([ -f "$IN_PROCESS/_TEST_automation_pipeline.txt" ] && echo true || echo false)"
assert "Removed from Open Items" "$([ ! -f "$TEST_DOC" ] && echo true || echo false)"

# Simulate: move to Ready for QA
mv "$IN_PROCESS/_TEST_automation_pipeline.txt" "$READY_FOR_QA/"
assert "Moved to Ready for QA" "$([ -f "$READY_FOR_QA/_TEST_automation_pipeline.txt" ] && echo true || echo false)"
assert "Removed from In Process" "$([ ! -f "$IN_PROCESS/_TEST_automation_pipeline.txt" ] && echo true || echo false)"

# Clean up
rm -f "$READY_FOR_QA/_TEST_automation_pipeline.txt"
assert "Cleanup: test doc removed from QA" "$([ ! -f "$READY_FOR_QA/_TEST_automation_pipeline.txt" ] && echo true || echo false)"
echo ""

# === Test 3: Recovery mechanism (old/stuck items) ===
echo "--- Test 3: Recovery Mechanism (stale items) ---"

# Create test doc in In Process (simulating stuck item)
echo "Stuck test document." > "$IN_PROCESS/_TEST_automation_pipeline.txt"
# Age the file to 4 hours ago so it passes the freshness guard
python3 -c "import os, time; t = time.time() - 14400; os.utime('$IN_PROCESS/_TEST_automation_pipeline.txt', (t, t))" 2>/dev/null
assert "Stuck doc placed in In Process (aged 4h)" "$([ -f "$IN_PROCESS/_TEST_automation_pipeline.txt" ] && echo true || echo false)"

# Create a stale lock
cat > "$LOCK_FILE" <<EOF
{
    "worker_pid": 99999,
    "task_file": "_TEST_automation_pipeline.txt",
    "started_at": "2026-01-01T00:00:00",
    "phase": "testing"
}
EOF

# Run recovery in auto mode
bash "$SCRIPTS_DIR/mbh_recover.sh" --auto 2>/dev/null
assert "Recovery moved doc to Open Items" "$([ -f "$OPEN_ITEMS/_TEST_automation_pipeline.txt" ] && echo true || echo false)"
assert "Recovery removed from In Process" "$([ ! -f "$IN_PROCESS/_TEST_automation_pipeline.txt" ] && echo true || echo false)"
assert "Recovery cleared lock" "$([ ! -f "$LOCK_FILE" ] && echo true || echo false)"

# Check retry count was incremented
RETRIES=$(python3 -c "
import json
with open('$RETRY_FILE') as f:
    d = json.load(f)
print(d.get('_TEST_automation_pipeline.txt', 0))
" 2>/dev/null)
assert "Retry count incremented (got=$RETRIES, expected=1)" "$([ "$RETRIES" = "1" ] && echo true || echo false)"

# Clean up
rm -f "$OPEN_ITEMS/_TEST_automation_pipeline.txt"
echo ""

# === Test 4: Retry limit / quarantine ===
echo "--- Test 4: Quarantine after max retries ---"

# Set retry count to max
python3 -c "
import json, os
rf = '$RETRY_FILE'
try:
    with open(rf) as f:
        d = json.load(f)
except:
    d = {}
d['_TEST_quarantine.txt'] = 5
with open(rf, 'w') as f:
    json.dump(d, f, indent=2)
" 2>/dev/null

# Place doc in In Process and age it past the freshness guard
echo "Quarantine test." > "$IN_PROCESS/_TEST_quarantine.txt"
python3 -c "import os, time; t = time.time() - 14400; os.utime('$IN_PROCESS/_TEST_quarantine.txt', (t, t))" 2>/dev/null

# Run recovery - should NOT move this file (quarantined)
bash "$SCRIPTS_DIR/mbh_recover.sh" --auto 2>/dev/null
assert "Quarantined doc stays in In Process" "$([ -f "$IN_PROCESS/_TEST_quarantine.txt" ] && echo true || echo false)"
assert "Quarantined doc NOT in Open Items" "$([ ! -f "$OPEN_ITEMS/_TEST_quarantine.txt" ] && echo true || echo false)"

# Clean up
rm -f "$IN_PROCESS/_TEST_quarantine.txt"
python3 -c "
import json
with open('$RETRY_FILE', 'r+') as f:
    d = json.load(f)
    d.pop('_TEST_quarantine.txt', None)
    d.pop('_TEST_automation_pipeline.txt', None)
    f.seek(0); json.dump(d, f, indent=2); f.truncate()
" 2>/dev/null
echo ""

# === Test 8: Fresh file guard — recovery skips recent items ===
echo "--- Test 8: Fresh File Guard (race condition fix) ---"

# Create a FRESH doc in In Process (just created = 0 seconds old)
echo "Fresh test document — simulating manual Claude session." > "$IN_PROCESS/_TEST_fresh_item.txt"
assert "Fresh doc placed in In Process" "$([ -f "$IN_PROCESS/_TEST_fresh_item.txt" ] && echo true || echo false)"

# Run recovery — should SKIP this file because it's too new
bash "$SCRIPTS_DIR/mbh_recover.sh" --auto 2>/dev/null
assert "Fresh doc stays in In Process (not recovered)" "$([ -f "$IN_PROCESS/_TEST_fresh_item.txt" ] && echo true || echo false)"
assert "Fresh doc NOT moved to Open Items" "$([ ! -f "$OPEN_ITEMS/_TEST_fresh_item.txt" ] && echo true || echo false)"

# Clean up
rm -f "$IN_PROCESS/_TEST_fresh_item.txt" "$OPEN_ITEMS/_TEST_fresh_item.txt"
echo ""

# === Test 9: QA dedup guard — recovery cleans orphans ===
echo "--- Test 9: QA Dedup Guard (completed item protection) ---"

# Place same file in BOTH In Process and Ready for QA (orphan scenario)
echo "Orphan in process." > "$IN_PROCESS/_TEST_qa_dedup.txt"
echo "Completed in QA." > "$READY_FOR_QA/_TEST_qa_dedup.txt"
# Age the In Process copy so it passes freshness guard
python3 -c "import os, time; t = time.time() - 14400; os.utime('$IN_PROCESS/_TEST_qa_dedup.txt', (t, t))" 2>/dev/null
assert "Orphan placed in In Process" "$([ -f "$IN_PROCESS/_TEST_qa_dedup.txt" ] && echo true || echo false)"
assert "Completed copy in Ready for QA" "$([ -f "$READY_FOR_QA/_TEST_qa_dedup.txt" ] && echo true || echo false)"

# Run recovery — should remove orphan from In Process, NOT move to Open
bash "$SCRIPTS_DIR/mbh_recover.sh" --auto 2>/dev/null
assert "Orphan removed from In Process" "$([ ! -f "$IN_PROCESS/_TEST_qa_dedup.txt" ] && echo true || echo false)"
assert "QA copy untouched" "$([ -f "$READY_FOR_QA/_TEST_qa_dedup.txt" ] && echo true || echo false)"
assert "Orphan NOT moved to Open Items" "$([ ! -f "$OPEN_ITEMS/_TEST_qa_dedup.txt" ] && echo true || echo false)"

# Clean up
rm -f "$IN_PROCESS/_TEST_qa_dedup.txt" "$READY_FOR_QA/_TEST_qa_dedup.txt" "$OPEN_ITEMS/_TEST_qa_dedup.txt"
echo ""

# === Test 5: Status script ===
echo "--- Test 5: Status Script ---"
STATUS_OUTPUT=$(bash "$SCRIPTS_DIR/mbh_status.sh" 2>/dev/null)
assert "Status script runs successfully" "$([ -n "$STATUS_OUTPUT" ] && echo true || echo false)"
assert "Status shows pipeline info" "$(echo "$STATUS_OUTPUT" | grep -q "Pipeline" && echo true || echo false)"
echo ""

# === Test 6: Scheduler dry run ===
echo "--- Test 6: Scheduler Logic ---"
# Note: Use dry-run mode so scheduler doesn't actually launch a worker during testing.
SCHED_OUTPUT=$(MBH_DRY_RUN=true bash "$SCRIPTS_DIR/mbh_scheduler.sh" 2>&1)
SCHED_EXIT=$?
assert "Scheduler runs without error (exit=$SCHED_EXIT)" "$([ "$SCHED_EXIT" -eq 0 ] && echo true || echo false)"
# Scheduler should log the pipeline state
assert "Scheduler logs pipeline state" "$(echo "$SCHED_OUTPUT" | grep -qi "pipeline\|open=\|nothing\|work available\|skipping" && echo true || echo false)"
echo ""

# === Test 7: Log file ===
echo "--- Test 7: Logging ---"
assert "Log file exists" "$([ -f "$LOG_FILE" ] && echo true || echo false)"
LOG_LINES=$(wc -l < "$LOG_FILE" 2>/dev/null || echo 0)
assert "Log has entries (lines=$LOG_LINES)" "$([ "$LOG_LINES" -gt 0 ] && echo true || echo false)"
echo ""

# === Results ===
echo "========================================"
echo "  Results: $PASS passed, $FAIL failed, $TESTS total"
echo "========================================"

if [ "$FAIL" -eq 0 ]; then
    echo "  ALL TESTS PASSED"
    exit 0
else
    echo "  SOME TESTS FAILED - review output above"
    exit 1
fi
