# plugins 总览

## 模块职责

`plugins/plugins/` 目录包含 Mira 服务端的插件集合(当前 **16 个**)。每个插件是独立的 TypeScript 模块,在素材库加载时被 `ServerPluginManager`(`packages/mira-app-server/src/ServerPluginManager.ts`)动态加载。

**两套并行协议**:

### 协议 A — 旧版 `extends ServerPlugin`(深度介入服务端)

- 用于需要 HTTP 路由 / WebSocket 监听 / HTTP Hook / 通用业务逻辑的插件
- `init(inst)` 返回继承自 `ServerPlugin` 的实例
- 能力:
  - 注册 HTTP 路由(`httpRouter.registerRounter`)
  - 监听/广播 WebSocket 事件
  - HTTP Hook 拦截(`pluginManager.registerHttpHook`)
  - 前端 UI 路由(`registerRoute`)
  - 持久化配置(`writeConfig/readConfig/writeJson/readJson`)
- 当前使用方:`mira_eagle_extension`、`mira_gallery_dl`(自定义类,不经 `extends ServerPlugin` 但使用同套注入:`getRoutes()` + `registerRounter` 注册 HTTP 路由),以及三个新深度插件 `mira_image_cropper`(`POST /api/image-cropper/save` 裁切入库)、`mira_format_converter`(`/api/format-converter/*` 异步转换任务,ImageMagick/FFmpeg)、`mira_ai_sdk`(OpenAI 兼容多服务商网关,`ai` + `@ai-sdk/openai-compatible`)——三者均带 `web/` 客户端 SPA(经 `mira-plugin-ui` 构建),由 ServerPluginManager 自动发现 `web/plugin.json` 分发

### 协议 B — 新版 `registerFileFormat`(格式扩展,推荐)

- 用于声明新文件格式支持的插件(扩展名/缩略图/查看器)
- `init(inst)` 内调用 `inst.pluginManager.registerFileFormat(pluginName, handler)`
- `handler: ServerFileFormatHandler` 字段:
  - `id`、`extensions[]`、`mimeTypes[]`
  - `thumbnailExtensions[]` + `thumbnail(srcPath, destPath): Promise<void>`
  - `process?(filePath, context)` — 自定义元数据处理
  - `viewers[]` — `{ viewerId, title, icon, entry, priority, getQuery }`
- 返回值是 `unregister()` 句柄
- 当前使用方:`mira_3d_format`、`mira_spine_format`、`mira_epub_format`、`mira_livp_format`、`mira_lottie_format`、`mira_pag_format`、`mira_swf_format`、`mira_zipper_format`、`mira_tiptap_format`、`pdf-viewer`、`psd-viewer`

## 入口机制

1. 读取 `plugins/plugins.json` 注册表(`name`、`enabled`、`path`)
2. 扫描插件目录,动态 require 入口文件
3. 调用导出的 `init(inst)` 工厂函数
4. 旧协议构造函数接收 `{ pluginManager, server, dbService, miraClient? }`;新协议直接用 `inst.pluginManager.registerFileFormat`

## 插件清单(16 个)

| 插件 | 版本 | 协议 | +web | 职责 |
|------|------|------|------|------|
| mira_eagle_extension | 1.0.0 | A(旧) | -- | 复刻 Eagle 本地 HTTP 协议 |
| mira_gallery_dl | 1.0.0 | A(类) | -- | gallery-dl 批量解析图片导入(`/gallery-dl/*` HTTP 路由) |
| mira_image_cropper | 1.0.0 | A(类) | ✓ | 多选区图片裁切 + `web/` 裁切 SPA,裁切结果入库 |
| mira_format_converter | 1.0.0 | A(类) | ✓ | ImageMagick/FFmpeg 批量格式转换(异步任务)+ `web/` |
| mira_ai_sdk | 1.0.0 | A(类) | ✓ | OpenAI 兼容 AI 网关(聊天/生图)+ AI 图片生成器 `web/` |
| mira_3d_format | 1.0.2 | B(格式) | ✓ | GLB/GLTF 解析 + GLB 缩略图 |
| mira_spine_format | 1.1.1 | B(格式) | true | ✓ | Spine `.skel/.spine` 解析与预览 |
| mira_epub_format | 1.0.0 | B(格式) | true | ✓ | EPUB 元数据/封面/阅读 |
| mira_livp_format | 1.0.0 | B(格式) | true | ✓ | LIVP Live Photo |
| mira_lottie_format | 1.0.0 | B(格式) | true | ✓ | dotLottie |
| mira_pag_format | 1.0.0 | B(格式) | true | ✓ | PAG(需 `PAG_BROWSER_PATH`) |
| mira_swf_format | 1.0.0 | B(格式) | true | ✓ | SWF(FFmpeg 缩略图 + Ruffle) |
| mira_zipper_format | 1.0.0 | B(格式) | true | ✓ | ZIP 归档只读浏览 |
| mira_tiptap_format | 1.0.0 | B(格式) | true | ✓ | Tiptap JSON 文档格式 + 编辑器预览(2026-08 新增) |
| pdf-viewer | 1.0.0 | B(格式) | true | ✓ | PDF 文档预览 |
| psd-viewer | 1.0.1 | B(格式) | true | ✓ | PSD/PSB 分层查看器 |

`enabled` 以 server 运行时 `packages/mira-app-server/src/plugins/plugins.json` 为准(当前 11 条:三个新深度插件 + tiptap/gallery_dl 为 active,其余格式插件多 inactive)。`+web` 表示含 `web/` 子目录(客户端动态加载的预览 UI,带 `plugin.json`)。

## 典型目录结构(格式插件)

```
plugins/plugins/<name>/
├── index.ts            # init(inst) 工厂,调用 registerFileFormat
├── package.json        # 依赖(如 @gltf-transform/core、render-glb)
├── tsconfig.json
├── data/
│   └── config.json     # 运行时配置
├── dist/               # 构建产物
└── web/                # 客户端预览 UI(可选)
    ├── index.html
    ├── index.js
    ├── plugin.json     # 客户端插件元数据(pluginId/permissions/index)
    ├── package.json
    ├── vite.config.ts
    └── tsconfig.json
```

## 已移除/弃用

- `mira_n8n`(2026-08-21 删除,n8n Webhook/WS 集成)
- `mira_duplicate_scanner`(2026-08-13 移除,重复扫描功能内置到 `mira-app-server/src/services/DuplicateScanner.ts`)
- `mira_thumb_imagemagick`(ImageMagick 缩略图)— 已由格式插件体系与内置 ThumbnailService 取代
- `old_plugins/mira_thumb`(旧版 ffmpeg 缩略图,v1.0.19;目录已不存在)
- `mira_user`、`upload_statistics`(功能内置于服务端)

## 注册表文件

| 文件 | 说明 |
|------|------|
| `plugins/plugins/plugins.recommend.json` | 源码侧推荐插件清单(11 条) |
| `plugins/plugins/plugins.json` | 源码侧展示 meta 注册表(3 条:image_cropper/format_converter/ai_sdk,含 title/category/tags/icon;ServerPluginManager 兼容读取,「检查更新」时从 package.json 同步) |
| `packages/mira-app-server/src/plugins/plugins.json` | server 运行时安装状态(name/enabled/path/version/installedAt;新 3 插件 path 回指 `../../../../plugins/plugins/*` 即仓库源码目录) |
