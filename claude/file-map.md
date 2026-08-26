# 文件地图

## 根目录结构

```text
/Users/Zhuanz/Documents/mira/
├── CLAUDE.md                      # 项目索引文档(轻量)
├── claude/                        # 详情文档目录(overview/conventions/module-index/
│                                  #   entrypoints/public-interfaces/dependencies-and-config/
│                                  #   data-model/testing-and-quality/file-map/faq/changelog)
├── .agents/skills/                # Agent skills(mira-cli / procm-mcp / mira-sdk-coverage-audit 等 6 个)
├── .audit/                        # SDK 覆盖审计工作区(manifest/coverage-report/decide.ts 工具)
├── .github/workflows/             # CI(electron-macos/windows、docker、landing-page、mira-doc、mira-mobile)
├── handoff/                       # 任务交接设计文档(device-share 等 5 个)
├── docs/                          # 文档产物(typedoc / dependency-cruiser / library-import-modes.md)
├── package.json                   # 根级 monorepo 配置(@hunmer/mira-monorepo)
├── pnpm-workspace.yaml            # workspace 定义(11 包 + 2 glob)
├── pnpm-lock.yaml
├── tsconfig.json                  # project references → core/server
├── packages/
│   ├── mira-app-core/             # 核心库 (v3.0.1)
│   ├── mira-app-server/           # 服务端 (v3.0.1;含 public/pair.html 设备配对页)
│   ├── mira-client/               # Electron 客户端 mira-web (v3.0.1)
│   ├── mira-dashboard-next/       # Web 管理面板 (v0.0.0)
│   ├── mira-browser-extension/    # Chrome MV3 扩展 (v0.0.1)
│   ├── mira-plugin-ui/            # 插件共享 UI 组件库 (v1.1.0,自包含 dist)
│   ├── grid-layout-plus/          # vendored 栅格布局 fork (v2.0.0-beta.0)
│   ├── mira-cep-panel/            # Adobe CEP 面板 (v0.1.0)
│   ├── vue-masonry/               # 瀑布流组件 @hunmer/vue-masonry (v0.1.0)
│   ├── vue-selection-box/         # 框选组件 @hunmer/vue-selection-box (v0.1.0)
│   ├── mira-scripts-core/         # 脚本工具集 (v1.0.5)
│   ├── mira-doc/                  # 文档站 (v1.0.0)
│   ├── mira_mobile/               # Flutter 移动端 (v1.0.0+1,不在 workspace.yaml)
│   └── landing-page/              # 官方落地页 efferd-ui (v0.1.0,独立 lockfile)
├── plugins/
│   ├── CLAUDE.md                  # 插件集合文档
│   └── plugins/                   # 16 个服务端插件(全部有独立 CLAUDE.md)
│       ├── plugins.recommend.json # 推荐注册表(11 条)
│       ├── plugins.json           # 源码侧展示注册表(3 条)
│       ├── mira_eagle_extension/  # Eagle 协议 (旧协议)
│       ├── mira_gallery_dl/       # gallery-dl 站点下载 (旧协议)
│       ├── mira_image_cropper/    # 图片裁切 (深度,+web)
│       ├── mira_format_converter/ # 格式转换 (深度,+web)
│       ├── mira_ai_sdk/           # AI 服务商网关 (深度,+web)
│       ├── mira_3d_format/        # GLB/GLTF (格式,+web)
│       ├── mira_spine_format/     # Spine (格式,+web)
│       ├── mira_epub_format/      # EPUB (格式,+web)
│       ├── mira_livp_format/      # LIVP (格式,+web)
│       ├── mira_lottie_format/    # dotLottie (格式,+web)
│       ├── mira_pag_format/       # PAG (格式,+web)
│       ├── mira_swf_format/       # SWF (格式,+web)
│       ├── mira_tiptap_format/    # .tiptap 富文本 (格式,+web)
│       ├── mira_zipper_format/    # ZIP (格式,+web)
│       ├── pdf-viewer/            # PDF (格式,+web)
│       └── psd-viewer/            # PSD (格式,+web)
│   （旧_plugins/ 与运行时 data/ 已清理;old_plugins/mira_thumb 已弃用）
├── online_client_plugins/         # 客户端在线插件市场(git 跟踪 5 个插件目录)
│   ├── plugins.json               # 自动生成的索引(5 插件)
│   └── plugins/                   # mira-video-editor / image-search / mira-whiteboard /
│                                  #   mira-custom-tab-demo / mira-welcome-demo
├── scripts/                       # 构建/安装/部署辅助(16 个;含 install-mira-macos.sh 等)
├── data/                          # 运行时数据
├── dist/                          # 构建输出
└── test/                          # 仓库级测试(verify-trash.ts)
```

> 已删除(2026-08-24/25 清理):`.claude/`(index.json 等)、`.zcode/plans/`、`tool.js`、`dependency-switch-config-*.json`、`deploy.bat`、`skills-lock.json`、`data/librarys.json`、`data/users.db`、`plugins/librarys*.json`、根 `task_plan.md`/`progress.md`。

## 已移除/合并模块

- `mira-dashboard`(原 Vben Admin 版) → 替换为 `mira-dashboard-next`
- `mira-storage-sqlite` → 合并到 `mira-app-core/src/storage/sqlite/`
- `mira-server-sdk` → 合并到 `mira-app-core/src/shared/sdk/`
- `mira_user` / `upload_statistics` 插件 → 功能内置于服务端
- `mira_thumb_imagemagick` → 由格式插件体系 + 内置 ThumbnailService 取代
