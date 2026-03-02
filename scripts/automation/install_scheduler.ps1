# =============================================================================
# MBH Automation - Install/Uninstall Windows Task Scheduler Task
# Usage:
#   Install:   powershell -ExecutionPolicy Bypass -File install_scheduler.ps1
#   Uninstall: powershell -ExecutionPolicy Bypass -File install_scheduler.ps1 -Uninstall
#   Status:    powershell -ExecutionPolicy Bypass -File install_scheduler.ps1 -Status
# =============================================================================
param(
    [switch]$Uninstall,
    [switch]$Status
)

$TaskName = "MBH-Automation-Scheduler"
$TaskPath = "\MyBudgetHQ\"
$FullTaskName = "$TaskPath$TaskName"

if ($Status) {
    try {
        $task = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -ErrorAction Stop
        Write-Host "Task: $FullTaskName"
        Write-Host "State: $($task.State)"
        Write-Host "Last Run: $((Get-ScheduledTaskInfo -TaskName $TaskName -TaskPath $TaskPath).LastRunTime)"
        Write-Host "Next Run: $((Get-ScheduledTaskInfo -TaskName $TaskName -TaskPath $TaskPath).NextRunTime)"
        Write-Host "Last Result: $((Get-ScheduledTaskInfo -TaskName $TaskName -TaskPath $TaskPath).LastTaskResult)"
    }
    catch {
        Write-Host "Task NOT FOUND. Run without -Status to install."
    }
    return
}

if ($Uninstall) {
    try {
        Unregister-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -Confirm:$false -ErrorAction Stop
        Write-Host "Task '$FullTaskName' removed successfully."
    }
    catch {
        Write-Host "Task not found or already removed."
    }
    return
}

# === Install ===
Write-Host "Installing MBH Automation Scheduler..."
Write-Host ""

# Action: run the batch file
$Action = New-ScheduledTaskAction `
    -Execute "C:\Projects\MyBudgetHQ\Web\scripts\automation\mbh_scheduler.bat" `
    -WorkingDirectory "C:\Projects\MyBudgetHQ\Web"

# Trigger: every 10 minutes, indefinitely
# Trigger: every 10 minutes, repeat for 365 days (effectively forever, re-register yearly)
$Trigger = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date).Date.AddHours(6) `
    -RepetitionInterval (New-TimeSpan -Minutes 10) `
    -RepetitionDuration (New-TimeSpan -Days 365)

# Settings
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

# Principal: run as current user, interactive (so terminal windows appear)
$Principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Limited

# Register
Register-ScheduledTask `
    -TaskName $TaskName `
    -TaskPath $TaskPath `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Principal $Principal `
    -Description "MBH Kanban automation - checks for Open Items every 10 minutes, launches Claude worker if work available" `
    -Force

Write-Host ""
Write-Host "Task '$FullTaskName' installed successfully!"
Write-Host "  Schedule: Every 10 minutes"
Write-Host "  Action:   Runs mbh_scheduler.sh via Git Bash"
Write-Host "  Mode:     Interactive (terminal windows visible)"
Write-Host ""
Write-Host "Commands:"
Write-Host "  Check status:  powershell -File install_scheduler.ps1 -Status"
Write-Host "  Uninstall:     powershell -File install_scheduler.ps1 -Uninstall"
Write-Host "  Manual trigger: schtasks /run /tn '$FullTaskName'"
Write-Host "  View status:   bash scripts/automation/mbh_status.sh"
