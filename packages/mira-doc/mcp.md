# MCP

`mira-app-server` 可作为 **Model Context Protocol (MCP)** 服务运行，通过 stdio 与 MCP 客户端（Claude、ZCode 及其它 Agent）通信，把 SDK 的全部能力暴露为约 50 个工具。这是 AI Agent 接入 Mira 的推荐方式。

## 启动 MCP 服务

全局安装后直接运行：

```bash
mira-app-server --mcp [-s http://host:8081] [--token <tok>] [--debug]
```

| 参数 | 说明 |
|------|------|
| `--mcp` / `-mcp` | 进入 MCP 服务模式 |
| `-s, --server <url>` | 目标 Mira 服务器地址，默认 `http://localhost:8081` |
| `--token <token>` | 覆盖访问令牌 |
| `--debug`（或 `MIRA_MCP_DEBUG=1`） | stderr 输出 `[mira-mcp]` 诊断日志 |

::: warning 协议约束
MCP 模式下 stdout 仅承载 JSON-RPC，所有日志走 stderr，不会有可读输出混入协议流。
:::

## 在客户端中配置

在 MCP 客户端的 `mcpServers` 中添加一项：

```json
{
  "mcpServers": {
    "mira": {
      "command": "mira-app-server",
      "args": ["--mcp", "-s", "http://localhost:8081"]
    }
  }
}
```

- **ZCode**：写入工作区 `.zcode/settings.json` 或用户级配置的 `mcpServers` 段。
- **Claude / Claude Code**：写入 `.mcp.json`（项目级）或 `claude_desktop_config.json`。

::: tip 找不到命令？
若客户端提示找不到 `mira-app-server`，改用绝对路径（`which mira-app-server` / `where mira-app-server` 查询）填入 `command`。
:::

## 工具总览

工具命名规则 `<模块>_<动作>`，与 CLI 子命令一一对应：

| 模块 | 工具示例 |
|------|---------|
| auth | `auth_login` `auth_whoami` `auth_list_profiles` `auth_use_profile` `auth_logout` |
| system | `system_health` `system_info`（**均无需登录**） |
| libraries | `libraries_list` `libraries_create` `libraries_start` `libraries_restart` … |
| files | `files_list` `files_upload` `files_download` `files_delete` `files_restore` `files_empty_trash` … |
| tags | `tags_list` `tags_create` `tags_file_set` `tags_file_get` … |
| folders | `folders_list` `folders_create` `folders_move` `folders_remove` … |
| plugins | `plugins_list` `plugins_install` `plugins_enable` `plugins_search` … |
| devices | `devices_list` `devices_stats` `devices_disconnect` `devices_send` |
| database | `db_tables` `db_schema` `db_data` `db_info` |

## 鉴权模型

与 CLI 完全一致，工具复用本地 profile 的 token。

- **首次使用**：先调用 `auth_login` 工具登录，登录后立即对所有后续工具生效；或预先在命令行 `mira-app-server login` 建立凭证。
- **免登录工具**：`system_health`、`system_info`。
- **失败约定**：返回 `{ isError: true, content: [{type:'text', text}] }`；出现「未登录」提示即需先 `auth_login`。

::: tip 文件类工具
`files_upload` 接收本地文件路径数组 `paths`；`files_download` 写入 `output`（省略则用文件原名存到当前目录），返回 `{ savedTo, bytes }`。
:::
