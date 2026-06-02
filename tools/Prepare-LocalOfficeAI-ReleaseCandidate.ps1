[CmdletBinding()]
param(
    [string]$Version = "0.15.0",
    [string]$RepositoryRoot,
    [string]$OutputRoot,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Resolve-RepositoryRoot {
    param([string]$ConfiguredRoot)

    if (-not [string]::IsNullOrWhiteSpace($ConfiguredRoot)) {
        return (Resolve-Path -LiteralPath $ConfiguredRoot).Path
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

$repoRoot = Resolve-RepositoryRoot -ConfiguredRoot $RepositoryRoot
$releaseRoot = if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    Join-Path $repoRoot "release_candidates"
} else {
    [System.IO.Path]::GetFullPath($OutputRoot)
}

$candidateRoot = Join-Path $releaseRoot "LocalOfficeAI-v$Version"
$portableRoot = Join-Path $candidateRoot "portable"
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

New-Item -ItemType Directory -Path $candidateRoot, $portableRoot, $docsRoot, $toolsRoot -Force | Out-Null

$packagedAppDirectory = Get-ChildItem -LiteralPath (Join-Path $desktopTrayRoot "out") -Directory |
    Where-Object { $_.Name -like "*win32*" } |
    Select-Object -First 1

if ($null -eq $packagedAppDirectory) {
    throw "Pacchetto tray non trovato in desktop-tray\\out. Esegui 'npm run make' in desktop-tray."
}

$zipArtifacts = Get-ChildItem -LiteralPath (Join-Path $desktopTrayRoot "out\\make") -Filter *.zip -Recurse -ErrorAction SilentlyContinue

Copy-Directory -SourcePath $packagedAppDirectory.FullName -DestinationPath $portableRoot
Copy-Directory -SourcePath $localBridgeRoot -DestinationPath $portableRoot
Copy-Directory -SourcePath $addinWordRoot -DestinationPath $portableRoot

Copy-Item -LiteralPath (Join-Path $repoRoot "README.md") -Destination $candidateRoot -Force
Copy-Item -LiteralPath (Join-Path $addinWordRoot "manifest.xml") -Destination $candidateRoot -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "docs\\desktop-tray.md") -Destination $docsRoot -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "docs\\INSTALL_WINDOWS.md") -Destination $docsRoot -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "docs\\WORD_SIDELOAD_WINDOWS.md") -Destination $docsRoot -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "docs\\FIRST_RUN_CHECKLIST.md") -Destination $docsRoot -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "tools\\Prepare-WordSideloadCatalog.ps1") -Destination $toolsRoot -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "tools\\Prepare-LocalOfficeAI-ReleaseCandidate.ps1") -Destination $toolsRoot -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "tools\\Start-LocalOfficeAI.ps1") -Destination $toolsRoot -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "Start-LocalOfficeAI.bat") -Destination $candidateRoot -Force

if ($zipArtifacts) {
    $packagesRoot = Join-Path $candidateRoot "packages"
    New-Item -ItemType Directory -Path $packagesRoot -Force | Out-Null
    foreach ($zipArtifact in $zipArtifacts) {
        Copy-Item -LiteralPath $zipArtifact.FullName -Destination $packagesRoot -Force
    }
}

Write-Host ""
Write-Host "Release candidate locale preparata in: $candidateRoot" -ForegroundColor Green
Write-Host "Portable root: $portableRoot"
Write-Host "Documentazione: $docsRoot"
Write-Host "Script supporto: $toolsRoot"
Write-Host ""
Write-Host "Nota: questa cartella e' una staging locale prudente, non un installer definitivo." -ForegroundColor Yellow
