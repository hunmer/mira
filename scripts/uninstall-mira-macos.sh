#!/usr/bin/env bash
set -euo pipefail
INSTALL_DIR="${HOME}/.mira/mira-release"
PLIST="$HOME/Library/LaunchAgents/com.mira.app-server.plist"
launchctl bootout "gui/$(id -u)/com.mira.app-server" 2>/dev/null || true
rm -f "$PLIST"
rm -rf "$INSTALL_DIR"
rm -rf "/Applications/Mira Media Library.app" "$HOME/Applications/Mira Media Library.app"
if [[ -f "$HOME/.zprofile" ]]; then
  tmp="$(mktemp)"
  awk '/# Mira bundled runtime/{skip=1; next} skip && /^export DYLD_LIBRARY_PATH=/{skip=0; next} !skip && $0 !~ /mira-release\/node\/bin/{print}' "$HOME/.zprofile" > "$tmp"
  mv "$tmp" "$HOME/.zprofile"
fi
echo "Mira 服务和发布包已卸载，用户数据 ~/.mira-data 已保留。"
