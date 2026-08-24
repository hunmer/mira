$ErrorActionPreference = 'Stop'
Write-Host '[1/7] Checking Node.js ...'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallDir = Join-Path $env:LOCALAPPDATA 'Mira\mira-release'
$NodeVersion = '22.14.0'
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node -or [int]((node -p 'process.versions.node').Split('.')[0]) -lt 18) {
  Write-Host "  Node.js not found or outdated, downloading v$NodeVersion ..."
  $nodeDir = Join-Path $InstallDir 'node'
  $zip = Join-Path $env:TEMP "node-$NodeVersion.zip"
  Invoke-WebRequest "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-win-x64.zip" -OutFile $zip
  $tmp = Join-Path $env:TEMP "mira-node-$([guid]::NewGuid())"
  Write-Host '  Extracting Node.js ...'
  Expand-Archive $zip $tmp -Force
  New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null
  Copy-Item (Join-Path $tmp "node-v$NodeVersion-win-x64\*") $nodeDir -Recurse -Force
  Remove-Item $tmp, $zip -Recurse -Force
  [Environment]::SetEnvironmentVariable('Path', "$nodeDir;$([Environment]::GetEnvironmentVariable('Path','User'))", 'User')
  $node = Join-Path $nodeDir 'node.exe'
  Write-Host '  Node.js installed.'
} else {
  Write-Host "  Node.js found: $node"
}

Write-Host '[2/7] Stopping existing Mira processes ...'
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($InstallDir) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep 1
Remove-Item (Join-Path $InstallDir 'server'), (Join-Path $InstallDir 'runtime-deps') -Recurse -Force -ErrorAction SilentlyContinue

Write-Host '[3/7] Copying server and runtime dependencies (this may take a while) ...'
foreach ($dir in 'server', 'runtime-deps') {
  Write-Host "  Copying $dir ..."
  robocopy (Join-Path $Root $dir) (Join-Path $InstallDir $dir) /E /R:1 /W:1 /XF ffplay.exe /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed to copy $dir (exit code $LASTEXITCODE)" }
}
Copy-Item (Join-Path $Root 'VERSION.json') (Join-Path $InstallDir 'VERSION.json') -Force -ErrorAction SilentlyContinue
$ffmpeg = (Get-ChildItem (Join-Path $InstallDir 'runtime-deps\ffmpeg') -Filter ffmpeg.exe -Recurse | Select-Object -First 1).FullName
$ffprobe = (Get-ChildItem (Join-Path $InstallDir 'runtime-deps\ffmpeg') -Filter ffprobe.exe -Recurse | Select-Object -First 1).FullName
$magick = (Get-ChildItem (Join-Path $InstallDir 'runtime-deps\imagemagick') -Filter magick.exe -Recurse | Select-Object -First 1).FullName
$exiftool = (Get-ChildItem (Join-Path $InstallDir 'runtime-deps\exiftool') -Filter exiftool.exe -Recurse | Select-Object -First 1).FullName
if (-not $ffmpeg -or -not $ffprobe -or -not $magick -or -not $exiftool) { throw 'Runtime dependencies incomplete: ffmpeg/ffprobe/magick/exiftool not found.' }

Write-Host '[4/7] Setting environment variables ...'
foreach ($item in @(@('FFMPEG_PATH',$ffmpeg),@('FFPROBE_PATH',$ffprobe),@('IMAGEMAGICK_PATH',$magick),@('EXIFTOOL_PATH',$exiftool))) { [Environment]::SetEnvironmentVariable($item[0],$item[1],'User') }
$runtimeBins = @((Split-Path $ffmpeg), (Split-Path $magick), (Split-Path $exiftool), (Join-Path $InstallDir 'bin'))
$userPath = [Environment]::GetEnvironmentVariable('Path','User')
foreach ($runtimeBin in $runtimeBins) { if ($userPath -notlike "*$runtimeBin*") { $userPath = "$runtimeBin;$userPath" } }
[Environment]::SetEnvironmentVariable('Path', $userPath, 'User')

