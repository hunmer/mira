#!/usr/bin/env bash
# 一键部署 mira-app-server（macOS 主脚本）
# 流程：环境检查 → 全局安装 mira-app-server → doctor → 后台启动 → 引导创建第一个素材库
#
# 用法：
#   ./deploy-mira-server-macos.sh                      # 全交互
#   ./deploy-mira-server-macos.sh --auto               # 全自动（默认值）
#   ./deploy-mira-server-macos.sh --name MyLib --path ~/libs/my
#   ./deploy-mira-server-macos.sh --http-port 9090 --ws-port 9019
#
set -uo pipefail

# macOS：保留用户当前 PATH，仅补齐常见可执行目录（不覆盖，避免破坏 nvm/homebrew）
case ":${PATH}:" in
    *":/opt/homebrew/bin:"*) ;;                            # 已含 Apple Silicon homebrew
    *) export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH}" ;;  # 补上 homebrew + /usr/local/bin
esac

# ============================== 参数解析 ==============================
HTTP_PORT="8081"
WS_PORT="8018"
LIB_NAME=""
LIB_PATH=""
AUTO=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --http-port) HTTP_PORT="$2"; shift 2 ;;
        --ws-port)   WS_PORT="$2";   shift 2 ;;
        --name)      LIB_NAME="$2";  shift 2 ;;
        --path)      LIB_PATH="$2";  shift 2 ;;
        --auto)      AUTO=1; shift ;;
        -h|--help)
            sed -n '2,12p' "$0"
            exit 0 ;;
        *) echo "⚠️  未知参数: $1"; shift ;;
    esac
done

# ============================== 工具函数 ==============================
log()  { printf '\033[36m[%s]\033[0m %s\n' "$(date +%H:%M:%S)" "$*"; }
ok()   { printf '\033[32m✅ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m⚠️  %s\033[0m\n' "$*"; }
err()  { printf '\033[31m❌ %s\033[0m\n' "$*" >&2; }
die()  { err "$*"; exit 1; }

ask_yn() { # ask_yn <prompt> <default(y|n)>
    local prompt="$1" default="${2:-y}" reply
    if [[ $AUTO -eq 1 ]]; then
        [[ "$default" == "y" ]] && return 0 || return 1
    fi
    local hint; [[ "$default" == "y" ]] && hint="[Y/n]" || hint="[y/N]"
    read -rp "$prompt $hint " reply
    reply="${reply:-$default}"
    [[ "$reply" =~ ^[Yy]$ ]]
}

ask_val() { # ask_val <prompt> <default>
    local prompt="$1" default="$2" reply
    if [[ $AUTO -eq 1 ]]; then
        echo "$default"; return
    fi
    read -rp "$prompt [$default]: " reply
    echo "${reply:-$default}"
}

# ============================== 1. 环境断言 ==============================
log "步骤 1/6 环境检查"

if [[ "$(uname -s)" != "Darwin" ]]; then
    err "本脚本为 macOS 设计（当前: $(uname -sr)）"
    err "Linux/WSL 请改用 ./scripts/deploy-mira-server.sh"
    die "已取消"
fi
ok "macOS $(sw_vers -productVersion 2>/dev/null || echo) / $(uname -m)"

# macOS 的 npm 全局目录（homebrew 或 nvm）通常归当前用户所有，不需要 sudo
if [[ $EUID -eq 0 ]]; then
    warn "不建议以 root 运行 npm 全局安装，可能破坏 homebrew 目录权限"
    ask_yn "仍然继续吗?" n || die "已取消"
fi

# ============================== 2. Node.js ==============================
log "步骤 2/6 检查 Node.js"

ensure_node() {
    if command -v node >/dev/null 2>&1; then
        local v; v=$(node -v 2>/dev/null | sed 's/v//')
        local major=${v%%.*}
        if [[ "${major:-0}" -ge 18 ]]; then
            ok "Node $(node -v) 已安装 ($(command -v node))"
            return 0
        fi
        warn "Node 版本过低 ($v)，需要 >= 18"
    fi

    # 优先用 Homebrew 装
    if command -v brew >/dev/null 2>&1; then
        log "通过 Homebrew 安装 Node ..."
        brew install node || die "brew install node 失败"
        ok "Node $(node -v) 安装完成"
        return 0
    fi

    err "未检测到 Node.js，也未找到 Homebrew"
    err "请先安装 Node >= 18，任选其一："
    err "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"  # 装 Homebrew"
    err "  brew install node        # 已有 Homebrew"
    err "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash        # 或用 nvm"
    return 1
}

