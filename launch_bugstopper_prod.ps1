# BugStopper Prod Launcher
# Calls bugstopper_launcher.py (same mintty invocation as work_launcher.py)
# then starts the time-based monitor that auto-closes the window at 4:30 AM.
#
# Usage: Right-click > Run with PowerShell
#   or:  powershell -ExecutionPolicy Bypass -File launch_bugstopper_prod.ps1

$projectDir = "C:\Projects\MyBudgetHQ\Web"
$python = "C:\Users\elija\AppData\Local\Programs\Python\Python313\python.exe"
$script = "S:\My Drive\1. Projects\Tools\bugstopper_launcher.py"

Write-Host "BugStopper Prod - Starting..." -ForegroundColor Cyan
Write-Host "Time window: 2:00 AM - 4:30 AM" -ForegroundColor DarkGray
Write-Host ""

if (-not (Test-Path $python)) {
    Write-Host "ERROR: Python not found at $python" -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

# --- Launch via Python (same mintty invocation as work_launcher.py) ---
& $python $script prod

# --- Find the mintty PID we just launched (by window title) ---
Start-Sleep -Seconds 5
$minttyProc = Get-Process mintty -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowTitle -match "BugStopper Prod" } |
    Select-Object -First 1

if ($minttyProc) {
    Write-Host "Claude Code started (PID: $($minttyProc.Id))" -ForegroundColor Green

    # --- Start the time-based monitor in the background ---
    Start-Process powershell -ArgumentList @(
        "-ExecutionPolicy", "Bypass",
        "-File", "$projectDir\monitor_bugstopper_prod.ps1",
        "-ClaudePID", $minttyProc.Id
    ) -WindowStyle Hidden

    Write-Host "Time monitor started in background." -ForegroundColor Green
    Write-Host "BugStopper Prod will run until ~4:30 AM `(+ 3 min grace`)." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Log: $projectDir\bugstopper_prod.log"
} else {
    Write-Host "WARNING: Could not find mintty window to attach monitor." -ForegroundColor Yellow
    Write-Host "BugStopper launched but time monitor not started." -ForegroundColor Yellow
}
