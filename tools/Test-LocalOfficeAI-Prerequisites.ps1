[CmdletBinding()]
param(
    [string]$RootPath
)

$ErrorActionPreference = "Stop"

function Resolve-LocalOfficeAIRoot {
    param([string]$ConfiguredRoot)

    if (-not [string]::IsNullOrWhiteSpace($ConfiguredRoot)) {
        return (Resolve-Path -LiteralPath $ConfiguredRoot).Path
    }

    return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Write-StatusLine {
    param(
        [ValidateSet("OK", "ATTENZIONE", "ERRORE")]
        [string]$Level,
        [string]$Message
    )

    $color = switch ($Level) {
        "OK" { "Green" }
        "ATTENZIONE" { "Yellow" }
        "ERRORE" { "Red" }
    }

    Write-Host ("[{0}] {1}" -f $Level, $Message) -ForegroundColor $color
}

function Test-CommandInPath {
    param([string]$CommandName)

    return $null -ne (Get-Command -Name $CommandName -ErrorAction SilentlyContinue)
}

function Test-HttpEndpoint {
    param([string]$Uri)

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 3 -ErrorAction Stop
        return [pscustomobject]@{
            Reachable = $true
            Detail    = "HTTP $([int]$response.StatusCode)"
        }
    } catch {
        return [pscustomobject]@{
            Reachable = $false
            Detail    = $_.Exception.Message
        }
    }
}

function Test-Port {
    param([int]$Port)

    try {
        $result = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
        return [bool]$result.TcpTestSucceeded
    } catch {
        return $false
    }
}

$root = Resolve-LocalOfficeAIRoot -ConfiguredRoot $RootPath
$trayExePath = Join-Path $root "portable\localofficeai-desktop-tray-win32-x64\LocalOfficeAI Tray.exe"
$manifestPath = Join-Path $root "manifest.xml"
$packagesPath = Join-Path $root "packages"
$portablePath = Join-Path $root "portable"

$summary = [System.Collections.Generic.List[string]]::new()
$hasError = $false

Write-Host ""
Write-Host "LocalOfficeAI - Verifica prerequisiti alpha portable" -ForegroundColor Cyan
Write-Host "Root analizzata: $root"
Write-Host ""

if ($PSVersionTable.PSVersion.Major -ge 5) {
    Write-StatusLine -Level "OK" -Message "PowerShell disponibile: $($PSVersionTable.PSVersion)"
    $summary.Add("PowerShell OK")
} else {
    Write-StatusLine -Level "ATTENZIONE" -Message "Versione PowerShell molto vecchia: $($PSVersionTable.PSVersion)"
    $summary.Add("PowerShell datata")
}

if (Test-CommandInPath "node") {
    Write-StatusLine -Level "OK" -Message "Node.js rilevato: $(node --version)"
    $summary.Add("Node.js OK")
} else {
    Write-StatusLine -Level "ERRORE" -Message "Node.js non trovato nel PATH."
    $summary.Add("Node.js mancante")
    $hasError = $true
}

if (Test-CommandInPath "npm") {
    Write-StatusLine -Level "OK" -Message "npm rilevato: $(npm --version)"
    $summary.Add("npm OK")
} else {
    Write-StatusLine -Level "ERRORE" -Message "npm non trovato nel PATH."
    $summary.Add("npm mancante")
    $hasError = $true
}

if (Test-CommandInPath "ollama") {
    Write-StatusLine -Level "OK" -Message "Ollama nel PATH: $(ollama --version)"
    $summary.Add("Ollama CLI OK")
} else {
    Write-StatusLine -Level "ATTENZIONE" -Message "Ollama non trovato nel PATH. Puoi comunque verificare se il servizio risponde."
    $summary.Add("Ollama CLI non trovata")
}

$ollamaHealth = Test-HttpEndpoint -Uri "http://localhost:11434/api/tags"
if ($ollamaHealth.Reachable) {
    Write-StatusLine -Level "OK" -Message "Ollama raggiungibile su http://localhost:11434 ($($ollamaHealth.Detail))."
    $summary.Add("Ollama HTTP OK")
} else {
    Write-StatusLine -Level "ATTENZIONE" -Message "Ollama non risponde su http://localhost:11434. Dettaglio: $($ollamaHealth.Detail)"
    $summary.Add("Ollama non raggiungibile")
}

if (Test-Path -LiteralPath $manifestPath) {
    Write-StatusLine -Level "OK" -Message "Manifest trovato nella root del pacchetto."
    $summary.Add("manifest.xml OK")
} else {
    Write-StatusLine -Level "ERRORE" -Message "manifest.xml non trovato nella root del pacchetto."
    $summary.Add("manifest.xml mancante")
    $hasError = $true
}

if (Test-Path -LiteralPath $packagesPath -PathType Container) {
    Write-StatusLine -Level "OK" -Message "Cartella packages presente."
    $summary.Add("packages OK")
} else {
    Write-StatusLine -Level "ERRORE" -Message "Cartella packages mancante."
    $summary.Add("packages mancante")
    $hasError = $true
}

if (Test-Path -LiteralPath $portablePath -PathType Container) {
    Write-StatusLine -Level "OK" -Message "Cartella portable presente."
    $summary.Add("portable OK")
} else {
    Write-StatusLine -Level "ERRORE" -Message "Cartella portable mancante."
    $summary.Add("portable mancante")
    $hasError = $true
}

if (Test-Path -LiteralPath $trayExePath) {
    Write-StatusLine -Level "OK" -Message "Tray executable trovato: $trayExePath"
    $summary.Add("tray exe OK")
} else {
    Write-StatusLine -Level "ERRORE" -Message "Tray executable non trovato nel percorso atteso."
    $summary.Add("tray exe mancante")
    $hasError = $true
}

foreach ($port in 3000, 3210) {
    if (Test-Port -Port $port) {
        Write-StatusLine -Level "ATTENZIONE" -Message "La porta $port risulta gia' occupata o attiva."
        $summary.Add("porta $port gia' attiva")
    } else {
        Write-StatusLine -Level "OK" -Message "La porta $port al momento risulta libera."
        $summary.Add("porta $port libera")
    }
}

Write-Host ""
Write-Host "Riepilogo:" -ForegroundColor Cyan
$summary | ForEach-Object { Write-Host " - $_" }
Write-Host ""

if ($hasError) {
    Write-StatusLine -Level "ERRORE" -Message "Almeno un prerequisito o file essenziale manca. Correggi i punti indicati prima di usare la tray."
    Write-Host "Prossimo passo consigliato: apri LEGGIMI_PRIMA.txt oppure docs\\INSTALL_WINDOWS.md." -ForegroundColor Yellow
    exit 1
}

Write-StatusLine -Level "OK" -Message "Controllo prerequisiti completato."
Write-Host "Prossimo passo consigliato: esegui Start-LocalOfficeAI.bat e poi prepara Word con tools\\Prepare-WordSideloadCatalog.ps1." -ForegroundColor Green
