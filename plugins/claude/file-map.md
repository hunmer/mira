# 文件清单

## 配置文件

| 文件 | 说明 |
|------|------|
| `plugins/plugins/plugins.recommend.json` | 源码侧推荐插件清单(12 个条目;旧 `plugins/plugins.json` 已不存在) |
| `plugins/plugins/librarys.json` | 库配置 |

## 活跃插件(14 个,每个含 index.ts/package.json/tsconfig.json)

> 2026-08-20 起 14 个活跃插件均已有独立 `CLAUDE.md`(见各自目录)。

| 插件 | 版本 | main | 说明 |
|------|------|------|------|
| mira_3d_format | 1.0.2 | dist/index.js | GLB/GLTF 格式插件(+web) |
| mira_eagle_extension | 1.0.0 | index.ts | Eagle 协议复刻(协议 A) |
| mira_epub_format | 1.0.0 | dist/index.js | EPUB 格式插件(+web) |
| mira_gallery_dl | 1.0.0 | dist/index.js | gallery-dl 批量导入(协议 A 类,含 README + test.js) |
| mira_livp_format | 1.0.0 | dist/index.js | LIVP 格式插件(+web) |
| mira_lottie_format | 1.0.0 | dist/index.js | dotLottie 格式插件(+web) |
| mira_n8n | 1.0.7 | index.ts | n8n 集成(协议 A,HTTP 路由 `/n8n/list`,WS 端口 7457;见独立 CLAUDE.md) |
| mira_pag_format | 1.0.0 | dist/index.js | PAG 格式插件(+web) |
| mira_spine_format | 1.1.1 | dist/index.js | Spine 格式插件(+web) |
| mira_swf_format | 1.0.0 | dist/index.js | SWF 格式插件(+web) |
| mira_tiptap_format | 1.0.0 | index.ts | Tiptap 文档格式 + Vue3 编辑器前端(见独立 CLAUDE.md,2026-08 新增) |
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

## 旧版插件

### mira_thumb (v1.0.19) -- old_plugins/

| 文件 | 说明 |
|------|------|
| `old_plugins/mira_thumb/index.ts` | 插件主实现 (331 行) |
| `old_plugins/mira_thumb/package.json` | 包配置 |

ffmpeg 缩略图生成。可能被服务端内置 ThumbnailService 替代。

## 已移除插件

- `mira_duplicate_scanner/` -- 2026-08-13 移除(功能内置到 `mira-app-server/src/services/DuplicateScanner.ts`)
- `mira_user/` -- 源码已移除
- `upload_statistics/` -- 源码已移除
