@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "TRAY_EXE=%SCRIPT_DIR%portable\localofficeai-desktop-tray-win32-x64\LocalOfficeAI Tray.exe"
set "PREREQ_SCRIPT=%SCRIPT_DIR%tools\Test-LocalOfficeAI-Prerequisites.ps1"
set "REPO_LAUNCHER_PS1=%SCRIPT_DIR%tools\Start-LocalOfficeAI.ps1"

echo [LocalOfficeAI] Avvio launcher...

if exist "%TRAY_EXE%" (
  echo [LocalOfficeAI] Modalita': release portable
  echo [LocalOfficeAI] Eseguibile tray rilevato in:
  echo [LocalOfficeAI]   %TRAY_EXE%
  echo [LocalOfficeAI] Controllo prerequisiti consigliato prima dell'avvio.

  if exist "%PREREQ_SCRIPT%" (
    echo [LocalOfficeAI] Eseguo un controllo rapido non distruttivo dei prerequisiti...
    where pwsh >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
      pwsh -NoProfile -ExecutionPolicy Bypass -File "%PREREQ_SCRIPT%"
    ) else (
      powershell -NoProfile -ExecutionPolicy Bypass -File "%PREREQ_SCRIPT%"
    )
  ) else (
    echo [LocalOfficeAI] Script prerequisiti non trovato. Continuo con l'avvio della tray.
  )

  echo [LocalOfficeAI] Avvio della tray portable...
  set "LOCALOFFICEAI_ROOT=%SCRIPT_DIR%"
  start "" "%TRAY_EXE%"
  exit /b 0
)

if exist "%SCRIPT_DIR%addin-word" if exist "%SCRIPT_DIR%local-bridge" if exist "%SCRIPT_DIR%desktop-tray" (
  echo [LocalOfficeAI] Modalita': repository di sviluppo
  where pwsh >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    pwsh -NoProfile -ExecutionPolicy Bypass -File "%REPO_LAUNCHER_PS1%" %*
  ) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_LAUNCHER_PS1%" %*
  )
  exit /b %ERRORLEVEL%
)

echo [LocalOfficeAI] ERRORE: tray portable non trovata e layout repository non rilevato.
echo [LocalOfficeAI] Verifica che la cartella contenga:
echo [LocalOfficeAI]   portable\localofficeai-desktop-tray-win32-x64\LocalOfficeAI Tray.exe
echo [LocalOfficeAI] oppure che tu stia eseguendo questo file dalla root del repository.
exit /b 1
