@echo off
REM ============================================================
REM MBH Automation Scheduler - Windows Task Scheduler Entry Point
REM Runs every 10 minutes to check for work and launch workers
REM ============================================================
"C:\Program Files\Git\bin\bash.exe" -l -c "/c/Projects/MyBudgetHQ/Web/scripts/automation/mbh_scheduler.sh"
