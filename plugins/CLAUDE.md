# plugins

Mira 服务端插件集合(当前 **20 个**)。插件由 `ServerPluginManager`(`packages/mira-app-server/src/ServerPluginManager.ts`)在素材库加载时动态加载。支持两套并行协议:旧版深度插件(`extends ServerPlugin` 或等价自定义类,`registerRounter` 注册路由)与新版 `registerFileFormat(ServerFileFormatHandler)`(声明格式扩展与缩略图)。注册表:`plugins.recommend.json`(源码侧推荐,11 条)、`plugins/plugins.json`(源码侧展示 meta,7 条)、`packages/mira-app-server/src/plugins/plugins.json`(server 运行时安装状态,15 条)。

> 四个新插件(2026-10 起:深度 `mira_semantic_search` + 格式 `mira_office_viewer`/`mira_html_format`/`mira_font_format`)延续「服务端声明 + `web/` 客户端分发」形态;`web/` 有两种形态——独立 SPA(image_cropper/format_converter/ai_sdk/office_viewer)与轻量注册脚本 `index.js`(向客户端 `pluginSystem` 注册 viewer/FilterBar 入口,font/html/semantic_search)。

## 约定

- 必须导出 `init(inst)` 工厂函数
- **协议 A(旧)**:返回 `extends ServerPlugin` 的实例;构造函数接收 `{ pluginManager, server, dbService, miraClient? }`
- **协议 B(格式)**:`init(inst)` 内 `inst.pluginManager.registerFileFormat(pluginName, handler)` 声明 `extensions`/`thumbnailExtensions`/`thumbnail(src,dest)`/`viewers[]`(viewers[] 支持按 viewer 的 `extensions`/`mimeTypes` 过滤,office_viewer 首用)
- 配置持久化在 `{pluginDir}/data/`
- 通过 `plugins/plugins.json` 启停(`enabled` 字段)
- 含 `web/` 子目录的插件同时提供客户端 UI(经 `plugin.json` 注册)

## 文件索引

| 文件 | 用途 | 何时阅读 |
|------|------|----------|
| [claude/overview.md](claude/overview.md) | 双协议总览、基类/Handler 接口、20 插件清单 | 首次了解插件体系 |
| [claude/file-map.md](claude/file-map.md) | 全部插件文件清单 | 找某插件文件 |
| [claude/changelog.md](claude/changelog.md) | 变更记录 | 看更新历史 |

## 插件清单

### 协议 A — 深度插件(6 个:`extends ServerPlugin` 或等价自定义类)

| 插件 | 版本 | 职责 |
|------|------|------|
| mira_eagle_extension | 1.0.0 | 复刻 Eagle 本地 HTTP 协议,让 Eagle 浏览器扩展无改接入 |
| mira_gallery_dl | 1.0.0 | gallery-dl 批量解析图片导入(自定义类 + `getRoutes()`/`registerRounter` 注册 `/gallery-dl/*` HTTP 路由) |
| mira_image_cropper | 1.0.0 | 多选区图片裁切:单图多矩形选区、实时预览、批量导出 PNG/JPG/WebP;`POST /api/image-cropper/save` 写入素材库;`web/` 裁切 SPA(2026-08-21 新增) |
| mira_format_converter | 1.0.0 | 格式转换:调服务器 ImageMagick/FFmpeg 批量转换图片/视频/音频并入库;`/api/format-converter/{capabilities,convert,status}` 异步任务路由;`FFMPEG_PATH`/`IMAGEMAGICK_PATH` 环境变量优先(2026-08-21 新增) |
| mira_ai_sdk | 1.0.0 | 通用 AI SDK 网关:管理多个 OpenAI 兼容服务商,基于 `ai` + `@ai-sdk/openai-compatible` 提供聊天与图片生成 API(13 条路由,含默认文本/生图模型管理)+ AI 图片生成器 `web/` 应用(2026-08-23 新增) |
| mira_semantic_search | 1.0.0 | 语义搜索:Ollama embedding(embeddinggemma-2)向量索引 + 视觉模型打标以图搜图;8 条 `/api/semantic-search/*` 路由、sqlite-vec KNN 加速、文件事件自动增量;dashboard 管理页 + 客户端 FilterBar 入口(2026-10 新增,运行时注册表默认停用) |

### 协议 B — `registerFileFormat`(14 个格式插件)

| 插件 | 版本 | 格式 | 缩略图依赖 | +web |
|------|------|------|-----------|------|
| mira_3d_format | 1.0.2 | glb/gltf | render-glb + @gltf-transform | ✓ |
| mira_spine_format | 1.1.1 | skel/spine | 内置解析 | ✓ |
| mira_epub_format | 1.0.0 | epub | 内置封面提取 | ✓ |
| mira_livp_format | 1.0.0 | livp | Live Photo 解包 | ✓ |
| mira_lottie_format | 1.0.0 | lottie | dotLottie 渲染 | ✓ |
| mira_pag_format | 1.0.0 | pag | Chrome(`PAG_BROWSER_PATH`) | ✓ |
| mira_swf_format | 1.0.0 | swf | FFmpeg + Ruffle | ✓ |
| mira_zipper_format | 1.0.0 | zip | 内置归档解析 | ✓ |
| mira_tiptap_format | 1.0.0 | tiptap | 无缩略图(仅 process 元数据校验) | ✓(Vue3+Tiptap 编辑器) |
| pdf-viewer | 1.0.0 | pdf | 浏览器内置 PDF | ✓ |
| psd-viewer | 1.0.1 | psd/psb | 浏览器本地解析 | ✓ |
| mira_office_viewer | 1.0.0 | docx/xlsx/pptx/pdf | 无缩略图 | ✓(vue-office SPA,Vite 8 + Vue 3.5;2026-10 新增) |
| mira_html_format | 1.0.0 | html/htm | 无缩略图(纯 viewer) | ✓(HTTP 页面预览;2026-10 新增) |
| mira_font_format | 1.0.0 | ttf/otf/woff/woff2/ttc | fontkit + sharp(SVG 字形) | ✓(交互预览;2026-10 新增) |

