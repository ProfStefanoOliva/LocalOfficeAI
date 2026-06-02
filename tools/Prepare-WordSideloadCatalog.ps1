[CmdletBinding()]
param(
    [string]$RepositoryRoot,
    [string]$CatalogPath
)

$ErrorActionPreference = "Stop"

function Resolve-RepositoryRoot {
    param([string]$ConfiguredRoot)

    if (-not [string]::IsNullOrWhiteSpace($ConfiguredRoot)) {
        return (Resolve-Path -LiteralPath $ConfiguredRoot).Path
    }

    return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$repoRoot = Resolve-RepositoryRoot -ConfiguredRoot $RepositoryRoot
$manifestSourcePath = Join-Path $repoRoot "addin-word\manifest.xml"

if (-not (Test-Path -LiteralPath $manifestSourcePath)) {
    throw "Manifest non trovato: $manifestSourcePath"
}

if ([string]::IsNullOrWhiteSpace($CatalogPath)) {
    $documentsPath = [Environment]::GetFolderPath("MyDocuments")
    $CatalogPath = Join-Path $documentsPath "LocalOfficeAI\OfficeAddinCatalog"
}

$resolvedCatalogPath = [System.IO.Path]::GetFullPath($CatalogPath)
New-Item -ItemType Directory -Path $resolvedCatalogPath -Force | Out-Null

$manifestDestinationPath = Join-Path $resolvedCatalogPath "manifest.xml"
Copy-Item -LiteralPath $manifestSourcePath -Destination $manifestDestinationPath -Force

$networkHint = "Non disponibile automaticamente. Se condividi la cartella manualmente in Windows, annota il percorso UNC mostrato dal sistema (esempio: \\NOME-PC\OfficeAddinCatalog)."

Write-Host ""
Write-Host "LocalOfficeAI - Catalogo sideload Word preparato" -ForegroundColor Green
Write-Host "Cartella catalogo: $resolvedCatalogPath"
Write-Host "Manifest copiato in: $manifestDestinationPath"
Write-Host "Percorso di rete: $networkHint"
Write-Host ""
Write-Host "Passi successivi suggeriti:" -ForegroundColor Cyan
Write-Host "1. Condividi manualmente la cartella '$resolvedCatalogPath' da Esplora file, se Word richiede un percorso condiviso."
Write-Host "2. Apri Word e vai in File > Opzioni > Centro protezione > Impostazioni Centro protezione."
Write-Host "3. Apri Cataloghi componenti aggiuntivi attendibili e aggiungi il percorso condiviso della cartella."
Write-Host "4. Chiudi e riapri Word."
Write-Host "5. In Home > Componenti aggiuntivi > Avanzate > Cartella condivisa, seleziona LocalOfficeAI."
Write-Host ""
Write-Host "Nota: questo script non modifica registry, firewall o condivisioni SMB." -ForegroundColor Yellow
