# archive-passed-qa.ps1
# Moves files from the root of "5. Passed QA" into Archive/{Month}/{DD}/ subfolders.
# Uses YESTERDAY's date when run at midnight (scheduled), or TODAY when run manually.
# Pass -UseToday to archive into today's folder instead of yesterday's.
# Runs nightly at midnight via Task Scheduler, or manually via desktop shortcut.

param(
    [switch]$UseToday
)

$PassedQA = "G:\My Drive\MyBudgetHQ\5. Passed QA"
$Archive  = Join-Path $PassedQA "Archive"
$LogFile  = Join-Path $Archive "archive.log"

function Write-Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "$ts  $msg"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

# Determine the archive date
# Midnight run = files were in Passed QA "yesterday", so use yesterday.
# Manual run via desktop shortcut = use today (files are from today's work).
if ($UseToday) {
    $archiveDate = Get-Date
} else {
    $archiveDate = (Get-Date).AddDays(-1)
}

$monthName = $archiveDate.ToString("MMMM")   # e.g. "February"
$dayNum    = $archiveDate.ToString("dd")      # e.g. "19" (zero-padded)

# Ensure Archive root exists
if (-not (Test-Path $Archive)) {
    New-Item -ItemType Directory -Path $Archive -Force | Out-Null
}

# Get files in the root of Passed QA (not in subfolders)
$files = Get-ChildItem -Path $PassedQA -File |
    Where-Object { $_.Name -ne "desktop.ini" }

if ($files.Count -eq 0) {
    Write-Log "No files to archive."
    exit 0
}

$destDir = Join-Path $Archive (Join-Path $monthName $dayNum)

if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    Write-Log "Created folder: $destDir"
}

Write-Log "Archiving $($files.Count) file(s) into Archive\$monthName\$dayNum\"

$moved = 0
foreach ($file in $files) {
    $destPath = Join-Path $destDir $file.Name

    # Handle name collisions: append (2), (3), etc.
    if (Test-Path $destPath) {
        $base = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
        $ext  = [System.IO.Path]::GetExtension($file.Name)
        $counter = 2
        do {
            $destPath = Join-Path $destDir "$base ($counter)$ext"
            $counter++
        } while (Test-Path $destPath)
    }

    Move-Item -Path $file.FullName -Destination $destPath -Force
    Write-Log "Moved: $($file.Name) -> Archive\$monthName\$dayNum\"
    $moved++
}

Write-Log "Done. Archived $moved file(s)."
