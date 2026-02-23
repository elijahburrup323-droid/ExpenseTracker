#!/usr/bin/env bash
#
# promote-to-production.sh
#
# Full pipeline: wait for UAT deploy → run Playwright QA → merge to production
#
# Usage:
#   ./scripts/promote-to-production.sh           # smoke test only (verify-deploy.spec.js)
#   ./scripts/promote-to-production.sh --full     # full QA suite (all non-prod/local tests)
#   ./scripts/promote-to-production.sh --skip-wait # skip deploy wait (UAT already live)
#
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────────
UAT_SERVICE_ID="srv-d61stbali9vc739cgvfg"
PROD_SERVICE_ID="srv-d6e4lch5pdvs73foruag"
UAT_URL="https://djburrup.com/mybudgethq"
PROD_URL="https://mybudgethq.com"
PROJECT_DIR="G:/My Drive/MyBudgetHQ/Web"
RENDER_API="https://api.render.com/v1"
DEPLOY_POLL_INTERVAL=15   # seconds between deploy status checks
DEPLOY_TIMEOUT=600        # max seconds to wait for deploy (10 min)
APP_READY_TIMEOUT=60      # max seconds to wait for app HTTP 200

# ── Read Render API key ───────────────────────────────────────────────────────
if [ -z "${RENDER_API_KEY:-}" ]; then
  CONFIG_FILE="$HOME/.claude/claude_desktop_config.json"
  if [ -f "$CONFIG_FILE" ]; then
    RENDER_API_KEY=$(grep -o '"Bearer [^"]*"' "$CONFIG_FILE" | head -1 | tr -d '"' | sed 's/Bearer //')
  fi
fi
if [ -z "${RENDER_API_KEY:-}" ]; then
  echo "ERROR: RENDER_API_KEY not set and could not read from ~/.claude/claude_desktop_config.json"
  exit 1
fi

# ── Parse flags ───────────────────────────────────────────────────────────────
FULL_SUITE=false
SKIP_WAIT=false
for arg in "$@"; do
  case "$arg" in
    --full)      FULL_SUITE=true ;;
    --skip-wait) SKIP_WAIT=true ;;
    --help|-h)
      echo "Usage: $0 [--full] [--skip-wait]"
      echo "  --full       Run full Playwright QA suite (default: smoke test only)"
      echo "  --skip-wait  Skip waiting for UAT deploy to finish"
      exit 0 ;;
    *) echo "Unknown flag: $arg"; exit 1 ;;
  esac
done

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

step() { echo -e "\n${CYAN}${BOLD}═══ $1 ═══${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; }
warn() { echo -e "${YELLOW}! $1${NC}"; }

# ── Helper: get latest deploy status for a service ────────────────────────────
get_deploy_status() {
  local service_id="$1"
  curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
    "$RENDER_API/services/$service_id/deploys?limit=1" \
    | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4
}

# ── Helper: get latest deploy commit for a service ────────────────────────────
get_deploy_commit() {
  local service_id="$1"
  curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
    "$RENDER_API/services/$service_id/deploys?limit=1" \
    | grep -o '"commitId":"[^"]*"' | head -1 | cut -d'"' -f4
}

# ── Helper: wait for deploy to reach "live" status ────────────────────────────
wait_for_deploy() {
  local service_id="$1"
  local label="$2"
  local elapsed=0

  while [ $elapsed -lt $DEPLOY_TIMEOUT ]; do
    local status
    status=$(get_deploy_status "$service_id")

    case "$status" in
      live)
        ok "$label deploy is live"
        return 0 ;;
      build_failed|update_failed|pre_deploy_failed|canceled)
        fail "$label deploy failed (status: $status)"
        return 1 ;;
      *)
        echo -e "  ${YELLOW}$label: $status${NC} (${elapsed}s elapsed, polling every ${DEPLOY_POLL_INTERVAL}s...)"
        sleep $DEPLOY_POLL_INTERVAL
        elapsed=$((elapsed + DEPLOY_POLL_INTERVAL)) ;;
    esac
  done

  fail "$label deploy timed out after ${DEPLOY_TIMEOUT}s"
  return 1
}

