<#
.SYNOPSIS
  Windows one-click entry: auto install/init Ubuntu WSL distro, then run deploy-mira-server.sh
.DESCRIPTION
  - Checks WSL2 enabled
  - Checks for an "Ubuntu*" distro; installs one via `wsl --install -d Ubuntu --no-launch` if missing
  - Initializes the distro as root (non-interactive)
  - Runs deploy-mira-server.sh (same folder) inside Ubuntu, forwarding all args
.EXAMPLE
  .\deploy-mira-wsl.ps1
  .\deploy-mira-wsl.ps1 --auto --name DemoLib --path ~/mira-libraries/demo
#>
[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ScriptArgs
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
try { $OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[!]  $msg" -ForegroundColor Yellow }
function Die($msg) { Write-Host "[X]  $msg" -ForegroundColor Red; exit 1 }

# --- 1. WSL availability ---
Write-Step 'Checking WSL'
$wslExe = Get-Command wsl.exe -ErrorAction SilentlyContinue
if (-not $wslExe) { Die 'wsl.exe not found. Enable WSL first (admin PowerShell: wsl --install).' }

function Get-WslDistros {
    # wsl --list emits UTF-16LE; PowerShell's `>` writes UTF-16 too.
    # We capture raw stdout via a temp file and decode manually to be safe.
    $tmp = Join-Path $env:TEMP ("wsl_list_" + [guid]::NewGuid().ToString('N') + '.txt')
    try {
        & wsl.exe --list --quiet 2>$null | Out-File -FilePath $tmp -Encoding unicode
        $text = Get-Content -Path $tmp -Raw -Encoding unicode
        return ($text -split "`n" | ForEach-Object { ($_ -replace "`0","").Trim() } | Where-Object { $_ })
    } finally {
        Remove-Item $tmp -ErrorAction SilentlyContinue
    }
}

$distros = Get-WslDistros
Write-Host "Installed distros: $($distros -join ', ')"

# --- 2. Pick or install Ubuntu ---
$target = $null
foreach ($d in $distros) { if ($d -match '^Ubuntu') { $target = $d; break } }

if (-not $target) {
    Write-Warn 'No Ubuntu distro found. Installing (first run is slow)...'
    Write-Step 'wsl --install -d Ubuntu --no-launch'
    & wsl.exe --install -d Ubuntu --no-launch
    if ($LASTEXITCODE -ne 0) {
        Write-Host ''
        Write-Warn 'Install failed. Common causes:'
        Write-Host '  1) Not running as admin. Re-open PowerShell as Administrator and retry.'
        Write-Host '  2) WSL kernel outdated. Run: wsl --update'
        Write-Host '  3) Microsoft Store unavailable. Try: wsl --install -d Ubuntu --web-download'
        Die 'Ubuntu distro install failed.'
    }
    $distros = Get-WslDistros
    foreach ($d in $distros) { if ($d -match '^Ubuntu') { $target = $d; break } }
    if (-not $target) { Die "Still cannot find Ubuntu after install. Installed: $($distros -join ', ')" }
}

Write-Ok "Target distro: $target"

# --- 3. First-time init as root (non-interactive) ---
Write-Step 'First-time init (root)'
& wsl.exe -d $target -u root -- bash -lc 'echo ok' | Out-Null
if ($LASTEXITCODE -ne 0) {
    Die "Cannot enter $target as root. Run manually first: wsl -d $target"
}

# --- 4. Locate deploy-mira-server.sh and map to /mnt path ---
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }
$shLocal = Join-Path $scriptDir 'deploy-mira-server.sh'
if (-not (Test-Path $shLocal)) { Die "deploy-mira-server.sh not found next to this script: $shLocal" }

# D:\foo\bar -> /mnt/d/foo/bar
$drive = $scriptDir.Substring(0,1).ToLower()
$rest  = $scriptDir.Substring(2) -replace '\\','/'
$shWsl = "/mnt/$drive$rest/deploy-mira-server.sh"
Write-Host "Bash script (WSL path): $shWsl"

# --- 5. Forward args ---
# Pass-through. MSYS path mangling (e.g. /root -> D:\...\root) only happens in
# Git Bash, not in native PowerShell, so no special handling needed here.
# Args containing spaces are single-quoted.
$passArgs = ''
if ($ScriptArgs -and $ScriptArgs.Count -gt 0) {
    $escaped = $ScriptArgs | ForEach-Object {
        if ($_ -match '\s') { "'$_'" } else { "$_" }
    }
    $passArgs = $escaped -join ' '
}
Write-Host "Forwarding args: $passArgs"

# --- 6. Run ---
Write-Step 'Running deploy-mira-server.sh inside Ubuntu WSL'
& wsl.exe -d $target -u root -- bash -lc "bash '$shWsl' $passArgs"
$code = $LASTEXITCODE

Write-Host ''
if ($code -eq 0) {
    Write-Ok 'Deployment finished.'
} else {
    Die "Deploy script exited with code: $code"
}

Write-Host ''
Write-Host 'Tips:' -ForegroundColor DarkGray
Write-Host '  - Server listens on http://localhost:8081 ; WSL2 forwards it to Windows host.' -ForegroundColor DarkGray
Write-Host '  - Re-run this script any time (idempotent).' -ForegroundColor DarkGray
$stopCmd = 'wsl -d ' + $target + ' -u root -- bash -lc "kill `$(cat ~/.mira/mira-server.pid)"'
Write-Host ('  - Stop server: ' + $stopCmd) -ForegroundColor DarkGray
