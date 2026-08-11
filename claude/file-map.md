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
│   └── index.json                 # 机器可读扫描索引
├── .agents/                       # Agent skills(含 mira-cli / procm-mcp 等)
├── package.json                   # 根级 monorepo 配置(@hunmer/mira-monorepo)
├── pnpm-workspace.yaml            # workspace 定义(9 包 + 2 glob)
├── pnpm-lock.yaml
├── tsconfig.json                  # project references → core/server
├── dependency-switch-config-macos.json
├── dependency-switch-config-windows.json
├── packages/
│   ├── mira-app-core/             # 核心库 (v2.0.3)
│   ├── mira-app-server/           # 服务端 (v2.0.3)
│   ├── mira-client/               # Electron 客户端 mira-web (v1.0.5)
│   ├── mira-dashboard-next/       # Web 管理面板 (v0.0.0)
│   ├── mira-browser-extension/    # Chrome MV3 扩展 (v0.1.0)
│   ├── vue-masonry/               # 瀑布流组件 @hunmer/vue-masonry (v0.1.0)
│   ├── mira-scripts-core/         # 脚本工具集 (v1.0.5)
│   ├── mira-doc/                  # 文档站 (v1.0.0)
│   └── landing-page/              # 官方落地页 efferd-ui (v0.1.0,独立 lockfile)
├── plugins/
│   ├── CLAUDE.md                  # 插件集合文档
│   ├── plugins/
│   │   ├── plugins.json           # 插件注册配置(13 个)
│   │   ├── librarys.json          # 库配置
│   │   ├── mira_n8n/              # n8n 集成 (v1.0.7,旧协议)
│   │   ├── mira_duplicate_scanner/# 重复扫描 (v1.0.0,旧协议)
│   │   ├── mira_eagle_extension/  # Eagle 协议 (v1.0.0,旧协议)
│   │   ├── mira_3d_format/        # GLB/GLTF (v1.0.1,格式协议,+web)
│   │   ├── mira_spine_format/     # Spine (v1.1.0,格式协议,+web)
│   │   ├── mira_epub_format/      # EPUB (v1.0.0,格式协议,+web)
│   │   ├── mira_livp_format/      # LIVP (v1.0.0,格式协议,+web)
│   │   ├── mira_lottie_format/    # dotLottie (v1.0.0,格式协议,+web)
│   │   ├── mira_pag_format/       # PAG (v1.0.0,格式协议,+web)
│   │   ├── mira_swf_format/       # SWF (v1.0.0,格式协议,+web)
│   │   ├── mira_zipper_format/    # ZIP (v1.0.0,格式协议,+web)
│   │   ├── pdf-viewer/            # PDF 预览 (v1.0.0,格式协议,+web)
│   │   └── psd-viewer/            # PSD 预览 (v1.0.0,格式协议,+web)
│   └── old_plugins/
│       └── mira_thumb/            # 旧版缩略图插件 (已弃用)
├── online_client_plugins/         # 客户端在线插件(动态加载)
│   ├── plugins.json               # 自动生成的索引
│   └── plugins/                   # 各客户端插件(mira-3d-format-preview 等)
├── scripts/                       # 构建辅助(build-client-plugins-index.mjs 等)
├── docs/                          # 文档产物(typedoc / dependency-cruiser)
├── data/                          # 运行时数据
├── dist/                          # 构建输出
├── test/                          # 仓库级测试
├── tool.js                        # 辅助工具脚本
└── deploy.bat                     # Windows 部署脚本
```

## 已移除/合并模块

- `mira-dashboard`(原 Vben Admin 版) → 替换为 `mira-dashboard-next`
- `mira-storage-sqlite` → 合并到 `mira-app-core/src/storage/sqlite/`
- `mira-server-sdk` → 合并到 `mira-app-core/src/shared/sdk/`
- `mira_user` / `upload_statistics` 插件 → 功能内置于服务端
- `mira_thumb_imagemagick` → 由格式插件体系 + 内置 ThumbnailService 取代