Write-Host '[5/7] Registering autostart and starting service ...'
$launcher = Join-Path $InstallDir 'mira-server.cmd'
$command = '"' + $node + '" "' + (Join-Path $InstallDir 'server\mira-app-server\dist\cli.js') + '" start --http-port 8081 --ws-port 8018 --data-path "' + (Join-Path $env:USERPROFILE '.mira-data') + '"'
@('@echo off', "set FFMPEG_PATH=$ffmpeg", "set FFPROBE_PATH=$ffprobe", "set IMAGEMAGICK_PATH=$magick", "set EXIFTOOL_PATH=$exiftool", $command) | Set-Content $launcher -Encoding ASCII

$binDir = Join-Path $InstallDir 'bin'
New-Item -ItemType Directory -Force -Path $binDir | Out-Null
$cliJsPath = Join-Path $InstallDir 'server\mira-app-server\dist\cli.js'
$cliCommand = '"' + $node + '" "' + $cliJsPath + '" %*'
@('@echo off', "set FFMPEG_PATH=$ffmpeg", "set FFPROBE_PATH=$ffprobe", "set IMAGEMAGICK_PATH=$magick", "set EXIFTOOL_PATH=$exiftool", $cliCommand) | Set-Content (Join-Path $binDir 'mira-app-server.cmd') -Encoding ASCII
$ErrorActionPreference = 'Continue'
schtasks /Create /TN MiraAppServer /TR "`"$launcher`"" /SC ONLOGON /RL LIMITED /F 2>$null | Out-Null
$schedOk = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = 'Stop'
if ($schedOk) {
  Write-Host '  Autostart registered via Task Scheduler, starting service ...'
  schtasks /Run /TN MiraAppServer | Out-Null
} else {
  Write-Host '  Task Scheduler unavailable (no admin), using registry Run key ...'
  New-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'MiraAppServer' -Value "`"$launcher`"" -PropertyType String -Force | Out-Null
  Start-Process $launcher -WindowStyle Hidden
}

Write-Host '[6/7] Installing desktop client ...'
$installer = Get-ChildItem (Join-Path $Root 'installer') -Filter *.exe | Select-Object -First 1
if ($installer) { Start-Process $installer.FullName -ArgumentList '/S' -Wait }

Write-Host '[7/7] Initializing library ...'
$cliJs = Join-Path $InstallDir 'server\mira-app-server\dist\cli.js'
$serverUrl = 'http://127.0.0.1:8081'
if (Test-Path $cliJs) {
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    try { Invoke-RestMethod "$serverUrl/health" -TimeoutSec 2 | Out-Null; $ready = $true; break } catch {}
    Start-Sleep 1
  }
  if ($ready) {
    Write-Host '  Opening browser pages ...'
    foreach ($url in 'http://127.0.0.1:8081', 'http://127.0.0.1:8081/dashboard', 'http://miraapp.cc') { Start-Process $url }
    & $node $cliJs login $serverUrl -u admin -p admin123
    if ($LASTEXITCODE -eq 0) {
      $listJson = (& $node $cliJs --json libraries list) | Out-String
      $libs = $null
      try { $libs = $listJson | ConvertFrom-Json } catch {}
      $count = if ($libs) { @($libs).Count } else { 0 }
      if ($count -gt 0) {
        Write-Host "  $count librar(y/ies) already exist, skipping default library creation."
      } else {
        $libPath = Join-Path $env:USERPROFILE 'mira-libraries\my-library'
        New-Item -ItemType Directory -Force -Path $libPath | Out-Null
        $createJson = (& $node $cliJs --json libraries create -n MyLibrary -p $libPath) | Out-String
        $libId = $null
        try { $libId = ($createJson | ConvertFrom-Json).id } catch {}
        if ($libId) { Write-Host "  Default library created: MyLibrary -> $libPath (id=$libId)" }
        else { Write-Host "  Library creation failed, output: $createJson" }
      }
    } else {
      Write-Host '  Login with default credentials failed (password may have been changed), skipping library init.'
    }
  } else {
    Write-Host '  Server not ready in time, skipping library init.'
  }
}
Write-Host 'Mira installation complete.'