ensure_node || die "Node.js 不可用"

if ! command -v npm >/dev/null 2>&1; then die "npm 未找到"; fi
ok "npm $(npm -v)"

# native 模块（sqlite3 等）若触发源码编译，需要 Xcode Command Line Tools
# （多数情况下 sqlite3 会下载预编译二进制，可不必安装；这里仅检测并提示）
if ! xcode-select -p >/dev/null 2>&1; then
    warn "未检测到 Xcode Command Line Tools（仅当 native 模块需要源码编译时才必需）"
    warn "如后续 npm install 报编译错误，请运行：xcode-select --install"
else
    ok "Xcode Command Line Tools 就绪"
fi

# ============================== 3. 安装 mira-app-server ==============================
log "步骤 3/6 安装 mira-app-server"

# 优先用本地仓库 build 产物（含最新改动，如 --autostart）；否则回退 npm registry 版
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_PKG="$REPO_ROOT/packages/mira-app-server"
if [[ -f "$LOCAL_PKG/dist/cli.js" ]]; then
    INSTALL_TARGET="$LOCAL_PKG"
    log "使用本地仓库构建产物: $INSTALL_TARGET（含最新 --autostart 等改动）"
    log "若源码有更新，请先在 packages/mira-app-server 执行 pnpm run build"
else
    warn "未找到本地构建产物 ($LOCAL_PKG/dist/cli.js)，回退 npm registry 版"
    warn "registry 版可能不含 --autostart 等本地新增功能"
    INSTALL_TARGET="mira-app-server"
fi

if command -v mira-app-server >/dev/null 2>&1; then
    ok "mira-app-server 已存在: $(mira-app-server version 2>/dev/null | head -1)"
    ask_yn "是否卸载后重装?" n || { log "跳过安装"; SKIP_INSTALL=1; }
fi

if [[ "${SKIP_INSTALL:-0}" != "1" ]]; then
    log "npm 全局安装: $INSTALL_TARGET"
    npm install -g "$INSTALL_TARGET" || die "mira-app-server 安装失败"
    ok "mira-app-server 安装完成 ($(mira-app-server version 2>/dev/null | head -1))"
fi

# ============================== 4. doctor ==============================
log "步骤 4/6 外部依赖检测 (doctor)"

log "运行: mira-app-server doctor"
# doctor 缺失项会以非 0 退出，不能 set -e
mira-app-server doctor || true

# 重新检测一次判断是否真有缺失（doctor --install 在 macOS 上会调用 brew）
MISSING=$(mira-app-server doctor --json 2>/dev/null | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  try{const j=JSON.parse(s);console.log((j.summary&&j.summary.missing||[]).join(","));}catch(e){console.log("");}
});' 2>/dev/null)

if [[ -n "$MISSING" && "$MISSING" != "" ]]; then
    warn "缺失: $MISSING"
    if ask_yn "是否现在自动安装缺失依赖? (brew)" y; then
        log "运行: mira-app-server doctor --install"
        mira-app-server doctor --install || warn "部分依赖可能未能自动安装，可稍后手动补齐 (brew install ...)"
    else
        warn "跳过自动安装；缩略图/元数据相关功能将不可用"
    fi
else
    ok "外部依赖齐全"
fi

# ============================== 5. 启动 server（开机自启模式） ==============================
log "步骤 5/6 启动 mira-app-server（--autostart）"

DATA_DIR="${MIRA_DATA_DIR:-$HOME/.mira-data}"
mkdir -p "$DATA_DIR"
RUN_DIR="$HOME/.mira"
mkdir -p "$RUN_DIR"
# launchd 托管实例的标准输出/错误由 plist 重定向到这里（见 cli/autostart.ts 的 plist 配置）
LOG_FILE="$RUN_DIR/mira-server.out.log"
ERR_LOG_FILE="$RUN_DIR/mira-server.err.log"
HEALTH_URL="http://127.0.0.1:${HTTP_PORT}/health"

if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
    ok "检测到 mira-app-server 已在运行且 health 正常，跳过启动"
