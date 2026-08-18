# 素材库缩略图缓存交接

## 目标

为 Electron 云盘素材库增加按素材库 ID 隔离的缩略图/文件流缓存，避免大量缩略图重复从云盘加载。

## 当前实现

- 主进程注册 `library_thumb://` 与 `library_file://` 协议。
- 缓存根目录：`app.getPath('sessionData')/mira-library-thumbnails/<libraryId>/`。
- 缓存键使用资源 URL 的 SHA-256 哈希，资源数据保存为 `.bin`，MIME 保存为 `.mime`。
- `library_thumb://` 未命中时通过 `net.fetch()` 请求远端并写入缓存。
- `library_file://` 未命中时通过 `fileURLToPath()` 读取本地 Windows 文件 URL。
- 侧栏素材库列表每行右侧有 `settings` 图标，点击后通过 `Teleport to="body"` 打开全局缓存设置对话框。
- 设置保存于 `mira-settings` 的 `thumbnailCacheLibraries: Record<string, boolean>`，按素材库 ID 独立开关。
- 当前素材库 ID 保存于 `localStorage` 的 `mira-active-library-id`。
- `toFileUrl()` 和 `MediaThumbnail.vue` 会在 Electron 且对应素材库开启缓存时生成带 `libraryId` 的自定义协议 URL。
- 开关切换后会刷新页面，使已有素材重新生成协议地址。
- `library-cache:clear` IPC 支持只清理指定素材库缓存。

## 关键文件

- `packages/mira-client/src/main/services/ProtocolService.ts`
- `packages/mira-client/src/main/ipc/handlers.ts`
- `packages/mira-client/src/preload/preload.ts`
- `packages/mira-client/src/shared/types.ts`
- `packages/mira-client/src/renderer/utils/fileUtils.ts`
- `packages/mira-client/src/renderer/components/common/MediaThumbnail.vue`
- `packages/mira-client/src/renderer/services/MiraSDKService.ts`
- `packages/mira-client/src/renderer/views/HomeView/SidebarLibrarySelector.vue`
- `packages/mira-client/src/renderer/stores/settings.ts`
- `packages/mira-client/src/renderer/i18n/locales/zh-CN/views.json`
- `packages/mira-client/src/renderer/i18n/locales/en-US/views.json`

## 已验证

- `pnpm --filter mira-web build` 通过。
- `pnpm --filter mira-web build:main` 通过。
- `git diff --check` 通过。
- 全量 `type-check` 仍有仓库原有未使用变量/类型错误，本次改动未新增对应错误。

## 当前已知问题/待验证

用户在 `WaterfallComponent.vue` 控制台看到 `file:///I:/sync/BaiduSyncdisk/game/thumbs/*.png` 加载失败。该日志来自 `MediaWaterfallItem` 的 `@error`，打印的是原始 `url` 参数，不一定是实际 `<img>` 的 `src`。已补充 `MediaThumbnail.vue` 的强制转换和主进程 Windows 文件 URL 读取修复，但仍需在 Electron 运行态确认：

1. 实际 DOM `<img>` 的 `src` 是否为 `library_file://load?libraryId=...`。
2. 主进程是否输出 `Library resource cached` 或 `Library resource failed`。
3. `<sessionData>/mira-library-thumbnails/<libraryId>/` 是否生成文件。
4. 如果仍失败，优先检查 `ProtocolService.handleLibraryResource()` 的异常日志，以及 `protocol.handle` 自定义 scheme 在当前 Electron 运行模式是否生效。

## 建议后续步骤

1. 完全退出并重启 Electron，确认加载的是最新构建/开发进程。
2. 在 `MediaThumbnail.vue` 临时打印 `currentSrc`，确认协议转换结果。
3. 查看主进程日志，区分协议未命中、文件读取失败和远端鉴权失败。
4. 若远端缩略图返回 401/403，检查 `MiraSDKService.ts` 的 `toFileUrl(appendToken(url))` 顺序是否保留，确保 token 加在原始 URL 上再封装协议。
5. 若本地 `library_file://` 仍失败，可改为主进程 `net.fetch(file://...)` 或直接使用 `protocol.handle` 返回 `fs.createReadStream` 对应的 `Response`。

## Suggested skills

- `diagnose`：按复现、最小化、日志、修复、回归测试流程定位 Electron 自定义协议加载失败。
- `procm-mcp`：启动/重启 Electron 持久化进程并读取主进程日志（若 MCP 工具不可用，按技能说明使用 HTTP fallback）。
- `tdd`：为协议缓存命中、缓存写入、按素材库 ID 隔离增加测试。
- `code-architecture-research`：继续追踪瀑布流和其它缩略图组件是否绕过 `MediaThumbnail`。
