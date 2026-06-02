[CmdletBinding()]
param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[LocalOfficeAI] $Message" -ForegroundColor Cyan
}

function Write-WarningMessage {
  param([string]$Message)
  Write-Host "[LocalOfficeAI] $Message" -ForegroundColor Yellow
}

function Write-ErrorMessage {
  param([string]$Message)
  Write-Host "[LocalOfficeAI] $Message" -ForegroundColor Red
}

function Escape-SingleQuotedString {
  param([string]$Value)
  return $Value.Replace("'", "''")
}

function Test-CommandAvailable {
  param([string]$CommandName)
  return $null -ne (Get-Command -Name $CommandName -ErrorAction SilentlyContinue)
}

function Test-TcpPortOpen {
  param(
    [string]$HostName,
    [int]$Port
  )

  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $asyncResult = $client.BeginConnect($HostName, $Port, $null, $null)
    $connected = $asyncResult.AsyncWaitHandle.WaitOne(1500, $false)

    if (-not $connected) {
      return $false
    }

    $client.EndConnect($asyncResult)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Test-HttpEndpoint {
  param(
    [string]$Uri,
    [int]$TimeoutSeconds = 3
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec $TimeoutSeconds
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Start-ComponentWindow {
  param(
    [string]$WindowTitle,
    [string]$WorkingDirectory,
    [string[]]$Commands
  )

  $shellPath = (Get-Process -Id $PID).Path
  $escapedWorkingDirectory = Escape-SingleQuotedString $WorkingDirectory
  $scriptLines = @(
    "`$Host.UI.RawUI.WindowTitle = '$($WindowTitle.Replace("'", "''"))'",
    "Set-Location -LiteralPath '$escapedWorkingDirectory'"
  ) + $Commands

  $scriptBody = $scriptLines -join "; "

  Start-Process -FilePath $shellPath -ArgumentList @(
    "-NoExit",
    "-Command",
    $scriptBody
  ) | Out-Null
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$addinWordDir = Join-Path $repoRoot "addin-word"
$localBridgeDir = Join-Path $repoRoot "local-bridge"
$launcherBat = Join-Path $repoRoot "Start-LocalOfficeAI.bat"

Write-Step "Repository rilevato in: $repoRoot"

if (-not (Test-Path -LiteralPath $addinWordDir -PathType Container)) {
  Write-ErrorMessage "Cartella addin-word non trovata. Verifica di eseguire il launcher dal repository corretto."
  exit 1
}

if (-not (Test-Path -LiteralPath $localBridgeDir -PathType Container)) {
  Write-ErrorMessage "Cartella local-bridge non trovata. Verifica di eseguire il launcher dal repository corretto."
  exit 1
}

if (-not (Test-CommandAvailable "node")) {
  Write-ErrorMessage "Node.js non risulta disponibile nel PATH. Installa Node.js e riprova."
  exit 1
}

if (-not (Test-CommandAvailable "npm")) {
  Write-ErrorMessage "npm non risulta disponibile nel PATH. Installa Node.js/npm e riprova."
  exit 1
}

Write-Step "Node.js rilevato: $(node --version)"
Write-Step "npm rilevato: $(npm --version)"

Write-Step "Controllo Ollama su http://localhost:11434/api/tags ..."
if (-not (Test-HttpEndpoint -Uri "http://localhost:11434/api/tags")) {
  Write-ErrorMessage "Ollama non risulta raggiungibile. Avvia Ollama e riprova."
  exit 1
}

Write-Step "Ollama risponde correttamente."

$bridgeAlreadyActive = Test-HttpEndpoint -Uri "http://localhost:3210/health"
$addinServerAlreadyActive = Test-TcpPortOpen -HostName "localhost" -Port 3000

if ($bridgeAlreadyActive) {
  Write-WarningMessage "Il local-bridge sembra gia' attivo sulla porta 3210. Non avvio un duplicato."
} else {
  Write-Step "Il local-bridge non risulta attivo. Preparo una finestra dedicata."
}

if ($addinServerAlreadyActive) {
  Write-WarningMessage "Il dev-server dell'add-in sembra gia' attivo sulla porta 3000. Non avvio un duplicato."
} else {
  Write-Step "Il dev-server dell'add-in non risulta attivo. Preparo una finestra dedicata."
}

if ($DryRun) {
  Write-Step "Modalita' DryRun: nessun nuovo processo verra' avviato."
} else {
  if (-not $bridgeAlreadyActive) {
    Start-ComponentWindow `
      -WindowTitle "LocalOfficeAI - local-bridge" `
      -WorkingDirectory $localBridgeDir `
      -Commands @(
        "Write-Host 'Eseguo npm run build...' -ForegroundColor Cyan",
        "npm run build",
        "if (`$LASTEXITCODE -ne 0) { Write-Host 'Build del local-bridge non riuscita.' -ForegroundColor Red; return }",
        "Write-Host 'Avvio npm start...' -ForegroundColor Cyan",
        "npm start"
      )
  }

  if (-not $addinServerAlreadyActive) {
    Start-ComponentWindow `
      -WindowTitle "LocalOfficeAI - addin-word dev-server" `
      -WorkingDirectory $addinWordDir `
      -Commands @(
        "Write-Host 'Eseguo npm run build...' -ForegroundColor Cyan",
        "npm run build",
        "if (`$LASTEXITCODE -ne 0) { Write-Host 'Build dell''add-in Word non riuscita.' -ForegroundColor Red; return }",
        "Write-Host 'Avvio npm run dev-server...' -ForegroundColor Cyan",
        "npm run dev-server"
      )
  }
}

Write-Host ""
Write-Step "Riepilogo finale"
Write-Host "  - Local-bridge: $(if ($bridgeAlreadyActive) { 'gia'' attivo' } elseif ($DryRun) { 'verrebbe avviato in finestra separata' } else { 'avviato in finestra PowerShell separata' })"
Write-Host "  - Add-in dev-server: $(if ($addinServerAlreadyActive) { 'gia'' attivo' } elseif ($DryRun) { 'verrebbe avviato in finestra separata' } else { 'avviato in finestra PowerShell separata' })"
Write-Host "  - Wrapper Windows: $launcherBat"
Write-Host ""
Write-Host "Passi successivi per l'utente:" -ForegroundColor Green
Write-Host "  1. Apri Microsoft Word."
Write-Host "  2. Carica o verifica il sideload di addin-word\manifest.xml."
Write-Host "  3. Apri il task pane LocalOfficeAI."
Write-Host "  4. Premi 'Aggiorna stato' se vuoi ricontrollare bridge e Ollama."
Write-Host "  5. Usa il flusso stabile: selezione o richiesta libera -> anteprima -> copia negli appunti -> incolla manuale."
Write-Host ""
Write-WarningMessage "Questo launcher non e' un installer completo e non crea alcun servizio Windows."
