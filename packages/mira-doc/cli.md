# CLI

`mira-app-server` CLI 封装了 `mira-app-core/shared/sdk` 的全部能力，除启动服务器外，还支持登录、凭证管理与对素材库、文件、标签、文件夹、插件、设备、数据库的增删改查。

## 全局选项

| 选项 | 说明 |
|------|------|
| `-s, --server <url>` | 服务器地址，默认 `http://localhost:8081` |
| `--token <token>` | 直接传入访问令牌（覆盖当前 profile） |
| `--profile <name>` | 使用指定命名 profile 的凭证 |
| `--json` | 输出原始 JSON，便于脚本/Agent 解析 |

每个子命令均支持 `--help` 查看完整参数。

## 登录与凭证

凭证持久化到 `~/.mira/credentials.json`，支持多个命名 profile，登录一次后续命令自动复用。

```bash
mira-app-server login -u admin -p admin123           # 登录当前 profile
mira-app-server login -u alice -p pw -s http://host:8081 --profile prod
mira-app-server auth use prod                        # 切换 profile
mira-app-server auth list                            # 列出全部 profile（* 标当前）
mira-app-server whoami                               # 查看当前登录用户
mira-app-server logout                               # 登出当前 profile
```

## 命令一览

| 模块 | 命令 |
|------|------|
| 服务器 | `start` `version` `health` `doctor [--install]` |
| 系统 | `system health` `system info` `system uptime`（`health`/`info` 无需登录） |
| 用户 | `user info` `user update` |
| 素材库 | `libraries list/get/create/update/delete/start/stop/restart` |
| 文件 | `files list/get/upload/download/rename/update/delete/restore/empty-trash` |
| 标签 | `tags list/create/update/delete/file-set/file-get` |
| 文件夹 | `folders list/create/update/delete/move/remove` |
| 插件 | `plugins list/install/enable/disable/uninstall/search` |
| 设备 | `devices list/stats/disconnect/send` |
| 数据库 | `db tables/schema/data/info` |

## 常用示例

```bash
# 素材库
mira-app-server libraries create -n MyLib -p /data/lib1 --desc "我的库"
mira-app-server libraries list --status active --json

# 文件
mira-app-server files upload <libId> /path/a.mp4 /path/b.png --tag 精选 --folder-id 3
mira-app-server files list <libId> --tag 精选 --limit 20
mira-app-server files download <libId> <fileId> -o ./out.mp4
mira-app-server files delete <libId> <fileId> --permanent

# 标签 / 文件夹
mira-app-server tags create <libId> "重要标签" --color 2
mira-app-server tags file-set <libId> <fileId> "重要标签" 备选
mira-app-server folders move <libId> <fileId> <folderId>

# 插件 / 设备 / 数据库
mira-app-server plugins install some-plugin <libId> --version 1.2.0
mira-app-server devices send <clientId> <libId> '{"type":"ping"}'
mira-app-server db schema <libId> files
```

::: tip 别名
`delete` 支持 `rm`，`empty-trash`、`file-set` 等均有助记别名，详见各命令 `--help`。
:::
