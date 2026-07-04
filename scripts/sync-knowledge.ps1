param(
  [Parameter(Mandatory = $true)][string]$Source,
  [string]$Destination = ''
)

$ErrorActionPreference = 'Stop'

if (-not $Destination) {
  $Destination = Join-Path $PSScriptRoot '..\client\src\knowledge\photobooth'
}

if (-not (Test-Path -LiteralPath $Source)) {
  throw "Obsidian knowledge base not found: $Source"
}

New-Item -ItemType Directory -Force -Path $Destination | Out-Null
Get-ChildItem -LiteralPath $Destination -Filter '*.md' -File | Remove-Item -Force
Get-ChildItem -LiteralPath $Source -Filter '*.md' -File | Copy-Item -Destination $Destination -Force

$count = (Get-ChildItem -LiteralPath $Destination -Filter '*.md' -File).Count
Write-Host "Synced $count knowledge files to $Destination"
