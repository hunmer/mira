param([Parameter(Mandatory=$true)][string]$PluginName)

$ErrorActionPreference = 'Stop'

$pluginDir = "D:\mira_typescript\plugins\plugins\$PluginName"
$serverPluginsDir = "D:\mira_typescript\packages\mira-app-server\src\plugins"

if (-not (Test-Path $pluginDir)) {
    Write-Error "Plugin not found: $pluginDir"
    exit 1
}

Write-Host ">>> Building plugin: $PluginName"

Set-Location $pluginDir
npm install
npm run build
npm link

Set-Location $serverPluginsDir
npm link $PluginName

Write-Host ">>> Done: $PluginName linked"
