# 模块职责详情

> 本文件列出仓库内所有活跃模块的职责摘要。每个模块有独立的 `CLAUDE.md` + `claude/` 详情。

## 活跃包(packages/)

### mira-app-core (v3.0.1)

- 路径:`packages/mira-app-core`
- 语言:TypeScript
- 职责:核心库 —— 事件管理器(EventManager)、库列表管理、共享类型
- 子模块:
  - `src/storage/sqlite/`:SQLite 存储(ILibraryServerData / LibraryServerDataSQLite,文件/文件夹/标签 CRUD、事务、统计、MetadataImport、**文件导入三模式 copy/move/link**)
  - `src/shared/sdk/`:TypeScript SDK(MiraClient、HttpClient、WebSocketClient、17 个 API 模块,含 CookieSite/Settings/Admin/Download/FileSystem/Statistics/Thumbnail;v3.0 新增设备分享票据、用户文件读写、跨库导入、重复扫描 matchMode)
- 入口:`src/index.ts`
- 测试:vitest(27+ 个测试文件 + test-helpers + contract 测试)

### mira-app-server (v3.0.1)

- 路径:`packages/mira-app-server`
- 语言:TypeScript
- 职责:独立服务端 —— Express HTTP(19 路由)+ WebSocket(含**设备间二进制端到端转发**)、素材库管理、插件管理器(双协议)、用户认证、内置 ThumbnailService / SettingsManager(插件源设置)、LibraryImportService(**Eagle/Billfish 跨库导入**)、MCP 服务(`--mcp` stdio)、数据同步(`src/sync/`)
- 入口:`src/index.ts` | CLI:`src/cli.ts` + `src/cli/commands/`(顶层 5 命令 + 11 个域子命令 + doctor)
- 关键文件:`src/ServerPluginManager.ts`(同时实现 `ServerPlugin` 基类与 `FileFormatManager.registerFileFormat` 两套协议)
- 静态资源:`public/pair.html` 设备配对页 + `public/vendor/`(vue/mira-plugin-ui/jszip)+ `public/sdk/mira-sdk.esm.mjs`
- 测试:Jest(`sdk/` 目录)+ node --test(`src/sync/`)

### mira-client (v3.0.1,mira-web)

- 路径:`packages/mira-client`
- 语言:TypeScript / Vue 3.5
- 职责:Electron 桌面客户端 —— 媒体浏览/预览/管理、插件系统、Tab 导航、Pinia Store(15 个)、i18n(vue-i18n 11,zh-CN/en-US)、**设备间分享(DeviceShareDialog + WS 二进制)**、**按库独立多开窗口**
- 多窗口:`main`(主进程)、`renderer`(主 UI)、`preload`、`floating-ball-window`(悬浮球)、`notification-window`、`search-window`、`screenshot-window`(截图采集)
- 入口:`src/main/main.ts`(主进程)、`src/renderer/`(渲染进程)
- UI 技术栈:Tailwind v4 + shadcn-vue(new-york,基于 reka-ui,**58 组件目录**);迁移已完成
- 测试:`procm-ui-tests/`(31 文件 UI 用例,`pnpm run test:ui:remote`)+ `DownloadService.test.ts` + node --test 分屏/媒体 Tab 纯函数(`pnpm run test:split-tabs`);门禁 `pnpm run type-check`
- 08-23 后新增:设备分享全链路、HomeView 侧边栏拆分(SidebarModuleList 886 行→8 文件)、LocalFolderTabView 拆分(13 子文件)、媒体 Tab 区块注册表(tabSections)、设置分区收敛 10→7(新 ExtensionsPanel/FileSharePanel)、ESLint 9 flat config、`fs.getPathForFile` preload API

### mira_mobile (v1.0.0+1)

- 路径:`packages/mira_mobile`
- 语言:Dart / Flutter(^3.10.0)
- 职责:移动端 —— 素材浏览/搜索/文件下载(含通知)、相册自动备份(photo_manager)、easy_localization 双语、主题/背景个性化
- 结构:`lib/` 92 文件(screens 24、providers 14、services 6、widgets/glass 组件库);路由 17 条
- 入口:`lib/main.dart`
- 测试:9 个 dart 测试文件(providers/services/utils;screens 零覆盖)

### mira-plugin-ui (v1.1.0)

