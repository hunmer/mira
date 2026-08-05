# 文件地图

## 根目录结构

```
d:\mira_typescript\
├── CLAUDE.md                      # 项目索引文档(轻量)
├── claude/                        # 详情文档目录
│   ├── overview.md
│   ├── conventions.md
│   ├── module-index.md            # 模块职责详情(含已移除模块)
│   ├── entrypoints.md             # 入口与启动
│   ├── public-interfaces.md       # 对外接口聚合
│   ├── dependencies-and-config.md # 依赖与配置
│   ├── data-model.md              # 数据模型
│   ├── testing-and-quality.md     # 测试与质量
│   ├── file-map.md                # 本文件
│   ├── faq.md                     # 常见问题
│   └── changelog.md               # 变更记录
├── .claude/
│   └── index.json                 # 机器可读扫描索引(上次 2026-06-09)
├── package.json                   # 根级 monorepo 配置(@hunmer/mira-monorepo)
├── pnpm-workspace.yaml            # workspace 定义
├── pnpm-lock.yaml
├── tsconfig.json                  # project references → core/server
├── dependency-switch-config-macos.json
├── dependency-switch-config-windows.json
├── packages/
│   ├── mira-app-core/             # 核心库 (v2.0.1)
│   ├── mira-app-server/           # 服务端 (v2.0.1)
│   ├── mira-client/               # Electron 客户端 (v1.0.5)
│   ├── mira-dashboard-next/       # Web 管理面板 (v0.0.0)
│   ├── mira-scripts-core/         # 脚本工具集 (v1.0.5)
│   └── mira-doc/                  # 文档站 (v1.0.0)
├── plugins/
│   ├── CLAUDE.md                  # 插件集合文档
│   ├── plugins/
│   │   ├── plugins.json           # 插件注册配置
│   │   ├── librarys.json          # 库配置
│   │   ├── mira_n8n/              # n8n 集成插件 (v1.0.7)
│   │   ├── mira_thumb_imagemagick/# ImageMagick 缩略图插件 (v1.0.0)
│   │   └── mira_duplicate_scanner/# 重复文件扫描插件 (v1.0.0)
│   └── old_plugins/
│       └── mira_thumb/            # 旧版缩略图插件 (v1.0.19)
├── online_client_plugins/         # 客户端插件(动态加载)
├── scripts/                       # 构建辅助(build-client-plugins-index.mjs 等)
├── docs/                          # 文档产物(typedoc / dependency-cruiser)
├── data/                          # 运行时数据
├── dist/                          # 构建输出
├── test/                          # 仓库级测试
├── tool.js                        # 辅助工具脚本(25KB)
└── deploy.bat                     # Windows 部署脚本
```

## 工作区陈旧条目(磁盘不存在)

- `packages/mira-server-sdk-examples`(workspace.yaml 列出但已移除)
- `packages/n8n-nodes-mira-ws-trigger`(同上)

## 迁移期临时产物(根目录,untracked)

- `task_plan.md` / `progress.md` / `findings.md`:shadcn-vue 迁移计划与进度(Phase 1–8 已完成)
- `handoff-dropdown-animation.md`:未决弹出层动画 bug 交接

## 已移除/合并模块

- `mira-dashboard`(原 Vben Admin 版) → 替换为 `mira-dashboard-next`
- `mira-storage-sqlite` → 合并到 `mira-app-core/src/storage/sqlite/`
- `mira-server-sdk` → 合并到 `mira-app-core/src/shared/sdk/`
- `mira_user` / `upload_statistics` 插件 → 功能内置于服务端
