# Mira Server

Mira Server是一个基于mira-app-core的独立服务器应用程序。

## 安装

### 全局安装
```bash
npm install -g mira-app-server
```

### 本地安装
```bash
npm install mira-app-server
```

## 使用方法

### 全局安装后使用
安装完成后，你可以在任何地方使用`mira-app-server`命令：

```bash
# 使用默认配置启动
mira-app-server

# 自定义端口启动
mira-app-server --http-port 8081 --ws-port 8018

# 自定义数据目录
mira-app-server --data-path /path/to/your/data

# 查看帮助
mira-app-server --help
```

### 可用选项

- `--http-port <port>`: HTTP服务器端口 (默认: 8081)
- `--ws-port <port>`: WebSocket服务器端口 (默认: 8018)  
- `--data-path <path>`: 数据目录路径 (默认: ./data)
- `--help`: 显示帮助信息

### 本地开发

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 启动开发服务器
npm run dev

# 使用TypeScript直接运行CLI
npm run cli -- --help
```

## CLI（命令行操作）

除了启动服务器，CLI 还封装了 `mira-app-core/shared/sdk` 的全部能力，支持登录、凭证管理与对素材库/文件/标签/文件夹/插件/设备/数据库的增删改查。

### 从源码运行（开发态）

```bash
# 在仓库根目录
pnpm install

# 直接用 ts-node 运行（无需构建），等价于全局命令 mira-app-server
npx ts-node packages/mira-app-server/src/cli.ts --help
```

### 构建后运行

```bash
cd packages/mira-app-server
pnpm run build            # 产出 dist/cli.js
node dist/cli.js --help   # 或全局安装后直接 mira-app-server
```

### 登录与凭证

凭证持久化到 `~/.mira/credentials.json`，支持多个命名 profile，登录一次后续命令自动复用。

```bash
# 登录（默认 server 为 http://localhost:8081）
npx ts-node packages/mira-app-server/src/cli.ts login -u admin -p admin123

# 登录到另一台服务器并存为命名 profile，随后切换
npx ts-node packages/mira-app-server/src/cli.ts login -u alice -p pw -s http://other-host:8081 --profile prod
npx ts-node packages/mira-app-server/src/cli.ts auth use prod

# 查看/管理 profile
mira-app-server auth list            # 列出所有 profile（* 标记当前）
mira-app-server auth use <name>      # 切换当前 profile
mira-app-server auth remove <name>   # 删除 profile
mira-app-server whoami               # 查看当前登录用户
mira-app-server logout               # 登出当前 profile
```

> 首次启动服务器会自动创建管理员账号 `admin` / `admin123`（密码打印在服务器日志中）。

### 常用命令示例

```bash
# 全局选项：-s/--server、--token、--profile、--json（输出原始 JSON，便于脚本解析）
mira-app-server libraries list                       # 素材库列表
mira-app-server libraries create -n MyLib -p /data/lib1 --desc "我的库"
mira-app-server files list <libraryId>               # 文件列表（支持 --title/--ext/--tag 过滤）
mira-app-server files upload <libraryId> /path/a.mp4 /path/b.png --tag 精选
mira-app-server tags create <libraryId> "重要标签" --color 2
mira-app-server folders create <libraryId> "我的文件夹"
mira-app-server plugins list
mira-app-server db tables <libraryId>                # 查看素材库数据库表
mira-app-server system health                        # 健康检查（无需登录）
```

每个子命令均支持 `--help` 查看完整参数，例如 `mira-app-server files upload --help`。完整命令参考见项目内的 `.agents/skills/mira-cli/` 文档。

## MCP 服务（`--mcp`）

该二进制还可以作为 **Model Context Protocol (MCP) 服务**运行，通过 stdio 与 MCP 客户端（如 Claude、其它 Agent）通信，把 SDK 的全部能力暴露为 50 个可调用的工具。这是 Agent 以编程方式接入 Mira 的推荐方式。

### 启动 MCP 服务

```bash
# 构建后
node packages/mira-app-server/dist/cli.js --mcp [-s http://host:8081] [--token <tok>] [--debug]

# 或从源码
npx ts-node packages/mira-app-server/src/cli.ts --mcp -s http://localhost:8081
```

### 工具与鉴权

- **工具命名**：`<模块>_<动作>`，如 `libraries_list`、`files_upload`、`tags_create`、`db_tables`、`system_health`、`auth_login`，与 CLI 子命令一一对应。
- **鉴权模型与 CLI 完全一致**：工具复用当前 profile 的 token。调用数据工具前，要么预先 `mira-app-server login` 建立凭证，要么先调用 `auth_login` 工具登录（登录后立即对后续工具生效）。
- **无需登录的工具**：`system_health`、`system_info`。
- **错误约定**：失败返回 `{ isError: true, content: [{type:'text', text}] }`；出现「未登录」提示即需先 `auth_login`。
- **stdout 仅承载 JSON-RPC**：MCP 模式下所有日志走 stderr（`--debug` 开启 `[mira-mcp]` 诊断），不会有可读输出混入协议流。
- **`files_upload`** 接收本地文件路径数组 `paths`（由服务读取并上传）；**`files_download`** 写入 `output`（省略则用文件原名存到当前目录），返回 `{ savedTo, bytes }`。

### 在 MCP 客户端中配置

以支持 stdio 的 MCP 客户端为例，将本服务配置为一个 server（命令与参数按实际安装路径调整）：

```json
{
  "mcpServers": {
    "mira": {
      "command": "node",
      "args": ["/absolute/path/to/mira-app-server/dist/cli.js", "--mcp", "-s", "http://localhost:8081"]
    }
  }
}
```

配置后客户端即可发现并调用全部工具。首次使用时先调用 `auth_login` 登录，之后所有数据工具即可正常工作。

## 项目结构

- `src/cli.ts`: CLI 入口（含 `--mcp` 模式）
- `src/mcp/`: MCP 服务实现（`server.ts` + `tools/` 各模块工具）
- `src/cli/`: CLI 命令实现（`credentials.ts`、`client.ts`、`commands/`）
- `src/index.ts`: 服务器主文件
- `dist/`: 编译后的 JavaScript 文件

## 许可证

ISC