- 路径:`packages/mira-plugin-ui`
- 语言:TypeScript / Vue 3
- 职责:插件共享 UI 组件库 —— 自包含 dist(es+umd+单 CSS,仅 vue external),可经 CDN 引入;BatchUpload/SaveLocation/FileInfo 表单 + library 子入口(**媒体库组件族 15 个 .vue**:MediaBrowser/MediaWaterfall/MediaDetail/MediaLibraryView/MediaPickerDialog/FilterBar/SavedFilterDialog + 树体系 + 服务器管理)+ ui 67 组件目录/376 vue(shadcn 官方 + questionnaire/message-scroller 等扩展)
- 消费方(8 处):mira-browser-extension(`workspace:*`)、plugins/mira_tiptap_format/web(`file:`)、mira-cep-panel、plugins 的 mira_image_cropper/mira_format_converter/mira_ai_sdk `web/`、online_client_plugins 的 mira-video-editor/image-search/mira-whiteboard
- 入口:`src/index.ts` | 构建:`pnpm --filter mira-plugin-ui build`(vite 库模式)
- 测试:无(提供 demo 手动验证,连真实 server)

### grid-layout-plus (v2.0.0-beta.0)

- 路径:`packages/grid-layout-plus`
- 语言:TypeScript / Vue 3
- 职责:**vendored fork**(上游 qmhc/grid-layout-plus v2 beta,2026-08-22 整体入库)—— Vue 3 栅格布局库,供 mira-client Home 仪表盘卡片拖拽布局;双入口 `.`(组件)与 `./core`(纯算法)
- 仅供 mira-client 消费(`workspace:*`:HomeTabView/dashboardLayout/CardRegistry)
- 注意:上游 docs/dev-server/changeset/eslint 等设施未带入,npm scripts 多数失效(详见该包 claude/conventions.md)
- 测试:27 个 vitest 文件(e2e 依赖缺失的 dev-server)

### mira-cep-panel (v0.1.0)

- 路径:`packages/mira-cep-panel`
- 语言:TypeScript / Vue 3.5(Vite 6 + Tailwind 4)
- 职责:Adobe CEP 面板 —— Photoshop 2020(CEP 9,Chromium 61)内三栏浏览/管理 Mira 素材,拖拽置入画布、导出活动图层;复用 mira-plugin-ui 的 MediaLibraryView,经 MiraClient(mira-app-core/shared/sdk)直连 server
- 入口:`src/main.ts` → App.vue;部署:`scripts/sync.mjs` 镜像到 PS 扩展目录
- 测试:无;远程调试端口 8899

### mira-dashboard-next (v0.0.0)

- 路径:`packages/mira-dashboard-next`
- 语言:TypeScript / Vue 3.5
- 职责:Web 管理面板 —— shadcn-vue 2.7 + Tailwind v4,功能页面 + 认证页,i18n 支持;API 层走 mira-app-core SDK(`src/lib/miraClient.ts`,13 个 api 模块基本全走 SDK,少量老接口仍 axios);08-24 后新增 `/server` 运维页(SSE 实时日志/健康检查/停止服务,仅 super)、Eagle/Billfish `ImportDialog`、settings 拆 5 面板
- 入口:`src/main.ts`
- 测试:无

### mira-browser-extension (v0.0.1)

- 路径:`packages/mira-browser-extension`
- 语言:TypeScript / Vue 3
- 职责:Chrome MV3 浏览器扩展 —— 网页素材采集(截图/拖拽/嗅探/悬停按钮/网页内批量导入)、cookie/DNR 资源抓取、批量上传独立窗口(IndexedDB 暂存)、多服务器管理、高清大图升级(maxurl)
- 四上下文:Service Worker / Content Script / Offscreen Document / UI(popup+side panel+upload)
- 入口:`src/background/index.ts`(Service Worker)、`src/manifest.ts`(MV3 manifest 生成)
- 依赖 mira-plugin-ui(library 子入口);vite 需 vue 单路径 alias 防双实例
- 测试:Vitest(19 个测试文件,约 137 用例)

### vue-masonry (v0.1.0,@hunmer/vue-masonry)

- 路径:`packages/vue-masonry`
- 语言:TypeScript / Vue 3
- 职责:Vue 3 瀑布流组件 —— 响应式列数 / 跨列跨行 / 宽高比 / 懒加载 / 入场 & layout 动画 / 排序
- 入口:`src/index.ts`(导出 `Masonry.vue` + `LazyCell.vue` + `types` + `utils`)
- 被 mira-client、mira-browser-extension(嗅探瀑布流)依赖
- 测试:无

### vue-selection-box (v0.1.0,@hunmer/vue-selection-box)

- 路径:`packages/vue-selection-box`
- 语言:TypeScript / Vue 3
- 职责:Vue 3 框选组件 —— 拖拽矩形框选 / Alt 减选 / Shift 范围选 / Ctrl 加选 / 边缘自动滚动 / 快捷键,`data-selectable-id` 协议零侵入
- 入口:`src/index.ts`(导出 `SelectionBox.vue` + types;src 仅 3 文件)
- 被 mira-client(6 个组件)、mira-plugin-ui 依赖
- 测试:无(`type-check` 门禁)

### landing-page (v0.1.0,efferd-ui)

