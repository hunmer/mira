$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallDir = Join-Path $env:LOCALAPPDATA 'Mira\mira-release'
$NodeVersion = '22.14.0'
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node -or [int](node -p 'process.versions.node.split(".")[0]') -lt 18) {
  $nodeDir = Join-Path $InstallDir 'node'
  $zip = Join-Path $env:TEMP "node-$NodeVersion.zip"
  Invoke-WebRequest "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-win-x64.zip" -OutFile $zip
  $tmp = Join-Path $env:TEMP "mira-node-$([guid]::NewGuid())"
  Expand-Archive $zip $tmp -Force
  New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null
  Copy-Item (Join-Path $tmp "node-v$NodeVersion-win-x64\*") $nodeDir -Recurse -Force
  Remove-Item $tmp, $zip -Recurse -Force
  [Environment]::SetEnvironmentVariable('Path', "$nodeDir;$([Environment]::GetEnvironmentVariable('Path','User'))", 'User')
  $node = Get-Item (Join-Path $nodeDir 'node.exe')
}

Remove-Item (Join-Path $InstallDir 'server'), (Join-Path $InstallDir 'runtime-deps') -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $Root 'server') (Join-Path $InstallDir 'server') -Recurse -Force
Copy-Item (Join-Path $Root 'runtime-deps') (Join-Path $InstallDir 'runtime-deps') -Recurse -Force
$ffmpeg = (Get-ChildItem (Join-Path $InstallDir 'runtime-deps\ffmpeg') -Filter ffmpeg.exe -Recurse | Select-Object -First 1).FullName
$ffprobe = (Get-ChildItem (Join-Path $InstallDir 'runtime-deps\ffmpeg') -Filter ffprobe.exe -Recurse | Select-Object -First 1).FullName
$magick = (Get-ChildItem (Join-Path $InstallDir 'runtime-deps\imagemagick') -Filter magick.exe -Recurse | Select-Object -First 1).FullName
$exiftool = (Get-ChildItem (Join-Path $InstallDir 'runtime-deps\exiftool') -Filter exiftool.exe -Recurse | Select-Object -First 1).FullName
if (-not $ffmpeg -or -not $ffprobe -or -not $magick -or -not $exiftool) { throw '运行时依赖不完整：ffmpeg/ffprobe/magick/exiftool 未全部找到。' }
foreach ($item in @(@('FFMPEG_PATH',$ffmpeg),@('FFPROBE_PATH',$ffprobe),@('IMAGEMAGICK_PATH',$magick),@('EXIFTOOL_PATH',$exiftool))) { [Environment]::SetEnvironmentVariable($item[0],$item[1],'User') }
$runtimeBins = @((Split-Path $ffmpeg), (Split-Path $magick), (Split-Path $exiftool))
$userPath = [Environment]::GetEnvironmentVariable('Path','User')
foreach ($runtimeBin in $runtimeBins) { if ($userPath -notlike "*$runtimeBin*") { $userPath = "$runtimeBin;$userPath" } }
[Environment]::SetEnvironmentVariable('Path', $userPath, 'User')

$launcher = Join-Path $InstallDir 'mira-server.cmd'
$command = '"' + $node.FullName + '" "' + (Join-Path $InstallDir 'server\mira-app-server\dist\cli.js') + '" start --http-port 8081 --ws-port 8018 --data-path "' + (Join-Path $env:USERPROFILE '.mira-data') + '"'
@('@echo off', "set FFMPEG_PATH=$ffmpeg", "set FFPROBE_PATH=$ffprobe", "set IMAGEMAGICK_PATH=$magick", "set EXIFTOOL_PATH=$exiftool", $command) | Set-Content $launcher -Encoding ASCII
schtasks /Create /TN MiraAppServer /TR "`"$launcher`"" /SC ONLOGON /RL LIMITED /F | Out-Null
schtasks /Run /TN MiraAppServer | Out-Null
$installer = Get-ChildItem (Join-Path $Root 'installer') -Filter *.exe | Select-Object -First 1
if ($installer) { Start-Process $installer.FullName -ArgumentList '/S' -Wait }
Write-Host 'Mira 安装完成，服务已注册为登录自启动。'
