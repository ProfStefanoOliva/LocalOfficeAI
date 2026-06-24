@echo off
setlocal

for %%I in ("%~dp0.") do set "PACKAGE_ROOT=%%~fI"
cd /d "%PACKAGE_ROOT%"

set "PREREQ_SCRIPT=%PACKAGE_ROOT%\tools\Test-LocalOfficeAI-Prerequisites.ps1"
set "EXIT_CODE=0"

echo [LocalOfficeAI] Verifica prerequisiti della release portable v0.16.0
echo [LocalOfficeAI] Root del pacchetto: %PACKAGE_ROOT%
echo.

if not exist "%PREREQ_SCRIPT%" (
  echo [LocalOfficeAI] ERRORE: script non trovato:
  echo [LocalOfficeAI]   %PREREQ_SCRIPT%
  goto :failure
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PREREQ_SCRIPT%" -RootPath "%PACKAGE_ROOT%"
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [LocalOfficeAI] La verifica ha segnalato problemi da correggere prima del primo avvio.
  goto :failure
)

echo.
echo [LocalOfficeAI] Verifica completata. Prossimo passo: esegui 02_Prepara_catalogo_Word.bat
goto :end

:failure
set "EXIT_CODE=1"

:end
if not defined LOCALOFFICEAI_NO_PAUSE pause
exit /b %EXIT_CODE%
