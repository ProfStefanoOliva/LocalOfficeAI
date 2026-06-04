@echo off
setlocal

for %%I in ("%~dp0.") do set "PACKAGE_ROOT=%%~fI"
cd /d "%PACKAGE_ROOT%"

set "CATALOG_SCRIPT=%PACKAGE_ROOT%\tools\Prepare-WordSideloadCatalog.ps1"
set "EXIT_CODE=0"

echo [LocalOfficeAI] Preparazione catalogo Word della release portable v0.15.3
echo [LocalOfficeAI] Root del pacchetto: %PACKAGE_ROOT%
echo.

if not exist "%CATALOG_SCRIPT%" (
  echo [LocalOfficeAI] ERRORE: script non trovato:
  echo [LocalOfficeAI]   %CATALOG_SCRIPT%
  goto :failure
)

if defined LOCALOFFICEAI_CATALOG_PATH (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%CATALOG_SCRIPT%" -RootPath "%PACKAGE_ROOT%" -CatalogPath "%LOCALOFFICEAI_CATALOG_PATH%"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%CATALOG_SCRIPT%" -RootPath "%PACKAGE_ROOT%"
)
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [LocalOfficeAI] La preparazione del catalogo Word non e' riuscita.
  goto :failure
)

echo.
echo [LocalOfficeAI] Catalogo Word pronto. Prossimo passo: esegui 03_Avvia_LocalOfficeAI.bat
goto :end

:failure
set "EXIT_CODE=1"

:end
if not defined LOCALOFFICEAI_NO_PAUSE pause
exit /b %EXIT_CODE%