- 路径:`packages/landing-page`
- 语言:TypeScript / React 19.2 / Next.js 16.0.7
- 职责:Mira 官方落地页 efferd.com —— 单页营销站(9 个 section:Hero/PhoneMockup/DesktopPreview/Feature/LogoCloud/Testimonials/FAQs/Contact/Footer);静态导出(`output: "export"` + basePath `/introduction`,postbuild 改名)
- 入口:`app/`(Next.js App Router)、`components/`(含 kibo-ui、media-waterfall 等)
- shadcn registry 构建链已移除;新增 three / next-themes / @next/third-parties(GA)
- 测试:无独立测试,含 lint/format

### mira-scripts-core (v1.0.5)

- 路径:`packages/mira-scripts-core`
- 语言:TypeScript
- 职责:脚本工具集 —— 数据转换(convertLibraryData)、文件导入(pathFilesToLibrary)
- 入口:`index.ts`
- 测试:无

### mira-doc (v1.0.0)

- 路径:`packages/mira-doc`
- 语言:Markdown / VitePress
- 职责:项目文档站 —— VitePress 驱动,含 install/快速开始/cli/mcp/skill 指南;部署 base 已改为 `/docs/`
- 入口:`.vitepress/config.mts`、`index.md`
- 测试:无

## 插件(plugins/)

> **双协议**:旧版 `extends ServerPlugin` 深度介入服务端;新版 `registerFileFormat(ServerFileFormatHandler)` 声明格式扩展与缩略图。共 **16 个**(深度 5 + 格式 11),**全部有独立 CLAUDE.md**。注册表:`plugins/plugins/plugins.recommend.json`(推荐 11 条)、`plugins/plugins/plugins.json`(源码侧展示 meta 3 条)、`packages/mira-app-server/src/plugins/plugins.json`(服务端运行时 11 条)。插件运行时数据(`data/`)已全部 git 忽略(2026-08-24 清理)。

| 插件 | 版本 | 路径 | 协议 | 职责 |
|------|------|------|------|------|
| mira_eagle_extension | v1.0.0 | `mira_eagle_extension` | 旧 | 复刻 Eagle 本地 HTTP 协议,让 Eagle 浏览器扩展无改接入(默认禁用) |
| mira_gallery_dl | v1.0.x | `mira_gallery_dl` | 旧 | gallery-dl 站点下载集成(自定义类 + `getRoutes()`/`registerRounter`) |
| mira_image_cropper | v1.0.0 | `mira_image_cropper` [+web] | 深度 | 多选区图片裁切(`POST /api/image-cropper/save` 入库)+ 裁切 SPA(2026-08-21 新增) |
| mira_format_converter | v1.0.0 | `mira_format_converter` [+web] | 深度 | ImageMagick/FFmpeg 批量格式转换(异步任务 `/api/format-converter/*`)+ SPA(2026-08-21 新增) |
| mira_ai_sdk | v1.0.0 | `mira_ai_sdk` [+web] | 深度 | OpenAI 兼容多服务商 AI 网关(聊天/生图,`ai` + `@ai-sdk/openai-compatible`)+ AI 图片生成器 SPA(2026-08-23 新增) |
| mira_3d_format | v1.0.2 | `mira_3d_format` [+web] | 格式 | GLB/GLTF 解析 + GLB 缩略图(render-glb + @gltf-transform) |
| mira_spine_format | v1.1.1 | `mira_spine_format` [+web] | 格式 | Spine `.skel/.spine` 解析,idle-first 预览 |
| mira_epub_format | v1.0.0 | `mira_epub_format` [+web] | 格式 | EPUB 元数据 + 封面缩略图 + 阅读 |
| mira_livp_format | v1.0.0 | `mira_livp_format` [+web] | 格式 | LIVP Live Photo 缩略图与预览 |
| mira_lottie_format | v1.0.0 | `mira_lottie_format` [+web] | 格式 | dotLottie 缩略图与预览 |
| mira_pag_format | v1.0.0 | `mira_pag_format` [+web] | 格式 | PAG 格式缩略图与预览(需 `PAG_BROWSER_PATH` 指定 Chrome) |
| mira_swf_format | v1.0.0 | `mira_swf_format` [+web] | 格式 | SWF 元数据 + FFmpeg 缩略图 + Ruffle 预览 |
| mira_tiptap_format | v1.0.x | `mira_tiptap_format` [+web] | 格式 | `.tiptap` 富文本(Tiptap Notion 风格编辑器,85 文件 web 端,防抖自动保存) |
| mira_zipper_format | v1.0.0 | `mira_zipper_format` [+web] | 格式 | ZIP 归档只读浏览/预览 |
| pdf-viewer | v1.0.0 | `pdf-viewer` [+web] | 格式 | PDF 文档预览(浏览器内置 PDF 渲染) |
| psd-viewer | v1.0.1 | `psd-viewer` [+web] | 格式 | PSD/PSB 分层查看器(浏览器本地解析) |

