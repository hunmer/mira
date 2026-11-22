# 文件清单

## 配置文件

| 文件 | 说明 |
|------|------|
| `plugins/plugins/plugins.recommend.json` | 源码侧推荐插件清单(11 条) |
| `plugins/plugins/plugins.json` | 源码侧展示 meta 注册表(7 条:ai_sdk/format_converter/image_cropper/semantic_search/office_viewer/html/font) |
| `packages/mira-app-server/src/plugins/plugins.json` | server 运行时安装状态注册表(15 条,enabled 以此为准) |

## 活跃插件(20 个,每个含 index.ts/package.json/tsconfig.json 与独立 `CLAUDE.md`)

| 插件 | 版本 | main | 说明 |
|------|------|------|------|
| mira_3d_format | 1.0.2 | dist/index.js | GLB/GLTF 格式插件(+web) |
| mira_ai_sdk | 1.0.0 | dist/index.js | OpenAI 兼容 AI 网关(13 条路由;`ai`+`@ai-sdk/openai-compatible`;见独立 CLAUDE.md,2026-08 新增) |
| mira_eagle_extension | 1.0.0 | index.ts | Eagle 协议复刻(协议 A) |
| mira_epub_format | 1.0.0 | dist/index.js | EPUB 格式插件(+web) |
| mira_font_format | 1.0.0 | dist/index.js | ttf/otf/woff/woff2/ttc 字体格式(fontkit+sharp;见独立 CLAUDE.md,2026-10 新增) |
| mira_format_converter | 1.0.0 | dist/index.js | ImageMagick/FFmpeg 批量转换(协议 A 类,异步任务;见独立 CLAUDE.md,2026-08 新增) |
| mira_gallery_dl | 1.0.0 | dist/index.js | gallery-dl 批量导入(协议 A 类,含 README + test.js) |
| mira_html_format | 1.0.0 | dist/index.js | html/htm 纯 viewer(零依赖;见独立 CLAUDE.md,2026-10 新增) |
| mira_image_cropper | 1.0.0 | dist/index.js | 多选区图片裁切(协议 A 类;见独立 CLAUDE.md,2026-08 新增) |
| mira_livp_format | 1.0.0 | dist/index.js | LIVP 格式插件(+web) |
| mira_lottie_format | 1.0.0 | dist/index.js | dotLottie 格式插件(+web) |
| mira_office_viewer | 1.0.0 | index.ts | docx/xlsx/pptx/pdf 查看(vue-office SPA;见独立 CLAUDE.md,2026-10 新增) |
| mira_pag_format | 1.0.0 | dist/index.js | PAG 格式插件(+web) |
| mira_semantic_search | 1.0.0 | dist/index.js | Ollama 语义搜索/以图搜图(协议 A 类,8 条路由,sqlite-vec;见独立 CLAUDE.md,2026-10 新增) |
| mira_spine_format | 1.1.1 | dist/index.js | Spine 格式插件(+web) |
| mira_swf_format | 1.0.0 | dist/index.js | SWF 格式插件(+web) |
| mira_tiptap_format | 1.0.0 | index.ts | Tiptap 文档格式 + Vue3 编辑器前端(见下节,2026-08 新增) |
| mira_zipper_format | 1.0.0 | dist/index.js | ZIP 归档浏览(+web) |
| pdf-viewer | 1.0.0 | dist/index.js | PDF 预览(+web) |
| psd-viewer | 1.0.1 | dist/index.js | PSD/PSB 分层查看器(实现 ThumbnailGenerator,支持 psd/ai/eps/svg/tiff/dng/heic 等;见独立 CLAUDE.md) |

### mira_tiptap_format (v1.0.0,2026-08 新增)

| 文件 | 说明 |
|------|------|
| `mira_tiptap_format/index.ts` | 服务端入口(51 行):registerFileFormat 注册 .tiptap 格式 + process 校验 + viewer 声明 |
| `mira_tiptap_format/package.json` | 包配置(server 端零运行时依赖) |
| `mira_tiptap_format/web/` | Vue 3 + Tiptap 编辑器前端(85 个文件,vite 构建,依赖 @tiptap/vue-3 / mira-plugin-ui / reka-ui) |
| `mira_tiptap_format/web/plugin.json` | 客户端插件 manifest(pluginId f4a8c6d2-...、priority 20、permissions ui/dom/storage) |

### 新增四插件要点(2026-10;细节见各自 CLAUDE.md)

| 文件 | 说明 |
|------|------|
| `mira_semantic_search/index.ts` | 1144 行:MiraSemanticSearchPlugin,8 条 `/api/semantic-search/*` 路由、vec0 虚拟表、文件事件增量 |
| `mira_semantic_search/web/index.js` | 客户端 FilterBar 插件(mira-semantic-search-filter) |
| `mira_semantic_search/components/SemanticSearch.js` | dashboard 管理页(454 行,/tools/semantic-search) |
| `mira_office_viewer/web/` | 独立 Vite 工程:Vue 3.5 + @vue-office/{docx,excel,pptx,pdf} v3 动态 import,viewer.html 需先构建 dist/ |
| `mira_html_format/index.ts` | 51 行:html/htm 纯 viewer,服务端零依赖 |
| `mira_font_format/index.ts` | 145 行:fontkit(CJS require)+sharp,SVG 字形缩略图,TTC 取首字型 |

## 旧版插件

### mira_thumb (v1.0.19) -- old_plugins/

| 文件 | 说明 |
|------|------|
| `old_plugins/mira_thumb/index.ts` | 插件主实现 (331 行) |
| `old_plugins/mira_thumb/package.json` | 包配置 |

ffmpeg 缩略图生成。可能被服务端内置 ThumbnailService 替代。

## 已移除插件

- `mira_n8n/` -- 2026-08-21 移除(n8n Webhook/WS 集成)
- `mira_duplicate_scanner/` -- 2026-08-13 移除(功能内置到 `mira-app-server/src/services/DuplicateScanner.ts`)
- `mira_user/`、`upload_statistics/` -- 源码已移除
- `plugins/plugins/librarys.json` -- 库配置文件已删除(本清单 2026-08 版曾误列)
