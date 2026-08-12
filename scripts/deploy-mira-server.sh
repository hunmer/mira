#!/usr/bin/env bash
# 一键部署 mira-app-server（Linux / WSL-Ubuntu 主脚本）
# 流程：检查 Node.js → 全局安装 mira-app-server → doctor → 后台启动 → 引导创建第一个素材库
#
# 用法：
#   ./deploy-mira-server.sh                      # 全交互
#   ./deploy-mira-server.sh --auto               # 全自动（默认值）
#   ./deploy-mira-server.sh --name MyLib --path ~/libs/my
#   ./deploy-mira-server.sh --http-port 9090 --ws-port 9019
#
set -uo pipefail

# 排除 Windows interop 路径（/mnt/c...），避免误用到 Windows 版的 node/npm/mira-app-server
# 仅保留 Linux 原生路径，确保工具链一致
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

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

# ============================== 1. Node.js ==============================
if [[ $EUID -ne 0 ]]; then
    warn "未以 root 运行；npm 全局安装 / apt 可能需要 sudo，已自动调用 sudo"
    SUDO="sudo"
else
    SUDO=""
fi
log "步骤 1/5 检查 Node.js"

ensure_node() {
    if command -v node >/dev/null 2>&1; then
        local v; v=$(node -v 2>/dev/null | sed 's/v//')
        local major=${v%%.*}
        if [[ "${major:-0}" -ge 18 ]]; then
            ok "Node $(node -v) 已安装"
            return 0
        fi
        warn "Node 版本过低 ($v)，将安装 Node 20.x"
    fi
    log "通过 NodeSource 安装 Node 20.x ..."
    # 先装基础构建工具（sqlite3 等 native 模块需要 make/g++/python3）
    log "安装构建工具 (build-essential python3 make g++) ..."
    ${SUDO:-} apt-get update -y >/dev/null 2>&1
    ${SUDO:-} apt-get install -y curl ca-certificates build-essential python3 make g++ >/dev/null 2>&1
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | ${SUDO:-} bash - >/dev/null
    elif command -v wget >/dev/null 2>&1; then
        wget -qO- https://deb.nodesource.com/setup_20.x | ${SUDO:-} bash - >/dev/null
    else
        ${SUDO:-} apt-get install -y curl >/dev/null 2>&1
        curl -fsSL https://deb.nodesource.com/setup_20.x | ${SUDO:-} bash - >/dev/null
    fi
    ${SUDO:-} apt-get install -y nodejs >/dev/null
    ok "Node $(node -v) 安装完成"
}

ensure_node || die "Node.js 安装失败"

# npm 全局目录建议用默认（root 装到 /usr/lib），不强求 prefix
if ! command -v npm >/dev/null 2>&1; then die "npm 未找到"; fi
ok "npm $(npm -v)"

# native 模块（sqlite3 等）编译需要 make/g++/python3；缺失则补装
if ! command -v make >/dev/null 2>&1 || ! command -v g++ >/dev/null 2>&1; then
    log "补装构建工具 (native 模块编译需要) ..."
    ${SUDO:-} apt-get update -y >/dev/null 2>&1
    ${SUDO:-} apt-get install -y build-essential python3 make g++ >/dev/null 2>&1 || warn "构建工具安装失败，后续 npm install 可能报错"
fi

# 安装后重新检测实际状态，避免"失败"与"就绪"提示冲突
MAKE_BIN=$(command -v make 2>/dev/null || echo none)
GXX_BIN=$(command -v g++ 2>/dev/null || echo none)
if [[ "$MAKE_BIN" != "none" && "$GXX_BIN" != "none" ]]; then
    ok "构建工具就绪 (make=$MAKE_BIN, g++=$GXX_BIN)"
else
    warn "构建工具仍缺失 (make=$MAKE_BIN, g++=$GXX_BIN)，native 模块编译可能失败"
fi

# ============================== server 进程管理函数（步骤2/4/5 均会用到，提前定义）==============================

# 探测本发行版内是否已有 mira-app-server 进程在跑（不看 Windows 的，避免 WSL interop 误判）
# 注意：不能用 curl localhost 探活 —— WSL2 的 localhost forwarding 会让本脚本误连到 Windows 主机上的同名服务
our_server_running() {
    pgrep -af '[d]ist/(cli|index)\.js' 2>/dev/null | grep -q . && return 0
    pgrep -af 'node.*mira-app-server.*start' 2>/dev/null | grep -v "$$" | grep -q . && return 0
    return 1
}

# 是否有可用的 systemd user 实例（WSL 默认未启用 systemd）
has_systemd_user() {
    command -v systemctl >/dev/null 2>&1 || return 1
    systemctl --user list-units >/dev/null 2>&1
}

