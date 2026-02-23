# Open Items Folder Monitor
# Watches the MyBudgetHQ Open Items folder for document files.
# When no documents remain (all processed), closes the specific Claude Code window.
#
# Usage: powershell -ExecutionPolicy Bypass -File monitor_open_items.ps1 -ClaudePID 25144

param(
    [Parameter(Mandatory=$true)]
    [int]$ClaudePID
)

$openItemsPath = "G:\My Drive\MyBudgetHQ\1. Open Items"
$docExtensions = @("*.docx", "*.gdoc", "*.txt")
$checkIntervalSeconds = 30
$logFile = "G:\My Drive\MyBudgetHQ\Web\monitor_open_items.log"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp] $Message"
    Write-Host $entry
    Add-Content -Path $logFile -Value $entry
}

# Verify the target PID exists and is the right process
$targetProcess = Get-Process -Id $ClaudePID -ErrorAction SilentlyContinue
if (-not $targetProcess) {
    Write-Log "ERROR: No process found with PID $ClaudePID. Exiting."
    exit 1
}

$windowTitle = $targetProcess.MainWindowTitle
if ($windowTitle -notmatch "Claude") {
    Write-Log "WARNING: PID $ClaudePID ($($targetProcess.ProcessName)) window title '$windowTitle' does not contain 'Claude'. Exiting for safety."
    exit 1
}

Write-Log "Monitor started. Tracking Claude Code window: PID=$ClaudePID, Process=$($targetProcess.ProcessName), Title=$windowTitle"
Write-Log "Watching folder: $openItemsPath"
Write-Log "Check interval: ${checkIntervalSeconds}s"

function Get-DocFiles {
    $files = @()
    foreach ($ext in $docExtensions) {
        $found = Get-ChildItem -Path $openItemsPath -Filter $ext -File -ErrorAction SilentlyContinue
        if ($found) { $files += $found }
    }
    # Exclude desktop.ini and other system files
    $files = $files | Where-Object { $_.Name -ne "desktop.ini" }
    return $files
}

# Main monitoring loop
while ($true) {
    # Re-verify the Claude process is still running
    $proc = Get-Process -Id $ClaudePID -ErrorAction SilentlyContinue
    if (-not $proc) {
        Write-Log "Claude Code process (PID $ClaudePID) is no longer running. Monitor exiting."
        exit 0
    }

    $docFiles = Get-DocFiles

    if ($docFiles.Count -eq 0) {
        Write-Log "SUCCESS: Open Items folder is empty! All documents have been processed."
        Write-Log "Waiting 3 minutes for Claude to finish post-processing (QA_MODE, deploy, email)..."

        # Grace period: Claude needs time after emptying the folder to:
        #   - Set QA_MODE=false and commit/push (~10s)
        #   - Wait for Render deploy (~100s)
        #   - Send completion email (~10s)
        Start-Sleep -Seconds 180

        # Re-check folder in case a new file appeared during the wait
        $recheckFiles = Get-DocFiles
        if ($recheckFiles.Count -gt 0) {
            $names = ($recheckFiles | ForEach-Object { $_.Name }) -join ", "
            Write-Log "New items appeared during grace period ($($recheckFiles.Count)): $names — resuming monitoring."
            continue
        }

        Write-Log "Closing Claude Code window (PID $ClaudePID)..."

        # Re-verify one more time it's still the right process
        $finalCheck = Get-Process -Id $ClaudePID -ErrorAction SilentlyContinue
        if ($finalCheck -and $finalCheck.MainWindowTitle -match "Claude") {
            Stop-Process -Id $ClaudePID -Force
            Write-Log "Claude Code window closed successfully."
        } else {
            Write-Log "Final check: PID $ClaudePID no longer matches Claude Code. Skipping close."
        }
        exit 0
    } else {
        $names = ($docFiles | ForEach-Object { $_.Name }) -join ", "
        Write-Log "Remaining docs ($($docFiles.Count)): $names"
    }

    Start-Sleep -Seconds $checkIntervalSeconds
}
