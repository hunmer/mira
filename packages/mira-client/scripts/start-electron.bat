@echo off
chcp 65001 >nul 2>&1
set NODE_OPTIONS=--max-old-space-size=4096
set ELECTRON_ENABLE_LOGGING=1
set FORCE_COLOR=1
electron . --disable-dev-shm-usage --disable-extensions --no-sandbox %*
