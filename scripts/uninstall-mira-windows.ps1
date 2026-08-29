Write-Host '[1/5] Stopping Mira service ...'
$ErrorActionPreference = 'SilentlyContinue'
$MiraRoot = Join-Path $env:ProgramData 'Mira'
$NodeInstallDir = Join-Path $env:ProgramData 'NodeJS'
$NpmGlobalDir = Join-Path $env:ProgramData 'npm-global'
$InstallDir = Join-Path $MiraRoot 'mira-release'
schtasks /End /TN MiraAppServer 2>$null | Out-Null
schtasks /Delete /TN MiraAppServer /F 2>$null | Out-Null
Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'MiraAppServer'
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($InstallDir) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Sleep 2

Write-Host '[2/5] Running application uninstaller ...'
$uninstaller = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Programs') -Filter 'Uninstall*.exe' -Recurse | Where-Object { $_.FullName -match 'Mira' } | Select-Object -First 1
if ($uninstaller) { Start-Process $uninstaller.FullName -ArgumentList '/S' -Wait }

Write-Host '[3/5] Cleaning environment variables ...'
foreach ($name in 'FFMPEG_PATH','FFPROBE_PATH','IMAGEMAGICK_PATH','EXIFTOOL_PATH') { [Environment]::SetEnvironmentVariable($name,$null,'User') }
$userNpmPrefix = [Environment]::GetEnvironmentVariable('NPM_CONFIG_PREFIX','User')
if ($userNpmPrefix -and $userNpmPrefix -like "$NpmGlobalDir*") { [Environment]::SetEnvironmentVariable('NPM_CONFIG_PREFIX',$null,'User') }
$userPath = [Environment]::GetEnvironmentVariable('Path','User')
if ($userPath) { [Environment]::SetEnvironmentVariable('Path', (($userPath -split ';' | Where-Object { $_ -notmatch 'Mira\\mira-release' -and $_ -notmatch 'npm-global' }) -join ';'), 'User') }

Write-Host '[4/5] Removing install directory (this may take a while) ...'
$empty = Join-Path $env:TEMP "mira-uninstall-$([guid]::NewGuid())"
New-Item -ItemType Directory -Force -Path $empty | Out-Null
robocopy $empty $miraRoot /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
Remove-Item $miraRoot, $empty -Recurse -Force

Write-Host '[5/5] Done.'
if (Test-Path $miraRoot) { Write-Warning 'Some files could not be removed (in use by a process). Reboot and run this script again.' } else { Write-Host 'Mira uninstalled. User data preserved.' }
