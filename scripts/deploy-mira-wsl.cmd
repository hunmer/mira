@echo off
REM 双击启动器：以非交互策略调起 PowerShell 脚本，并透传所有参数
REM 用法：双击本文件，或命令行 deploy-mira-wsl.cmd --auto --name Demo
setlocal
set "PS1=%~dp0deploy-mira-wsl.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" %*
endlocal