`[+web]` = 含 `web/` 子目录(客户端动态加载的预览 UI,带 `plugin.json`)。

## 客户端在线插件(online_client_plugins/)

**插件市场源仓库**(已建独立 [CLAUDE.md](../online_client_plugins/CLAUDE.md)):`scripts/build-client-plugins-index.mjs` 扫描含 `plugin.json` 的子目录生成 `plugins.json` 索引(sha256 + 原子写入),客户端从市场源 HTTP 地址拉取索引、下载插件到本地加载。与 `plugins/plugins/*/web`(服务端插件的查看器/SPA,由服务端静态托管、客户端加载)是两套独立机制,但 08-20 后三个新深度插件的 `web/` 形态已与在线插件趋同。

当前索引共 **5 个**(2026-08-25 核对,generatedAt 2026-08-24T11:21Z):

| 在线插件 | 来源/类型 | 说明 |
|----------|-----------|------|
| mira-video-editor | 大型工具 | 视频剪辑器 v1.0.0:片段剪辑、PySceneDetect 场景分割、delogo、批量导出;依赖宿主 PluginExecHandlers 受控 ffmpeg/scenedetect(61 文件/约 1.3 万行,市场内最大) |
| image-search | 采集 | 以图搜图聚合 v3.0.0:Pinterest + Google/Bing/Yandex/TinEye/SauceNAO/搜狗,webview 内嵌 |
| mira-whiteboard | 独立 SPA(vite) | 自由白板 v1.0.0,@woven-canvas/vue 无限画板 + 独立窗口 |
| mira-custom-tab-demo | 演示 | 自定义 Tab Demo v1.0.0,注册 Tab + DOM 回调渲染 |
| mira-welcome-demo | 演示 | 欢迎示例插件 v1.0.0,配置/事件/UI/日志能力演示 |

> 2026-08-24 起 `mira-3d-format-preview`/`mira-spine-format-preview`/`psd-viewer`/`mira-pinterest-search-v2` 已从市场撤下(git 移除,磁盘仅剩 node_modules 空壳);格式预览能力由 `plugins/plugins/*` 服务端插件的 `web/` 承接。

## 已移除/合并模块

| 模块 | 原路径 | 说明 |
|------|--------|------|
| mira-storage-sqlite | `packages/mira-storage-sqlite` | 已合并到 mira-app-core |
| mira-server-sdk | `packages/mira-server-sdk` | 已合并到 mira-app-core |
| mira-server-sdk-examples | `packages/mira-server-sdk-examples` | 已移除(2026-08-11 已从 workspace.yaml 清理) |
| n8n-nodes-mira-ws-trigger | `packages/n8n-nodes-mira-ws-trigger` | 已移除(2026-08-11 已从 workspace.yaml 清理;原 `dependency-switch-config-*.json` 悬空引用已随文件删除消除) |
| mira-dashboard | `packages/mira-dashboard` | 已替换为 mira-dashboard-next |
| mira_user | `plugins/plugins/mira_user` | 源码移除,功能内置于服务端 |
| upload_statistics | `plugins/plugins/upload_statistics` | 源码移除,功能内置于服务端 |
| mira_thumb_imagemagick | `plugins/plugins/mira_thumb_imagemagick` | 已移除(功能被格式插件体系与内置 ThumbnailService 取代) |
| mira_duplicate_scanner | `plugins/plugins/mira_duplicate_scanner` | 已移除(2026-08-13,磁盘无此目录) |
| mira_n8n | `plugins/plugins/mira_n8n` | 已移除(2026-08-21,n8n Webhook/WS 集成插件删除) |
| mira_thumb (旧) | `plugins/old_plugins/mira_thumb` | 旧版 ffmpeg 缩略图,位于 old_plugins/ |

## 模块关系图

```mermaid
graph TD
  core[mira-app-core]
  server[mira-app-server]
  client[mira-client]
  dash[mira-dashboard-next]
  ext[mira-browser-extension]
  mobile[mira_mobile]
  scripts[mira-scripts-core]
  vmason[vue-masonry]
  vsel[vue-selection-box]
  glp[grid-layout-plus]
  pui[mira-plugin-ui]
  cep[mira-cep-panel]
  plugins[plugins/* 双协议]
  market[online_client_plugins]

  core --> server
  core --> client
  core --> scripts
  core --> ext
  core --> dash
  vmason --> client
  vsel --> client
  glp --> client
  vsel --> pui
  pui --> ext
  pui --> cep
  pui --> plugins
  pui --> market
  server --> plugins
  server -.API.-> dash
  server -.API.-> ext
  server -.API.-> mobile
  server -.API.-> cep
  client -.拉取索引.-> market
```
