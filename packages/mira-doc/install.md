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
git clone https://github.com/hunmer/mira_typescript.git
cd mira_typescript
pnpm install
pnpm run install:deps   # 构建 mira-app-core 并安装到 mira-app-server
```

构建产物为 `packages/mira-app-server/dist/cli.js`，可直接 `node dist/cli.js start` 运行，或开发期用 `npx ts-node packages/mira-app-server/src/cli.ts start`。