# ── Helper: wait for app to respond with HTTP 200 ────────────────────────────
wait_for_app() {
  local url="$1"
  local label="$2"
  local elapsed=0

  while [ $elapsed -lt $APP_READY_TIMEOUT ]; do
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url/users/sign_in" 2>/dev/null || echo "000")

    if [ "$http_code" = "200" ]; then
      ok "$label app responding (HTTP 200)"
      return 0
    fi

    echo "  Waiting for $label app... (HTTP $http_code, ${elapsed}s elapsed)"
    sleep 5
    elapsed=$((elapsed + 5))
  done

  fail "$label app not responding after ${APP_READY_TIMEOUT}s"
  return 1
}

# ══════════════════════════════════════════════════════════════════════════════
#  PIPELINE START
# ══════════════════════════════════════════════════════════════════════════════

echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  MyBudgetHQ — Promote to Production Pipeline            ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Mode: $([ "$FULL_SUITE" = true ] && echo "${CYAN}Full QA Suite${NC}" || echo "${CYAN}Smoke Test${NC}")"
echo -e "  UAT:  $UAT_URL"
echo -e "  Prod: $PROD_URL"
echo ""

# ── Step 1: Verify we're on main branch with clean state ─────────────────────
step "Step 1: Verify git state"

cd "$PROJECT_DIR"

CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  fail "Must be on 'main' branch (currently on '$CURRENT_BRANCH')"
  exit 1
fi
ok "On branch: main"

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  fail "Uncommitted changes detected. Commit or stash before promoting."
  exit 1
fi
ok "Working tree clean"

# Check main is pushed
LOCAL_SHA=$(git rev-parse main)
REMOTE_SHA=$(git rev-parse origin/main 2>/dev/null || echo "none")
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  fail "Local main ($LOCAL_SHA) differs from origin/main ($REMOTE_SHA). Push first."
  exit 1
fi
ok "main is in sync with origin/main ($LOCAL_SHA)"

# ── Step 2: Wait for UAT deploy ──────────────────────────────────────────────
if [ "$SKIP_WAIT" = true ]; then
  step "Step 2: Skipping deploy wait (--skip-wait)"
  ok "Assuming UAT is already live"
else
  step "Step 2: Wait for UAT deploy to finish"
  wait_for_deploy "$UAT_SERVICE_ID" "UAT"
fi

# ── Step 3: Wait for UAT app readiness ────────────────────────────────────────
step "Step 3: Verify UAT app is responding"
wait_for_app "$UAT_URL" "UAT"

# ── Step 4: Run Playwright smoke test ─────────────────────────────────────────
step "Step 4: Playwright smoke test (verify-deploy.spec.js)"

cd "$PROJECT_DIR"
if npx playwright test tests/verify-deploy.spec.js --project=chromium; then
  ok "Smoke test PASSED (Chromium)"
else
  fail "Smoke test FAILED — aborting promotion"
  exit 1
fi

# ── Step 5: Run full QA suite (if --full) ─────────────────────────────────────
if [ "$FULL_SUITE" = true ]; then
  step "Step 5: Full Playwright QA suite (Chrome + Safari)"

  if npx playwright test --config=playwright.promote.config.js; then
    ok "Full QA suite PASSED (Chrome + Safari)"
  else
    fail "Full QA suite FAILED — aborting promotion"
    exit 1
  fi
else
  step "Step 5: Skipped (use --full for complete QA suite)"
  warn "Running smoke test only. Use --full for the complete QA suite."
fi

# ── Step 6: Promote main → production ─────────────────────────────────────────
step "Step 6: Promote to production"

cd "$PROJECT_DIR"

echo "  Merging main into production..."
git checkout production
git merge main --no-edit
git push origin production
git checkout main

ok "Merged main → production and pushed"
echo "  Production deploy triggered on Render"

# ── Step 7: Wait for production deploy ────────────────────────────────────────
step "Step 7: Wait for production deploy to finish"
wait_for_deploy "$PROD_SERVICE_ID" "Production"

# ── Step 8: Verify production app is responding ──────────────────────────────
step "Step 8: Verify production app is responding"
wait_for_app "$PROD_URL" "Production"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║  PROMOTION COMPLETE                                      ║${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}║  UAT:  $UAT_URL                  ║${NC}"
echo -e "${GREEN}${BOLD}║  Prod: $PROD_URL                          ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Commit: ${CYAN}$LOCAL_SHA${NC}"
echo -e "  Time:   $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
