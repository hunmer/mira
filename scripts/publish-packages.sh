#!/usr/bin/env bash
# 批量发布 mira workspace 的公开包:core -> server
# 依赖顺序:server 依赖 core (workspace:*),故 core 先发。
#
# 用法(在交互终端执行):
#   cd /Users/Zhuanz/Documents/mira
#   ./scripts/publish-packages.sh
#
# OTP: 若账号开启 2FA,pnpm 会在发布时提示输入 6 位码,或自动打开浏览器授权。
# 可选参数:
#   ./scripts/publish-packages.sh core          # 只发 core
#   ./scripts/publish-packages.sh core server   # 显式指定(默认)

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ---- 1. 登录状态检查 ----
echo "==> 检查 npm 登录状态..."
REGISTRY=$(npm config get registry)
if [ "$REGISTRY" != "https://registry.npmjs.org/" ]; then
  echo "    ! 当前 registry 非官方: $REGISTRY"
  read -p "    切换到官方并继续? (y/N) " ans
  [ "$ans" = "y" ] || exit 1
  npm config set registry https://registry.npmjs.org/
fi

if ! NPM_USER=$(npm whoami 2>/dev/null); then
  echo "    未登录,开始 web 授权登录(浏览器会自动打开)..."
  npm login --auth-type=web
  NPM_USER=$(npm whoami)
fi
echo "    已登录:$NPM_USER  (registry: $(npm config get registry))"
echo

# ---- 2. 待发布包(按依赖顺序;可被参数覆盖)----
# 默认 core server;支持参数覆盖,如:./publish-packages.sh core
set -- ${@:-core server}
PACKAGES=("$@")
# 短名 -> 实际目录名映射(用 case,兼容 macOS 自带 bash 3.2)
dir_of() {
  case "$1" in
    core)   echo "mira-app-core" ;;
    server) echo "mira-app-server" ;;
    *)      echo "$1" ;;
  esac
}

# ---- 3. 逐个 build + publish ----
for SHORT in "${PACKAGES[@]}"; do
  PKG="$(dir_of "$SHORT")"
  DIR="packages/$PKG"
  PKGJSON="$DIR/package.json"
  [ -f "$PKGJSON" ] || { echo "    ! 跳过 $SHORT: 找不到 $PKGJSON"; continue; }

  NAME=$(node -p "require('./$PKGJSON').name")
  VERSION=$(node -p "require('./$PKGJSON').version")
  PRIVATE=$(node -p "!!require('./$PKGJSON').private")

  echo "================================================ =="
  echo "==> [$SHORT] $NAME@$VERSION"
  echo "================================================ =="

  if [ "$PRIVATE" = "true" ]; then
    echo "    跳过: private 包不可发布"
    continue
  fi

  # 已发布检查(避免无谓 build 后才被拒)
  if npm view "$NAME@$VERSION" >/dev/null 2>&1; then
    echo "    ! 警告:$NAME@$VERSION 已在 npm 上存在,发布会被拒绝(E403)。"
    echo "      请先 bump 版本号再跑。跳过此包。"
    continue
  fi

  echo "    [1/2] build..."
  pnpm --filter "$NAME" run build
  echo "    [2/2] publish..."
  pnpm --filter "$NAME" publish --no-git-checks --access public
  echo "    done $NAME@$VERSION"
  echo

  sleep 2
  if npm view "$NAME@$VERSION" >/dev/null 2>&1; then
    echo "    npm view 确认已上架"
  else
    echo "    ! 警告:npm view 未查到,可能仍在同步,稍后再查"
  fi
  echo
done

echo "======================================== =="
echo "完成:"
for SHORT in "${PACKAGES[@]}"; do
  PKG="${DIRMAP[$SHORT]:-$SHORT}"
  PKGJSON="packages/$PKG/package.json"
  [ -f "$PKGJSON" ] && echo "  $(node -p "require('./$PKGJSON').name")@$(node -p "require('./$PKGJSON').version")"
done
echo "======================================== =="
