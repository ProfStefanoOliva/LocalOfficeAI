@echo off
setlocal

for %%I in ("%~dp0.") do set "SCRIPT_DIR=%%~fI"
cd /d "%SCRIPT_DIR%"

set "PORTABLE_WRAPPER=%SCRIPT_DIR%\03_Avvia_LocalOfficeAI.bat"
set "REPO_LAUNCHER_PS1=%SCRIPT_DIR%\tools\Start-LocalOfficeAI.ps1"
set "POWERSHELL_EXE="

where powershell.exe >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  set "POWERSHELL_EXE=powershell.exe"
) else (
  where pwsh >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    set "POWERSHELL_EXE=pwsh"
  )
)

echo [LocalOfficeAI] Avvio launcher...
echo [LocalOfficeAI] Root rilevata: %SCRIPT_DIR%

if exist "%SCRIPT_DIR%\manifest.xml" if exist "%SCRIPT_DIR%\portable" if exist "%SCRIPT_DIR%\packages" if exist "%SCRIPT_DIR%\tools" (
  if exist "%PORTABLE_WRAPPER%" (
    echo [LocalOfficeAI] Modalita': release portable
    call "%PORTABLE_WRAPPER%" %*
    exit /b %ERRORLEVEL%
  )
)

if exist "%SCRIPT_DIR%\addin-word" if exist "%SCRIPT_DIR%\local-bridge" if exist "%SCRIPT_DIR%\desktop-tray" (
  if not defined POWERSHELL_EXE (
    echo [LocalOfficeAI] ERRORE: PowerShell non trovato. Serve powershell.exe oppure pwsh.
    exit /b 1
  )

  echo [LocalOfficeAI] Modalita': repository di sviluppo
  "%POWERSHELL_EXE%" -NoProfile -ExecutionPolicy Bypass -File "%REPO_LAUNCHER_PS1%" %*
  exit /b %ERRORLEVEL%
)

echo [LocalOfficeAI] ERRORE: layout non riconosciuto.
echo [LocalOfficeAI] Per la release portable servono almeno:
echo [LocalOfficeAI]   manifest.xml
echo [LocalOfficeAI]   packages\
echo [LocalOfficeAI]   portable\
echo [LocalOfficeAI]   tools\
echo [LocalOfficeAI]   03_Avvia_LocalOfficeAI.bat
echo [LocalOfficeAI] In alternativa esegui questo file dalla root del repository di sviluppo.
exit /b 1
