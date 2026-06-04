[CmdletBinding()]
param(
    [Alias("RepositoryRoot")]
    [string]$RootPath,
    [string]$ManifestPath,
    [string]$CatalogPath
)

$ErrorActionPreference = "Stop"

function Resolve-LocalOfficeAIRoot {
    param([string]$ConfiguredRoot)

    if (-not [string]::IsNullOrWhiteSpace($ConfiguredRoot)) {
        $normalizedRoot = [System.IO.Path]::GetFullPath($ConfiguredRoot).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
        return (Resolve-Path -LiteralPath $normalizedRoot).Path
    }

    return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Resolve-ManifestSourcePath {
    param(
        [string]$BaseRoot,
        [string]$ExplicitManifestPath
    )

    $candidatePaths = [System.Collections.Generic.List[string]]::new()

    if (-not [string]::IsNullOrWhiteSpace($ExplicitManifestPath)) {
        $candidatePaths.Add([System.IO.Path]::GetFullPath($ExplicitManifestPath))
    }

    $candidatePaths.Add((Join-Path $BaseRoot "manifest.xml"))
    $candidatePaths.Add((Join-Path $BaseRoot "addin-word\manifest.xml"))
    $candidatePaths.Add((Join-Path $BaseRoot "packages\addin-word\manifest.xml"))

    foreach ($candidatePath in $candidatePaths) {
        if (Test-Path -LiteralPath $candidatePath -PathType Leaf) {
            return [pscustomobject]@{
                Path          = (Resolve-Path -LiteralPath $candidatePath).Path
                CandidateList = $candidatePaths
            }
        }
    }

    $checkedPaths = $candidatePaths | ForEach-Object { " - $_" }
    throw "Manifest non trovato. Percorsi controllati:`n$($checkedPaths -join [Environment]::NewLine)"
}

$root = Resolve-LocalOfficeAIRoot -ConfiguredRoot $RootPath
$manifestResolution = Resolve-ManifestSourcePath -BaseRoot $root -ExplicitManifestPath $ManifestPath
$manifestSourcePath = $manifestResolution.Path

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
Write-Host "Root analizzata: $root"
Write-Host "Manifest sorgente: $manifestSourcePath"
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
