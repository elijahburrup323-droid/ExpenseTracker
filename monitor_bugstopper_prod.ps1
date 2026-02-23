# BugStopper Prod Time Monitor
# Terminates Claude Code after the BugStopper Prod time window closes (4:30 AM).
#
# Usage: powershell -ExecutionPolicy Bypass -File monitor_bugstopper_prod.ps1 -ClaudePID 12345

param(
    [Parameter(Mandatory=$true)]
    [int]$ClaudePID
)

$endHour = 4
$endMinute = 30
$checkIntervalSeconds = 30
$gracePeriodSeconds = 180   # 3 minutes for Claude to finish current operation
$logFile = "C:\Projects\MyBudgetHQ\Web\bugstopper_prod.log"

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

Write-Log "BugStopper Prod monitor started. PID=$ClaudePID, Process=$($targetProcess.ProcessName), Title=$windowTitle"
Write-Log "End time: ${endHour}:$($endMinute.ToString('00')) AM"
Write-Log "Check interval: ${checkIntervalSeconds}s, Grace period: ${gracePeriodSeconds}s"

function Test-PastEndTime {
    $now = Get-Date
    # BugStopper Prod runs 2:00 AM - 4:30 AM
    # Past end = (hour > endHour) OR (hour == endHour AND minute >= endMinute)
    # If hour >= 6, we're well past the window
    if ($now.Hour -ge 6) { return $true }
    if ($now.Hour -gt $endHour) { return $true }
    if ($now.Hour -eq $endHour -and $now.Minute -ge $endMinute) { return $true }
    return $false
}

# Main monitoring loop
while ($true) {
    # Re-verify the Claude process is still running
    $proc = Get-Process -Id $ClaudePID -ErrorAction SilentlyContinue
    if (-not $proc) {
        Write-Log "Claude Code process (PID $ClaudePID) is no longer running. Monitor exiting."
        exit 0
    }

    if (Test-PastEndTime) {
        $now = Get-Date
        Write-Log "TIME WINDOW CLOSED: Current time $($now.ToString('HH:mm:ss')) is past ${endHour}:$($endMinute.ToString('00')) AM."
        Write-Log "Waiting $gracePeriodSeconds seconds for Claude to finish current operation..."

        Start-Sleep -Seconds $gracePeriodSeconds

        Write-Log "Grace period complete. Closing Claude Code window (PID $ClaudePID)..."

        # Re-verify it's still the right process
        $finalCheck = Get-Process -Id $ClaudePID -ErrorAction SilentlyContinue
        if ($finalCheck -and $finalCheck.MainWindowTitle -match "Claude") {
            Stop-Process -Id $ClaudePID -Force
            Write-Log "Claude Code window closed successfully."
        } else {
            Write-Log "Final check: PID $ClaudePID no longer matches Claude Code. Skipping close."
        }
        exit 0
    } else {
        $now = Get-Date
        Write-Log "Running... Current time: $($now.ToString('HH:mm:ss')), End: ${endHour}:$($endMinute.ToString('00')) AM"
    }

    Start-Sleep -Seconds $checkIntervalSeconds
}
