[CmdletBinding()]
param(
    [string]$Version = "0.15.3",
    [string]$RepositoryRoot,
    [string]$OutputRoot,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Resolve-RepositoryRoot {
    param([string]$ConfiguredRoot)

    if (-not [string]::IsNullOrWhiteSpace($ConfiguredRoot)) {
        $normalizedRoot = [System.IO.Path]::GetFullPath($ConfiguredRoot).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
        return (Resolve-Path -LiteralPath $normalizedRoot).Path
    }

    return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Invoke-NpmScript {
    param(
        [string]$WorkingDirectory,
        [string[]]$Arguments
    )

    Write-Host "Eseguo: npm $($Arguments -join ' ')  [cwd=$WorkingDirectory]" -ForegroundColor DarkCyan
    & npm @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "Comando npm fallito in ${WorkingDirectory}: npm $($Arguments -join ' ')"
    }
}

function Copy-Directory {
    param(
        [string]$SourcePath,
        [string]$DestinationPath
    )

    if (-not (Test-Path -LiteralPath $SourcePath)) {
        throw "Percorso sorgente non trovato: $SourcePath"
    }

    New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
    Copy-Item -LiteralPath $SourcePath -Destination $DestinationPath -Recurse -Force
}

function Remove-OptionalPath {
    param([string]$TargetPath)

    if (Test-Path -LiteralPath $TargetPath) {
        Remove-Item -LiteralPath $TargetPath -Recurse -Force
    }
}

$repoRoot = Resolve-RepositoryRoot -ConfiguredRoot $RepositoryRoot
$releaseRoot = if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    Join-Path $repoRoot "release_candidates"
} else {
    [System.IO.Path]::GetFullPath($OutputRoot)
}

$candidateRoot = Join-Path $releaseRoot "LocalOfficeAI-v$Version"
$portableRoot = Join-Path $candidateRoot "portable"
$packagesRoot = Join-Path $candidateRoot "packages"
$docsRoot = Join-Path $candidateRoot "docs"
$toolsRoot = Join-Path $candidateRoot "tools"

$desktopTrayRoot = Join-Path $repoRoot "desktop-tray"
$localBridgeRoot = Join-Path $repoRoot "local-bridge"
$addinWordRoot = Join-Path $repoRoot "addin-word"

if (-not $SkipBuild) {
    Push-Location $localBridgeRoot
    try {
        Invoke-NpmScript -WorkingDirectory $localBridgeRoot -Arguments @("run", "build")
    } finally {
        Pop-Location
    }

    Push-Location $addinWordRoot
    try {
        Invoke-NpmScript -WorkingDirectory $addinWordRoot -Arguments @("run", "build")
    } finally {
        Pop-Location
    }

    Push-Location $desktopTrayRoot
    try {
        Invoke-NpmScript -WorkingDirectory $desktopTrayRoot -Arguments @("run", "build")
        Invoke-NpmScript -WorkingDirectory $desktopTrayRoot -Arguments @("run", "make")
    } finally {
        Pop-Location
    }
}

if (Test-Path -LiteralPath $candidateRoot) {
    Remove-Item -LiteralPath $candidateRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $candidateRoot, $portableRoot, $packagesRoot -Force | Out-Null

$packagedAppDirectory = Get-ChildItem -LiteralPath (Join-Path $desktopTrayRoot "out") -Directory |
    Where-Object { $_.Name -like "*win32*" } |
    Select-Object -First 1

if ($null -eq $packagedAppDirectory) {
    throw "Pacchetto tray non trovato in desktop-tray\\out. Esegui 'npm run make' in desktop-tray."
}

$zipArtifacts = Get-ChildItem -LiteralPath (Join-Path $desktopTrayRoot "out\\make") -Filter *.zip -Recurse -ErrorAction SilentlyContinue

Copy-Directory -SourcePath $packagedAppDirectory.FullName -DestinationPath $portableRoot
Copy-Directory -SourcePath $localBridgeRoot -DestinationPath $packagesRoot
Copy-Directory -SourcePath $addinWordRoot -DestinationPath $packagesRoot
Remove-OptionalPath -TargetPath (Join-Path $packagesRoot "local-bridge\\.local")

Copy-Item -LiteralPath (Join-Path $repoRoot "README.md") -Destination $candidateRoot -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "docs\\release-text\\LEGGIMI_PRIMA.txt") -Destination $candidateRoot -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "docs\\release-text\\README.txt") -Destination $candidateRoot -Force
Copy-Item -LiteralPath (Join-Path $addinWordRoot "manifest.xml") -Destination $candidateRoot -Force
Copy-Directory -SourcePath (Join-Path $repoRoot "docs") -DestinationPath $candidateRoot
Copy-Directory -SourcePath (Join-Path $repoRoot "tools") -DestinationPath $candidateRoot
Copy-Item -LiteralPath (Join-Path $repoRoot "Start-LocalOfficeAI.bat") -Destination $candidateRoot -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "01_Verifica_prerequisiti.bat") -Destination $candidateRoot -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "02_Prepara_catalogo_Word.bat") -Destination $candidateRoot -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "03_Avvia_LocalOfficeAI.bat") -Destination $candidateRoot -Force

if ($zipArtifacts) {
    $packageArtifactsRoot = Join-Path $candidateRoot "packages\\artifacts"
    New-Item -ItemType Directory -Path $packageArtifactsRoot -Force | Out-Null
    foreach ($zipArtifact in $zipArtifacts) {
        Copy-Item -LiteralPath $zipArtifact.FullName -Destination $packageArtifactsRoot -Force
    }
}

Write-Host ""
Write-Host "Release candidate locale preparata in: $candidateRoot" -ForegroundColor Green
Write-Host "Portable root: $portableRoot"
Write-Host "Documentazione: $docsRoot"
Write-Host "Script supporto: $toolsRoot"
Write-Host ""
Write-Host "Nota: questa cartella e' una staging locale prudente, non un installer definitivo." -ForegroundColor Yellow
