# Findings & Decisions

## Requirements
- Client plugins can register handlers for custom file formats.
- A client handler can replace `MediaThumbnail.vue` content with Vue-rendered interactive content, not only an image.
- A client handler can take over opening a file detail view.
- Server plugins can register custom-format processing that receives a local file path and may parse it or generate a thumbnail.
- Update `docs/client-plugin-architecture.md` and `docs/server-plugin-development.md`.
- Use a 3D/GLB plugin as an API validation example if it fits the current plugin architecture.
- Build/reinstall `mira-app-core` when changed; use procm-mcp for persistent service restarts.

## Research Findings
- Current double-click flow reaches `HomeController/interactionHandler.ts`; generic documents route to `/file-preview`.
- `FilePreviewView.vue` chooses preview content from MIME type and filename extension.
- `MediaThumbnail.vue` is the requested list/grid thumbnail integration point.
- Existing file APIs span `mira-app-core` SDK, `MiraSDKService`, and `FileRoutes`.
- A refreshed preview may lack an in-memory SDK connection, so authenticated file URL fallback exists; tokens must not be persisted or logged.
- `MediaThumbnail.vue` currently renders only an image URL or a fallback icon/slot. It has no access to the complete media item and no plugin registry lookup.
- `FilePreviewView.vue` selects built-in preview components with a hard-coded MIME/extension chain.
- `ServerPluginManager.loadPlugin` passes the manager, websocket server, database service, and `MiraClient` to plugin `init`; unload calls plugin cleanup when available.
- `ThumbnailService` already owns a generator registry keyed by extension. This is reusable for plugin thumbnail generation, but current service access and registration ownership still need confirmation.
- `ServerPlugin` currently provides config/data-directory and route helpers; custom format processing is not present there.
- Client `PluginAPI` is declared in `packages/mira-client/src/shared/types.ts`; its `media` namespace already exposes local-file and context-menu registrations, so custom-format registration belongs there.
- `ThumbnailGenerator.generate(srcPath, destPath)` already receives the exact source and destination paths. It covers generated thumbnails but not arbitrary parsed metadata/results.
- `MiraServer` constructs one global `ThumbnailService` before loading libraries; it is available from the server object passed indirectly through the plugin manager.
- Server plugins are initialized with `{ pluginManager, server, dbService, miraClient }`; cleanup is supported by `ServerPluginManager.unloadPlugin`.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Keep format matching centralized in the plugin API | Avoid duplicating extension/MIME precedence across UI entry points |
| Do not make `render-glb` a core runtime dependency unless the server plugin system requires it | Rendering is format-plugin-specific and may require native/headless environment setup |
| Reuse `ThumbnailService` for thumbnail-specific server handling | It already provides extension dispatch and queue/progress behavior |
| Add a general server format registry beside the thumbnail registry | Arbitrary parsing may return structured data and should not be forced through `generate(src, dest): void` |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| Client `vue-tsc` reports existing `ServerEditDialog.vue:110` nullability mismatch | Left unrelated code unchanged; production Vite build passes |
| No `procm-commands.json` in project | Could not restart a named persistent service; no service command was available |

## Resources
- `C:/Users/Administrator/AppData/Local/Temp/file-preview-handoff.md`
- `docs/client-plugin-architecture.md`
- `docs/server-plugin-development.md`
- `packages/mira-client/src/renderer/components/common/MediaThumbnail.vue`

## Visual/Browser Findings
- No browser or image inspection performed.

## Hovercard-only 3D Preview
- `renderThumbnail` was the reason every visible 3D tile created an iframe/WebGL context.
- The existing `MediaPreviewContent.vue` is the shared hovercard content boundary; adding `renderHoverCard` there keeps plugin-specific DOM lifecycle centralized.
- Grid, list, and waterfall views had duplicate image-only hovercard markup and now use `MediaPreviewHoverCard.vue`.
- The 3D plugin only registers `renderHoverCard`; normal thumbnails stay on the host image pipeline and use server-generated PNG files.

## Browser-safe Image Preview
- `ThumbnailService` currently registers FFmpeg generators only for common browser images and videos.
- Unsupported image extensions have no generator, so create/scan paths skip them entirely.
- Existing generated thumbnails are PNG files under the library `thumbs` directory.
- `FileRoutes` already uses `<backend.dataPath>/temp`; the preview cache should reuse that backend temp root and remain outside the asset library.
- The working tree contains unrelated/user changes in plugin catalog and documentation; preserve them.
- ImageMagick 7.1.2 is installed locally as `magick.exe`; deployment UI already instructs users to install ImageMagick.
- Existing file endpoints stream with `fs.createReadStream` and are protected by the common `/api` middleware.
- Use `/api/files/preview/:libraryId/:fileId`, not an `:id` file parameter: the current permission extractor checks `params.id` before `params.libraryId`, so a second `:id` would interfere with library-role lookup.
- No ImageMagick Node dependency exists or is needed; Node `child_process.execFile` can invoke the installed CLI safely without shell interpolation.

