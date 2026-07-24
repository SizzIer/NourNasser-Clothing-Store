# Ensures Node.js is available for Start-App.bat.
# Prefers an existing system Node; otherwise downloads a portable LTS build
# into .tools\node (no admin install required).
#
# Usage:
#   powershell -File scripts\ensure-node.ps1 [-BinPathOut <file>]
# Writes the portable node folder path to BinPathOut when using .tools\node.
# Writes an empty file when system Node should be used.

param(
  [string]$BinPathOut = ""
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$toolsNode = Join-Path $root ".tools\node"
$nodeExe = Join-Path $toolsNode "node.exe"
$npmCmd = Join-Path $toolsNode "npm.cmd"

function Save-BinPath([string]$value) {
  if ($BinPathOut) {
    $dir = Split-Path -Parent $BinPathOut
    if ($dir -and -not (Test-Path $dir)) {
      New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    [System.IO.File]::WriteAllText($BinPathOut, $value)
  }
}

function Test-SystemNode {
  $npm = Get-Command npm -ErrorAction SilentlyContinue
  $node = Get-Command node -ErrorAction SilentlyContinue
  return ($null -ne $npm -and $null -ne $node)
}

function Test-LocalNode {
  return (Test-Path $nodeExe) -and (Test-Path $npmCmd)
}

if (Test-SystemNode) {
  Write-Host "[ok] Node.js already installed on this computer."
  Save-BinPath ""
  exit 0
}

if (Test-LocalNode) {
  Write-Host "[ok] Using portable Node.js from .tools\node"
  Save-BinPath $toolsNode
  exit 0
}

Write-Host "Node.js was not found. Downloading a portable copy (one-time, no admin needed)..."
Write-Host "This needs an internet connection and may take a minute."
Write-Host ""

if ($env:PROCESSOR_ARCHITECTURE -eq "x86" -and -not $env:PROCESSOR_ARCHITEW6432) {
  Write-Host "[error] 32-bit Windows is not supported. Please install Node.js LTS from https://nodejs.org"
  exit 1
}

try {
  $index = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -TimeoutSec 60
  $release = $index | Where-Object { $_.lts -ne $false } | Select-Object -First 1
  if (-not $release) {
    throw "Could not find a Node.js LTS release."
  }
  $version = $release.version
  $zipName = "node-$version-win-x64.zip"
  $url = "https://nodejs.org/dist/$version/$zipName"
} catch {
  Write-Host "[error] Could not look up Node.js download: $($_.Exception.Message)"
  Write-Host "Install Node.js LTS manually from https://nodejs.org then run Start-App.bat again."
  exit 1
}

$tempDir = Join-Path $env:TEMP ("kindstitch-node-" + [guid]::NewGuid().ToString("N"))
$zipPath = Join-Path $tempDir $zipName
$extractDir = Join-Path $tempDir "extract"

try {
  New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
  Write-Host "Downloading $zipName ..."
  Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing

  Write-Host "Extracting..."
  Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

  $extracted = Get-ChildItem -Path $extractDir -Directory | Select-Object -First 1
  if (-not $extracted) {
    throw "Download extracted incorrectly."
  }

  $toolsRoot = Join-Path $root ".tools"
  New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null
  if (Test-Path $toolsNode) {
    Remove-Item -Path $toolsNode -Recurse -Force
  }
  Move-Item -Path $extracted.FullName -Destination $toolsNode

  if (-not (Test-LocalNode)) {
    throw "Portable Node.js is missing node.exe or npm.cmd after install."
  }

  Write-Host "[ok] Portable Node.js $version installed to .tools\node"
  Save-BinPath $toolsNode
  exit 0
} catch {
  Write-Host "[error] Failed to install portable Node.js: $($_.Exception.Message)"
  Write-Host "Install Node.js LTS manually from https://nodejs.org then run Start-App.bat again."
  exit 1
} finally {
  if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}
