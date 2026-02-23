# setup-bugstopper-tasks.ps1
# Run this ONCE (as Administrator) to:
#   1. Register BugStopper Local daily at 12:01 AM
#   2. Register BugStopper Prod daily at 2:00 AM
#   3. Create desktop shortcuts for manual runs
#
# Usage: Run as Administrator
#   powershell -ExecutionPolicy Bypass -File G:\My Drive\MyBudgetHQ\Web\scripts\setup-bugstopper-tasks.ps1

$ProjectDir = "C:\Projects\MyBudgetHQ\Web"
$Desktop    = [Environment]::GetFolderPath("Desktop")

# ============ BugStopper Local ============
$TaskNameLocal = "MyBudgetHQ-BugStopperLocal"
$ScriptLocal   = "$ProjectDir\launch_bugstopper_local.ps1"

Write-Host "`n=== Registering BugStopper Local Task ===" -ForegroundColor Cyan

$existingLocal = Get-ScheduledTask -TaskName $TaskNameLocal -ErrorAction SilentlyContinue
if ($existingLocal) {
    Unregister-ScheduledTask -TaskName $TaskNameLocal -Confirm:$false
    Write-Host "Removed existing task."
}

$actionLocal = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptLocal`"" `
    -WorkingDirectory $ProjectDir

$triggerLocal = New-ScheduledTaskTrigger -Daily -At "12:01AM"

$settingsLocal = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

Register-ScheduledTask `
    -TaskName $TaskNameLocal `
    -Action $actionLocal `
    -Trigger $triggerLocal `
    -Settings $settingsLocal `
    -Description "Nightly BugStopper Local QA (12:01 AM - 1:30 AM)" `
    -RunLevel Highest | Out-Null

Write-Host "Task '$TaskNameLocal' registered (daily at 12:01 AM)." -ForegroundColor Green

# Desktop shortcut for manual run
$shortcutLocal = Join-Path $Desktop "BugStopper Local.lnk"
$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($shortcutLocal)
$sc.TargetPath = "powershell.exe"
$sc.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptLocal`""
$sc.WorkingDirectory = $ProjectDir
$sc.Description = "Launch BugStopper Local QA manually"
$sc.IconLocation = "shell32.dll,194"
$sc.Save()
Write-Host "Desktop shortcut created: $shortcutLocal" -ForegroundColor Green

# ============ BugStopper Prod ============
$TaskNameProd = "MyBudgetHQ-BugStopperProd"
$ScriptProd   = "$ProjectDir\launch_bugstopper_prod.ps1"

Write-Host "`n=== Registering BugStopper Prod Task ===" -ForegroundColor Cyan

$existingProd = Get-ScheduledTask -TaskName $TaskNameProd -ErrorAction SilentlyContinue
if ($existingProd) {
    Unregister-ScheduledTask -TaskName $TaskNameProd -Confirm:$false
    Write-Host "Removed existing task."
}

$actionProd = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptProd`"" `
    -WorkingDirectory $ProjectDir

$triggerProd = New-ScheduledTaskTrigger -Daily -At "2:00AM"

$settingsProd = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

Register-ScheduledTask `
    -TaskName $TaskNameProd `
    -Action $actionProd `
    -Trigger $triggerProd `
    -Settings $settingsProd `
    -Description "Nightly BugStopper Prod QA (2:00 AM - 4:30 AM)" `
    -RunLevel Highest | Out-Null

Write-Host "Task '$TaskNameProd' registered (daily at 2:00 AM)." -ForegroundColor Green

# Desktop shortcut for manual run
$shortcutProd = Join-Path $Desktop "BugStopper Prod.lnk"
$sc2 = $shell.CreateShortcut($shortcutProd)
$sc2.TargetPath = "powershell.exe"
$sc2.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptProd`""
$sc2.WorkingDirectory = $ProjectDir
$sc2.Description = "Launch BugStopper Prod QA manually"
$sc2.IconLocation = "shell32.dll,194"
$sc2.Save()
Write-Host "Desktop shortcut created: $shortcutProd" -ForegroundColor Green

# ============ Summary ============
Write-Host "`nSetup complete!" -ForegroundColor Green
Write-Host "  BugStopper Local: daily at 12:01 AM (runs until 1:30 AM)" -ForegroundColor DarkGray
Write-Host "  BugStopper Prod:  daily at 2:00 AM  (runs until 4:30 AM)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Desktop shortcuts:" -ForegroundColor DarkGray
Write-Host "  BugStopper Local.lnk" -ForegroundColor DarkGray
Write-Host "  BugStopper Prod.lnk" -ForegroundColor DarkGray