# 停止本发行版内的 mira-app-server。
# 优先 `mira-app-server stop`（优雅停 systemd 托管实例，保留开机自启注册）；
# 兜底 pkill 处理 nohup 启动 / 未注册 / 残留进程。
# 安装新版本前、密码重置后都必须先停旧进程：旧进程跑老代码会让新版本无法生效，
# 且旧进程持有 users.db 连接，直写 DB 后读不到新数据。
stop_server() {
    # 1) 优先 CLI stop（处理 systemd 托管实例；未注册时返回非0，无妨）
    if command -v mira-app-server >/dev/null 2>&1; then
        mira-app-server stop >/dev/null 2>&1 || true
    fi
    # 2) 兜底：杀掉 nohup 启动 / 残留进程
    pkill -f '[d]ist/(cli|index)\.js' 2>/dev/null || true
    # 3) 等待进程退出（最多 ~6s）
    for i in $(seq 1 20); do
        our_server_running || break
        sleep 0.3
    done
    if our_server_running; then
        warn "部分 server 进程未在预期时间内退出，可能需要手动 kill"
    else
        ok "已停止旧 server 进程"
    fi
}

# ============================== 2. 安装 mira-app-server ==============================
log "步骤 2/5 安装 mira-app-server"

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

# 已装且可执行则跳过。需校验是 Linux 原生（非 Windows interop 的 /mnt/c/...）
resolve_mira() {
    local p; p=$(command -v mira-app-server 2>/dev/null || true)
    if [[ -z "$p" ]]; then echo ""; return; fi
    if [[ "$p" == /mnt/* ]]; then echo ""; return; fi   # Windows 版，跳过
    echo "$p"
}

# 已安装版本号
get_installed_version() {
    mira-app-server version 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1
}

# 待安装版本号（仅本地构建产物可读；registry 版无法预知，返回空）
get_target_version() {
    [[ -f "$LOCAL_PKG/package.json" ]] \
        && node -e "try{console.log(require('$LOCAL_PKG/package.json').version)}catch{}" 2>/dev/null
}

# 安装前版本对比：决定是否需要安装/更新
NEED_INSTALL=0
INSTALLED_VER=$(get_installed_version)
TARGET_VER=$(get_target_version)
if [[ -z "$INSTALLED_VER" ]]; then
    log "未检测到已安装的 mira-app-server，将首次安装"
    NEED_INSTALL=1
elif [[ -n "$TARGET_VER" && "$INSTALLED_VER" != "$TARGET_VER" ]]; then
    ok "检测到新版本: v$INSTALLED_VER → v$TARGET_VER，将更新"
    NEED_INSTALL=1
else
    ok "mira-app-server 当前版本 v$INSTALLED_VER${TARGET_VER:+（本地构建同版本）}"
    ask_yn "是否强制重新安装?" n && NEED_INSTALL=1
fi

if [[ $NEED_INSTALL -eq 1 ]]; then
    # 安装新版本前必须先 kill 旧进程：否则旧进程继续跑老代码（新版本不生效），
    # 并占用 users.db 连接 / 端口
    if our_server_running; then
        log "安装前停止旧 server 进程 ..."
        stop_server
    fi
    log "npm 全局安装: $INSTALL_TARGET"
    ${SUDO:-} npm install -g --verbose "$INSTALL_TARGET" || die "mira-app-server 安装失败"
    ok "mira-app-server 安装完成"
    INSTALLED=1
fi

# ============================== 3. doctor ==============================
log "步骤 3/5 外部依赖检测 (doctor)"

log "运行: mira-app-server doctor"
# doctor 缺失项会以 exit code 2 退出，不能 set -e
mira-app-server doctor || true

# 重新检测一次判断是否真有缺失（doctor --install 会按平台调用对应包管理器）
MISSING=$(mira-app-server doctor --json 2>/dev/null | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  try{const j=JSON.parse(s);console.log((j.summary&&j.summary.missing||[]).join(","));}catch(e){console.log("");}
});' 2>/dev/null)

# 探测本机包管理器，用于安装提示（避免硬编码 apt）
detect_pkg_mgr() {
    for pm in apt-get apt dnf yum pacman; do
        command -v "$pm" >/dev/null 2>&1 && { echo "$pm"; return; }
    done
    echo ""
}

# 交互式选择软件源镜像（仅 dnf/yum 系有意义）；输出镜像 id 或 host，stdout 返回值
# 菜单文字走 stderr，保证 $(select_mirror) 只捕获选中值
select_mirror() {
    if [[ $AUTO -eq 1 ]]; then echo "official"; return; fi
    echo "请选择软件源镜像（影响 EPEL/RPMFusion 大包下载速度）:" >&2
    echo "  1) 官方源（默认，国内可能较慢）" >&2
    echo "  2) 清华大学 TUNA" >&2
    echo "  3) 中国科学技术大学 USTC" >&2
    echo "  4) 阿里云" >&2
    echo "  5) 自定义域名" >&2
    local choice
    read -rp "选择 [1]: " choice
    case "${choice:-1}" in
        2) echo "tuna" ;;
        3) echo "ustc" ;;
        4) echo "aliyun" ;;
        5) local host; read -rp "请输入镜像域名（如 mirrors.tuna.tsinghua.edu.cn）: " host; echo "${host:-official}" ;;
        *) echo "official" ;;
    esac
}

if [[ -n "$MISSING" && "$MISSING" != "" ]]; then
    warn "缺失: $MISSING"
    PKG_MGR=$(detect_pkg_mgr)
    if ask_yn "是否现在自动安装缺失依赖? (${PKG_MGR:-未知包管理器})" y; then
        # dnf/yum 系：选镜像（影响 EPEL/RPMFusion 大包下载速度）
        MIRROR_ARGS=""
        if [[ "$PKG_MGR" == "dnf" || "$PKG_MGR" == "yum" ]]; then
            MIRROR=$(select_mirror)
            [[ -n "$MIRROR" && "$MIRROR" != "official" ]] && MIRROR_ARGS="--mirror $MIRROR"
        fi
        log "运行: mira-app-server doctor --install $MIRROR_ARGS"
        mira-app-server doctor --install $MIRROR_ARGS || warn "部分依赖可能未能自动安装，可稍后手动补齐"
    else
        warn "跳过自动安装；缩略图/元数据相关功能将不可用"
    fi
else
    ok "外部依赖齐全"
fi

# ============================== 4. 启动 server ==============================
log "步骤 4/5 启动 mira-app-server"

DATA_DIR="${MIRA_DATA_DIR:-$HOME/.mira-data}"
mkdir -p "$DATA_DIR"
RUN_DIR="$HOME/.mira"
mkdir -p "$RUN_DIR"
PID_FILE="$RUN_DIR/mira-server.pid"
LOG_FILE="$RUN_DIR/mira-server.log"
HEALTH_URL="http://127.0.0.1:${HTTP_PORT}/health"
AUTOSTART_USED=0

# 启动 server 并等待 health 就绪（systemd 优先，回退 nohup）。
# 假定调用前已 stop_server 或确认无旧进程在跑。
start_server() {
    if has_systemd_user; then
        # 有 systemd：用 --autostart（注册 user service 并立即启动，开机自启 + 登出后保活）
        log "注册开机自启并启动: mira-app-server start --autostart --http-port $HTTP_PORT --ws-port $WS_PORT"
        : > "$LOG_FILE"
        if ! mira-app-server start --autostart \
                --http-port "$HTTP_PORT" \
                --ws-port "$WS_PORT" \
                --data-path "$DATA_DIR"; then
            err "启动失败，最近日志："
            tail -n 30 "$LOG_FILE" >&2 || true
            die "请检查 $LOG_FILE 或 systemctl --user status mira-app-server"
        fi
        log "等待 server 就绪 (最多 30s) ..."
        READY=0
        for i in $(seq 1 60); do
            if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then READY=1; break; fi
            sleep 0.5
        done
        if [[ $READY -ne 1 ]]; then
            err "server 启动超时，最近日志："
            journalctl --user -u mira-app-server -n 30 --no-pager >&2 2>/dev/null || tail -n 30 "$LOG_FILE" >&2 || true
            die "请检查 systemctl --user status mira-app-server"
        fi
        AUTOSTART_USED=1
        ok "server 已就绪（由 systemd 托管，开机自启）"
    else
        # 无 systemd（WSL 默认等）：回退 nohup 手动管理，不会开机自启
        warn "未检测到可用的 systemd user 实例（WSL 默认未启用 systemd）"
        warn "改用 nohup 启动 —— 进程不会开机自启，重启后需重新运行本脚本"
        if [[ -f "$PID_FILE" ]] && ! kill -0 "$(cat "$PID_FILE" 2>/dev/null)" 2>/dev/null; then
            rm -f "$PID_FILE"
        fi
        : > "$LOG_FILE"
        log "后台启动: mira-app-server start --http-port $HTTP_PORT --ws-port $WS_PORT"
        nohup mira-app-server start \
            --http-port "$HTTP_PORT" \
            --ws-port "$WS_PORT" \
            --data-path "$DATA_DIR" \
            > "$LOG_FILE" 2>&1 &
        NEW_PID=$!
        echo "$NEW_PID" > "$PID_FILE"
        disown 2>/dev/null || true
        log "等待 server 就绪 (最多 30s) ..."
        READY=0
        for i in $(seq 1 60); do
            if ! kill -0 "$NEW_PID" 2>/dev/null; then
                err "server 进程已退出，最近日志："
                tail -n 30 "$LOG_FILE" >&2 || true
                die "启动失败，请检查 $LOG_FILE"
            fi
            if grep -qE 'Mira Server started|listening|ready' "$LOG_FILE" 2>/dev/null \
               && curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
                READY=1; break
            fi
            sleep 0.5
        done
        if [[ $READY -ne 1 ]]; then
            err "server 启动超时，最近日志："
            tail -n 30 "$LOG_FILE" >&2 || true
            die "请检查 $LOG_FILE"
        fi
        ok "server 已就绪 (pid $NEW_PID)"
    fi
}

if [[ "${INSTALLED:-0}" == "1" ]]; then
    # 本次安装/更新了新版本（旧进程已在步骤2停止）→ 启动新进程
    start_server
elif our_server_running && curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
    # 版本相同未重装，进程健康 → 保持运行（无需重启）
    ok "mira-app-server 进程运行中 (v${INSTALLED_VER:-未知})，保持现状"
else
    # 进程未运行 → 启动
    start_server
fi

# ============================== 5. 创建第一个素材库 ==============================
log "步骤 5/5 创建第一个素材库"

log "登录 admin 账号 ..."
ADMIN_USER="admin"

# 用指定密码尝试登录；保留真实错误，避免把连接/profile 等问题误报成密码错误。
login_with() {
    local output attempt
    for attempt in 1 2 3; do
        if output=$(mira-app-server login -u "$ADMIN_USER" -p "$1" -s "http://127.0.0.1:${HTTP_PORT}" 2>&1); then
            return 0
        fi
        [[ $attempt -lt 3 ]] && sleep 1
    done
    err "登录命令失败: ${output:-未知错误}"
    return 1
}

# 隐藏输入读取密码（read -s 不回显）；AUTO 模式返回默认值
ask_pass() {
    local prompt="$1" def="${2:-}" pass
    if [[ $AUTO -eq 1 ]]; then echo "$def"; return; fi
    read -srp "$prompt: " pass
    echo >&2
    echo "$pass"
}

# 登录流程：先用默认密码，失败后让用户选择 手动输入 / 重置密码
do_login() {
    local choice newpass pass
    if login_with "admin123"; then
        ok "登录成功 (默认密码)"
        return 0
    fi
    warn "默认凭据登录未完成（可能是密码、连接或 CLI 配置问题）"
    while true; do
        echo "请选择:" >&2
        echo "  1) 手动输入密码尝试登录" >&2
        echo "  2) 重置 $ADMIN_USER 密码（忘记密码时，直连 users.db 重置）" >&2
        if [[ $AUTO -eq 1 ]]; then choice=2; else read -rp "选择 [1]: " choice || return 1; fi
        case "${choice:-1}" in
            2)
                newpass=$(ask_val "请输入新密码" "admin123")
                log "重置密码: mira-app-server user reset-password -u $ADMIN_USER --data-path $DATA_DIR"
                if mira-app-server user reset-password -u "$ADMIN_USER" -p "$newpass" -d "$DATA_DIR"; then
                    ok "密码已重置（旧登录会话已全部失效）"
                    # reset 直写 users.db，需重启 server 加载新密码
                    log "重启 server 以加载新密码 ..."
                    stop_server
                    start_server
                    if login_with "$newpass"; then ok "登录成功"; return 0; fi
                    warn "重置后登录命令仍失败，请根据上方具体错误处理"
                else
                    err "密码重置失败（registry 版可能不含此命令，需用本地构建产物）"
                fi
                ;;
            *)
                pass=$(ask_pass "请输入 $ADMIN_USER 密码" "")
                if login_with "$pass"; then ok "登录成功"; return 0; fi
                warn "登录命令失败，请根据上方具体错误处理"
                ;;
        esac
    done
}

do_login || die "登录失败，无法继续。可稍后手动: mira-app-server login 或 mira-app-server user reset-password"

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
if [[ "$AUTOSTART_USED" == "1" ]]; then
    echo "  自启配置 : ~/.config/systemd/user/mira-app-server.service"
    echo
    echo "  常用命令:"
    echo "    mira-app-server system health            # 健康检查"
    echo "    mira-app-server libraries list           # 查看素材库"
    echo "    journalctl --user -u mira-app-server -f  # 看日志"
    echo "    systemctl --user stop mira-app-server    # 停止服务"
    echo "    systemctl --user disable mira-app-server # 取消开机自启"
else
    echo "  日志文件 : $LOG_FILE"
    echo "  PID 文件 : $PID_FILE"
    echo
    echo "  常用命令:"
    echo "    mira-app-server system health          # 健康检查"
    echo "    mira-app-server libraries list         # 查看素材库"
    echo "    tail -f $LOG_FILE              # 看日志"
    echo "    kill \$(cat $PID_FILE)          # 停止服务（nohup 模式，不会自启）"
fi
echo "============================================================"
