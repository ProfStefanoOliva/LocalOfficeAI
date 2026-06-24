@echo off
setlocal

for %%I in ("%~dp0.") do set "PACKAGE_ROOT=%%~fI"
cd /d "%PACKAGE_ROOT%"

set "TRAY_EXE=%PACKAGE_ROOT%\portable\localofficeai-desktop-tray-win32-x64\LocalOfficeAI Tray.exe"
set "PREREQ_SCRIPT=%PACKAGE_ROOT%\tools\Test-LocalOfficeAI-Prerequisites.ps1"
set "POWERSHELL_EXE="
set "EXIT_CODE=0"

echo [LocalOfficeAI] Avvio release portable v0.16.0
echo [LocalOfficeAI] Root del pacchetto: %PACKAGE_ROOT%
echo.

where powershell.exe >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  set "POWERSHELL_EXE=powershell.exe"
) else (
  where pwsh >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    set "POWERSHELL_EXE=pwsh"
  )
)

if not defined POWERSHELL_EXE (
  echo [LocalOfficeAI] ERRORE: non e' stato trovato PowerShell.
  goto :failure
)

if not exist "%PACKAGE_ROOT%\manifest.xml" (
  echo [LocalOfficeAI] ERRORE: manifest.xml non trovato nella root del pacchetto.
  goto :failure
)

if not exist "%PACKAGE_ROOT%\portable\" (
  echo [LocalOfficeAI] ERRORE: cartella portable mancante.
  goto :failure
)

if not exist "%PACKAGE_ROOT%\packages\" (
  echo [LocalOfficeAI] ERRORE: cartella packages mancante.
  goto :failure
)

if not exist "%PACKAGE_ROOT%\tools\" (
  echo [LocalOfficeAI] ERRORE: cartella tools mancante.
  goto :failure
)

if not exist "%TRAY_EXE%" (
  echo [LocalOfficeAI] ERRORE: tray executable non trovato:
  echo [LocalOfficeAI]   %TRAY_EXE%
  goto :failure
)

if exist "%PREREQ_SCRIPT%" (
  echo [LocalOfficeAI] Eseguo un controllo rapido non distruttivo dei prerequisiti...
  "%POWERSHELL_EXE%" -NoProfile -ExecutionPolicy Bypass -File "%PREREQ_SCRIPT%" -RootPath "%PACKAGE_ROOT%"
  if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [LocalOfficeAI] Avvio interrotto: correggi prima i prerequisiti segnalati sopra.
    goto :failure
  )
)

echo.
echo [LocalOfficeAI] Avvio della tray portable...
set "LOCALOFFICEAI_ROOT=%PACKAGE_ROOT%"
start "" "%TRAY_EXE%"
echo [LocalOfficeAI] Se la tray parte correttamente, vedrai l'icona vicino all'orologio di Windows.
goto :end

:failure
set "EXIT_CODE=1"

:end
if not defined LOCALOFFICEAI_NO_PAUSE pause
exit /b %EXIT_CODE%
