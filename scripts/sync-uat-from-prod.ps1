# Nightly UAT Database Sync from Production
# Backs up UAT database, then clones production database into UAT
# so UAT always has fresh production data each morning.
#
# Schedule: Daily at 5:00 AM (after BugStopper Prod completes ~4:30 AM)
# Usage:    powershell -ExecutionPolicy Bypass -File sync-uat-from-prod.ps1

param(
    [switch]$DryRun  # Show what would happen without executing
)

# --- Configuration ---
$pgBin     = "C:\Program Files\PostgreSQL\18\bin"
$backupDir = "C:\Projects\MyBudgetHQ\backups"
$logFile   = "$backupDir\sync.log"
$retainDays = 7

# Production DB (source)
$prodHost = "dpg-d6dt8qa4d50c73b2v8ng-a.oregon-postgres.render.com"
$prodPort = "5432"
$prodUser = "mybudgethq_user"
$prodPass = "AqRQFNnhkwAgcUJRLQFm2Z7wpDcADXHk"
$prodDb   = "mybudgethq"

# UAT DB (target)
$uatHost = "dpg-d61sug0nputs7385t4o0-a.oregon-postgres.render.com"
$uatPort = "5432"
$uatUser = "expensetracker_db_6lbg_user"
$uatPass = "mvX24QlEDF9H1Iki5OMfwsPdBgSIGHJl"
$uatDb   = "expensetracker_db_6lbg"

# --- Helpers ---
function Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

function Abort($msg) {
    Log "ABORT: $msg"
    exit 1
}

# --- Ensure backup directory exists ---
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

$dateStamp = Get-Date -Format "yyyy-MM-dd"
$uatBackupFile  = "$backupDir\uat_pre_sync_$dateStamp.dump"
$prodDumpFile    = "$backupDir\prod_dump_$dateStamp.dump"

Log "=========================================="
Log "UAT DB Sync from Production — Starting"
Log "=========================================="

if ($DryRun) {
    Log "DRY RUN mode — no changes will be made"
}

# --- Step 1: Backup UAT database (safety net) ---
Log "Step 1: Backing up UAT database..."
if (-not $DryRun) {
    $env:PGPASSWORD = $uatPass
    & "$pgBin\pg_dump" -h $uatHost -p $uatPort -U $uatUser -d $uatDb -Fc -f $uatBackupFile 2>&1 | ForEach-Object { Log "  pg_dump(uat): $_" }
    if ($LASTEXITCODE -ne 0) { Abort "UAT backup failed (exit code $LASTEXITCODE)" }
    $uatSize = (Get-Item $uatBackupFile).Length / 1KB
    Log "  UAT backup saved: $uatBackupFile ($([math]::Round($uatSize, 1)) KB)"
} else {
    Log "  [DRY RUN] Would backup UAT to $uatBackupFile"
}

# --- Step 2: Dump production database ---
Log "Step 2: Dumping production database..."
if (-not $DryRun) {
    $env:PGPASSWORD = $prodPass
    & "$pgBin\pg_dump" -h $prodHost -p $prodPort -U $prodUser -d $prodDb -Fc -f $prodDumpFile 2>&1 | ForEach-Object { Log "  pg_dump(prod): $_" }
    if ($LASTEXITCODE -ne 0) { Abort "Production dump failed (exit code $LASTEXITCODE)" }
    $prodSize = (Get-Item $prodDumpFile).Length / 1KB
    Log "  Production dump saved: $prodDumpFile ($([math]::Round($prodSize, 1)) KB)"
} else {
    Log "  [DRY RUN] Would dump production to $prodDumpFile"
}

# --- Step 3: Drop all tables in UAT ---
Log "Step 3: Dropping all tables in UAT..."
if (-not $DryRun) {
    $env:PGPASSWORD = $uatPass
    $dropSql = @"
DO `$`$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END `$`$;
"@
    echo $dropSql | & "$pgBin\psql" -h $uatHost -p $uatPort -U $uatUser -d $uatDb 2>&1 | ForEach-Object { Log "  psql(drop): $_" }
    if ($LASTEXITCODE -ne 0) { Abort "Failed to drop UAT tables (exit code $LASTEXITCODE)" }
    Log "  All UAT tables dropped"
} else {
    Log "  [DRY RUN] Would drop all tables in UAT"
}

# --- Step 4: Restore production dump into UAT ---
Log "Step 4: Restoring production data into UAT..."
if (-not $DryRun) {
    $env:PGPASSWORD = $uatPass
    & "$pgBin\pg_restore" -h $uatHost -p $uatPort -U $uatUser -d $uatDb --no-owner --no-privileges $prodDumpFile 2>&1 | ForEach-Object { Log "  pg_restore: $_" }
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 1) {
        # pg_restore exit code 1 = warnings (e.g., role doesn't exist), not fatal
        Abort "Restore failed (exit code $LASTEXITCODE)"
    }
    Log "  Production data restored into UAT"
} else {
    Log "  [DRY RUN] Would restore $prodDumpFile into UAT"
}

# --- Step 5: Clean up old backup files ---
Log "Step 5: Cleaning up backups older than $retainDays days..."
$cutoff = (Get-Date).AddDays(-$retainDays)
$cleaned = 0
Get-ChildItem -Path $backupDir -Filter "*.dump" | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
    if (-not $DryRun) {
        Remove-Item $_.FullName -Force
    }
    Log "  Removed: $($_.Name)"
    $cleaned++
}
Log "  Cleaned up $cleaned old backup file(s)"

# --- Done ---
$env:PGPASSWORD = ""
Log "=========================================="
Log "UAT DB Sync COMPLETE"
Log "=========================================="
