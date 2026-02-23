# Setup Nightly UAT DB Sync Scheduled Task
# Creates a Windows scheduled task that clones Production DB into UAT at 5:00 AM daily.
#
# MUST RUN AS ADMINISTRATOR
# Usage: powershell -ExecutionPolicy Bypass -File "G:\My Drive\MyBudgetHQ\Web\scripts\setup-db-sync-task.ps1"

$taskName   = "MyBudgetHQ-SyncUATFromProd"
$scriptPath = "C:\Projects\MyBudgetHQ\Web\scripts\sync-uat-from-prod.ps1"
$projectDir = "C:\Projects\MyBudgetHQ\Web"

Write-Host "`n=== MyBudgetHQ - UAT DB Sync Task Setup ===" -ForegroundColor Cyan
Write-Host ""

# --- Verify admin ---
$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    Write-Host "Right-click PowerShell > Run as Administrator, then re-run." -ForegroundColor Yellow
    Read-Host "Press Enter to close"
    exit 1
}

# --- Remove existing task if present ---
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Removing existing task '$taskName'..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# --- Create task: Daily at 5:00 AM ---
Write-Host "Creating scheduled task '$taskName' (daily at 5:00 AM)..." -ForegroundColor Green

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`"" `
    -WorkingDirectory $projectDir

$trigger = New-ScheduledTaskTrigger -Daily -At "5:00AM"

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

$principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType S4U `
    -RunLevel Highest

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Nightly clone of Production DB into UAT (runs after BugStopper completes)" | Out-Null

Write-Host "  Task '$taskName' registered successfully." -ForegroundColor Green

# --- Create desktop shortcut for manual runs ---
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = "$desktopPath\Sync UAT From Prod.lnk"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$scriptPath`""
$shortcut.WorkingDirectory = $projectDir
$shortcut.Description = "Manually sync UAT database from Production"
$shortcut.Save()

Write-Host "  Desktop shortcut created: $shortcutPath" -ForegroundColor Green

# --- Summary ---
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Task:      $taskName" -ForegroundColor White
Write-Host "  Schedule:  Daily at 5:00 AM" -ForegroundColor White
Write-Host "  Script:    $scriptPath" -ForegroundColor White
Write-Host "  Shortcut:  $shortcutPath" -ForegroundColor White
Write-Host ""
Write-Host "Nightly schedule (all tasks):" -ForegroundColor DarkGray
Write-Host "  12:00 AM  BudgetHQ-ArchivePassedQA" -ForegroundColor DarkGray
Write-Host "  12:01 AM  MyBudgetHQ-BugStopperLocal (until ~1:30 AM)" -ForegroundColor DarkGray
Write-Host "   2:00 AM  MyBudgetHQ-BugStopperProd (until ~4:30 AM)" -ForegroundColor DarkGray
Write-Host "   5:00 AM  MyBudgetHQ-SyncUATFromProd (this task)" -ForegroundColor DarkGray
Write-Host ""
