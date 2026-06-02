@echo off
setlocal
set "SCRIPT_DIR=%~dp0"

where pwsh >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%tools\Start-LocalOfficeAI.ps1" %*
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%tools\Start-LocalOfficeAI.ps1" %*
)
