#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="${HOME}/.mira/mira-release"
NODE_VERSION="22.14.0"
mkdir -p "$INSTALL_DIR"

ensure_node() {
  if command -v node >/dev/null 2>&1 && [[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 18 ]]; then return; fi
  local arch node_arch url tmp
  arch="$(uname -m)"
  [[ "$arch" == arm64 ]] && node_arch=arm64 || node_arch=x64
  url="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-${node_arch}.tar.gz"
  tmp="$(mktemp -d)"
  curl -fL "$url" -o "$tmp/node.tgz"
  mkdir -p "$INSTALL_DIR/node"
  tar -xzf "$tmp/node.tgz" --strip-components=1 -C "$INSTALL_DIR/node"
  rm -rf "$tmp"
  export PATH="$INSTALL_DIR/node/bin:$PATH"
  touch "$HOME/.zprofile"
  grep -qF "$INSTALL_DIR/node/bin" "$HOME/.zprofile" || printf '\nexport PATH="%s:$PATH"\n' "$INSTALL_DIR/node/bin" >> "$HOME/.zprofile"
}

ensure_node
NODE_BIN="$(command -v node)"
export PATH="$INSTALL_DIR/node/bin:$ROOT/runtime-deps/ffmpeg/bin:$ROOT/runtime-deps/imagemagick/bin:$ROOT/runtime-deps/exiftool/bin:$PATH"
export FFMPEG_PATH="$ROOT/runtime-deps/ffmpeg/bin/ffmpeg"
export FFPROBE_PATH="$ROOT/runtime-deps/ffmpeg/bin/ffprobe"
export IMAGEMAGICK_PATH="$ROOT/runtime-deps/imagemagick/bin/magick"
export EXIFTOOL_PATH="$ROOT/runtime-deps/exiftool/bin/exiftool"
export DYLD_LIBRARY_PATH="$ROOT/runtime-deps/ffmpeg/lib:$ROOT/runtime-deps/imagemagick/lib:$ROOT/runtime-deps/exiftool/lib:${DYLD_LIBRARY_PATH:-}"

touch "$HOME/.zprofile"
if ! grep -qF '# Mira bundled runtime' "$HOME/.zprofile"; then
  cat >> "$HOME/.zprofile" <<EOF

# Mira bundled runtime
export PATH="$INSTALL_DIR/node/bin:$INSTALL_DIR/runtime-deps/ffmpeg/bin:$INSTALL_DIR/runtime-deps/imagemagick/bin:$INSTALL_DIR/runtime-deps/exiftool/bin:\$PATH"
export FFMPEG_PATH="$INSTALL_DIR/runtime-deps/ffmpeg/bin/ffmpeg"
export FFPROBE_PATH="$INSTALL_DIR/runtime-deps/ffmpeg/bin/ffprobe"
export IMAGEMAGICK_PATH="$INSTALL_DIR/runtime-deps/imagemagick/bin/magick"
export EXIFTOOL_PATH="$INSTALL_DIR/runtime-deps/exiftool/bin/exiftool"
export DYLD_LIBRARY_PATH="$INSTALL_DIR/runtime-deps/ffmpeg/lib:$INSTALL_DIR/runtime-deps/imagemagick/lib:$INSTALL_DIR/runtime-deps/exiftool/lib:\${DYLD_LIBRARY_PATH:-}"
EOF
fi

rm -rf "$INSTALL_DIR/server" "$INSTALL_DIR/runtime-deps"
cp -R "$ROOT/server" "$INSTALL_DIR/"
cp -R "$ROOT/runtime-deps" "$INSTALL_DIR/"

DMG_ARCH="$(uname -m)"
[[ "$DMG_ARCH" == x86_64 ]] && DMG_ARCH=x64
DMG="$(find "$ROOT/installer" -name "*-mac-${DMG_ARCH}.dmg" -print -quit || true)"
if [[ -n "$DMG" ]]; then
  MOUNT="$(mktemp -d)"
  hdiutil attach "$DMG" -nobrowse -mountpoint "$MOUNT" >/dev/null
  APP="$(find "$MOUNT" -maxdepth 1 -name '*.app' -print -quit)"
  mkdir -p "$HOME/Applications"
  [[ -n "$APP" ]] && ditto "$APP" "$HOME/Applications/$(basename "$APP")"
  hdiutil detach "$MOUNT" >/dev/null || true
  rmdir "$MOUNT" 2>/dev/null || true
fi

PLIST="$HOME/Library/LaunchAgents/com.mira.app-server.plist"
mkdir -p "$(dirname "$PLIST")" "$HOME/.mira"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.mira.app-server</string>
<key>ProgramArguments</key><array><string>$NODE_BIN</string><string>$INSTALL_DIR/server/mira-app-server/dist/cli.js</string><string>start</string><string>--http-port</string><string>8081</string><string>--ws-port</string><string>8018</string><string>--data-path</string><string>$HOME/.mira-data</string></array>
<key>EnvironmentVariables</key><dict><key>PATH</key><string>$INSTALL_DIR/node/bin:$INSTALL_DIR/runtime-deps/ffmpeg/bin:$INSTALL_DIR/runtime-deps/imagemagick/bin:$INSTALL_DIR/runtime-deps/exiftool/bin:/usr/bin:/bin</string><key>FFMPEG_PATH</key><string>$INSTALL_DIR/runtime-deps/ffmpeg/bin/ffmpeg</string><key>FFPROBE_PATH</key><string>$INSTALL_DIR/runtime-deps/ffmpeg/bin/ffprobe</string><key>IMAGEMAGICK_PATH</key><string>$INSTALL_DIR/runtime-deps/imagemagick/bin/magick</string><key>EXIFTOOL_PATH</key><string>$INSTALL_DIR/runtime-deps/exiftool/bin/exiftool</string><key>DYLD_LIBRARY_PATH</key><string>$INSTALL_DIR/runtime-deps/ffmpeg/lib:$INSTALL_DIR/runtime-deps/imagemagick/lib:$INSTALL_DIR/runtime-deps/exiftool/lib</string></dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>StandardOutPath</key><string>$HOME/.mira/mira-server.out.log</string><key>StandardErrorPath</key><string>$HOME/.mira/mira-server.err.log</string>
</dict></plist>
EOF
launchctl bootout "gui/$(id -u)/com.mira.app-server" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Mira 安装完成，服务已注册为登录自启动。"
