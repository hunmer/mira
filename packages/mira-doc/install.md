# 安装

Mira Server 通过 npm 安装，安装后即可全局使用 `mira-app-server` 命令。

## 一键脚本安装（推荐）

各平台提供部署脚本，一条命令完成：**全局安装 → `doctor` 检测依赖 → 后台启动 → 引导创建第一个素材库**。脚本源码位于仓库 [`scripts/`](https://github.com/hunmer/mira/tree/main/scripts)，可先查阅后再执行。

| 平台 | 脚本 | 说明 |
|------|------|------|
| Linux / WSL-Ubuntu | `deploy-mira-server.sh` | 主脚本，适用于原生 Linux 与 WSL |
| macOS | `deploy-mira-server-macos.sh` | 兼容 Homebrew（Apple Silicon / Intel） |
| Windows | `deploy-mira-wsl.ps1` | 自动安装并初始化 Ubuntu WSL，再调用上面的主脚本 |

### 执行

::: code-group

```bash [Linux]
curl -fsSL https://raw.githubusercontent.com/hunmer/mira/refs/heads/main/scripts/deploy-mira-server.sh | bash
```

```bash [macOS]
curl -fsSL https://raw.githubusercontent.com/hunmer/mira/refs/heads/main/scripts/deploy-mira-server-macos.sh | bash
```

```powershell [Windows]
irm https://raw.githubusercontent.com/hunmer/mira/refs/heads/main/scripts/deploy-mira-wsl.ps1 | iex
```

:::

Windows 也可双击 [`deploy-mira-wsl.cmd`](https://github.com/hunmer/mira/blob/main/scripts/deploy-mira-wsl.cmd)（等价于 `powershell -ExecutionPolicy Bypass -File deploy-mira-wsl.ps1`）。

### 常用参数

脚本支持透传参数，按需组合：

```bash
# 全自动（使用默认值，不交互）
curl -fsSL .../deploy-mira-server.sh | bash -s -- --auto

# 指定素材库名 / 路径 / 端口
curl -fsSL .../deploy-mira-server.sh | bash -s -- --name MyLib --path ~/libs/my --http-port 9090 --ws-port 9019
```

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--auto` | 关 | 使用默认值全自动部署 |
| `--name` | 交互输入 | 第一个素材库名称 |
| `--path` | 交互输入 | 素材库数据目录 |
| `--http-port` | `8081` | HTTP 端口 |
| `--ws-port` | `8018` | WebSocket 端口 |

::: tip 更偏好手动安装？
跳过脚本，按下方「全局安装」步骤用 npm 自行部署。
:::

## AI 提示词一键部署

把下面这段提示词复制给**支持执行命令的 AI 助手**，替换其中的 `【密码】`、`【素材库保存位置】` 两个占位符，即可由 AI 代为完成部署、设密码、建素材库全流程。

```text
请帮我一键部署 Mira Media Library Server：

参考资源：
- GitHub 仓库：https://github.com/hunmer/mira
- 官方文档：http://miraapp.cc/docs
- 部署脚本：https://github.com/hunmer/mira/tree/main/scripts

步骤：
1. 识别当前平台并执行对应部署脚本：
   - Linux / WSL-Ubuntu：deploy-mira-server.sh
   - macOS：deploy-mira-server-macos.sh
   - Windows：deploy-mira-wsl.ps1
2. 第一个素材库保存到：【素材库保存位置】（作为 --path 传给脚本）
3. 部署完成后，把 admin 账号密码改为：【密码】
   （首次启动默认账号为 admin / admin123，使用
    `mira-app-server user reset-password -u admin -p "<密码>"` 修改）
4. 部署完成后，请回复我：
   - Server 访问地址，以及 HTTP / WebSocket 端口
   - 登录账号（admin）
   - 如何通过 MCP 把本服务接入 AI 客户端

约束：全程使用我上面给出的密码与路径，不要使用其他默认值；如遇不确定的命令或参数，先查阅上方「参考资源」中的仓库与文档再执行。
```

::: warning 占位符
发送前务必替换 `【密码】` 与 `【素材库保存位置】` 为真实值；`【素材库保存位置】` 需为运行脚本的用户有写入权限的绝对路径。
:::

## 全局安装

```bash
npm install -g mira-app-server
```

## 启动服务

```bash
# 默认配置启动（HTTP 8081 / WebSocket 8018）
mira-app-server start

# 自定义端口与数据目录
mira-app-server start --http-port 8081 --ws-port 8018 --data-path ./data
```

::: tip 首次启动
服务器会自动创建管理员账号 **`admin` / `admin123`**，密码打印在启动日志中，请及时修改。
:::

## 客户端

Mira 提供基于 Electron 的桌面客户端（**Mira Media Library**），用于浏览和管理文件库。安装后启动客户端，填入 Server 地址即可连接。

### 下载

从 GitHub Release 获取最新安装包：

👉 <https://github.com/hunmer/mira/releases/latest>

按平台选择对应文件（文件名形如 `Mira Media Library-<版本>-<平台>.<后缀>`）：

| 平台 | 文件 | 说明 |
|------|------|------|
| Windows | `*-win-setup.exe` | NSIS 安装版，可选安装目录、自动创建快捷方式 |
| Windows | `*-win-portable.exe` | 便携版，解压即用，无需安装 |
| macOS | `*.dmg` | 磁盘镜像，提供 x64 与 arm64（Apple Silicon）两个架构 |

### 安装

- **Windows**：双击 `setup.exe` 按向导安装，或直接运行 `portable.exe`。
- **macOS**：打开 `dmg`，将 Mira 拖入 `Applications`；首次启动若提示来源不明，到「系统设置 → 隐私与安全性」点击「仍要打开」。

### 连接 Server

客户端首次启动后，在登录界面填入 Server 地址（默认 `http://localhost:8081`）和账号（首次为 `admin` / `admin123`）即可使用。

## 外部依赖

Mira 依赖 `ffmpeg`、`ImageMagick`、`exiftool` 处理媒体文件。一键检测与安装：

```bash
mira-app-server doctor            # 仅检测
mira-app-server doctor --install  # 缺失时按平台自动安装（winget/brew/apt 等）
```

## 验证

```bash
mira-app-server system health   # 返回 ok 即服务正常（无需登录）
```

## 下一步

- 命令行操作见 [CLI](/cli)
- AI 客户端接入见 [MCP](/mcp)
- 技能扩展见 [Skill](/skill)

## 从源码构建（进阶）

如需基于源码运行或参与开发：

```bash
git clone https://github.com/hunmer/mira.git
cd mira_typescript
pnpm install
pnpm run install:deps   # 构建 mira-app-core 并安装到 mira-app-server
```

构建产物为 `packages/mira-app-server/dist/cli.js`，可直接 `node dist/cli.js start` 运行，或开发期用 `npx ts-node packages/mira-app-server/src/cli.ts start`。