## JIT Audio/Video Preview
- The server already resolves the system FFmpeg executable; no static binary package is needed.
- Existing video thumbnails cover only `mp4/mov/avi/mkv/flv/webm`; audio has no thumbnail generator.
- `VideoPlayerComponent.vue` uses Plyr over a native `<video>` element. Plyr does not decode HLS itself.
- `AudioPreview.vue` binds the original URL directly to `<audio>`.
- `hls.js` is not installed, so Chromium/Electron need it for JIT HLS playback; Safari can use native HLS.
- Relative segment URLs do not inherit the playlist query string. The generated playlist must append the incoming `apiKey` query to each segment URI.
- Preserve unrelated active changes in `WebSocketService.ts` and the Spine plugin.
- PDF conversion reproduced the reported `PDFDelegateFailed` error. `gswin64c`, `gswin32c`, `gs`, `pdftoppm`, `mutool`, and `pdftocairo` are unavailable as usable system commands; ImageMagick policy is not the cause.
- Thumbnail startup now excludes PDF/EPS/AI when Ghostscript is absent, while the on-demand preview API returns an explicit Ghostscript-required error for those extensions.

## Spine Bundle Format
- Requested container format: `.spine`, physically a ZIP containing `.atlas`, `.json`, and `.png` resources.
- Extracted resources must live under backend temp storage, outside media libraries.
- SDK contract requested: list extra filenames by file ID and fetch one extra file by file ID plus filename; HTTP routes must resolve names server-side and must not expose extraction paths.
- Existing uncommitted workspace changes are user-owned and must be preserved.
- CodeGraph confirms the existing Spine server plugin registers only a file-format handler; `.spine` is not yet supported.
- `ServerPluginManager.registerHttpHook` intercepts matching requests but does not create endpoints; plugin-owned routes use the existing `ServerPlugin` route mechanism.
- Media file IDs are library-local. A backend route needs library context even if a higher-level SDK wrapper later hides it.
- The existing `FileModule` is the smallest SDK home for extra-file list/content helpers.
- The current client plugin derives sibling `file://` paths from `.skel`; `.spine` must instead consume server-generated URLs and cannot expose temp paths.
- `ServerPlugin.registerRoute` is UI route metadata, not an Express endpoint. There is no plugin API for arbitrary HTTP endpoints.
- Minimal architecture: extend `ServerFileFormatHandler` with optional extra-file operations; add generic authenticated routes to core `FileRoutes`; dispatch by the stored file's extension through its library plugin manager.
- Core resolves `libraryId + fileId` to the authoritative source path. The plugin receives that path and returns safe filenames or a resolved temp file descriptor.
- SDK transport already supports JSON GET and authenticated Blob download, so no new HTTP client primitive or dependency is needed.
- Proposed core routes: `GET /api/files/extra/:libraryId/:id` for relative names and `GET /api/files/extra/:libraryId/:id/:name` for one resource; both inherit `/api` permission middleware and carry library scope in path params.
- `FileRoutes` already has authoritative `libraryService.getFile()` plus `getItemFilePath()` patterns and stream response handling to reuse.
- The current Spine viewer can load either binary `.skel` or JSON skeleton content, so a bundle may contain either; user examples use `.json`.
- `yauzl` is already a direct dependency of `mira-app-server` and its plugin package set; use it instead of adding a ZIP library.
- Client `FileInfo` includes optional `libraryId`, which is enough for SDK calls when media items are normalized correctly.
- Client plugins currently receive no raw SDK in `PluginAPI`; the media API can expose narrowly scoped extra-file helpers backed by the existing `MiraSDKService`.
- Hovercard and plugin BrowserWindow are separate renderer contexts. Blob URLs are suitable for same-context fetch but not a robust cross-window contract; SDK should also construct authenticated HTTP URLs from its configured base URL.
- Permission middleware incorrectly prioritizes `req.params.id` as the library ID. New routes must name the media record parameter `fileId`, not `id`, so `req.params.libraryId` is used for allowed-role checks.
- `yauzl` is available only under the server package, not the standalone Spine plugin path; dependency ownership must match the final extraction location.
- Implemented handler-owned extra-file operations with generic core routing; core never returns the plugin's resolved temp path.
- Spine bundle extraction allows `.atlas/.json/.skel/.png`, preserves safe relative paths, limits entries and uncompressed sizes, and invalidates cache on source size/mtime changes.
- Existing `.skel` preview/thumbnail behavior remains registered alongside new `.spine` behavior.
- The global permission middleware runs before Express route params are populated, so new extra-file routes add an explicit library `allowedRoles` check in addition to authentication.
- Verification: server tsc, Spine plugin tsc/build, Core build, host production build, client plugin build, JS syntax, and diff check passed. Host `vue-tsc` remains blocked only by pre-existing `ServerEditDialog.vue:110`.
- Verification: procm restarted backend; logs show Spine generator loaded for `[skel, spine]`; Mira CLI health returned `status: ok`.
- Integration smoke: uploaded temporary `.spine`, SDK listed `hero.atlas/hero.json/hero.png`, SDK fetched `hero.json`, then test file was permanently deleted.
