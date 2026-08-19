param(
  [string]$Repo = 'hunmer/mira',
  [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$InstallDir = Join-Path $env:LOCALAPPDATA 'Mira\mira-release'

Write-Host '[1/4] Reading local version ...'
$localRelease = $null
$localServer = $null
$versionFile = Join-Path $InstallDir 'VERSION.json'
if (Test-Path $versionFile) {
  $version = Get-Content $versionFile -Raw | ConvertFrom-Json
  $localRelease = $version.release
  $localServer = $version.server
}
$serverPkg = Join-Path $InstallDir 'server\mira-app-server\package.json'
if (-not $localServer -and (Test-Path $serverPkg)) { $localServer = (Get-Content $serverPkg -Raw | ConvertFrom-Json).version }

$localReleaseText = if ($localRelease) { $localRelease } else { 'not installed' }
$localServerText = if ($localServer) { $localServer } else { 'unknown' }
Write-Host ("  Local : release={0} server={1}" -f $localReleaseText, $localServerText)

Write-Host "[2/4] Querying latest release from GitHub ($Repo) ..."
$headers = @{ 'User-Agent' = 'mira-update-check' }
if ($env:GITHUB_TOKEN) { $headers['Authorization'] = "token $env:GITHUB_TOKEN" }
$release = Invoke-RestMethod "https://api.github.com/repos/$Repo/releases/latest" -Headers $headers -TimeoutSec 30
$asset = $release.assets | Where-Object { $_.name -like 'mira-windows-*.zip' } | Select-Object -First 1
Write-Host ("  Latest: release={0}" -f $release.tag_name)

if (-not $asset) {
  Write-Host '  Latest release has no Windows server bundle (mira-windows-*.zip). Nothing to update.'
  return
}
if ($localRelease -eq $release.tag_name -and (Test-Path (Join-Path $InstallDir 'server\mira-app-server\dist\cli.js'))) {
  Write-Host 'Already up to date.'
  return
}

Write-Host ("Update available: {0} -> {1} (mira-app-server will be updated)" -f $localReleaseText, $release.tag_name)
if ($CheckOnly) { return }

Write-Host "[3/4] Downloading and extracting $($asset.name) ..."
$zip = Join-Path $env:TEMP $asset.name
Invoke-WebRequest $asset.browser_download_url -OutFile $zip -UseBasicParsing
$tmp = Join-Path $env:TEMP ("mira-update-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
& "$env:SystemRoot\System32\tar.exe" -xf $zip -C $tmp
if ($LASTEXITCODE -ne 0) { throw "tar extraction failed (exit code $LASTEXITCODE)" }

$installer = Get-ChildItem $tmp -Filter 'install-mira-windows.ps1' -Recurse | Select-Object -First 1
if (-not $installer) { throw 'install-mira-windows.ps1 not found in update package' }

Write-Host '[4/4] Running installer ...'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer.FullName

$empty = Join-Path $env:TEMP ("mira-empty-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $empty | Out-Null
robocopy $empty $tmp /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
Remove-Item $tmp, $empty, $zip -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Update complete: $localReleaseText -> $($release.tag_name)"
