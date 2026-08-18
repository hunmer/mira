$ErrorActionPreference = 'SilentlyContinue'
$InstallDir = Join-Path $env:LOCALAPPDATA 'Mira\mira-release'
schtasks /End /TN MiraAppServer | Out-Null
schtasks /Delete /TN MiraAppServer /F | Out-Null
$uninstaller = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Programs') -Filter 'Uninstall*.exe' -Recurse | Where-Object { $_.FullName -match 'Mira' } | Select-Object -First 1
if ($uninstaller) { Start-Process $uninstaller.FullName -ArgumentList '/S' -Wait }
foreach ($name in 'FFMPEG_PATH','FFPROBE_PATH','IMAGEMAGICK_PATH','EXIFTOOL_PATH') { [Environment]::SetEnvironmentVariable($name,$null,'User') }
$userPath = [Environment]::GetEnvironmentVariable('Path','User')
if ($userPath) { [Environment]::SetEnvironmentVariable('Path', (($userPath -split ';' | Where-Object { $_ -notmatch 'Mira\\mira-release' }) -join ';'), 'User') }
Remove-Item $InstallDir -Recurse -Force
Write-Host 'Mira 服务和发布包已卸载，用户数据 %USERPROFILE%\.mira-data 已保留。'