else
    log "注册开机自启并启动: mira-app-server start --autostart --http-port $HTTP_PORT --ws-port $WS_PORT"
    # --autostart：CLI 注册 LaunchAgent 并由 launchd 拉起实例，注册完成后进程退出
    if ! mira-app-server start --autostart \
            --http-port "$HTTP_PORT" \
            --ws-port "$WS_PORT" \
            --data-path "$DATA_DIR"; then
        err "启动失败，最近错误日志："
        tail -n 30 "$ERR_LOG_FILE" >&2 2>/dev/null || true
        die "请检查 $ERR_LOG_FILE 或 $LOG_FILE"
    fi

    log "等待 server 就绪 (最多 30s) ..."
    READY=0
    for i in {1..60}; do
        if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
            READY=1; break
        fi
        sleep 0.5
    done
    if [[ $READY -ne 1 ]]; then
        err "server 启动超时，最近日志："
        tail -n 30 "$ERR_LOG_FILE" >&2 2>/dev/null || true
        die "请检查 $ERR_LOG_FILE 或 $LOG_FILE"
    fi
    ok "server 已就绪（由 launchd 托管，登录后自动启动）"
fi

# ============================== 6. 创建第一个素材库 ==============================
log "步骤 6/6 创建第一个素材库"

log "登录 admin 账号 ..."
if ! mira-app-server login -u admin -p admin123 -s "http://localhost:${HTTP_PORT}" >/dev/null 2>&1; then
    warn "登录失败（server 启动日志里的初始密码可能已变）"
    warn "可稍后手动执行: mira-app-server login"
fi

# 列出现有库
EXISTING_COUNT=$(mira-app-server --json libraries list 2>/dev/null \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).length||0);}catch(e){console.log(0);}});' 2>/dev/null | tr -d '\n\r ' || echo 0)
EXISTING_COUNT=${EXISTING_COUNT:-0}
EXISTING_COUNT=${EXISTING_COUNT//[^0-9]/0}
[[ "$EXISTING_COUNT" =~ ^[0-9]+$ ]] || EXISTING_COUNT=0

if [[ "$EXISTING_COUNT" -gt 0 ]]; then
    ok "已存在 $EXISTING_COUNT 个素材库："
    mira-app-server libraries list || true
    if ! ask_yn "是否再创建一个新素材库?" n; then
        log "跳过创建。"
        print_summary_done=1
    fi
fi

if [[ "${print_summary_done:-0}" != "1" ]]; then
    DEFAULT_NAME="MyLibrary"
    DEFAULT_PATH="$HOME/mira-libraries/my-library"
    LIB_NAME=$(ask_val "请输入素材库名称" "${LIB_NAME:-$DEFAULT_NAME}")
    LIB_PATH=$(ask_val "请输入素材库磁盘路径" "${LIB_PATH:-$DEFAULT_PATH}")

    # 展开 ~ 与环境变量
    LIB_PATH="${LIB_PATH/#\~/$HOME}"
    mkdir -p "$LIB_PATH"

    log "创建素材库: $LIB_NAME -> $LIB_PATH"
    CREATE_OUT=$(mira-app-server --json libraries create -n "$LIB_NAME" -p "$LIB_PATH" 2>&1)
    LIB_ID=$(echo "$CREATE_OUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.id||"");}catch(e){console.log("");}});' 2>/dev/null)

    if [[ -n "$LIB_ID" ]]; then
        ok "素材库创建成功 (id=$LIB_ID)，已自动启动"
    else
        warn "创建可能失败，原始输出："
        echo "$CREATE_OUT"
    fi
fi

# ============================== 总结 ==============================
echo
echo "============================================================"
ok "Mira Server 部署完成！"
echo
echo "  访问地址 : http://localhost:${HTTP_PORT}"
echo "  WebSocket: ws://localhost:${WS_PORT}"
echo "  默认账号 : admin / admin123  （请尽快修改密码）"
echo "  数据目录 : $DATA_DIR"
echo "  日志文件 : $LOG_FILE"
echo "  错误日志 : $ERR_LOG_FILE"
echo "  自启配置 : ~/Library/LaunchAgents/com.mira.app-server.plist"
echo
echo "  常用命令:"
echo "    mira-app-server system health          # 健康检查"
echo "    mira-app-server libraries list         # 查看素材库"
echo "    tail -f $ERR_LOG_FILE          # 看日志"
echo "    launchctl bootout gui/\$(id -u)/com.mira.app-server   # 停止服务"
echo "    launchctl bootstrap gui/\$(id -u) ~/Library/LaunchAgents/com.mira.app-server.plist  # 再次启动"
echo "============================================================"