## 已有独立文档的插件

| 插件 | 文档 |
|------|------|
| psd-viewer | [plugins/psd-viewer/CLAUDE.md](plugins/psd-viewer/CLAUDE.md) |
| mira_tiptap_format | [plugins/mira_tiptap_format/CLAUDE.md](plugins/mira_tiptap_format/CLAUDE.md) |
| mira_3d_format | [plugins/mira_3d_format/CLAUDE.md](plugins/mira_3d_format/CLAUDE.md) |
| mira_eagle_extension | [plugins/mira_eagle_extension/CLAUDE.md](plugins/mira_eagle_extension/CLAUDE.md) |
| mira_epub_format | [plugins/mira_epub_format/CLAUDE.md](plugins/mira_epub_format/CLAUDE.md) |
| mira_gallery_dl | [plugins/mira_gallery_dl/CLAUDE.md](plugins/mira_gallery_dl/CLAUDE.md) |
| mira_livp_format | [plugins/mira_livp_format/CLAUDE.md](plugins/mira_livp_format/CLAUDE.md) |
| mira_lottie_format | [plugins/mira_lottie_format/CLAUDE.md](plugins/mira_lottie_format/CLAUDE.md) |
| mira_pag_format | [plugins/mira_pag_format/CLAUDE.md](plugins/mira_pag_format/CLAUDE.md) |
| mira_spine_format | [plugins/mira_spine_format/CLAUDE.md](plugins/mira_spine_format/CLAUDE.md) |
| mira_swf_format | [plugins/mira_swf_format/CLAUDE.md](plugins/mira_swf_format/CLAUDE.md) |
| mira_zipper_format | [plugins/mira_zipper_format/CLAUDE.md](plugins/mira_zipper_format/CLAUDE.md) |
| pdf-viewer | [plugins/pdf-viewer/CLAUDE.md](plugins/pdf-viewer/CLAUDE.md) |
| mira_image_cropper | [plugins/mira_image_cropper/CLAUDE.md](plugins/mira_image_cropper/CLAUDE.md) |
| mira_format_converter | [plugins/mira_format_converter/CLAUDE.md](plugins/mira_format_converter/CLAUDE.md) |
| mira_ai_sdk | [plugins/mira_ai_sdk/CLAUDE.md](plugins/mira_ai_sdk/CLAUDE.md) |
| mira_semantic_search | [plugins/mira_semantic_search/CLAUDE.md](plugins/mira_semantic_search/CLAUDE.md) |
| mira_office_viewer | [plugins/mira_office_viewer/CLAUDE.md](plugins/mira_office_viewer/CLAUDE.md) |
| mira_html_format | [plugins/mira_html_format/CLAUDE.md](plugins/mira_html_format/CLAUDE.md) |
| mira_font_format | [plugins/mira_font_format/CLAUDE.md](plugins/mira_font_format/CLAUDE.md) |

> 20 个活跃插件全部有独立 `CLAUDE.md`(2026-11-21 补齐四个新插件)。

## 已移除

- `mira_n8n`(2026-08-21 删除,n8n Webhook/WS 集成)
- `mira_duplicate_scanner`(2026-08-13,重复扫描功能内置到 `mira-app-server/src/services/DuplicateScanner.ts`)
- `mira_thumb_imagemagick`(由格式插件体系与内置 ThumbnailService 取代)
- 以上三个目录磁盘上仍残留 `dist/`/`node_modules` 构建产物,但**无 git 跟踪源码**,不属于活跃插件

## 扫描状态

- **更新时间**: 2026-11-21
- **已扫描**: 基线 bc638a73(2026-08-25)以来 `plugins/` 全部 49 个变更文件;新增 4 插件源码逐个深读;三份注册表(展示 7 / 推荐 11 / server 运行时 15)核对;mira_ai_sdk 全量 diff 复核
- **本次更新(2026-11-21)**: 插件 16 → 20(深度 5→6、格式 11→14);新建 mira_semantic_search/mira_office_viewer/mira_html_format/mira_font_format 四个独立 CLAUDE.md;mira_ai_sdk CLAUDE.md 增量(路由 11→13、默认模型机制、imageResponseFetch);registry 数字全面刷新(展示 3→7、运行时 11→15,新 4 条 path 均回指仓库目录)
- **跳过**: 未变更插件未重读;`dist/`/`node_modules` 构建产物
- **下一步建议**: 深扫 mira_semantic_search index.ts 后半段(vec0 SQL/索引任务执行体)与 SemanticSearch.js 完整交互;mira_tiptap_format web 端编辑器(85 文件)实现体仍未深扫
- **web/ 与 online_client_plugins/ 关系**(2026-08-23 核对): 插件的 `web/` 即客户端应用本体;`online_client_plugins/` 是**纯客户端插件市场**(已建独立 CLAUDE.md),两者渠道不同但形态趋同
