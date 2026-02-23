# setup-archive-task.ps1
# Run this ONCE (as Administrator) to:
#   1. Register a daily midnight scheduled task
#   2. Create a desktop shortcut for manual runs
#
# The scheduled task archives into YESTERDAY's folder (midnight = end of day).
# The desktop shortcut archives into TODAY's folder (manual = current day).

$ScriptPath = "C:\Projects\MyBudgetHQ\Web\scripts\archive-passed-qa.ps1"
$TaskName   = "BudgetHQ-ArchivePassedQA"
$Desktop    = [Environment]::GetFolderPath("Desktop")

# --- 1. Scheduled Task (uses yesterday — no -UseToday flag) ---
Write-Host "`n=== Registering Scheduled Task ===" -ForegroundColor Cyan

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Removed existing task."
}

$action  = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""

$trigger = New-ScheduledTaskTrigger -Daily -At "12:00AM"

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Nightly archive of BudgetHQ Passed QA files into yesterday's month/day folder" `
    -RunLevel Highest | Out-Null

Write-Host "Scheduled task '$TaskName' registered (daily at midnight -> yesterday's folder)." -ForegroundColor Green

# --- 2. Desktop Shortcut (uses -UseToday for manual runs) ---
Write-Host "`n=== Creating Desktop Shortcut ===" -ForegroundColor Cyan

$shortcutPath = Join-Path $Desktop "Archive Passed QA.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`" -UseToday"
$shortcut.WorkingDirectory = "C:\Projects\MyBudgetHQ\Web\scripts"
$shortcut.Description = "Archive BudgetHQ Passed QA files into today's folder"
$shortcut.IconLocation = "shell32.dll,45"
$shortcut.Save()

Write-Host "Desktop shortcut created: $shortcutPath" -ForegroundColor Green
Write-Host "  (shortcut uses -UseToday to archive into today's folder)" -ForegroundColor DarkGray
Write-Host "`nSetup complete!" -ForegroundColor Green
