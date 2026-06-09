# 文件地图

## 根目录结构

```
d:\mira_typescript\
├── CLAUDE.md                    # 项目索引文档
├── claude/                      # 详情文档目录
│   ├── overview.md              # 项目总览
│   ├── conventions.md           # 约定与规则
│   ├── module-index.md          # 模块索引详情
│   └── file-map.md              # 本文件
├── .claude/
│   └── index.json               # 扫描索引
├── package.json                 # 根级 monorepo 配置
├── pnpm-workspace.yaml          # workspace 定义
├── packages/
│   ├── mira-app-core/           # 核心库 (v1.0.24)
│   ├── mira-app-server/         # 服务端 (v1.0.25)
│   ├── mira-client/             # Electron 客户端 (v1.0.5)
│   ├── mira-dashboard-next/     # Web 管理面板 (v0.0.0)
│   ├── mira-scripts-core/       # 脚本工具集 (v1.0.5)
│   └── mira-doc/                # 文档站 (v1.0.0)
├── plugins/
│   ├── plugins/
│   │   ├── plugins.json         # 插件注册配置
│   │   ├── librarys.json        # 库配置
│   │   ├── mira_n8n/            # n8n 集成插件 (v1.0.7)
│   │   ├── mira_thumb_imagemagick/ # ImageMagick 缩略图插件 (v1.0.0)
│   │   └── mira_duplicate_scanner/ # 重复文件扫描插件 (v1.0.0)
│   └── old_plugins/
│       └── mira_thumb/          # 旧版缩略图插件 (v1.0.19)
└── .gitignore
```

## 已移除/不可用的模块

- `mira-dashboard` (原 Vben Admin 版本) -- 已替换为 `mira-dashboard-next`
- `mira-storage-sqlite` -- 已合并到 `mira-app-core/src/storage/sqlite/`
- `mira-server-sdk` -- 已合并到 `mira-app-core/src/shared/sdk/`
- `mira-server-sdk-examples` -- 已从 workspace 移除
- `n8n-nodes-mira-ws-trigger` -- 已从 workspace 移除
- `mira_user` (用户认证插件) -- 源码已移除，功能内置于服务端
- `upload_statistics` (上传统计插件) -- 源码已移除，功能内置于服务端
