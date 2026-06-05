#!/bin/bash
set -e

PLUGIN_NAME=${1?$0: missing plugin name}
PLUGIN_DIR="D:/mira_typescript/plugins/plugins/$PLUGIN_NAME"
SERVER_PLUGINS_DIR="D:/mira_typescript/packages/mira-app-server/src/plugins"

echo ">>> Building plugin: $PLUGIN_NAME"

cd "$PLUGIN_DIR"
npm install
npm run build
npm link

cd "$SERVER_PLUGINS_DIR"
npm link "$PLUGIN_NAME"

echo ">>> Done: $PLUGIN_NAME linked"
