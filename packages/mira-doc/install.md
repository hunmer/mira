# 安装

Mira Server 通过 npm 安装，安装后即可全局使用 `mira-app-server` 命令。

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

👉 <https://github.com/hunmer/mirat/releases/latest>

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
git clone https://github.com/hunmer/mirat.git
cd mira_typescript
pnpm install
pnpm run install:deps   # 构建 mira-app-core 并安装到 mira-app-server
```

构建产物为 `packages/mira-app-server/dist/cli.js`，可直接 `node dist/cli.js start` 运行，或开发期用 `npx ts-node packages/mira-app-server/src/cli.ts start`。
